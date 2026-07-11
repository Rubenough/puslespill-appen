# Puslespill-appen — Claude Instructions

## Project Overview

A React Native / Expo mobile app for managing puzzle and board game collections, loans, and a social feed. Backend: Supabase (PostgreSQL + Auth).

**Planning docs:** roadmap to 1.0 in `docs/PROJECT-PLAN.md`; historical debt register + review log in `tech-debt.md`.

## Tech Stack

- **React Native 0.83.2** + **Expo 55**
- **TypeScript** (strict mode)
- **NativeWind 4** + **Tailwind CSS 3** for styling
- **React Navigation 7** (bottom tabs + stack + modal)
- **Supabase 2** — auth, database, real-time
- **expo-secure-store** — encrypted session storage
- **expo-application** — native app/version info (`nativeApplicationVersion` + `nativeBuildVersion`) for the Settings version footer
- **expo-splash-screen** — prevents white flash during auth check
- **expo-blur** — blur overlay for fullscreen image modal
- **@expo/vector-icons** — Ionicons (install via `npx expo install @expo/vector-icons`, keep SDK-pinned)

## Commands

### Running the dev server

Pick the mode by **which client** runs the JS and **where the tester is**:

```bash
# --- Expo Go (quick UI checks; only works because all native deps are in the SDK-55 Go set) ---
npx expo start --go                 # start Metro for Expo Go (open the Expo Go app)
npx expo start --go --ios           # + auto-boot iOS simulator (see simulator gotcha below)

# --- Development build (the real app; required once any custom native dep/plugin is used) ---
npx expo start --dev-client         # LAN — tester's phone must be on the SAME Wi-Fi as this Mac
npx expo start --dev-client --tunnel# any network / mobile data (routes via Expo's ngrok tunnel)

# --- Options that stack onto any of the above ---
--clear                             # bust Metro cache — do this after a bigger merge
--localhost                         # simulator-only host (physical devices can't reach it)
```

**`--go` vs `--dev-client`** — `--go` runs the code inside the **Expo Go** app; `--dev-client`
runs it inside **our own `puslespill` dev-build APK** (its own icon, installed from EAS). Use
`--dev-client` for anything real — OAuth redirects use the custom `puslespill://` scheme and only
behave correctly in the dev build. `--go` is fine for pure-UI/logic checks since every current
native dep happens to be in the SDK-55 Expo Go set.

**`--tunnel`** — needed when the tester is on a **different network** than this Mac (e.g. a friend
on their own Wi-Fi/mobile data). Requires `@expo/ngrok` (already a devDep). The tunnel URL is
**deterministic per project/account** and stable across restarts:
`exp://3ngoqts-rubenough-8081.exp.direct`. If it isn't printed (non-interactive/background start),
read it from ngrok's local API: `curl -s http://127.0.0.1:4040/api/tunnels`.

**Connecting a device** — open the client app → "Enter URL manually" → the `exp://…` URL
(LAN `exp://<mac-ip>:8081`, or the tunnel URL). Dev build = open **puslespill**; Expo Go = open
**Expo Go**. First tunnel load takes ~20–30s.

**iOS simulator gotcha** — `npx expo start --ios` can hang on an interactive "install the
recommended Expo Go version?" prompt (`CI=1` does NOT suppress it). Workaround: start Metro
**without** `--ios`, then open the app manually:
`xcrun simctl openurl booted "exp://127.0.0.1:8081"`. If Expo Go sits on a stale/error screen,
cold-launch it: `xcrun simctl terminate booted host.exp.Exponent && xcrun simctl launch booted host.exp.Exponent`.

**Do I need a new build after a merge?** JS/TS changes stream live over Metro — no rebuild.
**Rebuild only when the native layer changes** (native dep/config-plugin added, `app.json` native
config, SDK/RN bump). Run `npm run rebuild:check` to get a verdict (see Other); a launch-time
native/module crash like the `FontLoaderModule` one is the signal a rebuild is overdue.

**Health / restart cheats:**

