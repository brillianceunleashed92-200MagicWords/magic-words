// src/hooks/useSessionPlan.js
// THE KEY AI OPTIMIZATION: generates the full session plan ONCE at login.
// Children get instant tap responses. AI is called ~1x per session instead of 20+.
//
// Flow:
//   Login → check sessionStorage for fresh plan → if stale/missing → call /api/session-generator
//   → store plan in sessionStorage → app reads from plan, no more AI calls per tap
//
// Sprint 2 Part B: the server now selects session words directly from the
// real 200-word Supabase table (see api/session-generator.js) — this hook
// no longer sends a client-computed progress array; it sends only
// { childId, focusWord }, and the server looks up progress/plan itself
// (never trusts client-supplied mastery data). The offline/API-failure
// fallback below was rewritten the same way: it queries `words` directly
// instead of a 10-word hardcoded list, so even a degraded session still
// draws from the real curriculum.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { computeFallbackCurrentUnit } from '../lib/sessionPlanFallbackUnit';

// FIX R1 Phase 3 (A5) — bumped v3 -> v4 AND added a childId suffix. The
// unscoped v3 key let a parent switching between children on a family
// (multi-child) account receive a DIFFERENT child's cached plan for up to
// PLAN_TTL_MINUTES, since getCachedPlan/cachePlan never checked which
// child the cache belonged to. Follows the same per-child key pattern
// already used elsewhere in this codebase (parentDigest.js's
// cacheKey(childId), useSessionTimeLimit.js's todayKey(childId)).
const PLAN_CACHE_KEY_PREFIX = 'mw_session_plan_v4';
export const LEGACY_UNSCOPED_PLAN_CACHE_KEY = 'mw_session_plan_v3';
const PLAN_TTL_MINUTES = 60; // regenerate if older than 1 hour
const FREE_TIER_MAX_UNIT = 5; // mirrors src/lib/queries/subscription.js — client-side fallback only; the server enforces this independently

// Exported (rather than module-private) so tests/session-plan-cache.spec.js
// can exercise the real cache-scoping behavior directly against a live
// browser's sessionStorage via a dynamic import, without needing a full
// two-child sign-in flow.
export function planCacheKey(childId) {
  return `${PLAN_CACHE_KEY_PREFIX}:${childId}`;
}

// PERF_ACTIVITY_LOAD_R1 — mirrors api/session-generator.js's own
// focusWord reorder (splice the tapped word out, unshift it to the
// front) so reusing a cached plan client-side produces the exact same
// shape a fresh server call would for a word the cache already covers.
// wordSequence and quizzes are parallel arrays (same index order, see
// session-generator.js's `chosenWords.map(...)`) so both get the same
// splice/unshift. A no-op (returns plan as-is) if the word isn't found
// or is already first.
export function reorderPlanForFocusWord(plan, focusWord) {
  if (!focusWord || !plan?.quizzes?.length) return plan;
  const idx = plan.quizzes.findIndex((q) => q.word === focusWord);
  if (idx <= 0) return plan;
  const quizzes = [...plan.quizzes];
  const [q] = quizzes.splice(idx, 1);
  quizzes.unshift(q);
  const wordSequence = Array.isArray(plan.wordSequence) && plan.wordSequence.length === plan.quizzes.length
    ? (() => {
        const seq = [...plan.wordSequence];
        const [w] = seq.splice(idx, 1);
        seq.unshift(w);
        return seq;
      })()
    : plan.wordSequence;
  return { ...plan, quizzes, wordSequence };
}

// One-time cleanup: the old unscoped key could still be sitting in a
// returning user's sessionStorage from before this fix shipped. Removing
// it (rather than just ignoring it) means no code path can ever read it
// again, accidentally or otherwise.
export function removeLegacyUnscopedCache() {
  try {
    sessionStorage.removeItem(LEGACY_UNSCOPED_PLAN_CACHE_KEY);
  } catch {
    // sessionStorage unavailable — nothing to clean up
  }
}

