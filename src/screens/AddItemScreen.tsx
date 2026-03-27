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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_LABELS } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";

type AddItemRouteProp = RouteProp<RootStackParamList, "AddItem">;
type AddItemNavProp = NativeStackNavigationProp<RootStackParamList, "AddItem">;

const DIFFICULTY_OPTIONS = ["Lett", "Middels", "Vanskelig"];

export default function AddItemScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AddItemNavProp>();
  const route = useRoute<AddItemRouteProp>();
  const { type } = route.params;
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [pieceCount, setPieceCount] = useState("");
  const [playerCount, setPlayerCount] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Mangler tittel", "Fyll inn tittel for gjenstanden.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("items").insert({
      owner_id: user!.id,
      type,
      title: title.trim(),
      brand: brand.trim() || null,
      piece_count: pieceCount ? parseInt(pieceCount, 10) : null,
      player_count: playerCount ? parseInt(playerCount, 10) : null,
      difficulty: difficulty || null,
      status: "Tilgjengelig",
    });
    setSaving(false);

    if (error) {
      Alert.alert("Noe gikk galt", error.message);
      return;
    }

    navigation.goBack();
  }

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-4 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-3"
          accessibilityRole="button"
          accessibilityLabel="Lukk"
        >
          <Ionicons name="close" size={24} color="#78716C" accessible={false} />
        </TouchableOpacity>
        <Text className="text-content dark:text-content-dark text-lg font-semibold">
          Legg til {ITEM_LABELS[type].toLowerCase()}
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
            placeholder={
              type === "puslespill" ? "f.eks. Kinkaku-ji" : "f.eks. Wingspan"
            }
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
              type === "puslespill"
                ? "f.eks. Ravensburger"
                : "f.eks. Stonemaier Games"
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
          accessibilityLabel={`Lagre ${ITEM_LABELS[type].toLowerCase()}`}
          accessibilityState={{ disabled: saving }}
          className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center justify-center"
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">Lagre</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
