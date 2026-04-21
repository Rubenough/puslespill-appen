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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ITEM_ICONS, type ItemType, type Difficulty } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";
import PuzzleProgressIcon, { progressToFilled } from "../components/PuzzleProgressIcon";
import ProgressSheet from "../components/ProgressSheet";
import CompletionModal from "../components/CompletionModal";

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<SessionImage | null>(
    null,
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progressSheetVisible, setProgressSheetVisible] = useState(false);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [lastUploadedImageId, setLastUploadedImageId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [sessionRes, imagesRes] = await Promise.all([
      supabase
        .from("sessions")
        .select(
          "id, started_at, completed_at, progress_pct, guest_names, notes, item:items!inner(id, title, type, brand, piece_count, player_count, difficulty)",
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

  async function handleAddImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploadingImage(true);
    const uri = result.assets[0].uri;
    const fileName = `${user!.id}/${sessionId}/${Date.now()}.jpg`;

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("session-images")
      .upload(fileName, arrayBuffer, { contentType: "image/jpeg" });

    if (uploadError) {
      setUploadingImage(false);
      Alert.alert("Noe gikk galt", "Kunne ikke laste opp bildet.");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("session-images")
      .getPublicUrl(fileName);

    const { data: insertData, error: insertError } = await supabase
      .from("session_images")
      .insert({ session_id: sessionId, image_url: urlData.publicUrl })
      .select("id")
      .single();

    if (insertError) {
      setUploadingImage(false);
      Alert.alert("Noe gikk galt", insertError.message);
      return;
    }

    await fetchData();
    setUploadingImage(false);

    // Vis progress-prompt for puslespill etter bildeopplasting
    if (session?.item.type === "puslespill") {
      setLastUploadedImageId(insertData.id);
      setProgressSheetVisible(true);
    }
  }

  function handleComplete() {
    // Puslespill: åpne CompletionModal med ferdigbilde + notat
    if (session?.item.type === "puslespill") {
      setCompletionModalVisible(true);
      return;
    }

    // Brettspill: enkel bekreftelse
    Alert.alert(
      "Merk som fullført",
      "Er du sikker på at du vil avslutte denne økten?",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Fullfør",
          onPress: async () => {
            setCompleting(true);
            const { error } = await supabase
              .from("sessions")
              .update({ completed_at: new Date().toISOString() })
              .eq("id", sessionId);
            setCompleting(false);
            if (error) {
              Alert.alert("Noe gikk galt", error.message);
              return;
            }
            navigation.goBack();
          },
        },
      ],
    );
  }

  async function handleCompletionSubmit(data: {
    notes: string | null;
    imageUri: string | null;
  }) {
    // Last opp ferdigbilde hvis valgt
    if (data.imageUri) {
      const response = await fetch(data.imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileName = `${user!.id}/${sessionId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("session-images")
        .upload(fileName, arrayBuffer, { contentType: "image/jpeg" });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("session-images")
          .getPublicUrl(fileName);

        await supabase
          .from("session_images")
          .insert({ session_id: sessionId, image_url: urlData.publicUrl });
      }
    }

    // Oppdater session: fullført, 100%, notat
    const { error } = await supabase
      .from("sessions")
      .update({
        completed_at: new Date().toISOString(),
        progress_pct: 100,
        notes: data.notes,
      })
      .eq("id", sessionId);

    setCompletionModalVisible(false);

    if (error) {
      Alert.alert("Noe gikk galt", error.message);
      return;
    }

    navigation.goBack();
  }

  async function handleProgressSelect(pct: number, imageNote: string | null) {
    const imageId = lastUploadedImageId;
    setProgressSheetVisible(false);
    setLastUploadedImageId(null);

    // Oppdater progress på økten
    const { error } = await supabase
      .from("sessions")
      .update({ progress_pct: pct })
      .eq("id", sessionId);
    if (error) {
      Alert.alert("Noe gikk galt", error.message);
      return;
    }

    // Lagre notat på bildet hvis det finnes
    if (imageNote && imageId) {
      await supabase
        .from("session_images")
        .update({ note: imageNote })
        .eq("id", imageId);
    }

    await fetchData();
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
          // Slett bilder fra storage
          if (images.length > 0) {
            const paths = images.map(
              (img) => img.image_url.split("/session-images/")[1],
            ).filter(Boolean);
            if (paths.length > 0) {
              await supabase.storage.from("session-images").remove(paths);
            }
          }
          // Slett session_images-rader
          await supabase
            .from("session_images")
            .delete()
            .eq("session_id", sessionId);
          // Slett session_participants-rader
          await supabase
            .from("session_participants")
            .delete()
            .eq("session_id", sessionId);
          // Slett selve økten
          const { error } = await supabase
            .from("sessions")
            .delete()
            .eq("id", sessionId);
          setDeleting(false);
          if (error) {
            Alert.alert("Noe gikk galt", error.message);
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

  const latestImage = images[0]; // images er sortert nyeste først (ascending: false)
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
        {/* Hero-bilde */}
        <View>
          {latestImage ? (
            <Image
              source={{ uri: latestImage.image_url }}
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

        {/* Metadata-kort */}
        {metaSubtitle ? (
          <View
            accessible
            accessibilityLabel={`${session.item.title}, ${metaSubtitle}`}
            className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-3 flex-row items-center"
          >
            <View className="w-10 h-10 rounded-xl bg-surface-secondary dark:bg-surface-dark-secondary items-center justify-center mr-3">
              <Ionicons
                name={ITEM_ICONS[session.item.type]}
                size={20}
                color="#1D9E75"
                accessible={false}
              />
            </View>
            <View className="flex-1">
              <Text className="text-content dark:text-content-dark font-medium" numberOfLines={1}>
                {session.item.title}
              </Text>
              <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                {metaSubtitle}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Fremgang-seksjon (kun puslespill) */}
        {isPuzzle && (
          <View
            accessible
            accessibilityLabel={
              showProgress
                ? `Fremgang: ${session.progress_pct} prosent${
                    session.item.piece_count
                      ? `, ${Math.round((session.progress_pct! / 100) * session.item.piece_count)} av ${session.item.piece_count} brikker`
                      : ""
                  }`
                : "Ingen fremgang registrert"
            }
            className="mx-4 mt-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark px-4 py-4 flex-row items-center"
          >
            <PuzzleProgressIcon
              filled={progressToFilled(session.progress_pct)}
              size={48}
            />
            <View className="flex-1 ml-3">
              {showProgress ? (
                <>
                  <Text className="text-content dark:text-content-dark font-semibold text-base">
                    {session.progress_pct}%
                  </Text>
                  {session.item.piece_count ? (
                    <Text className="text-content-secondary dark:text-content-secondary-dark text-xs">
                      {Math.round(
                        (session.progress_pct! / 100) *
                          session.item.piece_count,
                      )}{" "}
                      av {session.item.piece_count} brikker
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
                  Ingen fremgang registrert
                </Text>
              )}
            </View>
            {!isCompleted && (
              <TouchableOpacity
                onPress={() => setProgressSheetVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Oppdater fremgang"
                className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-xl px-3 py-2"
              >
                <Text className="text-accent dark:text-accent-dark text-xs font-semibold">
                  Oppdater
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Legg til bilde — skjul for fullførte økter */}
        {!isCompleted && (
          <View className="px-4 pt-4">
            <TouchableOpacity
              onPress={handleAddImage}
              disabled={uploadingImage}
              accessibilityRole="button"
              accessibilityLabel="Legg til bilde"
              accessibilityHint="Legg til et nytt progresjonsbilde"
              accessibilityState={{ disabled: uploadingImage }}
              className="flex-row items-center justify-center gap-2 border border-accent dark:border-accent-dark rounded-2xl py-3"
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#1D9E75" />
              ) : (
                <>
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color="#1D9E75"
                    accessible={false}
                  />
                  <Text className="text-accent dark:text-accent-dark text-sm font-semibold">
                    Legg til bilde
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Progresjonstidslinje */}
        {images.length > 1 && (
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

      {/* Merk som fullført — sticky bunn (skjul for fullførte økter) */}
      {!isCompleted && (
        <View
          className="px-4 bg-surface-secondary dark:bg-surface-dark-secondary border-t border-border dark:border-border-dark"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}
        >
          <TouchableOpacity
            onPress={handleComplete}
            disabled={completing}
            accessibilityRole="button"
            accessibilityLabel="Merk som fullført"
            accessibilityState={{ disabled: completing }}
            className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center"
          >
            {completing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Merk som fullført
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ProgressSheet */}
      <ProgressSheet
        visible={progressSheetVisible}
        currentProgress={session.progress_pct}
        showNoteField={lastUploadedImageId !== null}
        onSelect={handleProgressSelect}
        onSkip={() => {
          setProgressSheetVisible(false);
          setLastUploadedImageId(null);
        }}
      />

      {/* CompletionModal (puslespill) */}
      <CompletionModal
        visible={completionModalVisible}
        currentNotes={session.notes}
        onComplete={handleCompletionSubmit}
        onCancel={() => setCompletionModalVisible(false)}
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
        <StatusBar backgroundColor="black" barStyle="light-content" />
        <View className="flex-1 bg-black">
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
            className="bg-black/50 rounded-full p-2"
          >
            <Ionicons name="close" size={24} color="white" accessible={false} />
          </TouchableOpacity>
          {fullscreenImage && (
            <>
              <Image
                source={{ uri: fullscreenImage.image_url }}
                style={{ flex: 1 }}
                resizeMode="contain"
                accessible={false}
              />
              <View
                className="items-center pb-6"
                style={{ paddingBottom: insets.bottom + 16 }}
              >
                <Text className="text-white/70 text-sm">
                  {formatDate(fullscreenImage.captured_at)}
                </Text>
                {fullscreenImage.note ? (
                  <Text className="text-white text-sm mt-1 px-8 text-center">
                    {fullscreenImage.note}
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}
