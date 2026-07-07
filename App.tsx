import "./global.css";
import "./src/lib/i18n";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { loadPersistedLanguage } from "./src/lib/i18n";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import RootNavigator, { type RootStackParamList } from "./src/navigation/RootNavigator";
import AuthScreen from "./src/screens/AuthScreen";
import { ProfilProvider } from "./src/context/ProfilContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import ErrorBoundary from "./src/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

// Dyplenke: puslespill://join?code=XYZ åpner Venner-fanen med koden forhåndsutfylt.
// Bruker det eksisterende app.json-skjemaet «puslespill» (samme som OAuth), så
// ingen native-endring/ombygging trengs — dette er ren JS-ruting.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["puslespill://"],
  config: {
    screens: {
      Tabs: {
        screens: {
          Venner: "join",
        },
      },
    },
  },
};

function AppContent() {
  const { session, loading } = useAuth();
  // Hold splash til lagret tema er lest, ellers blinker feil fargeskjema ved oppstart.
  const { ready: themeReady } = useTheme();

  // Last inn lagret språkvalg (overstyrer enhetens språk) ved oppstart.
  useEffect(() => {
    loadPersistedLanguage();
  }, []);

  useEffect(() => {
    if (!loading && themeReady) {
      SplashScreen.hideAsync();
    }
  }, [loading, themeReady]);

  if (loading || !themeReady) return null;

  return (
    <NavigationContainer linking={linking}>
      {session ? (
        <ProfilProvider>
          <RootNavigator />
        </ProfilProvider>
      ) : (
        <AuthScreen />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
