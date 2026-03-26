import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppNavigator from "./AppNavigator";
import AddItemScreen from "../screens/AddItemScreen";
import { type ItemType } from "../utils/collections";

export type RootStackParamList = {
  Tabs: undefined;
  AddItem: { type: ItemType };
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
    </Stack.Navigator>
  );
}