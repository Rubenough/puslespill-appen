import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Header() {
  const insets = useSafeAreaInsets();

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
          <View className="w-8 h-8 rounded-full bg-[#CECBF6] items-center justify-center">
            <Text className="text-xs font-medium text-[#3C3489]">KH</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
