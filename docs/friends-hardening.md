# Friends — hardening punch list

**Status:** ✅ Done + **device-verified on iOS simulator** (incl. F3 deep-link
landing). On `feat/friends-hardening` @ `491a58f` (cut from `feat/social-feed-v1`
@ `a9e6dd3`), pushed to origin, **not merged**. DB (`regenerate_invite_code` +
combined `accept_invite`) applied to the shared Supabase project.
**Created:** 2026-07-08 · **Owner:** @rubenough

Honest review of the friends feature surfaced the gaps below. This doc is the
shared spec + tracker for a three-role fix team (UX / backend / frontend). Each
role owns its section; frontend implements against the UX spec + backend contract.

**House rule:** no SQL migration files — schema lives in the Supabase dashboard.
Backend's deliverable is **paste-ready SQL + verification of existing policies**,
not applied changes. Prefer solutions that use _existing_ RLS/RPCs so the branch
compiles and ships without a dashboard step; flag anything that genuinely needs a
paste as **DB-GATED**.

Files in scope: `src/screens/FriendsScreen.tsx`, `src/utils/friends.ts`,
`src/screens/FriendCollectionScreen.tsx`, `App.tsx`, `src/locales/{no,en}.json`,
and (verify only) `docs/phase1-friend-graph.md`.

---

## Punch list

Severity: 🔴 high · 🟠 medium · 🟡 low. Each item notes whether it's **client-only**
or **DB-GATED**, and the primary role.

### 🔴 F1 — No unfriend / remove friend

**Root cause:** the DB has a `"unfriend own"` DELETE policy on `friendships`
(`phase1-friend-graph.md:51-53`) but there is **no UI**. Since friendship grants
RLS read access to a friend's whole collection, sessions, and feed, "friendship is
permanent" is a real privacy hole.
**Fix:** add a remove-friend action (confirm dialog → `friendships` DELETE under the
existing policy → refetch). **Client-only** — no new SQL (backend: verify the
DELETE policy permits a raw `.delete()` from the client).
**Roles:** UX (affordance + confirm copy), Frontend (impl), Backend (policy check).

### 🔴 F2 — Invite code can't be rotated

