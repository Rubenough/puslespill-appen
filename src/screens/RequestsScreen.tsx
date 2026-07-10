import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_ICONS, type ItemType } from "../utils/collections";
import { itemTypeLabel } from "../utils/collectionLabels";
import { DUE_OPTIONS, dueAtFromKey } from "../utils/loans";
import { RootStackParamList } from "../navigation/RootNavigator";
import UserAvatar from "../components/UserAvatar";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type RequestRow = {
  id: string;
  item_id: string;
  owner_id: string;
  requester_id: string;
  message: string | null;
  status: string;
  created_at: string;
  items: { title: string; type: string } | null;
};

type EnrichedRequest = RequestRow & {
  otherName: string | null;
  otherAvatar: string | null;
};

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [incoming, setIncoming] = useState<EnrichedRequest[]>([]);
  const [outgoing, setOutgoing] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  // Valgt frist per innkommende forespørsel (nøkkel fra DUE_OPTIONS); standard "none".
  const [dueKeyById, setDueKeyById] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(
        "id, item_id, owner_id, requester_id, message, status, created_at, items(title, type)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(true);
      setLoading(false);
      return;
    }

    const rows: RequestRow[] = data ?? [];
    // Motparten: for innkommende er det den som spør, for utgående er det eieren.
    const otherIds = new Set<string>();
    for (const r of rows) {
      otherIds.add(r.owner_id === user.id ? r.requester_id : r.owner_id);
    }

    let profilesById = new Map<
      string,
      { full_name: string | null; avatar_url: string | null }
    >();
    if (otherIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", [...otherIds]);
      profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
    }

    const enrich = (r: RequestRow, otherId: string): EnrichedRequest => {
      const profile = profilesById.get(otherId);
      return {
        ...r,
        otherName: profile?.full_name ?? null,
        otherAvatar: profile?.avatar_url ?? null,
      };
    };

    setIncoming(
      rows.filter((r) => r.owner_id === user.id).map((r) => enrich(r, r.requester_id)),
    );
    setOutgoing(
      rows.filter((r) => r.requester_id === user.id).map((r) => enrich(r, r.owner_id)),
    );
    setFetchError(false);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  function afterAction(error: { message: string } | null) {
    setActioningId(null);
    if (error) {
      Alert.alert(t("common.somethingWrong"), error.message);
      return;
    }
    fetchData();
  }

  async function runAction(id: string, rpc: "decline_request" | "cancel_request") {
    setActioningId(id);
    const { error } = await supabase.rpc(rpc, { p_request_id: id });
    afterAction(error);
  }

  // Godkjenn oppretter lånet; send med valgt frist (eller null) → loans.due_at.
  async function approveRequest(id: string) {
    setActioningId(id);
    const { error } = await supabase.rpc("approve_request", {
      p_request_id: id,
      // Generert type er `p_due_at?: string` (ikke null) → utelat i stedet for å sende null.
      p_due_at: dueAtFromKey(dueKeyById[id] ?? "none") ?? undefined,
    });
    afterAction(error);
  }

  const hasNone = incoming.length === 0 && outgoing.length === 0;

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
        <Text className="text-content dark:text-content-dark text-lg font-semibold flex-1">
          {t("requests.title")}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D9E75" />
        </View>
      ) : fetchError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-content dark:text-content-dark text-center mb-4">
            {t("requests.loadError")}
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
      ) : hasNone ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name="checkmark-done-outline"
            size={40}
            color="#A8A29E"
            accessible={false}
          />
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-3">
            {t("requests.empty")}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
        >
          {incoming.length > 0 && (
            <>
              <Text
                accessibilityRole="header"
                className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
              >
                {t("requests.incoming")}
              </Text>
              <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-8">
                {incoming.map((req, i) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    isLast={i === incoming.length - 1}
                    subtitle={`${req.otherName ?? t("common.unknownUser")} ${t("requests.wantsToBorrow")}`}
                    busy={actioningId === req.id}
                    actions={
                      <View className="mt-3">
                        {/* Frist (valgfritt) — settes på lånet ved godkjenning */}
                        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2">
                          {t("collectionDetail.dueLabel")}
                        </Text>
                        <View className="flex-row flex-wrap gap-2 mb-3">
                          {DUE_OPTIONS.map((opt) => {
                            const selected = (dueKeyById[req.id] ?? "none") === opt.key;
                            return (
                              <TouchableOpacity
                                key={opt.key}
                                onPress={() =>
                                  setDueKeyById((prev) => ({
                                    ...prev,
                                    [req.id]: opt.key,
                                  }))
                                }
                                disabled={actioningId === req.id}
                                accessibilityRole="button"
                                accessibilityLabel={t(opt.labelKey)}
                                accessibilityState={{ selected }}
                                className={`px-3 py-1.5 rounded-full border ${
                                  selected
                                    ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                                    : "bg-surface-secondary dark:bg-surface-dark-secondary border-border dark:border-border-dark"
                                }`}
                              >
                                <Text
                                  className={`text-xs font-medium ${
                                    selected
                                      ? "text-white"
                                      : "text-content dark:text-content-dark"
                                  }`}
                                >
                                  {t(opt.labelKey)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            onPress={() => approveRequest(req.id)}
                            disabled={actioningId === req.id}
                            accessibilityRole="button"
                            accessibilityLabel={t("requests.approve")}
                            className="flex-1 bg-accent dark:bg-accent-dark rounded-xl py-2.5 items-center"
                          >
                            <Text className="text-white font-semibold text-sm">
                              {t("requests.approve")}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => runAction(req.id, "decline_request")}
                            disabled={actioningId === req.id}
                            accessibilityRole="button"
                            accessibilityLabel={t("requests.decline")}
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
              <Text
                accessibilityRole="header"
                className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
              >
                {t("requests.outgoing")}
              </Text>
              <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                {outgoing.map((req, i) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    isLast={i === outgoing.length - 1}
                    subtitle={t("requests.youAskedFor")}
                    busy={actioningId === req.id}
                    actions={
                      <TouchableOpacity
                        onPress={() => runAction(req.id, "cancel_request")}
                        disabled={actioningId === req.id}
                        accessibilityRole="button"
                        accessibilityLabel={t("requests.cancel")}
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
        </ScrollView>
      )}
    </View>
  );
}

type RequestCardProps = {
  req: EnrichedRequest;
  isLast: boolean;
  subtitle: string;
  busy: boolean;
  actions: React.ReactNode;
};

function RequestCard({ req, isLast, subtitle, busy, actions }: RequestCardProps) {
  const itemType = req.items?.type as ItemType | undefined;
  return (
    <View
      className={`px-4 py-4 ${
        !isLast ? "border-b border-border dark:border-border-dark" : ""
      }`}
    >
      <View className="flex-row items-center">
        <UserAvatar name={req.otherName} avatarUrl={req.otherAvatar} size={40} />
        <View className="flex-1 ml-3">
          <Text className="text-content dark:text-content-dark font-medium">
            {req.items?.title ?? ""}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {itemType && (
              <Ionicons
                name={ITEM_ICONS[itemType]}
                size={12}
                color="#A8A29E"
                accessible={false}
              />
            )}
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
              {[itemType ? itemTypeLabel(itemType) : null, subtitle]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>
        {busy && <ActivityIndicator size="small" color="#1D9E75" />}
      </View>

      {req.message ? (
        <Text className="text-content dark:text-content-dark text-sm mt-2 italic">
          “{req.message}”
        </Text>
      ) : null}

      {actions}
    </View>
  );
}
