import { useEffect, useMemo, useRef, useState } from 'react';
import { colors, fonts, shadows } from '../theme/tokens';
import { playAudio, fetchAudio } from './gameAudio';
import { getPromptText } from './promptText';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';
import WordArt from '../components/WordArt';
import { NovaPorthole, ConfettiStars } from './lessonChrome';
import { LETTER_STROKES, LETTER_GRID } from '../letters/letterStrokes';

// Draw It — semantic-encoding activity (MLC 10-activity table), rebuilt from
// freeform drawing into LETTER TRACING (docs/200MW_Prompt5_Draw_It_Tracing.md).
// Freeform drawing had no literacy value; tracing ties motor letter-formation
// to the word itself. Errorless by construction: off-path never fails, it
// only re-cues — there is no way to get a letter "wrong," only to finish it.
//
// Audio contract (heightened here — Blank's method is anti-phonics, and
// letter tracing sits right at the danger line): the ONLY spoken audio is
// the whole word, via the shared singleton. Never letter sounds, never
// letter names, never blending. On-screen letterforms are the point (it IS
// letter tracing) — that's independent of the "no letterforms in WordArt"
// rule, which governs the illustration only.
//
// Scoring contract preserved byte-for-byte from the old freeform version:
// exactly one onAnswer({correct:true, responseTimeMs, firstTry:true}) call
// per word — draw_it stays in SCORELESS_GAME_TYPES (questProgress.js), this
// pass does not touch that. The old canvas's PNG-to-Storage +  magic_moments
// write is gone along with the canvas itself — there is no freeform artifact
// left to save (see docs/DRAW_IT_TRACING_REPORT.md NOTES for this called-out
// consequence). `userId`/`childId` props are no longer needed for that
// reason; GameEngine.jsx's render call site was updated to stop passing them.

const TOLERANCE = 15; // path-local units (grid is 100 wide/120 tall) — generous for small fingers
const DEMO_MS = 900;
const IDLE_MS = 5000;
const STAGE_STROKE_WIDTH = 10;

function samplePath(pathEl) {
  const total = pathEl.getTotalLength();
  const steps = 90;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const len = (total * i) / steps;
    const p = pathEl.getPointAtLength(len);
    pts.push({ x: p.x, y: p.y, len });
  }
  return { total, pts };
}

function nearestOnPath(x, y, pts) {
  let best = { distance: Infinity, len: 0 };
  for (const p of pts) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < best.distance) best = { distance: d, len: p.len };
  }
  return best;
}

