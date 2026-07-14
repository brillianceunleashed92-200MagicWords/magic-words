# Migration numbering

**Current highest applied (production):** `0040` (`0040_product_events_deletion_integrity.sql`, `FIX_EVENTS_PURGE_R1`).
**Next-free number:** `0041`. `0039` remains earmarked for `story_fallback`
(see the TODO in `src/lib/queries/stories.js`, `reportStoryFallback`) --
`FIX_EVENTS_PURGE_R1` confirmed via a fresh `supabase migration list` that
0038 was still the highest applied at the time it ran, and deliberately took
`0040` rather than the reserved `0039` -- do not use 0039 for anything else
without updating that TODO too.

## 0040 provenance

`0040_product_events_deletion_integrity.sql` (`FIX_EVENTS_PURGE_R1`) purges
`product_events`' historical orphans (rows whose `user_id`/`child_id` point at
already-deleted owners -- 737 of 768 rows, 96%, confirmed live) and adds
`ON DELETE CASCADE` foreign keys on both `user_id` (-> `auth.users`) and
`child_id` (-> `child_profiles`), closing a gap the master doc had
(incorrectly) documented as already fixed. See
`docs/EVENTS_PURGE_REPORT.md` for the full root-cause writeup.

## The rule

New migrations take the next number after what's **actually applied to
production**, not after the highest number merged on `main`. Before creating
a new migration file, check what's really applied:

```
supabase migration list          # Local vs Remote, read-only
```

or query `supabase_migrations.schema_migrations` directly. Do not assume
`main`'s `supabase/migrations/` directory is the source of truth for the next
number -- a migration can be applied to production from a branch that hasn't
merged yet (see the 0037/0038 provenance note below), which is exactly the
drift this file exists to prevent from recurring.

## 0037/0038 provenance

`0037_streak_freeze_grant_tracking.sql` and `0038_streak_freeze_events.sql`
were written and applied to production from the parked `feat/quick-wins`
branch (Package E, streak-freeze token work) before that branch merged to
`main`. `main` and `feat/quick-wins` drifted as a result: production had
0037/0038 applied, but the files establishing them existed only on the
unmerged branch. A separate workstream (`FIX_STORY_FOLLOWUP_R1`) independently
claimed migration number 0037 for a future `story_fallback` product_events
type, creating a numbering collision with migrations that were already live.

Reconciled by `FIX_MIGRATION_DRIFT_R1` (branch `fix/migration-drift`): the two
files were copied byte-identical onto `main` (verified against production's
actual applied schema first), and the `story_fallback` TODO was moved to
`0039+`. `feat/quick-wins` itself was left parked and unmerged -- only these
two already-applied migration files were reconciled, no other code from that
branch.
