# 🧩 Puslespill-appen

En sosial app for vennegjenger som pusler mye sammen. Del samlinger, lån puslespill, og følg hverandres øktlogger.

## Kom i gang

Installer avhengigheter og start Metro:

```bash
npm install
npx expo start --dev-client
```

Prosjektet kjører på Expo SDK 55 og bruker development build i stedet for Expo Go. Du må derfor installere en development build på mobilen før du kan koble til Metro. Se seksjonen under.

## Development build

Prosjektet bruker `expo-dev-client` og bygges med EAS Build.

```bash
# Logg inn på Expo-kontoen din (én gang per maskin)
eas login

# Bygg development-APK for Android
eas build --profile development --platform android
```

Når bygget er ferdig får du en lenke og QR-kode fra EAS. Scan QR-koden fra mobilen, last ned APK-en, og installer. Deretter kjører du `npx expo start --dev-client` lokalt og åpner development build-appen, som automatisk kobler seg til Metro.

### Andre build-profiler

```bash
# Intern preview-build (APK for testbrukere)
eas build --profile preview --platform android

# Produksjonsbuild (AAB for Play Store)
eas build --profile production --platform android
```

Se `eas.json` for konfigurasjon av alle profiler.

## Stack

- **React Native** via Expo (managed workflow)
- **TypeScript** — strict mode
- **NativeWind** — Tailwind CSS for React Native
- **React Navigation** — Bottom Tab Navigator
- **Supabase** — database, auth og bildeopplasting
- **Expo Vector Icons** — Ionicons

## Navigasjon

Tab-bar: Feed | Samlinger | + | Venner | Profil

- **Samlinger** viser samlingstyper (puslespill, brettspill) + "UTLÅNT NÅ"-seksjon
- **+** åpner en modal med valg: Legg til i samlingen / Start ny økt / Registrer utlån

## Mappestruktur

```
src/
├── navigation/     # App-navigasjon og +-modal
├── screens/        # En fil per skjerm
├── components/     # Gjenbrukbare UI-komponenter
├── context/        # React Context (profil m.m.)
├── utils/          # Delte hjelpefunksjoner
└── lib/            # Supabase-klient
```

## Dokumentasjon

Se [puslespill-app.md](puslespill-app.md) for fullstendig prosjektdokumentasjon, konsept, wireframes og fremdrift.
