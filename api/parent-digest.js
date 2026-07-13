// api/parent-digest.js
// Weekly AI Parent Digest + Dinner Table Cards (200MW_Product_Blueprint.md
// 3.6 / 4.3). Same serverless proxy pattern as ai-helper.js/
// session-generator.js/story-engine.js: client passes the week's summary
// (already loaded via TanStack Query), no cron — generated on portal
// visit if stale (see src/lib/queries/parentDigest.js's isDigestStale).
//
// Input:  { childName, wordsThisWeek: [{word, mastery}], streak, minutesThisWeek, weakWords: string[],
//           storiesReadThisWeek: number, placementCompletedThisWeek: boolean, placementUnit: number|null }
// Output: { digest: string, dinnerCards: string[3] }

const Anthropic = require('@anthropic-ai/sdk');
const { requireAuthAndRateLimit } = require('./_lib/security');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// FIX_PARENT_SURFACE_R1 -- this used to key "hasn't started" purely off
// wordsThisWeek.length, so a child who was JUST placed and read a story
// minutes earlier still got told they hadn't started (the reported
// incident). Now acknowledges placement/check-in and story-read activity
// truthfully instead of claiming zero activity when there wasn't zero --
// still never fabricates a metric (word counts) that didn't happen.
function joinNaturally(parts) {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function fallback(childName, wordsThisWeek, activity = {}) {
  const { storiesReadThisWeek = 0, placementCompletedThisWeek = false, placementUnit = null } = activity;
  const count = wordsThisWeek?.length ?? 0;
  if (count > 0) {
    return {
      digest: `${childName} practiced ${count} word${count === 1 ? '' : 's'} this week. Keep up the daily habit — consistency matters more than volume at this stage.`,
      dinnerCards: DEFAULT_DINNER_CARDS,
    };
  }

  const activityNotes = [];
  if (placementCompletedThisWeek) {
    activityNotes.push(placementUnit ? `got measured and landed at Unit ${placementUnit}` : 'completed a level check');
  }
  if (storiesReadThisWeek > 0) {
    activityNotes.push(storiesReadThisWeek === 1 ? 'read their first story' : `read ${storiesReadThisWeek} stories`);
  }

  if (activityNotes.length > 0) {
    return {
      digest: `${childName} ${joinNaturally(activityNotes)} this week — a great start! Word practice will show up here once they play their first session.`,
      dinnerCards: DEFAULT_DINNER_CARDS,
    };
  }

  return {
    digest: `${childName} hasn't started a session yet this week — a quick 5-minute quest can help build the habit.`,
    dinnerCards: DEFAULT_DINNER_CARDS,
  };
}

const DEFAULT_DINNER_CARDS = [
  'Ask your child to point out three things around the house that start with their favorite letter.',
  'Take turns making up a silly sentence using one of this week\'s words.',
  'Ask your child to teach you one word they learned this week — let them be the teacher!',
];

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
  // FIX_PARENT_SURFACE_R1 -- the two activity sources the insight was
  // previously blind to (see PARENT_SURFACE_REPORT.md). Both are read-only
  // facts already available to the client (child_profiles/stories), not
  // new product_events types or a session-generator.js change.
  const storiesReadThisWeek = Number.isFinite(req.body?.storiesReadThisWeek) ? req.body.storiesReadThisWeek : 0;
  const placementCompletedThisWeek = req.body?.placementCompletedThisWeek === true;
  const placementUnit = Number.isFinite(req.body?.placementUnit) ? req.body.placementUnit : null;
  const activity = { storiesReadThisWeek, placementCompletedThisWeek, placementUnit };

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json(fallback(childName, wordsThisWeek, activity));
  }

  try {
    const prompt = `You write a short weekly progress update for a parent whose child (name: ${childName}) uses a literacy app.

Data this week:
- Words practiced: ${wordsThisWeek.map((w) => `${w.word} (${w.mastery}%)`).join(', ') || 'none yet'}
- Words that need more practice: ${weakWords.join(', ') || 'none flagged'}
- Current streak: ${streak} days
- Minutes played this week: ${minutesThisWeek}
- Placement/Star Check-In completed this week: ${placementCompletedThisWeek ? `yes, landed at Unit ${placementUnit ?? '?'}` : 'no'}
- Stories read this week: ${storiesReadThisWeek}

Only say the child "hasn't started" or similar if words practiced is "none yet" AND placement/check-in is "no" AND stories read is 0. If the only activity this week is a placement/check-in and/or a story read, acknowledge that specific activity truthfully and warmly instead — do not claim they haven't started, and do not invent word-practice numbers that aren't listed above.

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
      digest: parsed.digest || fallback(childName, wordsThisWeek, activity).digest,
      dinnerCards: Array.isArray(parsed.dinnerCards) && parsed.dinnerCards.length ? parsed.dinnerCards.slice(0, 3) : fallback(childName, wordsThisWeek, activity).dinnerCards,
    });
  } catch (err) {
    console.error('[parent-digest] failed:', err.message);
    return res.status(200).json(fallback(childName, wordsThisWeek, activity));
  }
};

// Exposed for tests/parent-digest-fallback.spec.js -- the deterministic
// no-AI-key/AI-failure path is what makes decision 1's truthfulness rule
// testable without depending on a live Claude call. Attached as a property
// (not a named export) so the Vercel default-export handler contract
// (`module.exports = async function handler...`) is unchanged -- same
// pattern as api/stripe-webhook.js's `module.exports.config`.
module.exports.fallback = fallback;
