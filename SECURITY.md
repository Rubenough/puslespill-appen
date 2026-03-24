# Security & Code Quality — Åpne funn

> Generert mars 2026 via codebase-analyse.
> Fiks i prioritert rekkefølge. Slett eller kryss av etter hvert.

---

## 🔴 Kritisk

### 1. Hardkodet IP-adresse i redirect URI
**Fil:** `src/screens/AuthScreen.tsx`, linje 11

```typescript
const redirectUri = "exp://192.168.0.102:8081";
```

Lokal IP hardkodet — bryter auth på alle andre maskiner, nettverk og build-miljøer.

**Fix:** Bruk `Constants.expoConfig?.extra?.redirectUri` eller en env-variabel.

---

### 2. Ukryptert tokenlagring
**Fil:** `src/lib/supabase.ts`, linje 9

```typescript
storage: AsyncStorage,  // ukryptert på disk
```

Auth-tokens (inkl. refresh tokens) lagres som klartekst på enheten. På en kompromittert enhet er de lesbare.

**Fix:** Bytt ut `AsyncStorage` med `expo-secure-store` (bruker Keychain på iOS, Keystore på Android).

---

## 🟡 Medium

### 3. Manuell URL-parsing i stedet for Supabase sin innebygde håndtering
**Fil:** `src/screens/AuthScreen.tsx`, linje 30–37

`detectSessionInUrl` er satt til `false` i `supabase.ts`, men tokens parses manuelt fra URL etterpå. Unødvendig og skjørt.

**Fix:** Sett `detectSessionInUrl: true` og fjern manuell parsing.

---

### 4. Stille feil i OAuth-flyten
**Fil:** `src/screens/AuthScreen.tsx`, linje 23–41

Auth feiler uten tilbakemelding til brukeren. `WebBrowser`-resultat med `type === "cancel"` eller `"error"` er ikke håndtert. Ingen try-catch.

**Fix:** Legg til try-catch + feilmeldinger som vises til brukeren.

---

### 5. Profilhenting har ingen feiltilstand
**Fil:** `src/context/ProfilContext.tsx`, linje 15–31

```typescript
fetchProfile();  // ingen catch, ingen error state
```

Nettverksfeil eller Supabase-feil er usynlige — `profil` forblir `null` uten noen forklaring.

**Fix:** Legg til error state i konteksten + retry-logikk.

---

### 6. `null`-rendering under innlasting
**Fil:** `App.tsx`, linje ~27

```typescript
if (loading) return null;
```

Tom hvit skjerm mens auth sjekkes.

**Fix:** Vis en splash/laster-indikator i stedet.

---

### 7. Uvalidert `avatarUrl` lastes direkte inn i `<Image>`
**Fil:** `src/components/UserAvatar.tsx`, linje 15–22

```typescript
source={{ uri: avatarUrl }}  // fra DB, ingen validering
```

URL hentes fra databasen uten domenekontroll.

**Fix:** Hvitlist Supabase storage-URLer (`*.supabaseusercontent.com`).

---

### 8. Ingen nettverksrobusthet
Gjelder alle skjermer. Ingen loading-states, ingen retry, ingen offline-deteksjon.

---

## 🟢 Mindre / Rydding

### 9. Ingen logout-funksjon
`ProfileScreen` har ingen utloggingsknapp. Brukere kan ikke logge ut manuelt.

---

### 10. `as any`-cast i AppNavigator
**Fil:** `src/navigation/AppNavigator.tsx`, linje 212

```typescript
<Ionicons name={item.icon as any} ...>
```

**Fix:** Typen bør være `keyof typeof Ionicons.glyphMap`.

---

### 11. Ingen error boundaries
Enhver komponentkrasj krasjer hele appen.

**Fix:** Legg til én top-level error boundary i `App.tsx`.

---

### 12. Mock-data i produksjonskode
**Fil:** `src/screens/FeedScreen.tsx`, linje 7–42

`MOCK_SESSIONS` og `MOCK_FEED` er hardkodet. Trenger en klar strategi for å bytte til ekte data i rett tid.

---

## Prioritert tiltaksliste

- [ ] 🔴 Fix hardkodet IP i redirect URI (`AuthScreen.tsx:11`)
- [ ] 🔴 Bytt `AsyncStorage` med `expo-secure-store` (`supabase.ts:9`)
- [ ] 🟡 Sett `detectSessionInUrl: true`, fjern manuell token-parsing (`AuthScreen.tsx:30–37`)
- [ ] 🟡 Legg til try-catch + brukervennlige feilmeldinger i auth-flyt (`AuthScreen.tsx:23–41`)
- [ ] 🟡 Legg til error state og retry i `ProfilContext` (`ProfilContext.tsx:15–31`)
- [ ] 🟡 Erstatt `return null` med splash-skjerm (`App.tsx`)
- [ ] 🟡 Valider `avatarUrl` mot hvitliste (`UserAvatar.tsx:15–22`)
- [ ] 🟢 Implementer logout i `ProfileScreen`
- [ ] 🟢 Legg til error boundary i `App.tsx`
- [ ] 🟢 Fjern `as any`-cast i `AppNavigator.tsx:212`
