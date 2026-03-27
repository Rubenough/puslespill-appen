import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppNavigator from "./AppNavigator";
import AddItemScreen from "../screens/AddItemScreen";
import EditItemScreen from "../screens/EditItemScreen";
import NewSessionScreen from "../screens/NewSessionScreen";
import { type ItemType, type Item } from "../utils/collections";

export type RootStackParamList = {
  Tabs: undefined;
  AddItem: { type: ItemType };
  EditItem: { item: Item; type: ItemType };
  NewSession: { itemId?: string };
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
    </Stack.Navigator>
  );
}
