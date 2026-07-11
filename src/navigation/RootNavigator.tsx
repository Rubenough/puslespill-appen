import React from "react";
import { type NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppNavigator, { type TabParamList } from "./AppNavigator";
import AddItemScreen from "../screens/AddItemScreen";
import EditItemScreen from "../screens/EditItemScreen";
import NewSessionScreen from "../screens/NewSessionScreen";
import SessionDetailScreen from "../screens/SessionDetailScreen";
import EditSessionScreen from "../screens/EditSessionScreen";
import FriendCollectionScreen from "../screens/FriendCollectionScreen";
import FriendsScreen from "../screens/FriendsScreen";
import LoansHubScreen from "../screens/LoansHubScreen";
import LoanHistoryScreen from "../screens/LoanHistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { type ItemType, type Item } from "../utils/collections";

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  AddItem: { type: ItemType };
  EditItem: { item: Item; type: ItemType };
  NewSession: { itemId?: string };
  SessionDetail: { sessionId: string };
  EditSession: { sessionId: string; guestNames: string[]; notes: string | null };
  FriendCollection: { friendId: string; friendName: string; avatarUrl: string | null };
  // Venneadministrasjon (pushes fra Bibliotek). Tar en valgfri kode fra
  // dyplenke-invitasjonen (puslespill://join?code=…).
  Friends: { code?: string } | undefined;
  LoansHub: undefined;
  LoanHistory: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppNavigator} />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="NewSession"
        component={NewSessionScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen
        name="EditSession"
        component={EditSessionScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="FriendCollection" component={FriendCollectionScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="LoansHub" component={LoansHubScreen} />
      <Stack.Screen name="LoanHistory" component={LoanHistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
