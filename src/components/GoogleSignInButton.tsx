import React from "react";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";

// Google-logo SVG som inline komponent
function GoogleLogo() {
  // Forenklet Google G i riktige farger
  return (
    <View className="w-5 h-5 items-center justify-center mr-3">
      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#4285F4" }}>G</Text>
    </View>
  );
}

type Props = {
  onPress: () => void;
  loading?: boolean;
};

export default function GoogleSignInButton({ onPress, loading = false }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#dadce0",
        width: "100%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#4285F4" />
      ) : (
        <>
          <GoogleLogo />
          <Text
            style={{
              color: "#3c4043",
              fontSize: 15,
              fontFamily: "System",
              fontWeight: "500",
              letterSpacing: 0.25,
            }}
          >
            Logg inn med Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
