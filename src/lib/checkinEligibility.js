// FEAT_PLACEMENT_CHECKIN_R1 — extracted (not duplicated, same reasoning
// as src/lib/masteryCalibration.js's own header) so a plain Node/
// Playwright test can import this directly without pulling in React/
// zustand/icons (StarCheckInCard.jsx transitively does). Zero imports.
export const CHECKIN_ELIGIBILITY_DAYS = 30;

export function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// A child never placed (placement_completed_at null — "started at the
// beginning") is never eligible: check-in re-probes an EXISTING
// measurement, it isn't a first one.
export function isCheckinEligible(activeChild) {
  if (!activeChild?.placement_completed_at) return false;
  return daysSince(activeChild.placement_completed_at) >= CHECKIN_ELIGIBILITY_DAYS;
}
