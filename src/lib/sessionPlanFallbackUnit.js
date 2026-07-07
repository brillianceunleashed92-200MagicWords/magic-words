// Pure unit-selection logic for the offline/API-failure session-plan
// fallback (src/hooks/useSessionPlan.js). Extracted to its own module —
// useSessionPlan.js transitively imports supabaseClient.js, which reads
// import.meta.env (Vite-only), so it can't be imported directly by a
// plain Node/Playwright test. This module's only import,
// masteryCalibration.js, is itself dependency-free and ES-module (same
// import Playwright's test runner already resolves fine for
// mastery-replay.spec.js/parent-metrics-derivations.spec.js), so
// tests/session-plan-fallback.spec.js can still import this safely.
//
// FIX R1 Phase 2 (A1) — mirrors api/session-generator.js's currentUnit
// scan exactly: a placement floor (already min(measured, plan cap)) must
// shift which unit this fallback starts scanning from, same as the
// primary server path already does.
//
// FEAT_PEDAGOGY_CALIBRATION_R1 Phase 3 — a word answered correctly once
// (100% stored mastery, 1 attempt) must not make this fallback treat its
// unit as "done" either, matching the online session-generator.js fix —
// otherwise a child hitting this path (API down) would see different
// unit-progression behavior than the primary path. Requires each item in
// `withMastery` to now also carry `attemptCount` (see useSessionPlan.js's
// caller-side change) — an item without it defaults to 0 attempts via
// isRealMastery's own `?? 0`, so a caller that hasn't been updated yet
// degrades to "never mastered" rather than silently keeping the old
// (wrong) behavior.
import { isRealMastery } from './masteryCalibration';

export function computeFallbackCurrentUnit(withMastery, effectiveFloor = null) {
  const units = [...new Set(withMastery.map((w) => w.unit))].sort((a, b) => a - b)
    .filter((u) => !effectiveFloor || u >= effectiveFloor);
  let currentUnit = units[0] ?? effectiveFloor ?? 1;
  for (const unit of units) {
    const hasUnmastered = withMastery.some((w) => w.unit === unit && !isRealMastery(w.mastery, w.attemptCount));
    currentUnit = unit;
    if (hasUnmastered) break;
  }
  return currentUnit;
}
