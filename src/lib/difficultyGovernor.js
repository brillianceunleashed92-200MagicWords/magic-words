// The Difficulty Governor (200MW_Product_Blueprint.md 3.3): target a 75–85%
// rolling success rate. v1, client-side only — logs each session's result
// to localStorage and uses the rolling rate to bias which activity is
// suggested first next time: below 75% → suggest the least-demanding
// activity (Tap & Hear); above 85% → suggest Quiz Boss (the hardest, unit
// mastery gate) early. This does not yet change question templates *within*
// a session (that would require touching /api/session-generator's prompt
// construction — flagged as a Phase-1-plus follow-up, not silently skipped).
const LOG_KEY = 'mw_difficulty_governor_log_v1';
const ROLLING_WINDOW = 5; // last N sessions

export function logSessionResult({ wordsCorrect, totalWords }) {
  if (!totalWords) return;
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    log.push({ wordsCorrect, totalWords, at: Date.now() });
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-ROLLING_WINDOW)));
  } catch {
    // localStorage unavailable — governor just has no history, not fatal
  }
}

export function getRollingSuccessRate() {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    if (!log.length) return null;
    const correct = log.reduce((sum, s) => sum + s.wordsCorrect, 0);
    const total = log.reduce((sum, s) => sum + s.totalWords, 0);
    return total ? correct / total : null;
  } catch {
    return null;
  }
}

// Below 75%: gentler, self-paced or recognition-only activities (no
// production/spelling demand). Above 85%: activities with a production or
// mastery-gate demand, to advance faster. Extended to span all 10
// activity types (Step 2) — the pools are a starting split, easy to
// retune from one place as real usage data comes in.
const EASIER_POOL = ['word_match', 'sound_match', 'word_hunt', 'draw_it', 'word_song', 'magic_video'];
const HARDER_POOL = ['flash_cards', 'word_builder', 'story_builder', 'spell_it_out', 'say_it'];

// Returns a suggested game id to highlight first in the activity picker,
// or null if there isn't enough history yet to have an opinion.
export function suggestActivity(rollingRate) {
  if (rollingRate == null) return null;
  if (rollingRate < 0.75) return EASIER_POOL[0]; // Tap & Hear — least demanding
  if (rollingRate > 0.85) return HARDER_POOL[0]; // Quiz Boss — advance early
  return null; // in the flow channel — no override, let the child choose
}
