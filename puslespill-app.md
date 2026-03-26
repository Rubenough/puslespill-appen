# Puslespill-appen — Prosjektdokumentasjon

> Versjon 0.6 — Mars 2026

---

## Konsept

En sosial app for en vennegjeng/nabogjeng som samler på fysiske ting og deler dem med hverandre. Appen fungerer som et mini-biblioteksystem kombinert med en sosial aktivitetslogg — alle kan se hva andre eier, låne og bytte seg imellom, og følge hverandres aktiviteter.

Appen lanseres med to samlingstyper: **puslespill** og **brettspill**. Med mulighet til å utvide til andre som **bøker og filmer** senere. Arkitekturen er generisk fra dag én, slik at nye kategorier kan legges til uten å bygge om kjernelogikken.

**Langsiktig visjon:** Finn.no-integrasjon eller tise for salg kan vurderes på et senere tidspunkt, men appen er ikke en salgsplattform.

---

## Målgruppe

- En lukket vennegjeng / nabogjeng
- Deler, bytter og låner fysiske ting
- Sosiale brukere — ikke hardcore statistikk-fokuserte
- Interessert i hva venner leser, ser, spiller og pusler

---

## Navigasjonsstruktur

### Bottom tab-bar

| Fane      | Innhold                                               |
| --------- | ----------------------------------------------------- |
| Feed      | Aktivitetsstrøm fra venner + aktive økter du er med i |
| Samlinger | Dine samlingstyper + utlånt nå                        |
| + (modal) | Legg til i samlingen / Start ny økt / Registrer utlån |
| Venner    | Liste over venner du følger, søk etter nye            |
| Profil    | Profil, statistikk og innstillinger                   |

Utlånsoversikt lever som en seksjon ("UTLÅNT NÅ") inne i Samlinger-skjermen — ikke som egen tab.

### Samlinger

Én skjerm med:

- Liste over samlingstyper (Puslespill, Brettspill) med antall og utlånt-indikator
- Seksjon "UTLÅNT NÅ" — aktive utlån på tvers av alle kategorier
- Trykk på en kategori åpner detaljvisning for den samlingstypen

### +-modal (bottom sheet)

Tittel: "Hva vil du gjøre?" — tre valg:

1. **Legg til i samlingen** — Puslespill, brettspill
2. **Start ny økt** — Logg en aktivitet
3. **Registrer utlån** — Lån ut til en venn

---

## Feed

Aktivitetsstrøm som er type-agnostisk — samme kortformat for alle samlingstyper, med ikon som viser kategori.

### Hendelsestyper i feed

| Type        | Eksempel                                        |
| ----------- | ----------------------------------------------- |
| `added`     | Ole la til "Sapiens" i boksamlingen sin         |
| `started`   | Petter startet en økt — Kinkaku-ji 1000 brikker |
| `completed` | Turid fullførte Wingspan                        |
| `loaned`    | Lars lånte ut Catan til Kari                    |

### Aktive økter

Horisontal scroll øverst i Feed. Viser kun:

- Din egen aktive økt
- Økter andre har lagt deg til i som deltaker

Vennenes egne separate økter vises i Feed som `started`-hendelse, ikke i aktive økter.

---

## Skjermstatus

| Skjerm            | Status                                              |
| ----------------- | --------------------------------------------------- |
| AuthScreen        | Fungerer — Google OAuth med feilhåndtering          |
| FeedScreen        | Mock-data — kobles til Supabase i Fase 3            |
| CollectionsScreen | Mock-data — kobles til Supabase i Fase 2            |
| FriendsScreen     | Mock-data — kobles til Supabase i Fase 5            |
| ProfileScreen     | Avatar/navn fra ekte profil, statistikk mock Fase 5 |

---

## Wireframes

### Samlinger

Liste over kategorier, hver rad: ikon, navn, antall stk, utlånt-indikator. Under: "UTLÅNT NÅ" med aktive utlån, antall dager ute, hvem som har det.

### Venner

Søkefelt øverst. Liste over venner du følger: avatar, navn, antall felles i samlingen, sist aktiv. Trykk på en person åpner profilen deres.

### Ny økt-flyt

Fullskjerm med tilbake-pil. Seksjoner:

