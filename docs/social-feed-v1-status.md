# Social Feed v1 — status & handoff (START HERE)

**Updated:** 2026-07-08 · **Branch/merge state:** `main` = `feat/social-feed-v1`
= commit `a9e6dd3`, pushed to origin. Working tree clean. Everything below is
**merged to `main`**. (A separate `feat/friends-hardening` branch exists for
unrelated work; other agents may branch off the feed work — this doc is the
single source of truth for what's done and what's next.)

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

Gate (all green, **39 tests**): `npm run typecheck && npm run lint && npm run format:check && npm test`.
**Not device-tested** — E covers and D reactions especially want a sim tap-through.

---

## ▶️ NEXT — Phase 2-F: participants can add progress photos

The last Phase 2 item. Full spec + SQL: `docs/social-feed-v1-phase2-db.md` §F.

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

## 🧹 Open follow-ups (non-blocking, pick up anytime)

- **E orphan-on-delete:** `CollectionDetailScreen.handleDelete` deletes the item
  row but not its cover file. Add
  `if (item.cover_url) await removeSessionImages([item.cover_url]).catch(() => {})`
  after a confirmed delete (cover is a storage path; the helper accepts paths).
- **E FriendCollectionScreen covers:** friend's collection rows don't render
  covers (out of E's original scope). Sign `cover_url` there like
  CollectionDetail does.
- **Reactions on SessionDetail:** reactions live only on the feed today; could
  reuse `utils/reactions.ts` on `SessionDetailScreen`.
- **Device testing:** E + D not yet run on-device.

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
- **Merge flow:** work on `feat/social-feed-v1`, run the full gate, commit, then
  fast-forward `main` **without checking it out** (safe when other agents share
  the working tree): `git branch -f main <sha> && git push origin main`. Never
  merge with a dirty working tree. To commit to a non-checked-out branch while
  another agent uses the repo, use `git worktree add`.

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
