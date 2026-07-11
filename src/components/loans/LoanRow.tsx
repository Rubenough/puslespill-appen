// Delte rader for aktive lån i lånehuben: UTLÅNT NÅ (eier) og DU LÅNER NÅ (låntaker).
// Undertittelen bruker frist-innramming ("forfaller om 3 dager" / rød "2 dager over
// fristen") når due_at finnes, ellers relativ tid siden utlånet.
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type ItemType, ITEM_ICONS } from "../../utils/collections";
import { dueDateLabel } from "../../utils/loans";
import { getRelativeDayLabel } from "../../utils/date";

/** Frist- eller falltilbake-tekst for a11y-etiketter og undertittel. */
export function loanWhenLabel(loanedAt: string, dueAt: string | null): string {
  return dueAt ? dueDateLabel(dueAt).label : getRelativeDayLabel(loanedAt);
}

function ItemIcon({ itemType }: { itemType: ItemType | undefined }) {
  return (
    <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
      <Ionicons
        name={itemType ? ITEM_ICONS[itemType] : "cube-outline"}
        size={20}
        color="#1D9E75"
        accessible={false}
      />
    </View>
  );
}

/** "{{person}} · {{frist eller relativ tid}}" — fristdelen rødfarges når den er passert. */
function PersonWhenLine({
  personText,
  loanedAt,
  dueAt,
}: {
  personText: string;
  loanedAt: string;
  dueAt: string | null;
}) {
  const due = dueAt ? dueDateLabel(dueAt) : null;
  return (
    <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
      {personText} ·{" "}
      {due ? (
        <Text className={due.overdue ? "text-red-500 font-medium" : ""}>{due.label}</Text>
      ) : (
        getRelativeDayLabel(loanedAt)
      )}
    </Text>
  );
}

function StatusBadge({ text, accent }: { text: string; accent: boolean }) {
  return (
    <View
      className={`px-2 py-1 rounded-full mr-2 ${
        accent
          ? "bg-accent/10 dark:bg-accent-dark/10"
          : "bg-surface-secondary dark:bg-surface-dark-secondary"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          accent
            ? "text-accent dark:text-accent-dark"
            : "text-content-secondary dark:text-content-secondary-dark"
        }`}
      >
        {text}
      </Text>
    </View>
  );
}

type LoanRowProps = {
  title: string;
  itemType: ItemType | undefined;
  /** Person-delen av undertittelen, ferdig oversatt ("Ole" / "fra Kari"). */
  personText: string;
  loanedAt: string;
  dueAt: string | null;
  /** Ekstra linje under undertittelen (f.eks. eiers retur-melding til låntaker). */
  noteLine?: string | null;
  /** Statusmerke til høyre ("Retur meldt" / "Retur etterspurt"). */
  badge?: { text: string; accent: boolean } | null;
  /** Skjul pil-ikonet til høyre (når merket alene er nok). */
  hideTrailingIcon?: boolean;
  busy: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  isLast: boolean;
};

export default function LoanRow({
  title,
  itemType,
  personText,
  loanedAt,
  dueAt,
  noteLine,
  badge,
  hideTrailingIcon = false,
  busy,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  isLast,
}: LoanRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: busy }}
      className={`flex-row items-center px-4 py-4 ${
        !isLast ? "border-b border-border dark:border-border-dark" : ""
      }`}
    >
      <ItemIcon itemType={itemType} />
      <View className="flex-1">
        <Text className="text-content dark:text-content-dark font-medium">{title}</Text>
        <PersonWhenLine personText={personText} loanedAt={loanedAt} dueAt={dueAt} />
        {noteLine ? (
          <Text className="text-accent dark:text-accent-dark text-xs font-medium mt-0.5">
            {noteLine}
          </Text>
        ) : null}
      </View>
      {!busy && badge ? <StatusBadge text={badge.text} accent={badge.accent} /> : null}
      {busy ? (
        <ActivityIndicator size="small" color="#1D9E75" />
      ) : hideTrailingIcon ? null : (
        <Ionicons
          name="return-down-back-outline"
          size={20}
          color="#78716C"
          accessible={false}
        />
      )}
    </TouchableOpacity>
  );
}
