import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { computeNextReviewAt } from '../starKeeper';
import { getActiveCurriculumVersion } from '../curriculumVersion';

// Keyed by child_id (see migration 0011 — child_id is now the actual
// uniqueness grain, not user_id, so two children under the same parent
// account get independent mastery).
//
// CURRICULUM_REPLACE_R1 follow-up: also scoped to the active
// curriculum_version, so a word spelled identically in two curricula
// (86 of them, e.g. "cat") can't have its v1 progress silently reused as
// v2 progress or vice versa — each curriculum edition gets its own row.
export function useWordProgressQuery(childId) {
  return useQuery({
    queryKey: ['wordProgress', childId],
    enabled: !!childId,
    queryFn: async () => {
      const curriculumVersion = await getActiveCurriculumVersion();
      const { data, error } = await supabase
        .from('word_progress')
        .select('word, mastery, correct_count, attempt_count, last_seen, next_review_at, review_interval_days')
        .eq('child_id', childId)
        .eq('curriculum_version', curriculumVersion);
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
//
// CURRICULUM_REPLACE_R1 follow-up: migration 0040 widened word_progress's
// unique constraint from (child_id, word) to (child_id, word,
// curriculum_version) — required so v1 and v2 progress on an identically
// spelled word don't collide (see the migration's own header). That
// constraint change silently broke this upsert's `onConflict: 'child_id,
// word'` — Postgres requires the ON CONFLICT target to match an existing
// constraint's column list exactly, and a 2-column target no longer
// matches any constraint on this table, so every save was failing before
// this fix. Found while wiring up this read path, fixed here: the
// existing-row lookup, the upserted row, and onConflict's target all now
// include curriculum_version.
export function useSaveWordProgressMutation(userId, childId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ word, correct }) => {
      const curriculumVersion = await getActiveCurriculumVersion();
      const { data: existing } = await supabase
        .from('word_progress')
        .select('correct_count, attempt_count, review_interval_days')
        .eq('child_id', childId)
        .eq('word', word)
        .eq('curriculum_version', curriculumVersion)
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
          curriculum_version: curriculumVersion,
          correct_count: correctCount,
          attempt_count: attemptCount,
          last_seen: new Date().toISOString(),
          mastery_score: masteryScore,
          mastery: masteryScore,
          next_review_at: nextReviewAt.toISOString(),
          review_interval_days: intervalDays,
        }, { onConflict: 'child_id,word,curriculum_version' })
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
