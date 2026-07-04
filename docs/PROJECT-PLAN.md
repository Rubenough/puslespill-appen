# Fordriv — Completion Plan (social-first re-sequence)

**Created:** 2026-07-04 · **Re-sequenced:** 2026-07-04 · **Owner:** @rubenough
**Working name:** _Fordriv_ (conceptual, not final).
**Purpose:** Take the app from "well-built puzzle/loan tracker" to the product it's actually meant to be — a **social lending library for a closed friend group** — following current best practices for the Expo SDK 55 / RN 0.83 / React 19 / Supabase stack.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Why this was re-sequenced

A product review found a gap between the **concept** (friends share/borrow physical things; "alle kan se hva andre eier, låne og bytte") and the **build** (deep, polished _puzzle-progress_ logging; the social core is mock or missing). The target users are explicitly _"ikke hardcore statistikk-fokuserte"_, yet the deepest feature is a progress tracker.

**Decision:** freeze feature-polish on solo activity logging and build the **concept spine first** — friends → see each other's collections → borrow between each other. Everything else re-orders behind that.

### The concept spine (new priority order)

1. **Friends graph** — real following/requests, and lock the feed to friends (also closes a live privacy hole: the feed currently reads _all_ users).
2. **Browse a friend's collection** — today there is _no_ way to see what a friend owns; this is arguably the #1 concept feature and is entirely absent.
3. **Borrow-request loop** — request → approve → handoff → return. Turns the current single-sided loan _notebook_ into a shared _library_.

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
- [ ] **Supabase-generated types** (`src/lib/database.types.ts`) → type the client, delete the `as any` / `as unknown as` casts in `FeedScreen` / `SessionDetailScreen` / `ProfileScreen`. _(High leverage; do early — every phase below adds queries.)_
- [ ] `delete_session(session_id)` RPC or `ON DELETE CASCADE` on `session_images` / `session_participants` → single-call delete; keep storage cleanup after.
- [ ] More tests as logic lands: `collections.ts`, `AuthScreen` token-parse (extract to a pure fn first), friend-graph helpers.
- [ ] npm-audit findings: all are Expo **dev-tooling** transitive deps (not shipped) — resolve at the next SDK bump, don't `--force`.

---

## Phase 1 — Social foundation 🏗️ (the keystone)

**Goal:** the friend group becomes real, and the whole app narrows from "all users" to "my friends." This unblocks everything social and closes the current privacy hole.

### 1.1 Friend graph (backend)

- [ ] `friendships` table (`requester_id`, `addressee_id`, `status` = pending/accepted, `created_at`) + RLS (each side can see rows they're part of).
- [ ] Helper view/RPC `are_friends(a, b)` for reuse in other policies.

### 1.2 Friends UI (replace the last mock)

- [ ] `FriendsScreen`: real accepted list, **user search**, send request, incoming/outgoing requests (accept/decline). Stable IDs as keys (closes old TD-19).
- [ ] View a friend's **profile + their collection** (read-only) — delivers "alle kan se hva andre eier."

### 1.3 Lock everything to the friend graph (RLS audit)

- [ ] Replace the interim "all authenticated users" reads on `sessions` / `items` / `session_images` with **friend-scoped** policies (self + accepted friends). _This is the privacy fix, not just a feature._
- [ ] Feed query: drop the implicit all-users behavior; show self + friends only.
- [ ] Tighten the **storage `SELECT` policy** on `session-images` from "any authenticated" to friend-scoped (path owner is self or a friend).
- [ ] Re-confirm the loan invariant: `borrower_name` never selectable by non-owners even when `is_public = true`.
- [ ] Write the policy matrix down (table × role × operation) in `docs/`.

**Exit criteria:** a user only ever sees their own + friends' data; no path to a stranger's item, session, or photo; Friends is fully real.

---

## Phase 2 — The lending loop 📚 (make it a library, not a notebook)

**Goal:** turn one-sided loan logging into a real friend-to-friend borrow flow — the concept's payoff.

### 2.1 Borrow requests

- [ ] `borrow_requests` (or extend `loans`): request → owner approves/declines → active loan → return. States + RLS (owner and requester see their own).
- [ ] From a friend's collection item: **"Be om å låne"** when status = Tilgjengelig.
- [ ] Owner approval turns it into a `loans` row (reuse the existing trigger for status sync); borrower recorded via `borrower_user_id` (friend) with `borrower_name` fallback for non-app people.

### 2.2 Notifications (the nudge channel)

- [ ] Expo Notifications: push-token registration + storage; server-side sends (Supabase Edge Function or scheduled job).
- [ ] Triggers: incoming borrow request, request approved/declined, "added you to a session," optional **loan reminder after X weeks**.

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
