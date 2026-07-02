import { motion } from 'motion/react';
import { colors, fonts, shadows } from '../../theme/tokens';

// A single word-star node on the scroll-driven Word Galaxy path
// (mockup D `.node`). status: 'done' | 'current' | 'locked' | 'premium'.
// 'premium' (Phase 2 Step 6 — Units 6+ on the free tier) is deliberately
// distinct from plain progression-locked: the word is still fully
// visible with a warm gold "teaser" glow, not hidden behind a flat gray
// lock — enticing, not just blocked. Per the master prompt's gating
// spec, tapping it does nothing (no child-facing upsell) — upgrade
// prompts live only in the parent portal.
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
    premium: {
      background: `linear-gradient(135deg, ${colors.sun}, #FFD98A)`,
      color: colors.starText,
      border: '3px solid rgba(255,255,255,.6)',
    },
  };

  const nonInteractive = status === 'locked' || status === 'premium';

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => { if (nonInteractive) return; speak?.(word); onTap?.(); }}
      whileTap={!nonInteractive ? { y: 5, scale: 0.97 } : {}}
      animate={status === 'current' ? {
        boxShadow: [
          `${shadows.chunk}, 0 0 0 0 rgba(255,111,165,.5)`,
          `${shadows.chunk}, 0 0 0 16px rgba(255,111,165,0)`,
        ],
      } : status === 'premium' ? {
        boxShadow: [
          `${shadows.chunk}, 0 0 10px 2px rgba(255,184,77,.7)`,
          `${shadows.chunk}, 0 0 18px 6px rgba(255,184,77,.3)`,
        ],
      } : {}}
      transition={
        status === 'current' ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
        : status === 'premium' ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }
        : {}
      }
      style={{ ...base, ...styleByStatus[status], cursor: nonInteractive ? 'default' : 'pointer' }}
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
      {status === 'premium' && (
        <div style={{ position: 'absolute', top: -10, right: -4, fontSize: '1.3rem', filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.2))' }}>
          🔒
        </div>
      )}
    </motion.div>
  );
}
