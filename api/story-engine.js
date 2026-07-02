// api/story-engine.js
// THE STORY ENGINE (200MW_Product_Blueprint.md Part 3.1 — "the flagship").
// AI-generated personalized decodable story using ONLY the child's
// mastered words + the current target word + their name. Same serverless
// proxy pattern as api/ai-helper.js / api/session-generator.js: the client
// (src/lib/queries/stories.js) already has mastered-word/progress data
// loaded via TanStack Query, so it's passed in the request body rather
// than this function querying Supabase itself — no service_role key
// needed here, one less secret in play.
//
// Input:  { childName, interests: string[], masteredWords: string[], targetWord }
// Output: { story: { title, sentences[], targetWord, vocabularyUsed[] },
//           validation: { attempts, passed, rejectedWords[] } }

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Moderated theme list matched to child interests (blueprint: "story
// premise selected from a hardcoded moderated theme list matched to
// interests. No free-form themes."). Keys match src/lib/interests.js ids.
const THEMES = {
  dinosaurs: 'a gentle dinosaur adventure',
  space: 'a fun trip to space',
  animals: 'a walk with friendly animals',
  princesses: 'a day at a magic castle',
  superheroes: 'a superhero saving the day, kindly',
  cars_trucks: 'a fun ride in a car or truck',
  ocean: 'a peaceful day under the sea',
  sports: 'playing a favorite game outside',
  music: 'singing a favorite song',
  art: 'painting a fun picture',
  bugs: 'looking for bugs in the garden',
  magic: 'a sprinkle of gentle magic',
  default: 'a fun day with Nova the comet',
};

function pickTheme(interests = []) {
  for (const interest of interests) {
    if (THEMES[interest]) return THEMES[interest];
  }
  return THEMES.default;
}

function safeName(input) {
  const n = typeof input === 'string' ? input.trim() : '';
  return n.replace(/[^a-zA-Z'\-\s]/g, '').slice(0, 30).trim() || 'Star Learner';
}

function safeWordList(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((w) => typeof w === 'string')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z']+$/.test(w))
    .slice(0, 200);
}

// Simple inflection check — a token counts as valid if it IS an allowed
// base word, or is that base word plus a common suffix (s/es/ed/ing/'s).
// This is the "allowed inflections of mastered words count as valid"
// rule from the master prompt.
function stripsToAllowed(token, allowedSet) {
  if (allowedSet.has(token)) return true;
  const suffixes = ['ing', 'es', 'ed', "'s", 's', 'd'];
  for (const suf of suffixes) {
    if (token.endsWith(suf) && allowedSet.has(token.slice(0, -suf.length))) return true;
    // handle drop-e before -ing/-ed (e.g. "like" -> "liking"/"liked")
    if ((suf === 'ing' || suf === 'ed') && allowedSet.has(token.slice(0, -suf.length) + 'e')) return true;
  }
  return false;
}

function tokenize(text) {
  return (text.match(/[a-zA-Z']+/g) || []).map((t) => t.toLowerCase());
}

// Validates every sentence against the allow-list. Returns
// { passed, rejectedWords }. childName is matched case-insensitively as
// its own always-valid token (a proper name, not a vocabulary word).
function validateStory(sentences, allowedSet, childName) {
  const nameLower = childName.toLowerCase();
  const rejected = new Set();
  for (const sentence of sentences) {
    for (const token of tokenize(sentence)) {
      if (token === nameLower) continue;
      if (stripsToAllowed(token, allowedSet)) continue;
      rejected.add(token);
    }
  }
  return { passed: rejected.size === 0, rejectedWords: [...rejected] };
}

function buildPrompt(childName, theme, targetWord, allowedWords, rejectedFromLastAttempt) {
  const wordListStr = allowedWords.join(', ');
  const retryNote = rejectedFromLastAttempt?.length
    ? `\n\nYour last attempt used words NOT in the list: ${rejectedFromLastAttempt.join(', ')}. Do not use those — every single word (except "${childName}") must come from the allowed list above, or be a simple form of one of those words (adding s/es/ed/ing).`
    : '';

  return `You are writing a 100%-decodable early-reader story for a child named ${childName} (age 4-8), themed around ${theme}.

STRICT VOCABULARY RULE: every word in the story (except the child's name "${childName}") must be one of these words, or a simple form of one of these words (add s/es/ed/ing): ${wordListStr}

The target word for this story is "${targetWord}" — use it at least twice.

Write 6-8 very short sentences. Simple sentences are great — even a sentence as short as "See the ${targetWord}." is perfect if that's all the vocabulary allows. Repetition of allowed words across sentences is encouraged, not a flaw.${retryNote}

Return ONLY this JSON, no markdown, no backticks, no explanation:
{"title": "a short 2-4 word title", "sentences": ["sentence 1", "sentence 2", "..."]}`;
}

async function generateAttempt(childName, theme, targetWord, allowedWords, rejectedFromLastAttempt) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: 'You write short, kid-friendly decodable stories. Output MUST be valid JSON only.',
    messages: [{ role: 'user', content: buildPrompt(childName, theme, targetWord, allowedWords, rejectedFromLastAttempt) }],
  });
  const text = message.content[0].text.trim();
  return JSON.parse(text);
}

// Fallback when generation/validation can't produce a passing story after
// MAX_ATTEMPTS — mirrors src/lib/localStory.js's template shape (kept as a
// separate CommonJS copy here, matching this codebase's existing
// api/*.js-is-self-contained convention, e.g. session-generator.js
// duplicating its own word list rather than importing from src/).
function localFallbackStory(targetWord, childName) {
  return {
    title: `The ${targetWord}`,
    sentences: [
      `I see a ${targetWord}.`,
      `The ${targetWord} is fun.`,
      `${childName} likes the ${targetWord}!`,
    ],
  };
}

const MAX_ATTEMPTS = 3;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const childName = safeName(req.body?.childName);
  const interests = Array.isArray(req.body?.interests) ? req.body.interests : [];
  const masteredWords = safeWordList(req.body?.masteredWords);
  const targetWord = safeWordList([req.body?.targetWord])[0];

  if (!targetWord) {
    return res.status(400).json({ error: 'Bad request', detail: 'targetWord is required' });
  }

  const theme = pickTheme(interests);
  const allowedWords = [...new Set([...masteredWords, targetWord])];
  const allowedSet = new Set(allowedWords);

  let lastRejected = [];
  let attempts = 0;

  if (!process.env.ANTHROPIC_API_KEY) {
    const story = localFallbackStory(targetWord, childName);
    return res.status(200).json({
      story: { ...story, targetWord, vocabularyUsed: allowedWords, isFallback: true },
      validation: { attempts: 0, passed: false, rejectedWords: [], reason: 'MISSING_API_KEY' },
    });
  }

  for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
    try {
      const generated = await generateAttempt(childName, theme, targetWord, allowedWords, lastRejected);
      const sentences = Array.isArray(generated.sentences) ? generated.sentences : [];
      const { passed, rejectedWords } = validateStory(sentences, allowedSet, childName);

      console.log(`[story-engine] attempt ${attempts}/${MAX_ATTEMPTS} — passed=${passed}` +
        (rejectedWords.length ? ` rejected=${rejectedWords.join(',')}` : ''));

      if (passed) {
        return res.status(200).json({
          story: {
            title: generated.title || `The ${targetWord}`,
            sentences,
            targetWord,
            vocabularyUsed: allowedWords,
          },
          validation: { attempts, passed: true, rejectedWords: [] },
        });
      }
      lastRejected = rejectedWords;
    } catch (err) {
      console.error(`[story-engine] attempt ${attempts} failed:`, err.message);
    }
  }

  // All attempts failed validation — fall back to the guaranteed-safe
  // local template rather than serving a story with words the child
  // hasn't learned yet.
  const fallback = localFallbackStory(targetWord, childName);
  return res.status(200).json({
    story: { ...fallback, targetWord, vocabularyUsed: allowedWords, isFallback: true },
    validation: { attempts: MAX_ATTEMPTS, passed: false, rejectedWords: lastRejected },
  });
};
