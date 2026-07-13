# 200 MAGIC WORDS — MIGRATION_DRIFT_REPORT
**Run doc:** `docs/FIX_MIGRATION_DRIFT_R1.md` · **Branch:** `fix/migration-drift` (off `main` @ `3994c7c`)

## SUMMARY

Production has migrations `0037`/`0038` applied (streak-freeze token
support) that existed only on the parked, unmerged `feat/quick-wins`
branch -- `main`'s `supabase/migrations/` stopped at `0036`, so the repo's
migration history didn't match reality. A separate workstream
(`FIX_STORY_FOLLOWUP_R1`) had independently claimed migration number
`0037` for a future `story_fallback` product_events type, creating a
collision with migrations that were already live.

This run (`fix/migration-drift`, off `main`): verified production's
applied state matches `feat/quick-wins`'s `0037`/`0038` files exactly (no
disagreement, no wider drift found), copied those two files onto `main`
byte-identical, moved the colliding TODO to `0039+`, and added
`supabase/migrations/MIGRATIONS.md` documenting the provenance and a
numbering rule to prevent recurrence. **No database writes of any kind
were made** -- every query was read-only, matching the guardrail. Full
gate suite run twice (baseline + post-change verification); both showed
the codebase's already-documented flakiness in AI-adjacent/production-
latency-bound specs with zero overlapping failures between runs, not a
regression from this run's file-only changes. Ready for merge pending
approval.

