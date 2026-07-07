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
IN PROGRESS

### DATA DERIVATIONS — per chart: exact query, formula, exclusions; pagination proof
IN PROGRESS

### UI — placement, tokens, reduced-motion, empty states, 375px
IN PROGRESS

### VERIFICATION — fixtures, test results (count vs. 42 baseline), gates, idor-proof, preview + production walks
IN PROGRESS

### COPPA NOTE — one paragraph legal can read: display-only aggregation of already-inventoried tables, no new collection, no PII in any chart payload
IN PROGRESS

### NOTES FOR PACKAGES B/C — where the calibration gate (B) and placement report / Star Check-In (C) should hook into what this run built
IN PROGRESS
