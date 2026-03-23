import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);

  const redirectUri = "exp://172.26.124.122:8081";

  async function signInWithGoogle() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      setLoading(false);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type === "success") {
      const hash = result.url.split("#")[1];
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }

    setLoading(false);
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark px-8">
      <Text className="text-3xl font-medium text-content dark:text-content-dark mb-2">
        Puslespill
      </Text>
      <Text className="text-sm text-content-secondary dark:text-content-secondary-dark mb-12">
        For deg som pusler med venner
      </Text>

      <TouchableOpacity
        onPress={signInWithGoogle}
        disabled={loading}
        className="w-full bg-accent dark:bg-accent-dark rounded-xl py-4 items-center"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-medium text-base">
            Logg inn med Google
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
