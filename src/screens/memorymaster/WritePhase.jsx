import { useState } from 'react';
import { colors, fonts, radii, shadows, touchTarget } from './mmTokens';
import Keyboard from './Keyboard';

// MEMORY_MASTER_R1 Phase 4 -- write phase (R5-R7, handoff §5-6). Segment
// shown -> child re-reads it -> "Got it, hide it" -> types it -> submits.
// Earlier segments stay visible in the child's own answer area (as on
// paper); the model text never comes back once hidden. No hint button by
// design -- the only sanctioned help is tap-a-word-to-hear in the read
// phase and copy mode at try 3 (see MemoryMasterDevRoute's orchestration).
// isCopyMode renders the sentence visible throughout (R8) instead of the
// reveal/hide cycle. `revealed` intentionally resets via the `key` prop
// MemoryMasterDevRoute passes (keyed on segIdx+attempt) forcing a fresh
// mount per segment/attempt, rather than an effect calling setState on
// mount (avoids the cascading-render anti-pattern).
export default function WritePhase({ portion, portionState, level, sessionNum, portionNum, typed, setTyped, shift, setShift, onSubmit, mode, speak, isCopyMode = false }) {
  const [revealed, setRevealed] = useState(true);

  const seg = portion.segments[portionState.segIdx];
  const doneText = portionState.doneSegs.join(' ');

  const onKey = (ch) => setTyped((t) => t + ch);
  const onBackspace = () => setTyped((t) => t.slice(0, -1));
  const onToggleShift = () => setShift((s) => !s);

  const submit = () => {
    onSubmit(typed);
    setShift(false);
  };

  if (isCopyMode) {
    return (
      <div>
        <NovaCopyBubble />
        <SegmentPlate text={portion.display} />
        <AnswerArea doneText="" current={typed} />
        <Keyboard shift={shift} onToggleShift={onToggleShift} onKey={onKey} onBackspace={onBackspace} onDone={submit} doneLabel="Done" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.13em', textTransform: 'uppercase', color: colors.mutedInkLight, marginBottom: 6 }}>
        Level {level} &middot; session {sessionNum} &middot; sentence {portionNum} of 2
      </div>
      <div style={{ textAlign: 'center', fontFamily: fonts.display, fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: colors.mutedInkLight, marginBottom: 8 }}>
        {portion.segments.length > 1 ? `Part ${portionState.segIdx + 1} of ${portion.segments.length} of your sentence` : 'Your whole sentence'}
      </div>

      {revealed ? (
        <>
          <SegmentPlate text={seg} />
          <button
            type="button"
            onClick={() => {
              setRevealed(false);
              if (mode === 'solo') speak(seg);
            }}
            style={{
              width: '100%', minHeight: touchTarget, background: colors.mint, color: colors.ink, fontFamily: fonts.display,
              fontWeight: 800, fontSize: '1.05rem', border: 'none', borderRadius: radii.md, boxShadow: shadows.chunkSm, cursor: 'pointer', marginBottom: 12,
            }}
          >
            Got it - hide it
          </button>
        </>
      ) : (
        <>
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '.82rem', color: colors.mutedInkLight, marginBottom: 12, letterSpacing: '.04em' }}>
            Now write it exactly
          </div>
          <AnswerArea doneText={doneText} current={typed} />
          <Keyboard shift={shift} onToggleShift={onToggleShift} onKey={onKey} onBackspace={onBackspace} onDone={submit} doneLabel="Done" />
        </>
      )}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '.78rem', color: colors.mutedInkLight, margin: '10px 0 0', letterSpacing: '.05em' }}>
        Try {portionState.attempt}
      </div>
    </div>
  );
}

function SegmentPlate({ text }) {
  return (
    <div style={{ background: colors.sun, color: colors.ink, borderRadius: 18, padding: '20px 16px', textAlign: 'center', fontFamily: fonts.display, fontWeight: 800, fontSize: '1.35rem', boxShadow: shadows.chunkSm, marginBottom: 14, lineHeight: 1.4 }}>
      {text}
    </div>
  );
}

function AnswerArea({ doneText, current }) {
  return (
    <div style={{ background: colors.paper, color: colors.ink, borderRadius: 18, padding: 16, minHeight: 96, boxShadow: 'inset 0 2px 6px rgba(0,0,0,.08)', marginBottom: 12, fontFamily: fonts.display, fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.6, textAlign: 'left', wordBreak: 'break-word' }}>
      {doneText && <span style={{ color: colors.muted }}>{doneText} </span>}
      <span style={{ borderBottom: `3px solid ${colors.sky}`, paddingBottom: 2 }}>{current}</span>
    </div>
  );
}

function NovaCopyBubble() {
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '.92rem', color: colors.ink, marginBottom: 14 }}>
      Let&rsquo;s copy it together first. It stays right there.
    </div>
  );
}
