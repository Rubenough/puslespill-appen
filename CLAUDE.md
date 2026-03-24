# Puslespill-appen — Claude Instructions

## Project Overview
A React Native / Expo mobile app for managing puzzle collections, loans, and a social feed. Backend: Supabase (PostgreSQL + Auth).

## Tech Stack
- **React Native 0.83.2** + **Expo 55**
- **TypeScript** (strict mode)
- **NativeWind 4** + **Tailwind CSS 3** for styling
- **React Navigation 7** (bottom tabs + modal)
- **Supabase 2** — auth, database, real-time
- **AsyncStorage** — persistent session storage

## Commands
```bash
npx expo start          # Start dev server
npx expo start --ios    # Run on iOS simulator
npx expo start --android
npx expo start --web
```

No test runner is configured yet.

## Project Structure
```
src/
├── components/    # Reusable UI components
├── screens/       # Screen-level components
├── navigation/    # AppNavigator (tabs + modals)
├── context/       # ProfilContext (user profile)
├── lib/           # supabase.ts client
└── utils/         # Helper functions
App.tsx            # Entry point, session-based routing
```

## Naming & Language Conventions
- **Functions, constants, variables, types: English**
- **UI text (labels, placeholders, headings): Norwegian**
- **Code comments: Norwegian is fine**

## Styling
- Use NativeWind (Tailwind class names) for all styling
- Custom theme colors defined in `tailwind.config.js`: `surface`, `border`, `content`, `accent`
- Dark mode support via `useColorScheme()` — manual theme objects are used in AppNavigator

## Architecture Notes
- Auth state in `App.tsx` routes to `AuthScreen` or `AppNavigator`
- User profile fetched from Supabase `profiles` table via `ProfilContext`
- Current screens use mock data (`MOCK_SESSIONS`, `MOCK_FEED`) — Supabase integration is planned for a later phase
- The center (+) tab button opens a bottom-sheet action modal, not a screen
- Supabase credentials are stored in `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## What to Avoid
- Do not add a test framework unless explicitly asked
- Do not use StyleSheet from React Native — use NativeWind classes instead
- Do not over-engineer; keep components simple and focused
