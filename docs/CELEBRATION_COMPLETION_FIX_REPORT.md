# Celebration & Completion Safety Net — Fix Report

Branch: `fix/celebration-completion-safety-net`. Bug-fix pass only — no
activity redesign, content, art, copy, or audio changes.

## ROOT CAUSE(S)

### Bugs 1, 2, 4 (Match & Sort / Word Hunt / Say It with Nova mid-session celebration misfires) — could not reproduce despite extensive testing

Investigated thoroughly before concluding this. Steps taken:

1. **Code review**: `WordHunt`, `RhymeTime`, `WordMatch`, and `SayItWithNova`
   all call the exact same shared `onAnswer` prop (= `GameEngine`'s
   `handleAnswer`) exactly once per question, at the same point in each
   component's own local state machine (after the errorless-scaffold's
   second-miss-or-correct branch). No structural difference between them.
   `GameEngine`'s dispatch (the `gameType === '...' && <Activity key=
   {currentIdx} onAnswer={handleAnswer} .../>` block) passes the identical
   `handleAnswer` reference to every activity — no per-activity variation
   in how completion gets wired.
2. **Quiz-count computation**: `word_match`, `word_hunt`, and `rhyme_time`
   all belong to the same `PICTURE_MATCH_GAME_TYPES` set and go through
   identical filtering (`allQuizzes.filter(q => q.pictureEligible)`,
   falling back to the unfiltered list only if that would be empty) — so
   there's no per-activity difference in `totalQuizzes` that could explain
   one activity ending early and another not.
3. **Ruled out session-plan regeneration mid-session**: `useSessionPlan`'s
   `sessionPlan` is a plain `useState`, only reset by an explicit
   `generatePlan()` call (on mount, or `regeneratePlan`/
   `generatePlanForWord`) — it does not reactively rebuild when
   `word_progress` changes, so a mid-session answer can't shrink
   `totalQuizzes` out from under an in-progress session.
4. **Live reproduction, production, multiple scenarios** (fresh accounts
   via `scripts/admin-user.mjs`, cleaned up after each): played Word Hunt
   to completion twice (6 and 8 real questions respectively) and Match &
   Sort once (6 questions) with plain correct answers — each session
   completed correctly, exactly once, after its true last question. No
   mid-session "Session Complete!", no unexpected celebration.
5. **The scenario most likely to explain "random celebration mid-session"**
   — a word crossing the real mastery threshold (`isRealMastery`: mastery
   ≥ 80 AND attempt_count ≥ 3) partway through a session — was tested
   directly: seeded 6 words to attempt_count=2/mastery=100 so any one more
   correct answer would cross the threshold, then played Tap & Hear to
   completion while continuously polling the DOM every 150ms (not a
   periodic check that could miss a brief overlay). Result: 6 separate
   `wordMastered` celebrations fired, one per word, each showing for
   ~2s then correctly auto-dismissing back into the question underneath,
   session continued normally, and `Session Complete!` fired exactly once
   at the true end (6/6 questions). This is a real, working, **by-design**
   mechanism (a word can legitimately reach mastery mid-session, and a
   brief celebration for it is intentional) — not a bug.
6. An earlier round of this same investigation produced a false lead: an
   early version of the reproduction script derived the "target word" for
   Tap & Hear from `svg[role="img"]` on the page — correct for Word Hunt
   (one prompt picture) but wrong for Tap & Hear (all 4 answer options are
   pictures, so `.first()` grabbed an arbitrary tile, not the target),
   producing a run with several genuinely-wrong answers and no threshold
   crossing. Fixed by deriving the target from the "Tap the picture of X"
   header text for that layout instead — flagging this because it means
   an earlier "no celebration observed" result from this same investigation
   was a script artifact, not a finding, and was correctly discarded once
   the reproduction was fixed.

**Conclusion**: no code change made for Bugs 1/2/4. Every scenario tried —
including the one most likely to produce a legitimate mid-session
celebration — showed the completion/celebration system behaving correctly
on the current `main`. Not dismissing the original reports as wrong; flagging
that this pass could not reproduce them after a genuine effort, so they
remain open if a future session can pin down a reproduction (e.g. via a
real device/parent report of exact steps, rather than scripted play).

## FIXED

IN PROGRESS

## STARS

IN PROGRESS

## VERIFICATION

IN PROGRESS

## NOTES FOR NEXT PROMPTS

IN PROGRESS
