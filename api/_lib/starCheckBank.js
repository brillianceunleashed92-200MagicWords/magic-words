// api/_lib/starCheckBank.js — CommonJS mirror of src/lib/starCheckBank.js
// for The Star Check (Dr. Marion Blank's 25-word placement screener).
// Server-side session-generator.js is a CommonJS Vercel function and
// can't safely `require()` the ES-module client copy (same reasoning as
// the existing masteryCalibration.js/blankEngineWeighting.js mirrors) —
// keep both files in sync by hand if this table changes; there is no
// build-gated sync check for this pairing (see STAR_CHECK_REPORT.md
// Phase 1 recon, gate-scope section).
//
// Every value here is [PROPOSED] pending Dr. Blank's ratification.

const LEVEL_UNIT_MAP = { 1: 1, 2: 4, 3: 8, 4: 12, 5: 15, clean: 16 };
const TOTAL_LEVELS = 5;
const WORDS_PER_LEVEL = 5;

const BANK = [
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

function wordsForLevel(level) {
  return BANK.filter((entry) => entry.level === level);
}

function frameA(entry) {
  if (!entry.frame) return null;
  if (entry.frame === 'pl') return `Find the ones that are ${entry.word}`;
  if (entry.frame === 'm') return `Find the one that is ${entry.word}`;
  const article = /^[aeiou]/i.test(entry.word) ? 'an' : 'a';
  return `Find the one that is ${article} ${entry.word}`;
}

function voFor(entry, probe) {
  if (probe === 'A') {
    const frame = frameA(entry);
    return frame ? `${frame}.` : null;
  }
  return `Tap the one that says ${entry.word}.`;
}

function isWordKnown(meaningCorrect, lookalikeCorrect) {
  return (meaningCorrect === true || meaningCorrect === null) && lookalikeCorrect === true;
}

function levelProgress(knownResultsSoFar) {
  const misses = knownResultsSoFar.filter((known) => !known).length;
  if (misses >= 2) return { outcome: 'floor', misses };
  if (knownResultsSoFar.length >= WORDS_PER_LEVEL) return { outcome: 'pass', misses };
  return { outcome: 'continue', misses };
}

function startingUnitForFloor(floorLevel) {
  return LEVEL_UNIT_MAP[floorLevel];
}

module.exports = {
  LEVEL_UNIT_MAP, TOTAL_LEVELS, WORDS_PER_LEVEL, BANK,
  wordsForLevel, frameA, voFor, isWordKnown, levelProgress, startingUnitForFloor,
};
