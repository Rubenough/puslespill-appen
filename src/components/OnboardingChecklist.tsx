import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

type Props = {
  hasItem: boolean;
  hasFriend: boolean;
  complete: boolean;
  onAddItem: () => void;
  onInviteFriend: () => void;
  onDismiss: () => void;
};

/**
 * Kom i gang-sjekkliste (førstegangsbrukere): et lett kort øverst i feeden —
 * ikke en blokkerende modal. To steg (legg til ting, inviter venner) hukes av
 * live fra data; ferdig-tilstanden peker på feeden og kan lukkes permanent.
 */
export default function OnboardingChecklist({
  hasItem,
  hasFriend,
  complete,
  onAddItem,
  onInviteFriend,
  onDismiss,
}: Props) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const accent = colorScheme === "dark" ? "#34D399" : "#1D9E75";
  const muted = colorScheme === "dark" ? "#A8A29E" : "#78716C";

  if (complete) {
    return (
      <View className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-4">
        <View className="flex-row items-center mb-1">
          <Ionicons name="checkmark-circle" size={22} color={accent} accessible={false} />
          <Text className="text-content dark:text-content-dark font-semibold text-base ml-2">
            {t("onboarding.doneTitle")}
          </Text>
        </View>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-3">
          {t("onboarding.doneBody")}
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.doneCta")}
          className="bg-accent dark:bg-accent-dark rounded-xl px-4 py-2.5 self-start"
        >
          <Text className="text-white font-semibold text-sm">
            {t("onboarding.doneCta")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = [
    {
      key: "items",
      done: hasItem,
      label: t("onboarding.stepItems"),
      hint: t("onboarding.stepItemsHint"),
      onPress: onAddItem,
    },
    {
      key: "friends",
      done: hasFriend,
      label: t("onboarding.stepFriends"),
      hint: t("onboarding.stepFriendsHint"),
      onPress: onInviteFriend,
    },
  ];

  return (
    <View className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-content dark:text-content-dark font-semibold text-base">
          {t("onboarding.title")}
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.dismissA11y")}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={muted} accessible={false} />
        </TouchableOpacity>
      </View>

      {steps.map((step, i) => (
        <TouchableOpacity
          key={step.key}
          onPress={step.onPress}
          disabled={step.done}
          accessibilityRole="button"
          accessibilityLabel={
            step.done ? t("onboarding.stepDoneA11y", { label: step.label }) : step.label
          }
          accessibilityHint={step.done ? undefined : step.hint}
          accessibilityState={{ disabled: step.done }}
          className={`flex-row items-center py-2.5 ${
            i < steps.length - 1 ? "border-b border-border dark:border-border-dark" : ""
          }`}
        >
          <Ionicons
            name={step.done ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={step.done ? accent : muted}
            accessible={false}
          />
          <Text
            className={`flex-1 ml-3 text-sm font-medium ${
              step.done
                ? "text-content-secondary dark:text-content-secondary-dark line-through"
                : "text-content dark:text-content-dark"
            }`}
          >
            {step.label}
          </Text>
          {!step.done && (
            <Ionicons name="chevron-forward" size={16} color={muted} accessible={false} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
