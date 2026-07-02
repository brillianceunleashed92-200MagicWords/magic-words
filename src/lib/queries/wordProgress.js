import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { computeNextReviewAt } from '../starKeeper';

export function useWordProgressQuery(userId) {
  return useQuery({
    queryKey: ['wordProgress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('word_progress')
        .select('word, mastery, correct_count, attempt_count, last_seen, next_review_at, review_interval_days')
        .eq('user_id', userId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Same cumulative-mastery calculation as the legacy saveWordProgress
// (src/App.jsx, kept verbatim per docs/mlc-engine-audit.md section 4),
// plus Star Keeper's next_review_at/review_interval_days bump.
export function useSaveWordProgressMutation(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ word, correct }) => {
      const { data: existing } = await supabase
        .from('word_progress')
        .select('correct_count, attempt_count, review_interval_days')
        .eq('user_id', userId)
        .eq('word', word)
        .maybeSingle();

      const correctCount = (existing?.correct_count ?? 0) + (correct ? 1 : 0);
      const attemptCount = (existing?.attempt_count ?? 0) + 1;
      const masteryScore = Math.round((correctCount / attemptCount) * 100);
      const { intervalDays, nextReviewAt } = computeNextReviewAt(existing?.review_interval_days ?? 1, correct);

      const { data, error } = await supabase
        .from('word_progress')
        .upsert({
          user_id: userId,
          word,
          correct_count: correctCount,
          attempt_count: attemptCount,
          last_seen: new Date().toISOString(),
          mastery_score: masteryScore,
          mastery: masteryScore,
          next_review_at: nextReviewAt.toISOString(),
          review_interval_days: intervalDays,
        }, { onConflict: 'user_id,word' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordProgress', userId] });
    },
  });
}

// Star Keeper review — same mutation, called from the "wake up the star"
// review entry point rather than a lesson quiz, so it's exposed under its
// own name for call-site clarity even though the mechanics are identical.
export const useStarKeeperReviewMutation = useSaveWordProgressMutation;
