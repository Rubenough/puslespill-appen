import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function Header() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { t } = useTranslation();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-border dark:border-border-dark"
    >
      <View className="flex-row items-center justify-between px-[18px] py-3 border-b border-border dark:border-border-dark">
        <Text className="text-content dark:text-content-dark font-bold text-2xl">
          Fordriv
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Requests")}
          accessibilityRole="button"
          accessibilityLabel={t("requests.title")}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color="#78716C"
            accessible={false}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
