#!/usr/bin/env node
// Ports the `PICS` map out of mockup-O-blank-assessment.html verbatim into
// src/lib/starCheckIcons.js. Run once (or re-run any time the mockup's
// PICS block changes) — regenerates the whole file, never hand-edit
// starCheckIcons.js directly.
// Usage: node scripts/extract-star-check-icons.mjs [path-to-mockup.html]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mockupPath = process.argv[2] || `${process.env.HOME}/Downloads/200mw-design/mockup-O-blank-assessment.html`;
const outPath = fileURLToPath(new URL('../src/lib/starCheckIcons.js', import.meta.url));

const html = readFileSync(mockupPath, 'utf8');
const startMarker = 'var PICS = {';
const start = html.indexOf(startMarker);
if (start === -1) {
  console.error('[extract-star-check-icons] Could not find "var PICS = {" in the mockup — has it been renamed/restructured?');
  process.exit(1);
}
const end = html.indexOf('\n};', start);
if (end === -1) {
  console.error('[extract-star-check-icons] Could not find the closing "};" for PICS.');
  process.exit(1);
}
const block = html.slice(start + startMarker.length, end);

const keyRe = /^\s*(\w+):'((?:[^'\\]|\\.)*)'/gm;
const entries = [];
let m;
while ((m = keyRe.exec(block))) {
  entries.push([m[1], m[2]]);
}

if (entries.length !== 45) {
  console.error(`[extract-star-check-icons] Expected exactly 45 PICS keys, found ${entries.length}. Aborting — verify the mockup's PICS block manually before regenerating.`);
  process.exit(1);
}

const lines = entries.map(([key, svg]) => `  ${key}: '${svg}',`).join('\n');

const output = `// src/lib/starCheckIcons.js — GENERATED verbatim from
// mockup-O-blank-assessment.html's PICS map by
// scripts/extract-star-check-icons.mjs. Do not hand-edit; re-run the
// script if the mockup's icon set changes. Flat token-palette SVG shapes,
// no letterforms anywhere (per the mockup's own PICS comment) — used only
// for The Star Check's meaning-probe (picture) tiles.
export const STAR_CHECK_PICS = {
${lines}
};
`;

writeFileSync(outPath, output, 'utf8');
console.log(`[extract-star-check-icons] Wrote ${entries.length} icons to ${outPath}`);
