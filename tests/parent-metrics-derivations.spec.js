import { test, expect } from "@playwright/test";
import {
  computeWeeklyMasteryCrossings,
  computeHeatmapData,
  computeAccuracyByActivity,
  computeResponseTimeTrend,
  computeReviewForecast,
  computeUnitProgress,
} from "../src/lib/parentMetricsDerivations.js";

// FEAT_PARENT_METRICS_R1 Phase 2 — synthetic unit tests for the 6 chart
// derivations, following the no-`page`-fixture pattern from
// session-plan-fallback.spec.js / mastery-replay.spec.js. Fixed `now`
// anchors every "last N weeks/days" window so these are deterministic
// regardless of when the suite runs.

const NOW = new Date("2026-07-20T12:00:00Z");

test("computeWeeklyMasteryCrossings buckets a crossing into its rolling 7-day window", () => {
  const rows = [
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:00:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:01:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:02:00Z" }, // crosses here, within the last 7 days
  ];
  // No `words` (stored row) provided -- the truncation guard only applies
  // when a stored row is available to compare against, so this stays a
  // pure bucketing test.
  const weeks = computeWeeklyMasteryCrossings(rows, [], NOW, 8);
  expect(weeks).toHaveLength(8);
  expect(weeks[weeks.length - 1].count).toBe(1); // most recent bucket
  expect(weeks.slice(0, 7).every((w) => w.count === 0)).toBe(true);
});

test("computeWeeklyMasteryCrossings ignores crossings older than the window", () => {
  const rows = [
    { word: "dog", correct: true, recorded_at: "2026-01-01T10:00:00Z" },
    { word: "dog", correct: true, recorded_at: "2026-01-01T10:01:00Z" },
    { word: "dog", correct: true, recorded_at: "2026-01-01T10:02:00Z" },
  ];
  const weeks = computeWeeklyMasteryCrossings(rows, [], NOW, 8);
  expect(weeks.reduce((sum, w) => sum + w.count, 0)).toBe(0);
});

// FEAT_PEDAGOGY_CALIBRATION_R1 Phase 6 (Package A coupling) — the
// truncation guard: a crossing found via replay is only kept if the
// replay's final (attemptCount, correctCount) exactly matches the word's
// REAL all-time stored counts (from `words`, the same merged
// useCandyGalaxyData() shape charts 5/6 use).
test("computeWeeklyMasteryCrossings keeps a genuine in-window crossing whose replay matches the stored row", () => {
  const rows = [
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:00:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:01:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:02:00Z" },
  ];
  // Stored row matches the replay exactly (3 attempts, 3 correct) -- the
  // fetch window captured this word's entire history.
  const words = [{ word: "cat", attemptCount: 3, correctCount: 3 }];
  const weeks = computeWeeklyMasteryCrossings(rows, words, NOW, 8);
  expect(weeks[weeks.length - 1].count).toBe(1);
});

test("computeWeeklyMasteryCrossings skips a crossing whose replay undercounts the real stored row (truncated window)", () => {
  const rows = [
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:00:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:01:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-19T10:02:00Z" }, // replay sees only 3 attempts, "crosses" here
  ];
  // Real stored row shows 10 attempts total -- this word was mastered long
  // before the fetch window began; these 3 in-window events are a later
  // review sequence, not the original crossing. Must be skipped.
  const words = [{ word: "cat", attemptCount: 10, correctCount: 10 }];
  const weeks = computeWeeklyMasteryCrossings(rows, words, NOW, 8);
  expect(weeks.reduce((sum, w) => sum + w.count, 0)).toBe(0);
});

test("computeHeatmapData counts ALL game types per client-local day, including scoreless", () => {
  const rows = [
    { word: "cat", correct: true, recorded_at: "2026-07-20T09:00:00Z", game_type: "word_match" },
    { word: "cat", correct: true, recorded_at: "2026-07-20T09:05:00Z", game_type: "draw_it" }, // scoreless, still counted here
    { word: "dog", correct: false, recorded_at: "2026-07-19T09:00:00Z", game_type: "word_hunt" },
  ];
  const days = computeHeatmapData(rows, NOW, 84);
  expect(days).toHaveLength(84);
  const today = days[days.length - 1];
  const yesterday = days[days.length - 2];
  expect(today.count).toBe(2);
  expect(yesterday.count).toBe(1);
});

