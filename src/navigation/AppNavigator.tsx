import React from "react";
import { useColorScheme } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import FeedScreen from "../screens/FeedScreen";
import CollectionsScreen from "../screens/CollectionsScreen";
import NewSessionScreen from "../screens/NewSessionScreen";
import LoansScreen from "../screens/LoansScreen";
import WishlistScreen from "../screens/WishlistScreen";

const colors = {
  surface: { light: "#FFFFFF", dark: "#292524" },
  border: { light: "#E7E5E4", dark: "#44403C" },
  accent: { light: "#1D9E75", dark: "#34D399" },
  inactive: { light: "#78716C", dark: "#A8A29E" },
  text: { light: "#1C1917", dark: "#FAFAF9" },
};

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: dark ? colors.accent.dark : colors.accent.light,
        tabBarInactiveTintColor: dark
          ? colors.inactive.dark
          : colors.inactive.light,
        tabBarStyle: {
          backgroundColor: dark ? colors.surface.dark : colors.surface.light,
          borderTopColor: dark ? colors.border.dark : colors.border.light,
        },
        headerStyle: {
          backgroundColor: dark ? colors.surface.dark : colors.surface.light,
          borderBottomColor: dark ? colors.border.dark : colors.border.light,
        },
        headerTintColor: dark ? colors.text.dark : colors.text.light,
        headerShown: false,
      }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Collections" component={CollectionsScreen} />
      <Tab.Screen name="NewSession" component={NewSessionScreen} />
      <Tab.Screen name="Loans" component={LoansScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
    </Tab.Navigator>
  );
}
