import React from "react";
import { View, Text } from "react-native";

// Et innlegg i feeden (f.eks. utlån eller fullført puslespill)
export default function FeedCard() {
  return (
    <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
      <Text className="text-content dark:text-content-dark">Feed-kort</Text>
      {/* Avatar, navn, handling, bilde og knapper her */}
    </View>
  );
}
