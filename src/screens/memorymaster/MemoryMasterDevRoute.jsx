import { useMemo, useState } from 'react';
import { lazy, Suspense } from 'react';
import content from '../../content/memorymaster_content.json';
import { useSpeak } from '../../lib/useSpeak';
import {
  createSessionProgress,
  createPortionState,
  createAssessmentState,
  submitSegment,
  exitCopyMode,
  isPortionFirstTryClean,
  sessionCheckmark,
  completeSession,
  advanceCheck,
  submitDictationAnswer,
  UNIT_TO_MM_LEVEL,
} from '../../lib/memoryMaster';
import { colors, fonts } from './mmTokens';
import HomeIntegration from './HomeIntegration';
import CardScreen from './CardScreen';
import Primer from './Primer';
import Practice from './Practice';
import PlacementChoice from './PlacementChoice';
import SkillsAssessment from './SkillsAssessment';
import ReadPhase from './ReadPhase';
import WritePhase from './WritePhase';
import SessionEnd from './SessionEnd';
import ParentRecord from './ParentRecord';
import { BookIcon, StarIcon } from './icons';

const NotFound = lazy(() => import('../../pages/NotFound.jsx'));

// MEMORY_MASTER_R1 Phase 4 -- env-gated dev route (default OFF; note the
// project's own documented trap: import.meta.env inlines at dev-server
// start, so toggling this flag needs a server restart, not just an edit).
// No home tile, no nav entry, no link from anywhere else in the app --
// reachable by direct URL only. All state below is in-memory for this
// route's lifetime only: no persistence, no DB writes, no telemetry, per
// this run's non-negotiables. [PROPOSED] CHILD_UNIT stands in for a real
// reading-level lookup (out of scope -- R2 territory / no Supabase reads
// in this run).
const FLAG_ENABLED = import.meta.env.VITE_MEMORY_MASTER_ENABLED === 'true';
const CHILD_UNIT = 4;

export default function MemoryMasterDevRoute() {
  if (!FLAG_ENABLED) {
    return (
      <Suspense fallback={null}>
        <NotFound />
      </Suspense>
    );
  }
  return <MemoryMasterModule />;
}

