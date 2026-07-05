import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { type ItemType, type Difficulty, DIFFICULTY_OPTIONS } from "../utils/collections";
import { difficultyLabel } from "../utils/collectionLabels";

export type ItemFormValues = {
  title: string;
  brand: string;
  pieceCount: string;
  playerCount: string;
  difficulty: Difficulty | "";
};

type ItemFormProps = {
  type: ItemType;
  headerLabel: string;
  saveLabel: string;
  saveAccessibilityLabel: string;
  initialValues?: Partial<ItemFormValues>;
  saving: boolean;
  onSave: (values: ItemFormValues) => void;
  onClose: () => void;
};

export default function ItemForm({
  type,
  headerLabel,
  saveLabel,
  saveAccessibilityLabel,
  initialValues,
  saving,
  onSave,
  onClose,
}: ItemFormProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [brand, setBrand] = useState(initialValues?.brand ?? "");
  const [pieceCount, setPieceCount] = useState(initialValues?.pieceCount ?? "");
  const [playerCount, setPlayerCount] = useState(initialValues?.playerCount ?? "");
  const [difficulty, setDifficulty] = useState(initialValues?.difficulty ?? "");

  function handleSave() {
    if (!title.trim()) {
      Alert.alert(t("itemForm.missingTitleTitle"), t("itemForm.missingTitleBody"));
      return;
    }
    onSave({ title, brand, pieceCount, playerCount, difficulty });
  }

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-4 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={onClose}
          className="mr-3"
          accessibilityRole="button"
          accessibilityLabel={t("itemForm.close")}
        >
          <Ionicons name="close" size={24} color="#78716C" accessible={false} />
        </TouchableOpacity>
        <Text className="text-content dark:text-content-dark text-lg font-semibold">
          {headerLabel}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tittel */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
          {t("itemForm.titleLabel")}
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder={
              type === "puslespill"
                ? t("itemForm.titlePlaceholderPuzzle")
                : t("itemForm.titlePlaceholderBoardGame")
            }
            placeholderTextColor="#A8A29E"
            value={title}
            onChangeText={setTitle}
            autoFocus
            accessibilityLabel={t("itemForm.titleA11y")}
          />
        </View>

        {/* Merke */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
          {t("itemForm.brandLabel")}
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder={
              type === "puslespill"
                ? t("itemForm.brandPlaceholderPuzzle")
                : t("itemForm.brandPlaceholderBoardGame")
            }
            placeholderTextColor="#A8A29E"
            value={brand}
            onChangeText={setBrand}
            accessibilityLabel={t("itemForm.brandA11y")}
          />
        </View>

        {/* Type-spesifikk metadata */}
        {type === "puslespill" && (
          <>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
              {t("itemForm.pieceCountLabel")}
            </Text>
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
              <TextInput
                className="text-content dark:text-content-dark text-base"
                placeholder={t("itemForm.pieceCountPlaceholder")}
                placeholderTextColor="#A8A29E"
                value={pieceCount}
                onChangeText={(text) => setPieceCount(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                accessibilityLabel={t("itemForm.pieceCountA11y")}
              />
            </View>

            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
              {t("itemForm.difficultyHeader")}
            </Text>
            <View className="flex-row gap-3 mb-6">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setDifficulty(difficulty === opt ? "" : opt)}
                  accessibilityRole="button"
                  accessibilityLabel={difficultyLabel(opt)}
                  accessibilityState={{ selected: difficulty === opt }}
                  className={`flex-1 py-3 rounded-2xl border items-center ${
                    difficulty === opt
                      ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                      : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      difficulty === opt
                        ? "text-white"
                        : "text-content dark:text-content-dark"
                    }`}
                  >
                    {difficultyLabel(opt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {type === "brettspill" && (
          <>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
              {t("itemForm.playerCountLabel")}
            </Text>
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
              <TextInput
                className="text-content dark:text-content-dark text-base"
                placeholder={t("itemForm.playerCountPlaceholder")}
                placeholderTextColor="#A8A29E"
                value={playerCount}
                onChangeText={(text) => setPlayerCount(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                accessibilityLabel={t("itemForm.playerCountA11y")}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Lagre-knapp — sticky bunn */}
      <View
        className="px-4 bg-surface-secondary dark:bg-surface-dark-secondary"
        style={{ paddingBottom: insets.bottom + 36, paddingTop: 12 }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saveAccessibilityLabel}
          accessibilityState={{ disabled: saving }}
          className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center justify-center"
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">{saveLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
