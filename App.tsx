import "./global.css";
import "./src/lib/i18n";
import React, { useEffect } from "react";
import { Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  useNavigationContainerRef,
  type LinkingOptions,
} from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { loadPersistedLanguage } from "./src/lib/i18n";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import RootNavigator, { type RootStackParamList } from "./src/navigation/RootNavigator";
import AuthScreen from "./src/screens/AuthScreen";
import { ProfilProvider } from "./src/context/ProfilContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import {
  parseInviteCode,
  savePendingInviteCode,
  getPendingInviteCode,
} from "./src/utils/pendingInvite";

SplashScreen.preventAutoHideAsync();

// Dyplenke: puslespill://join?code=XYZ åpner Venner-skjermen (rot-ruten "Friends",
// pushet over Bibliotek-fanen) med koden forhåndsutfylt. Bruker det eksisterende
// app.json-skjemaet «puslespill» (samme som OAuth), så ingen native-endring/
// ombygging trengs — dette er ren JS-ruting.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["puslespill://"],
  config: {
    screens: {
      Friends: "join",
    },
  },
};

function AppContent() {
  const { session, loading } = useAuth();
  // Hold splash til lagret tema er lest, ellers blinker feil fargeskjema ved oppstart.
  const { ready: themeReady } = useTheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  // Last inn lagret språkvalg (overstyrer enhetens språk) ved oppstart.
  useEffect(() => {
    loadPersistedLanguage();
  }, []);

  // Fang invitasjonslenker som åpnes mens brukeren er utlogget: navigatoren er
  // ikke montert da (vi viser AuthScreen), så koden ville ellers gå tapt. Lagre
  // den i SecureStore; onReady under ruter den til Venner etter innlogging.
  useEffect(() => {
    if (session) return;
    async function capture(url: string | null) {
      const code = parseInviteCode(url);
      // Svelg SecureStore-skrivefeil bevisst — verre å krasje fangsten enn å miste én kode.
      if (code) await savePendingInviteCode(code).catch(() => {});
    }
    Linking.getInitialURL().then(capture);
    const sub = Linking.addEventListener("url", ({ url }) => capture(url));
    return () => sub.remove();
  }, [session]);

  useEffect(() => {
    if (!loading && themeReady) {
      SplashScreen.hideAsync();
    }
  }, [loading, themeReady]);

  // Når navigatoren er klar (mountes først etter innlogging): rut en eventuell
  // ventende invitasjonskode til Venner-skjermen. FriendsScreen forhåndsutfyller
  // og tømmer den.
  function handleNavReady() {
    getPendingInviteCode()
      .then((code) => {
        if (code) navigationRef.navigate("Friends", { code });
      })
      .catch(() => {});
  }

  if (loading || !themeReady) return null;

  // AuthScreen bruker ingen navigasjon — hold den utenfor NavigationContainer, så
  // containeren monteres først ved innlogging og onReady fyrer pålitelig etterpå.
  if (!session) return <AuthScreen />;

  return (
    <NavigationContainer ref={navigationRef} linking={linking} onReady={handleNavReady}>
      <ProfilProvider>
        <RootNavigator />
      </ProfilProvider>
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
