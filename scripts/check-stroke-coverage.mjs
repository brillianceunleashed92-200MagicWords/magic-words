#!/usr/bin/env node
// Proves src/letters/letterStrokes.js's LETTER_STROKES manifest has an entry
// for every lowercase letter a-z.
//
// Design: unlike WordArt (per-word illustrations, checked against the live
// words.has_art set by check-wordart-sync.mjs), letter tracing only ever
// needs the 26 lowercase letters — there is no larger universe to sync
// against, and there never will be (the app renders every word lowercase,
// no punctuation, no digits, no accents — see docs/200MW_Prompt5_Draw_It_
// Tracing.md PART 2). So "coverage" here means exactly one thing: does the
// manifest contain all 26 keys. Confirmed against the live `words` table
// once during authoring (all 26 letters are in fact used across the current
// 200-word list) — see docs/DRAW_IT_TRACING_REPORT.md STROKE-DATA ASSESSMENT
// — but the check itself doesn't need a DB round-trip to stay correct, since
// full a-z coverage is a superset of any word the table could ever contain.
//
// Static source scan (same convention as check-wordart-sync.mjs /
// check-no-emoji.mjs) — reads the file as text and extracts top-level object
// keys via regex, so it runs as a plain Node script with no build step or
// JSX/ESM transform required.
//
// Run: node scripts/check-stroke-coverage.mjs (wired into `npm run build`
// via package.json's build script, same as check-wordart-sync).

import { readFileSync } from 'node:fs';

const STROKES_PATH = new URL('../src/letters/letterStrokes.js', import.meta.url).pathname;

const source = readFileSync(STROKES_PATH, 'utf8');
const manifestMatch = source.match(/export const LETTER_STROKES = \{([\s\S]*?)\n\};/);
if (!manifestMatch) {
  console.error('[check-stroke-coverage] Could not find "export const LETTER_STROKES = { ... };" in letterStrokes.js — has it been renamed/restructured?');
  process.exit(1);
}

// Top-level keys only (single lowercase letter followed by a colon at the
// start of a line, e.g. "  a: [" ) — avoids matching nested object keys
// like "d:" inside each stroke.
const keys = [...manifestMatch[1].matchAll(/^\s*([a-z]):\s*\[/gm)].map((m) => m[1]);
const keySet = new Set(keys);

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const missing = ALPHABET.filter((l) => !keySet.has(l));
const duplicates = keys.filter((l, i) => keys.indexOf(l) !== i);

if (missing.length === 0 && duplicates.length === 0) {
  console.log(`letterStrokes.js covers all 26 lowercase letters. OK.`);
  process.exit(0);
}

console.error('[check-stroke-coverage] LETTER_STROKES has a gap:');
if (missing.length) console.error(`  Missing stroke data for: ${missing.join(', ')}`);
if (duplicates.length) console.error(`  Duplicate keys: ${duplicates.join(', ')}`);
console.error('Fix: every lowercase letter a-z needs a LETTER_STROKES entry (1-3 ordered strokes).');
process.exit(1);
