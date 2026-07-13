import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { isRealMastery, MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION } from '../masteryCalibration';

// Same per-event minutes approximation the legacy App.jsx dashboard used
// (15 seconds/event) — no dedicated session-duration tracking exists,
// this is a reasonable proxy until one does.
const SECONDS_PER_EVENT = 15;

// "This Week" hero stats (blueprint 4.1) — words mastered, minutes
// played, weak words for the AI Insight/digest — computed from
// learning_events (last 7 days) + the already-loaded word progress.
export function useWeeklyStatsQuery(childId, words) {
  const eventsQ = useQuery({
    queryKey: ['learningEventsWeek', childId],
    enabled: !!childId,
    // learning_events rows are written via a fire-and-forget insert during
    // gameplay (PlayScreen.jsx's handleProgress), not a useMutation, so
    // nothing ever invalidates this query's cache when new events land.
    // A parent who plays a round then immediately checks the Dashboard
    // could see a stale/empty read if this query's very first fetch on
    // mount raced an in-flight insert (confirmed live: first Dashboard
    // visit after gameplay showed 0/0 despite the events already existing
    // in the DB moments later). refetchOnMount: 'always' means every time
    // a parent opens this tab it re-checks the DB rather than trusting a
    // stale/empty cached result from a previous mount.
    refetchOnMount: 'always',
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('learning_events')
        .select('word, recorded_at')
        .eq('child_id', childId)
        .gte('recorded_at', since.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  // FIX_PARENT_SURFACE_R1 -- the AI Insight was blind to story reads (only
  // ever saw learning_events), so a placement+story-read-only week still
  // said "hasn't started yet." Minimal additive read: story rows marked
  // read in the last 7 days, same window as the learning_events query
  // above. Does not change minutesThisWeek/wordsThisWeek (DECISIONS 2/3 --
  // no honest per-story duration signal exists in `stories` without a
  // schema change, and story reads never counted toward word mastery).
  const storiesQ = useQuery({
    queryKey: ['storiesReadWeek', childId],
    enabled: !!childId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('stories')
        .select('id')
        .eq('child_id', childId)
        .not('read_at', 'is', null)
        .gte('read_at', since.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const events = eventsQ.data ?? [];
  const minutesThisWeek = Math.round((events.length * SECONDS_PER_EVENT) / 60);

  // FEAT_PEDAGOGY_CALIBRATION_R1 Phase 2 — this used to count ANY word
  // touched this week, with no mastery gate at all (this file previously
  // declared its own local MASTERED_THRESHOLD = 80 that went entirely
  // unused for this specific field). That contradicted
  // Package A's parent-metrics chart 1 (weekly REAL-mastery crossings) on
  // the same Dashboard screen — a parent could see "5 words this week"
  // here and "0" on the chart directly below it. Now: practiced this week
  // AND genuinely mastered (isRealMastery), so both numbers describe the
  // same thing.
  const practicedThisWeek = new Set(events.map((e) => e.word));
  const wordsThisWeek = (words ?? [])
    .filter((w) => practicedThisWeek.has(w.word) && isRealMastery(w.mastery, w.attemptCount))
    .map((w) => ({ word: w.word, mastery: w.mastery }));

  // Same "don't judge on too little data" principle as isRealMastery,
  // applied to the low-mastery direction: a word with 1 wrong attempt
  // rounds to mastery 0 and would otherwise never even qualify (existing
  // `mastery > 0` floor already excluded it), but a word with e.g. 1
  // correct + 1 wrong (50%, 2 attempts) read as "struggling" before this
  // change despite having too little history to say that reliably.
  const weakWords = (words ?? [])
    .filter((w) => w.attemptCount >= MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION && w.mastery > 0 && w.mastery < 60)
    .map((w) => w.word)
    .slice(0, 5);

  return {
    isLoading: eventsQ.isLoading,
    minutesThisWeek,
    wordsThisWeek,
    weakWords,
    storiesReadThisWeek: (storiesQ.data ?? []).length,
  };
}
