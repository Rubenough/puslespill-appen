import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../navigation/RootNavigator";
import Header from "../components/Header";
import ActiveSessionCard from "../components/ActiveSessionCard";
import FeedCard from "../components/FeedCard";
import i18n from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { type ItemType } from "../utils/collections";
import { getDayNumber, getRelativeDayLabel } from "../utils/date";
import { getSignedUrls } from "../utils/sessionImages";
import {
  fetchReactionsBySession,
  toggleReaction,
  applyToggle,
  type Reaction,
} from "../utils/reactions";

// ─── Typer ───────────────────────────────────────────────────────────────────

type ActiveSession = {
  id: string;
  started_at: string;
  guest_names: string[];
  image_url: string | null;
  created_by: string;
  isOwn: boolean;
  ownerName: string;
  ownerAvatar: string | null;
  item: { id: string; title: string; type: ItemType };
};

// Rå øktrad før eier-berikelse (item-join kommer som objekt).
type ActiveSessionRow = {
  id: string;
  started_at: string;
  guest_names: string[] | null;
  image_url: string | null;
  created_by: string;
  item: { id: string; title: string; type: string } | null;
};

// Felles type for alle feed-hendelser
type FeedItem =
  | {
      id: string;
      type: "started";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      withUsers: string[];
      sessionId: string;
      imageUrl: string | null;
    }
  | {
      id: string;
      type: "completed";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      sessionId: string;
      imageUrl: string | null;
    }
  | {
      id: string;
      type: "added";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      ownerId: string;
      isOwn: boolean;
      imageUrl: string | null;
    }
  | {
      id: string;
      type: "loaned";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      loanedTo?: string;
    }
  | {
      id: string;
      type: "borrowed";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      fromName: string;
    };

// ─── Datahenting ──────────────────────────────────────────────────────────────

// Radformer for de sammenslåtte Supabase-spørringene (item-join kommer som objekt).
type ItemJoin = { title: string; type: string } | null;
type SessionRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  guest_names: string[] | null;
  created_by: string;
  image_url: string | null;
  items: ItemJoin;
};
type ItemRow = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  owner_id: string;
  cover_url: string | null;
};
type LoanRow = {
  id: string;
  borrower_name: string | null;
  loaned_at: string;
  items: ItemJoin;
};
type BorrowRow = {
  id: string;
  owner_id: string;
  responded_at: string | null;
  items: ItemJoin;
};
type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

// Henter siste progresjonsbilde (lagringssti) per økt-ID.
async function latestImagePathsBySession(
  sessionIds: string[],
): Promise<Map<string, string>> {
  const latest = new Map<string, string>();
  if (sessionIds.length === 0) return latest;

  const { data } = await supabase
    .from("session_images")
    .select("session_id, image_url, captured_at")
    .in("session_id", sessionIds)
    .order("captured_at", { ascending: false });

  for (const img of (data ?? []) as { session_id: string; image_url: string }[]) {
    if (!latest.has(img.session_id)) latest.set(img.session_id, img.image_url);
  }
  return latest;
}

// Slår siste progresjonsbilde inn i økt-listen (aktive økter).
async function attachSessionImages<T extends { id: string; image_url: string | null }>(
  sessions: T[],
): Promise<T[]> {
  if (sessions.length === 0) return sessions;
  const latest = await latestImagePathsBySession(sessions.map((s) => s.id));
  return sessions.map((s) => ({
    ...s,
    image_url: latest.get(s.id) ?? s.image_url,
  }));
}

