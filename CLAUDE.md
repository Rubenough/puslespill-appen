# Puslespill-appen — Claude Instructions

## Project Overview
A React Native / Expo mobile app for managing puzzle and board game collections, loans, and a social feed. Backend: Supabase (PostgreSQL + Auth).

## Tech Stack
- **React Native 0.83.2** + **Expo 55**
- **TypeScript** (strict mode)
- **NativeWind 4** + **Tailwind CSS 3** for styling
- **React Navigation 7** (bottom tabs + stack + modal)
- **Supabase 2** — auth, database, real-time
- **expo-secure-store** — encrypted session storage
- **expo-splash-screen** — prevents white flash during auth check

## Commands
```bash
npx expo start                # Start dev server
npx expo start --localhost    # Use for iOS Simulator (avoids LAN IP timeout)
npx expo start --ios          # Run on iOS simulator
npx expo start --android
npx expo start --web
```

No test runner is configured yet.

## Project Structure
```
src/
├── components/
│   ├── GoogleSignInButton.tsx  # Google-branded OAuth button (inline styles)
│   ├── Header.tsx              # App title bar with notifications icon
│   ├── ErrorBoundary.tsx       # Class component error handler
│   ├── UserAvatar.tsx          # Avatar with initials fallback
│   ├── ActiveSessionCard.tsx   # Card for active puzzle sessions
│   └── FeedCard.tsx            # Card for activity feed items
├── screens/
│   ├── AuthScreen.tsx          # Google OAuth login
│   ├── FeedScreen.tsx          # Active sessions + activity feed (mock data)
│   ├── CollectionsScreen.tsx   # Lists collection types with counts (real Supabase)
│   ├── CollectionDetailScreen.tsx  # Items in a collection (real Supabase)
│   ├── AddItemScreen.tsx       # Add puzzle/board game form (real Supabase insert)
│   ├── ProfileScreen.tsx       # User profile + sign-out (real Supabase profile)
│   ├── FriendsScreen.tsx       # Friends list (mock data)
│   └── NewSessionScreen.tsx    # Placeholder (empty)
├── navigation/
│   ├── RootNavigator.tsx       # Stack: Tabs + AddItem modal
│   ├── AppNavigator.tsx        # Bottom tab navigator (5 tabs)
│   └── CollectionsStack.tsx    # Stack: CollectionsList → CollectionDetail
├── context/
│   ├── AuthContext.tsx         # Session, user, isLoggedIn — useAuth()
│   └── ProfilContext.tsx       # User profile from profiles table — useProfil()
├── lib/
│   └── supabase.ts             # Supabase client with ExpoSecureStoreAdapter
└── utils/
    ├── initials.ts             # Avatar initial generation + deterministic colors
    └── collections.ts          # ItemType, ITEM_ICONS, ITEM_LABELS
App.tsx                         # Entry point — wraps AuthProvider, routes on session
```

## Naming & Language Conventions
- **Functions, constants, variables, types: English**
- **UI text (labels, placeholders, headings): Norwegian**
- **Code comments: Norwegian is fine**

## Styling
- Use NativeWind (Tailwind class names) for all styling
- Custom theme colors in `tailwind.config.js`: `surface`, `border`, `content`, `accent` (green)
- Dark mode via `useColorScheme()` — manual theme objects used in AppNavigator
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

### Contexts
- `useAuth()` — returns `{ session, user, isLoggedIn, loading }`
- `useProfil()` — returns `{ profil, loading, error, retry }` from `profiles` table (only mounted when logged in)

### Navigation
```
RootNavigator (Stack)
├── Tabs (AppNavigator — BottomTab)
│   ├── Feed → FeedScreen
│   ├── Samlinger → CollectionsStack
│   │   ├── CollectionsList → CollectionsScreen
│   │   └── CollectionDetail → CollectionDetailScreen
│   ├── NyOkt → placeholder (center + button opens modal)
│   ├── Venner → FriendsScreen
│   └── Profil → ProfileScreen
├── AddItem (Modal) → AddItemScreen
└── EditItem (Modal) → EditItemScreen
```
- Auth state in `App.tsx` routes to `AuthScreen` or `RootNavigator`
- React Navigation is used (not Expo Router) — `Stack.Protected` does not apply
- The center (+) tab button opens an action modal with options: add item, start session, register loan
- "Legg til i samlingen" → type selection alert → navigates to `AddItemScreen` with type param

### Database
Supabase tables in use:
- `profiles` — user profile (id, full_name, avatar_url)
- `items` — puzzle/board game collection (id, owner_id, type, title, brand, piece_count, player_count, difficulty, status, created_at)
- `loans` — loan records (id, item_id, owner_id, borrower_user_id [nullable], borrower_name, loaned_at, returned_at [null = active loan], is_public)

Item types: `"puslespill"` | `"brettspill"` (defined in `utils/collections.ts` as `ItemType`)

### Privacy: loans
Loans are **private by default** (`is_public = false`). Borrower identity must never leak to users who are not the owner.
- RLS: only `owner_id = auth.uid()` can read/write their own loans
- `is_public = true` means the loan *activity* (not borrower name) can be shown to mutual friends in the feed — e.g. "Ruben lånte ut et puslespill" without naming who
- Borrower name is only ever shown to the item owner, never to other users — even if `is_public = true`
- `borrower_user_id` is for future friend-picker integration; `borrower_name` is always stored as a display fallback (including for non-app users)

### Data status per screen
| Screen | Data source |
|--------|-------------|
| CollectionsScreen | Real — Supabase `items` table |
| CollectionDetailScreen | Real — Supabase `items` table, pull-to-refresh + focus-refresh |
| AddItemScreen | Real — inserts to Supabase `items` |
| ProfileScreen | Hybrid — profile from Supabase, stats are mock |
| FeedScreen | Mock — `MOCK_SESSIONS`, `MOCK_FEED` |
| FriendsScreen | Mock — `MOCK_FRIENDS` |
| LoansScreen | Slettet — utlån lever i CollectionsScreen + ProfileScreen (Fase 3) |
| NewSessionScreen | Empty placeholder |

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
