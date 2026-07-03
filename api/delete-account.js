// api/delete-account.js
// COPPA baseline (Phase 7) — "Delete account & all data" in Parent Portal
// Settings. Requires a verified JWT (never trusts a client-supplied
// userId — same pattern as every other endpoint fixed this session) and
// an explicit confirmation string in the body, since a native browser
// confirm() dialog is avoided elsewhere in this app and this is the one
// truly irreversible action a parent can take.
//
// Deletes, in order:
//   1. Storage objects (drawings bucket) — FK cascades don't reach
//      Storage, so this must happen explicitly before anything else.
//   2. The auth.users row — migration 0018 fixed every child_id/user_id
//      foreign key that was missing ON DELETE CASCADE, so this one
//      delete now correctly cascades through child_profiles,
//      word_progress, user_stats, user_streaks, learning_events,
//      learning_plans, achievements, magic_moments, stories,
//      session_plans, parent_settings, subscriptions, and
//      parent_child_links. Verified live against a real test account,
//      not just inferred from the migration — see the commit message.

const { createClient } = require('@supabase/supabase-js');
const { getVerifiedUser, logSecurityEvent } = require('./_lib/security');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getVerifiedUser(req);
  if (!user) {
    logSecurityEvent('auth_verification_failed', { endpoint: 'delete-account' });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.body?.confirm !== 'DELETE') {
    return res.status(400).json({ error: 'Confirmation required: send { "confirm": "DELETE" }' });
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Storage cleanup first — Postgres FK cascades never reach Storage
    // objects, so these would otherwise be orphaned (still billed, still
    // technically a stored copy of a child's drawing) after the DB rows
    // are gone.
    const { data: children } = await admin.from('child_profiles').select('id').eq('parent_id', user.id);
    for (const child of children ?? []) {
      const { data: files } = await admin.storage.from('drawings').list(`${user.id}/${child.id}`);
      if (files?.length) {
        const paths = files.map((f) => `${user.id}/${child.id}/${f.name}`);
        await admin.storage.from('drawings').remove(paths);
      }
    }

    // Deletes the auth user; every table with a correctly-configured
    // cascade (all of them, as of migration 0018) is cleaned up by
    // Postgres itself as a result.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;

    logSecurityEvent('account_deleted', { userId: user.id, endpoint: 'delete-account' });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-account] failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
