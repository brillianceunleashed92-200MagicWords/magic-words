// api/session-generator.js
// THE KEY AI OPTIMIZATION.
// Called ONCE when a child logs in — pre-generates the full session plan.
// Returns: quiz sequence, word order, difficulty level, encouragements.
// All game taps use cached plan — zero AI calls during actual play.
//
// Sprint 2 Part B: previously selected sessions from an 18-word hardcoded
// ALL_WORDS list while the real curriculum (Supabase `words`, 200 rows)
// sat unreachable by the games — the product's core "200 words, finite,
// complete" promise wasn't actually deliverable through gameplay. This
// version fetches candidates from `words` directly and selects by the
// child's real position in the curriculum (word_progress), server-side —
// the client sends only { childId, focusWord }, never progress data or a
// plan, so a client can't lie about mastery to unlock harder words or
// bypass the free-tier unit cap.
//
// Input:  { childId, focusWord? }
// Output: { plan: { quizzes[], wordSequence[], encouragements[], difficultyLevel, sessionGoal } }

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { requireAuthAndRateLimit } = require('./_lib/security');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MASTERED_THRESHOLD = 80;

// Mirrors src/lib/queries/subscription.js's FREE_TIER_MAX_UNIT /
// isUnitLocked — server-side copy because this endpoint must enforce the
// gate itself, not trust whatever the client claims its plan is.
const FREE_TIER_MAX_UNIT = 5;

// Words with a real hand-illustrated WordArt (src/components/WordArt.jsx
// REGISTRY) — every other word in that registry key set is either not a
// real curriculum word (e.g. "elephant", a leftover asset) or would be
// picked up here once added. Picture-matching activities (Word Match,
// Sound Match, Word Hunt, Rhyme Time) may only draw from this set — a
// function word or an unillustrated content word rendered as "the picture
// of X" is pedagogically wrong (you can't picture "the") and visually
// degrades to a text chip pretending to be a photo. Keep this in sync
// with WordArt.jsx's REGISTRY keys; it intentionally excludes 'elephant'
// since that word isn't in the words table.
const PICTURE_ART_WORDS = ['dog', 'cat', 'bird', 'frog', 'eat', 'fly', 'jump', 'run', 'big', 'sad'];
const PICTURE_ART_SET = new Set(PICTURE_ART_WORDS);

// Context-template sentences for function words (type='function' in the
// words table, teaching_track='sight'). These are grammatically closed-
// class words — "the", "is", "with" — that can't be pictured and, per
// Dr. Blank's methodology, are taught in context rather than in
// isolation. Generic per-type templates (see CONTENT_TEMPLATES below)
// don't work here since each closed-class word has its own idiomatic
// usage; hand-written one-per-word instead. All 45 function words in the
// live curriculum are covered — see docs/words-classification-audit.md
// for the source classification this list is built from.
const FUNCTION_SENTENCES = {
  the: 'I read ___ big book.',
  a: 'I saw ___ cat in the yard.',
  is: 'This ___ my favorite word.',
  not: 'I am ___ going to give up.',
  can: 'I ___ do it myself!',
  and: 'Cats ___ dogs are friends.',
  or: 'Do you want milk ___ juice?',
  but: 'I like cats, ___ I love dogs.',
  this: '___ is my favorite toy.',
  I: '___ can read this book!',
  you: 'Can ___ help me, please?',
  he: '___ likes to play outside.',
  she: '___ is my best friend.',
  we: '___ are going to the park.',
  they: '___ love to read together.',
  me: 'Give the book to ___.',
  my: 'This is ___ favorite word.',
  in: 'The cat is ___ the box.',
  on: 'Put the cup ___ the table.',
  up: 'The bird flew ___ high.',
  down: 'The ball rolled ___ the hill.',
  to: 'I want ___ read a story.',
  at: 'We will meet ___ noon.',
  for: 'This gift is ___ you.',
  with: 'Play ___ me at recess.',
  here: 'Come ___ and sit with me.',
  there: 'The book is over ___.',
  do: 'What can you ___?',
  it: 'I found my toy — ___ was under the bed.',
  that: 'Is ___ your favorite word?',
  all: 'We ate ___ of the cookies.',
  more: 'Can I have ___ juice, please?',
  no: 'I said ___ to more candy.',
  yes: '___, I would love to play!',
  now: "Let's read a story right ___.",
  many: 'There are ___ stars in the sky.',
  then: 'First we eat, ___ we play.',
  after: 'We will play ___ lunch.',
  before: 'Wash your hands ___ you eat.',
  so: 'I was tired, ___ I took a nap.',
  because: 'I smiled ___ I was happy.',
  when: '___ do we get to go outside?',
  where: '___ did you put my book?',
  what: '___ is your favorite word?',
  how: '___ many words do you know?',
};

