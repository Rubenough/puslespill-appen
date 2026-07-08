import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import BottomSheet from "./BottomSheet";

type Props = {
  visible: boolean;
  saving: boolean;
  // Bildet er påkrevd — deltakere kan kun bidra med et fremgangsbilde (+ notat),
  // ikke oppdatere fremgang/fullføring. Notatet lagres på bilde-raden, ikke økten.
  onSubmit: (imageUri: string, note: string | null) => void;
  onCancel: () => void;
};

export default function AddPhotoSheet({ visible, saving, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setImageUri(null);
      setNote("");
    }
  }, [visible]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  const canSubmit = !!imageUri && !saving;

  return (
    <BottomSheet visible={visible} onClose={onCancel} closeLabel={t("session.closeMenu")}>
      <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
        {t("session.addPhotoTitle")}
      </Text>
      <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-4 px-1">
        {t("session.addPhotoSubtitle")}
      </Text>

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
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={t("session.addPhotoRemove")}
            className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5"
          >
            <Ionicons name="close" size={18} color="white" accessible={false} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={pickImage}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t("session.addPhotoPick")}
          className="border border-dashed border-border dark:border-border-dark rounded-2xl py-5 items-center mb-4"
        >
          <Ionicons name="camera-outline" size={28} color="#A8A29E" accessible={false} />
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-1.5">
            {t("session.addPhotoPick")}
          </Text>
        </TouchableOpacity>
      )}

      <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-4">
        <TextInput
          className="text-content dark:text-content-dark text-base"
          placeholder={t("session.addPhotoNotePlaceholder")}
          placeholderTextColor="#A8A29E"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          accessibilityLabel={t("session.addPhotoNoteA11y")}
        />
      </View>

      <TouchableOpacity
        onPress={() => imageUri && onSubmit(imageUri, note.trim() || null)}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel={t("session.addPhotoSubmitA11y")}
        accessibilityState={{ disabled: !canSubmit }}
        className={`rounded-2xl py-4 items-center mb-3 ${
          canSubmit
            ? "bg-accent dark:bg-accent-dark"
            : "bg-accent/40 dark:bg-accent-dark/40"
        }`}
      >
        {saving ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="text-white text-base font-semibold">
            {t("session.addPhotoSubmit")}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onCancel}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
        className="py-3 items-center"
      >
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
          {t("common.cancel")}
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}
