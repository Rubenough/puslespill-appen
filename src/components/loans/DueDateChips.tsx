// Hurtigvalg-chips for lånefrist (DUE_OPTIONS) — brukes ved godkjenning i lånehuben.
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { DUE_OPTIONS } from "../../utils/loans";

type DueDateChipsProps = {
  /** Valgt nøkkel fra DUE_OPTIONS ("none" | "1w" | "2w" | "1m"). */
  value: string;
  onChange: (key: string) => void;
  disabled: boolean;
};

export default function DueDateChips({ value, onChange, disabled }: DueDateChipsProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-2">
      {DUE_OPTIONS.map((opt) => {
        const selected = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t(opt.labelKey)}
            accessibilityState={{ selected, disabled }}
            className={`px-3 py-1.5 rounded-full border ${
              selected
                ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                : "bg-surface-secondary dark:bg-surface-dark-secondary border-border dark:border-border-dark"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                selected ? "text-white" : "text-content dark:text-content-dark"
              }`}
            >
              {t(opt.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
