import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import Header from "../components/Header";
import ActiveSessionCard from "../components/ActiveSessionCard";
import FeedCard from "../components/FeedCard";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { type ItemType } from "../utils/collections";

// ─── Typer ───────────────────────────────────────────────────────────────────

type ActiveSession = {
  id: string;
  started_at: string;
  guest_names: string[];
  image_url: string | null;
  item: { id: string; title: string; type: ItemType };
};

// Felles type for alle feed-hendelser
type FeedItem =
  | { id: string; type: "started"; timestamp: string; userName: string; avatarUrl: string | null; itemType: ItemType; itemTitle: string; withUsers: string[] }
  | { id: string; type: "completed"; timestamp: string; userName: string; avatarUrl: string | null; itemType: ItemType; itemTitle: string }
  | { id: string; type: "added"; timestamp: string; userName: string; avatarUrl: string | null; itemType: ItemType; itemTitle: string }
  | { id: string; type: "loaned"; timestamp: string; userName: string; avatarUrl: string | null; itemType: ItemType; itemTitle: string; loanedTo?: string };

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────────

function getDayNumber(createdAt: string): number {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function getTimeLabel(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "i dag";
  if (diffDays === 1) return "i går";
  return `${diffDays} dager siden`;
}

// ─── Datahenting ──────────────────────────────────────────────────────────────

// Henter siste progresjonsbilde per økt og slår det inn i økt-listen
async function attachSessionImages(sessions: ActiveSession[]): Promise<ActiveSession[]> {
  if (sessions.length === 0) return sessions;

  const ids = sessions.map((s) => s.id);
  const { data: imgData } = await supabase
    .from("session_images")
    .select("session_id, image_url, captured_at")
    .in("session_id", ids)
    .order("captured_at", { ascending: false });

  const latestBySession = new Map<string, string>();
  for (const img of (imgData ?? []) as { session_id: string; image_url: string }[]) {
    if (!latestBySession.has(img.session_id)) {
      latestBySession.set(img.session_id, img.image_url);
    }
  }
  return sessions.map((s) => ({ ...s, image_url: latestBySession.get(s.id) ?? s.image_url }));
}

// Henter feed-hendelser fra tre parallelle queries og returnerer dem sortert nyest først.
// Profiler hentes i ett separat kall for å unngå avhengighet av FK-konfigurasjon.
// Fase 5: sessions og items vises fra alle brukere når RLS-policyene er åpnet.
// Lån vises kun for egne (owner_id = userId) — RLS blokkerer andres.
async function fetchFeedItems(userId: string): Promise<FeedItem[]> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsRes, itemsRes, loansRes] = await Promise.all([
    // Sessions siste 14 dager — item-join fungerer siden sessions.item_id → items.id (FK)
    supabase
      .from("sessions")
      .select("id, started_at, completed_at, guest_names, created_by, items(title, type)")
      .gt("started_at", twoWeeksAgo)
      .order("started_at", { ascending: false })
      .limit(30),

    // Gjenstander lagt til siste 14 dager
    supabase
      .from("items")
      .select("id, title, type, created_at, owner_id")
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
  ]);

  // Samle alle unike bruker-IDer fra sessions og items, hent profiler i ett kall
  const userIds = new Set<string>([userId]);
  for (const s of (sessionsRes.data ?? []) as any[]) userIds.add(s.created_by);
  for (const i of (itemsRes.data ?? []) as any[]) userIds.add(i.owner_id);

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", [...userIds]);

  const profilesById = new Map((profilesData ?? []).map((p: any) => [p.id, p]));

  const feedItems: FeedItem[] = [];

  // Sessions → "started" eller "completed"
  for (const s of (sessionsRes.data ?? []) as any[]) {
    const profile = profilesById.get(s.created_by);
    const base = {
      userName: profile?.full_name ?? "Ukjent",
      avatarUrl: profile?.avatar_url ?? null,
      itemType: s.items?.type as ItemType,
      itemTitle: s.items?.title ?? "",
    };

    if (s.completed_at) {
      feedItems.push({ id: `completed-${s.id}`, type: "completed", timestamp: s.completed_at, ...base });
    } else {
      feedItems.push({ id: `started-${s.id}`, type: "started", timestamp: s.started_at, ...base, withUsers: s.guest_names ?? [] });
    }
  }

  // Items → "added"
  for (const item of (itemsRes.data ?? []) as any[]) {
    const profile = profilesById.get(item.owner_id);
    feedItems.push({
      id: `added-${item.id}`,
      type: "added",
      timestamp: item.created_at,
      userName: profile?.full_name ?? "Ukjent",
      avatarUrl: profile?.avatar_url ?? null,
      itemType: item.type as ItemType,
      itemTitle: item.title,
    });
  }

  // Lån → "loaned"
  for (const loan of (loansRes.data ?? []) as any[]) {
    const profile = profilesById.get(userId); // egne lån — profilen er brukeren selv
    feedItems.push({
      id: `loaned-${loan.id}`,
      type: "loaned",
      timestamp: loan.loaned_at,
      userName: profile?.full_name ?? "Ukjent",
      avatarUrl: profile?.avatar_url ?? null,
      itemType: loan.items?.type as ItemType,
      itemTitle: loan.items?.title ?? "",
      loanedTo: loan.borrower_name,
    });
  }

  // Sorter nyeste hendelse øverst
  feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return feedItems;
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);

    const { data } = await supabase
      .from("sessions")
      .select("id, started_at, guest_names, image_url, item:items(id, title, type)")
      .eq("created_by", user.id)
      .is("completed_at", null)
      .order("started_at", { ascending: false });

    const rows = (data as unknown as ActiveSession[]) ?? [];
    setSessions(await attachSessionImages(rows));
    setLoadingSessions(false);
  }, [user]);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoadingFeed(true);
    setFeedItems(await fetchFeedItems(user.id));
    setLoadingFeed(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
      fetchFeed();
    }, [fetchSessions, fetchFeed])
  );

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Aktive økter */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3"
        >
          AKTIVE ØKTER
        </Text>
        {loadingSessions ? (
          <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24, marginLeft: 16 }} />
        ) : sessions.length === 0 ? (
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4 pb-4">
            Ingen aktive økter
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          >
            {sessions.map((s) => (
              <ActiveSessionCard
                key={s.id}
                isOwn
                puzzleTitle={s.item.title}
                dayNumber={getDayNumber(s.started_at)}
                timeLabel={getTimeLabel(s.started_at)}
                imageUrl={s.image_url}
                onPress={() => navigation.navigate("SessionDetail", { sessionId: s.id })}
              />
            ))}
          </ScrollView>
        )}

        {/* Feed */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3"
        >
          FEED
        </Text>
        {loadingFeed ? (
          <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
        ) : feedItems.length === 0 ? (
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4 pb-4">
            Ingen aktivitet de siste 14 dagene
          </Text>
        ) : (
          <View className="pt-2 pb-4">
            {feedItems.map((item) => (
              <FeedCard
                key={item.id}
                type={item.type}
                userName={item.userName}
                avatarUrl={item.avatarUrl}
                timeLabel={getTimeLabel(item.timestamp)}
                itemType={item.itemType}
                itemTitle={item.itemTitle}
                {...(item.type === "started" ? { withUsers: item.withUsers } : {})}
                {...(item.type === "loaned" ? { loanedTo: item.loanedTo } : {})}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
