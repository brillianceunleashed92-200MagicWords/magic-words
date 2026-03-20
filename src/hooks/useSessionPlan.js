// src/hooks/useSessionPlan.js
// THE KEY AI OPTIMIZATION: generates the full session plan ONCE at login.
// Children get instant tap responses. AI is called ~1x per session instead of 20+.
//
// Flow:
//   Login → check sessionStorage for fresh plan → if stale/missing → call /api/session-generator
//   → store plan in sessionStorage → app reads from plan, no more AI calls per tap
//
// The plan includes: quiz sequence, word order, encouragements, difficulty level

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const PLAN_CACHE_KEY   = 'mw_session_plan';
const PLAN_TTL_MINUTES = 60; // regenerate if older than 1 hour

function getCachedPlan() {
  try {
    const raw = sessionStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const { plan, generatedAt } = JSON.parse(raw);
    const ageMinutes = (Date.now() - generatedAt) / 1000 / 60;
    if (ageMinutes > PLAN_TTL_MINUTES) return null;
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

export function useSessionPlan(user, wordProgress) {
  const [sessionPlan, setSessionPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError]     = useState(null);

  const generatePlan = useCallback(async (force = false) => {
    if (!user) return;

    // Use cache if available and not forcing refresh
    if (!force) {
      const cached = getCachedPlan();
      if (cached) {
        setSessionPlan(cached);
        return;
      }
    }

    setPlanLoading(true);
    setPlanError(null);

    try {
      // Build the prompt context from real word progress data
      const progressSummary = (wordProgress || []).map(wp => ({
        word:    wp.word,
        mastery: wp.mastery,
        lastPracticed: wp.last_practiced,
      }));

      const response = await fetch('/api/session-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:   user.id,
          progress: progressSummary,
        }),
      });

      if (!response.ok) throw new Error(`Session generator returned ${response.status}`);

      const { plan } = await response.json();
      cachePlan(plan);
      setSessionPlan(plan);
    } catch (err) {
      console.error('[useSessionPlan] Generation failed:', err.message);
      setPlanError(err.message);
      // Fallback: build a basic plan from existing word progress without AI
      setSessionPlan(buildFallbackPlan(wordProgress));
    } finally {
      setPlanLoading(false);
    }
  }, [user, wordProgress]);

  // Auto-generate when user logs in and wordProgress is loaded
  useEffect(() => {
    if (user && wordProgress !== null) {
      generatePlan();
    }
  }, [user?.id, wordProgress !== null]); // eslint-disable-line

  return { sessionPlan, planLoading, planError, regeneratePlan: () => generatePlan(true) };
}

// Fallback plan when AI is unavailable — uses local logic only, zero API calls
function buildFallbackPlan(wordProgress = []) {
  const WORDS = [
    { word: 'cat',  emoji: '🐱', mastery: 0 },
    { word: 'dog',  emoji: '🐶', mastery: 0 },
    { word: 'bird', emoji: '🐦', mastery: 0 },
    { word: 'eat',  emoji: '🍎', mastery: 0 },
    { word: 'jump', emoji: '🦘', mastery: 0 },
    { word: 'the',  emoji: '📖', mastery: 0 },
    { word: 'can',  emoji: '✅', mastery: 0 },
    { word: 'big',  emoji: '🐘', mastery: 0 },
    { word: 'run',  emoji: '🏃', mastery: 0 },
    { word: 'fly',  emoji: '✈️', mastery: 0 },
  ];

  // Prioritize low-mastery words
  const progressMap = Object.fromEntries((wordProgress || []).map(w => [w.word, w.mastery]));
  const sorted = [...WORDS]
    .map(w => ({ ...w, mastery: progressMap[w.word] ?? 0 }))
    .sort((a, b) => a.mastery - b.mastery);

  const focusWords = sorted.slice(0, 5);

  return {
    isFallback: true,
    difficultyLevel: 'emerging',
    wordSequence: focusWords,
    quizzes: focusWords.map(w => buildLocalQuiz(w, WORDS)),
    encouragements: [
      "Great job! ⭐",
      "You're doing amazing! 🌟",
      "Keep going, star learner! ✨",
      "Wow, you're so smart! 🎉",
      "That's right! You're a reading star! 🌈",
    ],
    sessionGoal: `Practice ${focusWords.map(w => w.word).join(', ')}`,
  };
}

function buildLocalQuiz(targetWord, allWords) {
  const ACTION_WORDS = ['jump', 'run', 'fly', 'eat', 'swim', 'dance', 'play', 'sing'];
  const isAction = ACTION_WORDS.includes(targetWord.word);

  const distractors = allWords
    .filter(w => w.word !== targetWord.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const options = [...distractors, targetWord].sort(() => Math.random() - 0.5);
  const correctIndex = options.findIndex(o => o.word === targetWord.word);

  return {
    word:         targetWord.word,
    emoji:        targetWord.emoji,
    question:     isAction
      ? `Which picture shows someone ${targetWord.word}ing?`
      : `Which picture shows a ${targetWord.word}?`,
    options:      options.map(o => ({ word: o.word, emoji: o.emoji })),
    correctIndex,
  };
}