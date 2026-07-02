import { useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWordsQuery } from './queries/words';
import { useWordProgressQuery } from './queries/wordProgress';
import { useSparksQuery } from './queries/sparks';
import { useStreakQuery } from './queries/streaks';
import { useUserStatsQuery } from './queries/userStats';
import { useChildProfilesQuery } from './queries/childProfiles';
import { useSubscriptionQuery, maxChildrenForPlan } from './queries/subscription';
import { getLevelInfo } from './levels';
import { isStarSleepy } from './starKeeper';
import { useUIStore } from '../stores/useUIStore';

const MASTERED_THRESHOLD = 80;

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

  const words = useMemo(() => {
    const progressByWord = new Map((progressQ.data ?? []).map((p) => [p.word, p]));
    return (wordsQ.data ?? []).map((w) => {
      const p = progressByWord.get(w.word);
      return {
        ...w,
        mastery: p?.mastery ?? 0,
        attemptCount: p?.attempt_count ?? 0,
        nextReviewAt: p?.next_review_at ?? null,
        sleepy: p ? isStarSleepy(p.next_review_at) : false,
      };
    });
  }, [wordsQ.data, progressQ.data]);

  const unitsById = useMemo(() => {
    const map = new Map();
    for (const w of words) {
      if (!map.has(w.unit)) map.set(w.unit, []);
      map.get(w.unit).push(w);
    }
    return map;
  }, [words]);

  // "Current" word: first not-yet-mastered word in sort order, or the last
  // word if everything is mastered (nothing left to learn today).
  const currentWord = useMemo(() => {
    return words.find((w) => w.mastery < MASTERED_THRESHOLD) ?? words[words.length - 1] ?? null;
  }, [words]);

  const sleepyStars = useMemo(
    () => words.filter((w) => w.mastery >= MASTERED_THRESHOLD && w.sleepy),
    [words]
  );

  const masteredCount = useMemo(
    () => words.filter((w) => w.mastery >= MASTERED_THRESHOLD).length,
    [words]
  );

  const completedUnits = useMemo(() => {
    const done = [];
    for (const [unit, unitWords] of unitsById) {
      if (unitWords.length && unitWords.every((w) => w.mastery >= MASTERED_THRESHOLD)) done.push(unit);
    }
    return done;
  }, [unitsById]);

  const levelInfo = getLevelInfo(statsQ.data?.total_xp ?? 0);
  const plan = subscriptionQ.data?.plan ?? 'free';

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
    streak: streakQ.data ?? { current_streak: 0, longest_streak: 0 },
    stats: statsQ.data ?? { total_xp: 0, current_level: 1, avatar: '🚀' },
    levelInfo,
  };
}
