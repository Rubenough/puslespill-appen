# Puslespill-appen — Prosjektdokumentasjon

> Versjon 0.7 — Mars 2026

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
- Seksjon "UTLÅNT NÅ" — aktive utlån på tvers av alle kategorier (ekte data fra `loans`)
- Trykk på en kategori åpner detaljvisning for den samlingstypen

### +-modal (bottom sheet)

Tittel: "Hva vil du gjøre?" — tre valg:

1. **Legg til i samlingen** — Puslespill, brettspill
2. **Start ny økt** — Logg en aktivitet
3. **Registrer utlån** — Lån ut til en venn

### Handlingsark på gjenstand

Trykk på en gjenstand i CollectionDetail åpner et bottom sheet med:

1. **Start økt** — grå/deaktivert hvis gjenstanden er utlånt
2. **Registrer utlån** / **Registrer retur** — bytter basert på status
3. **Rediger** — åpner forhåndsutfylt redigeringsskjerm
4. **Slett** — destruktiv, med bekreftelse

---

## Feed

Aktivitetsstrøm som er type-agnostisk — samme kortformat for alle samlingstyper, med ikon som viser kategori.

### Hendelsestyper i feed

| Type        | Eksempel                                        |
| ----------- | ----------------------------------------------- |
| `added`     | Ole la til "Sapiens" i boksamlingen sin         |
| `started`   | Petter startet en økt — Kinkaku-ji 1000 brikker |
| `completed` | Turid fullførte Wingspan                        |
| `loaned`    | Lars lånte ut Catan                             |

### Aktive økter

Horisontal scroll øverst i Feed. Viser kun:

- Din egen aktive økt
- Økter andre har lagt deg til i som deltaker

Vennenes egne separate økter vises i Feed som `started`-hendelse, ikke i aktive økter.

---

## Personvern: utlån

- Lån er **private som standard** (`is_public = false`)
- `is_public = true` viser at du har lånt ut i feeden — **ikke hvem til**
- Låntakers navn er kun synlig for eieren, aldri andre brukere
- Fremtidig: låntaker kan velges fra venneliste (`borrower_user_id`), men fritekst-navn støttes alltid for folk uten appen

---

## Skjermstatus

| Skjerm                  | Status                                                        |
| ----------------------- | ------------------------------------------------------------- |
| AuthScreen              | Ferdig — Google OAuth med feilhåndtering                      |
| FeedScreen              | Mock-data — kobles til Supabase i Fase 3                      |
| CollectionsScreen       | Ferdig — ekte data fra Supabase, inkl. "UTLÅNT NÅ"-seksjon   |
| CollectionDetailScreen  | Ferdig — ekte data, handlingsark med alle lånefunksjoner      |
| AddItemScreen           | Ferdig — insert til Supabase                                  |
| EditItemScreen          | Ferdig — forhåndsutfylt update til Supabase                   |
| FriendsScreen           | Mock-data — kobles til Supabase i Fase 5                      |
| ProfileScreen           | Hybrid — avatar/navn ekte, statistikk mock                    |
| LoansScreen             | Ikke i bruk (utlån lever i CollectionsScreen)                 |
| NewSessionScreen        | Placeholder — implementeres i Fase 3                          |

---

## Wireframes

### Samlinger

Liste over kategorier, hver rad: ikon, navn, antall stk, utlånt-indikator. Under: "UTLÅNT NÅ" med aktive utlån — gjenstandsnavn, låntaker og antall dager siden utlån.

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
- Per gjenstand: tittel, metadata (brikkantall/vanskelighetsgrad for puslespill, spillerantall for brettspill), merke, status
- Status: _Tilgjengelig / Utlånt_
- Rediger og slett gjenstand direkte fra handlingsarket

### Utlånsregister (kjerne)

- Registrer utlån fra handlingsark på gjenstand
- Fritekst-navn på låntaker (fremtidig: velg fra venneliste)
- Synlighets-toggle: vis i feed uten å avsløre hvem som låner
- "Registrer retur" setter `returned_at` og oppdaterer status
- Utlånsoversikt lever i Samlinger-skjermen ("UTLÅNT NÅ")
- Valgfri påminnelse etter X uker (fremtidig)

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

- [x] `Header` — toppbar med app-navn og bjelle-ikon
- [x] `UserAvatar` — gjenbrukbar avatar med bilde eller initialer, deterministisk farge per person
- [x] `ActiveSessionCard` — "Din økt" med grønn border, vennekort med avatar og fremdrift
- [x] `FeedCard` — type-agnostisk med støtte for added / started / completed / loaned
- [x] `ErrorBoundary` — fanger render-krasj, viser generisk norsk feilmelding

**Supabase og auth**

