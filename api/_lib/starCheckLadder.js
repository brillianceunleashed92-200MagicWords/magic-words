// api/_lib/starCheckLadder.js — signed stateless progress token for The
// Star Check, under its OWN signing context ('star-check-v1') so a token
// from this flow can never be replayed into placementMode's
// 'placement-ladder-v1' or checkinMode's 'checkin-ladder-v1' branches, or
// vice versa (scripts/idor-proof.mjs asserts this cross-mode isolation).
//
// Deliberately self-contained rather than importing/extending
// api/_lib/placementLadder.js: that file's verifyLadderState() hard-checks
// `typeof state.rungIndex === 'number'`, a shape specific to the
// unit-rung ladder, and placementLadder.js is shared by checkinMode
// (a scope wall for this run) — safer to duplicate the small, well-
// understood HMAC pattern than to touch a file checkinMode depends on.
const crypto = require('crypto');

const STAR_CHECK_CONTEXT = 'star-check-v1';
const STAR_CHECK_MAX_AGE_MS = 15 * 60 * 1000; // generous ceiling, matches placementLadder.js's own budget

function signingKey() {
  return crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(STAR_CHECK_CONTEXT)
    .digest();
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signStarCheckState(state) {
  const payload = JSON.stringify({ ...state, iat: Date.now() });
  const payloadB64 = base64url(Buffer.from(payload, 'utf8'));
  const sig = base64url(crypto.createHmac('sha256', signingKey()).update(payloadB64).digest());
  return `${payloadB64}.${sig}`;
}

// Returns the decoded state, or null if missing/malformed/expired/
// tampered/wrong-child/wrong-context — every caller treats null as
// "start the check over from probe 1," never as an error to surface.
function verifyStarCheckState(token, expectedChildId) {
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
  if (!state || typeof state.levelIndex !== 'number' || typeof state.wordIndex !== 'number' || state.childId !== expectedChildId) return null;
  if (Date.now() - (state.iat ?? 0) > STAR_CHECK_MAX_AGE_MS) return null;
  return state;
}

module.exports = { STAR_CHECK_CONTEXT, signStarCheckState, verifyStarCheckState };
