import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  normalize,
  isCorrect,
  classifyError,
  UNIT_TO_MM_LEVEL,
  scoreDictation,
  createAssessmentState,
  submitDictationAnswer,
  createPortionState,
  submitSegment,
  exitCopyMode,
  isPortionFirstTryClean,
  sessionCheckmark,
  createSessionProgress,
  completeSession,
  advanceCheck,
} from "../src/lib/memoryMaster.js";

// MEMORY_MASTER_R1 Phase 3 -- the acceptance suite IS the spec
// (MemoryMaster_Module_Handoff.md §11, T1-T14). Pure Node assertions
// against src/lib/memoryMaster.js -- no browser/page, no DOM, matching the
// precedent set by tests/blank-engine-weighting.spec.js for testing an
// extracted pure module directly.

const content = JSON.parse(readFileSync("src/content/memorymaster_content.json", "utf8"));

function portionAt(levelNum, sessionNum, portionNum) {
  const level = content.program.levels.find((l) => l.level === levelNum);
  const session = level.sessions.find((s) => s.session === sessionNum);
  return session.portions.find((p) => p.portion === portionNum);
}

test("content-tiling invariant: every one of the 150 portions' segments join to its display text exactly", () => {
  let count = 0;
  for (const level of content.program.levels) {
    for (const session of level.sessions) {
      for (const portion of session.portions) {
        count++;
        expect(portion.segments.join(" ")).toBe(portion.display);
      }
    }
  }
  expect(count).toBe(150);
});

test("T1: error on the last word of the last segment restarts the whole portion, attempt = 2", () => {
  const portion = portionAt(1, 1, 1); // "Can some bugs jump?" / ["Can some", "bugs jump?"]
  let state = createPortionState();
  state = submitSegment(state, portion.segments[0], portion); // segment 0 correct
  expect(state.segIdx).toBe(1);
  expect(state.doneSegs).toEqual(["Can some"]);

  state = submitSegment(state, "bugs jump", portion); // last word/segment, missing "?"
  expect(state.status).toBe("writing");
  expect(state.attempt).toBe(2);
  expect(state.segIdx).toBe(0); // restarted at the FIRST segment, not segment 1
  expect(state.doneSegs).toEqual([]); // the earlier-correct segment's work was cleared too
});

test("T2: lowercase first letter, period-for-question-mark, and a missing comma are all errors", () => {
  expect(isCorrect("can some bugs jump?", "Can some bugs jump?")).toBe(false);
  expect(isCorrect("Can some bugs jump.", "Can some bugs jump?")).toBe(false);
  const p1 = portionAt(1, 12, 1); // "This is a toy, but it is not a robot."
  expect(p1.segments[0]).toBe("This is a toy,");
  expect(isCorrect("This is a toy", p1.segments[0])).toBe(false); // missing comma
});

test("T3: 3rd failed attempt enters copy mode once; hidden writing resumes at attempt 4", () => {
  const portion = portionAt(1, 1, 1);
  let state = createPortionState();
  state = submitSegment(state, "wrong", portion); // fail 1 -> attempt 2
  expect(state.status).toBe("writing");
  state = submitSegment(state, "wrong", portion); // fail 2 -> attempt 3
  expect(state.status).toBe("writing");
  state = submitSegment(state, "wrong", portion); // fail 3 -> attempt 4, copy mode
  expect(state.status).toBe("copy_mode");
  expect(state.attempt).toBe(4);
  expect(state.copyModeUsed).toBe(true);

  state = exitCopyMode(state);
  expect(state.status).toBe("writing");
  expect(state.attempt).toBe(4); // hidden-writing attempts resume AT attempt 4, not reset to 1

  // Copy mode must fire only once per portion, even after further errors.
  state = submitSegment(state, "wrong", portion); // fail 4 -> attempt 5
  expect(state.status).toBe("writing");
});

test("T4: 5th failed attempt ends the session without a checkmark; the same session repeats (no advanceCheck criterion evaluation)", () => {
  const portion = portionAt(1, 1, 1);
  let state = createPortionState();
  for (let i = 0; i < 4; i++) state = submitSegment(state, "wrong", portion);
  expect(state.status).toBe("writing"); // 4th failure -> attempt 5, still writing
  state = submitSegment(state, "wrong", portion); // 5th failure -> attempt 6, stop
  expect(state.status).toBe("session_stopped");
  expect(state.attempt).toBe(6);

  let progress = createSessionProgress(2, 7);
  progress = completeSession(progress, { checkmark: false, aborted: true });
  expect(progress.checkHist.at(-1)).toBe(false);
  expect(progress.failSessions).toBe(1);

  const decision = advanceCheck(progress, { aborted: true });
  expect(decision.action).toBe("retry_session");
  expect(decision.nextProgress.session).toBe(7); // same session number, not incremented
});

test("T5: portion 1 clean on attempt 2 + portion 2 clean on attempt 1 -> NO checkmark", () => {
  const p1State = { status: "portion_complete", attempt: 2 };
  const p2State = { status: "portion_complete", attempt: 1 };
  const portionClean = [isPortionFirstTryClean(p1State), isPortionFirstTryClean(p2State)];
  expect(portionClean).toEqual([false, true]);
  expect(sessionCheckmark(portionClean)).toBe(false);
});