- **VELG GJENSTAND** — søkbart kort, valgt gjenstand vises med grønn hake
- **DELTAKERE** — chips med initialer + navn, × for å fjerne, "+ Legg til"-knapp
- **BILDE (VALGFRITT)** — stiplet boks, "Ta eller velg bilde"
- **NOTAT (VALGFRITT)** — fritekstfelt
- Stor grønn **"Start økt"**-knapp nederst

### Innlogging/onboarding

Toppsektion med app-ikon og tagline. To knapper: "Fortsett med Google" og "Fortsett med Apple".

---

## Funksjoner

### Samlingsregister (kjerne)

- Hver bruker har sin samling per kategori (puslespill, brettspill)
- Per gjenstand: bilde, tittel, metadata (f.eks. brikkantall for puslespill, spillerantall for brettspill), status
- Status: _Tilgjengelig / Utlånt / Pakket bort_

### Utlånsregister (kjerne)

- Registrer utlån via +-modal eller direkte fra et objekt i samlingen
- Begge parter får notifikasjon
- Utlånsoversikt lever i Samlinger-skjermen
- Enkel "lever tilbake"-knapp
- Valgfri påminnelse etter X uker

### Aktivitetslogg (kjerne)

- Opprett en økt via +-modal: velg gjenstand, legg til deltakere, ta bilde, skriv notat
- Venner kan se loggen i feeden
- Enkel statistikk: dato, hvem som var med

### Ønskeliste (fremtidig)

- Alle kan se hverandres ønskelister
- "Be om å låne"-knapp når noen i gjengen allerede eier gjenstanden

---

## Teknisk stack

| Del            | Teknologi                                |
| -------------- | ---------------------------------------- |
| App            | React Native 0.83.2 (Expo 55)            |
| Auth           | Supabase Auth (Google + Apple)           |
| Database       | Supabase PostgreSQL                      |
| Bilder         | Supabase Storage                         |
| Notifikasjoner | Expo Notifications                       |
| Styling        | NativeWind 4 (Tailwind CSS)              |
| Navigasjon     | React Navigation 7 (Bottom Tabs + Modal) |

---

## Plattform

- iOS og Android (via React Native / Expo)
- Innlogging med Google- eller Apple-konto

---

## Fremgang

### ✅ Gjort

**Grunnoppsett**

- [x] Initialisert Expo-prosjekt med React Native og TypeScript
- [x] Satt opp NativeWind (Tailwind CSS) for styling
- [x] Laget fullstendig fargesystem med lys/mørk modus og WCAG AA-tilgjengelighet
- [x] Satt opp React Navigation med Bottom Tab Navigator
- [x] App-ikoner og splash screen konfigurert for iOS og Android
- [x] Prosjekt publisert på GitHub

**UI-komponenter**

- [x] `Header` — toppbar med app-navn og bjelle-ikon (avatar fjernet)
- [x] `UserAvatar` — gjenbrukbar avatar med bilde eller initialer, deterministisk farge per person
- [x] `ActiveSessionCard` — "Din økt" med grønn border, vennekort med avatar og fremdrift
- [x] `FeedCard` — type-agnostisk med støtte for added / started / completed / loaned (puslespill + brettspill)
- [x] `FeedScreen` — horisontal økt-scroll + vertikal feed, mock-data klar til Supabase-kobling
- [x] `CollectionsScreen` — samlingstyper med antall + utlånt nå, mock-data
- [x] `ProfileScreen` — avatar og navn fra ekte ProfilContext, statistikkrad, logg ut
- [x] `FriendsScreen` — søkefelt + venneliste, mock-data
- [x] `ErrorBoundary` — fanger render-krasj, viser generisk norsk feilmelding

**Supabase og auth**

- [x] Supabase-prosjekt opprettet (Frankfurt)
- [x] Databaseskjema: `profiles`, `puzzles`, `sessions`, `session_participants`, `loans`
- [x] Row Level Security (RLS) aktivert og policies satt opp på alle tabeller
- [x] Supabase-klient med `ExpoSecureStoreAdapter` (erstatter AsyncStorage)
- [x] Google OAuth innlogging fungerer i Expo Go
- [x] `AuthScreen` — innloggingsskjerm med Google-knapp
- [x] `App.tsx` styrer auth-tilstand
- [x] Supabase-trigger oppretter profil automatisk ved første innlogging
- [x] `ProfilContext` eksponerer `{ profil, loading, error, retry }` med feilhåndtering
- [x] `AuthScreen` — feilhåndtering med `Alert` på alle OAuth failure modes

