import React, { useState, ComponentProps } from "react";
import { View, Text, TouchableOpacity } from "react-native";
// NativeWind-varianten følger app-styrt tema (colorScheme.set), ikke bare OS.
import { useColorScheme } from "nativewind";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation, type NavigatorScreenParams } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "./RootNavigator";
import FeedScreen from "../screens/FeedScreen";
import CollectionsStack, { type CollectionsStackParamList } from "./CollectionsStack";
import LibraryScreen from "../screens/LibraryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import BottomSheet from "../components/BottomSheet";
import { ITEM_ICONS, type ItemType } from "../utils/collections";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

// Fanenavigatoren. Venneadministrasjon ligger nå på rot-ruten "Friends"
// (pushes fra Bibliotek-skjermen); dyplenke-invitasjoner ruter dit.
export type TabParamList = {
  Feed: undefined;
  Samlinger: NavigatorScreenParams<CollectionsStackParamList>;
  NyOkt: undefined;
  Bibliotek: undefined;
  Profil: undefined;
};

type ModalAction = "add" | "session";
// Hvilket steg av +-arket som vises: rot-valg eller type-valg for "legg til".
type ModalStep = "root" | "addType";

const colors = {
  surface: { light: "#FFFFFF", dark: "#292524" },
  border: { light: "#E7E5E4", dark: "#44403C" },
  accent: { light: "#1D9E75", dark: "#34D399" },
  inactive: { light: "#78716C", dark: "#A8A29E" },
  text: { light: "#1C1917", dark: "#FAFAF9" },
  itemBg: { light: "#F5F5F4", dark: "#3C3938" },
};

const MODAL_ITEMS: {
  icon: IoniconsName;
  titleKey: string;
  subtitleKey: string;
  action: ModalAction;
}[] = [
  {
    icon: "add-circle-outline",
    titleKey: "nav.addTitle",
    subtitleKey: "nav.addSubtitle",
    action: "add",
  },
  {
    icon: "time-outline",
    titleKey: "nav.sessionTitle",
    subtitleKey: "nav.sessionSubtitle",
    action: "session",
  },
];

// Dummy-skjerm for +-tab — vises aldri
function PlaceholderScreen() {
  return null;
}

const Tab = createBottomTabNavigator<TabParamList>();

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function AppNavigator() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("root");
  const navigation = useNavigation<RootNavProp>();

  function openModal() {
    setModalStep("root");
    setModalVisible(true);
  }

  // "Legg til" bytter til type-valg i selve arket — vi unngår en Alert like etter
  // at arket lukkes, som iOS kan droppe stille. "Start økt" navigerer direkte.
  function handleModalAction(action: ModalAction) {
    if (action === "add") {
      setModalStep("addType");
    } else {
      setModalVisible(false);
      navigation.navigate("NewSession", {});
    }
  }

  function handlePickType(type: ItemType) {
    setModalVisible(false);
    navigation.navigate("AddItem", { type });
  }

  const c = {
    surface: dark ? colors.surface.dark : colors.surface.light,
    border: dark ? colors.border.dark : colors.border.light,
    accent: dark ? colors.accent.dark : colors.accent.light,
    inactive: dark ? colors.inactive.dark : colors.inactive.light,
    text: dark ? colors.text.dark : colors.text.light,
    itemBg: dark ? colors.itemBg.dark : colors.itemBg.light,
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.inactive,
          tabBarStyle: {
            backgroundColor: c.surface,
            borderTopColor: c.border,
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Feed"
          component={FeedScreen}
          options={{
            tabBarLabel: t("nav.tabFeed"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Samlinger"
          component={CollectionsStack}
          options={{
            tabBarLabel: t("nav.tabCollections"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="NyOkt"
          component={PlaceholderScreen}
          options={{
            tabBarLabel: t("nav.tabNewSession"),
            tabBarButton: () => (
              <TouchableOpacity
                onPress={openModal}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ translateY: -4 }],
                }}
                accessibilityRole="button"
                accessibilityLabel={t("nav.tabNewSession")}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: c.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={28} color="white" />
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen
          name="Bibliotek"
          component={LibraryScreen}
          options={{
            tabBarLabel: t("nav.tabLibrary"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileScreen}
          options={{
            tabBarLabel: t("nav.tabProfile"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* + modal — bottom sheet */}
      <BottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        closeLabel={t("nav.closeMenu")}
        contentClassName="px-6"
      >
        {modalStep === "root" ? (
          <>
            <Text className="text-content dark:text-content-dark text-lg font-semibold mb-4">
              {t("nav.modalTitle")}
            </Text>

            {MODAL_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.action}
                onPress={() => handleModalAction(item.action)}
                accessibilityRole="button"
                accessibilityLabel={t(item.titleKey)}
                accessibilityHint={t(item.subtitleKey)}
                className="flex-row items-center bg-surface-secondary dark:bg-surface-dark-secondary rounded-xl p-4 mb-2.5"
              >
                <View className="w-10 h-10 rounded-[10px] bg-surface dark:bg-surface-dark items-center justify-center mr-3.5">
                  <Ionicons name={item.icon} size={22} color={c.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-content dark:text-content-dark font-semibold text-base">
                    {t(item.titleKey)}
                  </Text>
                  <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
                    {t(item.subtitleKey)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.inactive} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <View className="flex-row items-center mb-4">
              <TouchableOpacity
                onPress={() => setModalStep("root")}
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
                hitSlop={8}
                className="mr-2 -ml-1 p-1"
              >
                <Ionicons name="chevron-back" size={22} color={c.text} />
              </TouchableOpacity>
              <Text className="text-content dark:text-content-dark text-lg font-semibold">
                {t("nav.selectType")}
              </Text>
            </View>

            {(["puslespill", "brettspill"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => handlePickType(type)}
                accessibilityRole="button"
                accessibilityLabel={t(`collections.type.${type}`)}
                className="flex-row items-center bg-surface-secondary dark:bg-surface-dark-secondary rounded-xl p-4 mb-2.5"
              >
                <View className="w-10 h-10 rounded-[10px] bg-surface dark:bg-surface-dark items-center justify-center mr-3.5">
                  <Ionicons name={ITEM_ICONS[type]} size={22} color={c.accent} />
                </View>
                <Text className="flex-1 text-content dark:text-content-dark font-semibold text-base">
                  {t(`collections.type.${type}`)}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={c.inactive} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </BottomSheet>
    </>
  );
}
