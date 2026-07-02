import { motion } from 'motion/react';
import { colors, fonts, shadows } from '../../theme/tokens';

const VARIANTS = {
  sun: { bg: colors.sun, color: colors.starText },
  mint: { bg: colors.mint, color: colors.gemText },
  pink: { bg: colors.bubble, color: '#fff' },
  dim: { bg: 'rgba(255,255,255,.16)', color: 'rgba(255,255,255,.6)' },
};

// A single mastered/learning word chip (mockup D `.bub`). Content words get
// solid fill; function words get the dim/outline treatment when not yet
// practiced — mirrors the content/non-content convention carried from the
// dawn-token system into Candy Galaxy.
export default function WordBubble({ word, variant = 'sun', delay = 0, onTap, speak }) {
  const v = VARIANTS[variant] ?? VARIANTS.sun;
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => { speak?.(word); onTap?.(); }}
      initial={{ opacity: 0, y: 16, scale: 0.5 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.9, 0.3, 1.5] }}
      whileTap={{ y: 4 }}
      style={{
        fontFamily: fonts.display,
        fontWeight: 800,
        fontSize: '.92rem',
        padding: '10px 18px',
        borderRadius: 100,
        boxShadow: shadows.chunkPill,
        cursor: 'pointer',
        background: v.bg,
        color: v.color,
      }}
    >
      {word}
    </motion.div>
  );
}
