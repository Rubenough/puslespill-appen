# Puslespill-appen — Prosjektdokumentasjon

> Versjon 0.10 — April 2026 | Arbeidsnavn: **Fordriv**

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
| + (modal) | Legg til i samlingen / Start ny økt |
| Venner    | Liste over venner du følger, søk etter nye            |
| Profil    | Profil, statistikk og innstillinger                   |

Utlånsoversikt lever som en seksjon ("UTLÅNT NÅ") inne i Samlinger-skjermen — ikke som egen tab.

### Samlinger

Én skjerm med:

- Liste over samlingstyper (Puslespill, Brettspill) med antall og utlånt-indikator
- Seksjon "UTLÅNT NÅ" — aktive utlån på tvers av alle kategorier (ekte data fra `loans`)
- Trykk på en kategori åpner detaljvisning for den samlingstypen

### +-modal (bottom sheet)

Tittel: "Hva vil du gjøre?" — to valg:

1. **Legg til i samlingen** — Puslespill, brettspill
2. **Start ny økt** — Logg en aktivitet

"Registrer utlån" er fjernet fra +-modalen — utlån registreres direkte fra gjenstanden i CollectionDetailScreen, der konteksten er naturlig.

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

| Skjerm                  | Status                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------- |
| AuthScreen              | Ferdig — Google OAuth med feilhåndtering                                                        |
| FeedScreen              | Ekte data — aktive egne økter + feed fra alle brukeres sessions/items + egne offentlige lån       |
| CollectionsScreen       | Ferdig — ekte data, "UTLÅNT NÅ" tappbar med registrer-retur-flyt                               |
| CollectionDetailScreen  | Ferdig — ekte data, handlingsark med alle lånefunksjoner                                        |
| AddItemScreen           | Ferdig — insert til Supabase                                                                    |
| EditItemScreen          | Ferdig — forhåndsutfylt update til Supabase                                                     |
| FriendsScreen           | Mock-data — kobles til Supabase i Fase 5                                                        |
| ProfileScreen           | Hybrid — avatar/navn + utlånshistorikk ekte, statistikk mock                                   |
| NewSessionScreen        | Ferdig — modal med gjenstand, deltakere, fullført-toggle, bilde ("Bilde av boksen" for puslespill) og notat |
| SessionDetailScreen     | Ferdig — hero (siste fremgang eller cover), metadata-kort med cover-thumbnail + progresjon, "Oppdater"-knapp (bilde + progresjon + notat i én flyt), ···-meny (rediger/slett), blur-modal for fullskjerm |
| EditSessionScreen       | Ferdig — rediger deltakere og notat (modal)                                                     |

---

## Wireframes

### Samlinger

Liste over kategorier, hver rad: ikon, navn, antall stk, utlånt-indikator. Under: "UTLÅNT NÅ" med aktive utlån — gjenstandsnavn, låntaker og antall dager siden utlån.

### Venner

Søkefelt øverst. Liste over venner du følger: avatar, navn, antall felles i samlingen, sist aktiv. Trykk på en person åpner profilen deres.

### Ny økt-flyt

Modal (samme mønster som Legg til gjenstand). Seksjoner:

- **GJENSTAND** — scrollbar liste over alle dine gjenstander, grønn hake på valgt
- **DELTAKERE (VALGFRITT)** — fritekst-navn, chips med × for å fjerne; byttes med vennepicker i Fase 5
- **FULLFØRT** — toggle som setter `completed_at`; skiller pågående fra avsluttede økter
- **BILDE AV BOKSEN** (puslespill) / **BILDE (VALGFRITT)** (brettspill) — henter fra kamerarulle via `expo-image-picker`, lagres som cover i `sessions.image_url`
- **NOTAT (VALGFRITT)** — fritekstfelt
- Grønn **"Start økt"**-knapp sticky nederst; grå og deaktivert til gjenstand er valgt

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

