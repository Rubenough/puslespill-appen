import "./global.css";
import "./src/lib/i18n";
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { loadPersistedLanguage } from "./src/lib/i18n";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import AuthScreen from "./src/screens/AuthScreen";
import { ProfilProvider } from "./src/context/ProfilContext";
import ErrorBoundary from "./src/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { session, loading } = useAuth();

  // Last inn lagret språkvalg (overstyrer enhetens språk) ved oppstart.
  useEffect(() => {
    loadPersistedLanguage();
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) return null;

  return (
    <NavigationContainer>
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
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
