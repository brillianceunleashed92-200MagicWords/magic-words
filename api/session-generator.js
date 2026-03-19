// api/session-generator.js
// THE KEY AI OPTIMIZATION.
// Called ONCE when a child logs in — pre-generates the full session plan.
// Returns: quiz sequence, word order, difficulty level, encouragements.
// All game taps use cached plan — zero AI calls during actual play.
//
// Input:  { userId, progress: [{word, mastery, lastPracticed}] }
// Output: { plan: { quizzes[], wordSequence[], encouragements[], difficultyLevel, sessionGoal } }

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Full word list with emojis (single source of truth in backend)
const ALL_WORDS = [
  { word: 'cat',  type: 'content',  unit: 2,  emoji: '🐱', isAction: false },
  { word: 'dog',  type: 'content',  unit: 9,  emoji: '🐶', isAction: false },
  { word: 'bird', type: 'content',  unit: 2,  emoji: '🐦', isAction: false },
  { word: 'frog', type: 'content',  unit: 8,  emoji: '🐸', isAction: false },
  { word: 'eat',  type: 'content',  unit: 3,  emoji: '🍎', isAction: true  },
  { word: 'fly',  type: 'content',  unit: 3,  emoji: '✈️', isAction: true  },
  { word: 'jump', type: 'content',  unit: 4,  emoji: '🦘', isAction: true  },
  { word: 'run',  type: 'content',  unit: 9,  emoji: '🏃', isAction: true  },
  { word: 'big',  type: 'content',  unit: 7,  emoji: '🐘', isAction: false },
  { word: 'sad',  type: 'content',  unit: 13, emoji: '😢', isAction: false },
  { word: 'the',  type: 'function', unit: 3,  emoji: '📖', isAction: false },
  { word: 'can',  type: 'function', unit: 3,  emoji: '✅', isAction: false },
  { word: 'is',   type: 'function', unit: 5,  emoji: '🔗', isAction: false },
  { word: 'they', type: 'function', unit: 6,  emoji: '👥', isAction: false },
  { word: 'not',  type: 'function', unit: 3,  emoji: '🚫', isAction: false },
  { word: 'and',  type: 'function', unit: 12, emoji: '➕', isAction: false },
  { word: 'with', type: 'function', unit: 18, emoji: '🤝', isAction: false },
  { word: 'do',   type: 'function', unit: 7,  emoji: '⚡', isAction: false },
];

// Story templates for Story Builder game
const STORY_TEMPLATES = {
  cat:  "The ___ sat on the mat.",
  dog:  "My ___ loves to play.",
  bird: "A little ___ sang a song.",
  frog: "The green ___ jumped up.",
  eat:  "I like to ___ my lunch.",
  fly:  "Can birds ___ up high?",
  jump: "Watch the bunny ___ over!",
  run:  "We love to ___ and play.",
  big:  "That is a ___ elephant!",
  sad:  "Do not be ___ today.",
  the:  "I read ___ big book.",
  can:  "I ___ do it myself!",
  is:   "This ___ my favorite word.",
  they: "___ love to read together.",
  not:  "I am ___ going to give up.",
  and:  "Cats ___ dogs are friends.",
  with: "Play ___ me at recess.",
  do:   "What can you ___?",
};

