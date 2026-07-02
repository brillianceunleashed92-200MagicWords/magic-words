-- Phase 2 (Parent Loop) — swap the uniqueness grain on per-child progress
-- tables from user_id to child_id. Discovered while building multi-child
-- profiles (not anticipated by the migration list as written): user_stats/
-- user_streaks/user_sparks each had `user_id` as their sole PRIMARY KEY,
-- and word_progress had a UNIQUE(user_id, word) constraint — both make it
-- structurally impossible for a second child under the same parent
-- account to ever get an independent row (a second insert would collide
-- on the existing constraint, or silently upsert into the first child's
-- row). child_id was 100% backfilled by 0007 before this migration was
-- written (verified via count query, not assumed), so it's safe to make
-- it NOT NULL and the new uniqueness key here.
--
-- user_id is kept on every table (not dropped) — still correct for RLS
-- (auth.uid() = user_id) and for "all of this parent's children" queries
-- in the parent portal — it just stops being unique by itself.

alter table public.user_stats alter column child_id set not null;
alter table public.user_stats drop constraint if exists user_stats_pkey;
alter table public.user_stats add primary key (child_id);
create index if not exists user_stats_user_id_idx on public.user_stats (user_id);

alter table public.user_streaks alter column child_id set not null;
alter table public.user_streaks drop constraint if exists user_streaks_pkey;
alter table public.user_streaks add primary key (child_id);
create index if not exists user_streaks_user_id_idx on public.user_streaks (user_id);

alter table public.user_sparks alter column child_id set not null;
alter table public.user_sparks drop constraint if exists user_sparks_pkey;
alter table public.user_sparks add primary key (child_id);
create index if not exists user_sparks_user_id_idx on public.user_sparks (user_id);

alter table public.word_progress alter column child_id set not null;
-- Real constraint name confirmed via information_schema before writing
-- this (not guessed) — a wrong `drop constraint if exists` name here
-- would silently no-op and leave the blocking constraint in place.
alter table public.word_progress drop constraint if exists word_progress_user_word_unique;
alter table public.word_progress add constraint word_progress_child_id_word_key unique (child_id, word);
