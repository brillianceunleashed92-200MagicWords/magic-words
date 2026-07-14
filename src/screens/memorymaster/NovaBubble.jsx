import { colors, fonts, shadows } from './mmTokens';

// MEMORY_MASTER_R1 Phase 4 -- small reusable Nova-porthole + speech-bubble
// row, used across the read/write/assessment/primer/practice screens.
export default function NovaBubble({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div
        style={{
          width: 62, height: 62, borderRadius: '50%', background: colors.skyNight, border: `4px solid ${colors.cloud}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', boxShadow: shadows.chunkSm,
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: colors.sun, position: 'relative' }}>
          <div style={{ position: 'absolute', width: 5, height: 8, borderRadius: 3, background: colors.ink, top: 12, left: 10 }} />
          <div style={{ position: 'absolute', width: 5, height: 8, borderRadius: 3, background: colors.ink, top: 12, right: 10 }} />
          <div style={{ position: 'absolute', width: 14, height: 7, borderBottom: `2.5px solid ${colors.ink}`, borderRadius: '0 0 14px 14px', bottom: 10, left: 12 }} />
        </div>
      </div>
      <div style={{ background: colors.cloud, color: colors.ink, borderRadius: 18, padding: '12px 16px', fontWeight: 700, fontSize: '.95rem', boxShadow: shadows.chunkSm, flex: 1, fontFamily: fonts.body }}>
        {text}
      </div>
    </div>
  );
}
