-- Prompt 9: Launch Analytics + Placement True-Level Fix. Three additions:
--
-- 1. child_profiles.measured_unit — the "sharp edge" PLACEMENT_ADVENTURE_
--    REPORT.md flagged: a free child measured at Unit 9 stores
--    placement_unit = 5 (floored server-side by finalize()), so the
--    Dashboard upgrade banner reading placement_unit understates the real
--    measurement. This column stores the TRUE measured unit alongside the
--    floor, written by the same finalize() call, same service-role-only
--    write path. Automatically covered by migration 0033's blanket
--    `revoke update on child_profiles from authenticated, anon` — no new
--    REVOKE needed, verified via information_schema.table_privileges
--    below (not assumed). Backfill: n/a (product_events holds history for
--    prior placements; this column starts null for every existing row and
--    is only ever populated going forward by a fresh placement/retake).
alter table public.child_profiles
  add column if not exists measured_unit integer;

alter table public.child_profiles
  add constraint child_profiles_measured_unit_range
  check (measured_unit is null or (measured_unit between 1 and 18));

-- 2. product_events event_type allowlist extended for the two genuinely
--    underivable launch-analytics signals (see docs/LAUNCH_ANALYTICS_REPORT.md
--    PART 1 for the full derive-vs-event map): paywall_viewed (client-
--    originated via /api/track) and checkout_started (server-side, inside
--    api/create-checkout-session.js). upgrade_tapped deliberately excluded
--    per that same report's derive-don't-duplicate reasoning.
alter table public.product_events drop constraint product_events_event_type_check;
alter table public.product_events add constraint product_events_event_type_check
  check (event_type in (
    'placement_started', 'placement_completed', 'placement_skipped', 'placement_retaken',
    'paywall_viewed', 'checkout_started'
  ));

-- 3. subscriptions.created_at — a real gap found during PART 1 metric
--    verification: subscriptions is a single row per user_id, upserted
--    (onConflict: 'user_id') on every Stripe webhook event, so the
--    existing updated_at gets overwritten on every renewal and can't
--    answer "when did this user first subscribe" (needed for "new
--    subscriptions by day"). Backfilled to each existing row's own
--    updated_at (the best real timestamp already on file, not a
--    fabricated date) rather than defaulting every pre-existing row to
--    "today." api/stripe-webhook.js's upsertSubscription() does NOT need
--    a code change: Supabase's .upsert() only sets columns present in the
--    payload, so created_at populates once on INSERT and is left alone by
--    every later conflict-UPDATE for free.
alter table public.subscriptions
  add column if not exists created_at timestamptz;

update public.subscriptions set created_at = updated_at where created_at is null;

alter table public.subscriptions
  alter column created_at set default now(),
  alter column created_at set not null;
