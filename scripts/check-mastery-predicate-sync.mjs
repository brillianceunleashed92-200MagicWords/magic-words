#!/usr/bin/env node
// Proves api/session-generator.js's mirrored isRealMastery predicate
// (MASTERED_THRESHOLD / MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION) stays
// numerically identical to the canonical src/lib/masteryCalibration.js
// values. Same static-source-scan contract as check-activitydefs-sync.mjs.
//
// Why this exists (docs/PEDAGOGY_CALIBRATION_REPORT.md ARCHITECTURE):
// session-generator.js is a CommonJS Vercel function and can't safely
// `require()` the ES-module masteryCalibration.js (the actual Vercel
// runtime's Node version couldn't be independently confirmed) -- so the
// predicate is mirrored there as its own named constants instead of
// imported. A mirror that's never checked against its source drifts
// silently; this gate is that check.
//
// Run: node scripts/check-mastery-predicate-sync.mjs (wired into `npm run build`).

import { readFileSync } from 'node:fs';

const CALIBRATION_PATH = new URL('../src/lib/masteryCalibration.js', import.meta.url).pathname;
const SERVER_PATH = new URL('../api/session-generator.js', import.meta.url).pathname;

const calibrationSource = readFileSync(CALIBRATION_PATH, 'utf8');
const serverSource = readFileSync(SERVER_PATH, 'utf8');

function extractConst(source, name, fileLabel) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  if (!match) {
    console.error(`[check-mastery-predicate-sync] Could not find "${name} = <number>" in ${fileLabel} -- has it been renamed/restructured?`);
    process.exit(1);
  }
  return Number(match[1]);
}

const clientThreshold = extractConst(calibrationSource, 'MASTERED_THRESHOLD', 'masteryCalibration.js');
const clientMinAttempts = extractConst(calibrationSource, 'MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION', 'masteryCalibration.js');
const serverThreshold = extractConst(serverSource, 'MASTERED_THRESHOLD', 'session-generator.js');
const serverMinAttempts = extractConst(serverSource, 'MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION', 'session-generator.js');

const mismatches = [];
if (clientThreshold !== serverThreshold) {
  mismatches.push(`MASTERED_THRESHOLD: masteryCalibration.js=${clientThreshold} vs session-generator.js=${serverThreshold}`);
}
if (clientMinAttempts !== serverMinAttempts) {
  mismatches.push(`MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION: masteryCalibration.js=${clientMinAttempts} vs session-generator.js=${serverMinAttempts}`);
}

if (mismatches.length === 0) {
  console.log(`session-generator.js's mirrored mastery predicate matches masteryCalibration.js (threshold=${clientThreshold}, minAttempts=${clientMinAttempts}). OK.`);
  process.exit(0);
}

console.error('[check-mastery-predicate-sync] The mirrored server predicate has drifted from the canonical client predicate:');
for (const m of mismatches) console.error(`  ${m}`);
console.error('Fix: update api/session-generator.js\'s mirrored constants to match src/lib/masteryCalibration.js exactly.');
process.exit(1);
