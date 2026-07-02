import { useEffect, useRef, useState } from 'react';
import { T } from './gameTheme';

const CHANT_DURATION_MS = 20000;

// Word Song — auditory-memory activity (MLC 10-activity table). v1 is a
// Web Speech "chant" placeholder (repeats the word with varying
// pitch/rate for a sing-song feel) — structured so a real recorded song
// clip can replace the synthesis call later without touching onAnswer's
// contract or this component's call site in GameEngine.
export default function WordSong({ quiz, onAnswer }) {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(() => Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      finish();
      return;
    }
    let cancelled = false;
    const pitches = [1, 1.3, 0.9, 1.2];
    let i = 0;

    function chant() {
      if (cancelled) return;
      const utter = new SpeechSynthesisUtterance(quiz.word);
      utter.pitch = pitches[i % pitches.length];
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
      i++;
    }

    chant();
    const chantInterval = setInterval(chant, 1400);
    const startedAt = Date.now();
    const progressInterval = setInterval(() => {
      const pct = Math.min(1, (Date.now() - startedAt) / CHANT_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) finish();
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(chantInterval);
      clearInterval(progressInterval);
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.word]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onAnswer({ correct: true, responseTimeMs: Date.now() - startTime, firstTry: true });
  }

  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '0.5rem', animation: 'mw-pop 0.5s ease' }}>🎵</div>
      <div style={{ fontFamily: 'Space Grotesk', fontSize: '2.5rem', color: T.white, marginBottom: '1rem' }}>
        {quiz.word} {quiz.emoji}
      </div>
      <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, marginBottom: '1.5rem' }}>
        Sing along with Nova!
      </div>
      <div style={{ width: '100%', maxWidth: 280, margin: '0 auto', height: 10, borderRadius: 100, background: T.card, overflow: 'hidden' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: T.purple, transition: 'width 0.2s linear' }} />
      </div>
      <button onClick={finish} style={{
        marginTop: '1.5rem', padding: '0.6rem 1.25rem', borderRadius: 100, border: 'none',
        background: 'transparent', color: T.muted, fontFamily: 'Atkinson Hyperlegible', cursor: 'pointer',
      }}>
        Skip
      </button>
    </div>
  );
}
