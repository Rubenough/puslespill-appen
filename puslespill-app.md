# 🧩 Puslespill-appen — Prosjektdokumentasjon

> Versjon 0.4 — Mars 2026

---

## Konsept

En sosial app for en vennegjeng/nabogjeng som pusler mye sammen. Appen fungerer som et mini-biblioteksystem kombinert med en sosial fremgangslogg — alle kan se hva andre eier, låne og bytte seg imellom, og følge hverandres puslespilløkter.

**Langsiktig visjon:** Appen bygges med utvidbarhet i tankene. Puslespill er kategori én, men arkitekturen skal støtte alle typer fysiske ting du kan låne ut til venner — brettspill, bøker, DVDer, verktøy, utstyr osv. Finn.no-integrasjon for salg kan vurderes på et senere tidspunkt, men appen er ikke en salgsplattform.

---

## Målgruppe

- En lukket vennegjeng / nabogjeng
- Deler, bytter og låner puslespill ofte
- Pusler sosialt — snakker og gjør andre ting samtidig
- Ikke hardcore statistikk-fokuserte brukere

---

## Navigasjonsstruktur

### Bottom tab-bar

| Fane      | Innhold                                          |
| --------- | ------------------------------------------------ |
| Feed      | Sosial feed + aktive økter                       |
| Samlinger | 3 sub-tabs: Min samling / Venner / Ønskeliste    |
| + (modal) | Tre valg: Start ny økt / Lån ut / Legg til spill |
| Utlån     | Utlånt av meg / Lånt av meg / Historikk          |
| Profil    | Profil og innstillinger                          |

### Samlinger — sub-tabs

- **Min samling** — brukerens egne puslespill, status per spill
- **Venner** — rutenett per person med forhåndsvisning av samlingen
- **Ønskeliste** — mine ønsker + "Be om å låne" hvis noen i gjengen allerede eier spillet

---

## Skjermstatus

### Eksisterende skjermer

| Skjerm                  | Status                                   |
| ----------------------- | ---------------------------------------- |
| Feed                    | Bygget (kobles til Supabase-data senere) |
| Samlinger — Min samling | Placeholder                              |
| Profil/innstillinger    | Placeholder                              |
| Innlogging (AuthScreen) | Fungerer med Google OAuth                |

### Gjenstående skjermer

| Skjerm                                                    | Prioritet |
| --------------------------------------------------------- | --------- |
| Samlinger → Venner-tab                                    | Fase 2    |
| Samlinger → Ønskeliste-tab                                | Fase 5    |
| Utlån-tab                                                 | Fase 4    |
| +-modal (Ny økt / Lån ut / Legg til spill)                | Fase 3    |
| Ny økt-flyt (velg spill, deltakere, bilde, notat)         | Fase 3    |
| Innlogging/onboarding (invitasjonsmelding, Apple Sign-In) | Fase 6    |

---

## Wireframes

### Samlinger → Venner-tab

Liste over venner i gjengen. Hver rad: avatar med initialer, navn, antall spill, 3 thumbnails + "+N"-overflow. Trykk på en person åpner samlingen deres.

### Samlinger → Ønskeliste-tab

To sub-tabs: **Mine ønsker** / **Vennenes ønsker**.

- Hvert ønske: bilde, tittel (f.eks. "New York — 2000 brikker"), merke, rød hjerte-ikon for å fjerne.
- Seksjon **"NOEN EIER DETTE"**: hvis noen i gjengen allerede eier spillet vises det her med "Be om å låne"-knapp (grønn). Krever join-query mellom `wishlists` og `puzzles`.

### Utlån-skjerm

Tre seksjoner:

- **DU HAR LÅNT UT** — spill + hvem lånte + dato, oransje/grå "Påminn"-badge
- **DU HAR LÅNT** — spill + hvem lånte ut + dato, grønn "Lever tilbake"-knapp
- **HISTORIKK** — returnerte lån, grå "Returnert"-badge

### +-modal (bottom sheet)

Tittel: "Hva vil du gjøre?" — tre valg:

1. **Start ny økt** — Logg en puslespilløkt
2. **Lån ut et spill** — Registrer utlån til en venn
3. **Legg til spill** — Legg til i samlingen din

### Ny økt-flyt

