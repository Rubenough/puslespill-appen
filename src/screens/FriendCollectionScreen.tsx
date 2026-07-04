import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { ITEM_ICONS, ITEM_LABELS, type ItemType } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";
import UserAvatar from "../components/UserAvatar";

type FriendCollectionRouteProp = RouteProp<RootStackParamList, "FriendCollection">;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

type FriendItem = {
  id: string;
  title: string;
  brand: string | null;
  piece_count: number | null;
  player_count: number | null;
  difficulty: string | null;
  status: string | null;
  type: ItemType;
};

function subtitleFor(item: FriendItem): string | null {
  if (item.type === "puslespill" && item.piece_count) {
    return `${item.piece_count} brikker${item.difficulty ? ` · ${item.difficulty}` : ""}`;
  }
  if (item.type === "brettspill" && item.player_count) {
    return `${item.player_count} spillere`;
  }
  return item.brand ?? null;
}

export default function FriendCollectionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<FriendCollectionRouteProp>();
  const { friendId, friendName, avatarUrl } = route.params;

  const [items, setItems] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, title, brand, piece_count, player_count, difficulty, status, type")
      .eq("owner_id", friendId)
      .order("created_at", { ascending: false });

    setFetchError(!!error);
    setItems((data ?? []) as FriendItem[]);
    setLoading(false);
  }, [friendId]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems]),
  );

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-4 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Tilbake"
          className="mr-3"
        >
          <Ionicons name="chevron-back" size={24} color="#78716C" accessible={false} />
        </TouchableOpacity>
        <UserAvatar name={friendName} avatarUrl={avatarUrl} size={36} />
        <Text
          className="text-content dark:text-content-dark text-lg font-semibold flex-1 ml-3"
          numberOfLines={1}
        >
          {friendName}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D9E75" />
        </View>
      ) : fetchError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-content dark:text-content-dark text-center mb-4">
            Kunne ikke laste samlingen.
          </Text>
          <TouchableOpacity
            onPress={() => fetchItems()}
            accessibilityRole="button"
            accessibilityLabel="Prøv igjen"
            className="bg-accent dark:bg-accent-dark rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Prøv igjen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text
            accessibilityRole="header"
            className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3"
          >
            SAMLING · {items.length} STK
          </Text>

          {items.length === 0 ? (
            <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-8 items-center">
              <Ionicons
                name="cube-outline"
                size={32}
                color="#A8A29E"
                accessible={false}
              />
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-3 text-center">
                {friendName} har ingen gjenstander i samlingen ennå.
              </Text>
            </View>
          ) : (
            <View className="mx-4 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
              {items.map((item, i) => {
                const subtitle = subtitleFor(item);
                const isLoaned = item.status === "Utlånt";
                return (
                  <View
                    key={item.id}
                    accessible
                    accessibilityLabel={[item.title, subtitle, isLoaned ? "Utlånt" : null]
                      .filter(Boolean)
                      .join(", ")}
                    className={`flex-row items-center px-4 py-4 ${
                      i < items.length - 1
                        ? "border-b border-border dark:border-border-dark"
                        : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
                      <Ionicons
                        name={ITEM_ICONS[item.type]}
                        size={20}
                        color="#1D9E75"
                        accessible={false}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-content dark:text-content-dark font-medium">
                        {item.title}
                      </Text>
                      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                        {[ITEM_LABELS[item.type], subtitle].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    {isLoaned && (
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
      )}
    </View>
  );
}