**Root cause:** `get_my_invite_code` lazily creates a code but there's no rotate.
A shared code is a bearer token to your social graph; combined with F1 a leaked
code was previously unrevocable.
**Preferred fix (client-only):** rotate by setting `profiles.invite_code = null`
(self UPDATE) then calling `get_my_invite_code()` (regenerates on null). **Backend
must verify** the `profiles` self-UPDATE policy allows nulling `invite_code`; if it
does **not**, provide a paste-ready `regenerate_invite_code()` security-definer RPC
instead (**DB-GATED**).
**Roles:** Backend (verify/decide + SQL if needed), UX (rotate affordance + "old
links stop working" warning), Frontend (impl).

### 🔴 F3 — Invite links silently fail when logged out

**Root cause:** `NavigationContainer` + `linking` is only mounted inside the
`session ?` branch (`App.tsx:52-60`). A cold `puslespill://join?code=…` on a
logged-out device lands on `AuthScreen` and the code is **lost** — the most common
invite path (new user) drops the code.
**Fix:** capture the pending invite code before auth (persist to SecureStore via the
existing storage pattern), and after login route to the Venner tab with the code
prefilled; clear it once consumed. **Client-only.**
**Roles:** Frontend (impl), UX (post-login confirmation copy if any).

### 🟠 F4 — RPC error messages are hardcoded Norwegian

**Root cause:** `accept_invite` raises `'Ugyldig invitasjonskode'` /
`'Du kan ikke legge til deg selv'` (`phase1-friend-graph.md:92-93`), surfaced
verbatim via `error.message` in `handleRedeem` (`FriendsScreen:95`). English users
get Norwegian errors in an otherwise fully-bilingual app.
**Fix (client-only now):** map the known error signatures to `t()` keys
(`friends.errInvalidCode`, `friends.errSelfAdd`, generic fallback) in both locales.
**Backend follow-up (optional, DB-GATED):** re-raise with stable SQLSTATE/error
codes so the client maps by code, not by matching Norwegian text — document the SQL,
don't apply.
**Roles:** Frontend (mapping + i18n), Backend (document code-based SQL follow-up).

### 🟠 F5 — Invite-code fetch failure is invisible + unrecoverable

**Root cause:** `fetchData` ignores `codeRes.error` (`FriendsScreen:52-53`); on
failure the code shows `········` forever, Share stays disabled, no error, no retry
(the `fetchError` state only covers `fetchFriends`).
**Fix:** capture the code error and surface a small inline error + retry (or fold
into the existing error/retry state). **Client-only.**
**Roles:** Frontend, UX (error placement).

### 🟡 F6 — Hardcoded `#78716C` back chevron

**Root cause:** `FriendCollectionScreen:160` hardcodes `#78716C`, which CLAUDE.md
explicitly forbids (fails contrast on dark surfaces; back chevrons must read
`useColorScheme` from nativewind and pick a content token per scheme).
**Fix:** match the Settings/Profile chevron pattern. **Client-only.**
**Roles:** Frontend.

### 🟡 F7 — `fetchFriends` scopes only via RLS, not query

**Root cause:** `friends.ts:13-16` selects all `accepted` rows with no
`requester_id/addressee_id` filter, relying entirely on RLS. Works today but isn't
defense-in-depth.
**Fix:** add `.or("requester_id.eq(<uid>),addressee_id.eq(<uid>)")`. **Client-only.**
**Roles:** Backend (confirm filter matches policy), Frontend (impl + test).

### 🟡 F8 — No focus-effect cleanup guard

**Root cause:** `useFocusEffect` refetches with no `isActive`/cancel guard in
`FriendsScreen` and `FriendCollectionScreen` → possible `setState` after blur.
**Fix:** add an `isActive` flag (or AbortController) and bail on stale results.
**Client-only.**
**Roles:** Frontend.

### 🟡 F9 — Re-redeeming an existing friend reports success

**Root cause:** `accept_invite` does `on conflict do nothing` but always returns the
profile, so re-entering a current friend's code shows "Lagt til!"
(`FriendsScreen:101-106`).
**Fix (DB-GATED, optional):** `accept_invite` returns an `already_friends boolean`;
client shows a distinct "Dere er allerede venner" message. Backend documents the
SQL; frontend consumes it only once applied. If skipped this pass, leave a TODO.
**Roles:** Backend (SQL), Frontend (consume when available).

### 🟡 F10 — No tests for `friends.ts`

**Root cause:** the pure counterparty-resolution + sort logic has no coverage.
**Fix:** unit test in `src/utils/__tests__/friends.test.ts` (mock supabase like
`sessionImages.test.ts`), covering counterparty pick from either side, missing
profile → null, and locale sort. **Client-only.**
**Roles:** Frontend.

---

## Code review (post-implementation, 2026-07-08)

High-effort review of the F1–F10 diff surfaced 5 findings; all addressed:

1. **🔴 `App.tsx` — app could brick to a blank screen.** The F3 deep-link work
   added `if (session && !pendingResolved) return null` gated on an un-`catch`ed
   `getPendingInviteCode()`; a SecureStore read failure left it stuck. **Fixed** by
   removing the gate entirely — `AppContent` now renders `AuthScreen` *outside*
   `NavigationContainer`, so the container mounts fresh at login and `onReady` fires
   reliably; a pending code is routed to Venner via `navigationRef.navigate` there.
2. **🟠 `App.tsx` — hand-built partial `initialState`** (only the `Venner` tab, no
   index) risked a wrong/incomplete tab bar. **Fixed** by the same rewrite — replaced
   with imperative `navigate("Tabs", { screen: "Venner", params })` on `onReady`.
3. **🟠 `FriendsScreen` — transient code-fetch error hid a valid code.** **Fixed**:
   `fetchCode` keeps a known code (via `inviteCodeRef`) and only shows the F5 error
   when there is no cached code.
4. **🟡 `App.tsx` — unhandled `savePendingInviteCode` rejection.** **Fixed** with a
   `.catch(() => {})` in the capture closure.
5. **🟡 `FriendsScreen` — `removeFriend` re-ran the invite-code RPC.** **Fixed**:
   extracted `fetchFriendsList`; unfriend refetches friends only.

Gates after fixes: typecheck ✓ · lint 0 errors ✓ · prettier ✓ · 43 tests ✓.

---

## UX spec (owner: UX designer)

Design language: theme tokens only (`surface`/`content`/`accent`/`border`, light + dark),
per `wireframes/design-system.html`. Every interactive element below lists its
`accessibilityRole` + `accessibilityLabel` (and hint where non-obvious); destructive actions
get a confirm `Alert`. Tone matches the existing `friends.*` strings: friendly, concise,
informal `du/dere`. All new copy lands as keys under the `friends` namespace in **both**
`no.json` and `en.json` (key parity kept).

### F1 — Unfriend / remove friend

**Affordance — recommendation: overflow ("···") button on the friend row on `FriendsScreen`.**
It is the cleanest of the options because:

- It is discoverable and self-labelling (unlike a long-press, which is invisible to first-time
  and screen-reader users and has no a11y affordance), so it satisfies the CLAUDE.md a11y bar
  with a real `accessibilityRole="button"` + label.
- It keeps removal on the list itself, where the mental model is "manage my friends" — the user
  doesn't have to open the friend's collection to sever the relationship. (Putting it only in the
  `FriendCollectionScreen` header buries a privacy control one screen deep.)
- A permanent inline "Fjern" button on every row is too heavy and easy to fat-finger next to the
  row's own navigate-to-collection tap target.

The row keeps its existing full-width tap → open collection; add a trailing 44×44 `···`
(`ellipsis-horizontal`) touch target before/replacing the chevron. Tapping it opens a confirm
`Alert` directly (single destructive action — no intermediate action sheet needed). The row's
outer `accessibilityLabel` stays the friend's name; the `···` is a separate focusable button.

- `···` button: `accessibilityRole="button"`, `accessibilityLabel = t("friends.rowMenuA11y", { name })`
  (e.g. "Alternativer for Kari"), `accessibilityHint = t("friends.rowMenuHint")` ("Trykk for å fjerne venn").

**Confirm dialog** (destructive; two buttons — Avbryt (cancel) + Fjern (destructive)). Copy is
honest that friendship is mutual and removal cuts access **both ways**:

| Key                          | Norwegian                                                                                                                                                                                                    | English                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `friends.remove`             | Fjern venn                                                                                                                                                                                                   | Remove friend                                                                                                                                                                                                      |
| `friends.removeA11y`         | Fjern {{name}} som venn                                                                                                                                                                                      | Remove {{name}} as a friend                                                                                                                                                                                        |
| `friends.removeConfirmTitle` | Fjerne {{name}}?                                                                                                                                                                                             | Remove {{name}}?                                                                                                                                                                                                   |
| `friends.removeConfirmBody`  | Dere slutter å være venner. Ingen av dere ser lenger hverandres samling, økter eller feed – og {{name}} kan ikke lenger be om å låne av deg. Du kan legge til hverandre igjen senere med en invitasjonskode. | You'll no longer be friends. Neither of you will see the other's collection, sessions or feed anymore — and {{name}} can no longer ask to borrow from you. You can add each other again later with an invite code. |
| `friends.removeConfirmCta`   | Fjern                                                                                                                                                                                                        | Remove                                                                                                                                                                                                             |
| `friends.removed`            | {{name}} er fjernet                                                                                                                                                                                          | {{name}} removed                                                                                                                                                                                                   |

**Post-action feedback:** on success, refetch the list (the row disappears) and show a brief
confirmation `Alert` with title `friends.removed` (no body needed). On failure reuse the existing
`common.somethingWrong` title with the error message, and leave the row in place. Confirm-dialog
button order follows the app pattern: `{ text: common.cancel, style: "cancel" }` then
`{ text: friends.removeConfirmCta, style: "destructive" }`.

### F2 — Rotate invite code

**Affordance:** a small text button placed inside the "MIN INVITASJON" card, under the code row
(below the code + Del button), left-aligned, styled as a quiet/tertiary action (accent-colored
text, no filled background — subordinate to the primary "Del" button so rotation isn't done by
accident). Icon: `refresh-outline` at 16, accent token, `accessible={false}`.

- Rotate button: `accessibilityRole="button"`, `accessibilityLabel = t("friends.rotateA11y")`
  ("Lag ny invitasjonskode"), `accessibilityHint = t("friends.rotateHint")`
  ("Gammel kode slutter å virke"), `accessibilityState={{ disabled: !inviteCode || rotating }}`
  (disabled until the code has loaded and while a rotate is in flight).

Tapping opens a confirm `Alert` warning that previously shared links/codes stop working:

| Key                          | Norwegian                                                                                                      | English                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `friends.rotate`             | Lag ny kode                                                                                                    | Generate new code                                                                                                          |
| `friends.rotateA11y`         | Lag ny invitasjonskode                                                                                         | Generate a new invite code                                                                                                 |
| `friends.rotateHint`         | Gammel kode slutter å virke                                                                                    | The old code will stop working                                                                                             |
| `friends.rotateConfirmTitle` | Lage ny kode?                                                                                                  | Generate a new code?                                                                                                       |
| `friends.rotateConfirmBody`  | Den gamle koden og alle lenker du har delt slutter å virke med én gang. Venner du allerede har er ikke berørt. | Your old code and every link you've already shared will stop working immediately. Friends you already have are unaffected. |
| `friends.rotateConfirmCta`   | Lag ny kode                                                                                                    | Generate                                                                                                                   |
| `friends.rotated`            | Ny kode klar                                                                                                   | New code ready                                                                                                             |
| `friends.rotateFailed`       | Kunne ikke lage ny kode                                                                                        | Couldn't generate a new code                                                                                               |

**Feedback:** while rotating, show an inline `ActivityIndicator` in place of the code (reuse the
`········` slot) and disable Del + the rotate button. On success the new code renders in the same
slot and a brief `friends.rotated` `Alert` (no body) confirms it. On failure show a
`friends.rotateFailed` `Alert` and keep the old code visible. Button order: cancel then
`friends.rotateConfirmCta` (`style: "destructive"` — it invalidates shared links).

### F3 — Post-login invite landing

**Keep it minimal: prefilled field + a one-time inline hint banner above the "LEGG TIL VENN"
section — no toast.** When a logged-out user opens `puslespill://join?code=…`, signs in, and lands
on the Venner tab with the code prefilled (per F3 in the punch list), the prefilled input alone is
too silent — the user may not notice the field is already populated or understand why they're on
Venner. A small inline banner (accent-tinted surface, `bg-accent/10 dark:bg-accent-dark/10`,
rounded, above the add-friend card) explains it and points at the primed "Legg til" button. It
renders only when arriving via an invite link (i.e. `route.params?.code` was present) and
disappears once the code is redeemed or cleared. No separate dismiss control — it's informational
and self-clears.

- Banner is a static `View` with `accessibilityRole="text"` (or `accessible` + label) so a screen
  reader announces it: `accessibilityLabel = t("friends.inviteLandingBanner")`.

| Key                           | Norwegian                                          | English                                           |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| `friends.inviteLandingBanner` | Koden er klar – trykk «Legg til» for å bli venner. | Your code is ready — tap "Add" to become friends. |

### F5 — Invite-code fetch failure

**Surface:** an inline error state that replaces the code inside the "MIN INVITASJON" card (not a
blocking full-screen error — the rest of Venner still works). When `get_my_invite_code` errors,
the code slot shows a short "couldn't load your code" line in `content` token color, and the
**retry sits right there** as a small text/link button in the same card (mirrors the existing
`friends.loadError` + `common.retry` pattern used for the friends list, and the card-scoped error
pattern in the codebase). While the code is missing/errored, "Del" stays disabled (its existing
`disabled={!inviteCode}` already covers this) and the rotate button (F2) is disabled too.

- Retry button: `accessibilityRole="button"`, `accessibilityLabel = t("common.retry")` (reuse
  existing key), re-runs the code fetch.

| Key                     | Norwegian                   | English                  |
| ----------------------- | --------------------------- | ------------------------ |
| `friends.codeLoadError` | Kunne ikke laste koden din. | Couldn't load your code. |

(Retry label reuses the existing `common.retry` — no new key.)

### F6 — Back chevron

Adopt the app's existing **theme-aware chevron treatment** — do not introduce anything new. Match
the Settings/Profile pattern exactly: read `useColorScheme` from **`nativewind`** (app-controlled,
not `react-native`) and pick the content token per scheme
(`colorScheme === "dark" ? "#A8A29E" : "#78716C"`), replacing the hardcoded `#78716C` on
`FriendCollectionScreen`'s `chevron-back`. See `SettingsScreen.tsx` (`chevronColor` at lines
22–26, applied at the header chevron ~line 61). No new copy or a11y changes — the button already
has `accessibilityRole="button"` + `accessibilityLabel={t("common.back")}`.