Fullskjerm med tilbake-pil. Seksjoner:

- **VELG PUSLESPILL** — søkbart kort, valgt spill vises med grønn hake
- **DELTAKERE** — chips med initialer + navn, × for å fjerne, "+ Legg til"-knapp (stiplet)
- **FREMGANGSBILDE (VALGFRITT)** — stiplet boks, "Ta eller velg bilde"
- **NOTAT (VALGFRITT)** — fritekstfelt med placeholder "Startet på kantene…"
- Stor grønn **"Start økt"**-knapp nederst

### Innlogging/onboarding

Grønn toppsektion med app-ikon og tagline "Del samlingen din med vennegjengen". To knapper: "Fortsett med Google" og "Fortsett med Apple".

---

## Funksjoner

### 🗂 Samlingsregister (kjerne)

- Hver bruker har sin egen samling
- Per puslespill: bilde av eske, tittel, brikkantall, merke (Ravensburger, Trefl osv.), vanskelighetsgrad, status
- Status: _Tilgjengelig / Utlånt / Pakket bort_
- Se vennenes samlinger i rutenett per person

### 🔄 Utlånsregister (kjerne)

- Lån ut et puslespill til en venn i appen
- Begge parter får notifikasjon
- Oversikt: utlånt av meg / lånt av meg / historikk
- Enkel "lever tilbake"-knapp
- Valgfri påminnelse etter X uker

### 🌟 Ønskeliste (kjerne)

- Alle kan se hverandres ønskelister
- Smart kobling: hvis noen i gjengen allerede eier et spill på ønskelisten, vises "Be om å låne"-knappen direkte (join mellom `wishlists` og `puzzles` i Supabase)

### 📸 Fremgangslogg (underdel)

- Opprett en økt via +-modal: velg spill, legg til deltakere, ta bilde, skriv notat
- Venner kan se loggen i feeden og kommentere/like
- Enkel statistikk: tid brukt, dato ferdig, hvem som var med

---

## Teknisk stack

| Del            | Teknologi                                  |
| -------------- | ------------------------------------------ |
| App            | React Native (Expo)                        |
| Auth           | Supabase Auth (Google + Apple)             |
| Database       | Supabase PostgreSQL                        |
| Bilder         | Supabase Storage                           |
| Notifikasjoner | Expo Notifications                         |
| State          | Zustand eller React Query                  |
| Styling        | NativeWind (Tailwind CSS for React Native) |

---

## Plattform

- iOS og Android (via React Native / Expo)
- Innlogging med Google- eller Apple-konto

---

## Skalerbarhet — fremtidige kategorier

Appen designes fra start med en generisk _item_-modell slik at nye kategorier enkelt kan legges til uten å bygge om kjernelogikken.

**Planlagte fremtidige kategorier:**

- Brettspill
- Bøker
- DVDer
- Andre fysiske ting du eier og vil ha kontroll på (verktøy, utstyr, osv.)

**Fremtidig integrasjon:**

- Finn.no — brukere som vil selge noe kan lenkes videre dit. Appen er ikke en salgsplattform, men kan tilby en snarvei.

---

## Fremgang

### ✅ Gjort

**Grunnoppsett**

- [x] Initialisert Expo-prosjekt med React Native og TypeScript
- [x] Satt opp NativeWind (Tailwind CSS) for styling
- [x] Laget fullstendig fargesystem med lys/mørk modus og WCAG AA-tilgjengelighet
- [x] Satt opp React Navigation med Bottom Tab Navigator
- [x] App-ikoner og splash screen konfigurert for iOS og Android
- [x] Prosjekt publisert på GitHub (offentlig)

**UI-komponenter**

- [x] `Header` — toppbar med app-navn, bjelle-ikon og avatar (bruker `UserAvatar`)
- [x] `UserAvatar` — gjenbrukbar avatar med bilde eller initialer, deterministisk farge per person
- [x] `ActiveSessionCard` — "Din økt" med grønn border, vennekort med avatar og fremdrift
- [x] `FeedCard` — to varianter: utlån og fullført med "Ferdig"-badge
- [x] `FeedScreen` — horisontal økt-scroll + vertikal feed, mock-data klar til Supabase-kobling

**Supabase og auth**

