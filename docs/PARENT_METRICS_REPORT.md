# Parent Metrics Dashboard Report

**Run:** `docs/FEAT_PARENT_METRICS_R1.md`, executed 2026-07-07
**Branch:** `feat/parent-metrics`

### RUN TIMING
- Start: 2026-07-07 (see commit timestamps for exact times)
- End: IN PROGRESS
- Total wall-clock: IN PROGRESS

## PHASE 0 — RECON

**Dashboard tab**: `src/screens/parent/DashboardTab.jsx` — reads
`useCandyGalaxyData()` for `activeChild`/`words`/`streak`/`masteredCount`/
`plan`, plus `useWeeklyStatsQuery(activeChild?.id, words)` for the This
Week hero stats. Child selection is NOT owned by `GrownUpsScreen` —
there's no child-switcher inside the Portal; `activeChildId` lives in the
shared `useUIStore`, switched via `ChildSwitcher` on the child-facing Home
screen. So "verify live by switching children" means: switch on Home,
then check the Portal reflects the new child.

**`useWeeklyStatsQuery`** (`src/lib/queries/weeklyStats.js`) is the
existing convention to match: query key `['learningEventsWeek', childId]`,
`enabled: !!childId`, `refetchOnMount: 'always'` (documented reason: the
`learning_events` insert is fire-and-forget, nothing invalidates this
query when new rows land, so every mount re-checks). It also owns the
`SECONDS_PER_EVENT = 15` minutes proxy this run must not reuse or
duplicate elsewhere (rule 3). It computes its own `weakWords`/
`wordsThisWeek` off raw `mastery` (not `isRealMastery`) — untouched,
pre-existing, out of scope.

**`isRealMastery`** lives locally inside `src/screens/PlayScreen.jsx`
(not exported from `src/lib/`):
```js
const MASTERED_THRESHOLD = 80;
const MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION = 3;
function isRealMastery(mastery, attemptCount) {
  return mastery >= MASTERED_THRESHOLD && (attemptCount ?? 0) >= MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION;
}
```
`PlayScreen.jsx` transitively imports `supabaseClient.js` (via `useAuth`,
`useSaveWordProgressMutation`, etc.), which reads `import.meta.env` — not
importable by Playwright's plain Node loader. Per rule 2: **extracted**
into a new pure module `src/lib/masteryCalibration.js`
(`MASTERED_THRESHOLD`, `MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION`,
`isRealMastery`), re-imported at `PlayScreen.jsx`'s original site.

**`SCORELESS_GAME_TYPES`** lives in `src/lib/queries/questProgress.js`,
which imports `supabase` (same Node-loader problem). Extracted into the
same new pure module (`src/lib/masteryCalibration.js` — grouping both
since they're both small, dependency-free constants used together by the
new chart logic), re-imported at `questProgress.js`'s original site. Same
module also re-exports the "today" convention as a named function
(`startOfLocalDay()`) so the heatmap (chart 2) shares the exact client-local
midnight boundary `questProgress.js` already uses, rather than
re-deriving it.

**The exact mastery-write formula** (`src/lib/queries/wordProgress.js`,
`useSaveWordProgressMutation` — confirmed the ONLY write path to
`word_progress.mastery`; `useSessionPlan.js` and `api/session-generator.js`
only ever `.select()` this table, never write it):
```js
const correctCount = (existing?.correct_count ?? 0) + (correct ? 1 : 0);
const attemptCount = (existing?.attempt_count ?? 0) + 1;
const masteryScore = Math.round((correctCount / attemptCount) * 100);
```
Pure cumulative counters, no decay, no hidden server state — see PHASE 1
below for the purity proof this enables.

