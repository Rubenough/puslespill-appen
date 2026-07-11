import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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

  // Antall innkommende ventende forespørsler — vises som varselmerke på bjella.
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("borrow_requests")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "pending");
    setPendingCount(count ?? 0);
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
              ? `${t("loansHub.title")}, ${t("requests.badgeA11y", { count: pendingCount })}`
              : t("loansHub.title")
          }
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color="#78716C"
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
