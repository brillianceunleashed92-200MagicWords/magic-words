import { useState } from 'react';
import StoryReader from '../components/candy/StoryReader';
import { buildLocalStory } from '../lib/localStory';

// Story Time — connected-text activity (MLC 10-activity table). Uses the
// local template story for now (real per-child AI stories are the Story
// Engine, Step 3 — this activity will read from the `stories` table once
// that exists, same StoryReader component either way).
export default function StoryTimeActivity({ quiz, onAnswer }) {
  const [story] = useState(() => buildLocalStory(quiz));
  const [startTime] = useState(() => Date.now());

  return (
    <StoryReader
      story={story}
      onComplete={(correct = true) => {
        onAnswer({ correct, responseTimeMs: Date.now() - startTime, firstTry: true });
      }}
    />
  );
}