- [x] Supabase-prosjekt opprettet (Frankfurt)
- [x] Databaseskjema: `profiles`, `puzzles`, `sessions`, `session_participants`, `loans`
- [x] Row Level Security (RLS) aktivert og policies satt opp på alle tabeller
- [x] Supabase-klient koblet til appen med AsyncStorage for sesjonspersistering
- [x] Google OAuth innlogging fungerer i Expo Go
- [x] `AuthScreen` — innloggingsskjerm med Google-knapp
- [x] `App.tsx` styrer auth-tilstand — viser AuthScreen eller appen basert på sesjon

**Fase 1 — Profil og brukerdata**

- [x] Supabase-trigger oppretter profil automatisk ved første innlogging
- [x] `ProfilContext` henter innlogget brukers profil og gjør den tilgjengelig i appen
- [x] `Header` viser ekte initialer fra profil via `UserAvatar`

**Navigasjon og feed-redesign**

- [x] Tab-bar oppdatert: Feed | Samlinger | + | Utlån | Profil
- [x] +-knappen åpner bottom sheet modal med tre valg (UI ferdig, handlinger kobles til i Fase 3)
- [x] `ProfileScreen` lagt til (placeholder)
- [x] `FeedScreen`, `FeedCard` og `ActiveSessionCard` oppdatert til ny wireframe

### 🔜 Plan videre

**Fase 2 — Min samling**

- [ ] Bygg ut `CollectionsScreen` med sub-tabs (Min samling / Venner / Ønskeliste)
- [ ] Min samling-tab: vis brukerens puslespill fra Supabase
- [ ] Legg til puslespill-skjerm (via +-modal) — tittel, brikkantall, merke, vanskelighetsgrad
- [ ] Bildeopplasting via Supabase Storage (bilde av esken)
- [ ] Endre status på puslespill (Tilgjengelig / Utlånt / Pakket bort)

**Fase 3 — Aktive økter og feed**

- [ ] Koble handlinger i +-modal (Start ny økt / Lån ut / Legg til spill)
- [ ] Ny økt-flyt — velg spill, legg til deltakere, ta bilde, skriv notat
- [ ] Koble `ActiveSessionCard` og `FeedCard` til ekte data fra Supabase
- [ ] Kommenter/reager på feed-innlegg

**Fase 4 — Utlån**

- [ ] Bygg ut `LoansScreen` — utlånt av meg / lånt av meg / historikk
- [ ] Lån ut et puslespill til en venn via +-modal
- [ ] "Lever tilbake"-knapp som oppdaterer status
- [ ] Valgfri påminnelse etter X uker

**Fase 5 — Ønskeliste og venner**

- [ ] Ønskeliste-tab i Samlinger — legg til og se egne ønsker
- [ ] Venner-tab i Samlinger — rutenett per person med forhåndsvisning
- [ ] "Be om å låne"-knapp når noen i gjengen eier et spill på ønskelisten (join-query: `wishlists` + `puzzles`)

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
│   │   └── AppNavigator.tsx         # Bottom tab-navigasjon
│   ├── screens/
│   │   ├── AuthScreen.tsx           # Innlogging med Google
│   │   ├── FeedScreen.tsx           # Sosial feed + aktive økter
│   │   ├── CollectionsScreen.tsx    # Samlinger med sub-tabs (placeholder)
│   │   ├── LoansScreen.tsx          # Utlånsoversikt (placeholder)
│   │   └── ProfileScreen.tsx        # Profil og innstillinger (placeholder)
│   ├── components/
│   │   ├── Header.tsx               # Toppbar med app-navn, bjelle og avatar
│   │   ├── UserAvatar.tsx           # Avatar med bilde eller initialer
│   │   ├── ActiveSessionCard.tsx    # Kort for pågående økt
│   │   └── FeedCard.tsx             # Kort i sosial feed (utlån / fullført)
│   ├── context/
│   │   └── ProfilContext.tsx        # Profil-tilstand for innlogget bruker
│   ├── utils/
│   │   └── initials.ts              # getInitials og getAvatarColor
│   └── lib/
│       └── supabase.ts              # Supabase-klient med AsyncStorage
├── assets/                          # Ikoner og splash screen
├── App.tsx                          # Rotkomponent
├── tailwind.config.js               # Fargesystem og theme
└── global.css                       # Tailwind-direktiver
```
