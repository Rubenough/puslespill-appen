import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profil = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

const ProfilContext = createContext<Profil | null>(null);

export function ProfilProvider({ children }: { children: React.ReactNode }) {
  const [profil, setProfil] = useState<Profil | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data) setProfil(data);
    };

    fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") fetchProfile();
      if (event === "SIGNED_OUT") setProfil(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ProfilContext.Provider value={profil}>{children}</ProfilContext.Provider>
  );
}

export function useProfil() {
  return useContext(ProfilContext);
}
