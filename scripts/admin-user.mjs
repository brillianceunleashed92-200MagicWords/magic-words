#!/usr/bin/env node
// Create/delete test users for verification. Reads SUPABASE_SERVICE_ROLE_KEY from env.
// Usage: node scripts/admin-user.mjs create <emailPrefix> | delete <userId>
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = 'https://ozhqsaysltiamadpcruz.supabase.co/auth/v1/admin/users';
const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const [cmd, arg] = process.argv.slice(2);
if (!key) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }
if (cmd === 'create') {
  const email = `nextgenprecisiondrones+${arg || 'test'}${Date.now()}@gmail.com`;
  const r = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify({ email, password: 'TestPass!23456', email_confirm: true }) });
  const d = await r.json();
  console.log(JSON.stringify({ email, id: d.id, status: r.status }, null, 2));
} else if (cmd === 'delete') {
  const r = await fetch(`${base}/${arg}`, { method: 'DELETE', headers: h });
  console.log(JSON.stringify({ deleted: arg, status: r.status }, null, 2));
} else { console.error('Usage: create <prefix> | delete <userId>'); process.exit(1); }
