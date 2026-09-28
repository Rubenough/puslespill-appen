# Account deletion — implementation & store checklist

Store hard gate: App Store guideline 5.1.1(v) (in-app deletion) + Google Play
data-deletion policy (web-accessible deletion URL in the Data safety form).

## What's implemented (dev branch, 2026-07-10)

- **Edge Function `delete_account`** (deployed v2, `verify_jwt=true`, service role) —
  source tracked in [`supabase/functions/delete_account/index.ts`](../supabase/functions/delete_account/index.ts).
  v2 (2026-07-12, after code review): **nothing destructive runs before `deleteUser`** —
  step 1 is read-only collection (storage paths + stray-row ids, with legacy full-URL
  values normalized like the app's `toStoragePath`), step 2 is `auth.admin.deleteUser`
  (the atomic point — a failure leaves ALL data untouched), step 3 is best-effort
  cleanup of stray rows + storage files. Enabled by a migration changing
  `loans.borrower_user_id` FK to `ON DELETE SET NULL` (owner loans already cascade
  via items in the same statement).
- **Settings UI**: "Slett konto" row (danger style) → double-confirm Alerts → invoke →
  local sign-out. i18n keys `settings.deleteAccount*` in both locales.
- **Web deletion page**: [`docs/store/account-deletion.html`](./store/account-deletion.html)
  (bilingual, self-contained).

## Remaining manual steps (owner)

1. **Publish the web page** on rubenvareide.no, e.g. `https://rubenvareide.no/fordriv/slett-konto`
   (any stable URL works; update the app-name in the HTML if the rename lands first).
2. **Play Console** → App content → Data safety → provide that URL as the account-deletion URL.
3. **Verify once on a throwaway account** (create → add item + photo + loan → delete →
   confirm sign-in impossible and rows/files gone). Do this on the dev build before submission.

## Notes / edge cases

- The borrower's free-text name (`loans.borrower_name`) on OTHER owners' historical loans is
  the owner's own record (like a contact note) and is retained; the account link
  (`borrower_user_id`) is removed. Revisit if a stricter erasure stance is wanted.
- Photos the deleted user added to friends' sessions are deleted (files + rows) — friends'
  session galleries will simply have fewer photos.
- If the function fails mid-way after `deleteUser`, storage purge is best-effort; files under
  the deleted user's folder can be swept manually from the dashboard. Failures are logged
  (`get_logs`, service `edge-function`).
