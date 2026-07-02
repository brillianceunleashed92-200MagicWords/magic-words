import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

// Account-level (not per-child — one set of time rules covers all of a
// parent's children, matching migration 0009's design).
export function useParentSettingsQuery(userId) {
  return useQuery({
    queryKey: ['parentSettings', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_settings')
        .select('daily_minutes_limit, bedtime_lockout, weekend_streak_pause')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { daily_minutes_limit: null, bedtime_lockout: {}, weekend_streak_pause: false };
    },
  });
}

export function useUpdateParentSettingsMutation(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates) => {
      const { data, error } = await supabase
        .from('parent_settings')
        .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['parentSettings', userId], data);
    },
  });
}
