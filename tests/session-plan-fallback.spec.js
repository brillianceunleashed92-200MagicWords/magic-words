import { test, expect } from "@playwright/test";
import { computeFallbackCurrentUnit } from "../src/lib/sessionPlanFallbackUnit.js";

// FIX R1 Phase 2 (A1) — the offline/API-failure session-plan fallback
// previously ignored placement_unit entirely, so a freshly-placed child
// (empty word_progress by design) landed on Unit 1 instead of their
// measured floor if this path was ever hit. These are plain Node
// assertions (no browser/page needed) against the extracted pure
// unit-selection function — no Supabase mocking required.

function words(unitList) {
  return unitList.map((unit) => ({ word: `w${unit}`, unit, mastery: 0 }));
}

test("empty word_progress + placement_unit 5 yields Unit 5, not Unit 1", () => {
  const withMastery = words([1, 2, 3, 5, 7, 9]);
  expect(computeFallbackCurrentUnit(withMastery, 5)).toBe(5);
});

test("placement_unit null preserves current (pre-fix) behavior — lowest unmastered unit", () => {
  const withMastery = words([1, 2, 3]);
  expect(computeFallbackCurrentUnit(withMastery, null)).toBe(1);
});

test("floor above every unit with progress still returns the floor, not undefined", () => {
  const withMastery = words([1, 2, 3]);
  expect(computeFallbackCurrentUnit(withMastery, 9)).toBe(9);
});

test("floor doesn't skip past a real unmastered unit at or above it", () => {
  const withMastery = [
    { word: "a", unit: 5, mastery: 100 },
    { word: "b", unit: 5, mastery: 100 },
    { word: "c", unit: 7, mastery: 20 },
    { word: "d", unit: 9, mastery: 0 },
  ];
  expect(computeFallbackCurrentUnit(withMastery, 5)).toBe(7);
});
