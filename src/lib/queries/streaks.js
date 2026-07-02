import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

export function useStreakQuery(userId) {
  return useQuery({
    queryKey: ['streak', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak, streak_freeze_count, last_activity_date')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { current_streak: 0, longest_streak: 0, streak_freeze_count: 0, last_activity_date: null };
    },
  });
}

// Same day-diff/freeze logic as the legacy updateStreak (src/App.jsx ~554),
// kept verbatim per docs/mlc-engine-audit.md — extended only by living in
// its own hook instead of inline in the monolith.
export function useUpdateStreakMutation(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

      const { data: existing, error: readErr } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (readErr) throw readErr;

      const today = new Date(todayStr);
      const lastDate = existing?.last_activity_date ? new Date(existing.last_activity_date) : null;
      const daysDiff = lastDate ? Math.round((today - lastDate) / 86400000) : null;

      if (daysDiff === 0) return existing;

      let newStreak = existing?.current_streak ?? 0;
      let newFreezes = existing?.streak_freeze_count ?? 0;

      if (daysDiff === 1) { newStreak++; }
      else if (daysDiff === 2 && newFreezes > 0) { newStreak++; newFreezes--; }
      else { newStreak = 1; }

      const newLongest = Math.max(existing?.longest_streak ?? 0, newStreak);

      const { data, error: writeErr } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: userId,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity_date: todayStr,
          streak_freeze_count: newFreezes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();
      if (writeErr) throw writeErr;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['streak', userId], data);
    },
  });
}
