import { useEffect, useRef, useState } from 'react';
import { fetchAudio, playAudio } from '../../games/gameAudio';

// Read-along narration for one sentence at a time: fetches + plays the
// FULL sentence as one TTS clip (through the shared audio singleton, so
// it never overlaps other sound), then estimates which word is currently
// being spoken from playback progress, since ElevenLabs doesn't return
// real per-word timestamps. Not frame-perfect, but tuned to track ahead
// of drift rather than behind it (see LAG FIX notes below) — a reasonable
// approximation used by many read-along apps, and it keeps narration to
// one natural-sounding clip per sentence rather than choppy word-by-word
// chaining with gaps.
//
// LAG FIX (audio-consolidation Bug 3): two compounding issues in the
// original version caused the highlight to visibly fall behind the voice
// by the end of a sentence:
//   1. Timing was driven by the <audio> element's own `timeupdate` event,
//      which browsers throttle to roughly every ~250ms — up to a quarter
//      second of staleness at any given instant. Replaced with a
//      requestAnimationFrame loop, polling `audio.currentTime` every
//      frame (~16ms) instead.
//   2. Word boundaries were purely proportional to character count. Real
//      speech doesn't work that way — short (often function) words are
//      spoken faster per character than long ones, so pure character-
//      proportional timing systematically over-allocates time to longer
//      words. Across a whole sentence this compounds: by the last word,
//      the estimated boundary trails further and further behind where
//      the voice actually is — which reads exactly as "the highlight
//      lags." Fixed with a base-plus-length weight per word (a fixed
//      per-word floor for the minimum time it takes to articulate any
//      word at all, plus a smaller per-character increment) instead of
//      pure character count, which much more closely tracks how these
//      sentences are actually spoken.
// A small fixed lead (LEAD_MS) is also subtracted from the playback
// position before comparing against boundaries, so any small remaining
// error biases toward the highlight advancing slightly early rather than
// late — matching "must not lag" rather than "must be frame-perfect."
const WORD_BASE_WEIGHT = 3; // baseline articulation overhead, in "characters"
const LEAD_MS = 120;

// Returns { highlightedIndex, narrationDone, replay }. `sentence` is the
// current page's text; pass a new one to start narrating it (auto-plays
// on mount/change). `enabled` lets the caller gate autoplay (e.g. off
// while showing the cover page).
export function useKaraokeNarration(sentence, enabled = true) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [narrationDone, setNarrationDone] = useState(false);
  const words = (sentence ?? '').split(' ').filter(Boolean);
  // Unlike the old timeupdate-event approach (which naturally stops firing
  // once its audio element is paused), requestAnimationFrame keeps polling
  // forever until explicitly cancelled — a replay (or an unrelated
  // sentence change) starting a NEW play() call must invalidate any prior
  // still-running rAF loop, or two loops would fight over the same
  // highlightedIndex state. A ref-held generation counter, bumped at the
  // start of every play() call, lets each loop iteration cheaply check
  // "am I still the current one" without needing cleanup timing to be exact.
  const generationRef = useRef(0);

  function play() {
    if (!sentence) return;
    const myGeneration = ++generationRef.current;
    setNarrationDone(false);
    setHighlightedIndex(-1);
    fetchAudio(sentence).then((url) => {
      if (myGeneration !== generationRef.current) return; // superseded while fetching
      const audio = playAudio(url);
      if (!audio) {
        // No audio available (offline/failed fetch) — don't leave the
        // question locked forever waiting for a narration that will
        // never finish.
        setNarrationDone(true);
        return;
      }

      const weights = words.map((w) => WORD_BASE_WEIGHT + w.length);
      const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;
      let cumulative = 0;
      const boundaries = weights.map((w) => {
        cumulative += w;
        return cumulative / totalWeight;
      });

      function tick() {
        if (myGeneration !== generationRef.current) return; // cancelled
        if (audio.duration) {
          const leadSeconds = LEAD_MS / 1000;
          const frac = Math.min(1, (audio.currentTime + leadSeconds) / audio.duration);
          const idx = boundaries.findIndex((b) => frac <= b);
          setHighlightedIndex(idx === -1 ? words.length - 1 : idx);
        }
        requestAnimationFrame(tick);
      }

      const onEnded = () => {
        if (myGeneration !== generationRef.current) return;
        setHighlightedIndex(-1);
        setNarrationDone(true);
      };
      audio.addEventListener('ended', onEnded);
      requestAnimationFrame(tick);
    });
  }

  useEffect(() => {
    if (enabled) play();
    else { setNarrationDone(false); setHighlightedIndex(-1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, enabled]);

  // Invalidate any in-flight rAF loop on unmount — otherwise it keeps
  // polling and calling setState on an unmounted component forever (rAF
  // isn't tied to the audio element's own lifecycle the way the old
  // timeupdate listener was).
  useEffect(() => () => { generationRef.current += 1; }, []);

  return { highlightedIndex, narrationDone, replay: play };
}