test("computeAccuracyByActivity excludes scoreless types, unknown ids, and hides <5 attempts", () => {
  const rows = [
    ...Array.from({ length: 4 }, (_, i) => ({ game_type: "word_hunt", correct: true, recorded_at: "2026-07-20T09:00:00Z" })), // only 4 — hidden
    ...Array.from({ length: 6 }, (_, i) => ({ game_type: "word_match", correct: i < 3, recorded_at: "2026-07-20T09:00:00Z" })), // 6 attempts, 3 correct
    { game_type: "draw_it", correct: true, recorded_at: "2026-07-20T09:00:00Z" }, // scoreless, excluded regardless of count
    { game_type: "magic_video", correct: true, recorded_at: "2026-07-20T09:00:00Z" }, // retired id, not in ACTIVITY_LABELS
  ];
  const result = computeAccuracyByActivity(rows, NOW, 30);
  expect(result).toEqual([
    { gameType: "word_match", label: "Tap & Hear", attempts: 6, correct: 3, accuracy: 50 },
  ]);
});

test("computeAccuracyByActivity excludes rows older than the 30-day window", () => {
  const rows = Array.from({ length: 6 }, () => ({
    game_type: "word_match",
    correct: true,
    recorded_at: "2026-01-01T09:00:00Z",
  }));
  const result = computeAccuracyByActivity(rows, NOW, 30);
  expect(result).toEqual([]);
});

test("computeResponseTimeTrend takes the median of correct answers only, excluding >30s outliers", () => {
  const rows = [
    { correct: true, response_time_ms: 1000, recorded_at: "2026-07-20T09:00:00Z" },
    { correct: true, response_time_ms: 2000, recorded_at: "2026-07-20T09:01:00Z" },
    { correct: true, response_time_ms: 3000, recorded_at: "2026-07-20T09:02:00Z" },
    { correct: false, response_time_ms: 500, recorded_at: "2026-07-20T09:03:00Z" }, // wrong, excluded
    { correct: true, response_time_ms: 45000, recorded_at: "2026-07-20T09:04:00Z" }, // >30s outlier, excluded
  ];
  const weeks = computeResponseTimeTrend(rows, NOW, 8);
  expect(weeks[weeks.length - 1].medianSeconds).toBe(2); // median of [1000,2000,3000]ms = 2000ms = 2s
});

test("computeResponseTimeTrend returns null for a week with no qualifying data", () => {
  const weeks = computeResponseTimeTrend([], NOW, 8);
  expect(weeks.every((w) => w.medianSeconds === null)).toBe(true);
});

test("computeReviewForecast buckets nextReviewAt into a 14-day forward window", () => {
  const words = [
    { nextReviewAt: "2026-07-21T12:00:00Z" }, // tomorrow
    { nextReviewAt: "2026-07-21T20:00:00Z" }, // same local day, different hour
    { nextReviewAt: "2026-08-15T12:00:00Z" }, // outside the 14-day window
    { nextReviewAt: null }, // never reviewed, excluded
  ];
  const forecast = computeReviewForecast(words, NOW, 14);
  expect(forecast).toHaveLength(14);
  expect(forecast[1].count).toBe(2); // index 1 = tomorrow
  expect(forecast.reduce((sum, d) => sum + d.count, 0)).toBe(2);
});

test("computeUnitProgress covers all 18 units and uses isRealMastery, not raw mastery>=80", () => {
  const words = [
    { unit: 1, mastery: 100, attemptCount: 1 }, // 100% but only 1 attempt -> NOT real mastery
    { unit: 1, mastery: 90, attemptCount: 5 }, // real mastery
    { unit: 2, mastery: 50, attemptCount: 5 },
  ];
  const units = computeUnitProgress(words, 18);
  expect(units).toHaveLength(18);
  const unit1 = units.find((u) => u.unit === 1);
  const unit2 = units.find((u) => u.unit === 2);
  const unit5 = units.find((u) => u.unit === 5);
  expect(unit1).toEqual({ unit: 1, mastered: 1, total: 2 });
  expect(unit2).toEqual({ unit: 2, mastered: 0, total: 1 });
  expect(unit5).toEqual({ unit: 5, mastered: 0, total: 0 }); // empty unit still present
});
