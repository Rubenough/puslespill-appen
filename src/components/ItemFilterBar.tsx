import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { type ItemStatus } from "../utils/collections";

// null = ingen statusfiltrering (begge chips av).
export type StatusFilter = ItemStatus | null;

// Søkefelt + statuschips (Tilgjengelig / Utlånt) over gjenstandslisten i
// CollectionDetailScreen. Ren presentasjon — filtreringen skjer hos forelderen.
export default function ItemFilterBar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
}: {
  query: string;
  onQueryChange: (text: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
}) {
  const { t } = useTranslation();

  // Chippene er av/på: trykk på en aktiv chip fjerner filteret igjen.
  const chips: { status: ItemStatus; label: string }[] = [
    { status: "Tilgjengelig", label: t("collections.available") },
    { status: "Utlånt", label: t("collections.loaned") },
  ];

  return (
    <View className="mx-4 mb-3">
      <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-2.5 flex-row items-center">
        <Ionicons name="search" size={18} color="#A8A29E" accessible={false} />
        <TextInput
          className="flex-1 text-content dark:text-content-dark text-base ml-2 py-0.5"
          placeholder={t("collectionDetail.searchPlaceholder")}
          placeholderTextColor="#A8A29E"
          value={query}
          onChangeText={onQueryChange}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t("collectionDetail.searchA11y")}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => onQueryChange("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("collectionDetail.clearSearchA11y")}
          >
            <Ionicons name="close-circle" size={18} color="#A8A29E" accessible={false} />
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row gap-2 mt-2">
        {chips.map(({ status, label }) => {
          const selected = statusFilter === status;
          return (
            <TouchableOpacity
              key={status}
              onPress={() => onStatusFilterChange(selected ? null : status)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={t("collectionDetail.filterChipHint")}
              accessibilityState={{ selected }}
              className={`px-4 py-2 rounded-full border ${
                selected
                  ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                  : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selected ? "text-white" : "text-content dark:text-content-dark"
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
