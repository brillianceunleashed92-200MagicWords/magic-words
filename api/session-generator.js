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
const { requireAuthAndRateLimit, logSecurityEvent } = require('./_lib/security');
const { RUNGS, signLadderState, verifyLadderState, pickRungWords } = require('./_lib/placementLadder');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MASTERED_THRESHOLD = 80;

// Mirrors src/lib/queries/subscription.js's FREE_TIER_MAX_UNIT /
// isUnitLocked — server-side copy because this endpoint must enforce the
// gate itself, not trust whatever the client claims its plan is.
const FREE_TIER_MAX_UNIT = 5;

// Picture-eligibility (wordart-batch-1, Step 0) is now derived from the
// words table's `has_art` column instead of a hardcoded constant — this
// used to be a literal word list here AND a duplicate in useSessionPlan.js
// AND WordArt.jsx's REGISTRY, three places that had to agree by hand on
// every art batch. Single source of truth going forward:
// src/components/wordArtManifest.json (what scripts/check-wordart-sync.mjs
// checks WordArt.jsx's REGISTRY against) and the `has_art` column it seeds
// (what this endpoint and useSessionPlan.js's fallback actually query at
// runtime). Picture-matching activities (Word Match, Sound Match, Word
// Hunt, Rhyme Time) may only draw from has_art words — a function word or
// an unillustrated content word rendered as "the picture of X" is
// pedagogically wrong (you can't picture "the") and visually degrades to a
// text chip pretending to be a photo.

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
  verb:      ['Watch Nova ___!', 'Nova can ___.', 'Nova likes to ___.', 'See Nova ___!'],
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

// Fill the Story rebuild, Part 5: known picture-confusable/near-synonym
// pairs from docs/wordart-batch-1-depictability.md and
// wordart-batch-2-depictability.md. Today's has_art set already resolved
// every collision named in those reviews at the ART level — one side of
// each pair (mom/dad, gold, look/see, catch/throw, push/pull, hop) was
// deliberately left unillustrated specifically to avoid colliding with the
// word that WAS drawn — so this list can't actually fire against the
// current curriculum. It's a forward-guard: if a future art batch ever
// illustrates the skipped side, distractor selection still won't pair it
// with its documented collision partner.
const CONFUSABLE_PAIRS = [
  ['mom', 'woman'], ['dad', 'man'], ['gold', 'yellow'],
  ['look', 'see'], ['catch', 'throw'], ['push', 'pull'], ['hop', 'jump'],
];
function isConfusableWith(word, target) {
  return CONFUSABLE_PAIRS.some(([a, b]) => (a === word && b === target) || (a === target && b === word));
}

