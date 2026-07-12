import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { itemTypeLabel } from "../utils/collectionLabels";
import { CollectionsStackParamList } from "../navigation/CollectionsStack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type NavProp = NativeStackNavigationProp<CollectionsStackParamList, "CollectionsList">;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

const COLLECTION_TYPES: ItemType[] = ["puslespill", "brettspill"];

type CollectionSummary = { type: ItemType; count: number; loaned: number };

// Kompakt oppsummering av lånesløyfen — detaljene bor i lånehuben (LoansHubScreen).
type LoanSummary = { lent: number; borrowing: number; requests: number; returns: number };

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  // Lånehuben og AddItem ligger i rot-stacken; navigasjonen bobler opp dit.
  const rootNavigation = useNavigation<RootNavProp>();
  const { user } = useAuth();
  // #78716C feiler kontrast på mørk flate — velg token per skjema (CLAUDE.md).
  const { colorScheme } = useColorScheme();
  const chevronColor = colorScheme === "dark" ? "#A8A29E" : "#78716C";

  const [collections, setCollections] = useState<CollectionSummary[]>(
    COLLECTION_TYPES.map((type) => ({ type, count: 0, loaned: 0 })),
  );
  const [loanSummary, setLoanSummary] = useState<LoanSummary>({
    lent: 0,
    borrowing: 0,
    requests: 0,
    returns: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  // Unngå at tom-samling-CTA-en blinker før første henting er ferdig.
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);

      const [itemsResult, lentResult, borrowingResult, requestsResult, returnsResult] =
        await Promise.all([
          supabase.from("items").select("type, status").eq("owner_id", user!.id),
          supabase
            .from("loans")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user!.id)
            .is("returned_at", null),
          supabase
            .from("loans")
            .select("id", { count: "exact", head: true })
            .eq("borrower_user_id", user!.id)
            .is("returned_at", null),
          // Ventende forespørsler der jeg er part (inn + ut) — RLS avgrenser.
          supabase
            .from("borrow_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          // Returer som venter på min bekreftelse ("Retur meldt") — uten dette
          // ville en meldt retur vært usynlig utenfor lånehuben.
          supabase
            .from("loans")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user!.id)
            .is("returned_at", null)
            .not("return_requested_at", "is", null),
        ]);

      const failed =
        itemsResult.error ??
        lentResult.error ??
        borrowingResult.error ??
        requestsResult.error ??
        returnsResult.error;
      if (failed) {
        setFetchError(failed.message);
        setRefreshing(false);
        return;
      }

      setFetchError(null);
      setLoadedOnce(true);

      const items = itemsResult.data ?? [];
      const summaries = COLLECTION_TYPES.map((type) => {
        const ofType = items.filter((row) => row.type === type);
        return {
          type,
          count: ofType.length,
          loaned: ofType.filter((row) => row.status === "Utlånt").length,
        };
      });
      setCollections(summaries);

      setLoanSummary({
        lent: lentResult.count ?? 0,
        borrowing: borrowingResult.count ?? 0,
        requests: requestsResult.count ?? 0,
        returns: returnsResult.count ?? 0,
      });

      setRefreshing(false);
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const loanSummaryText =
    [
      loanSummary.lent > 0
        ? t("collections.loanedCount", { count: loanSummary.lent })
        : null,
      loanSummary.borrowing > 0
        ? t("loansHub.summaryBorrowing", { count: loanSummary.borrowing })
        : null,
      loanSummary.requests > 0
        ? t("loansHub.summaryRequests", { count: loanSummary.requests })
        : null,
      loanSummary.returns > 0
        ? t("loansHub.summaryReturns", { count: loanSummary.returns })
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("loansHub.summaryEmpty");

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
      }
    >
      <Text
        className="text-content dark:text-content-dark text-2xl font-medium px-4 pb-6"
        style={{ paddingTop: insets.top + 16 }}
      >
        {t("collections.title")}
      </Text>

      {fetchError && (
        <View className="mx-4 mb-6 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
          <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
            {t("collections.loadError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchData()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
          >
            <Text className="text-white font-semibold text-sm">{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        {t("collections.sectionCollections")}
      </Text>
      <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
        {collections.map((col, i) => (
          <TouchableOpacity
            key={col.type}
            onPress={() => navigation.navigate("CollectionDetail", { type: col.type })}
            accessibilityRole="button"
            accessibilityLabel={[
              itemTypeLabel(col.type),
              t("collections.itemsCount", { count: col.count }),
              col.loaned > 0 ? t("collections.loanedCount", { count: col.loaned }) : null,
            ]
              .filter(Boolean)
              .join(", ")}
            accessibilityHint={t("collections.openHint")}
            className={`flex-row items-center px-4 py-4 ${
              i < collections.length - 1
                ? "border-b border-border dark:border-border-dark"
                : ""
            }`}
          >
            <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
              <Ionicons name={ITEM_ICONS[col.type]} size={20} color="#1D9E75" />
            </View>
            <View className="flex-1">
              <Text className="text-content dark:text-content-dark font-medium">
                {itemTypeLabel(col.type)}
              </Text>
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                {t("collections.itemsCount", { count: col.count })}
                {col.loaned > 0
                  ? ` · ${t("collections.loanedCount", { count: col.loaned })}`
                  : ""}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={chevronColor}
              accessible={false}
            />
          </TouchableOpacity>
        ))}

        {/* Tom samling skal ikke være en blindvei — pek rett inn i AddItem. */}
        {loadedOnce && !fetchError && collections.every((col) => col.count === 0) && (
          <View className="px-4 py-4 border-t border-border dark:border-border-dark items-center">
            <Text className="text-content-secondary dark:text-content-secondary-dark text-sm text-center mb-3">
              {t("collections.emptyAll")}
            </Text>
            <TouchableOpacity
              onPress={() => rootNavigation.navigate("AddItem", { type: "puslespill" })}
              accessibilityRole="button"
              accessibilityLabel={t("collections.emptyAllCta")}
              accessibilityHint={t("collections.emptyAllCtaHint")}
              className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2.5"
            >
              <Text className="text-white font-semibold text-sm">
                {t("collections.emptyAllCta")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Lån — kompakt inngang til lånehuben (forespørsler + aktive lån + historikk) */}
      <TouchableOpacity
        onPress={() => rootNavigation.navigate("LoansHub")}
        accessibilityRole="button"
        accessibilityLabel={`${t("loansHub.title")}, ${loanSummaryText}`}
        accessibilityHint={t("loansHub.openHint")}
        className="mx-4 mb-8 flex-row items-center bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-4"
      >
        <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
          <Ionicons
            name="swap-horizontal-outline"
            size={20}
            color="#1D9E75"
            accessible={false}
          />
        </View>
        <View className="flex-1">
          <Text className="text-content dark:text-content-dark font-medium">
            {t("loansHub.title")}
          </Text>
          <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
            {loanSummaryText}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={chevronColor}
          accessible={false}
        />
      </TouchableOpacity>
    </ScrollView>
  );
}
