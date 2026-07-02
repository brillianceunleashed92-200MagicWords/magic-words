// Generates the scroll-driven S-curve path + node coordinates for the Word
// Galaxy map, generalizing mockup-D-candy-galaxy.html's hand-placed SVG path
// (a chain of cubic beziers alternating left/right) to an arbitrary node
// count — Home uses a short slice (current unit), GalaxyScreen uses all 200.
export function buildGalaxyPath(nodeCount, {
  viewWidth = 300,
  segmentHeight = 170,
  amplitude = 95,
  topPadding = 40,
} = {}) {
  const center = viewWidth / 2;
  const points = Array.from({ length: nodeCount }, (_, i) => ({
    x: center + (i % 2 === 0 ? -amplitude : amplitude),
    y: topPadding + i * segmentHeight,
  }));

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const c1y = prev.y + segmentHeight / 2;
    const c2y = curr.y - segmentHeight / 2;
    d += ` C ${prev.x} ${c1y}, ${curr.x} ${c2y}, ${curr.x} ${curr.y}`;
  }

  const height = points.length ? points[points.length - 1].y + topPadding : topPadding * 2;
  return { d, points, viewWidth, height };
}
