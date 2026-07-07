# Next up — Social Feed v1 (agentic-team prompt)

**Created:** 2026-07-07 · **Owner:** @rubenough
**Status:** queued — not started. Run in a fresh session with an agent team.

## Why

From the 2026-07-06 product review: the app _tracks_ sharing well but doesn't
_feel_ social. The highest-leverage, mostly no-DB batch is a photo-first,
tappable feed plus friends' active sessions and a working deep-link invite.
See `docs/PROJECT-PLAN.md` (Phase 3.3 feed depth) for the surrounding roadmap.

## Branch state to know before starting

- `feat/bottom-sheet` holds the shared `BottomSheet` refactor (drag/keyboard/
  scroll) + `+`-menu hardening. Commit `2b336b2`. **Not merged to `main` yet.**
- The prompt below tells the team to branch from a clean `main`. Before running,
  either land `feat/bottom-sheet` to `main` first, **or** change the branch line
  to cut `feat/social-feed-v1` from the current state so it builds on the
  BottomSheet work. Decide based on whether the sheet work is verified on-device.

## The prompt

Paste into a fresh session (or hand to a lead orchestrator agent):

```
You are the LEAD orchestrator for a small agent team implementing the first
"social feed" upgrade to puslespill-appen. Work in
/Users/rubenvareide/git/puslespill-appen (it's its own git repo — cd into it).

## Ground rules (read before dispatching anyone)
1. BRANCH ISOLATION — the whole point is to test on the simulator before merge:
   - Confirm the repo is clean, on `main`, then create and switch to a NEW branch:
     `git checkout -b feat/social-feed-v1`
   - NEVER commit to `main`. NEVER merge. NEVER `git push` unless I explicitly ask.
   - Commit each agent's work to this branch in small, labeled commits so I can
     bisect on-device.
2. Read CLAUDE.md, docs/PROJECT-PLAN.md, and wireframes/design-system.html first,
   and obey the project conventions exactly:
   - Every user-facing string is an i18n key added to BOTH src/locales/no.json
     AND en.json (no.json is source of truth, keep full key parity). Never
     hardcode Norwegian.
   - No hardcoded hex — use the theme tokens (surface/border/content/accent) and
     dark: variants. Follow the WCAG-AA a11y prop patterns already in the code
     (accessibilityRole/Label/Hint/State on every touchable).
   - Signed image URLs go through utils/sessionImages.ts (getSignedUrls) — never
     call supabase.storage inline. Sign at fetch time into state.
   - PRIVACY IS NON-NEGOTIABLE: never surface borrower identity to anyone but the
     owner; keep loans owner-only; feed reads stay friend-scoped via RLS.
   - Functions/vars/types in English; comments may be Norwegian.
3. NO agent may apply schema changes to the hosted Supabase. Anything needing a
   DB change must instead output ready-to-run SQL + a note that I apply it in the
   Supabase dashboard and then run `npm run gen:types`. Keep those items OUT of
   the simulator-testable batch (see Phase 2).
4. Shared-file discipline: FeedScreen.tsx is touched by multiple tasks. Do NOT
   run those agents in parallel on the same file — sequence them and re-read the
   file between edits to avoid clobbering.

## Phase 1 — ship to the branch, fully testable on the simulator (NO DB changes)
Dispatch these as focused subagents, but SEQUENCE the two that both edit
FeedScreen.tsx / FeedCard.tsx:

A. Photo-first, tappable feed
   - In FeedCard.tsx: render the session's latest progress photo (signed URL)
     instead of the grey category icon for "started"/"completed"/where an image
     exists; fall back to the icon when there's no photo.
   - Make feed cards tappable: session events → navigate to SessionDetail;
     "added" → CollectionDetail. Add the a11y hint for the tap.
   - Thread the signed image URL through fetchFeedItems (reuse getSignedUrls,
     batch it) into FeedCard.
   - Add pull-to-refresh (RefreshControl) to the FeedScreen ScrollView, matching
     CollectionsScreen's pattern.
   - While in this file, clean up the flagged debt: replace array-index `key`s
     with stable ids and remove the `as any` casts where feasible.

B. Friends' active sessions in the strip (run AFTER A, re-read FeedScreen first)
   - Drop the `.eq("created_by", user.id)` filter on the active-sessions query so
     the strip shows self + friends (RLS already scopes to friends).
   - Add an owner avatar/name to ActiveSessionCard so it reads as "whose puzzle."
     Keep `isOwn` styling for the user's own cards.

C. Deep-link invite (independent files — can run in parallel with A)
   - Implement `puslespill://join?code=…` handling with expo-linking so a shared
     invite auto-opens FriendsScreen and prefills the code (resolve the TODO at
     FriendsScreen.tsx:62; include the link in the Share message).
   - NOTE in your summary that this needs app.json scheme config + a dev-client
     rebuild; flag exactly what I must rebuild.

## Phase 2 — prepare but DO NOT block Phase 1 (needs my DB step)
Produce a short spec + SQL for each; implement only the client code that can
compile without the schema (guarded/feature-flagged), and clearly mark it
"pending gen:types":
D. Reactions — `session_reactions` (session_id, user_id, emoji) + friend-scoped
   RLS; a tap-to-react row on feed session cards. Output the SQL + RLS policy.
E. Item cover images — `items.cover_url` + reuse the image pipeline; render on
   Collections rows and item-added feed cards. Output the SQL.

## Integration & handoff (you, the lead)
- After each agent, run the full quality gate from the repo root and fix any
  failures before the next commit:
  `npm run typecheck && npm run lint && npm run format:check && npm test`
- Commit Phase 1 work in logical chunks on feat/social-feed-v1.
- Do NOT merge or push. When done, report:
  1. What landed on the branch (per commit) and what's Phase-2/pending-DB.
  2. Exact SQL I need to paste into the Supabase dashboard, and the
     `npm run gen:types` step, for the Phase-2 items.
  3. How to run it on the simulator now:
     `npx expo start --ios` (or `--localhost` for the iOS simulator), plus any
     dev-client rebuild the deep-link needs.
  4. A quick manual test checklist per feature so I can verify on-device before
     I merge to main myself.

Start by confirming the clean/main state and creating the branch, then give me
your dispatch plan before spawning the agents.
```
