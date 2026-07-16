import { useEffect, useState } from 'react';
import { colors, fonts, skyGradient } from '../theme/tokens';
import NovaPortrait from '../components/candy/NovaPortrait';
import StoryReader from '../components/candy/StoryReader';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';
import { useGenerateStoryMutation, useServeCatalogStoryMutation, useMarkStoryReadMutation, MIN_MASTERED_WORDS_FOR_GENERATION } from '../lib/queries/stories';
import { useStoryCatalogQuery, findCatalogStoryForWord } from '../lib/queries/storyCatalog';
import { getStoryTier } from '../lib/localStory';
import { useEarnSparksMutation } from '../lib/queries/sparks';
import { isRealMastery } from '../lib/masteryCalibration';
import { useUIStore } from '../stores/useUIStore';
import { supabase } from '../supabaseClient';

const STORY_COMPLETE_SPARKS = 15;

// FIX_STORY_QUALITY_R1 (fallback shape) / FIX_STORY_FOLLOWUP_R1 (when it's
// used) -- last-resort fallback when story_catalog has no row for the
// target word at any tier (rare: catalog covers 20 early words today).
// Only reached when NO catalog story exists -- FIX_STORY_FOLLOWUP_R1
// removed the vocabulary gate that used to also route here when a found
// catalog story "failed" a strict 200-word check (Sal's call: curated
// content using richer read-aloud vocabulary with the target word
// highlighted is the methodology, not a violation -- that gate was only
// ever correct for AI-generated text, which still validates exactly in
// api/story-engine.js, untouched). Deliberately NOT src/lib/localStory.js's
// buildLocalStory (Story Time's own fallback, left untouched) -- that
// template's fixed words ("I", "fun", "likes", "makes") were checked
// directly against the production `words` table and NONE of the four
// exist in the 200-word curriculum. Every word below except
// targetWord/childName was confirmed present in `words` the same way: a,
// and, big, good, happy, is, me, my, play, see, the, we, with.
function buildVocabSafeFallback(targetWord, childName) {
  return {
    title: `The ${targetWord}`,
    sentences: [
      `See the ${targetWord}.`,
      `The ${targetWord} is big.`,
      `The ${targetWord} is good.`,
      `We play with the ${targetWord}.`,
      `${childName} and the ${targetWord}.`,
      `My ${targetWord} is happy.`,
    ],
  };
}

// The Story Engine's reader entry point (blueprint Part 3.1 — "the
// flagship"). Generates on demand (no cron): fetch mastered words + target
// word + name + interests, call api/story-engine.js, persist the
// validated result, then read it in the same StoryReader used by the
// "Story Time" MLC activity — no comprehension question here (that's
// Story Time's requirement, not the Story Engine's).
export default function StoryScreen({ existingStory, onDone }) {
  const { activeChild, currentWord, words, levelInfo } = useCandyGalaxyData();
  const generateStory = useGenerateStoryMutation(activeChild?.id);
  const serveCatalogStory = useServeCatalogStoryMutation(activeChild?.id);
  const markRead = useMarkStoryReadMutation(activeChild?.id);
  const earnSparks = useEarnSparksMutation(activeChild?.id);
  const queueCelebration = useUIStore((s) => s.queueCelebration);
  const catalogQ = useStoryCatalogQuery();
  const [story, setStory] = useState(existingStory ?? null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existingStory || !activeChild) return;
    const masteredWords = words.filter((w) => isRealMastery(w.mastery, w.attemptCount)).map((w) => w.word);
    const targetWord = currentWord?.word ?? 'star';

    // FIX_STORY_QUALITY_R1 -- quality floor: below this many real-mastered
    // words, the AI has too little vocabulary to write real, varied
    // language from (a brand-new child's pool is always [] here, per
    // STORY_QUALITY_REPORT.md's root cause) -- serve pre-authored/
    // deterministic content instead of ever calling the AI. Waits for the
    // catalog query (cheap, 1hr-cached, shared across the app) before
    // deciding; catalogQ.isLoading is in the dep array so this re-runs
    // once it resolves rather than only on activeChild changing.
    if (masteredWords.length < MIN_MASTERED_WORDS_FOR_GENERATION) {
      if (catalogQ.isLoading) return;
      const tier = getStoryTier(levelInfo?.level ?? 1);
      // FIX_STORY_FOLLOWUP_R1 -- serve a found catalog story directly, no
      // vocabulary gate (Sal's call, see the buildVocabSafeFallback
      // comment above). buildVocabSafeFallback is now reached only when
      // no catalog row exists for this word at any tier.
      const catalogStory = findCatalogStoryForWord(catalogQ.data, targetWord, tier);
      const source = catalogStory ?? buildVocabSafeFallback(targetWord, activeChild.name);
      serveCatalogStory.mutateAsync({
        title: source.title,
        sentences: source.sentences,
        targetWord,
        vocabularyUsed: catalogStory ? catalogStory.vocabularyUsed : [targetWord],
      })
        .then((row) => setStory(row))
        .catch(() => setError('Nova had trouble finding today’s story — try again in a bit!'));
      return;
    }

    generateStory.mutateAsync({
      childName: activeChild.name,
      interests: activeChild.interests ?? [],
      masteredWords,
      targetWord,
    })
      .then(({ row }) => setStory(row))
      .catch(() => setError('Nova had trouble writing today — try again in a bit!'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild?.id, catalogQ.isLoading]);

  async function handleComplete() {
    if (story) {
      await markRead.mutateAsync(story.id);
      await supabase.from('magic_moments').insert({
        child_id: activeChild.id,
        kind: 'audio_reading',
        payload: { storyId: story.id, title: story.title, targetWord: story.target_word },
      });
      await earnSparks.mutateAsync(STORY_COMPLETE_SPARKS);
      queueCelebration({ type: 'questComplete', payload: { wordsCorrect: 1, totalWords: 1, sparksEarned: STORY_COMPLETE_SPARKS } });
    }
    onDone?.();
  }

  if (error) {
    return (
      <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <NovaPortrait pose="wave" size={100} />
        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, marginTop: '1rem' }}>{error}</div>
        <button onClick={onDone} style={{ marginTop: '1.5rem', background: colors.cloud, border: 'none', borderRadius: 100, padding: '0.75rem 1.5rem', fontFamily: fonts.display, fontWeight: 700, cursor: 'pointer' }}>
          Back Home
        </button>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="candy-galaxy" style={{ minHeight: '100vh', background: skyGradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <NovaPortrait pose="read" size={120} />
        <div style={{ color: colors.cloud, fontFamily: fonts.display, fontWeight: 700, marginTop: '1rem' }}>
          Nova is writing your story…
        </div>
      </div>
    );
  }

  return (
    <StoryReader
      story={{
        title: story.title,
        sentences: story.body,
        targetWord: story.target_word,
      }}
      words={words}
      onComplete={handleComplete}
      onExit={onDone}
    />
  );
}
