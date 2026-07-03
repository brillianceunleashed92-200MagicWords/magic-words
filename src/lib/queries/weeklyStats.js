import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

const MASTERED_THRESHOLD = 80;
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

  const events = eventsQ.data ?? [];
  const minutesThisWeek = Math.round((events.length * SECONDS_PER_EVENT) / 60);

  const practicedThisWeek = new Set(events.map((e) => e.word));
  const wordsThisWeek = (words ?? [])
    .filter((w) => practicedThisWeek.has(w.word))
    .map((w) => ({ word: w.word, mastery: w.mastery }));

  const weakWords = (words ?? [])
    .filter((w) => w.attemptCount > 0 && w.mastery > 0 && w.mastery < 60)
    .map((w) => w.word)
    .slice(0, 5);

  return {
    isLoading: eventsQ.isLoading,
    minutesThisWeek,
    wordsThisWeek,
    weakWords,
  };
}