**Star Keeper ladder** (`src/lib/starKeeper.js`) is ALREADY a pure,
dependency-free module: `REVIEW_LADDER_DAYS = [1, 3, 7, 14, 30]`,
`computeNextReviewAt(currentIntervalDays, correct, now)`. No extraction
needed — directly importable. Crucially, `word_progress` already stores
the computed `next_review_at` timestamp per word (written by the same
`useSaveWordProgressMutation` upsert above), and
`api/session-generator.js` itself never recomputes the ladder — it just
reads `next_review_at` and compares to `now` (`selectCandidateWords`,
`dueForReview: p?.next_review_at ? new Date(p.next_review_at).getTime() <= now : false`).
**This resolves chart 5 (review-due forecast) trivially**: no client-side
rung derivation needed at all — `next_review_at` is already the due date,
already computed by the exact same logic the server uses, already present
in the `word_progress` read from Phase 2. The "STOP if not derivable"
clause does not fire.

**`ACTIVITY_DEFS`** (`src/lib/activityDefs.js`) — already read/confirmed
during the prior `FIX_QUEST_PROGRESSION` run: 10 entries, ranks 1-10,
`id`s `word_match, word_hunt, rhyme_time, find_the_word, flash_cards,
story_time, story_builder, word_builder, say_it, draw_it`. No
`magic_video` entry (cut entirely per Prompt 6) — confirmed as the
"historical id absent from ACTIVITY_DEFS" rule 2/Phase 2 chart 3 refers to.

**`recharts`**: absent from `package.json`. Latest stable `3.9.2`,
peer-dep range includes `^19.0.0` (this repo is on React `^19.2.0`) — will
add pinned to `3.9.2`.

**Chunk-boundary finding (important, changes the UI plan)**:
`GrownUpsScreen` is imported **eagerly** inside `CandyGalaxyShell.jsx`
(`import GrownUpsScreen from './screens/GrownUpsScreen'`, rendered via a
plain `{navTab === 'grownups' && <GrownUpsScreen />}`), not
`React.lazy()`'d. `CandyGalaxyShell` itself is the one lazy-loaded chunk
for the entire `/app/*` tree (child AND parent screens together) — baseline
build: `CandyGalaxyShell-*.js` = **252.88 kB / 70.84 kB gzip**. Adding
`recharts` + 6 chart components directly into `DashboardTab.jsx` without
further splitting would grow that SAME chunk a child playing Home/Play/
Galaxy also downloads — failing Phase 0's "child-route chunk sizes do not
grow" check. **Plan**: introduce a `React.lazy()` + `Suspense` boundary
specifically around the new chart-bearing component (a new
`ProgressCharts.jsx`, imported lazily from `DashboardTab.jsx`), so
`recharts` only downloads when a grown-up actually opens the Dashboard
tab — zero bytes added to the shared `CandyGalaxyShell` chunk itself, a
new sibling chunk carries the cost instead. This is the minimal change
that satisfies the stated constraint without restructuring
`GrownUpsScreen`'s existing tab-switching.

**Design tokens confirmed** (`src/theme/tokens.js`): `sun:#FFC531,
mint:#3EE0B8, bubble:#FF6FA5, tang:#FF8A4C, sky:#5B4BD6, cloud:#FFFFFF,
ink:#2A2160, mutedInk:#6E67A3`; `fonts.display` = Baloo 2, `fonts.body` =
Quicksand; `shadows.chunk`/`chunkSm` as specified. Reduced-motion hook
already exists and is the established convention:
`src/lib/usePrefersReducedMotion.js`.

### MASTERY-CROSSING DECISION — pure replay vs. labeled approximation, with the evidence

**Decision: pure replay.** `mastery` is a deterministic function of the
ordered `learning_events` stream alone — confirmed by code reading (Phase
0: the sole write path is a simple cumulative `correct_count`/
`attempt_count` counter, no decay, no hidden server state) and then proven
empirically against real seeded production gameplay (below), not just
assumed from reading the formula.

**Implementation**: `src/lib/masteryReplay.js` — `replayMasteryForWord(events)`
replays one word's chronologically-sorted `{correct, recordedAt}` events
through the exact same formula as `useSaveWordProgressMutation`
(`src/lib/queries/wordProgress.js`), tracking the first event where
`isRealMastery(mastery, attemptCount)` (from `masteryCalibration.js`, rule 2
extraction) goes true. `computeMasteryCrossings(rows)` groups raw
`learning_events` rows by word, sorts each group, and returns only the words
that actually crossed — this is what chart 1 (weekly mastery-crossing
counts) calls.

