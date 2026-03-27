# Tech Debt Audit — puslespill-appen

**Date:** 2026-03-27
**Last updated:** 2026-03-27 (Phase A + B resolved)
**Scope:** Full codebase (`src/`, `App.tsx`, config files)
**Methodology:** Manual review + priority scoring: `(Impact + Risk) × (6 − Effort)`

---

## Summary

The codebase is clean, well-structured, and has good accessibility coverage. Phase A and B debt has been resolved. The remaining open items are: (1) a critical data-integrity gap in loan operations (Phase C, requires Supabase RPC), and (2) zero test coverage. TD-12 and TD-14 are deferred until the codebase scales further.

---

## Prioritized Debt Register

| #   | ID    | Title                                                         | Category      | Impact | Risk | Effort | **Score** | **Status** |
| --- | ----- | ------------------------------------------------------------- | ------------- | ------ | ---- | ------ | --------- | ---------- |
| 1   | TD-01 | `Item.status` is an untyped string                            | Code          | 3      | 4    | 1      | **35**    | ✅ Resolved |
| 2   | TD-02 | AddItem / EditItem are near-identical screens                 | Code          | 4      | 3    | 2      | **28**    | ✅ Resolved |
| 3   | TD-03 | Loan & return are non-atomic (two separate DB writes)         | Architecture  | 4      | 5    | 3      | **27**    | ⏳ Phase C  |
| 4   | TD-04 | `as unknown as ActiveLoan[]` cast in CollectionsScreen        | Code          | 2      | 3    | 1      | **25**    | ✅ Resolved |
| 5   | TD-05 | Zero test coverage                                            | Test          | 4      | 4    | 3      | **24**    | ⏳ Phase C  |
| 6   | TD-06 | Fetch errors are silently swallowed in two screens            | Code          | 3      | 3    | 2      | **24**    | ✅ Resolved |
| 7   | TD-07 | Array index used as `key` in FeedScreen                       | Code          | 2      | 2    | 1      | **20**    | ✅ Resolved |
| 8   | TD-08 | `useFocusEffect` missing dependency in two screens            | Code          | 2      | 2    | 1      | **20**    | ✅ Resolved |
| 9   | TD-09 | ProfilContext adds a second `onAuthStateChange` subscription  | Architecture  | 2      | 2    | 2      | **16**    | ✅ Resolved |
| 10  | TD-10 | Developer name hardcoded in ProfileScreen mock                | Code          | 1      | 2    | 1      | **15**    | ✅ Resolved |
| 11  | TD-11 | WishlistScreen exists but is not wired into navigation        | Documentation | 1      | 2    | 1      | **15**    | ✅ Resolved |
| 12  | TD-12 | No data / repository layer — Supabase calls inline in screens | Architecture  | 3      | 3    | 4      | **12**    | ⏳ Phase D  |
| 13  | TD-13 | AppNavigator bottom-sheet modal uses inline styles            | Code          | 2      | 1    | 2      | **12**    | ✅ Resolved |
| 14  | TD-14 | `storage: ExpoSecureStoreAdapter as any` in supabase.ts       | Code          | 1      | 2    | 2      | **9**     | ⏳ Phase D  |

---

## Detailed Items

### TD-01 — `Item.status` is an untyped string _(Score: 35)_ ✅

**Resolved 2026-03-27.** Added `ItemStatus = "Tilgjengelig" | "Utlånt"` to `src/utils/collections.ts`. Updated `Item.status` from `string | null` to `ItemStatus | null`. TypeScript now catches invalid status strings at compile time across all callers.

---

### TD-02 — AddItem / EditItem are near-identical screens _(Score: 28)_ ✅

**Resolved 2026-03-27.** Extracted `src/components/ItemForm.tsx` — a shared component that renders the full form (header, all fields, sticky save button). Both screens are now thin wrappers (~45 lines each) that supply `initialValues`, `headerLabel`, `saveLabel`, and wire `onSave` to their respective Supabase call. `DIFFICULTY_OPTIONS` moved to `utils/collections.ts` and exported as `as const`.

---

### TD-03 — Loan & return are non-atomic _(Score: 27)_

**Where:** `src/screens/CollectionDetailScreen.tsx` — `handleLoan()`, `handleReturn()`

**Problem:** Both operations consist of two sequential Supabase mutations:

1. Insert/update the `loans` row
2. Update `items.status`

If step 2 fails after step 1 succeeds, the database is left inconsistent — a loan record exists but the item still shows as "Tilgjengelig", or a loan is marked returned but the item is still "Utlånt". This also means two round-trip network calls before the UI updates, making the action feel sluggish.