- [x] Supabase-prosjekt opprettet (Frankfurt)
- [x] Databaseskjema: `profiles`, `items`, `loans`, `sessions`, `session_participants`
- [x] Row Level Security (RLS) aktivert og policies satt opp
- [x] Supabase-klient med `ExpoSecureStoreAdapter` (erstatter AsyncStorage, chunker tokens > 2048 bytes)
- [x] Google OAuth innlogging fungerer i Expo Go
- [x] Supabase-trigger oppretter profil automatisk ved første innlogging
- [x] `ProfilContext` eksponerer `{ profil, loading, error, retry }` med feilhåndtering

**Navigasjon**

- [x] Tab-bar: Feed | Samlinger | + | Venner | Profil (symmetrisk med + i sentrum)
- [x] `RootNavigator` — Stack som wrapper tabs + AddItem og EditItem som modaler
- [x] `CollectionsStack` — Stack for CollectionsList → CollectionDetail
- [x] +-knapp åpner bottom sheet modal med tre valg
- [x] Safe area håndtert korrekt på alle skjermer

**Samlinger (Fase 2)**

- [x] `CollectionsScreen` — ekte data fra Supabase, samlingstyper med antall + utlånt-indikator
- [x] `CollectionsScreen` — "UTLÅNT NÅ"-seksjon med aktive lån fra `loans`-tabellen
- [x] `CollectionDetailScreen` — ekte data, items listet opp med metadata og status-badge
- [x] `CollectionDetailScreen` — handlingsark (bottom sheet) ved trykk på gjenstand
- [x] `AddItemScreen` — skjema for puslespill/brettspill, insert til Supabase
- [x] `EditItemScreen` — forhåndsutfylt redigeringsskjerm, update til Supabase

**Utlån (Fase 4 — delvis)**

- [x] Registrer utlån fra handlingsark: fritekst-navn på låntaker
- [x] Synlighets-toggle (offentlig/privat) — viser aktivitet i feed uten å avsløre låntaker
- [x] "Registrer retur" setter `returned_at` og oppdaterer status
- [x] Lån er private som standard — RLS sikrer at kun eier ser sine lån
- [x] "UTLÅNT NÅ" i CollectionsScreen viser gjenstandsnavn, låntaker og dager siden utlån

---

### 🔜 Plan videre

**Fase 3 — Aktive økter og feed**

- [ ] Ny økt-flyt — velg gjenstand, legg til deltakere, ta bilde, skriv notat, start økt
- [ ] "Start økt" i handlingsarket kobles til Ny økt-flyt med gjenstand forhåndsvalgt
- [ ] Koble FeedCard og ActiveSessionCard til ekte data fra Supabase
- [ ] Feed: kun aktive økter du er deltaker i (ikke alle venners private økter)
- [ ] `loaned`-hendelse i feed basert på `is_public = true` lån (uten å vise låntaker)

**Fase 4 — Utlån (resterende)**

- [ ] Valgfri påminnelse etter X uker (push-notifikasjon)
- [ ] Velg låntaker fra venneliste (`borrower_user_id`) i stedet for fritekst

**Fase 5 — Venner og profil**

- [ ] Koble FriendsScreen til ekte data (følger, søk)
- [ ] Vis vennens profil og samling
- [ ] Koble ProfileScreen fullt ut (statistikk, innstillinger)
- [ ] Ønskeliste — legg til og se egne ønsker
- [ ] "Be om å låne"-knapp når noen i gjengen eier gjenstanden

**Fase 6 — Polish**

- [ ] Push-notifikasjoner for utlån og retur (Expo Notifications)
- [ ] Apple Sign-In + onboarding-skjerm
- [ ] Søk og filtrer på tvers av vennegjengens samlinger
- [ ] Bildeopplasting via Supabase Storage

---

## Mappestruktur

```
puslespill-appen/
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx         # Stack: Tabs + AddItem + EditItem (modaler)
│   │   ├── AppNavigator.tsx          # Bottom tab-navigasjon + +-modal
│   │   └── CollectionsStack.tsx      # Stack: CollectionsList → CollectionDetail
│   ├── screens/
│   │   ├── AuthScreen.tsx            # Innlogging med Google
│   │   ├── FeedScreen.tsx            # Aktivitetsfeed + aktive økter (mock)
│   │   ├── CollectionsScreen.tsx     # Samlingstyper + utlånt nå (ekte data)
│   │   ├── CollectionDetailScreen.tsx # Gjenstander + handlingsark (ekte data)
│   │   ├── AddItemScreen.tsx         # Legg til gjenstand
│   │   ├── EditItemScreen.tsx        # Rediger gjenstand
│   │   ├── FriendsScreen.tsx         # Venneliste og søk (mock)
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
│   │   └── collections.ts            # ItemType, Item, ITEM_ICONS, ITEM_LABELS
│   └── lib/
│       └── supabase.ts               # Supabase-klient med SecureStore
├── assets/                           # Ikoner og splash screen
├── App.tsx                           # Rotkomponent
├── tailwind.config.js                # Fargesystem og theme
└── global.css                        # Tailwind-direktiver
```
