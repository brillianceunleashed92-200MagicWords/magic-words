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
// Reachability isn't just asserted in a comment anymore — it's checked by
// this script at run time (see assertUnreachable() below), so a future
// change that makes an "unreachable" file reachable again fails the check
// automatically instead of relying on someone noticing.
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
import { join, relative, dirname } from 'node:path';

const SRC_ROOT = new URL('../src', import.meta.url).pathname;
const API_ROOT = new URL('../api', import.meta.url).pathname;
const ROOTS = [
  { root: SRC_ROOT, label: 'src' },
  { root: API_ROOT, label: 'api' },
];

// ─── Reachability proof ────────────────────────────────────────────────────
// Live entry points, per src/main.jsx: Landing (route "/"), CandyGalaxyShell
// (route "/app/*"). App.jsx (route "/app-legacy/*") is deliberately NOT
// listed here — it's the one legacy exception, and its own unreachability
// (nothing links to /app-legacy) is checked separately below.
const LIVE_ENTRY_FILES = ['src/pages/landing/Landing.jsx', 'src/CandyGalaxyShell.jsx'];

function readAllSourceFiles() {
  const files = [];
  for (const { root } of ROOTS) files.push(...walk(root));
  files.push(new URL('../src/main.jsx', import.meta.url).pathname);
  return files;
}

// Very small same-repo import graph: resolves relative imports only (this
// codebase doesn't import app files via bare specifiers), case-insensitive
// extension guessing. Good enough to answer "is file X reachable from live
// entry points" without a full bundler.
function buildImportGraph(allFiles) {
  const byPath = new Map(allFiles.map((f) => [f, f]));
  const resolve = (fromFile, spec) => {
    if (!spec.startsWith('.')) return null;
    const base = join(dirname(fromFile), spec);
    const candidates = [base, `${base}.jsx`, `${base}.js`, join(base, 'index.jsx'), join(base, 'index.js')];
    for (const c of candidates) if (byPath.has(c)) return c;
    return null;
  };
  const graph = new Map(); // file -> Set(imported files)
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf8');
    const specs = [...content.matchAll(/from\s+['"](\.[^'"]+)['"]/g), ...content.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)]
      .map((m) => m[1]);
    const resolved = new Set();
    for (const spec of specs) {
      const r = resolve(file, spec);
      if (r) resolved.add(r);
    }
    graph.set(file, resolved);
  }
  return graph;
}

function reachableFrom(graph, startFiles) {
  const seen = new Set();
  const stack = [...startFiles];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const dep of graph.get(f) ?? []) stack.push(dep);
  }
  return seen;
}

// Throws if `relFileFromRepoRoot` is reachable from any live entry point —
// i.e. actually proves the exemption, rather than asserting it in a
// comment. Run once at script start; a failure here means someone wired a
// previously-dead file back into the live app without revisiting its
// emoji exemption.
function assertUnreachable(allFiles, graph, relFileFromRepoRoot, reason) {
  const target = new URL(`../${relFileFromRepoRoot}`, import.meta.url).pathname;
  if (!allFiles.includes(target)) {
    throw new Error(`check-no-emoji.mjs: exempted file ${relFileFromRepoRoot} no longer exists — remove or update this exemption.`);
  }
  const entryFiles = LIVE_ENTRY_FILES.map((f) => new URL(`../${f}`, import.meta.url).pathname);
  const reachable = reachableFrom(graph, entryFiles);
  if (reachable.has(target)) {
    throw new Error(
      `check-no-emoji.mjs: ${relFileFromRepoRoot} is exempted as unreachable (${reason}), ` +
      `but is actually reachable from a live entry point. Fix its emoji instead of keeping the exemption.`
    );
  }
}

// Files intentionally excluded. Each one is mechanically verified
// unreachable at the top of main() below — this list is not itself the
// proof, assertUnreachable() is.
const EXCEPTIONS = new Set([
  'App.jsx',
  'components/WordGalaxyMap.jsx',
  '__api__/ai-helper.js',
  '__api__/health-check.js',
]);

// Within games/GameEngine.jsx specifically: SoundMatch, SpellItOut,
// GameTypeSelector, MLC_TYPES/GAME_TYPES, and UpgradeModal are confirmed
// unreachable from the live app — PlayScreen.jsx's own activity list
// (the only live entry point into GameEngine) never offers 'sound_match'
// or 'spell_it_out', and GameTypeSelector/UpgradeModal are imported only
// by the legacy App.jsx tree (mechanically verified above, since
// GameEngine.jsx as a whole IS reachable — only these specific functions
// within it are dead).
//
// SessionProgress was PREVIOUSLY exempted here as "only rendered for
// non-rebuilt activities, same reasoning [dead]" — that was wrong. It's
// the progress bar for every gameType not in GameEngine.jsx's isE2Activity
// list (sound_match/spell_it_out/story_time/say_it as of Prompt 6 —
// draw_it and find_the_word both since moved onto the E2/Candy chrome),
// all of which are real, live entries in PlayScreen.jsx's activity
// list (confirmed directly, not assumed) — "not one of the E2-rebuilt
// activities" does not mean "unreachable." This exemption
// hid a real emoji (⭐) in a genuinely live component from every run of
// this check until it was found and fixed (story-time-and-audio branch).
// Removed from the exempt list rather than re-justified, since after the
// fix there's nothing left to exempt.
const GAME_ENGINE_EXEMPT_FUNCTIONS = ['SoundMatch', 'SpellItOut', 'GameTypeSelector', 'UpgradeModal'];
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

function main() {
  const allFiles = readAllSourceFiles();
  const graph = buildImportGraph(allFiles);

  // Mechanically prove every whole-file exemption is actually unreachable
  // before trusting it — this is the "prove it by grepping the import
  // chain" step, automated so it can't silently go stale.
  assertUnreachable(allFiles, graph, 'src/App.jsx', 'legacy pre-Candy-Galaxy tree, only reachable via /app-legacy which nothing links to');
  assertUnreachable(allFiles, graph, 'src/components/WordGalaxyMap.jsx', 'only imported by App.jsx');
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
      const isGameEngine = label === 'src' && relPath === 'games/GameEngine.jsx';
      const exemptRanges = isGameEngine ? findGameEngineExemptRanges(content) : [];

      let match;
      const lineStarts = [0, ...[...content.matchAll(/\n/g)].map((m) => m.index + 1)];
      EMOJI_PATTERN.lastIndex = 0;
      while ((match = EMOJI_PATTERN.exec(content))) {
        if (isGameEngine && inAnyRange(match.index, exemptRanges)) continue;
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
    console.log('No emoji characters found in scoped UI source (all exemptions mechanically verified unreachable). OK.');
  }
}

main();
