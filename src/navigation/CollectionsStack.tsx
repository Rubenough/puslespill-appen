import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CollectionsScreen from "../screens/CollectionsScreen";
import CollectionDetailScreen from "../screens/CollectionDetailScreen";
import LoanHistoryScreen from "../screens/LoanHistoryScreen";
import { type ItemType } from "../utils/collections";

export type CollectionsStackParamList = {
  CollectionsList: undefined;
  CollectionDetail: { type: ItemType };
  LoanHistory: undefined;
};

const Stack = createNativeStackNavigator<CollectionsStackParamList>();

export default function CollectionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CollectionsList" component={CollectionsScreen} />
      <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      <Stack.Screen name="LoanHistory" component={LoanHistoryScreen} />
    </Stack.Navigator>
  );
}
