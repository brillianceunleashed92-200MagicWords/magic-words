#!/usr/bin/env node
// Security hardening Phase 2 — proves the RLS/ownership fixes actually
// work by attempting real cross-user access as an authenticated attacker
// and confirming every attempt fails. Not a unit test of policy syntax —
// this hits the real live Supabase project with real signed-in sessions,
// exactly the way a real attacker would.
//
// Requires SUPABASE_SERVICE_ROLE_KEY (to provision/clean up test users)
// and VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (to sign in as them).
// Run: node --env-file=.env.local scripts/idor-proof.mjs
// (also needs SUPABASE_SERVICE_ROLE_KEY in the environment — not in
// .env.local, see tests/smoke.spec.js's header comment for why)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const PASSWORD = 'TestPass!23456';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    console.error(`  FAIL: ${label}`);
    failures++;
  }
}

async function provisionUser(tag) {
  const email = `nextgenprecisiondrones+idor${tag}${Date.now()}@gmail.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const { data: childData, error: childErr } = await admin.from('child_profiles').insert({
    parent_id: data.user.id, name: `Child${tag}`, interests: [],
  }).select().single();
  if (childErr) throw childErr;
  await admin.from('word_progress').insert({
    user_id: data.user.id, child_id: childData.id, word: 'cat', mastery: 42,
  });
  return { userId: data.user.id, email, childId: childData.id };
}

async function cleanup(userId) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log('Provisioning test-user-A, test-user-B, and test-user-C...');
  const a = await provisionUser('A');
  const b = await provisionUser('B');
  // STAR_CHECK_R1: a THIRD identity, fresh 10/min session-generator
  // budget of its own -- by the time the star-check checks run below, A
  // has already spent 7 calls on the placement/checkin forgery checks and
  // B has spent several more driving a real check-in to completion (see
  // B's own provisioning comment). Reusing either would risk starving the
  // new checks partway through (the exact trap the master doc flags).
  const c = await provisionUser('C');

  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signInA, error: signInErrA } = await clientA.auth.signInWithPassword({ email: a.email, password: PASSWORD });
  if (signInErrA) throw signInErrA;
  const tokenA = signInA.session.access_token;

  // FEAT_PLACEMENT_CHECKIN_R1: B's own token, used only for the "drive a
  // real check-in to completion" positive-twin flow below -- A's token
  // has already spent several session-generator calls on the forgery
  // checks above (rate limit is 10/min per authenticated user), and B's
  // has spent zero (every earlier B-targeting call above authenticates as
  // A, attacking B's data -- B's own identity was never used).
  const clientB = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signInB, error: signInErrB } = await clientB.auth.signInWithPassword({ email: b.email, password: PASSWORD });
  if (signInErrB) throw signInErrB;
  const tokenB = signInB.session.access_token;

  const clientC = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signInC, error: signInErrC } = await clientC.auth.signInWithPassword({ email: c.email, password: PASSWORD });
  if (signInErrC) throw signInErrC;
  const tokenC = signInC.session.access_token;

  console.log('\nAttempting cross-user access as A, targeting B\'s data:\n');

  // 1. Direct table read: A's client reading B's word_progress by child_id.
  const { data: wpData } = await clientA.from('word_progress').select('*').eq('child_id', b.childId);
  check('word_progress: A cannot read B\'s rows via child_id', (wpData?.length ?? 0) === 0);

  // 2. Direct table read: A's client reading B's word_progress by user_id.
  const { data: wpByUser } = await clientA.from('word_progress').select('*').eq('user_id', b.userId);
  check('word_progress: A cannot read B\'s rows via user_id', (wpByUser?.length ?? 0) === 0);

  // 3. Direct table read: A's client reading B's child_profiles.
  const { data: cpData } = await clientA.from('child_profiles').select('*').eq('id', b.childId);
  check('child_profiles: A cannot read B\'s child profile', (cpData?.length ?? 0) === 0);

  // 4. Direct table write: A attempts to insert word_progress for B's child.
  const { error: wpWriteErr } = await clientA.from('word_progress').insert({
    user_id: b.userId, child_id: b.childId, word: 'hacked', mastery: 100,
  });
  check('word_progress: A cannot write a row claiming to be B', !!wpWriteErr);

  // 5. earn_sparks RPC: A attempts to credit sparks to B's child.
  const { error: sparksErr } = await clientA.rpc('earn_sparks', { amount: 10, p_child_id: b.childId });
  check('earn_sparks: A cannot credit sparks to B\'s child', !!sparksErr);

  // 6. earn_sparks RPC: A attempts an oversized amount for their OWN child.
  const { error: bigAmountErr } = await clientA.rpc('earn_sparks', { amount: 999999, p_child_id: a.childId });
  check('earn_sparks: A cannot credit an unbounded amount, even to their own child', !!bigAmountErr);

  // 7. create-portal-session / create-checkout-session: only runs against
  // a real deployment (Vercel serverless functions, not the Supabase
  // project itself) — set DEPLOY_BASE_URL to exercise it, e.g.
  // DEPLOY_BASE_URL=https://200magicwordsapp.com node --env-file=.env.local scripts/idor-proof.mjs
  const deployBase = process.env.DEPLOY_BASE_URL;
  if (deployBase) {
    const noAuthRes = await fetch(`${deployBase}/api/create-portal-session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    check('create-portal-session: unauthenticated request rejected (401)', noAuthRes.status === 401);

    // A's own valid token can only ever open A's own portal/checkout now —
    // there's no body field left to target B with. Confirm A's own call
    // succeeds (or fails only for a benign reason like "no Stripe customer
    // on file yet", never a 401/403 on their own identity).
    const ownRes = await fetch(`${deployBase}/api/create-portal-session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` }, body: '{}',
    });
    const ownBody = await ownRes.json().catch(() => ({}));
    check(
      'create-portal-session: A\'s own verified token is accepted (not 401)',
      ownRes.status !== 401 && (ownRes.status === 200 || /no stripe customer/i.test(ownBody.error ?? ''))
    );

    // 8. session-generator (Sprint 2 Part B): A attempts to generate a
    // session plan for B's child by passing B's childId in the body — the
    // endpoint must verify child_profiles.parent_id === the verified
    // caller before touching word_progress/subscriptions, not just trust
    // whatever childId shows up in the request.
    const forgedChildRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: b.childId }),
    });
    check('session-generator: A cannot generate a session plan for B\'s child (403)', forgedChildRes.status === 403);

    // 9. Placement Adventure (Prompt 8): the client must not be able to
    // self-declare a floor, by either path.
    //   (a) a direct column write via the normal client library, on A's
    //       OWN child (legitimate row ownership -- RLS alone would allow
    //       this; the column-level REVOKE in migration 0032 is what
    //       actually blocks it).
    const { error: directPlacementWriteErr } = await clientA
      .from('child_profiles')
      .update({ placement_unit: 18 })
      .eq('id', a.childId);
    check('child_profiles: A cannot write placement_unit directly, even on their own child', !!directPlacementWriteErr);

    //   (b) a forged ladder-state token claiming rung 8 (Unit 18) already
    //       passed, handed to the placement finalization path. A bad/
    //       forged signature must be treated as a fresh start at rung 0,
    //       never as a way to finalize at whatever unit the token claims.
    const forgedLadderState = Buffer.from(JSON.stringify({
      childId: a.childId, rungIndex: 7, lastPassedRungIndex: 7, tiebreak: false, iat: Date.now(),
    })).toString('base64url') + '.forged-signature';
    const forgedFinalizeRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: a.childId, placementMode: true, ladderState: forgedLadderState, answers: [true, true] }),
    });
    const forgedFinalizeBody = await forgedFinalizeRes.json().catch(() => ({}));
    check(
      'session-generator: a forged placement ladder state cannot finalize at an unearned unit',
      forgedFinalizeRes.status === 200 && forgedFinalizeBody.placement?.done === false && forgedFinalizeBody.placement?.rung === 1
    );

    // 9b. FEAT_PLACEMENT_CHECKIN_R1: same forged-token defense, checkinMode
    //     branch — a bad/forged signature must restart the bounded ladder,
    //     never finalize at whatever rung the token claims.
    const forgedCheckinRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: a.childId, checkinMode: true, ladderState: forgedLadderState, answers: [true, true] }),
    });
    const forgedCheckinBody = await forgedCheckinRes.json().catch(() => ({}));
    check(
      'session-generator: a forged check-in ladder state cannot finalize at an unearned unit',
      forgedCheckinRes.status === 200 && forgedCheckinBody.checkin?.done === false
    );

    // 9c. session-generator: A cannot start/advance a check-in for B's child.
    const forgedCheckinChildRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: b.childId, checkinMode: true }),
    });
    check('session-generator: A cannot start a check-in for B\'s child (403)', forgedCheckinChildRes.status === 403);

    // 9d. session-generator historyMode: A cannot read B's growth history.
    const forgedHistoryRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: b.childId, historyMode: true }),
    });
    check('session-generator: A cannot read B\'s growth history (403)', forgedHistoryRes.status === 403);

    // 9e. A REAL, correctly-signed placement token replayed into
    //     checkinMode (cross-mode token confusion) must be rejected —
    //     the two modes sign under different context strings specifically
    //     so this can't work, on top of the ownership/expiry checks both
    //     already share.
    const realPlacementStartRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: a.childId, placementMode: true }),
    });
    const realPlacementStartBody = await realPlacementStartRes.json().catch(() => ({}));
    const realPlacementToken = realPlacementStartBody.placement?.ladderState;
    const crossModeRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: a.childId, checkinMode: true, ladderState: realPlacementToken, answers: [true, true] }),
    });
    const crossModeBody = await crossModeRes.json().catch(() => ({}));
    check(
      'session-generator: a genuine PLACEMENT token replayed into checkinMode is rejected, not honored',
      crossModeRes.status === 200 && crossModeBody.checkin?.done === false
    );

    // 9f. Positive twins (rule 4's "vacuous check" lesson) — the legitimate
    //     path must demonstrably work, not just reject forgeries. Run this
    //     part as B (fresh 10/min session-generator rate-limit budget —
    //     A's has already spent several calls above on the forgery
    //     checks; B's own identity was never used, every earlier
    //     B-targeting call above attacks B's data while authenticated AS
    //     A). B's own check-in starts for real (issues a rung), and —
    //     driven to completion with claimed-correct answers — actually
    //     lands a checkin_completed row with the expected payload shape,
    //     and B's own historyMode read actually returns it.
    const ownCheckinStartRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ childId: b.childId, checkinMode: true }),
    });
    const ownCheckinStartBody = await ownCheckinStartRes.json().catch(() => ({}));
    check(
      'session-generator: B\'s own check-in issues a real rung (positive twin)',
      ownCheckinStartRes.status === 200 && ownCheckinStartBody.checkin?.done === false && Array.isArray(ownCheckinStartBody.checkin?.words)
    );

    let checkinState = ownCheckinStartBody.checkin;
    let checkinFinal = null;
    for (let i = 0; i < 12 && checkinState && !checkinState.done; i++) {
      const answerCount = checkinState.words.length;
      const stepRes = await fetch(`${deployBase}/api/session-generator`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({ childId: b.childId, checkinMode: true, ladderState: checkinState.ladderState, answers: Array(answerCount).fill(true) }),
      });
      const stepBody = await stepRes.json().catch(() => ({}));
      checkinState = stepBody.checkin;
      if (checkinState?.done) checkinFinal = checkinState;
    }
    check('session-generator: driving check-in to completion with claimed-correct answers finalizes (positive twin)', !!checkinFinal);

    // logProductEvent is fire-and-forget (same pattern as every other
    // product_events writer) -- poll rather than a single fixed wait,
    // since a one-shot 800ms sleep was observed to be marginal (passed
    // most runs, failed once) rather than reliably enough ahead of the
    // insert's own landing time.
    let checkinEventRows = [];
    for (let i = 0; i < 6 && checkinEventRows.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const { data } = await admin
        .from('product_events')
        .select('event_type, payload')
        .eq('child_id', b.childId)
        .eq('event_type', 'checkin_completed');
      checkinEventRows = data ?? [];
    }
    check(
      'product_events: B\'s own check-in completion actually lands a checkin_completed row (positive twin, not a vacuous empty-result pass)',
      (checkinEventRows?.length ?? 0) >= 1 && typeof checkinEventRows[0].payload?.rawMeasured === 'number'
    );

    const ownHistoryRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ childId: b.childId, historyMode: true }),
    });
    const ownHistoryBody = await ownHistoryRes.json().catch(() => ({}));
    check(
      'session-generator: B\'s own historyMode read returns real growth-line points (positive twin)',
      ownHistoryRes.status === 200 && Array.isArray(ownHistoryBody.history) && ownHistoryBody.history.some((p) => p.source === 'checkin')
    );

    // 9g-9k. STAR_CHECK_R1: The Star Check, signed under its OWN
    //        'star-check-v1' context (api/_lib/starCheckLadder.js) — run
    //        entirely on C's fresh identity/budget (see provisioning
    //        comment above), never A's or B's.
    const starCheckStartRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ childId: c.childId, starCheckMode: true }),
    });
    const starCheckStartBody = await starCheckStartRes.json().catch(() => ({}));
    check(
      'session-generator: C\'s own Star Check issues a real first probe (positive twin)',
      starCheckStartRes.status === 200 && starCheckStartBody.starCheck?.done === false && starCheckStartBody.starCheck?.level === 1 && starCheckStartBody.starCheck?.wordNumber === 1
    );
    const realStarCheckToken = starCheckStartBody.starCheck?.ladderState;

    // 9g. A forged star-check ladder state (claiming Level 5, word 5
    //     already reached) must restart at Level 1, word 1 — never finalize
    //     at an unearned level.
    const forgedStarCheckState = Buffer.from(JSON.stringify({
      childId: c.childId, levelIndex: 4, wordIndex: 4, phase: 'B', iat: Date.now(),
    })).toString('base64url') + '.forged-signature';
    const forgedStarCheckRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ childId: c.childId, starCheckMode: true, ladderState: forgedStarCheckState, answer: true }),
    });
    const forgedStarCheckBody = await forgedStarCheckRes.json().catch(() => ({}));
    check(
      'session-generator: a forged star-check ladder state cannot finalize at an unearned level',
      forgedStarCheckRes.status === 200 && forgedStarCheckBody.starCheck?.done === false && forgedStarCheckBody.starCheck?.level === 1 && forgedStarCheckBody.starCheck?.wordNumber === 1
    );

    // 9h. session-generator: C cannot start/advance a Star Check for B's child.
    const starCheckCrossChildRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ childId: b.childId, starCheckMode: true }),
    });
    check('session-generator: C cannot start a Star Check for B\'s child (403)', starCheckCrossChildRes.status === 403);

    // 9i. A genuine STAR-CHECK token replayed into placementMode must be
    //     rejected (restarts placement's own ladder at rung 1), not honored.
    const starCheckIntoPlacementRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ childId: c.childId, placementMode: true, ladderState: realStarCheckToken, answers: [true, true] }),
    });
    const starCheckIntoPlacementBody = await starCheckIntoPlacementRes.json().catch(() => ({}));
    check(
      'session-generator: a genuine STAR-CHECK token replayed into placementMode is rejected, not honored',
      starCheckIntoPlacementRes.status === 200 && starCheckIntoPlacementBody.placement?.done === false && starCheckIntoPlacementBody.placement?.rung === 1
    );

    // 9j. The reverse direction: a genuine PLACEMENT token (A's, already
    //     fetched above) replayed into starCheckMode must be rejected —
    //     restarts at Level 1, word 1, never honors A's placement progress.
    const placementIntoStarCheckRes = await fetch(`${deployBase}/api/session-generator`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ childId: a.childId, starCheckMode: true, ladderState: realPlacementToken, answer: true }),
    });
    const placementIntoStarCheckBody = await placementIntoStarCheckRes.json().catch(() => ({}));
    check(
      'session-generator: a genuine PLACEMENT token replayed into starCheckMode is rejected, not honored',
      placementIntoStarCheckRes.status === 200 && placementIntoStarCheckBody.starCheck?.done === false && placementIntoStarCheckBody.starCheck?.level === 1 && placementIntoStarCheckBody.starCheck?.wordNumber === 1
    );

    // 9k. Positive twin: drive C's OWN Star Check to a real two-miss floor
    //     at Level 1 using the untouched real token from the start call
    //     above (claimed-incorrect answers throughout -- both probes of
    //     "kid" then both probes of "girl" -- floors at Level 1 exactly
    //     like the client would after two real misses), and confirm the
    //     finalize write + product_events row actually land with the
    //     expected shape (item-16 lesson: never a vacuous empty-result pass).
    let starCheckState = starCheckStartBody.starCheck;
    let starCheckFinal = null;
    for (let i = 0; i < 6 && starCheckState && !starCheckState.done; i++) {
      const stepRes = await fetch(`${deployBase}/api/session-generator`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
        body: JSON.stringify({ childId: c.childId, starCheckMode: true, ladderState: starCheckState.ladderState, answer: false }),
      });
      const stepBody = await stepRes.json().catch(() => ({}));
      starCheckState = stepBody.starCheck;
      if (starCheckState?.done) starCheckFinal = starCheckState;
    }
    check(
      'session-generator: driving the Star Check to a real two-miss floor with claimed-incorrect answers finalizes at Level 1 (positive twin)',
      !!starCheckFinal && starCheckFinal.floorLevel === 1 && starCheckFinal.trueMeasuredUnit === 1
    );

    // Wider polling window than the check-in positive-twin above --
    // observed live against the branch preview that logProductEvent's
    // fire-and-forget insert (never awaited, same as every other
    // product_events writer) can lag noticeably longer than 3s under the
    // preview's own load/latency, even though the synchronous
    // child_profiles write (checked separately below) always lands
    // immediately. Not a masked bug: verified independently via a
    // standalone script that the write itself is correct and eventually
    // lands every time, just sometimes slower than a short poll allows.
    let starCheckEventRows = [];
    for (let i = 0; i < 20 && starCheckEventRows.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const { data } = await admin
        .from('product_events')
        .select('event_type, payload')
        .eq('child_id', c.childId)
        .eq('event_type', 'placement_completed');
      starCheckEventRows = data ?? [];
    }
    check(
      'product_events: C\'s own Star Check completion lands a placement_completed row with mode:star_check_v1 and per_word detail (positive twin, not vacuous)',
      (starCheckEventRows?.length ?? 0) >= 1
        && starCheckEventRows[0].payload?.mode === 'star_check_v1'
        && starCheckEventRows[0].payload?.floor_level === 1
        && Array.isArray(starCheckEventRows[0].payload?.per_word)
        && starCheckEventRows[0].payload.per_word.length > 0
    );

    const { data: starCheckChildRow } = await admin
      .from('child_profiles')
      .select('measured_unit, placement_unit')
      .eq('id', c.childId)
      .single();
    check(
      'child_profiles: C\'s Star Check floor wrote measured_unit=1 (LEVEL_UNIT_MAP[1])',
      starCheckChildRow?.measured_unit === 1
    );

    // 10. /api/track (Prompt 9 launch analytics): a strict server-side
    //     allowlist of event names/payload keys, and identity comes only
    //     from the verified JWT — a client cannot claim a different
    //     event/user than the one it authenticated as.
    const disallowedEventRes = await fetch(`${deployBase}/api/track`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ eventType: 'not_a_real_event', payload: {} }),
    });
    check('track: disallowed event name is rejected (400)', disallowedEventRes.status === 400);

    const disallowedPayloadKeyRes = await fetch(`${deployBase}/api/track`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ eventType: 'paywall_viewed', payload: { surface: 'dashboard_true_level', freeform: 'anything' } }),
    });
    check('track: disallowed payload key is rejected (400)', disallowedPayloadKeyRes.status === 400);

    // Forged identity: A's token can only ever write a product_events row
    // under A's own verified user_id, even if the request tried to claim
    // otherwise (the endpoint ignores any userId in the body entirely, so
    // there's no field to even attempt this with — confirmed by checking
    // the row this call produces lands under A, never B).
    const trackRes = await fetch(`${deployBase}/api/track`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ eventType: 'paywall_viewed', payload: { surface: 'settings' }, userId: b.userId }),
    });
    check('track: a valid event from A succeeds regardless of a claimed userId in the body (200)', trackRes.status === 200);
    const { data: trackRows } = await admin.from('product_events')
      .select('user_id').eq('event_type', 'paywall_viewed').eq('user_id', a.userId)
      .order('created_at', { ascending: false }).limit(1);
    check('track: the written row lands under A\'s own verified identity, never a claimed one', trackRows?.[0]?.user_id === a.userId);

    const unauthedTrackRes = await fetch(`${deployBase}/api/track`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'paywall_viewed', payload: { surface: 'settings' } }),
    });
    check('track: unauthenticated request rejected (401)', unauthedTrackRes.status === 401);

    // 11. FEAT_PEDAGOGY_CALIBRATION_R1 Phase 5 — track.js's new
    //     scaffold_down event accepts a client-supplied childId (unlike
    //     every other event here, which is child-agnostic). A forged
    //     childId (B's, not A's) must never be trusted — the endpoint
    //     verifies child_profiles.parent_id === the verified caller before
    //     attaching it, same ownership-check pattern as session-generator's
    //     fetchChildContext. The request still succeeds (200) — a bad
    //     childId is a data-quality detail, not a reason to fail the whole
    //     analytics call — but the written row must land with no childId,
    //     never B's.
    const forgedChildTrackRes = await fetch(`${deployBase}/api/track`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ eventType: 'scaffold_down', childId: b.childId, payload: { word: 'cat', activityId: 'word_match' } }),
    });
    check('track: a scaffold_down event with a forged (B\'s) childId still succeeds (200)', forgedChildTrackRes.status === 200);
    const { data: forgedChildRows } = await admin.from('product_events')
      .select('child_id').eq('event_type', 'scaffold_down').eq('user_id', a.userId)
      .order('created_at', { ascending: false }).limit(1);
    check('track: a forged childId (B\'s) is silently dropped, never attached to the written row', forgedChildRows?.[0]?.child_id !== b.childId);

    // A's own real childId IS accepted and attached correctly.
    const ownChildTrackRes = await fetch(`${deployBase}/api/track`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ eventType: 'scaffold_down', childId: a.childId, payload: { word: 'cat', activityId: 'word_match' } }),
    });
    check('track: a scaffold_down event with A\'s own real childId succeeds (200)', ownChildTrackRes.status === 200);
    const { data: ownChildRows } = await admin.from('product_events')
      .select('child_id').eq('event_type', 'scaffold_down').eq('user_id', a.userId)
      .order('created_at', { ascending: false }).limit(1);
    check('track: A\'s own real childId IS attached to the written row', ownChildRows?.[0]?.child_id === a.childId);
  } else {
    console.log('  SKIP: create-portal-session/create-checkout-session live endpoint checks (set DEPLOY_BASE_URL to run them)');
  }

  console.log('\nCleaning up test users...');
  await cleanup(a.userId);
  await cleanup(b.userId);
  await cleanup(c.userId);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
