import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import UserAvatar from "../components/UserAvatar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfil } from "../context/ProfilContext";

const MOCK_PROFILE = {
  name: "Ruben Vareide",
  memberSince: "Mars 2025",
};

const MOCK_STATS = [
  { label: "I samlingen", value: "99" },
  { label: "Fullførte", value: "23" },
  { label: "Venner", value: "5" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profil } = useProfil();

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View
      className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary px-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      {/* Avatar og navn */}
      <View className="items-center mb-6">
        <UserAvatar name={profil?.full_name ?? MOCK_PROFILE.name} avatarUrl={profil?.avatar_url} size={72} />
        <Text className="text-content dark:text-content-dark text-xl font-semibold mt-3">
          {profil?.full_name ?? MOCK_PROFILE.name}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-0.5">
          Medlem siden {MOCK_PROFILE.memberSince}
        </Text>
      </View>

      {/* Statistikk */}
      <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark flex-row mb-6">
        {MOCK_STATS.map((stat, i) => (
          <View
            key={stat.label}
            className={`flex-1 items-center py-4 ${
              i < MOCK_STATS.length - 1
                ? "border-r border-border dark:border-border-dark"
                : ""
            }`}
          >
            <Text className="text-content dark:text-content-dark text-xl font-bold">
              {stat.value}
            </Text>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Logg ut */}
      <TouchableOpacity
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel="Logg ut"
        className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl py-4 items-center"
      >
        <Text className="text-content dark:text-content-dark font-medium">
          Logg ut
        </Text>
      </TouchableOpacity>
    </View>
  );
}
