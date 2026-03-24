import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UserAvatar from "../components/UserAvatar";

const MOCK_FRIENDS = [
  {
    name: "Turid Nielsen",
    avatarUrl: null,
    mutualItems: 3,
    lastActive: "i dag",
  },
  {
    name: "Ole Moen",
    avatarUrl: null,
    mutualItems: 1,
    lastActive: "i går",
  },
  {
    name: "Petter Moe",
    avatarUrl: null,
    mutualItems: 5,
    lastActive: "3 dager siden",
  },
  {
    name: "Maria Dahl",
    avatarUrl: null,
    mutualItems: 0,
    lastActive: "1 uke siden",
  },
  {
    name: "Lars Berg",
    avatarUrl: null,
    mutualItems: 2,
    lastActive: "2 uker siden",
  },
];

export default function FriendsScreen() {
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
        Venner
      </Text>

      {/* Søk — placeholder */}
      <TouchableOpacity className="mx-4 mb-6 flex-row items-center gap-3 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3">
        <Text className="text-content-secondary dark:text-content-secondary-dark flex-1">
          Finn venner ...
        </Text>
      </TouchableOpacity>

      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3">
        FØLGER
      </Text>
      <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
        {MOCK_FRIENDS.map((friend, i) => (
          <TouchableOpacity
            key={friend.name}
            className={`flex-row items-center px-4 py-3 ${
              i < MOCK_FRIENDS.length - 1
                ? "border-b border-border dark:border-border-dark"
                : ""
            }`}
          >
            <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} size={44} />
            <View className="flex-1 ml-3">
              <Text className="text-content dark:text-content-dark font-medium">
                {friend.name}
              </Text>
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
                {friend.mutualItems > 0
                  ? `${friend.mutualItems} felles i samlingen · ${friend.lastActive}`
                  : `Aktiv ${friend.lastActive}`}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
