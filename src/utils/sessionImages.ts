import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

const BUCKET = "session-images";
// Signerte URL-er er kortlivde av personvern-/GDPR-hensyn (bildene kan vise
// identifiserbare personer). Skjermene henter på nytt ved fokus, så 1 time holder.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Leser en lokal bilde-URI og laster den opp til `session-images`.
 * Returnerer LAGRINGSSTIEN (ikke en URL) — den lagres i DB. Bildet vises senere
 * via en signert URL (se getSignedUrl / getSignedUrls). Kaster ved feil.
 */
export async function uploadSessionImage(path: string, uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: "image/jpeg" });

  if (error) throw error;
  return path;
}

/** Sletter bilder fra bucketen. Best-effort — feil svelges bevisst. */
export async function removeSessionImages(values: (string | null)[]): Promise<void> {
  const paths = values.map(toStoragePath).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

/**
 * Normaliserer en verdi til en ren lagringssti. Godtar både:
 * - en lagringssti (`userId/økt/123.jpg`) — nye rader
 * - en full offentlig/signert URL (`.../session-images/<sti>?token=…`) — eldre rader
 */
export function toStoragePath(value: string | null): string | null {
  if (!value) return null;
  const marker = `/${BUCKET}/`;
  const raw = value.includes(marker) ? (value.split(marker)[1] ?? "") : value;
  // Fjern ev. query-streng (signerte URL-er har `?token=…`).
  const path = raw.split("?")[0];
  return path || null;
}

/** @deprecated Bruk toStoragePath — beholdt for lesbarhet i slettelogikk. */
export const storagePathFromUrl = toStoragePath;

/** Signerer én verdi (sti eller eldre URL) → signert URL, eller null ved feil. */
export async function getSignedUrl(value: string | null): Promise<string | null> {
  const path = toStoragePath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Signerer flere verdier i ett kall. Returnerer en Map fra den ORIGINALE
 * inn-verdien (slik den ligger i state/DB) til den signerte URL-en.
 * Verdier som ikke kan signeres utelates fra kartet.
 */
export async function getSignedUrls(
  values: (string | null)[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  const uniquePaths = Array.from(
    new Set(values.map(toStoragePath).filter((p): p is string => !!p)),
  );
  if (uniquePaths.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return result;

  const signedByPath = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
  }

  for (const value of values) {
    if (!value) continue;
    const path = toStoragePath(value);
    const signed = path ? signedByPath.get(path) : undefined;
    if (signed) result.set(value, signed);
  }
  return result;
}
