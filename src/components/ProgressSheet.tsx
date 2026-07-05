import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import PuzzleProgressIcon, { progressToFilled } from "./PuzzleProgressIcon";

type Props = {
  visible: boolean;
  currentProgress: number | null;
  onSelect: (pct: number, imageUri: string | null, note: string | null) => void;
  onCancel: () => void;
};

const STEPS = [
  { pct: 0, label: "0%", hintKey: "progress.hint0" },
  { pct: 25, label: "25%", hintKey: "progress.hint25" },
  { pct: 50, label: "50%", hintKey: "progress.hint50" },
  { pct: 75, label: "75%", hintKey: "progress.hint75" },
  { pct: 100, label: "100%", hintKey: "progress.hint100" },
] as const;

export default function ProgressSheet({
  visible,
  currentProgress,
  onSelect,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Reset ved åpning
  useEffect(() => {
    if (visible) {
      setSelected(null);
      setNote("");
      setImageUri(null);
    }
  }, [visible]);

  const effectiveSelected = selected ?? currentProgress ?? null;
  const isCompletion = effectiveSelected === 100;

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  function handleSave() {
    if (effectiveSelected !== null) {
      onSelect(effectiveSelected, imageUri, note.trim() || null);
    }
    setSelected(null);
    setNote("");
    setImageUri(null);
  }

  function handleCancel() {
    setSelected(null);
    setNote("");
    setImageUri(null);
    onCancel();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <Pressable
        className="flex-1 bg-black/40"
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel={t("progress.closeSheet")}
      />
      <View
        className="bg-surface dark:bg-surface-dark rounded-t-3xl px-4 pt-2"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full self-center mb-4" />

        <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
          {t("progress.title")}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-4 px-1">
          {t("progress.subtitle")}
        </Text>

        {/* Bildevelger */}
        {imageUri ? (
          <View className="relative mb-4">
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: 160, borderRadius: 16 }}
              resizeMode="cover"
              accessible={false}
            />
            <TouchableOpacity
              onPress={() => setImageUri(null)}
              accessibilityRole="button"
              accessibilityLabel={t("progress.removeImage")}
              className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5"
            >
              <Ionicons name="close" size={18} color="white" accessible={false} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handlePickImage}
            accessibilityRole="button"
            accessibilityLabel={t("progress.addImage")}
            className="border border-dashed border-border dark:border-border-dark rounded-2xl py-5 items-center mb-4"
          >
            <Ionicons
              name="camera-outline"
              size={28}
              color="#A8A29E"
              accessible={false}
            />
            <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-1.5">
              {t("progress.addImageOptional")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Puslespill-ikon preview */}
        <View className="items-center mb-4">
          <PuzzleProgressIcon filled={progressToFilled(effectiveSelected)} size={64} />
          {effectiveSelected !== null && (
            <Text className="text-accent dark:text-accent-dark text-sm font-semibold mt-1.5">
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
                accessibilityLabel={t("progress.stepA11y", {
                  label: step.label,
                  hint: t(step.hintKey),
                })}
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
                  {t(step.hintKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notat */}
        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-4">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder={
              isCompletion
                ? t("progress.notePlaceholderCompletion")
                : t("progress.notePlaceholder")
            }
            placeholderTextColor="#A8A29E"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel={t("progress.noteA11y")}
          />
        </View>

        {/* Lagre / Fullfør-knapp */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={effectiveSelected === null}
          accessibilityRole="button"
          accessibilityLabel={
            isCompletion ? t("progress.completeSession") : t("progress.saveProgress")
          }
          accessibilityState={{ disabled: effectiveSelected === null }}
          className={`rounded-2xl py-4 items-center mb-3 ${
            effectiveSelected !== null
              ? "bg-accent dark:bg-accent-dark"
              : "bg-accent/40 dark:bg-accent-dark/40"
          }`}
        >
          <Text className="text-white text-base font-semibold">
            {isCompletion ? t("progress.completeSession") : t("progress.save")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          className="py-3 items-center"
        >
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