### New i18n keys — summary

18 new keys under `friends.*` (each in both locales; `common.retry`, `common.cancel`,
`common.somethingWrong` reused):
`rowMenuA11y`, `rowMenuHint`, `remove`, `removeA11y`, `removeConfirmTitle`, `removeConfirmBody`,
`removeConfirmCta`, `removed`, `rotate`, `rotateA11y`, `rotateHint`, `rotateConfirmTitle`,
`rotateConfirmBody`, `rotateConfirmCta`, `rotated`, `rotateFailed`, `inviteLandingBanner`,
`codeLoadError`. (`removeConfirmCta`/`rotateConfirmCta` may collapse into `remove`/`rotate` if the
frontend prefers reusing the button label as the Alert CTA — see note.)

## Backend contract (owner: senior backend dev)

Verified strictly against the SQL in `docs/phase1-friend-graph.md` (the authoritative
schema). Where the live policy text is **not** shown in that doc, it is flagged
**needs live verification** rather than assumed. Project ref for `gen:types`:
`mzcppyhxikbkawmyrkrh`. Every **DB-GATED** block below is `create or replace`,
`security definer set search_path = public`, keeps the existing
`grant execute … to authenticated`, and **must be followed by `npm run gen:types`**.

### F1 — Unfriend (client-only, no SQL) ✅

