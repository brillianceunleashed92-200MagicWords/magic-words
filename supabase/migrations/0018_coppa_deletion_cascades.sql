-- Security hardening Phase 7 (COPPA baseline) — fix missing ON DELETE
-- CASCADE constraints found while building the account-deletion flow.
--
-- Migration 0013 found and fixed this exact bug class for
-- child_profiles.parent_id (deleting a parent's auth.users row threw a
-- foreign-key violation instead of cascading). Querying every FK
-- referencing child_id/user_id in information_schema found the same bug
-- still present on several other tables — meaning a parent trying to
-- delete their account today would still hit a 500 partway through, just
-- one table further down the chain. Fixed here rather than only working
-- around it in application code, so any future direct delete (not just
-- the new api/delete-account.js endpoint) behaves correctly too.

alter table public.achievements drop constraint if exists achievements_child_id_fkey;
alter table public.achievements
  add constraint achievements_child_id_fkey
  foreign key (child_id) references public.child_profiles(id) on delete cascade;

alter table public.learning_events drop constraint if exists learning_events_child_id_fkey;
alter table public.learning_events
  add constraint learning_events_child_id_fkey
  foreign key (child_id) references public.child_profiles(id) on delete cascade;

alter table public.learning_events drop constraint if exists learning_events_user_id_fkey;
alter table public.learning_events
  add constraint learning_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.learning_plans drop constraint if exists learning_plans_child_id_fkey;
alter table public.learning_plans
  add constraint learning_plans_child_id_fkey
  foreign key (child_id) references public.child_profiles(id) on delete cascade;

alter table public.session_plans drop constraint if exists session_plans_user_id_fkey;
alter table public.session_plans
  add constraint session_plans_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_streaks drop constraint if exists user_streaks_user_id_fkey;
alter table public.user_streaks
  add constraint user_streaks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.word_progress drop constraint if exists word_progress_user_id_fkey;
alter table public.word_progress
  add constraint word_progress_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