export function getCachedPlan(childId) {
  try {
    removeLegacyUnscopedCache();
    const raw = sessionStorage.getItem(planCacheKey(childId));
    if (!raw) return null;
    const { plan, generatedAt } = JSON.parse(raw);
    const ageMinutes = (Date.now() - generatedAt) / 1000 / 60;
    if (ageMinutes > PLAN_TTL_MINUTES) return null;
    if (!plan?.quizzes || plan.quizzes.length < 4) return null;
    return plan;
  } catch {
    return null;
  }
}

export function cachePlan(childId, plan) {
  try {
    sessionStorage.setItem(planCacheKey(childId), JSON.stringify({
      plan,
      generatedAt: Date.now(),
    }));
  } catch {
    // sessionStorage full — continue without cache, not fatal
  }
}

// PERF_ACTIVITY_LOAD_R1 — restores this file's own documented intent
// ("generates the full session plan ONCE at login") which had drifted:
// useSessionPlan only lives inside PlayScreen, which doesn't mount until
// *after* the word tap that starts a session, so the very first tap of a
// visit always paid for a full, uncached /api/session-generator round
// trip (network + the AI copy-generation call) with the loader visible.
// Calling this once from Home (while the user is still looking at the
// word/quest picker, not yet blocked on anything) warms the exact same
// sessionStorage cache useSessionPlan's own mount effect already checks —
// same fetch, same cache key, same selection, just started earlier so
// it very often finishes before the user taps anything at all. Pure
// fire-and-forget: on any failure this silently no-ops and the later
// real PlayScreen mount falls back to its own fetch exactly as before —
// this function never surfaces an error or blocks Home's render.
export async function prefetchSessionPlan(user, childId) {
  if (!user || !childId) return;
  if (getCachedPlan(childId)) return; // already warm

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const response = await fetch('/api/session-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ childId }),
    });
    if (!response.ok) return;
    const { plan: newPlan } = await response.json();
    cachePlan(childId, newPlan);
  } catch {
    // silent no-op -- PlayScreen's own mount effect is the real fallback
  }
}

