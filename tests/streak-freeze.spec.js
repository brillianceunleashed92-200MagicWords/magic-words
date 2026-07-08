import { test, expect } from "@playwright/test";
import { isoWeekStartString, isEligibleForFreezeGrant } from "../src/lib/streakFreeze.js";

// FEAT_QUICK_WINS_R1 Package E, item 1 — streak freeze grant/accrual.
// Plain Node assertions against the extracted pure functions (no
// Supabase, no browser) — same precedent as sessionPlanFallbackUnit.js /
// blankEngineWeighting.js. Consumption is exercised live (VERIFICATION
// in the report); this covers the grant-eligibility rule exhaustively.

test("isoWeekStartString returns the Monday of the given week", () => {
  // 2026-07-08 is a Wednesday.
  expect(isoWeekStartString("2026-07-08")).toBe("2026-07-06");
  // 2026-07-06 is already a Monday.
  expect(isoWeekStartString("2026-07-06")).toBe("2026-07-06");
  // 2026-07-12 is a Sunday — still the same week as the 6th-12th.
  expect(isoWeekStartString("2026-07-12")).toBe("2026-07-06");
  // 2026-07-13 is the next Monday — a new week.
  expect(isoWeekStartString("2026-07-13")).toBe("2026-07-13");
});

test("no active streak is never eligible, regardless of freeze state", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 0, freezeCount: 0, freezeLastGrantedAt: null, today: "2026-07-08" })).toBe(false);
});

test("already holding a freeze is never eligible for another", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 5, freezeCount: 1, freezeLastGrantedAt: null, today: "2026-07-08" })).toBe(false);
});

test("active streak, holds 0, never granted before -> eligible", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 3, freezeCount: 0, freezeLastGrantedAt: null, today: "2026-07-08" })).toBe(true);
});

test("active streak, holds 0, granted earlier THIS ISO week -> not eligible again", () => {
  // Both dates fall in the Mon 2026-07-06 week.
  expect(isEligibleForFreezeGrant({ currentStreak: 3, freezeCount: 0, freezeLastGrantedAt: "2026-07-06", today: "2026-07-08" })).toBe(false);
});

test("active streak, holds 0, last granted a PRIOR ISO week -> eligible again", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 3, freezeCount: 0, freezeLastGrantedAt: "2026-06-29", today: "2026-07-08" })).toBe(true);
});

test("grant is never manufactured beyond one protected day — holding 1 blocks a second grant even mid-new-week", () => {
  expect(isEligibleForFreezeGrant({ currentStreak: 10, freezeCount: 1, freezeLastGrantedAt: "2026-06-29", today: "2026-07-13" })).toBe(false);
});
