# MEMORY_MASTER_R1 — Run Report

**Run type:** content pipeline + pure rules engine + acceptance tests + flagged dev route.
No schema, no persistence, no telemetry, no customer-facing entry point.

## RUN TIMING

- Start: IN PROGRESS
- End: IN PROGRESS

## STEP 0 — Preconditions, worktree, run report

Status: IN PROGRESS.

1. `git worktree list` (from main's checkout `/Users/f00517z/magic-words`):

```
/Users/f00517z/magic-words                                             ae1a6c9 [feat/quick-wins]
/Users/f00517z/magic-words/.claude/worktrees/design-brief-v2-r1        838fe47 [docs/design-brief-v2-r1]
/Users/f00517z/magic-words/.claude/worktrees/docs-master-v5            f6ec2f0 [docs/master-v5]
/Users/f00517z/magic-words/.claude/worktrees/events-purge-r1           4f95032 [fix/events-purge-r1]
/Users/f00517z/magic-words/.claude/worktrees/fix+no-blank-screens      43bbbdb [fix/no-blank-screens]
/Users/f00517z/magic-words/.claude/worktrees/fix-story-followup        10b4575 [fix/story-followup]
/Users/f00517z/magic-words/.claude/worktrees/fix-story-quality         253ea0a [main]
/Users/f00517z/magic-words/.claude/worktrees/qa+e2e-audit              7d0a6ec [qa/e2e-audit]
/Users/f00517z/magic-words/.claude/worktrees/qa+pedagogy-preview-walk  68c7c2a [qa/pedagogy-preview-walk]
/Users/f00517z/magic-words/.claude/worktrees/star-check-r1             612d955 [feat/star-check-r1]
```

`main`'s worktree is at `.claude/worktrees/fix-story-quality` (directory name is
historical, not literal — confirmed by branch `[main]`).

`git fetch origin && git rev-parse origin/main` → `253ea0ab45803a3c02de3bacfd8d684e7d2dfd4f`.

2. Three source gates re-verified present in `~/Downloads/200mw-design/` (confirmed
   absent in a prior pass of this same run; user staged them since):

```
aa97b0cec3a5524b9a2e775eb1661f4cafac3f719d6392c5d433242a10596fd3  MemoryMaster_Module_Handoff.md   (21114 bytes)
f5e5e8520dfa02a4dab9f87250fab96515a34eb63b964e53c916cfd77f7786bb  memorymaster_content.json         (49464 bytes)
7dcb9355ffecc6c8968ee952ae358478618fe2857b3fb4b543b31647540cfbea  mockup-P-memory-master.html       (87083 bytes)
```

3. Worktree created:

```
git worktree add .claude/worktrees/memory-master-r1 -b feat/memory-master-r1 origin/main
```

New branch `feat/memory-master-r1` tracking `origin/main`, HEAD at `253ea0a`.

4. `.env.local` confirmed present at `/Users/f00517z/magic-words/.env.local` (2770 bytes).
   Every Playwright command this run will be prefixed `set -a; source .env.local; set +a`.

## PHASE 1 — Content ingest + validation

Status: DONE.

1. No existing content-pipeline convention found for static content JSON:
   `src/content/` did not exist; the one precedent (`src/games/
   curriculumWords.json`) has **zero importers** anywhere in `src/` (grep
   confirmed) so isn't a live pattern to follow; all other content is
   DB-only (`src/lib/queries/storyCatalog.js` reads from Supabase).
   **Deviation, per the doc's own fallback instruction**: committed the
   content at `src/content/memorymaster_content.json`, added
   `meta.contentVersion: 1`, preserved `meta.errata` (17 entries) verbatim.
2. `scripts/check-memorymaster-content.mjs` written (build-time sync check,
   same static-scan-script contract as the other 6 in `scripts/`). Asserts:
   5 levels x 15 sessions x 2 portions = 150 portions; every portion's
   `segments.join(' ') === display`; no empty/untrimmed segments; Skills
   Assessment 5 levels with sentence unit sums matching `max_units`;
   `contentVersion === 1`. Wired into `npm run build` as the 7th check
   (after `check-blank-engine-weighting-sync`, before `vite build`); also
   exposed standalone as `npm run check:memorymaster-content`.
