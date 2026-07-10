import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import * as Application from "expo-application";
import { supabase } from "../lib/supabase";
import { setLanguage, SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useTheme, THEME_OPTIONS } from "../context/ThemeContext";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { preference, setPreference } = useTheme();
  // App-styrt fargeskjema (ikke OS) — brukes til den imperative chevron-fargen.
  const { colorScheme } = useColorScheme();

  // content-secondary (#78716C) feiler kontrast på mørk flate; bruk content-dark-secondary der.
  const chevronColor = colorScheme === "dark" ? "#A8A29E" : "#78716C";

  const version = Application.nativeApplicationVersion ?? "1.0.0";
  const build = Application.nativeBuildVersion;
  const versionLabel = build ? `${version} (${build})` : version;

  const [deletingAccount, setDeletingAccount] = useState(false);

  function confirmSignOut() {
    Alert.alert(t("settings.signOutConfirmTitle"), t("settings.signOutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        style: "destructive",
        onPress: () => {
          supabase.auth.signOut();
        },
      },
    ]);
  }

  // Kontosletting (App Store 5.1.1(v) / Play data-deletion): dobbel bekreftelse,
  // deretter delete_account-Edge Function (service role) + lokal utlogging.
  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete_account", {
        method: "POST",
      });
      if (error) throw error;
      // Auth-brukeren finnes ikke lenger — rydd den lokale økten (server-kallet kan feile).
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    } catch {
      Alert.alert(t("common.somethingWrong"), t("settings.deleteAccountError"));
    } finally {
      setDeletingAccount(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      t("settings.deleteAccountConfirmTitle"),
      t("settings.deleteAccountConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.deleteAccount"),
          style: "destructive",
          onPress: () =>
            Alert.alert(
              t("settings.deleteAccountConfirmSecondTitle"),
              t("settings.deleteAccountConfirmSecondMessage"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("settings.deleteAccountConfirmAction"),
                  style: "destructive",
                  onPress: () => deleteAccount(),
                },
              ],
            ),
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-4 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          className="mr-3"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={chevronColor}
            accessible={false}
          />
        </TouchableOpacity>
        <Text className="text-content dark:text-content-dark text-lg font-semibold flex-1">
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
      >
        {/* Utseende (tema) */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
        >
          {t("theme.title")}
        </Text>
        <View className="flex-row gap-3 mb-8">
          {THEME_OPTIONS.map((option) => {
            const isSelected = preference === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => setPreference(option)}
                accessibilityRole="button"
                accessibilityLabel={t(`theme.${option}`)}
                accessibilityState={{ selected: isSelected }}
                className={`flex-1 py-3 rounded-2xl border items-center ${
                  isSelected
                    ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                    : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelected ? "text-white" : "text-content dark:text-content-dark"
                  }`}
                >
                  {t(`theme.${option}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Språk */}
        <Text
          accessibilityRole="header"
          className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
        >
          {t("settings.language")}
        </Text>
        <View className="flex-row gap-3 mb-8">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = i18n.language === lang;
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => setLanguage(lang)}
                accessibilityRole="button"
                accessibilityLabel={t(`language.${lang}`)}
                accessibilityState={{ selected: isSelected }}
                className={`flex-1 py-3 rounded-2xl border items-center ${
                  isSelected
                    ? "bg-accent dark:bg-accent-dark border-accent dark:border-accent-dark"
                    : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelected ? "text-white" : "text-content dark:text-content-dark"
                  }`}
                >
                  {t(`language.${lang}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logg ut (destruktiv) */}
        <TouchableOpacity
          onPress={confirmSignOut}
          accessibilityRole="button"
          accessibilityLabel={t("profile.signOut")}
          className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl py-4 items-center"
        >
          <Text className="text-red-500 font-medium">{t("profile.signOut")}</Text>
        </TouchableOpacity>

        {/* Slett konto (permanent) */}
        <TouchableOpacity
          onPress={confirmDeleteAccount}
          disabled={deletingAccount}
          accessibilityRole="button"
          accessibilityLabel={t("settings.deleteAccount")}
          accessibilityHint={t("settings.deleteAccountHint")}
          accessibilityState={{ disabled: deletingAccount }}
          className="w-full bg-surface dark:bg-surface-dark border border-red-200 dark:border-red-900 rounded-xl py-4 items-center mt-3"
        >
          {deletingAccount ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Text className="text-red-500 font-medium">
              {t("settings.deleteAccount")}
            </Text>
          )}
        </TouchableOpacity>

        {/* Versjonsfot */}
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs text-center mt-6">
          {t("settings.version", { version: versionLabel })}
        </Text>
      </ScrollView>
    </View>
  );
}
