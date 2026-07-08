import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { track } from './track';
import { isEligibleForFreezeGrant } from '../streakFreeze';

export function useStreakQuery(childId) {
  return useQuery({
    queryKey: ['streak', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak, streak_freeze_count, last_activity_date, freeze_last_granted_at')
        .eq('child_id', childId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { current_streak: 0, longest_streak: 0, streak_freeze_count: 0, last_activity_date: null, freeze_last_granted_at: null };
    },
  });
}

// Same day-diff/freeze logic as the legacy updateStreak (src/App.jsx ~554),
// kept verbatim per docs/mlc-engine-audit.md — now scoped per child_id
// instead of user_id (a family's children keep independent streaks).
export function useUpdateStreakMutation(userId, childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

      const { data: existing, error: readErr } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle();
      if (readErr) throw readErr;

      const today = new Date(todayStr);
      const lastDate = existing?.last_activity_date ? new Date(existing.last_activity_date) : null;
      const daysDiff = lastDate ? Math.round((today - lastDate) / 86400000) : null;

      if (daysDiff === 0) return existing;

      let newStreak = existing?.current_streak ?? 0;
      let newFreezes = existing?.streak_freeze_count ?? 0;
      let newFreezeLastGrantedAt = existing?.freeze_last_granted_at ?? null;
      let freezeConsumed = false;

      if (daysDiff === 1) { newStreak++; }
      else if (daysDiff === 2 && newFreezes > 0) { newStreak++; newFreezes--; freezeConsumed = true; }
      else { newStreak = 1; }

      const newLongest = Math.max(existing?.longest_streak ?? 0, newStreak);

      // FEAT_QUICK_WINS_R1 — freeze grant/accrual, same decision point as
      // consumption (architecture note: don't scatter freeze logic across
      // readers). Evaluated AFTER the streak/consumption math above so a
      // freeze just spent this same call is correctly seen as "held: 0"
      // and can be replenished immediately if it's already a new ISO
      // week — this is what makes "accrual restores one freeze the next
      // ISO week" true even for a child who consumes on the very day a
      // new week starts.
      let freezeGranted = false;
      if (isEligibleForFreezeGrant({ currentStreak: newStreak, freezeCount: newFreezes, freezeLastGrantedAt: newFreezeLastGrantedAt, today: todayStr })) {
        newFreezes += 1;
        newFreezeLastGrantedAt = todayStr;
        freezeGranted = true;
      }

      const { data, error: writeErr } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: userId,
          child_id: childId,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity_date: todayStr,
          streak_freeze_count: newFreezes,
          freeze_last_granted_at: newFreezeLastGrantedAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id' })
        .select()
        .single();
      if (writeErr) throw writeErr;

      // Fire-and-forget telemetry (RULE 3) — never blocks the streak
      // write the child's session end is waiting on.
      if (freezeConsumed) track('streak_freeze_used', {}, childId);
      if (freezeGranted) track('streak_freeze_granted', {}, childId);

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['streak', childId], data);
    },
  });
}
