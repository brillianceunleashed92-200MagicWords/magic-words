import { motion } from "motion/react";
import { useTilt } from "../useTilt";

// Applies the tilt-toward-cursor convention (CLAUDE.md Interaction Design
// addendum) to a card. Use only on landing/exploration surfaces — not
// dashboard or lesson-player UI (see useTilt for the scoping rule).
export default function TiltCard({ as: Surface, max, className = "", children, ...props }) {
  const { ref, style, handlers } = useTilt({ max });
  return (
    <motion.div ref={ref} style={style} {...handlers} className="will-change-transform">
      <Surface className={className} {...props}>
        {children}
      </Surface>
    </motion.div>
  );
}
