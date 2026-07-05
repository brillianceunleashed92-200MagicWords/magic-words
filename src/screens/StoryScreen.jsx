import { useEffect, useState } from 'react';
import { colors, fonts, skyGradient } from '../theme/tokens';
import NovaPortrait from '../components/candy/NovaPortrait';
import StoryReader from '../components/candy/StoryReader';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';
import { useGenerateStoryMutation, useMarkStoryReadMutation } from '../lib/queries/stories';
import { useEarnSparksMutation } from '../lib/queries/sparks';
import { useUIStore } from '../stores/useUIStore';
import { supabase } from '../supabaseClient';

const STORY_COMPLETE_SPARKS = 15;

// The Story Engine's reader entry point (blueprint Part 3.1 — "the
// flagship"). Generates on demand (no cron): fetch mastered words + target
// word + name + interests, call api/story-engine.js, persist the
// validated result, then read it in the same StoryReader used by the
// "Story Time" MLC activity — no comprehension question here (that's
// Story Time's requirement, not the Story Engine's).
export default function StoryScreen({ existingStory, onDone }) {
  const { activeChild, currentWord, words } = useCandyGalaxyData();
  const generateStory = useGenerateStoryMutation(activeChild?.id);
  const markRead = useMarkStoryReadMutation(activeChild?.id);
  const earnSparks = useEarnSparksMutation(activeChild?.id);
  const queueCelebration = useUIStore((s) => s.queueCelebration);
  const [story, setStory] = useState(existingStory ?? null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existingStory || !activeChild) return;
    const masteredWords = words.filter((w) => w.mastery >= 80).map((w) => w.word);
    generateStory.mutateAsync({
      childName: activeChild.name,
      interests: activeChild.interests ?? [],
      masteredWords,
      targetWord: currentWord?.word ?? 'star',
    })
      .then(({ row }) => setStory(row))
      .catch(() => setError('Nova had trouble writing today — try again in a bit!'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChild?.id]);

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
