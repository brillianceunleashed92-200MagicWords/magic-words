// MEMORY_MASTER_R1 -- pure, zero-import rules engine for the Memory Master
// module (MemoryMaster_Module_Handoff.md). Same pattern as
// masteryCalibration.js / starKeeper.js / checkinEligibility.js: no DOM, no
// I/O, no other repo imports, so it loads under a plain Node/Playwright test
// without pulling in React/Supabase. Mirrors mockup-P-memory-master.html's
// working reference implementation; structure differs, semantics don't.
//
// Fidelity rule 3 (handoff §3.3): classifyError()'s output is for the
// parent dashboard / analytics ONLY -- never render it on a child-facing
// trial screen.

// ============================================================
// Answer checking (handoff §6)
// ============================================================

// Curly<->straight quotes/apostrophes equivalent; collapse whitespace runs;
// trim. Nothing else -- everything beyond this is exact-match (handoff §6.3).
export function normalize(s) {
  return String(s)
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrect(typed, canonical) {
  return normalize(typed) === normalize(canonical);
}

// Parent-dashboard / analytics classification ONLY (fidelity rule 3 / T14) --
// the child never sees which category an error fell into.
export function classifyError(typed, canonical) {
  const t = normalize(typed);
  const c = normalize(canonical);
  if (t === c) return null;
  const tw = t.split(' ');
  const cw = c.split(' ');
  const strip = (w) => w.replace(/[^A-Za-z']/g, '');
  const tl = tw.map((w) => strip(w).toLowerCase()).join(' ');
  const cl = cw.map((w) => strip(w).toLowerCase()).join(' ');
  if (tl === cl) {
    const tCaps = tw.map((w) => /^[A-Z]/.test(w)).join();
    const cCaps = cw.map((w) => /^[A-Z]/.test(w)).join();
    if (tCaps !== cCaps) return 'capitalization';
    return 'punctuation';
  }
  if (tw.length < cw.length) return 'word_missing';
  if (tw.length > cw.length) return 'word_extra';
  const sortedT = tl.split(' ').slice().sort().join();
  const sortedC = cl.split(' ').slice().sort().join();
  if (sortedT === sortedC) return 'word_order';
  return 'word_spelling';
}

// ============================================================
// Placement (handoff §5 R1-R2, §8)
// ============================================================

// R1 (p. 3): start one level BELOW the child's reading level, minimum 1.
// [PROPOSED - OQ1, awaiting Dr. Blank] Her rule is Reading-Kingdom-relative
// ("one level below reading level"); this 200MW-unit breakpoint table is
// the mockup's placeholder mapping, not yet ratified. Ratification is a
// config edit to this table, not a refactor.
export function UNIT_TO_MM_LEVEL(unit) {
  const raw = unit <= 3 ? 1 : unit <= 6 ? 2 : unit <= 10 ? 3 : unit <= 14 ? 4 : 5;
  return Math.max(1, raw - 1);
}

// R2 (pp. 92-95) / handoff §8 -- dictation Skills Assessment scoring.
// [PROPOSED - confirm with Dr. Blank] Score = correct words + correct
// capitals + correct punctuation, per her unit table. A word is correct
// only with no omitted/added/misplaced letters; max one error per word
// (implemented as whole-word-equality after stripping non-letters, matching
// the mockup's algorithm -- not sub-word Levenshtein).
export function scoreDictation(typed, sentence) {
  const c = normalize(sentence.text);
  const t = normalize(typed);
  const cw = c.split(' ');
  const tw = t.split(' ');
  const bare = (w) => w.replace(/[^A-Za-z']/g, '').toLowerCase();
  let words = 0;
  for (let i = 0; i < cw.length; i++) {
    if (tw[i] && bare(tw[i]) === bare(cw[i])) words++;
  }
  const capIdx = [];
  for (let j = 0; j < cw.length; j++) {
    if (/^[A-Z]/.test(cw[j])) capIdx.push(j);
  }
  let caps = 0;
  for (const idx of capIdx) {
    if (tw[idx] && /^[A-Z]/.test(tw[idx])) caps++;
  }
  const cp = (c.match(/[.?,'"!]/g) || []).join('');
  const tp = (t.match(/[.?,'"!]/g) || []).join('');
  const punc = cp === tp ? sentence.units.punctuation : 0;
  return {
    words: Math.min(words, sentence.units.words),
    caps: Math.min(caps, sentence.units.capitals),
    punc,
  };
}

export function createAssessmentState() {
  return { levelIdx: 0, sentenceIdx: 0, scores: [], status: 'in_progress' };
}

// Scores one dictated sentence and, once every sentence in the current
// level has been scored, resolves the level via assessmentStep.
export function submitDictationAnswer(state, typed, assessmentLevels) {
  const level = assessmentLevels[state.levelIdx];
  const sentence = level.sentences[state.sentenceIdx];
  const score = scoreDictation(typed, sentence);
  const scores = [...state.scores, score];
  const sentenceIdx = state.sentenceIdx + 1;
  if (sentenceIdx < level.sentences.length) {
    return { ...state, sentenceIdx, scores, status: 'in_progress' };
  }
  const total = scores.reduce((sum, s) => sum + s.words + s.caps + s.punc, 0);
  return assessmentStep({ ...state, sentenceIdx, scores }, total, assessmentLevels, level);
}

// pass (>= criterion) -> advance to next level's set; fail -> STOP, placement
// = the level just failed; pass all 5 -> exceeds_program (handoff §8 flow).
export function assessmentStep(state, total, assessmentLevels, level) {
  const passed = total >= level.criterion;
  const isLastLevel = state.levelIdx >= assessmentLevels.length - 1;
  if (passed && !isLastLevel) {
    return { ...state, levelIdx: state.levelIdx + 1, sentenceIdx: 0, scores: [], status: 'in_progress', lastLevelScore: total };
  }
  if (passed && isLastLevel) {
    return { ...state, status: 'exceeds_program', lastLevelScore: total };
  }
  return { ...state, status: 'placed', placementLevel: level.level, lastLevelScore: total };
}

// ============================================================
// Session state machine -- write phase (handoff §5 R5-R9)
// ============================================================

// R8: copy mode fires once the 3rd failed attempt has just happened, i.e.
// the attempt counter's transition from 3 -> 4. Guided mode [PROPOSED -
// awaiting Dr. Blank, ships OFF] pulls that one try earlier (3 instead of
// 4) -- the single number the guided toggle changes.
export const COPY_MODE_AT_ATTEMPT = 4;
export const COPY_MODE_AT_ATTEMPT_GUIDED = 3;
// R9: not completed within 5 tries -> session ends. The attempt counter is
// "the try about to start"; it exceeding 5 means the 6th attempt never runs.
export const FIVE_TRY_STOP_ATTEMPT = 6;

export function createPortionState() {
  return { attempt: 1, segIdx: 0, doneSegs: [], copyModeUsed: false, status: 'writing', lastErrorKind: null };
}

// R5-R6: correct segment -> advance; portion complete once every segment is
// done. R7: any error -> clear the portion's work, restart at segment 0,
// attempt+1, no diff/coaching (fidelity rule 3) -- classifyError's result is
// carried on the state for the parent surface only, never for child-facing
// copy. R8/R9 fire off the resulting attempt count.
export function submitSegment(state, typed, portion, { guided = false } = {}) {
  const segments = portion.segments;
  const seg = segments[state.segIdx];
  if (isCorrect(typed, seg)) {
    const doneSegs = [...state.doneSegs, normalize(typed)];
    const segIdx = state.segIdx + 1;
    const complete = segIdx >= segments.length;
    return { ...state, doneSegs, segIdx, status: complete ? 'portion_complete' : 'writing', lastErrorKind: null };
  }
  const attempt = state.attempt + 1;
  const lastErrorKind = classifyError(typed, seg);
  const base = { ...state, attempt, segIdx: 0, doneSegs: [], lastErrorKind };
  if (attempt >= FIVE_TRY_STOP_ATTEMPT) {
    return { ...base, status: 'session_stopped' };
  }
  const copyAt = guided ? COPY_MODE_AT_ATTEMPT_GUIDED : COPY_MODE_AT_ATTEMPT;
  if (attempt === copyAt && !state.copyModeUsed) {
    return { ...base, status: 'copy_mode', copyModeUsed: true };
  }
  return { ...base, status: 'writing' };
}

// R8: copy mode is untimed practice with the sentence visible -- it doesn't
// itself score. Hidden writing resumes at the same attempt count.
export function exitCopyMode(state) {
  return { ...state, status: 'writing' };
}

// ============================================================
// Session scoring + advancement (handoff §5 R10-R14)
// ============================================================

// R11: a portion counts as clean only if it completed on the very first
// attempt (no errors at all).
export function isPortionFirstTryClean(portionState) {
  return portionState.status === 'portion_complete' && portionState.attempt === 1;
}

// R11: the session checkmark requires BOTH portions clean on their first
// attempt -- portionClean is a 2-element array of true/false/null.
export function sessionCheckmark(portionClean) {
  return portionClean.length === 2 && portionClean.every((c) => c === true);
}

export const CRITERION_WINDOW = 5; // R12: "any 5 consecutive sessions"
export const CRITERION_COUNT = 4; // R12: "4 checkmarks"
export const MAX_SESSIONS_PER_LEVEL = 15; // R13
export const LEVEL_DOWN_FAIL_SESSIONS = 5; // R10
export const MAX_LEVEL = 5; // R14

export function createSessionProgress(level = 1, session = 1) {
  return { level, session, checkHist: [], failSessions: 0 };
}

// Records one session's outcome into the rolling history. aborted = true
// means the session hit the 5-try stop (R9) without completing -- it always
// yields checkmark=false and increments the R10 fail counter.
export function completeSession(progress, { checkmark, aborted }) {
  const checkHist = [...progress.checkHist, !!checkmark && !aborted];
  const failSessions = aborted ? progress.failSessions + 1 : progress.failSessions;
  return { ...progress, checkHist, failSessions };
}

// R10 (checked first, matching the mockup's afterSession() order) -> R12 ->
// R13 -> otherwise continue to the next session. R14: advancing past Level 5
// is program_complete instead of level_up.
export function advanceCheck(progress) {
  if (progress.failSessions >= LEVEL_DOWN_FAIL_SESSIONS) {
    if (progress.level === 1) {
      return { action: 'pause_program', nextProgress: progress };
    }
    const nextLevel = progress.level - 1;
    return { action: 'level_down', nextLevel, nextProgress: createSessionProgress(nextLevel, 1) };
  }

  const last5 = progress.checkHist.slice(-CRITERION_WINDOW);
  const criterionMet = last5.length === CRITERION_WINDOW && last5.filter(Boolean).length >= CRITERION_COUNT;
  const levelDone = progress.session >= MAX_SESSIONS_PER_LEVEL;

  if (criterionMet || levelDone) {
    const via = criterionMet ? 'fourOfFive' : 'fifteenDone';
    if (progress.level >= MAX_LEVEL) {
      return { action: 'program_complete', via, nextProgress: progress };
    }
    const nextLevel = progress.level + 1;
    return { action: 'level_up', via, nextLevel, nextProgress: createSessionProgress(nextLevel, 1) };
  }

  return { action: 'continue', nextProgress: { ...progress, session: progress.session + 1 } };
}
