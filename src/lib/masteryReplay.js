// Pure replay of a word's learning_events into the same cumulative
// mastery formula useSaveWordProgressMutation uses (src/lib/queries/
// wordProgress.js) — word_progress stores only CURRENT state, no
// `mastered_at` column (and docs/FEAT_PARENT_METRICS_R1.md rule 1
// forbids adding one), so "the week a word was first really mastered"
// (chart 1) has to be reconstructed from the event stream itself.
//
// Purity requires that mastery is a deterministic function of the
// ordered event stream alone (no decay, no hidden server state) — proven
// against real seeded data in tests/mastery-replay.spec.js, which
// replays real learning_events rows and asserts the result matches the
// actual stored word_progress row those same events produced.
import { isRealMastery } from './masteryCalibration';

// `events` must be chronologically sorted ascending (caller's
// responsibility — this function has no clock/DB access, so it can't
// sort by anything but what it's given). Each event: { correct, recordedAt }.
export function replayMasteryForWord(events) {
  let attemptCount = 0;
  let correctCount = 0;
  let masteryCrossedAt = null;

  for (const event of events) {
    attemptCount += 1;
    if (event.correct) correctCount += 1;
    const mastery = Math.round((correctCount / attemptCount) * 100);
    if (masteryCrossedAt === null && isRealMastery(mastery, attemptCount)) {
      masteryCrossedAt = event.recordedAt;
    }
  }

  const mastery = attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 0;
  return { attemptCount, correctCount, mastery, masteryCrossedAt };
}

// Takes raw learning_events rows (any order, mixed words) for one child,
// groups by word, sorts each group chronologically, and returns the
// mastery-crossing timestamp per word that actually crossed. Rows need
// { word, correct, recorded_at } (the exact shape a Supabase select on
// learning_events returns — kept snake_case here rather than normalizing,
// so callers can pass the query result straight through).
export function computeMasteryCrossings(learningEventsRows) {
  const byWord = new Map();
  for (const row of learningEventsRows) {
    if (!byWord.has(row.word)) byWord.set(row.word, []);
    byWord.get(row.word).push(row);
  }

  const crossings = [];
  for (const [word, rows] of byWord) {
    const sorted = [...rows].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    const events = sorted.map((r) => ({ correct: r.correct, recordedAt: r.recorded_at }));
    const { masteryCrossedAt } = replayMasteryForWord(events);
    if (masteryCrossedAt) crossings.push({ word, masteryCrossedAt });
  }
  return crossings;
}
