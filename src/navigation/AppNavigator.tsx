import React, { useState, ComponentProps } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, Alert } from "react-native";
// NativeWind-varianten følger app-styrt tema (colorScheme.set), ikke bare OS.
import { useColorScheme } from "nativewind";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "./RootNavigator";
import FeedScreen from "../screens/FeedScreen";
import CollectionsStack from "./CollectionsStack";
import FriendsScreen from "../screens/FriendsScreen";
import ProfileScreen from "../screens/ProfileScreen";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

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
  action: string;
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

const Tab = createBottomTabNavigator();

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function AppNavigator() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<RootNavProp>();

  function handleModalAction(action: string) {
    setModalVisible(false);
    if (action === "add") {
      Alert.alert(t("nav.addTitle"), t("nav.selectType"), [
        {
          text: t("collections.type.puslespill"),
          onPress: () => navigation.navigate("AddItem", { type: "puslespill" }),
        },
        {
          text: t("collections.type.brettspill"),
          onPress: () => navigation.navigate("AddItem", { type: "brettspill" }),
        },
        { text: t("common.cancel"), style: "cancel" },
      ]);
    } else if (action === "session") {
      navigation.navigate("NewSession", {});
    }
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
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Samlinger"
          component={CollectionsStack}
          options={{
            tabBarLabel: t("nav.tabCollections"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="menu-outline" size={size} color={color} />
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
                onPress={() => setModalVisible(true)}
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
          name="Venner"
          component={FriendsScreen}
          options={{
            tabBarLabel: t("nav.tabFriends"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
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
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setModalVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t("nav.closeMenu")}
        />
        <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark rounded-t-[20px] p-6 pb-12">
          {/* Drag handle */}
          <View className="w-9 h-1 rounded-full bg-border dark:bg-border-dark self-center mb-5" />
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
        </View>
      </Modal>
    </>
  );
}
