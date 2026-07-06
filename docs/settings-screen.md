# Dedicated Settings screen — design + plan

**Status:** ✅ Shipped (PR 1). Follow-up to the theme toggle (#16), which parked a dedicated
Settings screen as the natural next step (see [`dark-mode-toggle.md`](./dark-mode-toggle.md)).
The design below is retained as the record; **§10 documents where the shipped code corrected the
plan** after review.

## 1. Why now / UX rationale

The Profile tab has become two things at once: **identity + activity** (avatar, name, loan
history) and a **preferences dump** (sign-out, language, theme, stacked as scrolling segmented
controls). With Phase 2 loans shipped there is a clear pipeline of _more_ preferences coming
(borrow-request notifications, due-date reminders, privacy/visibility, account, about/legal).
Segmented controls stacked in a scroll view don't scale to that. A dedicated Settings screen is
the conventional, scalable home — and the codebase already has the building blocks for it.

## 2. Reuse what already exists

- **`RequestsScreen` is the template for a pushed full-screen route** — the root stack uses
  global `headerShown: false`, so the screen renders its own header row (back chevron `#78716C` +
  title, `paddingTop: insets.top + 16`, `bg-surface` + bottom border). `SettingsScreen` copies
  this exactly.
- **The theme/language segmented controls** already exist on `ProfileScreen` — they move over
  verbatim (same tokens, same accessibility), no redesign.

## 3. Information architecture — what moves, what stays

| Stays on **Profile**             | Moves to **Settings**                         |
| -------------------------------- | --------------------------------------------- |
| Avatar + name                    | **Appearance** (theme: System / Light / Dark) |
| Loan history (identity/activity) | **Language** (Norsk / English)                |
|                                  | **Sign out** (bottom, destructive) — see §9   |

Language and theme **move** (not duplicate) — one home per preference. Sign-out relocating to
Settings is the one real judgment call (see §9).

## 4. Navigation & entry point

- Add `Settings: undefined` to `RootStackParamList` and a `<Stack.Screen name="Settings" />` in
  `RootNavigator` (pushed, like `Requests`).
- Entry: a **gear icon (`settings-outline`) top-right on `ProfileScreen`**. Profile doesn't use
  the shared `Header`, so add a small top row — name/avatar stay centered, the gear sits top-right
  → `navigation.navigate("Settings")`. (Not a global `Header` gear — settings belongs to Profile,
  not every tab.)

## 5. Layout (wireframe)

```
┌──────────────────────────────┐
│  ‹  Innstillinger            │   ← RequestsScreen-style header
├──────────────────────────────┤
│  UTSEENDE                     │
│  [ System ][ Lyst ][ Mørkt ] │   ← segmented control (moved as-is)
│                               │
│  SPRÅK                        │
│  [ Norsk ][ English ]        │   ← segmented control (moved as-is)
│                               │
│  ── (future: VARSLER, KONTO) │   ← navigation rows w/ chevron later
│                               │
│  [        Logg ut         ]  │   ← destructive, bottom
│  Fordriv v1.0.0 (build)      │   ← quiet version footer
└──────────────────────────────┘
```

## 6. Files touched

| File                                            | Change                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/screens/SettingsScreen.tsx`                | **new** — header + Appearance + Language + Sign out (+ version footer)                                                          |
| `src/navigation/RootNavigator.tsx`              | add `Settings` route                                                                                                            |
| `src/screens/ProfileScreen.tsx`                 | add gear → Settings; **remove** the language + theme sections (+ sign-out if moved)                                             |
| `src/locales/{no,en}.json`                      | new `settings` namespace (`settings.title`, `settings.appearance`, `settings.version`); reuse existing `theme.*` / `language.*` |
| `src/screens/__tests__/SettingsScreen.test.tsx` | optional — renders sections; toggles call `setPreference` / `setLanguage`                                                       |

## 7. Accessibility (per project rules)

- Section labels `accessibilityRole="header"`; back button `accessibilityRole="button"` +
  `accessibilityLabel={t("common.back")}` (reuse the existing key).
- Segmented options keep `accessibilityState={{ selected }}`.
- Sign-out gets a confirm `Alert` (it currently signs out immediately — moving it is a good moment
  to add the confirmation).

## 8. Phased delivery (small PRs, i18n-agent-friendly)

1. **PR 1** — `SettingsScreen` + route + gear entry, with theme/language **moved** off Profile.
   This is the whole user-visible change.
2. **PR 2 (optional/later)** — first "navigation row" settings (e.g. borrow-request notifications
   toggle) once that backend exists.

Same isolated-worktree-off-`main` → PR → merge flow used for the theme work, rebasing if the
i18n / Phase 2 branches move.

## 9. Open decisions (recommendations)

1. **Sign-out location** — _recommend moving to Settings_ (bottom, destructive) + add a confirm
   dialog. Alternative: keep it on Profile.
2. **Version footer** — _recommend yes_ (`expo-constants` → `nativeApplicationVersion`); cheap and
   useful for a friend-group beta.
3. **Header title** — Norwegian **"Innstillinger"** (matches `nb-NO`; app brand is "Fordriv").

## 10. Implementation notes — corrections applied at build

The plan was reviewed before coding; five points were corrected in the shipped `SettingsScreen`:

1. **Version footer uses `expo-application`, not `expo-constants`.** `nativeApplicationVersion` is
   an `expo-application` API (the old `Constants.nativeAppVersion` is deprecated), and neither
   package was previously installed. Shipped: `npx expo install expo-application`, then
   `Application.nativeApplicationVersion` + `nativeBuildVersion`. **Native module added → the dev
   client must be rebuilt** (`npm run rebuild:check`); in an un-rebuilt client the version falls
   back to `"1.0.0"`.
2. **Back chevron is not hardcoded `#78716C`.** stone-500 fails contrast on dark surfaces
   (CLAUDE.md). The chevron (and the Profile gear) read `useColorScheme()` **from `nativewind`**
   and pick the content-secondary token per scheme (`#78716C` light / `#A8A29E` dark).
3. **i18n keys.** New `settings` namespace in both locales at parity: `title`, `language`
   (moved off the now-removed `profile.language`), `signOutConfirmTitle`, `signOutConfirmMessage`,
   `version`. The Appearance header **reuses `theme.title`** (no duplicate `settings.appearance`).
   Sign-out Alert buttons reuse `common.cancel` + `profile.signOut`.
4. **Gear entry a11y.** The Profile gear has `accessibilityRole="button"`,
   `accessibilityLabel={t("settings.title")}`, and `hitSlop`.
5. **Bottom safe-area.** The scroll content pads `insets.bottom + 24` so the sign-out button and
   version footer clear the home indicator.

Not done (deferred, low risk): the optional `SettingsScreen` render/sign-out-confirm test (§6) —
the moved toggles are already covered by `ThemeContext.test`; the one new behaviour is the
sign-out confirm Alert. Worth adding if this screen grows.
