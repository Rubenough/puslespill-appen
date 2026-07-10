import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
// NativeWind-varianten følger app-styrt tema (colorScheme.set), ikke bare OS.
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_ICONS, type ItemType, type Difficulty } from "../utils/collections";
import { piecesLabel, playersLabel, difficultyLabel } from "../utils/collectionLabels";
import { RootStackParamList } from "../navigation/RootNavigator";
import PuzzleProgressIcon, { progressToFilled } from "../components/PuzzleProgressIcon";
import ProgressSheet from "../components/ProgressSheet";
import AddPhotoSheet from "../components/AddPhotoSheet";
import BottomSheet from "../components/BottomSheet";
import {
  uploadSessionImage,
  removeSessionImages,
  storagePathFromUrl,
  getSignedUrls,
} from "../utils/sessionImages";
import { getDayNumber, formatShortDate } from "../utils/date";

type SessionDetailRouteProp = RouteProp<RootStackParamList, "SessionDetail">;
type SessionDetailNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "SessionDetail"
>;

type SessionImage = {
  id: string;
  image_url: string;
  captured_at: string;
  note: string | null;
};

type SessionDetail = {
  id: string;
  created_by: string;
  started_at: string;
  completed_at: string | null;
  progress_pct: number | null;
  guest_names: string[];
  notes: string | null;
  image_url: string | null;
  item: {
    id: string;
    title: string;
    type: ItemType;
    brand: string | null;
    piece_count: number | null;
    player_count: number | null;
    difficulty: Difficulty | null;
  };
};

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const navigation = useNavigation<SessionDetailNavProp>();
  const route = useRoute<SessionDetailRouteProp>();
  const { sessionId } = route.params;
  const { user } = useAuth();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [images, setImages] = useState<SessionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<SessionImage | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [boardMenuVisible, setBoardMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progressSheetVisible, setProgressSheetVisible] = useState(false);
  const [addPhotoVisible, setAddPhotoVisible] = useState(false);
  // Registrerte deltakere (session_participants.profile_id) — inkl. eieren, for isParticipant.
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  // Registrerte venne-deltakere for visning (utenom eieren) — trykkbare til vennen.
  const [participantProfiles, setParticipantProfiles] = useState<
    { id: string; name: string | null; avatarUrl: string | null }[]
  >([]);

  const fetchData = useCallback(async () => {
    const [sessionRes, imagesRes, participantsRes] = await Promise.all([
      supabase
        .from("sessions")
        .select(
          "id, created_by, started_at, completed_at, progress_pct, guest_names, notes, image_url, item:items!inner(id, title, type, brand, piece_count, player_count, difficulty)",
        )
        .eq("id", sessionId)
        .single(),
      supabase
        .from("session_images")
        .select("id, image_url, captured_at, note")
        .eq("session_id", sessionId)
        .order("captured_at", { ascending: false }),
      supabase
        .from("session_participants")
        .select("profile_id")
        .eq("session_id", sessionId),
    ]);

    const sessionData: SessionDetail | null = sessionRes.data;
    const imageRows = (imagesRes.data as SessionImage[] | null) ?? [];

    // Registrerte deltakere til visning (utenom eieren OG deg selv — din egen «pille»
    // skal ikke lenke til en venne-samling av deg selv). pIds beholdes for isParticipant.
    const pIds = (participantsRes.data ?? []).map((r) => r.profile_id);
    const displayIds = pIds.filter(
      (id) => id !== sessionData?.created_by && id !== user?.id,
    );

    // Deltaker-profiler og bilde-signering er uavhengige — kjør i parallell.
    const [profs, signed] = await Promise.all([
      displayIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", displayIds)
            .then((r) => r.data)
        : Promise.resolve(
            [] as { id: string; full_name: string | null; avatar_url: string | null }[],
          ),
      getSignedUrls([
        sessionData?.image_url ?? null,
        ...imageRows.map((img) => img.image_url),
      ]),
    ]);

    const profiles = displayIds.map((id) => {
      const p = (profs ?? []).find((x) => x.id === id);
      return { id, name: p?.full_name ?? null, avatarUrl: p?.avatar_url ?? null };
    });
    setParticipantIds(pIds);
    setParticipantProfiles(profiles);

    if (sessionData) {
      setSession({
        ...sessionData,
        image_url: sessionData.image_url
          ? (signed.get(sessionData.image_url) ?? null)
          : null,
      });
    }
    setImages(
      imageRows.map((img) => ({
        ...img,
        image_url: signed.get(img.image_url) ?? img.image_url,
      })),
    );
    setLoading(false);
  }, [sessionId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  async function handleProgressSelect(
    pct: number,
    imageUri: string | null,
    note: string | null,
  ) {
    setProgressSheetVisible(false);
    setUpdating(true);

    // Lagringssti holdes utenfor try slik at vi kan rydde opp foreldreløst bilde ved feil.
    let uploadedPath: string | null = null;
    try {
      // Last opp bilde hvis valgt
      let imageId: string | null = null;
      if (imageUri) {
        uploadedPath = `${user!.id}/${sessionId}/${Date.now()}.jpg`;
        // Lagrer LAGRINGSSTIEN; bildet vises via signert URL ved neste henting.
        const imagePath = await uploadSessionImage(uploadedPath, imageUri);

        const { data: insertData, error: insertError } = await supabase
          .from("session_images")
          .insert({ session_id: sessionId, image_url: imagePath, note })
          .select("id")
          .single();

        if (insertError) throw insertError;
        imageId = insertData.id;
        // Raden peker nå på filen — ikke rydd den bort om et senere steg feiler.
        uploadedPath = null;
      }

      // Oppdater session
      const isCompletion = pct === 100;
      const updateData: Record<string, unknown> = { progress_pct: pct };
      if (isCompletion) {
        updateData.completed_at = new Date().toISOString();
      }
      // Lagre notat på økten hvis det ikke er knyttet til et bilde
      if (note && !imageId) {
        updateData.notes = note;
      }

      const { error } = await supabase
        .from("sessions")
        .update(updateData)
        .eq("id", sessionId);

      if (error) throw error;

      if (isCompletion) {
        navigation.goBack();
      } else {
        await fetchData();
      }
    } catch (err) {
      if (uploadedPath) await removeSessionImages([uploadedPath]).catch(() => {});
      Alert.alert(
        t("common.somethingWrong"),
        err instanceof Error ? err.message : t("session.updateError"),
      );
    } finally {
      setUpdating(false);
    }
  }

  // F: registrert deltaker (ikke eier) legger til KUN et fremgangsbilde (+ notat på
  // bilde-raden). Rører aldri sessions.progress_pct / completed_at — det er eier-only.
  async function handleAddParticipantPhoto(imageUri: string, note: string | null) {
    setAddPhotoVisible(false);
    setUpdating(true);
    // Lagringssti holdes utenfor try slik at foreldreløst bilde kan ryddes ved feil.
    let uploadedPath: string | null = null;
    try {
      uploadedPath = `${user!.id}/${sessionId}/${Date.now()}.jpg`;
      const imagePath = await uploadSessionImage(uploadedPath, imageUri);
      const { error } = await supabase
        .from("session_images")
        .insert({ session_id: sessionId, image_url: imagePath, note });
      if (error) throw error;
      // Raden peker nå på filen — ikke rydd den bort.
      uploadedPath = null;
      await fetchData();
    } catch (err) {
      if (uploadedPath) await removeSessionImages([uploadedPath]).catch(() => {});
      Alert.alert(
        t("common.somethingWrong"),
        err instanceof Error ? err.message : t("session.addPhotoError"),
      );
    } finally {
      setUpdating(false);
    }
  }

  function handleUpdate() {
    if (session?.item.type === "puslespill") {
      setProgressSheetVisible(true);
      return;
    }
    // Brettspill: valgark (delt BottomSheet, ikke native Alert)
    setBoardMenuVisible(true);
  }

  async function completeBoardSession() {
    setBoardMenuVisible(false);
    setUpdating(true);
    const { error } = await supabase
      .from("sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    setUpdating(false);
    if (error) {
      Alert.alert(t("common.somethingWrong"), error.message);
      return;
    }
    navigation.goBack();
  }

  function handleDelete() {
    setMenuVisible(false);
    Alert.alert(t("session.deleteConfirmTitle"), t("session.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("session.delete"),
        style: "destructive",
        onPress: async () => {
          setDeleting(true);

          // Merk: uten transaksjon er dette ikke atomært. Vi sletter DB-radene før
          // filene, og fjerner filer fra storage KUN etter at selve økt-raden er
          // bekreftet slettet — slik at en feilet sletting aldri etterlater en
          // levende økt uten bildene sine. Se PROJECT-PLAN.md for en `delete_session`
          // RPC / ON DELETE CASCADE som løser atomisiteten skikkelig.
          const storagePaths: string[] = [
            ...images.map((img) => storagePathFromUrl(img.image_url)),
            storagePathFromUrl(session?.image_url ?? null),
          ].filter((p): p is string => !!p);

          try {
            // Slett session_images-rader
            const { error: imgError } = await supabase
              .from("session_images")
              .delete()
              .eq("session_id", sessionId);
            if (imgError)
              throw new Error(t("session.deleteImagesError", { msg: imgError.message }));

            // Slett session_participants-rader
            const { error: partError } = await supabase
              .from("session_participants")
              .delete()
              .eq("session_id", sessionId);
            if (partError)
              throw new Error(
                t("session.deleteParticipantsError", { msg: partError.message }),
              );

            // Slett selve økten — bruk .select() for å verifisere at raden faktisk ble slettet
            const { data: deleted, error } = await supabase
              .from("sessions")
              .delete()
              .eq("id", sessionId)
              .select("id");

            if (error) throw new Error(error.message);
            if (!deleted || deleted.length === 0) {
              throw new Error(t("session.deleteNoAccess"));
            }

            // Rydd storage først etter bekreftet sletting — best-effort.
            await removeSessionImages(storagePaths).catch(() => {});

            navigation.goBack();
          } catch (err) {
            Alert.alert(
              t("common.somethingWrong"),
              err instanceof Error ? err.message : t("session.deleteError"),
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (loading || !session) {
    return (
      <View
        className="flex-1 bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator color="#1D9E75" />
      </View>
    );
  }

  const latestImage = images[0]; // fremgangsbilder, sortert nyeste først
  const coverUrl = session.image_url; // boks-/coverbilde fra opprettelse
  const hasProgressImages = images.length > 0;
  // Hero: vis siste fremgangsbilde, ellers cover, ellers placeholder
  const heroUrl = latestImage?.image_url ?? coverUrl;
  // Vis cover-thumbnail i metadata når det finnes både cover og fremgangsbilder
  const showCoverInMeta = !!coverUrl && hasProgressImages;

  const dayNumber = getDayNumber(session.started_at);
  const isCompleted = session.completed_at !== null;
  // Kun eieren kan redigere/slette/oppdatere. Venner som åpner økten fra feeden
  // ser en ren lesevisning (RLS blokkerer uansett skriving fra ikke-eiere).
  const isOwner = session.created_by === user?.id;
  // F: en registrert deltaker (ikke eier) kan legge til fremgangsbilder.
  const isParticipant = !isOwner && !!user && participantIds.includes(user.id);

  // Bygg metadata-undertekst
  const metaParts: string[] = [];
  if (session.item.brand) metaParts.push(session.item.brand);
  if (session.item.type === "puslespill" && session.item.piece_count)
    metaParts.push(piecesLabel(session.item.piece_count));
  if (session.item.type === "brettspill" && session.item.player_count)
    metaParts.push(playersLabel(session.item.player_count));
  if (session.item.difficulty) metaParts.push(difficultyLabel(session.item.difficulty));
  const metaSubtitle = metaParts.join(" · ");
  const isPuzzle = session.item.type === "puslespill";
  const showProgress = isPuzzle && session.progress_pct !== null;

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
          <Ionicons name="arrow-back" size={24} color="#78716C" accessible={false} />
        </TouchableOpacity>
        <Text
          className="text-content dark:text-content-dark text-lg font-semibold flex-1"
          numberOfLines={1}
        >
          {session.item.title}
        </Text>
        {isOwner && (
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t("session.moreActions")}
            accessibilityHint={t("session.moreActionsHint")}
            className="w-9 h-9 rounded-full bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={isDark ? "#FAFAF9" : "#1C1917"}
              accessible={false}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero-bilde: siste fremgang, eller cover, eller placeholder */}
        <View>
          {heroUrl ? (
            <Image
              source={{ uri: heroUrl }}
              style={{ width: "100%", height: 240 }}
              resizeMode="cover"
              accessible={false}
            />
          ) : (
            <View
              className="bg-surface dark:bg-surface-dark items-center justify-center"
              style={{ height: 180 }}
            >
              <Ionicons
                name={ITEM_ICONS[session.item.type]}
                size={48}
                color="#A8A29E"
                accessible={false}
              />
              <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mt-2">
                {t("session.noImagesYet")}
              </Text>
            </View>
          )}
          {/* Dag-badge */}
          <View className="absolute bottom-3 left-3 bg-black/50 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">
              {t("session.dayStarted", {
                day: dayNumber,
                start: formatShortDate(session.started_at),
              })}
              {isCompleted && session.completed_at
                ? ` ${t("session.completedAppendix", {
                    end: formatShortDate(session.completed_at),
                  })}`
                : ""}
            </Text>
          </View>
        </View>

        {/* Metadata-kort med progresjon */}
        <View
          accessible
          accessibilityLabel={[
            session.item.title,
            metaSubtitle,
            showProgress
              ? t("session.progressPctA11y", { pct: session.progress_pct })
              : null,
          ]
            .filter(Boolean)
            .join(", ")}
          className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 flex-row items-center"
        >
          {showCoverInMeta ? (
            <TouchableOpacity
              onPress={() =>
                setFullscreenImage({
                  id: "cover",
                  image_url: coverUrl!,
                  captured_at: session.started_at,
                  note: null,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t("session.coverFullscreenA11y")}
              className="mr-3"
            >
              <Image
                source={{ uri: coverUrl! }}
                style={{ width: 48, height: 48, borderRadius: 12 }}
                resizeMode="cover"
                accessible={false}
              />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-3">
              <Ionicons
                name={ITEM_ICONS[session.item.type]}
                size={20}
                color="#1D9E75"
                accessible={false}
              />
            </View>
          )}
          <View className="flex-1">
            <Text
              className="text-content dark:text-content-dark font-medium"
              numberOfLines={1}
            >
              {session.item.title}
            </Text>
            {metaSubtitle ? (
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                {metaSubtitle}
              </Text>
            ) : null}
            {isCompleted && (
              <View className="flex-row items-center gap-1 mt-1.5 self-start bg-accent/10 dark:bg-accent-dark/10 rounded-full px-2 py-0.5">
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color="#1D9E75"
                  accessible={false}
                />
                <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
                  {t("session.completedBadge")}
                </Text>
              </View>
            )}
          </View>
          {isPuzzle && (
            <View className="items-center ml-2">
              <PuzzleProgressIcon
                filled={progressToFilled(session.progress_pct)}
                size={36}
              />
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold mt-1">
                {session.progress_pct ?? 0}%
              </Text>
            </View>
          )}
        </View>

        {/* Progresjonstidslinje */}
        {images.length > 0 && (
          <View className="mt-5">
            <Text
              accessibilityRole="header"
              className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest px-4 mb-3"
            >
              {t("session.progressHeader")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {images.map((img) => (
                <TouchableOpacity
                  key={img.id}
                  onPress={() => setFullscreenImage(img)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    img.note
                      ? t("session.progressImageA11yNote", {
                          date: formatShortDate(img.captured_at),
                          note: img.note,
                        })
                      : t("session.progressImageA11y", {
                          date: formatShortDate(img.captured_at),
                        })
                  }
                  style={{ width: 100 }}
                >
                  <Image
                    source={{ uri: img.image_url }}
                    style={{ width: 100, height: 75, borderRadius: 8 }}
                    resizeMode="cover"
                    accessible={false}
                  />
                  <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-1 text-center">
                    {formatShortDate(img.captured_at)}
                  </Text>
                  {img.note ? (
                    <Text
                      className="text-content dark:text-content-dark text-xs mt-0.5 text-center"
                      numberOfLines={2}
                    >
                      {img.note}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Deltakere — registrerte venner (trykkbare, kan legge til bilder) + fritekst-gjester */}
        {(participantProfiles.length > 0 || session.guest_names.length > 0) && (
          <View className="px-4 mt-5">
            <Text
              accessibilityRole="header"
              className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
            >
              {t("session.participantsHeader")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {participantProfiles.map((p) => {
                const name = p.name ?? t("common.unknownUser");
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() =>
                      navigation.navigate("FriendCollection", {
                        friendId: p.id,
                        friendName: name,
                        avatarUrl: p.avatarUrl,
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={t("session.registeredParticipantA11y", { name })}
                    accessibilityHint={t("friends.openCollectionHint")}
                    className="flex-row items-center bg-accent/10 dark:bg-accent-dark/10 border border-accent dark:border-accent-dark rounded-full px-3 py-1.5"
                  >
                    <Ionicons
                      name="person"
                      size={12}
                      color="#1D9E75"
                      accessible={false}
                      style={{ marginRight: 5 }}
                    />
                    <Text className="text-accent dark:text-accent-dark text-sm">
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {session.guest_names.map((name) => (
                <View
                  key={name}
                  accessible
                  accessibilityLabel={name}
                  className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-full px-3 py-1.5"
                >
                  <Text className="text-content dark:text-content-dark text-sm">
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notat */}
        {session.notes ? (
          <View className="px-4 mt-5">
            <Text
              accessibilityRole="header"
              className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-2"
            >
              {t("session.noteHeader")}
            </Text>
            <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3">
              <Text className="text-content dark:text-content-dark text-base">
                {session.notes}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Oppdater-knapp — sticky bunn (kun eier, skjul for fullførte økter) */}
      {isOwner && !isCompleted && (
        <View
          className="px-4 bg-surface-secondary dark:bg-surface-dark-secondary border-t border-border dark:border-border-dark"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}
        >
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={updating}
            accessibilityRole="button"
            accessibilityLabel={t("session.updateA11y")}
            accessibilityState={{ disabled: updating }}
            className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center"
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">
                {t("session.update")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* F: deltaker (ikke eier) — sticky «Legg til bilde» (kun bilde, ikke fremgang) */}
      {isParticipant && !isCompleted && (
        <View
          className="px-4 bg-surface-secondary dark:bg-surface-dark-secondary border-t border-border dark:border-border-dark"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}
        >
          <TouchableOpacity
            onPress={() => setAddPhotoVisible(true)}
            disabled={updating}
            accessibilityRole="button"
            accessibilityLabel={t("session.addPhotoA11y")}
            accessibilityState={{ disabled: updating }}
            className="bg-accent dark:bg-accent-dark rounded-2xl py-4 flex-row items-center justify-center"
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color="white"
                  accessible={false}
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white text-base font-semibold">
                  {t("session.addPhoto")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ProgressSheet */}
      <ProgressSheet
        visible={progressSheetVisible}
        currentProgress={session.progress_pct}
        onSelect={handleProgressSelect}
        onCancel={() => setProgressSheetVisible(false)}
      />

      {/* F: deltaker legger til bilde */}
      <AddPhotoSheet
        visible={addPhotoVisible}
        saving={updating}
        onSubmit={handleAddParticipantPhoto}
        onCancel={() => setAddPhotoVisible(false)}
      />

      {/* Brettspill-oppdatering — delt BottomSheet (erstatter native Alert) */}
      <BottomSheet
        visible={boardMenuVisible}
        onClose={() => setBoardMenuVisible(false)}
        closeLabel={t("session.closeMenu")}
      >
        <Text className="text-content dark:text-content-dark text-base font-semibold mb-3 px-1">
          {t("session.updateSheetTitle")}
        </Text>
        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl overflow-hidden">
          <TouchableOpacity
            onPress={() => {
              setBoardMenuVisible(false);
              setProgressSheetVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("session.addImage")}
            className="flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark"
          >
            <Ionicons name="image-outline" size={22} color="#1D9E75" accessible={false} />
            <Text className="text-content dark:text-content-dark text-base ml-3">
              {t("session.addImage")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={completeBoardSession}
            accessibilityRole="button"
            accessibilityLabel={t("session.completeSession")}
            className="flex-row items-center px-4 py-4"
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#1D9E75"
              accessible={false}
            />
            <Text className="text-content dark:text-content-dark text-base ml-3">
              {t("session.completeSession")}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Handlingsark (···-meny) — delt BottomSheet (dra/bakteppe for å lukke) */}
      <BottomSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        closeLabel={t("session.closeMenu")}
      >
        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl overflow-hidden">
          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate("EditSession", {
                sessionId: session.id,
                guestNames: session.guest_names,
                notes: session.notes,
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={t("session.editParticipants")}
            className="flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark"
          >
            <Ionicons
              name="pencil-outline"
              size={22}
              color="#1D9E75"
              accessible={false}
            />
            <Text className="text-content dark:text-content-dark text-base ml-3">
              {t("session.editParticipants")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel={t("session.deleteSession")}
            accessibilityState={{ disabled: deleting }}
            className="flex-row items-center px-4 py-4"
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons
                name="trash-outline"
                size={22}
                color="#EF4444"
                accessible={false}
              />
            )}
            <Text className="text-red-500 text-base ml-3">
              {t("session.deleteSession")}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Fullskjerm-bilde modal */}
      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
        statusBarTranslucent
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setFullscreenImage(null)}
          accessibilityRole="button"
          accessibilityLabel={t("session.closeFullscreen")}
        >
          <BlurView
            intensity={80}
            tint="dark"
            style={{ flex: 1, justifyContent: "center" }}
          >
            {/* X-knapp */}
            <TouchableOpacity
              onPress={() => setFullscreenImage(null)}
              accessibilityRole="button"
              accessibilityLabel={t("session.closeFullscreen")}
              style={{
                position: "absolute",
                top: insets.top + 12,
                right: 16,
                zIndex: 10,
              }}
              className="bg-black/40 rounded-full p-2"
            >
              <Ionicons name="close" size={24} color="white" accessible={false} />
            </TouchableOpacity>

            {fullscreenImage && (
              <View className="items-center">
                <Image
                  source={{ uri: fullscreenImage.image_url }}
                  style={{ width: "90%", aspectRatio: 4 / 3, borderRadius: 16 }}
                  resizeMode="cover"
                  accessible={false}
                />
                <View className="items-center mt-3">
                  <Text className="text-white/70 text-sm">
                    {formatShortDate(fullscreenImage.captured_at)}
                  </Text>
                  {fullscreenImage.note ? (
                    <Text className="text-white text-sm mt-1 px-8 text-center">
                      {fullscreenImage.note}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          </BlurView>
        </Pressable>
      </Modal>
    </View>
  );
}