export default function DrawIt({ quiz, onAnswer, encouragement }) {
  const word = useMemo(() => (quiz?.word ?? '').toLowerCase().split('').filter((ch) => LETTER_STROKES[ch]), [quiz?.word]);
  const reducedMotion = usePrefersReducedMotion();

  const [letterIdx, setLetterIdx] = useState(0);
  const [strokeIdx, setStrokeIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [demoOffset, setDemoOffset] = useState(0);
  const [showDemo, setShowDemo] = useState(!reducedMotion);
  const [interactive, setInteractive] = useState(reducedMotion);
  const [recuePulse, setRecuePulse] = useState(false);
  const [justCompleted, setJustCompleted] = useState(-1); // letter index mid mint-tick
  const [novaState, setNovaState] = useState('idle');
  const [message, setMessage] = useState('Trace the letter, start at the dot!');
  const [confetti, setConfetti] = useState(false);
  const [wordDone, setWordDone] = useState(false);

  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const sampledRef = useRef({ total: 0, pts: [] });
  const progressRef = useRef(0);
  const activeRef = useRef(false);
  const idleTimerRef = useRef(null);
  const startRef = useRef(Date.now());
  const correctChipRef = useRef(null);

  const letter = word[letterIdx];
  const strokes = letter ? LETTER_STROKES[letter] : null;
  const strokeD = strokes?.[strokeIdx]?.d;

  // Reset on a new word.
  useEffect(() => {
    setLetterIdx(0);
    setStrokeIdx(0);
    setJustCompleted(-1);
    setNovaState('idle');
    setMessage('Trace the letter, start at the dot!');
    setWordDone(false);
    startRef.current = Date.now();
  }, [quiz?.word]);

  // Carrier prompt — every activity speaks one on mount, matches the
  // pre-existing pattern (was already true for the old freeform version).
  useEffect(() => {
    fetchAudio(getPromptText(quiz, 'draw_it')).then(playAudio);
  }, [quiz?.word]);

  // New stroke: measure the guide path, reset progress, (re)start the demo.
  useEffect(() => {
    if (!strokeD || !pathRef.current) return;
    sampledRef.current = samplePath(pathRef.current);
    progressRef.current = 0;
    setProgress(0);
    setDemoOffset(sampledRef.current.total);
    setInteractive(reducedMotion);
    setShowDemo(!reducedMotion);
    return () => clearIdleTimer();
  }, [letterIdx, strokeIdx, strokeD, reducedMotion]);

  function clearIdleTimer() {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
  }

  function armIdleTimer() {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      if (reducedMotion) {
        setRecuePulse(true);
        setTimeout(() => setRecuePulse(false), 500);
      } else {
        setDemoOffset(sampledRef.current.total);
        setInteractive(false);
        setShowDemo(true);
      }
    }, IDLE_MS);
  }

  // Demo draw animation — draws the guide once before the child traces.
  useEffect(() => {
    if (!showDemo) return;
    let raf;
    const total = sampledRef.current.total;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / DEMO_MS);
      setDemoOffset(total * (1 - t));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setShowDemo(false);
        setInteractive(true);
        armIdleTimer();
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDemo]);

  function toSvgPoint(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  async function completeWord() {
    clearIdleTimer();
    setInteractive(false);
    setWordDone(true);
    const responseTimeMs = Date.now() - startRef.current;
    const url = await fetchAudio(quiz.word);
    await new Promise((resolve) => {
      const audio = url ? playAudio(url) : null;
      if (!audio) { resolve(); return; }
      audio.onended = resolve;
      audio.onerror = resolve;
    });
    setNovaState('correct');
    setConfetti(true);
    setMessage(encouragement ?? `You traced "${quiz.word}"!`);
    setTimeout(() => setConfetti(false), 900);
    setTimeout(() => {
      setNovaState('idle');
      onAnswer({ correct: true, responseTimeMs, firstTry: true });
    }, 1200);
  }

  function completeStroke() {
    clearIdleTimer();
    // Lock out further pointer handling immediately — strokeIdx/letterIdx
    // don't update until the next render (or, for a letter/word boundary,
    // until a queued setTimeout fires), so without this a second pointerdown
    // during that gap would re-complete the same already-finished stroke
    // and double-fire completeWord()/onAnswer for one word.
    setInteractive(false);
    if (strokeIdx + 1 < strokes.length) {
      setStrokeIdx((i) => i + 1);
      return;
    }
    // Letter complete — small mint tick, not the full §6 celebration.
    setJustCompleted(letterIdx);
    setTimeout(() => setJustCompleted(-1), 500);
    if (letterIdx + 1 < word.length) {
      setTimeout(() => {
        setLetterIdx((i) => i + 1);
        setStrokeIdx(0);
      }, 550);
    } else {
      setTimeout(() => completeWord(), 550);
    }
  }

  function handlePointerDown(e) {
    if (!interactive) return;
    activeRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    handlePointerMove(e);
  }

  function handlePointerMove(e) {
    if (!interactive || !activeRef.current) return;
    armIdleTimer();
    const pt = toSvgPoint(e.clientX, e.clientY);
    if (!pt) return;
    const { distance, len } = nearestOnPath(pt.x, pt.y, sampledRef.current.pts);
    if (distance <= TOLERANCE) {
      setRecuePulse(false);
      if (len >= progressRef.current) {
        progressRef.current = len;
        setProgress(len);
        if (len >= sampledRef.current.total - 1) {
          activeRef.current = false;
          completeStroke();
        }
      }
    } else {
      setRecuePulse(true);
      setTimeout(() => setRecuePulse(false), 400);
    }
  }

  function handlePointerUp() {
    activeRef.current = false;
  }

  function handleRedoLetter() {
    clearIdleTimer();
    setStrokeIdx(0);
    setJustCompleted(-1);
  }

  useEffect(() => () => clearIdleTimer(), []);

  if (!letter || !strokeD) return null;

  const total = sampledRef.current.total || 1;
  const traceOffset = Math.max(0, total - progress);
  const startPt = pathRef.current
    ? (() => { try { return pathRef.current.getPointAtLength(0); } catch { return null; } })()
    : null;
  const aheadPt = pathRef.current
    ? (() => { try { return pathRef.current.getPointAtLength(Math.min(total * 0.2, 8)); } catch { return null; } })()
    : null;
  const arrowAngle = startPt && aheadPt ? (Math.atan2(aheadPt.y - startPt.y, aheadPt.x - startPt.x) * 180) / Math.PI : 0;

  const showCue = !!quiz?.pictureEligible;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 24px' }}>
      <ConfettiStars active={confetti && !reducedMotion} originRef={correctChipRef} />
      <NovaPorthole novaState={novaState} message={message} />

      {showCue && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 14px' }}>
          <div style={{ background: colors.cloud, borderRadius: 24, padding: 14, boxShadow: shadows.chunkSm }}>
            <WordArt word={quiz.word} size={80} />
          </div>
        </div>
      )}

      {/* Word strip — full word shown, current letter highlighted, completed letters ticked mint */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
        {word.map((ch, i) => {
          const isDone = i < letterIdx;
          const isCurrent = i === letterIdx;
          const isPopping = justCompleted === i;
          return (
            <div
              key={i}
              style={{
                width: 40, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fonts.display, fontWeight: 700, fontSize: '1.3rem', textTransform: 'lowercase',
                background: isDone ? colors.mint : isCurrent ? colors.cloud : `${colors.cloud}66`,
                color: isDone ? colors.ink : isCurrent ? colors.ink : `${colors.cloud}bb`,
                boxShadow: isCurrent ? shadows.chunkSm : 'none',
                transform: isPopping ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform .25s cubic-bezier(.3,1.7,.4,1), background .3s, color .3s',
              }}
            >
              {ch}
            </div>
          );
        })}
      </div>

      {/* Tracing stage */}
      <div ref={correctChipRef} style={{
        background: colors.cloud, borderRadius: 32, boxShadow: shadows.chunk, padding: 18,
        maxWidth: 300, margin: '0 auto',
      }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${LETTER_GRID.width} ${LETTER_GRID.height}`}
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: interactive ? 'pointer' : 'default' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* faint always-visible guide of the full stroke shape */}
          <path
            ref={pathRef}
            d={strokeD}
            fill="none"
            stroke={`${colors.ink}26`}
            strokeWidth={STAGE_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 9"
          />
          {/* demo preview (skipped entirely under prefers-reduced-motion) */}
          {showDemo && !reducedMotion && (
            <path
              d={strokeD}
              fill="none"
              stroke={colors.sky}
              strokeWidth={STAGE_STROKE_WIDTH - 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={total}
              strokeDashoffset={demoOffset}
            />
          )}
          {/* child's traced fill, grows from the start point as they trace */}
          {!showDemo && (
            <path
              d={strokeD}
              fill="none"
              stroke={colors.sun}
              strokeWidth={STAGE_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={total}
              strokeDashoffset={traceOffset}
            />
          )}
          {/* start dot + direction arrow — the locked green (mint) cue */}
          {startPt && (
            <g style={{
              transform: recuePulse ? 'scale(1.35)' : 'scale(1)',
              transformOrigin: `${startPt.x}px ${startPt.y}px`,
              transition: 'transform .3s cubic-bezier(.3,1.7,.4,1)',
              opacity: progress > 2 ? 0.35 : 1,
            }}>
              <circle cx={startPt.x} cy={startPt.y} r={5.5} fill={colors.mint} />
              <polygon
                points="0,-5 10,0 0,5"
                fill={colors.mint}
                transform={`translate(${startPt.x + Math.cos((arrowAngle * Math.PI) / 180) * 14} ${startPt.y + Math.sin((arrowAngle * Math.PI) / 180) * 14}) rotate(${arrowAngle})`}
              />
            </g>
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        <button
          onClick={handleRedoLetter}
          disabled={wordDone}
          style={{
            minHeight: 44, padding: '10px 22px', borderRadius: 100, border: 'none',
            background: colors.cloud, color: colors.ink, fontFamily: fonts.display, fontWeight: 700,
            boxShadow: shadows.chunkSm, cursor: wordDone ? 'default' : 'pointer', opacity: wordDone ? 0.5 : 1,
          }}
          onMouseDown={(e) => { if (!wordDone) e.currentTarget.style.transform = 'translateY(5px)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