export function useSessionPlan(user, childId, plan = 'free', placementUnit = null, focusWord = null) {
  const [sessionPlan, setSessionPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError]     = useState(null);
  // Quiz Boss (Prompt 6 Part 4) draws from a distinct, review-only word
  // pool (server-authoritative spaced-repetition selection, never the
  // shared adaptive session's current-unit words) — kept in its own state
  // slot so selecting Quiz Boss never clobbers `sessionPlan`, which every
  // other activity this visit still reads from.
  const [reviewSessionPlan, setReviewSessionPlan] = useState(null);
  const [reviewPlanLoading, setReviewPlanLoading] = useState(false);
  const [reviewPlanError, setReviewPlanError]     = useState(null);

  const generatePlan = useCallback(async (force = false, focusWord = null) => {
    if (!user || !childId) return;

    if (!force && !focusWord) {
      const cached = getCachedPlan(childId);
      if (cached) {
        setSessionPlan(cached);
        return;
      }
    } else if (focusWord) {
      // PERF_ACTIVITY_LOAD_R1 — a word tapped directly on Home/Galaxy used
      // to always force a brand-new /api/session-generator round trip
      // (network + the AI copy-generation call), even when a still-valid
      // cached plan already covers that exact word — the cache was
      // fetched, checked (below, via getCachedPlan), and then thrown away.
      // If the tapped word is already in a fresh cached plan, reorder it
      // to the front locally (byte-identical to what the server's own
      // splice/unshift would produce for the same word, since nothing
      // about the underlying selection has changed) instead of paying for
      // a redundant fetch. Only words outside the cached plan (e.g.
      // tapped from the wider Word Galaxy map, off the adaptive path)
      // still fall through to a real fetch below — unchanged from before.
      const cached = getCachedPlan(childId);
      const alreadyPresent = cached?.quizzes?.some((q) => q.word === focusWord);
      if (alreadyPresent) {
        setSessionPlan(reorderPlanForFocusWord(cached, focusWord));
        return;
      }
    }

    setPlanLoading(true);
    setPlanError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch('/api/session-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ childId, focusWord: focusWord ?? undefined }),
      });

      if (!response.ok) throw new Error(`Session generator returned ${response.status}`);

      const { plan: newPlan } = await response.json();
      cachePlan(childId, newPlan);
      setSessionPlan(newPlan);
    } catch (err) {
      console.error('[useSessionPlan] Generation failed:', err.message);
      setPlanError(err.message);
      const fallback = await buildSupabaseFallbackPlan(childId, plan, placementUnit);
      setSessionPlan(fallback);
    } finally {
      setPlanLoading(false);
    }
  }, [user, childId, plan, placementUnit]);

  // PERF_ACTIVITY_LOAD_R1 — consolidated from two separate effects (one
  // here firing an unforced generatePlan() on mount, one in PlayScreen.jsx
  // firing a forced generatePlanForWord() whenever focusWord was set) that
  // used to run concurrently on the same mount whenever a word was tapped
  // directly, racing each other: the unforced call would set a cached
  // plan, then the forced call's network response would overwrite it a
  // moment later — always paying for a fetch neither result actually
  // needed once a valid cache existed. A single effect with one branch per
  // case removes the duplicate work entirely.
  useEffect(() => {
    if (!user || !childId) return;
    if (focusWord) generatePlan(true, focusWord);
    else generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, childId, focusWord]);

  // No sessionStorage cache here (unlike the main plan) — a review battle
  // must reflect the child's *current* mastery/due-dates every time Quiz
  // Boss is picked, not a cached snapshot from up to an hour ago.
  const generateReviewPlan = useCallback(async () => {
    if (!user || !childId) return;
    setReviewPlanLoading(true);
    setReviewPlanError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/session-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ childId, reviewOnly: true }),
      });
      if (!response.ok) throw new Error(`Session generator returned ${response.status}`);
      const { plan: newPlan } = await response.json();
      setReviewSessionPlan(newPlan);
    } catch (err) {
      console.error('[useSessionPlan] Review plan generation failed:', err.message);
      setReviewPlanError(err.message);
      // Degrade to the same real-curriculum fallback as the main plan
      // (weakest-mastery words) rather than leaving Quiz Boss unplayable —
      // not a spaced-repetition review pool, but still real words, never
      // an empty session.
      const fallback = await buildSupabaseFallbackPlan(childId, plan, placementUnit);
      setReviewSessionPlan(fallback);
    } finally {
      setReviewPlanLoading(false);
    }
  }, [user, childId, plan, placementUnit]);

  return {
    sessionPlan,
    planLoading,
    planError,
    regeneratePlan:      () => generatePlan(true),
    generatePlanForWord: (word) => generatePlan(true, word),
    reviewSessionPlan,
    reviewPlanLoading,
    reviewPlanError,
    generateReviewPlan,
  };
}

