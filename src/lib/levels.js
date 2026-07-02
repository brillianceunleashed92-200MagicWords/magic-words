// 24-level progression mapped to Dr. Marion Blank's MLC sentence-complexity
// arc — extracted verbatim from src/App.jsx (see docs/mlc-engine-audit.md
// section 2) so both the legacy App.jsx tree and the new Candy Galaxy
// screens share one source of truth instead of two copies drifting apart.
// `title` = kid-facing celebratory name (space/Nova motif). `stage` = the
// real grammar milestone, useful on parent/teacher dashboards.
export const LEVELS = [
  { level: 1,  minXP: 0,    title: 'First Word',        emoji: '🌟', stage: 'Single content word' },
  { level: 2,  minXP: 60,   title: 'Two-Word Voyager',  emoji: '🚀', stage: 'Two-word phrases' },
  { level: 3,  minXP: 140,  title: 'Phrase Pilot',      emoji: '🛰️', stage: 'Verb + object phrases' },
  { level: 4,  minXP: 240,  title: 'Sentence Spark',    emoji: '✨', stage: 'Simple noun-verb sentences' },
  { level: 5,  minXP: 360,  title: 'My Words',          emoji: '🧑‍🚀', stage: 'Introducing "I"' },
  { level: 6,  minXP: 500,  title: 'Describer',         emoji: '🎨', stage: 'Adjective + noun + verb' },
  { level: 7,  minXP: 660,  title: 'Detail Scout',      emoji: '🔍', stage: 'Subject-verb-adjective' },
  { level: 8,  minXP: 840,  title: 'You & Me',          emoji: '🤝', stage: 'Introducing "you"' },
  { level: 9,  minXP: 1040, title: 'Action Tracker',    emoji: '🏃', stage: 'Present progressive (-ing)' },
  { level: 10, minXP: 1260, title: 'Time Traveler I',   emoji: '⏪', stage: 'Past tense' },
  { level: 11, minXP: 1500, title: 'Time Traveler II',  emoji: '⏩', stage: 'Future tense' },
  { level: 12, minXP: 1760, title: 'Combo Builder',     emoji: '🧩', stage: 'Multi-word tense + object combos' },
  { level: 13, minXP: 2040, title: 'Not-Quite',         emoji: '🚫', stage: 'Negation' },
  { level: 14, minXP: 2340, title: 'Joiner',            emoji: '🔗', stage: 'Compound sentences (and)' },
  { level: 15, minXP: 2660, title: 'Choice Maker',      emoji: '↔️', stage: 'Compound sentences (but/or)' },
  { level: 16, minXP: 3000, title: 'Question Cadet',    emoji: '❓', stage: 'Questions: action' },
  { level: 17, minXP: 3400, title: 'Place Finder',      emoji: '📍', stage: 'Questions: location' },
  { level: 18, minXP: 3850, title: 'Namer',             emoji: '🏷️', stage: 'Questions: identification' },
  { level: 19, minXP: 4350, title: 'Wish Asker',        emoji: '🌠', stage: 'Questions: desire/ability' },
  { level: 20, minXP: 4900, title: 'Double Negative',   emoji: '🙅', stage: 'Questions: negation' },
  { level: 21, minXP: 5500, title: 'Storyteller I',     emoji: '📖', stage: 'Questions: past' },
  { level: 22, minXP: 6150, title: 'Storyteller II',    emoji: '🔮', stage: 'Questions: future' },
  { level: 23, minXP: 6850, title: 'Yes-or-No Expert',  emoji: '✅', stage: 'Questions: yes/no' },
  { level: 24, minXP: 7600, title: 'Galaxy Narrator',   emoji: '👑', stage: 'Summarizing events' },
];
export const MAX_LEVEL = LEVELS.length;

export function getLevelInfo(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXP) current = lvl;
    else break;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = LEVELS[nextIdx];
  const progress = next
    ? Math.round(((xp - current.minXP) / (next.minXP - current.minXP)) * 100)
    : 100;
  return { ...current, nextLevelXP: next?.minXP ?? null, progress };
}
