import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useProfil } from "../context/ProfilContext";
import BottomSheet from "./BottomSheet";
import UserAvatar from "./UserAvatar";
import { uploadSessionImage, removeSessionImages } from "../utils/sessionImages";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

/**
 * Redigering av visningsnavn + avatar (profilen var tidligere skrivebeskyttet —
 * navn/bilde kom rått fra Google). Avatar lastes opp til session-images under
 * `<userId>/avatar/…`; LAGRINGSSTIEN lagres i profiles.avatar_url (aldri en URL).
 * DB-grants tillater kun full_name/initials/avatar_url; RLS begrenser til egen rad.
 */
export default function ProfileEditSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const { profil, retry } = useProfil();

  const [name, setName] = useState("");
  // `pickedUri` = nytt lokalt bilde som må lastes opp; `avatarRemoved` = brukeren
  // fjernet bildet uten å velge nytt (→ avatar_url settes til null).
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

  const accent = colorScheme === "dark" ? "#34D399" : "#1D9E75";

  // Nullstill skjemaet hver gang arket åpnes, seedet fra gjeldende profil.
  useEffect(() => {
    if (visible) {
      setName(profil?.full_name ?? "");
      setPickedUri(null);
      setAvatarRemoved(false);
    }
  }, [visible, profil?.full_name]);

  const previewUri =
    pickedUri ?? (avatarRemoved ? null : (profil?.avatarDisplayUrl ?? null));

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPickedUri(result.assets[0].uri);
      setAvatarRemoved(false);
    }
  }

  function removeAvatar() {
    setPickedUri(null);
    setAvatarRemoved(true);
  }

  async function handleSave() {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t("profile.editMissingNameTitle"), t("profile.editMissingNameBody"));
      return;
    }

    setSaving(true);
    // Lagringssti holdes utenfor try slik at et foreldreløst bilde kan ryddes ved feil.
    let uploadedPath: string | null = null;
    try {
      const oldRaw = profil?.avatar_url ?? null;
      let newAvatar = oldRaw;
      if (pickedUri) {
        // Last opp FØR update; lagrer LAGRINGSSTIEN i avatar_url (ikke en URL).
        uploadedPath = `${user.id}/avatar/${Date.now()}.jpg`;
        newAvatar = await uploadSessionImage(uploadedPath, pickedUri);
      } else if (avatarRemoved) {
        newAvatar = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed, avatar_url: newAvatar })
        .eq("id", user.id);
      if (error) throw error;
      // Raden peker nå på bildet — ikke rydd det bort.
      uploadedPath = null;

      // Rydd den gamle OPPLASTEDE avataren (kun lagringsstier — Google-URL-er
      // eier vi ikke). Best-effort: en foreldreløs fil er verre enn en feilmelding her.
      if (oldRaw && oldRaw !== newAvatar && !isHttpUrl(oldRaw)) {
        await removeSessionImages([oldRaw]).catch(() => {});
      }

      // Oppdater profilen i konteksten (eksisterende refetch) og lukk.
      retry();
      onClose();
    } catch (err) {
      if (uploadedPath) await removeSessionImages([uploadedPath]).catch(() => {});
      Alert.alert(
        t("common.somethingWrong"),
        err instanceof Error ? err.message : t("profile.editSaveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      closeLabel={t("profile.editClose")}
      contentClassName="px-6"
    >
      <Text className="text-content dark:text-content-dark text-lg font-semibold mb-4">
        {t("profile.editTitle")}
      </Text>

      {/* Avatar-forhåndsvisning + handlinger */}
      <View className="items-center mb-5">
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={{ width: 88, height: 88, borderRadius: 44 }}
            accessible={false}
          />
        ) : (
          <UserAvatar name={name || (profil?.full_name ?? null)} size={88} />
        )}
        <View className="flex-row gap-4 mt-3">
          <TouchableOpacity
            onPress={pickAvatar}
            accessibilityRole="button"
            accessibilityLabel={t("profile.editPickAvatar")}
            accessibilityHint={t("profile.editPickAvatarHint")}
            className="flex-row items-center gap-1.5"
          >
            <Ionicons name="image-outline" size={16} color={accent} accessible={false} />
            <Text className="text-accent dark:text-accent-dark text-sm font-semibold">
              {t("profile.editPickAvatar")}
            </Text>
          </TouchableOpacity>
          {previewUri && (
            <TouchableOpacity
              onPress={removeAvatar}
              accessibilityRole="button"
              accessibilityLabel={t("profile.editRemoveAvatar")}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color="#A8A29E"
                accessible={false}
              />
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm font-semibold">
                {t("profile.editRemoveAvatar")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Visningsnavn */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
      >
        {t("profile.editNameLabel")}
      </Text>
      <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-5">
        <TextInput
          className="text-content dark:text-content-dark text-base"
          value={name}
          onChangeText={setName}
          placeholder={t("profile.editNamePlaceholder")}
          placeholderTextColor="#A8A29E"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel={t("profile.editNameA11y")}
        />
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={t("profile.editSave")}
        accessibilityState={{ disabled: saving }}
        className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center mb-2"
      >
        {saving ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">
            {t("profile.editSave")}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onClose}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
        accessibilityState={{ disabled: saving }}
        className="py-3 items-center"
      >
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
          {t("common.cancel")}
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}