// Content words (noun/verb/adjective/number) get a deterministic pick from
// a small set of natural per-type templates — not one hand-written
// sentence each (155 words), but not a single robotic template either.
const CONTENT_TEMPLATES = {
  noun:      ['I see a ___.', 'Look at the ___!', 'I have a ___.', 'Where is the ___?'],
  verb:      ['I like to ___.', 'Watch me ___!', 'Can you ___?', "Let's ___ together!"],
  adjective: ['That is so ___!', 'I feel ___ today.', 'The dog is ___.', 'This looks ___.'],
  number:    ['I count to ___.', 'I have ___ toys.', 'Can you find ___ stars?', 'There are ___ apples.'],
};

function buildSentence(word, wordType) {
  if (wordType === 'function') return FUNCTION_SENTENCES[word] ?? 'I know the word ___.';
  const templates = CONTENT_TEMPLATES[wordType] ?? CONTENT_TEMPLATES.noun;
  let hash = 0;
  for (const ch of word) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return templates[hash % templates.length];
}

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Build one quiz for a target word. Picture-eligible targets only ever
// get picture-eligible distractors (drawn from the fixed 10-word art set,
// not the session's own candidate pool, which guarantees all 4 options
// are real pictures even in a small/thin session) — non-eligible targets
// draw distractors from the rest of the session's candidate pool, padding
// from the art set only if that pool is too thin to reach 3.
function buildQuiz(target, candidatePool) {
  const pictureEligible = target.word_type !== 'function' && PICTURE_ART_SET.has(target.word);

  let distractorWords;
  if (pictureEligible) {
    distractorWords = shuffled(PICTURE_ART_WORDS.filter((w) => w !== target.word)).slice(0, 3);
  } else {
    const poolWords = candidatePool.filter((w) => w.word !== target.word).map((w) => w.word);
    distractorWords = shuffled(poolWords).slice(0, 3);
    while (distractorWords.length < 3) {
      const filler = PICTURE_ART_WORDS[Math.floor(Math.random() * PICTURE_ART_WORDS.length)];
      if (filler !== target.word && !distractorWords.includes(filler)) distractorWords.push(filler);
    }
  }

  const optionWords = shuffled([...distractorWords, target.word]);
  const correctIndex = optionWords.indexOf(target.word);

  return {
    word: target.word,
    wordClass: target.word_type, // used by client formatQuestion()
    unit: target.unit,
    pictureEligible,
    sentence: buildSentence(target.word, target.word_type),
    options: optionWords.map((word) => ({ word })),
    correctIndex,
    mastery: target.mastery ?? 0,
  };
}

function getDifficultyLevel(progress) {
  if (!progress.length) return 'beginning';
  const avgMastery = progress.reduce((s, w) => s + (w.mastery ?? 0), 0) / progress.length;
  if (avgMastery < 30) return 'beginning';
  if (avgMastery < 60) return 'emerging';
  if (avgMastery < 85) return 'developing';
  return 'proficient';
}

