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
    // Always refetch on mount regardless of staleTime — this query decides
    // whether a path node shows as done, so the guided path must never
    // render off a stale cache the instant it's shown again (e.g.
    // returning from a just-finished session before the explicit
    // invalidateQueries call in PlayScreen's handleSessionEnd has settled).
    refetchOnMount: 'always',
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

// Activities with no real pass/fail outcome — their onAnswer always
// reports `correct: true` unconditionally (confirmed by reading each
// component directly, not assumed):
//   - word_song (WordSong.jsx): a chant-along, no task to get wrong.
//   - magic_video (MagicVideo.jsx): a watch-the-video placeholder.
//   - draw_it (DrawIt.jsx): drawing the word by hand IS the point.
//   - word_builder (WordBuilder.jsx): errorless by construction — a wrong
//     letter tap is rejected immediately and never added to the spelled
//     word, so the only way onAnswer ever fires is by eventually spelling
//     it correctly. Real, but never varies, so an accuracy formula reading
//     it just measures "did they finish" a second time.
// Deriving "3 stars" from a value that's always true isn't a broken
// formula, but it reads as an inflated/fake rating next to activities
// that really do vary (Word Hunt, Fill the Story, etc.) — these get a
// fixed, honest 1 star (the same floor every activity gets — "errorless
// learning: any completed activity earns at least one star" per the
// comment above) instead of a 3 that implies a performance judgment that
// was never actually possible.
//
// story_time and say_it were deliberately NOT added here even though each
// has a path that also always reports correct:true (Story Time's tier-1
// micro-stories have no comprehension question; Say It's no-mic-support
// fallback is a self-report tap) — both ALSO have a genuine pass/fail
// path (Story Time's tier-2/3 comprehension question; Say It's real
// speech-recognition match), so a blanket override would incorrectly flatten
// the sessions that DO carry real signal. Distinguishing "this specific
// session had no real question" from "it did" would need a new signal
// threaded through learning_events, which is a feature addition, not the
// bug fix this pass is scoped to — flagged in NOTES FOR NEXT PROMPTS.
export const SCORELESS_GAME_TYPES = new Set(['word_song', 'magic_video', 'draw_it', 'word_builder']);

// Aggregates raw learning_events rows into a per-activity summary. Not a
// GROUP BY in Postgres (Supabase's JS client can't do that without an RPC/
// view) — done client-side since the per-word/per-day row count is small.
// Star rating is deliberately never 0 — errorless learning: any completed
// activity earns at least one star, accuracy only affects how many more
// (except the scoreless activities above, which always get exactly 1).
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
    const stars = SCORELESS_GAME_TYPES.has(gameType) ? 1 : (accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1);
    summary.set(gameType, { attempts, correct, accuracy, stars, done: true });
  }
  return summary;
}
