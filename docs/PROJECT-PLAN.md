# Puslespill-appen — Completion Plan

**Created:** 2026-07-04
**Owner:** @rubenough
**Purpose:** A phased, actionable roadmap to take the app from "working prototype with real Supabase data" to a shippable 1.0, following current best practices for the Expo SDK 55 / React Native 0.83 / React 19 / Supabase stack.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## 0. Snapshot (where we are)

**Done:** Auth (Google OAuth + SecureStore), collections CRUD, loans (loan/return, private-by-default), sessions (create/update/progress/complete/delete with photos), real activity feed, profile with loan history, dark mode, thorough accessibility, root error boundary.

**Fixed in review pass 2 (2026-07-04):** missing `@expo/vector-icons` dep, stuck loading flags, orphaned uploads, delete ordering, `player_count` corruption, silent fetch errors, shared `date.ts` / `sessionImages.ts` helpers, dead-code removal. See `tech-debt.md` banner.

**Still mock:** `FriendsScreen` only.

**Biggest gaps to 1.0:** no automated tests, no linter/CI, non-atomic multi-row writes, no Supabase-generated types, public image bucket, Friends/social not real, no error monitoring, store-readiness (permissions, assets, policy).

---

## Phase 1 — Foundation: quality gates & correctness

Goal: never regress the fixes from pass 2; make the codebase safe to change.

### 1.1 Tooling & CI

- [x] Add scripts to `package.json`: `typecheck`, `test`, `test:ci`, `lint`, `format`, `format:check`.
- [x] GitHub Actions workflow (`.github/workflows/ci.yml`): on push/PR to `main` run `typecheck` + `lint` + `format:check` + `test:ci`, npm cache.
- [x] Add ESLint (flat config, `eslint-config-expo` + `eslint-config-prettier`). `react-hooks/set-state-in-effect` set to warn (removed by the Phase 4 React Query migration).
- [x] Add Prettier (`.prettierrc`, `.prettierignore`); codebase formatted.

### 1.2 Testing (resolves TD-05)

- [x] Add `jest-expo` preset + `jest` + `@testing-library/react-native`.
- [x] Unit tests for pure utils (highest ROI): `utils/date.ts`, `utils/initials.ts`, `PuzzleProgressIcon.progressToFilled`.
- [ ] Add tests for `utils/collections.ts`.
- [ ] Test the OAuth hash-parsing logic in `AuthScreen` in isolation (extract the parse into a pure function first).
- [ ] Component tests for `ItemForm` (validation, numeric sanitisation) and `FeedCard` (action-text branches) — using `@testing-library/react-native`.
- [ ] Later: E2E smoke test with **Maestro** (login → add item → start session → update progress).

### 1.3 Typed Supabase (kills the `as any` casts)

- [ ] Generate types: `supabase gen types typescript --project-id <id> > src/lib/database.types.ts`.
- [ ] Type the client: `createClient<Database>(...)`. Remove `as any` / `as unknown as` in `FeedScreen`, `SessionDetailScreen`, `ProfileScreen`.
- [ ] Commit a short `npm run gen:types` script and document regeneration on schema change.

**Exit criteria:** CI green (typecheck + lint + tests) on every PR; no `as any` in data mapping.

---

## Phase 2 — Data integrity (backend)

Goal: make multi-row operations atomic and correct. Requires Supabase dashboard access.

### 2.1 Atomic writes (resolves TD-03 + delete race)

- [ ] `register_loan(item_id, borrower_name, is_public)` RPC — inserts loan; item status handled by the existing `trg_sync_item_status` trigger. Confirm trigger covers both loan + return.
- [ ] `delete_session(session_id)` RPC (or `ON DELETE CASCADE` FKs on `session_images` / `session_participants` → `sessions`) so the client does one call. After confirmed deletion, client removes storage objects (already the pattern).
- [ ] Replace client-side multi-step deletes/inserts with the RPCs; keep the storage-cleanup step.

### 2.2 RLS audit (before opening the feed to friends)

- [ ] Verify every table's policies: `loans` owner-only read/write; `sessions`/`items`/`session_images` readable per the intended social scope (self + mutual friends only, not the whole world).
- [ ] Confirm `borrower_name` can never be selected by non-owners even when `is_public = true` (privacy invariant from CLAUDE.md).
- [ ] Add a `friendships` table + policies to support mutual-friend visibility (see Phase 3).
- [ ] **Storage RLS for `session-images`** (from Phase 5): tighten the interim "any authenticated user" `SELECT` policy to friend-scoped, so `createSignedUrl` only succeeds for photos the requester is allowed to see.

**Exit criteria:** loan/return/delete are single round-trips; RLS reviewed with a written policy matrix.

---

## Phase 3 — Feature completion

### 3.1 Friends (replace last mock)

- [ ] `friendships` table (`user_a`, `user_b`, `status`) + RLS; friend requests (send/accept/decline).
- [ ] `FriendsScreen`: real list, search users, pending requests. Stable IDs as keys (finish TD-19).
- [ ] Feed scoping: sessions/items visible only from confirmed friends (drives the RLS in 2.2).

### 3.2 Loans ↔ friends

- [ ] Borrower picker in the loan modal: pick a friend (`borrower_user_id`) or type a free name (`borrower_name` fallback). Schema already supports both.
- [ ] Optional: notify borrower when they're recorded as having borrowed an item.

