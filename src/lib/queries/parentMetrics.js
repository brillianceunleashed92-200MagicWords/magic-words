import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

const PAGE_SIZE = 1000; // Supabase's per-request select cap
const DAYS_BACK = 84; // ~12 weeks — covers chart 1/4's 8-week display window plus lead-in history for cumulative mastery replay (see Phase 0 recon)

// One date-bounded, paginated read of learning_events per child — the
// single data source charts 1-4 (mastery crossings, practice heatmap,
// accuracy by activity, response-time trend) all derive from client-side
// (src/lib/parentMetricsDerivations.js). Charts 5/6 (review forecast, unit
// progress) reuse the `words` shape useCandyGalaxyData() already provides
// — no separate query needed for those.
export function useParentMetricsHistoryQuery(childId) {
  return useQuery({
    queryKey: ['parentMetricsHistory', childId],
    enabled: !!childId,
    // Same fire-and-forget-insert reasoning as useWeeklyStatsQuery — a
    // parent opening the Progress section right after the child finishes
    // playing must not see a stale/empty cached read.
    refetchOnMount: 'always',
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - DAYS_BACK);
      since.setHours(0, 0, 0, 0);

      const rows = [];
      let from = 0;
      // Real accounts can exceed 1000 events in 84 days (that's the whole
      // point of the fixture requiring >=1200 rows) — loop until a page
      // comes back short of PAGE_SIZE, proving pagination is actually
      // exercised rather than assumed.
      while (true) {
        const { data, error } = await supabase
          .from('learning_events')
          .select('word, correct, recorded_at, game_type, response_time_ms')
          .eq('child_id', childId)
          .gte('recorded_at', since.toISOString())
          .order('recorded_at', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return rows;
    },
  });
}
