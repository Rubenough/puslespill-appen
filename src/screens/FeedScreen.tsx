import React from "react";
import { View, Text, ScrollView } from "react-native";
import Header from "../components/Header";
import ActiveSessionCard from "../components/ActiveSessionCard";
import FeedCard from "../components/FeedCard";

// Midlertidige mock-data — erstattes med Supabase-data i Fase 3

// Aktive økter: kun egne + økter man er invitert inn i av andre.
// Vennenes egne separate økter vises i Feed, ikke her.
const MOCK_SESSIONS = [
  {
    isOwn: true as const,
    puzzleTitle: "Kinkaku-ji — 1000 brikker",
    dayNumber: 3,
    timeLabel: "i går",
  },
  {
    isOwn: false as const,
    userName: "Turid",
    avatarUrl: null,
    puzzleTitle: "Wingspan",
    dayNumber: 1,
    timeLabel: "i dag",
  },
];

const MOCK_FEED = [
  {
    type: "started" as const,
    userName: "Ole Moen",
    avatarUrl: null,
    timeLabel: "i dag",
    itemType: "puslespill" as const,
    itemTitle: "Paris om natten — 500 brikker",
  },
  {
    type: "added" as const,
    userName: "Ole Moen",
    avatarUrl: null,
    timeLabel: "i dag",
    itemType: "bok" as const,
    itemTitle: "Sapiens",
  },
  {
    type: "completed" as const,
    userName: "Turid Nielsen",
    avatarUrl: null,
    timeLabel: "i dag",
    itemType: "brettspill" as const,
    itemTitle: "Wingspan",
  },
  {
    type: "started" as const,
    userName: "Petter Moe",
    avatarUrl: null,
    timeLabel: "i går",
    itemType: "puslespill" as const,
    itemTitle: "Kinkaku-ji — 1000 brikker",
  },
  {
    type: "added" as const,
    userName: "Maria Dahl",
    avatarUrl: null,
    timeLabel: "2 dager siden",
    itemType: "film" as const,
    itemTitle: "Inception",
  },
  {
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
  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Aktive økter */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3">
          AKTIVE ØKTER
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        >
          {MOCK_SESSIONS.map((session, i) => (
            <ActiveSessionCard key={i} {...session} />
          ))}
        </ScrollView>

        {/* Feed */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pt-5 pb-3">
          FEED
        </Text>
        <View className="pt-2">
          {MOCK_FEED.map((item, i) => (
            <FeedCard key={i} {...item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
