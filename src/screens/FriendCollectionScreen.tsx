import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
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
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_ICONS, type ItemType } from "../utils/collections";
import {
  itemTypeLabel,
  piecesLabel,
  playersLabel,
  difficultyLabel,
} from "../utils/collectionLabels";
import { getSignedUrls } from "../utils/sessionImages";
import { RootStackParamList } from "../navigation/RootNavigator";
import UserAvatar from "../components/UserAvatar";
import BorrowRequestSheet from "../components/BorrowRequestSheet";

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
  cover_url: string | null;
};

function subtitleFor(item: FriendItem): string | null {
  if (item.type === "puslespill" && item.piece_count) {
    const pieces = piecesLabel(item.piece_count);
    return item.difficulty ? `${pieces} · ${difficultyLabel(item.difficulty)}` : pieces;
  }
  if (item.type === "brettspill" && item.player_count) {
    return playersLabel(item.player_count);
  }
  return item.brand ?? null;
}

export default function FriendCollectionScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<FriendCollectionRouteProp>();
  const { friendId, friendName, avatarUrl } = route.params;
  const { user } = useAuth();
  // App-styrt fargeskjema (ikke OS) — brukes til den imperative chevron-fargen.
  const { colorScheme } = useColorScheme();
  // content-secondary (#78716C) feiler kontrast på mørk flate; bruk content-dark-secondary der.
  const chevronColor = colorScheme === "dark" ? "#A8A29E" : "#78716C";

  const [items, setItems] = useState<FriendItem[]>([]);
  // Kart fra cover_url (lagringssti) → kortlivd signert URL for visning.
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map());
  // item_id → id på den ventende forespørselen, slik at vi kan avbryte den herfra.
  const [pendingByItem, setPendingByItem] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [selectedItem, setSelectedItem] = useState<FriendItem | null>(null);

  const fetchItems = useCallback(
    async (isActive: () => boolean = () => true) => {
      const [itemsRes, requestsRes] = await Promise.all([
        supabase
          .from("items")
          .select(
            "id, title, brand, piece_count, player_count, difficulty, status, type, cover_url",
          )
          .eq("owner_id", friendId)
          .order("created_at", { ascending: false }),
        supabase
          .from("borrow_requests")
          .select("id, item_id")
          .eq("requester_id", user!.id)
          .eq("owner_id", friendId)
          .eq("status", "pending"),
      ]);

      const rows = (itemsRes.data ?? []) as FriendItem[];
      // Signer omslag ved henting og legg de signerte URL-ene i state (som feeden).
      const covers = rows.map((r) => r.cover_url).filter((c): c is string => !!c);
      const signed = covers.length > 0 ? await getSignedUrls(covers) : new Map();

      // Skjermen kan ha mistet fokus mens hentingen pågikk — ikke oppdater da.
      if (!isActive()) return;
      setFetchError(!!itemsRes.error);
      setItems(rows);
      setCoverUrls(signed);
      setPendingByItem(new Map((requestsRes.data ?? []).map((r) => [r.item_id, r.id])));
      setLoading(false);
    },
    [friendId, user],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchItems(() => active);
      return () => {
        active = false;
      };
    }, [fetchItems]),
  );

  const selectedLoaned = selectedItem?.status === "Utlånt";

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
          accessibilityLabel={t("common.back")}
          className="mr-3"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={chevronColor}
            accessible={false}
          />
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
            {t("collections.detailLoadError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchItems()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            className="bg-accent dark:bg-accent-dark rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text
            accessibilityRole="header"
            className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3"
          >
            {t("collections.collectionCount", { count: items.length })}
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
                {t("collections.friendEmpty", { name: friendName })}
              </Text>
            </View>
          ) : (
            <View className="mx-4 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
              {items.map((item, i) => {
                const subtitle = subtitleFor(item);
                const isLoaned = item.status === "Utlånt";
                const isPending = pendingByItem.has(item.id);
                const badge = isLoaned
                  ? t("collections.loaned")
                  : isPending
                    ? t("borrow.requested")
                    : null;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={[item.title, subtitle, badge]
                      .filter(Boolean)
                      .join(", ")}
                    accessibilityHint={t("borrow.ask")}
                    className={`flex-row items-center px-4 py-4 ${
                      i < items.length - 1
                        ? "border-b border-border dark:border-border-dark"
                        : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4 overflow-hidden">
                      {item.cover_url && coverUrls.get(item.cover_url) ? (
                        <Image
                          source={{ uri: coverUrls.get(item.cover_url) }}
                          className="w-10 h-10"
                          accessible={false}
                        />
                      ) : (
                        <Ionicons
                          name={ITEM_ICONS[item.type]}
                          size={20}
                          color="#1D9E75"
                          accessible={false}
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-content dark:text-content-dark font-medium">
                        {item.title}
                      </Text>
                      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                        {[itemTypeLabel(item.type), subtitle].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    {badge && (
                      <View
                        className={`px-2 py-1 rounded-full ${
                          isLoaned
                            ? "bg-accent/10 dark:bg-accent-dark/10"
                            : "bg-surface-secondary dark:bg-surface-dark-secondary"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isLoaned
                              ? "text-accent dark:text-accent-dark"
                              : "text-content-secondary dark:text-content-secondary-dark"
                          }`}
                        >
                          {badge}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Låneforespørsel-arket er delt med LibraryScreen. */}
      <BorrowRequestSheet
        item={selectedItem ? { id: selectedItem.id, title: selectedItem.title } : null}
        subtitle={selectedItem ? itemTypeLabel(selectedItem.type) : ""}
        isLoaned={selectedLoaned}
        pendingRequestId={
          selectedItem ? (pendingByItem.get(selectedItem.id) ?? null) : null
        }
        onClose={() => setSelectedItem(null)}
        onRequestSent={async () => {
          // Vi kjenner ikke forespørsels-id-en før neste henting; refetch for korrekt state.
          setSelectedItem(null);
          await fetchItems();
        }}
        onRequestCancelled={(itemId) => {
          setPendingByItem((prev) => {
            const next = new Map(prev);
            next.delete(itemId);
            return next;
          });
          setSelectedItem(null);
        }}
      />
    </View>
  );
}