- Opprett en økt via +-modal eller "Start økt" på en gjenstand i handlingsarket
- Felter: gjenstand, deltakere (fritekst-navn), fullført-toggle, bilde, notat
- Lagres til `sessions` + `session_participants`; deltakere utvides til vennepicker i Fase 5
- Venner kan se loggen i feeden (kobles til Supabase i Fase 3, rest)
- `sessions.guest_names text[]` holder fritekst-deltakere; `session_participants` brukes for ekte brukere

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
- [x] Supabase-trigger `trg_sync_item_status` holder `items.status` i sync med `loans` — utlån og retur er atomiske (én DB-operasjon fra klienten)
- [x] Supabase Storage bucket `session-images` med RLS-policies for opplasting og lesing
- [x] `sessions.guest_names text[]` kolonne for fritekst-deltakere
- [x] RLS på `sessions` og `session_participants`
- [x] `ProfilContext` eksponerer `{ profil, loading, error, retry }` med feilhåndtering

**Navigasjon**

- [x] Tab-bar: Feed | Samlinger | + | Venner | Profil (symmetrisk med + i sentrum)
- [x] `RootNavigator` — Stack som wrapper tabs + AddItem, EditItem og NewSession som modaler
- [x] `CollectionsStack` — Stack for CollectionsList → CollectionDetail
- [x] +-knapp åpner bottom sheet modal med to valg (utlån fjernet — lever på item-nivå)
- [x] Safe area håndtert korrekt på alle skjermer

**Samlinger (Fase 2)**

- [x] `CollectionsScreen` — ekte data fra Supabase, samlingstyper med antall + utlånt-indikator
- [x] `CollectionsScreen` — "UTLÅNT NÅ"-seksjon med aktive lån fra `loans`-tabellen
- [x] `CollectionDetailScreen` — ekte data, items listet opp med metadata og status-badge
- [x] `CollectionDetailScreen` — handlingsark (bottom sheet) ved trykk på gjenstand
- [x] `AddItemScreen` — skjema for puslespill/brettspill, insert til Supabase
- [x] `EditItemScreen` — forhåndsutfylt redigeringsskjerm, update til Supabase

**Økter (Fase 3)**

- [x] `NewSessionScreen` — gjenstand, fritekst-deltakere, fullført-toggle, bilde (Supabase Storage), notat
- [x] Lagres til `sessions` + `session_participants`
- [x] `expo-image-picker` integrert med `session-images` bucket
- [x] `FeedScreen` — aktive egne økter fra Supabase (`sessions` + `session_images`)
- [x] `ActiveSessionCard` — tappbar, navigerer til `SessionDetailScreen`
- [x] `SessionDetailScreen` — hero (siste fremgang eller cover), metadata-kort med cover-thumbnail + progresjon-ikon, "Oppdater"-knapp, ···-meny (rediger/slett), blur-modal for fullskjerm
- [x] `EditSessionScreen` — rediger deltakere og notat (modal fra SessionDetail)
- [x] `session_images`-tabell for progresjon med tidslinje per økt
- [x] `PuzzleProgressIcon` — custom SVG 2×2 puslespillbrikker, fylles 0→4
- [x] `ProgressSheet` — samlet oppdateringsflyt: bildevelger + progresjon (5 steg) + notat, "Fullfør økt" ved 100%
- [x] Cover-bilde (boksen) lagres i `sessions.image_url`, fremgangsbilder i `session_images`
- [x] Fullført-tilstand: skjuler action-knapper, viser fullføringsdato i dag-badge
- [x] `progress_pct` på `sessions` + `note` på `session_images` (DB-kolonner legges til manuelt)
- [x] `FeedScreen` — feed koblet til ekte Supabase-data (sessions + items + egne lån), sortert nyest øverst
- [x] `loaned`-hendelse i feed for egne offentlige lån (`is_public = true`)
- [x] `ProfileScreen` — "MINE UTLÅN"-seksjon med aktive og returnerte lån fra `loans`-tabellen

**Utlån (Fase 4 — delvis)**

- [x] Registrer utlån fra handlingsark: fritekst-navn på låntaker
- [x] Synlighets-toggle (offentlig/privat) — viser aktivitet i feed uten å avsløre låntaker
- [x] "Registrer retur" setter `returned_at` og oppdaterer status atomisk (via DB-trigger)
- [x] Lån er private som standard — RLS sikrer at kun eier ser sine lån
- [x] "UTLÅNT NÅ" i CollectionsScreen viser gjenstandsnavn, låntaker og dager siden utlån — tappbar med registrer-retur-flyt

