import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PuzzleProgressIcon, { progressToFilled } from "./PuzzleProgressIcon";

type Props = {
  visible: boolean;
  currentProgress: number | null;
  /** Vis notat-felt for bildenotat (kun etter bildeopplasting) */
  showNoteField?: boolean;
  onSelect: (pct: number, imageNote: string | null) => void;
  onSkip: () => void;
};

const STEPS = [
  { pct: 0, label: "0%", hint: "Nettopp startet" },
  { pct: 25, label: "25%", hint: "Kantene ferdige" },
  { pct: 50, label: "50%", hint: "Halvparten på plass" },
  { pct: 75, label: "75%", hint: "Nesten ferdig" },
  { pct: 100, label: "100%", hint: "Ferdig!" },
] as const;

export default function ProgressSheet({
  visible,
  currentProgress,
  showNoteField = false,
  onSelect,
  onSkip,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");

  // Reset ved åpning
  useEffect(() => {
    if (visible) {
      setSelected(null);
      setNote("");
    }
  }, [visible]);

  const effectiveSelected = selected ?? currentProgress ?? null;

  function handleSave() {
    if (effectiveSelected !== null) {
      onSelect(effectiveSelected, note.trim() || null);
    }
    setSelected(null);
    setNote("");
  }

  function handleSkip() {
    setSelected(null);
    setNote("");
    onSkip();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}
    >
      <Pressable
        className="flex-1 bg-black/40"
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Lukk fremgangsvelger"
      />
      <View
        className="bg-surface dark:bg-surface-dark rounded-t-3xl px-4 pt-2"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full self-center mb-4" />

        <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
          Hvor langt har du kommet?
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-5 px-1">
          Velg det som passer best
        </Text>

        {/* Puslespill-ikon preview */}
        <View className="items-center mb-5">
          <PuzzleProgressIcon
            filled={progressToFilled(effectiveSelected)}
            size={72}
          />
          {effectiveSelected !== null && (
            <Text className="text-accent dark:text-accent-dark text-sm font-semibold mt-2">
              {effectiveSelected}%
            </Text>
          )}
        </View>

        {/* Steg-knapper */}
        <View className="flex-row justify-between mb-4 px-1">
          {STEPS.map((step) => {
            const isActive = effectiveSelected === step.pct;
            return (
              <TouchableOpacity
                key={step.pct}
                onPress={() => setSelected(step.pct)}
                accessibilityRole="button"
                accessibilityLabel={`${step.label}, ${step.hint}`}
                accessibilityState={{ selected: isActive }}
                className={`items-center flex-1 py-3 mx-0.5 rounded-xl ${
                  isActive
                    ? "bg-accent/10 dark:bg-accent-dark/10 border border-accent dark:border-accent-dark"
                    : "bg-surface-secondary dark:bg-surface-dark-secondary border border-transparent"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isActive
                      ? "text-accent dark:text-accent-dark"
                      : "text-content dark:text-content-dark"
                  }`}
                >
                  {step.label}
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${
                    isActive
                      ? "text-accent dark:text-accent-dark"
                      : "text-content-secondary dark:text-content-secondary-dark"
                  }`}
                  numberOfLines={1}
                >
                  {step.hint}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bildenotat (kun etter bildeopplasting) */}
        {showNoteField && (
          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-4">
            <TextInput
              className="text-content dark:text-content-dark text-base"
              placeholder="Hva skjedde siden sist? (valgfritt)"
              placeholderTextColor="#A8A29E"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              accessibilityLabel="Bildenotat (valgfritt)"
            />
          </View>
        )}

        {/* Lagre-knapp */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={effectiveSelected === null}
          accessibilityRole="button"
          accessibilityLabel="Lagre fremgang"
          accessibilityState={{ disabled: effectiveSelected === null }}
          className={`rounded-2xl py-4 items-center mb-3 ${
            effectiveSelected !== null
              ? "bg-accent dark:bg-accent-dark"
              : "bg-accent/40 dark:bg-accent-dark/40"
          }`}
        >
          <Text className="text-white text-base font-semibold">Lagre</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Hopp over"
          className="py-3 items-center"
        >
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
            Hopp over
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
