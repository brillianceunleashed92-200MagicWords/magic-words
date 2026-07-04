import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';

// Mission A4 — the pre-generated flagship story catalog (migration 0030).
// Fetched once per session (long staleTime — this is curated, slow-moving
// content, not per-user data) and looked up client-side by
// StoryTimeActivity for a (target_word, tier) match; falls back to the
// deterministic local template (src/lib/localStory.js) when no catalog
// entry exists yet, so catalog coverage can grow incrementally without
// ever leaving a word/tier combination unplayable.
export function useStoryCatalogQuery() {
  return useQuery({
    queryKey: ['storyCatalog'],
    staleTime: 1000 * 60 * 60, // 1 hour — curated content, changes rarely
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story_catalog')
        .select('target_word, tier, title, sentences, comprehension_question, art_asset_url');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Looks up a catalog entry for the exact (word, tier), shaping it to the
// same { title, sentences, targetWord, comprehensionQuestion, artUrl }
// shape StoryReader.jsx expects (see buildLocalStory in localStory.js for
// the equivalent local-fallback shape).
export function findCatalogStory(catalog, word, tier) {
  const row = catalog?.find((r) => r.target_word === word && r.tier === tier);
  if (!row) return null;
  return {
    title: row.title,
    sentences: row.sentences,
    targetWord: row.target_word,
    comprehensionQuestion: row.comprehension_question ?? undefined,
    artUrl: row.art_asset_url ?? undefined,
  };
}
