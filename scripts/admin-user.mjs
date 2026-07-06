#!/usr/bin/env node
// Create/delete test users for verification. Reads SUPABASE_SERVICE_ROLE_KEY from env.
// Usage: node scripts/admin-user.mjs create <emailPrefix> | delete <userId>
//        node scripts/admin-user.mjs seed-progress <userId> <childId> <word> <mastery>
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const project = 'https://ozhqsaysltiamadpcruz.supabase.co';
const base = `${project}/auth/v1/admin/users`;
const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const [cmd, ...args] = process.argv.slice(2);
if (!key) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }
if (cmd === 'create') {
  const [arg] = args;
  const email = `nextgenprecisiondrones+${arg || 'test'}${Date.now()}@gmail.com`;
  // feat/auth-r1 Phase 6 — every admin-created account is a trusted
  // test/support fixture, not a real end user COPPA's consent flow
  // needs to gate; without this, CandyGalaxyShell.jsx's new consent
  // interstitial (Phase 5) blocks every account this script creates,
  // which is most of this repo's Playwright suite. Real signups (email/
  // password via the B6 checkbox, or Google OAuth via the interstitial
  // itself) are unaffected — this only changes what THIS script's
  // accounts look like.
  const user_metadata = { parental_consent: true, parental_consent_at: new Date().toISOString() };
  const r = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify({ email, password: 'TestPass!23456', email_confirm: true, user_metadata }) });
  const d = await r.json();
  console.log(JSON.stringify({ email, id: d.id, status: r.status }, null, 2));
} else if (cmd === 'delete') {
  const [arg] = args;
  const r = await fetch(`${base}/${arg}`, { method: 'DELETE', headers: h });
  console.log(JSON.stringify({ deleted: arg, status: r.status }, null, 2));
} else if (cmd === 'seed-progress') {
  const [userId, childId, word, mastery] = args;
  if (!userId || !childId || !word) { console.error('Usage: seed-progress <userId> <childId> <word> <mastery>'); process.exit(1); }
  // user_id must always be set on service-role writes: word_progress's RLS SELECT
  // policy keys off it, and rows written without it are invisible to the
  // account's own authenticated reads even though child_id is also present.
  const r = await fetch(`${project}/rest/v1/word_progress`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: userId, child_id: childId, word, mastery: Number(mastery) || 0 }),
  });
  const d = await r.json();
  console.log(JSON.stringify({ status: r.status, result: d }, null, 2));
} else { console.error('Usage: create <prefix> | delete <userId> | seed-progress <userId> <childId> <word> <mastery>'); process.exit(1); }
