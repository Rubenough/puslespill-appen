import React from "react";
import { View, Text, Image } from "react-native";
import { getInitials, getAvatarColor } from "../utils/initials";

interface Props {
  name: string | null;
  avatarUrl?: string | null;
  size?: number;
}

export default function UserAvatar({ name, avatarUrl, size = 32 }: Props) {
  const { bg, text } = getAvatarColor(name);
  const fontSize = size * 0.35;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize, fontWeight: "600", color: text }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
