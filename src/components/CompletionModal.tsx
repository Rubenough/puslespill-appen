import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import PuzzleProgressIcon from "./PuzzleProgressIcon";

type Props = {
  visible: boolean;
  currentNotes: string | null;
  onComplete: (data: { notes: string | null; imageUri: string | null }) => void;
  onCancel: () => void;
};

export default function CompletionModal({
  visible,
  currentNotes,
  onComplete,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleComplete() {
    setSubmitting(true);
    await onComplete({
      notes: notes.trim() || null,
      imageUri,
    });
    setSubmitting(false);
    setImageUri(null);
    setNotes("");
  }

  function handleCancel() {
    setImageUri(null);
    setNotes(currentNotes ?? "");
    onCancel();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 pb-4 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark"
          style={{ paddingTop: insets.top + 16 }}
        >
          <TouchableOpacity
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Avbryt"
          >
            <Text className="text-content-secondary dark:text-content-secondary-dark text-base">
              Avbryt
            </Text>
          </TouchableOpacity>
          <Text className="text-content dark:text-content-dark text-lg font-semibold">
            Fullfør økt
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ikon + gratulasjon */}
          <View className="items-center mt-6 mb-8">
            <PuzzleProgressIcon filled={4} size={80} />
            <Text className="text-content dark:text-content-dark text-2xl font-semibold mt-4">
              Gratulerer!
            </Text>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-1">
              Fremgang settes til 100%
            </Text>
          </View>

          {/* Ferdigbilde */}
          <Text
            accessibilityRole="header"
            className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
          >
            FERDIGBILDE
          </Text>
          {imageUri ? (
            <View className="mb-5">
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: 200, borderRadius: 16 }}
                resizeMode="cover"
                accessible={false}
              />
              <TouchableOpacity
                onPress={() => setImageUri(null)}
                accessibilityRole="button"
                accessibilityLabel="Fjern bilde"
                className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5"
              >
                <Ionicons name="close" size={18} color="white" accessible={false} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handlePickImage}
              accessibilityRole="button"
              accessibilityLabel="Legg til ferdigbilde"
              className="border border-dashed border-border dark:border-border-dark rounded-2xl py-8 items-center mb-5"
            >
              <Ionicons name="camera-outline" size={32} color="#A8A29E" accessible={false} />
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-2">
                Legg til et ferdigbilde
              </Text>
            </TouchableOpacity>
          )}

          {/* Notat */}
          <Text
            accessibilityRole="header"
            className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
          >
            NOTAT
          </Text>
          <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-8">
            <TextInput
              className="text-content dark:text-content-dark text-base"
              placeholder="Noen siste tanker?"
              placeholderTextColor="#A8A29E"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Notat (valgfritt)"
            />
          </View>
        </ScrollView>

        {/* Fullfør-knapp */}
        <View
          className="px-4 bg-surface-secondary dark:bg-surface-dark-secondary border-t border-border dark:border-border-dark"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}
        >
          <TouchableOpacity
            onPress={handleComplete}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Fullfør"
            accessibilityState={{ disabled: submitting }}
            className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Fullfør
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
