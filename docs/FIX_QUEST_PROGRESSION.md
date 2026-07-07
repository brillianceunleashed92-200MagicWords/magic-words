# FIX QUEST PROGRESSION — TAP & HEAR COMPLETES, PATH DOESN'T ADVANCE
**Written:** July 7, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/quest-progression`
**Bug report (Sal, with screenshot):** on production `/app`, Today's Quest for word "frog" shows **"0 of 10 done today"** with Tap & Hear marked YOU'RE HERE! and everything below locked (Word Hunt, Match & Sort, Find the Word, Quiz Boss, Story Time, Fill the Story, …). After completing Tap & Hear, the path does not advance to Word Hunt and the counter stays 0.

**Known mechanism (from DEVICE_PREP forensics):** rank "done" = a `learning_events` row exists **today** for `(child_id, word, game_type)` (`src/lib/queries/questProgress.js`), ranks defined in `src/lib/activityDefs.js`. Note the screenshot says **10** ranks including "Fill the Story"; our reports consistently said **9** — reconcile this (Phase 1.0) before anything else.

## RULES — THIS IS DIAGNOSE-THEN-FIX, NOT GUESS-THEN-PATCH
1. **No fix is written until the root cause is demonstrated with evidence** (a failing reproduction + the exact line(s) responsible). If the evidence contradicts a hypothesis below, say so and move on — do not force a fix onto the wrong layer.
2. **Minimal change at the true layer.** No drive-by refactors, no "while I'm here." If the root cause turns out to require touching mastery calibration (the known deferred A2 gap) or the daily-reset design itself, **STOP and report options to Sal instead of deciding** — both are product decisions, not bug fixes.
3. Never modify or write to Sal's real child's data. Reproduce on disposable accounts; if the bug only manifests on his account's state, replicate that state synthetically (seed `word_progress` to match) — read-only queries against his data are permitted only to learn what state to replicate.
4. Approval stops: `git push origin main`, anything destructive. Report `docs/QUEST_FIX_REPORT.md` at step 0 with RUN TIMING + live updates. Deployment check after push per convention.

## PHASE 1.0 — RECONCILE REPO STATE FIRST
`git log --oneline 0e69411..HEAD` (commits since CONTENT_R1's close-out). Our documented runs account for everything up to `0e69411`. If ANY commit exists beyond it, or if `ACTIVITY_DEFS` now contains 10 activities including "Fill the Story" with no run report explaining it, record exactly what changed, when, and in which commit — recent undocumented changes are the #1 regression suspect and may end the investigation immediately. Also record the full `ACTIVITY_DEFS` list verbatim (rank order + `game_type` key for each).

## PHASE 1 — REPRODUCE (production first, then local)
On production with a disposable account (admin-provisioned, consent metadata included):
1. Reach Today's Quest, note the current word and "N of M done today".
2. Complete Tap & Hear fully, **capturing the network log across the whole activity**: does a `learning_events` insert fire? With exactly what `game_type`, `word`, `child_id`? Does it succeed (2xx) or fail silently (RLS/4xx)?
3. Return to the quest **via in-app navigation (no page reload)** — does Word Hunt unlock? Does the counter increment?
4. Then hard-reload the page — does it unlock NOW?
Step 3 vs step 4 is the single most diagnostic comparison in this run: unlocks-only-after-reload means stale client cache (H1); unlocks-never means write/read mismatch (H2/H3/H4).

## PHASE 2 — ROOT-CAUSE AGAINST RANKED HYPOTHESES (test in order, evidence per hypothesis)
**H1 — Missing query invalidation (most likely for an SPA "doesn't progress" symptom).** The quest's react-query data isn't invalidated/refetched when an activity completes; DEVICE_PREP's automation masked this because it navigated with fresh loads. Evidence: Phase 1 step 3 fails, step 4 succeeds; then find the completion handler and show that no `invalidateQueries` (or equivalent refetch) targets the questProgress query key. Fix shape: invalidate the exact query key(s) on activity completion (and check the same gap for `word_progress`-derived UI while there — report it, fix only if same one-line pattern).
**H2 — Writer/reader `game_type` mismatch.** Build the full 10×N matrix: for every rank in `ACTIVITY_DEFS`, find the component that writes its `learning_events` row and the literal `game_type` it writes. Any rank whose def key has no matching writer (or vice versa) is a mismatch — "Fill the Story," being unknown to all prior reports, is the prime suspect, but check every row. Fix shape: align the key at whichever side is wrong per the DB's historical rows (query which keys real data actually contains before choosing which side to change).
**H3 — Word desync between plan and quest.** Does the activity write for the *session plan's* word while the quest tracks a differently-computed `currentWord` (e.g., cached plan vs. fresh `word_progress` pick, or the known mid-session roll-forward when one correct answer masters a word)? Evidence: the Phase 1 network capture's `word` vs. the quest header's word. Fix shape: single source of truth for the quest's word within a session — but if the real driver is one-answer-mastery rolling the word forward, that's the A2 calibration decision: STOP and present options.
**H4 — "Today" boundary bug.** How does `questProgress.js` compute "today" (client-local vs UTC vs a date column)? The screenshot is 7:18 AM ET — verify a row written now is matched by the reader's date filter, and confirm intended behavior: per-day reset of rank progress appears to be the design ("done **today**"). If Sal's report turns out to be "I completed it yesterday and it reset," that is working-as-designed — report it as a UX decision (persist ranks across days vs. daily quest), don't change it unilaterally.
**H5 — Silent write failure.** RLS policy, allowlist, or error-swallowing around the `learning_events` insert. Evidence: the Phase 1 network capture status codes + any caught-and-dropped errors in the writer.

## PHASE 3 — FIX (minimal, at the demonstrated layer) 
Implement only what the evidence demands. Whatever the cause, add the cheap permanent guard: a `scripts/check-activitydefs-sync.mjs` in the style of the existing `check-*-sync` build gates, asserting every `ACTIVITY_DEFS` entry has a writer using the identical `game_type` literal (static source scan) — wire it into `npm run build` alongside its siblings so a future rank/writer drift fails the build, not a child's quest.

## PHASE 4 — REGRESSION TESTS
New Playwright spec: as a real user (disposable account), complete Tap & Hear end-to-end → assert Word Hunt unlocks and the counter increments **without a page reload**, then also after reload. If H2/H3 was the cause, add a unit assertion pinning the writer/reader key or word-source agreement. Full suite green (current baseline; flakes re-run in isolation).

## PHASE 5 — SHIP + PROVE ON PRODUCTION
Gates → merge `--no-ff` → **approval stop** → push → deployment check → production verify by replaying Phase 1's exact repro on a fresh disposable account: complete Tap & Hear, watch Word Hunt unlock in-app without reload, counter "1 of N". Screenshot the unlocked state. Delete test accounts, cascade-verify.

## COMPLETION
Report: Phase 1.0 reconciliation (any undocumented commits + the verbatim ACTIVITY_DEFS list), the reproduction evidence, which hypothesis held with the exact culpable lines, the fix diff summary, sync-gate addition, test results, production proof. If the answer turned out to be "working as designed" (H4 daily reset) or "requires a product decision" (H3/A2), the report ends with the options laid out for Sal instead of a shipped change — that is a successful run.