// Verifies childId belongs to the verified caller (same ownership-check
// pattern as every other IDOR-hardened endpoint — never trust a
// client-supplied ID), then looks up the account's real plan and the
// child's real word_progress. Returns null if ownership doesn't check out.
async function fetchChildContext(admin, childId, userId) {
  const { data: childRow, error: childErr } = await admin
    .from('child_profiles')
    .select('id, parent_id')
    .eq('id', childId)
    .maybeSingle();
  if (childErr || !childRow || childRow.parent_id !== userId) return null;

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle();
  const plan = sub?.plan === 'family' && sub?.status === 'active' ? 'family' : 'free';

  const { data: progress } = await admin
    .from('word_progress')
    .select('word, mastery, attempt_count, correct_count, last_seen, next_review_at')
    .eq('child_id', childId);

  return { plan, progress: progress ?? [] };
}

// Candidate pool = current unit's unmastered words + words due for
// spaced-repetition review + a small confidence sample of mastered words,
// all filtered to the account's actual plan (free tier never sees a word
// above FREE_TIER_MAX_UNIT, enforced here — not by trusting the client).
async function selectCandidateWords(admin, plan, progress) {
  const maxUnit = plan === 'family' ? 18 : FREE_TIER_MAX_UNIT;
  const { data: allWords } = await admin
    .from('words')
    .select('word, unit, sort_order, word_type')
    .lte('unit', maxUnit)
    .order('sort_order');

  const progressMap = new Map(progress.map((p) => [p.word, p]));
  const now = Date.now();

  const withProgress = (allWords ?? []).map((w) => {
    const p = progressMap.get(w.word);
    return {
      ...w,
      mastery: p?.mastery ?? 0,
      attemptCount: p?.attempt_count ?? 0,
      lastSeen: p?.last_seen ?? null,
      dueForReview: p?.next_review_at ? new Date(p.next_review_at).getTime() <= now : false,
    };
  });

  // Current unit = the lowest unit (within plan range) that still has an
  // unmastered word; a brand-new child with zero progress starts at
  // whatever the lowest seeded unit is (1).
  const units = [...new Set(withProgress.map((w) => w.unit))].sort((a, b) => a - b);
  let currentUnit = units[0] ?? 1;
  for (const unit of units) {
    const hasUnmastered = withProgress.some((w) => w.unit === unit && w.mastery < MASTERED_THRESHOLD);
    currentUnit = unit;
    if (hasUnmastered) break;
  }

  const currentUnitWords = withProgress.filter((w) => w.unit === currentUnit && w.mastery < MASTERED_THRESHOLD);
  const dueForReview = withProgress.filter((w) => w.dueForReview && w.unit !== currentUnit);
  const masteredSample = shuffled(withProgress.filter((w) => w.mastery >= MASTERED_THRESHOLD)).slice(0, 2);

  const seen = new Set();
  const pool = [...currentUnitWords, ...dueForReview, ...masteredSample].filter((w) => {
    if (seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });

  if (pool.length < 6) {
    const filler = withProgress.filter((w) => !seen.has(w.word) && w.unit <= currentUnit + 1);
    for (const w of filler) {
      if (pool.length >= 8) break;
      pool.push(w);
      seen.add(w.word);
    }
  }

  return { pool: pool.slice(0, 8), currentUnit };
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const verifiedUser = await requireAuthAndRateLimit(req, res, 'session-generator', 10, 1);
  if (!verifiedUser) return;

  const rawChildId = req.body?.childId;
  const rawFocusWord = req.body?.focusWord;
  const childId = typeof rawChildId === 'string' && /^[0-9a-f-]{36}$/i.test(rawChildId) ? rawChildId : null;
  const focusWord = typeof rawFocusWord === 'string' && /^[a-z']{1,40}$/i.test(rawFocusWord) ? rawFocusWord : null;

  if (!childId) return res.status(400).json({ error: 'childId is required' });

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const context = await fetchChildContext(admin, childId, verifiedUser.id);
  if (!context) return res.status(403).json({ error: 'Child not found for this account' });

  const { plan, progress } = context;
  const { pool: candidatePool, currentUnit } = await selectCandidateWords(admin, plan, progress);
  const difficultyLevel = getDifficultyLevel(progress);

  let sessionWords = candidatePool;
  if (focusWord) {
    const idx = sessionWords.findIndex((w) => w.word === focusWord);
    if (idx > 0) {
      const [fw] = sessionWords.splice(idx, 1);
      sessionWords.unshift(fw);
    }
    // If the focus word isn't in the current candidate pool (e.g. tapped
    // from the Word Galaxy map, outside the adaptive selection), it's
    // simply not forced in — respecting the plan's unit cap and the
    // pool's own selection logic takes priority over an arbitrary tap.
  }

  try {
    const wordHistory = progress.map((p) => ({
      word: p.word,
      mastery: p.mastery,
      attempts: p.attempt_count ?? 0,
      correctRate: p.attempt_count ? Math.round(((p.correct_count ?? 0) / p.attempt_count) * 100) : null,
      lastSeen: p.last_seen ?? null,
    }));

    const prompt = `You are a warm, encouraging reading teacher for children ages 4-8.

A child is starting a new learning session.
- Difficulty level: ${difficultyLevel}
- Current curriculum unit: ${currentUnit}
- Words selected for this session: ${sessionWords.map((w) => `${w.word} (mastery: ${w.mastery}%)`).join(', ')}
- Word history (all words with any progress): ${JSON.stringify(wordHistory).slice(0, 4000)}

Adaptive learning rules already applied to word selection:
- Words from the child's current curriculum unit are prioritized
- Words due for spaced-repetition review are included
- 1-2 mastered words included for confidence

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
    }

    const defaultLength = difficultyLevel === 'beginning' ? 6 : difficultyLevel === 'proficient' ? 8 : 7;
    const sessionLength = Math.min(
      Math.max(4, aiData.sessionLength ?? defaultLength),
      sessionWords.length
    );
    const chosenWords = sessionWords.slice(0, sessionLength);
    const quizzes = chosenWords.map((w) => buildQuiz(w, candidatePool));

    const plan = {
      difficultyLevel,
      currentUnit,
      sessionLength,
      sessionGoal:         aiData.sessionGoal         ?? `Let's practice ${chosenWords.length} words today!`,
      quizzes,
      wordSequence:        chosenWords,
      encouragements:      aiData.encouragements      ?? ['Great job!', 'Amazing!', 'You did it!', "You're a star!", 'Wow!'],
      wrongAnswerMessages: aiData.wrongAnswerMessages  ?? ["Let's try again!", 'Almost! Keep going!', "You're learning!"],
      coachingTip:         aiData.coachingTip          ?? '',
      generatedAt:         new Date().toISOString(),
      wordCount:           chosenWords.length,
    };

    return res.status(200).json({ plan });

  } catch (err) {
    console.error('[session-generator] AI call failed:', err.message);

    const fallbackLength = Math.min(6, sessionWords.length);
    const fallbackWords  = sessionWords.slice(0, fallbackLength);
    const quizzes = fallbackWords.map((w) => buildQuiz(w, candidatePool));
    return res.status(200).json({
      plan: {
        isFallback:          true,
        difficultyLevel,
        currentUnit,
        sessionLength:       fallbackLength,
        sessionGoal:         "Let's learn some magic words!",
        quizzes,
        wordSequence:        fallbackWords,
        encouragements:      ['Great job!', 'Amazing!', 'You did it!', "You're a star!", 'Wow!'],
        wrongAnswerMessages: ["Let's try again!", 'Almost!', 'Keep going!'],
        coachingTip:         '',
        generatedAt:         new Date().toISOString(),
        wordCount:           fallbackLength,
      }
    });
  }
};
