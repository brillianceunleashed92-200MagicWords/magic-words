import { motion } from 'motion/react';
import { colors, fonts, shadows, touchTarget } from '../../theme/tokens';
import { IconCheck, IconLock, IconStar } from '../icons';
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';

// One node in the Option B guided path. Three states:
// - completed: filled mint, checkmark + earned star count, tap REPLAYS it.
// - current: the emphasized "you're here" CTA — gently pulses (skipped
//   entirely under prefers-reduced-motion, per the mission's explicit "no
//   motion when set" — stricter than CelebrationOverlay's clamp-not-skip,
//   deliberately, since this is a persistent/looping animation rather than
//   a one-shot celebration).
// - locked: dimmed, lock icon, tap does NOT open it — gives a gentle Nova
//   audio nudge instead (handled by the caller's onTap for locked nodes;
//   this component never treats "locked" as a dead end).
export default function QuestPathNode({ activity, state, stars = 0, onTap, speak }) {
  const reducedMotion = usePrefersReducedMotion();
  const { label, Icon } = activity;
  const isCompleted = state === 'completed';
  const isCurrent = state === 'current';
  const isLocked = state === 'locked';

  const bg = isCompleted ? colors.mint : isLocked ? 'rgba(255,255,255,.5)' : colors.cloud;
  const iconColor = isCompleted ? colors.mintDeep : isLocked ? colors.mutedInkLight : colors.ink;

  return (
    <motion.button
      onClick={() => { speak?.(isLocked ? "Let's finish this one first!" : label); onTap?.(); }}
      whileTap={isLocked ? {} : { y: 4 }}
      animate={isCurrent && !reducedMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={isCurrent && !reducedMotion ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : {}}
      style={{
        minHeight: touchTarget,
        width: '100%',
        maxWidth: 320,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        borderRadius: 26,
        border: isCurrent ? `3px solid ${colors.bubble}` : 'none',
        background: bg,
        color: colors.ink,
        boxShadow: isLocked ? 'none' : shadows.chunkSm,
        cursor: 'pointer',
        opacity: isLocked ? 0.7 : 1,
        textAlign: 'left',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: isCompleted ? colors.mintDeep : isLocked ? 'rgba(255,255,255,.6)' : `${colors.sky}14`,
      }}>
        {isCompleted ? <IconCheck size={22} color={colors.cloud} /> : isLocked ? <IconLock size={20} color={iconColor} /> : <Icon size={22} color={iconColor} />}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '.95rem' }}>{label}</span>
        {isCurrent && (
          <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: '.7rem', color: colors.bubble, textTransform: 'uppercase', letterSpacing: '.03em' }}>
            You're here!
          </span>
        )}
        {isCompleted && (
          <span style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <IconStar key={i} size={13} color={i <= stars ? colors.starText : 'rgba(0,0,0,.15)'} />
            ))}
          </span>
        )}
      </span>
    </motion.button>
  );
}