```bash
curl -s http://127.0.0.1:8081/status                 # "packager-status:running" = up
pkill -f "expo start"                                # stop the server
# Watchman "Recrawled this watch N times" + a Metro `_onHasteChange … addedFiles` crash → reset:
watchman watch-del "$PWD" ; watchman watch-project "$PWD"   # then restart with --clear
```

Note: **long-running dev servers should be started in the user's own terminal** (via a `!` command),
not as an agent background task — those get reaped. Killing the local `eas build`/`expo start`
process does NOT cancel an in-progress **cloud** build.

```bash
# Legacy shortcuts (still valid)
npx expo start                # bare Metro (defaults to dev-client since expo-dev-client is installed)
npx expo start --android
npx expo start --web
```

Quality gates:

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint (flat config: eslint-config-expo + prettier)
npm run format        # prettier --write .
npm run format:check  # prettier --check . (used by CI)
npm test              # jest (jest-expo preset)
npm run test:ci       # jest --ci --runInBand (used by CI)
```

Other:

```bash
npm run rebuild:check          # scripts/check-rebuild.sh — does this change need a fresh
                               # EAS/dev-client build (native) or can it stream over Metro (JS-only)?
```

CI (`.github/workflows/ci.yml`) runs typecheck + lint + format:check + tests on every push/PR to `main`.
Keep `eslint-config-expo` at `^57` — the SDK-aligned `~55.0.1` references a `react-hooks` rule its resolved plugin lacks and crashes lint.
Tests live in `__tests__/` folders next to the code; start with pure utils. Do not
add a new test _framework_ — extend the existing jest setup.

## Project Structure

```
src/
├── components/
│   ├── GoogleSignInButton.tsx  # Google-branded OAuth button (inline styles)
│   ├── Header.tsx              # App title bar with notifications icon
│   ├── ErrorBoundary.tsx       # Class component error handler
│   ├── UserAvatar.tsx          # Avatar with initials fallback
│   ├── ActiveSessionCard.tsx   # Card for active puzzle sessions
│   ├── FeedCard.tsx            # Card for activity feed items
│   ├── PuzzleProgressIcon.tsx  # Custom SVG: 4 puzzle pieces filled 0–4 (progress indicator)
│   ├── ProgressSheet.tsx       # Combined update flow: image picker + progress (5 steps) + note
│   ├── ReactionBar.tsx         # Quick-react bar (👍 ❤️ 🎉 🧩) — shared by FeedCard + SessionDetail
│   ├── ItemFilterBar.tsx       # Search input + status filter chips (CollectionDetail)
│   ├── OnboardingChecklist.tsx # First-run checklist card on Feed (with hooks/useOnboardingChecklist)
│   ├── ProfileEditSheet.tsx    # Edit display name + avatar (BottomSheet from ProfileScreen)
│   └── loans/                  # LoansHub building blocks: LoanRow (due-date framing), RequestCard (quoted message + cover), DueDateChips
├── screens/
│   ├── AuthScreen.tsx              # Google OAuth login
│   ├── FeedScreen.tsx              # Active sessions + activity feed; onboarding checklist + empty-state CTAs
│   ├── CollectionsScreen.tsx       # Collection types + compact "Lån" summary card (counts) → LoansHub
│   ├── CollectionDetailScreen.tsx  # Items in a collection, search/filter, loan/return actions (real Supabase)
│   ├── AddItemScreen.tsx           # Add puzzle/board game form (real Supabase insert)
│   ├── ProfileScreen.tsx           # User profile (editable via ProfileEditSheet) + past sessions; gear top-right → Settings
│   ├── SettingsScreen.tsx          # Appearance + Language + Sign out + Slett konto (delete_account Edge Function) + version footer
│   ├── LibraryScreen.tsx           # "Bibliotek" tab: searchable all-friends item list w/ inline borrow requests; header icon → Friends
│   ├── FriendsScreen.tsx           # Invite code (+ QR) + redeem + friends list (pushed root route "Friends")
│   ├── FriendCollectionScreen.tsx  # Read-only view of a friend's collection (covers signed)
│   ├── LoansHubScreen.tsx          # "Lån" hub (from Header bell + Collections card): requests in/out, borrowing, lent out, history entry
│   ├── LoanHistoryScreen.tsx       # Returned loans (pushed from LoansHub)
│   ├── NewSessionScreen.tsx        # Start session: item → participants → box photo (puzzle) / image → notes
│   ├── SessionDetailScreen.tsx     # View session: hero, metadata, reactions, "Oppdater" flow, blur fullscreen modal
│   └── EditSessionScreen.tsx       # Edit session participants + notes (modal)
├── navigation/
│   ├── RootNavigator.tsx       # Stack: Tabs + AddItem + EditItem + NewSession + SessionDetail + EditSession + FriendCollection + Friends + LoansHub + LoanHistory + Settings
│   ├── AppNavigator.tsx        # Bottom tab navigator (5 tabs: Feed, Samlinger, NyOkt, Bibliotek, Profil)
│   └── CollectionsStack.tsx    # Stack: CollectionsList → CollectionDetail
├── context/
│   ├── AuthContext.tsx         # Session, user, isLoggedIn — useAuth()
│   ├── ProfilContext.tsx       # User profile from profiles table — useProfil()
│   └── ThemeContext.tsx        # Theme preference (system/light/dark), persisted — useTheme()
├── lib/
│   ├── supabase.ts             # Typed Supabase client (createClient<Database>)
│   ├── database.types.ts       # Generated schema types (npm run gen:types)
│   └── i18n.ts                 # i18next init: device locale + persisted override, setLanguage()
├── locales/
│   ├── no.json                 # Norwegian (source of truth)
│   └── en.json                 # English
└── utils/
    ├── initials.ts             # Avatar initial generation + deterministic colors
    ├── collections.ts          # ItemType, ITEM_ICONS, ITEM_LABELS, Difficulty
    ├── date.ts                 # Shared date helpers (getDayNumber, relative labels)
    ├── friends.ts              # fetchFriends(userId) — accepted friends, avatars resolved (FriendsScreen + Library + loan picker)
    ├── avatar.ts               # resolveAvatarUrl(s): https-URLer passerer, lagringsstier batch-signeres
    ├── feed.ts                 # buildFeedItems — ren, testet sammenslåing av feed-hendelser
    ├── loans.ts                # DUE_OPTIONS, dueAtFromKey, isOverdue, daysUntilDue, dueDateLabel (testet)
    ├── auth.ts                 # parseOAuthRedirect (pure, tested)
    └── sessionImages.ts        # Shared storage helpers (upload/remove/path-parse for session-images bucket)
