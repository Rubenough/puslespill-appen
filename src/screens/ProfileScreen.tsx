import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";

export default function ProfileScreen() {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary px-6 pt-12">
      <Text className="text-content dark:text-content-dark text-2xl font-medium mb-8">
        Profil
      </Text>

      <TouchableOpacity
        onPress={signOut}
        className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl py-4 items-center"
      >
        <Text className="text-content dark:text-content-dark font-medium">
          Logg ut
        </Text>
      </TouchableOpacity>
    </View>
  );
}
