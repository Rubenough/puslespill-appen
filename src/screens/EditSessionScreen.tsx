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
import { RootStackParamList } from "../navigation/RootNavigator";

type EditSessionRouteProp = RouteProp<RootStackParamList, "EditSession">;
type EditSessionNavProp = NativeStackNavigationProp<RootStackParamList, "EditSession">;

export default function EditSessionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<EditSessionNavProp>();
  const route = useRoute<EditSessionRouteProp>();
  const { sessionId, guestNames: initialGuests, notes: initialNotes } = route.params;

  const [guestNames, setGuestNames] = useState<string[]>(initialGuests);
  const [nameInput, setNameInput] = useState("");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  function addGuestName() {
    const trimmed = nameInput.trim();
    if (!trimmed || guestNames.includes(trimmed)) return;
    setGuestNames((prev) => [...prev, trimmed]);
    setNameInput("");
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("sessions")
      .update({
        guest_names: guestNames,
        notes: notes.trim() || null,
      })
      .eq("id", sessionId);
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
        <Text className="text-content dark:text-content-dark text-lg font-semibold flex-1">
          Rediger økt
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Lagre"
          accessibilityState={{ disabled: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#1D9E75" />
          ) : (
            <Text className="text-accent dark:text-accent-dark text-base font-semibold">
              Lagre
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Deltakere */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
        >
          DELTAKERE (VALGFRITT)
        </Text>
        {guestNames.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-3">
            {guestNames.map((name) => (
              <View
                key={name}
                accessible
                accessibilityLabel={name}
                className="flex-row items-center bg-surface dark:bg-surface-dark border border-accent dark:border-accent-dark rounded-full px-3 py-1.5"
              >
                <Text className="text-accent dark:text-accent-dark text-sm mr-1.5">{name}</Text>
                <TouchableOpacity
                  onPress={() => setGuestNames((prev) => prev.filter((n) => n !== name))}
                  accessibilityRole="button"
                  accessibilityLabel={`Fjern ${name}`}
                >
                  <Ionicons name="close-circle" size={16} color="#1D9E75" accessible={false} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View className="flex-row bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-6">
          <TextInput
            className="flex-1 px-4 py-3 text-content dark:text-content-dark text-base"
            placeholder="Legg til deltaker..."
            placeholderTextColor="#A8A29E"
            value={nameInput}
            onChangeText={setNameInput}
            onSubmitEditing={addGuestName}
            returnKeyType="done"
            accessibilityLabel="Deltakernavn"
          />
          <TouchableOpacity
            onPress={addGuestName}
            disabled={!nameInput.trim()}
            accessibilityRole="button"
            accessibilityLabel="Legg til deltaker"
            className="px-4 justify-center"
          >
            <Ionicons
              name="add-circle"
              size={26}
              color={nameInput.trim() ? "#1D9E75" : "#A8A29E"}
              accessible={false}
            />
          </TouchableOpacity>
        </View>

        {/* Notat */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
        >
          NOTAT (VALGFRITT)
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder="f.eks. Familiekveld, tok 3 timer..."
            placeholderTextColor="#A8A29E"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            accessibilityLabel="Notat (valgfritt)"
          />
        </View>
      </ScrollView>
    </View>
  );
}