### 3.3 Wishlist (was a stub, now planned properly)

- [ ] `wishlist` table (`user_id`, `title`, `type`, `brand`, `note`, `created_at`) + RLS.
- [ ] Screen + navigation entry; "flytt til samling" action that creates an `items` row and removes the wishlist row (via RPC for atomicity).

### 3.4 Feed depth

- [ ] Pagination / infinite scroll (currently capped at 14 days + fixed limits).
- [ ] Pull-to-refresh on `FeedScreen` (consistency with other screens).

**Exit criteria:** no mock data anywhere; social graph enforced by RLS.

---

## Phase 4 — Performance, media & data layer

### 4.1 Adopt TanStack Query (React Query)

Replaces the hand-rolled `useFocusEffect` + `useState(loading/error)` pattern repeated in every screen. Gives caching, dedup, retry, background refetch, and removes most boilerplate + the "refetch on every focus" cost.

- [ ] Add `@tanstack/react-query`; wrap app in `QueryClientProvider`.
- [ ] Create query hooks (`useItems`, `useCollectionItems`, `useSessionDetail`, `useFeed`, `useLoans`) in `src/queries/` — this also satisfies the `services/` layer (TD-12).
- [ ] Mutations (`useStartSession`, `useUpdateProgress`, `useRegisterLoan`, …) with optimistic updates + `invalidateQueries`.

### 4.2 Images

- [ ] Switch `Image` → **`expo-image`** for caching, placeholders, and better memory behaviour.
- [ ] Compress/resize before upload with `expo-image-manipulator` (e.g. max 1600px, ~0.7 quality) to cut upload size and memory from base64.
- [ ] Add a lightweight loading/blur placeholder for hero + thumbnails.

### 4.3 Realtime (optional)

- [ ] Supabase realtime subscription for active sessions / feed to replace focus-refetch where it improves UX.

**Exit criteria:** one consistent data-fetching pattern; images cached and compressed.

---

## Phase 5 — Security, privacy & observability

- [~] **Image bucket → private + signed URLs (GDPR):** photos can contain identifiable people (personal data). Decision: make `session-images` **private** and serve via short-lived `createSignedUrl`, so leaked/old links expire and erasure (Art. 17) is enforceable. Client code lands first (works on public or private buckets); then flip the bucket to private + add a storage `SELECT` policy. **Depends on Phase 2:** tighten that storage policy to friend-scoped in the RLS audit.
- [x] **Remove `android.permission.RECORD_AUDIO`** from `app.json` — no audio feature; would trip store review / look like a privacy risk. Set `android.permissions` to `[]` (plugins add only camera/photos).
- [x] Confirm `.env` only contains the **anon** key + URL (both `EXPO_PUBLIC_`, bundled/public). Verified — no service-role key. Never add it to the app.
- [ ] Add **Sentry** (`@sentry/react-native` via Expo config plugin) for crash/error reporting; wire the `ErrorBoundary` to report.
- [ ] Draft a privacy policy (Google/Apple require one for an app handling accounts + photos) and link it in-app + store listings.

**Exit criteria:** storage access model decided & documented; no unjustified permissions; crashes reported.

---

## Phase 6 — Release

- [ ] Fill store metadata: descriptions (nb-NO), screenshots (reuse `docs/screenshots/`), keywords, category.
- [ ] Verify `app.json`: version, `bundleIdentifier`/`package` (`no.rubenvareide.puslespill` ✓), icons, splash.
- [ ] `eas build --profile preview` → internal test on real devices (iOS TestFlight + Android internal).
- [ ] OTA update sanity check (`expo-updates` is configured with `appVersion` runtime policy + production channel).
- [ ] `eas build --profile production` + `eas submit` to App Store / Play Store.
- [ ] Post-launch: monitor Sentry; set up `eas update` flow for JS-only fixes.

---

## Best-practices checklist (stack-specific, ongoing)

- **Native deps:** always add with `npx expo install <pkg>` so versions stay SDK-pinned (this is exactly why `@expo/vector-icons` broke).
- **No `StyleSheet`:** keep using NativeWind classes (inline styles only for values Tailwind can't express or props passed to RN Navigation).
- **React Navigation, not Expo Router** — intentional; don't migrate.
- **Strict TypeScript stays on**; no new `any`. Use Supabase-generated types.
- **Every interactive element** keeps `accessibilityRole` + `accessibilityLabel` (the app's a11y is a strength — maintain it).
- **Async handlers** that toggle a loading flag use `try/catch/finally`.
- **Data fetches** surface errors with retry, never a silent empty state.
- **Storage** goes through `utils/sessionImages.ts`; **dates** through `utils/date.ts`.
- **Schema changes** in the Supabase dashboard → immediately regenerate `database.types.ts`.

---

## Suggested sequencing

1. **Phase 1** (tooling/tests/types) — do first; everything else is safer after.
2. **Phase 2** (atomic writes + RLS) — before inviting real users.
3. **Phase 5 security quick wins** (RECORD_AUDIO, bucket decision) — cheap, do alongside Phase 2.
4. **Phase 3** (friends/wishlist) — the remaining product surface.
5. **Phase 4** (React Query + images) — can run in parallel with Phase 3.
6. **Phase 6** (release) — once 1–5 are green.
