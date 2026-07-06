# Phase 2 — The borrow-request loop

Turns the one-sided loan _notebook_ into a real friend-to-friend _library_: a friend browses your collection → **"Be om å låne"** → you approve → it becomes a tracked loan (via the existing `trg_sync_item_status`) → return as today.

**Prerequisite:** the [i18n foundation](./i18n-plan.md) should land first, so all new strings below are translation keys — not hardcoded Norwegian to retrofit later.

Sequencing (same as Phase 1):

- **Step 1 (SQL)** — `borrow_requests` table + RLS + RPCs. Run in the SQL Editor.
- **Step 2** — `npm run gen:types`.
- **Step 3** — Claude builds the UI.
- **Step 4** — (optional) notifications.

---

## Data model

A **separate** `borrow_requests` table (not a status on `loans`) — a request is a distinct lifecycle and not every request becomes a loan. On approval, an RPC creates the `loans` row, so the existing loan/return/status machinery is reused unchanged.

```
borrow_requests
  id            uuid pk
  item_id       uuid → items
  owner_id      uuid → profiles   (item owner, denormalised for RLS/queries)
  requester_id  uuid → profiles   (the friend asking)
  status        pending | approved | declined | cancelled
  message       text?             (optional note from requester)
  created_at    timestamptz
  responded_at  timestamptz?
  loan_id       uuid → loans?     (set when approved)
```

Lifecycle: `pending` → owner `approve` (→ creates loan) / `decline`; requester can `cancel` while `pending`. One active (`pending`) request per (item, requester).

---

## Step 1 — SQL

```sql
create table if not exists borrow_requests (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references items(id) on delete cascade,
  owner_id     uuid not null references profiles(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','approved','declined','cancelled')),
  message      text,
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  loan_id      uuid references loans(id) on delete set null,
  check (owner_id <> requester_id)
);

-- at most one pending request per (item, requester)
create unique index if not exists borrow_requests_pending_uidx
  on borrow_requests (item_id, requester_id)
  where status = 'pending';

alter table borrow_requests enable row level security;

create policy "see own borrow_requests" on borrow_requests
  for select to authenticated
  using (auth.uid() in (owner_id, requester_id));
-- all mutations go through the security-definer RPCs below (no write policies).

-- Requester asks to borrow an available item from a friend.
create or replace function request_to_borrow(p_item_id uuid, p_message text default null)
returns borrow_requests
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_status text; v_row borrow_requests;
begin
  select owner_id, status into v_owner, v_status from items where id = p_item_id;
  if v_owner is null then raise exception 'Fant ikke gjenstanden'; end if;
  if v_owner = auth.uid() then raise exception 'Du eier denne gjenstanden'; end if;
  if not are_friends(auth.uid(), v_owner) then raise exception 'Dere er ikke venner'; end if;
  if v_status is distinct from 'Tilgjengelig' then raise exception 'Gjenstanden er ikke tilgjengelig'; end if;

  insert into borrow_requests (item_id, owner_id, requester_id, message)
  values (p_item_id, v_owner, auth.uid(), p_message)
  returning * into v_row;
  return v_row;
end; $$;

-- Owner approves → creates a loan; trg_sync_item_status flips items.status to 'Utlånt'.
create or replace function approve_request(p_request_id uuid)
returns borrow_requests
language plpgsql security definer set search_path = public as $$
declare v_req borrow_requests; v_name text; v_loan uuid;
begin
  select * into v_req from borrow_requests where id = p_request_id;
  if v_req.id is null then raise exception 'Fant ikke forespørselen'; end if;
  if v_req.owner_id <> auth.uid() then raise exception 'Bare eieren kan godkjenne'; end if;
  if v_req.status <> 'pending' then raise exception 'Forespørselen er ikke aktiv'; end if;

  select coalesce(full_name, 'Ukjent') into v_name from profiles where id = v_req.requester_id;

  insert into loans (item_id, owner_id, borrower_user_id, borrower_name, is_public)
  values (v_req.item_id, v_req.owner_id, v_req.requester_id, v_name, false)
  returning id into v_loan;

  update borrow_requests
    set status = 'approved', responded_at = now(), loan_id = v_loan
    where id = p_request_id
    returning * into v_req;
  return v_req;
end; $$;

-- Owner declines.
create or replace function decline_request(p_request_id uuid)
returns borrow_requests
language plpgsql security definer set search_path = public as $$
declare v_req borrow_requests;
begin
  select * into v_req from borrow_requests where id = p_request_id;
  if v_req.id is null then raise exception 'Fant ikke forespørselen'; end if;
  if v_req.owner_id <> auth.uid() then raise exception 'Bare eieren kan avslå'; end if;
  if v_req.status <> 'pending' then raise exception 'Forespørselen er ikke aktiv'; end if;

  update borrow_requests set status = 'declined', responded_at = now()
    where id = p_request_id returning * into v_req;
  return v_req;
end; $$;

-- Requester cancels their own pending request.
create or replace function cancel_request(p_request_id uuid)
returns borrow_requests
language plpgsql security definer set search_path = public as $$
declare v_req borrow_requests;
begin
  select * into v_req from borrow_requests where id = p_request_id;
  if v_req.id is null then raise exception 'Fant ikke forespørselen'; end if;
  if v_req.requester_id <> auth.uid() then raise exception 'Bare den som spurte kan avbryte'; end if;
  if v_req.status <> 'pending' then raise exception 'Forespørselen er ikke aktiv'; end if;

  update borrow_requests set status = 'cancelled', responded_at = now()
    where id = p_request_id returning * into v_req;
  return v_req;
end; $$;

grant execute on function request_to_borrow(uuid, text) to authenticated;
grant execute on function approve_request(uuid) to authenticated;
grant execute on function decline_request(uuid) to authenticated;
grant execute on function cancel_request(uuid) to authenticated;
```

