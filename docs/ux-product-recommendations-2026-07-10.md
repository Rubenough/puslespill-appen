# Fordriv — UX & product recommendations, 2026-07-10

Companion to [`fable-review-2026-07-10.md`](./fable-review-2026-07-10.md) (code/store/roadmap review).
This doc covers product/UX: name, IA, flows, screens, copy, and functionality.
Grounded in the current code at `7f5d970` and `docs/screenshots/` (note: those screenshots
predate item covers and reactions — judged against current code where they differ).

---

## 1. App name

"Fordriv" is the weakest of the current assets: abstract (nothing about friends, lending,
or games), hard for non-Norwegians to pronounce, and it describes the *old* concept
(passing time) rather than the product (a shared library).

**Pick against these criteria:** says "shared/borrowing" or "shelf/collection"; works as a
noun/verb in daily speech ("legg den ut på …", "sjekk …"); store-searchable; .no domain
available.

**Candidates:** **Hylla** (the shared shelf — short, warm, recommended), Lånelista,
Spillhylla, Til låns, Delehylla.

**Test:** say "kan jeg låne den? — ja, be om den på ___" out loud; if the sentence feels
natural, the name works. Reserve the finalist in App Store Connect immediately (names get
squatted). Rename `app.json` `name`/`slug` in the week-1–2 window per the review plan.

---

## 2. The one big product gap: browsing is friend-first, not item-first

Concept promise: "alle kan se hva andre eier." Today's only path: Venner → pick a friend →
scroll their list. Nobody thinks "what does Pernille own?"; they think **"does anyone have
Wingspan?"**

**Recommendation — friends-library view with search** (highest-value item not on the
roadmap): one flat, searchable list of every item all friends own (title, cover, owner
avatar, available/lent status) with "Be om å låne" inline. At friend-group scale this is
one query (RLS already scopes to friends) + one screen — **~2–3 days**.

Make it the *content* of the Venner tab: rename the tab **Bibliotek**, move invite/manage-
friends behind a header icon on that screen. The tab goes from plumbing to the product's
front door. This is the single change that most improves how the app *feels*.

---

## 3. Navigation & IA

- **The lending loop has no home.** Requests hide behind the Header bell; active loans are
  split across two sections on Collections; history is a push off Collections. When
  notifications land, a tapped notification needs somewhere that shows the whole state.
  **Add a "Lån" hub screen** (incoming/outgoing requests + borrowing + lending + history),
  reachable from the bell *and* Collections. Consolidates three scattered surfaces and
  slims `CollectionsScreen` (670 lines, three jobs).
- **Tab icons:** "Samlinger" uses `menu-outline` (reads as a hamburger menu — metaphor
  mismatch); Feed uses `grid-outline`. Use `library-outline`/`albums-outline` for
  Samlinger, `home-outline` for Feed. Two-minute fix.
- **+ sheet:** add a third entry **"Inviter en venn"** (at least until the friend graph is
  populated) — inviting is the activation moment and is currently buried in the Venner tab.

---

## 4. User flows

- **First-run onboarding** (already a launch blocker in the review plan — this is the
  *design*): not generic intro slides. A 3-step guided setup:
  1. "Legg til de første tingene dine" → straight into AddItem
  2. "Inviter gjengen" → share sheet + QR
  3. Done → Feed with a "waiting for friends" state
  A checklist beats a carousel: the app is worthless until both items *and* friends exist.
- **QR code invites** (~0.5 day, `react-native-qrcode-svg`): users are physically in the
  same room — render the invite code as a QR on FriendsScreen, scan from the redeem flow.
  Beats reading `X7K2…` across the table; great demo/screenshot moment.
- **Borrow flow is genuinely good** — optional request message ✓, due-date chips on
  approve ✓, two-sided return ✓, undo ✓. One gap: **approval starts the loan instantly**
  but the item hasn't physically moved. Keep it for v1 (a handoff-confirm step adds
  friction), but set expectations in copy: "Godkjent — avtal henting med Ole" on the
  approval confirmation and in the eventual notification.
- **Profile is read-only** (verified — no update call anywhere): name/avatar are whatever
  Google supplies (full legal name, stale photo). Add minimal display-name + avatar
  editing on Profile (~1 day). In a small social app, identity presentation matters
  disproportionately.

---

## 5. Screens & UX design

The visual system is a real strength — consistent tokens, disciplined dark mode,
WCAG-checked contrast. Keep it. Per-screen improvements:

| Screen | Recommendation |
| --- | --- |
| **Feed** | "AKTIVE ØKTER" owns the top while lending events — the concept spine — are undifferentiated rows. Give event types distinct visual identity (colored icon per type: lånte ut / lånte / la til / fullførte). Consider a compact "DINE LÅN" status strip (borrowing/lending + due dates). Push cover adoption — prompt for a photo during AddItem; one image transforms feed + library density. |
| **Collections** | Past ~20 items, `CollectionDetailScreen` needs search + filter chips (Tilgjengelig / Utlånt). Cheap; postpones fancier organization. |
| **UTLÅNT NÅ rows** | "Ole · 27 dager siden" ages silently. With due dates, show "forfaller om 3 dager" / red "2 dager over fristen" instead of elapsed time — deadline framing nudges returns. |
| **Requests** | Show the requester's message prominently (the human part of the transaction) + item cover, not just title. |
| **SessionDetail** | Reactions exist on the feed but not here (noted in `social-feed-v1-status.md` follow-ups) — finish it; the detail screen is where the conversation about a photo happens. |

---

## 6. Content & copy

- Norwegian tone is consistent and warm — keep it.
- **"Økt"** is puzzle-jargon that fits the old concept; when Phase 3 unifies activities,
  consider friendlier framing ("kveld", "spilt", or just item name + photo).
- `app.json` permission strings mention only "øktbilder" — update when covers/photos
  broaden ("bilder av tingene og øktene dine").

---

## 7. Functionality — add vs. skip

**Worth adding (rough order):**

1. Friends-library search / Bibliotek tab (§2) — ~2–3 d
2. QR invite — ~0.5 d
3. Profile editing (display name + avatar) — ~1 d
4. Notifications + onboarding — already planned (review plan weeks 3–4)
5. Collection search/filter chips — ~0.5–1 d
6. Reactions on SessionDetail — ~0.5 d
7. Post-v1 delight: **barcode scan on AddItem** (EAN → board-game metadata via BGG API) —
   adding items is the app's biggest chore; this makes it a party trick.

**Explicitly skip for v1** (confirming the main review): wishlist, swap/give-away, feed
pagination, handoff-confirmation step, any web version. None help until the group is
actively lending; each adds surface before the loop is validated with real friends.

---

## If you only take three things

1. **Venner → Bibliotek** with a searchable all-friends item list.
2. **One consolidated "Lån" home** for the lending loop behind the bell.
3. **QR invite.**

Those three turn "a well-built app with the right features" into "the thing the friend
group actually opens."
