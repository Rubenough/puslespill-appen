# Profile / Collections IA — Model C

**Created:** 2026-07-08 · **Owner:** @rubenough · **Status:** implemented on
`feat/social-feed-v1` (unmerged, awaiting on-device test) — per-item history and
rich stats remain future work (see "Out of scope").

## Context / problem

Two "history" lists were competing for a home:

- **Loan history** currently lives on **Profile** (`MINE UTLÅN`), but the
  **current** loan state (`UTLÅNT NÅ` / `DU LÅNER NÅ`) lives on **Collections**.
  So you register/return a loan in Collections but review its record on a
  different tab — and the _active_ loans are shown in **both** places
  (`ProfileScreen` `MINE UTLÅN` includes active loans that also appear in
  `CollectionsScreen` `UTLÅNT NÅ`). Genuine split-brain + duplication.
- **Completed sessions** have no durable home at all — they only appear in the
  rolling 14-day feed and then vanish.

## Decision — Model C (split by data type)

Place each history where its data conceptually belongs:

- **Loans = custody of an object → Collections.** Move the loan _history_
  (returned loans) into the Collections tab, next to the current loan state.
- **Sessions = personal experience/memory → Profile.** Completed sessions
  become the centerpiece of Profile.

Rationale: rejoins loan history with loan status in one tab (kills the
duplication), and gives each tab a clear identity — Collections = "my inventory
and where it is," Profile = "me and my puzzle journey."

## Constraints found in the code (read before building)

1. **No per-item detail screen exists.** Items are a row + an action
   `BottomSheet` (`CollectionDetailScreen.tsx`). Per-item history would require a
   new `ItemDetailScreen` — **out of scope** here. Model C uses an **aggregate**
   loan-history list. (Per-item history is a good future enhancement once an
   item-detail screen exists.)
2. **Active loans already render in Collections** (`UTLÅNT NÅ`). The only part to
   move off Profile is the **returned** history. Do **not** duplicate active
   loans into the new history view.
3. **No DB / RLS change needed.** `loans` (owner-only) and `sessions`
   (own + friends) already permit these reads. Fully client-side and
   solo-testable — unlike Feed Phase 2, which is DB-gated.

## Plan

### A. Collections — add loan history

- New **`LoanHistoryScreen`** in `navigation/CollectionsStack.tsx`
  (`LoanHistory: undefined`), reached from a **"Lånehistorikk" row** on
  `CollectionsScreen` (placed under `DU LÅNER NÅ`, or under the collections list
  when there is no borrowing). A pushed screen keeps the already-long Collections
  scroll clean.
- Query: `loans` where `owner_id = user.id` and `returned_at is not null`,
  `order by returned_at desc`, `limit 50`, join `items(title, type)`.
- Reuse the existing **`LoanRow`** rendering pattern from `ProfileScreen`
  (returned styling: "Levert" badge, `profile.returnedTo` subtitle). Consider
  extracting `LoanRow` into `components/LoanRow.tsx` so Profile's removal and the
  new screen share one component.
- Rows are non-tappable (display only), matching today's Profile behavior.

### B. Profile — remove loans, add completed sessions

- **Remove** the `MINE UTLÅN` section and its `fetchLoans` from `ProfileScreen`.
- **Add "TIDLIGERE ØKTER"** — completed sessions, inline on Profile (it becomes
  the centerpiece; Profile is otherwise light).
  - Query: `sessions` where `created_by = user.id` and `completed_at is not null`,
    `order by completed_at desc`, `limit 20`, join `items(title, type)`; then
    batch the latest `session_images` thumbnail per session and sign with
    `getSignedUrls` (reuse the exact pattern in `FeedScreen`
    `latestImagePathsBySession` + `fetchSessions` signing — consider lifting that
    helper into `utils/sessionImages.ts` or a shared module).
  - Row: thumbnail (or category icon fallback), item title, `Fullført {date}`,
    progress % for puzzles; tap → `navigation.navigate("SessionDetail",
{ sessionId })` (Profile already holds a `RootStackParamList` nav prop, and
    SessionDetail is owner-gated — own sessions show full controls).
  - Empty state: "Ingen fullførte økter ennå."
- **Optional stats header** (nice-to-have, cheap): counts derived from the same
  query — e.g. "N fullførte økter". Richer stats (pieces placed, streaks) are a
  later add.

### C. i18n (both `no.json` + `en.json`, keep parity)

- `collections.loanHistory` ("Lånehistorikk"), `collections.loanHistoryHint`,
  `loanHistory.title`, `loanHistory.empty`.
- `profile.pastSessions` ("TIDLIGERE ØKTER"), `profile.pastSessionsEmpty`,
  `profile.sessionCompletedWhen` ("Fullført {{when}}"),
  `profile.sessionRowA11y`, `profile.sessionRowHint`,
  optional `profile.sessionsCount`.
- Remove now-unused `profile.myLoans` etc. **only if** no longer referenced
  (the `LoanRow`/returned copy moves to the loan-history screen — reuse the
  existing `profile.returnedTo` / `profile.statusReturned` strings there rather
  than duplicating).

### D. Accessibility

- New rows follow the card/list-row patterns in CLAUDE.md: session rows are
  `accessibilityRole="button"` with a composed label (title, status, date) +
  `accessibilityHint` ("Trykk for å se økten"); thumbnails `accessible={false}`;
  section headers `accessibilityRole="header"`.

## Out of scope (future)

- **Per-item history** (loan + session history on a per-item `ItemDetailScreen`).
- **Borrow-side history** (items _I_ borrowed and returned) — today only current
  borrowing (`DU LÅNER NÅ`) exists; this plan moves owner-side lending history to
  match the current `MINE UTLÅN` scope.
- **Rich Profile stats / achievements.**

## Verification

- **Loans:** lend an item → returns to `UTLÅNT NÅ` in Collections (unchanged);
  register the return → it leaves `UTLÅNT NÅ` and appears in the new
  Lånehistorikk screen; Profile no longer shows a loans section.
- **Sessions:** complete a session → leaves the active strip, shows in the feed
  (14-day) AND now appears under `TIDLIGERE ØKTER` on Profile; tap → its
  SessionDetail opens (owner controls, since it's yours).
- Gates: `npm run typecheck && npm run lint && npm run format:check && npm test`;
  locale key parity holds.

## Sequencing vs Feed Phase 2 (do NOT run in parallel)

Model C and Feed **Phase 2-E (item covers)** both touch `CollectionsScreen` /
`CollectionDetailScreen` — parallel agents there would clobber. And Feed Phase 2
(D/E/F) is **blocked on the Supabase SQL step** (`docs/social-feed-v1-phase2-db.md`)
so it can't be finished until those policies/columns are applied + `gen:types`.

Recommended order:

1. **Model C now** (unblocked, solo-testable) — on `feat/social-feed-v1` or a
   dedicated `feat/profile-collections-ia` branch.
2. **Apply Feed Phase 2 SQL** (D/E/F) in the Supabase dashboard → `gen:types`.
3. **Feed Phase 2 client** after Model C lands, to avoid the Collections overlap.
