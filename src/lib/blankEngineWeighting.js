// src/lib/blankEngineWeighting.js
// FEAT_BLANK_ENGINE_R1 — pure, framework-free selection-weighting rules for
// the two Dr. Blank fidelity gaps this run closes. Zero imports (same
// reasoning as src/lib/masteryCalibration.js: safe for both the browser
// bundle and a plain Node test to import directly). The actual candidate
// pool is built server-side (api/session-generator.js, which needs live
// Supabase data these pure functions don't have) — that file carries a
// literal mirrored copy of the two constants below (same
// check-script-guarded mirroring convention as MASTERED_THRESHOLD /
// isRealMastery, extended rather than forked per
// docs/PEDAGOGY_CALIBRATION_REPORT.md's NOTES FOR PACKAGE C — a CommonJS
// Vercel function can't safely require() an ES module here for the same
// unverified-Vercel-Node-version reason documented there).
// scripts/check-blank-engine-weighting-sync.mjs asserts the two files'
// constants stay numerically identical.

// ─── Gap 1: function words are universal ───────────────────────────────────
// Dr. Blank: struggling readers break on function words, so they're never
// skipped by unit placement. The placement floor still gates CONTENT words
// — this is the one function-word exception. Kept small ("low frequency")
// rather than flooding a session with old vocabulary — spaced review
// already exists for real reinforcement; this exemption's job is just to
// make sure a below-floor function word is never permanently unreachable.
export const BELOW_FLOOR_FUNCTION_SAMPLE_SIZE = 1;

// `words` shape: { word, word_type, unit, isMastered }. Returns the subset
// eligible for the exemption: function-type, strictly below the effective
// floor, and not already mastered (a mastered function word doesn't need
// the exemption — it already surfaces via the normal mastered-sample path).
// Random sampling down to BELOW_FLOOR_FUNCTION_SAMPLE_SIZE is left to the
// caller (kept out of this pure function so tests can assert eligibility
// independent of RNG).
export function eligibleBelowFloorFunctionWords(words, effectiveFloor) {
  if (!effectiveFloor) return [];
  return words.filter((w) => w.word_type === 'function' && w.unit < effectiveFloor && !w.isMastered);
}

// ─── Gap 2: mastered content words recede ───────────────────────────────────
// Dr. Blank: mastery is the reward, not maximum repetition. Function words
// are exempt from damping — they're universal and never recede (gap 1
// above already establishes they must never be skipped at all). Weighting
// rule: a mastered word's inclusion chance in the normal-mix confidence
// sample is MASTERED_CONTENT_INCLUSION_WEIGHT for content words, 1.0
// (always) for function words. Applied as a pre-shuffle filter, so over
// many sessions a mastered content word surfaces at roughly that fraction
// of the rate of an equally-mastered function word (or of its own past
// rate, pre-this-run). A word is never excluded outright — spaced review
// still applies (architecture note (a): "a mastered content word still
// appears... just at reduced frequency"). Conservative v1; WEEKLY_INSIGHTS
// can propose a different multiplier once real accuracy/engagement data
// exists.
export const MASTERED_CONTENT_INCLUSION_WEIGHT = 0.35;

// `masteredWords` shape: { word, word_type, ... } (already known-mastered
// by the caller). `rng` is injectable (defaults to Math.random) so tests
// can assert exact inclusion/exclusion without flakiness — production
// always uses the default.
export function applyMasteredContentDamping(masteredWords, rng = Math.random) {
  return masteredWords.filter((w) => w.word_type === 'function' || rng() < MASTERED_CONTENT_INCLUSION_WEIGHT);
}
