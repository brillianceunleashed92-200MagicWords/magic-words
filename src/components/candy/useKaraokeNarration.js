import { useEffect, useRef, useState } from 'react';
import { fetchAudio, playAudio } from '../../games/gameAudio';

// Read-along narration for one sentence at a time: fetches + plays the
// FULL sentence as one TTS clip (through the shared audio singleton, so
// it never overlaps other sound), then estimates which word is currently
// being spoken from playback progress — proportional to each word's
// character length, since ElevenLabs doesn't return real per-word
// timestamps. Not frame-perfect, but a reasonable approximation used by
// many read-along apps, and it keeps narration to one natural-sounding
// clip per sentence rather than choppy word-by-word chaining with gaps.
//
// Returns { highlightedIndex, narrationDone, replay }. `sentence` is the
// current page's text; pass a new one to start narrating it (auto-plays
// on mount/change). `enabled` lets the caller gate autoplay (e.g. off
// while showing the cover page).
export function useKaraokeNarration(sentence, enabled = true) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [narrationDone, setNarrationDone] = useState(false);
  const audioRef = useRef(null);
  const words = (sentence ?? '').split(' ').filter(Boolean);

  function play() {
    if (!sentence) return;
    setNarrationDone(false);
    setHighlightedIndex(-1);
    fetchAudio(sentence).then((url) => {
      const audio = playAudio(url);
      if (!audio) {
        // No audio available (offline/failed fetch) — don't leave the
        // question locked forever waiting for a narration that will
        // never finish.
        setNarrationDone(true);
        return;
      }
      audioRef.current = audio;

      const totalChars = words.reduce((s, w) => s + w.length, 0) || 1;
      let cumulative = 0;
      const boundaries = words.map((w) => {
        cumulative += w.length;
        return cumulative / totalChars;
      });

      const onTimeUpdate = () => {
        if (!audio.duration) return;
        const frac = audio.currentTime / audio.duration;
        const idx = boundaries.findIndex((b) => frac <= b);
        setHighlightedIndex(idx === -1 ? words.length - 1 : idx);
      };
      const onEnded = () => {
        setHighlightedIndex(-1);
        setNarrationDone(true);
      };
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
    });
  }

  useEffect(() => {
    if (enabled) play();
    else { setNarrationDone(false); setHighlightedIndex(-1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, enabled]);

  return { highlightedIndex, narrationDone, replay: play };
}
