# Phase 2.2 — Push notifications — design + plan

**Status:** 📝 Plan — not yet implemented. The nudge channel that finishes the lending loop
(Phase 2, [`phase2-borrow-loop.md`](./phase2-borrow-loop.md)); tracked as "Pick up next #1" in
[`PROJECT-PLAN.md`](./PROJECT-PLAN.md).

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

## 1. Goal & scope

Deliver push notifications so the borrow loop works when people aren't in the app: a request pings
the owner, an approve/decline pings the requester, return signals ping the other party, and
overdue loans get a nudge (`loans.due_at` already exists to drive them).

**Decisions locked for this phase:**

- **Android only now.** iOS is designed for but deferred — see §9. Reason: iOS push needs the Apple
  Developer Program ($99/yr) + APNs, which is already the Phase 4 launch gate (Apple Sign-In).
- **No Firebase project exists yet** (Google sign-in runs through Supabase, not Firebase). Standing
  one up is net-new setup work — see §4 / PR 0.
- **Per-device token table** (`device_push_tokens`), not a single `profiles.push_token` column —
  see §5.1.

**Out of scope:** iOS delivery (design only), an in-app notification center (optional PR 5), email
fallback, per-type mute settings beyond the OS-level toggle.

## 2. Why the original sketch wasn't enough

The `phase2-borrow-loop.md` §Notifications sketch (register token → `profiles.push_token`; webhook
`borrow_requests`) has three gaps this plan closes:

1. **Single token column loses devices.** One user with a phone + tablet, or a replaced phone,
   either drops the second device or leaves the first token stale. → per-device table (§5.1).
2. **No localization path.** Push copy is built **server-side** in the Edge Function, but the user's
   language lives only in **SecureStore on the device** (`lib/i18n.ts`). The server can't see it. →
   persist `profiles.locale` (§5.2).
3. **Webhooking `borrow_requests` misses events.** Return-loop signals live on `loans`, and overdue
   nudges have no row change at all (a time trigger). → a single `notifications` queue table that
   any RPC / trigger / cron enqueues into (§5.3).

## 3. Architecture

```
device                        Supabase (Postgres)                 Expo
──────                        ───────────────────                 ────
register token ──upsert──▶  device_push_tokens
                            profiles.locale  ◀─── setLanguage()

request_to_borrow ─┐
approve/decline    ├─ INSERT ─▶ notifications ──DB webhook──▶  push Edge Function ──▶ Expo Push API ──▶ device
mark/owner-return  │            (queue, RLS)                     (Deno): resolve tokens
pg_cron overdue ───┘                                             + locale → localized copy,
                                                                 POST /--/api/v2/push/send,
                                                                 prune DeviceNotRegistered
```

One queue table, one webhook, one Edge Function. Domain logic (who/what) stays in the RPCs; delivery
(how) stays in the function. The queue doubles as an audit log and a future in-app notification
center (PR 5).

## 4. Prerequisites (PR 0 — config, mostly manual)

These gate everything and some are net-new. Do them first, in a dev build.

- [ ] **Firebase project** for `no.rubenvareide.puslespill` (net-new; unrelated to Supabase auth).
- [ ] **`google-services.json`** downloaded → project root → referenced via
      `app.json` `android.googleServicesFile`. _Native change → new dev build._
- [ ] **FCM V1 service account key** (Firebase → Project settings → Service accounts → Generate
      private key) **uploaded to EAS** (`eas credentials` → Android → FCM V1). This is what lets
      Expo send to Android; it is a **different file** from `google-services.json`.
- [ ] **`expo-notifications` config plugin** added to `app.json` `plugins` (icon, color, default
      channel). Adds the `POST_NOTIFICATIONS` runtime permission on Android 13+.
- [ ] **Supabase CLI linked** (`supabase link --project-ref mzcppyhxikbkawmyrkrh`) + a
      `supabase/functions/` scaffold (none exists today).
- [ ] **`EXPO_ACCESS_TOKEN`** created (Expo dashboard, "Enhanced Security for Push Notifications"
      on) and set as an Edge Function secret.
- [ ] Fresh **dev build** (`eas build --profile development --platform android`) — `expo-notifications` + `expo-device` + `google-services.json` are native inputs (`npm run rebuild:check` will flag).

`projectId` for `getExpoPushTokenAsync` is already available: `1d9af33b-3ec3-404c-a77f-7f9a66d60083`
(from `app.json` `extra.eas.projectId`).

