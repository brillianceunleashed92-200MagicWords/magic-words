// api/_lib/placementLadder.js — Prompt 8: Placement Adventure.
//
// The ladder is short-lived (<=14 questions, target 3-5 minutes) and
// explicitly non-resumable (abandon = start over, never resume) — it
// doesn't need to survive a server restart or be queryable mid-flight.
// A signed, stateless token round-tripped by the client avoids a table/
// row lifecycle (create, update per rung, clean up abandoned attempts)
// for state that's read once per round-trip and discarded for good the
// moment the ladder finalizes or the child walks away. This is the
// "signed ladder state" option from the mission's "assess the cleanest
// shape (stateful rows vs. signed ladder state round-tripped)" — chosen
// over a table specifically because "resumable never" removes the one
// reason a table would earn its keep (recovering an in-progress attempt).
//
// SECURITY: the token is HMAC-signed so the client can carry it (it has
// to, statelessly) without being able to forge "I already passed rung 8"
// from a fresh start, or claim more/fewer correct answers than it
// actually reported. Verified server-side on every call; a bad signature
// or an expired token restarts the ladder at rung 0 rather than trusting
// anything in it. Signing key is HMAC-derived from
// SUPABASE_SERVICE_ROLE_KEY under a fixed context string rather than
// using that secret directly as HMAC key material — a compromise of this
// derived key (e.g. a bug in this file) doesn't hand over the service-
// role secret itself.
const crypto = require('crypto');

const RUNGS = [1, 3, 5, 7, 9, 12, 15, 18];
const LADDER_MAX_AGE_MS = 15 * 60 * 1000; // generous ceiling well past the ~3-5min target

function signingKey() {
  return crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update('placement-ladder-v1')
    .digest();
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signLadderState(state) {
  const payload = JSON.stringify({ ...state, iat: Date.now() });
  const payloadB64 = base64url(Buffer.from(payload, 'utf8'));
  const sig = base64url(crypto.createHmac('sha256', signingKey()).update(payloadB64).digest());
  return `${payloadB64}.${sig}`;
}

// Returns the decoded state object, or null if missing/malformed/expired/
// tampered/childId-mismatched — every caller treats null as "start over
// at rung 0," never as an error to surface, since a forged or stale token
// should just look like a fresh ladder, not a way to short-circuit it.
function verifyLadderState(token, expectedChildId) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const expectedSig = base64url(crypto.createHmac('sha256', signingKey()).update(payloadB64).digest());
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  let state;
  try {
    state = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
  if (!state || typeof state.rungIndex !== 'number' || state.childId !== expectedChildId) return null;
  if (Date.now() - (state.iat ?? 0) > LADDER_MAX_AGE_MS) return null;
  return state;
}

// Picks `count` distinct words from `unit`, mixing mechanics per word
// where the curriculum allows it: has_art (non-function) words get the
// picture->word mechanic (same distractor selection as buildQuiz's
// picture branch — same word_type, same-unit preferred), everything else
// gets the Find the Word mechanic (word audio + hand-curated lookalikes,
// covering all 200 words). Every rung unit has >=8 words in the live
// curriculum, comfortably enough for 2 probes + 1 tiebreak candidate
// without repeats.
function pickRungWords(unit, count, exclude, allWords, artWords, wordMetaByWord, wordsByType) {
  const unitWords = allWords.filter((w) => w.unit === unit && !exclude.includes(w.word));
  const shuffled = [...unitWords].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  return picked.map((w) => {
    const pictureEligible = w.word_type !== 'function' && artWords.includes(w.word);
    if (!pictureEligible) return { word: w.word, mechanic: 'findTheWord' };

    const sameType = (word) => wordMetaByWord.get(word)?.word_type === w.word_type;
    const otherArtWords = artWords.filter((word) => word !== w.word && sameType(word));
    const sameUnit = otherArtWords.filter((word) => wordMetaByWord.get(word)?.unit === w.unit);
    const otherUnit = otherArtWords.filter((word) => wordMetaByWord.get(word)?.unit !== w.unit);
    const distractors = [...sameUnit, ...otherUnit].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...distractors, w.word].sort(() => Math.random() - 0.5);
    return { word: w.word, mechanic: 'picture', options };
  });
}

module.exports = { RUNGS, signLadderState, verifyLadderState, pickRungWords };