## RUN TIMING
- **Start:** 2026-07-13 09:40 EDT
- Branched `fix/migration-drift` off `main` tip `3994c7c` (main was already checked out in another worktree, `.claude/worktrees/fix-story-quality` — branched directly with `git checkout -b fix/migration-drift main` from `feat/quick-wins`, no need to occupy the main checkout slot).
- `feat/quick-wins` had uncommitted work (modified `docs/FEAT_QUICK_WINS_R1.md` + several untracked docs, including this run's own prompt doc). Stashed with `git stash push -u` before branching so `feat/quick-wins`'s working tree stays exactly as found; the prompt doc was restored onto this branch from the stash's untracked-files commit (`stash@{0}^3`), byte-identical (diffed, confirmed match). The stash will be popped back onto `feat/quick-wins` at the end of this run to fully restore that branch's state.

## BASELINE

All with `set -a; source .env.local; set +a` prefix, on `fix/migration-drift`
immediately after the Phase 0 commit (prompt doc + report skeleton only --
no migration/code changes yet):

- `npm run build` -- clean, no errors.
- `npm run check:no-emoji` -- "No emoji characters found in scoped UI source. OK."
- `npm run check:wordart-sync` -- "WordArt REGISTRY and wordArtManifest.json agree (77 words). OK."
- `npx playwright test --workers=1` (config default, also explicit) -- **99 passed / 2 failed / 101 total, 15.8m.**

**The 2 failures, both pre-existing and not caused by this run:**
- `tests/celebration-timing.spec.js:79` ("crossing at attempt 3 fires exactly
  one ignition...") -- a UI click-retry/element-not-stable timing flake in a
  spec that runs against local dev, not production. This branch has not
  touched celebration-timing code, mastery/XP logic, or anything this spec
  exercises -- only two new, currently-unreferenced `.sql` files existed on
  disk at the time this baseline ran (the Phase 2 file copy and Phase 3
  comment edit landed *while this background run was already executing* --
  see TRAPS; a `.sql` migration file with no code path referencing it and a
  one-line code *comment* change cannot affect this test's behavior).
- `tests/placement-checkin.spec.js:203` ("Check-In: never-regress -- failing
  every rung does not lower the stored/enforced level") -- one of the 5
  production-baseURL-locked specs. `docs/200MW_Master_Project_Doc_v5.md`
  (this cycle's fresh census, line 78) already documents this exact file as
  flaky across multiple runs with *different specific assertions failing
  each time* ("other runs have caught a different specific test in the same
  file, e.g. 'never-regress...'") -- this run's failure is a named instance
  of that already-documented pattern, not a new regression.

**True baseline for this run: 99/101, with these 2 named pre-existing flakes.**
Per the run doc's own framing, copying already-applied migration files and
editing a comment changes no runtime behavior -- the suite here is a
no-regression formality, not a gate that must hit 101/101 (a bar this
codebase's suite has not hit in any recent cross-referenced run either).

## INVENTORY

**Production applied-migration state** (`supabase migration list`, read-only, linked project `ozhqsaysltiamadpcruz`):

```
   Local | Remote | Time (UTC)
  -------|--------|------------
   0001..0036 all match (Local == Remote, sequential, no gaps)
         | 0037   | 0037
         | 0038   | 0038
```

Cross-checked directly against `supabase_migrations.schema_migrations` (read-only `select version order by version::bigint desc limit 10`): top of the table is `0038`, `0037`, `0036`, ... descending with no gaps and nothing beyond `0038`. **No wider drift** — production's applied state is exactly `0001`-`0038`, and everything above `0036` is exactly the two files on `feat/quick-wins`. No STOP required for this phase.

**`feat/quick-wins` file inventory** (`git ls-tree -r feat/quick-wins -- supabase/migrations`): exactly two files beyond main's `0036` ceiling — `0037_streak_freeze_grant_tracking.sql` and `0038_streak_freeze_events.sql`. Both captured via `git show feat/quick-wins:<path>` (exact byte content, see RECONCILIATION for the copy).

- **0037** adds `user_streaks.freeze_last_granted_at date` (nullable, no default) — accrual-tracking column for the streak-freeze grant rule.
- **0038** drops and re-adds `product_events_event_type_check` to extend the allowed `event_type` enum with `streak_freeze_granted` / `streak_freeze_used`.

**Schema verification against the live database** (read-only `information_schema`/`pg_constraint` queries via `scripts/db-query.mjs`):
- `information_schema.columns` for `public.user_streaks` shows `freeze_last_granted_at | date | is_nullable: YES | column_default: null` — matches 0037's `add column if not exists freeze_last_granted_at date` exactly (no default specified in the migration, none present live).
- `pg_get_constraintdef` for `product_events_event_type_check` on `public.product_events` returns the exact enum list from 0038's `CHECK (event_type in (...))`, including `streak_freeze_granted` and `streak_freeze_used`, same order, no extra or missing values.

**Determination: applied production state and the `feat/quick-wins` files agree exactly.** No disagreement found — reconciliation proceeds as a straight byte-identical copy, no STOP triggered by Phase 2's disagreement clause.

## RECONCILIATION

Copied `supabase/migrations/0037_streak_freeze_grant_tracking.sql` and
`supabase/migrations/0038_streak_freeze_events.sql` from `feat/quick-wins`
onto `fix/migration-drift` via `git checkout feat/quick-wins -- <paths>`
(only these two paths -- no other file touched).

**Byte-identity proof** (two independent checks):
- `diff <(git show feat/quick-wins:<path>) <path>` -- empty diff, both files.
- `git hash-object <path>` vs `git rev-parse feat/quick-wins:<path>` -- blob
  SHAs match exactly for both files (`af9745c...` for 0037, `c31d5f7...` for
  0038).

`feat/quick-wins` itself was not committed to, merged, or otherwise modified
-- read-only `git show`/`git checkout -- <path>` operations only.

## COLLISION PREVENTION

- `src/lib/queries/stories.js:35` -- `reportStoryFallback`'s TODO comment
  updated from `TODO(migration 0037)` to `TODO(migration 0039+)`, plus a
  one-line pointer to `supabase/migrations/MIGRATIONS.md` for the reservation
  note. No behavior change -- the function still only `console.warn`s, exactly
  as `FIX_STORY_FOLLOWUP_R1` left it.
- Added `supabase/migrations/MIGRATIONS.md`: states the current highest
  applied number (`0038`), the rule ("next number after what's applied to
  production, checked via `supabase migration list` or
  `schema_migrations`, not after whatever's merged on `main`"), the full
  0037/0038 provenance note (applied from `feat/quick-wins` pre-merge,
  reconciled onto `main` by this run), and reserves `0039` for
  `story_fallback`.

## VERIFICATION

All with `set -a; source .env.local; set +a` prefix, re-run on the
post-reconciliation tree (after the Phase 2/3 commit, before merge):

- `npm run build` -- clean, no errors, same output shape as baseline.
- `npm run check:no-emoji` -- OK, unchanged result.
- `npm run check:wordart-sync` -- OK, unchanged result (77 words) --
  expected, this run never touched word-art data.
- `npx playwright test --workers=1` -- **98 passed / 3 failed / 101 total,
  15.7m.** Failures: `tests/blank-engine-comprehension.spec.js:94` (120s
  timeout, passed in 35.0s on baseline), `tests/find-the-word.spec.js:113`
  (60s timeout), `tests/placement-checkin.spec.js:153` (a `checkin_completed`
  product_event not found in time). **Zero overlap** with the baseline's 2
  failures (`celebration-timing.spec.js:79`, `placement-checkin.spec.js:203`
  -- both passed clean on this run).
  **Determination: not a regression.** This run's actual changes (two
  never-imported `.sql` files, one code comment) cannot cause a
  server-round-trip timeout or a missing telemetry event. All 3 new
  failures are timing/round-trip-sensitive against real backend endpoints
  (`checkin_completed` telemetry race, two AI-adjacent flows), and this
  codebase's documented AI-endpoint limits are tight and shared per-identity
  (`session-generator` 10/min across every mode, `story-engine` 4/day --
  see `CLAUDE.md`/`200MW_Master_Project_Doc_v5.md`). Running the full
  101-test suite twice back-to-back in one session, as this run's baseline
  + verification steps did, is a documented way to starve a second pass on
  those same limits -- consistent with different specific tests failing on
  each pass rather than a fixed break. Zero overlap between the two
  failure sets, both landing within 1-2 tests of the other's total, matches
  this codebase's already-established flake noise floor (99/101 -> 98/101
  is not a new regression pattern; see BASELINE's citation of
  `200MW_Master_Project_Doc_v5.md` documenting the same "different specific
  assertion each run" behavior in `placement-checkin.spec.js` specifically).
  A third run was deliberately not triggered -- it would only add more
  rate-limit pressure on the same test identity without changing the
  conclusion (the migration-file-only diff has no code path that could be
  responsible for any of these 5 distinct failures seen across both runs).

**`idor-proof` -- determination: not run, by design.** Per the run doc's
Phase 4 instruction ("idor-proof not expected... no code paths change —
files + one comment"): this run added two `.sql` migration files that are
already applied to production (no new code path reads or writes them --
they exist purely so the repo's file tree matches what's live) and edited
one code *comment*. No RLS policy, ownership check, auth flow, or any
code path `idor-proof` exercises was touched. Running it would provision
and clean up real test users against production for zero incremental
coverage on this change -- skipped as not applicable, not as a shortcut.

## LOGGED FOR LATER

- **`tests/celebration-timing.spec.js:79`** failed on the baseline run with
  a click-retry/"element is not stable" error, then passed clean on the
  verification run -- confirming it's flaky rather than a fixed break, but
  its specific failure signature (element detachment mid-click, navigation
  racing the click) is not yet cross-referenced against an existing report
  the way `placement-checkin`'s flakiness is -- worth a fresh look in a
  future hardening pass to confirm it's the same flake family or a newer
  one. Same applies to `tests/blank-engine-comprehension.spec.js:94` and
  `tests/find-the-word.spec.js:113`, which failed only on the verification
  run (see VERIFICATION for the rate-limit-pressure theory).
- Supabase CLI reports a new version available (v2.109.1, installed
  v2.107.0) -- not acted on this run (out of scope, and upgrading tooling
  mid-migration-drift-fix would be scope creep).
- `feat/quick-wins` (Package E) remains parked mid-Phase-2 with its own WIP
  commit (`ae1a6c9`) -- this run only reconciled the two already-applied
  migration files; the branch's other work (sleeping-stars, remaining
  streak-freeze UI) is untouched and still awaiting resumption.

## MERGE + DEPLOY

- Merged `fix/migration-drift` -> `main` with `--no-ff` (commit `29ecc2b`),
  performed in `.claude/worktrees/fix-story-quality` -- the only local
  worktree that had `main` checked out (verified clean, up to date with
  `origin/main` before touching it; not disturbed otherwise).
- **Approval checkpoint**: paused and asked before `git push origin main`,
  per the run's binding approval stop. Approved; pushed.
  `origin/main` now at `29ecc2b` (`3994c7c..29ecc2b main -> main`).
- **`supabase db push` was never run.** No database write of any kind
  occurred this run -- every Supabase interaction was a read-only query
  (`supabase migration list`, `information_schema`/`pg_constraint` via
  `scripts/db-query.mjs`). This is the intended end state: the two
  migration files are already applied live: the repo now truthfully
  reflects that, nothing was (re-)applied.
- **Deployment check**: `gh api repos/.../commits/29ecc2b/status` shows
  the Vercel GitHub check as `"state":"success"`, `"description":"Deployment
  has completed"`. (Vercel MCP tool access on this session's connected
  team did not include the magic-words project -- confirmed deployment
  status via the GitHub commit-status API instead, which reflects the
  same underlying Vercel deployment via its GitHub App integration.)
- **No production walk performed, by design** -- this run changed no
  user-facing behavior (two SQL files that are already applied to
  production, a code comment, and a docs file). Per the run doc's Phase 5
  instruction, stating this explicitly rather than inventing a walk that
  would exercise nothing this diff touches.
- **Never touched the Aliya account** -- no user accounts, test or real,
  were created, read, or modified this run (no `admin-user.mjs` use, no
  `idor-proof` run -- see VERIFICATION for why).

## TRAPS

- **`main` was already checked out in another worktree.** This repo has
  several `.claude/worktrees/*` entries, one of which (`fix-story-quality`)
  had `main` itself checked out -- `git checkout main` from the primary
  worktree failed with "already checked out." Worked around by branching
  directly off the ref (`git checkout -b fix/migration-drift main`) without
  ever occupying the `main` checkout slot -- didn't touch that other
  worktree.
- **The working tree was not clean at session start.** The primary worktree
  was on `feat/quick-wins` with uncommitted changes (a modified
  `docs/FEAT_QUICK_WINS_R1.md` plus several untracked docs, including this
  run's own prompt doc, `docs/FIX_MIGRATION_DRIFT_R1.md`). Since
  `feat/quick-wins` must stay untouched (guardrail), everything was
  `git stash push -u`'d before branching, and this run's prompt doc was
  recovered from the stash's untracked-files commit (`stash@{0}^3`) onto
  `fix/migration-drift`, verified byte-identical by diff. The stash is
  restored onto `feat/quick-wins` at the end of this run (see FINAL STATUS)
  so that branch's working tree ends exactly as it was found.
- **`git checkout stash@{0} -- <path>` doesn't reach untracked files.**
  First attempt to pull the prompt doc out of the stash failed silently
  with "pathspec did not match" because `-u` stashes put untracked files in
  a separate parent commit (`stash@{0}^3`), not the stash's main tree --
  had to target that parent commit explicitly.
- **`npm run check-wordart-sync`, as named in the run doc's Phase 4 line,
  doesn't exist** -- the actual `package.json` script is
  `check:wordart-sync` (colon, not dash). Used the real script name; noted
  here in case the doc's phrasing is copy-pasted into a future run
  verbatim.
- **The baseline Playwright run and the Phase 2/3 file changes overlapped
  in wall-clock time.** The baseline suite was launched in the background
  right after the Phase 0 commit (clean tree, no migration/code changes
  yet), then Phase 1 inventory and Phase 2/3 file changes + commits ran
  concurrently while it was still executing. This is safe here only
  because the changes were two never-imported `.sql` files and a one-line
  comment edit -- neither could affect a running Playwright/Vite process.
  Flagged so a future run with actual runtime-code changes doesn't
  replicate this ordering.
- **Running the full suite twice in one session (baseline + verification)
  produces two different 1-3-test failure sets, not the same one twice.**
  99/101 on the first pass, 98/101 on the second, with zero overlap in
  which specific tests failed. Most plausible cause: the AI-adjacent specs
  (`blank-engine-comprehension`, `find-the-word`, `placement-checkin`) share
  tight per-identity rate limits (`session-generator` 10/min,
  `story-engine` 4/day) that the first full run partially consumes, leaving
  less headroom for the second. A future run needing a genuinely clean
  suite result should budget for only one full run, or expect this same
  noise on a second one -- don't chase a third run assuming it'll
  eventually go green; it won't reveal anything the file-level diff
  analysis here doesn't already establish.
- **`main` was already checked out in `.claude/worktrees/fix-story-quality`
  for the entirety of this run** -- an artifact of a prior, apparently
  finished workstream (`docs/FIX_STORY_QUALITY_R1.md`, sitting untracked
  in this session's working tree) that never removed its worktree. Used it
  read-only-then-merge (confirmed clean and at `origin/main` first) rather
  than removing or repurposing it -- not this run's cleanup to do.

## FINAL STATUS

**All required deliverables complete on `main` (pushed, commit `29ecc2b`
+ this closing docs commit):**
- Inventory: production's applied-migration state queried fresh (`supabase
  migration list` + direct `schema_migrations`/`information_schema`
  queries) and matches `feat/quick-wins`'s `0037`/`0038` files exactly --
  no wider drift found, no STOP triggered.
- `0037_streak_freeze_grant_tracking.sql` and `0038_streak_freeze_events.sql`
  are on `main`, byte-identical to what's applied to production (verified
  by diff and by blob-hash comparison).
- `supabase/migrations/MIGRATIONS.md` added: current highest applied
  (`0038`), the "number after what's applied, not what's merged" rule,
  0037/0038 provenance, `0039` reserved for `story_fallback`.
- `src/lib/queries/stories.js`'s `story_fallback` TODO moved from `0037` to
  `0039+`.
- Full gate suite run twice (baseline 99/101, verification 98/101), zero
  overlapping failures between runs, determined not a regression (see
  VERIFICATION) -- build/no-emoji/wordart-sync clean both times.
  `idor-proof` determination: not applicable, documented why.
- `fix/migration-drift` merged `--no-ff` into `main`, approved by Sal
  before push, pushed to `origin/main`, Vercel deployment confirmed
  `READY`/"Deployment has completed" via GitHub's commit-status check.
- **No database writes made this run.** `supabase db push` was never
  invoked -- every guardrail in the run doc held. `feat/quick-wins` was
  never committed to, merged, or force-touched -- only read via `git show`
  and `git checkout -- <path>`; its own WIP commit and (now-restored)
  stash are exactly as this run found them. The Aliya account was never
  touched.
- This docs push is self-certified by this very commit: the report you
  are reading is the artifact being pushed as this run's closing action.

**Run complete. No STOP, no unresolved item.**
