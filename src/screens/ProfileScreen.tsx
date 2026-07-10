import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useProfil } from "../context/ProfilContext";
import UserAvatar from "../components/UserAvatar";
import ProfileEditSheet from "../components/ProfileEditSheet";
import { type ItemType, ITEM_ICONS } from "../utils/collections";
import { getRelativeDayOrWeekLabel } from "../utils/date";
import { getSignedUrls } from "../utils/sessionImages";
import { RootStackParamList } from "../navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type PastSession = {
  id: string;
  completed_at: string;
  progress_pct: number | null;
  itemTitle: string;
  itemType: ItemType | undefined;
  thumbUrl: string | null;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const { profil } = useProfil();

  // content-secondary (#78716C) feiler kontrast på mørk flate; bruk content-dark-secondary der.
  const gearColor = colorScheme === "dark" ? "#A8A29E" : "#78716C";
  const accentColor = colorScheme === "dark" ? "#34D399" : "#1D9E75";

  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);

    // Fullførte økter jeg eier — Profil er den varige historikken (feeden er 14 dager).
    const { data, error } = await supabase
      .from("sessions")
      .select("id, completed_at, progress_pct, items(title, type)")
      .eq("created_by", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(20);

    if (error) {
      setSessionsError(true);
      setLoadingSessions(false);
      return;
    }

    type Row = {
      id: string;
      completed_at: string;
      progress_pct: number | null;
      items: { title: string; type: string } | null;
    };
    const rows = (data as unknown as Row[]) ?? [];

    // Hent siste progresjonsbilde per økt som thumbnail, og signér i én batch.
    const ids = rows.map((r) => r.id);
    const latest = new Map<string, string>();
    if (ids.length > 0) {
      const { data: imgs } = await supabase
        .from("session_images")
        .select("session_id, image_url, captured_at")
        .in("session_id", ids)
        .order("captured_at", { ascending: false });
      for (const im of (imgs ?? []) as { session_id: string; image_url: string }[]) {
        if (!latest.has(im.session_id)) latest.set(im.session_id, im.image_url);
      }
    }
    const signed = await getSignedUrls([...latest.values()]);

    setSessionsError(false);
    setSessions(
      rows.map((r) => {
        const path = latest.get(r.id);
        return {
          id: r.id,
          completed_at: r.completed_at,
          progress_pct: r.progress_pct,
          itemTitle: r.items?.title ?? t("common.unknownItem"),
          itemType: r.items?.type as ItemType | undefined,
          thumbUrl: path ? (signed.get(path) ?? null) : null,
        };
      }),
    );
    setLoadingSessions(false);
  }, [user, t]);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions]),
  );

  const fallbackName = t("common.unknownUser");

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
    >
      <View className="px-4">
        {/* Topprad: tannhjul til innstillinger */}
        <View className="flex-row justify-end mb-2">
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            accessibilityRole="button"
            accessibilityLabel={t("settings.title")}
            hitSlop={8}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={gearColor}
              accessible={false}
            />
          </TouchableOpacity>
        </View>

        {/* Avatar og navn — avatarDisplayUrl er signert/visbar (rå avatar_url kan
            være en lagringssti etter opplasting) */}
        <View className="items-center mb-8">
          <UserAvatar
            name={profil?.full_name ?? fallbackName}
            avatarUrl={profil?.avatarDisplayUrl}
            size={72}
          />
          <Text className="text-content dark:text-content-dark text-xl font-semibold mt-3">
            {profil?.full_name ?? fallbackName}
          </Text>
          <TouchableOpacity
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel={t("profile.editTitle")}
            accessibilityHint={t("profile.editHint")}
            className="flex-row items-center gap-1.5 mt-2"
          >
            <Ionicons
              name="pencil-outline"
              size={14}
              color={accentColor}
              accessible={false}
            />
            <Text className="text-accent dark:text-accent-dark text-sm font-semibold">
              {t("profile.editTitle")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tidligere økter — varig historikk over fullførte økter */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        {t("profile.pastSessions")}
      </Text>

      {loadingSessions ? (
        <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
      ) : sessionsError ? (
        <View className="mx-4 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
          <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
            {t("profile.loadError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchSessions()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
          >
            <Text className="text-white font-semibold text-sm">{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : sessions.length === 0 ? (
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm px-4">
          {t("profile.pastSessionsEmpty")}
        </Text>
      ) : (
        <View className="mx-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
          {sessions.map((s, i) => {
            const when = getRelativeDayOrWeekLabel(s.completed_at);
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => navigation.navigate("SessionDetail", { sessionId: s.id })}
                accessibilityRole="button"
                accessibilityLabel={t("profile.sessionRowA11y", {
                  title: s.itemTitle,
                  when,
                })}
                accessibilityHint={t("profile.sessionRowHint")}
                className={`flex-row items-center px-4 py-3 ${
                  i < sessions.length - 1
                    ? "border-b border-border dark:border-border-dark"
                    : ""
                }`}
              >
                {s.thumbUrl ? (
                  <Image
                    source={{ uri: s.thumbUrl }}
                    style={{ width: 44, height: 44, borderRadius: 8 }}
                    resizeMode="cover"
                    accessible={false}
                    className="mr-3"
                  />
                ) : (
                  <View className="w-11 h-11 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-3">
                    {s.itemType ? (
                      <Ionicons
                        name={ITEM_ICONS[s.itemType]}
                        size={20}
                        color="#78716C"
                        accessible={false}
                      />
                    ) : null}
                  </View>
                )}

                <View className="flex-1">
                  <Text
                    className="text-content dark:text-content-dark text-sm font-medium"
                    numberOfLines={1}
                  >
                    {s.itemTitle}
                  </Text>
                  <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-0.5">
                    {t("profile.sessionCompletedWhen", { when })}
                  </Text>
                </View>

                {s.progress_pct != null && (
                  <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold ml-2">
                    {s.progress_pct}%
                  </Text>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#A8A29E"
                  accessible={false}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Rediger navn/avatar — bunn-ark */}
      <ProfileEditSheet visible={editing} onClose={() => setEditing(false)} />
    </ScrollView>
  );
}
