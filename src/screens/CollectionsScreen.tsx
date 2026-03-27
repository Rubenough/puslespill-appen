import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { type ItemType, ITEM_ICONS, ITEM_LABELS } from "../utils/collections";
import { CollectionsStackParamList } from "../navigation/CollectionsStack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type NavProp = NativeStackNavigationProp<CollectionsStackParamList, "CollectionsList">;

const COLLECTION_TYPES: ItemType[] = ["puslespill", "brettspill"];

type CollectionSummary = { type: ItemType; count: number; loaned: number };

type ActiveLoan = {
  id: string;
  borrower_name: string;
  loaned_at: string;
  items: { title: string; type: string } | null;
};

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [collections, setCollections] = useState<CollectionSummary[]>(
    COLLECTION_TYPES.map((type) => ({ type, count: 0, loaned: 0 }))
  );
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    const [itemsResult, loansResult] = await Promise.all([
      supabase.from("items").select("type, status").eq("owner_id", user!.id),
      supabase
        .from("loans")
        .select("id, borrower_name, loaned_at, items(title, type)")
        .eq("owner_id", user!.id)
        .is("returned_at", null)
        .order("loaned_at", { ascending: false }),
    ]);

    if (itemsResult.error) {
      setFetchError(itemsResult.error.message);
      setRefreshing(false);
      return;
    }
    if (loansResult.error) {
      setFetchError(loansResult.error.message);
      setRefreshing(false);
      return;
    }

    setFetchError(null);

    const summaries = COLLECTION_TYPES.map((type) => {
      const ofType = itemsResult.data.filter((row) => row.type === type);
      return {
        type,
        count: ofType.length,
        loaned: ofType.filter((row) => row.status === "Utlånt").length,
      };
    });
    setCollections(summaries);

    // Supabase infererer joined tabeller som arrays uten genererte typer
    const mapped: ActiveLoan[] = loansResult.data.map((row) => ({
      id: row.id,
      borrower_name: row.borrower_name,
      loaned_at: row.loaned_at,
      items: Array.isArray(row.items) ? (row.items[0] ?? null) : row.items,
    }));
    setActiveLoans(mapped);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  function handleReturn(loan: ActiveLoan) {
    Alert.alert(
      "Registrer retur",
      `Bekreft at ${loan.borrower_name} har levert tilbake "${loan.items?.title ?? "gjenstanden"}"`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Lever tilbake",
          onPress: async () => {
            setReturningId(loan.id);
            const { error } = await supabase
              .from("loans")
              .update({ returned_at: new Date().toISOString() })
              .eq("id", loan.id);
            setReturningId(null);
            if (error) {
              Alert.alert("Noe gikk galt", error.message);
              return;
            }
            fetchData();
          },
        },
      ],
    );
  }

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
        Mine samlinger
      </Text>

      {fetchError && (
        <View className="mx-4 mb-6 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
          <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
            Kunne ikke laste samlinger.
          </Text>
          <TouchableOpacity
            onPress={() => fetchData()}
            accessibilityRole="button"
            accessibilityLabel="Prøv igjen"
            className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
          >
            <Text className="text-white font-semibold text-sm">Prøv igjen</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        SAMLINGER
      </Text>
      <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
        {collections.map((col, i) => (
          <TouchableOpacity
            key={col.type}
            onPress={() => navigation.navigate("CollectionDetail", { type: col.type })}
            accessibilityRole="button"
            accessibilityLabel={[
              ITEM_LABELS[col.type],
              `${col.count} stk`,
              col.loaned > 0 ? `${col.loaned} utlånt` : null,
            ]
              .filter(Boolean)
              .join(", ")}
            accessibilityHint="Trykk for å se samlingen"
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
                {ITEM_LABELS[col.type]}
              </Text>
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                {col.count} stk
                {col.loaned > 0 ? ` · ${col.loaned} utlånt` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#78716C" accessible={false} />
          </TouchableOpacity>
        ))}
      </View>

      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        UTLÅNT NÅ
      </Text>
      <View className="mx-4 mb-8">
        {activeLoans.length === 0 ? (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-6 items-center">
            <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
              Ingen ting utlånt for øyeblikket
            </Text>
          </View>
        ) : (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
            {activeLoans.map((loan, i) => {
              const itemType = loan.items?.type as ItemType | undefined;
              const daysAgo = Math.floor(
                (Date.now() - new Date(loan.loaned_at).getTime()) / 86_400_000
              );
              const dateLabel =
                daysAgo === 0 ? "i dag" : daysAgo === 1 ? "i går" : `${daysAgo} dager siden`;

              const isReturning = returningId === loan.id;
              return (
                <TouchableOpacity
                  key={loan.id}
                  onPress={() => handleReturn(loan)}
                  disabled={isReturning}
                  accessibilityRole="button"
                  accessibilityLabel={`${loan.items?.title ?? "Ukjent gjenstand"}, utlånt til ${loan.borrower_name}, ${dateLabel}`}
                  accessibilityHint="Trykk for å registrere retur"
                  accessibilityState={{ disabled: isReturning }}
                  className={`flex-row items-center px-4 py-4 ${
                    i < activeLoans.length - 1
                      ? "border-b border-border dark:border-border-dark"
                      : ""
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
                    <Ionicons
                      name={itemType ? ITEM_ICONS[itemType] : "cube-outline"}
                      size={20}
                      color="#1D9E75"
                      accessible={false}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-content dark:text-content-dark font-medium">
                      {loan.items?.title ?? "Ukjent gjenstand"}
                    </Text>
                    <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                      {loan.borrower_name} · {dateLabel}
                    </Text>
                  </View>
                  {isReturning ? (
                    <ActivityIndicator size="small" color="#1D9E75" />
                  ) : (
                    <Ionicons name="return-down-back-outline" size={20} color="#78716C" accessible={false} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
