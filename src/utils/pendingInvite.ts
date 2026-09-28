import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

// Én ventende invitasjonskode fra en dyplenke som ble åpnet mens brukeren var
// utlogget. Lagres kryptert (samme SecureStore som sesjonen) og hentes/tømmes av
// Venner-skjermen etter innlogging. Koder er korte (< 2048 bytes), så ingen chunking.
const PENDING_INVITE_KEY = "pending_invite_code";

// Trekker ut ?code=… fra en puslespill://join-dyplenke. Store bokstaver, som
// resten av invitasjonsflyten. Returnerer null hvis lenken ikke har en kode.
export function parseInviteCode(url: string | null): string | null {
  if (!url) return null;
  const match = /[?&]code=([^&#]+)/.exec(url);
  if (!match) return null;
  const code = decodeURIComponent(match[1]).trim().toUpperCase();
  return code.length > 0 ? code : null;
}

export async function savePendingInviteCode(code: string): Promise<void> {
  await setItemAsync(PENDING_INVITE_KEY, code);
}

export async function getPendingInviteCode(): Promise<string | null> {
  return getItemAsync(PENDING_INVITE_KEY);
}

export async function clearPendingInviteCode(): Promise<void> {
  await deleteItemAsync(PENDING_INVITE_KEY).catch(() => {});
}