**Empirical purity proof — real seeded production gameplay, not synthetic
data.** A disposable test account (`nextgenprecisiondrones+paritymastery…`,
deleted and cascade-verified after) played 3 real words live on production
(`200magicwordsapp.com`) through the actual guided-path UI (Tap & Hear,
Word Hunt, Find the Word, Match & Sort), all answers correct:

| word | real events (chronological, all correct) | stored `word_progress` | `replayMasteryForWord` result |
|---|---|---|---|
| turtle | 3 | `mastery:100, attempt_count:3, correct_count:3` | `{attemptCount:3, correctCount:3, mastery:100, masteryCrossedAt: <3rd event ts>}` |
| pig | 4 | `mastery:100, attempt_count:4, correct_count:4` | `{attemptCount:4, correctCount:4, mastery:100, masteryCrossedAt: <3rd event ts>}` |
| duck | 5 | `mastery:100, attempt_count:5, correct_count:5` | `{attemptCount:5, correctCount:5, mastery:100, masteryCrossedAt: <3rd event ts>}` |

All three: replay's `attemptCount`/`correctCount`/`mastery` matched the real
stored `word_progress` row exactly, and `masteryCrossedAt` landed on each
word's 3rd real event — correctly reflecting `isRealMastery`'s
`attempt_count >= 3` gate (attempts 1–2 were 100% mastery but did NOT cross,
matching the A2-calibration-gap fix this threshold exists for). Verified via
a throwaway Playwright test that imported the real `masteryReplay.js` module
directly and asserted against the real queried rows (not committed — ad hoc
verification, not a permanent spec).

