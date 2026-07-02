import { motion } from 'motion/react';
import { colors, fonts, shadows, touchTarget } from '../../theme/tokens';

// One tile in Today's Quest (5 activities). done=true shows a completed
// checkmark state; current=true is the next thing to play.
export default function QuestTile({ icon, label, done, current, onTap, speak }) {
  return (
    <motion.button
      onClick={() => { speak?.(label); onTap?.(); }}
      whileTap={{ y: 4 }}
      style={{
        minHeight: touchTarget,
        minWidth: touchTarget,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '10px 8px',
        borderRadius: 22,
        border: current ? `3px solid ${colors.bubble}` : 'none',
        background: done ? colors.sun : colors.cloud,
        color: colors.ink,
        boxShadow: shadows.chunkSm,
        cursor: 'pointer',
        opacity: done ? 0.85 : 1,
        position: 'relative',
      }}
    >
      <span style={{ fontSize: '1.6rem' }}>{done ? '⭐' : icon}</span>
      <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '.65rem', textAlign: 'center' }}>
        {label}
      </span>
    </motion.button>
  );
}