The existing DELETE policy is sufficient. From `phase1-friend-graph.md:51-53`:

```sql
create policy "unfriend own" on friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));
```

This `USING` clause lets **either** participant delete the row, so a raw client
`.delete()` is permitted with no new SQL. The row's primary key is `id`
(`phase1-friend-graph.md:33`), and `fetchFriends` already returns it as
`friendshipId` (`src/utils/friends.ts:5,42`), so the frontend has the exact key.

**Exact client call** the frontend should use:

```ts
const { error } = await supabase.from("friendships").delete().eq("id", friendshipId); // friendshipId from Friend.friendshipId
if (error) throw error; // or surface via the F1 failure Alert
```

- No additional predicate is required — RLS enforces "must be a participant". A
  malicious `id` for a friendship the caller isn't part of simply matches 0 rows
  (RLS filters it out) and returns no error; that is acceptable (no-op).
- Optionally add `.eq("status", "accepted")` for symmetry with `fetchFriends`, but
  it is not needed for correctness or safety.
- **Do not** delete by `requester_id`/`addressee_id` match — deleting by the known
  `id` is unambiguous and avoids accidentally matching the mirrored pair.

**Verdict: client-only.** Ships without a dashboard step.

### F2 — Rotate invite code

The client-only path depends on the `profiles` self-UPDATE policy, whose **text is
not shown** in `phase1-friend-graph.md` — the policy matrix (`:152`) only asserts
`profiles … UPDATE = self`. Whether that policy permits updating the `invite_code`
column specifically (column-level grants / a `WITH CHECK` that constrains which
columns change) **cannot be determined from the doc**. → **needs live verification.**

