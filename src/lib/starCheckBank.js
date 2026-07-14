// src/lib/starCheckBank.js — The Star Check (Dr. Marion Blank's 25-word
// placement screener), per docs/design/mockups/mockup-O-blank-assessment.html
// and DESIGN_BRIEF_V2.md. Every value in this file is [PROPOSED] pending
// Dr. Blank's ratification (see the master doc's OPEN ITEMS) — a later
// config-only change replaces the words/options/mapping, not this file's
// shape.
//
// Server-side (api/session-generator.js) keeps its OWN literal mirror of
// BANK (CommonJS can't safely `require()` this ES module the same way
// masteryCalibration.js/blankEngineWeighting.js are mirrored, not
// imported, into that file) — keep both in sync by hand if this table
// changes; there is no build-gated sync check for this pairing (recon
// confirmed none of the 6 existing sync checks pattern-match a new
// `starCheck*` namespace, and this run does not add a 7th).

// [PROPOSED — CURRICULUM_RECON_R1 replaces these numbers] Level -> starting
// Unit mapping. `clean` = passed all 5 levels outright.
export const LEVEL_UNIT_MAP = Object.freeze({ 1: 1, 2: 4, 3: 8, 4: 12, 5: 15, clean: 16 });

export const TOTAL_LEVELS = 5;
export const WORDS_PER_LEVEL = 5;

// [HER DOC] Dr. Blank's "Magic Words for the Revision" (2026-07-13), verbatim,
// with two child-safety foil swaps noted below (kit for kid's 4th B-foil;
// see docs/design/mockups/mockup-O-blank-assessment.html's own [HER DOC]
// comment for why). `frame` is null for print-only words — those have NO
// meaning probe, never a faked one (`meaningA` is also null for them).
export const BANK = [
  { level: 1, word: 'kid', frame: 'n', meaningA: ['man', 'dog', 'kid', 'bird'], lookalikeB: ['kin', 'kid', 'kit', 'bid'] },
  { level: 1, word: 'girl', frame: 'n', meaningA: ['boy', 'girl', 'cat', 'bus'], lookalikeB: ['gill', 'girl', 'grid', 'gird'] },
  { level: 1, word: 'boys', frame: 'pl', meaningA: ['girls', 'boys', 'cows', 'hats'], lookalikeB: ['bogs', 'boys', 'buys', 'sobs'] },
  { level: 1, word: 'eat', frame: null, meaningA: null, lookalikeB: ['ate', 'eat', 'tea', 'oat'] },
  { level: 1, word: 'rest', frame: null, meaningA: null, lookalikeB: ['rust', 'rest', 'nest', 'rats'] },

  { level: 2, word: 'baby', frame: 'n', meaningA: ['man', 'baby', 'cow', 'fish'], lookalikeB: ['babe', 'baby', 'bays', 'tabby'] },
  { level: 2, word: 'good', frame: null, meaningA: null, lookalikeB: ['goad', 'good', 'gold', 'hood'] },
  { level: 2, word: 'duck', frame: 'n', meaningA: ['cat', 'duck', 'cow', 'pig'], lookalikeB: ['dusk', 'duck', 'dock', 'luck'] },
  { level: 2, word: 'move', frame: null, meaningA: null, lookalikeB: ['mole', 'move', 'dove', 'movie'] },
  { level: 2, word: 'water', frame: 'm', meaningA: ['milk', 'water', 'sand', 'fire'], lookalikeB: ['wader', 'water', 'waiter', 'later'] },

  { level: 3, word: 'sad', frame: null, meaningA: null, lookalikeB: ['sat', 'sad', 'ads', 'said'] },
  { level: 3, word: 'rocks', frame: 'pl', meaningA: ['sticks', 'rocks', 'leaves', 'shells'], lookalikeB: ['socks', 'rocks', 'racks', 'corks'] },
  { level: 3, word: 'cry', frame: null, meaningA: null, lookalikeB: ['dry', 'cry', 'wry', 'fry'] },
  { level: 3, word: 'hole', frame: 'n', meaningA: ['door', 'hole', 'hill', 'box'], lookalikeB: ['hold', 'hole', 'mole', 'whole'] },
  { level: 3, word: 'push', frame: null, meaningA: null, lookalikeB: ['posh', 'push', 'plush', 'bush'] },

  { level: 4, word: 'plant', frame: 'n', meaningA: ['grass', 'plant', 'bug', 'stone'], lookalikeB: ['plane', 'plant', 'pant', 'planet'] },
  { level: 4, word: 'animal', frame: 'n', meaningA: ['person', 'animal', 'house', 'cloud'], lookalikeB: ['annual', 'animal', 'manila', 'lamina'] },
  { level: 4, word: 'small', frame: null, meaningA: null, lookalikeB: ['smell', 'small', 'stall', 'malls'] },
  { level: 4, word: 'dig', frame: null, meaningA: null, lookalikeB: ['dip', 'dig', 'big', 'grid'] },
  { level: 4, word: 'safe', frame: null, meaningA: null, lookalikeB: ['save', 'safe', 'sale', 'sofa'] },

  { level: 5, word: 'bite', frame: null, meaningA: null, lookalikeB: ['bit', 'bite', 'kite', 'tribe'] },
  { level: 5, word: 'letter', frame: 'n', meaningA: ['book', 'letter', 'chair', 'lamp'], lookalikeB: ['later', 'letter', 'litter', 'settle'] },
  { level: 5, word: 'smile', frame: null, meaningA: null, lookalikeB: ['slime', 'smile', 'miles', 'mile'] },
  { level: 5, word: 'open', frame: null, meaningA: null, lookalikeB: ['oven', 'open', 'nope', 'pen'] },
  { level: 5, word: 'trees', frame: 'pl', meaningA: ['bushes', 'trees', 'hills', 'roads'], lookalikeB: ['tress', 'trees', 'steer', 'tries'] },
];

