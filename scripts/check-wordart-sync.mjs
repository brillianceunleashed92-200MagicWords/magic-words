#!/usr/bin/env node
// Proves WordArt.jsx's REGISTRY exactly matches
// src/components/wordArtManifest.json (wordart-batch-1, Step 0).
//
// Design: picture-eligibility used to live in three hardcoded places that
// had to be edited together by hand on every art batch — WordArt.jsx's
// REGISTRY, PICTURE_ART_WORDS in api/session-generator.js, and its copy in
// src/hooks/useSessionPlan.js. The runtime copies are gone now (both files
// query the words.has_art DB column directly instead), which leaves
// exactly one hand-maintained pairing: WordArt.jsx's REGISTRY (what the
// client can actually render as a picture) and wordArtManifest.json (the
// list a migration seeds has_art=true from). This script is the mechanical
// check that those two agree — it fails loudly on drift instead of
// silently shipping a word that's in the DB as has_art=true but has no
// real REGISTRY component (would crash/fall back at render time) or a
// REGISTRY component for a word the DB doesn't know has art (dead code,
// like the "elephant" entry this same batch removed).
//
// This is a static source scan (same convention as check-no-emoji.mjs) —
// it reads WordArt.jsx as text and extracts REGISTRY's keys via regex
// rather than importing the module, so it works as a plain Node script
// with no build step or JSX transform required.
//
// Run: node scripts/check-wordart-sync.mjs (wired into `npm run build`
// via package.json's build script, same as check-no-emoji).

import { readFileSync } from 'node:fs';

const WORDART_PATH = new URL('../src/components/WordArt.jsx', import.meta.url).pathname;
const MANIFEST_PATH = new URL('../src/components/wordArtManifest.json', import.meta.url).pathname;

const source = readFileSync(WORDART_PATH, 'utf8');
const registryMatch = source.match(/const REGISTRY = \{([\s\S]*?)\};/);
if (!registryMatch) {
  console.error('[check-wordart-sync] Could not find "const REGISTRY = { ... };" in WordArt.jsx — has it been renamed/restructured?');
  process.exit(1);
}

const registryKeys = [...registryMatch[1].matchAll(/^\s*([a-zA-Z_]\w*)\s*:/gm)].map((m) => m[1]);
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

const registrySet = new Set(registryKeys);
const manifestSet = new Set(manifest);

const inRegistryOnly = registryKeys.filter((w) => !manifestSet.has(w));
const inManifestOnly = manifest.filter((w) => !registrySet.has(w));

if (inRegistryOnly.length === 0 && inManifestOnly.length === 0) {
  console.log(`WordArt REGISTRY and wordArtManifest.json agree (${registryKeys.length} words). OK.`);
  process.exit(0);
}

console.error('[check-wordart-sync] REGISTRY and wordArtManifest.json have drifted:');
if (inRegistryOnly.length) {
  console.error(`  In REGISTRY but not the manifest (dead/unlisted art): ${inRegistryOnly.join(', ')}`);
}
if (inManifestOnly.length) {
  console.error(`  In the manifest but not REGISTRY (missing component): ${inManifestOnly.join(', ')}`);
}
console.error('Fix: every REGISTRY entry needs a matching manifest entry (and a migration setting has_art=true), and vice versa.');
process.exit(1);
