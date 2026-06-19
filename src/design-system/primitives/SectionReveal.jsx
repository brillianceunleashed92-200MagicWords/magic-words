import { motion } from "motion/react";
import { fadeInUp, fadeInSide } from "../motion";

// Wraps the whileInView fade reveal duplicated across landing sections.
// direction="up" (default) or "left"/"right" for side-entrance content.
export default function SectionReveal({ direction = "up", delay = 0, className = "", children }) {
  const preset = direction === "up" ? fadeInUp(delay) : fadeInSide(direction, delay);
  return (
    <motion.div {...preset} className={className}>
      {children}
    </motion.div>
  );
}
