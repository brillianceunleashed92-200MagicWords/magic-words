import { useRef } from "react";
import { useScroll, useTransform } from "motion/react";

// Drives the page's anchor background through the dawn gradient as the user
// scrolls: night (Dawn Indigo) -> first light (Slate-Violet) -> sunrise
// (Sunrise Coral). This is the structural signature, not a decoration —
// see CLAUDE.md "Design tokens" for the rationale.
export function useDawnBackground() {
  const scrollRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end end"] });

  const background = useTransform(
    scrollYProgress,
    [0, 0.45, 0.8, 1],
    ["#2A2150", "#3D2A52", "#7A4A55", "#FF7A59"]
  );

  return { scrollRef, scrollYProgress, background };
}