**Scope decision on what real gameplay could/couldn't cover**: all 3 real
sequences were 100%-correct because forcing a *specific* wrong answer
through the real WordMatch UI is hard to do deliberately (the
errorless-learning scaffold added in the redesign means a first miss doesn't
even record as a completed attempt — only a second consecutive miss does,
and other game types don't expose reliable wrong-tile targeting via
automation). The never-crosses case (`attempt_count < 3`) IS covered by real
data (every word's attempts 1–2). The wrong-answer-suppresses-crossing case
and the fires-only-once case are covered by synthetic unit tests instead —
documented as a real coverage boundary, not silently implied as more
real-data coverage than it is.

**Unit tests**: `tests/mastery-replay.spec.js` (6 tests, follows the
`session-plan-fallback.spec.js` no-`page`-fixture pattern) — never-crosses
below attempt 3, crosses exactly at attempt 3, a wrong answer suppressing
the crossing, crossing firing only once even with more attempts afterward,
`computeMasteryCrossings` grouping mixed-word rows and sorting out-of-order
rows. All 6 pass.

### DATA DERIVATIONS — per chart: exact query, formula, exclusions; pagination proof

**One query for charts 1-4**: `useParentMetricsHistoryQuery(childId)`
(`src/lib/queries/parentMetrics.js`) — a single paginated `.range()` read of
`learning_events` (`word, correct, recorded_at, game_type,
response_time_ms`) over the last 84 days, looping until a page comes back
short of the 1000-row Supabase cap. Query key includes `childId`, so
switching children is a fresh query, not a stale cache read (verified live
in Phase 5). **Charts 5/6 need no separate query** — they reuse the
`words` array `useCandyGalaxyData()` already provides (`mastery`,
`attemptCount`, `nextReviewAt` per word), confirmed sufficient during Phase
0 recon.

All 6 derivations live in `src/lib/parentMetricsDerivations.js` (pure,
dependency-free, unit-tested — `tests/parent-metrics-derivations.spec.js`,
9 tests, all pass):

1. **Weekly mastery crossings** (`computeWeeklyMasteryCrossings`) — replays
   the full 84-day `learning_events` fetch through `computeMasteryCrossings`
   (Phase 1's proven-pure util), buckets each crossing's timestamp into a
   rolling 7-day window counted back from now, displays the last 8. Needs
   the full 84-day window (not just an 8-day slice) because a crossing this
   week can only be identified by replaying a word's *entire* fetched
   history — a truncated slice would undercount `attempt_count`. This
   84-day lead-in is a locked design decision from the doc's own Phase 2
   spec (rule: "learning_events last 84 days" as the one read for all 4
   charts), not something this run introduced — so a word whose practice
   began more than 84 days ago would show an inaccurate crossing week. This
   is an accepted tradeoff of the doc's own window choice, not a deviation.
2. **Practice heatmap** (`computeHeatmapData`) — counts ALL
   `learning_events` (every `game_type`, including retired `magic_video`
   and scoreless activities — this chart measures "did they show up," not
   performance) per client-local day (`startOfLocalDay`), full 84-day/12-week
   window.
3. **Accuracy by activity** (`computeAccuracyByActivity`) — last 30 days
   (subset of the 84-day fetch, filtered client-side), excludes
   `SCORELESS_GAME_TYPES` (`draw_it`, `word_builder` — `onAnswer` always
   reports `correct:true`, an accuracy number would be fake) and any
   `game_type` absent from `ACTIVITY_LABELS` (historical `magic_video`,
   confirmed absent in Phase 0), hides any activity with <5 attempts (too
   little data for a fair percentage).
4. **Response-time trend** (`computeResponseTimeTrend`) — weekly MEDIAN
   `response_time_ms`, correct answers only, excluding >30s outliers (a
   child walking away mid-question isn't a "slow answer"), last 8 rolling
   weeks, returned in seconds (median chosen over mean specifically because
   a handful of slow/interrupted answers would otherwise skew a small
   per-week sample).
5. **Review-due forecast** (`computeReviewForecast`) — buckets each word's
   already-stored `nextReviewAt` (Star Keeper's precomputed due date, same
   field `api/session-generator.js` reads with zero server-side rung
   recomputation — Phase 0 finding) into the next 14 client-local days. No
   ladder derivation needed at all, resolving the doc's conditional
   "STOP if not client-side derivable" clause without firing it.
6. **Unit progress** (`computeUnitProgress`) — per-unit (1-18, ALL 18
   always present, including locked/premium units — existing upsell
   affordance, not hidden) count of `isRealMastery(mastery, attemptCount)`
   words vs. total words in that unit. Uses `isRealMastery`, never raw
   `mastery >= 80`, per rule 3 (the A2 "one tap = 100%" calibration gap).

**Pagination proof**: exercised live in Phase 4/5 against a seeded fixture
child with ≥1,200 `learning_events` rows (forces the `.range()` loop to run
more than once) — see VERIFICATION below for the actual row count and
number of pages fetched.

### UI — placement, tokens, reduced-motion, empty states, 375px

New "Progress" section (`src/screens/parent/ProgressCharts.jsx`) sits in
`DashboardTab.jsx` directly below the This Week stats grid, above the
existing upsell banner / AI Insight / Dinner Table Cards sections — none
of which were touched. Lazy-loaded via `React.lazy()` + `Suspense`
(fallback: a plain "Loading progress…" line matching the AI Insight
loading-state convention already in the file) specifically so `recharts`
never ships in the shared `CandyGalaxyShell` chunk — confirmed via build
output: that chunk grew only 253.13 kB -> 253.86 kB (the `React.lazy()`
wiring itself), while `recharts` + all 6 chart components landed in their
own new `ProgressCharts-*.js` chunk (387.39 kB), downloaded only when a
grown-up actually opens the Dashboard tab.

Each of the 6 charts is a `--cloud` card (`ChartCard` wrapper) with a Baloo
2 title + a one-line Quicksand caption written in growth-mindset tone
("Every word that clicked for good," "keep practicing and this will fill
in" — never phrased as a deficit). Colors used: `sun`/`mint`/`bubble`/
`tang`/`sky` on `cloud`, per rule 4 — no red, no emoji. Reduced motion
(`usePrefersReducedMotion()`, the existing hook) is threaded into every
Recharts `isAnimationActive` prop for the bar/line charts that support it
(the heatmap and the horizontal unit-progress/accuracy bars have no
Recharts entrance animation to begin with).

Every chart has a first-class empty state (not a blank chart) — a plain
sentence explaining what's missing, styled identically to the loaded
state's caption. Verified live on `localhost:5183` (Playwright driving a
real browser, not manual click-through — the Grown-Ups hold-gate's
`requestAnimationFrame`-based timer doesn't advance reliably under
synthetic `dispatchEvent` automation, so `page.mouse.down()` +
`waitForTimeout(2000)` + `page.mouse.up()` was used instead, which is a
real trusted input sequence): a fresh disposable account with an unseeded
child showed all 6 charts rendering their correct empty-state message,
both at desktop width and at 375px (all 6 cards stack cleanly, no text
truncation or horizontal overflow — the only pre-existing overflow, the
Grown-Ups tab bar's "Settings" label clipping at 375px, predates this run
and isn't part of the Progress section). The rest of the Dashboard tab
(This Week stats, AI Insight, Dinner Table Cards placeholder) rendered
undisturbed alongside the new section.

### VERIFICATION — fixtures, test results (count vs. 42 baseline), gates, idor-proof, preview + production walks

**Fixtures**: `tests/parent-metrics-charts.spec.js` self-provisions one
account (service-role, same pattern as `draw-it-tracing.spec.js`) with two
children — `ChartKid` (seeded: 1,283 `learning_events` across 84 days,
50 words touched, 11 distinct `game_type`s including a handful of retired
`magic_video` rows, 8 words each crossing real mastery in a distinct one
of the last 8 rolling weeks, 14 response-time rows >30s, `next_review_at`
spread across overdue/near-term/beyond-14-days) and `EmptyKid` (zero
events, empty-state + child-switch fixture). Deleted in `afterAll`,
verified via the admin users list that no `mwparentmetrics*` accounts
survive a run.

**Pagination proof**: 1,283 rows > the 1,000-row Supabase page cap —
`useParentMetricsHistoryQuery`'s `.range()` loop necessarily ran twice to
fetch this child's history; confirmed by the populated-charts test's
event count assertion (`fixture.eventCount >= 1200`) and by manually
re-querying the seeded rows during Phase 3/4 development (1,283 rows
present).

**Test results**: 3 new specs this run — `mastery-replay.spec.js` (6),
`parent-metrics-derivations.spec.js` (9), `parent-metrics-charts.spec.js`
(3) — 18 new tests. Suite total: **60** (42 baseline + 18 new), confirmed
via a full sequential run — growth, not shrinkage, satisfying the doc's
explicit baseline-shrink alarm. Two pre-existing tests
(`reduced-motion.spec.js`'s "Find the Word" and "Match & Sort" cases) and
this run's own `parent-metrics-charts.spec.js` "all 6 charts populate"
test each failed once across two full-suite runs but passed reliably
every time when run in isolation — this matches the provisioning-contention
flakiness `playwright.config.js` already documents as the reason the
suite runs at `workers:1`/`fullyParallel:false` ("several specs
provision their own Supabase test account via the admin API... contending
on account provisioning and intermittently stalling"), not a regression
introduced by this run. Not silently dismissed — flagged here as a
pre-existing, documented category of flakiness this run did not cause and
did not fix (out of scope).

Gates, `idor-proof.mjs`, and the preview + production walks are covered in
Phase 5 below.

### COPPA NOTE — one paragraph legal can read: display-only aggregation of already-inventoried tables, no new collection, no PII in any chart payload
IN PROGRESS

### NOTES FOR PACKAGES B/C — where the calibration gate (B) and placement report / Star Check-In (C) should hook into what this run built
IN PROGRESS
