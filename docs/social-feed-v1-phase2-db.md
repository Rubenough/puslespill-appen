# Social Feed v1 — Phase 2 (needs a DB step)

**Status:** SQL ready — **not applied.** Phase 1 (photo feed, friends' active
sessions, deep-link invite) is already on `feat/social-feed-v1` and needs no DB
change. The two items below each need you to paste SQL into the Supabase
dashboard and then run `npm run gen:types`, before the client code is written.

Apply order doesn't matter; D and E are independent. After each, run:

```bash
supabase login && npm run gen:types   # project ref mzcppyhxikbkawmyrkrh
```

The RLS below follows the existing friend-scoped pattern (`are_friends`) from
`docs/phase1-friend-graph.md` — reactions are visible/insertable only on
sessions you can already see (your own or a friend's).

---

## D. Reactions — `session_reactions`

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

---

## Manual test checklist (after applying + client work lands)

- **D:** react to a friend's session → row appears; tap again → removed; a
  second account that is **not** a friend cannot read/insert (RLS denies).
- **E:** add an item with a cover → shows on the Collections row and its
  `added` feed card; a friend sees the same cover; an item without a cover
  falls back to the category icon.
