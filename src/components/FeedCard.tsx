import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import UserAvatar from "./UserAvatar";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { itemTypeLabel } from "../utils/collectionLabels";

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
// loanedTo er kun synlig for eieren — utelates når vi viser venners lån (Fase 5)
type LoanedCard = BaseCard & { type: "loaned"; loanedTo?: string };

type Props = AddedCard | StartedCard | CompletedCard | LoanedCard;

function getActionText(props: Props, t: TFunction): string {
  switch (props.type) {
    case "added":
      return t("feed.added", { when: props.timeLabel });
    case "started":
      return props.withUsers?.length
        ? t("feed.startedWith", {
            users: props.withUsers.join(", "),
            when: props.timeLabel,
          })
        : t("feed.started", { when: props.timeLabel });
    case "completed":
      return t("feed.completed", { when: props.timeLabel });
    case "loaned":
      return props.loanedTo
        ? t("feed.loanedTo", { name: props.loanedTo, when: props.timeLabel })
        : t("feed.loaned", { when: props.timeLabel });
  }
}

function getBadgeLabel(type: Props["type"], t: TFunction): string | null {
  if (type === "completed") return t("feed.badgeCompleted");
  if (type === "loaned") return t("feed.badgeLoaned");
  return null;
}

export default function FeedCard(props: Props) {
  const { t } = useTranslation();
  const { userName, avatarUrl, itemType, itemTitle } = props;
  const actionText = getActionText(props, t);
  const badge = getBadgeLabel(props.type, t);

  return (
    <View
      accessible
      accessibilityLabel={t("feed.cardA11y", {
        user: userName,
        action: actionText,
        title: itemTitle,
      })}
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
              {actionText}
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
            {itemTypeLabel(itemType)}
          </Text>
        </View>
      </View>
    </View>
  );
}
