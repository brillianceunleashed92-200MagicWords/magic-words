import { test, expect } from "@playwright/test";
import { replayMasteryForWord, computeMasteryCrossings } from "../src/lib/masteryReplay.js";

// FEAT_PARENT_METRICS_R1 Phase 1 — purity proof for the mastery-crossing
// replay util. The all-correct branch (crosses at attempt 3, stays crossed)
// is proven against real seeded production gameplay in
// docs/PARENT_METRICS_REPORT.md rather than here — these synthetic cases
// cover what real gameplay didn't exercise: the incorrect-answer branch
// (WordMatch's errorless-scaffold means a real "wrong" event is hard to
// produce deliberately) and the never-crosses case.

test("never crosses when attempt_count stays below 3, even at 100% mastery", () => {
  const events = [
    { correct: true, recordedAt: "2026-07-01T10:00:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:01:00Z" },
  ];
  const result = replayMasteryForWord(events);
  expect(result).toEqual({
    attemptCount: 2,
    correctCount: 2,
    mastery: 100,
    masteryCrossedAt: null,
  });
});

test("crosses exactly at the attempt where mastery >= 80 and attempts >= 3", () => {
  const events = [
    { correct: true, recordedAt: "2026-07-01T10:00:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:01:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:02:00Z" },
  ];
  const result = replayMasteryForWord(events);
  expect(result.masteryCrossedAt).toBe("2026-07-01T10:02:00Z");
  expect(result.mastery).toBe(100);
});

test("a wrong answer can suppress crossing at attempt 3 by dropping mastery below 80", () => {
  const events = [
    { correct: true, recordedAt: "2026-07-01T10:00:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:01:00Z" },
    { correct: false, recordedAt: "2026-07-01T10:02:00Z" },
  ];
  const result = replayMasteryForWord(events);
  // 2/3 = 66.67% -> rounds to 67, below the 80 threshold
  expect(result.mastery).toBe(67);
  expect(result.masteryCrossedAt).toBeNull();
});

test("crossing only fires once, at the first attempt the threshold is met", () => {
  const events = [
    { correct: false, recordedAt: "2026-07-01T10:00:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:01:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:02:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:03:00Z" },
    { correct: true, recordedAt: "2026-07-01T10:04:00Z" },
  ];
  const result = replayMasteryForWord(events);
  // attempt 1: 0/1=0%% no. attempt2: 1/2=50%. attempt3: 2/3=67%, below 80.
  // attempt4: 3/4=75%, below 80. attempt5: 4/5=80%, attempts>=3 -> crosses.
  expect(result.masteryCrossedAt).toBe("2026-07-01T10:04:00Z");
  expect(result.attemptCount).toBe(5);
});

test("computeMasteryCrossings groups mixed-word rows and only returns words that crossed", () => {
  const rows = [
    { word: "cat", correct: true, recorded_at: "2026-07-01T10:00:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-01T10:01:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-01T10:02:00Z" },
    { word: "dog", correct: true, recorded_at: "2026-07-01T10:00:00Z" },
    { word: "dog", correct: true, recorded_at: "2026-07-01T10:01:00Z" },
  ];
  const crossings = computeMasteryCrossings(rows);
  expect(crossings).toEqual([{ word: "cat", masteryCrossedAt: "2026-07-01T10:02:00Z", attemptCount: 3, correctCount: 3 }]);
});

test("computeMasteryCrossings sorts out-of-order rows before replaying", () => {
  const rows = [
    { word: "cat", correct: true, recorded_at: "2026-07-01T10:02:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-01T10:00:00Z" },
    { word: "cat", correct: true, recorded_at: "2026-07-01T10:01:00Z" },
  ];
  const crossings = computeMasteryCrossings(rows);
  expect(crossings).toEqual([{ word: "cat", masteryCrossedAt: "2026-07-01T10:02:00Z", attemptCount: 3, correctCount: 3 }]);
});
