import { useEffect, useRef, useState } from 'react';
import { colors, fonts, shadows } from '../theme/tokens';
import { useUIStore } from '../stores/useUIStore';
import DashboardTab from './parent/DashboardTab';
import MomentsTab from './parent/MomentsTab';
import MasteryMapTab from './parent/MasteryMapTab';
import SettingsTab from './parent/SettingsTab';
import { IconGrownUps, IconStar, IconLock } from '../components/icons';

// Prompt 7 Part 3: shortened from 3000ms — still a real, deliberate child
// gate (a young child won't hold a button still for ~2s by accident),
// just not so long it reads as broken/unresponsive to a grown-up in a
// hurry. Measures wall-clock elapsed time per tick (Date.now(), not a
// frame-count assumption), so it already tolerates rAF throttling in a
// backgrounded/unfocused tab correctly — a slower tick rate just means
// fewer progress-bar updates before it still crosses HOLD_MS on time.
const HOLD_MS = 1800;

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
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><IconGrownUps size={40} color={colors.cloud} /></div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.3rem', marginBottom: 6 }}>Grown-Ups Only</div>
      <div style={{ opacity: 0.85, marginBottom: 24 }}>Press and hold the star for 2 seconds</div>
      <button
        aria-label="Hold to unlock"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        style={{
          width: 120, height: 120, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: `conic-gradient(${colors.sun} ${progress * 360}deg, rgba(255,255,255,.2) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: shadows.chunk, transition: holding ? 'none' : 'background .2s',
        }}
      >
        <IconStar size={44} color={colors.starText} />
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

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Component: DashboardTab },
  { id: 'moments', label: 'Moments', Component: MomentsTab },
  { id: 'mastery', label: 'Mastery Map', Component: MasteryMapTab },
  { id: 'settings', label: 'Settings', Component: SettingsTab },
];

// Full Parent Portal (blueprint Part 4), behind the existing hold+math
// gate. Calm design per 7.2 — same brand family, lower saturation, more
// whitespace than the child app (still Cloud/Ink tokens, no candy-bright
// fills here).
export default function GrownUpsScreen() {
  const grownUpsUnlocked = useUIStore((s) => s.grownUpsUnlocked);
  const unlockGrownUps = useUIStore((s) => s.unlockGrownUps);
  const lockGrownUps = useUIStore((s) => s.lockGrownUps);
  const [holdPassed, setHoldPassed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!grownUpsUnlocked) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.sky}, ${colors.skyNight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {holdPassed ? <MathGate onPassed={unlockGrownUps} /> : <HoldGate onPassed={() => setHoldPassed(true)} />}
      </div>
    );
  }

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.Component ?? DashboardTab;

  return (
    <div style={{ minHeight: '100vh', background: colors.cloud, paddingBottom: 140 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '52px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', color: colors.ink }}>Grown-Ups</div>
          <button onClick={lockGrownUps} style={{ background: 'none', border: 'none', color: colors.mutedInk, fontFamily: fonts.body, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Lock <IconLock size={14} color={colors.mutedInk} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', flexShrink: 0,
                fontFamily: fonts.display, fontWeight: 700, fontSize: '.8rem',
                background: activeTab === tab.id ? colors.ink : 'rgba(0,0,0,.05)',
                color: activeTab === tab.id ? colors.cloud : colors.mutedInk,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ActiveComponent />
      </div>
    </div>
  );
}
