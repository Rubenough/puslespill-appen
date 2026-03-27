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

type ActiveSession = {
  id: string;
  started_at: string;
  guest_names: string[];
  image_url: string | null;
  item: { id: string; title: string; type: ItemType };
};

function getDayNumber(createdAt: string): number {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function getTimeLabel(createdAt: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "i dag";
  if (diffDays === 1) return "i går";
  return `${diffDays} dager siden`;
}

// MOCK_FEED — erstattes med Supabase-data i Fase 4
const MOCK_FEED = [
  {
    id: "feed-1",
    type: "started" as const,
    userName: "Ole Moen",
    avatarUrl: null,
    timeLabel: "i dag",
    itemType: "puslespill" as const,
    itemTitle: "Paris om natten — 500 brikker",
  },
  {
    id: "feed-2",
    type: "added" as const,
    userName: "Turid Nielsen",
    avatarUrl: null,
    timeLabel: "i dag",
    itemType: "brettspill" as const,
    itemTitle: "Wingspan",
  },
  {
    id: "feed-3",
    type: "completed" as const,
    userName: "Turid Nielsen",
    avatarUrl: null,
    timeLabel: "i dag",
    itemType: "puslespill" as const,
    itemTitle: "Blomstereng — 1000 brikker",
  },
  {
    id: "feed-4",
    type: "started" as const,
    userName: "Petter Moe",
    avatarUrl: null,
    timeLabel: "i går",
    itemType: "puslespill" as const,
    itemTitle: "Kinkaku-ji — 1000 brikker",
  },
  {
    id: "feed-5",
    type: "loaned" as const,
    userName: "Lars Berg",
    avatarUrl: null,
    timeLabel: "3 dager siden",
    itemType: "brettspill" as const,
    itemTitle: "Catan",
    loanedTo: "Kari",
  },
];

export default function FeedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

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

    // Hent siste progresjonsbilde per økt fra session_images
    if (rows.length > 0) {
      const ids = rows.map((s) => s.id);
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
      setSessions(rows.map((s) => ({ ...s, image_url: latestBySession.get(s.id) ?? s.image_url })));
    } else {
      setSessions(rows);
    }

    setLoadingSessions(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions]),
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
          <ActivityIndicator
            color="#1D9E75"
            style={{ marginVertical: 24, marginLeft: 16 }}
          />
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
        <View className="pt-2">
          {MOCK_FEED.map((item) => (
            <FeedCard key={item.id} {...item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
