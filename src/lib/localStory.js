// Deterministic (no Math.random — see the purity concern already
// documented in WordBuilder.jsx/GrownUpsScreen.jsx) local story fallback,
// used by the "Story Time" activity (Step 2) before the real AI Story
// Engine (Step 3) exists, and as the Story Engine's own offline fallback
// if generation fails — mirrors the same fallback-of-fallback pattern
// already used by useSessionPlan.js's buildLocalQuiz.
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

export function buildLocalStory(quiz) {
  const w = quiz.word;
  const emoji = quiz.emoji ?? '';
  const distractors = hashPick(w, DISTRACTOR_POOL, 2);
  return {
    title: `The ${w}`,
    sentences: [
      `I see a ${w}. ${emoji}`,
      `The ${w} is fun.`,
      `I like the ${w}!`,
    ],
    targetWord: w,
    comprehensionQuestion: {
      question: 'What did I see?',
      choices: [w, ...distractors],
      correctIndex: 0,
    },
  };
}
