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
  console.log('Provisioning test-user-A and test-user-B...');
  const a = await provisionUser('A');
  const b = await provisionUser('B');

  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signInA, error: signInErrA } = await clientA.auth.signInWithPassword({ email: a.email, password: PASSWORD });
  if (signInErrA) throw signInErrA;
  const tokenA = signInA.session.access_token;

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
  } else {
    console.log('  SKIP: create-portal-session/create-checkout-session live endpoint checks (set DEPLOY_BASE_URL to run them)');
  }

  console.log('\nCleaning up test users...');
  await cleanup(a.userId);
  await cleanup(b.userId);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
