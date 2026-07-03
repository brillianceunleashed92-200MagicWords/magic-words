import { motion } from 'motion/react';
import { colors, fonts, shadows } from '../../theme/tokens';
import { IconFlame, IconStar, IconSpark } from '../icons';

const VARIANTS = {
  fire: { bg: colors.tang, text: colors.fireText, Icon: IconFlame },
  star: { bg: colors.sun, text: colors.starText, Icon: IconStar },
  gem: { bg: colors.mint, text: colors.gemText, Icon: IconSpark },
  dim: { bg: 'rgba(255,255,255,.16)', text: 'rgba(255,255,255,.6)', Icon: null },
};

// Streak-row style stat pill (mockup D `.pill`). Speaks its value+label on
// tap per the audio-first accessibility rule. `variant` selects both the
// color and the icon (fire/star/gem) — no icon prop needed from callers.
export default function Pill({ value, label, variant = 'star', onTap, speak }) {
  const v = VARIANTS[variant] ?? VARIANTS.star;
  const Icon = v.Icon;
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
      <b style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '1.3rem', lineHeight: 1.1 }}>
        {Icon && <Icon size={16} color={v.text} />} {value}
      </b>
      <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', opacity: .8 }}>
        {label}
      </span>
    </motion.div>
  );
}