**Fix:** Wrap each operation in a Postgres function (RPC) that performs both writes in a single transaction. Supabase exposes these via `supabase.rpc('register_loan', {...})`. Alternatively, a database trigger on `loans` can auto-update `items.status`, eliminating the second call entirely from the client.

**Effort:** ~2–3 hours. Requires a Supabase function to be written and deployed. _(Requires Supabase dashboard access.)_

---

### TD-04 — `as unknown as ActiveLoan[]` in CollectionsScreen _(Score: 25)_ ✅

**Resolved 2026-03-27.** Removed the double cast. Because Supabase infers joined table rows as arrays without generated types, the data is now explicitly mapped row-by-row (`Array.isArray(row.items) ? row.items[0] ?? null : row.items`). This validates the shape at both compile time and runtime, and documents the Supabase inference quirk in a comment.

---

### TD-05 — Zero test coverage _(Score: 24)_

**Where:** Entire project. No test files, no test runner, no CI checks.

**Problem:** Pure utility functions (`getInitials`, `getAvatarColor`, `ITEM_LABELS`) have no tests. The auth flow's token-parsing logic (`AuthScreen.tsx:46–53`) is particularly risky to refactor without tests — a subtle change to how the URL hash is parsed could silently break login. As real Supabase screens grow, regressions become hard to catch without at least integration smoke tests.

**Recommended starting point:**

1. Add Jest + `@testing-library/react-native` (Expo-compatible setup)
2. Write unit tests for `getInitials`, `getAvatarColor` (zero dependencies, pure functions — easy wins)
3. Test the token-parsing logic in `AuthScreen` in isolation

**Effort:** ~half-day to set up Jest + write initial tests for utilities and auth parsing.

---

### TD-06 — Fetch errors silently swallowed in two screens _(Score: 24)_ ✅

**Resolved 2026-03-27.** Both `CollectionsScreen` and `CollectionDetailScreen` now check the `error` field from every Supabase query. On failure, a `fetchError` state is set and the screen renders an error message with a "Prøv igjen" retry button. The pattern mirrors `ProfilContext`.

---

### TD-07 — Array index as `key` in FeedScreen _(Score: 20)_ ✅

**Resolved 2026-03-27.** Added stable `id` fields to all objects in `MOCK_SESSIONS` and `MOCK_FEED`. Both `.map()` calls now use `item.id` / `session.id` as keys instead of the array index.

---

### TD-08 — `useFocusEffect` missing dependency _(Score: 20)_ ✅

**Resolved 2026-03-27.** `fetchData` (CollectionsScreen) and `fetchItems` (CollectionDetailScreen) are now wrapped in `useCallback` with their correct dependency arrays (`[user]` and `[user, type]` respectively). The `useFocusEffect` callbacks list the fetch functions as dependencies, satisfying the exhaustive-deps rule.

---

### TD-09 — ProfilContext creates a second `onAuthStateChange` subscription _(Score: 16)_ ✅

**Resolved 2026-03-27.** Removed the `onAuthStateChange` subscription from `ProfilContext`. The context now calls `useAuth()` to get `session`, and reacts via `useEffect([session, fetchProfile])` — fetching on sign-in, clearing on sign-out. The app now has a single auth listener. `fetchProfile` is stabilised with `useCallback([])`.

---

### TD-10 — Developer name hardcoded in ProfileScreen _(Score: 15)_ ✅

**Resolved 2026-03-27.** Replaced `MOCK_PROFILE` with `FALLBACK_NAME = "Ukjent bruker"`. The mock "Medlem siden" line was also removed since `profiles.created_at` is not yet wired up.

---

### TD-11 — WishlistScreen is dead code _(Score: 15)_ ✅

**Resolved 2026-03-27.** Added a roadmap comment at the top of `WishlistScreen.tsx` pointing to Fase 4 as the target for wiring it into navigation.

---

### TD-12 — No data / service layer — Supabase calls inline in screens _(Score: 12)_

**Where:** All screens that talk to Supabase (`CollectionsScreen`, `CollectionDetailScreen`, `AddItemScreen`, `EditItemScreen`, `ProfileScreen`).

**Problem:** There is no abstraction between UI and data fetching. All queries are written directly in screen components. As the app grows this means: query duplication (items are fetched in both `CollectionsScreen` and `CollectionDetailScreen` with slightly different field lists), difficulty mocking data for tests, and a scattered blast radius when the schema changes.

