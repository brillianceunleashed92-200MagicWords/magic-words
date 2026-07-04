import { useState } from 'react';
import StoryReader from '../components/candy/StoryReader';
import { buildLocalStory } from '../lib/localStory';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';

// Story Time — connected-text activity (MLC 10-activity table). Length is
// leveled to the child's real level (mission A3 — see
// src/lib/localStory.js's getStoryTier for the level-range -> tier
// mapping): a new reader gets a single decodable sentence, a
// higher-level child gets a fuller story. Falls back to this local
// template when no pre-generated catalog story matches the target word
// (real catalog art/text are the Story Engine's flagship path — see
// docs/STORY_TIME_REBUILD_REPORT.md).
export default function StoryTimeActivity({ quiz, onAnswer }) {
  const { words, levelInfo } = useCandyGalaxyData();
  const [story] = useState(() => buildLocalStory(quiz, levelInfo?.level));
  const [startTime] = useState(() => Date.now());

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
