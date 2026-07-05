import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { getItemAsync, setItemAsync } from "expo-secure-store";
import no from "../locales/no.json";
import en from "../locales/en.json";

export const LANGUAGE_KEY = "app_language";
export type AppLanguage = "no" | "en";
export const SUPPORTED_LANGUAGES: AppLanguage[] = ["no", "en"];

// Norsk er standard; alt annet enn engelsk faller tilbake til norsk.
function deviceLanguage(): AppLanguage {
  try {
    const code = Localization.getLocales()[0]?.languageCode ?? "no";
    return code.startsWith("en") ? "en" : "no";
  } catch {
    return "no";
  }
}

i18n.use(initReactI18next).init({
  resources: {
    no: { translation: no },
    en: { translation: en },
  },
  lng: deviceLanguage(),
  fallbackLng: "no",
  interpolation: { escapeValue: false },
});

// Leser lagret språkvalg (overstyrer enhetens språk) og bytter om det finnes.
export async function loadPersistedLanguage(): Promise<void> {
  const saved = (await getItemAsync(LANGUAGE_KEY)) as AppLanguage | null;
  if (saved && saved !== i18n.language) {
    await i18n.changeLanguage(saved);
  }
}

// Bytter språk og lagrer valget.
export async function setLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await setItemAsync(LANGUAGE_KEY, lang);
}

export default i18n;
