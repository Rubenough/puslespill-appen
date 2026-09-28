# Hylvo (puslespill-appen) — Status

**Updated:** 2026-09-28 · **Owner:** @rubenough

This is the one "where are we" doc. Design docs for live behavior stay in `docs/`;
superseded plans, reviews and handoffs are in [`docs/archive/`](./docs/archive/).
Conventions and architecture live in [`CLAUDE.md`](./CLAUDE.md).

---

## Where we are

- **Not live to anyone.** No store listing, no TestFlight/Play testers yet.
- `main` = everything below (dev landed on main 2026-09-28; the `dev` branch is retired).
- CI (typecheck + lint + format:check + tests, Node 22) runs on every push/PR to `main`.
- Supabase backend was restored by the owner on 2026-09-28; the live schema matches the code
  (Postgres enums, NOT NULL timestamps, `loans.borrower_user_id` FK `ON DELETE SET NULL`).
- Stack: Expo SDK 55 / RN 0.83 / React 19 / TypeScript strict / NativeWind 4 / React
  Navigation 7 / Supabase 2. 88 jest tests, full `no`/`en` i18n key parity.

## What's shipped (on `main`)

- **Auth** — Google OAuth via Supabase; sessions in SecureStore.
- **Friends** — invite code (share, rotate), invite link + **QR code**
  (`puslespill://join?code=…`, incl. logged-out deferred invites), redeem, unfriend.
  All reads are friend-scoped by RLS ([`docs/phase1-friend-graph.md`](./docs/phase1-friend-graph.md)).
- **Collections** — puzzles + board games, add/edit, cover images, search + status filter chips.
- **Bibliotek tab** — searchable list of all friends' items with inline borrow requests.
- **Lending loop** — request → approve (with due date) / decline / cancel → borrower
  "Retur meldt" (undo possible) → owner confirms; owner "Be om retur" with a note; overdue
  framing. All in one **Lån hub** (from the header bell + Collections card) + loan history
  ([`docs/phase2-borrow-loop.md`](./docs/phase2-borrow-loop.md)).
- **Sessions & feed** — start a session, progress photos (private bucket, signed URLs),
  photo-first feed with friends' active sessions, reactions on feed + session detail.
- **Activation** — first-run onboarding checklist, empty-state CTAs, profile editing
  (name + avatar).
- **Settings** — appearance (system/light/dark), language (no/en), sign out, **delete
  account** (`delete_account` Edge Function; web page for Play in `docs/store/`) —
  see [`docs/account-deletion.md`](./docs/account-deletion.md).
- **Sentry** — wired but inert until `EXPO_PUBLIC_SENTRY_DSN` is set
  ([`docs/sentry-setup.md`](./docs/sentry-setup.md)).
- **Display name "Hylvo"** in `app.json` (slug/scheme/bundle IDs still `puslespill*`).

## Known open issues

- **God components** — `SessionDetailScreen` (~980 lines), `CollectionDetailScreen`
  (~770), `LoansHubScreen` (~720). Split them as part of a React Query migration, not before.
- **9 `react-hooks/set-state-in-effect` lint warnings** (fetch-on-mount pattern). Deliberately
  `warn`, not `error`; they go away with a React Query migration.
- **QR invite uses the custom `puslespill://` scheme** — Android's stock camera won't open it.
  Switch to https app links / universal links before launch.
- **`as any` on the SecureStore adapter** in `src/lib/supabase.ts` (TD-14, cosmetic).
- **Sentry config plugin has placeholder org/project** in `app.json` — may break EAS builds
  (source-map upload). Handle in Phase 1.
- **Not device-verified since July** — everything merged from `dev` passed typecheck/lint/tests,
  but has not had a full pass on a fresh dev build.
- npm-audit findings are Expo dev-tooling transitive deps — resolve at the SDK bump, don't `--force`.

---

## Forward plan

### Phase 0 — Revive & land (this work, 2026-09-28)

