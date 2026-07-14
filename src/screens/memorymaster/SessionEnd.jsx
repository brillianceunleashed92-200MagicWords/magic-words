import { colors, fonts, radii, shadows, touchTarget } from './mmTokens';
import { CheckmarkIcon } from './icons';

// MEMORY_MASTER_R1 Phase 4 -- session-end screen (R11-R13). A checkmark is
// earned only when BOTH portions were perfect on the first attempt.
// Second-attempt-clean is still a good session -- it just isn't a
// checkmark. Streak strip shows the rolling last-5-sessions window that
// feeds the R12 4-of-5 criterion.
export default function SessionEnd({ checkmark, checkHist, onDone }) {
  const last5 = checkHist.slice(-5);
  const n = last5.filter(Boolean).length;
  return (
    <div style={{ background: colors.cloud, color: colors.ink, borderRadius: radii.xl, padding: '26px 24px', boxShadow: shadows.chunk, textAlign: 'center' }}>
      {checkmark && (
        <div style={{ width: 78, height: 78, margin: '0 auto 12px', borderRadius: '50%', background: colors.mint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckmarkIcon />
        </div>
      )}
      <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>{checkmark ? 'Checkmark!' : 'Session done'}</h2>
      <p style={{ fontWeight: 600, fontSize: '.92rem', color: colors.muted, marginBottom: 14 }}>
        {checkmark ? 'Both sentences perfect on the very first try.' : 'Good work today. Every try builds the memory.'}
      </p>
      <div style={{ display: 'flex', gap: 7, justifyContent: 'center', margin: '14px 0' }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const has = i < last5.length;
          const ck = has && last5[i];
          return (
            <div key={i} style={{ width: 34, height: 34, borderRadius: 10, background: ck ? colors.mint : has ? '#EDEBFA' : colors.paper, color: ck ? colors.ink : colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              {ck ? <CheckmarkIcon size={16} /> : '·'}
            </div>
          );
        })}
      </div>
      <div style={{ fontWeight: 700, fontSize: '.85rem', color: colors.muted, marginBottom: 14 }}>
        {n} of your last {last5.length} session{last5.length === 1 ? '' : 's'} had a checkmark. 4 of 5 moves up a level.
      </div>
      <button
        type="button"
        onClick={onDone}
        style={{ width: '100%', minHeight: touchTarget, background: colors.sun, color: colors.ink, fontFamily: fonts.display, fontWeight: 800, fontSize: '1.05rem', border: 'none', borderRadius: 18, boxShadow: shadows.chunkSm, cursor: 'pointer' }}
      >
        Done
      </button>
    </div>
  );
}
