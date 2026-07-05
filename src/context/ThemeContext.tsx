import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { colorScheme } from "nativewind";
import { getItemAsync, setItemAsync } from "expo-secure-store";

export const THEME_KEY = "app_theme";

// "system" følger enhetens fargeskjema; "light"/"dark" overstyrer det.
export type ThemePreference = "light" | "dark" | "system";
export const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  // false til lagret valg er lest fra SecureStore (brukes til å holde splash til temaet er klart)
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  // Les lagret temavalg ved oppstart og påfør det før splash skjules (unngår blink).
  useEffect(() => {
    let active = true;
    (async () => {
      let pref: ThemePreference = "system";
      try {
        const saved = await getItemAsync(THEME_KEY);
        if (isThemePreference(saved)) pref = saved;
      } catch {
        // Faller tilbake til "system" hvis lesing feiler.
      } finally {
        colorScheme.set(pref);
        if (active) {
          setPreferenceState(pref);
          setReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Påfør umiddelbart for responsivt UI; lagring skjer i bakgrunnen.
  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    colorScheme.set(pref);
    setItemAsync(THEME_KEY, pref).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
