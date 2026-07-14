import { colors, fonts, shadows } from './mmTokens';
import Keyboard from './Keyboard';
import NovaBubble from './NovaBubble';
import { SpeakerIcon } from './icons';

// MEMORY_MASTER_R1 Phase 4 -- handoff §8's dictation Skills Assessment
// (R2/T9/T12). The sentence is spoken and never shown; no guidance, no
// feedback, no scores to the child during the test -- her canonical
// deflection is "I'll show you that later" (not rendered here since this
// is the fallback path only, taken when there is no reading-level auto-
// placement).
export default function SkillsAssessment({ assessLevels, levelIdx, sentenceIdx, typed, setTyped, shift, setShift, onSubmit, speak }) {
  const level = assessLevels[levelIdx];
  const sentence = level.sentences[sentenceIdx];

  const onKey = (ch) => setTyped((t) => t + ch);
  const onBackspace = () => setTyped((t) => t.slice(0, -1));
  const onToggleShift = () => setShift((s) => !s);
  const submit = () => {
    onSubmit(typed);
    setShift(false);
  };

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.13em', textTransform: 'uppercase', color: colors.mutedInkLight, marginBottom: 14 }}>
        Skills check &middot; level {level.level} &middot; sentence {sentenceIdx + 1} of {level.sentences.length}
      </div>
      <NovaBubble text="Listen, then write what you hear." />
      <div style={{ background: colors.skyNight, borderRadius: 18, padding: 20, textAlign: 'center', marginBottom: 14, boxShadow: shadows.chunkSm }}>
        <button
          type="button"
          onClick={() => speak(sentence.text)}
          aria-label="Hear it again"
          style={{ width: 74, height: 74, borderRadius: '50%', background: colors.cloud, color: colors.ink, border: 'none', cursor: 'pointer', boxShadow: shadows.chunkSm, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <SpeakerIcon />
        </button>
        <div style={{ display: 'block', marginTop: 8, fontFamily: fonts.display, fontWeight: 800, fontSize: '.72rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)' }}>
          Hear it again
        </div>
      </div>
      <div style={{ background: colors.paper, color: colors.ink, borderRadius: 18, padding: 16, minHeight: 80, boxShadow: 'inset 0 2px 6px rgba(0,0,0,.08)', marginBottom: 12, fontFamily: fonts.display, fontWeight: 700, fontSize: '1.2rem' }}>
        {typed}
      </div>
      <Keyboard shift={shift} onToggleShift={onToggleShift} onKey={onKey} onBackspace={onBackspace} onDone={submit} doneLabel="Done" />
    </div>
  );
}
