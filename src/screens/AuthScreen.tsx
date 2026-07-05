import React, { useState } from "react";
import { Alert, View, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { parseOAuthRedirect } from "../utils/auth";
import GoogleSignInButton from "../components/GoogleSignInButton";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const redirectUri = makeRedirectUri({
    scheme: "puslespill",
    path: "auth/callback",
  });

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (signInError || !data.url) {
        Alert.alert(
          t("auth.signInFailed"),
          signInError?.message ?? t("auth.startFailed"),
        );
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === "cancel") {
        // Brukeren lukket nettleseren selv — ikke vis feil
        return;
      }

      if (result.type !== "success" || !result.url) {
        Alert.alert(t("auth.signInFailed"), t("auth.noResponse"));
        return;
      }

      const tokens = parseOAuthRedirect(result.url);

      if (!tokens) {
        Alert.alert(t("auth.signInFailed"), t("auth.invalidResponse"));
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession(tokens);

      if (sessionError) {
        Alert.alert(t("auth.signInFailed"), t("auth.sessionFailed"));
      }
    } catch (err) {
      console.error("OAuth-feil:", err);
      Alert.alert(t("auth.unexpectedError"), t("auth.unexpectedErrorBody"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark px-8">
      <Text className="text-3xl font-medium text-content dark:text-content-dark mb-2">
        {t("auth.title")}
      </Text>
      <Text className="text-sm text-content-secondary dark:text-content-secondary-dark mb-12">
        {t("auth.tagline")}
      </Text>

      <GoogleSignInButton onPress={signInWithGoogle} loading={loading} />
    </View>
  );
}
