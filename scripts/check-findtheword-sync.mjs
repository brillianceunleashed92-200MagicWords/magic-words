#!/usr/bin/env node
// Proves src/games/findTheWordManifest.js's FIND_THE_WORD_LOOKALIKES has a
// complete, well-formed entry for every word in
// src/games/curriculumWords.json (a checked-in snapshot of the live `words`
// table, 200 rows — same role as wordArtManifest.json plays for WordArt:
// a fixed universe to check the hand-curated manifest against, so a build
// fails loudly on drift instead of a child hitting a word with no
// distractor set at runtime).
//
// Checks, per curriculum word:
//   - an entry exists
//   - exactly 3 distractors
//   - all 3 are distinct from each other
//   - none equals the target word itself
//   - none is the target with a trailing s/es/ed/ing (a cheap guard against
//     accidentally shipping the target's own plural/tense inflection as a
//     distractor — the hard rule this activity must never break)
//
// Static source scan (same convention as check-wordart-sync.mjs /
// check-stroke-coverage.mjs) — reads the manifest as text and extracts
// object entries via regex, no build step or JSX/ESM transform required.
//
// Run: node scripts/check-findtheword-sync.mjs (wired into `npm run build`).

import { readFileSync } from 'node:fs';

const MANIFEST_PATH = new URL('../src/games/findTheWordManifest.js', import.meta.url).pathname;
const CURRICULUM_PATH = new URL('../src/games/curriculumWords.json', import.meta.url).pathname;

const source = readFileSync(MANIFEST_PATH, 'utf8');
const manifestMatch = source.match(/export const FIND_THE_WORD_LOOKALIKES = \{([\s\S]*?)\n\};/);
if (!manifestMatch) {
  console.error('[check-findtheword-sync] Could not find "export const FIND_THE_WORD_LOOKALIKES = { ... };" in findTheWordManifest.js — has it been renamed/restructured?');
  process.exit(1);
}

// Entries look like:  word: ['a', 'b', 'c'],   or   I: ['a', 'b', 'c'],
const entries = new Map();
for (const m of manifestMatch[1].matchAll(/^\s*([a-zA-Z_]\w*)\s*:\s*\[([^\]]*)\]/gm)) {
  const key = m[1];
  const list = m[2].split(',').map((s) => s.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '')).filter(Boolean);
  entries.set(key, list);
}

const curriculum = JSON.parse(readFileSync(CURRICULUM_PATH, 'utf8'));
const curriculumSet = new Set(curriculum);
const manifestKeys = new Set(entries.keys());

const missing = curriculum.filter((w) => !manifestKeys.has(w));
const extra = [...manifestKeys].filter((w) => !curriculumSet.has(w));

const malformed = [];
for (const word of curriculum) {
  const list = entries.get(word);
  if (!list) continue;
  if (list.length !== 3) { malformed.push(`${word}: expected 3 distractors, found ${list.length}`); continue; }
  if (new Set(list).size !== 3) { malformed.push(`${word}: duplicate distractor in ${JSON.stringify(list)}`); continue; }
  if (list.includes(word)) { malformed.push(`${word}: distractor list includes the target word itself`); continue; }
  const inflectionOfTarget = list.find((d) => d === `${word}s` || d === `${word}es` || d === `${word}ed` || d === `${word}ing` || `${d}s` === word || `${d}es` === word);
  if (inflectionOfTarget) { malformed.push(`${word}: distractor "${inflectionOfTarget}" looks like the target's own plural/tense inflection`); continue; }
}

if (missing.length === 0 && extra.length === 0 && malformed.length === 0) {
  console.log(`findTheWordManifest.js covers all ${curriculum.length} curriculum words with valid distractor sets. OK.`);
  process.exit(0);
}

console.error('[check-findtheword-sync] FIND_THE_WORD_LOOKALIKES has a gap:');
if (missing.length) console.error(`  Missing manifest entry for: ${missing.join(', ')}`);
if (extra.length) console.error(`  Manifest entries for words not in the curriculum: ${extra.join(', ')}`);
if (malformed.length) {
  console.error('  Malformed entries:');
  for (const m of malformed) console.error(`    ${m}`);
}
console.error('Fix: every curriculum word needs exactly 3 distinct, real, non-inflection distractors in findTheWordManifest.js.');
process.exit(1);
