import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
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
import { RootStackParamList } from "../navigation/RootNavigator";
import UserAvatar from "../components/UserAvatar";
import BottomSheet from "../components/BottomSheet";

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

  const [items, setItems] = useState<FriendItem[]>([]);
  // item_id → id på den ventende forespørselen, slik at vi kan avbryte den herfra.
  const [pendingByItem, setPendingByItem] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [selectedItem, setSelectedItem] = useState<FriendItem | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    const [itemsRes, requestsRes] = await Promise.all([
      supabase
        .from("items")
        .select("id, title, brand, piece_count, player_count, difficulty, status, type")
        .eq("owner_id", friendId)
        .order("created_at", { ascending: false }),
      supabase
        .from("borrow_requests")
        .select("id, item_id")
        .eq("requester_id", user!.id)
        .eq("owner_id", friendId)
        .eq("status", "pending"),
    ]);

    setFetchError(!!itemsRes.error);
    setItems((itemsRes.data ?? []) as FriendItem[]);
    setPendingByItem(new Map((requestsRes.data ?? []).map((r) => [r.item_id, r.id])));
    setLoading(false);
  }, [friendId, user]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems]),
  );

  async function handleRequest() {
    if (!selectedItem) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("request_to_borrow", {
      p_item_id: selectedItem.id,
      p_message: message.trim() || undefined,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert(t("borrow.failed"), error.message);
      return;
    }
    // Vi kjenner ikke forespørsels-id-en før neste henting; refetch for korrekt state.
    setSelectedItem(null);
    setMessage("");
    await fetchItems();
    Alert.alert(t("borrow.sent"), t("borrow.sentBody"));
  }

  async function handleCancelRequest() {
    if (!selectedItem) return;
    const requestId = pendingByItem.get(selectedItem.id);
    if (!requestId) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("cancel_request", {
      p_request_id: requestId,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert(t("common.somethingWrong"), error.message);
      return;
    }
    setPendingByItem((prev) => {
      const next = new Map(prev);
      next.delete(selectedItem.id);
      return next;
    });
    setSelectedItem(null);
  }

  const selectedLoaned = selectedItem?.status === "Utlånt";
  const selectedPending = selectedItem ? pendingByItem.has(selectedItem.id) : false;

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
                    onPress={() => {
                      setMessage("");
                      setSelectedItem(item);
                    }}
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

      {/* Låneforespørsel-modal */}
      <BottomSheet
        visible={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        closeLabel={t("common.cancel")}
      >
        <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
          {selectedItem?.title}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-4 px-1">
          {selectedItem ? itemTypeLabel(selectedItem.type) : ""}
        </Text>

        {selectedLoaned ? (
          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center mb-2">
            <Text className="text-content-secondary dark:text-content-secondary-dark font-medium">
              {t("borrow.unavailable")}
            </Text>
          </View>
        ) : selectedPending ? (
          <>
            <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center mb-3">
              <Text className="text-content-secondary dark:text-content-secondary-dark font-medium">
                {t("borrow.requested")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancelRequest}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("borrow.cancelRequest")}
              accessibilityState={{ disabled: submitting }}
              className="border border-border dark:border-border-dark rounded-2xl py-4 items-center mb-2"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#1D9E75" />
              ) : (
                <Text className="text-content dark:text-content-dark font-semibold text-base">
                  {t("borrow.cancelRequest")}
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-4">
              <TextInput
                className="text-content dark:text-content-dark text-base"
                placeholder={t("borrow.messagePlaceholder")}
                placeholderTextColor="#A8A29E"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                accessibilityLabel={t("borrow.messagePlaceholder")}
              />
            </View>
            <TouchableOpacity
              onPress={handleRequest}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("borrow.ask")}
              accessibilityState={{ disabled: submitting }}
              className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center mb-2"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {t("borrow.send")}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          onPress={() => setSelectedItem(null)}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          className="py-3 items-center"
        >
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}
