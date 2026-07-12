// Lånehuben — hele lånesløyfen på ett sted (nås fra bjella i Header og
// Lån-kortet i Samlinger): forespørsler inn/ut, ting jeg låner, ting jeg har
// lånt ut, og inngang til lånehistorikken.
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
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { type ItemType } from "../utils/collections";
import { dueAtFromKey } from "../utils/loans";
import { getSignedUrls } from "../utils/sessionImages";
import { RootStackParamList } from "../navigation/RootNavigator";
import BottomSheet from "../components/BottomSheet";
import LoanRow, { loanWhenLabel } from "../components/loans/LoanRow";
import RequestCard, {
  type BorrowRequest,
  type EnrichedRequest,
} from "../components/loans/RequestCard";
import DueDateChips from "../components/loans/DueDateChips";

type NavProp = NativeStackNavigationProp<RootStackParamList, "LoansHub">;

// Utlån jeg eier (aktive).
type LentLoan = {
  id: string;
  borrower_name: string;
  loaned_at: string;
  due_at: string | null;
  return_requested_at: string | null;
  owner_return_requested_at: string | null;
  items: { title: string; type: string } | null;
};

// Ting jeg selv låner nå (jeg er låntaker).
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

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
    >
      {label}
    </Text>
  );
}

export default function LoansHubScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  // #78716C feiler kontrast på mørk flate — velg token per skjema (CLAUDE.md).
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#A8A29E" : "#78716C";

  const [incoming, setIncoming] = useState<EnrichedRequest[]>([]);
  const [outgoing, setOutgoing] = useState<EnrichedRequest[]>([]);
  const [lentLoans, setLentLoans] = useState<LentLoan[]>([]);
  const [borrowedLoans, setBorrowedLoans] = useState<BorrowedLoan[]>([]);
  // Kart fra items.cover_url (lagringssti) → kortlivd signert URL for visning.
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  // Én rad-handling om gangen (godkjenn/avslå/avbryt/retur/meld levert).
  const [busyId, setBusyId] = useState<string | null>(null);
  // Valgt frist per innkommende forespørsel (nøkkel fra DUE_OPTIONS); standard "none".
  const [dueKeyById, setDueKeyById] = useState<Record<string, string>>({});
  // Eier ber om retur (note-modal).
  const [requestReturnLoan, setRequestReturnLoan] = useState<LentLoan | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [requestingReturn, setRequestingReturn] = useState(false);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);

      const [requestsResult, lentResult, borrowedResult] = await Promise.all([
        // Ventende forespørsler der jeg er eier (inn) eller spørrer (ut) — RLS avgrenser.
        supabase
          .from("borrow_requests")
          .select(
            "id, item_id, owner_id, requester_id, message, status, created_at, items(title, type, cover_url)",
          )
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("loans")
          .select(
            "id, borrower_name, loaned_at, due_at, return_requested_at, owner_return_requested_at, items(title, type)",
          )
          .eq("owner_id", user.id)
          .is("returned_at", null)
          .order("loaned_at", { ascending: false }),
        // Ting jeg selv låner nå — synlig via RLS-policy for låntaker.
        supabase
          .from("loans")
          .select(
            "id, loaned_at, owner_id, due_at, return_requested_at, owner_return_requested_at, owner_return_note, items(title, type)",
          )
          .eq("borrower_user_id", user.id)
          .is("returned_at", null)
          .order("loaned_at", { ascending: false }),
      ]);

      if (requestsResult.error || lentResult.error || borrowedResult.error) {
        setFetchError(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Supabase infererer joined tabeller som arrays uten FK-metadata — normaliser.
      const requestRows: BorrowRequest[] = requestsResult.data.map((row) => ({
        id: row.id,
        item_id: row.item_id,
        owner_id: row.owner_id,
        requester_id: row.requester_id,
        message: row.message,
        status: row.status,
        created_at: row.created_at,
        items: Array.isArray(row.items) ? (row.items[0] ?? null) : row.items,
      }));

      // Motparter (forespørsler) + eiere (ting jeg låner) → ett profiloppslag.
      const profileIds = new Set<string>();
      for (const r of requestRows) {
        profileIds.add(r.owner_id === user.id ? r.requester_id : r.owner_id);
      }
      for (const row of borrowedResult.data) profileIds.add(row.owner_id);

      let profilesById = new Map<string, { full_name: string | null }>();
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...profileIds]);
        profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      const enrich = (r: BorrowRequest, otherId: string): EnrichedRequest => ({
        ...r,
        otherName: profilesById.get(otherId)?.full_name ?? null,
      });

      setIncoming(
        requestRows
          .filter((r) => r.owner_id === user.id)
          .map((r) => enrich(r, r.requester_id)),
      );
      setOutgoing(
        requestRows
          .filter((r) => r.requester_id === user.id)
          .map((r) => enrich(r, r.owner_id)),
      );

      setLentLoans(
        lentResult.data.map((row) => ({
          id: row.id,
          borrower_name: row.borrower_name,
          loaned_at: row.loaned_at,
          due_at: row.due_at,
          return_requested_at: row.return_requested_at,
          owner_return_requested_at: row.owner_return_requested_at,
          items: Array.isArray(row.items) ? (row.items[0] ?? null) : row.items,
        })),
      );

      setBorrowedLoans(
        borrowedResult.data.map((row) => ({
          id: row.id,
          loaned_at: row.loaned_at,
          ownerName: profilesById.get(row.owner_id)?.full_name || t("common.unknownUser"),
          due_at: row.due_at,
          return_requested_at: row.return_requested_at,
          owner_return_requested_at: row.owner_return_requested_at,
          owner_return_note: row.owner_return_note,
          items: Array.isArray(row.items) ? (row.items[0] ?? null) : row.items,
        })),
      );

      // Signer omslag for forespørselsradene ved henting (som i CollectionDetail).
      const covers = requestRows
        .map((r) => r.items?.cover_url)
        .filter((c): c is string => !!c);
      setCoverUrls(covers.length > 0 ? await getSignedUrls(covers) : new Map());

      setFetchError(false);
      setLoading(false);
      setRefreshing(false);
    },
    [user, t],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  function afterAction(error: { message: string } | null) {
    setBusyId(null);
    if (error) {
      Alert.alert(t("common.somethingWrong"), error.message);
      return;
    }
    fetchData();
  }

  async function runRequestAction(id: string, rpc: "decline_request" | "cancel_request") {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc(rpc, { p_request_id: id });
      afterAction(error);
    } catch {
      // Kastet unntak (nettverk) må også nullstille flagget — ellers står kortet fast.
      setBusyId(null);
      Alert.alert(t("common.somethingWrong"), t("loansHub.loadError"));
    }
  }

  // Godkjenn oppretter lånet; send med valgt frist (eller null) → loans.due_at.
  async function approveRequest(id: string) {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("approve_request", {
        p_request_id: id,
        // Generert type er `p_due_at?: string` (ikke null) → utelat i stedet for å sende null.
        p_due_at: dueAtFromKey(dueKeyById[id] ?? "none") ?? undefined,
      });
      afterAction(error);
    } catch {
      setBusyId(null);
      Alert.alert(t("common.somethingWrong"), t("loansHub.loadError"));
    }
  }

  // Eier registrerer at tingen er levert tilbake.
  function handleConfirmReturn(loan: LentLoan) {
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
            setBusyId(loan.id);
            const { error } = await supabase
              .from("loans")
              .update({ returned_at: new Date().toISOString() })
              .eq("id", loan.id);
            afterAction(error);
          },
        },
      ],
    );
  }

  // Eier trykker på et utlån → velg mellom å be om retur eller registrere retur.
  function handleLentLoanTap(loan: LentLoan) {
    Alert.alert(loan.items?.title ?? t("common.unknownItem"), undefined, [
      {
        text: t("collections.requestReturn"),
        onPress: () => {
          setReturnNote("");
          setRequestReturnLoan(loan);
        },
      },
      { text: t("loans.registerReturn"), onPress: () => handleConfirmReturn(loan) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  async function handleSendReturnRequest() {
    if (!requestReturnLoan) return;
    setRequestingReturn(true);
    try {
      const { error } = await supabase
        .from("loans")
        .update({
          owner_return_requested_at: new Date().toISOString(),
          owner_return_note: returnNote.trim() || null,
        })
        .eq("id", requestReturnLoan.id);
      if (error) {
        Alert.alert(t("common.somethingWrong"), error.message);
        return;
      }
    } catch {
      Alert.alert(t("common.somethingWrong"), t("loansHub.loadError"));
      return;
    } finally {
      setRequestingReturn(false);
    }
    setRequestReturnLoan(null);
    fetchData();
  }

  // Låntaker melder at tingen er levert tilbake.
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
            setBusyId(loan.id);
            const { error } = await supabase.rpc("mark_loan_returned", {
              p_loan_id: loan.id,
            });
            afterAction(error);
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
            setBusyId(loan.id);
            const { error } = await supabase.rpc("unmark_loan_returned", {
              p_loan_id: loan.id,
            });
            afterAction(error);
          },
        },
      ],
    );
  }

  const isEmpty =
    incoming.length === 0 &&
    outgoing.length === 0 &&
    lentLoans.length === 0 &&
    borrowedLoans.length === 0;

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
          <Ionicons name="chevron-back" size={24} color={iconColor} accessible={false} />
        </TouchableOpacity>
        <Text className="text-content dark:text-content-dark text-lg font-semibold flex-1">
          {t("loansHub.title")}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D9E75" />
        </View>
      ) : fetchError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-content dark:text-content-dark text-center mb-4">
            {t("loansHub.loadError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchData()}
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
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
          }
        >
          {isEmpty && (
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-6 items-center mb-8">
              <Ionicons
                name="checkmark-done-outline"
                size={40}
                color="#A8A29E"
                accessible={false}
              />
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-3 text-center">
                {t("loansHub.empty")}
              </Text>
            </View>
          )}

          {incoming.length > 0 && (
            <>
              <SectionHeader label={t("loansHub.sectionIncoming")} />
              <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
                {incoming.map((req, i) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    coverUrl={
                      req.items?.cover_url
                        ? coverUrls.get(req.items.cover_url)
                        : undefined
                    }
                    isLast={i === incoming.length - 1}
                    subtitle={`${req.otherName ?? t("common.unknownUser")} ${t("requests.wantsToBorrow")}`}
                    busy={busyId === req.id}
                    actions={
                      <View className="mt-3">
                        {/* Frist (valgfritt) — settes på lånet ved godkjenning */}
                        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
                          {t("collectionDetail.dueLabel")}
                        </Text>
                        <View className="mb-3">
                          <DueDateChips
                            value={dueKeyById[req.id] ?? "none"}
                            onChange={(key) =>
                              setDueKeyById((prev) => ({ ...prev, [req.id]: key }))
                            }
                            disabled={busyId === req.id}
                          />
                        </View>
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            onPress={() => approveRequest(req.id)}
                            disabled={busyId === req.id}
                            accessibilityRole="button"
                            accessibilityLabel={t("requests.approve")}
                            accessibilityState={{ disabled: busyId === req.id }}
                            className="flex-1 bg-accent dark:bg-accent-dark rounded-xl py-2.5 items-center"
                          >
                            <Text className="text-white font-semibold text-sm">
                              {t("requests.approve")}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => runRequestAction(req.id, "decline_request")}
                            disabled={busyId === req.id}
                            accessibilityRole="button"
                            accessibilityLabel={t("requests.decline")}
                            accessibilityState={{ disabled: busyId === req.id }}
                            className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary rounded-xl py-2.5 items-center"
                          >
                            <Text className="text-content dark:text-content-dark font-semibold text-sm">
                              {t("requests.decline")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    }
                  />
                ))}
              </View>
            </>
          )}

          {outgoing.length > 0 && (
            <>
              <SectionHeader label={t("loansHub.sectionOutgoing")} />
              <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
                {outgoing.map((req, i) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    coverUrl={
                      req.items?.cover_url
                        ? coverUrls.get(req.items.cover_url)
                        : undefined
                    }
                    isLast={i === outgoing.length - 1}
                    subtitle={t("requests.youAskedFor")}
                    busy={busyId === req.id}
                    actions={
                      <TouchableOpacity
                        onPress={() => runRequestAction(req.id, "cancel_request")}
                        disabled={busyId === req.id}
                        accessibilityRole="button"
                        accessibilityLabel={t("requests.cancel")}
                        accessibilityState={{ disabled: busyId === req.id }}
                        className="mt-3 bg-surface-secondary dark:bg-surface-dark-secondary rounded-xl py-2.5 items-center"
                      >
                        <Text className="text-content dark:text-content-dark font-semibold text-sm">
                          {t("requests.cancel")}
                        </Text>
                      </TouchableOpacity>
                    }
                  />
                ))}
              </View>
            </>
          )}

          {borrowedLoans.length > 0 && (
            <>
              <SectionHeader label={t("collections.sectionBorrowingNow")} />
              <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
                {borrowedLoans.map((loan, i) => {
                  const title = loan.items?.title ?? t("common.unknownItem");
                  const reported = !!loan.return_requested_at;
                  return (
                    <LoanRow
                      key={loan.id}
                      title={title}
                      itemType={loan.items?.type as ItemType | undefined}
                      personText={t("loansHub.fromOwner", { name: loan.ownerName })}
                      loanedAt={loan.loaned_at}
                      dueAt={loan.due_at}
                      noteLine={
                        loan.owner_return_requested_at
                          ? `${t("collections.ownerRequestedReturn")}${
                              loan.owner_return_note ? `: ${loan.owner_return_note}` : ""
                            }`
                          : null
                      }
                      badge={
                        reported
                          ? { text: t("collections.returnReported"), accent: true }
                          : null
                      }
                      hideTrailingIcon={reported}
                      busy={busyId === loan.id}
                      onPress={() =>
                        reported ? handleUndoReturn(loan) : handleMarkReturned(loan)
                      }
                      accessibilityLabel={
                        reported
                          ? t("collections.returnReportedA11y", {
                              item: title,
                              name: loan.ownerName,
                            })
                          : t("collections.borrowedA11y", {
                              item: title,
                              name: loan.ownerName,
                              when: loanWhenLabel(loan.loaned_at, loan.due_at),
                            })
                      }
                      accessibilityHint={
                        reported
                          ? t("collections.undoReturn")
                          : t("collections.markReturnedHint")
                      }
                      isLast={i === borrowedLoans.length - 1}
                    />
                  );
                })}
              </View>
            </>
          )}

          {lentLoans.length > 0 && (
            <>
              <SectionHeader label={t("collections.sectionLoanedNow")} />
              <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
                {lentLoans.map((loan, i) => (
                  <LoanRow
                    key={loan.id}
                    title={loan.items?.title ?? t("common.unknownItem")}
                    itemType={loan.items?.type as ItemType | undefined}
                    personText={loan.borrower_name}
                    loanedAt={loan.loaned_at}
                    dueAt={loan.due_at}
                    badge={
                      loan.return_requested_at
                        ? { text: t("collections.returnReported"), accent: true }
                        : loan.owner_return_requested_at
                          ? {
                              text: t("collections.returnRequestedByOwner"),
                              accent: false,
                            }
                          : null
                    }
                    busy={busyId === loan.id}
                    onPress={() => handleLentLoanTap(loan)}
                    accessibilityLabel={t("loans.loanedToA11y", {
                      item: loan.items?.title ?? t("common.unknownItem"),
                      name: loan.borrower_name,
                      when: loanWhenLabel(loan.loaned_at, loan.due_at),
                    })}
                    accessibilityHint={t("collections.loanActionsHint")}
                    isLast={i === lentLoans.length - 1}
                  />
                ))}
              </View>
            </>
          )}

          {/* Lånehistorikk — leverte lån (aktive vises i seksjonene over) */}
          <SectionHeader label={t("loansHub.sectionHistory")} />
          <TouchableOpacity
            onPress={() => navigation.navigate("LoanHistory")}
            accessibilityRole="button"
            accessibilityLabel={t("collections.loanHistory")}
            accessibilityHint={t("collections.loanHistoryHint")}
            className="mb-8 flex-row items-center bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-4"
          >
            <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-4">
              <Ionicons
                name="time-outline"
                size={20}
                color="#1D9E75"
                accessible={false}
              />
            </View>
            <Text className="flex-1 text-content dark:text-content-dark font-medium">
              {t("collections.loanHistory")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={iconColor}
              accessible={false}
            />
          </TouchableOpacity>
        </ScrollView>
      )}

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
    </View>
  );
}
