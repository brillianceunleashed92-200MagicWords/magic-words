import { useEffect } from 'react';
import { colors, fonts, radii, shadows, touchTarget } from './mmTokens';
import NovaBubble from './NovaBubble';

// MEMORY_MASTER_R1 Phase 4 -- read phase (R3-R4, handoff §5). Errorless
// reading precedes writing (fidelity 8): the child reads the portion aloud
// correctly before the write phase begins. Coach mode = an adult taps "Read
// it perfectly"; Solo mode [PROPOSED - OQ2] = the app speaks the sentence
// and the child echoes, with tap-any-word-to-hear support. Whole-word/
// whole-sentence audio only -- never per-letter (anti-phonics rule).
export default function ReadPhase({ portion, mode, level, sessionNum, portionNum, onReadOk, speak }) {
  useEffect(() => {
    if (mode === 'solo') speak(portion.display);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portion.display, mode]);

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.13em', textTransform: 'uppercase', color: colors.mutedInkLight, marginBottom: 14 }}>
        Level {level} &middot; session {sessionNum} of 15 &middot; sentence {portionNum} of 2
      </div>
      <NovaBubble text={mode === 'coach' ? 'Read it out loud to your grown-up.' : 'Read it out loud. Tap any word to hear it.'} />
      <div
        style={{
          background: colors.cloud,
          color: colors.ink,
          borderRadius: 22,
          padding: '26px 20px',
          boxShadow: shadows.chunk,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: '1.5rem',
          lineHeight: 1.5,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {portion.display.split(' ').map((w, i) => (
          <span
            key={i}
            onClick={() => speak(w.replace(/[^A-Za-z']/g, ''))}
            style={{ display: 'inline-block', padding: '1px 3px', borderRadius: 6, cursor: 'pointer' }}
          >
            {w}{' '}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onReadOk}
        style={{
          width: '100%',
          minHeight: touchTarget,
          background: colors.mint,
          color: colors.ink,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: '1.05rem',
          border: 'none',
          borderRadius: radii.md,
          boxShadow: shadows.chunkSm,
          cursor: 'pointer',
        }}
      >
        {mode === 'coach' ? 'Read it perfectly' : "I read it!"}
      </button>
    </div>
  );
}
