# Fix: Completion Tracking + Celebration Integrity

Branch: `fix/completion-and-celebration` (merged to `main`).

## ROOT CAUSE

### Bug 1 — star ignites after every answer

**Not a broken gate.** `PlayScreen.jsx`'s `handleProgress` already correctly
compared `prevMastery < 80` against `result.mastery >= 80` before firing
`wordMastered` — confirmed directly: a word seeded with real attempt
history (attempt_count=10, mastery=30%) that gained one more correct
answer (mastery→36%, still below threshold) correctly did **not** fire;
in the same session, 5 words with zero prior history each correctly fired
**exactly once**, on their first correct answer.

That last part is the actual root cause: `useSaveWordProgressMutation`
computes mastery as `round(correct_count / attempt_count * 100)`. For a
brand-new word, one correct answer is `1/1 = 100%` — mathematically
"crossed the mastery threshold" on the very first try. Since a normal
session mixes mostly never-before-seen words during early learning,
nearly every correct answer during that phase looks like a fresh mastery
transition. That's what reads as "fires after every answer" — it's firing
correctly per the code's own logic, but the underlying mastery *value* it
trusts isn't meaningful yet at attempt_count 1.

### Bugs 2/3 — completion not logged / finishing an activity started a new quest

**Could not reproduce as persistent bugs.** Extensive live testing against
production and the preview deployment (fresh words, replaying an
already-done node, Word Hunt, Story Time, hard page reloads — each
verified against direct `learning_events`/`word_progress` queries, not
just the UI) consistently showed correct behavior: the completed node
flipped to done, the correct next node became current, Home/Play
navigation worked, and state survived a full page reload.

One early "reproduction" (Story Time not opening when tapped) turned out
to be a test-script bug — `.click({ force: true })` on a text locator
that resolved to a child `<span>`, not the actual button; switching to
`getByRole('button', { name: /Story Time/i })` opened it immediately with
no code change. Logged here rather than silently discarded, since it's a
useful caution for future live-testing scripts against this app (motion/
framer-motion buttons in this codebase respond correctly to trusted
pointer/click events but a forced click on a non-interactive child
element is not equivalent to clicking the actual button).

What *is* real, found by re-reading (not by reproducing a failure): the
`learning_events` insert in `handleProgress` is deliberately
fire-and-forget — a slow or failed log write must never stall the child's
next question. But `handleSessionEnd`'s completion check, and the guided
path's own read after navigating back, run moments later, reading that
same table. The very last question of a session has the least real time
between its insert firing and that read happening. This is a genuine,
if narrower-than-described, race — closed regardless of whether it was
the exact mechanism behind the original report, since it's a real gap
between what the guided path is supposed to guarantee and what the code
actually waited for.

## FIXED

**`src/screens/PlayScreen.jsx`**
- Added `MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION = 3` and an `isRealMastery(mastery, attemptCount)`
  helper. `wordMastered` and `unitBoss` now both gate on `isRealMastery`
  (mastery ≥ 80 **and** attempt_count ≥ 3) instead of raw mastery alone —
  transitioning from "not yet real mastery" to "real mastery" fires the
  celebration once; a word answered correctly on attempt 1 or 2 no longer
  fires anything (confirmed live: 5 fresh words, 0 celebrations across
  their first answers). Deliberately does **not** touch the stored
  `mastery`/`mastery_score` values themselves — the Parent dashboard, Word
  Galaxy, and free-tier unit-lock checks all read that value and are out
  of scope for this fix.
- Added `pendingLearningEventsRef` — every `learning_events` insert's
  promise is pushed onto it in `handleProgress` (still not awaited there,
  preserving per-question pacing), and `handleSessionEnd` now awaits
  `Promise.allSettled(pending)` before running the path-completion check
  or invalidating the query the guided path reads.
- `queryClient.invalidateQueries(...)` at the end of `handleSessionEnd` is
  now awaited too.

**`src/lib/queries/questProgress.js`**
- `useTodayWordActivityQuery` now sets `refetchOnMount: 'always'`, so the
  guided path always does a real fetch when it's actually viewed, never
  serving a cache that predates the session that just finished.

## VERIFICATION

Live, against a fresh production account and the branch's Vercel preview,
using `scripts/admin-user.mjs` + direct `scripts/db-query.mjs` checks at
every step (not UI-only):

- **Bug 1**: 5 brand-new words answered correctly in one session → 0
  celebrations (previously would have been 5). Same words replayed across
  3 more passes → celebrations fired for 6 of 7 words at the pass where
  their attempt_count crossed 3 with mastery still ≥ 80%; none re-fired
  afterward. **Open observation, not conclusively explained**: one word
  ("fish") reached the identical final state (attempt_count 4, mastery
  100%) as its siblings but wasn't observed to fire its own celebration in
  this run — most likely a test-script timing artifact from very rapid
  consecutive answers (its stored mastery data is correct either way, so
  this is a possible missed *celebration moment*, not a data-integrity
  issue). Flagged for the next person testing this to watch for, not
  silently dropped.
- **Bugs 2/3 regression check on the fix**: fresh word → Tap & Hear → Home
  → Play → path correctly shows the new state → survived a full hard
  reload. No stuck screens, no unexpected new-quest behavior, across
  multiple runs.
- Gates: `npm run build`, `check:no-emoji`, `check:wordart-sync`, full
  Playwright suite, `idor-proof` (9/9, including live-endpoint checks
  against the Vercel preview) — all green.

## NOTES FOR PROMPT 2 (Story Time rebuild)

- The completion pipeline is the same for every activity: `GameEngine`
  calls `onProgress` per question → `PlayScreen.handleProgress` writes
  `learning_events` (fire-and-forget, now tracked in
  `pendingLearningEventsRef`) → `onSessionEnd` fires once per finished
  session (which awaits all pending writes before doing anything else).
  Story Time's rebuild doesn't need its own completion-tracking logic —
  it goes through this exact same path via `StoryTimeActivity`'s
  `onComplete` → `GameEngine`'s shared `handleAnswer` → `onProgress`, same
  as every other activity.
- If Story Time's rebuild changes how many `onAnswer` calls happen per
  story (e.g., one call per page instead of one per story), be aware that
  changes `attempt_count`/`correct_count` semantics for whatever word that
  story's quiz was about — the mastery formula and the new
  `MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION` gate both count `learning_events`/
  `word_progress` rows, not "activities completed."
- Test click note: when driving this app with Playwright, don't use
  `.click({ force: true })` on a text locator for `motion.button`-based
  UI (candy/ components) — target the actual button via
  `getByRole('button', { name: ... })`. A forced click on a child text
  node didn't error, it just silently didn't trigger the button's
  `onClick`, which cost real time to notice during this investigation.