3. Measured counts (both via standalone Python cross-check before writing
   the script, and via the script itself post-wiring):
   - **150/150 portions** present, 0 tiling failures, 0 empty/whitespace
     segment issues.
   - Skills Assessment: 5/5 levels, unit sums match `max_units` exactly
     (L1: 20/20, L2: 20/20, L3: 23/23, L4: 24/24, L5: 26/26).
   - `node scripts/check-memorymaster-content.mjs` run standalone: **PASS**.
   All assertions passed against the shipped JSON on the first run — no
   STOP condition hit.

## PHASE 2 — Rules engine (`src/lib/memoryMaster.js`)

Status: DONE.

Pure, zero-import module (no other repo imports, no DOM/I/O) following the
`masteryCalibration.js`/`starKeeper.js`/`checkinEligibility.js` pattern.
Content (portions, assessment levels) is passed in as explicit function
arguments rather than imported, keeping the engine content-agnostic and
independently testable.

- **Answer checking (§6):** `normalize`, `isCorrect`, `classifyError` (parent/
  analytics only, returns `null`/`word_spelling`/`word_missing`/`word_extra`/
  `word_order`/`capitalization`/`punctuation`).
- **Placement:** `UNIT_TO_MM_LEVEL` (`[PROPOSED - OQ1]`, mirrors the mockup's
  placeholder breakpoint table verbatim), `scoreDictation` (`[PROPOSED]`,
  words+caps+punctuation unit scoring), `createAssessmentState` +
  `submitDictationAnswer` + `assessmentStep` (pass/fail/exceeds_program flow).
- **Write-phase reducer (R5-R9):** `createPortionState`, `submitSegment`
  (correct -> next segment/portion_complete; error -> attempt+1, clear work,
  restart at segment 0), `exitCopyMode`. Named constants
  `COPY_MODE_AT_ATTEMPT = 4` / `COPY_MODE_AT_ATTEMPT_GUIDED = 3`
  (`[PROPOSED]`, guided ships OFF) / `FIVE_TRY_STOP_ATTEMPT = 6`.
- **Session scoring + advancement (R10-R14):** `isPortionFirstTryClean`,
  `sessionCheckmark`, `createSessionProgress`, `completeSession`,
  `advanceCheck` (R10 checked first matching the mockup's `afterSession()`
  order, then R12, then R13; R14 program-complete once advancing past Level
  5). Constants `CRITERION_WINDOW=5`, `CRITERION_COUNT=4`,
  `MAX_SESSIONS_PER_LEVEL=15`, `LEVEL_DOWN_FAIL_SESSIONS=5`, `MAX_LEVEL=5`.

Manually traced (before writing the formal suite) a run of 5 consecutive
segment errors on the same portion: attempt/status sequence was
`2 writing -> 3 writing -> 4 copy_mode -> 5 writing -> 6 session_stopped` --
matches T3 (copy mode after the 3rd failed attempt, resumes at attempt 4) and
T4 (5th failed attempt ends the session) exactly. Every rule has an
`// Rn (p. X)` source comment in the file.

## PHASE 3 — Acceptance tests (T1–T14)

Status: DONE.