test("T6: checkmark pattern across 5 consecutive sessions (4 of 5) advances immediately, before session 15", () => {
  const progress = { level: 1, session: 5, checkHist: [true, true, false, true, true], failSessions: 0 };
  const decision = advanceCheck(progress);
  expect(decision.action).toBe("level_up");
  expect(decision.via).toBe("fourOfFive");
  expect(decision.nextLevel).toBe(2);
  expect(progress.session).toBeLessThan(15);
});

test("T7: 15 sessions completed, criterion never met -> advance anyway", () => {
  const checkHist = new Array(15).fill(false);
  checkHist[10] = true; // fewer than 4 of the last 5 -- criterion not met
  const progress = { level: 1, session: 15, checkHist, failSessions: 0 };
  const decision = advanceCheck(progress);
  expect(decision.action).toBe("level_up");
  expect(decision.via).toBe("fifteenDone");
  expect(decision.nextLevel).toBe(2);
});

test("T8: the 5th five-try-failure session within a level triggers level-down; at Level 1 it pauses the program", () => {
  const atLevel2 = { level: 2, session: 9, checkHist: [], failSessions: 5 };
  const down = advanceCheck(atLevel2);
  expect(down.action).toBe("level_down");
  expect(down.nextLevel).toBe(1);
  expect(down.nextProgress.session).toBe(1);
  expect(down.nextProgress.failSessions).toBe(0);

  const atLevel1 = { level: 1, session: 9, checkHist: [], failSessions: 5 };
  const paused = advanceCheck(atLevel1);
  expect(paused.action).toBe("pause_program");
});

test("T9: assessment passes L1 (score 15), fails L2 (<16) -> placement Level 2, L3-L5 never presented", () => {
  const levels = content.skills_assessment.levels;
  let state = createAssessmentState();
  expect(state.levelIdx).toBe(0);

  // Answer every L1 sentence exactly right -> full marks, well above criterion 15.
  for (const sentence of levels[0].sentences) {
    state = submitDictationAnswer(state, sentence.text, levels);
  }
  expect(state.status).toBe("in_progress");
  expect(state.levelIdx).toBe(1); // advanced to L2

  // Answer every L2 sentence with nothing typed -> score 0, well below criterion 16.
  for (const sentence of levels[1].sentences) {
    state = submitDictationAnswer(state, "", levels);
  }
  expect(state.status).toBe("placed");
  expect(state.placementLevel).toBe(2); // placement = the level just failed
  expect(state.levelIdx).toBe(1); // never advanced into L3 (index 2)
});

test("T10: a double space is corrected by whitespace collapse", () => {
  const p = portionAt(1, 3, 1); // "The boys are not here."
  expect(p.display).toBe("The boys are not here.");
  expect(isCorrect("The  boys are not here.", p.display)).toBe(true);
});

test("T11: a curly apostrophe from a system keyboard is corrected by normalization", () => {
  const p = portionAt(4, 2, 2); // "...but she couldn't."
  const canonical = p.segments.find((s) => s.includes("couldn't"));
  expect(canonical).toBeTruthy();
  const curly = canonical.replace("couldn't", "couldn’t");
  expect(isCorrect(curly, canonical)).toBe(true);
});

test("T12: R1 places one level below reading level, minimum 1", () => {
  // [PROPOSED - OQ1] exact 200MW-unit breakpoints are unratified; this
  // exercises the ratified arithmetic itself (one level below, floored at
  // 1) using a unit whose proposed bucket is reading-level 3, matching the
  // handoff's own illustrative example ("reading level 3 -> Level 2").
  expect(UNIT_TO_MM_LEVEL(8)).toBe(2); // bucket 3 (unit 7-10) -> one below -> 2
  expect(UNIT_TO_MM_LEVEL(1)).toBe(1); // bucket 1, floored at minimum 1 (not 0)
});

test("T13: a portion requiring quotation marks is only correct with them typed", () => {
  const p = portionAt(2, 10, 1); // '"We want to swim and run. Can we do both those things there?"'
  const seg = p.segments[0];
  expect(seg.startsWith('"')).toBe(true);
  const withoutQuote = seg.slice(1);
  expect(isCorrect(withoutQuote, seg)).toBe(false);
  expect(isCorrect(seg, seg)).toBe(true);
});

test("T14: error detail is computed for the parent/analytics surface but never carried in the child-facing status", () => {
  const portion = portionAt(1, 1, 1);
  const state = createPortionState();
  const next = submitSegment(state, "can some", portion); // lowercase -> capitalization error
  expect(next.lastErrorKind).toBe("capitalization"); // available for the parent surface (T14, handoff §7.6)
  // The status field drives what the child sees; it must be one of the
  // generic session-flow states, never an error-kind-specific value.
  expect(["writing", "copy_mode", "session_stopped"]).toContain(next.status);
});

test("no-autocapitalization: typing the right words without the capital key is still an error", () => {
  const p = portionAt(1, 6, 1); // "The rockets are flying."
  expect(isCorrect(p.display.toLowerCase(), p.display)).toBe(false);
});

test("scoreDictation: correct words + correct capitals + correct punctuation, matching the unit table", () => {
  const sentence = content.skills_assessment.levels[0].sentences[0]; // "The kid is not a girl."
  const perfect = scoreDictation(sentence.text, sentence);
  expect(perfect).toEqual({ words: sentence.units.words, caps: sentence.units.capitals, punc: sentence.units.punctuation });

  const noCapNoPunc = scoreDictation("the kid is not a girl", sentence);
  expect(noCapNoPunc.caps).toBe(0);
  expect(noCapNoPunc.punc).toBe(0);
  expect(noCapNoPunc.words).toBe(sentence.units.words);
});
