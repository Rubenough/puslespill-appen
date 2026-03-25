import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type ItemType, ITEM_ICONS, ITEM_LABELS } from "../utils/collections";

const COLLECTIONS: {
  type: ItemType;
  count: number;
  loaned: number;
}[] = [
  { type: "puslespill", count: 12, loaned: 2 },
  { type: "brettspill", count: 8, loaned: 0 },
];

const ACTIVE_LOANS = [
  {
    itemTitle: "Kinkaku-ji — 1000 brikker",
    itemType: "Puslespill",
    loanedTo: "Kari",
    daysAgo: 14,
  },
  {
    itemTitle: "Wingspan",
    itemType: "Brettspill",
    loanedTo: "Lars",
    daysAgo: 3,
  },
];

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
      showsVerticalScrollIndicator={false}
    >
      <Text
        className="text-content dark:text-content-dark text-2xl font-medium px-4 pb-6"
        style={{ paddingTop: insets.top + 16 }}
      >
        Mine samlinger
      </Text>

      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3">
        SAMLINGER
      </Text>
      <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
        {COLLECTIONS.map((col, i) => (
          <TouchableOpacity
            key={col.type}
            className={`flex-row items-center px-4 py-4 ${
              i < COLLECTIONS.length - 1
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
            <Ionicons name="chevron-forward" size={18} color="#78716C" />
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3">
        UTLÅNT NÅ
      </Text>
      <View className="mx-4 mb-8">
        {ACTIVE_LOANS.map((loan, i) => (
          <View
            key={i}
            className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-4 mb-3"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className="text-content dark:text-content-dark font-medium"
                  numberOfLines={1}
                >
                  {loan.itemTitle}
                </Text>
                <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
                  {loan.itemType} · til {loan.loanedTo}
                </Text>
              </View>
              <View className="bg-accent/10 dark:bg-accent-dark/10 px-3 py-1 rounded-full ml-3">
                <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
                  {loan.daysAgo} dager
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