**(a) Client-only sequence IF a self-UPDATE of `invite_code` is permitted:**

```ts
// 1. Null out the current code (self UPDATE on profiles)
const { error: clearErr } = await supabase
  .from("profiles")
  .update({ invite_code: null })
  .eq("id", user.id);
if (clearErr) throw clearErr;
// 2. Regenerate lazily — get_my_invite_code() creates a new code when null
const { data: newCode, error: rpcErr } = await supabase.rpc("get_my_invite_code");
if (rpcErr) throw rpcErr;
setInviteCode(newCode);
```

Caveat even if permitted: this is **two round-trips and not atomic** — a failure
between step 1 and step 2 leaves the user with a null code until the next
`get_my_invite_code` call (self-healing on next focus, but a visible gap), and it
relies on the client having column-UPDATE rights it may not have.

**(b) DB-GATED fallback RPC (robust, atomic) — RECOMMENDED:**

> **DB-GATED — apply in Supabase dashboard, then run `npm run gen:types`.**

```sql
-- Rotate the caller's invite code atomically. Mirrors the collision-retry loop
-- in get_my_invite_code, but always regenerates (ignores any existing code).
create or replace function regenerate_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  loop
    begin
      code := gen_invite_code();
      update profiles set invite_code = code where id = auth.uid();
      return code;                 -- success: new unique code committed
    exception when unique_violation then
      -- collision with another user's code, retry with a fresh code
    end;
  end loop;
end;
$$;

grant execute on function regenerate_invite_code() to authenticated;
```

**Exact client call for path (b):**

```ts
const { data: newCode, error } = await supabase.rpc("regenerate_invite_code");
if (error) throw error;
setInviteCode(newCode);
```

**Recommendation: ship path (b), the `regenerate_invite_code()` RPC.** It is
atomic (single statement server-side), one round-trip, and — critically — does **not
depend on the unverified column-level UPDATE grant** on `profiles.invite_code`. It
reuses `gen_invite_code()` and the exact collision-retry pattern already proven in
`get_my_invite_code`, and runs `security definer` so it works regardless of the
`profiles` UPDATE policy. Path (a) is only worth using if Ruben confirms the live
self-UPDATE policy allows nulling `invite_code` **and** wants to avoid the dashboard
step; given F4/F9 already require a paste, bundling this RPC in the same session is
low marginal cost.

### F4 — Error i18n (two tiers)

**Tier 1 — client-only NOW (match on the exact Norwegian strings).** From
`phase1-friend-graph.md:92-93`, `accept_invite` currently raises these two
`error.message` values verbatim:

