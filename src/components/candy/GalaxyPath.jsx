import { useEffect, useRef, useState } from 'react';
import { buildGalaxyPath } from '../../lib/buildGalaxyPath';
import WordNode from './WordNode';
import NovaSprite from './NovaSprite';
import { colors } from '../../theme/tokens';
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';

// Ports mockup-D-candy-galaxy.html's scroll-driven path mechanic to React:
// scroll progress through the section drives an SVG stroke-dashoffset (the
// "golden path" drawing in) and Nova's position/rotation via
// path.getPointAtLength — same technique, same feel, generalized to any
// node count via buildGalaxyPath.
export default function GalaxyPath({ words, onNodeTap, speak }) {
  const zoneRef = useRef(null);
  const litPathRef = useRef(null);
  const novaRef = useRef(null);
  const [shownCount, setShownCount] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const { d, points, viewWidth, height } = buildGalaxyPath(words.length);

  useEffect(() => {
    const litPath = litPathRef.current;
    if (!litPath) return;
    const total = litPath.getTotalLength();
    litPath.style.strokeDasharray = String(total);

    if (reducedMotion) {
      // Reduced motion: show the full path immediately, no scroll-tied
      // animation loop. Node visibility for this case is derived directly
      // at render time (see `effectiveShownCount` below) rather than via
      // setState here.
      litPath.style.strokeDashoffset = '0';
      return;
    }

    litPath.style.strokeDashoffset = String(total);
    let raf;

    function frame() {
      const zone = zoneRef.current;
      if (!zone) { raf = requestAnimationFrame(frame); return; }
      const r = zone.getBoundingClientRect();
      const vh = window.innerHeight;
      const prog = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height * 0.9)));

      litPath.style.strokeDashoffset = String(total * (1 - prog));

      const pt = litPath.getPointAtLength(total * prog);
      const ahead = litPath.getPointAtLength(Math.min(total, total * prog + 2));
      const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * (180 / Math.PI);
      if (novaRef.current) {
        const scaleX = zone.clientWidth / viewWidth;
        novaRef.current.style.transform =
          `translate(${pt.x * scaleX - 44}px, ${pt.y - 44}px) rotate(${Math.max(-22, Math.min(22, angle * 0.3))}deg)`;
      }

      setShownCount(Math.round(prog * words.length));
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [words.length, viewWidth, reducedMotion]);

  const effectiveShownCount = reducedMotion ? words.length : shownCount;

  return (
    <div ref={zoneRef} style={{ position: 'relative', height }}>
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height, overflow: 'visible' }}
      >
        <path d={d} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={14} strokeLinecap="round" strokeDasharray=".1 26" />
        <path
          ref={litPathRef}
          d={d}
          fill="none"
          stroke={colors.sun}
          strokeWidth={14}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 12px rgba(255,197,49,.7))` }}
        />
      </svg>

      {points.map((pt, i) => {
        const w = words[i];
        if (!w) return null;
        return (
          <WordNode
            key={w.word}
            word={w.word}
            status={w.status}
            percent={w.percent}
            x={`calc(${(pt.x / viewWidth) * 100}% - 48px)`}
            y={pt.y - 48}
            show={i <= effectiveShownCount}
            onTap={() => onNodeTap?.(w)}
            speak={speak}
          />
        );
      })}

      {!reducedMotion && (
        <div ref={novaRef} style={{ position: 'absolute', left: 0, top: 0, width: 88, height: 88, zIndex: 5, pointerEvents: 'none' }}>
          <NovaSprite state="fly" size={88} />
        </div>
      )}
    </div>
  );
}
