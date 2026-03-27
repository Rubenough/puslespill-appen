import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import UserAvatar from "./UserAvatar";

type OwnSession = {
  isOwn: true;
  puzzleTitle: string;
  dayNumber: number;
  timeLabel: string;
  imageUrl?: string | null;
  onPress?: () => void;
};

type FriendSession = {
  isOwn: false;
  userName: string;
  avatarUrl?: string | null;
  puzzleTitle: string;
  dayNumber: number;
  timeLabel: string;
  imageUrl?: string | null;
  onPress?: () => void;
};

type Props = OwnSession | FriendSession;

export default function ActiveSessionCard(props: Props) {
  const { puzzleTitle, dayNumber, timeLabel } = props;

  const ownerLabel = props.isOwn ? "Din økt" : props.userName;

  return (
    <TouchableOpacity
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ownerLabel}: ${puzzleTitle}, dag ${dayNumber}, ${timeLabel}`}
      accessibilityHint="Trykk for å se økt-detaljer"
      style={{ width: 200 }}
      className={`rounded-xl p-3 bg-surface dark:bg-surface-dark mr-3 ${
        props.isOwn
          ? "border-2 border-accent dark:border-accent-dark"
          : "border border-border dark:border-border-dark"
      }`}
    >
      {/* Topprad */}
      {props.isOwn ? (
        <View className="flex-row items-center gap-1.5 mb-2">
          <View className="w-2 h-2 rounded-full bg-accent dark:bg-accent-dark" />
          <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
            Din økt
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-2 mb-2">
          <UserAvatar name={props.userName} avatarUrl={props.avatarUrl} size={24} />
          <Text className="text-content dark:text-content-dark text-xs font-semibold">
            {props.userName}
          </Text>
        </View>
      )}

      {/* Bildeplass */}
      {props.imageUrl ? (
        <Image
          source={{ uri: props.imageUrl }}
          className="w-full h-[110px] rounded-lg mb-2"
          resizeMode="cover"
          accessible={false}
        />
      ) : (
        <View className="w-full h-[110px] rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mb-2">
          <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
            Bilde
          </Text>
        </View>
      )}

      {/* Tittel og fremdrift */}
      <Text
        className="text-content dark:text-content-dark text-sm font-medium"
        numberOfLines={1}
      >
        {puzzleTitle}
      </Text>
      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
        Dag {dayNumber} · {timeLabel}
      </Text>
    </TouchableOpacity>
  );
}