export function wordsForLevel(level) {
  return BANK.filter((entry) => entry.level === level);
}

// frameA: 'n' -> "Find the one that is a/an <word>" (an before a vowel
// sound); 'pl' -> "Find the ones that are <word>"; 'm' -> "Find the one
// that is <word>". Print-only words (frame === null) return null — never
// a faked meaning probe.
export function frameA(entry) {
  if (!entry.frame) return null;
  if (entry.frame === 'pl') return `Find the ones that are ${entry.word}`;
  if (entry.frame === 'm') return `Find the one that is ${entry.word}`;
  const article = /^[aeiou]/i.test(entry.word) ? 'an' : 'a';
  return `Find the one that is ${article} ${entry.word}`;
}

// voFor: probe 'A' (meaning) speaks the frame line; probe 'B' (look-alike)
// always speaks the same dictation line. Returns null for probe 'A' on a
// print-only word (caller must not administer probe A at all in that case).
export function voFor(entry, probe) {
  if (probe === 'A') {
    const frame = frameA(entry);
    return frame ? `${frame}.` : null;
  }
  return `Tap the one that says ${entry.word}.`;
}

// A word is "known" only if both administered probes are correct. A
// print-only word never administers probe A, so `meaningCorrect` is
// `null` for it — treated as a pass-through, not a hit or a miss, matching
// mockup O's own `(e.a===true||e.a===null) && e.b===true` rule.
export function isWordKnown(meaningCorrect, lookalikeCorrect) {
  return (meaningCorrect === true || meaningCorrect === null) && lookalikeCorrect === true;
}

// Pure routing reducer over one level's administered words so far (in
// order). Two missed words within a level ends the check right there
// ("floor"); finishing all 5 with at most one miss passes the level
// ("pass"); anything in between is "continue" (keep administering this
// level's words).
export function levelProgress(knownResultsSoFar) {
  const misses = knownResultsSoFar.filter((known) => !known).length;
  if (misses >= 2) return { outcome: 'floor', misses };
  if (knownResultsSoFar.length >= WORDS_PER_LEVEL) return { outcome: 'pass', misses };
  return { outcome: 'continue', misses };
}

export function startingUnitForFloor(floorLevel) {
  return LEVEL_UNIT_MAP[floorLevel];
}
