# 200 MAGIC WORDS — MIGRATION_DRIFT_REPORT
**Run doc:** `docs/FIX_MIGRATION_DRIFT_R1.md` · **Branch:** `fix/migration-drift` (off `main` @ `3994c7c`)

## SUMMARY
IN PROGRESS

## RUN TIMING
- **Start:** 2026-07-13 09:40 EDT
- Branched `fix/migration-drift` off `main` tip `3994c7c` (main was already checked out in another worktree, `.claude/worktrees/fix-story-quality` — branched directly with `git checkout -b fix/migration-drift main` from `feat/quick-wins`, no need to occupy the main checkout slot).
- `feat/quick-wins` had uncommitted work (modified `docs/FEAT_QUICK_WINS_R1.md` + several untracked docs, including this run's own prompt doc). Stashed with `git stash push -u` before branching so `feat/quick-wins`'s working tree stays exactly as found; the prompt doc was restored onto this branch from the stash's untracked-files commit (`stash@{0}^3`), byte-identical (diffed, confirmed match). The stash will be popped back onto `feat/quick-wins` at the end of this run to fully restore that branch's state.

## BASELINE
IN PROGRESS

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
IN PROGRESS

## LOGGED FOR LATER
IN PROGRESS

## TRAPS
IN PROGRESS
