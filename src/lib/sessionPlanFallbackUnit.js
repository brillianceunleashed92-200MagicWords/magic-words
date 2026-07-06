// Pure unit-selection logic for the offline/API-failure session-plan
// fallback (src/hooks/useSessionPlan.js). Extracted to its own
// dependency-free module — useSessionPlan.js transitively imports
// supabaseClient.js, which reads import.meta.env (Vite-only), so it can't
// be imported directly by a plain Node/Playwright test. This module has
// zero imports, so tests/session-plan-fallback.spec.js can import it
// safely.
//
// FIX R1 Phase 2 (A1) — mirrors api/session-generator.js's currentUnit
// scan exactly: a placement floor (already min(measured, plan cap)) must
// shift which unit this fallback starts scanning from, same as the
// primary server path already does.
export function computeFallbackCurrentUnit(withMastery, effectiveFloor = null) {
  const units = [...new Set(withMastery.map((w) => w.unit))].sort((a, b) => a - b)
    .filter((u) => !effectiveFloor || u >= effectiveFloor);
  let currentUnit = units[0] ?? effectiveFloor ?? 1;
  for (const unit of units) {
    const hasUnmastered = withMastery.some((w) => w.unit === unit && w.mastery < 80);
    currentUnit = unit;
    if (hasUnmastered) break;
  }
  return currentUnit;
}
