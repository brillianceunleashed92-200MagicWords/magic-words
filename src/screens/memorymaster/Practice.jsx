import { useEffect, useState } from 'react';
import { colors, fonts, shadows, touchTarget } from './mmTokens';
import NovaBubble from './NovaBubble';

// MEMORY_MASTER_R1 Phase 4 -- off-path practice corner. This is a practice
// game, NOT a Memory Master trial -- it sits outside the measured program
// the way the app's existing rhyme game sits off the Word Journey path, so
// it can do what a trial must never do: show the answer, explain the rule,
// and let the child try again with help. Unreachable from any trial screen
// (only entered from the home/wing screen). The rule it teaches is the only
// capitalization rule the whole 150-portion corpus needs.
const ITEMS = [
  { bad: 'some rockets are flying.', good: 'Some rockets are flying.', opts: ['Some', 'some'], why: 'The first word of a sentence always gets a big letter.' },
  { bad: 'Can this robot jump.', good: 'Can this robot jump?', opts: ['?', '.'], why: 'It asks something, so it ends with a question mark.' },
  { bad: 'that big kid is in the water.', good: 'That big kid is in the water.', opts: ['That', 'that'], why: 'First word, big letter. Every time.' },
  { bad: 'Kids cannot fly', good: 'Kids cannot fly.', opts: ['.', '?'], why: 'It tells you something, so it ends with a period.' },
];

export default function Practice({ onBack, speak }) {
  const [i, setI] = useState(0);
  const [feedback, setFeedback] = useState(null); // { good: bool, text }
  const [showText, setShowText] = useState(ITEMS[0].bad);
  const item = ITEMS[i % ITEMS.length];

  useEffect(() => {
    setShowText(item.bad);
    setFeedback(null);
    speak(item.good);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const answer = (choice) => {
    const right = choice === item.opts[0];
    setShowText(item.good);
    const text = right ? `Yes! ${item.why}` : `Look - it goes like this. ${item.why}`;
    setFeedback({ good: right, text });
    speak(text);
    setTimeout(() => setI((n) => n + 1), right ? 1900 : 2400);
  };

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.13em', textTransform: 'uppercase', color: colors.mutedInkLight, marginBottom: 14 }}>
        Practice corner &middot; big letters and marks
      </div>
      <NovaBubble text="Fix this sentence. Take your time!" />
      <div style={{ background: colors.cloud, color: colors.ink, borderRadius: 22, padding: '26px 20px', boxShadow: shadows.chunk, fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.5, textAlign: 'center', marginBottom: 16 }}>
        {showText}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {item.opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => answer(o)}
            disabled={!!feedback}
            style={{ flex: 1, minHeight: touchTarget, background: colors.mint, color: colors.ink, border: 'none', borderRadius: 18, fontFamily: fonts.display, fontWeight: 800, fontSize: '.92rem', cursor: feedback ? 'default' : 'pointer', boxShadow: shadows.chunkSm, opacity: feedback ? 0.6 : 1 }}
          >
            {o}
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontWeight: 700, minHeight: 26, marginBottom: 10, color: feedback?.good ? colors.mintDeep : colors.starText }}>
        {feedback?.text}
      </div>
      <button
        type="button"
        onClick={onBack}
        style={{ width: '100%', minHeight: touchTarget, background: 'rgba(255,255,255,.14)', color: colors.cloud, border: '2px solid rgba(255,255,255,.3)', borderRadius: 18, fontFamily: fonts.display, fontWeight: 800, fontSize: '.95rem', padding: 12, cursor: 'pointer' }}
      >
        Back to the galaxy
      </button>
    </div>
  );
}