## 5. Data model & backend

All SQL is applied **in the Supabase dashboard** (no migration files — house rule). Regenerate types
after (`npm run gen:types`).

### 5.1 `device_push_tokens` (per-device, replaces the single-column idea)

```sql
create table device_push_tokens (
  token       text primary key,               -- ExpoPushToken[...]
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null default 'android', -- 'android' | 'ios' (future)
  last_seen   timestamptz not null default now()
);
alter table device_push_tokens enable row level security;
-- A user manages only their own tokens.
create policy dpt_self on device_push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on device_push_tokens (user_id);
```

Client upserts by `token` on each launch (updates `last_seen`, re-binds `user_id` if the device
changed accounts). The Edge Function prunes a token on Expo's `DeviceNotRegistered` receipt.

### 5.2 `profiles.locale` (server-visible language)

```sql
alter table profiles add column locale text not null default 'no'
  check (locale in ('no','en'));
```

Written whenever the app changes language (see §6). The Edge Function reads it to localize; falls
back to `no`.

### 5.3 `notifications` queue

```sql
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type         text not null,          -- 'borrow_request' | 'request_approved' | 'request_declined'
                                        -- | 'return_requested' | 'owner_return_requested' | 'overdue'
  entity_id    uuid,                   -- request/loan id for deep-link + copy lookup
  data         jsonb not null default '{}',  -- denormalized bits for copy (item title, other name)
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,            -- set by the Edge Function
  read_at      timestamptz            -- for a future in-app center
);
alter table notifications enable row level security;
-- Recipient may read/ack their own; INSERT is done by security-definer RPCs, not clients.
create policy notif_read_self on notifications
  for select using (recipient_id = auth.uid());
create policy notif_ack_self on notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
```

