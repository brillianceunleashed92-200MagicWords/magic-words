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

// Full word list (single source of truth in backend). No `emoji` field —
// the client illustrates words via src/components/WordArt.jsx (SVG
// illustrations keyed by word string), not emoji from data. This list used
// to carry an emoji per word, which flowed straight into `quiz.emoji` and
// was rendered as a literal emoji character by several client components —
// a runtime-data leak the static check-no-emoji.mjs source-grep could
// never catch, since no literal emoji character was ever in that client
// source. See docs/WORDBUILDER_FIX_REPORT.md.
const ALL_WORDS = [
  { word: 'cat',  type: 'content',  unit: 2,  isAction: false, wordClass: 'noun'      },
  { word: 'dog',  type: 'content',  unit: 9,  isAction: false, wordClass: 'noun'      },
  { word: 'bird', type: 'content',  unit: 2,  isAction: false, wordClass: 'noun'      },
  { word: 'frog', type: 'content',  unit: 8,  isAction: false, wordClass: 'noun'      },
  { word: 'eat',  type: 'content',  unit: 3,  isAction: true,  wordClass: 'verb'      },
  { word: 'fly',  type: 'content',  unit: 3,  isAction: true,  wordClass: 'verb'      },
  { word: 'jump', type: 'content',  unit: 4,  isAction: true,  wordClass: 'verb'      },
  { word: 'run',  type: 'content',  unit: 9,  isAction: true,  wordClass: 'verb'      },
  { word: 'big',  type: 'content',  unit: 7,  isAction: false, wordClass: 'adjective' },
  { word: 'sad',  type: 'content',  unit: 13, isAction: false, wordClass: 'adjective' },
  { word: 'the',  type: 'function', unit: 3,  isAction: false, wordClass: 'function'  },
  { word: 'can',  type: 'function', unit: 3,  isAction: false, wordClass: 'function'  },
  { word: 'is',   type: 'function', unit: 5,  isAction: false, wordClass: 'function'  },
  { word: 'they', type: 'function', unit: 6,  isAction: false, wordClass: 'function'  },
  { word: 'not',  type: 'function', unit: 3,  isAction: false, wordClass: 'function'  },
  { word: 'and',  type: 'function', unit: 12, isAction: false, wordClass: 'function'  },
  { word: 'with', type: 'function', unit: 18, isAction: false, wordClass: 'function'  },
  { word: 'do',   type: 'function', unit: 7,  isAction: false, wordClass: 'function'  },
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

  return {
    word:         target.word,
    wordClass:    target.wordClass ?? 'noun', // used by client formatQuestion()
    sentence:     STORY_TEMPLATES[target.word] || `I know the word ___.`,
    options:      options.map(o => ({ word: o.word })),
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

// Adaptive word selection: prioritize struggling, sprinkle mastered, cap new words at 2
function selectSessionWords(progress, focusWord = null) {
  const progressMap = Object.fromEntries(progress.map(w => [w.word, w]));

  const withProgress = ALL_WORDS.map(w => ({
    ...w,
    mastery:      progressMap[w.word]?.mastery       ?? 0,
    attemptCount: progressMap[w.word]?.attempt_count ?? 0,
    lastSeen:     progressMap[w.word]?.last_seen     ?? null,
  }));

  const unseen     = withProgress.filter(w => w.attemptCount === 0);
  const struggling = withProgress.filter(w => w.attemptCount > 0 && w.mastery < 60).sort((a, b) => a.mastery - b.mastery);
  const developing = withProgress.filter(w => w.attemptCount > 0 && w.mastery >= 60 && w.mastery < 80).sort((a, b) => a.mastery - b.mastery);
  const mastered   = withProgress.filter(w => w.mastery >= 80).sort(() => Math.random() - 0.5);

  const hasHistory = struggling.length + developing.length + mastered.length > 0;

  let session;
  if (!hasHistory) {
    // New user: give 6–8 words all from unseen
    session = unseen.slice(0, 8);
  } else {
    session = [
      ...unseen.slice(0, 2),
      ...struggling,
      ...developing,
      ...mastered.slice(0, 2),
    ];
  }

  // Deduplicate
  const seen = new Set();
  const deduped = session.filter(w => { if (seen.has(w.word)) return false; seen.add(w.word); return true; });

  // Fill to minimum 6 from remaining unseen if short
  if (deduped.length < 6) {
    const used = new Set(deduped.map(w => w.word));
    const filler = unseen.filter(w => !used.has(w.word)).slice(0, 6 - deduped.length);
    deduped.push(...filler);
  }

  let result = deduped.slice(0, 8);

  // Promote focusWord to position 0 if specified
  if (focusWord) {
    const idx = result.findIndex(w => w.word === focusWord);
    if (idx > 0) {
      const [fw] = result.splice(idx, 1);
      result.unshift(fw);
    } else if (idx === -1) {
      const fw = withProgress.find(w => w.word === focusWord);
      if (fw) result = [fw, ...result.slice(0, 7)];
    }
  }

  return result;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { userId, progress = [], focusWord = null } = req.body || {};

  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Select session words (fast, no AI)
  const sessionWords    = selectSessionWords(progress, focusWord);
  const difficultyLevel = getDifficultyLevel(progress);

  try {
    // Build word history summary for adaptive AI context
    const wordHistory = progress.map(p => ({
      word:        p.word,
      mastery:     p.mastery,
      attempts:    p.attempt_count ?? 0,
      correctRate: p.attempt_count ? Math.round((p.correct_count ?? 0) / p.attempt_count * 100) : null,
      lastSeen:    p.last_seen ?? null,
    }));

    const prompt = `You are a warm, encouraging reading teacher for children ages 4-8.

A child is starting a new learning session.
- Difficulty level: ${difficultyLevel}
- Words selected for this session: ${sessionWords.map(w => `${w.word} (mastery: ${w.mastery}%, attempts: ${w.attemptCount})`).join(', ')}
- Word history (all words): ${JSON.stringify(wordHistory)}

Adaptive learning rules already applied to word selection:
- Struggling words (mastery < 60%) are prioritized
- 1-2 mastered words included for confidence
- Max 2 brand-new words introduced

Generate a JSON session plan with exactly these fields:
{
  "sessionGoal": "One short, exciting sentence about what we'll learn today (max 8 words, use 'we')",
  "sessionLength": 6,
  "encouragements": ["5 short encouraging phrases for when a child answers correctly. Age 4-8. Enthusiastic! Plain text only, no emojis or special characters. Max 6 words each."],
  "wrongAnswerMessages": ["3 gentle, encouraging messages for wrong answers. Never say 'wrong'. Plain text only, no emojis or special characters. Max 8 words each."],
  "coachingTip": "One teaching tip for this child based on their mastery data (for the parent dashboard, not the child)"
}

For sessionLength: beginners (beginning difficulty) → 4-6, intermediate (emerging/developing) → 6-8, advanced (proficient) → 8-10. Pick based on difficultyLevel above. Must be a number.

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

    // AI can specify session length; clamp to available words
    const defaultLength = difficultyLevel === 'beginning' ? 6 : difficultyLevel === 'proficient' ? 8 : 7;
    const sessionLength = Math.min(
      Math.max(4, aiData.sessionLength ?? defaultLength),
      sessionWords.length
    );
    const chosenWords = sessionWords.slice(0, sessionLength);

    // Build complete quizzes for each session word
    const quizzes = chosenWords.map(w => buildQuiz(w, ALL_WORDS));

    const plan = {
      difficultyLevel,
      sessionLength,
      sessionGoal:        aiData.sessionGoal        ?? `Let's practice ${chosenWords.length} words today!`,
      quizzes,
      wordSequence:       chosenWords,
      encouragements:     aiData.encouragements     ?? ['Great job!', 'Amazing!', 'You did it!', "You're a star!", "Wow!"],
      wrongAnswerMessages: aiData.wrongAnswerMessages ?? ["Let's try again!", "Almost! Keep going!", "You're learning!"],
      coachingTip:        aiData.coachingTip        ?? '',
      generatedAt:        new Date().toISOString(),
      wordCount:          chosenWords.length,
    };

    return res.status(200).json({ plan });

  } catch (err) {
    console.error('[session-generator] AI call failed:', err.message);

    // Full fallback — no AI at all, still a complete working session
    const fallbackLength = Math.min(6, sessionWords.length);
    const fallbackWords  = sessionWords.slice(0, fallbackLength);
    const quizzes = fallbackWords.map(w => buildQuiz(w, ALL_WORDS));
    return res.status(200).json({
      plan: {
        isFallback:          true,
        difficultyLevel,
        sessionLength:       fallbackLength,
        sessionGoal:         "Let's learn some magic words!",
        quizzes,
        wordSequence:        fallbackWords,
        encouragements:      ['Great job!', 'Amazing!', 'You did it!', "You're a star!", "Wow!"],
        wrongAnswerMessages: ["Let's try again!", "Almost!", "Keep going!"],
        coachingTip:         '',
        generatedAt:         new Date().toISOString(),
        wordCount:           fallbackLength,
      }
    });
  }
};
