import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { computeNextReviewAt } from '../starKeeper';

// Keyed by child_id (see migration 0011 — child_id is now the actual
// uniqueness grain, not user_id, so two children under the same parent
// account get independent mastery).
export function useWordProgressQuery(childId) {
  return useQuery({
    queryKey: ['wordProgress', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('word_progress')
        .select('word, mastery, correct_count, attempt_count, last_seen, next_review_at, review_interval_days')
        .eq('child_id', childId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Same cumulative-mastery calculation as the legacy saveWordProgress
// (src/App.jsx, kept verbatim per docs/mlc-engine-audit.md section 4),
// plus Star Keeper's next_review_at/review_interval_days bump. Needs both
// userId (RLS ownership / the parent account) and childId (the actual row
// key) since a row now belongs to one child, owned by one parent.
export function useSaveWordProgressMutation(userId, childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ word, correct }) => {
      const { data: existing } = await supabase
        .from('word_progress')
        .select('correct_count, attempt_count, review_interval_days')
        .eq('child_id', childId)
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
          child_id: childId,
          word,
          correct_count: correctCount,
          attempt_count: attemptCount,
          last_seen: new Date().toISOString(),
          mastery_score: masteryScore,
          mastery: masteryScore,
          next_review_at: nextReviewAt.toISOString(),
          review_interval_days: intervalDays,
        }, { onConflict: 'child_id,word' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordProgress', childId] });
    },
  });
}

// Star Keeper review — same mutation, called from the "wake up the star"
// review entry point rather than a lesson quiz, so it's exposed under its
// own name for call-site clarity even though the mechanics are identical.
export const useStarKeeperReviewMutation = useSaveWordProgressMutation;
