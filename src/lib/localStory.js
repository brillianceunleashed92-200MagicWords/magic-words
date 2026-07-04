// Deterministic (no Math.random — see the purity concern already
// documented in WordBuilder.jsx/GrownUpsScreen.jsx) local story fallback,
// used by the "Story Time" activity when no catalog entry (see
// storyCatalog.js) matches the target word/tier, and structurally
// mirrors api/story-engine.js's own local fallback (a separate CommonJS
// copy per that file's self-contained convention) — same
// fallback-of-fallback pattern useSessionPlan.js's buildLocalQuiz uses.
//
// Length is leveled (mission A3): a brand-new reader gets a single
// decodable sentence, not a 3-sentence story with a comprehension
// question they can't yet handle. Tiers map onto the real 24-level MLC
// progression in src/lib/levels.js — see getStoryTier below for the exact
// level ranges and why.
const DISTRACTOR_POOL = ['a cloud', 'a shoe', 'a spoon', 'a rock', 'a hat', 'a box'];

function hashPick(word, pool, count) {
  const picks = [];
  let seed = [...word].reduce((s, c) => s + c.charCodeAt(0), 0);
  const available = [...pool];
  for (let i = 0; i < count && available.length; i++) {
    seed = (seed * 31 + 7) % available.length;
    picks.push(available.splice(seed % available.length, 1)[0]);
  }
  return picks;
}

// Tier 1 (levels 1-4, "Single content word" through "Simple noun-verb
// sentences"): a single ~3-5 word decodable sentence — essentially the
// word in the simplest possible sentence frame, no comprehension
// question yet (a brand-new reader isn't ready to be quizzed on a story).
// Tier 2 (levels 5-11, introducing "I" through future tense): 2-3 short
// sentences, still simple frames, with a light comprehension check.
// Tier 3 (levels 12-24, compounds/negation/questions/summarizing): the
// fuller story shape, closer to what api/story-engine.js's real AI
// generation produces (6-8 sentences) — this local fallback keeps to a
// more modest 5 for a deterministic, always-safe version of that shape.
export function getStoryTier(level) {
  if (level <= 4) return 1;
  if (level <= 11) return 2;
  return 3;
}

function buildTier1(w) {
  return {
    title: `The ${w}`,
    sentences: [`I see a ${w}.`],
    targetWord: w,
    // No comprehension question at this tier — see tier note above.
  };
}

function buildTier2(w, distractors) {
  return {
    title: `The ${w}`,
    sentences: [
      `I see a ${w}.`,
      `The ${w} is fun.`,
    ],
    targetWord: w,
    comprehensionQuestion: {
      question: 'What did I see?',
      choices: [w, distractors[0]],
      correctIndex: 0,
    },
  };
}

function buildTier3(w, distractors) {
  return {
    title: `The ${w}`,
    sentences: [
      `I see a ${w}.`,
      `The ${w} is fun.`,
      `I like the ${w}!`,
      `We play with the ${w}.`,
      `The ${w} makes me happy.`,
    ],
    targetWord: w,
    comprehensionQuestion: {
      question: 'What did I see?',
      choices: [w, ...distractors],
      correctIndex: 0,
    },
  };
}

// `level` is the child's current level (src/lib/levels.js's LEVELS[].level,
// 1-24) — optional, defaults to the richest tier so any caller that
// doesn't yet pass a level (or the Story Engine's own unrelated fallback
// path) keeps today's existing shape rather than silently degrading.
export function buildLocalStory(quiz, level = 24) {
  const w = quiz.word;
  const distractors = hashPick(w, DISTRACTOR_POOL, 2);
  const tier = getStoryTier(level);
  if (tier === 1) return buildTier1(w);
  if (tier === 2) return buildTier2(w, distractors);
  return buildTier3(w, distractors);
}
