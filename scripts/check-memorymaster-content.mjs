#!/usr/bin/env node
// Proves src/content/memorymaster_content.json still satisfies the shape
// MEMORY_MASTER_R1's rules engine (src/lib/memoryMaster.js) and acceptance
// tests assume: 5 levels x 15 sessions x 2 portions = 150 portions, every
// portion's segments tile its display text exactly (segments.join(' ')
// === display -- MemoryMaster_Module_Handoff.md's "display sentence wins"
// canonical rule), no empty/untrimmed segments, and the Skills Assessment's
// 5 levels each have sentence unit counts (words+capitals+punctuation)
// summing to that level's max_units. A failure here means the content is
// wrong, not the check (per MEMORY_MASTER_R1.md Phase 1) -- do not loosen
// this script to make a bad edit pass.
//
// Run: node scripts/check-memorymaster-content.mjs (wired into `npm run build`).

import { readFileSync } from 'node:fs';

const CONTENT_PATH = new URL('../src/content/memorymaster_content.json', import.meta.url).pathname;

let content;
try {
  content = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
} catch (err) {
  console.error(`[check-memorymaster-content] Could not read/parse ${CONTENT_PATH}: ${err.message}`);
  process.exit(1);
}

const errors = [];

const levels = content?.program?.levels;
if (!Array.isArray(levels) || levels.length !== 5) {
  errors.push(`Expected program.levels to be an array of 5 levels, got ${Array.isArray(levels) ? levels.length : typeof levels}.`);
}

let totalPortions = 0;
if (Array.isArray(levels)) {
  for (const level of levels) {
    const sessions = level?.sessions;
    if (!Array.isArray(sessions) || sessions.length !== 15) {
      errors.push(`Level ${level?.level}: expected 15 sessions, got ${Array.isArray(sessions) ? sessions.length : typeof sessions}.`);
      continue;
    }
    for (const session of sessions) {
      const portions = session?.portions;
      if (!Array.isArray(portions) || portions.length !== 2) {
        errors.push(`Level ${level.level} Session ${session?.session}: expected 2 portions, got ${Array.isArray(portions) ? portions.length : typeof portions}.`);
        continue;
      }
      for (const portion of portions) {
        totalPortions++;
        const where = `Level ${level.level} Session ${session.session} Portion ${portion?.portion}`;
        const segments = portion?.segments;
        const display = portion?.display;
        if (typeof display !== 'string' || display.length === 0) {
          errors.push(`${where}: missing or empty display text.`);
          continue;
        }
        if (!Array.isArray(segments) || segments.length === 0) {
          errors.push(`${where}: segments must be a non-empty array.`);
          continue;
        }
        for (const seg of segments) {
          if (typeof seg !== 'string' || seg.trim().length === 0) {
            errors.push(`${where}: found an empty segment.`);
          } else if (seg !== seg.trim()) {
            errors.push(`${where}: segment "${seg}" has leading/trailing whitespace.`);
          }
        }
        const tiled = segments.join(' ');
        if (tiled !== display) {
          errors.push(`${where}: segments.join(' ') !== display.\n  segments joined: ${JSON.stringify(tiled)}\n  display:         ${JSON.stringify(display)}`);
        }
      }
    }
  }
}

if (totalPortions !== 150) {
  errors.push(`Expected exactly 150 total portions (5 levels x 15 sessions x 2 portions), counted ${totalPortions}.`);
}

const assessmentLevels = content?.skills_assessment?.levels;
if (!Array.isArray(assessmentLevels) || assessmentLevels.length !== 5) {
  errors.push(`Expected skills_assessment.levels to be an array of 5 levels, got ${Array.isArray(assessmentLevels) ? assessmentLevels.length : typeof assessmentLevels}.`);
} else {
  for (const level of assessmentLevels) {
    const sentences = level?.sentences;
    if (!Array.isArray(sentences) || sentences.length === 0) {
      errors.push(`Skills Assessment Level ${level?.level}: sentences must be a non-empty array.`);
      continue;
    }
    let sum = 0;
    for (const sentence of sentences) {
      const u = sentence?.units;
      if (!u || typeof u.words !== 'number' || typeof u.capitals !== 'number' || typeof u.punctuation !== 'number') {
        errors.push(`Skills Assessment Level ${level.level}: sentence "${sentence?.text}" is missing a complete units {words, capitals, punctuation} object.`);
        continue;
      }
      sum += u.words + u.capitals + u.punctuation;
    }
    if (typeof level.max_units !== 'number') {
      errors.push(`Skills Assessment Level ${level.level}: missing max_units.`);
    } else if (sum !== level.max_units) {
      errors.push(`Skills Assessment Level ${level.level}: sentence unit counts sum to ${sum}, but max_units is ${level.max_units}.`);
    }
  }
}

if (content?.meta?.contentVersion !== 1) {
  errors.push(`Expected meta.contentVersion === 1, got ${JSON.stringify(content?.meta?.contentVersion)}.`);
}

if (errors.length > 0) {
  console.error(`[check-memorymaster-content] ${errors.length} problem(s) found in ${CONTENT_PATH}:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`[check-memorymaster-content] OK -- ${totalPortions} portions (5 levels x 15 sessions x 2 portions), all tile their display text exactly; 5 Skills Assessment levels, unit counts match max_units.`);