| Condition          | Exact `error.message` today      | Suggested i18n key                             |
| ------------------ | -------------------------------- | ---------------------------------------------- |
| Code not found     | `Ugyldig invitasjonskode`        | `friends.errInvalidCode`                       |
| Redeeming own code | `Du kan ikke legge til deg selv` | `friends.errSelfAdd`                           |
| Anything else      | (varies)                         | `friends.errGeneric` / `common.somethingWrong` |

Mapping contract for `handleRedeem` (`FriendsScreen.tsx:94-97`) until Tier 2 ships:

```ts
function mapAcceptInviteError(message: string): string {
  if (message === "Ugyldig invitasjonskode") return t("friends.errInvalidCode");
  if (message === "Du kan ikke legge til deg selv") return t("friends.errSelfAdd");
  return t("friends.errGeneric"); // or t("common.somethingWrong")
}
```

Match on **exact equality** with these literals — they are the only two messages the
current function raises. This is brittle (breaks if the Norwegian copy changes),
which is why Tier 2 exists.

**Tier 2 — DB-GATED (raise stable machine-readable tokens).** Rewrite so the client
keys off a stable token instead of Norwegian text. The combined function under **F9
below already includes this Tier-2 rewrite** — do not paste a separate Tier-2-only
version. The tokens the client keys off:

| Condition          | Raised as                                                           | Client detects via                 |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------- |
| Code not found     | `raise exception using errcode = 'P0001', message = 'invalid_code'` | `error.message === "invalid_code"` |
| Redeeming own code | `raise exception using errcode = 'P0001', message = 'self_add'`     | `error.message === "self_add"`     |

`errcode 'P0001'` is Postgres' generic `raise_exception`; PostgREST surfaces the
`message` (`invalid_code` / `self_add`) as `error.message`. The client then maps the
**token** → i18n key, never Norwegian text:

```ts
const TOKEN_TO_KEY: Record<string, string> = {
  invalid_code: "friends.errInvalidCode",
  self_add: "friends.errSelfAdd",
};
const key = TOKEN_TO_KEY[error.message] ?? "friends.errGeneric";
```

**Recommendation:** ship Tier 1 immediately (client-only), and adopt the Tier-2
tokens the moment the combined `accept_invite` below is pasted. Once Tier 2 is live,
the client should prefer the token map and can drop the Norwegian-literal branch.

### F7 — Query scoping (client-only) ✅

RLS predicate on `friendships` SELECT (`phase1-friend-graph.md:47-49`) is
`auth.uid() in (requester_id, addressee_id)`. The equivalent additive PostgREST
filter for `fetchFriends` (`src/utils/friends.ts:13-16`):

```ts
const { data: rows, error } = await supabase
  .from("friendships")
  .select("id, requester_id, addressee_id")
  .eq("status", "accepted")
  .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
```

Exact filter string:

```
requester_id.eq.<uid>,addressee_id.eq.<uid>
```

(PostgREST `.or()` syntax is `column.op.value` with **dots**, comma-separated — note
`.eq.` not `.eq(`.) `userId` is the caller's own `auth.uid()` (already passed into
`fetchFriends`), so no user-controlled input is interpolated.

**This is purely additive defense-in-depth — RLS still enforces.** The `.or(...)`
only narrows the client query; the `"see own friendships"` policy independently
guarantees a caller can never read a row it isn't part of, even if the filter were
removed or wrong. **Verdict: client-only.**

### F9 — `already_friends` + combined `accept_invite` (DB-GATED)

`accept_invite` currently does `insert … on conflict do nothing` then unconditionally
returns the owner profile (`phase1-friend-graph.md:95-100`), so re-redeeming an
existing friend's code still returns a row and the client shows "Lagt til!". Fix:
detect the no-op insert and return an extra `already_friends boolean`, **preserving
the existing return columns** (`friend_id`, `full_name`, `avatar_url`) so the current
client keeps compiling; the new column is additive.

Because F4 Tier 2 and F9 both rewrite the same function, here is **ONE combined
`accept_invite`** doing both stable error tokens **and** `already_friends` — Ruben
pastes once.

> **DB-GATED — apply in Supabase dashboard, then run `npm run gen:types`.**