// Build one quiz for a target word. Distractors are always the SAME
// word_type as the target — a hard filter, not a preference — so grammar
// can never give the answer away (a verb template like "Watch Nova ___!"
// only reads naturally with another verb in the blank). Within that
// constraint, same-UNIT words are still preferred first (units are the
// curriculum's real topical grouping — Family, Food & Drink, Colors,
// Home & Travel, etc. — a tighter semantic-group signal than word_type
// alone), falling back to the same type from anywhere in the has_art pool
// (picture-eligible targets) or the full curriculum (everyone else). Every
// unit in the live curriculum happens to be internally homogeneous by
// word_type today, so this changes nothing about which words get selected
// right now — it's a correctness guarantee against a future curriculum
// edit reintroducing a mixed-type unit, not a behavior change.
// Confusable/near-synonym pairs (see CONFUSABLE_PAIRS) are excluded from
// the distractor pool. A same-type/non-confusable fallback pad only
// engages if the curriculum is ever too thin to reach 3 distractors
// (not expected in practice, but option count must never silently drop).
function buildQuiz(target, candidatePool, artWords, wordMetaByWord, wordsByType) {
  const pictureEligible = target.word_type !== 'function' && artWords.includes(target.word);
  const sameType = (w) => wordMetaByWord.get(w)?.word_type === target.word_type;
  const notConfusable = (w) => !isConfusableWith(w, target.word);

  let distractorWords;
  if (pictureEligible) {
    const otherArtWords = artWords.filter((w) => w !== target.word && sameType(w) && notConfusable(w));
    const sameUnit = shuffled(otherArtWords.filter((w) => wordMetaByWord.get(w)?.unit === target.unit));
    const otherUnit = shuffled(otherArtWords.filter((w) => wordMetaByWord.get(w)?.unit !== target.unit));
    distractorWords = [...sameUnit, ...otherUnit].slice(0, 3);
    if (distractorWords.length < 3) {
      const fallback = shuffled(artWords.filter((w) => w !== target.word && notConfusable(w) && !distractorWords.includes(w)));
      distractorWords = [...distractorWords, ...fallback].slice(0, 3);
    }
  } else {
    const sameTypePool = (wordsByType.get(target.word_type) ?? []).filter((w) => w !== target.word && notConfusable(w));
    const inSession = shuffled(sameTypePool.filter((w) => candidatePool.some((p) => p.word === w)));
    const elsewhere = shuffled(sameTypePool.filter((w) => !candidatePool.some((p) => p.word === w)));
    distractorWords = [...inSession, ...elsewhere].slice(0, 3);
    if (distractorWords.length < 3) {
      const fallback = shuffled(candidatePool.filter((w) => w.word !== target.word).map((w) => w.word))
        .filter((w) => !distractorWords.includes(w));
      distractorWords = [...distractorWords, ...fallback].slice(0, 3);
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
    .select('id, parent_id, placement_unit, placement_completed_at')
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

  return {
    plan,
    progress: progress ?? [],
    placementUnit: childRow.placement_unit ?? null,
    placementCompletedAt: childRow.placement_completed_at ?? null,
  };
}

// Quiz Boss battle size (Prompt 6, Part 4) — 5-6 real recognition
// questions over previously-encountered words, never brand-new current-
// unit vocabulary (that's every other activity's job).
const REVIEW_BATTLE_SIZE = 6;

// Candidate pool = current unit's unmastered words + words due for
// spaced-repetition review + a small confidence sample of mastered words,
// all filtered to the account's actual plan (free tier never sees a word
// above FREE_TIER_MAX_UNIT, enforced here — not by trusting the client).
//
// `reviewOnly` (Quiz Boss, Prompt 6 Part 4): the self-rating flashcard
// flow this replaces drew from whatever the shared session's word list
// happened to be (same pool every other activity uses) — not actually a
// review mechanism. This flag switches the pool to previously-encountered
// words only (any word with attempt_count > 0), skewed toward the
// lowest-mastery/longest-overdue ones first, so the battle is a real
// spaced-repetition review rather than a second pass at brand-new
// current-unit words. Same ownership/plan-gate path as the normal
// selection — only the pool composition differs.
async function selectCandidateWords(admin, plan, progress, reviewOnly = false, placementFloor = null) {
  const maxUnit = plan === 'family' ? 18 : FREE_TIER_MAX_UNIT;
  // Placement Adventure (Prompt 8): placementFloor is min(measured, plan
  // cap) already — never fabricates word_progress, just shifts which
  // unit "current" starts scanning from. A child placed above Unit 1
  // still has every below-floor word visible/playable on the Galaxy map
  // per the existing rules (GalaxyScreen's own status derivation, not
  // touched here) — this only changes which unit new SESSION content is
  // drawn from.
  const effectiveFloor = placementFloor ? Math.min(placementFloor, maxUnit) : null;
  const { data: allWords } = await admin
    .from('words')
    .select('word, unit, sort_order, word_type, has_art')
    .lte('unit', maxUnit)
    .order('sort_order');

  const artWords = (allWords ?? []).filter((w) => w.has_art).map((w) => w.word);
  const wordMetaByWord = new Map((allWords ?? []).map((w) => [w.word, { word_type: w.word_type, unit: w.unit }]));
  const wordsByType = new Map();
  for (const w of (allWords ?? [])) {
    if (!wordsByType.has(w.word_type)) wordsByType.set(w.word_type, []);
    wordsByType.get(w.word_type).push(w.word);
  }

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

  // Current unit = the lowest unit (within plan range, AND at/above any
  // placement floor) that still has an unmastered word; a brand-new
  // child with zero progress and no floor starts at whatever the lowest
  // seeded unit is (1).
  const units = [...new Set(withProgress.map((w) => w.unit))].sort((a, b) => a - b)
    .filter((u) => !effectiveFloor || u >= effectiveFloor);
  let currentUnit = units[0] ?? effectiveFloor ?? 1;
  for (const unit of units) {
    const hasUnmastered = withProgress.some((w) => w.unit === unit && w.mastery < MASTERED_THRESHOLD);
    currentUnit = unit;
    if (hasUnmastered) break;
  }

  if (reviewOnly) {
    // Quiz Boss: previously-encountered words only (attempt_count > 0) —
    // never brand-new current-unit vocabulary. Overdue-longest and lowest-
    // mastery first (the words most worth re-testing), same MASTERED_THRESHOLD
    // and plan/unit gate as every other path. A child with too little history
    // (< REVIEW_BATTLE_SIZE previously-seen words — new accounts, or a plan
    // that just reset) pads with the weakest current-unit words rather than
    // returning an empty/short battle.
    const encountered = withProgress.filter((w) => w.attemptCount > 0);
    const due = encountered.filter((w) => w.dueForReview);
    const notYetDue = encountered.filter((w) => !w.dueForReview).sort((a, b) => a.mastery - b.mastery);
    const seenReview = new Set();
    const reviewPool = [...shuffled(due), ...notYetDue].filter((w) => {
      if (seenReview.has(w.word)) return false;
      seenReview.add(w.word);
      return true;
    });
    if (reviewPool.length < REVIEW_BATTLE_SIZE) {
      const filler = withProgress
        .filter((w) => !seenReview.has(w.word) && w.unit === currentUnit)
        .sort((a, b) => a.mastery - b.mastery);
      for (const w of filler) {
        if (reviewPool.length >= REVIEW_BATTLE_SIZE) break;
        reviewPool.push(w);
        seenReview.add(w.word);
      }
    }
    return { pool: reviewPool.slice(0, REVIEW_BATTLE_SIZE), currentUnit, artWords, wordMetaByWord, wordsByType };
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

  return { pool: pool.slice(0, 8), currentUnit, artWords, wordMetaByWord, wordsByType };
}

// Fire-and-forget log to product_events (migration 0032) — same pattern
// as security.js's logSecurityEvent, deliberately never awaited by
// callers and never throws into the request path. First-party only, no
// third-party analytics SDK anywhere near this (COPPA: child-directed
// product).
async function logProductEvent(admin, eventType, { userId, childId, payload } = {}) {
  const { error } = await admin.from('product_events').insert({ event_type: eventType, user_id: userId, child_id: childId, payload: payload ?? {} });
  if (error) console.error('[product-events] log write failed:', error.message);
}

// Placement Adventure (Prompt 8) — deterministic 8-rung ladder (units
// 1/3/5/7/9/12/15/18), 2 probe words per rung, pass = 2/2, 1/2 = a single
// tiebreak word decides, 0/2 = fail. Placement = the last PASSED rung's
// unit (or Unit 1 if rung 1 itself fails). See placementLadder.js's
// header for why the ladder state is a signed, stateless token rather
// than a DB row.
//
// SECURITY (this endpoint's sharpest edge, per the mission): probe words
// may sample from ANY unit including ones above the free-tier cap — this
// is a deliberate, bounded exception for MEASUREMENT only (mission #7).
// It never becomes a content-unlock bypass because a placement response
// is always exactly 1-2 probe words + audio/options, never a playable
// multi-question session plan for a gated unit; and the actual floor
// this measurement produces is itself capped to min(measured, 5) for a
// free plan before it's ever written (see the finalize() function
// below) — the same free-tier enforcement pattern as selectCandidateWords
// above, just applied to the OUTPUT of the ladder instead of its INPUT.
async function handlePlacement(req, res, admin, verifiedUser, childId, plan, placementCompletedAt) {
  // Lightweight client-reported logging path — the client cannot write
  // product_events directly (service-role-only, see migration 0032), so
  // "abandoned mid-ladder" / "declined at the choice screen" (states the
  // server has no other visibility into — no finalize call ever happens)
  // route through here. Nothing else happens on this branch: no rung
  // logic, no child_profiles write.
  if (req.body?.skip === true) {
    await logProductEvent(admin, 'placement_skipped', { userId: verifiedUser.id, childId, payload: {} });
    return res.status(200).json({ ok: true });
  }

  const ladderStateRaw = typeof req.body?.ladderState === 'string' ? req.body.ladderState : null;
  const rawAnswers = req.body?.answers;
  const answers = Array.isArray(rawAnswers) ? rawAnswers.filter((a) => typeof a === 'boolean') : null;

  const { data: allWords } = await admin
    .from('words')
    .select('word, unit, sort_order, word_type, has_art')
    .order('sort_order');
  const artWords = (allWords ?? []).filter((w) => w.has_art).map((w) => w.word);
  const wordMetaByWord = new Map((allWords ?? []).map((w) => [w.word, { word_type: w.word_type, unit: w.unit }]));
  const wordsByType = new Map();
  for (const w of (allWords ?? [])) {
    if (!wordsByType.has(w.word_type)) wordsByType.set(w.word_type, []);
    wordsByType.get(w.word_type).push(w.word);
  }

  async function finalize(rungIndex) {
    const trueMeasuredUnit = rungIndex >= 0 ? RUNGS[rungIndex] : 1;
    // The client must not be able to self-declare a floor above its plan
    // allowance — enforced here, server-side, on the ONLY write path for
    // these columns (column-level REVOKE in migration 0032 blocks every
    // other path, including a direct client update attempt).
    const placementUnit = plan === 'family' ? trueMeasuredUnit : Math.min(trueMeasuredUnit, FREE_TIER_MAX_UNIT);
    const { error } = await admin.from('child_profiles').update({
      placement_unit: placementUnit,
      placement_completed_at: new Date().toISOString(),
    }).eq('id', childId);
    if (error) console.error('[placement] finalize write failed:', error.message);
    logProductEvent(admin, 'placement_completed', {
      userId: verifiedUser.id, childId, payload: { placementUnit, trueMeasuredUnit },
    });
    return res.status(200).json({ placement: { done: true, placementUnit, trueMeasuredUnit } });
  }

  function issueRung(rungIndex, lastPassedRungIndex, tiebreak, excludeWords) {
    const unit = RUNGS[rungIndex];
    const count = tiebreak ? 1 : 2;
    const rungWords = pickRungWords(unit, count, excludeWords, allWords ?? [], artWords, wordMetaByWord, wordsByType);
    const state = { childId, rungIndex, lastPassedRungIndex, tiebreak, shownWords: rungWords.map((w) => w.word) };
    return res.status(200).json({
      placement: { done: false, rung: rungIndex + 1, rungUnit: unit, words: rungWords, ladderState: signLadderState(state) },
    });
  }

  // A prior *completed* placement, verified server-side (never a client
  // claim), distinguishes "started" from "retaken" — a real signal, not
  // guessed from client-supplied state.
  const startEventType = placementCompletedAt ? 'placement_retaken' : 'placement_started';

  // First call: no ladder state yet — start fresh at rung 0.
  if (!ladderStateRaw) {
    logProductEvent(admin, startEventType, { userId: verifiedUser.id, childId, payload: {} });
    return issueRung(0, -1, false, []);
  }

  const state = verifyLadderState(ladderStateRaw, childId);
  if (!state) {
    // A bad/forged/expired/wrong-child token is treated as a fresh start
    // — never a way to short-circuit the ladder (e.g. by handing back a
    // hand-crafted token claiming rung 8 already passed). Logged as a
    // security event so a real forgery attempt is visible even though
    // it's harmless.
    logSecurityEvent('placement_ladder_invalid_token', { userId: verifiedUser.id, endpoint: 'session-generator:placement' });
    logProductEvent(admin, startEventType, { userId: verifiedUser.id, childId, payload: {} });
    return issueRung(0, -1, false, []);
  }
  const expectedAnswerCount = state.tiebreak ? 1 : 2;
  if (!answers || answers.length !== expectedAnswerCount) {
    return res.status(400).json({ error: `answers must have length ${expectedAnswerCount} for this rung` });
  }

  const { rungIndex, lastPassedRungIndex, tiebreak } = state;
  const correctCount = answers.filter(Boolean).length;
  const isLastRung = rungIndex >= RUNGS.length - 1;

  if (tiebreak) {
    if (correctCount >= 1) return isLastRung ? finalize(rungIndex) : issueRung(rungIndex + 1, rungIndex, false, []);
    return finalize(lastPassedRungIndex);
  }
  if (correctCount === 2) return isLastRung ? finalize(rungIndex) : issueRung(rungIndex + 1, rungIndex, false, []);
  if (correctCount === 0) return finalize(lastPassedRungIndex);
  // Exactly 1/2 — a single tiebreak word from the same rung's unit,
  // excluding the two words just shown so it can't repeat one.
  return issueRung(rungIndex, lastPassedRungIndex, true, state.shownWords ?? []);
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
  const reviewOnly = req.body?.reviewOnly === true;
  const placementMode = req.body?.placementMode === true;

  if (!childId) return res.status(400).json({ error: 'childId is required' });

  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const context = await fetchChildContext(admin, childId, verifiedUser.id);
  if (!context) return res.status(403).json({ error: 'Child not found for this account' });

  const { plan, progress, placementUnit, placementCompletedAt } = context;

  if (placementMode) return handlePlacement(req, res, admin, verifiedUser, childId, plan, placementCompletedAt);

  const { pool: candidatePool, currentUnit, artWords, wordMetaByWord, wordsByType } = await selectCandidateWords(admin, plan, progress, reviewOnly, placementUnit);
  const difficultyLevel = getDifficultyLevel(progress);

  // Quiz Boss (Prompt 6 Part 4): a fixed-size review battle, not an
  // AI-personalized adaptive session — skip the Claude call entirely
  // (lower latency/cost, and there's no "difficulty ramp" copy to
  // generate for a deterministic battle-of-N-words). The boss framing
  // itself is client-side theater; this endpoint's only job here is the
  // server-authoritative word selection + quiz construction.
  if (reviewOnly) {
    const quizzes = candidatePool.map((w) => buildQuiz(w, candidatePool, artWords, wordMetaByWord, wordsByType));
    return res.status(200).json({
      plan: {
        isReviewBattle: true,
        difficultyLevel,
        currentUnit,
        sessionLength: quizzes.length,
        sessionGoal: 'Defeat the Quiz Boss!',
        quizzes,
        wordSequence: candidatePool,
        encouragements: ['Great job!', 'Amazing!', 'You did it!', "You're a star!", 'Wow!'],
        wrongAnswerMessages: ["Let's try again!", 'Almost! Keep going!', "You're learning!"],
        coachingTip: '',
        generatedAt: new Date().toISOString(),
        wordCount: quizzes.length,
      },
    });
  }

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
    const quizzes = chosenWords.map((w) => buildQuiz(w, candidatePool, artWords, wordMetaByWord, wordsByType));

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
    const quizzes = fallbackWords.map((w) => buildQuiz(w, candidatePool, artWords, wordMetaByWord, wordsByType));
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
