import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function Header() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { t } = useTranslation();
  const { user } = useAuth();
  // #78716C feiler kontrast på mørk flate — velg token per skjema (CLAUDE.md).
  const { colorScheme } = useColorScheme();
  const bellColor = colorScheme === "dark" ? "#A8A29E" : "#78716C";

  // Varselmerke på bjella: innkommende ventende forespørsler + returer som
  // venter på eierens bekreftelse ("Retur meldt") — alt som venter i Lån.
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;
    const [requestsRes, returnsRes] = await Promise.all([
      supabase
        .from("borrow_requests")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("loans")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .is("returned_at", null)
        .not("return_requested_at", "is", null),
    ]);
    setPendingCount((requestsRes.count ?? 0) + (returnsRes.count ?? 0));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [fetchPendingCount]),
  );

  const hasUnread = pendingCount > 0;

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-border dark:border-border-dark"
    >
      <View className="flex-row items-center justify-between px-[18px] py-3 border-b border-border dark:border-border-dark">
        <Text className="text-content dark:text-content-dark font-bold text-2xl">
          Hylvo
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("LoansHub")}
          accessibilityRole="button"
          accessibilityLabel={
            hasUnread
              ? `${t("loansHub.title")}, ${t("loansHub.badgeA11y", { count: pendingCount })}`
              : t("loansHub.title")
          }
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={bellColor}
            accessible={false}
          />
          {hasUnread && (
            <View
              accessible={false}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent dark:bg-accent-dark items-center justify-center"
            >
              <Text className="text-white text-[10px] font-bold">
                {pendingCount > 9 ? "9+" : pendingCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