// ─── Fallback: only used when /api/session-generator itself fails (network
// error, 5xx, rate limit) — queries the real words table directly so even
// a degraded session draws from the actual 200-word curriculum, not a
// stale hardcoded list. RLS-scoped (child ownership), same as any other
// client query. This is intentionally simpler than the server's version —
// no AI-personalized copy, no spaced-repetition due-date pass, no
// full 45-word hand-written function-word sentence set — a degraded
// fallback path doesn't need full parity, it needs to not be empty or
// wrong.
async function buildSupabaseFallbackPlan(childId, plan, placementUnit = null) {
  try {
    const maxUnit = plan === 'family' ? 18 : FREE_TIER_MAX_UNIT;
    // FIX R1 Phase 2 (A1) — mirrors the same floor semantics as the server
    // (api/session-generator.js's effectiveFloor): a placed child hitting
    // this fallback must not silently drop back to Unit 1.
    const effectiveFloor = placementUnit ? Math.min(placementUnit, maxUnit) : null;
    const { data: words, error: wordsErr } = await supabase
      .from('words')
      .select('word, unit, sort_order, word_type, has_art')
      .lte('unit', maxUnit)
      .order('sort_order');
    if (wordsErr || !words?.length) throw wordsErr ?? new Error('no words available');

    const artWords = words.filter((w) => w.has_art).map((w) => w.word);
    const wordMetaByWord = new Map(words.map((w) => [w.word, { word_type: w.word_type, unit: w.unit }]));
    const wordsByType = new Map();
    for (const w of words) {
      if (!wordsByType.has(w.word_type)) wordsByType.set(w.word_type, []);
      wordsByType.get(w.word_type).push(w.word);
    }

    const { data: progress } = await supabase
      .from('word_progress')
      .select('word, mastery, attempt_count')
      .eq('child_id', childId);
    const progressMap = new Map((progress ?? []).map((p) => [p.word, p]));

    const withMastery = words.map((w) => {
      const p = progressMap.get(w.word);
      return { ...w, mastery: p?.mastery ?? 0, attemptCount: p?.attempt_count ?? 0 };
    });
    const currentUnit = computeFallbackCurrentUnit(withMastery, effectiveFloor);

    const focusWords = withMastery
      .filter((w) => w.unit === currentUnit)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 6);

    return {
      isFallback: true,
      difficultyLevel: 'emerging',
      currentUnit,
      wordSequence: focusWords,
      quizzes: focusWords.map((w) => buildLocalQuiz(w, withMastery, artWords, wordMetaByWord, wordsByType)),
      encouragements: [
        'Great job!',
        "You're doing amazing!",
        'Keep going, star learner!',
        "Wow, you're so smart!",
        "That's right! You're a reading star!",
      ],
      sessionGoal: `Practice ${focusWords.map((w) => w.word).join(', ')}`,
    };
  } catch (err) {
    console.error('[useSessionPlan] Supabase fallback also failed, using true-offline plan:', err.message);
    return buildOfflineFallbackPlan();
  }
}

// Small subset of function words that already read naturally in a fill-
// blank sentence — everything else in a true-fallback session gets the
// generic default, an acceptable degradation for the rare true-offline
// path (see file header).
const FALLBACK_FUNCTION_SENTENCES = {
  the: 'I read ___ big book.',
  can: 'I ___ do it myself!',
  is: 'This ___ my favorite word.',
  they: '___ love to read together.',
  not: 'I am ___ going to give up.',
  and: 'Cats ___ dogs are friends.',
  with: 'Play ___ me at recess.',
  do: 'What can you ___?',
};

// Mirrors api/session-generator.js's CONTENT_TEMPLATES.verb (Nova-subject
// set, signed off 2026-07-05) + its deterministic per-word hash pick, so
// the client fallback tier can actually be checked for parity against the
// server instead of silently falling through to the generic sentence for
// every verb. Noun/adjective/number content words aren't mirrored here —
// they were never in this pass's scope and the generic default already
// covers them the same way it always has.
const FALLBACK_VERB_TEMPLATES = ['Watch Nova ___!', 'Nova can ___.', 'Nova likes to ___.', 'See Nova ___!'];

function hashPick(word, templates) {
  let hash = 0;
  for (const ch of word) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return templates[hash % templates.length];
}

// Fill the Story rebuild, Part 5: same known picture-confusable/near-
// synonym pairs as api/session-generator.js's CONFUSABLE_PAIRS — see that
// file's comment for why this list can't actually fire against today's
// has_art set (one side of each pair was deliberately left unillustrated)
// and is a forward-guard rather than a current behavior change.
const CONFUSABLE_PAIRS = [
  ['mom', 'woman'], ['dad', 'man'], ['gold', 'yellow'],
  ['look', 'see'], ['catch', 'throw'], ['push', 'pull'], ['hop', 'jump'],
];
function isConfusableWith(word, target) {
  return CONFUSABLE_PAIRS.some(([a, b]) => (a === word && b === target) || (a === target && b === word));
}