// Build a quiz for a word with 3 distractors
function buildQuiz(targetWord, allWords) {
  const target = allWords.find(w => w.word === targetWord.word) || targetWord;
  const distractors = allWords
    .filter(w => w.word !== target.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const options = [...distractors, target].sort(() => Math.random() - 0.5);
  const correctIndex = options.findIndex(o => o.word === target.word);

  const question = target.isAction
    ? `Which picture shows someone ${target.word}ing?`
    : `Which picture shows a ${target.word}?`;

  return {
    word:         target.word,
    emoji:        target.emoji,
    question,
    sentence:     STORY_TEMPLATES[target.word] || `I know the word ___.`,
    options:      options.map(o => ({ word: o.word, emoji: o.emoji })),
    correctIndex,
    mastery:      targetWord.mastery || 0,
  };
}

// Determine difficulty level from progress
function getDifficultyLevel(progress) {
  if (!progress.length) return 'beginning';
  const avgMastery = progress.reduce((s, w) => s + w.mastery, 0) / progress.length;
  if (avgMastery < 30)  return 'beginning';
  if (avgMastery < 60)  return 'emerging';
  if (avgMastery < 85)  return 'developing';
  return 'proficient';
}

// Select which words to practice this session (without AI, as fast fallback)
function selectSessionWords(progress) {
  const progressMap = Object.fromEntries(progress.map(w => [w.word, w]));

  return ALL_WORDS
    .map(w => ({
      ...w,
      mastery:       progressMap[w.word]?.mastery ?? 0,
      lastPracticed: progressMap[w.word]?.lastPracticed ?? null,
    }))
    .sort((a, b) => {
      // Prioritize: unstarted → low mastery → stale words
      const aScore = a.mastery + (a.lastPracticed ? 0 : -50);
      const bScore = b.mastery + (b.lastPracticed ? 0 : -50);
      return aScore - bScore;
    })
    .slice(0, 8); // 8 words per session
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { userId, progress = [] } = req.body || {};

  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Select session words (fast, no AI)
  const sessionWords  = selectSessionWords(progress);
  const difficultyLevel = getDifficultyLevel(progress);

  try {
    // Single AI call — generates encouragements, session goal, and validates/enriches the plan
    const prompt = `You are a warm, encouraging reading teacher for children ages 4-8.

A child is starting a new learning session. Here is their progress data:
- Difficulty level: ${difficultyLevel}
- Words they'll practice: ${sessionWords.map(w => `${w.word} (mastery: ${w.mastery}%)`).join(', ')}
- Total words in program: ${ALL_WORDS.length}

Generate a JSON session plan with exactly these fields:
{
  "sessionGoal": "One short, exciting sentence about what we'll learn today (max 8 words, use 'we')",
  "encouragements": ["5 short encouraging phrases for when a child answers correctly. Age 4-8. Enthusiastic! Use emojis. Max 6 words each."],
  "wrongAnswerMessages": ["3 gentle, encouraging messages for wrong answers. Never say 'wrong'. Max 8 words each."],
  "coachingTip": "One teaching tip for this child based on their level (for the parent dashboard, not the child)"
}

Respond with ONLY valid JSON. No explanation, no markdown, no backticks.`;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 500,
      messages:   [{ role: 'user', content: prompt }],
    });

    let aiData = {};
    try {
      const text = message.content[0].text.trim();
      aiData = JSON.parse(text);
    } catch (parseErr) {
      console.error('[session-generator] JSON parse failed:', parseErr.message);
      // Non-fatal — use defaults
    }

    // Build complete quizzes for each session word
    const quizzes = sessionWords.map(w => buildQuiz(w, ALL_WORDS));

    const plan = {
      difficultyLevel,
      sessionGoal:        aiData.sessionGoal        ?? `Let's practice ${sessionWords.length} words today!`,
      quizzes,
      wordSequence:       sessionWords,
      encouragements:     aiData.encouragements     ?? ['Great job! ⭐', 'Amazing! 🌟', 'You did it! 🎉', "You're a star! ✨", "Wow! 🎈"],
      wrongAnswerMessages: aiData.wrongAnswerMessages ?? ["Let's try again! 💪", "Almost! Keep going! 🌟", "You're learning! ⭐"],
      coachingTip:        aiData.coachingTip        ?? '',
      generatedAt:        new Date().toISOString(),
      wordCount:          sessionWords.length,
    };

    return res.status(200).json({ plan });

  } catch (err) {
    console.error('[session-generator] AI call failed:', err.message);

    // Full fallback — no AI at all, still a complete working session
    const quizzes = sessionWords.map(w => buildQuiz(w, ALL_WORDS));
    return res.status(200).json({
      plan: {
        isFallback:          true,
        difficultyLevel,
        sessionGoal:         "Let's learn some magic words!",
        quizzes,
        wordSequence:        sessionWords,
        encouragements:      ['Great job! ⭐', 'Amazing! 🌟', 'You did it! 🎉', "You're a star! ✨", "Wow! 🎈"],
        wrongAnswerMessages: ["Let's try again! 💪", "Almost! 🌟", "Keep going! ⭐"],
        coachingTip:         '',
        generatedAt:         new Date().toISOString(),
        wordCount:           sessionWords.length,
      }
    });
  }
};
