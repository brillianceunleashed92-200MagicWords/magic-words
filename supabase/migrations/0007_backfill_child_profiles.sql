-- Phase 2 (Parent Loop) — backfill data migration. Every user_id with any
-- existing data becomes the parent of one seeded child_profiles row (their
-- single implicit "child" under the pre-Phase-2 single-profile model),
-- then every progress-table row for that user_id is pointed at it via
-- child_id. Idempotent: re-running does nothing once child_id is set.
--
-- Scope at time of writing (verified via direct count queries before
-- writing this migration, not assumed): 3 distinct user_ids with data
-- across word_progress/user_stats/user_streaks/learning_events, 28
-- word_progress rows, 1 user_stats row, 1 user_streaks row, 8
-- learning_events rows, 0 user_sparks rows (Sparks launched empty in
-- Phase 1 and no one has earned any yet).

insert into public.child_profiles (parent_id, name)
select u.user_id, 'Learner'
from (
  select user_id from public.word_progress
  union select user_id from public.user_stats
  union select user_id from public.user_streaks
  union select user_id from public.user_sparks
  union select user_id from public.learning_events
) u
where not exists (
  select 1 from public.child_profiles cp where cp.parent_id = u.user_id
);

update public.word_progress wp
set child_id = cp.id
from public.child_profiles cp
where wp.child_id is null and cp.parent_id = wp.user_id;

update public.user_stats us
set child_id = cp.id
from public.child_profiles cp
where us.child_id is null and cp.parent_id = us.user_id;

update public.user_streaks ustk
set child_id = cp.id
from public.child_profiles cp
where ustk.child_id is null and cp.parent_id = ustk.user_id;

update public.user_sparks usp
set child_id = cp.id
from public.child_profiles cp
where usp.child_id is null and cp.parent_id = usp.user_id;

update public.learning_events le
set child_id = cp.id
from public.child_profiles cp
where le.child_id is null and cp.parent_id = le.user_id;