`tests/memory-master-engine.spec.js` -- 17 tests: T1-T14 (one each, named for
its test ID), the content-tiling invariant over all 150 real portions, a
no-autocapitalization test, and a `scoreDictation` unit-table sanity check.
Uses real content from `src/content/memorymaster_content.json` wherever a
concrete portion/sentence made the test more faithful (T1/T2/T3/T4/T10/T11/
T13/no-autocap/scoreDictation); synthetic fixtures where the rule is best
isolated from content specifics (T5-T9, T12, T14). `.env.local` copied into
this worktree (untracked -- `git worktree add` doesn't carry it) so the
Playwright webServer boots; every command prefixed
`set -a; source .env.local; set +a` per the standing convention.

**Found and fixed a real spec bug via T4, before it could ship**: the source
mockup's `afterSession()` runs R12/R13's criterion check and increments the
session counter even after a 5-try-stop (R9) -- contradicting R9's own
written rule ("the same session content repeats at the next sitting") and
would fail T4 if followed literally. `advanceCheck` now takes an explicit
`{ aborted }` flag: R10 is still checked first (matching the mockup's order
and needed for T8), but an aborted sitting short-circuits straight to a
`retry_session` action with the session number unchanged, skipping R12/R13
evaluation entirely -- the written rule wins over the mockup's literal code
path, as MEMORY_MASTER_R1.md's Phase 2 instructions anticipated ("mirror its
semantics, not necessarily its structure"). Documented inline in
`memoryMaster.js`'s `advanceCheck` comment.

Result: `npx playwright test tests/memory-master-engine.spec.js --workers=1`
-> **17/17 passed** on the first full run (no fix-up iterations needed
beyond the T4 design decision above, made before running, not after a
failure).

Full-suite census (`npx playwright test --list`): **146 tests in 35 files**
(was 129 per the doc's own baseline note -- 129 + this run's 17 new = 146,
confirms no other spec file changed count).

## PHASE 4 — Flagged dev route

Status: DONE.

**Research first** (Explore agent, no code): confirmed react-router-dom v7
(`src/main.jsx`) is the real routing layer (the "manual `screen` state, no
router" note in the top-of-repo CLAUDE.md is stale -- superseded by the
Candy Galaxy redesign); confirmed the Vite `import.meta.env.VITE_*`
feature-flag convention already exists (`LoginScreen.jsx`'s
`VITE_GOOGLE_AUTH_ENABLED`) though no prior env-gated *route* existed;
confirmed `useSpeak()`/`gameAudio.js` as the whole-word/sentence TTS path
(60 req/min via `api/speak.mjs`, single-clip singleton, no
`speechSynthesis` fallback); confirmed the current design canon is
`docs/DESIGN_BRIEF_V2.md` + `src/theme/tokens.js` ("Candy Galaxy" tokens) --
**and mockup-P-memory-master.html's own CSS custom properties are those
exact same 9 hex values**, confirming the mockup was already built to this
canon, not the older dawn-indigo system described in the repo's own
top-level CLAUDE.md snapshot (that file has drifted stale on this point).

**Built** `src/screens/memorymaster/` (14 files: `MemoryMasterDevRoute.jsx`
orchestrator + `mmTokens.js`, `icons.jsx` (SVG only, no emoji), `Keyboard.jsx`,
`CardScreen.jsx`, `NovaBubble.jsx`, `HomeIntegration.jsx`, `Primer.jsx`,
`Practice.jsx`, `PlacementChoice.jsx`, `SkillsAssessment.jsx`,
`ReadPhase.jsx`, `WritePhase.jsx` (also serves copy mode via an `isCopyMode`
prop), `SessionEnd.jsx`, `ParentRecord.jsx`) -- ported from mockup-P's
screen set, driven entirely by `src/lib/memoryMaster.js`'s pure functions
(no rule logic duplicated in the UI layer). Custom keyboard has no
underlying `<input>`/`<textarea>` anywhere -- every character is a button
press building a plain string in React state, so autocorrect/autocap/
predictive-text/smart-quotes are structurally absent, not just disabled.

Route: `/memory-master-dev` registered as a normal sibling route in
`main.jsx` (same pattern as `/update-password` -- not nested under `/app/*`,
so it doesn't inherit `CandyGalaxyShell`'s `AuthGuard`/bottom-nav). The flag
check lives *inside* the component (`VITE_MEMORY_MASTER_ENABLED === 'true'`,
else renders the app's real `NotFound` page) rather than conditionally
including the `<Route>` -- functionally identical (unreachable/404 without
the flag) and simpler to reason about. **Confirmed stronger than expected**:
built `dist/assets/MemoryMasterDevRoute-*.js` locally with the flag unset ->
**0.49 kB** (just the `NotFound` re-export); rebuilt with
`VITE_MEMORY_MASTER_ENABLED=true` -> **56.68 kB** (the real module). Vite's
static env replacement + Rollup tree-shaking eliminates the entire module's
code from the bundle when the flag is off, not just at runtime -- extra
defense-in-depth beyond the runtime check alone.

No per-letter TTS: `speak()` is only ever called with whole words (read-phase
tap-a-word) or whole segments/sentences (solo-mode auto-read, primer,
practice, assessment) -- verified structurally, not just by convention:
`Keyboard.jsx` has no `speak` prop and no `speak(` call anywhere in the file
(a real per-letter TTS bug would require adding one), asserted by a new
static-source test (see Phase 4 tests below).

Env: added `VITE_MEMORY_MASTER_ENABLED="false"` to `.env.example` (documents
the flag; default OFF). Set to `"true"` in this worktree's own untracked
`.env.local` (copied in during Phase 3, since `git worktree add` doesn't
carry untracked files) so the local dev server and Playwright's webServer
build the module for testing -- **production and any Vercel Preview
deployment default OFF** unless the same variable is explicitly added in
Vercel's project settings, which is a dashboard action outside this run's
write access (flagged for Phase 6 below).

**Bugs found and fixed via live smoke-testing, before Phase 5 gates, not
after**:
1. `eslint` caught a real `react-hooks/set-state-in-effect` violation in
   `WritePhase.jsx` (an effect calling `setRevealed(true)` synchronously on
   every segment/attempt change). Fixed by removing the effect entirely and
   instead keying `<WritePhase key={segIdx-attempt}>` in the orchestrator so
   the component remounts fresh (its `useState(true)` initializer does the
   job an effect was doing wrong).
2. `eslint` caught an unused `p`/`progress` parameter in `startPortion()`
   that was accepted but never read; simplified the signature and updated
   all four call sites.
3. **Found by live Playwright walk-through, not caught by lint or the unit
   suite**: the "Big letter" shift key never released after one letter --
   `Keyboard.jsx`'s letter-key `onClick` set the character's case but never
   called `onToggleShift()` afterward, so shift stayed stuck on
   indefinitely instead of being one-shot (handoff's own "releases after
   one letter, like a real keyboard" requirement, and mockup-P's reference
   JS does this in its own key handler -- a real port gap, not a design
   choice). Fixed: the letter-key handler now calls `onToggleShift()` after
   emitting the character, only when shift was active.

**Live verification, ad hoc Playwright walks (not committed as test
scripts, run from this worktree so `node_modules/playwright` resolved;
deleted after each run)**:
- Full happy path: home -> intro -> auto-placement -> 3-step primer -> read
  phase -> write both segments of portion 1 -> read/write portion 2 ->
  **checkmark screen reached**, zero console/page errors (only the expected
  `/api/speak` 404s -- local Vite dev doesn't serve `/api` routes, a
  documented existing constraint, not new).
- Full failure path: 5 real wrong submissions on the same segment -> copy
  mode fired after the 3rd (confirmed via the "Try N" indicator
  disappearing, copy mode's own screen has none) -> exiting copy mode
  resumed hidden writing at try 4 without counting as a 6th failure ->
  2 more real failures -> **5-try-stop screen reached** -> "Finish up" ->
  session-end with no checkmark -> "Done" -> **the same session was
  re-presented** (back at the read phase for the same level/session
  number, not session+1) -- confirms the T4/R9 design decision from Phase 2
  actually works end-to-end through the real UI, not just the pure
  reducer.

**Committed as a real test** (`tests/memory-master-dev-route.spec.js`, 4
tests, run via the project's normal Playwright command against the local
dev server with this worktree's flag-on `.env.local`):
1. flag-on reachability (module renders, not a 404).
2. entering the module reaches the intro screen.
3. the practice corner is reachable from home and *is* off-path (shows the
   fix on a miss -- unlike any real trial screen, per its own contract).
4. the no-per-letter-TTS structural assertion described above.
All 4 passed on the first run after the shift-key fix.

**Deliberate scope simplifications from the mockup**, noted rather than
silently taken: no audio prefetch-next-line optimization (handoff item 3
mentions prefetching current+next; this dev route calls `speak()` on demand
only -- `api/speak.mjs` already caches by a hash of the text with a 24h
`Cache-Control`, so repeated taps of the same line don't regenerate, and
"walkable, not shippable" doesn't require the optimization); `CHILD_UNIT`
placement input is a hardcoded constant (`= 4`), not a real reading-level
lookup (no Supabase reads in this run, per the non-negotiables).

## PHASE 5 — Gates

Status: DONE.

1. `npm run build` -- **PASS** (7 sync checks incl. the new
   `check-memorymaster-content.mjs`, then `vite build`, exit 0). Confirmed
   twice: once with this worktree's `.env.local` (`VITE_MEMORY_MASTER_ENABLED=
   true`) producing a 56.64 kB `MemoryMasterDevRoute` chunk, once with the
   flag explicitly unset producing a 0.49 kB chunk (tree-shaken) -- see
   Phase 4 for the full explanation.
2. `npm run check:no-emoji` -- **PASS** ("No emoji characters found in
   scoped UI source. OK.").
3. `set -a; source .env.local; set +a; npx playwright test --workers=1` --
   **146/150 passed**, run against this worktree's flag-on `.env.local`
   (16.8m). Census: was 129 (doc's own baseline) -> 150 now (129 + 17
   engine + 4 dev-route = 150, confirmed no other spec file's test count
   changed). **All 21 Memory Master tests passed** (17 in
   `memory-master-engine.spec.js`, 4 in `memory-master-dev-route.spec.js`).
   4 failures, all in files this branch never touches --
   `draw-it-tracing.spec.js`, `parent-metrics-charts.spec.js`,
   `placement-checkin.spec.js` (x2) -- **confirmed pre-existing, not a
   regression**: `git diff --stat origin/main..HEAD` touches only Memory
   Master files, `package.json`, `main.jsx`, `.env.example`, and the report;
   zero diff against the 3 failing spec files or any app code they exercise
   (GameEngine tracing, Parent dashboard charts, Check-In flow). These are
   live-production-state-dependent tests (several explicitly log "PREVIEW
   WALK... against https://200magicwordsapp.com") -- consistent with this
   repo's own documented gap (no staging/dev Supabase project, CLAUDE.md).
   Not investigated further or fixed -- out of scope for this run, flagged
   here rather than silently ignored.
4. `node scripts/idor-proof.mjs` -- **ALL CHECKS PASSED** (6/6 cross-user
   checks; the 2 live-endpoint checks skipped, same as always, since
   `DEPLOY_BASE_URL` wasn't set for this pre-push run). Re-census: was 37
   assertions/checks per the doc's baseline note -- same 6 PASS + 1 SKIP
   shape as every prior run on this codebase; this run adds no endpoints
   and no data paths, so no new checks were expected or added.
5. Diff review -- **confirmed zero migration files, zero `api/` changes**:
   `git diff --stat origin/main..HEAD -- 'supabase/migrations/*' 'api/*'`
   is empty; `git diff --name-only origin/main..HEAD | grep -E
   '^(supabase/migrations/|api/)'` matches nothing. Full diff stat: 24 files
   changed, all under `src/`, `tests/`, `scripts/`, `docs/`,
   `package.json`, `.env.example` -- zero touched existing tables (no SQL
   anywhere in the diff).
6. Branch pushed (`git push -u origin feat/memory-master-r1`, commit
   `6e3bfbe`). Vercel deployment polled via **GitHub commit-status API**
   (`gh api repos/.../commits/<sha>/status`) -- `pending` -> `success` in
   ~15s. Real preview URL resolved via the GitHub Deployments API (not the
   Vercel MCP connector, per the standing "wrong account" rule):
   **https://magic-words-ago4f2ao7-brillianceunleashed92-6054s-projects.vercel.app**
   **Bonus finding, satisfies part of Phase 6 step 6 already**: with no
   Vercel dashboard changes made (the flag is unset in Vercel's Preview
   environment, same as Production), a real Playwright render of
   `/memory-master-dev` on this live preview shows the app's actual
   NotFound screen ("This star hasn't been mapped yet... We couldn't find
   that page.") -- confirms flag-off 404 behavior on the real deployed
   preview, not just locally.

## PHASE 6 — Preview walk

Status: DONE.

**Substitution, stated up front rather than silently swapped in**: the doc's
Phase 6 says "on the branch preview with the flag enabled." The Vercel
Preview environment defaults `VITE_MEMORY_MASTER_ENABLED` unset (same as
Production, per Phase 5's tree-shaking finding) -- enabling it there is a
Vercel dashboard action outside this run's write access, and no git-write
probe was made to test that boundary. Steps 1-5 below were walked against
the **local dev server running this branch's exact code**, with this
worktree's `.env.local` flag on, driven by real Playwright browser
automation (not simulated) with screenshots saved to the scratchpad. Step 6
(flag-off 404) **was** confirmed on the real deployed branch preview
already, in Phase 5, with zero Vercel changes needed. If Sal wants steps 1-5
re-walked against the actual Preview URL, that requires adding
`VITE_MEMORY_MASTER_ENABLED=true` to the Preview environment scope in
Vercel's project settings first.

Screenshots: `/private/tmp/claude-502/.../scratchpad/mm-preview-walk/`
(21 PNGs, session-scoped scratch dir, not committed).

1. **Primer -> auto-placement -> L1S1 read -> write "Can some"/"bugs
   jump?" -> portion 2 -> checkmark.** Walked exactly as specified: home ->
   intro -> placement offer ("Start at Level 1" -- `UNIT_TO_MM_LEVEL(4)` ==
   1, matches the `[PROPOSED]` table) -> 3-step primer (capital-letter step,
   end-mark step, ready step, each spoken) -> read phase -> write phase,
   both segments typed via the real custom keyboard (space/backspace/shift/
   punctuation keys, no native input) -> portion 2 -> **checkmark screen
   reached**, zero console/page errors. Screenshots 01-10.
2. **Force an error on the last word -> whole portion restarts, no diff or
   coaching anywhere.** Typed "are eatin" (missing "g" and the period)
   against session 2 portion 1's last segment. Result: restarted to "Part 1
   of 2" showing the FIRST segment ("Some boys") again at Try 2 -- screen
   text scanned programmatically for `/wrong|incorrect|mistake|error/i`:
   **zero matches**. Screenshot 11 (`after-error-restart.png`) shows the
   neutral restart with no error framing at all, matching fidelity rule 3
   exactly.
3. **Drive to try 3 -> copy mode -> resume at try 4 -> try 5 -> graceful
   stop, no checkmark, same session re-presented.** Confirmed via two
   passes: an 8-iteration loop reached the 5-try-stop screen at iteration 6
   (3 real fails + 1 copy-mode pass-through that doesn't count as a fail +
   2 more real fails == 6, matching the engine's math exactly), then
   "Finish up" -> session-end with no checkmark -> "Done" -> **the same
   session was re-presented** (Level 1 · session 1 of 15, not session 2).
   A second, targeted run confirmed copy mode's exact screen after
   precisely 3 real fails: no "Got it - hide it" gate, the full sentence
   visible immediately alongside the keyboard ("Let's copy it together
   first. It stays right there. / Can some bugs jump?"). Screenshots
   12 (copy mode), 13 (5-try stop), 14 (session end, no checkmark).
4. **Skills Assessment: pass L1, fail L2 -> lands at Level 2, L3-L5 never
   presented.** Typed all 3 real L1 sentences correctly (score 20 >=
   criterion 15) -> advanced to L2 -> submitted both L2 sentences blank
   (score 0 < criterion 16) -> **placement screen: "Skills check done. This
   child scored 0 on Level 2 (needed 16), so Memory Master starts at Level
   2 -- the level they just missed."** `assessState.levelIdx` stayed at 1
   (L2), confirming L3-L5 (indices 2-4) were never presented. Screenshots
   15-18.
   - **Real bug found here, fixed before continuing the walk (see the
     `8f4dfc1` commit)**: the placement-result screen was reusing the R1
     auto-placement offer verbatim (`PlacementChoice` with `CHILD_UNIT`/
     `proposedLevel`), showing "Start at Level 1" regardless of what the
     assessment actually produced -- a real structural gap (no distinct
     screen for the two different ways of arriving at "placement"), not a
     cosmetic issue. Added a dedicated `assess-result` screen keyed off
     `assessState.status`/`placementLevel`/`lastLevelScore`. Re-walked
     after the fix (screenshot 18 reflects the corrected version); build,
     no-emoji, and both Memory Master spec files (21/21) re-run clean.
5. **Practice corner: shows the answer on a miss; confirm unreachable from
   any trial.** Entered from the home screen only (`HomeIntegration`'s
   "Practice corner" wing) -- no trial screen (read/write/assessment/copy/
   stop/session-end) links to it anywhere in `MemoryMasterDevRoute.jsx`
   (confirmed by inspection: `setScreen('practice')` has exactly one call
   site, the home wing's `onClick`). Answered wrong on purpose ("some"
   instead of "Some") -> **the corrected sentence and the rule ARE shown**
   ("Some rockets are flying." / "Look - it goes like this. The first word
   of a sentence always gets a big letter.") -- deliberately the opposite
   of every trial screen's behavior, exactly as designed. Screenshots
   19-20.
6. **Confirm flag OFF -> route 404s, nothing appears anywhere in the
   app.** Already confirmed in Phase 5 on the **real deployed branch
   preview** (not just locally): a live Playwright render of
   `/memory-master-dev` on
   `https://magic-words-ago4f2ao7-brillianceunleashed92-6054s-projects.vercel.app`
   with the flag unset (Vercel's default, no dashboard changes made) shows
   the app's real NotFound screen. No home tile, no nav entry: confirmed by
   inspection -- `HomeScreen.jsx`/`CandyGalaxyShell.jsx` (the real app's
   home/nav) have zero references to `memory-master` or `MemoryMaster`
   anywhere (only `src/screens/memorymaster/` and `main.jsx`'s one new
   `<Route>` reference it).

**Bonus check beyond the doc's 6 steps**: T14's *other* half (error detail
DOES appear on the parent surface) walked live -- one deliberate wrong
submission, then opened the record form via the dev-controls bar: table
showed "L1 S1 · P1 · 2 tries · word missing" -- the classified error kind
visible exactly where the handoff says it should be, and nowhere else.
Screenshot 21.

No console/page errors (`page.on('pageerror')`) across any of the walks.

## APPROVAL STOP

Status: NOT REACHED.
