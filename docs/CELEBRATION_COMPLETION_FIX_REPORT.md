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

### Bug 5 (exit doesn't save) — real root cause found: Story Time's exit button was unreachable, not broken

Live-tested exit-save on Word Hunt (zero-progress, exit before answering
anything) and Word Song (partial progress, one question answered then
exit) on production first, since the mission specifically named Word
Song. Both worked correctly: progress banked (learning_events/word_progress
written, Sparks credited), clean return to Home, correct next-focus-word
state, no phantom quest, no console errors — this exit-save mechanism
(from an earlier fix in this same lineage, see the `pendingLearningEventsRef`
+ `Promise.allSettled` discipline in `PlayScreen.jsx`) is working as designed
for every activity that renders inline inside `GameEngine`'s own chrome.

**Story Time is different and genuinely broken.** `StoryReader.jsx` (used
by the guided-path Story Time activity) renders as a full-screen fixed
portal (`position: fixed; inset: 0; z-index: 9990`, via `createPortal`
directly onto `document.body`) — sitting visually and functionally on top
of whatever the caller has underneath, including `GameEngine`'s own
close/exit button. Confirmed directly: attempting to click "Exit and save
progress" while Story Time's reader was open failed with Playwright
reporting `<div class="candy-galaxy">…</div> intercepts pointer events` —
the button existed in the DOM and was "visible" by bounding-box, but a
different element sat on top of it capturing the actual click. This holds
from the moment the story opens (the cover page, before "Start reading"
is even tapped) all the way through the last page — there was no way to
leave a story once opened short of finishing it or a hard reload.

Grepped every activity component for `createPortal` — `StoryReader.jsx`
is the only activity-level one (the others, `lessonChrome.jsx`'s confetti
and `CelebrationOverlay.jsx`, are decorative/dismissable overlays, not a
click-blocking full-screen scrim over the exit control) — so this is an
isolated issue, not a pattern repeated elsewhere.

Likely why the mission's report named "Word Song" rather than "Story
Time": the two are adjacent in the guided path's rank order (Word Song is
rank 4, Story Time rank 6) and easy to misremember mid-session — Word
Song tested clean in both scenarios above, Story Time reproduced the
exact failure on the first attempt.

## FIXED

**Bug 5 — Story Time's unreachable exit** (`src/components/candy/StoryReader.jsx`,
`src/games/StoryTimeActivity.jsx`, `src/games/GameEngine.jsx`,
`src/screens/StoryScreen.jsx`):
- `StoryReader` now accepts an optional `onExit` prop. When provided, it
  renders its own close button (top-left, every page including the cover,
  same `IconClose`/"Exit and save progress" convention as `GameEngine`'s
  other activity headers) inside its own portal — the only way to reach
  an exit control while the portal is covering everything underneath.
- `StoryTimeActivity` now accepts and threads an `onExit` prop down to
  `StoryReader`. `GameEngine`'s render call for `story_time` now passes
  `onExit={handleExitEarly}` — the exact same shared exit-save mechanism
  every other activity already uses (awaits `pendingLearningEventsRef`,
  banks partial XP/Sparks, returns to the guided path). No new completion
  logic — Story Time now just has a way to *reach* the existing one.
