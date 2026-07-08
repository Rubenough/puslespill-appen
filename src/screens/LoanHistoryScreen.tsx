import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { getRelativeDayOrWeekLabel } from "../utils/date";
import { CollectionsStackParamList } from "../navigation/CollectionsStack";

type NavProp = NativeStackNavigationProp<CollectionsStackParamList, "LoanHistory">;

type ReturnedLoan = {
  id: string;
  borrower_name: string;
  returned_at: string;
  items: { title: string; type: string } | null;
};

export default function LoanHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [loans, setLoans] = useState<ReturnedLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLoans = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Kun leverte (returnerte) lån jeg eier — aktive lån vises i Samlinger (UTLÅNT NÅ).
    const { data, error: queryError } = await supabase
      .from("loans")
      .select("id, borrower_name, returned_at, items(title, type)")
      .eq("owner_id", user.id)
      .not("returned_at", "is", null)
      .order("returned_at", { ascending: false })
      .limit(50);

    setError(!!queryError);
    setLoans((data as unknown as ReturnedLoan[]) ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [fetchLoans]),
  );

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-3"
          accessibilityRole="button"
          accessibilityLabel={t("loanHistory.backA11y")}
        >
          <Ionicons name="chevron-back" size={24} color="#78716C" accessible={false} />
        </TouchableOpacity>
        <Text className="text-content dark:text-content-dark text-2xl font-medium flex-1">
          {t("loanHistory.title")}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
        ) : error ? (
          <View className="mx-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
            <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
              {t("loanHistory.loadError")}
            </Text>
            <TouchableOpacity
              onPress={() => fetchLoans()}
              accessibilityRole="button"
              accessibilityLabel={t("common.retry")}
              className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
            >
              <Text className="text-white font-semibold text-sm">
                {t("common.retry")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : loans.length === 0 ? (
          <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-6 items-center">
            <Text className="text-content-secondary dark:text-content-secondary-dark text-sm text-center">
              {t("loanHistory.empty")}
            </Text>
          </View>
        ) : (
          <View className="mx-4 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
            {loans.map((loan, i) => {
              const itemType = loan.items?.type as ItemType | undefined;
              const title = loan.items?.title ?? t("common.unknownItem");
              const subtitle = t("profile.returnedTo", {
                name: loan.borrower_name,
                when: getRelativeDayOrWeekLabel(loan.returned_at),
              });
              return (
                <View
                  key={loan.id}
                  accessible
                  accessibilityLabel={[title, subtitle].join(", ")}
                  className={`flex-row items-center px-4 py-3 ${
                    i < loans.length - 1
                      ? "border-b border-border dark:border-border-dark"
                      : ""
                  }`}
                >
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
                  <View className="bg-surface-secondary dark:bg-surface-dark-secondary px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold">
                      {t("profile.statusReturned")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