**Enqueue from the existing RPCs** (they're already `security definer`, so they can insert). Sketch
for the new-request case inside `request_to_borrow`:

```sql
insert into notifications (recipient_id, type, entity_id, data)
values (v_owner_id, 'borrow_request', v_request_id,
        jsonb_build_object('item_title', v_item_title, 'from_name', v_requester_name));
```

Mirror in `approve_request` / `decline_request` (recipient = requester), `mark_loan_returned`
(recipient = owner), the owner-return UPDATE (recipient = borrower). Keep the enqueue **after** the
state change, inside the same transaction.

### 5.4 Overdue nudges (`pg_cron`)

```sql
-- daily 09:00; enqueue one 'overdue' per active, past-due loan (idempotent guard on data)
select cron.schedule('overdue-loan-nudge', '0 9 * * *', $$
  insert into notifications (recipient_id, type, entity_id, data)
  select l.borrower_user_id, 'overdue', l.id,
         jsonb_build_object('item_title', i.title, 'due_at', l.due_at)
  from loans l join items i on i.id = l.item_id
  where l.returned_at is null and l.due_at < current_date
    and l.borrower_user_id is not null
    and not exists (  -- don't re-nudge the same loan same day
      select 1 from notifications n
      where n.type='overdue' and n.entity_id=l.id and n.created_at::date = current_date);
$$);
```

### 5.5 Database Webhook

Dashboard → Database → Webhooks: on `notifications` **INSERT** → HTTP POST the `push` Edge Function,
service-role auth header, 1000 ms timeout.

## 6. Client

- [ ] `npx expo install expo-notifications expo-device` (native → dev rebuild).
- [ ] `app.json`: `expo-notifications` plugin + `android.googleServicesFile`.
- [ ] `src/lib/notifications.ts`:
  - `registerForPushNotifications()` — `Device.isDevice` guard; on Android call
    `setNotificationChannelAsync('default', …)` **before** requesting; request permission
    (`getPermissionsAsync` → `requestPermissionsAsync`); `getExpoPushTokenAsync({ projectId })`;
    upsert into `device_push_tokens`.
  - subscribe to `addPushTokenListener` to re-upsert on token rotation.
  - a foreground `setNotificationHandler` (show banner) + a response listener that deep-links
    (`Requests` for request events, `CollectionDetail`/loan for return/overdue).
- [ ] Call it on login — a small effect/provider mounted inside the `session` branch of `App.tsx`.
- [ ] Persist locale: in `lib/i18n.ts` `setLanguage`, also `update profiles set locale=…` for the
      signed-in user (best-effort, non-blocking) so the server can localize.
- [ ] **Settings "Varsler" section** (reuse the new `SettingsScreen`): a row showing OS permission
      state; if denied, deep-link to system settings; request contextually after the first borrow
      action rather than on cold start. i18n keys in `settings.*` (both locales, parity).

## 7. Edge Function (`supabase/functions/push`)

Deno. Input = the webhook's `notifications` row. Steps:

1. Load `recipient_id`'s tokens from `device_push_tokens` and `profiles.locale`.
2. Build `{ title, body }` from a **per-type, per-locale** template map, interpolating `data`
   (`item_title`, `from_name`, …). **Privacy:** every recipient is a party to the loan, but templates
   must be written from the recipient's perspective — never put a borrower name in a payload to a
   non-owner. Norwegian is source, English mirrored.
3. POST to `https://exp.host/--/api/v2/push/send` with `EXPO_ACCESS_TOKEN`; batch if multiple tokens.
4. On `DeviceNotRegistered` receipts, delete those tokens. Set `notifications.sent_at`.

Copy lives in the function (not i18next). Keep the template map small and mirror the app's tone.

## 8. Phased delivery

| PR            | Scope                                                                                     | Verifiable by                                           |
| ------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **0**         | Prereqs §4 (Firebase, FCM V1 key, plugin, `supabase link`, dev build)                     | dev build installs; Expo tool can reach the device      |
| **1**         | Client token registration + `device_push_tokens` + `profiles.locale` + Settings "Varsler" | token row appears; manual push from Expo's tool arrives |
| **2**         | `notifications` queue + webhook + `push` function + **event #1** (`request_to_borrow`)    | request → owner's phone buzzes end-to-end               |
| **3**         | Events #2–#4 (approve/decline, return_requested, owner_return)                            | each flow pings the right party                         |
| **4**         | Overdue nudges (`pg_cron`)                                                                | a back-dated `due_at` fires a nudge                     |
| **5** _(opt)_ | In-app notification center reusing `notifications` (unify with Header bell)               | list + read state                                       |

Vertical slice: **land PR 2's single event end-to-end before adding the rest** — it exercises the
whole pipeline (token → queue → webhook → function → device).

## 9. iOS — designed, deferred (Phase 4)

The whole design is platform-neutral above the credential layer; enabling iOS is additive:

- Apple Developer Program membership + an **APNs key** uploaded to EAS.
- `platform: 'ios'` rows in `device_push_tokens` (already modeled).
- iOS dev/prod build; the same Edge Function and queue are unchanged (Expo abstracts APNs/FCM).

Pairs naturally with the Phase 4 **Apple Sign-In** launch gate — do both when the Apple account is
set up. No schema or function changes needed then.

## 10. Testing

- Native push can't be meaningfully unit-tested → mock `expo-notifications`.
- **Worth having:** a pure test for the token-upsert payload; a **Deno test** for the function's copy
  builder — `(type, locale, data) → {title, body}` for every type in `no`/`en`, asserting no
  name-leak to non-owners.
- Manual: Expo push tool → device (PR 1); then real two-device flows per event (PR 2+).

## 11. Files touched (when built)

| File                               | Change                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `app.json`                         | `expo-notifications` plugin; `android.googleServicesFile`; (icon/color assets)             |
| `google-services.json`             | **new** (git-ignored; it's Android Firebase config)                                        |
| `package.json`                     | `expo-notifications`, `expo-device`                                                        |
| `src/lib/notifications.ts`         | **new** — register/permission/channel/token upsert + handlers                              |
| `src/lib/i18n.ts`                  | write `profiles.locale` on `setLanguage`                                                   |
| `App.tsx` (or a `PushProvider`)    | register on login; wire listeners                                                          |
| `src/screens/SettingsScreen.tsx`   | "Varsler" section                                                                          |
| `src/locales/{no,en}.json`         | `settings.*` notification strings (parity)                                                 |
| `supabase/functions/push/index.ts` | **new** — Deno sender                                                                      |
| `src/lib/database.types.ts`        | regenerate after the SQL lands                                                             |
| Supabase (dashboard)               | `device_push_tokens`, `profiles.locale`, `notifications`, RPC enqueues, `pg_cron`, webhook |

## 12. Open items to confirm before PR 0

- Notification **icon/color** asset (Android requires a small monochrome icon).
- Overdue nudge: borrower only, or **also the owner**? (Matrix has borrower; owner is a cheap add.)
- `.gitignore` `google-services.json` (contains project config) and keep the FCM key out of the repo
  entirely (EAS-only).
