# Phase 1 — Friend graph design & SQL

**Decisions:** mutual friendship (request → accept, collapsed to instant-accept via invite), discovery by **invite link/code only** (no open user directory).

Because invites are exchanged deliberately (owner shares a link = their consent; opener taps "add" = theirs), an invite creates an **accepted** friendship directly — no separate pending step. The `status` column is kept for future in-app requests / blocking.

Run the SQL in the Supabase **SQL Editor**. Order matters:

- **Step 1 (run now)** — friend graph + invite RPCs. Unblocks UI development.
- **Step 2** — `npm run gen:types` to type the new table/RPCs.
- **Step 3** — (Claude builds the UI: invite screen, Friends list, friend profile/collection.)
- **Step 4 (after the UI works)** — lock reads to friends. Doing this last lets you actually test friend-vs-stranger visibility, and also completes the deferred Phase 5 storage-policy tightening.

---

## Step 1 — Friend graph + invite RPCs

```sql
-- 1a. Invite code on profiles (per-user, regenerable, not enumerable via reads)
alter table profiles add column if not exists invite_code text unique;

-- 8 chars, ambiguity-free alphabet
create or replace function gen_invite_code() returns text
language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
           (floor(random() * 30) + 1)::int, 1), '')
  from generate_series(1, 8);
$$;

-- 1b. friendships (one row per pair, either direction)
create table if not exists friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status       text not null default 'accepted' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- prevent both (A,B) and (B,A)
create unique index if not exists friendships_pair_uidx
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table friendships enable row level security;

create policy "see own friendships" on friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy "unfriend own" on friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));
-- inserts happen only via accept_invite() below (security definer) — no client INSERT policy.

-- 1c. Reusable predicate for friend-scoped policies elsewhere
create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b)
        or (requester_id = b and addressee_id = a))
  );
$$;

-- 1d. Get (or lazily create) my invite code
create or replace function get_my_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  select invite_code into code from profiles where id = auth.uid();
  while code is null loop
    begin
      code := gen_invite_code();
      update profiles set invite_code = code where id = auth.uid();
    exception when unique_violation then
      code := null; -- collision, retry
    end;
  end loop;
  return code;
end;
$$;

-- 1e. Redeem someone's code → become friends. Code never leaves the server.
create or replace function accept_invite(p_code text)
returns table (friend_id uuid, full_name text, avatar_url text)
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select id into v_owner from profiles where invite_code = upper(btrim(p_code));
  if v_owner is null then raise exception 'Ugyldig invitasjonskode'; end if;
  if v_owner = auth.uid() then raise exception 'Du kan ikke legge til deg selv'; end if;

  insert into friendships (requester_id, addressee_id, status)
  values (v_owner, auth.uid(), 'accepted')
  on conflict do nothing;

  return query
    select p.id, p.full_name, p.avatar_url from profiles p where p.id = v_owner;
end;
$$;

grant execute on function get_my_invite_code() to authenticated;
grant execute on function accept_invite(text) to authenticated;
```

---

## Step 4 — Lock reads to friends (run after the UI works)

Replace the interim "all authenticated users can read" policies with self-or-friends. **First drop your current permissive read policies** on these tables (check Dashboard → Auth → Policies for their exact names), then:

```sql
-- items
create policy "read own or friends items" on items
  for select to authenticated
  using (owner_id = auth.uid() or are_friends(auth.uid(), owner_id));

-- sessions
create policy "read own or friends sessions" on sessions
  for select to authenticated
  using (created_by = auth.uid() or are_friends(auth.uid(), created_by));

-- session_images (scoped through the parent session's owner)
create policy "read own or friends session_images" on session_images
  for select to authenticated
  using (exists (
    select 1 from sessions s
    where s.id = session_images.session_id
      and (s.created_by = auth.uid() or are_friends(auth.uid(), s.created_by))
  ));

-- storage: path is "<owner_uid>/...", so folder[1] is the owner.
-- Drop the interim "authenticated can read session-images" policy first.
create policy "read own or friends session-images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'session-images' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
```

`loans` keep their existing owner-only policies (unchanged — borrower privacy invariant holds).

---

## Policy matrix (target end state)

| Table                    | SELECT                           | INSERT                     | UPDATE | DELETE                    |
| ------------------------ | -------------------------------- | -------------------------- | ------ | ------------------------- |
| `profiles`               | self + (friends, minimal fields) | trigger on signup          | self   | —                         |
| `friendships`            | participants                     | via `accept_invite()` only | —      | participants (unfriend)   |
| `items`                  | self + friends                   | self                       | self   | self                      |
| `sessions`               | self + friends                   | self                       | self   | self / `delete_session()` |
| `session_images`         | self + friends (via session)     | self                       | —      | via session delete        |
| `session_participants`   | self + friends (via session)     | self                       | —      | via session delete        |
| `loans`                  | **owner only**                   | owner                      | owner  | owner                     |
| storage `session-images` | self + friends (path owner)      | self (own folder)          | —      | self                      |

---

## UI to build (Step 3)

- **Invite screen / section** — show my code + share sheet (`puslespill://join?code=…`), and a field/scanner to redeem a code (`accept_invite`).
- **Deep link** — handle `puslespill://join?code=…` via `expo-linking` → confirm → `accept_invite`.
- **FriendsScreen (real)** — accepted friends from `friendships` + joined `profiles`; tap → friend profile.
- **Friend profile + collection** — read-only view of a friend's `items` (now permitted by Step 4 RLS).
- Feed already reads sessions/items broadly; after Step 4 it naturally narrows to self + friends.
