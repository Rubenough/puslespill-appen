import React from "react";
import { View, Text } from "react-native"; // Text brukes til app-navn
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfil } from "../context/ProfilContext";
import UserAvatar from "./UserAvatar";

export default function Header() {
  const insets = useSafeAreaInsets();
  const { profil: profile } = useProfil();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-border dark:border-border-dark"
    >
      <View className="flex-row items-center justify-between px-[18px] py-3 border-b border-border dark:border-border-dark">
        <Text className="text-content dark:text-content-dark font-bold text-2xl">
          Puslespill
        </Text>
        <View className="flex-row items-center gap-4">
          <Ionicons name="notifications-outline" size={24} color="#78716C" />
          <UserAvatar name={profile?.full_name ?? null} avatarUrl={profile?.avatar_url} size={32} />
        </View>
      </View>
    </View>
  );
}
