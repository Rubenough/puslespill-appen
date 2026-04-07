import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useProfil } from "../context/ProfilContext";
import UserAvatar from "../components/UserAvatar";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { Ionicons } from "@expo/vector-icons";

const FALLBACK_NAME = "Ukjent bruker";

type LoanHistoryItem = {
  id: string;
  borrower_name: string;
  loaned_at: string;
  returned_at: string | null;
  items: { title: string; type: ItemType } | null;
};

function getDaysLabel(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "i dag";
  if (diffDays === 1) return "i går";
  if (diffDays < 7) return `${diffDays} dager siden`;
  if (diffDays < 14) return "1 uke siden";
  return `${Math.floor(diffDays / 7)} uker siden`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profil } = useProfil();

  const [loans, setLoans] = useState<LoanHistoryItem[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);

  const fetchLoans = useCallback(async () => {
    if (!user) return;
    setLoadingLoans(true);

    const { data } = await supabase
      .from("loans")
      .select("id, borrower_name, loaned_at, returned_at, items(title, type)")
      .eq("owner_id", user.id)
      .order("loaned_at", { ascending: false })
      .limit(20);

    setLoans((data as unknown as LoanHistoryItem[]) ?? []);
    setLoadingLoans(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [fetchLoans])
  );

  async function signOut() {
    await supabase.auth.signOut();
  }

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
            name={profil?.full_name ?? FALLBACK_NAME}
            avatarUrl={profil?.avatar_url}
            size={72}
          />
          <Text className="text-content dark:text-content-dark text-xl font-semibold mt-3">
            {profil?.full_name ?? FALLBACK_NAME}
          </Text>
        </View>

        {/* Logg ut */}
        <TouchableOpacity
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Logg ut"
          className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl py-4 items-center mb-8"
        >
          <Text className="text-content dark:text-content-dark font-medium">
            Logg ut
          </Text>
        </TouchableOpacity>
      </View>

      {/* Utlånshistorikk */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        MINE UTLÅN
      </Text>

      {loadingLoans ? (
        <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
      ) : loans.length === 0 ? (
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4">
          Ingen utlån registrert ennå
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
                Returnerte
              </Text>
            </View>
          )}

          {/* Returnerte utlån */}
          {returnedLoans.map((loan, i) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              isLast={i === returnedLoans.length - 1}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

type LoanRowProps = { loan: LoanHistoryItem; isLast: boolean };

function LoanRow({ loan, isLast }: LoanRowProps) {
  const isActive = loan.returned_at === null;
  const itemType = loan.items?.type as ItemType | undefined;

  return (
    <View
      accessible
      accessibilityLabel={[
        loan.items?.title ?? "Ukjent gjenstand",
        `til ${loan.borrower_name}`,
        isActive ? `utlånt ${getDaysLabel(loan.loaned_at)}` : `returnert ${getDaysLabel(loan.returned_at!)}`,
      ].join(", ")}
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? "border-b border-border dark:border-border-dark" : ""
      }`}
    >
      {/* Kategoriikon */}
      <View className="w-9 h-9 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-3">
        {itemType ? (
          <Ionicons name={ITEM_ICONS[itemType]} size={18} color="#78716C" accessible={false} />
        ) : null}
      </View>

      {/* Tittel og låntaker */}
      <View className="flex-1">
        <Text className="text-content dark:text-content-dark text-sm font-medium" numberOfLines={1}>
          {loan.items?.title ?? "Ukjent gjenstand"}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
          {isActive
            ? `til ${loan.borrower_name} · ${getDaysLabel(loan.loaned_at)}`
            : `til ${loan.borrower_name} · returnert ${getDaysLabel(loan.returned_at!)}`}
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
          {isActive ? "Utlånt" : "Returnert"}
        </Text>
      </View>
    </View>
  );
}
