import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { REACTION_EMOJIS, type Reaction } from "../utils/reactions";

// Delt hurtig-reaksjonslinje (👍 ❤️ 🎉 🧩) — brukes på feed-øktkort (FeedCard)
// og på SessionDetailScreen. Ingen egen padding utover chippene; wrapperen
// bestemmer plassering.
export default function ReactionBar({
  reactions,
  onReact,
}: {
  reactions?: Reaction[];
  onReact: (emoji: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2">
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
