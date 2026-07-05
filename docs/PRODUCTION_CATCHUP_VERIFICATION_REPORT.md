# Production Catch-Up + Verification Run

## PRE-PUSH FIXES
DONE. Branch `fix/pre-push-catchup`, merged to main locally (`cf654dd`).
- `docs/200MW_Master_Project_Doc_v3.md` repair-sequence item 2 ("Audio consolidation") updated
  from "(NEXT)" to "*Status: DONE (merged).*", matching items 1 and 3's style. One line only.
- `scripts/admin-user.mjs`: no committed word_progress seeding path existed before this (the
  RLS gap in `WORDART_HYBRID_REPORT.md` VERIFICATION was hit via ad-hoc manual writes, not a
  script). Added a `seed-progress <userId> <childId> <word> <mastery>` command that always sets
  `user_id` in the insert body, so this gap can't resurface for future scripted seeding.
  Script-level fix only — RLS policies untouched.

## PUSH TO ORIGIN
DONE. Pre-push gates run first: `npm run build` (clean), `npm run check:no-emoji` (clean, "all
exemptions mechanically verified unreachable"), `npm run check:wordart-sync` (77 words agree).
`npx playwright test`: 2/4 pass, 2 skip (`no-emoji-live.spec.js`, sign-in smoke test) — see
IDOR-PROOF section below, same root cause (invalid `SUPABASE_SERVICE_ROLE_KEY`).

Pushed `2ac713b..cf654dd` to `origin/main` (18 commits: the prior WordArt/housekeeping work plus
this session's two pre-push fixes). Confirmed the Vercel deployment for commit `cf654dd` via
GitHub's commit-status API (`gh api repos/.../commits/cf654dd/status`):
`"state":"success"`, `"description":"Deployment has completed"`, project
`brillianceunleashed92-6054s-projects/magic-words`. (The Vercel MCP connector is authenticated to
a different Vercel account/team than the one hosting this project, so `list_projects`/
`list_deployments` didn't find it — used the GitHub deployment status check plus a direct
`curl -sI https://200magicwordsapp.com` (200, fresh `age: 0`, `server: Vercel`) as corroborating
evidence instead.) Production is READY on the new commit.

## IDOR-PROOF (LIVE)
BLOCKED. `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` returns `401 Invalid API key` when hit
directly against the Supabase admin API (`GET /auth/v1/admin/users`) — network access itself
works (got a real Supabase error response, not a connection failure), the key value is just
stale/wrong. This is consistent with `idor-proof.mjs`'s own header comment ("also needs
SUPABASE_SERVICE_ROLE_KEY in the environment — not in .env.local") and `tests/smoke.spec.js`'s
comment ("in the environment, not committed") — the working key is deliberately meant to come
from the shell environment, not this file, and no valid key is present in this session's
environment (checked `env`, macOS keychain `security find-generic-password` — not found).
Confirmed via full Playwright run: `no-emoji-live.spec.js` and the sign-in smoke test both
`test.skip` on `!confirmedUser?.id`, exactly the symptom of a rejected admin-API call.
**Needs the user to supply a valid `SUPABASE_SERVICE_ROLE_KEY` in the shell env before
`idor-proof.mjs` or `admin-user.mjs` can run against production.**

## PRODUCTION WALK (FRESH TEST ACCOUNT)
BLOCKED — same root cause as above. `scripts/admin-user.mjs create` needs the same
`SUPABASE_SERVICE_ROLE_KEY` to provision the test account.

## PRODUCTION VERIFICATION SECTION APPENDED TO WORDART_HYBRID_REPORT.md
IN PROGRESS.
