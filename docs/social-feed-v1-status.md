# Social Feed v1 — status & handoff (START HERE)

**Updated:** 2026-07-08 · **Branch/merge state:** everything below is **merged to
`main`** (feed work + friends-hardening; merge `7698746`). All feature branches
(`feat/social-feed-v1`, `feat/friends-hardening`, `feat/feed-phase2-f`) have been
**deleted** — only `main` remains. **Social Feed v1 (Phases 1 + 2 D/E/F) is
complete and device-verified on iOS simulator.**

Detailed specs live in `docs/social-feed-v1-phase2-db.md` (SQL + F spec) and
`docs/profile-collections-model-c.md` (Profile/Collections IA).

---

## ✅ Shipped & merged

- **Feed Phase 1** — photo-first tappable feed + pull-to-refresh; friends'
  active sessions in the strip; deep-link invite `puslespill://join?code=`
  (pure-JS React Navigation linking; existing app.json scheme; no rebuild).
- **SessionDetail polish** — shared `BottomSheet` ···menu; **owner-gating**
  (non-owners get a read-only view); "Fullført" badge; board-game update is a
  BottomSheet, not a native Alert.
- **Model C** — loan history → pushed `LoanHistoryScreen` off Collections
  (returned loans; active stay in `UTLÅNT NÅ`); Profile's `MINE UTLÅN` replaced
  by `TIDLIGERE ØKTER` (completed sessions → SessionDetail).
- **Phase 2-E — item covers** (`items.cover_url`): cover picker in `ItemForm`
  (Add+Edit), signed covers on `CollectionDetailScreen` rows + `added` feed
  cards. (Review caught + fixed a data-loss bug — see Lessons.)
- **Phase 2-D — reactions** (`session_reactions`): quick-react bar
  (👍 ❤️ 🎉 🧩) on session feed cards; optimistic toggle. `utils/reactions.ts`
  - unit tests.
- **Phase 2-F — participant progress photos** (`session_participants`):
  non-owner registered participants add photo-only via `AddPhotoSheet`; owner
  registers accepted friends via `FriendParticipantPicker` (New/Edit session);
  free-text guests retained; participant pills pressable to that friend. Extra
  additive DB paste: owner-manages `session_participants` INSERT/DELETE policies.
- **Friends hardening** (separate but merged) — unfriend, invite-code rotation,
  logged-out deep-link invites, i18n'd RPC errors; `regenerate_invite_code()` +
  reshaped `accept_invite` on the shared DB. See `docs/friends-hardening.md`.

Gate (all green, **43 tests**): `npm run typecheck && npm run lint && npm run format:check && npm test`.
**Device-verified on iOS simulator** (all of D/E/F + friends).

---

## ✅ Phase 2-F — DONE

Was the last Phase 2 item; now shipped + verified (see the Shipped list above).
Full spec + SQL: `docs/social-feed-v1-phase2-db.md` §F.

