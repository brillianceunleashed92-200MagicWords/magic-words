import { motion } from "motion/react";
import { dawnGradientStops, colors as tokens } from "../design-system/tokens";
import { IconStar } from "./icons";

// The one moment allowed to be cinematic. Per the Interaction Design
// addendum (CLAUDE.md item c): routine per-question feedback stays
// restrained ("mastery is the reward"), so the rare moments that ARE big —
// level-up — need to feel proportionally larger to register as genuinely
// rare, not just "the same confetti, slightly longer." This replays a
// compressed version of the landing page's WordRise signature moment,
// scoped to a few of the child's own words, rather than inventing a new
// effect.
//
// Foreground content sits on an opaque Cloud panel rather than directly on
// the animated gradient — the gradient ends on Sunrise Coral, and several
// of our accent colors (marigold, comet teal, cloud) fail contrast against
// coral (as low as 1.4:1, checked directly). The gradient still sweeps and
// glows behind/around the panel, so the cinematic effect survives; the
// text just doesn't ride directly on top of a color it can disappear into.
export default function LevelUpCelebration({ levelInfo, words = [], onDismiss }) {
  const sampleWords = words.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem", overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ background: dawnGradientStops[0] }}
        animate={{ background: [dawnGradientStops[0], dawnGradientStops[1], dawnGradientStops[2], dawnGradientStops[3]] }}
        transition={{ duration: 2.6, times: [0, 0.35, 0.7, 1], ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, zIndex: -1 }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="font-body"
        style={{
          background: tokens.cloud,
          borderRadius: 28,
          padding: "2rem 1.75rem",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Words rise, same visual language as the landing page's
            signature WordRise sequence, now on a surface where the
            content/non-content chip convention stays legible too. */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          {sampleWords.map((w, i) => (
            <motion.span
              key={w.word}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
              style={
                w.type === "content"
                  ? { background: tokens.cometTeal, color: tokens.dawnIndigo, fontWeight: 800, borderRadius: 999, padding: "6px 14px", fontSize: 14 }
                  : { border: `2px solid ${tokens.marigold}`, color: tokens.dawnIndigo, fontWeight: 600, borderRadius: 999, padding: "6px 14px", fontSize: 14 }
              }
            >
              {w.word}
            </motion.span>
          ))}
        </div>

        {/* Numbered badge, not a per-level emoji — a consistent, legible
            "Level N" badge reads better across 24 levels than 24 unrelated
            pictograms (several of which weren't even tied to that level's
            actual grammar milestone). */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{
            width: 84, height: 84, borderRadius: '50%', margin: '0 auto',
            background: `linear-gradient(135deg, ${tokens.marigold}, #FFD98A)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 0 rgba(0,0,0,.16)',
          }}
        >
          <IconStar size={22} color={tokens.dawnIndigo} />
          <span className="font-display" style={{ fontSize: 22, fontWeight: 800, color: tokens.dawnIndigo, lineHeight: 1 }}>
            {levelInfo.level}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <div className="font-display" style={{ fontSize: "2rem", color: tokens.sunriseCoralDeep, margin: "0.75rem 0 0.5rem" }}>
            LEVEL UP!
          </div>
          <div className="font-display" style={{ fontSize: "1.25rem", color: tokens.cometTealDeep }}>
            Level {levelInfo.level} · {levelInfo.title}
          </div>
          <div style={{ fontSize: "1rem", color: tokens.dawnIndigo, opacity: 0.7, marginTop: "0.5rem" }}>
            Now practicing: {levelInfo.stage}
          </div>
          <div style={{ marginTop: "1.25rem", fontSize: "0.875rem", color: tokens.dawnIndigo, opacity: 0.5 }}>
            Tap to continue
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