- [x] Revive the Supabase backend (owner, 2026-09-28).
- [x] Fix CI (Node 22, actions v7, prettier).
- [x] Consolidate docs into this file; archive superseded docs.
- [x] Merge `dev` → `main`.

### Phase 1 — SDK upgrade + one device pass

- [ ] Expo SDK 55 → 57, stepwise via 56 (`npx expo install --fix`, check each SDK's changelog;
      keep `eslint-config-expo` at `^57`).
- [ ] Handle the Sentry placeholder config so EAS builds don't fail (real org/project + auth
      token as EAS secret, or disable upload / remove the plugin until Phase 3).
- [ ] **One device-verification pass** by the owner on a fresh dev build:
      sign in → invite (QR + link) → add item → Bibliotek → request → approve with due date →
      mark returned → confirm → delete account.

### Phase 2 — Identity

- [ ] Finalize the name **Hylvo**: `slug`, `scheme`, store-name reservation (App Store
      Connect + Play Console). Bundle IDs can stay.
- [ ] Enroll in the Apple Developer Program early (enrollment latency gates all iOS work).

### Phase 3 — Store gates + friend-group beta

- [ ] **Apple Sign-In** (App Store guideline 4.8 — hard gate since Google sign-in is offered).
- [ ] **Privacy policy** published on rubenvareide.no, linked in Settings + store listings.
- [ ] **Google OAuth consent screen published** (not "Testing").
- [ ] **Sentry** configured for real, or removed.
- [ ] Friend-group beta: TestFlight + Play closed test (a new Play account needs ≥12 testers
      opted in for 14 consecutive days before production access).
- [ ] **Push notifications** — design in [`docs/phase2.2-notifications.md`](./docs/phase2.2-notifications.md);
      do Android + iOS together.

### Phase 4 — Decide

- [ ] After 2–3 weeks of real use: public store submission vs. staying a friends-only beta.

### Parked (until friends ask)

Wishlist · swap/give-away status · feed pagination · activity-model unification (board games
first-class, puzzle-% optional) · React Query + god-component split · barcode scan.

---

## Where things are documented

| Topic                                    | Doc                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Conventions, architecture, commands      | [`CLAUDE.md`](./CLAUDE.md)                                                                                                                                   |
| Friend graph + RLS policy matrix         | [`docs/phase1-friend-graph.md`](./docs/phase1-friend-graph.md)                                                                                               |
| Friends hardening (live `accept_invite`) | [`docs/friends-hardening.md`](./docs/friends-hardening.md)                                                                                                   |
| Borrow loop + return lifecycle           | [`docs/phase2-borrow-loop.md`](./docs/phase2-borrow-loop.md)                                                                                                 |
| Push notifications (design, not built)   | [`docs/phase2.2-notifications.md`](./docs/phase2.2-notifications.md)                                                                                         |
| Feed DB (reactions, covers)              | [`docs/social-feed-v1-phase2-db.md`](./docs/social-feed-v1-phase2-db.md)                                                                                     |
| Profile / Collections IA                 | [`docs/profile-collections-model-c.md`](./docs/profile-collections-model-c.md)                                                                               |
| Account deletion + store checklist       | [`docs/account-deletion.md`](./docs/account-deletion.md)                                                                                                     |
| Sentry activation                        | [`docs/sentry-setup.md`](./docs/sentry-setup.md)                                                                                                             |
| DB cleanup (done)                        | [`docs/db-cleanup.md`](./docs/db-cleanup.md)                                                                                                                 |
| i18n / dark mode / Settings              | [`docs/i18n-plan.md`](./docs/i18n-plan.md), [`docs/dark-mode-toggle.md`](./docs/dark-mode-toggle.md), [`docs/settings-screen.md`](./docs/settings-screen.md) |
| Concept (Norwegian)                      | [`puslespill-app.md`](./puslespill-app.md)                                                                                                                   |
| Historical debt register                 | [`tech-debt.md`](./tech-debt.md)                                                                                                                             |
| Old roadmap, July reviews, handoffs      | [`docs/archive/`](./docs/archive/)                                                                                                                           |
