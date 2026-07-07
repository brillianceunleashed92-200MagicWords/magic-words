#!/usr/bin/env node
// Proves every src/lib/activityDefs.js ACTIVITY_DEFS entry has a matching
// render case in src/games/GameEngine.jsx's `{gameType === '<id>' && (...)}`
// block, and vice versa. Same static-source-scan contract as
// check-findtheword-sync.mjs / check-wordart-sync.mjs.
//
// Why this exists (docs/QUEST_FIX_REPORT.md, FIX_QUEST_PROGRESSION run):
// the guided path's rank-unlock signal is "a learning_events row exists
// for (child_id, word, game_type)", and every activity writes that
// game_type from the SAME shared variable (QuestPath's activity.id ->
// PlayScreen's gameType state -> GameEngine's gameType prop -> the
// learning_events insert) -- a writer/reader key mismatch is not
// structurally possible today. This gate guards against a FUTURE refactor
// breaking that guarantee: e.g. adding a new ACTIVITY_DEFS entry without
// adding its GameEngine render case (selecting it would show a blank
// screen), or renaming an id in one file but not the other.
//
// Run: node scripts/check-activitydefs-sync.mjs (wired into `npm run build`).

import { readFileSync } from 'node:fs';

const DEFS_PATH = new URL('../src/lib/activityDefs.js', import.meta.url).pathname;
const ENGINE_PATH = new URL('../src/games/GameEngine.jsx', import.meta.url).pathname;

const defsSource = readFileSync(DEFS_PATH, 'utf8');
const engineSource = readFileSync(ENGINE_PATH, 'utf8');

const defsMatch = defsSource.match(/export const ACTIVITY_DEFS = \[([\s\S]*?)\n\];/);
if (!defsMatch) {
  console.error('[check-activitydefs-sync] Could not find "export const ACTIVITY_DEFS = [ ... ];" in activityDefs.js -- has it been renamed/restructured?');
  process.exit(1);
}

const defIds = [...defsMatch[1].matchAll(/id:\s*'([a-zA-Z_]\w*)'/g)].map((m) => m[1]);
if (defIds.length === 0) {
  console.error('[check-activitydefs-sync] Found ACTIVITY_DEFS but extracted zero ids -- regex likely out of sync with the file\'s shape.');
  process.exit(1);
}

const renderCaseIds = new Set(
  [...engineSource.matchAll(/gameType\s*===\s*'([a-zA-Z_]\w*)'/g)].map((m) => m[1])
);

const missingRenderCase = defIds.filter((id) => !renderCaseIds.has(id));
const orphanedRenderCase = [...renderCaseIds].filter((id) => !defIds.includes(id));

if (missingRenderCase.length === 0 && orphanedRenderCase.length === 0) {
  console.log(`activityDefs.js's ${defIds.length} activities all have a matching GameEngine.jsx render case. OK.`);
  process.exit(0);
}

console.error('[check-activitydefs-sync] ACTIVITY_DEFS / GameEngine render cases have drifted:');
if (missingRenderCase.length) {
  console.error(`  ACTIVITY_DEFS id(s) with no "gameType === '<id>'" render case in GameEngine.jsx: ${missingRenderCase.join(', ')}`);
}
if (orphanedRenderCase.length) {
  console.error(`  GameEngine.jsx render case(s) with no matching ACTIVITY_DEFS entry: ${orphanedRenderCase.join(', ')}`);
}
console.error('Fix: every ACTIVITY_DEFS entry needs a "gameType === \'<id>\'" render case in GameEngine.jsx, and vice versa.');
process.exit(1);
