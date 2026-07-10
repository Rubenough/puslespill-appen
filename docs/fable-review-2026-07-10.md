# Fordriv — Fable review, 2026-07-10

Review of code quality, feature completeness, store readiness, and roadmap to v1.0.
Verified against the working tree at `7f5d970`.
UX/product follow-up (name, IA, flows, screens): [`ux-product-recommendations-2026-07-10.md`](./ux-product-recommendations-2026-07-10.md).

---

## 0. Corrections to the review brief (the repo is ahead of it)

Verified against the code and git log — the following brief items are already **done**:

| Brief claim | Reality |
| --- | --- |
| Deep-link invite not wired | ✅ Done — `linking` config in `App.tsx` (`puslespill://join?code=`), incl. logged-out deferred invites (`utils/pendingInvite.ts`, friends-hardening merge `a8b9aaa`) |
| No pull-to-refresh on feed | ✅ Done — `RefreshControl` in `FeedScreen.tsx:519` |
| ProfileScreen statistics are mock | ✅ Resolved — Model C removed the stats section; Profile now shows real "TIDLIGERE ØKTER" (no `mock`/`STATISTIKK` strings remain) |
| — (not in brief) | Also shipped: session reactions, item cover images, participant progress photos, unfriend + invite-code rotation, `LoanHistoryScreen` |

Stale in the other direction: `CollectionDetailScreen` is now **736** lines (not 547), and `SessionDetailScreen` at **933** lines is the real god component.

**One hard blocker the brief missed entirely: in-app account deletion** (see §3).

---

## 1. Code quality & architecture

**Verdict: genuinely strong for this stage.** Strict TS + typed Supabase client, CI on every push, full i18n parity, systematic a11y, error+retry on every fetch, and a security posture (friend-scoped RLS, security-definer RPCs, private bucket + signed URLs, SecureStore sessions) that most small apps never reach. Nothing here blocks submission.

### What will bite, in priority order

1. **`ErrorBoundary` only `console.error`s** (`ErrorBoundary.tsx:18`). Production crashes are invisible. Sentry is a half-day with the config plugin; wire `componentDidCatch` to it. Do before real users, not after.
2. **Missing DB constraints force boundary casts.** Six `as unknown as` sites (FeedScreen ×5, SessionDetail, Profile, Requests, LoanHistory) exist because `items.type/difficulty/status` are plain `text` and timestamps are nullable-with-default. One dashboard session (CHECK + NOT NULL, regen types) deletes them all. Batch with `delete_session`.
3. **`delete_session` cascade + cover-file orphan.** This is not just tidiness: orphaned storage files containing photos of people undermine the GDPR Art. 17 erasure story you built the private bucket for. The one-line cover cleanup in `CollectionDetailScreen.handleDelete` (noted in `social-feed-v1-status.md`) is the same category. Do both before launch.
4. **God components** — `SessionDetailScreen` (933) and `CollectionDetailScreen` (736). Real risk is regressions during the Phase 3 React Query migration, since there are no screen tests to catch them. Don't refactor before submission; split them *as part of* the React Query migration (Phase 3), when each extraction gets a query hook anyway.
5. **Data-fetch pattern** (`useFocusEffect` + manual loading/error state, re-signing URLs on each focus) — fine at friend-group scale. React Query stays Phase 3; adopting it now would delay the store gates for zero user-visible gain. When you do adopt it, **skip TD-12's separate `services/` layer** — the `src/queries/` hooks *are* the service layer; building both is double work.
6. TD-14 (`as any` storage adapter) and TD-16 (`difficulty: string`) — cosmetic, batch with any nearby change, never blockers.

### Test coverage

43 tests, all pure utils + `ThemeContext` + `progressToFilled`. **Adequate for v1.0** given the disciplined manual device-verification flow — with two gaps worth closing first because they guard the product's core, are pure logic, and are cheap:

- `utils/loans.ts` (due-date/overdue logic) — overdue math is exactly the kind of thing that silently breaks across locales/timezones.
- The feed event mapping in `FeedScreen` (rows → feed items) — extract to a pure function and test it; it's the most-touched merge logic in the app.

Screen/integration tests: defer to Phase 3 — they get dramatically cheaper once fetching lives in query hooks.

---

## 2. Feature completeness

**Verdict: the concept spine is complete and this is a shippable v1.0.** Friends (invite/rotate/unfriend/deep-link) → browse friend collections → full borrow lifecycle (request → approve w/ due date → return signals both directions → confirm) → shared feed with photos and reactions. That *is* the product described in the concept.

