import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthScreen from "./src/screens/AuthScreen";
import { supabase } from "./src/lib/supabase";
import { ProfilProvider } from "./src/context/ProfilContext";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      {session ? (
        <ProfilProvider>
          <AppNavigator />
        </ProfilProvider>
      ) : (
        <AuthScreen />
      )}
    </NavigationContainer>
  );
}
