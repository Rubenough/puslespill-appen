import { useCallback, useEffect, useState } from "react";
import { getItemAsync, setItemAsync } from "expo-secure-store";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// «Sett»-flagget lagres kryptert (samme SecureStore som sesjonen). Fullføring
// avledes live fra data (≥1 egen gjenstand / ≥1 vennskap), så listen huker av
// seg selv uansett hvor stegene ble utført.
const DISMISSED_KEY = "onboarding_checklist_dismissed";

export type OnboardingChecklist = {
  /** Skal kortet vises øverst i feeden? */
  visible: boolean;
  hasItem: boolean;
  hasFriend: boolean;
  /** Begge stegene fullført → kortet viser ferdig-tilstanden. */
  complete: boolean;
  /** Oppdater avledet fullføring (kalles ved fokus). Best-effort. */
  refresh: () => Promise<void>;
  /** Skjul kortet permanent (persisteres). */
  dismiss: () => void;
};

export function useOnboardingChecklist(): OnboardingChecklist {
  const { user } = useAuth();
  // null = flagget er ikke lest ennå (vis ingenting før vi vet).
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [hasItem, setHasItem] = useState(false);
  const [hasFriend, setHasFriend] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getItemAsync(DISMISSED_KEY)
      .then((value) => {
        if (active) setDismissed(value === "true");
      })
      .catch(() => {
        if (active) setDismissed(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [itemsRes, friendsRes] = await Promise.all([
        supabase
          .from("items")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id),
        supabase
          .from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      ]);
      // Best-effort: ved feil beholder vi forrige tilstand i stedet for å blinke.
      if (itemsRes.error || friendsRes.error) return;
      setHasItem((itemsRes.count ?? 0) > 0);
      setHasFriend((friendsRes.count ?? 0) > 0);
      setLoaded(true);
    } catch {
      // Svelges bevisst — sjekklisten skal aldri velte feeden.
    }
  }, [user]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setItemAsync(DISMISSED_KEY, "true").catch(() => {});
  }, []);

  const complete = hasItem && hasFriend;

  return {
    visible: dismissed === false && loaded,
    hasItem,
    hasFriend,
    complete,
    refresh,
    dismiss,
  };
}
