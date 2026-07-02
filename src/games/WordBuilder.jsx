import { useEffect, useState } from 'react';
import { T } from './gameTheme';
import { playAudio, fetchAudio } from './gameAudio';

const SUFFIXES = ['', 'ing', 'ed'];

// Deterministic per-word variant pick (not random-during-render — see the
// same purity concern documented in GrownUpsScreen's MathGate) — derived
// from the word's char codes so the same word always gets the same
// variant within a session, no state/effect needed.
function pickVariant(word) {
  const sum = [...word].reduce((s, c) => s + c.charCodeAt(0), 0);
  return SUFFIXES[sum % SUFFIXES.length];
}

function targetSpelling(word, suffix) {
  if (!suffix) return word;
  if (suffix === 'ing') return word.endsWith('e') ? word.slice(0, -1) + 'ing' : word + 'ing';
  if (suffix === 'ed') return word.endsWith('e') ? word + 'd' : word + 'ed';
  return word;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(((i + 1) * 9301 + 49297) % 233280 / 233280 * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Word Builder — morphology activity (MLC "Word Builder" per the
// blueprint's 10-activity table). Drag/tap letter tiles to spell the
// target word, sometimes with a +ing/+ed variant.
export default function WordBuilder({ quiz, onAnswer }) {
  const suffix = pickVariant(quiz.word);
  const target = targetSpelling(quiz.word, suffix);
  const [tiles] = useState(() => shuffle(target.split('')));
  const [built, setBuilt] = useState([]);
  const [wrong, setWrong] = useState(false);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    fetchAudio(quiz.word).then(playAudio);
  }, [quiz.word]);

  function tapLetter(idx) {
    if (built.includes(idx)) return;
    const nextBuilt = [...built, idx];
    const attempted = nextBuilt.map((i) => tiles[i]).join('');
    const expectedSoFar = target.slice(0, attempted.length);
    if (attempted !== expectedSoFar) {
      setWrong(true);
      setTimeout(() => setWrong(false), 400);
      return;
    }
    setBuilt(nextBuilt);
    if (nextBuilt.length === target.length) {
      setTimeout(() => onAnswer({ correct: true, responseTimeMs: Date.now() - startTime, firstTry: true }), 700);
    }
  }

  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{quiz.emoji}</div>
      <div style={{ fontFamily: 'Atkinson Hyperlegible', color: T.muted, marginBottom: '1.5rem' }}>
        Build the word{suffix ? ` (add "${suffix}")` : ''}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '2rem', flexWrap: 'wrap',
        animation: wrong ? 'mw-shake 0.4s ease' : 'none',
      }}>
        {target.split('').map((_, i) => (
          <div key={i} style={{
            width: 44, height: 54, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i < built.length ? T.correct : T.card, border: `2px solid ${T.border}`,
            fontFamily: 'Space Grotesk', fontSize: '1.5rem', fontWeight: 700, color: T.white, textTransform: 'uppercase',
          }}>
            {i < built.length ? tiles[built[i]] : ''}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {tiles.map((letter, i) => (
          <button
            key={i}
            onClick={() => tapLetter(i)}
            disabled={built.includes(i)}
            style={{
              width: 52, height: 52, borderRadius: 14, border: 'none', cursor: built.includes(i) ? 'default' : 'pointer',
              background: built.includes(i) ? T.cardHov : T.gold, color: '#1A0A00',
              fontFamily: 'Space Grotesk', fontSize: '1.3rem', fontWeight: 700, textTransform: 'uppercase',
              opacity: built.includes(i) ? 0.35 : 1,
            }}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
