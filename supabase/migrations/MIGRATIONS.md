# Migration numbering

**Current highest applied (production):** `0038` (`0038_streak_freeze_events.sql`).
**Next-free number:** `0039`, earmarked for `story_fallback` (see the TODO in
`src/lib/queries/stories.js`, `reportStoryFallback`) -- do not use 0039 for
anything else without updating that TODO too.

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
