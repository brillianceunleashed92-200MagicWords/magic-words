import { useCallback, useMemo } from 'react';
import { useSpeak } from './useSpeak';

// Phase 2 Step 4: wraps useSpeak with a word -> audio_url lookup so call
// sites that already have the `words` list (with audio_url from
// migration + scripts/generate-word-audio.mjs) can speak a specific word
// and automatically get the real ElevenLabs MP3 instead of Web Speech
// synthesis, with zero change to useSpeak itself — the swap point
// documented in useSpeak.js's own comment.
export function useWordSpeak(words) {
  const { speak, stop } = useSpeak();

  const audioByWord = useMemo(() => {
    const map = new Map();
    for (const w of words ?? []) {
      if (w.audio_url) map.set(w.word.toLowerCase(), w.audio_url);
    }
    return map;
  }, [words]);

  const speakWord = useCallback((word) => {
    const audioUrl = audioByWord.get((word ?? '').toLowerCase());
    speak(word, { audioUrl });
  }, [audioByWord, speak]);

  return { speak, speakWord, stop };
}
