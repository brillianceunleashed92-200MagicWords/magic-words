import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { getLevelInfo } from '../levels';

export function useUserStatsQuery(childId) {
  return useQuery({
    queryKey: ['userStats', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('total_xp, current_level, avatar')
        .eq('child_id', childId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { total_xp: 0, current_level: 1, avatar: '\u{1F680}' }; // unicode escape, not a literal emoji char — see lib/avatars.js
    },
  });
}

// Same XP persistence as the legacy saveXP (src/App.jsx ~600) — accepts a
// session's total XP earned (already computed by GameEngine's per-question
// formula, unchanged) and upserts the recalculated level alongside it, now
// scoped per child_id.
export function useSaveXPMutation(userId, childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newTotalXP) => {
      const levelInfo = getLevelInfo(newTotalXP);
      const { data, error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          child_id: childId,
          total_xp: newTotalXP,
          current_level: levelInfo.level,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userStats', childId], data);
    },
  });
}
