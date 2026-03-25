# Puslespill-appen — Claude Instructions

## Project Overview
A React Native / Expo mobile app for managing puzzle collections, loans, and a social feed. Backend: Supabase (PostgreSQL + Auth).

## Tech Stack
- **React Native 0.83.2** + **Expo 55**
- **TypeScript** (strict mode)
- **NativeWind 4** + **Tailwind CSS 3** for styling
- **React Navigation 7** (bottom tabs + modal)
- **Supabase 2** — auth, database, real-time
- **expo-secure-store** — encrypted session storage (replaces AsyncStorage)
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
├── components/         # Reusable UI components
│   └── GoogleSignInButton.tsx  # Google-branded OAuth button
├── screens/            # Screen-level components
├── navigation/         # AppNavigator (tabs + modals)
├── context/
│   ├── AuthContext.tsx     # Session, user, isLoggedIn — use useAuth() anywhere
│   └── ProfilContext.tsx   # User profile from Supabase profiles table
├── lib/                # supabase.ts client
└── utils/              # Helper functions (initials.ts, collections.ts)
App.tsx                 # Entry point — wraps AuthProvider, routes on session
```

## Naming & Language Conventions
- **Functions, constants, variables, types: English**
- **UI text (labels, placeholders, headings): Norwegian**
- **Code comments: Norwegian is fine**

## Styling
- Use NativeWind (Tailwind class names) for all styling
- Custom theme colors defined in `tailwind.config.js`: `surface`, `border`, `content`, `accent`
- Dark mode support via `useColorScheme()` — manual theme objects are used in AppNavigator
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
- Auth state in `App.tsx` routes to `AuthScreen` or `AppNavigator`
- React Navigation is used (not Expo Router) — `Stack.Protected` does not apply
- The center (+) tab button opens a bottom-sheet action modal, not a screen

### Data
- Current screens use mock data (`MOCK_SESSIONS`, `MOCK_FEED`) — Supabase integration planned for a later phase
- Supabase credentials in `.env`: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## What to Avoid
- Do not add a test framework unless explicitly asked
- Do not use StyleSheet from React Native — use NativeWind classes instead
- Do not over-engineer; keep components simple and focused
- Do not switch to Expo Router — the project uses React Navigation intentionally