// Henter feed-hendelser fra fire parallelle queries og returnerer dem sortert nyest først.
// Profiler hentes i ett separat kall for å unngå avhengighet av FK-konfigurasjon.
// RLS er venneskopet: sessions/items returnerer kun egne + venners rader — vi
// filtrerer derfor ikke på bruker her. Lån/lånt vises kun for egen aktivitet.
async function fetchFeedItems(userId: string): Promise<FeedItem[]> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsRes, itemsRes, loansRes, borrowedRes] = await Promise.all([
    // Sessions siste 14 dager — item-join fungerer siden sessions.item_id → items.id (FK)
    supabase
      .from("sessions")
      .select(
        "id, started_at, completed_at, guest_names, created_by, image_url, items(title, type)",
      )
      .gt("started_at", twoWeeksAgo)
      .order("started_at", { ascending: false })
      .limit(30),

    // Gjenstander lagt til siste 14 dager
    supabase
      .from("items")
      .select("id, title, type, created_at, owner_id, cover_url")
      .gt("created_at", twoWeeksAgo)
      .order("created_at", { ascending: false })
      .limit(20),

    // Egne offentlige lån — trygt å vise borrower_name siden vi er eieren
    supabase
      .from("loans")
      .select("id, borrower_name, loaned_at, items(title, type)")
      .eq("owner_id", userId)
      .eq("is_public", true)
      .is("returned_at", null)
      .gt("loaned_at", twoWeeksAgo)
      .order("loaned_at", { ascending: false })
      .limit(10),

    // Egen låneaktivitet — godkjente forespørsler der jeg er den som lånte
    supabase
      .from("borrow_requests")
      .select("id, owner_id, responded_at, items(title, type)")
      .eq("requester_id", userId)
      .eq("status", "approved")
      .gt("responded_at", twoWeeksAgo)
      .order("responded_at", { ascending: false })
      .limit(10),
  ]);

  const queryError =
    sessionsRes.error ?? itemsRes.error ?? loansRes.error ?? borrowedRes.error;
  if (queryError) throw queryError;

  const sessionRows = (sessionsRes.data ?? []) as unknown as SessionRow[];
  const itemRows = (itemsRes.data ?? []) as unknown as ItemRow[];
  const loanRows = (loansRes.data ?? []) as unknown as LoanRow[];
  const borrowRows = (borrowedRes.data ?? []) as unknown as BorrowRow[];

  // Samle alle unike bruker-IDer fra sessions, items og lån-fra-eiere; hent profiler i ett kall
  const userIds = new Set<string>([userId]);
  for (const s of sessionRows) userIds.add(s.created_by);
  for (const i of itemRows) userIds.add(i.owner_id);
  for (const b of borrowRows) userIds.add(b.owner_id);

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", [...userIds]);

  const profilesById = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );

  // Signér siste progresjonsbilde (eller øktens omslag) for økt-hendelsene i ett kall.
  const latestImg = await latestImagePathsBySession(sessionRows.map((s) => s.id));
  const imagePathBySession = new Map<string, string>();
  for (const s of sessionRows) {
    const path = latestImg.get(s.id) ?? s.image_url;
    if (path) imagePathBySession.set(s.id, path);
  }
  // Sign økt-bilder + gjenstands-omslag i ett kall (begge i session-images-bucketen).
  const coverPaths = itemRows.map((i) => i.cover_url).filter((c): c is string => !!c);
  const signedByPath = await getSignedUrls([
    ...imagePathBySession.values(),
    ...coverPaths,
  ]);

  const feedItems: FeedItem[] = [];

  // Sessions → "started" eller "completed"
  for (const s of sessionRows) {
    const profile = profilesById.get(s.created_by);
    const path = imagePathBySession.get(s.id);
    const base = {
      userName: profile?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: profile?.avatar_url ?? null,
      itemType: s.items?.type as ItemType,
      itemTitle: s.items?.title ?? "",
      sessionId: s.id,
      imageUrl: path ? (signedByPath.get(path) ?? null) : null,
    };

    if (s.completed_at) {
      feedItems.push({
        id: `completed-${s.id}`,
        type: "completed",
        timestamp: s.completed_at,
        ...base,
      });
    } else {
      feedItems.push({
        id: `started-${s.id}`,
        type: "started",
        timestamp: s.started_at,
        ...base,
        withUsers: s.guest_names ?? [],
      });
    }
  }

  // Items → "added"
  for (const item of itemRows) {
    const profile = profilesById.get(item.owner_id);
    feedItems.push({
      id: `added-${item.id}`,
      type: "added",
      timestamp: item.created_at,
      userName: profile?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: profile?.avatar_url ?? null,
      itemType: item.type as ItemType,
      itemTitle: item.title,
      ownerId: item.owner_id,
      isOwn: item.owner_id === userId,
      imageUrl: item.cover_url ? (signedByPath.get(item.cover_url) ?? null) : null,
    });
  }

  // Lån → "loaned"
  for (const loan of loanRows) {
    const profile = profilesById.get(userId); // egne lån — profilen er brukeren selv
    feedItems.push({
      id: `loaned-${loan.id}`,
      type: "loaned",
      timestamp: loan.loaned_at,
      userName: profile?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: profile?.avatar_url ?? null,
      itemType: loan.items?.type as ItemType,
      itemTitle: loan.items?.title ?? "",
      loanedTo: loan.borrower_name ?? undefined,
    });
  }

  // Godkjente forespørsler → "borrowed" (egen låneaktivitet)
  const self = profilesById.get(userId);
  for (const req of borrowRows) {
    if (!req.responded_at) continue;
    const owner = profilesById.get(req.owner_id);
    feedItems.push({
      id: `borrowed-${req.id}`,
      type: "borrowed",
      timestamp: req.responded_at,
      userName: self?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: self?.avatar_url ?? null,
      itemType: req.items?.type as ItemType,
      itemTitle: req.items?.title ?? "",
      fromName: owner?.full_name ?? i18n.t("common.unknownUser"),
    });
  }

  // Sorter nyeste hendelse øverst
  feedItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return feedItems;
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState(false);
  // Reaksjoner per økt-ID (kun økt-hendelser i feeden har reaksjoner).
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map());

  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);

    // Ingen created_by-filter: RLS venneskoper allerede sessions til egne + venners,
    // så stripen viser både egne og venners aktive økter.
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, started_at, guest_names, image_url, created_by, item:items(id, title, type)",
      )
      .is("completed_at", null)
      .order("started_at", { ascending: false });

    setSessionsError(!!error);
    const rows = (data as unknown as ActiveSessionRow[]) ?? [];
    const withImages = await attachSessionImages(rows);

    // Hent eierprofiler for venners økter i ett kall (id → navn/avatar).
    const ownerIds = [...new Set(withImages.map((s) => s.created_by))];
    const { data: ownerProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ownerIds);
    const ownerById = new Map(
      ((ownerProfiles ?? []) as ProfileRow[]).map((p) => [p.id, p]),
    );

    // Bytt lagringsstier mot signerte URL-er for visning i øktkortene.
    const signed = await getSignedUrls(withImages.map((s) => s.image_url));
    setSessions(
      withImages.map((s) => {
        const owner = ownerById.get(s.created_by);
        return {
          id: s.id,
          started_at: s.started_at,
          guest_names: s.guest_names ?? [],
          image_url: s.image_url ? (signed.get(s.image_url) ?? null) : null,
          created_by: s.created_by,
          isOwn: s.created_by === user.id,
          ownerName: owner?.full_name ?? i18n.t("common.unknownUser"),
          ownerAvatar: owner?.avatar_url ?? null,
          item: {
            id: s.item?.id ?? "",
            title: s.item?.title ?? "",
            type: s.item?.type as ItemType,
          },
        };
      }),
    );
    setLoadingSessions(false);
  }, [user]);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoadingFeed(true);
    try {
      const items = await fetchFeedItems(user.id);
      setFeedItems(items);
      setFeedError(false);

      // Reaksjoner for økt-hendelsene (started/completed bærer en sessionId).
      const sessionIds: string[] = [];
      for (const it of items) {
        if (it.type === "started" || it.type === "completed")
          sessionIds.push(it.sessionId);
      }
      setReactions(await fetchReactionsBySession(sessionIds, user.id));
    } catch {
      setFeedError(true);
    } finally {
      setLoadingFeed(false);
    }
  }, [user]);

  // Optimistisk av/på-reaksjon: oppdater lokalt straks, rull tilbake ved feil.
  const handleReact = useCallback(
    async (sessionId: string, emoji: string) => {
      if (!user) return;
      const currentList = reactions.get(sessionId) ?? [];
      const mine = currentList.find((r) => r.emoji === emoji)?.mine ?? false;
      const snapshot = reactions; // for tilbakerulling ved feil

      // Funksjonell oppdatering: bygg alltid på nyeste tilstand, så samtidige trykk
      // (ulike emoji/økter) ikke overskriver hverandre før neste render.
      setReactions((prev) => {
        const next = new Map(prev);
        next.set(sessionId, applyToggle(prev.get(sessionId) ?? [], emoji, mine));
        return next;
      });

      try {
        await toggleReaction(sessionId, emoji, user.id, mine);
      } catch {
        setReactions(snapshot); // rull tilbake til forrige tilstand
        Alert.alert(t("common.somethingWrong"), t("feed.reactionError"));
      }
    },
    [reactions, user, t],
  );

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
      fetchFeed();
    }, [fetchSessions, fetchFeed]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSessions(), fetchFeed()]);
    setRefreshing(false);
  }, [fetchSessions, fetchFeed]);

  // Hvor et feed-kort navigerer: økt-hendelser → økt-detaljer; "lagt til" → eierens
  // samling (egen samling for eget kort, ellers venns samling). Lån vises uten trykk.
  function feedItemPress(item: FeedItem): (() => void) | undefined {
    switch (item.type) {
      case "started":
      case "completed":
        return () => navigation.navigate("SessionDetail", { sessionId: item.sessionId });
      case "added":
        return item.isOwn
          ? () =>
              navigation.navigate("Tabs", {
                screen: "Samlinger",
                params: { screen: "CollectionDetail", params: { type: item.itemType } },
              })
          : () =>
              navigation.navigate("FriendCollection", {
                friendId: item.ownerId,
                friendName: item.userName,
                avatarUrl: item.avatarUrl,
              });
      default:
        return undefined;
    }
  }

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1D9E75"
            colors={["#1D9E75"]}
          />
        }
      >
        {/* Aktive økter */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3"
        >
          {t("feed.activeSessions")}
        </Text>
        {loadingSessions ? (
          <ActivityIndicator
            color="#1D9E75"
            style={{ marginVertical: 24, marginLeft: 16 }}
          />
        ) : sessionsError ? (
          <SectionError onRetry={fetchSessions} />
        ) : sessions.length === 0 ? (
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4 pb-4">
            {t("feed.noActiveSessions")}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          >
            {sessions.map((s) => {
              const shared = {
                puzzleTitle: s.item.title,
                dayNumber: getDayNumber(s.started_at),
                timeLabel: getRelativeDayLabel(s.started_at),
                imageUrl: s.image_url,
                onPress: () => navigation.navigate("SessionDetail", { sessionId: s.id }),
              };
              return s.isOwn ? (
                <ActiveSessionCard key={s.id} isOwn {...shared} />
              ) : (
                <ActiveSessionCard
                  key={s.id}
                  isOwn={false}
                  userName={s.ownerName}
                  avatarUrl={s.ownerAvatar}
                  {...shared}
                />
              );
            })}
          </ScrollView>
        )}

        {/* Feed */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3"
        >
          {t("feed.feed")}
        </Text>
        {loadingFeed ? (
          <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
        ) : feedError ? (
          <SectionError onRetry={fetchFeed} />
        ) : feedItems.length === 0 ? (
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4 pb-4">
            {t("feed.noActivity")}
          </Text>
        ) : (
          <View className="pt-2 pb-4">
            {feedItems.map((item) => (
              <FeedCard
                key={item.id}
                type={item.type}
                userName={item.userName}
                avatarUrl={item.avatarUrl}
                timeLabel={getRelativeDayLabel(item.timestamp)}
                itemType={item.itemType}
                itemTitle={item.itemTitle}
                onPress={feedItemPress(item)}
                {...(item.type === "started" ||
                item.type === "completed" ||
                item.type === "added"
                  ? { imageUrl: item.imageUrl }
                  : {})}
                {...(item.type === "started" || item.type === "completed"
                  ? {
                      reactions: reactions.get(item.sessionId),
                      onReact: (emoji: string) => handleReact(item.sessionId, emoji),
                    }
                  : {})}
                {...(item.type === "started" ? { withUsers: item.withUsers } : {})}
                {...(item.type === "loaned" ? { loanedTo: item.loanedTo } : {})}
                {...(item.type === "borrowed" ? { fromName: item.fromName } : {})}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="mx-4 mb-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
      <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
        {t("feed.loadError")}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t("common.retry")}
        className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
      >
        <Text className="text-white font-semibold text-sm">{t("common.retry")}</Text>
      </TouchableOpacity>
    </View>
  );
}
