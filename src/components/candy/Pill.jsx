import { motion } from 'motion/react';
import { colors, fonts, shadows } from '../../theme/tokens';

const VARIANTS = {
  fire: { bg: colors.tang, text: colors.fireText },
  star: { bg: colors.sun, text: colors.starText },
  gem: { bg: colors.mint, text: colors.gemText },
  dim: { bg: 'rgba(255,255,255,.16)', text: 'rgba(255,255,255,.6)' },
};

// Streak-row style stat pill (mockup D `.pill`). Speaks its value+label on
// tap per the audio-first accessibility rule.
export default function Pill({ icon, value, label, variant = 'star', onTap, speak }) {
  const v = VARIANTS[variant] ?? VARIANTS.star;
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => { onTap?.(); speak?.(`${label}: ${value}`); }}
      whileTap={{ y: 4 }}
      style={{
        flex: 1,
        minHeight: 64,
        borderRadius: 20,
        padding: '11px 6px',
        textAlign: 'center',
        fontFamily: fonts.display,
        fontWeight: 800,
        background: v.bg,
        color: v.text,
        boxShadow: shadows.chunkSm,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <b style={{ display: 'block', fontSize: '1.3rem', lineHeight: 1.1 }}>
        {icon} {value}
      </b>
      <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', opacity: .8 }}>
        {label}
      </span>
    </motion.div>
  );
}
