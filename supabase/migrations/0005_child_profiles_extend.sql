-- Phase 2 (Parent Loop) — extend the existing (currently unused, empty)
-- child_profiles table rather than creating a new one. It already has
-- id/parent_id/name/age/avatar/created_at/updated_at, RLS enabled, and a
-- correct "parent owns child profiles" ALL policy (auth.uid() = parent_id)
-- — confirmed via `pg_policy` before writing this, not assumed. Verified
-- zero rows and zero references anywhere in app code, so extending it
-- in place is safe (no rename, no data loss for any real consumer).
--
-- Only `interests` is actually new — `avatar` (text) already covers the
-- avatar-from-a-fixed-list requirement (matches user_stats.avatar's
-- existing convention, no need for a separate jsonb config shape yet).

alter table public.child_profiles
  add column if not exists interests text[] not null default '{}';

comment on column public.child_profiles.interests is
  'Up to 3 picks from a moderated list (src/lib/interests.js) — used by the Story Engine (blueprint Part 3.1) to pick a matching theme.';
