-- Phase 2 (Parent Loop) — add nullable child_id to every per-user progress
-- table, in preparation for multi-child support. Nullable during this
-- transition; 0007_backfill_child_profiles.sql fills it in for existing
-- rows, and app code is updated (Step 1) to always set it going forward.
-- Additive only — no existing column touched.

alter table public.word_progress
  add column if not exists child_id uuid references public.child_profiles(id) on delete cascade;

alter table public.user_stats
  add column if not exists child_id uuid references public.child_profiles(id) on delete cascade;

alter table public.user_streaks
  add column if not exists child_id uuid references public.child_profiles(id) on delete cascade;

alter table public.user_sparks
  add column if not exists child_id uuid references public.child_profiles(id) on delete cascade;

alter table public.learning_events
  add column if not exists child_id uuid references public.child_profiles(id) on delete cascade;

create index if not exists word_progress_child_id_idx on public.word_progress (child_id);
create index if not exists user_stats_child_id_idx    on public.user_stats (child_id);
create index if not exists user_streaks_child_id_idx  on public.user_streaks (child_id);
create index if not exists user_sparks_child_id_idx   on public.user_sparks (child_id);
create index if not exists learning_events_child_id_idx on public.learning_events (child_id);
