import { motion } from 'motion/react';
import { colors, fonts, shadows } from '../../theme/tokens';

// A single word-star node on the scroll-driven Word Galaxy path
// (mockup D `.node`). status: 'done' | 'current' | 'locked'.
export default function WordNode({ word, status, progressLabel, x, y, show, onTap, speak }) {
  const base = {
    position: 'absolute',
    left: x,
    top: y,
    width: 96,
    height: 96,
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    fontFamily: fonts.display,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: shadows.chunk,
    opacity: show ? 1 : 0,
    transform: show ? 'scale(1)' : 'scale(.3)',
    transition: 'transform .5s cubic-bezier(.2,.9,.3,1.5), opacity .5s',
  };

  const styleByStatus = {
    done: { background: colors.sun, color: colors.starText },
    current: { background: colors.bubble, color: '#fff' },
    locked: {
      background: 'rgba(255,255,255,.16)',
      color: 'rgba(255,255,255,.65)',
      boxShadow: '0 8px 0 rgba(0,0,0,.1)',
      border: '3px dashed rgba(255,255,255,.35)',
    },
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => { if (status === 'locked') return; speak?.(word); onTap?.(); }}
      whileTap={status !== 'locked' ? { y: 5, scale: 0.97 } : {}}
      animate={status === 'current' ? {
        boxShadow: [
          `${shadows.chunk}, 0 0 0 0 rgba(255,111,165,.5)`,
          `${shadows.chunk}, 0 0 0 16px rgba(255,111,165,0)`,
        ],
      } : {}}
      transition={status === 'current' ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      style={{ ...base, ...styleByStatus[status] }}
    >
      <div style={{ fontSize: '1.15rem', lineHeight: 1 }}>{word}</div>
      <div style={{ fontSize: '.58rem', fontWeight: 800, opacity: .8, marginTop: 3 }}>
        {status === 'locked' ? '🔒' : progressLabel}
      </div>
      {status === 'done' && (
        <div style={{ position: 'absolute', top: -10, right: -4, fontSize: '1.3rem', filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.2))' }}>
          ⭐
        </div>
      )}
    </motion.div>
  );
}
