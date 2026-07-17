import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { getActiveCurriculumVersion } from '../curriculumVersion';

// The 200-word curriculum — public-read, effectively static (content only
// changes via a re-seed, never at runtime), so a long staleTime avoids
// re-fetching it on every screen mount.
//
// CURRICULUM_REPLACE_R1 follow-up: scoped to the active curriculum_version
// (public.app_config) — without this filter, a second word set landing in
// `words` (e.g. supabase/seed/words_seed_v2.sql, deferred) would double
// the rows this query returns regardless of which one is meant to be live.
export function useWordsQuery() {
  return useQuery({
    queryKey: ['words'],
    queryFn: async () => {
      const curriculumVersion = await getActiveCurriculumVersion();
      const { data, error } = await supabase
        .from('words')
        // word_type/has_art added for Option B's guided-path activity
        // eligibility gate (src/lib/activityDefs.js) — real, populated
        // columns this query previously didn't select at all.
        .select('id, word, type, word_type, has_art, teaching_track, unit, sort_order, emoji, definition, audio_url, image_url')
        .eq('curriculum_version', curriculumVersion)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
