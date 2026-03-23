import React from "react";
import { View, Text, ScrollView } from "react-native";
import Header from "../components/Header";
import ActiveSessionCard from "../components/ActiveSessionCard";
import FeedCard from "../components/FeedCard";

export default function FeedScreen() {
  const activeSessions = []; // senere kommer dette fra Supabase

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      <Header />
      <ScrollView>
        {/* Aktive økter */}
        <Text className="text-content dark:text-content-dark">
          Aktive økter
        </Text>

        {/* Preview av sessionCard, fjern senere */}
        {activeSessions.length === 0 ? (
          <ActiveSessionCard isOwn={true} />
        ) : (
          activeSessions.map((session) => (
            <ActiveSessionCard key={session.id} />
          ))
        )}

        {/* Sjekk om det finnes aktive økter */}
        {activeSessions.length === 0 ? (
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4 py-2">
            Ingen aktive økter
          </Text>
        ) : (
          activeSessions.map((session) => (
            <ActiveSessionCard key={session.id} />
          ))
        )}

        {/* Feed */}
        <FeedCard />
      </ScrollView>
    </View>
  );
}
