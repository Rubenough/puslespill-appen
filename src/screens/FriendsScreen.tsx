import React, { useState, useCallback, useEffect, useRef } from "react";
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
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/RootNavigator";
import { type TabParamList } from "../navigation/AppNavigator";
import UserAvatar from "../components/UserAvatar";
import { fetchFriends, type Friend } from "../utils/friends";
import { clearPendingInviteCode } from "../utils/pendingInvite";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Dyplenke-koden (puslespill://join?code=…) leveres som ruteparameter på Venner-fanen.
const inviteLinkFor = (code: string) => `puslespill://join?code=${code}`;

// Stabile feiltokens fra accept_invite (F4 tier 2) → i18n-nøkkel. Faller tilbake
// på errGeneric for alt annet. Vi beholder de norske literalene under som belte-
// og-bukseseler, i tilfelle en gammel DB-versjon fortsatt reiser dem verbatim.
const TOKEN_TO_KEY: Record<string, string> = {
  invalid_code: "friends.errInvalidCode",
  self_add: "friends.errSelfAdd",
  "Ugyldig invitasjonskode": "friends.errInvalidCode",
  "Du kan ikke legge til deg selv": "friends.errSelfAdd",
};

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<TabParamList, "Venner">>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  // Speiler inviteCode slik at fetchCode kan beholde en allerede vist kode ved en
  // forbigående feil (uten å ta inviteCode inn i fetchCode sine deps).
  const inviteCodeRef = useRef<string | null>(null);
  useEffect(() => {
    inviteCodeRef.current = inviteCode;
  }, [inviteCode]);
  const [codeError, setCodeError] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // QR-visning av invitasjonslenken (skannes med telefonkameraet → dyplenke).
  const [showQr, setShowQr] = useState(false);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  // Banner over «LEGG TIL VENN» når vi kom hit via en invitasjonslenke.
  const [fromInviteLink, setFromInviteLink] = useState(false);

  // Henter kun invitasjonskoden (F5: egen feiltilstand + retry i kortet).
  const fetchCode = useCallback(async (isActive: () => boolean = () => true) => {
    const codeRes = await supabase.rpc("get_my_invite_code");
    if (!isActive()) return;
    if (codeRes.data) {
      setInviteCode(codeRes.data);
      setCodeError(false);
    } else if (!inviteCodeRef.current) {
      // Ingen kjent kode å vise → vis feil. Har vi allerede en kode (forbigående
      // feil ved refokus), behold den stille i stedet for å skjule den bak feilen.
      setCodeError(true);
    }
  }, []);

  // Henter kun vennelisten (brukt av fetchData og etter unfriend, uten å røre koden).
  const fetchFriendsList = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!user) return;
      try {
        const list = await fetchFriends(user.id);
        if (!isActive()) return;
        setFriends(list);
        setFetchError(false);
      } catch {
        if (!isActive()) return;
        setFetchError(true);
      }
    },
    [user],
  );

  const fetchData = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!user) return;
      await fetchCode(isActive);
      await fetchFriendsList(isActive);
      if (isActive()) setLoading(false);
    },
    [user, fetchCode, fetchFriendsList],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchData(() => active);
      return () => {
        active = false;
      };
    }, [fetchData]),
  );

  // Kom hit via en invitasjonslenke? Forhåndsutfyll koden så brukeren bare trykker
  // «Legg til», vis banneret, og tøm den ventende koden i SecureStore (F3).
  useEffect(() => {
    const code = route.params?.code;
    if (code) {
      setRedeemInput(code.toUpperCase());
      setFromInviteLink(true);
      clearPendingInviteCode();
    }
  }, [route.params?.code]);

  async function shareInvite() {
    if (!inviteCode) return;
    await Share.share({
      message: t("friends.shareMessage", {
        code: inviteCode,
        link: inviteLinkFor(inviteCode),
      }),
    });
  }

  // F2: bekreft (destruktivt — gamle lenker slutter å virke), roter via RPC,
  // vis spinner i kode-slotten mens det pågår.
  function confirmRotate() {
    Alert.alert(t("friends.rotateConfirmTitle"), t("friends.rotateConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("friends.rotateConfirmCta"),
        style: "destructive",
        onPress: rotateCode,
      },
    ]);
  }

  async function rotateCode() {
    setRotating(true);
    const { data, error } = await supabase.rpc("regenerate_invite_code");
    setRotating(false);
    if (error || !data) {
      Alert.alert(t("friends.rotateFailed"));
      return;
    }
    setInviteCode(data);
    setCodeError(false);
    Alert.alert(t("friends.rotated"));
  }

  // F1: bekreft (destruktivt, gjensidig), slett vennskapet, refetch.
  function confirmRemove(friend: Friend) {
    const name = friend.name ?? t("common.unknownUser");
    Alert.alert(
      t("friends.removeConfirmTitle", { name }),
      t("friends.removeConfirmBody", { name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("friends.removeConfirmCta"),
          style: "destructive",
          onPress: () => removeFriend(friend),
        },
      ],
    );
  }

  async function removeFriend(friend: Friend) {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friend.friendshipId);
    if (error) {
      Alert.alert(t("common.somethingWrong"), error.message);
      return;
    }
    // Unfriend endrer kun vennelisten — ikke kjør invitasjonskode-RPC-en på nytt.
    await fetchFriendsList();
    Alert.alert(t("friends.removed", { name: friend.name ?? t("common.unknownUser") }));
  }

  async function handleRedeem() {
    const code = redeemInput.trim().toUpperCase();
    if (!code) return;

    setRedeeming(true);
    const { data, error } = await supabase.rpc("accept_invite", { p_code: code });
    setRedeeming(false);

    if (error) {
      // F4: kart stabile tokens (invalid_code/self_add) → i18n, fallback errGeneric.
      Alert.alert(t(TOKEN_TO_KEY[error.message] ?? "friends.errGeneric"));
      return;
    }

    const friend = data?.[0];
    setRedeemInput("");
    setFromInviteLink(false);
    if (friend?.already_friends) {
      // F9: allerede venner — egen melding i stedet for «Lagt til!».
      Alert.alert(t("friends.alreadyFriendsTitle"));
    } else {
      Alert.alert(
        t("friends.added"),
        friend?.full_name
          ? t("friends.addedNamed", { name: friend.full_name })
          : t("friends.addedUnnamed"),
      );
    }
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
          {codeError ? (
            // F5: koden kunne ikke lastes — vis feil + retry i selve kortet.
            <View className="flex-1 mr-3">
              <Text className="text-content dark:text-content-dark text-sm mb-1">
                {t("friends.codeLoadError")}
              </Text>
              <TouchableOpacity
                onPress={() => fetchCode()}
                accessibilityRole="button"
                accessibilityLabel={t("common.retry")}
              >
                <Text className="text-accent dark:text-accent-dark text-sm font-semibold">
                  {t("common.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : rotating ? (
            <ActivityIndicator color="#1D9E75" style={{ paddingVertical: 6 }} />
          ) : (
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
          )}
          <TouchableOpacity
            onPress={shareInvite}
            disabled={!inviteCode || rotating}
            accessibilityRole="button"
            accessibilityLabel={t("friends.shareA11y")}
            accessibilityState={{ disabled: !inviteCode || rotating }}
            className="flex-row items-center gap-1.5 bg-accent dark:bg-accent-dark rounded-xl px-4 py-2.5"
          >
            <Ionicons name="share-outline" size={16} color="white" accessible={false} />
            <Text className="text-white font-semibold text-sm">{t("friends.share")}</Text>
          </TouchableOpacity>
        </View>

        {/* Vis/skjul QR — sidestilt med roter-koden-handlingen under kode-raden. */}
        <TouchableOpacity
          onPress={() => setShowQr((v) => !v)}
          disabled={!inviteCode || rotating}
          accessibilityRole="button"
          accessibilityLabel={showQr ? t("friends.qrHide") : t("friends.qrShow")}
          accessibilityState={{ disabled: !inviteCode || rotating, expanded: showQr }}
          className="flex-row items-center gap-1.5 mt-3 self-start"
        >
          <Ionicons
            name="qr-code-outline"
            size={16}
            color={inviteCode && !rotating ? "#1D9E75" : "#A8A29E"}
            accessible={false}
          />
          <Text
            className={`text-sm font-semibold ${
              inviteCode && !rotating
                ? "text-accent dark:text-accent-dark"
                : "text-content-secondary dark:text-content-secondary-dark"
            }`}
          >
            {showQr ? t("friends.qrHide") : t("friends.qrShow")}
          </Text>
        </TouchableOpacity>

        {/* QR av invitasjonslenken — skann med telefonkameraet, dyplenken tar
            mottakeren rett til Venner med koden forhåndsutfylt. */}
        {showQr && inviteCode && !rotating && (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t("friends.qrA11y", { code: inviteCode })}
            className="items-center mt-4"
          >
            {/* Hvit plate med stillekant så QR-en er skannbar også i mørkt tema. */}
            <View className="bg-white rounded-2xl p-4">
              <QRCode value={inviteLinkFor(inviteCode)} size={168} />
            </View>
            <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-2 text-center">
              {t("friends.qrHint")}
            </Text>
          </View>
        )}

        {/* F2: roter koden — stille, underordnet handling under kode-raden. */}
        <TouchableOpacity
          onPress={confirmRotate}
          disabled={!inviteCode || rotating}
          accessibilityRole="button"
          accessibilityLabel={t("friends.rotateA11y")}
          accessibilityHint={t("friends.rotateHint")}
          accessibilityState={{ disabled: !inviteCode || rotating }}
          className="flex-row items-center gap-1.5 mt-3 self-start"
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={inviteCode && !rotating ? "#1D9E75" : "#A8A29E"}
            accessible={false}
          />
          <Text
            className={`text-sm font-semibold ${
              inviteCode && !rotating
                ? "text-accent dark:text-accent-dark"
                : "text-content-secondary dark:text-content-secondary-dark"
            }`}
          >
            {t("friends.rotate")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* F3: kom hit via en invitasjonslenke — vis engangs-banner over feltet. */}
      {fromInviteLink && (
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={t("friends.inviteLandingBanner")}
          className="mx-4 mb-4 bg-accent/10 dark:bg-accent-dark/10 rounded-2xl px-4 py-3"
        >
          <Text className="text-content dark:text-content-dark text-sm">
            {t("friends.inviteLandingBanner")}
          </Text>
        </View>
      )}

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
          {friends.map((friend, i) => {
            const name = friend.name ?? t("common.unknownUser");
            return (
              <View
                key={friend.friendshipId}
                className={`flex-row items-center pl-4 ${
                  i < friends.length - 1
                    ? "border-b border-border dark:border-border-dark"
                    : ""
                }`}
              >
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("FriendCollection", {
                      friendId: friend.id,
                      friendName: name,
                      avatarUrl: friend.avatarUrl,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  accessibilityHint={t("friends.openCollectionHint")}
                  className="flex-1 flex-row items-center py-3"
                >
                  <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} size={44} />
                  <Text className="flex-1 ml-3 text-content dark:text-content-dark font-medium">
                    {name}
                  </Text>
                </TouchableOpacity>
                {/* F1: overflow — åpner bekreftelse for å fjerne vennen. */}
                <TouchableOpacity
                  onPress={() => confirmRemove(friend)}
                  accessibilityRole="button"
                  accessibilityLabel={t("friends.rowMenuA11y", { name })}
                  accessibilityHint={t("friends.rowMenuHint")}
                  className="w-11 h-11 items-center justify-center mr-1"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="#A8A29E"
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
