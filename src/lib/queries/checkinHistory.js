import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

// FEAT_PLACEMENT_CHECKIN_R1 — the growth-over-time chart's one data
// source. product_events stays service-role-only/no-client-RLS
// (unchanged invariant), so this reads through the new ownership-
// verified `historyMode` branch on api/session-generator.js rather than
// a direct Supabase table query — see PLACEMENT_CHECKIN_REPORT.md DESIGN
// LOCK for why. Mirrors the request shape every other session-generator
// mode already uses (auth token, childId, a boolean mode flag).
export function useMeasuredLevelHistoryQuery(childId) {
  return useQuery({
    queryKey: ['measuredLevelHistory', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/session-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ childId, historyMode: true }),
      });
      if (!response.ok) throw new Error(`History request failed: ${response.status}`);
      const { history } = await response.json();
      return history ?? [];
    },
  });
}
