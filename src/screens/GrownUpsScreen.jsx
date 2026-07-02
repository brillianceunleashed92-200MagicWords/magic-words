import { useEffect, useRef, useState } from 'react';
import { colors, fonts, shadows } from '../theme/tokens';
import { useUIStore } from '../stores/useUIStore';
import { useCandyGalaxyData } from '../lib/useCandyGalaxyData';

const HOLD_MS = 3000;
const TIME_LIMIT_OPTIONS = [null, 10, 15, 20, 30];

function HoldGate({ onPassed }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(0);

  function startHold() {
    setHolding(true);
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min(1, elapsed / HOLD_MS));
      if (elapsed >= HOLD_MS) { onPassed(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function cancelHold() {
    setHolding(false);
    setProgress(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }

  return (
    <div style={{ textAlign: 'center', color: colors.cloud, fontFamily: fonts.body }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🧑‍🤝‍🧑</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', marginBottom: 6 }}>Grown-Ups Only</div>
      <div style={{ opacity: 0.85, marginBottom: 24 }}>Press and hold the star for 3 seconds</div>
      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        style={{
          width: 120, height: 120, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `conic-gradient(${colors.sun} ${progress * 360}deg, rgba(255,255,255,.2) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
          boxShadow: shadows.chunk, transition: holding ? 'none' : 'background .2s',
        }}
      >
        ⭐
      </button>
    </div>
  );
}

function buildQuestion() {
  const a = 1 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 8);
  const correct = a + b;
  const set = new Set([correct]);
  while (set.size < 4) set.add(Math.max(1, correct + Math.floor(Math.random() * 7) - 3));
  return { a, b, correct, choices: [...set].sort(() => Math.random() - 0.5) };
}

function MathGate({ onPassed }) {
  // Randomization is impure, so it's generated once in an effect (a mount
  // side-effect) rather than during render — an empty-choices first paint
  // is fine here since the gate itself is already the first thing shown.
  const [question, setQuestion] = useState(null);
  const [wrong, setWrong] = useState(false);

  useEffect(() => { setQuestion(buildQuestion()); }, []);

  if (!question) return null;
  const { a, b, correct, choices } = question;

  return (
    <div style={{ textAlign: 'center', color: colors.cloud, fontFamily: fonts.body }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', marginBottom: 16 }}>
        Quick check: what's {a} + {b}?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 260, margin: '0 auto' }}>
        {choices.map((c) => (
          <button
            key={c}
            onClick={() => (c === correct ? onPassed() : setWrong(true))}
            style={{
              minHeight: 64, borderRadius: 20, border: 'none', cursor: 'pointer',
              background: colors.cloud, color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem',
              boxShadow: shadows.chunkSm,
            }}
          >
            {c}
          </button>
        ))}
      </div>
      {wrong && <div style={{ marginTop: 12, opacity: 0.8 }}>Not quite — try again!</div>}
    </div>
  );
}

function MasteryHeatmap({ words }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))', gap: 4 }}>
      {words.map((w) => {
        const bucket = w.mastery >= 80 ? colors.mint : w.mastery >= 40 ? colors.sun : w.mastery > 0 ? colors.tang : 'rgba(0,0,0,.08)';
        return (
          <div
            key={w.word}
            title={`${w.word} — ${w.mastery}%`}
            style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: bucket }}
          />
        );
      })}
    </div>
  );
}

export default function GrownUpsScreen() {
  const grownUpsUnlocked = useUIStore((s) => s.grownUpsUnlocked);
  const unlockGrownUps = useUIStore((s) => s.unlockGrownUps);
  const lockGrownUps = useUIStore((s) => s.lockGrownUps);
  const sessionTimeLimitMinutes = useUIStore((s) => s.sessionTimeLimitMinutes);
  const setSessionTimeLimitMinutes = useUIStore((s) => s.setSessionTimeLimitMinutes);
  const [holdPassed, setHoldPassed] = useState(false);
  const { words, masteredCount } = useCandyGalaxyData();

  if (!grownUpsUnlocked) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.sky}, ${colors.skyNight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {holdPassed ? <MathGate onPassed={unlockGrownUps} /> : <HoldGate onPassed={() => setHoldPassed(true)} />}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.cloud, paddingBottom: 140 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '52px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.ink }}>Grown-Ups</div>
          <button onClick={lockGrownUps} style={{ background: 'none', border: 'none', color: colors.mutedInk, fontFamily: fonts.body, fontWeight: 700, cursor: 'pointer' }}>
            Lock 🔒
          </button>
        </div>

        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, marginBottom: 8 }}>
          Mastery Map — {masteredCount}/{words.length} words
        </div>
        <MasteryHeatmap words={words} />

        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.1rem', color: colors.ink, margin: '28px 0 8px' }}>
          Session Time Limit
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_LIMIT_OPTIONS.map((mins) => (
            <button
              key={mins ?? 'none'}
              onClick={() => setSessionTimeLimitMinutes(mins)}
              style={{
                padding: '10px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
                fontFamily: fonts.display, fontWeight: 700,
                background: sessionTimeLimitMinutes === mins ? colors.sky : 'rgba(0,0,0,.06)',
                color: sessionTimeLimitMinutes === mins ? '#fff' : colors.ink,
              }}
            >
              {mins ? `${mins} min` : 'No limit'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
