// Reusable motion presets extracted from the landing page sections.
// Cinematic/scroll-driven choreography belongs here, not in dashboards or
// the lesson player — see CLAUDE.md "Layout" rule.

export const fadeInUp = (delay = 0, distance = 24) => ({
  initial: { opacity: 0, y: distance },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.6, delay },
});

export const fadeInSide = (direction = "left", delay = 0, distance = 24) => ({
  initial: { opacity: 0, x: direction === "left" ? -distance : distance },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.6, delay },
});

// Hero copy reveals on mount (not scroll) since it's already in view on load.
export const heroReveal = (delay = 0, distance = 24) => ({
  initial: { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay },
});
