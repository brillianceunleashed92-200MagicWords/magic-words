// Ordered-stroke manifest for the lowercase alphabet — Draw It → Letter
// Tracing (docs/200MW_Prompt5_Draw_It_Tracing.md PART 2). Each letter maps
// to 1-3 strokes; each stroke is a single SVG path `d` string whose starting
// point (the path's first M coordinate) is the trace-start point and whose
// initial tangent direction is the demo arrow's direction — both derived at
// render time from the path geometry (see TracingStage in ../games/DrawIt.jsx
// via `getPointAtLength`), not hand-annotated here, so this file only needs
// to stay geometrically correct, not carry duplicate direction metadata.
//
// Convention: simplified single-story print manuscript (the plain
// continuous-stroke lowercase forms used in early handwriting instruction —
// single-story 'a'/'g', no cursive entry/exit strokes, no serifs), stroke
// order and direction follow common manuscript teaching practice (top to
// bottom, left to right; round letters trace counterclockwise starting near
// 2 o'clock, matching the 'c' shape all of a/c/d/e/g/o/p/q's bowls share).
// This is a first, functional MVP glyph set — documented as such, not a
// certified OT handwriting curriculum — built as a static generator script
// (computed coordinates, not hand-typed arithmetic) then visually QA'd
// letter-by-letter in-browser; see docs/DRAW_IT_TRACING_REPORT.md STROKE-DATA
// ASSESSMENT for the full option costing and why this path was chosen.
//
// Grid every letter is authored on: viewBox "0 0 100 120".
//   asc  = 12   ascender top line   (b, d, f, h, k, l, t start here)
//   xTop = 46   x-height top line   (a, c, e, m, n, o, r, s, u, v, w, x, z; i/j stems)
//   base = 92   baseline            (every letter sits here)
//   desc = 116  descender line      (g, j, p, q, y dip here)
// Center column cx = 50.
export const LETTER_GRID = { width: 100, height: 120, asc: 12, xTop: 46, base: 92, desc: 116, cx: 50 };

export const LETTER_STROKES = {
  a: [
    { d: 'M69.92,57.5 A23,23 0 0,0 36.81,50.16 A23,23 0 0,0 32.38,83.78 A23,23 0 0,0 66.26,85.26 A23,23 0 0,0 72.65,65.01' },
    { d: 'M70.01,50 L70.01,92' },
  ],
  b: [
    { d: 'M27,12 L27,92' },
    { d: 'M73,69 A23,23 0 0,0 48,46.09 A23,23 0 0,0 27.35,72.99 A23,23 0 0,0 55.95,91.22 A23,23 0 0,0 67.62,83.78' },
  ],
  c: [
    { d: 'M69.92,57.5 A23,23 0 0,0 36.81,50.16 A23,23 0 0,0 32.38,83.78 A23,23 0 0,0 64.78,86.62' },
  ],
  d: [
    { d: 'M69.92,57.5 A23,23 0 0,0 36.81,50.16 A23,23 0 0,0 32.38,83.78 A23,23 0 0,0 66.26,85.26 A23,23 0 0,0 72.65,72.99' },
    { d: 'M73,12 L73,92' },
  ],
  e: [
    { d: 'M29.3,69 L73,69 A23,23 0 0,0 48,46.09 A23,23 0 0,0 27.35,72.99 A23,23 0 0,0 55.95,91.22 A23,23 0 0,0 61.5,88.92' },
  ],
  f: [
    { d: 'M63.8,18 A8,8 0 0,0 43.1,14 A6,6 0 0,0 38.5,22 L38.5,92' },
    { d: 'M29.3,48 L61.5,48' },
  ],
  g: [
    { d: 'M69.92,57.5 A23,23 0 0,0 36.81,50.16 A23,23 0 0,0 32.38,83.78 A23,23 0 0,0 66.26,85.26 A23,23 0 0,0 72.65,65.01' },
    { d: 'M70.01,50 L70.01,106 A10,10 0 0,1 56.01,116' },
  ],
  h: [
    { d: 'M27,12 L27,92' },
    { d: 'M27,69 A23,18.4 0 0,1 73,73 L73,92' },
  ],
  i: [
    { d: 'M50,46 L50,92' },
    { d: 'M50,12 L50.5,12.5' }, // dot — near-zero-length tap target
  ],
  j: [
    { d: 'M54,46 L54,106 A10,10 0 0,1 44,116' },
    { d: 'M54,12 L54.5,12.5' }, // dot
  ],
  k: [
    { d: 'M27,12 L27,92' },
    { d: 'M68.4,46 L27,71' },
    { d: 'M27,71 L68.4,92' },
  ],
  l: [
    { d: 'M50,12 L50,92' },
  ],
  m: [
    { d: 'M20.1,46 L20.1,92' },
    { d: 'M20.1,69 A14.95,18.4 0 0,1 50,73 L50,92' },
    { d: 'M50,69 A14.95,18.4 0 0,1 79.9,73 L79.9,92' },
  ],
  n: [
    { d: 'M27,46 L27,92' },
    { d: 'M27,69 A23,18.4 0 0,1 73,73 L73,92' },
  ],
  o: [
    { d: 'M69.92,57.5 A23,23 0 0,0 36.81,50.16 A23,23 0 0,0 32.38,83.78 A23,23 0 0,0 66.26,85.26 A23,23 0 0,0 70.85,59.28' },
  ],
  p: [
    { d: 'M27,46 L27,116' },
    { d: 'M73,69 A23,23 0 0,0 48,46.09 A23,23 0 0,0 27.35,72.99 A23,23 0 0,0 55.95,91.22 A23,23 0 0,0 67.62,83.78' },
  ],
  q: [
    { d: 'M69.92,57.5 A23,23 0 0,0 36.81,50.16 A23,23 0 0,0 32.38,83.78 A23,23 0 0,0 66.26,85.26 A23,23 0 0,0 72.65,65.01' },
    { d: 'M70.01,50 L70.01,116' },
  ],
  r: [
    { d: 'M27,46 L27,92' },
    { d: 'M27,56 A16.1,11.5 0 0,1 62.65,52' },
  ],
  s: [
    { d: 'M62.65,50 C33.9,44 33.9,61 50,69 C66.1,77 66.1,90 38.5,88' },
  ],
  t: [
    { d: 'M50,18 L50,86' },
    { d: 'M50,86 A6,6 0 0,0 58,92' },
    { d: 'M31.6,48 L61.5,48' },
  ],
  u: [
    { d: 'M27,46 L27,86 A23,23 0 0,0 73,86 L73,46' },
  ],
  v: [
    { d: 'M27,46 L50,92' },
    { d: 'M50,92 L73,46' },
  ],
  w: [
    { d: 'M20.1,46 L35.05,92' },
    { d: 'M35.05,92 L50,52' },
    { d: 'M50,52 L64.95,92' },
    { d: 'M64.95,92 L79.9,46' },
  ],
  x: [
    { d: 'M31.6,46 L68.4,92' },
    { d: 'M68.4,46 L31.6,92' },
  ],
  y: [
    { d: 'M31.6,46 L50,75' },
    { d: 'M68.4,46 L38.5,116' },
  ],
  z: [
    { d: 'M30.45,48 L69.55,48 L30.45,90 L69.55,90' },
  ],
};

export default LETTER_STROKES;
