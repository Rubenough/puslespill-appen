// Rene hjelpere for auth — ingen React/Supabase-avhengigheter, så de kan testes isolert.

export type OAuthTokens = {
  access_token: string;
  refresh_token: string;
};

/**
 * Trekker ut access/refresh-token fra OAuth-redirect-URL-en Supabase returnerer.
 * Tokens ligger i URL-fragmentet (`#access_token=…&refresh_token=…`).
 * Returnerer null om fragmentet mangler eller et token ikke finnes.
 */
export function parseOAuthRedirect(url: string): OAuthTokens | null {
  const hash = url.split("#")[1];
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}
