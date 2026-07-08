// FIX_CELEBRATION_R1 Phase 3(c) — at most one wordMastered ignition per
// (child, word) per calendar day. A word's cumulative mastery % can drop
// below 80 after a later miss and cross back above it again the same day
// (mastery is a running correct/attempt ratio, not a one-way ratchet), so
// the plain wasMasteredBefore/isMasteredNow check alone can legitimately
// re-fire more than once in a single day for the same word — this caps
// that at the UI layer without touching the stored mastery formula or
// requiring a migration. localStorage (not a DB column) deliberately:
// this is a presentation-rate-limit, not data the server or any other
// device needs to agree on.
const PREFIX = 'mw:celebrated:';

function todayKey(childId, word) {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local clock via toISOString is fine for a once-a-day cap
  return `${PREFIX}${childId}:${word}:${day}`;
}

export function hasCelebratedToday(childId, word) {
  if (typeof localStorage === 'undefined' || !childId) return false;
  try {
    return localStorage.getItem(todayKey(childId, word)) === '1';
  } catch {
    return false; // storage unavailable (private mode, quota) — never block a real celebration over this
  }
}

export function markCelebratedToday(childId, word) {
  if (typeof localStorage === 'undefined' || !childId) return;
  try {
    localStorage.setItem(todayKey(childId, word), '1');
  } catch {
    // storage unavailable — nothing to do, worst case is an extra fire
  }
}
