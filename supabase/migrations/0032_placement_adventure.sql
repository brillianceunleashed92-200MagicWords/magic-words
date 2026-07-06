-- Prompt 8: Placement Adventure. Two additions:
--
-- 1. child_profiles.placement_unit / placement_completed_at — a nullable
--    FLOOR the session-generator's current-unit derivation respects.
--    Deliberately NOT client-writable: RLS's existing "parent owns child
--    profiles" ALL policy (0005) would otherwise let a parent's own
--    Supabase client write ANY value here directly (RLS is row-level, not
--    column-level -- it can't stop a legitimate owner from writing a
--    forged value to one column of a row they're allowed to touch at
--    all). Column-level REVOKE closes that gap independently of RLS: only
--    the service-role admin client (used exclusively by the placement
--    finalization code path in api/session-generator.js) can ever write
--    these two columns, matching the SECURITY RULE's "client must not be
--    able to self-declare Unit 18." Existing children: both columns
--    nullable, defaulting to null, zero behavior change.
--
-- 2. product_events — first-party-only event log (placement_started/
--    completed/skipped/retaken to start; the home Prompt 9's broader
--    analytics pass extends). Modeled on security_events (0017): service-
--    role-only, no client RLS policies, because these are backend
--    telemetry today, not a parent-facing feature -- verified via
--    scripts/db-query.mjs, not the app. A dedicated table rather than
--    overloading learning_events: learning_events is word-attempt-shaped
--    (word, game_type, correct, response_time_ms) and placement_started/
--    skipped have no word or correctness to report; forcing them into
--    that shape would mean nullable-everything columns purely to fit an
--    unrelated event, and would give Prompt 9's broader analytics pass a
--    narrower, word-specific table to generalize from instead of a clean
--    one.

alter table public.child_profiles
  add column if not exists placement_unit integer,
  add column if not exists placement_completed_at timestamptz;

alter table public.child_profiles
  add constraint child_profiles_placement_unit_range
  check (placement_unit is null or (placement_unit between 1 and 18));

revoke update (placement_unit, placement_completed_at) on public.child_profiles from authenticated, anon;

create table if not exists public.product_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null check (event_type in (
    'placement_started', 'placement_completed', 'placement_skipped', 'placement_retaken'
  )),
  user_id     uuid,
  child_id    uuid,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists product_events_child_id_idx on public.product_events (child_id, created_at desc);

alter table public.product_events enable row level security;
-- No policies -- service_role only, same reasoning as security_events (0017).