supabase/functions/             # Edge Functions (Deno, deployes via dashboard/MCP): delete_account
App.tsx                         # Entry point — i18n, guarded Sentry.init (EXPO_PUBLIC_SENTRY_DSN), AuthProvider, deep-link routing
```

## Naming & Language Conventions

- **Functions, constants, variables, types: English**
- **UI text (labels, placeholders, headings): all through i18n** — `t('key')`, `no.json` source of truth + `en.json`, language toggle in `SettingsScreen`. The retrofit is **complete** (every screen migrated; full `no`/`en` key parity). **Always** add user-facing strings — visible text, `placeholder`, `accessibilityLabel`/`accessibilityHint`, `Alert` copy — as keys in **both** locale files. Never hardcode Norwegian. See [`docs/i18n-plan.md`](./docs/i18n-plan.md).
- **Code comments: Norwegian is fine**

## Design System

The visual language is documented in `wireframes/design-system.html` (open in a browser). It contains:

- All color tokens (light + dark), with WCAG AA contrast table
- Avatar palette (deterministic 6-color from `utils/initials.ts`)
- Typography scale, radius tokens, layout rhythm
- Component specimens: Avatar, Badge, Button, List row, Action sheet, Switch, Difficulty picker, Feed card, Active session card

Consult this file when adding new UI — all new components should follow the same tokens and patterns.

## Styling

- Use NativeWind (Tailwind class names) for all styling
- Custom theme colors in `tailwind.config.js`: `surface`, `border`, `content`, `accent` (green)
- **Dark mode is user-controlled** (system / light / dark), not OS-only. `tailwind.config.js` uses
  `darkMode: "class"` and `ThemeContext` drives the `dark:` variants via NativeWind's
  `colorScheme.set()`; the preference is persisted in SecureStore. Components that need imperative
  colours (tab bar in `AppNavigator`, `SessionDetailScreen`) read `useColorScheme` **from
  `nativewind`** (app-controlled) — never from `react-native` (OS-only). See the theme toggle on
  `SettingsScreen` and [`docs/dark-mode-toggle.md`](./docs/dark-mode-toggle.md). Imperative icon
  colours that must stay legible in both schemes (e.g. the Settings back chevron and Profile gear)
  read `useColorScheme` from `nativewind` and pick a content token per scheme — never hardcode
  `#78716C`, which fails contrast on dark surfaces.
