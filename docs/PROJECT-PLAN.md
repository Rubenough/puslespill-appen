# Fordriv — Completion Plan (social-first re-sequence)

**Created:** 2026-07-04 · **Re-sequenced:** 2026-07-04 · **Owner:** @rubenough
**Working name:** _Fordriv_ (conceptual, not final).
**Purpose:** Take the app from "well-built puzzle/loan tracker" to the product it's actually meant to be — a **social lending library for a closed friend group** — following current best practices for the Expo SDK 55 / RN 0.83 / React 19 / Supabase stack.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## ▶︎ Resume here (status 2026-07-06, updated)

**Concept spine is complete:** friends (invite codes, mutual, friend-scoped RLS) → browse a friend's collection → **borrow-request loop** (ask → approve/decline → tracked loan). All backend RPCs are live in Supabase; types regenerated.

**Phase 2 — the lending loop — is now feature-complete** (bar notifications):

- **i18n retrofit fully done** — every screen migrated; app is bilingual (`no`/`en`), `no.json`/`en.json` at full key parity. [`docs/i18n-remaining.md`](./i18n-remaining.md) is closed.
- **Borrow-loop polish** — unread badge on the Header bell; cancel-a-request from `FriendCollectionScreen`; a `borrowed` feed event.
- **Borrowing surfaces** — `CollectionsScreen` now has a **"DU LÅNER NÅ"** section (what you're borrowing) alongside "UTLÅNT NÅ", via a borrower-scoped `loans` SELECT policy.
- **Full return lifecycle** — borrower marks "Retur meldt" → owner confirms; owner can also **request a return + note**; borrower can **undo**; loans carry a **due date** (overdue highlighted). New columns/RPCs documented in [`docs/phase2-borrow-loop.md`](./phase2-borrow-loop.md) §C.
- **Expo SDK 55 dependency alignment** merged (Android dev build); `eslint-config-expo` held at `^57` (SDK-aligned `~55.0.1` crashes lint).

**Also done earlier:** CI (typecheck/lint/format/tests), typed Supabase client, private image bucket + signed URLs (GDPR), dark-mode/appearance toggle.

**Pick up next (in priority order):**

1. **Phase 2.2 Notifications** — `expo-notifications` + push token on `profiles` + Supabase Edge Function (borrow request/approve, **loan reminders / overdue nudges** — `loans.due_at` now exists to drive them). Design in [`docs/phase2-borrow-loop.md`](./phase2-borrow-loop.md) §Notifications.
2. **Due date on the approve-a-request flow** — currently `due_at` is only set on manual "Registrer utlån" loans; extend `approve_request` to accept a date + add a picker in `RequestsScreen`.
3. **Phase 2.3 Swap/give-away status** and **2.4 Wishlist** (see below).
4. **Deferred DB tasks** (batch when next in the SQL editor): regenerate types (`npm run gen:types`) to replace the **hand-edited** `database.types.ts` loan columns/RPCs; `delete_session` RPC; CHECK/NOT NULL column constraints (unlocks removing the last `as any` casts); dedupe policies in [`docs/db-cleanup.md`](./db-cleanup.md).

**Then:** Phase 3 (activity-model unification + React Query) and Phase 4 (release: Apple Sign-In gate, Sentry, privacy policy, store).

---

## Why this was re-sequenced

A product review found a gap between the **concept** (friends share/borrow physical things; "alle kan se hva andre eier, låne og bytte") and the **build** (deep, polished _puzzle-progress_ logging; the social core is mock or missing). The target users are explicitly _"ikke hardcore statistikk-fokuserte"_, yet the deepest feature is a progress tracker.

**Decision:** freeze feature-polish on solo activity logging and build the **concept spine first** — friends → see each other's collections → borrow between each other. Everything else re-orders behind that.

### The concept spine (new priority order)

1. ✅ **Friends graph** — mutual friendships via invite codes (`friendships` + RPCs), real `FriendsScreen`, and reads locked to friends (Step 4 applied) — the "feed reads all users" hole is closed.
2. ✅ **Browse a friend's collection** — `FriendCollectionScreen` delivers "alle kan se hva andre eier."
3. **Borrow-request loop** — request → approve → handoff → return. Turns the current single-sided loan _notebook_ into a shared _library_. ← **next**

Activity logging (sessions) gets **unified across categories** later, with puzzle-% demoted to an optional attribute so board games stop being second-class.

### Old → new phase mapping

| Old plan                                                            | Now                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Phase 1 (tooling/tests/types)                                       | **Track 0** (continuous hygiene) — CI/lint/tests done; types + more tests remain                   |
| Phase 2.1 (atomic writes)                                           | **Track 0** — loan/return already atomic via `trg_sync_item_status`; only `delete_session` remains |
| Phase 2.2 (RLS audit) + Phase 3.1 (friends) + storage policy        | **Phase 1 — Social foundation** (merged; they're one unit)                                         |
| Phase 3.2 (loans↔friends) + 3.3 (wishlist) + Phase 4 loan reminders | **Phase 2 — The lending loop**                                                                     |
| Phase 4 (React Query + images) + session model                      | **Phase 3 — Activity unification**                                                                 |
| Phase 6 (release) + Apple sign-in + Sentry + privacy policy         | **Phase 4 — Release readiness**                                                                    |

---

## Track 0 — Continuous hygiene (runs alongside every phase)

Not a blocking phase; keep these green/moving as you build.

- [x] CI (typecheck + lint + format + tests) on push/PR to `main`.
- [x] ESLint (flat, `eslint-config-expo`) + Prettier.
- [x] Jest (`jest-expo`) + tests for `date`, `initials`, `progressToFilled`, `toStoragePath`.
- [x] Loan/return atomic via `trg_sync_item_status` trigger (one client write).
- [x] Session images: private bucket + signed URLs (GDPR).
- [x] **Supabase-generated types** (`src/lib/database.types.ts`, via `npm run gen:types`) → client typed with `createClient<Database>`. Generated file is git-tracked but excluded from lint/format.
- [ ] **Regenerate types** — the `loans` columns (`due_at`, `return_requested_at`, `owner_return_requested_at`, `owner_return_note`) and RPCs (`mark_loan_returned`, `unmark_loan_returned`) were **hand-edited** into `database.types.ts` because the client shipped before the SQL. Run `npm run gen:types` (after the §C SQL is applied — it is) to regenerate the identical shape and drop the manual edits.
- [ ] **Finish cast removal — needs DB constraints.** Generated types revealed the DB stores `items.type/difficulty/status` as plain `text` (→ `string`) and `sessions.started_at` / `items.created_at` as nullable-with-default. So the app's enum narrowing + non-null feed timestamps still need boundary casts. Proper fix: add `CHECK`/enum + `NOT NULL` constraints in the dashboard, regenerate, then delete the remaining `as any` in `FeedScreen` and `as unknown as` in `SessionDetailScreen` / `ProfileScreen`.
- [ ] `delete_session(session_id)` RPC or `ON DELETE CASCADE` on `session_images` / `session_participants` → single-call delete; keep storage cleanup after.
- [x] More tests as logic lands — `collections`, `AuthScreen` token-parse (extracted to pure `parseOAuthRedirect`). (Ongoing for future logic.)
- [ ] npm-audit findings: all are Expo **dev-tooling** transitive deps (not shipped) — resolve at the next SDK bump, don't `--force`.
- [ ] Optional DB dedupe — redundant RLS policies tagged in [`docs/db-cleanup.md`](./db-cleanup.md) (harmless; run whenever).

---

## Phase 1 — Social foundation 🏗️ (the keystone)

**Goal:** the friend group becomes real, and the whole app narrows from "all users" to "my friends." This unblocks everything social and closes the current privacy hole.

### 1.1 Friend graph (backend)

- [ ] `friendships` table (`requester_id`, `addressee_id`, `status` = pending/accepted, `created_at`) + RLS (each side can see rows they're part of).
- [ ] Helper view/RPC `are_friends(a, b)` for reuse in other policies.

### 1.2 Friends UI (replace the last mock)

- [x] `FriendsScreen`: real invite code (share) + redeem-by-code (`accept_invite`) + accepted friends list. Stable IDs as keys (closes old TD-19).
- [x] View a friend's **profile + their collection** (read-only, `FriendCollectionScreen`) — delivers "alle kan se hva andre eier."
- [ ] Deep-link handling for `puslespill://join?code=…` (`expo-linking`) so shared links auto-open + prefill the code. (Manual code entry works today.)

### 1.3 Lock everything to the friend graph (RLS audit)

- [x] Replace the interim "all authenticated users" reads on `sessions` / `items` / `session_images` with **friend-scoped** policies (self + accepted friends). _The privacy fix._
- [x] Feed query: dropped the implicit all-users behavior — RLS now returns self + friends only (no client change needed).
- [x] Tightened the **storage `SELECT` policy** on `session-images` to friend-scoped (path owner is self or a friend) — also completes the deferred Phase 5 storage item.
- [x] Loan invariant holds: `loans` stay owner-only; `borrower_name` never leaks.
- [x] Policy matrix written in `docs/phase1-friend-graph.md`.

**Exit criteria:** a user only ever sees their own + friends' data; no path to a stranger's item, session, or photo; Friends is fully real.

---

## Phase 2 — The lending loop 📚 (make it a library, not a notebook)

**Goal:** turn one-sided loan logging into a real friend-to-friend borrow flow — the concept's payoff. **Full design + SQL in [`docs/phase2-borrow-loop.md`](./phase2-borrow-loop.md).**

### 2.0 i18n foundation (prerequisite — do first)

Stand up i18n before building Phase 2 UI so new strings are keys, not hardcoded Norwegian to retrofit. **Plan in [`docs/i18n-plan.md`](./i18n-plan.md).**

- [x] `i18next` + `react-i18next` + `expo-localization`; `src/lib/i18n.ts`; `src/locales/{no,en}.json`; imported in `App.tsx` with persisted override.
- [x] Language toggle in `ProfileScreen`; `ProfileScreen` migrated as the reference.
- [x] `utils/date.ts` locale-aware (relative words + `toLocaleDateString`), both languages tested.
- [x] Shared `collections`/`loans` namespaces + `collectionLabels.ts`; `CollectionsScreen` + `FriendCollectionScreen` migrated.
- [x] **App declared Phase 2-ready** — infra + shared namespaces done.
- [x] **Retrofit complete** — all remaining screens migrated (Feed cluster, CollectionDetail, session cluster, ItemForm cluster, AuthScreen, nav). Bilingual, full `no`/`en` key parity. [`docs/i18n-remaining.md`](./i18n-remaining.md) closed.
- [x] Author all Phase 2 UI with `t()` keys (bilingual from the start).

### 2.1 Borrow requests

- [x] `borrow_requests` table + RLS + security-definer RPCs (`request_to_borrow`, `approve_request`, `decline_request`, `cancel_request`). Approve creates a `loans` row (existing `trg_sync_item_status` flips status); borrower = friend via `borrower_user_id`, `borrower_name` fallback.
- [x] `FriendCollectionScreen`: tappable items → modal with **"Be om å låne"** (available) / "Forespurt" (pending) / "Utlånt". Bilingual from the start.
- [x] New `RequestsScreen` from the Header **bell**: incoming (approve/decline) + outgoing (cancel).
- [x] Unread badge on the bell (count of incoming pending requests).
- [x] Cancel a pending request from `FriendCollectionScreen` too.
- [x] `borrowed` feed event (borrower's own approved requests), mirroring the `loaned` card.

### 2.1b Borrowing surfaces & return lifecycle

Full design + SQL in [`docs/phase2-borrow-loop.md`](./phase2-borrow-loop.md) §C.1–C.3.

- [x] **"DU LÅNER NÅ"** section on `CollectionsScreen` — what the user is currently borrowing — via an additive borrower-scoped `loans` SELECT policy.
- [x] **Borrower-initiated return, owner confirms** — `return_requested_at` + `mark_loan_returned` RPC; owner confirms via the existing "UTLÅNT NÅ" tap.
- [x] **Owner requests a return + note** — `owner_return_requested_at` + `owner_return_note` (owner UPDATE); shown to the borrower.
- [x] **Borrower can undo** a "Retur meldt" — `unmark_loan_returned` RPC.
- [x] **Return-by / due date** — `loans.due_at`; quick-pick chips in the lend modal; overdue highlighted. _Manual loans only — see "Pick up next" #2 for the approve-flow extension._

### 2.2 Notifications (the nudge channel)

- [ ] Expo Notifications: push-token registration + storage; server-side sends (Supabase Edge Function or scheduled job).
- [ ] Triggers: incoming borrow request, request approved/declined, borrower's "Retur meldt" / owner's "Be om retur," "added you to a session," and **overdue-loan nudges** (drive off `loans.due_at`).

### 2.3 Serve puzzles' natural lifecycle

- [ ] Add a **swap / give-away** status (`Byttet` / `Gitt bort`) alongside Utlånt/Tilgjengelig. Puzzles are usually _passed on_ once done, not lent — the concept says "bytte," but only lend/return exists today.

### 2.4 Wishlist

- [ ] `wishlist` table + RLS; screen + nav entry.
- [ ] "Flytt til samling" (atomic via RPC), and **"Be om å låne"** surfaced when a friend already owns a wished item.

**Exit criteria:** a friend can discover an item, request it, get notified through the flow, and it's tracked to return — without the owner typing a name by hand.

---

## Phase 3 — Activity unification & data layer ⚙️

**Goal:** fix the puzzle-shaped "session" model so board games (and future books/films) are first-class, and pay down the data-fetching boilerplate at the same time.

### 3.1 Unify the activity model

- [ ] Make **"logg en økt"** uniform: item + participants + optional photo + optional note, for _any_ category. Board games become first-class (play logged, people, optional "who won").
- [ ] **Demote puzzle %** to an _optional_ attribute of a puzzle session, not the spine of the feature. Keep `ProgressSheet` / `PuzzleProgressIcon` as a puzzle-only enhancement.
- [ ] Verify the model generalizes to books/films (progress-like) before adding those categories.

### 3.2 Adopt TanStack Query (React Query)

- [ ] Replace the repeated `useFocusEffect` + `useState(loading/error)` pattern (also removes the `react-hooks/set-state-in-effect` warnings) with query hooks in `src/queries/` — doubles as the `services/` layer.
- [ ] Mutations with optimistic updates + `invalidateQueries` (start session, update progress, register/approve loan, friend request).

### 3.3 Images & feed depth

- [ ] `Image` → **`expo-image`** (caching, placeholders, memory); compress with `expo-image-manipulator` before upload.
- [ ] Feed pagination / infinite scroll + pull-to-refresh (currently 14-day window, no refresh control).

**Exit criteria:** one data-fetching pattern; sessions category-neutral; images cached/compressed.

---

## Phase 4 — Release readiness 🚀

- [ ] **Apple Sign-In** — required by App Store guideline 4.8 since Google sign-in is offered. **Launch gate**, not optional.
- [ ] Onboarding screen (concept intro + sign-in).
- [ ] **Sentry** (`@sentry/react-native` config plugin); wire `ErrorBoundary` to report.
- [ ] **Privacy policy** (accounts + photos of people → GDPR; stores require it). Link in-app + store listings.
- [ ] Store metadata (nb-NO), screenshots (reuse `docs/screenshots/`), category, keywords.
- [ ] `eas build --profile preview` → TestFlight + Android internal → `production` + `eas submit`.
- [ ] Decide/confirm the final **app name** (Fordriv is a placeholder) before store submission — rename `app.json` `name`/`slug`; bundle IDs can stay.

**Exit criteria:** passes store review; crashes reported; policy published.

---

## Suggested sequencing

1. **Track 0 quick wins now** — generated types + `delete_session` (small; unblock later work).
2. **Phase 1 (Social foundation)** — the keystone, and the privacy fix. Everything social waits on it.
3. **Phase 2 (Lending loop)** — the concept's payoff; needs the friend graph from Phase 1.
4. **Phase 3 (Activity unification + React Query)** — can overlap the tail of Phase 2; touches many screens, so land the friend/loan work first.
5. **Phase 4 (Release)** — Apple Sign-In is the hard gate; the rest is polish + store ops.

**North star:** stop building "a beautiful puzzle-progress app that also tracks loans," and finish "the social lending library for a friend group" it set out to be.
