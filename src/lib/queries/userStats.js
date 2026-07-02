import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { getLevelInfo } from '../levels';

export function useUserStatsQuery(userId) {
  return useQuery({
    queryKey: ['userStats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('total_xp, current_level, avatar')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { total_xp: 0, current_level: 1, avatar: '🚀' };
    },
  });
}

// Same XP persistence as the legacy saveXP (src/App.jsx ~600) — accepts a
// session's total XP earned (already computed by GameEngine's per-question
// formula, unchanged) and upserts the recalculated level alongside it.
export function useSaveXPMutation(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newTotalXP) => {
      const levelInfo = getLevelInfo(newTotalXP);
      const { data, error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          total_xp: newTotalXP,
          current_level: levelInfo.level,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userStats', userId], data);
    },
  });
}
