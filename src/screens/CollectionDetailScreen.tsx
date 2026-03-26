import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Pressable,
  TextInput,
  Switch,
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
import { ITEM_ICONS, ITEM_LABELS, type Item } from "../utils/collections";
import { CollectionsStackParamList } from "../navigation/CollectionsStack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type CollectionDetailRouteProp = RouteProp<
  CollectionsStackParamList,
  "CollectionDetail"
>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<CollectionDetailRouteProp>();
  const { type } = route.params;
  const { user } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Utlåns-modal
  const [loanItem, setLoanItem] = useState<Item | null>(null);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [borrowerName, setBorrowerName] = useState("");
  const [loanIsPublic, setLoanIsPublic] = useState(false);

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

  // Refetch when screen comes back into focus (e.g. after adding or editing an item)
  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [type]),
  );

  function openLoanModal() {
    setLoanItem(selectedItem); // lagre referanse før vi lukker handlingsarket
    setBorrowerName("");
    setLoanIsPublic(false);
    setSelectedItem(null); // lukk handlingsarket
    setLoanModalVisible(true);
  }

  async function handleLoan() {
    if (!borrowerName.trim()) {
      Alert.alert("Mangler navn", "Fyll inn hvem du låner ut til.");
      return;
    }
    if (!loanItem) return;

    setActionLoading(true);

    // Opprett låneregistrering
    const { error: loanError } = await supabase.from("loans").insert({
      item_id: loanItem.id,
      owner_id: user!.id,
      borrower_name: borrowerName.trim(),
      is_public: loanIsPublic,
    });

    if (loanError) {
      setActionLoading(false);
      Alert.alert("Noe gikk galt", loanError.message);
      return;
    }

    // Oppdater status på gjenstanden
    const { error: itemError } = await supabase
      .from("items")
      .update({ status: "Utlånt" })
      .eq("id", loanItem.id);

    setActionLoading(false);

    if (itemError) {
      Alert.alert("Noe gikk galt", itemError.message);
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === loanItem.id ? { ...i, status: "Utlånt" } : i,
      ),
    );
    setLoanModalVisible(false);
  }

  async function handleReturn(item: Item) {
    setSelectedItem(null);
    setActionLoading(true);

    // Sett returned_at på aktivt lån
    const { error: loanError } = await supabase
      .from("loans")
      .update({ returned_at: new Date().toISOString() })
      .eq("item_id", item.id)
      .is("returned_at", null);

    if (loanError) {
      setActionLoading(false);
      Alert.alert("Noe gikk galt", loanError.message);
      return;
    }

    // Oppdater status på gjenstanden
    const { error: itemError } = await supabase
      .from("items")
      .update({ status: "Tilgjengelig" })
      .eq("id", item.id);

    setActionLoading(false);

    if (itemError) {
      Alert.alert("Noe gikk galt", itemError.message);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "Tilgjengelig" } : i)),
    );
  }

  async function handleDelete(item: Item) {
    setSelectedItem(null);
    Alert.alert(`Slett ${item.title}?`, "Dette kan ikke angres.", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Slett",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("items")
            .delete()
            .eq("id", item.id);
          if (error) {
            Alert.alert("Noe gikk galt", error.message);
            return;
          }
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        },
      },
    ]);
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

  return (
    <>
      <ScrollView
        className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchItems(true)}
          />
        }
      >
        <View
          className="flex-row items-center px-4 pb-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3"
          >
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
              Ingen {ITEM_LABELS[type].toLowerCase()} i samlingen ennå.{"\n"}
              Bruk + for å legge til.
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
                    : (item.brand ?? null);

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedItem(item)}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-4 py-4 ${
                    i < items.length - 1
                      ? "border-b border-border dark:border-border-dark"
                      : ""
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
                    <Ionicons
                      name={ITEM_ICONS[type]}
                      size={20}
                      color="#1D9E75"
                    />
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
                        Utlånt
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#A8A29E" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Handlingsark */}
      <Modal
        visible={selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setSelectedItem(null)}
        />
        <View
          className="bg-surface dark:bg-surface-dark rounded-t-3xl px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full self-center mb-4" />

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
                {ITEM_LABELS[type]}
              </Text>
            </View>
            {actionLoading && (
              <ActivityIndicator size="small" color="#1D9E75" />
            )}
          </View>

          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl overflow-hidden mb-3">
            {/* Start økt */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Kommer snart", "Økt-funksjon kommer i fase 3.")
              }
              disabled={selectedItem?.status === "Utlånt"}
              className={`flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark ${
                selectedItem?.status === "Utlånt" ? "opacity-40" : ""
              }`}
            >
              <Ionicons name="play-circle-outline" size={22} color="#1D9E75" />
              <Text className="text-content dark:text-content-dark text-base ml-3 flex-1">
                Start økt
              </Text>
              {selectedItem?.status === "Utlånt" && (
                <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                  Ikke tilgjengelig
                </Text>
              )}
            </TouchableOpacity>

            {/* Registrer utlån / Registrer retur */}
            {selectedItem?.status !== "Utlånt" ? (
              <TouchableOpacity
                onPress={openLoanModal}
                className="flex-row items-center px-4 py-4"
              >
                <Ionicons name="arrow-redo-outline" size={22} color="#1D9E75" />
                <Text className="text-content dark:text-content-dark text-base ml-3">
                  Registrer utlån
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => selectedItem && handleReturn(selectedItem)}
                className="flex-row items-center px-4 py-4"
              >
                <Ionicons name="arrow-undo-outline" size={22} color="#1D9E75" />
                <Text className="text-content dark:text-content-dark text-base ml-3">
                  Registrer retur
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl overflow-hidden mb-3">
            <TouchableOpacity
              onPress={() => selectedItem && handleEdit(selectedItem)}
              className="flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark"
            >
              <Ionicons name="pencil-outline" size={22} color="#1D9E75" />
              <Text className="text-content dark:text-content-dark text-base ml-3">
                Rediger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => selectedItem && handleDelete(selectedItem)}
              className="flex-row items-center px-4 py-4"
            >
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text className="text-red-500 text-base ml-3">Slett</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setSelectedItem(null)}
            className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center"
          >
            <Text className="text-content dark:text-content-dark font-semibold text-base">
              Avbryt
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Utlåns-modal */}
      <Modal
        visible={loanModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLoanModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setLoanModalVisible(false)}
        />
        <View
          className="bg-surface dark:bg-surface-dark rounded-t-3xl px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full self-center mb-4" />

          <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
            Registrer utlån
          </Text>
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-5 px-1">
            Hvem låner du ut til?
          </Text>

          {/* Navn-felt */}
          <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2 px-1">
            NAVN
          </Text>
          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-5">
            <TextInput
              className="text-content dark:text-content-dark text-base"
              placeholder="f.eks. Kari Nordmann"
              placeholderTextColor="#A8A29E"
              value={borrowerName}
              onChangeText={setBorrowerName}
              autoFocus
              autoCapitalize="words"
            />
          </View>

          {/* Synlighet-toggle */}
          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl px-4 py-4 mb-5 flex-row items-center">
            <View className="flex-1">
              <Text className="text-content dark:text-content-dark font-medium">
                Synlig for felles venner
              </Text>
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
                Viser at du har lånt ut — ikke hvem til
              </Text>
            </View>
            <Switch
              value={loanIsPublic}
              onValueChange={setLoanIsPublic}
              trackColor={{ false: "#D6D3D1", true: "#1D9E75" }}
              thumbColor="white"
            />
          </View>

          {/* Lån ut-knapp */}
          <TouchableOpacity
            onPress={handleLoan}
            disabled={actionLoading}
            className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center justify-center mb-3"
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">Lån ut</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLoanModalVisible(false)}
            className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center"
          >
            <Text className="text-content dark:text-content-dark font-semibold text-base">
              Avbryt
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
