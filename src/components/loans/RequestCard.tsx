// Kort for en låneforespørsel i lånehuben (inn og ut). Viser omslagsbilde
// (signert URL), motpartens navn og forespørselens melding som sitatblokk.
import React from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type ItemType, ITEM_ICONS } from "../../utils/collections";
import { itemTypeLabel } from "../../utils/collectionLabels";

export type BorrowRequest = {
  id: string;
  item_id: string;
  owner_id: string;
  requester_id: string;
  message: string | null;
  status: string;
  created_at: string;
  items: { title: string; type: string; cover_url: string | null } | null;
};

export type EnrichedRequest = BorrowRequest & {
  otherName: string | null;
};

type RequestCardProps = {
  req: EnrichedRequest;
  /** Signert visnings-URL for items.cover_url (signeres ved henting). */
  coverUrl: string | undefined;
  isLast: boolean;
  subtitle: string;
  busy: boolean;
  actions: React.ReactNode;
};

export default function RequestCard({
  req,
  coverUrl,
  isLast,
  subtitle,
  busy,
  actions,
}: RequestCardProps) {
  const itemType = req.items?.type as ItemType | undefined;
  return (
    <View
      className={`px-4 py-4 ${
        !isLast ? "border-b border-border dark:border-border-dark" : ""
      }`}
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center overflow-hidden">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} className="w-10 h-10" accessible={false} />
          ) : (
            <Ionicons
              name={itemType ? ITEM_ICONS[itemType] : "cube-outline"}
              size={20}
              color="#1D9E75"
              accessible={false}
            />
          )}
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-content dark:text-content-dark font-medium">
            {req.items?.title ?? ""}
          </Text>
          <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
            {[itemType ? itemTypeLabel(itemType) : null, subtitle]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        {busy && <ActivityIndicator size="small" color="#1D9E75" />}
      </View>

      {req.message ? (
        <View className="mt-3 bg-surface-secondary dark:bg-surface-dark-secondary border-l-4 border-accent dark:border-accent-dark rounded-xl px-3 py-2">
          <Text className="text-content dark:text-content-dark text-sm italic">
            “{req.message}”
          </Text>
        </View>
      ) : null}

      {actions}
    </View>
  );
}
