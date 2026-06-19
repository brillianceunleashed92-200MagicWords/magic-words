import { useRef } from "react";
import { useMotionValue, useSpring, useTransform } from "motion/react";

// Tilt-toward-cursor convention from the Interaction Design addendum
// (CLAUDE.md). CSS 3D transforms only — no WebGL/Three.js. A reusable
// pattern, not a site-wide default: only apply on landing-page exploration
// surfaces (feature cards, future Word Galaxy/level tiles), never on
// dashboard or lesson-player UI.
export function useTilt({ max = 6 } = {}) {
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springX = useSpring(px, { stiffness: 300, damping: 30 });
  const springY = useSpring(py, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(springY, [0, 1], [max, -max]);
  const rotateY = useTransform(springX, [0, 1], [-max, max]);
  const translateZ = useTransform(springX, [0, 0.5, 1], [0, 12, 0]);

  function onPointerMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function onPointerLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return {
    ref,
    style: { rotateX, rotateY, translateZ, transformPerspective: 800 },
    handlers: { onPointerMove, onPointerLeave },
  };
}
