import React, { useState, ComponentProps } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "./RootNavigator";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];
import FeedScreen from "../screens/FeedScreen";
import CollectionsStack from "./CollectionsStack";
import FriendsScreen from "../screens/FriendsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const colors = {
  surface: { light: "#FFFFFF", dark: "#292524" },
  border: { light: "#E7E5E4", dark: "#44403C" },
  accent: { light: "#1D9E75", dark: "#34D399" },
  inactive: { light: "#78716C", dark: "#A8A29E" },
  text: { light: "#1C1917", dark: "#FAFAF9" },
  itemBg: { light: "#F5F5F4", dark: "#3C3938" },
};

const MODAL_ITEMS: { icon: IoniconsName; title: string; subtitle: string; action: string }[] = [
  {
    icon: "add-circle-outline",
    title: "Legg til i samlingen",
    subtitle: "Puslespill, brettspill ...",
    action: "add",
  },
  {
    icon: "time-outline",
    title: "Start ny økt",
    subtitle: "Logg en aktivitet",
    action: "session",
  },
  {
    icon: "arrow-forward-outline",
    title: "Registrer utlån",
    subtitle: "Lån ut til en venn",
    action: "loan",
  },
];

// Dummy-skjerm for +-tab — vises aldri
function PlaceholderScreen() {
  return null;
}

const Tab = createBottomTabNavigator();

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function AppNavigator() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<RootNavProp>();

  function handleModalAction(action: string) {
    setModalVisible(false);
    if (action === "add") {
      Alert.alert("Legg til i samlingen", "Velg type", [
        { text: "Puslespill", onPress: () => navigation.navigate("AddItem", { type: "puslespill" }) },
        { text: "Brettspill", onPress: () => navigation.navigate("AddItem", { type: "brettspill" }) },
        { text: "Avbryt", style: "cancel" },
      ]);
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Samlinger"
          component={CollectionsStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="menu-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="NyOkt"
          component={PlaceholderScreen}
          options={{
            tabBarLabel: "Ny økt",
            tabBarButton: () => (
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                accessibilityLabel="Ny økt"
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileScreen}
          options={{
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
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setModalVisible(false)}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: c.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: 48,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.border,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              color: c.text,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 16,
            }}
          >
            Hva vil du gjøre?
          </Text>

          {MODAL_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={() => handleModalAction(item.action)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: c.itemBg,
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: c.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Ionicons name={item.icon} size={22} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "600", fontSize: 16 }}>
                  {item.title}
                </Text>
                <Text style={{ color: c.inactive, fontSize: 13 }}>
                  {item.subtitle}
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
