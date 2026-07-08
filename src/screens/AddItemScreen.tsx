import React, { useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { itemTypeLabel } from "../utils/collectionLabels";
import { uploadSessionImage, removeSessionImages } from "../utils/sessionImages";
import { RootStackParamList } from "../navigation/RootNavigator";
import ItemForm, { type ItemFormValues } from "../components/ItemForm";

type AddItemRouteProp = RouteProp<RootStackParamList, "AddItem">;
type AddItemNavProp = NativeStackNavigationProp<RootStackParamList, "AddItem">;

export default function AddItemScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<AddItemNavProp>();
  const route = useRoute<AddItemRouteProp>();
  const { type } = route.params;
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleSave(values: ItemFormValues) {
    setSaving(true);
    // Lagringssti holdes utenfor try slik at et foreldreløst bilde kan ryddes ved feil.
    let uploadedPath: string | null = null;
    try {
      // Last opp omslag FØR insert; lagrer LAGRINGSSTIEN i cover_url (ikke en URL).
      let coverPath: string | null = null;
      if (values.coverUri) {
        uploadedPath = `${user!.id}/${Date.now()}.jpg`;
        coverPath = await uploadSessionImage(uploadedPath, values.coverUri);
      }

      const { error } = await supabase.from("items").insert({
        owner_id: user!.id,
        type,
        title: values.title.trim(),
        brand: values.brand.trim() || null,
        piece_count: values.pieceCount ? parseInt(values.pieceCount, 10) : null,
        player_count: values.playerCount ? parseInt(values.playerCount, 10) : null,
        difficulty: values.difficulty || null,
        status: "Tilgjengelig",
        cover_url: coverPath,
      });
      if (error) throw error;
      // Raden peker nå på bildet — ikke rydd det bort.
      uploadedPath = null;

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
      headerLabel={t("itemForm.addHeader", { type: itemTypeLabel(type).toLowerCase() })}
      saveLabel={t("itemForm.save")}
      saveAccessibilityLabel={t("itemForm.saveA11y", {
        type: itemTypeLabel(type).toLowerCase(),
      })}
      saving={saving}
      onSave={handleSave}
      onClose={() => navigation.goBack()}
    />
  );
}
