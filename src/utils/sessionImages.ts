import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

const BUCKET = "session-images";

/**
 * Leser en lokal bilde-URI, laster den opp til `session-images`-bucketen og
 * returnerer den offentlige URL-en. Kaster ved feil (både lese- og opplastingsfeil),
 * slik at kallstedet kan rydde opp og vise en feilmelding.
 */
export async function uploadSessionImage(path: string, uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: "image/jpeg" });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Sletter bilder fra bucketen. Best-effort — feil svelges bevisst. */
export async function removeSessionImages(paths: string[]): Promise<void> {
  const cleaned = paths.filter(Boolean);
  if (cleaned.length === 0) return;
  await supabase.storage.from(BUCKET).remove(cleaned);
}

/** Trekker ut lagringsstien fra en offentlig URL (`.../session-images/<path>`). */
export function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  return url.split(`/${BUCKET}/`)[1] ?? null;
}
