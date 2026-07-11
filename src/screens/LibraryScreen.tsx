import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_ICONS, type ItemType } from "../utils/collections";
import { itemTypeLabel } from "../utils/collectionLabels";
import { fetchFriends, type Friend } from "../utils/friends";
import { getSignedUrls } from "../utils/sessionImages";
import { RootStackParamList } from "../navigation/RootNavigator";
import UserAvatar from "../components/UserAvatar";
import BottomSheet from "../components/BottomSheet";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type LibraryItem = {
  id: string;
  title: string;
  type: ItemType;
  status: string;
  cover_url: string | null;
  owner_id: string;
};

// Bibliotek: én flat, søkbar liste over alt aksepterte venner eier.
// RLS begrenser allerede `items` til en selv + venner; vi henter vennene
// eksplisitt (utils/friends) for å få navn/avatar til eier-visningen.
export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  // App-styrt fargeskjema (ikke OS) — for de imperative ikonfargene.
  const { colorScheme } = useColorScheme();
  // content-secondary (#78716C) feiler kontrast på mørk flate; bruk lysere token der.
  const iconColor = colorScheme === "dark" ? "#A8A29E" : "#78716C";

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [friendsById, setFriendsById] = useState<Map<string, Friend>>(new Map());
  // Kart fra cover_url (lagringssti) → kortlivd signert URL for visning.
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map());
  // item_id → id på den ventende forespørselen, slik at vi kan avbryte den herfra.
  const [pendingByItem, setPendingByItem] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [query, setQuery] = useState("");

  // Låneforespørsel-modal (speiler FriendCollectionScreen sin flyt).
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLibrary = useCallback(
    async (isActive: () => boolean = () => true, isRefresh = false) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      try {
        const friends = await fetchFriends(user.id);
        const friendIds = friends.map((f) => f.id);

        const [itemsRes, requestsRes] = await Promise.all([
          friendIds.length > 0
            ? supabase
                .from("items")
                .select("id, title, type, status, cover_url, owner_id")
                .in("owner_id", friendIds)
                .order("title", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from("borrow_requests")
            .select("id, item_id")
            .eq("requester_id", user.id)
            .eq("status", "pending"),
        ]);
        if (itemsRes.error) throw itemsRes.error;

        const rows = itemsRes.data ?? [];
        // Signer omslag ved henting og legg de signerte URL-ene i state (som feeden).
        const covers = rows.map((r) => r.cover_url).filter((c): c is string => !!c);
        const signed = covers.length > 0 ? await getSignedUrls(covers) : new Map();

        if (!isActive()) return;
        setFriendsById(new Map(friends.map((f) => [f.id, f])));
        setItems(rows);
        setCoverUrls(signed);
        setPendingByItem(new Map((requestsRes.data ?? []).map((r) => [r.item_id, r.id])));
        setFetchError(false);
      } catch {
        if (!isActive()) return;
        setFetchError(true);
      } finally {
        if (isActive()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchLibrary(() => active);
      return () => {
        active = false;
      };
    }, [fetchLibrary]),
  );

  // Klientsøk på tittel — biblioteket er på vennegruppe-skala.
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [items, query]);

  async function handleRequest() {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_to_borrow", {
        p_item_id: selectedItem.id,
        p_message: message.trim() || undefined,
      });
      if (error) {
        Alert.alert(t("borrow.failed"), error.message);
        return;
      }
      // Vi kjenner ikke forespørsels-id-en før neste henting; refetch for korrekt state.
      setSelectedItem(null);
      setMessage("");
      await fetchLibrary();
      Alert.alert(t("borrow.sent"), t("borrow.sentBody"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest() {
    if (!selectedItem) return;
    const requestId = pendingByItem.get(selectedItem.id);
    if (!requestId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("cancel_request", {
        p_request_id: requestId,
      });
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
    } finally {
      setSubmitting(false);
    }
  }

  function openOwner(item: LibraryItem) {
    const owner = friendsById.get(item.owner_id);
    navigation.navigate("FriendCollection", {
      friendId: item.owner_id,
      friendName: owner?.name ?? t("common.unknownUser"),
      avatarUrl: owner?.avatarUrl ?? null,
    });
  }

  const selectedLoaned = selectedItem?.status === "Utlånt";
  const selectedPending = selectedItem ? pendingByItem.has(selectedItem.id) : false;

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      {/* Topprad: tittel + venner-ikon (venneadministrasjon er flyttet dit) */}
      <View
        className="flex-row items-center px-4 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Text className="text-content dark:text-content-dark text-2xl font-medium flex-1">
          {t("library.title")}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Friends")}
          accessibilityRole="button"
          accessibilityLabel={t("friends.title")}
          accessibilityHint={t("library.friendsHint")}
          hitSlop={8}
        >
          <Ionicons
            name="people-outline"
            size={24}
            color={iconColor}
            accessible={false}
          />
        </TouchableOpacity>
      </View>

      {/* Søkefelt */}
      <View className="mx-4 mb-3 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 flex-row items-center">
        <Ionicons name="search-outline" size={18} color="#A8A29E" accessible={false} />
        <TextInput
          className="flex-1 text-content dark:text-content-dark text-base ml-2"
          placeholder={t("library.searchPlaceholder")}
          placeholderTextColor="#A8A29E"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t("library.searchA11y")}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            accessibilityRole="button"
            accessibilityLabel={t("library.clearSearchA11y")}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color="#A8A29E" accessible={false} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D9E75" />
        </View>
      ) : fetchError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-content dark:text-content-dark text-center mb-4">
            {t("library.loadError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchLibrary()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            className="bg-accent dark:bg-accent-dark rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLibrary(() => true, true)}
            />
          }
        >
          {items.length === 0 ? (
            <View className="mx-4 mt-2 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-8 items-center">
              <Ionicons
                name="book-outline"
                size={32}
                color="#A8A29E"
                accessible={false}
              />
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-3 text-center">
                {t("library.empty")}
              </Text>
            </View>
          ) : visibleItems.length === 0 ? (
            <View className="mx-4 mt-2 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-8 items-center">
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm text-center">
                {t("library.noResults", { query: query.trim() })}
              </Text>
            </View>
          ) : (
            <View className="mx-4 mt-2 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
              {visibleItems.map((item, i) => {
                const owner = friendsById.get(item.owner_id);
                const ownerName = owner?.name ?? t("common.unknownUser");
                const isLoaned = item.status === "Utlånt";
                const isPending = pendingByItem.has(item.id);
                const badge = isLoaned
                  ? t("collections.loaned")
                  : isPending
                    ? t("borrow.requested")
                    : t("collections.available");
                const isAvailable = !isLoaned && !isPending;
                return (
                  <View
                    key={item.id}
                    className={`flex-row items-center pl-4 pr-3 ${
                      i < visibleItems.length - 1
                        ? "border-b border-border dark:border-border-dark"
                        : ""
                    }`}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setMessage("");
                        setSelectedItem(item);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={[
                        item.title,
                        itemTypeLabel(item.type),
                        ownerName,
                        badge,
                      ].join(", ")}
                      accessibilityHint={t("borrow.ask")}
                      className="flex-1 flex-row items-center py-3"
                    >
                      <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-3 overflow-hidden">
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
                      <View className="flex-1 mr-2">
                        <Text
                          className="text-content dark:text-content-dark font-medium"
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                          {itemTypeLabel(item.type)}
                        </Text>
                      </View>
                      <View
                        className={`px-2 py-1 rounded-full ${
                          isAvailable
                            ? "bg-accent/10 dark:bg-accent-dark/10"
                            : "bg-surface-secondary dark:bg-surface-dark-secondary"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isAvailable
                              ? "text-accent dark:text-accent-dark"
                              : "text-content-secondary dark:text-content-secondary-dark"
                          }`}
                        >
                          {badge}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {/* Eier-chip — åpner vennens samling */}
                    <TouchableOpacity
                      onPress={() => openOwner(item)}
                      accessibilityRole="button"
                      accessibilityLabel={t("library.ownerA11y", { name: ownerName })}
                      accessibilityHint={t("friends.openCollectionHint")}
                      className="flex-row items-center ml-1 pl-2 py-3 max-w-[120px]"
                    >
                      <UserAvatar
                        name={owner?.name ?? null}
                        avatarUrl={owner?.avatarUrl}
                        size={24}
                      />
                      <Text
                        className="text-content-secondary dark:text-content-secondary-dark text-xs ml-1.5 flex-shrink"
                        numberOfLines={1}
                      >
                        {ownerName}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Låneforespørsel-modal (samme flyt som FriendCollectionScreen) */}
      <BottomSheet
        visible={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        closeLabel={t("common.cancel")}
      >
        <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
          {selectedItem?.title}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-4 px-1">
          {selectedItem
            ? [
                itemTypeLabel(selectedItem.type),
                friendsById.get(selectedItem.owner_id)?.name ?? t("common.unknownUser"),
              ].join(" · ")
            : ""}
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
