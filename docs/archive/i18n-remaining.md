# i18n retrofit — remaining work (handoff)

> **✅ COMPLETE (2026-07-06).** All screens below have been migrated across five stacked PRs:
> Feed cluster, CollectionDetail, session cluster (SessionDetail/ProgressSheet/New/EditSession),
> ItemForm cluster (ItemForm/Add/EditItem), and AuthScreen + nav. Every user-facing string —
> visible text, placeholders, `accessibilityLabel`/`accessibilityHint`, and `Alert` copy — now
> resolves through `t()` with matching `no.json` (source of truth) + `en.json` entries.
>
> **Intentional deferrals (unchanged):** server RPC error messages (see below), `utils/date.ts`
> locale-aware follow-up, and the `Header` app-title `"Fordriv"` (a brand name, left untranslated).
> The rest of this doc is kept as the record of what was done.

The i18n **foundation is complete and proven**; what's left is mechanical: move the remaining screens' hardcoded Norwegian strings into `t()` keys. This doc is a self-contained handoff so another agent can finish it without extra context.

## Done (reference implementations to copy)

- Infra: `src/lib/i18n.ts` (i18next + expo-localization + SecureStore override), imported in `App.tsx`. Toggle in `ProfileScreen`.
- Locales: `src/locales/no.json` (source of truth) + `en.json`. Namespaces so far: `common`, `date`, `collections`, `loans`, `friends`, `profile`, `language`.
- Helpers: `utils/date.ts` (locale-aware), `utils/collectionLabels.ts` (`itemTypeLabel` / `itemTypeLabelPlural` / `difficultyLabel` / `piecesLabel` / `playersLabel`).
- **Migrated screens (copy these patterns):** `ProfileScreen`, `FriendsScreen`, `CollectionsScreen`, `FriendCollectionScreen`.

## The pattern (per screen)

1. `import { useTranslation } from "react-i18next";` → `const { t } = useTranslation();` in the component. For non-component helpers, call `i18n.t(...)` directly (see `utils/date.ts`) — but the component that renders them must use `useTranslation` so it re-renders on language change.
2. Add every user-facing string to **both** `no.json` and `en.json` under a screen namespace (e.g. `session.*`, `newSession.*`, `itemForm.*`, `feed.*`, `auth.*`, `nav.*`).
3. Replace in JSX: visible text, `placeholder`, **`accessibilityLabel` / `accessibilityHint`** (these are user-facing too), and `Alert.alert(...)` strings.
4. Category/metadata text → use `collectionLabels.ts` helpers, **not** `ITEM_LABELS` / raw "brikker"/"spillere"/difficulty.
5. Interpolation: `t("ns.key", { name, count })`. Use `_one`/`_other` plural keys for counts (see `collections.pieces_*`).
6. **Do NOT translate DB values / identifiers:** comparisons like `status === "Utlånt"`, route names, `ItemType` values (`"puslespill"`), difficulty stored values. Only display text.

## Remaining files + suggested namespace

| File                                               | Rough string count | Namespace                                          | Notes                                                                                                                        |
| -------------------------------------------------- | ------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `screens/AuthScreen.tsx`                           | ~6                 | `auth`                                             | title, tagline, all `Alert` error strings                                                                                    |
| `screens/CollectionDetailScreen.tsx`               | ~25                | `collectionDetail` (+ reuse `collections`/`loans`) | biggest: action sheet, loan modal, delete confirm, "Start økt", "Registrer utlån/retur", "Ikke tilgjengelig"                 |
| `components/ItemForm.tsx`                          | ~15                | `itemForm`                                         | field labels/placeholders, difficulty picker (use `difficultyLabel`), "Mangler tittel" alert                                 |
| `screens/AddItemScreen.tsx` / `EditItemScreen.tsx` | ~4                 | `itemForm`                                         | header/save labels (`Legg til {type}`, `Rediger {type}` — use `itemTypeLabelPlural`)                                         |
| `screens/NewSessionScreen.tsx`                     | ~20                | `newSession`                                       | section headers, participant chips, "Fullført", image/note, error alerts                                                     |
| `screens/EditSessionScreen.tsx`                    | ~10                | `editSession`                                      | headers, participant field, save                                                                                             |
| `screens/SessionDetailScreen.tsx`                  | ~25                | `session`                                          | day/date badge, FREMGANG/DELTAKERE/NOTAT, "Oppdater", ···-menu, delete confirm, fullscreen                                   |
| `components/ProgressSheet.tsx`                     | ~12                | `progress`                                         | STEPS labels/hints, "Oppdater fremgang", "Fullfør økt", note placeholder                                                     |
| `screens/FeedScreen.tsx`                           | ~6                 | `feed`                                             | AKTIVE ØKTER, FEED, empty states, `SectionError`                                                                             |
| `components/FeedCard.tsx`                          | ~8                 | `feed`                                             | action text (`la til i samlingen`, `startet en økt med {users}`, `fullførte`, `lånte ut til {name}`), badges (Ferdig/Utlånt) |
| `components/ActiveSessionCard.tsx`                 | ~4                 | `feed`                                             | "Din økt", "Dag {n}", "Bilde" placeholder                                                                                    |
| `navigation/AppNavigator.tsx`                      | ~8                 | `nav`                                              | +-modal ("Hva vil du gjøre?", item titles/subtitles), tab labels, "Velg type" alert                                          |
| `components/Header.tsx`                            | ~1                 | `nav`                                              | app title if any                                                                                                             |

## Known deferrals (leave as-is, note in PRs)

- **Server RPC error messages** (`request_to_borrow`, `accept_invite`, etc.) `raise exception` in Norwegian and surface via `error.message`. Translating them needs the RPCs to return stable error _codes_ mapped to `t()` on the client. Out of scope for the string retrofit; tracked in `docs/i18n-plan.md`.
- Once a screen is migrated, remove its now-unused `ITEM_LABELS` import.

## Verify each PR

- `npm run typecheck && npm run lint && npm run format:check && npm run test:ci`
- Toggle language in **Profil → SPRÅK** and confirm the screen switches with no leftover Norwegian.
- Heuristic leftover scan: `grep -nE '"[A-ZÆØÅ][a-zæøå]{2,}' src/screens/<File>.tsx` then eyeball (ignore DB values, route names, `className`).

## Suggested order & granularity

One screen (or one tight cluster like ItemForm+Add+Edit, or Feed+FeedCard+ActiveSessionCard) per PR. Suggested order by traffic: Feed cluster → CollectionDetail → session cluster (SessionDetail+ProgressSheet+NewSession+EditSession) → ItemForm cluster → AuthScreen → nav/Header.
