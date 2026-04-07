import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
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
import { ITEM_ICONS, type ItemType } from "../utils/collections";
import { RootStackParamList } from "../navigation/RootNavigator";

type SessionDetailRouteProp = RouteProp<RootStackParamList, "SessionDetail">;
type SessionDetailNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "SessionDetail"
>;

type SessionImage = {
  id: string;
  image_url: string;
  captured_at: string;
};

type SessionDetail = {
  id: string;
  started_at: string;
  completed_at: string | null;
  guest_names: string[];
  notes: string | null;
  item: {
    id: string;
    title: string;
    type: ItemType;
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

  const fetchData = useCallback(async () => {
    const [sessionRes, imagesRes] = await Promise.all([
      supabase
        .from("sessions")
        .select(
          "id, started_at, completed_at, guest_names, notes, item:items!inner(id, title, type)",
        )
        .eq("id", sessionId)
        .single(),
      supabase
        .from("session_images")
        .select("id, image_url, captured_at")
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

    const { error: insertError } = await supabase
      .from("session_images")
      .insert({ session_id: sessionId, image_url: urlData.publicUrl });

    if (insertError) {
      setUploadingImage(false);
      Alert.alert("Noe gikk galt", insertError.message);
      return;
    }

    await fetchData();
    setUploadingImage(false);
  }

  function handleComplete() {
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
          onPress={() =>
            navigation.navigate("EditSession", {
              sessionId: session.id,
              guestNames: session.guest_names,
              notes: session.notes,
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Rediger økt"
        >
          <Text className="text-accent dark:text-accent-dark text-base font-medium">
            Rediger
          </Text>
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
            </Text>
          </View>
        </View>

        {/* Oppdater fremgang */}
        <View className="px-4 pt-4">
          <TouchableOpacity
            onPress={handleAddImage}
            disabled={uploadingImage}
            accessibilityRole="button"
            accessibilityLabel="Oppdater fremgang"
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
                  Oppdater fremgang
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

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
                  accessibilityLabel={`Vis bilde fra ${formatDate(img.captured_at)} i fullskjerm`}
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

      {/* Merk som fullført — sticky bunn */}
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
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}
