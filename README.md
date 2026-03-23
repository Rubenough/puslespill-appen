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
- **Supabase** — database, auth og bildeopplasting *(ikke satt opp ennå)*

## Mappestruktur

```
src/
├── navigation/     # App-navigasjon
├── screens/        # En fil per skjerm
└── components/     # Gjenbrukbare UI-komponenter
```

## Dokumentasjon

Se [puslespill-app.md](puslespill-app.md) for fullstendig prosjektdokumentasjon, konsept og fremdrift.