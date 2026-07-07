-- FEAT_PEDAGOGY_CALIBRATION_R1 Phase 5 — product_events.event_type
-- allowlist extended for scaffold_down (api/track.js already validates
-- and accepts this event; the CHECK constraint added by migration 0034
-- was never updated to match, so every scaffold_down insert has been
-- silently failing at the DB level since Phase 5 landed — logProductEvent
-- is fire-and-forget and only console.errors on failure, so /api/track
-- still returned 200 while the row never landed. Caught by the recovery
-- run's idor-proof.mjs pass against a real deployed preview (the only
-- place this constraint violation could actually surface — local dev
-- serves no /api routes at all).
alter table public.product_events drop constraint product_events_event_type_check;
alter table public.product_events add constraint product_events_event_type_check
  check (event_type in (
    'placement_started', 'placement_completed', 'placement_skipped', 'placement_retaken',
    'paywall_viewed', 'checkout_started', 'scaffold_down'
  ));
