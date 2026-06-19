// JS mirror of the @theme tokens in src/index.css — single source of truth
// for hex values needed outside CSS (scroll-driven gradients, canvas, etc).
// See CLAUDE.md "Design tokens" for the contrast rationale behind each pair.
export const colors = {
  dawnIndigo: "#2A2150",
  cloud: "#FFF8F0",
  cometTeal: "#2DD4BF",
  cometTealDeep: "#135D54",
  sunriseCoral: "#FF7A59",
  sunriseCoralDeep: "#8F1C00",
  marigold: "#FFB84D",
  marigoldDeep: "#704300",
  slateViolet: "#6B6580",
};

// Night -> first light -> sunrise, used by useDawnBackground and any future
// scroll-driven background. Keep these stops in sync with the gradient
// described in CLAUDE.md.
export const dawnGradientStops = [
  colors.dawnIndigo,
  "#3D2A52",
  "#7A4A55",
  colors.sunriseCoral,
];
