import "./global.css";
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import AuthScreen from "./src/screens/AuthScreen";
import { ProfilProvider } from "./src/context/ProfilContext";
import ErrorBoundary from "./src/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { session, loading } = useAuth();

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
