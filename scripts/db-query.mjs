#!/usr/bin/env node
// Query production Supabase via Management API. Usage: node scripts/db-query.mjs <file.sql> | --sql "select 1"
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const a = process.argv.slice(2);
const sql = a[0] === '--sql' ? a[1] : readFileSync(a[0], 'utf8');
if (!sql?.trim()) { console.error('No SQL'); process.exit(1); }
const token = execSync('security find-generic-password -s "Supabase CLI" -w', { encoding: 'utf8' }).trim();
const res = await fetch('https://api.supabase.com/v1/projects/ozhqsaysltiamadpcruz/database/query', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const t = await res.text();
try { console.log(JSON.stringify(JSON.parse(t), null, 2)); } catch { console.log(t); }
if (!res.ok) process.exit(1);
