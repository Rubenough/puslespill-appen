import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { itemTypeLabel } from "../utils/collectionLabels";
import {
  uploadSessionImage,
  removeSessionImages,
  getSignedUrl,
} from "../utils/sessionImages";
import { RootStackParamList } from "../navigation/RootNavigator";
import ItemForm, { type ItemFormValues } from "../components/ItemForm";

type EditItemRouteProp = RouteProp<RootStackParamList, "EditItem">;
type EditItemNavProp = NativeStackNavigationProp<RootStackParamList, "EditItem">;

export default function EditItemScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<EditItemNavProp>();
  const route = useRoute<EditItemRouteProp>();
  const { item, type } = route.params;
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  // Signert URL for eksisterende omslag (kun visning i skjemaet).
  const [initialCoverUrl, setInitialCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.cover_url) getSignedUrl(item.cover_url).then(setInitialCoverUrl);
  }, [item.cover_url]);

  async function handleSave(values: ItemFormValues) {
    setSaving(true);
    // Ny lagringssti holdes utenfor try slik at et foreldreløst bilde kan ryddes ved feil.
    let uploadedPath: string | null = null;
    try {
      // cover_url utelates fra update-objektet når omslaget er uendret.
      const coverPatch: { cover_url?: string | null } = {};
      if (values.coverUri) {
        uploadedPath = `${user!.id}/${Date.now()}.jpg`;
        coverPatch.cover_url = await uploadSessionImage(uploadedPath, values.coverUri);
      } else if (values.coverCleared) {
        coverPatch.cover_url = null;
      }

      const { error } = await supabase
        .from("items")
        .update({
          title: values.title.trim(),
          brand: values.brand.trim() || null,
          piece_count: values.pieceCount ? parseInt(values.pieceCount, 10) : null,
          player_count: values.playerCount ? parseInt(values.playerCount, 10) : null,
          difficulty: values.difficulty || null,
          ...coverPatch,
        })
        .eq("id", item.id);
      if (error) throw error;
      // Raden peker nå på det nye bildet — ikke rydd det bort.
      uploadedPath = null;

      // Rydd bort det gamle omslaget når det er byttet ut eller fjernet.
      if (item.cover_url && (values.coverUri || values.coverCleared)) {
        await removeSessionImages([item.cover_url]).catch(() => {});
      }

      navigation.goBack();
    } catch (err) {
      if (uploadedPath) await removeSessionImages([uploadedPath]).catch(() => {});
      Alert.alert(
        t("common.somethingWrong"),
        err instanceof Error ? err.message : t("common.somethingWrong"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ItemForm
      type={type}
      headerLabel={t("itemForm.editHeader", { type: itemTypeLabel(type).toLowerCase() })}
      saveLabel={t("itemForm.saveChanges")}
      saveAccessibilityLabel={t("itemForm.saveChangesA11y", {
        type: itemTypeLabel(type).toLowerCase(),
      })}
      initialValues={{
        title: item.title,
        brand: item.brand ?? "",
        pieceCount: item.piece_count?.toString() ?? "",
        playerCount: item.player_count?.toString() ?? "",
        difficulty: item.difficulty ?? "",
      }}
      initialCoverUrl={initialCoverUrl}
      saving={saving}
      onSave={handleSave}
      onClose={() => navigation.goBack()}
    />
  );
}
