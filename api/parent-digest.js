// api/parent-digest.js
// Weekly AI Parent Digest + Dinner Table Cards (200MW_Product_Blueprint.md
// 3.6 / 4.3). Same serverless proxy pattern as ai-helper.js/
// session-generator.js/story-engine.js: client passes the week's summary
// (already loaded via TanStack Query), no cron — generated on portal
// visit if stale (see src/lib/queries/parentDigest.js's isDigestStale).
//
// Input:  { childName, wordsThisWeek: [{word, mastery}], streak, minutesThisWeek, weakWords: string[] }
// Output: { digest: string, dinnerCards: string[3] }

const Anthropic = require('@anthropic-ai/sdk');
const { requireAuthAndRateLimit } = require('./_lib/security');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fallback(childName, wordsThisWeek) {
  const count = wordsThisWeek?.length ?? 0;
  return {
    digest: count > 0
      ? `${childName} practiced ${count} word${count === 1 ? '' : 's'} this week. Keep up the daily habit — consistency matters more than volume at this stage.`
      : `${childName} hasn't started a session yet this week — a quick 5-minute quest can help build the habit.`,
    dinnerCards: [
      'Ask your child to point out three things around the house that start with their favorite letter.',
      'Take turns making up a silly sentence using one of this week\'s words.',
      'Ask your child to teach you one word they learned this week — let them be the teacher!',
    ],
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const verifiedUser = await requireAuthAndRateLimit(req, res, 'parent-digest', 4, 1440);
  if (!verifiedUser) return;

  const childName = typeof req.body?.childName === 'string' ? req.body.childName.slice(0, 30) : 'your child';
  const wordsThisWeek = Array.isArray(req.body?.wordsThisWeek) ? req.body.wordsThisWeek.slice(0, 50) : [];
  const weakWords = Array.isArray(req.body?.weakWords) ? req.body.weakWords.slice(0, 10) : [];
  const streak = Number.isFinite(req.body?.streak) ? req.body.streak : 0;
  const minutesThisWeek = Number.isFinite(req.body?.minutesThisWeek) ? req.body.minutesThisWeek : 0;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json(fallback(childName, wordsThisWeek));
  }

  try {
    const prompt = `You write a short weekly progress update for a parent whose child (name: ${childName}) uses a literacy app.

Data this week:
- Words practiced: ${wordsThisWeek.map((w) => `${w.word} (${w.mastery}%)`).join(', ') || 'none yet'}
- Words that need more practice: ${weakWords.join(', ') || 'none flagged'}
- Current streak: ${streak} days
- Minutes played this week: ${minutesThisWeek}

Return ONLY this JSON, no markdown, no backticks:
{"digest": "one warm, plain-language paragraph (3-4 sentences) — specific, not generic, growth-framed never alarming", "dinnerCards": ["3 short conversation prompts a parent can use at dinner using this week's words, each one sentence"]}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: 'You write warm, specific, growth-framed parent updates for a children\'s literacy app. Output MUST be valid JSON only.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();
    const parsed = JSON.parse(text);
    return res.status(200).json({
      digest: parsed.digest || fallback(childName, wordsThisWeek).digest,
      dinnerCards: Array.isArray(parsed.dinnerCards) && parsed.dinnerCards.length ? parsed.dinnerCards.slice(0, 3) : fallback(childName, wordsThisWeek).dinnerCards,
    });
  } catch (err) {
    console.error('[parent-digest] failed:', err.message);
    return res.status(200).json(fallback(childName, wordsThisWeek));
  }
};
