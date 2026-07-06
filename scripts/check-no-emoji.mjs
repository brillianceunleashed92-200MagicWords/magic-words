#!/usr/bin/env node
// Proves the "zero emoji in UI" rule from docs/DESIGN_BRIEF.md §7. Scans
// every .js/.jsx file under src/ AND api/ for emoji-range Unicode
// characters and fails (non-zero exit) if any are found outside the
// documented exceptions below. Run: node scripts/check-no-emoji.mjs (or
// `npm run check:no-emoji`).
//
// Round-2 rule (tightened after a false-clean report let real bugs through
// undetected — see docs/WORDBUILDER_FIX_REPORT.md "round 2"): an exemption
// is only valid if the file is genuinely UNREACHABLE from any live route.
// "Separate design system" or "out of scope" are no longer accepted as
// exemption reasons on their own — if a file renders on any real route, it
// may not contain an emoji character, full stop. This removed the landing
// page's previous exemption entirely (its 7 emoji were real bugs, now
// fixed — the landing page IS reachable, at `/`, and was never actually
// dead code).
//
// Prompt 10 removed the mechanical import-graph reachability proof
// (assertUnreachable/buildImportGraph) that used to back the App.jsx and
// WordGalaxyMap.jsx exemptions — both files are deleted now, not just
// exempted, so there's no whole-file exemption left needing that proof.
// If a future exemption needs it again, reach for the same technique
// rather than asserting reachability in a comment.
//
// api/ was added after docs/WORDBUILDER_FIX_REPORT.md found the original
// src/-only version had a real blind spot: api/session-generator.js's
// ALL_WORDS list had a literal `emoji: '🐸'`-style field per word, which
// flowed into `quiz.emoji` and was rendered as a real emoji character by
// several client components — a bug this test's first version could never
// have caught since none of those literal characters were in `src/`.
//
// Important limitation, stated plainly rather than implied: this is a
// static source grep. It cannot catch emoji that only exists at runtime —
// e.g. Claude-generated encouragement text, or a unicode escape sequence
// (`'\u{1F680}'`) that a bundler resolves into a literal character in the
// shipped bundle even though no literal character exists in this source.
// That's why api/session-generator.js's AI prompt was also fixed to
// explicitly instruct "no emojis" (a different kind of fix this script
// can't verify), and why src/lib/avatars.js's backward-compat emoji values
// are stored as `\u{...}` escapes (this script won't flag them, but they
// DO ship as real characters in the built bundle — a deliberate, narrow,
// documented exception for legacy DB-value compatibility, not a gap this
// script failed to notice).
//
// Deliberately does NOT include the Arrows block (U+2190-U+21FF) — that
// range is almost entirely plain typographic arrows (→ ← used in prose/
// comments throughout this codebase), not emoji, and including it produced
// false positives during the sweep that motivated this test.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = new URL('../src', import.meta.url).pathname;
const API_ROOT = new URL('../api', import.meta.url).pathname;
const ROOTS = [
  { root: SRC_ROOT, label: 'src' },
  { root: API_ROOT, label: 'api' },
];

function readAllSourceFiles() {
  const files = [];
  for (const { root } of ROOTS) files.push(...walk(root));
  files.push(new URL('../src/main.jsx', import.meta.url).pathname);
  return files;
}

// Files intentionally excluded — api/ endpoints with no client entry point
// (checked by direct grep in main(), not the import graph, since api/
// isn't reachable via client-side imports at all).
const EXCEPTIONS = new Set([
  '__api__/ai-helper.js',
  '__api__/health-check.js',
]);

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

function main() {
  const allFiles = readAllSourceFiles();
  // api/ files aren't part of the src/ import graph (server-side, no
  // client entry point reaches them by import) — checked by direct grep
  // instead, done once here rather than per-run for speed.
  const apiConsumers = allFiles
    .filter((f) => f.includes('/src/'))
    .filter((f) => readFileSync(f, 'utf8').includes('ai-helper'));
  if (apiConsumers.length > 0) {
    throw new Error(`check-no-emoji.mjs: api/ai-helper.js is exempted as dead code, but src/ now references it (${apiConsumers.join(', ')}). Fix its emoji instead.`);
  }

  let failures = 0;
  for (const { root, label } of ROOTS) {
    for (const file of walk(root)) {
      const relPath = relative(root, file);
      const exceptionKey = label === 'api' ? `__api__/${relPath}` : relPath;
      if (isExempt(exceptionKey)) continue;

      const content = readFileSync(file, 'utf8');

      let match;
      const lineStarts = [0, ...[...content.matchAll(/\n/g)].map((m) => m.index + 1)];
      EMOJI_PATTERN.lastIndex = 0;
      while ((match = EMOJI_PATTERN.exec(content))) {
        const lineNo = lineStarts.filter((s) => s <= match.index).length;
        console.error(`${label}/${relPath}:${lineNo}: emoji character "${match[0]}" found`);
        failures++;
      }
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} emoji character(s) found in UI source. See docs/DESIGN_BRIEF.md §7.`);
    process.exit(1);
  } else {
    console.log('No emoji characters found in scoped UI source. OK.');
  }
}

main();
