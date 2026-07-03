#!/usr/bin/env node
// Proves the "zero emoji in UI" rule from docs/DESIGN_BRIEF.md §7. Scans
// every .js/.jsx file under src/ for emoji-range Unicode characters and
// fails (non-zero exit) if any are found outside the documented exceptions
// below. Run: node scripts/check-no-emoji.mjs (or `npm run check:no-emoji`).
//
// Deliberately does NOT include the Arrows block (U+2190-U+21FF) — that
// range is almost entirely plain typographic arrows (→ ← used in prose/
// comments throughout this codebase), not emoji, and including it produced
// false positives during the sweep that motivated this test.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src', import.meta.url).pathname;

// Files intentionally excluded, each with a specific, load-bearing reason —
// not a general escape hatch. Any new exception added here must come with
// the same kind of justification, or it defeats the point of this test.
const EXCEPTIONS = new Set([
  // Legacy pre-Candy-Galaxy tree — confirmed unlinked from any live route
  // (see main.jsx's own comment: "not linked from anywhere in the UI",
  // only reachable at /app-legacy). Out of scope for this redesign.
  'App.jsx',
  // Only consumer is the legacy App.jsx tree (grepped, confirmed) — same
  // exclusion by inheritance.
  'components/WordGalaxyMap.jsx',
  // The landing page is a separate, previously-approved design system
  // (dawn-gradient tokens, see CLAUDE.md "Design tokens" section) that
  // predates and is independent of the candy-galaxy DESIGN_BRIEF.md this
  // test enforces. Not touched by this redesign's scope.
  'pages/landing/data/sampleWords.js',
  'pages/landing/sections/WordRise.jsx',
]);

// Within games/GameEngine.jsx specifically: SoundMatch, SpellItOut,
// GameTypeSelector, MLC_TYPES/GAME_TYPES, and UpgradeModal are confirmed
// unreachable from the live app — PlayScreen.jsx's own activity list
// (the only live entry point into GameEngine) never offers 'sound_match'
// or 'spell_it_out', and GameTypeSelector/UpgradeModal are imported only
// by the legacy App.jsx tree (grepped, confirmed). The 5 rebuilt
// activities (WordMatch/WordHunt/RhymeTime/FlashCardChallenge/
// StoryBuilder) plus the shared orchestrator/SessionComplete are clean —
// enforced by scanning line-by-line and only exempting matches inside
// those specific unreachable functions.
// SessionProgress (the pre-E2 progress bar) is only rendered for
// non-rebuilt activities (see GameEngine's `isE2Activity` branch) — same
// unreachable-from-live-app reasoning as the functions below.
const GAME_ENGINE_EXEMPT_FUNCTIONS = ['SoundMatch', 'SpellItOut', 'GameTypeSelector', 'UpgradeModal', 'SessionProgress'];
// GAME_TYPES/MLC_TYPES are top-level consts consumed only by
// GameTypeSelector (legacy-only, see above) — same exemption.
const GAME_ENGINE_EXEMPT_CONSTS = ['GAME_TYPES', 'MLC_TYPES', 'PREMIUM_FEATURES'];

// Real emoji ranges. Excludes U+2190-U+21FF (Arrows) — see header comment.
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}]/gu;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function isExempt(relPath) {
  return EXCEPTIONS.has(relPath);
}

function findGameEngineExemptRanges(content) {
  // Returns [start, end) char-offset ranges for each exempt top-level
  // function or const declaration, found by matching from its declaration
  // to the next top-level declaration (or EOF).
  const declStarts = [...content.matchAll(/^(?:export )?(?:function (\w+)\(|const (\w+) =)/gm)];
  const ranges = [];
  for (let i = 0; i < declStarts.length; i++) {
    const name = declStarts[i][1] ?? declStarts[i][2];
    const exempt = GAME_ENGINE_EXEMPT_FUNCTIONS.includes(name) || GAME_ENGINE_EXEMPT_CONSTS.includes(name);
    if (!exempt) continue;
    const start = declStarts[i].index;
    const end = i + 1 < declStarts.length ? declStarts[i + 1].index : content.length;
    ranges.push([start, end]);
  }
  return ranges;
}

function inAnyRange(offset, ranges) {
  return ranges.some(([s, e]) => offset >= s && offset < e);
}

let failures = 0;
for (const file of walk(ROOT)) {
  const relPath = relative(ROOT, file);
  if (isExempt(relPath)) continue;

  const content = readFileSync(file, 'utf8');
  const isGameEngine = relPath === 'games/GameEngine.jsx';
  const exemptRanges = isGameEngine ? findGameEngineExemptRanges(content) : [];

  let match;
  const lineStarts = [0, ...[...content.matchAll(/\n/g)].map((m) => m.index + 1)];
  EMOJI_PATTERN.lastIndex = 0;
  while ((match = EMOJI_PATTERN.exec(content))) {
    if (isGameEngine && inAnyRange(match.index, exemptRanges)) continue;
    const lineNo = lineStarts.filter((s) => s <= match.index).length;
    console.error(`src/${relPath}:${lineNo}: emoji character "${match[0]}" found`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} emoji character(s) found in UI source. See docs/DESIGN_BRIEF.md §7.`);
  process.exit(1);
} else {
  console.log('No emoji characters found in scoped UI source. OK.');
}
