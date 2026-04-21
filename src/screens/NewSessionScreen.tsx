import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_ICONS, type ItemType } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";

type NewSessionRouteProp = RouteProp<RootStackParamList, "NewSession">;
type NewSessionNavProp = NativeStackNavigationProp<RootStackParamList, "NewSession">;

type SessionItem = {
  id: string;
  title: string;
  brand: string | null;
  type: ItemType;
};

export default function NewSessionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NewSessionNavProp>();
  const route = useRoute<NewSessionRouteProp>();
  const { user } = useAuth();

  const [items, setItems] = useState<SessionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    route.params?.itemId ?? null,
  );
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [completed, setCompleted] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
  const isPuzzle = selectedItem?.type === "puslespill";

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase
        .from("items")
        .select("id, title, brand, type")
        .eq("owner_id", user!.id)
        .order("title", { ascending: true });
      setItems((data as SessionItem[]) ?? []);
      setLoadingItems(false);
    }
    fetchItems();
  }, [user]);

  function addGuestName() {
    const trimmed = nameInput.trim();
    if (!trimmed || guestNames.includes(trimmed)) return;
    setGuestNames((prev) => [...prev, trimmed]);
    setNameInput("");
  }

  async function pickImage() {
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

  async function uploadImage(uri: string): Promise<string | null> {
    const fileName = `${user!.id}/${Date.now()}.jpg`;
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from("session-images")
      .upload(fileName, arrayBuffer, { contentType: "image/jpeg" });

    if (error) return null;

    const { data } = supabase.storage
      .from("session-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleStart() {
    if (!selectedItemId) {
      Alert.alert("Velg gjenstand", "Du må velge en gjenstand for å starte en økt.");
      return;
    }

    setSaving(true);

    let imageUrl: string | null = null;
    if (imageUri) {
      imageUrl = await uploadImage(imageUri);
      if (!imageUrl) {
        setSaving(false);
        Alert.alert("Noe gikk galt", "Kunne ikke laste opp bildet. Prøv igjen.");
        return;
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        item_id: selectedItemId,
        created_by: user!.id,
        notes: notes.trim() || null,
        guest_names: guestNames,
        image_url: imageUrl,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (sessionError) {
      setSaving(false);
      Alert.alert("Noe gikk galt", sessionError.message);
      return;
    }

    const { error: participantError } = await supabase
      .from("session_participants")
      .insert({ session_id: session.id, profile_id: user!.id });

    setSaving(false);

    if (participantError) {
      Alert.alert("Noe gikk galt", participantError.message);
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
          Ny økt
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Gjenstand */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
        >
          GJENSTAND
        </Text>
        {loadingItems ? (
          <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
        ) : items.length === 0 ? (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-4 mb-6">
            <Text className="text-content-secondary dark:text-content-secondary-dark text-base">
              Du har ingen gjenstander i samlingen ennå.
            </Text>
          </View>
        ) : (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-6">
            {items.map((item, index) => {
              const isSelected = item.id === selectedItemId;
              const isLast = index === items.length - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedItemId(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={item.brand ? `${item.title}, ${item.brand}` : item.title}
                  accessibilityState={{ selected: isSelected }}
                  className={`flex-row items-center px-4 py-4 ${
                    !isLast ? "border-b border-border dark:border-border-dark" : ""
                  }`}
                >
                  <Ionicons
                    name={ITEM_ICONS[item.type]}
                    size={20}
                    color={isSelected ? "#1D9E75" : "#78716C"}
                    accessible={false}
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-content dark:text-content-dark text-base">
                      {item.title}
                    </Text>
                    {item.brand && (
                      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                        {item.brand}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#1D9E75"
                      accessible={false}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
                <Text className="text-accent dark:text-accent-dark text-sm mr-1.5">
                  {name}
                </Text>
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

        {/* Fullført */}
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-4 mb-6 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-content dark:text-content-dark text-base">Fullført</Text>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
              Ble gjenstanden ferdig denne gangen?
            </Text>
          </View>
          <Switch
            value={completed}
            onValueChange={setCompleted}
            trackColor={{ false: "#D6D3D1", true: "#1D9E75" }}
            thumbColor="white"
            accessibilityLabel="Fullført"
            accessibilityHint="Marker om gjenstanden ble ferdig denne gangen"
          />
        </View>

        {/* Bilde */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
        >
          {isPuzzle ? "BILDE AV BOKSEN" : "BILDE (VALGFRITT)"}
        </Text>
        {imageUri ? (
          <View className="relative mb-6">
            <Image
              source={{ uri: imageUri }}
              className="w-full rounded-2xl"
              style={{ height: 200 }}
              accessible={false}
            />
            <TouchableOpacity
              onPress={() => setImageUri(null)}
              accessibilityRole="button"
              accessibilityLabel="Fjern bilde"
              className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
            >
              <Ionicons name="close" size={20} color="white" accessible={false} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel={isPuzzle ? "Ta bilde av boksen" : "Velg bilde fra bildebiblioteket"}
            className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-6 items-center mb-6"
          >
            <Ionicons name="camera-outline" size={32} color="#78716C" accessible={false} />
            <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-2">
              {isPuzzle ? "Ta bilde av forsiden" : "Velg bilde"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Notat */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
        >
          NOTAT (VALGFRITT)
        </Text>
        <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-6">
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

      {/* Start økt-knapp — sticky bunn */}
      <View
        className="px-4 bg-surface-secondary dark:bg-surface-dark-secondary"
        style={{ paddingBottom: insets.bottom + 36, paddingTop: 12 }}
      >
        <TouchableOpacity
          onPress={handleStart}
          disabled={saving || !selectedItemId}
          accessibilityRole="button"
          accessibilityLabel="Start økt"
          accessibilityState={{ disabled: saving || !selectedItemId }}
          className={`rounded-2xl py-4 items-center justify-center ${
            selectedItemId
              ? "bg-accent dark:bg-accent-dark"
              : "bg-border dark:bg-border-dark"
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">Start økt</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
