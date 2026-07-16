// StarCheckWarmup — The Star Check's warm-up sequencing gate (mockup O):
// the child taps tray letters to fill 2 slots in the SAME order as the
// sample, left to right. Doubles as the tap tutorial. Scored silently —
// never shown to the child.
//
// [PROPOSED — flag for Dr. Blank's ratification like everything else in
// this feature]: the mockup's own reference implementation has no
// correctness check at all (any tray tap fills the next slot, in
// whatever order); neither the mockup nor DESIGN_BRIEF_V2.md defines what
// "struggle" concretely means here. This uses the same two-miss threshold
// as the level-floor rule elsewhere in the bank, for internal consistency
// — a wrong-order tap doesn't fill a slot (no visible penalty, matching
// the errorless/no-red rule) but does count toward that threshold.
import { useState } from 'react';
import { colors, fonts, shadows } from '../../theme/tokens';
import { NovaPorthole } from '../../games/lessonChrome';

const SAMPLE = ['c', 'a'];
const TRAY = ['a', 'c', 'o', 't'];

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function StarCheckWarmup({ onDone }) {
  const [tray] = useState(() => shuffled(TRAY));
  const [filled, setFilled] = useState(0);
  const [usedIdx, setUsedIdx] = useState([]);
  const [misses, setMisses] = useState(0);

  function tap(idx, letter) {
    if (usedIdx.includes(idx) || filled >= SAMPLE.length) return;
    if (letter === SAMPLE[filled]) {
      const nextFilled = filled + 1;
      setUsedIdx((u) => [...u, idx]);
      setFilled(nextFilled);
      if (nextFilled >= SAMPLE.length) setTimeout(() => onDone(misses >= 2), 550);
    } else {
      // A wrong tap must NOT disable its tile -- each tray letter appears
      // only once, so permanently consuming it on a miss could soft-lock
      // the child out of ever completing the correct sequence (found via
      // a live walkthrough: a wrong tap on the tray's only "a" left no
      // way to ever fill the second slot). Only a tile that successfully
      // fills a slot gets marked used.
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      if (nextMisses >= 2) setTimeout(() => onDone(true), 550);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', marginBottom: 10 }}>
        Warm-up · watch, then copy
      </div>
      <NovaPorthole novaState="idle" message="Copy me — same order, left to right!" />

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
        {SAMPLE.map((letter, i) => (
          <div key={i} style={{
            width: 70, height: 70, borderRadius: 20, background: colors.cloud, color: colors.ink,
            fontFamily: fonts.display, fontWeight: 800, fontSize: '2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadows.chunkSm,
          }}>
            {letter}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', minHeight: 78, marginBottom: 18 }}>
        {SAMPLE.map((_, i) => (
          <div key={i} style={{
            width: 70, height: 70, borderRadius: 20,
            background: i < filled ? colors.cloud : 'rgba(255,255,255,.12)',
            border: i < filled ? 'none' : '3px dashed rgba(255,255,255,.4)',
            color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: i < filled ? shadows.chunkSm : 'none',
          }}>
            {i < filled ? SAMPLE[i] : ''}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {tray.map((letter, idx) => (
          <button
            key={idx}
            onClick={() => tap(idx, letter)}
            disabled={usedIdx.includes(idx)}
            aria-label={`Tap ${letter}`}
            style={{
              width: 70, height: 70, borderRadius: 20, background: colors.cloud, color: colors.ink,
              fontFamily: fonts.display, fontWeight: 800, fontSize: '2rem', border: 'none',
              cursor: usedIdx.includes(idx) ? 'default' : 'pointer',
              opacity: usedIdx.includes(idx) ? 0.18 : 1,
              boxShadow: shadows.chunkSm,
            }}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
