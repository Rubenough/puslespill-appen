import React, { useState } from "react";
import { Alert, View, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "../lib/supabase";
import GoogleSignInButton from "../components/GoogleSignInButton";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
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
          "Innlogging feilet",
          signInError?.message ??
            "Kunne ikke starte Google-innlogging. Sjekk nettverkstilkoblingen.",
        );
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
      );

      if (result.type === "cancel") {
        // Brukeren lukket nettleseren selv — ikke vis feil
        return;
      }

      if (result.type !== "success" || !result.url) {
        Alert.alert(
          "Innlogging feilet",
          "Ingen gyldig respons fra nettleseren. Prøv igjen.",
        );
        return;
      }

      const params = new URLSearchParams(result.url.split("#")[1]);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        Alert.alert(
          "Innlogging feilet",
          "Ugyldig innloggingsrespons. Prøv igjen.",
        );
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        Alert.alert(
          "Innlogging feilet",
          "Kunne ikke opprette sesjon. Prøv igjen.",
        );
      }
    } catch (err) {
      console.error("OAuth-feil:", err);
      Alert.alert("Uventet feil", "Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark px-8">
      <Text className="text-3xl font-medium text-content dark:text-content-dark mb-2">
        Puslespill
      </Text>
      <Text className="text-sm text-content-secondary dark:text-content-secondary-dark mb-12">
        For deg som pusler med venner
      </Text>

      <GoogleSignInButton onPress={signInWithGoogle} loading={loading} />
    </View>
  );
}