```sql
-- Combined: F4 tier-2 (machine-readable error tokens) + F9 (already_friends flag).
-- Existing return columns preserved; already_friends appended (additive).
create or replace function accept_invite(p_code text)
returns table (
  friend_id      uuid,
  full_name      text,
  avatar_url     text,
  already_friends boolean
)
language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_existed boolean;
begin
  select id into v_owner from profiles where invite_code = upper(btrim(p_code));
  if v_owner is null then
    raise exception using errcode = 'P0001', message = 'invalid_code';
  end if;
  if v_owner = auth.uid() then
    raise exception using errcode = 'P0001', message = 'self_add';
  end if;

  -- Were they already friends? Check the unordered pair (either direction).
  select exists (
    select 1 from friendships f
    where least(f.requester_id, f.addressee_id) = least(v_owner, auth.uid())
      and greatest(f.requester_id, f.addressee_id) = greatest(v_owner, auth.uid())
  ) into v_existed;

  if not v_existed then
    insert into friendships (requester_id, addressee_id, status)
    values (v_owner, auth.uid(), 'accepted')
    on conflict do nothing;  -- belt-and-suspenders against a race
  end if;

  return query
    select p.id, p.full_name, p.avatar_url, v_existed
    from profiles p where p.id = v_owner;
end;
$$;

grant execute on function accept_invite(text) to authenticated;
```

Notes:

- The pre-check mirrors the `friendships_pair_uidx` expression
  (`least(...)/greatest(...)`, `phase1-friend-graph.md:42-43`), so it correctly treats
  `(A,B)` and `(B,A)` as the same pair regardless of who redeemed whom.
- Return columns `friend_id, full_name, avatar_url` are byte-for-byte the current
  contract, so the existing `handleRedeem` (`FriendsScreen.tsx:99-106`) keeps working
  before the client is updated; `already_friends` is a new trailing field the client
  opts into.
- **Client consumption once applied:**

```ts
const friend = data?.[0];
if (friend?.already_friends) {
  Alert.alert(t("friends.alreadyFriendsTitle")); // "Dere er allerede venner"
} else {
  /* existing added / addedNamed / addedUnnamed flow */
}
```

- Error handling with Tier-2 tokens is the F4 `TOKEN_TO_KEY` map above.

### What Ruben must paste (if anything)

**Client-only wins (no dashboard step — frontend ships these directly):**

- **F1** unfriend — raw `supabase.from("friendships").delete().eq("id", friendshipId)`.
- **F4 Tier 1** — map the two exact Norwegian strings to i18n keys.
- **F7** — add `.or("requester_id.eq.<uid>,addressee_id.eq.<uid>")` to `fetchFriends`.

**DB-GATED — paste in Supabase dashboard, then `npm run gen:types` (ref `mzcppyhxikbkawmyrkrh`):**

1. **F2** — `regenerate_invite_code()` RPC (**recommended** rotate path; avoids the
   unverified `profiles.invite_code` column-UPDATE grant).
2. **F4 Tier 2 + F9 (single combined `accept_invite`)** — stable error tokens
   (`invalid_code` / `self_add`) **and** the `already_friends boolean` return column,
   in one `create or replace`. Paste once.

**Needs live verification (cannot be confirmed from the doc):**

- The exact `profiles` self-UPDATE policy text — specifically whether it permits a
  self-UPDATE of `invite_code` to `null`. This only matters if Ruben prefers F2 path
  (a); path (b) sidesteps it entirely. If he wants (a), check Dashboard → Auth →
  Policies on `profiles` for the UPDATE policy's `USING`/`WITH CHECK`.

## Frontend implementation notes (owner: senior frontend dev)

All ten items implemented on `feat/friends-hardening`. Per-file summary:

**`src/screens/FriendsScreen.tsx`** — the bulk of the work.

- **F1 (unfriend):** each friend row split into a `View` wrapping the tap-to-collection
  `TouchableOpacity` plus a trailing 44×44 `ellipsis-horizontal` overflow button
  (`friends.rowMenuA11y`/`rowMenuHint`). Tap → `confirmRemove` destructive `Alert`
  (`removeConfirmTitle`/`removeConfirmBody`, cancel-then-`removeConfirmCta`) →
  `supabase.from("friendships").delete().eq("id", friendshipId)` → refetch → brief
  `friends.removed` confirmation. Row's a11y label stays the friend's name.
- **F2 (rotate):** quiet accent `refresh-outline` text button under the code row in the
  MIN INVITASJON card; disabled until the code has loaded and while rotating. Destructive
  confirm (`rotateConfirmTitle`/`Body`) → `supabase.rpc("regenerate_invite_code")` (the
  recommended path-b RPC, now typed). Inline `ActivityIndicator` replaces the code slot
  while rotating; Del + rotate disabled during. Success → `friends.rotated`; failure →
  `friends.rotateFailed`, old code kept.
- **F3 (invite banner + consume):** effect keyed on `route.params?.code` prefills the
  input (uppercased), sets `fromInviteLink`, and calls `clearPendingInviteCode()`. A
  one-time accent-tinted banner (`bg-accent/10`, `accessibilityRole="text"`,
  `friends.inviteLandingBanner`) renders above the LEGG TIL VENN header while
  `fromInviteLink`; cleared on redeem.
