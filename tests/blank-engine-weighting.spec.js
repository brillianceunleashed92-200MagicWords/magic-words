import { test, expect } from "@playwright/test";
import {
  eligibleBelowFloorFunctionWords,
  applyMasteredContentDamping,
  BELOW_FLOOR_FUNCTION_SAMPLE_SIZE,
  MASTERED_CONTENT_INCLUSION_WEIGHT,
} from "../src/lib/blankEngineWeighting.js";

// FEAT_BLANK_ENGINE_R1 Phases 2 & 3 — the two selection-weighting rules
// live only in api/session-generator.js's selectCandidateWords, which
// needs live Supabase data and isn't independently reachable locally
// (local dev serves no /api routes — see docs/BLANK_ENGINE_REPORT.md's
// "local-dev testability constraint" and the precedent it follows,
// tests/session-plan-fallback.spec.js + src/lib/sessionPlanFallbackUnit.js).
// These are plain Node assertions against the extracted PURE functions the
// server mirrors — no browser/page, no Supabase mocking required. The
// server's live behavior (the mirrored copy) is additionally confirmed in
// the production walk (Phase 6 of the report).

function word(overrides) {
  return { word: "w", word_type: "content", unit: 1, mastery: 0, attemptCount: 0, isMastered: false, ...overrides };
}

test("below-floor function word (unmastered) is eligible for the exemption", () => {
  const words = [word({ word: "the", word_type: "function", unit: 11 })];
  expect(eligibleBelowFloorFunctionWords(words, 15)).toHaveLength(1);
  expect(eligibleBelowFloorFunctionWords(words, 15)[0].word).toBe("the");
});

test("function word AT or ABOVE the floor is not eligible (already reachable normally)", () => {
  const atFloor = [word({ word: "can", word_type: "function", unit: 15 })];
  const aboveFloor = [word({ word: "may", word_type: "function", unit: 18 })];
  expect(eligibleBelowFloorFunctionWords(atFloor, 15)).toHaveLength(0);
  expect(eligibleBelowFloorFunctionWords(aboveFloor, 15)).toHaveLength(0);
});

test("CONTENT word below the floor is never eligible — content-word gating is untouched", () => {
  const words = [word({ word: "cat", word_type: "noun", unit: 1 })];
  expect(eligibleBelowFloorFunctionWords(words, 15)).toHaveLength(0);
});

test("already-mastered below-floor function word is not eligible — it already surfaces via the mastered sample", () => {
  const words = [word({ word: "the", word_type: "function", unit: 11, isMastered: true })];
  expect(eligibleBelowFloorFunctionWords(words, 15)).toHaveLength(0);
});

test("no floor (unplaced child) yields no exemption candidates", () => {
  const words = [word({ word: "the", word_type: "function", unit: 11 })];
  expect(eligibleBelowFloorFunctionWords(words, null)).toHaveLength(0);
});

test("BELOW_FLOOR_FUNCTION_SAMPLE_SIZE is a small, deliberate number (low frequency, not a flood)", () => {
  expect(BELOW_FLOOR_FUNCTION_SAMPLE_SIZE).toBe(1);
});

test("mastered damping: function words always pass regardless of rng draw", () => {
  const words = [word({ word: "the", word_type: "function" }), word({ word: "and", word_type: "function" })];
  const alwaysFail = () => 0.999; // higher than any weight < 1
  expect(applyMasteredContentDamping(words, alwaysFail)).toHaveLength(2);
});

test("mastered damping: content words pass only when rng draw is under the weight", () => {
  const words = [word({ word: "cat", word_type: "noun" })];
  expect(applyMasteredContentDamping(words, () => 0)).toHaveLength(1); // 0 < weight, passes
  expect(applyMasteredContentDamping(words, () => 0.999)).toHaveLength(0); // 0.999 >= weight, damped out
});

test("mastered damping is never a hard exclusion — a mastered content word still appears at the configured weight, not 0", () => {
  expect(MASTERED_CONTENT_INCLUSION_WEIGHT).toBeGreaterThan(0);
  expect(MASTERED_CONTENT_INCLUSION_WEIGHT).toBeLessThan(1);
});

test("mastered damping over many draws lands close to the configured weight (statistical sanity, real Math.random)", () => {
  const words = Array.from({ length: 2000 }, (_, i) => word({ word: `c${i}`, word_type: "noun" }));
  const included = applyMasteredContentDamping(words); // default rng = Math.random
  const rate = included.length / words.length;
  expect(rate).toBeGreaterThan(MASTERED_CONTENT_INCLUSION_WEIGHT - 0.08);
  expect(rate).toBeLessThan(MASTERED_CONTENT_INCLUSION_WEIGHT + 0.08);
});
