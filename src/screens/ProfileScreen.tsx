import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useProfil } from "../context/ProfilContext";
import UserAvatar from "../components/UserAvatar";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { getRelativeDayOrWeekLabel } from "../utils/date";
import { setLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from "../lib/i18n";
import { Ionicons } from "@expo/vector-icons";

type LoanHistoryItem = {
  id: string;
  borrower_name: string;
  loaned_at: string;
  returned_at: string | null;
  items: { title: string; type: ItemType } | null;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profil } = useProfil();

  const [loans, setLoans] = useState<LoanHistoryItem[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [loansError, setLoansError] = useState(false);

  const fetchLoans = useCallback(async () => {
    if (!user) return;
    setLoadingLoans(true);

    const { data, error } = await supabase
      .from("loans")
      .select("id, borrower_name, loaned_at, returned_at, items(title, type)")
      .eq("owner_id", user.id)
      .order("loaned_at", { ascending: false })
      .limit(20);

    setLoansError(!!error);
    setLoans((data as unknown as LoanHistoryItem[]) ?? []);
    setLoadingLoans(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [fetchLoans]),
  );

  async function signOut() {
    await supabase.auth.signOut();
  }

  const fallbackName = t("common.unknownUser");
  const activeLoans = loans.filter((l) => l.returned_at === null);
  const returnedLoans = loans.filter((l) => l.returned_at !== null);

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
    >
      <View className="px-4">
        {/* Avatar og navn */}
        <View className="items-center mb-6">
          <UserAvatar
            name={profil?.full_name ?? fallbackName}
            avatarUrl={profil?.avatar_url}
            size={72}
          />
          <Text className="text-content dark:text-content-dark text-xl font-semibold mt-3">
            {profil?.full_name ?? fallbackName}
          </Text>
        </View>

        {/* Logg ut */}
        <TouchableOpacity
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel={t("profile.signOut")}
          className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl py-4 items-center mb-8"
        >
          <Text className="text-content dark:text-content-dark font-medium">
            {t("profile.signOut")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Utlånshistorikk */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        {t("profile.myLoans")}
      </Text>

      {loadingLoans ? (
        <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
      ) : loansError ? (
        <View className="mx-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
          <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
            {t("profile.loadError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchLoans()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
          >
            <Text className="text-white font-semibold text-sm">{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : loans.length === 0 ? (
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4">
          {t("profile.noLoans")}
        </Text>
      ) : (
        <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
          {/* Aktive utlån */}
          {activeLoans.map((loan, i) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              isLast={i === activeLoans.length - 1 && returnedLoans.length === 0}
            />
          ))}

          {/* Skillinje mellom aktive og returnerte */}
          {activeLoans.length > 0 && returnedLoans.length > 0 && (
            <View className="px-4 py-2 bg-surface-secondary dark:bg-surface-dark-secondary border-y border-border dark:border-border-dark">
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold">
                {t("profile.returnedSection")}
              </Text>
            </View>
          )}

          {/* Returnerte utlån */}
          {returnedLoans.map((loan, i) => (
            <LoanRow key={loan.id} loan={loan} isLast={i === returnedLoans.length - 1} />
          ))}
        </View>
      )}

      {/* Språkvelger */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-8 pb-3"
      >
        {t("profile.language")}
      </Text>
      <View className="mx-4 flex-row gap-3">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = i18n.language === lang;
          return (
            <TouchableOpacity
              key={lang}
              onPress={() => setLanguage(lang)}
              accessibilityRole="button"
              accessibilityLabel={t(`language.${lang}`)}
              accessibilityState={{ selected: isSelected }}
              className={`flex-1 py-3 rounded-2xl border items-center ${
                isSelected
                  ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                  : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? "text-white" : "text-content dark:text-content-dark"
                }`}
              >
                {t(`language.${lang}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

type LoanRowProps = { loan: LoanHistoryItem; isLast: boolean };

function LoanRow({ loan, isLast }: LoanRowProps) {
  const { t } = useTranslation();
  const isActive = loan.returned_at === null;
  const itemType = loan.items?.type as ItemType | undefined;
  const title = loan.items?.title ?? t("common.unknownItem");
  const subtitle = isActive
    ? t("profile.loanedTo", {
        name: loan.borrower_name,
        when: getRelativeDayOrWeekLabel(loan.loaned_at),
      })
    : t("profile.returnedTo", {
        name: loan.borrower_name,
        when: getRelativeDayOrWeekLabel(loan.returned_at!),
      });

  return (
    <View
      accessible
      accessibilityLabel={[title, subtitle].join(", ")}
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? "border-b border-border dark:border-border-dark" : ""
      }`}
    >
      {/* Kategoriikon */}
      <View className="w-9 h-9 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-3">
        {itemType ? (
          <Ionicons
            name={ITEM_ICONS[itemType]}
            size={18}
            color="#78716C"
            accessible={false}
          />
        ) : null}
      </View>

      {/* Tittel og låntaker */}
      <View className="flex-1">
        <Text
          className="text-content dark:text-content-dark text-sm font-medium"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
          {subtitle}
        </Text>
      </View>

      {/* Statusbadge */}
      <View
        className={`px-2 py-0.5 rounded-full ml-2 ${
          isActive
            ? "bg-accent/10 dark:bg-accent-dark/10"
            : "bg-surface-secondary dark:bg-surface-dark-secondary"
        }`}
      >
        <Text
          className={`text-xs font-semibold ${
            isActive
              ? "text-accent dark:text-accent-dark"
              : "text-content-secondary dark:text-content-secondary-dark"
          }`}
        >
          {isActive ? t("profile.statusLoaned") : t("profile.statusReturned")}
        </Text>
      </View>
    </View>
  );
}
