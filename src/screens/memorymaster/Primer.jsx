import { useEffect, useState } from 'react';
import { colors, fonts, radii, shadows, touchTarget } from './mmTokens';
import NovaBubble from './NovaBubble';

// MEMORY_MASTER_R1 Phase 4 -- the once-stated instruction, taught properly
// (fidelity rule 6): "You have to write not only the words but the capitals
// and punctuation as well" is given ONCE, here, before the first trial --
// and never re-prompted on an error. Measured from the real corpus: across
// all 150 portions there are zero mid-sentence capitals and no proper
// nouns, so the child only ever needs one rule (first word gets the big
// letter) plus the five marks the keyboard exposes.
const STEPS = [
  {
    plate: 'the kid is not a girl.',
    bub: 'Every sentence starts with a BIG letter. This one forgot!',
    btn: 'Give it a big letter',
    fix: 'The kid is not a girl.',
  },
  {
    plate: 'The kid is not a girl',
    bub: 'And every sentence ends with a mark. This one is missing it!',
    btn: 'Put the mark at the end',
    fix: 'The kid is not a girl.',
  },
  {
    plate: 'The kid is not a girl.',
    bub: 'That is it. Big letter at the front, mark at the end. Ready?',
    btn: "I'm ready",
    fix: null,
  },
];

export default function Primer({ onDone, speak }) {
  const [step, setStep] = useState(0);
  const [fixed, setFixed] = useState(false);
  const st = STEPS[step];

  useEffect(() => {
    speak(st.bub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const advance = () => {
    if (st.fix && !fixed) {
      setFixed(true);
      speak(st.fix);
      setTimeout(() => {
        if (step + 1 >= STEPS.length) {
          onDone();
          return;
        }
        setStep((s) => s + 1);
        setFixed(false);
      }, 800);
      return;
    }
    if (step + 1 >= STEPS.length) {
      onDone();
      return;
    }
    setStep((s) => s + 1);
    setFixed(false);
  };

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.13em', textTransform: 'uppercase', color: colors.mutedInkLight, marginBottom: 14 }}>
        Before we start &middot; how writing works
      </div>
      <NovaBubble text={st.bub} />
      <div style={{ background: colors.cloud, color: colors.ink, borderRadius: 22, padding: '26px 20px', boxShadow: shadows.chunk, fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.5, textAlign: 'center', marginBottom: 16 }}>
        {fixed ? st.fix : st.plate}
      </div>
      <button
        type="button"
        onClick={advance}
        style={{ width: '100%', minHeight: touchTarget, background: colors.sun, color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '1.05rem', border: 'none', borderRadius: radii.md, boxShadow: shadows.chunkSm, cursor: 'pointer' }}
      >
        {st.btn}
      </button>
    </div>
  );
}