function buildLocalQuiz(targetWord, allWords, artWords = [], wordMetaByWord = new Map(), wordsByType = new Map()) {
  const pictureEligible = targetWord.word_type !== 'function' && artWords.includes(targetWord.word);
  const sameType = (w) => wordMetaByWord.get(w)?.word_type === targetWord.word_type;
  const notConfusable = (w) => !isConfusableWith(w, targetWord.word);

  let distractorWords;
  if (pictureEligible) {
    // Distractors are always the SAME word_type as the target — a hard
    // filter, not a preference, so grammar can never give the answer away.
    // Within that constraint, same-unit words are still preferred first
    // (units are the curriculum's real topical grouping — Family, Food &
    // Drink, Colors, etc. — a tighter semantic signal than word_type
    // alone), falling back to the same type from the broader has_art pool.
    // Mirrors api/session-generator.js's buildQuiz so both plan sources
    // behave the same way.
    const otherArtWords = artWords.filter((w) => w !== targetWord.word && sameType(w) && notConfusable(w));
    const sameUnit = otherArtWords.filter((w) => wordMetaByWord.get(w)?.unit === targetWord.unit).sort(() => Math.random() - 0.5);
    const otherUnit = otherArtWords.filter((w) => wordMetaByWord.get(w)?.unit !== targetWord.unit).sort(() => Math.random() - 0.5);
    distractorWords = [...sameUnit, ...otherUnit].slice(0, 3);
    if (distractorWords.length < 3) {
      const fallback = artWords
        .filter((w) => w !== targetWord.word && notConfusable(w) && !distractorWords.includes(w))
        .sort(() => Math.random() - 0.5);
      distractorWords = [...distractorWords, ...fallback].slice(0, 3);
    }
  } else {
    const sameTypePool = (wordsByType.get(targetWord.word_type) ?? []).filter((w) => w !== targetWord.word && notConfusable(w));
    distractorWords = sameTypePool.sort(() => Math.random() - 0.5).slice(0, 3);
    if (distractorWords.length < 3) {
      const fallback = allWords
        .filter((w) => w.word !== targetWord.word)
        .map((w) => w.word)
        .filter((w) => !distractorWords.includes(w))
        .sort(() => Math.random() - 0.5);
      distractorWords = [...distractorWords, ...fallback].slice(0, 3);
    }
  }

  const options = [...distractorWords, targetWord.word].sort(() => Math.random() - 0.5).map((word) => ({ word }));
  const correctIndex = options.findIndex((o) => o.word === targetWord.word);

  return {
    word: targetWord.word,
    wordClass: targetWord.word_type,
    pictureEligible,
    sentence: targetWord.word_type === 'verb'
      ? hashPick(targetWord.word, FALLBACK_VERB_TEMPLATES)
      : FALLBACK_FUNCTION_SENTENCES[targetWord.word] ?? 'I know the word ___.',
    options,
    correctIndex,
  };
}

// True-offline last resort — Supabase itself is unreachable (not just the
// AI endpoint), so this can't query `has_art` like everything else in this
// file does. 5 Unit-1 words only, clearly not the full curriculum; exists
// so the app never renders a completely empty session. The art subset
// below is the one deliberate exception to the has_art-is-the-only-source
// rule (see Step 0 of the wordart-batch-1 mission) — not covered by
// scripts/check-wordart-sync.mjs, kept in sync by hand since it only ever
// needs to match whichever of these exact 5 words currently have real art.
function buildOfflineFallbackPlan() {
  const words = ['cat', 'dog', 'bird', 'fish', 'ball'].map((word) => ({ word, word_type: 'noun', mastery: 0 }));
  const offlineArtWords = ['cat', 'dog', 'bird', 'fish', 'ball']; // all 5 offline words now have real art (wordart-batch-1, Unit 1)
  return {
    isFallback: true,
    isOffline: true,
    difficultyLevel: 'emerging',
    wordSequence: words,
    quizzes: words.map((w) => buildLocalQuiz(w, words, offlineArtWords)),
    encouragements: ['Great job!', "You're doing amazing!", 'Keep going, star learner!'],
    sessionGoal: 'Practice a few magic words!',
  };
}
