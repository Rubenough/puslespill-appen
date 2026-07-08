import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { type Friend } from "../utils/friends";

type Props = {
  friends: Friend[];
  // profile_id-er som er valgt som registrerte deltakere.
  selectedIds: Set<string>;
  onToggle: (friendId: string) => void;
};

// Lar eieren velge aksepterte venner som REGISTRERTE deltakere (session_participants),
// i motsetning til fritekst-gjester (guest_names). Registrerte deltakere kan senere
// legge til fremgangsbilder på økten. Ren utvalgs-UI — forelderen eier state + lagring.
export default function FriendParticipantPicker({
  friends,
  selectedIds,
  onToggle,
}: Props) {
  const { t } = useTranslation();

  if (friends.length === 0) {
    return (
      <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-6">
        {t("sessionForm.noFriendsToAdd")}
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2 mb-6">
      {friends.map((friend) => {
        const selected = selectedIds.has(friend.id);
        const name = friend.name ?? t("common.unknownUser");
        return (
          <TouchableOpacity
            key={friend.id}
            onPress={() => onToggle(friend.id)}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityHint={t("sessionForm.friendToggleHint")}
            accessibilityState={{ selected }}
            className={`flex-row items-center rounded-full px-3 py-1.5 border ${
              selected
                ? "bg-accent/10 dark:bg-accent-dark/10 border-accent dark:border-accent-dark"
                : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
            }`}
          >
            <Text
              className={`text-sm ${
                selected
                  ? "text-accent dark:text-accent-dark font-semibold"
                  : "text-content dark:text-content-dark"
              }`}
            >
              {name}
            </Text>
            {selected && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#1D9E75"
                accessible={false}
                style={{ marginLeft: 6 }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
