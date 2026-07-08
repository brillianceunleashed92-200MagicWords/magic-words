#!/usr/bin/env node
// Proves api/session-generator.js's mirrored FEAT_BLANK_ENGINE_R1 weighting
// constants (BELOW_FLOOR_FUNCTION_SAMPLE_SIZE / MASTERED_CONTENT_INCLUSION_WEIGHT)
// stay numerically identical to the canonical src/lib/blankEngineWeighting.js
// values. Same static-source-scan contract as check-mastery-predicate-sync.mjs.
//
// Why this exists (src/lib/blankEngineWeighting.js's own header): a CommonJS
// Vercel function can't safely require() an ES module here (same unverified-
// Vercel-Node-version caution as the mastery predicate mirror), so the
// constants are mirrored as their own literal copy instead of imported. A
// mirror that's never checked against its source drifts silently; this
// gate is that check.
//
// Run: node scripts/check-blank-engine-weighting-sync.mjs (wired into `npm run build`).

import { readFileSync } from 'node:fs';

const CANONICAL_PATH = new URL('../src/lib/blankEngineWeighting.js', import.meta.url).pathname;
const SERVER_PATH = new URL('../api/session-generator.js', import.meta.url).pathname;

const canonicalSource = readFileSync(CANONICAL_PATH, 'utf8');
const serverSource = readFileSync(SERVER_PATH, 'utf8');

function extractConst(source, name, fileLabel) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*([\\d.]+)`));
  if (!match) {
    console.error(`[check-blank-engine-weighting-sync] Could not find "${name} = <number>" in ${fileLabel} -- has it been renamed/restructured?`);
    process.exit(1);
  }
  return Number(match[1]);
}

const canonicalSampleSize = extractConst(canonicalSource, 'BELOW_FLOOR_FUNCTION_SAMPLE_SIZE', 'blankEngineWeighting.js');
const canonicalWeight = extractConst(canonicalSource, 'MASTERED_CONTENT_INCLUSION_WEIGHT', 'blankEngineWeighting.js');
const serverSampleSize = extractConst(serverSource, 'BELOW_FLOOR_FUNCTION_SAMPLE_SIZE', 'session-generator.js');
const serverWeight = extractConst(serverSource, 'MASTERED_CONTENT_INCLUSION_WEIGHT', 'session-generator.js');

const mismatches = [];
if (canonicalSampleSize !== serverSampleSize) {
  mismatches.push(`BELOW_FLOOR_FUNCTION_SAMPLE_SIZE: blankEngineWeighting.js=${canonicalSampleSize} vs session-generator.js=${serverSampleSize}`);
}
if (canonicalWeight !== serverWeight) {
  mismatches.push(`MASTERED_CONTENT_INCLUSION_WEIGHT: blankEngineWeighting.js=${canonicalWeight} vs session-generator.js=${serverWeight}`);
}

if (mismatches.length === 0) {
  console.log(`session-generator.js's mirrored weighting constants match blankEngineWeighting.js (sampleSize=${canonicalSampleSize}, weight=${canonicalWeight}). OK.`);
  process.exit(0);
}

console.error('[check-blank-engine-weighting-sync] The mirrored server constants have drifted from the canonical values:');
for (const m of mismatches) console.error(`  ${m}`);
console.error('Fix: update api/session-generator.js\'s mirrored constants to match src/lib/blankEngineWeighting.js exactly.');
process.exit(1);
