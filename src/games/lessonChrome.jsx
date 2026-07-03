// Shared E2-standard lesson-screen chrome, used by every activity in
// GameEngine.jsx. See docs/mockup-E2-no-emoji.html (gold standard) and
// docs/DESIGN_BRIEF.md §§4-6. Replaces the old dawn-gradient-token
// SessionProgress/FeedbackOverlay/WordTile with candy-token, chunk-shadow,
// errorless-scaffold-native equivalents.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { colors, fonts, shadows } from '../theme/tokens';
import NovaSprite from '../components/candy/NovaSprite';
import { IconStar } from '../components/icons';

// ─── Star progress segments — ignites left to right ───────────────────────
export function StarProgress({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 8, flex: 1 }}>
      {Array.from({ length: total }, (_, i) => {
        const lit = i < current;
        return (
          <div key={i} style={{
            flex: 1, height: 14, borderRadius: 100, background: 'rgba(255,255,255,.16)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 100,
              background: `linear-gradient(90deg, ${colors.sun}, #FFDD7A)`,
              width: lit ? '100%' : '0%', transition: 'width .6s cubic-bezier(.2,.9,.3,1.3)',
            }} />
            <div style={{
              position: 'absolute', right: -2, top: '50%', width: 20, height: 20,
              transform: `translateY(-50%) scale(${lit ? 1 : 0})`,
              transition: 'transform .4s cubic-bezier(.3,1.7,.4,1)',
              filter: 'drop-shadow(0 0 6px rgba(255,197,49,.9))',
            }}>
              <IconStar size={20} color={colors.sun} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Nova porthole + speech bubble ─────────────────────────────────────────
export function NovaPorthole({ novaState = 'idle', message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0 20px' }}>
      <div style={{
        width: 76, height: 76, borderRadius: '50%', flex: '0 0 auto',
        background: `radial-gradient(circle at 35% 30%, #7A6BF0, ${colors.skyDeep} 70%)`,
        border: '5px solid rgba(255,255,255,.9)', boxShadow: shadows.chunkSm,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <NovaSprite state={novaState} size={62} />
      </div>
      {message && (
        <div style={{
          background: colors.cloud, color: colors.ink, borderRadius: '22px 22px 22px 4px',
          padding: '12px 18px', fontFamily: fonts.display, fontWeight: 700, fontSize: '.95rem',
          boxShadow: shadows.chunkSm, maxWidth: 320,
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

// ─── Answer tile — chunk shadow, spring entrance, hover-lift/press-down,
// errorless scaffold states (wiggle+soften, hint-glow, correct-flash) ──────
export function AnswerTile({ children, index = 0, onTap, disabled, state, minHeight = 140 }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  const isWiggle = state === 'wiggle';
  const isSoften = state === 'soften' || state === 'wiggle-soften';
  const isHintGlow = state === 'hint-glow';
  const isCorrectFlash = state === 'correct-flash';

  return (
    <button
      onClick={onTap}
      disabled={disabled}
      style={{
        background: colors.cloud, borderRadius: 32, padding: '20px 12px 14px',
        border: 'none', cursor: disabled ? 'default' : 'pointer', textAlign: 'center',
        minHeight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: isHintGlow || isCorrectFlash
          ? `${shadows.chunk}, 0 0 0 5px rgba(62,224,184,.55), 0 0 26px rgba(62,224,184,.6)`
          : shadows.chunk,
        opacity: entered ? (isSoften ? 0.55 : 1) : 0,
        filter: isSoften ? 'saturate(.55)' : 'none',
        transform: entered ? 'none' : 'translateY(28px) scale(.85)',
        transitionProperty: 'transform, opacity, box-shadow, filter',
        transitionDuration: '.55s, .5s, .2s, .35s',
        transitionTimingFunction: 'cubic-bezier(.2,.9,.3,1.5)',
        transitionDelay: entered ? '0s' : `${index * 0.1}s`,
        animation: isWiggle ? 'lessonWiggle .45s ease' : isHintGlow ? 'lessonHintPulse 1.4s ease-in-out infinite' : 'none',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.transform = entered ? 'none' : 'translateY(28px) scale(.85)'; }}
    >
      {children}
    </button>
  );
}

// ─── SVG star confetti — short-lived burst on correct ──────────────────────
export function ConfettiStars({ active, originRef }) {
  if (!active) return null;
  const rect = originRef?.current?.getBoundingClientRect?.();
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2.4;
  const pieces = Array.from({ length: 14 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 140;
    return {
      dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist,
      rot: Math.random() * 360 - 180, delay: Math.random() * 0.15,
      color: [colors.sun, colors.mint, colors.bubble, colors.tang][i % 4],
    };
  });
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}>
      {pieces.map((p, i) => (
        <svg
          key={i} viewBox="0 0 24 24" width={18} height={18}
          style={{
            position: 'absolute', left: cx, top: cy, opacity: 0,
            animation: `lessonConfettiPop .9s cubic-bezier(.2,.8,.3,1) ${p.delay}s forwards`,
            '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`,
          }}
        >
          <path fill={p.color} d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14 2 8.27l6.91-1.01z" />
        </svg>
      ))}
    </div>,
    document.body,
  );
}

// Keyframes shared by AnswerTile/ConfettiStars — injected once, not per
// instance (GameEngine.jsx already has a global stylesheet block; this
// mirrors that pattern for the new chrome specifically).
export const LESSON_CHROME_KEYFRAMES = `
@keyframes lessonWiggle {
  0%,100% { transform: translateX(0) rotate(0); }
  20% { transform: translateX(-6px) rotate(-2deg); }
  40% { transform: translateX(5px) rotate(2deg); }
  60% { transform: translateX(-4px) rotate(-1.5deg); }
  80% { transform: translateX(3px) rotate(1deg); }
}
@keyframes lessonHintPulse {
  0%,100% { box-shadow: ${shadows.chunk}, 0 0 0 5px rgba(62,224,184,.4), 0 0 22px rgba(62,224,184,.45); }
  50% { box-shadow: ${shadows.chunk}, 0 0 0 8px rgba(62,224,184,.65), 0 0 34px rgba(62,224,184,.7); }
}
@keyframes lessonConfettiPop {
  0% { opacity: 1; transform: translate(0,0) rotate(0) scale(.4); }
  100% { opacity: 0; transform: translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(1.1); }
}
`;
