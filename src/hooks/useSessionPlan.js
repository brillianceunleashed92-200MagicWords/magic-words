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

const PLAN_CACHE_KEY   = 'mw_session_plan_v3'; // bumped: quizzes now carry word_type-derived wordClass + pictureEligible from the real words table, not the old 18-word list
const PLAN_TTL_MINUTES = 60; // regenerate if older than 1 hour
const FREE_TIER_MAX_UNIT = 5; // mirrors src/lib/queries/subscription.js — client-side fallback only; the server enforces this independently

function getCachedPlan() {
  try {
    const raw = sessionStorage.getItem(PLAN_CACHE_KEY);
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

function cachePlan(plan) {
  try {
    sessionStorage.setItem(PLAN_CACHE_KEY, JSON.stringify({
      plan,
      generatedAt: Date.now(),
    }));
  } catch {
    // sessionStorage full — continue without cache, not fatal
  }
}

export function useSessionPlan(user, childId, plan = 'free') {
  const [sessionPlan, setSessionPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError]     = useState(null);

  const generatePlan = useCallback(async (force = false, focusWord = null) => {
    if (!user || !childId) return;

    if (!force && !focusWord) {
      const cached = getCachedPlan();
      if (cached) {
        setSessionPlan(cached);
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
      cachePlan(newPlan);
      setSessionPlan(newPlan);
    } catch (err) {
      console.error('[useSessionPlan] Generation failed:', err.message);
      setPlanError(err.message);
      const fallback = await buildSupabaseFallbackPlan(childId, plan);
      setSessionPlan(fallback);
    } finally {
      setPlanLoading(false);
    }
  }, [user, childId, plan]);

  useEffect(() => {
    if (user && childId) generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, childId]);

  return {
    sessionPlan,
    planLoading,
    planError,
    regeneratePlan:      () => generatePlan(true),
    generatePlanForWord: (word) => generatePlan(true, word),
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
async function buildSupabaseFallbackPlan(childId, plan) {
  try {
    const maxUnit = plan === 'family' ? 18 : FREE_TIER_MAX_UNIT;
    const { data: words, error: wordsErr } = await supabase
      .from('words')
      .select('word, unit, sort_order, word_type, has_art')
      .lte('unit', maxUnit)
      .order('sort_order');
    if (wordsErr || !words?.length) throw wordsErr ?? new Error('no words available');

    const artWords = words.filter((w) => w.has_art).map((w) => w.word);
    const wordMetaByWord = new Map(words.map((w) => [w.word, { word_type: w.word_type, unit: w.unit }]));

    const { data: progress } = await supabase
      .from('word_progress')
      .select('word, mastery')
      .eq('child_id', childId);
    const masteryMap = new Map((progress ?? []).map((p) => [p.word, p.mastery]));

    const withMastery = words.map((w) => ({ ...w, mastery: masteryMap.get(w.word) ?? 0 }));
    const units = [...new Set(withMastery.map((w) => w.unit))].sort((a, b) => a - b);
    let currentUnit = units[0] ?? 1;
    for (const unit of units) {
      const hasUnmastered = withMastery.some((w) => w.unit === unit && w.mastery < 80);
      currentUnit = unit;
      if (hasUnmastered) break;
    }

    const focusWords = withMastery
      .filter((w) => w.unit === currentUnit)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 6);

    return {
      isFallback: true,
      difficultyLevel: 'emerging',
      currentUnit,
      wordSequence: focusWords,
      quizzes: focusWords.map((w) => buildLocalQuiz(w, withMastery, artWords, wordMetaByWord)),
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

function buildLocalQuiz(targetWord, allWords, artWords = [], wordMetaByWord = new Map()) {
  const pictureEligible = targetWord.word_type !== 'function' && artWords.includes(targetWord.word);

  let distractorWords;
  if (pictureEligible) {
    // Prefer same-unit distractors first (units are the curriculum's real
    // topical grouping — Family, Food & Drink, Colors, etc. — a tighter
    // semantic signal than word_type alone), then same word_type outside
    // that unit, then the broader has_art pool. Mirrors api/session-
    // generator.js's buildQuiz so both plan sources behave the same way.
    const otherArtWords = artWords.filter((w) => w !== targetWord.word);
    const sameUnit = otherArtWords.filter((w) => wordMetaByWord.get(w)?.unit === targetWord.unit).sort(() => Math.random() - 0.5);
    const sameTypeOtherUnit = otherArtWords
      .filter((w) => wordMetaByWord.get(w)?.unit !== targetWord.unit && wordMetaByWord.get(w)?.word_type === targetWord.word_type)
      .sort(() => Math.random() - 0.5);
    const rest = otherArtWords
      .filter((w) => wordMetaByWord.get(w)?.unit !== targetWord.unit && wordMetaByWord.get(w)?.word_type !== targetWord.word_type)
      .sort(() => Math.random() - 0.5);
    distractorWords = [...sameUnit, ...sameTypeOtherUnit, ...rest].slice(0, 3);
  } else {
    distractorWords = allWords
      .filter((w) => w.word !== targetWord.word)
      .map((w) => w.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }

  const options = [...distractorWords, targetWord.word].sort(() => Math.random() - 0.5).map((word) => ({ word }));
  const correctIndex = options.findIndex((o) => o.word === targetWord.word);

  return {
    word: targetWord.word,
    wordClass: targetWord.word_type,
    pictureEligible,
    sentence: FALLBACK_FUNCTION_SENTENCES[targetWord.word] ?? 'I know the word ___.',
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
