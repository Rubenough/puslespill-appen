# 🧩 Puslespill-appen — Prosjektdokumentasjon

> Versjon 0.2 — Mars 2026

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

## Funksjoner

### 🗂 Samlingsregister (kjerne)
- Hver bruker har sin egen samling
- Per puslespill: bilde av eske, tittel, brikkantall, merke (Ravensburger, Trefl osv.), vanskelighetsgrad, status
- Status: *Tilgjengelig / Utlånt / Pakket bort*
- Søk og filtrer på tvers av hele vennegjengens samlinger

### 🔄 Utlånsregister (kjerne)
- Lån ut et puslespill til en venn i appen
- Begge parter får notifikasjon
- Oversikt over hva du har ute og hva du har lånt
- Enkel "lever tilbake"-knapp
- Valgfri påminnelse etter X uker

### 🌟 Ønskeliste og bytting (kjerne)
- Alle kan se hverandres ønskelister
- Bytt-funksjon: "Jeg tilbyr X mot Y" — den andre godtar eller avslår
- Mulighet for å markere spill som *til salgs* (fremtidig: kobling til Finn.no)

### 📸 Fremgangslogg (underdel)
- Opprett en økt når dere starter et puslespill
- Legg til deltakere, ta bilde underveis og ved ferdig resultat
- Venner kan se loggen og kommentere/like — enkel feed
- Enkel statistikk: tid brukt, dato ferdig, hvem som var med

---

## Teknisk stack

| Del | Teknologi |
|---|---|
| App | React Native (Expo) |
| Auth | Supabase Auth (Google + Apple) |
| Database | Supabase PostgreSQL |
| Bilder | Supabase Storage |
| Notifikasjoner | Expo Notifications |
| State | Zustand eller React Query |
| Styling | NativeWind (Tailwind CSS for React Native) |

---

## Plattform

- iOS og Android (via React Native / Expo)
- Innlogging med Google- eller Apple-konto

---

## Skalerbarhet — fremtidige kategorier

Appen designes fra start med en generisk *item*-modell slik at nye kategorier enkelt kan legges til uten å bygge om kjernelogikken.

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

- [x] Initialisert Expo-prosjekt med React Native og TypeScript
- [x] Satt opp NativeWind (Tailwind CSS) for styling
- [x] Laget fullstendig fargesystem med lys/mørk modus og WCAG AA-tilgjengelighet
- [x] Satt opp React Navigation med Bottom Tab Navigator
- [x] Definert 5 hovedskjermer: Feed, Samlinger, Ny økt, Lån, Ønskeliste
- [x] Laget skjeletkomponenter: `Header`, `ActiveSessionCard`, `FeedCard`
- [x] Satt opp `FeedScreen` med seksjoner for aktive økter og feed
- [x] App-ikoner og splash screen konfigurert for iOS og Android

### 🔜 Neste steg

- [ ] Sett opp Supabase-prosjekt (database, auth, storage)
- [ ] Design databaseskjema (tabeller og relasjoner)
- [ ] Implementer auth-flyt (Google / Apple innlogging)
- [ ] Bygg ut `CollectionsScreen` — vis og legg til puslespill
- [ ] Bygg ut `LoansScreen` — oversikt over inn- og utlån
- [ ] Bygg ut `WishlistScreen` — ønskeliste per bruker
- [ ] Bygg ut `NewSessionScreen` — opprett puslespilløkt
- [ ] Fyll ut `ActiveSessionCard` og `FeedCard` med reelle data
- [ ] Implementer bildeopplasting via Supabase Storage
- [ ] Legg til push-notifikasjoner for lån og bytte

---

## Mappestruktur

```
puslespill-appen/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Bottom tab-navigasjon
│   ├── screens/
│   │   ├── FeedScreen.tsx         # Sosial feed + aktive økter
│   │   ├── CollectionsScreen.tsx  # Brukerens samling (placeholder)
│   │   ├── NewSessionScreen.tsx   # Opprett ny økt (placeholder)
│   │   ├── LoansScreen.tsx        # Utlånsoversikt (placeholder)
│   │   └── WishlistScreen.tsx     # Ønskeliste (placeholder)
│   └── components/
│       ├── Header.tsx             # Toppbar med app-navn
│       ├── ActiveSessionCard.tsx  # Kort for pågående økt
│       └── FeedCard.tsx           # Kort i sosial feed
├── assets/                        # Ikoner og splash screen
├── App.tsx                        # Rotkomponent
├── tailwind.config.js             # Fargesystem og theme
└── global.css                     # Tailwind-direktiver
```