What actually blocks a real launch (vs. store approval):

1. **Onboarding / first-run empty state — yes, blocker.** A new user lands on an empty feed and has no way to discover that the invite code is the entire entry point to the app. 1–2 days: a 2–3 card intro after first sign-in + empty-state CTAs on Feed/Collections pointing at Friends. Also required for coherent store screenshots.
2. **Push notifications — v1.0 requirement, but not a *beta* requirement.** The lending loop is asynchronous by design; without pushes, a borrow request sits invisible until the owner happens to open the app — the loop stalls and the app feels dead. Recommendation: ship the friend-group beta (TestFlight/internal track) without it, but **do not do the public store submit without it**. The design doc is done; and since Apple Sign-In forces the Apple Developer account + new native build anyway, the "iOS push deferred to Phase 4" split is obsolete — **do Android and iOS push together** in the same build.
3. Board games second-class, wishlist, swap/give-away — **skip for v1.0.** None are part of the borrow loop's payoff; wishlist and swap add DB surface + screens for a feature your friend group hasn't asked for yet. Post-launch.
4. Feed pagination — skip. A 14-day window with pull-to-refresh is correct for ~10 users; revisit with Phase 3.

---

## 3. App store readiness

### ⛔ Hard blockers — both stores

1. **In-app account deletion — missed by the brief and the project plan.** App Store guideline 5.1.1(v): any app with account creation **must offer in-app account deletion** — this is an enforced rejection, same tier as 4.8. Google Play's Data-deletion policy additionally requires a **web-accessible deletion URL** in the Data safety form. Nothing in `SettingsScreen` or the RPC list does this. Needs: a `delete_account` Edge Function (service-role: auth user + profiles/items/loans/requests/sessions cascade + storage folder purge) + a Settings entry with confirm flow + a simple web request page/mailto on your site for Play. ~1–2 days. Slots naturally next to the `delete_session` DB batch.
2. **Privacy policy** — required by both stores; you store accounts + photos of identifiable people (GDPR). Publish on rubenvareide.no, link in Settings + both listings. ~half a day with a generator, listing exactly: account data (Google profile), user photos, no analytics/ads/tracking.
3. **Final app name + slug** — `app.json` still `puslespill-appen`. Must be decided before the first production build; also check name availability in App Store Connect early (name squatting is real). Bundle IDs can stay.

### ⛔ iOS-only hard blockers

4. **Apple Sign-In** (guideline 4.8) — the known gate. Apple Developer Program enrollment ($99, can take days — **start it day 1**), `expo-apple-authentication` plugin, Supabase Apple provider, button on `AuthScreen` (Apple HIG styling, mirror the Google-button inline-style exception), new native build. ~1–2 days of work + enrollment wait.
5. **Google OAuth consent screen in production mode** — if the Google Cloud OAuth consent screen is still "Testing", sign-in breaks for non-allowlisted users the moment a reviewer or new user tries it. Verify/publish it.

### ⛔ Android-only hard blocker / timeline risk

6. **Play closed-testing requirement**: personal developer accounts created after Nov 2023 must run a closed test with **≥12 testers opted in for 14 consecutive days** before production access. If your Play account is new and the friend group is <12 people, this is the single biggest Android timeline risk — recruit testers and start the clock as early as week 3–4. (Target API is a non-issue: SDK 55 is well past the API 35 requirement.)

### ⚠️ Soft blockers

- **No crash reporting** — won't cause rejection, but you'll be blind post-launch. Sentry before submit.
- **Notifications** — see §2; reviewers won't reject for it, users will churn for it.
- **Permission strings** are Norwegian-only in `app.json` — fine if the store listing is nb-NO primary; add English via `locales` config if you list in English too.
- **EU DSA trader declaration** (App Store, required since Feb 2025 for EU availability) — declare non-trader; 5 minutes, but submission stalls without it.
- Data collection disclosure (iOS privacy nutrition label) + Play Data safety form — required forms; content: account info, photos, no tracking. Straightforward given the privacy-by-design posture.

### ✅ Already in good shape

`ITSAppUsesNonExemptEncryption: false`, `supportsTablet`, adaptive icon (incl. monochrome), `permissions: []`, EAS profiles + `autoIncrement`, `runtimeVersion: appVersion` OTA, CI. Age rating 4+ questionnaire is a formality.

---

## 4. Plan forward

### Week 1–2 — Hard gates (everything else waits on these)

