import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { ITEM_ICONS, ITEM_LABELS } from "../utils/collections";
import { CollectionsStackParamList } from "../navigation/CollectionsStack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type CollectionDetailRouteProp = RouteProp<CollectionsStackParamList, "CollectionDetail">;

type Item = {
  id: string;
  title: string;
  brand: string | null;
  piece_count: number | null;
  player_count: number | null;
  difficulty: string | null;
  status: string | null;
};

export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<CollectionDetailRouteProp>();
  const { type } = route.params;
  const { user } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchItems(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const { data } = await supabase
      .from("items")
      .select("id, title, brand, piece_count, player_count, difficulty, status")
      .eq("owner_id", user!.id)
      .eq("type", type)
      .order("created_at", { ascending: false });

    setItems(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  // Refetch when screen comes back into focus (e.g. after adding an item)
  useFocusEffect(useCallback(() => { fetchItems(); }, [type]));

  if (loading) {
    return (
      <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center">
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} />
      }
    >
      <View
        className="flex-row items-center px-4 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#78716C" />
        </TouchableOpacity>
        <Text className="text-content dark:text-content-dark text-2xl font-medium flex-1">
          {ITEM_LABELS[type]}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
          {items.length} stk
        </Text>
      </View>

      {items.length === 0 ? (
        <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-8 items-center">
          <Ionicons name={ITEM_ICONS[type]} size={32} color="#A8A29E" />
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-3 text-center">
            Ingen {ITEM_LABELS[type].toLowerCase()} i samlingen ennå.{"\n"}Bruk + for å legge til.
          </Text>
        </View>
      ) : (
        <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
          {items.map((item, i) => {
            const subtitle =
              type === "puslespill" && item.piece_count
                ? `${item.piece_count} brikker${item.difficulty ? ` · ${item.difficulty}` : ""}`
                : type === "brettspill" && item.player_count
                ? `${item.player_count} spillere`
                : item.brand ?? null;

            return (
              <View
                key={item.id}
                className={`flex-row items-center px-4 py-4 ${
                  i < items.length - 1 ? "border-b border-border dark:border-border-dark" : ""
                }`}
              >
                <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
                  <Ionicons name={ITEM_ICONS[type]} size={20} color="#1D9E75" />
                </View>
                <View className="flex-1">
                  <Text className="text-content dark:text-content-dark font-medium">
                    {item.title}
                  </Text>
                  {subtitle && (
                    <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                      {subtitle}
                    </Text>
                  )}
                </View>
                {item.status === "Utlånt" && (
                  <View className="bg-accent/10 dark:bg-accent-dark/10 px-2 py-1 rounded-full">
                    <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
                      Utlånt
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
