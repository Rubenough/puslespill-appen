# 🧩 Puslespill-appen

En sosial app for vennegjenger som pusler mye sammen — del samlinger, lån puslespill, og følg hverandres øktlogger.

## Kom i gang

```bash
npm install
npx expo start
```

Scan QR-koden med Expo Go (iOS/Android) eller kjør i simulator.

## Stack

- **React Native** via Expo (managed workflow)
- **TypeScript** — strict mode
- **NativeWind** — Tailwind CSS for React Native
- **React Navigation** — Bottom Tab Navigator
- **Supabase** — database, auth og bildeopplasting
- **Expo Vector Icons** — Ionicons

## Navigasjon

Tab-bar: Feed | Samlinger | + | Utlån | Profil

- **Samlinger** har sub-tabs: Min samling / Venner / Ønskeliste
- **+** åpner en modal med valg: Start ny økt / Lån ut / Legg til spill

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
