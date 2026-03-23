import React from "react";
import { View, Text } from "react-native";

interface Props {
  isOwn?: boolean;
}

// Et kort i den horisontale "Aktive økter"-listen
export default function ActiveSessionCard({ isOwn = false }: Props) {
  return (
    <View
      className={`w-[130px] rounded-xl p-[10px] bg-surface dark:bg-surface-dark ${
        isOwn
          ? "border-2 border-[#1D9E75]"
          : "border border-border dark:border-border-dark"
      }`}
    >
      <View className="flex-row items-center gap-1">
        <View className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-accent-dark" />
        <Text className="text-content dark:text-accent-dark text-sm font-medium">
          {isOwn ? "Din økt" : "Økt 1"}
        </Text>
        {/* Bilde, navn og fremdrift her */}
      </View>
    </View>
  );
}
