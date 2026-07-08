# Social Feed v1 — Phase 2 (needs a DB step)

**Status:** ✅ **D, E, F applied (2026-07-08)** + `gen:types` regenerated
(`session_reactions`, `items.cover_url`). Phase 1 (photo feed, friends' active
sessions, deep-link invite) is already on `feat/social-feed-v1` and needed no DB
change. Client work per item is tracked in the sections below.

Apply order doesn't matter; D and E are independent. F is two pastes (INSERT
policy + the additive storage-read rewrite in section F). After applying, run:

```bash
supabase login && npm run gen:types   # project ref mzcppyhxikbkawmyrkrh
```

The RLS below follows the existing friend-scoped pattern (`are_friends`) from
`docs/phase1-friend-graph.md` — reactions are visible/insertable only on
sessions you can already see (your own or a friend's).

---

## D. Reactions — `session_reactions`

**Client work: ✅ DONE.** `utils/reactions.ts` (`fetchReactionsBySession`,
`toggleReaction`, pure `applyToggle` + unit test); a quick-react bar
(`REACTION_EMOJIS`) on `FeedCard` session cards, rendered as a sibling of the
tap-to-navigate area; optimistic toggle in `FeedScreen` (functional setState,
revert on error). i18n `feed.reaction*` in both locales.

A tap-to-react row on feed session cards (👍 ❤️ 🎉 …). One row per
(session, user, emoji); a second tap of the same emoji removes the row.

### SQL (paste in Supabase → SQL editor)

```sql
create table if not exists public.session_reactions (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (session_id, user_id, emoji)
);

create index if not exists session_reactions_session_idx
  on public.session_reactions (session_id);

alter table public.session_reactions enable row level security;

-- SELECT: reaksjoner på økter du kan se (egen eller venns økt)
create policy "read reactions on visible sessions" on public.session_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_reactions.session_id
        and (s.created_by = auth.uid() or are_friends(auth.uid(), s.created_by))
    )
  );

-- INSERT: bare egne reaksjoner, og bare på økter du kan se
create policy "insert own reactions on visible sessions" on public.session_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = session_reactions.session_id
        and (s.created_by = auth.uid() or are_friends(auth.uid(), s.created_by))
    )
  );

-- DELETE: bare egne reaksjoner (fjern ved nytt trykk på samme emoji)
create policy "delete own reactions" on public.session_reactions
  for delete to authenticated
  using (user_id = auth.uid());
```

### Client work (after `gen:types`)

- New `utils/reactions.ts`: `fetchReactions(sessionIds)` → `Map<sessionId,
{emoji, count, mine}[]>` (one batched `.in("session_id", …)` query, group in
  JS); `toggleReaction(sessionId, emoji)` (insert, or delete on the unique
  conflict — a plain `delete().match(...)` when it already exists).
- A small reaction row on `FeedCard` for `started`/`completed` cards only
  (they carry `sessionId`). Emoji buttons need `accessibilityRole="button"` +
  `accessibilityState={{ selected: mine }}` and i18n labels
  (`feed.reactionAdd` / `feed.reactionRemove`) in **both** locales.
- Privacy: reactions never reveal borrower/loan data — they attach to sessions
  only, and RLS keeps them friend-scoped. Do not surface who reacted beyond
  name/avatar already visible in the feed.

---

## E. Item cover images — `items.cover_url`

**Client work: ✅ DONE (2026-07-08, on `feat/social-feed-v1`, unpushed).** Cover
picker in `ItemForm` (Add + Edit, upload-then-write + orphan/old-file cleanup);
covers signed and shown on `CollectionDetailScreen` rows and `added` `FeedCard`s;
`Item` type + feed/detail selects carry `cover_url`. Typecheck/lint/format/tests
green. Not yet device-tested.

Show a puzzle/box cover on Collections rows and on `added` feed cards, reusing
the signed-URL image pipeline (`utils/sessionImages.ts`).

### SQL

```sql
alter table public.items add column if not exists cover_url text;
```

`cover_url` stores a **storage path** (not a URL), same convention as
`sessions.image_url`. Reuse the existing **`session-images`** private bucket so
the friend-scoped storage SELECT policy already applies — upload under the
owner's `auth.uid()` folder via `uploadSessionImage(path, uri)`, and resolve
for display with `getSignedUrl` / `getSignedUrls` (batch for lists). No new
bucket or storage policy needed.

### Client work (after `gen:types`)

- `AddItemScreen` / `EditItemScreen`: optional cover picker (reuse
  `expo-image-picker` + `uploadSessionImage`, upload-then-update ordering per
  CLAUDE.md; track the path outside the `try`, remove the orphan on failure).
- `CollectionDetailScreen` rows and the `added` `FeedCard`: sign `cover_url`
  and render it in place of the category icon, falling back to the icon when
  absent (same photo-or-icon fallback the feed now uses for sessions).
- Feed: extend `fetchFeedItems` to select `cover_url` on the items query and
  batch-sign alongside the session images already signed there.

**Follow-up (not done):** `FriendCollectionScreen` still shows the category icon,
not covers — out of the original E scope. Add `cover_url` to its items select +
batch-sign for parity when convenient.

---

## F. Registered participants can add progress photos

**Client work: ✅ DONE + device-verified on iOS simulator (2026-07-08, branch
`feat/feed-phase2-f`, pushed, unmerged).** Scope was expanded (approved) because F
was otherwise unreachable — nothing registered a non-owner as a participant. Built:

- **`SessionDetailScreen`** — `isParticipant` (fetch `session_participants`);
  participant (non-owner) gets a sticky **"Legg til bilde"** bar + `AddPhotoSheet`
  (photo required + optional note) that inserts a `session_images` row **only**
  (never touches `progress_pct` / `completed_at`); registered participants shown
  as accent chips in the participants section. Owner update bar unchanged.
- **Enabler — friend-participant picker** (`FriendParticipantPicker`) in
  **`NewSessionScreen`** (insert selected friends at create) and
  **`EditSessionScreen`** (diff add/remove `session_participants`). Owner picks
  accepted friends as registered participants alongside free-text `guest_names`.

**⚠️ Needs one more DB paste (owner-manages-participants).** The existing
`session_participants` INSERT/DELETE policies (self-scoped per the phase-1 matrix)
do **not** let the owner add/remove a _friend's_ `profile_id`. Additive policies
required (no `gen:types` — policies don't change generated types):

```sql
-- Session owner may add/remove REGISTERED participants on their own session.
-- Additive: any existing self-scoped policies still apply (permissive = OR'd).
create policy "owner adds session_participants" on public.session_participants
  for insert to authenticated
  with check (
    exists (select 1 from public.sessions s
            where s.id = session_participants.session_id and s.created_by = auth.uid())
  );

create policy "owner removes session_participants" on public.session_participants
  for delete to authenticated
  using (
    exists (select 1 from public.sessions s
            where s.id = session_participants.session_id and s.created_by = auth.uid())
  );
```

Original spec below (DB parts — INSERT policy + additive storage-read — already
applied earlier in this doc's session).

**Why:** on `SessionDetail`, edit/delete/update are now owner-only (a friend
opening a session from the feed gets a read-only view). We want a middle tier:
a **registered participant** (`session_participants.profile_id = auth.uid()`,
not just a free-text `guest_name`) should be able to **add a progress photo** —
but **not** change progress %, complete, edit, or delete. Those stay owner-only.

Current policies (`docs/phase1-friend-graph.md`) make `sessions` UPDATE and
`session_images` INSERT owner-only, and the `session-images` storage read policy
is scoped by **path owner** (`<uid>/…`). Two pastes were applied:

```sql
-- 1) Let participants insert progress-photo rows (owner still allowed)
create policy "participants insert session_images" on public.session_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_images.session_id
        and (
          s.created_by = auth.uid()
          or exists (
            select 1 from public.session_participants p
            where p.session_id = s.id and p.profile_id = auth.uid()
          )
        )
    )
  );
```

2. **Storage read scoping — additive rewrite (applied).** A participant uploads
   under their own `<their-uid>/…` folder, so the existing path-owner read
   policy only let _their_ friends see it — not everyone who can see the session.
   The fix keeps the path-owner branch (**required** — session covers
   `sessions.image_url` and item covers `items.cover_url` in section E live in
   this same bucket and are read by path owner, **not** as `session_images`
   rows) and **adds** a "can you read the parent session?" branch. Replacing the
   path-owner check instead of extending it would break every cover image.

```sql
drop policy "read own or friends session-images" on storage.objects;

create policy "read own or friends session-images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'session-images' and (
      -- covers (sessions.image_url, items.cover_url) + own uploads + their friends
      (storage.foldername(name))[1] = auth.uid()::text
      or are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
      -- OR: a progress photo attached to a session you can already read
      or exists (
        select 1 from public.session_images si
        join public.sessions s on s.id = si.session_id
        where si.image_url = storage.objects.name
          and (s.created_by = auth.uid() or are_friends(auth.uid(), s.created_by))
      )
    )
  );
```

**Client work (after the policy is applied):** in `SessionDetailScreen`, compute
`isParticipant` (fetch `session_participants` for `user.id`) and show a
**photo-only** update path for participants — a trimmed `ProgressSheet` (or a
small "add photo + note" sheet) that inserts a `session_images` row **without**
touching `sessions.progress_pct` / `completed_at`. Keep the sticky Update bar
owner-only for progress/completion.

---

## Manual test checklist (after applying + client work lands)

- **D:** react to a friend's session → row appears; tap again → removed; a
  second account that is **not** a friend cannot read/insert (RLS denies).
- **E:** add an item with a cover → shows on the Collections row and its
  `added` feed card; a friend sees the same cover; an item without a cover
  falls back to the category icon.
- **F:** as a registered participant (not the owner), add a progress photo →
  it appears for the owner and other session viewers; progress %, complete,
  edit and delete remain hidden. As a non-participant friend, the session
  stays read-only.
