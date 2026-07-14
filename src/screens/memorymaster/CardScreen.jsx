import { colors, fonts, radii, shadows, touchTarget } from './mmTokens';

// MEMORY_MASTER_R1 Phase 4 -- shared centered-card layout for the simple
// message screens (intro, 5-try stop, level-down/pause, program complete,
// level-up). Low-stimulation by design (handoff fidelity 9): one icon, one
// headline, one or two lines of warm copy, one button.
export default function CardScreen({ icon, iconBg = colors.mint, title, children, buttonLabel, onButton, buttonVariant = 'sun', extra }) {
  const btnBg = buttonVariant === 'sun' ? colors.sun : colors.mint;
  return (
    <div
      style={{
        background: colors.cloud,
        color: colors.ink,
        borderRadius: radii.xl,
        padding: '26px 24px',
        boxShadow: shadows.chunk,
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ width: 78, height: 78, margin: '0 auto 12px', borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      )}
      <h2 style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '1.5rem', marginBottom: 8, lineHeight: 1.2 }}>{title}</h2>
      <div style={{ fontWeight: 600, fontSize: '.92rem', lineHeight: 1.5, color: colors.muted, marginBottom: 14 }}>{children}</div>
      {extra}
      {buttonLabel && (
        <button
          type="button"
          onClick={onButton}
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '1.05rem',
            border: 'none',
            borderRadius: 18,
            padding: '15px 26px',
            minHeight: touchTarget,
            width: '100%',
            cursor: 'pointer',
            boxShadow: shadows.chunkSm,
            background: btnBg,
            color: colors.ink,
          }}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