- Exception: `GoogleSignInButton` uses inline styles to match Google's brand guidelines

## Architecture Notes

### Auth flow

- `AuthProvider` (in `AuthContext.tsx`) manages session via `onAuthStateChange`
- `App.tsx` renders `AppContent` inside `AuthProvider` — uses `useAuth()` to route between `AuthScreen` and `AppNavigator`
- `SplashScreen` stays visible until `loading` is false (prevents white flash)
- Google OAuth: `signInWithOAuth` → `WebBrowser.openAuthSessionAsync` → hash-parse `#access_token` → `setSession`
- `makeRedirectUri()` from `expo-auth-session` generates the correct redirect URI dynamically

### Session storage

- `ExpoSecureStoreAdapter` in `supabase.ts` — uses `expo-secure-store` (Keychain on iOS, Keystore on Android)
- Session tokens larger than 2048 bytes are automatically chunked across multiple SecureStore keys

### Image storage (`session-images` bucket)

- **Private bucket + signed URLs (GDPR).** Session photos can contain identifiable people (personal data), so the bucket is **private**; images are served via short-lived signed URLs. This keeps erasure (GDPR Art. 17) enforceable and prevents leaked/enumerated links.
- Use `utils/sessionImages.ts` — never call `supabase.storage` inline:
  - `uploadSessionImage(path, uri)` uploads and returns the **storage path** (this is what's stored in `sessions.image_url` / `session_images.image_url` — a path, **not** a URL). Throws on error.
  - `getSignedUrl(value)` / `getSignedUrls(values)` — resolve a path (or a legacy full URL) to a short-lived signed URL for display. **Sign at fetch time** and put the signed URL into component state (see `FeedScreen.fetchSessions`, `SessionDetailScreen.fetchData`). Batch with `getSignedUrls` for lists.
  - `toStoragePath(value)` normalises a path **or** a legacy public/signed URL back to a bare path (strips the `?token=…`). Used by delete cleanup. `storagePathFromUrl` is an alias.
  - `removeSessionImages(values)` — best-effort delete; accepts paths or URLs.
- **Legacy rows** that still hold full public URLs keep working — `toStoragePath` extracts the path, so no DB migration is required.
- **Upload-then-insert ordering:** upload first, then insert/update the DB row. Track the uploaded path outside the `try`; if a later step fails, remove the orphaned file. Once a DB row references the file, set the tracked path to `null` so it is not deleted on a subsequent failure.
- All async handlers that flip a loading flag (`saving`/`updating`/`deleting`) must use `try/catch/finally` — reset the flag in `finally`, alert in `catch`. Never leave a flag set on a thrown exception.
- **Dashboard requirement:** the bucket is **Private** with a storage `SELECT` policy (needed for `createSignedUrl`). The policy is **friend-scoped** — a user can sign an object only if the path owner (`(storage.foldername(name))[1]`) is themselves or an accepted friend (`are_friends`). See `docs/phase1-friend-graph.md`.

### Data-fetch error handling

- Every screen that fetches data surfaces errors: capture the `error` field (or `try/catch` around helpers that throw) and render an inline "Kunne ikke laste …" message with a "Prøv igjen" retry button instead of a misleading empty state. See `CollectionsScreen`, `FeedScreen` (`SectionError`), `ProfileScreen`, `NewSessionScreen`.

### Internationalization (i18n)

- `lib/i18n.ts` (i18next + react-i18next + expo-localization) is imported once in `App.tsx`. Default = device locale mapped to `no`/`en` (fallback `no`); a manual override is persisted in SecureStore and loaded on startup via `loadPersistedLanguage()`.
- In UI: `const { t } = useTranslation();` → `t("namespace.key")`. accessibility labels/hints go through `t()` too. Add both `no.json` and `en.json` entries in the same change; `no.json` is source of truth.
- Language toggle lives in `SettingsScreen` (`setLanguage("no"|"en")`).
- **Migration is complete** — every screen resolves its strings through `t()`; `no.json`/`en.json` are at full key parity (keep them that way). Non-component helpers call `i18n.t(...)` directly (e.g. `utils/collectionLabels.ts`, the `fetchFeedItems` fallbacks); category/metadata text goes through `collectionLabels.ts` (`itemTypeLabel` / `piecesLabel` / `playersLabel` / `difficultyLabel`), not raw literals. Do **not** translate DB values (`"Utlånt"`, `"Tilgjengelig"`, `ItemType`, difficulty) or route names — only display text. See [`docs/i18n-plan.md`](./docs/i18n-plan.md).

### Contexts

- `useAuth()` — returns `{ session, user, isLoggedIn, loading }`
- `useProfil()` — returns `{ profil, loading, error, retry }` from `profiles` table (only mounted when logged in)
- `useTheme()` — returns `{ preference, setPreference, ready }` (`preference`: `"system" | "light" | "dark"`). `ThemeProvider` wraps the whole app in `App.tsx` (outside `AuthProvider`) and gates the splash on `ready` to avoid a wrong-theme flash while the saved preference loads from SecureStore.

### Navigation

```
RootNavigator (Stack)
├── Tabs (AppNavigator — BottomTab)
│   ├── Feed → FeedScreen
│   ├── Samlinger → CollectionsStack
│   │   ├── CollectionsList → CollectionsScreen
│   │   └── CollectionDetail → CollectionDetailScreen
│   ├── NyOkt → placeholder (center + button opens modal)
│   ├── Bibliotek → LibraryScreen (all friends' items, searchable; header icon → Friends)
│   └── Profil → ProfileScreen
├── AddItem (Modal) → AddItemScreen
├── EditItem (Modal) → EditItemScreen
├── NewSession (Modal) → NewSessionScreen
├── SessionDetail (Push) → SessionDetailScreen
├── EditSession (Modal) → EditSessionScreen
├── FriendCollection (Push) → FriendCollectionScreen
├── Friends (Push) → FriendsScreen (invite/QR/redeem/unfriend; deep-link puslespill://join lander her)
├── LoansHub (Push) → LoansHubScreen
├── LoanHistory (Push) → LoanHistoryScreen
└── Settings (Push) → SettingsScreen
```

- Auth state in `App.tsx` routes to `AuthScreen` or `RootNavigator`
- Settings is reached via a gear (`settings-outline`) top-right on `ProfileScreen`; theme, language,
  and sign-out (with a confirm `Alert`) live there, not on Profile
- React Navigation is used (not Expo Router) — `Stack.Protected` does not apply
- The center (+) tab button opens an action modal with three options: add item, start session, invite a friend (→ Friends)
- "Registrer utlån" is NOT in the + modal — loan registration lives on item level in CollectionDetailScreen
- "Legg til i samlingen" → type selection alert → navigates to `AddItemScreen` with type param

### Database

The client is typed: `createClient<Database>` in `supabase.ts`, where `Database` comes from `src/lib/database.types.ts` (generated). **Regenerate after any schema change** with `supabase login && npm run gen:types` (project ref `mzcppyhxikbkawmyrkrh`). The generated file is git-tracked but excluded from lint/format.

`items.type/status/difficulty` and `borrow_requests.status` are **real Postgres enums** (2026-07-10 DB batch), and `items.created_at`/`sessions.started_at` are NOT NULL — the generated types are literal unions/non-null, so **no boundary casts are needed** (don't add `as unknown as` at query sites). Where a SQL filter guarantees non-null (`.not("x","is",null)`), narrow with a type-predicate filter instead of a cast.

Supabase tables in use:

- `profiles` — user profile (id, full_name, avatar_url)
- `items` — puzzle/board game collection (id, owner_id, type, title, brand, piece_count, player_count, difficulty, status, created_at)
- `loans` — loan records (id, item_id, owner_id, borrower_user_id [nullable], borrower_name, loaned_at, returned_at [null = active loan], is_public, due_at [date, nullable], return_requested_at [borrower signalled], owner_return_requested_at + owner_return_note [owner nudged])
- `borrow_requests` — request lifecycle (id, item_id, owner_id, requester_id, status [pending/approved/declined/cancelled], message, loan_id). All mutations via security-definer RPCs.
- `sessions` — activity sessions (id, item_id, created_by, started_at, completed_at, progress_pct [0–100, puzzle only], guest_names, notes)
- `session_images` — progress photos (id, session_id, image_url, captured_at, note)
- `session_participants` — user participants (session_id, profile_id)
- `friendships` — mutual friend graph (via `accept_invite` RPC)

RPCs (security-definer): `get_my_invite_code`, `accept_invite`, `are_friends`; borrow loop — `request_to_borrow`, `approve_request`, `decline_request`, `cancel_request`; return loop — `mark_loan_returned` (borrower signals), `unmark_loan_returned` (borrower undoes). Owner-side writes (register/confirm return, set `due_at`, request-return note) use direct `loans` INSERT/UPDATE under the owner RLS policy. `loans` SELECT is **owner or borrower**; return/register-return UPDATE stays owner-only.

Item types: `"puslespill"` | `"brettspill"` (defined in `utils/collections.ts` as `ItemType`)

### Privacy: loans

Loans are **private by default** (`is_public = false`). Borrower identity must never leak to users who are not the owner.

- RLS: only `owner_id = auth.uid()` can read/write their own loans
- `is_public = true` means the loan _activity_ (not borrower name) can be shown to mutual friends in the feed — e.g. "Ruben lånte ut et puslespill" without naming who
- Borrower name is only ever shown to the item owner, never to other users — even if `is_public = true`
- `borrower_user_id` is set by the loan modal's friend picker (`CollectionDetailScreen` + `utils/friends.ts`) when the borrower is an accepted friend; `borrower_name` is always stored as a display fallback (including for non-app users typed in as free text)

### Data status per screen

| Screen                 | Data source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FeedScreen             | Real — active sessions (`sessions` + `session_images`) + feed (`sessions`/`items`/`loans` last 14 days, profiles joined), per-section error+retry                                                                                                                                                                                                                                                                                                                                               |
| CollectionsScreen      | Real — `items` + count queries (`loans` active lent/borrowing + `borrow_requests` pending). Collection type rows + a compact **"Lån"** summary card ("2 utlånt · 1 låner nå · 1 forespørsel") that opens LoansHub                                                                                                                                                                                                                                                                                |
| CollectionDetailScreen | Real — `items` + `loans`, pull-to-refresh + focus-refresh, loan/return actions; lend modal has a **friend picker** (filters accepted friends via `utils/friends.ts` → sets `borrower_user_id`; free-text stays as `borrower_name` fallback for non-app people) + visibility + **due-date** (quick-pick chips → `loans.due_at`); lent item's action sheet also offers **Be om retur** (owner nudge → `owner_return_requested_at` + `owner_return_note`, matched by `item_id` on the active loan) |
| AddItemScreen          | Real — inserts to `items`                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ProfileScreen          | Real — profile from Supabase, loan history from `loans` (error+retry); gear top-right → Settings                                                                                                                                                                                                                                                                                                                                                                                                |
| SettingsScreen         | Stateless UI — Appearance (`useTheme`) + Language (`setLanguage`), Sign out (`supabase.auth.signOut` behind a confirm `Alert`), version footer (`expo-application`)                                                                                                                                                                                                                                                                                                                             |
| FriendsScreen          | Real — invite code (`get_my_invite_code`), redeem (`accept_invite`), accepted friends from `friendships`                                                                                                                                                                                                                                                                                                                                                                                        |
| FriendCollectionScreen | Real — a friend's `items`; tap → Be om å låne (`request_to_borrow`) / Avbryt forespørsel (`cancel_request`) when pending; shows Forespurt/Utlånt state                                                                                                                                                                                                                                                                                                                                          |
| LoansHubScreen         | Real — the whole lending loop (from Header bell + Collections card): **FORESPØRSLER INN** (approve w/ due-date chips + decline; requester message + signed cover thumbnail), **FORESPØRSLER UT** (cancel), **DU LÅNER NÅ** (mark returned / undo; owner's return note), **UTLÅNT NÅ** (tap → Be om retur/Registrer retur; badges), **HISTORIKK** row → LoanHistory. Due-date framing via `utils/loans.ts` `dueDateLabel` ("forfaller om 3 dager" / red "2 dager over fristen")                  |
| NewSessionScreen       | Real — inserts to `sessions` + `session_participants`, uploads to `session-images` bucket                                                                                                                                                                                                                                                                                                                                                                                                       |
| SessionDetailScreen    | Real — reads `sessions` (incl. `image_url` cover) + `session_images` + `items` metadata, progress icon in metadata card, "Oppdater" flow (image + progress + note via ProgressSheet), ··· menu (edit/delete), blur fullscreen modal                                                                                                                                                                                                                                                             |
| EditSessionScreen      | Real — updates `sessions.guest_names` + `sessions.notes`                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Supabase credentials

In `.env`: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Accessibility (WCAG AA)

All new and modified UI must follow these rules. The codebase has already been audited and fixed — maintain the same patterns.

### Required props by element type

**Every `TouchableOpacity` and `Pressable` (interactive):**

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Short description of action"
  accessibilityHint="What happens when pressed"   // only if not obvious
  accessibilityState={{ disabled: isDisabled }}   // when applicable
>
```

**Modal backdrop `Pressable` (dismiss overlay):**

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Lukk [modal name]"
  onPress={...}
/>
```

**Every `TextInput`:**

```tsx
<TextInput
  accessibilityLabel="Field name (valgfritt)"  // matches visible label
  ...
/>
```

**`Switch` components:**

```tsx
<Switch
  accessibilityLabel="What this toggle controls"
  accessibilityHint="Brief explanation of effect"
  ...
/>
```

**Selection/toggle buttons (e.g. difficulty picker):**

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={optionLabel}
  accessibilityState={{ selected: isSelected }}
  ...
/>
```

**Section headers (all-caps labels like "SAMLINGER", "FEED"):**

```tsx
<Text accessibilityRole="header" ...>SAMLINGER</Text>
```

**List rows (tappable items in a list):**

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={[title, subtitle, statusIfAny].filter(Boolean).join(", ")}
  accessibilityHint="Trykk for handlinger"  // if it opens a sheet
  ...
/>
```

**Cards that group multiple pieces of info (FeedCard, ActiveSessionCard):**

```tsx
<View
  accessible
  accessibilityLabel="Full sentence describing the card content"
  ...
/>
```

**Decorative icons and images (no semantic meaning):**

```tsx
<Ionicons ... accessible={false} />
<Image ... accessible={false} />
<View accessible={false} ...>   // initials avatar, icon wrappers
```

### `UserAvatar` is always decorative

`UserAvatar` renders with `accessible={false}` — the accessible name lives on the parent element (list row, card, etc.).

### Color contrast

Custom theme colors in `tailwind.config.js` are pre-validated at WCAG AA:

- Accent green `#1D9E75` on white: 4.6:1 ✓
- Accent green `#34D399` on `stone-800`: 7.2:1 ✓
- Do not add new color combinations without verifying contrast (use a contrast checker)
- `#78716C` (stone-500) on dark surfaces fails — avoid using it as text or icon color in dark mode

### What to avoid

- Do not add interactive elements (TouchableOpacity, Pressable, Button) without `accessibilityRole` and `accessibilityLabel`
- Do not add TextInput fields without `accessibilityLabel`
- Do not add section header labels without `accessibilityRole="header"`
- Do not mark elements as `accessible={false}` unless they are purely decorative

## What to Avoid

- Do not add a test framework unless explicitly asked
- Do not use `StyleSheet` from React Native — use NativeWind classes instead
- Do not over-engineer; keep components simple and focused
- Do not switch to Expo Router — the project uses React Navigation intentionally
- Do not add SQL migration files — schema is managed directly in the Supabase dashboard
