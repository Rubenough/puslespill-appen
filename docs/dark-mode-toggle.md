# Dark / light mode toggle — design + plan

**Branch:** `feat/dark-mode-toggle` (worktree off `main`, isolated from the in-flight
`feat/i18n-collections` work).

## Goal

Today the app follows the OS colour scheme only. There is no way for a user to force light or
dark independent of the system. This adds a **user-controlled theme preference** with three
states — **System / Light / Dark** — persisted across launches, applied app-wide (NativeWind
`dark:` variants **and** the imperative colour values in the tab bar and session detail).

## Why the current setup can't toggle

Two independent mechanisms read the colour scheme, and both are hard-wired to the OS:

1. **NativeWind `dark:` variants** — `tailwind.config.js` sets `darkMode: "media"`, which
   strictly follows the device. In this mode `colorScheme.set()` is ignored.
2. **Imperative `useColorScheme()` from `react-native`** — used in `AppNavigator` (tab-bar
   tint/background) and `SessionDetailScreen`. This hook reads the OS appearance directly and
   never sees an app-level override.

To make a manual toggle authoritative, **both** must be driven by a single app-controlled
scheme.

## UX decision

Chosen: **inline on the Profile screen**, mirroring the existing language picker — a segmented
row of three pills directly below the `SPRÅK` section. No dedicated Settings screen for now.

- The language toggle **stays on Profile** (owned by the in-flight i18n work; not moved here to
  avoid merge churn).
- A dedicated `SettingsScreen` that consolidates Appearance + Language + future preferences
  (notifications, privacy, account) is a sensible **follow-up** once the app grows past two
  preferences and/or the i18n branch has landed. Noted here, not built now.
- Ordering **System / Light / Dark**: System first because it is the default and the safest
  choice; the app should look "correct" without the user touching anything.

## Architecture

Mirror the established `i18n.ts` + Context pattern.

### `src/context/ThemeContext.tsx` (new)

- `ThemePreference = "light" | "dark" | "system"`, `THEME_OPTIONS = ["system", "light", "dark"]`,
  `THEME_KEY = "app_theme"`.
- `ThemeProvider` holds the **preference** (`"system"` is not derivable from NativeWind's resolved
  `"light" | "dark"`, so we track it ourselves), applies it via NativeWind's imperative
  `colorScheme.set(pref)`, and persists it to `expo-secure-store` (same store as the language
  choice).
- On mount it reads the saved preference, applies it, and flips a `ready` flag.
- `useTheme()` → `{ preference, setPreference, ready }`.

### `tailwind.config.js`

`darkMode: "media"` → `darkMode: "class"` — required for `colorScheme.set()` to drive the
`dark:` variants.

### Imperative colour readers → NativeWind hook

`AppNavigator.tsx` and `SessionDetailScreen.tsx` swap `useColorScheme` from `react-native` for
`useColorScheme` from `nativewind` (returns the **resolved, app-controlled** scheme). This is the
single change that keeps the tab bar and session-detail colours in sync with the toggle.

### `App.tsx`

Wrap the tree in `ThemeProvider` (outside `AuthProvider`, so `AuthScreen` is themed too). Gate
the splash-screen hide on `themeReady && !authLoading` so there is **no flash** of the wrong
theme while the persisted preference loads from SecureStore.

### `ProfileScreen.tsx`

Add an `UTSEENDE` section below the language picker: three pills (System / Lyst / Mørkt) using
the exact styling of the language toggle, `accessibilityState={{ selected }}`, driven by
`useTheme()`.

### i18n

New isolated `theme` namespace in `no.json` (source of truth) + `en.json` — additive, to keep
merge risk with the i18n branch minimal. Keys: `theme.title`, `theme.system`, `theme.light`,
`theme.dark`.

## Files touched

| File                                          | Change                                                  |
| --------------------------------------------- | ------------------------------------------------------- |
| `src/context/ThemeContext.tsx`                | **new** — preference store, persistence, apply-on-mount |
| `tailwind.config.js`                          | `darkMode: "media"` → `"class"`                         |
| `App.tsx`                                     | wrap in `ThemeProvider`; gate splash on theme ready     |
| `src/navigation/AppNavigator.tsx`             | `useColorScheme` from `nativewind`                      |
| `src/screens/SessionDetailScreen.tsx`         | `useColorScheme` from `nativewind`                      |
| `src/screens/ProfileScreen.tsx`               | `UTSEENDE` segmented control                            |
| `src/locales/{no,en}.json`                    | `theme` namespace                                       |
| `src/context/__tests__/ThemeContext.test.tsx` | **new** — persistence + apply behaviour                 |

## Testing

- Unit: `ThemeContext` loads a persisted preference and calls `colorScheme.set`, defaults to
  `"system"` when nothing is stored, and persists + applies on `setPreference`.
- Manual: toggle each option; confirm tab bar, feed, profile, and session detail all flip
  immediately; kill + relaunch and confirm the choice survives; set to System and flip the OS
  appearance to confirm live-follow.

## Out of scope / follow-ups

- Dedicated `SettingsScreen` + relocating the language toggle.
- Migrating `AppNavigator`'s local `colors` map to shared theme tokens (pre-existing duplication).
