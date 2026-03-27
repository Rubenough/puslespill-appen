import React, { useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_LABELS } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";
import ItemForm, { type ItemFormValues } from "../components/ItemForm";

type AddItemRouteProp = RouteProp<RootStackParamList, "AddItem">;
type AddItemNavProp = NativeStackNavigationProp<RootStackParamList, "AddItem">;

export default function AddItemScreen() {
  const navigation = useNavigation<AddItemNavProp>();
  const route = useRoute<AddItemRouteProp>();
  const { type } = route.params;
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleSave(values: ItemFormValues) {
    setSaving(true);
    const { error } = await supabase.from("items").insert({
      owner_id: user!.id,
      type,
      title: values.title.trim(),
      brand: values.brand.trim() || null,
      piece_count: values.pieceCount ? parseInt(values.pieceCount, 10) : null,
      player_count: values.playerCount ? parseInt(values.playerCount, 10) : null,
      difficulty: values.difficulty || null,
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
    <ItemForm
      type={type}
      headerLabel={`Legg til ${ITEM_LABELS[type].toLowerCase()}`}
      saveLabel="Lagre"
      saveAccessibilityLabel={`Lagre ${ITEM_LABELS[type].toLowerCase()}`}
      saving={saving}
      onSave={handleSave}
      onClose={() => navigation.goBack()}
    />
  );
}
