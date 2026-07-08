import { useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWordsQuery } from './queries/words';
import { useWordProgressQuery } from './queries/wordProgress';
import { useSparksQuery } from './queries/sparks';
import { useStreakQuery } from './queries/streaks';
import { useUserStatsQuery } from './queries/userStats';
import { useChildProfilesQuery } from './queries/childProfiles';
import { useSubscriptionQuery, maxChildrenForPlan, isUnitLocked, FREE_TIER_MAX_UNIT } from './queries/subscription';
import { getLevelInfo } from './levels';
import { isStarSleepy } from './starKeeper';
import { isRealMastery } from './masteryCalibration';
import { useUIStore } from '../stores/useUIStore';

// Combines every server-state query into the shape Candy Galaxy's screens
// need: the active child (Phase 2 multi-child — see
// src/lib/queries/childProfiles.js), words merged with that child's
// per-word progress, plus derived unit/trophy/star-keeper summaries. One
// hook so Home/Play/Galaxy don't each re-derive this independently.
export function useCandyGalaxyData() {
  const { user } = useAuth();
  const childrenQ = useChildProfilesQuery(user?.id);
  const subscriptionQ = useSubscriptionQuery(user?.id);
  const activeChildId = useUIStore((s) => s.activeChildId);
  const setActiveChildId = useUIStore((s) => s.setActiveChildId);

  const children = childrenQ.data ?? [];
  // Fall back to the first child if nothing's selected yet, or the
  // persisted selection doesn't match any of this parent's children
  // (e.g. switched accounts, or that child was never actually created).
  const activeChild = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  useEffect(() => {
    if (activeChild && activeChild.id !== activeChildId) setActiveChildId(activeChild.id);
  }, [activeChild, activeChildId, setActiveChildId]);

  const childId = activeChild?.id ?? null;

  const wordsQ = useWordsQuery();
  const progressQ = useWordProgressQuery(childId);
  const sparksQ = useSparksQuery(childId);
  const streakQ = useStreakQuery(childId);
  const statsQ = useUserStatsQuery(childId);
  const plan = subscriptionQ.data?.plan ?? 'free';

  const words = useMemo(() => {
    const progressByWord = new Map((progressQ.data ?? []).map((p) => [p.word, p]));
    return (wordsQ.data ?? []).map((w) => {
      const p = progressByWord.get(w.word);
      return {
        ...w,
        mastery: p?.mastery ?? 0,
        attemptCount: p?.attempt_count ?? 0,
        // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 6 — needed by
        // computeWeeklyMasteryCrossings's truncation guard, which compares
        // a replay's final (attemptCount, correctCount) against the real
        // stored word_progress row to detect an 84-day window that cut off
        // a word's earlier history. Already fetched by useWordProgressQuery
        // (correct_count), just not previously exposed on this merged shape.
        correctCount: p?.correct_count ?? 0,
        nextReviewAt: p?.next_review_at ?? null,
        sleepy: p ? isStarSleepy(p.next_review_at) : false,
        premiumLocked: isUnitLocked(w.unit, plan),
      };
    });
  }, [wordsQ.data, progressQ.data, plan]);

  const unitsById = useMemo(() => {
    const map = new Map();
    for (const w of words) {
      if (!map.has(w.unit)) map.set(w.unit, []);
      map.get(w.unit).push(w);
    }
    return map;
  }, [words]);

  // "Current" word: first not-yet-mastered, not-premium-locked word in
  // sort order. Free-tier children never land on a Unit 6+ word as their
  // "next" quest — once everything unlocked is mastered, this falls back
  // to the last unlocked word (Home shows a "come back for more" state
  // rather than silently handing them a locked word to attempt).
  //
  // Placement Adventure (Prompt 8): a placed child's floor (already
  // min(measured, plan cap) — never fabricates word_progress) shifts
  // which word this recommendation scans FROM, mirroring the same floor
  // applied server-side in session-generator.js's selectCandidateWords.
  // Below-floor words are untouched here — they still render via
  // GalaxyScreen's existing status derivation (locked, same as any
  // never-reached word), just never chosen as "current."
  const placementFloor = activeChild?.placement_unit
    ? Math.min(activeChild.placement_unit, plan === 'family' ? 18 : FREE_TIER_MAX_UNIT)
    : null;
  // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 3 — a word answered correctly once
  // (100% stored mastery, 1 attempt) must not roll the guided path forward
  // to the next word: isRealMastery requires MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION
  // attempts, so a 1-tap word stays `currentWord` and keeps getting
  // repeated meaningful exposure (Dr. Blank's method), matching the
  // celebration threshold that already gated PlayScreen's confetti.
  const currentWord = useMemo(() => {
    const playable = words.filter((w) => !w.premiumLocked && (!placementFloor || w.unit >= placementFloor));
    return playable.find((w) => !isRealMastery(w.mastery, w.attemptCount)) ?? playable[playable.length - 1] ?? null;
  }, [words, placementFloor]);

  const sleepyStars = useMemo(
    () => words.filter((w) => isRealMastery(w.mastery, w.attemptCount) && w.sleepy),
    [words]
  );

  const masteredCount = useMemo(
    () => words.filter((w) => isRealMastery(w.mastery, w.attemptCount)).length,
    [words]
  );

  const completedUnits = useMemo(() => {
    const done = [];
    for (const [unit, unitWords] of unitsById) {
      if (unitWords.length && unitWords.every((w) => isRealMastery(w.mastery, w.attemptCount))) done.push(unit);
    }
    return done;
  }, [unitsById]);

  const levelInfo = getLevelInfo(statsQ.data?.total_xp ?? 0);

  return {
    user,
    children,
    activeChild,
    childId,
    setActiveChildId,
    maxChildren: maxChildrenForPlan(plan),
    plan,
    isLoading: childrenQ.isLoading || wordsQ.isLoading || progressQ.isLoading,
    words,
    unitsById,
    currentWord,
    sleepyStars,
    masteredCount,
    completedUnits,
    sparks: sparksQ.data ?? { balance: 0, lifetime_earned: 0 },
    streak: streakQ.data ?? { current_streak: 0, longest_streak: 0, streak_freeze_count: 0, freeze_last_granted_at: null },
    stats: statsQ.data ?? { total_xp: 0, current_level: 1, avatar: '\u{1F680}' }, // unicode escape — see lib/avatars.js
    levelInfo,
  };
}
