# FEAT_QUICK_WINS_R2 — resume & finish (Package E)

## Context
`feat/quick-wins` is parked mid-Phase-2. Its top commit is WIP: streak-freeze token + sleeping-stars **partial**. It is **88 commits behind `origin/main`**, **conflicts** with main (`src/CandyGalaxyShell.jsx` changed in both), and carries two DB migrations (`0037_streak_freeze_grant_tracking.sql`, `0038_streak_freeze_events.sql`) whose numbers likely now collide with what is already applied to production. Do NOT push or db-push anything until the approval stops below.

## Goal
Finish Package E (streak-freeze token + sleeping-stars) to production quality on top of current `main`, honestly green, with correctly-numbered migrations — and stop for approval before touching prod.

## Standing rules (do not skip)
- Before EVERY Playwright/DB command: `set -a; source .env.local; set +a`.
- Migration numbering: read `supabase/migrations/MIGRATIONS.md` FRESH. The next number follows what is **applied to production**, not what's merged. Note `0039` is reserved for `story_fallback` — do not take it. Renumber the two streak-freeze migrations to the correct next free numbers and update any references.
- New `product_events` types need the DB **CHECK constraint** AND the `api/track.js` **allowlist** in the SAME change, with a positive-landing test. This branch touches `api/track.js` — verify both halves are present and tested.
- Fidelity walls (child screens): no error diffs, no autocorrect/auto-capitalization, identical neutral feedback right vs wrong on measurement, letter names/sounds never spoken.
- Census discipline: measure real counts; never recall them.
- Deploy/verify via GitHub commit-status API + curl. NEVER the Vercel MCP connector (wrong account).

## Phases
- **Phase 0 — recon:** re-run the recon the WIP commit asked for (`streak_freeze_count` current state in prod schema). Diff `feat/quick-wins` against current `main`; list conflicts and every migration-number collision. Report before doing anything.
- **Phase 1 — reconcile onto main:** rebase or merge current `origin/main` into the work, resolve all conflicts (`CandyGalaxyShell.jsx` and any others). Renumber `0037/0038` migrations to the correct applied-production sequence.
- **Phase 2 — finish the feature:** complete the parked streak-freeze token (grant/accrual/indicator) and the sleeping-stars piece. Wire telemetry with CHECK constraint + `api/track.js` allowlist + positive-landing test in one change.
- **Phase 3 — gates & tests:** full Playwright suite green, `streak-freeze.spec.js` green, idor-proof green, build/no-emoji/wordart-sync green. Report real before/after census.
- **Phase 4 — APPROVAL STOP #1 (code):** diff stat, census, gate results, list of files + renumbered migrations. Do NOT push. Wait for Sal.
- **Phase 5 — APPROVAL STOP #2 (database):** only after Sal approves the code, present the exact `supabase db push` plan (which migrations, applied-prod numbering confirmed). Do NOT run it until Sal says go.

## Definition of done
Feature complete on top of current main, no conflicts, migrations correctly numbered, telemetry constraint+allowlist+test together, suite honestly green, FINAL STATUS with proof triplet. Two separate approval gates: code push, then DB push.
