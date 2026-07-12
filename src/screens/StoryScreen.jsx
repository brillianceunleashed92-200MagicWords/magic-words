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

// FIX_STORY_QUALITY_R1 -- last-resort fallback when story_catalog has no
// row for the target word at any tier (rare: catalog covers 20 early
// words today). Deliberately NOT src/lib/localStory.js's buildLocalStory
// (Story Time's own fallback, left untouched) -- that template's fixed
// words ("I", "fun", "likes", "makes") were checked directly against the
// production `words` table and NONE of the four exist in the 200-word
// curriculum, which would undercut this fix's "never out-of-list
// vocabulary" guarantee. Every word below except targetWord/childName was
// confirmed present in `words` the same way: a, and, big, good, happy,
// is, me, my, play, see, the, we, with.
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

// FIX_STORY_QUALITY_R1 -- a Playwright spec (tests/story-quality.spec.js)
// checking a real catalog story's sentences word-by-word against the
// production `words` table found that story_catalog content itself is
// NOT guaranteed to stay inside the 200-word list -- "The Curious Cat"
// (the exact story from the original incident) uses "likes/jumps/runs/
// yard/sees/rolls/its/paw/tired/takes/nap", none of which are literal
// 200-word entries. Editing catalog content is out of scope for this fix
// (guardrail), so instead of trusting any catalog row blindly, gate it
// here: only serve a catalog story if every word it actually uses is a
// real curriculum word (or the target word / child's name) -- otherwise
// fall through to the guaranteed-safe template above. Logged in full in
// STORY_QUALITY_REPORT.md; catalog content itself is unedited.
function catalogStoryIsVocabSafe(catalogStory, wordSet, targetWord, childName) {
  const nameLower = childName.toLowerCase();
  const targetLower = targetWord.toLowerCase();
  const tokens = catalogStory.sentences.join(' ').toLowerCase().match(/[a-z']+/g) || [];
  return tokens.every((t) => t === nameLower || t === targetLower || wordSet.has(t));
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
      const wordSet = new Set(words.map((w) => w.word.toLowerCase()));
      const rawCatalogStory = findCatalogStoryForWord(catalogQ.data, targetWord, tier);
      const catalogStory = rawCatalogStory && catalogStoryIsVocabSafe(rawCatalogStory, wordSet, targetWord, activeChild.name)
        ? rawCatalogStory
        : null;
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
