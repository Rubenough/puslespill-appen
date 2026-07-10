# Sentry — oppsett og aktivering

Krasjrapportering med [`@sentry/react-native`](https://docs.sentry.io/platforms/react-native/manual-setup/expo/)
er **ferdig koblet i koden, men sover til den får konfigurasjon**. Uten DSN er alt en
no-op: ingen init, ingen nettverkstrafikk, jest/CI upåvirket.

## Hva som allerede er på plass (denne branchen)

| Hvor                               | Hva                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                          | `Sentry.init({ dsn })` + `Sentry.wrap(App)` — begge **kun** når `EXPO_PUBLIC_SENTRY_DSN` er satt. `sendDefaultPii: false` (GDPR).                                                  |
| `src/components/ErrorBoundary.tsx` | `componentDidCatch` → `Sentry.captureException(error, { extra: { componentStack } })`, bak samme env-guard, i tillegg til `console.error` som før.                                 |
| `app.json`                         | Config-pluginen `@sentry/react-native/expo` med **plassholderverdier** (`placeholder-org` / `placeholder-project`) — app.json kan ikke ha kommentarer, så dokumentasjonen bor her. |
| `metro.config.js`                  | `getSentryExpoConfig` (debug-ID-er i sourcemaps) komponert med NativeWinds `withNativeWind` — verifisert at begge deler er aktive.                                                 |

## Aktivering — steg for steg

1. **Opprett prosjekt** på sentry.io (plattform «React Native») og noter
   _organization slug_, _project slug_ og _DSN_.

2. **Fyll inn i `app.json`** — erstatt plassholderne under `plugins`:

   ```json
   [
     "@sentry/react-native/expo",
     {
       "url": "https://sentry.io/",
       "organization": "<din-org-slug>",
       "project": "<din-project-slug>"
     }
   ]
   ```

3. **Sett DSN som miljøvariabel** (dette er bryteren som skrur alt på):
   - Lokalt: `EXPO_PUBLIC_SENTRY_DSN=https://…@….ingest.sentry.io/…` i `.env`
     (samme fil som Supabase-nøklene).
   - EAS: legg den inn som miljøvariabel/secret per profil i `eas.json` eller
     EAS-dashboardet, slik at den bakes inn i buildene.

4. **Sourcemap-opplasting** (lesbare stack traces i prod): pluginen laster opp
   sourcemaps under EAS-bygg, men trenger et auth-token. Lag et token med
   `project:releases`-scope på sentry.io og legg det som **EAS secret**:

   ```bash
   eas env:create --name SENTRY_AUTH_TOKEN --value <token> --scope project
   ```

   Uten tokenet bygger appen fortsatt — du mister bare symboliserte stack traces.

5. **Ny native build kreves.** Config-pluginen endrer det native laget
   (`npm run rebuild:check` bekrefter). Sentry aktiveres altså først i **neste**
   EAS-/dev-client-build — eksisterende builds og ren Metro-reload plukker ikke
   opp pluginen. JS-guarden gjør at gamle builds uten DSN bare fortsetter som før.

## Merknader

- `expo install` la inn den udekorerte pluginen `"@sentry/react-native"`; den er
  byttet til den dokumenterte `"@sentry/react-native/expo"`-formen med opsjoner.
- Metro-komposisjonen er anvendt (ikke bare dokumentert): `getSentryExpoConfig`
  erstatter `getDefaultConfig`-kallet og `withNativeWind` wrapper utenpå.
  Verifisert ved lasting: css-interop-transformeren, `sourceExts` med `css` og
  Sentrys `customSerializer` er alle til stede samtidig.
- Testene trenger ingen Sentry-mock i dag: ingen testet modul importerer
  `@sentry/react-native` transitivt (App.tsx og ErrorBoundary er ikke under test).
  Får ErrorBoundary tester senere, mock modulen i `jest.setup.js`.