**Note:** This is low priority right now because the app is early-stage and the screens are few. Over-engineering a service layer prematurely would add unnecessary indirection. Revisit at ~Fase 3 when there are 8+ real screens.

**Fix (when appropriate):** Extract Supabase calls into `src/services/itemsService.ts`, `src/services/loansService.ts` etc. with typed return values. Screens call service functions, not `supabase` directly.

**Effort:** ~half-day to full day refactor when the time comes.

---

### TD-13 — AppNavigator bottom-sheet modal uses inline styles _(Score: 12)_ ✅

**Resolved 2026-03-27.** All modal content (backdrop, sheet container, drag handle, title, item rows, icon wrappers, text) now uses NativeWind classes. The `tabBarStyle` and the centre tab button circle still use inline styles — both are legitimate exceptions (passed directly to React Navigation / rendered inside `tabBarButton`).

---

### TD-14 — `storage: ExpoSecureStoreAdapter as any` in supabase.ts _(Score: 9)_

**Where:** `src/lib/supabase.ts:51`

**Problem:** The `as any` cast on the custom storage adapter suppresses type-checking of the adapter's interface. This is a common workaround in Expo/Supabase integrations due to slight interface mismatches between `SupportedStorage` and the Expo SecureStore API. The actual runtime behaviour is correct. Low priority unless Supabase upgrades their storage interface in a breaking way.

**Fix:** Implement the `SupportedStorage` interface explicitly on `ExpoSecureStoreAdapter` and add the correct type annotation, removing the need for `as any`.

**Effort:** ~20 min.

---

## Phased Remediation Plan

This plan is designed to run **alongside feature development** — nothing here requires a dedicated "debt sprint". Each phase has a clear theme.

### Phase A — Quick wins ✅ Complete

| ID    | Action                                                               | Status      |
| ----- | -------------------------------------------------------------------- | ----------- |
| TD-01 | Add `ItemStatus` union type; update `Item` and all callers           | ✅ Done      |
| TD-04 | Remove `as unknown as`; explicit row mapping                         | ✅ Done      |
| TD-07 | Add stable `id` fields to mock data; use as keys                     | ✅ Done      |
| TD-08 | Fix `useFocusEffect` dependency arrays                               | ✅ Done      |
| TD-10 | Replace hardcoded dev name with generic placeholder                  | ✅ Done      |
| TD-11 | Add roadmap comment to WishlistScreen                                | ✅ Done      |
| TD-13 | Port AppNavigator modal to NativeWind classes                        | ✅ Done      |

---

### Phase B — Before next Supabase feature ✅ Complete

| ID    | Action                                                              | Status      |
| ----- | ------------------------------------------------------------------- | ----------- |
| TD-02 | Extract shared `ItemForm` component; delete duplication             | ✅ Done      |
| TD-06 | Add error state + user-facing message to `fetchData` / `fetchItems` | ✅ Done      |
| TD-09 | Remove duplicate auth subscription from `ProfilContext`             | ✅ Done      |

---

### Phase C — Before Fase 3 / social features (~1–2 days)

These require backend work or are critical once real users are involved:

| ID    | Action                                                          |
| ----- | --------------------------------------------------------------- |
| TD-03 | Implement Postgres RPC (or trigger) to make loan/return atomic  |
| TD-05 | Add Jest; write unit tests for utilities and auth token parsing |

---

### Phase D — As the codebase scales (ongoing)

Defer until there are noticeably more screens or a test-suite is in place:

| ID    | Action                                           |
| ----- | ------------------------------------------------ |
| TD-12 | Extract a `services/` layer for Supabase queries |
| TD-14 | Properly type the SecureStore adapter            |

---

## What's Already Good

- **Accessibility** is thorough and consistent — `accessibilityRole`, `accessibilityLabel`, `accessibilityState` are applied correctly across all interactive elements.
- **Auth flow** correctly handles cancellation, missing tokens, and session restoration via `ExpoSecureStore`.
- **Privacy boundary** for loans is correctly enforced in both UI logic and CLAUDE.md conventions.
- **Dark mode** is handled cleanly via a pre-validated custom Tailwind theme.
- **TypeScript strict mode** is on — the codebase is clean of any implicit `any` except the one explicit cast in TD-14.
- **Error boundary** at the app root catches uncaught render errors gracefully.
- **Error handling** is now consistent across all data-fetching screens — `CollectionsScreen`, `CollectionDetailScreen`, and `ProfilContext` all surface errors with retry options.
- **Single auth listener** — `ProfilContext` no longer maintains its own `onAuthStateChange` subscription.