`loans` policies unchanged; the RPCs run as definer so the requester never writes `loans` directly.

---

## Step 3 — UI plan

### A. Request from a friend's collection

`FriendCollectionScreen` items become **tappable** → an action sheet:

- If item `Tilgjengelig` and no pending request → **"Be om å låne"** (opens a small note field → `request_to_borrow`).
- If a pending request exists → show **"Forespurt"** badge + "Avbryt forespørsel" (`cancel_request`).
- If `Utlånt` → disabled with "Utlånt".

Fetch the viewer's pending requests for that friend's items alongside the items to render state.

### B. Requests inbox — new `RequestsScreen`

Reached from the **Header bell** (currently inert — good home). Two sections:

- **Innkommende** (owner side): pending requests for _my_ items → each row has **Godkjenn** (`approve_request`) / **Avslå** (`decline_request`), with requester avatar + item + optional message.
- **Utgående** (requester side): my pending requests → status + **Avbryt** (`cancel_request`).

Optional: unread badge count on the bell = number of incoming pending requests.

### C. Reuse existing loan surfaces

On approve, a `loans` row is created (borrower = the friend via `borrower_user_id`, `borrower_name` = their name), so **CollectionsScreen "UTLÅNT NÅ"**, the return flow, and **ProfileScreen** history all work unchanged.

### C.1 Borrowing-now section (borrower's view) — shipped

The `loans` SELECT policy is **owner-only**, so the borrower can't see the loan for something _they_ borrowed → borrowed items never appeared on their side. Fixed by an **additive** SELECT policy so the borrower can read their own active borrows, plus a read-only **"DU LÅNER NÅ"** section on `CollectionsScreen` (`loans` where `borrower_user_id = auth.uid()` and `returned_at is null`, owner name joined). No return action — the owner still owns the return (UPDATE stays owner-only).

Run once in the SQL editor:

```sql
create policy "borrower can see own loans" on loans
  for select to authenticated
  using (borrower_user_id = auth.uid());
```

Policy matrix update: `loans` SELECT becomes **owner or borrower** (was owner-only). INSERT/UPDATE/DELETE stay owner-only.

### C.2 Borrower-initiated return, owner confirms — shipped

The return stays **owner-authoritative** (the item is theirs), so the borrower only _signals_ "returned" and the owner _confirms_. A `return_requested_at` column persists the signal; a security-definer RPC lets the borrower set it (they have no `loans` UPDATE policy — all mutations go through RPCs). Owner confirmation reuses the existing "UTLÅNT NÅ" return tap (sets `returned_at`, `trg_sync_item_status` flips the item back to `Tilgjengelig`).

UI: borrower taps a **"DU LÅNER NÅ"** row → "Marker som levert" → row shows a **"Retur meldt"** badge; the owner's matching **"UTLÅNT NÅ"** row shows the same **"Retur meldt"** badge until they confirm.

Run once in the SQL editor:

