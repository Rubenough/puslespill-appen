import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { itemTypeLabel } from "../utils/collectionLabels";
import { CollectionsStackParamList } from "../navigation/CollectionsStack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getRelativeDayLabel, formatShortDate } from "../utils/date";
import BottomSheet from "../components/BottomSheet";

type NavProp = NativeStackNavigationProp<CollectionsStackParamList, "CollectionsList">;

const COLLECTION_TYPES: ItemType[] = ["puslespill", "brettspill"];

// En date-verdi (YYYY-MM-DD) er forfalt hvis den er før dagens dato.
function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return due < new Date().toISOString().slice(0, 10);
}

type CollectionSummary = { type: ItemType; count: number; loaned: number };

type ActiveLoan = {
  id: string;
  borrower_name: string;
  loaned_at: string;
  due_at: string | null;
  return_requested_at: string | null;
  owner_return_requested_at: string | null;
  items: { title: string; type: string } | null;
};

// Ting brukeren selv låner nå (godkjente forespørsler → loans der jeg er låntaker).
type BorrowedLoan = {
  id: string;
  loaned_at: string;
  ownerName: string;
  due_at: string | null;
  return_requested_at: string | null;
  owner_return_requested_at: string | null;
  owner_return_note: string | null;
  items: { title: string; type: string } | null;
};

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [collections, setCollections] = useState<CollectionSummary[]>(
    COLLECTION_TYPES.map((type) => ({ type, count: 0, loaned: 0 })),
  );
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [borrowedLoans, setBorrowedLoans] = useState<BorrowedLoan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  // Eier ber om retur (note-modal)
  const [requestReturnLoan, setRequestReturnLoan] = useState<ActiveLoan | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [requestingReturn, setRequestingReturn] = useState(false);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);

      const [itemsResult, loansResult, borrowedResult] = await Promise.all([
        supabase.from("items").select("type, status").eq("owner_id", user!.id),
        supabase
          .from("loans")
          .select(
            "id, borrower_name, loaned_at, due_at, return_requested_at, owner_return_requested_at, items(title, type)",
          )
          .eq("owner_id", user!.id)
          .is("returned_at", null)
          .order("loaned_at", { ascending: false }),
        // Ting jeg selv låner nå — synlig via RLS-policy for låntaker (borrower_user_id = auth.uid()).
        supabase
          .from("loans")
          .select(
            "id, loaned_at, owner_id, due_at, return_requested_at, owner_return_requested_at, owner_return_note, items(title, type)",
          )
          .eq("borrower_user_id", user!.id)
          .is("returned_at", null)
          .order("loaned_at", { ascending: false }),
      ]);

      if (itemsResult.error) {
        setFetchError(itemsResult.error.message);
        setRefreshing(false);
        return;
      }
      if (loansResult.error) {
        setFetchError(loansResult.error.message);
        setRefreshing(false);
        return;
      }
      if (borrowedResult.error) {
        setFetchError(borrowedResult.error.message);
        setRefreshing(false);
        return;
      }

      setFetchError(null);

      const summaries = COLLECTION_TYPES.map((type) => {
        const ofType = itemsResult.data.filter((row) => row.type === type);
        return {
          type,
          count: ofType.length,
          loaned: ofType.filter((row) => row.status === "Utlånt").length,
        };
      });
      setCollections(summaries);

      // Supabase infererer joined tabeller som arrays uten genererte typer
      const mapped: ActiveLoan[] = loansResult.data.map((row) => ({
        id: row.id,
        borrower_name: row.borrower_name,
        loaned_at: row.loaned_at,
        due_at: row.due_at,
        return_requested_at: row.return_requested_at,
        owner_return_requested_at: row.owner_return_requested_at,
        items: Array.isArray(row.items) ? (row.items[0] ?? null) : row.items,
      }));
      setActiveLoans(mapped);

      // Slå opp eiernavn for tingene jeg låner (én batch mot profiles).
      const borrowedRows = borrowedResult.data ?? [];
      const ownerIds = [...new Set(borrowedRows.map((row) => row.owner_id))];
      let ownerNameById = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        ownerNameById = new Map((owners ?? []).map((p) => [p.id, p.full_name ?? ""]));
      }
      setBorrowedLoans(
        borrowedRows.map((row) => ({
          id: row.id,
          loaned_at: row.loaned_at,
          ownerName: ownerNameById.get(row.owner_id) || t("common.unknownUser"),
          due_at: row.due_at,
          return_requested_at: row.return_requested_at,
          owner_return_requested_at: row.owner_return_requested_at,
          owner_return_note: row.owner_return_note,
          items: Array.isArray(row.items) ? (row.items[0] ?? null) : row.items,
        })),
      );

      setRefreshing(false);
    },
    [user, t],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  function handleReturn(loan: ActiveLoan) {
    Alert.alert(
      t("loans.registerReturn"),
      t("loans.returnConfirm", {
        name: loan.borrower_name,
        item: loan.items?.title ?? t("common.unknownItem"),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("loans.returnAction"),
          onPress: async () => {
            setReturningId(loan.id);
            const { error } = await supabase
              .from("loans")
              .update({ returned_at: new Date().toISOString() })
              .eq("id", loan.id);
            setReturningId(null);
            if (error) {
              Alert.alert(t("common.somethingWrong"), error.message);
              return;
            }
            fetchData();
          },
        },
      ],
    );
  }

  function handleMarkReturned(loan: BorrowedLoan) {
    const item = loan.items?.title ?? t("common.unknownItem");
    Alert.alert(
      t("collections.markReturnedTitle", { item }),
      t("collections.markReturnedBody", { owner: loan.ownerName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("collections.markReturned"),
          onPress: async () => {
            setMarkingId(loan.id);
            const { error } = await supabase.rpc("mark_loan_returned", {
              p_loan_id: loan.id,
            });
            setMarkingId(null);
            if (error) {
              Alert.alert(t("common.somethingWrong"), error.message);
              return;
            }
            fetchData();
          },
        },
      ],
    );
  }

  // Låntaker angrer sin egen retur-melding.
  function handleUndoReturn(loan: BorrowedLoan) {
    const item = loan.items?.title ?? t("common.unknownItem");
    Alert.alert(
      t("collections.undoReturnTitle"),
      t("collections.undoReturnBody", { item }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("collections.undoReturn"),
          onPress: async () => {
            setMarkingId(loan.id);
            const { error } = await supabase.rpc("unmark_loan_returned", {
              p_loan_id: loan.id,
            });
            setMarkingId(null);
            if (error) {
              Alert.alert(t("common.somethingWrong"), error.message);
              return;
            }
            fetchData();
          },
        },
      ],
    );
  }

  // Eier trykker på et utlån → velg mellom å be om retur eller registrere retur.
  function handleOwnerLoanTap(loan: ActiveLoan) {
    Alert.alert(loan.items?.title ?? t("common.unknownItem"), undefined, [
      {
        text: t("collections.requestReturn"),
        onPress: () => {
          setReturnNote("");
          setRequestReturnLoan(loan);
        },
      },
      { text: t("loans.registerReturn"), onPress: () => handleReturn(loan) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  async function handleSendReturnRequest() {
    if (!requestReturnLoan) return;
    setRequestingReturn(true);
    const { error } = await supabase
      .from("loans")
      .update({
        owner_return_requested_at: new Date().toISOString(),
        owner_return_note: returnNote.trim() || null,
      })
      .eq("id", requestReturnLoan.id);
    setRequestingReturn(false);
    if (error) {
      Alert.alert(t("common.somethingWrong"), error.message);
      return;
    }
    setRequestReturnLoan(null);
    fetchData();
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
        }
      >
        <Text
          className="text-content dark:text-content-dark text-2xl font-medium px-4 pb-6"
          style={{ paddingTop: insets.top + 16 }}
        >
          {t("collections.title")}
        </Text>

        {fetchError && (
          <View className="mx-4 mb-6 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
            <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
              {t("collections.loadError")}
            </Text>
            <TouchableOpacity
              onPress={() => fetchData()}
              accessibilityRole="button"
              accessibilityLabel={t("common.retry")}
              className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
            >
              <Text className="text-white font-semibold text-sm">
                {t("common.retry")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
        >
          {t("collections.sectionCollections")}
        </Text>
        <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
          {collections.map((col, i) => (
            <TouchableOpacity
              key={col.type}
              onPress={() => navigation.navigate("CollectionDetail", { type: col.type })}
              accessibilityRole="button"
              accessibilityLabel={[
                itemTypeLabel(col.type),
                t("collections.itemsCount", { count: col.count }),
                col.loaned > 0
                  ? t("collections.loanedCount", { count: col.loaned })
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
              accessibilityHint={t("collections.openHint")}
              className={`flex-row items-center px-4 py-4 ${
                i < collections.length - 1
                  ? "border-b border-border dark:border-border-dark"
                  : ""
              }`}
            >
              <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
                <Ionicons name={ITEM_ICONS[col.type]} size={20} color="#1D9E75" />
              </View>
              <View className="flex-1">
                <Text className="text-content dark:text-content-dark font-medium">
                  {itemTypeLabel(col.type)}
                </Text>
                <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                  {t("collections.itemsCount", { count: col.count })}
                  {col.loaned > 0
                    ? ` · ${t("collections.loanedCount", { count: col.loaned })}`
                    : ""}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#78716C"
                accessible={false}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
        >
          {t("collections.sectionLoanedNow")}
        </Text>
        <View className="mx-4 mb-8">
          {activeLoans.length === 0 ? (
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-6 items-center">
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
                {t("collections.nothingLoaned")}
              </Text>
            </View>
          ) : (
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
              {activeLoans.map((loan, i) => {
                const itemType = loan.items?.type as ItemType | undefined;
                const dateLabel = getRelativeDayLabel(loan.loaned_at);
                const overdue = isOverdue(loan.due_at);

                const isReturning = returningId === loan.id;
                return (
                  <TouchableOpacity
                    key={loan.id}
                    onPress={() => handleOwnerLoanTap(loan)}
                    disabled={isReturning}
                    accessibilityRole="button"
                    accessibilityLabel={t("loans.loanedToA11y", {
                      item: loan.items?.title ?? t("common.unknownItem"),
                      name: loan.borrower_name,
                      when: dateLabel,
                    })}
                    accessibilityHint={t("collections.loanActionsHint")}
                    accessibilityState={{ disabled: isReturning }}
                    className={`flex-row items-center px-4 py-4 ${
                      i < activeLoans.length - 1
                        ? "border-b border-border dark:border-border-dark"
                        : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
                      <Ionicons
                        name={itemType ? ITEM_ICONS[itemType] : "cube-outline"}
                        size={20}
                        color="#1D9E75"
                        accessible={false}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-content dark:text-content-dark font-medium">
                        {loan.items?.title ?? t("common.unknownItem")}
                      </Text>
                      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                        {t("loans.borrowerWhen", {
                          name: loan.borrower_name,
                          when: dateLabel,
                        })}
                      </Text>
                      {loan.due_at && (
                        <Text
                          className={`text-xs mt-0.5 ${
                            overdue
                              ? "text-red-500"
                              : "text-content-secondary dark:text-content-secondary-dark"
                          }`}
                        >
                          {t("collections.dueBy", {
                            date: formatShortDate(loan.due_at),
                          })}
                          {overdue ? ` · ${t("collections.overdue")}` : ""}
                        </Text>
                      )}
                    </View>
                    {!isReturning &&
                      (loan.return_requested_at ? (
                        <View className="bg-accent/10 dark:bg-accent-dark/10 px-2 py-1 rounded-full mr-2">
                          <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
                            {t("collections.returnReported")}
                          </Text>
                        </View>
                      ) : loan.owner_return_requested_at ? (
                        <View className="bg-surface-secondary dark:bg-surface-dark-secondary px-2 py-1 rounded-full mr-2">
                          <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold">
                            {t("collections.returnRequestedByOwner")}
                          </Text>
                        </View>
                      ) : null)}
                    {isReturning ? (
                      <ActivityIndicator size="small" color="#1D9E75" />
                    ) : (
                      <Ionicons
                        name="return-down-back-outline"
                        size={20}
                        color="#78716C"
                        accessible={false}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {borrowedLoans.length > 0 && (
          <>
            <Text
              accessibilityRole="header"
              className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
            >
              {t("collections.sectionBorrowingNow")}
            </Text>
            <View className="mx-4 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
              {borrowedLoans.map((loan, i) => {
                const itemType = loan.items?.type as ItemType | undefined;
                const dateLabel = getRelativeDayLabel(loan.loaned_at);
                const title = loan.items?.title ?? t("common.unknownItem");
                const reported = !!loan.return_requested_at;
                const isMarking = markingId === loan.id;
                const overdue = isOverdue(loan.due_at);
                return (
                  <TouchableOpacity
                    key={loan.id}
                    onPress={() =>
                      reported ? handleUndoReturn(loan) : handleMarkReturned(loan)
                    }
                    disabled={isMarking}
                    accessibilityRole="button"
                    accessibilityLabel={
                      reported
                        ? t("collections.returnReportedA11y", {
                            item: title,
                            name: loan.ownerName,
                          })
                        : t("collections.borrowedA11y", {
                            item: title,
                            name: loan.ownerName,
                            when: dateLabel,
                          })
                    }
                    accessibilityHint={
                      reported
                        ? t("collections.undoReturn")
                        : t("collections.markReturnedHint")
                    }
                    accessibilityState={{ disabled: isMarking }}
                    className={`flex-row items-center px-4 py-4 ${
                      i < borrowedLoans.length - 1
                        ? "border-b border-border dark:border-border-dark"
                        : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
                      <Ionicons
                        name={itemType ? ITEM_ICONS[itemType] : "cube-outline"}
                        size={20}
                        color="#1D9E75"
                        accessible={false}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-content dark:text-content-dark font-medium">
                        {title}
                      </Text>
                      <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                        {t("collections.borrowedFromWhen", {
                          name: loan.ownerName,
                          when: dateLabel,
                        })}
                      </Text>
                      {loan.due_at && (
                        <Text
                          className={`text-xs mt-0.5 ${
                            overdue
                              ? "text-red-500"
                              : "text-content-secondary dark:text-content-secondary-dark"
                          }`}
                        >
                          {t("collections.dueBy", {
                            date: formatShortDate(loan.due_at),
                          })}
                          {overdue ? ` · ${t("collections.overdue")}` : ""}
                        </Text>
                      )}
                      {loan.owner_return_requested_at && (
                        <Text className="text-accent dark:text-accent-dark text-xs font-medium mt-0.5">
                          {t("collections.ownerRequestedReturn")}
                          {loan.owner_return_note ? `: ${loan.owner_return_note}` : ""}
                        </Text>
                      )}
                    </View>
                    {isMarking ? (
                      <ActivityIndicator size="small" color="#1D9E75" />
                    ) : reported ? (
                      <View className="bg-accent/10 dark:bg-accent-dark/10 px-2 py-1 rounded-full">
                        <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
                          {t("collections.returnReported")}
                        </Text>
                      </View>
                    ) : (
                      <Ionicons
                        name="return-down-back-outline"
                        size={20}
                        color="#78716C"
                        accessible={false}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Be om retur-modal (eier) */}
      <BottomSheet
        visible={requestReturnLoan !== null}
        onClose={() => setRequestReturnLoan(null)}
        closeLabel={t("collections.closeLoanActions")}
      >
        <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
          {t("collections.requestReturn")}
        </Text>
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-4 px-1">
          {requestReturnLoan?.items?.title ?? t("common.unknownItem")}
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
          onPress={() => setRequestReturnLoan(null)}
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
