# Internationalization (i18n) — Norwegian ⇄ English

**Goal:** a user-facing language toggle (Norwegian default, English second), device-locale aware, with a manual override that persists. Norwegian stays the source language.

**Why now:** the app has ~1000+ hardcoded Norwegian UI strings. Every new screen adds more. Standing up the i18n foundation _before_ Phase 2 means new UI (borrow loop) is authored with keys from day one, so we don't build more debt to retrofit. The **retrofit of existing screens** is a separate, mechanical effort that can run incrementally.

---

## Stack (Expo SDK 55)

- **`i18next` + `react-i18next`** — the standard; scales to more languages, supports interpolation/plurals, and has a clean `useTranslation()` hook.
- **`expo-localization`** — read the device locale for the initial default.
- Persist the manual choice in **SecureStore** (already a dependency) so it survives restarts and overrides the device locale.

```
npx expo install expo-localization
npm install i18next react-i18next
```

## Structure

```
src/
├── locales/
│   ├── no.json          # source of truth (Norwegian)
│   └── en.json          # English
└── lib/
    └── i18n.ts          # init: detect device locale, load persisted override
```

- `i18n.ts` initializes i18next with `no` as fallback, resources from the two JSON files, and language = persisted override ?? device locale (mapped to `no`/`en`, default `no`).
- A tiny `LanguageContext` (or just `i18n.changeLanguage` + a SecureStore write) exposes `{ language, setLanguage }`.
- Wrap the app once (in `App.tsx`) so `useTranslation()` works everywhere.

## Usage pattern

```tsx
const { t } = useTranslation();
<Text>{t("friends.title")}</Text>
<TextInput accessibilityLabel={t("friends.codeField")} placeholder={t("friends.enterCode")} />
```

- **accessibilityLabels/hints go through `t()` too** — they're user-facing.
- Keys are namespaced by screen/domain: `friends.*`, `collections.*`, `session.*`, `borrow.*`, `common.*`.
- Interpolation for dynamic text: `t("session.dayStarted", { day, date })`.
- The date helpers (`utils/date.ts`) currently hardcode `nb-NO` and Norwegian words ("i dag", "3 dager siden"). These must become locale-aware: pass the active language to `toLocaleDateString` and move the relative words into translation keys (with plurals).

## Toggle UI

A **language setting in `ProfileScreen`** (a small "Innstillinger / Settings" section): two options (Norsk / English) → `setLanguage()`. Deferred until after the foundation + a first batch of keys exist.

## Migration approach (retrofit)

1. Stand up `i18n.ts` + `no.json` (start with `common.*` + one screen) + wire `App.tsx`.
2. Author **all new Phase 2 UI** with keys (no new hardcoded strings).
3. Retrofit existing screens **one per PR**, moving strings to `no.json` and adding `en.json` in the same PR. Mechanical and low-risk; keeps diffs reviewable.
4. Add the ProfileScreen toggle once ≥ the primary flows are translated.
5. Add a lint guard (optional) to flag string literals in JSX under `src/screens`/`src/components`.

## Server-side messages

RPCs (e.g. `request_to_borrow`) currently `raise exception` in Norwegian, surfaced via `error.message`. Options: (a) keep them Norwegian short-term, (b) return stable error _codes_ from RPCs and map to `t()` on the client. Prefer (b) longer-term; acceptable to start with (a) and a TODO.

## Convention change

Once i18n lands, the CLAUDE.md rule "UI text: Norwegian" becomes: **UI text goes through `t('key')`; `no.json` is the source of truth; add the `en.json` entry in the same change.** Until a screen is migrated, its existing Norwegian literals stay as-is.
