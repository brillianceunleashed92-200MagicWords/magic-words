-- FEAT_PLACEMENT_CHECKIN_R1: Star Check-In event types. Same pattern as
-- 0034/0035 -- product_events' event_type CHECK constraint is the only
-- schema change this feature needs (no new table, no new columns: the
-- check-in result reuses child_profiles.placement_unit/measured_unit/
-- placement_completed_at for current state, and product_events itself
-- for the growth-line history -- see PLACEMENT_CHECKIN_REPORT.md DESIGN
-- LOCK for the full storage recon). checkin_started/checkin_completed
-- are logged server-side only (api/session-generator.js's checkinMode
-- branch, via the same internal logProductEvent helper placement's own
-- events already use) -- never client-originated through api/track.js,
-- so no api/track.js allowlist change accompanies this migration
-- (matching the existing placement_* event precedent).
alter table public.product_events drop constraint product_events_event_type_check;
alter table public.product_events add constraint product_events_event_type_check
  check (event_type in (
    'placement_started', 'placement_completed', 'placement_skipped', 'placement_retaken',
    'paywall_viewed', 'checkout_started', 'scaffold_down',
    'checkin_started', 'checkin_completed'
  ));
