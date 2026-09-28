import { getSignedUrl, getSignedUrls } from "./sessionImages";

// profiles.avatar_url kan være to former:
// - en full https-URL (Google-avatar fra OAuth) — brukes direkte
// - en lagringssti i session-images-bucketen (`<userId>/avatar/…`) — må signeres
// Disse hjelperne ruter riktig form til riktig håndtering, slik at alle
// visningssteder (UserAvatar/Image) alltid får en visbar URL.

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Én verdi → visbar URL. https-URL-er passerer urørt; stier signeres. */
export async function resolveAvatarUrl(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  if (isHttpUrl(value)) return value;
  return getSignedUrl(value);
}

/**
 * Flere verdier → Map fra original verdi til visbar URL (batch-signering av
 * stier i ett kall). https-URL-er mappes til seg selv. Verdier som ikke kan
 * signeres utelates — kall-siden faller tilbake til initial-avatar.
 */
export async function resolveAvatarUrls(
  values: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const toSign: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (isHttpUrl(value)) result.set(value, value);
    else toSign.push(value);
  }
  if (toSign.length > 0) {
    const signed = await getSignedUrls(toSign);
    for (const [original, url] of signed) result.set(original, url);
  }
  return result;
}

/**
 * Bekvemmelighet for profilrader: returnerer nye rader der `avatar_url` er
 * byttet ut med en visbar URL (eller null hvis den ikke kunne signeres).
 */
export async function resolveProfileAvatars<T extends { avatar_url: string | null }>(
  rows: T[],
): Promise<T[]> {
  const resolved = await resolveAvatarUrls(rows.map((r) => r.avatar_url));
  return rows.map((r) => ({
    ...r,
    avatar_url: r.avatar_url ? (resolved.get(r.avatar_url) ?? null) : null,
  }));
}
