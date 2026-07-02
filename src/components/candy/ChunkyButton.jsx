import { motion } from 'motion/react';
import { colors, fonts, shadows, touchTarget } from '../../theme/tokens';

const VARIANTS = {
  primary: { bg: colors.cloud, color: colors.ink },
  mint: { bg: `linear-gradient(135deg, ${colors.mint}, #2BC9A4)`, color: colors.mintDeep },
  sun: { bg: colors.sun, color: colors.starText },
};

// The signature chunky 3D-shadow button — physically depresses on tap.
// 64px minimum touch target per the accessibility rule.
export default function ChunkyButton({ children, onClick, variant = 'primary', disabled = false, speak, style }) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  return (
    <motion.button
      onClick={() => { if (disabled) return; speak?.(typeof children === 'string' ? children : undefined); onClick?.(); }}
      whileTap={disabled ? {} : { y: 5 }}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: touchTarget,
        background: v.bg,
        color: v.color,
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: '1rem',
        padding: '13px 28px',
        borderRadius: 100,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        boxShadow: shadows.chunkSm,
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}