- `StoryScreen.jsx` ("New Story Friday", the other `StoryReader` caller,
  outside the guided path) had the identical gap — no way to back out of
  a story once opened. Wired its own already-existing `onDone` callback
  through as `onExit` too, since it's the same component and the same
  missing-exit-button problem, at zero risk (an optional prop the guided
  path doesn't share any state with).

**Bug 3 — inflated star ratings** (`src/lib/queries/questProgress.js`,
`src/games/GameEngine.jsx`, `src/screens/PlayScreen.jsx`): see STARS below.

**Bugs 1, 2, 4** — no fix; see ROOT CAUSE(S) above.

## STARS

Read every activity's `onAnswer`/`finish` call directly rather than
assuming. Two star computations exist and both had the same issue:
`src/lib/queries/questProgress.js`'s `summarizeTodayActivity` (drives the
guided-path's per-node star display) and `GameEngine.jsx`'s `SessionComplete`
(drives the session-end screen's star row) — both derived `stars` purely
from `correct_count / attempts` accuracy, with no awareness that some
activities can never report anything but `correct: true`:

| Activity | game_type | Real pass/fail? |
|---|---|---|
| Tap & Hear, Word Hunt, Match & Sort, Fill the Story | word_match, word_hunt, rhyme_time, story_builder | Yes — real quiz, real correct/incorrect |
| Quiz Boss | flash_cards | Yes — child's own self-rating (know it / need practice), a genuine (if self-reported) signal |
| Say It with Nova | say_it | Yes in the common case — real speech-recognition match/mismatch. The no-mic-support fallback ("I said it!" button) always reports true, same class of self-report as Quiz Boss — left alone |
| Story Time | story_time | Partial — tier 2/3 stories have a real comprehension question; tier 1 micro-stories (see `src/lib/localStory.js`) have none and always report true. Left alone (see below) |
| Word Song | word_song | **No** — a chant-along, no task to get wrong (`WordSong.jsx` line 56: `onAnswer({correct: true, ...})` unconditionally) |
| Magic Video | magic_video | **No** — a watch-the-video placeholder shell (`MagicVideo.jsx` line 22: same) |
| Draw It | draw_it | **No** — drawing the word by hand is the point, not a quiz (`DrawIt.jsx` line 83: same) |
| Word Builder | word_builder | **No** in effect — a wrong letter tap is rejected immediately and never added to the spelled word, so the only way `onAnswer` ever fires is by eventually spelling it correctly (`WordBuilder.jsx` line 86: same) |

Fix: a new `SCORELESS_GAME_TYPES` set (`word_song`, `magic_video`,
`draw_it`, `word_builder`) exported from `questProgress.js`. Both star
computations now check it first — these four always get a fixed, honest
**1 star** (not 0: matches the existing "errorless learning, any completed
activity earns at least one star" floor already documented in that file)
instead of an accuracy-derived 3 that implies a performance judgment that
was never actually possible. Every other activity keeps the existing
accuracy-based 1/2/3 formula unchanged.

**Deliberately not touched**: Story Time and Say It with Nova each have a
path that also always reports `correct: true` (Story Time's tier-1
micro-stories; Say It's no-mic fallback), but each ALSO has a genuine
pass/fail path — a blanket override would incorrectly flatten the
sessions that do carry real signal. Telling "this specific session had no
real question" apart from "it did" would need a new signal threaded
through `learning_events` (e.g. a `had_real_score` column or similar) —
a data-model addition, not the bug fix this pass is scoped to. Flagged in
NOTES FOR NEXT PROMPTS.

Not modified: the stored `mastery`/`mastery_score` values, or anything
else `learning_events`/`word_progress` already compute — only the
*displayed* star rating on the guided-path node and the Session Complete
screen.

## VERIFICATION

All live checks below used fresh accounts via `scripts/admin-user.mjs`,
unlocked activities via `scripts/db-query.mjs` seeding `learning_events`
for prior-rank activities, and were cleaned up after each check.

- **Bug 5 fix (Story Time exit)**: opened Story Time, tapped "Start
  reading" to enter actual story pages, confirmed the close button (top-
  left) now renders inside the reader's own portal. A raw coordinate
  click (`page.mouse.click` at the button's exact center) correctly
  navigated home with zero progress banked (exited before answering
  anything — 0 STREAK/WORDS/SPARKS, matching "no phantom credit for
  nothing done"). Note: Playwright's own `locator.click()` actionability
  heuristic reported this specific SVG-in-button as "intercepted" even
  post-fix — investigated directly via `document.elementFromPoint` at the
  button's exact coordinates, which correctly resolved to the button's
  own SVG (no other element on top) — confirmed via a raw mouse click that
  the button is genuinely clickable for a real user; treating this as a
  Playwright/SVG-hit-testing quirk in this test tool, not a product bug.
- **Bug 3 fix (stars)**: completed Word Song fully (all questions via
  Skip) alongside Tap & Hear/Word Hunt/Match & Sort (real quizzes,
  answered correctly). Reopened the word's guided path via Word Galaxy
  (tapping the word directly, since its own path had advanced past this
  word by the time the check ran) and confirmed on screen: Tap & Hear,
  Word Hunt, and Match & Sort all show ★★★, Word Song shows exactly ★☆☆ —
  the fix visually confirmed end to end, not just at the data layer.
- **Bugs 1/2/4**: see ROOT CAUSE(S) — extensive live reproduction attempts
  across multiple scenarios, no misfire reproduced; no fix applied.
- **Gates**: `npm run build`, `check:no-emoji`, `check:wordart-sync` all
  clean throughout. Full Playwright suite and `idor-proof` run before
  merge (see below).

## NOTES FOR NEXT PROMPTS

- The completion/celebration pipeline itself (`GameEngine.handleAnswer` →
  `onProgress`/`onSessionEnd`, `pendingLearningEventsRef` +
  `Promise.allSettled`, `isRealMastery`'s mastery ≥ 80 AND attempt_count
  ≥ 3 gate) is unchanged and, per this pass's extensive testing, working
  correctly — safe to build on without re-litigating it.
- **`StoryReader.jsx`'s `onExit` prop is now the only way to reach an exit
  control while its portal is open.** Any future caller of `StoryReader`
  that wants an exit/back affordance must pass `onExit` explicitly — it
  does not fall back to whatever chrome the caller has underneath, because
  the portal covers it entirely.
- **Distinguishing "this session had a real score" from "it didn't" for
  Story Time (tier-1 micro-stories) and Say It with Nova (no-mic
  fallback) would need a new signal in `learning_events`** (e.g., a
  boolean column) — flagged but not built here, since it's a data-model
  change, not a bug fix. Worth considering in a future pass if these two
  activities' stars are ever reported as misleading the way word_song/
  draw_it/magic_video/word_builder were.
- **Bugs 1, 2, 4 remain open.** If a future session picks these back up,
  the most useful next step is probably capturing the EXACT device/steps
  from a real report (browser, whether audio was muted, network
  conditions, exact tap sequence) rather than more scripted reproduction —
  this pass's scripted attempts, including the scenario most likely to
  explain "random celebration," all showed correct behavior.
- The Playwright-actionability-vs-real-click discrepancy noted in
  VERIFICATION (SVG hit-testing inside a `createPortal`-rendered button)
  is worth remembering for any future live-testing script that clicks
  icon-only buttons inside `StoryReader` specifically — prefer
  `page.mouse.click()` at the element's computed center over
  `locator.click()` if the latter times out despite the element clearly
  being visible and on top in a manual screenshot.
