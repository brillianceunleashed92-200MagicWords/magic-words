import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

// Guided-path completion tracking (Option B). learning_events is the only
// live "did the child do X today" signal that exists — there is no other
// completion concept in the live app (see docs/OPTION_B_BUILD_REPORT.md).
// Schema verified directly against production: child_id/attempt_number/
// recorded_at/session_id all exist on the live table even though they
// aren't in any committed migration; recorded_at defaults to now() and is
// what PlayScreen.jsx's insert relies on implicitly.
export function useTodayWordActivityQuery(childId, word) {
  return useQuery({
    queryKey: ['todayWordActivity', childId, word],
    enabled: !!childId && !!word,
    // Short staleTime — this drives which path node is "current," so it
    // needs to reflect a just-finished session quickly, but doesn't need
    // to be instant (PlayScreen invalidates it explicitly on session end).
    staleTime: 1000 * 10,
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('learning_events')
        .select('game_type, correct, recorded_at')
        .eq('child_id', childId)
        .eq('word', word)
        .gte('recorded_at', startOfToday.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Aggregates raw learning_events rows into a per-activity summary. Not a
// GROUP BY in Postgres (Supabase's JS client can't do that without an RPC/
// view) — done client-side since the per-word/per-day row count is small.
// Star rating is deliberately never 0 — errorless learning: any completed
// activity earns at least one star, accuracy only affects how many more.
export function summarizeTodayActivity(rows) {
  const byActivity = new Map();
  for (const row of rows) {
    const entry = byActivity.get(row.game_type) ?? { attempts: 0, correct: 0 };
    entry.attempts += 1;
    if (row.correct) entry.correct += 1;
    byActivity.set(row.game_type, entry);
  }
  const summary = new Map();
  for (const [gameType, { attempts, correct }] of byActivity) {
    const accuracy = attempts > 0 ? correct / attempts : 0;
    const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    summary.set(gameType, { attempts, correct, accuracy, stars, done: true });
  }
  return summary;
}
