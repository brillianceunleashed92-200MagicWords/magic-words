import { useEffect, useState } from 'react';
import { T } from './gameTheme';
import { playAudio, fetchAudio } from './gameAudio';
import NovaMascot from '../design-system/primitives/NovaMascot';

const PLAY_DURATION_MS = 4500;

// Magic Video — placeholder player shell (blueprint: "real videos are
// Phase 3 content work — build the player shell"). Uses the existing
// Nova mascot art + word audio to give the *shape* of the activity (a
// video card the child taps to "watch") without real produced video
// content, which doesn't exist yet.
export default function MagicVideo({ quiz, onAnswer }) {
  const [playing, setPlaying] = useState(false);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!playing) return;
    fetchAudio(quiz.word).then(playAudio);
    const t = setTimeout(() => {
      onAnswer({ correct: true, responseTimeMs: Date.now() - startTime, firstTry: true });
    }, PLAY_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, marginBottom: '1rem' }}>
        Magic Video: {quiz.word} {quiz.emoji}
      </div>
      <div
        onClick={() => setPlaying(true)}
        style={{
          maxWidth: 320, margin: '0 auto', aspectRatio: '16/10', borderRadius: 24,
          background: `linear-gradient(135deg, ${T.purple}22, ${T.teal}22)`,
          border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: playing ? 'default' : 'pointer', position: 'relative', overflow: 'hidden',
        }}
      >
        <NovaMascot novaState={playing ? 'correct' : 'idle'} size={72} />
        {!playing && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
            }}>
              ▶
            </div>
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, marginTop: '1rem', fontSize: '0.8rem' }}>
        {playing ? 'Playing…' : 'Tap to watch!'}
      </div>
    </div>
  );
}
