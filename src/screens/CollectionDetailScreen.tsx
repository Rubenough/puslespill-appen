import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Switch,
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
import { useTranslation } from "react-i18next";
import { ITEM_ICONS, type Item } from "../utils/collections";
import {
  itemTypeLabel,
  itemTypeLabelPlural,
  piecesLabel,
  playersLabel,
  difficultyLabel,
} from "../utils/collectionLabels";
import { DUE_OPTIONS, dueAtFromKey } from "../utils/loans";
import { CollectionsStackParamList } from "../navigation/CollectionsStack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { fetchFriends, type Friend } from "../utils/friends";
import { getSignedUrls, removeSessionImages } from "../utils/sessionImages";
import UserAvatar from "../components/UserAvatar";
import BottomSheet from "../components/BottomSheet";

type CollectionDetailRouteProp = RouteProp<CollectionsStackParamList, "CollectionDetail">;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

// Hurtigvalg for frist på utlån — beregner en konkret dato (date-kolonne, YYYY-MM-DD).
export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<CollectionDetailRouteProp>();
  const { type } = route.params;
  const { user } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  // Kart fra cover_url (lagringssti) → kortlivd signert URL for visning.
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Utlåns-modal
  const [loanItem, setLoanItem] = useState<Item | null>(null);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerUserId, setBorrowerUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loanIsPublic, setLoanIsPublic] = useState(false);
  const [loanDueKey, setLoanDueKey] = useState<string>("none");

  // Be om retur-modal (eier ber låntaker levere tilbake)
  const [requestReturnItem, setRequestReturnItem] = useState<Item | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [requestingReturn, setRequestingReturn] = useState(false);

  // Refetch when screen comes back into focus (e.g. after adding or editing an item)
  const fetchItems = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      const { data, error } = await supabase
        .from("items")
        .select(
          "id, title, brand, piece_count, player_count, difficulty, status, cover_url",
        )
        .eq("owner_id", user!.id)
        .eq("type", type)
        .order("created_at", { ascending: false });

      if (error) {
        setFetchError(error.message);
      } else {
        // DB lagrer difficulty/status som text; vi smalner til app-unionene her.
        const rows = (data ?? []) as Item[];
        setItems(rows);
        setFetchError(null);
        // Signer omslag ved henting og legg de signerte URL-ene i state (som feeden).
        const covers = rows.map((r) => r.cover_url).filter((c): c is string => !!c);
        setCoverUrls(covers.length > 0 ? await getSignedUrls(covers) : new Map());
      }
      setLoading(false);
      setRefreshing(false);
    },
    [user, type],
  );

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems]),
  );

  function openLoanModal() {
    setLoanItem(selectedItem); // lagre referanse før vi lukker handlingsarket
    setBorrowerName("");
    setBorrowerUserId(null);
    setLoanIsPublic(false);
    setLoanDueKey("none");
    setSelectedItem(null); // lukk handlingsarket
    setLoanModalVisible(true);
    // Last venner for hurtigvalg; feiler stille → fri­tekst fungerer fortsatt.
    if (user)
      fetchFriends(user.id)
        .then(setFriends)
        .catch(() => setFriends([]));
  }

  // Velg en venn fra listen → forhåndsutfyll navn og knytt til borrower_user_id.
  function selectFriend(friend: Friend) {
    setBorrowerName(friend.name ?? "");
    setBorrowerUserId(friend.id);
  }

  // Fri­tekst: bruker skriver selv → koble fra ev. valgt venn.
  function onBorrowerNameChange(text: string) {
    setBorrowerName(text);
    if (borrowerUserId) setBorrowerUserId(null);
  }

  async function handleLoan() {
    if (!borrowerName.trim()) {
      Alert.alert(
        t("collectionDetail.missingNameTitle"),
        t("collectionDetail.missingNameBody"),
      );
      return;
    }
    if (!loanItem) return;

    setActionLoading(true);

    // Opprett låneregistrering — triggeren trg_sync_item_status setter items.status = 'Utlånt' automatisk
    const { error: loanError } = await supabase.from("loans").insert({
      item_id: loanItem.id,
      owner_id: user!.id,
      borrower_name: borrowerName.trim(),
      borrower_user_id: borrowerUserId,
      is_public: loanIsPublic,
      due_at: dueAtFromKey(loanDueKey),
    });

    setActionLoading(false);

    if (loanError) {
      Alert.alert(t("common.somethingWrong"), loanError.message);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === loanItem.id ? { ...i, status: "Utlånt" } : i)),
    );
    setLoanModalVisible(false);
  }

  async function handleReturn(item: Item) {
    setSelectedItem(null);
    setActionLoading(true);

    // Sett returned_at på aktivt lån — triggeren trg_sync_item_status setter items.status = 'Tilgjengelig' automatisk
    const { error: loanError } = await supabase
      .from("loans")
      .update({ returned_at: new Date().toISOString() })
      .eq("item_id", item.id)
      .is("returned_at", null);

    setActionLoading(false);

    if (loanError) {
      Alert.alert(t("common.somethingWrong"), loanError.message);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "Tilgjengelig" } : i)),
    );
  }

  function openRequestReturn() {
    setRequestReturnItem(selectedItem); // lagre referanse før vi lukker handlingsarket
    setReturnNote("");
    setSelectedItem(null);
  }

  async function handleSendReturnRequest() {
    if (!requestReturnItem) return;
    setRequestingReturn(true);

    // Sett owner_return_requested_at på det aktive lånet for denne tingen (borrower ser "Retur etterspurt")
    const { error } = await supabase
      .from("loans")
      .update({
        owner_return_requested_at: new Date().toISOString(),
        owner_return_note: returnNote.trim() || null,
      })
      .eq("item_id", requestReturnItem.id)
      .is("returned_at", null);

    setRequestingReturn(false);

    if (error) {
      Alert.alert(t("common.somethingWrong"), error.message);
      return;
    }

    setRequestReturnItem(null);
  }

  async function handleDelete(item: Item) {
    setSelectedItem(null);
    Alert.alert(
      t("collectionDetail.deleteTitle", { title: item.title }),
      t("collectionDetail.deleteBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("collectionDetail.delete"),
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("items").delete().eq("id", item.id);
            if (error) {
              Alert.alert(t("common.somethingWrong"), error.message);
              return;
            }
            // GDPR-sletting: fjern omslagsfilen fra storage så den ikke blir foreldreløs.
            if (item.cover_url) {
              await removeSessionImages([item.cover_url]).catch(() => {});
            }
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          },
        },
      ],
    );
  }

  function handleEdit(item: Item) {
    setSelectedItem(null);
    navigation.navigate("EditItem", { item, type });
  }

  if (loading) {
    return (
      <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center">
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  if (fetchError) {
    return (
      <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center px-8">
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
    );
  }

  // Vennehurtigvalg i utlånsmodalen: skjul når en venn allerede er valgt,
  // ellers filtrer på det som er skrevet i navnefeltet.
  const friendQuery = borrowerName.trim().toLowerCase();
  const friendMatches =
    borrowerUserId !== null
      ? []
      : friends.filter((f) => (f.name ?? "").toLowerCase().includes(friendQuery));

  return (
    <>
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3"
            accessibilityRole="button"
            accessibilityLabel={t("collectionDetail.backA11y")}
          >
            <Ionicons name="chevron-back" size={24} color="#78716C" accessible={false} />
          </TouchableOpacity>
          <Text className="text-content dark:text-content-dark text-2xl font-medium flex-1">
            {itemTypeLabel(type)}
          </Text>
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
            {t("collections.itemsCount", { count: items.length })}
          </Text>
        </View>

        {items.length === 0 ? (
          <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-8 items-center">
            <Ionicons name={ITEM_ICONS[type]} size={32} color="#A8A29E" />
            <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-3 text-center">
              {t("collections.emptyType", { type: itemTypeLabelPlural(type) })}
            </Text>
          </View>
        ) : (
          <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
            {items.map((item, i) => {
              const subtitle =
                type === "puslespill" && item.piece_count
                  ? `${piecesLabel(item.piece_count)}${item.difficulty ? ` · ${difficultyLabel(item.difficulty)}` : ""}`
                  : type === "brettspill" && item.player_count
                    ? playersLabel(item.player_count)
                    : (item.brand ?? null);

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedItem(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={[
                    item.title,
                    subtitle,
                    item.status === "Utlånt" ? t("collections.loaned") : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  accessibilityHint={t("collectionDetail.rowHint")}
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
                      <Ionicons name={ITEM_ICONS[type]} size={20} color="#1D9E75" />
                    )}
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
                    <View className="bg-accent/10 dark:bg-accent-dark/10 px-2 py-1 rounded-full mr-2">
                      <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
                        {t("collections.loaned")}
                      </Text>
                    </View>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#A8A29E"
                    accessible={false}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Handlingsark */}
      <BottomSheet
        visible={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        closeLabel={t("collectionDetail.closeActions")}
      >
        <View className="flex-row items-center mb-4 px-1">
          <View className="w-9 h-9 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-3">
            <Ionicons name={ITEM_ICONS[type]} size={18} color="#1D9E75" />
          </View>
          <View className="flex-1">
            <Text
              className="text-content dark:text-content-dark font-semibold text-xl"
              numberOfLines={1}
            >
              {selectedItem?.title}
            </Text>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
              {itemTypeLabel(type)}
            </Text>
          </View>
          {actionLoading && <ActivityIndicator size="small" color="#1D9E75" />}
        </View>

        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl overflow-hidden mb-3">
          {/* Start økt */}
          <TouchableOpacity
            onPress={() => {
              if (!selectedItem) return;
              setSelectedItem(null);
              navigation.navigate("NewSession", { itemId: selectedItem.id });
            }}
            disabled={selectedItem?.status === "Utlånt"}
            accessibilityRole="button"
            accessibilityLabel={t("collectionDetail.startSession")}
            accessibilityState={{ disabled: selectedItem?.status === "Utlånt" }}
            className={`flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark ${
              selectedItem?.status === "Utlånt" ? "opacity-40" : ""
            }`}
          >
            <Ionicons name="play-circle-outline" size={22} color="#1D9E75" />
            <Text className="text-content dark:text-content-dark text-base ml-3 flex-1">
              {t("collectionDetail.startSession")}
            </Text>
            {selectedItem?.status === "Utlånt" && (
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                {t("collectionDetail.unavailable")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Registrer utlån / Registrer retur */}
          {selectedItem?.status !== "Utlånt" ? (
            <TouchableOpacity
              onPress={openLoanModal}
              accessibilityRole="button"
              accessibilityLabel={t("collectionDetail.registerLoan")}
              className="flex-row items-center px-4 py-4"
            >
              <Ionicons name="arrow-redo-outline" size={22} color="#1D9E75" />
              <Text className="text-content dark:text-content-dark text-base ml-3">
                {t("collectionDetail.registerLoan")}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={openRequestReturn}
                accessibilityRole="button"
                accessibilityLabel={t("collections.requestReturn")}
                className="flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark"
              >
                <Ionicons name="notifications-outline" size={22} color="#1D9E75" />
                <Text className="text-content dark:text-content-dark text-base ml-3">
                  {t("collections.requestReturn")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => selectedItem && handleReturn(selectedItem)}
                accessibilityRole="button"
                accessibilityLabel={t("loans.registerReturn")}
                className="flex-row items-center px-4 py-4"
              >
                <Ionicons name="arrow-undo-outline" size={22} color="#1D9E75" />
                <Text className="text-content dark:text-content-dark text-base ml-3">
                  {t("loans.registerReturn")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl overflow-hidden mb-3">
          <TouchableOpacity
            onPress={() => selectedItem && handleEdit(selectedItem)}
            accessibilityRole="button"
            accessibilityLabel={t("collectionDetail.edit")}
            className="flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark"
          >
            <Ionicons name="pencil-outline" size={22} color="#1D9E75" />
            <Text className="text-content dark:text-content-dark text-base ml-3">
              {t("collectionDetail.edit")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => selectedItem && handleDelete(selectedItem)}
            accessibilityRole="button"
            accessibilityLabel={t("collectionDetail.delete")}
            className="flex-row items-center px-4 py-4"
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
            <Text className="text-red-500 text-base ml-3">
              {t("collectionDetail.delete")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setSelectedItem(null)}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center"
        >
          <Text className="text-content dark:text-content-dark font-semibold text-base">
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Utlåns-modal */}
      <BottomSheet
        visible={loanModalVisible}
        onClose={() => setLoanModalVisible(false)}
        closeLabel={t("collectionDetail.closeLoanModal")}
      >
        <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
          {t("collectionDetail.registerLoan")}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-5 px-1">
          {t("collectionDetail.loanWhoPrompt")}
        </Text>

        {/* Navn-felt (venn eller fritekst) */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2 px-1">
          {t("collectionDetail.nameLabel")}
        </Text>
        <View className="mb-5">
          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 flex-row items-center">
            <TextInput
              className="flex-1 text-content dark:text-content-dark text-base"
              placeholder={t("collectionDetail.namePlaceholder")}
              placeholderTextColor="#A8A29E"
              value={borrowerName}
              onChangeText={onBorrowerNameChange}
              autoFocus
              autoCapitalize="words"
              accessibilityLabel={t("collectionDetail.nameFieldA11y")}
            />
            {borrowerUserId && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#1D9E75"
                accessible={false}
              />
            )}
          </View>

          {friendMatches.length > 0 && (
            <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark overflow-hidden mt-2 max-h-56">
              <ScrollView keyboardShouldPersistTaps="handled">
                {friendMatches.map((f, idx) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => selectFriend(f)}
                    accessibilityRole="button"
                    accessibilityLabel={f.name ?? t("common.unknownUser")}
                    accessibilityHint={t("collectionDetail.pickFriendHint")}
                    className={`flex-row items-center px-4 py-3 ${
                      idx < friendMatches.length - 1
                        ? "border-b border-border dark:border-border-dark"
                        : ""
                    }`}
                  >
                    <UserAvatar name={f.name} avatarUrl={f.avatarUrl} size={32} />
                    <Text
                      className="text-content dark:text-content-dark text-base ml-3 flex-1"
                      numberOfLines={1}
                    >
                      {f.name ?? t("common.unknownUser")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Synlighet-toggle */}
        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl px-4 py-4 mb-5 flex-row items-center">
          <View className="flex-1">
            <Text className="text-content dark:text-content-dark font-medium">
              {t("collectionDetail.visibleToFriends")}
            </Text>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
              {t("collectionDetail.visibleToFriendsDesc")}
            </Text>
          </View>
          <Switch
            value={loanIsPublic}
            onValueChange={setLoanIsPublic}
            trackColor={{ false: "#D6D3D1", true: "#1D9E75" }}
            thumbColor="white"
            accessibilityLabel={t("collectionDetail.visibleToFriends")}
            accessibilityHint={t("collectionDetail.visibleToFriendsHint")}
          />
        </View>

        {/* Frist */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2 px-1">
          {t("collectionDetail.dueLabel")}
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {DUE_OPTIONS.map((opt) => {
            const selected = loanDueKey === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setLoanDueKey(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={t(opt.labelKey)}
                accessibilityState={{ selected }}
                className={`px-4 py-2 rounded-full border ${
                  selected
                    ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                    : "bg-surface-secondary dark:bg-surface-dark-secondary border-border dark:border-border-dark"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selected ? "text-white" : "text-content dark:text-content-dark"
                  }`}
                >
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lån ut-knapp */}
        <TouchableOpacity
          onPress={handleLoan}
          disabled={actionLoading}
          accessibilityRole="button"
          accessibilityLabel={t("collectionDetail.lendOut")}
          accessibilityState={{ disabled: actionLoading }}
          className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center justify-center mb-3"
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">
              {t("collectionDetail.lendOut")}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setLoanModalVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center"
        >
          <Text className="text-content dark:text-content-dark font-semibold text-base">
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Be om retur-modal */}
      <BottomSheet
        visible={requestReturnItem !== null}
        onClose={() => setRequestReturnItem(null)}
        closeLabel={t("collections.closeLoanActions")}
      >
        <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
          {t("collections.requestReturn")}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-4 px-1">
          {requestReturnItem?.title ?? t("common.unknownItem")}
        </Text>

        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-4">
          <TextInput
            className="text-content dark:text-content-dark text-base"
            placeholder={t("borrow.messagePlaceholder")}
            placeholderTextColor="#A8A29E"
            value={returnNote}
            onChangeText={setReturnNote}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel={t("borrow.messagePlaceholder")}
          />
        </View>

        <TouchableOpacity
          onPress={handleSendReturnRequest}
          disabled={requestingReturn}
          accessibilityRole="button"
          accessibilityLabel={t("collections.requestReturnSend")}
          accessibilityState={{ disabled: requestingReturn }}
          className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center mb-2"
        >
          {requestingReturn ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {t("collections.requestReturnSend")}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRequestReturnItem(null)}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          className="py-3 items-center"
        >
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </BottomSheet>
    </>
  );
}
