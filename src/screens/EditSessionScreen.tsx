import React, { useState, useEffect, useCallback } from "react";
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
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { fetchFriends, type Friend } from "../utils/friends";
import FriendParticipantPicker from "../components/FriendParticipantPicker";
import { RootStackParamList } from "../navigation/RootNavigator";

type EditSessionRouteProp = RouteProp<RootStackParamList, "EditSession">;
type EditSessionNavProp = NativeStackNavigationProp<RootStackParamList, "EditSession">;

export default function EditSessionScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<EditSessionNavProp>();
  const route = useRoute<EditSessionRouteProp>();
  const { sessionId, guestNames: initialGuests, notes: initialNotes } = route.params;
  const { user } = useAuth();

  const [guestNames, setGuestNames] = useState<string[]>(initialGuests);
  const [nameInput, setNameInput] = useState("");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  // Registrerte venne-deltakere: aksepterte venner + de som allerede er med.
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Utgangspunktet, for å diffe hva som skal legges til/fjernes ved lagring.
  const [initialIds, setInitialIds] = useState<string[]>([]);

  const loadParticipants = useCallback(async () => {
    if (!user) return;
    const [friendsRes, partsRes] = await Promise.all([
      fetchFriends(user.id).catch(() => [] as Friend[]),
      supabase
        .from("session_participants")
        .select("profile_id")
        .eq("session_id", sessionId),
    ]);
    // Registrerte deltakere utenom eieren (eieren fjernes ikke via denne skjermen).
    const current = (partsRes.data ?? [])
      .map((r) => r.profile_id)
      .filter((id) => id !== user.id);
    setFriends(friendsRes);
    setInitialIds(current);
    setSelectedIds(new Set(current));
  }, [user, sessionId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  function toggleParticipant(friendId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }

  function addGuestName() {
    const trimmed = nameInput.trim();
    if (!trimmed || guestNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    setGuestNames((prev) => [...prev, trimmed]);
    setNameInput("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({
          guest_names: guestNames,
          notes: notes.trim() || null,
        })
        .eq("id", sessionId);
      if (error) throw error;

      // Diff registrerte deltakere: legg til nye, fjern avmerkede.
      const toAdd = [...selectedIds].filter((id) => !initialIds.includes(id));
      const toRemove = initialIds.filter((id) => !selectedIds.has(id));

      if (toAdd.length > 0) {
        const { error: addErr } = await supabase
          .from("session_participants")
          .insert(toAdd.map((profile_id) => ({ session_id: sessionId, profile_id })));
        if (addErr) throw addErr;
      }
      if (toRemove.length > 0) {
        const { error: rmErr } = await supabase
          .from("session_participants")
          .delete()
          .eq("session_id", sessionId)
          .in("profile_id", toRemove);
        if (rmErr) throw rmErr;
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert(
        t("common.somethingWrong"),
        err instanceof Error ? err.message : t("common.somethingWrong"),
      );
    } finally {
      setSaving(false);
    }
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
          accessibilityLabel={t("sessionForm.close")}
        >
          <Ionicons name="close" size={24} color="#78716C" accessible={false} />
        </TouchableOpacity>
        <Text className="text-content dark:text-content-dark text-lg font-semibold flex-1">
          {t("editSession.title")}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t("sessionForm.save")}
          accessibilityState={{ disabled: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#1D9E75" />
          ) : (
            <Text className="text-accent dark:text-accent-dark text-base font-semibold">
              {t("sessionForm.save")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Deltakere — fritekst for folk som ikke er i appen */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-1"
        >
          {t("sessionForm.participantsHeader")}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mb-3">
          {t("sessionForm.guestsHint")}
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
                <Text className="text-accent dark:text-accent-dark text-sm mr-1.5">
                  {name}
                </Text>
                <TouchableOpacity
                  onPress={() => setGuestNames((prev) => prev.filter((n) => n !== name))}
                  accessibilityRole="button"
                  accessibilityLabel={t("sessionForm.removeParticipant", { name })}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color="#1D9E75"
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View className="flex-row bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-6">
          <TextInput
            className="flex-1 px-4 py-3 text-content dark:text-content-dark text-base"
            placeholder={t("sessionForm.addParticipantPlaceholder")}
            placeholderTextColor="#A8A29E"
            value={nameInput}
            onChangeText={setNameInput}
            onSubmitEditing={addGuestName}
            returnKeyType="done"
            accessibilityLabel={t("sessionForm.participantNameA11y")}
          />
          <TouchableOpacity
            onPress={addGuestName}
            disabled={!nameInput.trim()}
            accessibilityRole="button"
            accessibilityLabel={t("sessionForm.addParticipant")}
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

        {/* Registrerte venne-deltakere (kan legge til fremgangsbilder) */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-1"
        >
          {t("sessionForm.friendsHeader")}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mb-3">
          {t("sessionForm.friendsHint")}
        </Text>
        <FriendParticipantPicker
          friends={friends}
          selectedIds={selectedIds}
          onToggle={toggleParticipant}
        />

        {/* Notat */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
        >
          {t("sessionForm.noteHeader")}
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder={t("sessionForm.notePlaceholder")}
            placeholderTextColor="#A8A29E"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            accessibilityLabel={t("sessionForm.noteA11y")}
          />
        </View>
      </ScrollView>
    </View>
  );
}
