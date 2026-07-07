// Pure derivations for the 6 Parent Metrics charts (docs/FEAT_PARENT_METRICS_R1.md
// Phase 2). Dependency-free (only imports from other dependency-free lib
// modules) so these are directly unit-testable via Playwright's plain
// Node-loading test pattern, same as masteryReplay.js.
import { isRealMastery, SCORELESS_GAME_TYPES, startOfLocalDay } from './masteryCalibration';
import { computeMasteryCrossings } from './masteryReplay';
import { ACTIVITY_LABELS } from './activityLabels';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Rolling 7-day buckets counted back from `now`, NOT calendar weeks —
// avoids Sunday/Monday-anchoring ambiguity and matches "last 8 weeks"
// framing as "the 8 most recent 7-day windows." weeksAgo 0 = the 7 days
// ending today.
function weeksAgo(dateLike, now) {
  const startToday = startOfLocalDay(now);
  const startDate = startOfLocalDay(new Date(dateLike));
  const diffDays = Math.round((startToday - startDate) / MS_PER_DAY);
  return Math.floor(diffDays / 7);
}

function weekStartLabel(weeksAgoValue, now) {
  const startToday = startOfLocalDay(now);
  const start = new Date(startToday.getTime() - (weeksAgoValue * 7 + 6) * MS_PER_DAY);
  return start.toISOString().slice(0, 10);
}

// Chart 1 — weekly counts of first-isRealMastery crossings, last 8 weeks.
// Requires the full fetched learning_events window (not just the last 8
// weeks of it) because a crossing this week can only be identified by
// replaying a word's entire fetched event history — replaying a truncated
// slice would undercount attempt_count/correct_count for words whose
// practice started earlier in the fetch window.
//
// FEAT_PEDAGOGY_CALIBRATION_R1 Phase 6 (Package A coupling) — truncation
// guard: even with the full 84-day fetch, a word whose practice genuinely
// started MORE than 84 days ago has its earlier history cut off by the
// fetch window itself. Replaying only the in-window events for such a
// word can produce a false "crossing" — really just a later REVIEW of a
// word mastered long before the window began, misread as a first-time
// crossing. `words` (the same merged useCandyGalaxyData() shape charts
// 5/6 already use, carrying the REAL all-time stored attemptCount/
// correctCount) lets this be caught: if the replay's final counts don't
// exactly match the real stored row, the window truncated this word's
// history, so the "crossing" is discarded rather than risk a false
// positive. Honest direction of error: this makes chart 1 slightly
// UNDER-count the rare word that began just before the window and
// genuinely crossed inside it (indistinguishable, from inside this
// function, from a truncated review sequence) — under-counting a real
// metric is preferable to over-counting a fake one.
export function computeWeeklyMasteryCrossings(learningEventsRows, words = [], now = new Date(), weeksBack = 8) {
  const crossings = computeMasteryCrossings(learningEventsRows);
  const storedByWord = new Map(words.map((w) => [w.word, w]));
  const buckets = new Map();
  for (let i = 0; i < weeksBack; i++) buckets.set(i, 0);

  for (const { word, masteryCrossedAt, attemptCount, correctCount } of crossings) {
    const stored = storedByWord.get(word);
    if (stored && (stored.attemptCount !== attemptCount || stored.correctCount !== correctCount)) {
      continue; // truncated window -- likely a re-cross of a long-mastered word's later review, not a genuine first crossing
    }
    const wa = weeksAgo(masteryCrossedAt, now);
    if (wa >= 0 && wa < weeksBack) buckets.set(wa, buckets.get(wa) + 1);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0]) // oldest first
    .map(([wa, count]) => ({ weekStart: weekStartLabel(wa, now), count }));
}