- **F4 (error i18n):** `TOKEN_TO_KEY` maps the stable tokens `invalid_code`/`self_add`
  (primary) to `friends.errInvalidCode`/`errSelfAdd`, keeps the two Norwegian literals as
  belt-and-suspenders fallback, and defaults to `friends.errGeneric`. `handleRedeem` now
  alerts `t(TOKEN_TO_KEY[error.message] ?? "friends.errGeneric")`.
- **F5 (code-fetch error):** split `fetchCode` out of `fetchData`; on error sets
  `codeError`, and the card shows `friends.codeLoadError` + a card-scoped `common.retry`
  link that re-runs `fetchCode`. Del + rotate stay disabled while errored.
- **F8 (focus guard):** `fetchData`/`fetchCode` take an `isActive` predicate;
  `useFocusEffect` flips a local `active` flag on cleanup so no `setState` fires after blur.
- **F9 (already_friends):** `handleRedeem` reads `friend.already_friends` and shows
  `friends.alreadyFriendsTitle` ("Dere er allerede venner") instead of the added flow.

**`src/utils/friends.ts`** — **F7:** added
`.or("requester_id.eq.${userId},addressee_id.eq.${userId}")` to the `friendships` query
(additive defense-in-depth; RLS still enforces). Counterparty/sort logic unchanged.

**`src/screens/FriendCollectionScreen.tsx`** — **F6:** back chevron now reads
`useColorScheme` from `nativewind` and picks `#A8A29E` (dark) / `#78716C` (light) via
`chevronColor`, matching `SettingsScreen`. **F8:** `fetchItems` takes an `isActive`
predicate and `useFocusEffect` bails on stale results (retry buttons use the default
always-active predicate).

**`App.tsx`** — **F3:** while unauthenticated, a `Linking.getInitialURL()` +
`addEventListener("url")` effect parses `?code=` and persists it to SecureStore. Once a
session exists, a second effect reads the pending code once (gated by `pendingResolved`
before mounting the navigator), and `NavigationContainer` gets an `initialState` that
lands on the Venner tab with the code prefilled. The warm (already-logged-in) case is
still handled by the existing React Navigation `linking` config.

**`src/utils/pendingInvite.ts`** (new) — `parseInviteCode(url)` (regex extract, uppercased),
`savePendingInviteCode` / `getPendingInviteCode` / `clearPendingInviteCode` over
`expo-secure-store` (codes are < 2048 bytes, so no chunking).

**`src/utils/__tests__/friends.test.ts`** (new) — **F10:** four `fetchFriends` cases
(counterparty from requester side, from addressee side, missing profile → null
name/avatar, nb locale sort with æ/ø/å last), supabase mocked in the `sessionImages.test.ts`
style (thenable query chains).

**`src/locales/{no,en}.json`** — 22 new `friends.*` keys added to both locales at full
parity (error keys `errInvalidCode`/`errSelfAdd`/`errGeneric` from the F4 contract plus the
18 UX-spec keys and `alreadyFriendsTitle`). `common.retry`/`cancel`/`somethingWrong`
reused.

**Final gate status:** `npm run typecheck` ✅ · `npm run lint` ✅ (0 errors, 10 warnings —
all pre-existing `set-state-in-effect`/cascading-render warnings, incl. the route-param
prefill effect that already existed) · `npm run format:check` ✅ · `npm test` ✅ (9 suites,
43 tests). friends i18n keys: 43 no / 43 en (parity confirmed).

---

## Acceptance criteria

- [ ] F1 unfriend works end-to-end (confirm → removed → list updates); a11y-complete.
- [ ] F2 rotate produces a new code, invalidates the old, warns the user; no crash on collision.
- [ ] F3 logged-out invite link → sign in → lands on Venner with code prefilled.
- [ ] F4 invalid-code and self-add errors render in the active language.
- [ ] F5 code-fetch failure shows an error + retry, not silent dots.
- [ ] F6 chevron legible in light + dark.
- [ ] F7 `fetchFriends` filters by user id in the query.
- [ ] F8 no setState-after-blur warnings on rapid navigate-away.
- [ ] F9 handled or explicitly deferred with a TODO.
- [ ] F10 `friends.test.ts` green.
- [ ] `npm run typecheck && npm run lint && npm run format:check && npm test` all green.
- [ ] All new strings in **both** `no.json` and `en.json` (key parity kept).
- [ ] Code-review pass (`/code-review`) after implementation.
