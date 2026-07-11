import { motion } from 'motion/react';
import { colors, fonts, shadows } from '../../theme/tokens';
import { IconStar, IconPlay, IconLock, IconSpark } from '../icons';

// A single word-star node on the scroll-driven Word Galaxy path
// (mockup D `.node`). status: 'done' | 'current' | 'inProgress' |
// 'locked' | 'premium' | 'sleepy'. 'sleepy' (FEAT_QUICK_WINS_R1) is a
// genuinely-mastered word whose Star Keeper review is due
// (src/lib/starKeeper.js's isStarSleepy) — same gold `done` star, dimmed
// via the same saturate(.55) convention lessonChrome.jsx's AnswerTile
// already uses for its "soften" scaffold state (never a new color, per
// DESIGN_BRIEF §8). Tapping one wakes it into a real spaced-repetition
// review (the existing `reviewOnly` session path), not a normal
// focus-word session — see GalaxyScreen.jsx's status derivation and
// CandyGalaxyShell.jsx's tap routing. Deliberately no extra animation
// added for this state (a "sleepy" tile should read as still, not
// busier) — nothing here needs a prefers-reduced-motion gate as a
// result. 'inProgress' (Prompt 7, Part 1) is real,
// attempted-but-sub-mastery progress on a word that isn't this moment's
// single adaptive `currentWord` — tappable and shows its real percent,
// distinct from a genuinely never-touched `locked` word (see
// GalaxyScreen.jsx's status derivation for the reproduced bug this
// fixes: every such word used to render as a flat, indistinguishable
// lock icon). 'premium' (Phase 2 Step 6 — Units 6+ on the free tier) is deliberately
// distinct from plain progression-locked: the word is still fully
// visible with a warm gold "teaser" glow, not hidden behind a flat gray
// lock — enticing, not just blocked. Per the master prompt's gating
// spec, tapping it does nothing (no child-facing upsell) — upgrade
// prompts live only in the parent portal.
//
// `percent` (0-100) drives the done/current label — WordNode renders the
// icon+text itself (IconStar/IconPlay) rather than taking a pre-formatted
// string, so no emoji ever needs to travel through the caller.
export default function WordNode({ word, status, percent, x, y, show, onTap, speak }) {
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
    // Same mint used for the errorless-scaffold hint-glow elsewhere —
    // an already-established "keep going" cue, deliberately calmer than
    // `current`'s pulse since it isn't the primary recommendation.
    inProgress: {
      background: colors.mint,
      color: colors.mintDeep,
      border: '3px solid rgba(255,255,255,.55)',
    },
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
    // No `opacity` here — that would fight `base`'s show/hide entrance
    // opacity (0 while off-screen, 1 once shown). The dim is applied as
    // a separate multiplier below, after `show` is already accounted for.
    sleepy: {
      background: colors.sun,
      color: colors.starText,
      filter: 'saturate(.55)',
    },
  };
  const sleepyDim = status === 'sleepy' ? 0.6 : 1;

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
      style={{
        ...base, ...styleByStatus[status],
        opacity: base.opacity * sleepyDim,
        cursor: nonInteractive ? 'default' : 'pointer',
      }}
    >
      <div style={{ fontSize: '1.15rem', lineHeight: 1 }}>{word}</div>
      <div style={{ fontSize: '.58rem', fontWeight: 800, opacity: .8, marginTop: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        {status === 'locked' && <IconLock size={11} color="rgba(255,255,255,.65)" />}
        {status === 'premium' && <IconSpark size={11} color={colors.starText} />}
        {status === 'done' && <><IconStar size={11} color={colors.starText} /> 100%</>}
        {status === 'current' && <><IconPlay size={9} color="#fff" /> {percent}%</>}
        {status === 'inProgress' && <><IconPlay size={9} color={colors.mintDeep} /> {percent}%</>}
        {/* No emoji, no "zzz" glyph — the dim + saturate treatment IS the
            sleepy cue (DESIGN_BRIEF §8); the label just names the action. */}
        {status === 'sleepy' && <><IconStar size={11} color={colors.starText} /> Review</>}
      </div>
      {(status === 'done' || status === 'sleepy') && (
        <div style={{ position: 'absolute', top: -10, right: -4, filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.2))' }}>
          <IconStar size={22} color={colors.sun} />
        </div>
      )}
      {status === 'premium' && (
        <div style={{ position: 'absolute', top: -10, right: -4, filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.2))' }}>
          <IconLock size={20} color={colors.starText} />
        </div>
      )}
    </motion.div>
  );
}
