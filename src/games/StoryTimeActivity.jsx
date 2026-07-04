import { useState } from 'react';
import StoryReader from '../components/candy/StoryReader';
import { buildLocalStory, getStoryTier } from '../lib/localStory';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';
import { useStoryCatalogQuery, findCatalogStory } from '../lib/queries/storyCatalog';
import { GalaxyLoader } from '../components/AuthGuard';

// Story Time — connected-text activity (MLC 10-activity table). Length is
// leveled to the child's real level (mission A3 — see
// src/lib/localStory.js's getStoryTier for the level-range -> tier
// mapping): a new reader gets a single decodable sentence, a
// higher-level child gets a fuller story. Checks the pre-generated
// flagship catalog (mission A4 — src/lib/queries/storyCatalog.js) for a
// (word, tier) match first; falls back to the deterministic local
// template when no catalog entry exists yet, so catalog coverage can
// grow incrementally without ever leaving a word/tier unplayable.
export default function StoryTimeActivity({ quiz, onAnswer }) {
  const { words, levelInfo } = useCandyGalaxyData();
  const catalogQ = useStoryCatalogQuery();
  const [startTime] = useState(() => Date.now());

  // Waits for the catalog query to settle before picking a story — this
  // is a useState lazy initializer below, which runs (and locks in its
  // choice) exactly once on mount, so it must not fire while
  // catalogQ.data is still undefined on a fresh load (that would always
  // fall back to the local template even when a real catalog entry
  // exists, just not fetched yet). The catalog is small/cached/shared
  // across the whole app, so this is normally instant.
  if (catalogQ.isLoading) return <GalaxyLoader message="Finding your story…" />;

  return <StoryTimeReader quiz={quiz} onAnswer={onAnswer} words={words} levelInfo={levelInfo} catalog={catalogQ.data} startTime={startTime} />;
}

function StoryTimeReader({ quiz, onAnswer, words, levelInfo, catalog, startTime }) {
  const [story] = useState(() => {
    const tier = getStoryTier(levelInfo?.level ?? 24);
    return findCatalogStory(catalog, quiz.word, tier) ?? buildLocalStory(quiz, levelInfo?.level);
  });

  return (
    <StoryReader
      story={story}
      words={words}
      onComplete={(correct = true) => {
        onAnswer({ correct, responseTimeMs: Date.now() - startTime, firstTry: true });
      }}
    />
  );
}
