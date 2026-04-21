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
  StatusBar,
  useColorScheme,
} from "react-native";
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
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_ICONS, type ItemType, type Difficulty } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";
import PuzzleProgressIcon, { progressToFilled } from "../components/PuzzleProgressIcon";
import ProgressSheet from "../components/ProgressSheet";

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

function getDayNumber(startedAt: string): number {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const navigation = useNavigation<SessionDetailNavProp>();
  const route = useRoute<SessionDetailRouteProp>();
  const { sessionId } = route.params;
  const { user } = useAuth();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [images, setImages] = useState<SessionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<SessionImage | null>(
    null,
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progressSheetVisible, setProgressSheetVisible] = useState(false);

  const fetchData = useCallback(async () => {
    const [sessionRes, imagesRes] = await Promise.all([
      supabase
        .from("sessions")
        .select(
          "id, started_at, completed_at, progress_pct, guest_names, notes, image_url, item:items!inner(id, title, type, brand, piece_count, player_count, difficulty)",
        )
        .eq("id", sessionId)
        .single(),
      supabase
        .from("session_images")
        .select("id, image_url, captured_at, note")
        .eq("session_id", sessionId)
        .order("captured_at", { ascending: false }),
    ]);

    if (sessionRes.data)
      setSession(sessionRes.data as unknown as SessionDetail);
    if (imagesRes.data) setImages(imagesRes.data as SessionImage[]);
    setLoading(false);
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  async function handleProgressSelect(pct: number, imageUri: string | null, note: string | null) {
    setProgressSheetVisible(false);
    setUpdating(true);

    // Last opp bilde hvis valgt
    let imageId: string | null = null;
    if (imageUri) {
      const fileName = `${user!.id}/${sessionId}/${Date.now()}.jpg`;
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("session-images")
        .upload(fileName, arrayBuffer, { contentType: "image/jpeg" });

      if (uploadError) {
        setUpdating(false);
        Alert.alert("Noe gikk galt", "Kunne ikke laste opp bildet.");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("session-images")
        .getPublicUrl(fileName);

      const { data: insertData, error: insertError } = await supabase
        .from("session_images")
        .insert({ session_id: sessionId, image_url: urlData.publicUrl, note })
        .select("id")
        .single();

      if (insertError) {
        setUpdating(false);
        Alert.alert("Noe gikk galt", insertError.message);
        return;
      }
      imageId = insertData.id;
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

    setUpdating(false);

    if (error) {
      Alert.alert("Noe gikk galt", error.message);
      return;
    }

    if (isCompletion) {
      navigation.goBack();
    } else {
      await fetchData();
    }
  }

  function handleUpdate() {
    if (session?.item.type === "puslespill") {
      setProgressSheetVisible(true);
      return;
    }

    // Brettspill: valgark
    Alert.alert("Oppdater økt", undefined, [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Legg til bilde",
        onPress: () => setProgressSheetVisible(true),
      },
      {
        text: "Fullfør økt",
        onPress: async () => {
          setUpdating(true);
          const { error } = await supabase
            .from("sessions")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", sessionId);
          setUpdating(false);
          if (error) {
            Alert.alert("Noe gikk galt", error.message);
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  }

  function handleDelete() {
    setMenuVisible(false);
    Alert.alert("Slett økt?", "Dette kan ikke angres.", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Slett",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);

          // Slett fremgangsbilder fra storage
          const storagePaths: string[] = images
            .map((img) => img.image_url.split("/session-images/")[1])
            .filter(Boolean);
          // Slett cover-bilde fra storage
          if (session?.image_url) {
            const coverPath = session.image_url.split("/session-images/")[1];
            if (coverPath) storagePaths.push(coverPath);
          }
          if (storagePaths.length > 0) {
            await supabase.storage.from("session-images").remove(storagePaths);
          }

          // Slett session_images-rader
          const { error: imgError } = await supabase
            .from("session_images")
            .delete()
            .eq("session_id", sessionId);
          if (imgError) {
            setDeleting(false);
            Alert.alert("Noe gikk galt", `Kunne ikke slette bilder: ${imgError.message}`);
            return;
          }

          // Slett session_participants-rader
          const { error: partError } = await supabase
            .from("session_participants")
            .delete()
            .eq("session_id", sessionId);
          if (partError) {
            setDeleting(false);
            Alert.alert("Noe gikk galt", `Kunne ikke slette deltakere: ${partError.message}`);
            return;
          }

          // Slett selve økten — bruk .select() for å verifisere at raden faktisk ble slettet
          const { data: deleted, error } = await supabase
            .from("sessions")
            .delete()
            .eq("id", sessionId)
            .select("id");

          setDeleting(false);
          if (error) {
            Alert.alert("Noe gikk galt", error.message);
            return;
          }
          if (!deleted || deleted.length === 0) {
            Alert.alert("Noe gikk galt", "Økten ble ikke slettet. Du har kanskje ikke tilgang.");
            return;
          }
          navigation.goBack();
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

  // Bygg metadata-undertekst
  const metaParts: string[] = [];
  if (session.item.brand) metaParts.push(session.item.brand);
  if (session.item.type === "puslespill" && session.item.piece_count)
    metaParts.push(`${session.item.piece_count} brikker`);
  if (session.item.type === "brettspill" && session.item.player_count)
    metaParts.push(`${session.item.player_count} spillere`);
  if (session.item.difficulty) metaParts.push(session.item.difficulty);
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
          accessibilityLabel="Tilbake"
          className="mr-3"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#78716C"
            accessible={false}
          />
        </TouchableOpacity>
        <Text
          className="text-content dark:text-content-dark text-lg font-semibold flex-1"
          numberOfLines={1}
        >
          {session.item.title}
        </Text>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Flere handlinger"
          accessibilityHint="Åpner meny med rediger og slett"
          className="w-9 h-9 rounded-full bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={isDark ? "#FAFAF9" : "#1C1917"}
            accessible={false}
          />
        </TouchableOpacity>
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
                Ingen bilder ennå
              </Text>
            </View>
          )}
          {/* Dag-badge */}
          <View className="absolute bottom-3 left-3 bg-black/50 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">
              Dag {dayNumber} · Startet {formatDate(session.started_at)}
              {isCompleted && session.completed_at
                ? ` · Fullført ${formatDate(session.completed_at)}`
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
            showProgress ? `${session.progress_pct} prosent` : null,
          ].filter(Boolean).join(", ")}
          className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 flex-row items-center"
        >
          {showCoverInMeta ? (
            <TouchableOpacity
              onPress={() => setFullscreenImage({ id: "cover", image_url: coverUrl!, captured_at: session.started_at, note: null })}
              accessibilityRole="button"
              accessibilityLabel="Vis bilde av boksen i fullskjerm"
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
            <Text className="text-content dark:text-content-dark font-medium" numberOfLines={1}>
              {session.item.title}
            </Text>
            {metaSubtitle ? (
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                {metaSubtitle}
              </Text>
            ) : null}
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
              FREMGANG
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
                  accessibilityLabel={`Vis bilde fra ${formatDate(img.captured_at)}${img.note ? `, ${img.note}` : ""} i fullskjerm`}
                  style={{ width: 100 }}
                >
                  <Image
                    source={{ uri: img.image_url }}
                    style={{ width: 100, height: 75, borderRadius: 8 }}
                    resizeMode="cover"
                    accessible={false}
                  />
                  <Text className="text-content-secondary dark:text-content-secondary-dark text-xs mt-1 text-center">
                    {formatDate(img.captured_at)}
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

        {/* Deltakere */}
        {session.guest_names.length > 0 && (
          <View className="px-4 mt-5">
            <Text
              accessibilityRole="header"
              className="text-content-secondary dark:text-content-secondary-dark text-xs font-semibold tracking-widest mb-3"
            >
              DELTAKERE
            </Text>
            <View className="flex-row flex-wrap gap-2">
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
              NOTAT
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

      {/* Oppdater-knapp — sticky bunn (skjul for fullførte økter) */}
      {!isCompleted && (
        <View
          className="px-4 bg-surface-secondary dark:bg-surface-dark-secondary border-t border-border dark:border-border-dark"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}
        >
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={updating}
            accessibilityRole="button"
            accessibilityLabel="Oppdater økt"
            accessibilityState={{ disabled: updating }}
            className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center"
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Oppdater
              </Text>
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

      {/* Handlingsark (···-meny) */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setMenuVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Lukk meny"
        />
        <View
          className="bg-surface dark:bg-surface-dark rounded-t-3xl px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="w-10 h-1 bg-border dark:bg-border-dark rounded-full self-center mb-4" />

          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl overflow-hidden mb-3">
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
              accessibilityLabel="Rediger deltakere og notat"
              className="flex-row items-center px-4 py-4 border-b border-border dark:border-border-dark"
            >
              <Ionicons name="pencil-outline" size={22} color="#1D9E75" accessible={false} />
              <Text className="text-content dark:text-content-dark text-base ml-3">
                Rediger deltakere og notat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel="Slett økt"
              accessibilityState={{ disabled: deleting }}
              className="flex-row items-center px-4 py-4"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#EF4444" accessible={false} />
              )}
              <Text className="text-red-500 text-base ml-3">Slett økt</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setMenuVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Avbryt"
            className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center"
          >
            <Text className="text-content dark:text-content-dark font-semibold text-base">
              Avbryt
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

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
          accessibilityLabel="Lukk fullskjerm"
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
              accessibilityLabel="Lukk fullskjerm"
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
                    {formatDate(fullscreenImage.captured_at)}
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