// Chart 2 — 12-week calendar heatmap, intensity = ALL learning_events count
// per client-local day (including retired/scoreless game types — this
// chart measures "did they show up," not "did they perform").
export function computeHeatmapData(learningEventsRows, now = new Date(), daysBack = 84) {
  const counts = new Map();
  for (const row of learningEventsRows) {
    const day = startOfLocalDay(new Date(row.recorded_at)).toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const startToday = startOfLocalDay(now);
  const days = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(startToday.getTime() - i * MS_PER_DAY);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return days;
}

// Chart 3 — 30-day accuracy per game_type, excluding SCORELESS_GAME_TYPES
// and ids absent from ACTIVITY_DEFS (e.g. historical magic_video), hiding
// activities with <5 attempts (too little data to be a fair number).
export function computeAccuracyByActivity(learningEventsRows, now = new Date(), daysBack = 30) {
  const since = startOfLocalDay(now).getTime() - (daysBack - 1) * MS_PER_DAY;
  const byActivity = new Map();

  for (const row of learningEventsRows) {
    const t = new Date(row.recorded_at).getTime();
    if (t < since) continue;
    if (SCORELESS_GAME_TYPES.has(row.game_type)) continue;
    if (!(row.game_type in ACTIVITY_LABELS)) continue;
    const entry = byActivity.get(row.game_type) ?? { attempts: 0, correct: 0 };
    entry.attempts += 1;
    if (row.correct) entry.correct += 1;
    byActivity.set(row.game_type, entry);
  }

  return Array.from(byActivity.entries())
    .filter(([, { attempts }]) => attempts >= 5)
    .map(([gameType, { attempts, correct }]) => ({
      gameType,
      label: ACTIVITY_LABELS[gameType],
      attempts,
      correct,
      accuracy: Math.round((correct / attempts) * 100),
    }));
}

// Chart 4 — weekly MEDIAN response_time_ms (correct answers only,
// excluding >30s outliers — a child walking away mid-question isn't a
// "slow answer"), last 8 weeks, returned in seconds.
export function computeResponseTimeTrend(learningEventsRows, now = new Date(), weeksBack = 8) {
  const OUTLIER_MS = 30 * 1000;
  const byWeek = new Map();
  for (let i = 0; i < weeksBack; i++) byWeek.set(i, []);

  for (const row of learningEventsRows) {
    if (!row.correct) continue;
    if (row.response_time_ms == null) continue;
    if (row.response_time_ms > OUTLIER_MS) continue;
    const wa = weeksAgo(row.recorded_at, now);
    if (wa >= 0 && wa < weeksBack) byWeek.get(wa).push(row.response_time_ms);
  }

  return Array.from(byWeek.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([wa, times]) => ({
      weekStart: weekStartLabel(wa, now),
      medianSeconds: times.length ? Math.round(median(times)) / 1000 : null,
    }));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Chart 5 — 14-day review-due forecast. next_review_at is already the
// precomputed due date (same field api/session-generator.js reads
// directly, with no server-side rung recomputation — see Phase 0 recon),
// so this needs no Star Keeper ladder derivation, just a bucket-by-day
// count of already-known due dates. `words` is the merged shape from
// useCandyGalaxyData() (word.nextReviewAt), not a raw word_progress row.
export function computeReviewForecast(words, now = new Date(), daysForward = 14) {
  const startToday = startOfLocalDay(now);
  const counts = new Map();
  for (let i = 0; i < daysForward; i++) {
    const d = new Date(startToday.getTime() + i * MS_PER_DAY);
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const w of words) {
    if (!w.nextReviewAt) continue;
    const day = startOfLocalDay(new Date(w.nextReviewAt)).toISOString().slice(0, 10);
    if (counts.has(day)) counts.set(day, counts.get(day) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

// Chart 6 — per-unit isRealMastery-words/total, units 1-18, ALL visible
// including locked/premium units (existing upsell affordance — don't hide
// what a Family Plan unlocks). `words` is the merged useCandyGalaxyData()
// shape (word.mastery, word.attemptCount already present per word).
export function computeUnitProgress(words, totalUnits = 18) {
  const byUnit = new Map();
  for (let u = 1; u <= totalUnits; u++) byUnit.set(u, { unit: u, mastered: 0, total: 0 });

  for (const w of words) {
    const bucket = byUnit.get(w.unit);
    if (!bucket) continue;
    bucket.total += 1;
    if (isRealMastery(w.mastery, w.attemptCount)) bucket.mastered += 1;
  }

  return Array.from(byUnit.values());
}
