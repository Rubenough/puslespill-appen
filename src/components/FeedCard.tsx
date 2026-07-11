import React, { type ComponentProps } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import UserAvatar from "./UserAvatar";
import ReactionBar from "./ReactionBar";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { itemTypeLabel } from "../utils/collectionLabels";
import { type Reaction } from "../utils/reactions";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

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

// Distinkt farget ikon per hendelsestype, slik at feeden kan skumleses.
// Fargeparene er hentet fra avatarpaletten (utils/initials.ts / design-system.html)
// — mørk forgrunn på lys pastell, alle par er WCAG AA-godkjente (samme kombinasjoner
// som avatar-initialene). Chippen ligger på sin egen pastellbakgrunn og er derfor
// uavhengig av lys/mørk modus.
const EVENT_STYLES: Record<
  Props["type"],
  { icon: IoniconsName; bg: string; fg: string }
> = {
  started: { icon: "play", bg: "#BFDBFE", fg: "#1E40AF" }, // blå — økt i gang
  completed: { icon: "checkmark-done", bg: "#A7F3D0", fg: "#065F46" }, // grønn — fullført
  added: { icon: "add", bg: "#CECBF6", fg: "#3C3489" }, // lilla — lagt til
  loaned: { icon: "arrow-redo", bg: "#FDE68A", fg: "#92400E" }, // gul — lånte ut
  borrowed: { icon: "arrow-undo", bg: "#FBCFE8", fg: "#9D174D" }, // rosa — lånte
};

export default function FeedCard(props: Props) {
  const { t } = useTranslation();
  const { userName, avatarUrl, itemType, itemTitle, imageUrl, onPress, onReact } = props;
  const actionText = getActionText(props, t);
  const badge = getBadgeLabel(props.type, t);
  const eventStyle = EVENT_STYLES[props.type];
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
        {/* Hendelsesikon — dekorativt; handlingen leses allerede opp via actionText */}
        <View
          accessible={false}
          className="w-7 h-7 rounded-full items-center justify-center ml-2"
          style={{ backgroundColor: eventStyle.bg }}
        >
          <Ionicons
            name={eventStyle.icon}
            size={15}
            color={eventStyle.fg}
            accessible={false}
          />
        </View>
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
      {onReact && (
        <View className="px-4 pb-3">
          <ReactionBar reactions={props.reactions} onReact={onReact} />
        </View>
      )}
    </View>
  );
}