---

### 🔜 Plan videre

**Fase 3 — Aktive økter og feed**

- [x] `NewSessionScreen` — modal med gjenstand, deltakere, fullført-toggle, bilde og notat
- [x] "Start økt" i handlingsarket åpner `NewSessionScreen` med gjenstand forhåndsvalgt
- [x] "Start ny økt" i +-menyen åpner `NewSessionScreen`
- [x] "Registrer utlån" fjernet fra +-menyen — lever på item-nivå
- [x] Aktive egne økter i FeedScreen koblet til Supabase
- [x] `SessionDetailScreen` — progresjonstidslinje, bilde-opplasting, merk som fullført
- [x] `EditSessionScreen` — rediger deltakere og notat
- [x] Feed: venners aktiviteter — RLS-policyene lagt til, `sessions` og `items` lesbare av alle innloggede
- [ ] Feed: aktive økter fra venner der du er invitert som deltaker (krever Fase 5)

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
- [x] Bildeopplasting via Supabase Storage (implementert for økter)

---

## Mappestruktur

```
puslespill-appen/
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx         # Stack: Tabs + AddItem + EditItem + NewSession + SessionDetail + EditSession
│   │   ├── AppNavigator.tsx          # Bottom tab-navigasjon + +-modal (2 valg)
│   │   └── CollectionsStack.tsx      # Stack: CollectionsList → CollectionDetail
│   ├── screens/
│   │   ├── AuthScreen.tsx            # Innlogging med Google
│   │   ├── FeedScreen.tsx            # Aktive egne økter (ekte) + feed (mock)
│   │   ├── CollectionsScreen.tsx     # Samlingstyper + utlånt nå med retur-flyt (ekte data)
│   │   ├── CollectionDetailScreen.tsx # Gjenstander + handlingsark (ekte data)
│   │   ├── AddItemScreen.tsx         # Legg til gjenstand
│   │   ├── EditItemScreen.tsx        # Rediger gjenstand
│   │   ├── FriendsScreen.tsx         # Venneliste og søk (mock)
│   │   ├── ProfileScreen.tsx         # Profil, statistikk og logg ut
│   │   ├── NewSessionScreen.tsx      # Ny økt-modal (ekte data, cover til Supabase Storage)
│   │   ├── SessionDetailScreen.tsx   # Økt-detaljer, cover+progresjon i metadata, "Oppdater"-flyt, blur-modal
│   │   └── EditSessionScreen.tsx     # Rediger deltakere og notat (modal)
│   ├── components/
│   │   ├── Header.tsx                # Toppbar med app-navn og bjelle
│   │   ├── UserAvatar.tsx            # Avatar med bilde eller initialer
│   │   ├── ActiveSessionCard.tsx     # Kort for pågående økt
│   │   ├── FeedCard.tsx              # Aktivitetskort i feed (type-agnostisk)
│   │   ├── ItemForm.tsx              # Delt skjema for Legg til / Rediger gjenstand
│   │   ├── PuzzleProgressIcon.tsx    # Custom SVG: 4 puslespillbrikker, fylles 0→4
│   │   ├── ProgressSheet.tsx         # Samlet oppdateringsflyt: bilde + progresjon + notat
│   │   └── ErrorBoundary.tsx         # Fanger render-krasj
│   ├── context/
│   │   ├── AuthContext.tsx           # Session og auth-tilstand
│   │   └── ProfilContext.tsx         # { profil, loading, error, retry }
│   ├── utils/
│   │   ├── initials.ts               # getInitials og getAvatarColor
│   │   └── collections.ts            # ItemType, ItemStatus, Difficulty, Item, ITEM_ICONS, ITEM_LABELS
│   └── lib/
│       └── supabase.ts               # Supabase-klient med SecureStore
├── assets/                           # Ikoner og splash screen
├── App.tsx                           # Rotkomponent
├── tailwind.config.js                # Fargesystem og theme
└── global.css                        # Tailwind-direktiver
```