| # | Item | Why | Effort | Depends on |
|---|---|---|---|---|
| 1 | **Enroll Apple Developer Program** | Enrollment latency gates everything iOS | 1 h + wait | — |
| 2 | **Decide final name; rename `name`/`slug` in app.json; reserve in App Store Connect + Play Console** | Post-submission renames cause friction; do before the first production build | 0.5 d | #1 (ASC access) |
| 3 | **Apple Sign-In** — plugin, Supabase provider, AuthScreen button, new dev build to verify | Guideline 4.8 hard gate | 1–2 d | #1 |
| 4 | **Account deletion** — `delete_account` Edge Function (auth + data cascade + storage purge), Settings entry, web deletion page for Play | Guideline 5.1.1(v) + Play data-deletion policy; hard gate both stores | 1–2 d | — |
| 5 | **DB batch (one dashboard session):** CHECK/NOT NULL constraints → regen types → delete remaining casts; `delete_session` cascade RPC; cover-file orphan cleanup | Data integrity + GDPR erasure; unblocks cast removal | 1 d | — |
| 6 | **Privacy policy** — write, publish on rubenvareide.no, link in Settings | Hard gate both stores; needed for #4's web page anyway | 0.5 d | — |
| 7 | **Verify Google OAuth consent screen is Published** | Reviewer sign-in failure = instant rejection | 0.5 h | — |

### Week 3–4 — Launch-critical features

| # | Item | Why | Effort | Depends on |
|---|---|---|---|---|
| 8 | **Push notifications, Android + iOS together** — `device_push_tokens`, `notifications` queue, DB webhook → Edge Function → Expo Push, enqueue from existing RPCs, `pg_cron` overdue nudges | The async lending loop is dead without a nudge channel; design doc exists; Apple account (#1) removes the reason to defer iOS | 3–5 d | #1, #3 (build) |
| 9 | **Onboarding** — 2–3 card first-run intro + empty-state CTAs (Feed/Collections → Friends) | New users can't discover the invite-code entry point; needed for screenshots | 1–2 d | — |
| 10 | **Sentry** — config plugin + wire `ErrorBoundary.componentDidCatch` | Only visibility into production crashes | 0.5 d | — |
| 11 | **Tests:** `utils/loans.ts` overdue/due-date logic; extract + test FeedScreen event mapping | Core-product pure logic, cheap to lock down now | 1 d | — |
| 12 | **Start Play closed test** — recruit ≥12 testers, internal → closed track, start the 14-day clock | If the Play account is post-Nov-2023, this clock gates Android production; start ASAP | 0.5 d setup + calendar time | #2, first prod build |

### Week 5–6 — Store preparation

| # | Item | Effort | Notes |
|---|---|---|---|
| 13 | Production builds (`eas build --profile production`, iOS + AAB) + `eas submit` config | 0.5 d + build queue | After #3/#8 land (native changes) |
| 14 | TestFlight beta with the friend group | calendar time | They *are* the target users — treat their feedback as launch criteria |
| 15 | Screenshots (6.9", 6.5", 5.5"; phone + 7" tablet for Play) + metadata nb-NO (+ en) | 1–1.5 d | After onboarding (#9) so first-run shots make sense |
| 16 | Forms: age rating (4+), IARC, iOS privacy label, Play Data safety (incl. deletion URL from #4), DSA non-trader declaration | 0.5 d | Mechanical |
| 17 | Submit iOS; promote Play closed → production when the 14-day window (#12) completes | — | Expect one review round-trip; budget a week |

### Week 7+ — Post-launch (explicitly not v1.0)

- **Phase 3 as one unit:** React Query in `src/queries/` (which *is* the service layer — skip a separate TD-12 layer) + split SessionDetail/CollectionDetail god components during the migration + screen tests as they become cheap.
- `expo-image` + `expo-image-manipulator` compression (upload cost matters more as photo volume grows).
- Activity-model unification (board games first-class, puzzle-% demoted).
- Wishlist (2.4), swap/give-away (2.3), feed pagination — in whatever order the friend group actually asks for.
- npm-audit dev-tooling findings — at the next SDK bump, as planned.

### Skip for v1.0 (deliberately)

Wishlist, swap/give-away status, feed pagination, TD-12/TD-17 refactors, App Preview video, TD-14/TD-16. None change what a reviewer or a first-time user experiences; all get cheaper after Phase 3.

**Realistic timeline: ~6–7 weeks to both-store submission**, with the two calendar risks being Apple enrollment (start day 1) and the Play 14-day/12-tester closed test (start the clock by week 3–4).
