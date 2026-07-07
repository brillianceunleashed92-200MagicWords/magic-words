// Extracted (not duplicated — docs/FEAT_PARENT_METRICS_R1.md rule 2) from
// two call sites that couldn't be imported directly by a plain Node/
// Playwright test: `isRealMastery` lived only inside PlayScreen.jsx, and
// `SCORELESS_GAME_TYPES` only inside questProgress.js — both files
// transitively import supabaseClient.js, which reads import.meta.env and
// fails outside Vite. This module has zero imports, so it's safe for both
// the browser bundle and a plain Node test to import directly.

// A brand-new word's very first correct answer computes to 100% mastery
// under the cumulative-accuracy formula (correct_count/attempt_count —
// 1/1 = 100%), so gating "mastered" on raw mastery crossing 80% alone
// fires on nearly every answer during initial vocabulary learning.
// Requiring a minimum attempt count before "real" mastery counts directly
// addresses "one tap != mastery" without touching the stored mastery
// formula itself (word_progress.mastery, Word Galaxy, unit-lock checks
// all still read the raw value and are out of scope here).
export const MASTERED_THRESHOLD = 80;
export const MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION = 3;

export function isRealMastery(mastery, attemptCount) {
  return mastery >= MASTERED_THRESHOLD && (attemptCount ?? 0) >= MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION;
}

// Activities with no real pass/fail outcome — their onAnswer always
// reports `correct: true` unconditionally. See questProgress.js for the
// full per-activity rationale; kept here verbatim since both files need
// the exact same set.
export const SCORELESS_GAME_TYPES = new Set(['draw_it', 'word_builder']);

// Same client-local "today" boundary questProgress.js's
// useTodayWordActivityQuery already uses (`new Date(); setHours(0,0,0,0)`)
// — the parent-metrics heatmap must bucket by the same day convention,
// not a different one (e.g. UTC), or a practice session near midnight
// could land on a different day in the heatmap than it did in the quest
// path's "done today" check.
export function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
