import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppNavigator from "./AppNavigator";
import AddItemScreen from "../screens/AddItemScreen";
import EditItemScreen from "../screens/EditItemScreen";
import NewSessionScreen from "../screens/NewSessionScreen";
import SessionDetailScreen from "../screens/SessionDetailScreen";
import EditSessionScreen from "../screens/EditSessionScreen";
import { type ItemType, type Item } from "../utils/collections";

export type RootStackParamList = {
  Tabs: undefined;
  AddItem: { type: ItemType };
  EditItem: { item: Item; type: ItemType };
  NewSession: { itemId?: string };
  SessionDetail: { sessionId: string };
  EditSession: { sessionId: string; guestNames: string[]; notes: string | null };
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
    </Stack.Navigator>
  );
}
