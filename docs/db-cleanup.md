# DB cleanup — ✅ DONE (2026-07-10, dev-branch DB batch)

> Applied via the `v1_launch_db_batch_enums_notnull_policy_hardening` migration, which also
> went further than this doc: `session_participants` legacy INSERT/SELECT policies dropped
> (a `with_check(true)` hole), and `profiles` SELECT restricted to authenticated with
> column-level grants that exclude `invite_code`. Kept below for the audit trail.

Redundant RLS policies found during the Phase 1 Step 4 audit (2026-07-05). They're **harmless** (duplicates of rules that already exist), just clutter from earlier setup where policies were created twice with Norwegian + English names. Run whenever convenient; nothing depends on it.

Verify names first (they may differ slightly):

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
```

## Duplicate write policies on `items`

The `"... egne puslespill"` policies duplicate the `"Users can ... their own items"` policies (same rule). Keep one set — dropping the legacy `puslespill`-named ones (they're also misnamed, since `items` is generic):

```sql
-- TAG: cleanup-items-dupes
drop policy "Kan endre egne puslespill" on items;      -- dup of "Users can update their own items"
drop policy "Kan legge til egne puslespill" on items;  -- dup of "Users can insert their own items"
drop policy "Kan slette egne puslespill" on items;     -- dup of "Users can delete their own items"
```

## Redundant delete policy on `session_images`

The `"owner"` policy is `FOR ALL` (covers delete already), so the explicit delete policy is redundant:

```sql
-- TAG: cleanup-session-images-dupe
drop policy "Kan slette bilder fra egen økt" on session_images;  -- covered by "owner" (FOR ALL)
```

## After running

Re-run the verify query and confirm each table has exactly one policy per operation:

- `items`: 1× SELECT (`read own or friends items`), 1× INSERT, 1× UPDATE, 1× DELETE
- `session_images`: `owner` (ALL) + `read own or friends session_images` (SELECT)

Do **not** touch the `read own or friends *` policies (Phase 1 Step 4) or the `loans` policies.