**Navigasjon**

- [x] Tab-bar: Feed | Samlinger | + | Venner | Profil (symmetrisk med + i sentrum)
- [x] Utlån fjernet som egen tab — lever som seksjon i Samlinger
- [x] +-knapp åpner bottom sheet modal (UI ferdig, handlinger kobles til i Fase 3)
- [x] Safe area håndtert korrekt på alle skjermer

### 🔜 Plan videre

**Fase 2 — Samlinger**

- [x] Detaljvisning per samlingstype (f.eks. alle puslespill)
- [x] Legg til gjenstand via +-modal (tittel, metadata, bilde)
- [ ] Bildeopplasting via Supabase Storage
- [ ] Endre status på gjenstand (Tilgjengelig / Utlånt / Pakket bort)
- [ ] Koble CollectionsScreen til ekte Supabase-data

**Fase 3 — Aktive økter og feed**

- [ ] Koble handlinger i +-modal (Legg til / Start økt / Registrer utlån)
- [ ] Ny økt-flyt — velg gjenstand, legg til deltakere, ta bilde, skriv notat
- [ ] Koble FeedCard og ActiveSessionCard til ekte data fra Supabase
- [ ] Feed: kun aktive økter du er deltaker i (ikke alle venners private økter)

**Fase 4 — Utlån**

- [ ] Koble utlåns-seksjon i Samlinger til ekte data
- [ ] Registrer utlån via +-modal og fra objektvisning
- [ ] "Lever tilbake"-knapp som oppdaterer status
- [ ] Valgfri påminnelse etter X uker

**Fase 5 — Venner og profil**

- [ ] Koble FriendsScreen til ekte data (følger, søk)
- [ ] Vis vennens profil og samling
- [ ] Koble ProfileScreen fullt ut (statistikk, innstillinger)
- [ ] Ønskeliste — legg til og se egne ønsker
- [ ] "Be om å låne"-knapp når noen i gjengen eier gjenstanden

**Fase 6 — Polish**

- [ ] Push-notifikasjoner for utlån og bytte (Expo Notifications)
- [ ] Apple Sign-In + onboarding-skjerm
- [ ] Søk og filtrer på tvers av vennegjengens samlinger

---

## Mappestruktur

```
puslespill-appen/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx          # Bottom tab-navigasjon + +-modal
│   ├── screens/
│   │   ├── AuthScreen.tsx            # Innlogging med Google
│   │   ├── FeedScreen.tsx            # Aktivitetsfeed + aktive økter
│   │   ├── CollectionsScreen.tsx     # Samlingstyper + utlånt nå
│   │   ├── FriendsScreen.tsx         # Venneliste og søk
│   │   └── ProfileScreen.tsx         # Profil, statistikk og logg ut
│   ├── components/
│   │   ├── Header.tsx                # Toppbar med app-navn og bjelle
│   │   ├── UserAvatar.tsx            # Avatar med bilde eller initialer
│   │   ├── ActiveSessionCard.tsx     # Kort for pågående økt
│   │   ├── FeedCard.tsx              # Aktivitetskort i feed (type-agnostisk)
│   │   └── ErrorBoundary.tsx         # Fanger render-krasj
│   ├── context/
│   │   ├── AuthContext.tsx           # Session og auth-tilstand
│   │   └── ProfilContext.tsx         # { profil, loading, error, retry }
│   ├── utils/
│   │   ├── initials.ts               # getInitials og getAvatarColor
│   │   └── collections.ts            # ItemType, ITEM_ICONS, ITEM_LABELS
│   └── lib/
│       └── supabase.ts               # Supabase-klient med SecureStore
├── assets/                           # Ikoner og splash screen
├── App.tsx                           # Rotkomponent
├── tailwind.config.js                # Fargesystem og theme
└── global.css                        # Tailwind-direktiver
```
