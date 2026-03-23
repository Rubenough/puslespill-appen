import React from "react";
import { View, Text, ScrollView } from "react-native";
import Header from "../components/Header";
import ActiveSessionCard from "../components/ActiveSessionCard";
import FeedCard from "../components/FeedCard";

// Midlertidige mock-data — erstattes med Supabase-data i Fase 3
const MOCK_SESSIONS = [
  {
    isOwn: true as const,
    puzzleTitle: "Kinkaku-ji — 1000 brikker",
    dayNumber: 3,
    timeLabel: "i går",
  },
  {
    isOwn: false as const,
    userName: "Ole",
    avatarUrl: null,
    puzzleTitle: "Paris om natten — 500 brikker",
    dayNumber: 1,
    timeLabel: "i dag",
  },
];

const MOCK_FEED = [
  {
    type: "loan" as const,
    userName: "Turid Nielsen",
    avatarUrl: null,
    timeLabel: "i går",
    loanedTo: "Petter",
    puzzleTitle: "Paris om natten — 500 brikker",
    puzzleBrand: "Ravensburger",
  },
  {
    type: "completed" as const,
    userName: "Petter Moe",
    avatarUrl: null,
    timeLabel: "3 dager siden",
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
        <View className="pt-2">
          {MOCK_FEED.map((item, i) => (
            <FeedCard key={i} {...item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
