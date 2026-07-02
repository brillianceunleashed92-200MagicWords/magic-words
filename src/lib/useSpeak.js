import { useCallback, useRef } from 'react';

// Audio-first accessibility wrapper (every interactive element speaks on
// tap — master prompt "Audio" rule). v1 uses the Web Speech API. The
// `audioUrl` param is the swap point for Phase 2: once `words.audio_url`
// is populated with ElevenLabs-generated MP3s, pass it through and this
// hook plays that file instead of synthesizing — call sites never change,
// only this hook's internals do.
export function useSpeak() {
  const audioRef = useRef(null);

  const speak = useCallback((text, { audioUrl, rate = 0.95, pitch = 1.1 } = {}) => {
    if (!text) return;

    if (audioUrl) {
      audioRef.current?.pause();
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch(() => {});
      return;
    }

    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}