```sql
alter table loans add column if not exists return_requested_at timestamptz;

create or replace function mark_loan_returned(p_loan_id uuid)
returns loans
language plpgsql security definer set search_path = public as $$
declare v_loan loans;
begin
  select * into v_loan from loans where id = p_loan_id;
  if v_loan.id is null then raise exception 'Fant ikke lånet'; end if;
  if v_loan.borrower_user_id is distinct from auth.uid() then
    raise exception 'Bare låntakeren kan melde retur'; end if;
  if v_loan.returned_at is not null then
    raise exception 'Lånet er allerede returnert'; end if;

  update loans set return_requested_at = now()
    where id = p_loan_id returning * into v_loan;
  return v_loan;
end; $$;

grant execute on function mark_loan_returned(uuid) to authenticated;
```

`database.types.ts` was hand-edited to add `loans.return_requested_at` + the `mark_loan_returned` function; a `npm run gen:types` after applying the SQL will regenerate the same shape.

### C.3 Loan lifecycle: due date, owner-requests-return, borrower-undo — shipped

Three related additions on top of C.1/C.2:

- **Return-by date** — owner picks a quick duration (Ingen frist / 1 uke / 2 uker / 1 måned) in the lend modal → `loans.due_at` (a `date`). Both loan surfaces show "skal leveres {dato}"; overdue rows go red. Set only on manual "Registrer utlån" loans for now — extending to the approve-a-request flow is a follow-up (needs `approve_request` to take a date + a picker in `RequestsScreen`).
- **Owner requests a return + note** — owner taps a "UTLÅNT NÅ" row → action menu (**Be om retur** | Registrer retur) → note modal writes `owner_return_requested_at` + `owner_return_note` (owner has `loans` UPDATE, so no RPC). Borrower sees "Eier ber om retur" + the note on their "DU LÅNER NÅ" row; owner sees a "Retur etterspurt" badge.
- **Borrower undo** — the borrower can tap their own "Retur meldt" row to clear the signal via a `unmark_loan_returned` RPC (they have no UPDATE, so it's an RPC like `mark_loan_returned`).

Run once in the SQL editor:

```sql
-- return-by date (owner sets when lending)
alter table loans add column if not exists due_at date;

-- owner-initiated return request + note
alter table loans add column if not exists owner_return_requested_at timestamptz;
alter table loans add column if not exists owner_return_note text;

-- borrower can undo their own return signal
create or replace function unmark_loan_returned(p_loan_id uuid)
returns loans
language plpgsql security definer set search_path = public as $$
declare v_loan loans;
begin
  select * into v_loan from loans where id = p_loan_id;
  if v_loan.id is null then raise exception 'Fant ikke lånet'; end if;
  if v_loan.borrower_user_id is distinct from auth.uid() then
    raise exception 'Bare låntakeren kan angre'; end if;
  if v_loan.returned_at is not null then
    raise exception 'Lånet er allerede returnert'; end if;

  update loans set return_requested_at = null
    where id = p_loan_id returning * into v_loan;
  return v_loan;
end; $$;

grant execute on function unmark_loan_returned(uuid) to authenticated;
```

`database.types.ts` hand-edited for `loans.due_at` / `owner_return_requested_at` / `owner_return_note` + the `unmark_loan_returned` function.

### D. Feed (optional, later)

Add a `borrowed` feed event when a request is approved (owner's public activity), mirroring the existing `loaned` card. **Shipped** — sourced from the borrower's own approved `borrow_requests`.

### New screens / nav

- `RequestsScreen` on the root stack; open from `Header`'s bell (wire `onPress`).
- `FriendItemActionSheet` (or inline modal) in `FriendCollectionScreen`.

### String keys this introduces (i18n)

`requests.title`, `requests.incoming`, `requests.outgoing`, `requests.empty`,
`borrow.ask`, `borrow.requested`, `borrow.cancel`, `borrow.approve`, `borrow.decline`,
`borrow.messagePlaceholder`, `borrow.unavailable`,
plus error strings surfaced from the RPCs (kept server-side in Norwegian for now — see i18n-plan note on server messages).

---

## Notifications (Step 4 — optional, later)

- `expo-notifications`: register push token → store on `profiles.push_token`.
- Send via a Supabase Edge Function triggered on `borrow_requests` insert/update: notify owner on new request, requester on approve/decline.
- Also enables the deferred **loan reminder after X weeks**.
