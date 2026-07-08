import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import UserAvatar from "./UserAvatar";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { itemTypeLabel } from "../utils/collectionLabels";
import { REACTION_EMOJIS, type Reaction } from "../utils/reactions";

type BaseCard = {
  userName: string;
  avatarUrl?: string | null;
  timeLabel: string;
  itemType: ItemType;
  itemTitle: string;
  // Signert URL til siste progresjonsbilde; når null vises kategori-ikonet.
  imageUrl?: string | null;
  onPress?: () => void;
  // Reaksjoner vises kun for økt-hendelser (started/completed) som har en sessionId.
  reactions?: Reaction[];
  onReact?: (emoji: string) => void;
};

type AddedCard = BaseCard & { type: "added" };
type StartedCard = BaseCard & { type: "started"; withUsers?: string[] };
type CompletedCard = BaseCard & { type: "completed" };
// loanedTo er kun synlig for eieren — utelates når vi viser venners lån (Fase 5)
type LoanedCard = BaseCard & { type: "loaned"; loanedTo?: string };
// borrowed er brukerens egen låneaktivitet — fromName er eieren de lånte fra
type BorrowedCard = BaseCard & { type: "borrowed"; fromName?: string };

type Props = AddedCard | StartedCard | CompletedCard | LoanedCard | BorrowedCard;

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
    case "borrowed":
      return t("feed.borrowedFrom", {
        name: props.fromName ?? t("common.unknownUser"),
        when: props.timeLabel,
      });
  }
}

function getBadgeLabel(type: Props["type"], t: TFunction): string | null {
  if (type === "completed") return t("feed.badgeCompleted");
  if (type === "loaned") return t("feed.badgeLoaned");
  if (type === "borrowed") return t("feed.badgeBorrowed");
  return null;
}

export default function FeedCard(props: Props) {
  const { t } = useTranslation();
  const { userName, avatarUrl, itemType, itemTitle, imageUrl, onPress, onReact } = props;
  const actionText = getActionText(props, t);
  const badge = getBadgeLabel(props.type, t);
  const a11yLabel = t("feed.cardA11y", {
    user: userName,
    action: actionText,
    title: itemTitle,
  });

  const cardClass =
    "bg-surface dark:bg-surface-dark rounded-2xl mx-4 mb-3 overflow-hidden border border-border dark:border-border-dark";

  const body = (
    <>
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

      {/* Bilde — siste progresjonsbilde når det finnes */}
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-44"
          resizeMode="cover"
          accessible={false}
        />
      )}

      {/* Innhold */}
      <View className="flex-row items-center gap-3 px-4 py-4">
        {!imageUrl && (
          <View className="w-14 h-14 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center">
            <Ionicons name={ITEM_ICONS[itemType]} size={24} color="#78716C" />
          </View>
        )}
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
    </>
  );

  // Trykk-flaten (navigasjon) og reaksjonslinja er søsken, ikke nøstet — slik at et
  // trykk på en emoji ikke også utløser kort-navigasjonen.
  return (
    <View className={cardClass}>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={t("feed.cardHint")}
        >
          {body}
        </TouchableOpacity>
      ) : (
        <View accessible accessibilityLabel={a11yLabel}>
          {body}
        </View>
      )}
      {onReact && <ReactionBar reactions={props.reactions} onReact={onReact} t={t} />}
    </View>
  );
}

function ReactionBar({
  reactions,
  onReact,
  t,
}: {
  reactions?: Reaction[];
  onReact: (emoji: string) => void;
  t: TFunction;
}) {
  return (
    <View className="flex-row items-center gap-2 px-4 pb-3">
      {REACTION_EMOJIS.map((emoji) => {
        const r = reactions?.find((x) => x.emoji === emoji);
        const count = r?.count ?? 0;
        const mine = r?.mine ?? false;
        return (
          <TouchableOpacity
            key={emoji}
            onPress={() => onReact(emoji)}
            accessibilityRole="button"
            accessibilityLabel={
              mine
                ? t("feed.reactionRemove", { emoji })
                : t("feed.reactionAdd", { emoji })
            }
            accessibilityState={{ selected: mine }}
            className={`flex-row items-center rounded-full px-2.5 py-1 border ${
              mine
                ? "bg-accent/10 dark:bg-accent-dark/10 border-accent dark:border-accent-dark"
                : "bg-surface-secondary dark:bg-surface-dark-secondary border-border dark:border-border-dark"
            }`}
          >
            <Text className="text-sm">{emoji}</Text>
            {count > 0 && (
              <Text
                className={`text-xs font-semibold ml-1 ${
                  mine
                    ? "text-accent dark:text-accent-dark"
                    : "text-content-secondary dark:text-content-secondary-dark"
                }`}
              >
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
