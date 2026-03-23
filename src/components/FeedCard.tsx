import React from "react";
import { View, Text } from "react-native";
import UserAvatar from "./UserAvatar";

type LoanCard = {
  type: "loan";
  userName: string;
  avatarUrl?: string | null;
  timeLabel: string;
  loanedTo: string;
  puzzleTitle: string;
  puzzleBrand: string;
};

type CompletedCard = {
  type: "completed";
  userName: string;
  avatarUrl?: string | null;
  timeLabel: string;
};

type Props = LoanCard | CompletedCard;

export default function FeedCard(props: Props) {
  const { userName, avatarUrl, timeLabel } = props;

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-2xl mx-4 mb-3 overflow-hidden border border-border dark:border-border-dark">
      {/* Topprad */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <View className="flex-row items-center gap-3">
          <UserAvatar name={userName} avatarUrl={avatarUrl} size={36} />
          <View>
            <Text className="text-content dark:text-content-dark text-sm font-semibold">
              {userName}
            </Text>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
              {props.type === "loan"
                ? `lånte ut til ${props.loanedTo} · ${timeLabel}`
                : `fullførte et puslespill · ${timeLabel}`}
            </Text>
          </View>
        </View>

        {props.type === "completed" && (
          <View className="bg-accent/10 dark:bg-accent-dark/10 px-3 py-1 rounded-full">
            <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
              Ferdig
            </Text>
          </View>
        )}
      </View>

      {/* Innhold */}
      {props.type === "loan" ? (
        <View className="flex-row items-center gap-3 px-4 pb-4">
          <View className="w-14 h-14 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center">
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
              Bilde
            </Text>
          </View>
          <View className="flex-1">
            <Text
              className="text-content dark:text-content-dark text-sm font-medium"
              numberOfLines={1}
            >
              {props.puzzleTitle}
            </Text>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
              {props.puzzleBrand} · Utlånt til {props.loanedTo}
            </Text>
          </View>
        </View>
      ) : (
        <View className="mx-4 mb-4 h-40 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center">
          <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
            Ferdigbilde
          </Text>
        </View>
      )}
    </View>
  );
}
