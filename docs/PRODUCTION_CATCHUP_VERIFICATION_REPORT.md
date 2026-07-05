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
DONE (resolved). The earlier `401 Invalid API key` was a stale/wrong value in `.env.local` — this
session's shell environment had a valid `SUPABASE_SERVICE_ROLE_KEY` supplied directly (never
echoed/logged; used only implicitly via env). Sanity-checked first with a status-only admin API
call (`GET /auth/v1/admin/users?page=1&per_page=1` → `200`) before running anything else.

`DEPLOY_BASE_URL=https://200magicwordsapp.com node --env-file=.env.local scripts/idor-proof.mjs`:
**9/9 checks pass**, including the two live-endpoint checks that could only skip before (no valid
key / no `DEPLOY_BASE_URL` in the earlier local runs):
- `create-portal-session`: unauthenticated request rejected (401); A's own verified token accepted
  (not 401).
- `session-generator`: A cannot generate a session plan for B's child by forging `childId` (403).
- All 6 direct-table/RPC checks (word_progress by child_id/user_id, child_profiles, earn_sparks
  cross-user and oversized-amount) also passed against the live project. Test users provisioned
  and cleaned up by the script itself.

## PLAYWRIGHT (FULL SUITE, LIVE KEY)
DONE. `npx playwright test`: **4/4 pass** (previously 2/4 pass + 2 skip — the two skips were
`no-emoji-live.spec.js` and the sign-in smoke test, both gated on `!confirmedUser?.id`, which
needs the admin key). No code changes — same suite, now with a valid key in the environment.

## PRODUCTION WALK (FRESH TEST ACCOUNT)
DONE. Full walk-through recorded in `docs/WORDART_HYBRID_REPORT.md`'s new **PRODUCTION
VERIFICATION** section (this session added it there since it's a WordArt/Nova-verb-focused walk,
matching that report's existing VERIFICATION section's shape). Summary: created a fresh test
account + child via the real onboarding flow (not seeded), fast-forwarded through Units 1–2 via
`scripts/admin-user.mjs seed-progress` (extended in this session's earlier work) to reach Unit 3's
Nova verb set, then verified live — Word Match on `eat` and `jump` (both legible, no distractor
collisions), Draw It on both words (correct Nova pose reference above the canvas), and a full
8-question Fill the Story session end to end. No console errors. Whole-screen checks throughout
(Home, Play guided path, Word Galaxy map). Test account and its data deleted after
(`admin-user.mjs delete`, `status: 200`).

One real gap surfaced and worked around, not a product bug: the curriculum's actual Unit 1–2 word
count in the live `words` table is 20 words, not the 16 a stale hardcoded reference elsewhere in
this codebase's docs/comments would suggest — confirmed by querying the table directly rather than
trusting an old in-repo constant. Worth remembering next time any script assumes unit sizes.

## PRODUCTION VERIFICATION SECTION APPENDED TO WORDART_HYBRID_REPORT.md
DONE. See that file's new **PRODUCTION VERIFICATION** section for the full write-up.

## HOUSEKEEPING
DONE. Deleted the dead `SUPABASE_SERVICE_ROLE_KEY` line from `.env.local` — it was a stale/wrong
value that 401s against the real admin API and only invites confusion about which key is actually
in effect (the working key must come from the shell environment, per `idor-proof.mjs`'s own header
comment and `tests/smoke.spec.js`'s comment). `.env.local` is untracked, so this is a local-only
change with no commit.

## FINAL STATE
All gates green against production on commit `cf654dd`: `npm run build`, `npx playwright test`
(4/4), `node scripts/idor-proof.mjs` with `DEPLOY_BASE_URL` set (9/9). Production walk completed
and verified live with a fresh, since-deleted test account. No blockers remain from this pass.
