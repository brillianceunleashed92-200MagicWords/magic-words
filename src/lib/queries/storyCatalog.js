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
        // FIX_STORY_FOLLOWUP_R1 -- vocabulary_used was missing from this
        // select entirely, so findCatalogStory's vocabularyUsed field
        // always defaulted to [] regardless of the row's real value.
        // Latent since FIX_STORY_QUALITY_R1 (that fix's vocab gate meant
        // a served catalog story's vocabulary_used was never actually
        // read), surfaced now that catalog stories are served verbatim.
        .select('target_word, tier, title, sentences, comprehension_question, art_asset_url, vocabulary_used');
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
    vocabularyUsed: row.vocabulary_used ?? [],
  };
}

// FIX_STORY_QUALITY_R1 -- same (word, tier) match as findCatalogStory, but
// falls back to the word at ANY tier if the child's exact tier has no row.
// Needed because catalog coverage today is tier-3-only (seeded 20 words,
// checked directly against production) -- an exact-tier lookup for a
// brand-new (tier 1) reader would never match anything, catalog or not.
// Still prefers the exact tier when one exists, so seeding tier-1/2 rows
// later "just works" without another code change.
export function findCatalogStoryForWord(catalog, word, tier) {
  return findCatalogStory(catalog, word, tier) ?? findCatalogStory(catalog, word, 3) ?? findCatalogStory(catalog, word, 2) ?? findCatalogStory(catalog, word, 1);
}
