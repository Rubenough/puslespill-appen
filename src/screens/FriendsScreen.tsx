import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/RootNavigator";
import UserAvatar from "../components/UserAvatar";
import { fetchFriends, type Friend } from "../utils/friends";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const codeRes = await supabase.rpc("get_my_invite_code");
    if (codeRes.data) setInviteCode(codeRes.data);

    try {
      setFriends(await fetchFriends(user.id));
      setFetchError(false);
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  async function shareInvite() {
    if (!inviteCode) return;
    // TODO(deep-link): når puslespill://join?code= håndteres, legg til lenken her.
    await Share.share({
      message: t("friends.shareMessage", { code: inviteCode }),
    });
  }

  async function handleRedeem() {
    const code = redeemInput.trim().toUpperCase();
    if (!code) return;

    setRedeeming(true);
    const { data, error } = await supabase.rpc("accept_invite", { p_code: code });
    setRedeeming(false);

    if (error) {
      Alert.alert(t("friends.addFailed"), error.message);
      return;
    }

    const friend = data?.[0];
    setRedeemInput("");
    Alert.alert(
      t("friends.added"),
      friend?.full_name
        ? t("friends.addedNamed", { name: friend.full_name })
        : t("friends.addedUnnamed"),
    );
    fetchData();
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        className="text-content dark:text-content-dark text-2xl font-medium px-4 pb-6"
        style={{ paddingTop: insets.top + 16 }}
      >
        {t("friends.title")}
      </Text>

      {/* Min invitasjon */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        {t("friends.myInvite")}
      </Text>
      <View className="mx-4 mb-6 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-4">
        <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mb-2">
          {t("friends.shareHint")}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityLabel={
              inviteCode
                ? t("friends.codeA11y", { code: inviteCode })
                : t("friends.codeLoading")
            }
            className="text-content dark:text-content-dark text-2xl font-semibold tracking-[4px]"
          >
            {inviteCode ?? "········"}
          </Text>
          <TouchableOpacity
            onPress={shareInvite}
            disabled={!inviteCode}
            accessibilityRole="button"
            accessibilityLabel={t("friends.shareA11y")}
            accessibilityState={{ disabled: !inviteCode }}
            className="flex-row items-center gap-1.5 bg-accent dark:bg-accent-dark rounded-xl px-4 py-2.5"
          >
            <Ionicons name="share-outline" size={16} color="white" accessible={false} />
            <Text className="text-white font-semibold text-sm">{t("friends.share")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legg til venn */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        {t("friends.addFriend")}
      </Text>
      <View className="mx-4 mb-6 flex-row gap-2">
        <View className="flex-1 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3">
          <TextInput
            className="text-content dark:text-content-dark text-base tracking-[2px]"
            placeholder={t("friends.enterCode")}
            placeholderTextColor="#A8A29E"
            value={redeemInput}
            onChangeText={setRedeemInput}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleRedeem}
            accessibilityLabel={t("friends.codeField")}
          />
        </View>
        <TouchableOpacity
          onPress={handleRedeem}
          disabled={redeeming || !redeemInput.trim()}
          accessibilityRole="button"
          accessibilityLabel={t("friends.addA11y")}
          accessibilityState={{ disabled: redeeming || !redeemInput.trim() }}
          className={`rounded-2xl px-5 items-center justify-center ${
            redeemInput.trim()
              ? "bg-accent dark:bg-accent-dark"
              : "bg-border dark:bg-border-dark"
          }`}
        >
          {redeeming ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold">{t("friends.add")}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Venneliste */}
      <Text
        accessibilityRole="header"
        className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 pb-3"
      >
        {t("friends.listHeader")}
        {friends.length > 0 ? ` · ${friends.length}` : ""}
      </Text>

      {loading ? (
        <ActivityIndicator color="#1D9E75" style={{ marginVertical: 24 }} />
      ) : fetchError ? (
        <View className="mx-4 mb-8 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-4 items-center">
          <Text className="text-content dark:text-content-dark text-sm text-center mb-3">
            {t("friends.loadError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchData()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            className="bg-accent dark:bg-accent-dark rounded-xl px-5 py-2"
          >
            <Text className="text-white font-semibold text-sm">{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : friends.length === 0 ? (
        <View className="mx-4 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-6 items-center">
          <Text className="text-content-secondary dark:text-content-secondary-dark text-sm text-center">
            {t("friends.empty")}
          </Text>
        </View>
      ) : (
        <View className="mx-4 mb-8 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
          {friends.map((friend, i) => (
            <TouchableOpacity
              key={friend.friendshipId}
              onPress={() =>
                navigation.navigate("FriendCollection", {
                  friendId: friend.id,
                  friendName: friend.name ?? t("common.unknownUser"),
                  avatarUrl: friend.avatarUrl,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={friend.name ?? t("common.unknownUser")}
              accessibilityHint={t("friends.openCollectionHint")}
              className={`flex-row items-center px-4 py-3 ${
                i < friends.length - 1
                  ? "border-b border-border dark:border-border-dark"
                  : ""
              }`}
            >
              <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} size={44} />
              <Text className="flex-1 ml-3 text-content dark:text-content-dark font-medium">
                {friend.name ?? t("common.unknownUser")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#A8A29E"
                accessible={false}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
