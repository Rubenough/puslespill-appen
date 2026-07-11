import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { resolveAvatarUrl } from "../utils/avatar";

type Profil = {
  id: string;
  full_name: string | null;
  /** Rå DB-verdi: Google-URL (https) eller opplastet lagringssti. */
  avatar_url: string | null;
  /** Visbar URL (signert sti eller passthrough) — bruk denne i UI. */
  avatarDisplayUrl: string | null;
};

type ProfilContextType = {
  profil: Profil | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
};

const ProfilContext = createContext<ProfilContextType>({
  profil: null,
  loading: true,
  error: null,
  retry: () => {},
});

export function ProfilProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (data) {
        // Opplastede avatarer lagres som stier og må signeres for visning;
        // Google-URL-er passerer urørt.
        const avatarDisplayUrl = await resolveAvatarUrl(data.avatar_url);
        setProfil({ ...data, avatarDisplayUrl });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Kunne ikke laste profil"));
      console.error("Profilhenting feilet:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchProfile();
    } else {
      setProfil(null);
      setError(null);
      setLoading(false);
    }
  }, [session, fetchProfile]);

  return (
    <ProfilContext.Provider value={{ profil, loading, error, retry: fetchProfile }}>
      {children}
    </ProfilContext.Provider>
  );
}

export function useProfil() {
  return useContext(ProfilContext);
}