**FIRST verify the DB (don't assume):** D/E/F SQL was reportedly applied
2026-07-08, but confirm in the Supabase dashboard before writing client code:

1. A `session_images` **INSERT** policy that allows a **registered participant**
   (`session_participants.profile_id = auth.uid()`), not just the owner.
2. The storage-read scoping (§F item 2) must be the **ADDITIVE** rewrite: keep
   the existing path-owner branch **and** add a "can read the parent session"
   branch. ⚠️ Replacing the path-owner branch would break E covers + session
   photos (they rely on path-owner reads).

**Client work — all in `src/screens/SessionDetailScreen.tsx`:**

- Compute `isParticipant` (query `session_participants` for the current
  `user.id`; the screen already computes `isOwner`).
- Show a **photo-only** update path for participants: insert a `session_images`
  row (+ optional note) via `uploadSessionImage` (upload-then-insert, orphan
  cleanup, `try/catch/finally` — per CLAUDE.md) **WITHOUT** touching
  `sessions.progress_pct` / `completed_at`.
- Keep the sticky Update bar (progress/complete) and the ···menu (edit/delete)
  **owner-only** (already gated by `isOwner`). Participants get photo-add only.
- i18n keys in BOTH locales; a11y on the new controls.
- Verify with §"Manual test checklist" F in the phase-2 doc (participant can add
  a photo; progress/complete/edit/delete stay hidden; non-participant friend
  stays read-only).

---

## 🧹 Open follow-ups — ✅ all closed on `dev` (2026-07-11)

- ~~**E orphan-on-delete**~~ ✅ cover file removed on confirmed delete (`CollectionDetailScreen.handleDelete`).
- ~~**E FriendCollectionScreen covers**~~ ✅ signed covers render (feat/bibliotek).
- ~~**Reactions on SessionDetail**~~ ✅ shared `ReactionBar` on SessionDetail (feat/polish-tests-sentry).
- **Device testing:** still pending — verify `dev` on the Mac simulator (E + D + everything merged 2026-07-11).

---

## How to run / test (no native rebuild needed for any of the above)

```bash
# Start Metro in YOUR OWN terminal (agent background servers get reaped):
npx expo start --go                # Expo Go; all current native deps are in SDK-55 Go
# Open on the iOS simulator (don't use --ios; it hangs on an install prompt):
xcrun simctl openurl booted "exp://127.0.0.1:8081"
```

- Watchman crash (`_onHasteChange … addedFiles`): `watchman watch-del "$PWD" ; watchman watch-project "$PWD"`, then restart with `--clear`.
- The **deep-link (1C)** needs the real `puslespill://` scheme → won't fire in
  Expo Go; test on a dev build (`npx expo run:ios`, or the EAS dev client).

---

## Conventions & gotchas

- **Signed images:** always via `utils/sessionImages.ts` (`getSignedUrls` /
  `getSignedUrl`); store storage **paths** in the DB (`cover_url`, `image_url`),
  never URLs. Item covers reuse the **`session-images`** bucket.
- **i18n:** every user-facing string is a key in BOTH `src/locales/no.json`
  (source of truth) and `en.json`; keep full parity. Quick parity check:
  ```bash
  node -e 'const no=require("./src/locales/no.json"),en=require("./src/locales/en.json");const k=o=>{const s=new Set();(function w(x,p){for(const k in x){const n=p?p+"."+k:k;typeof x[k]==="object"&&x[k]?w(x[k],n):s.add(n)}})(o,"");return s};const a=k(no),b=k(en);console.log([...a].filter(x=>!b.has(x)),[...b].filter(x=>!a.has(x)))'
  ```
- **No hardcoded hex** — theme tokens (`surface`/`border`/`content`/`accent`) +
  `dark:` variants. a11y props on every touchable (role/label/hint/state).
- **Lesson (E review):** never seed `useState` from an **async-loaded** prop —
  it reads once at mount (still null then). Derive the value or sync via effect.
  Seeding `coverDisplay` from the async `initialCoverUrl` silently wiped covers
  on edit; fixed by deriving from a `coverTouched` flag.
- **Merge flow (as used this cycle):** cut a `feat/*` branch, implement, run the
  full gate, commit + push the branch, device-verify on the simulator, then merge
  into `main` (`--no-ff`), re-run the gate on the merge, push `main`, and delete
  the branch (local + remote). The owner is doing simultaneous work in the tree —
  never stage untracked/unrelated files (e.g. a WIP `docs/*.md`) into a merge.

---

## Key files

| Area                            | Files                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Feed + reactions                | `screens/FeedScreen.tsx`, `components/FeedCard.tsx`, `utils/reactions.ts`                                                  |
| Sessions (F goes here)          | `screens/SessionDetailScreen.tsx`, `components/ProgressSheet.tsx`                                                          |
| Items / covers                  | `components/ItemForm.tsx`, `screens/AddItemScreen.tsx`, `screens/EditItemScreen.tsx`, `screens/CollectionDetailScreen.tsx` |
| Collections / Profile (Model C) | `screens/CollectionsScreen.tsx`, `screens/LoanHistoryScreen.tsx`, `screens/ProfileScreen.tsx`                              |
| Image pipeline                  | `utils/sessionImages.ts`                                                                                                   |
| Docs                            | `docs/social-feed-v1-phase2-db.md`, `docs/profile-collections-model-c.md`                                                  |
