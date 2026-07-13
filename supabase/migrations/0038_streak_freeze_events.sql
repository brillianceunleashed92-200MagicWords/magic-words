-- FEAT_QUICK_WINS_R1 Package E, item 1 -- streak freeze telemetry.
-- streak_freeze_granted / streak_freeze_used are both client-originated
-- (src/lib/queries/streaks.js's useUpdateStreakMutation runs entirely
-- client-side -- see QUICK_WINS_REPORT.md RECON, "reset-vs-increment
-- decision runs client-side, not a server function"), so unlike
-- checkin_started/checkin_completed (migration 0036, server-only) this
-- pair needs BOTH the CHECK constraint here AND the api/track.js
-- allowlist entry (same migration, same commit) per RULE 3's "same
-- change, plus a positive-landing test" requirement.
alter table public.product_events drop constraint product_events_event_type_check;
alter table public.product_events add constraint product_events_event_type_check
  check (event_type in (
    'placement_started', 'placement_completed', 'placement_skipped', 'placement_retaken',
    'paywall_viewed', 'checkout_started', 'scaffold_down',
    'checkin_started', 'checkin_completed',
    'streak_freeze_granted', 'streak_freeze_used'
  ));
