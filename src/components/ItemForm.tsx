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
import { type ItemType, ITEM_LABELS, DIFFICULTY_OPTIONS } from "../utils/collections";

export type ItemFormValues = {
  title: string;
  brand: string;
  pieceCount: string;
  playerCount: string;
  difficulty: string;
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

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [brand, setBrand] = useState(initialValues?.brand ?? "");
  const [pieceCount, setPieceCount] = useState(initialValues?.pieceCount ?? "");
  const [playerCount, setPlayerCount] = useState(initialValues?.playerCount ?? "");
  const [difficulty, setDifficulty] = useState(initialValues?.difficulty ?? "");

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Mangler tittel", "Fyll inn tittel for gjenstanden.");
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
          accessibilityLabel="Lukk"
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
          TITTEL
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder={type === "puslespill" ? "f.eks. Kinkaku-ji" : "f.eks. Wingspan"}
            placeholderTextColor="#A8A29E"
            value={title}
            onChangeText={setTitle}
            autoFocus
            accessibilityLabel="Tittel"
          />
        </View>

        {/* Merke */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
          MERKE (VALGFRITT)
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder={
              type === "puslespill" ? "f.eks. Ravensburger" : "f.eks. Stonemaier Games"
            }
            placeholderTextColor="#A8A29E"
            value={brand}
            onChangeText={setBrand}
            accessibilityLabel="Merke (valgfritt)"
          />
        </View>

        {/* Type-spesifikk metadata */}
        {type === "puslespill" && (
          <>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
              ANTALL BRIKKER (VALGFRITT)
            </Text>
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
              <TextInput
                className="text-content dark:text-content-dark text-base"
                placeholder="f.eks. 1000"
                placeholderTextColor="#A8A29E"
                value={pieceCount}
                onChangeText={setPieceCount}
                keyboardType="number-pad"
                accessibilityLabel="Antall brikker (valgfritt)"
              />
            </View>

            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
              VANSKELIGHETSGRAD (VALGFRITT)
            </Text>
            <View className="flex-row gap-3 mb-6">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setDifficulty(difficulty === opt ? "" : opt)}
                  accessibilityRole="button"
                  accessibilityLabel={opt}
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
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {type === "brettspill" && (
          <>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
              ANTALL SPILLERE (VALGFRITT)
            </Text>
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
              <TextInput
                className="text-content dark:text-content-dark text-base"
                placeholder="f.eks. 2–5"
                placeholderTextColor="#A8A29E"
                value={playerCount}
                onChangeText={setPlayerCount}
                accessibilityLabel="Antall spillere (valgfritt)"
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
