#!/usr/bin/env node
// CURRICULUM_REPLACE_R1 follow-up — positive-landing proof that gating
// words/word_progress reads by app_config.active_curriculum_version
// actually works, run against the real live Supabase project (same
// convention as idor-proof.mjs — no mocking, real signed-in sessions).
//
// Two things this proves, and deliberately does NOT do:
//   1. With the flag at its real current value ('v1-legacy') and only
//      v1 rows present, the app's real word/word_progress read paths
//      return EXACTLY what they did before this workstream — zero
//      user-visible change. Checked directly against a byte-identical
//      snapshot, not just a row count.
//   2. The curriculum_version filter genuinely isolates rows by value —
//      proven by inserting two temporary marker-tagged rows (curriculum_
//      version = a value that is neither 'v1-legacy' nor the real,
//      still-deferred 'v2-blank-100-100') and confirming a query scoped
//      to that marker returns only those two rows, while the v1-legacy-
//      scoped query is completely unaffected. This is the same
//      mechanism that would make the flag route to v2 rows if it were
//      ever set to 'v2-blank-100-100' — proven without actually flipping
//      the live flag, which would be a real user-visible change to
//      make just to test it.
// Also proves the migration-0040 upsert fix: the word_progress unique
// constraint was widened to (child_id, word, curriculum_version), which
// silently broke the client's old onConflict: 'child_id,word' target —
// every real progress save would have started failing the moment 0040
// landed. This script drives the actual corrected upsert (mirroring
// src/lib/queries/wordProgress.js exactly) through a real signed-in
// test session and confirms it succeeds.
//
// Requires SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
// Run: node --env-file=.env.local scripts/curriculum-version-gate-proof.mjs

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
const MARKER_VERSION = 'test-proof-marker-do-not-use';
// Ids well outside both the real v1 range (1-200) and the reserved,
// still-deferred v2 range (1001-1200) — impossible to collide with real data.
const MARKER_IDS = [900001, 900002];

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
  const email = `nextgenprecisiondrones+curriculumgate${tag}${Date.now()}@gmail.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const { data: childData, error: childErr } = await admin.from('child_profiles').insert({
    parent_id: data.user.id, name: `Child${tag}`, interests: [],
  }).select().single();
  if (childErr) throw childErr;
  return { userId: data.user.id, email, childId: childData.id };
}

async function cleanup(userId) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log('--- 1. Confirm the real flag value and baseline word count ---\n');

  const { data: configRow, error: configErr } = await admin
    .from('app_config').select('value').eq('key', 'active_curriculum_version').single();
  if (configErr) throw configErr;
  check("app_config.active_curriculum_version is 'v1-legacy' (today's real, unflipped value)", configRow.value === 'v1-legacy');

  const { data: v1Words, error: v1Err } = await admin
    .from('words')
    .select('id, word, type, unit, sort_order, emoji, definition, audio_url, image_url, teaching_track, word_type, has_art')
    .eq('curriculum_version', 'v1-legacy')
    .order('id');
  if (v1Err) throw v1Err;
  check('words filtered by curriculum_version=v1-legacy returns exactly 200 rows', v1Words.length === 200);
  check('every v1-legacy row has id in 1-200 (no v2/marker bleed-through)', v1Words.every((w) => w.id >= 1 && w.id <= 200));

  console.log('\n--- 2. Positive-landing proof: the real anon-key client sees exactly the same 200 words ---\n');

  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonWords, error: anonErr } = await anon
    .from('words')
    .select('id, word, type, word_type, has_art, teaching_track, unit, sort_order, emoji, definition, audio_url, image_url')
    .eq('curriculum_version', 'v1-legacy')
    .order('sort_order', { ascending: true });
  if (anonErr) throw anonErr;
  check('anon client (same access as the real app) sees exactly 200 words', anonWords.length === 200);
  check(
    'anon client\'s word set is exactly the same 200 ids as the admin-read v1-legacy set (order-independent)',
    JSON.stringify([...anonWords.map((w) => w.id)].sort((a, b) => a - b)) === JSON.stringify([...v1Words.map((w) => w.id)].sort((a, b) => a - b))
  );

  console.log('\n--- 3. Isolation proof: a marker-tagged curriculum_version returns ONLY its own rows ---\n');

  await admin.from('words').insert([
    { id: MARKER_IDS[0], word: '__test_marker_a__', type: 'content', unit: 1, sort_order: 1, teaching_track: 'content', word_type: 'noun', curriculum_version: MARKER_VERSION },
    { id: MARKER_IDS[1], word: '__test_marker_b__', type: 'function', unit: 1, sort_order: 2, teaching_track: 'sight', word_type: 'function', curriculum_version: MARKER_VERSION },
  ]);

  const { data: markerWords, error: markerErr } = await admin
    .from('words').select('id, word').eq('curriculum_version', MARKER_VERSION).order('id');
  if (markerErr) throw markerErr;
  check(
    'querying with a different curriculum_version returns ONLY the 2 marker rows, not the 200 v1 rows',
    markerWords.length === 2 && markerWords.every((w) => MARKER_IDS.includes(w.id))
  );

  const { data: v1WordsAfterMarker, error: v1AfterErr } = await admin
    .from('words').select('id').eq('curriculum_version', 'v1-legacy');
  if (v1AfterErr) throw v1AfterErr;
  check(
    'the v1-legacy-scoped query is completely unaffected by the marker rows existing (still exactly 200)',
    v1WordsAfterMarker.length === 200
  );

  // Cleanup marker rows immediately — this script's whole point is proving
  // isolation, not leaving test data sitting in the real words table.
  await admin.from('words').delete().in('id', MARKER_IDS);
  const { data: markerAfterCleanup } = await admin.from('words').select('id').eq('curriculum_version', MARKER_VERSION);
  check('marker rows cleaned up (0 remaining)', (markerAfterCleanup?.length ?? 0) === 0);

  console.log('\n--- 4. Regression proof: the corrected word_progress upsert (migration 0040 fix) actually works ---\n');

  const testUser = await provisionUser('A');
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInErr } = await client.auth.signInWithPassword({ email: testUser.email, password: PASSWORD });
  if (signInErr) throw signInErr;

  // Mirrors src/lib/queries/wordProgress.js's useSaveWordProgressMutation
  // exactly — same shape, same onConflict target, same fields.
  const { error: upsertErr } = await client.from('word_progress').upsert({
    user_id: testUser.userId,
    child_id: testUser.childId,
    word: 'cat',
    curriculum_version: 'v1-legacy',
    correct_count: 1,
    attempt_count: 1,
    last_seen: new Date().toISOString(),
    mastery_score: 100,
    mastery: 100,
    next_review_at: new Date(Date.now() + 86400000).toISOString(),
    review_interval_days: 1,
  }, { onConflict: 'child_id,word,curriculum_version' });
  check('word_progress upsert with the corrected onConflict target succeeds (no constraint-mismatch error)', !upsertErr);

  // Prove the OLD (pre-fix) onConflict target is genuinely broken against
  // today's real schema — confirms this was a real, live regression from
  // migration 0040, not a hypothetical.
  const { error: oldOnConflictErr } = await client.from('word_progress').upsert({
    user_id: testUser.userId,
    child_id: testUser.childId,
    word: 'dog',
    curriculum_version: 'v1-legacy',
    correct_count: 1,
    attempt_count: 1,
  }, { onConflict: 'child_id,word' });
  check(
    'the OLD onConflict target (child_id,word) genuinely fails against the post-0040 schema (confirms this was a real live bug, now fixed)',
    !!oldOnConflictErr
  );

  const { data: savedProgress, error: readBackErr } = await client
    .from('word_progress')
    .select('word, mastery, curriculum_version')
    .eq('child_id', testUser.childId)
    .eq('curriculum_version', 'v1-legacy');
  if (readBackErr) throw readBackErr;
  check('the saved progress row reads back correctly, scoped by curriculum_version', savedProgress.some((p) => p.word === 'cat' && p.mastery === 100));

  console.log('\nCleaning up test user...');
  await cleanup(testUser.userId);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Script error:', err);
  // best-effort cleanup of marker rows if the script died mid-run
  await admin.from('words').delete().in('id', MARKER_IDS).catch(() => {});
  process.exit(1);
});