function MemoryMasterModule() {
  const { speak } = useSpeak();
  const assessLevels = content.skills_assessment.levels;

  const [screen, setScreen] = useState('home'); // home|intro|primer|practice|place|assess|read|write|copy|stop|sessend|down|done|parent
  const [placed, setPlaced] = useState(false);
  const [primerDone, setPrimerDone] = useState(false);
  const [mode, setMode] = useState('coach'); // coach|solo [PROPOSED - OQ2]
  const [guided, setGuided] = useState(false); // [PROPOSED] ships OFF -- dev-only toggle, never child-facing copy

  const [progress, setProgress] = useState(createSessionProgress(1, 1));
  const [portionIdx, setPortionIdx] = useState(0);
  const [portionState, setPortionState] = useState(createPortionState());
  const [portionClean, setPortionClean] = useState([null, null]);
  const [typed, setTyped] = useState('');
  const [shift, setShift] = useState(false);
  const [lastCheckmark, setLastCheckmark] = useState(false);
  const [log, setLog] = useState([]);

  const [assessState, setAssessState] = useState(createAssessmentState());
  const [assessTyped, setAssessTyped] = useState('');
  const [assessShift, setAssessShift] = useState(false);
  const [advanceResult, setAdvanceResult] = useState(null); // last advanceCheck() decision, for the level-up/down/complete screens

  const proposedLevel = useMemo(() => UNIT_TO_MM_LEVEL(CHILD_UNIT), []);

  const level = content.program.levels.find((l) => l.level === progress.level);
  const session = level?.sessions.find((s) => s.session === progress.session);
  const portion = session?.portions[portionIdx];

  function beginPlacement() {
    setScreen('place');
  }

  function afterPrimer(next) {
    setPrimerDone(true);
    next();
  }

  function autoPlace() {
    const p = createSessionProgress(proposedLevel, 1);
    setProgress(p);
    setPlaced(true);
    if (!primerDone) {
      setScreen('primer');
      return;
    }
    startPortion(0);
  }

  function startAssessment() {
    setAssessState(createAssessmentState());
    setAssessTyped('');
    setScreen('assess');
  }

  function submitAssessAnswer(text) {
    const next = submitDictationAnswer(assessState, text, assessLevels);
    setAssessState(next);
    setAssessTyped('');
    setAssessShift(false);
    if (next.status === 'in_progress') return;
    // 'placed' or 'exceeds_program' -- a DIFFERENT screen from the initial
    // auto-placement offer (found via the Phase 6 live walk: reusing
    // 'place' here showed the auto-placement copy/button regardless of the
    // actual assessment outcome -- a real bug, not a design choice).
    if (next.status === 'placed') {
      const p = createSessionProgress(next.placementLevel, 1);
      setProgress(p);
      setPlaced(true);
    }
    setScreen('assess-result');
  }

  function startPortion(idx = 0) {
    setPortionIdx(idx);
    setPortionState(createPortionState());
    setTyped('');
    setShift(false);
    setScreen('read');
  }

  function readOk() {
    setScreen('write');
  }

  function submitWriteAnswer(text) {
    const next = submitSegment(portionState, text, portion, { guided });
    if (next.lastErrorKind) {
      setLog((l) => [...l, { level: progress.level, session: progress.session, portion: portionIdx + 1, attempt: next.attempt, kind: next.lastErrorKind }]);
    }
    setPortionState(next);
    setTyped('');
    if (next.status === 'portion_complete') {
      const clean = isPortionFirstTryClean(next);
      const nextPortionClean = [...portionClean];
      nextPortionClean[portionIdx] = clean;
      setPortionClean(nextPortionClean);
      if (portionIdx === 0) {
        setPortionIdx(1);
        setPortionState(createPortionState());
        setScreen('read');
        return;
      }
      finishSession(true, nextPortionClean);
      return;
    }
    if (next.status === 'copy_mode') {
      setScreen('copy');
      return;
    }
    if (next.status === 'session_stopped') {
      setScreen('stop');
      return;
    }
    // 'writing' -- stay on the write screen, error framing shown there.
  }

  function exitCopy() {
    setPortionState((s) => exitCopyMode(s));
    setTyped('');
    setScreen('write');
  }

  function finishSession(completed, clean) {
    const checkmark = completed && sessionCheckmark(clean);
    setLastCheckmark(checkmark);
    setProgress((p) => completeSession(p, { checkmark, aborted: !completed }));
    setScreen('sessend');
  }

  function stopSession() {
    finishSession(false, portionClean);
  }

  function afterSessionEnd() {
    const wasAborted = !lastCheckmark && portionState.status === 'session_stopped';
    const decision = advanceCheck(progress, { aborted: wasAborted });
    setAdvanceResult(decision);
    setProgress(decision.nextProgress);
    setPortionClean([null, null]);
    if (decision.action === 'pause_program' || decision.action === 'level_down') {
      setScreen('down');
      return;
    }
    if (decision.action === 'program_complete') {
      setScreen('done');
      return;
    }
    if (decision.action === 'level_up') {
      setScreen('levelup');
      return;
    }
    // 'continue' or 'retry_session'
    startPortion(0);
  }

  function afterLevelUp() {
    startPortion(0);
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.sky, color: colors.cloud, fontFamily: fonts.body, padding: '22px 16px 40px' }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: '.82rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.72)' }}>
            Memory Master{placed ? ` · L${progress.level}` : ''}
          </div>
          <DevControls mode={mode} setMode={setMode} guided={guided} setGuided={setGuided} onParent={() => setScreen('parent')} />
        </div>

        {screen === 'home' && (
          <HomeIntegration placed={placed} level={progress.level} sessionNum={progress.session} onEnterMM={() => setScreen(placed ? 'read' : 'intro')} onPractice={() => setScreen('practice')} />
        )}

        {screen === 'intro' && (
          <CardScreen icon={<BookIcon color={colors.ink} />} title="Read it. Remember it. Write it exactly." buttonLabel="Start" onButton={beginPlacement}>
            You&rsquo;ll read a sentence. Then it disappears &mdash; and you write it back exactly: every word, every capital letter, and every mark.
            <div style={{ color: colors.ink, fontWeight: 700, marginTop: 8 }}>If something isn&rsquo;t right, we just start that one over. No fuss.</div>
          </CardScreen>
        )}

        {screen === 'primer' && <Primer speak={speak} onDone={() => afterPrimer(() => startPortion())} />}

        {screen === 'practice' && <Practice speak={speak} onBack={() => setScreen('home')} />}

        {screen === 'place' && (
          <PlacementChoice readingUnit={CHILD_UNIT} proposedLevel={proposedLevel} onAutoPlace={autoPlace} onRunAssessment={startAssessment} />
        )}

        {screen === 'assess' && (
          <SkillsAssessment
            assessLevels={assessLevels}
            levelIdx={assessState.levelIdx}
            sentenceIdx={assessState.sentenceIdx}
            typed={assessTyped}
            setTyped={setAssessTyped}
            shift={assessShift}
            setShift={setAssessShift}
            onSubmit={submitAssessAnswer}
            speak={speak}
          />
        )}

        {screen === 'assess-result' && assessState.status === 'exceeds_program' && (
          <CardScreen icon={<StarIcon color={colors.ink} />} iconBg={colors.sun} title="Skills check complete" buttonLabel="Back to the galaxy" onButton={() => setScreen('home')}>
            This child passed every level of the skills check &mdash; their writing already exceeds Memory Master. We would offer maintenance or skip the program rather than enroll them.
          </CardScreen>
        )}
        {screen === 'assess-result' && assessState.status === 'placed' && (
          <CardScreen icon={<BookIcon color={colors.ink} />} iconBg={colors.mint} title="Finding this child's level" buttonLabel={`Start at Level ${assessState.placementLevel}`} onButton={() => startPortion(0)}>
            Skills check done. This child scored <b>{assessState.lastLevelScore}</b> on Level {assessState.placementLevel} (needed {assessLevels[assessState.levelIdx].criterion}), so Memory Master starts at <b>Level {assessState.placementLevel}</b> &mdash; the level they just missed.
          </CardScreen>
        )}

        {screen === 'read' && portion && (
          <ReadPhase portion={portion} mode={mode} level={progress.level} sessionNum={progress.session} portionNum={portionIdx + 1} onReadOk={readOk} speak={speak} />
        )}

        {screen === 'write' && portion && (
          <WritePhase
            key={`${portionState.segIdx}-${portionState.attempt}`}
            portion={portion}
            portionState={portionState}
            level={progress.level}
            sessionNum={progress.session}
            portionNum={portionIdx + 1}
            typed={typed}
            setTyped={setTyped}
            shift={shift}
            setShift={setShift}
            onSubmit={submitWriteAnswer}
            mode={mode}
            speak={speak}
          />
        )}

        {screen === 'copy' && portion && (
          <WritePhase
            portion={portion}
            portionState={portionState}
            level={progress.level}
            sessionNum={progress.session}
            portionNum={portionIdx + 1}
            typed={typed}
            setTyped={setTyped}
            shift={shift}
            setShift={setShift}
            onSubmit={exitCopy}
            mode={mode}
            speak={speak}
            isCopyMode
          />
        )}

        {screen === 'stop' && (
          <CardScreen title="That's enough for today" buttonLabel="Finish up" onButton={stopSession}>
            This one is tricky! We&rsquo;ll do this same one again next time &mdash; you&rsquo;ll have it.
          </CardScreen>
        )}

        {screen === 'sessend' && <SessionEnd checkmark={lastCheckmark} checkHist={progress.checkHist} onDone={afterSessionEnd} />}

        {screen === 'down' && advanceResult && (
          <CardScreen title={advanceResult.action === 'pause_program' ? 'Time for a break' : `Back to Level ${advanceResult.nextLevel}`} buttonLabel="OK" onButton={() => setScreen('home')}>
            {advanceResult.action === 'pause_program'
              ? 'Memory Master is a bit ahead right now. We will pause it for about a month and try again.'
              : 'These sentences were a stretch. Memory Master steps back one level to build the memory more comfortably.'}
          </CardScreen>
        )}

        {screen === 'levelup' && advanceResult && (
          <CardScreen icon={<StarIcon color={colors.ink} />} iconBg={colors.sun} title={`Level ${advanceResult.nextLevel}!`} buttonLabel="Keep going" onButton={afterLevelUp}>
            {advanceResult.via === 'fourOfFive'
              ? 'Four checkmarks in five sessions. Moving up, even though the level is not finished.'
              : `All 15 sessions of Level ${advanceResult.nextLevel - 1} are done. Onward.`}
          </CardScreen>
        )}

        {screen === 'done' && (
          <CardScreen icon={<StarIcon color={colors.ink} />} iconBg={colors.sun} title="Memory Master" buttonLabel="Back to the galaxy" onButton={() => setScreen('home')}>
            All five levels finished. Reading and writing memory is doing the work now.
          </CardScreen>
        )}

        {screen === 'parent' && (
          <ParentRecord level={progress.level} sessionsDone={progress.checkHist.length} checkHist={progress.checkHist} log={log} onBack={() => setScreen('home')} />
        )}
      </div>
    </div>
  );
}

// Dev-only controls -- this route itself is already flag-gated and
// unreachable in production, so a small QA bar here (mirroring the
// mockup's own demo menu) doesn't add a second surface to gate. Guided
// mode's toggle exists only to demo the alternative; it changes exactly
// COPY_MODE_AT_ATTEMPT_GUIDED (3) vs COPY_MODE_AT_ATTEMPT (4), ships OFF.
function DevControls({ mode, setMode, guided, setGuided, onParent }) {
  const btn = { fontFamily: fonts.display, fontWeight: 700, fontSize: '.68rem', color: colors.cloud, background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '5px 10px', cursor: 'pointer' };
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" style={btn} onClick={() => setMode((m) => (m === 'coach' ? 'solo' : 'coach'))}>
        Mode: {mode === 'coach' ? 'Coach' : 'Solo'}
      </button>
      <button type="button" style={btn} onClick={() => setGuided((g) => !g)}>
        Guided: {guided ? 'ON' : 'off'}
      </button>
      <button type="button" style={btn} onClick={onParent}>
        Record form
      </button>
    </div>
  );
}
