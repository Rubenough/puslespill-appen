# Security & Code Quality — Åpne funn

> Oppdatert mars 2026.
> Fiks i prioritert rekkefølge. Slett eller kryss av etter hvert.

---

## ✅ Løst

### ~~1. Hardkodet IP-adresse i redirect URI~~
Erstattet med `makeRedirectUri()` fra `expo-auth-session`. Løst.

### ~~2. Ukryptert tokenlagring~~
`AsyncStorage` erstattet med `ExpoSecureStoreAdapter` + `expo-secure-store`. Tokens lagres nå i Keychain (iOS) / Keystore (Android). Session-tokens > 2048 bytes deles automatisk i biter. Løst.

### ~~6. `null`-rendering under innlasting~~
`SplashScreen.preventAutoHideAsync()` brukes i `App.tsx`. Splash vises til auth er sjekket. Løst.

### ~~9. Ingen logout-funksjon~~
`ProfileScreen` har nå en «Logg ut»-knapp via `supabase.auth.signOut()`. Løst.

---

## 🟡 Medium

### 3. Manuell URL-parsing i stedet for PKCE
**Fil:** `src/screens/AuthScreen.tsx`

Tokens parses manuelt fra URL-fragmentet (`#access_token=...`). Dette er implicit OAuth flow.
PKCE-flow (`exchangeCodeForSession`) er sikrere, men krever at Supabase-prosjektet er konfigurert med PKCE og at redirect-URL er riktig registrert.

**Nåværende status:** Fungerer med implicit flow. Ikke bytt uten å konfigurere Supabase-dashboardet først.

---

### 4. Stille feil i OAuth-flyten
**Fil:** `src/screens/AuthScreen.tsx`

Auth feiler uten tilbakemelding til brukeren. `WebBrowser`-resultat med `type === "cancel"` eller `"error"` er ikke håndtert. Ingen try-catch.

**Fix:** Legg til try-catch + feilmeldinger som vises til brukeren.

---

### 5. Profilhenting har ingen feiltilstand
**Fil:** `src/context/ProfilContext.tsx`

```typescript
fetchProfile();  // ingen catch, ingen error state
```

Nettverksfeil eller Supabase-feil er usynlige — `profil` forblir `null` uten forklaring.

**Fix:** Legg til error state i konteksten + retry-logikk.

---

### 7. Uvalidert `avatarUrl` lastes direkte inn i `<Image>`
**Fil:** `src/components/UserAvatar.tsx`

```typescript
source={{ uri: avatarUrl }}  // fra DB, ingen validering
```

**Fix:** Hvitlist Supabase storage-URLer (`*.supabaseusercontent.com`).

---

### 8. Ingen nettverksrobusthet
Gjelder alle skjermer. Ingen loading-states, ingen retry, ingen offline-deteksjon.

---

## 🟢 Mindre / Rydding

### ~~10. `as any`-cast i AppNavigator~~
`IoniconsName` derivert fra `ComponentProps<typeof Ionicons>["name"]` og brukt som type på `MODAL_ITEMS`. Løst.

---

### ~~11. Ingen error boundaries~~
`ErrorBoundary`-komponent opprettet i `src/components/ErrorBoundary.tsx` og lagt øverst i `App.tsx`. Viser feilmelding + «Prøv igjen»-knapp ved render-krasj. Løst.

---

### 12. Mock-data i produksjonskode
**Fil:** `src/screens/FeedScreen.tsx`

`MOCK_SESSIONS` og `MOCK_FEED` er hardkodet. Trenger en klar strategi for å bytte til ekte data.

---

## Gjenstående tiltaksliste

- [ ] 🟡 Legg til try-catch + brukervennlige feilmeldinger i auth-flyt (`AuthScreen.tsx`)
- [ ] 🟡 Legg til error state og retry i `ProfilContext`
- [ ] 🟡 Valider `avatarUrl` mot hvitliste (`UserAvatar.tsx`)
- [ ] 🟡 Vurder PKCE-flow når Supabase-dashboardet er konfigurert
- [ ] 🟢 Erstatt mock-data med ekte Supabase-kall (`FeedScreen.tsx`)
