import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserAvatar from "./UserAvatar";
import { type ItemType, ITEM_ICONS, ITEM_LABELS } from "../utils/collections";

type BaseCard = {
  userName: string;
  avatarUrl?: string | null;
  timeLabel: string;
  itemType: ItemType;
  itemTitle: string;
};

type AddedCard = BaseCard & { type: "added" };
type StartedCard = BaseCard & { type: "started"; withUsers?: string[] };
type CompletedCard = BaseCard & { type: "completed" };
type LoanedCard = BaseCard & { type: "loaned"; loanedTo: string };

type Props = AddedCard | StartedCard | CompletedCard | LoanedCard;

function getActionText(props: Props): string {
  switch (props.type) {
    case "added":
      return `la til i samlingen · ${props.timeLabel}`;
    case "started": {
      const withStr = props.withUsers?.length
        ? ` med ${props.withUsers.join(", ")}`
        : "";
      return `startet en økt${withStr} · ${props.timeLabel}`;
    }
    case "completed":
      return `fullførte · ${props.timeLabel}`;
    case "loaned":
      return `lånte ut til ${props.loanedTo} · ${props.timeLabel}`;
  }
}

function getBadgeLabel(type: Props["type"]): string | null {
  if (type === "completed") return "Ferdig";
  if (type === "loaned") return "Utlånt";
  return null;
}

export default function FeedCard(props: Props) {
  const { userName, avatarUrl, itemType, itemTitle } = props;
  const badge = getBadgeLabel(props.type);

  return (
    <View
      accessible
      accessibilityLabel={`${userName} ${getActionText(props)}: ${itemTitle}`}
      className="bg-surface dark:bg-surface-dark rounded-2xl mx-4 mb-3 overflow-hidden border border-border dark:border-border-dark"
    >
      {/* Topprad */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <View className="flex-row items-center gap-3 flex-1">
          <UserAvatar name={userName} avatarUrl={avatarUrl} size={36} />
          <View className="flex-1">
            <Text className="text-content dark:text-content-dark text-sm font-semibold">
              {userName}
            </Text>
            <Text
              className="text-content-secondary dark:text-content-secondary-dark text-xs"
              numberOfLines={1}
            >
              {getActionText(props)}
            </Text>
          </View>
        </View>
        {badge && (
          <View className="bg-accent/10 dark:bg-accent-dark/10 px-3 py-1 rounded-full ml-2">
            <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
              {badge}
            </Text>
          </View>
        )}
      </View>

      {/* Innhold */}
      <View className="flex-row items-center gap-3 px-4 pb-4">
        <View className="w-14 h-14 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center">
          <Ionicons name={ITEM_ICONS[itemType]} size={24} color="#78716C" />
        </View>
        <View className="flex-1">
          <Text
            className="text-content dark:text-content-dark text-sm font-medium"
            numberOfLines={1}
          >
            {itemTitle}
          </Text>
          <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
            {ITEM_LABELS[itemType]}
          </Text>
        </View>
      </View>
    </View>
  );
}
