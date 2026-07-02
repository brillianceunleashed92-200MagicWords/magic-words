import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { colors, fonts, radii, shadows } from '../../theme/tokens';
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';

// Generic full-screen celebration takeover, shared by the 5 ranked
// celebration moments (200MW_Product_Blueprint.md 2.7). Always skippable
// (tap anywhere / any key) and respects prefers-reduced-motion by cutting
// duration to a near-instant flash instead of removing the moment
// entirely — a level-up should still register as "this happened," just
// without the long motion sequence.
export default function CelebrationOverlay({ open, onDone, durationMs = 3000, children }) {
  const reducedMotion = usePrefersReducedMotion();
  const effectiveDuration = reducedMotion ? Math.min(600, durationMs) : durationMs;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onDone?.(), effectiveDuration);
    return () => clearTimeout(t);
  }, [open, effectiveDuration, onDone]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="celebration"
        onClick={onDone}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.3 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: `linear-gradient(160deg, ${colors.bubble}, ${colors.sky} 55%, ${colors.skyNight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', cursor: 'pointer',
        }}
      >
        <motion.div
          initial={{ scale: reducedMotion ? 1 : 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.45, ease: [0.2, 0.9, 0.3, 1.3] }}
          onClick={e => e.stopPropagation()}
          style={{
            background: colors.cloud,
            color: colors.ink,
            borderRadius: radii.xl,
            padding: '2rem 1.75rem',
            maxWidth: 360,
            width: '100%',
            textAlign: 'center',
            boxShadow: shadows.chunkLg,
            fontFamily: fonts.body,
          }}
        >
          {children}
          <button
            onClick={onDone}
            style={{
              marginTop: '1rem', background: 'none', border: 'none',
              color: colors.mutedInk, fontFamily: fonts.body, fontWeight: 600,
              fontSize: '.8rem', cursor: 'pointer',
            }}
          >
            Tap to continue
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
