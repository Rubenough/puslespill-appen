import React, { useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { ITEM_LABELS } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";
import ItemForm, { type ItemFormValues } from "../components/ItemForm";

type EditItemRouteProp = RouteProp<RootStackParamList, "EditItem">;
type EditItemNavProp = NativeStackNavigationProp<RootStackParamList, "EditItem">;

export default function EditItemScreen() {
  const navigation = useNavigation<EditItemNavProp>();
  const route = useRoute<EditItemRouteProp>();
  const { item, type } = route.params;
  const [saving, setSaving] = useState(false);

  async function handleSave(values: ItemFormValues) {
    setSaving(true);
    const { error } = await supabase
      .from("items")
      .update({
        title: values.title.trim(),
        brand: values.brand.trim() || null,
        piece_count: values.pieceCount ? parseInt(values.pieceCount, 10) : null,
        player_count: values.playerCount ? parseInt(values.playerCount, 10) : null,
        difficulty: values.difficulty || null,
      })
      .eq("id", item.id);
    setSaving(false);

    if (error) {
      Alert.alert("Noe gikk galt", error.message);
      return;
    }

    navigation.goBack();
  }

  return (
    <ItemForm
      type={type}
      headerLabel={`Rediger ${ITEM_LABELS[type].toLowerCase()}`}
      saveLabel="Lagre endringer"
      saveAccessibilityLabel={`Lagre endringer for ${ITEM_LABELS[type].toLowerCase()}`}
      initialValues={{
        title: item.title,
        brand: item.brand ?? "",
        pieceCount: item.piece_count?.toString() ?? "",
        playerCount: item.player_count?.toString() ?? "",
        difficulty: item.difficulty ?? "",
      }}
      saving={saving}
      onSave={handleSave}
      onClose={() => navigation.goBack()}
    />
  );
}
