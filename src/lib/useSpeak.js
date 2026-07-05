import { useCallback } from 'react';
import { fetchAudio, playAudio, stopCurrentAudio } from '../games/gameAudio';

// Audio-first accessibility wrapper (every interactive element speaks on
// tap — master prompt "Audio" rule).
//
// Bug 1 fix (audio consolidation): this used to fall back to the browser's
// own Web Speech API (`speechSynthesis`) for any text with no pre-resolved
// `audioUrl` — which was every UI/navigation label (BottomNav's "Home"/
// "Play"/"Galaxy"/"Grown-ups", QuestPathNode's activity names, StoryReader's
// "Let's read first!" nudge), none of which are curriculum words with a
// stored `audio_url`. That's the exact "gameplay uses one voice, UI/nav
// uses a different one" bug: gameplay audio already goes through the
// ElevenLabs voice via gameAudio.js's fetchAudio/playAudio, but every one
// of these UI call sites was silently landing on the browser's native
// synthesis voice instead. Fixed by routing arbitrary text through the
// exact same fetchAudio/playAudio pipeline (api/speak.mjs's TTS proxy
// caches by a hash of the text itself, not by word — it was already
// generic, this hook just wasn't using it for anything without a
// pre-known audioUrl). `audioUrl` (from useWordSpeak's word -> audio_url
// lookup) is still honored directly when already known, to skip a
// redundant fetch — same voice either way, just a shortcut. Both paths
// now go through gameAudio.js's playAudio, which enforces the single-clip
// singleton, so UI speech and gameplay speech can never overlap.
//
// No speechSynthesis fallback is kept even for ElevenLabs failures —
// fetchAudio's own `.catch(() => null)` already degrades to "no audio"
// silently (matching how every other TTS call site in this app already
// behaves on a failed fetch, e.g. GameEngine's carrier-sentence prompts),
// rather than surfacing a second, different-sounding voice as a fallback.
export function useSpeak() {
  const speak = useCallback((text, { audioUrl } = {}) => {
    if (!text) return;

    if (audioUrl) {
      playAudio(audioUrl);
      return;
    }

    fetchAudio(text).then((url) => { if (url) playAudio(url); });
  }, []);

  const stop = useCallback(() => {
    stopCurrentAudio();
  }, []);

  return { speak, stop };
}
