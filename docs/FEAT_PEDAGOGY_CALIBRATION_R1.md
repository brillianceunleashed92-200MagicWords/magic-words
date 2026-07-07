# 200 MAGIC WORDS — FEAT_PEDAGOGY_CALIBRATION_R1: MASTERY GATE + SCAFFOLD-DOWN + ATTEMPT WIRING
## Backlog Package B · **Written:** July 7, 2026 · **Execute from:** `~/magic-words` · **Branch:** `feat/pedagogy-calibration`
Self-contained. No gate tokens. Builds directly on Package A's seams (`docs/PARENT_METRICS_REPORT.md`, NOTES FOR PACKAGES B/C).

## MISSION
Close the three MLC-fidelity gaps deferred as "the A2 family": (1) a word must not be TREATED as mastered anywhere in the app below 3 attempts — today only the celebration gates on `isRealMastery` while the stored value hits 100 off one tap and rolls `currentWord` forward (the confound that masked the quest-fix run's first repro attempt); (2) struggle-based scaffold-down — Dr. Blank's method responds to struggle by stepping DOWN the demand, the biggest fidelity gap on record; (3) wire `learning_events.attempt_number` for real. Plus one launch-visible fix promoted from Package A's report: the Dashboard's This Week hero stats contradict the new charts on the same screen.

## ARCHITECTURE DECISION — LOCKED UP FRONT
**Do not change the stored mastery formula.** The write path (`useSaveWordProgressMutation`: pure cumulative `correct_count`/`attempt_count` ratio) stays byte-identical. This run changes READERS: every consumer that treats `mastery >= 80` as "mastered" moves to the shared `isRealMastery` predicate (`src/lib/masteryCalibration.js` — Package A's extraction, built as exactly this seam). Rationale: no migration, no historical-row rewrite, and Package A's replay-purity proof (`src/lib/masteryReplay.js`) remains valid untouched. **If evidence convinces you the stored formula itself must change, STOP and report options — that invalidates the purity proof and is a product decision.** If only the predicate's semantics change (threshold/attempt floor via `masteryCalibration.js`), the parent charts update automatically through the shared import; note in the report that chart 1's historical weeks will retroactively re-render under the new definition — expected and acceptable, but say so.

## RULES
1. Report `docs/PEDAGOGY_CALIBRATION_REPORT.md` at STEP 0 with RUN TIMING, live updates, committed in the first commit. **FINAL STATUS's last line must self-certify the post-production-walk docs push** (new standing convention — two runs in a row left this ambiguous).
2. Approval stops: `git push origin main`, `supabase db push` (only plausibly needed if attempt_number requires a column — recon first; if the column already exists, no migration), destructive ops. Deployment check after push per convention.
3. Diagnose-then-fix: every consumer change is preceded by a census entry (Phase 1) showing the exact line and current behavior. No drive-by refactors.
4. Test accounts: `nextgenprecisiondrones+*` via `scripts/admin-user.mjs` **with `parental_consent` metadata**. Self-provisioning specs use the SAME prefix (Package A's specs introduced an `mwparentmetrics*` pattern — do not add a third; one greppable convention). Clean up, cascade-verify. Never touch Sal's real data.
5. Candy tokens only, errorless everywhere, NO emoji, no red/X. **Core methodology rule: no phonics, no sound-blending, ever.** Scaffold-down must never read as demotion or failure to the child — no locks regressing, no downgrade language; Nova frames it as help.
6. Suite baseline is **60** — new specs only add; any shrink is an alarm.

## PHASE 0 — REPORT + RECON
Read before writing: `masteryCalibration.js`, `masteryReplay.js`, `parentMetricsDerivations.js` (esp. `computeWeeklyMasteryCrossings`), `useCandyGalaxyData` (currentWord selection, `masteredCount`, `completedUnits`, galaxy per-word status derivation incl. the `inProgress` fix), `api/session-generator.js` (candidate selection, `reviewOnly` mode, free-tier cap + placement-floor interplay — confirm whether it can import `src/lib/masteryCalibration.js` directly; Vercel functions bundle per-file imports, verify rather than assume), `weeklyStats.js`, the difficulty governor, `questProgress.js`, and the `learning_events` schema (does `attempt_number` exist as a column today, and what do current writes put there).

## PHASE 1 — CONSUMER CENSUS
Grep-complete table in the report: every read of `mastery` compared against 80 (or any mastered/completed derivation) across client AND `api/` — file, line, current predicate, intended predicate, child-visible effect of the change. Include at minimum: `useCandyGalaxyData` (currentWord roll-forward, masteredCount, completedUnits), GalaxyScreen tile states, `weeklyStats.js` (`wordsThisWeek`, `weakWords`), session-generator selection + reviewOnly pool, quest/guided-path derivations, upgrade-banner measured level. The census is the contract for Phases 2–3; anything found later that isn't in it goes in the report as a census correction.

## PHASE 2 — THE SAME-SCREEN INCONSISTENCY (first, it's live)
`weeklyStats.js`: move `wordsThisWeek`/`weakWords` onto `isRealMastery`. Leave `SECONDS_PER_EVENT` untouched (Package E owns the minutes labeling). Verify live that the This Week hero number and chart 1 now agree on the same seeded fixture.

## PHASE 3 — MASTERED-STATUS GATE, EVERYWHERE
Apply the census: all consumers read `isRealMastery`. Intended behavior change, verified live: a word answered correctly ONCE (100% stored mastery, 1 attempt) (a) remains the guided path's current word — no roll-forward, Blank's repeated-meaningful-exposure by design; (b) shows in-progress, not mastered, on the Galaxy; (c) does not count in masteredCount / This Week / chart 1 / unit progress; (d) is still selectable by the session-generator (both normal and reviewOnly). Confirm the free-tier cap and placement floor still behave identically (they gate by unit, not mastery — verify, don't assume). Server-side: if `api/` cannot cleanly import the shared module, mirror the predicate in ONE named server constant with a comment binding it to `masteryCalibration.js` and add a check-script or unit test asserting the two stay numerically identical — never two silently-independent literals.

## PHASE 4 — ATTEMPT_NUMBER WIRING
Per recon: if the column exists, the writer (`PlayScreen.handleProgress` → the `learning_events` insert) populates it with the word's true running attempt index (stored `attempt_count` at write time + session-local increment for multiple same-word answers before refetch — get the ordering right and unit-test it). If the column does not exist, STOP-and-report the migration for approval before writing it (migration lands before any code reading it, per standing rule). Backfill decision: do NOT backfill historical rows; document that `attempt_number` is reliable only from this deploy forward.

## PHASE 5 — SCAFFOLD-DOWN (conservative v1, pre-specified — deviations are UNRESOLVED + proposal, never improvised)
- **Trigger**: two consecutive COMPLETED errors (second-miss completions, post-errorless-scaffold) on the same word within a session.
- **Response**: the difficulty governor pins that word's NEXT activity to its easiest valid tier — `word_match` (Tap & Hear) for `has_art` words; the easiest context/cloze activity for function/no-art words (derive the tier map from the existing pedagogical order; put the map verbatim in the report). One Nova line on transition, encouraging, never referencing difficulty ("Let's look at this one together!"). No visual demotion anywhere.
- **Reset**: one correct completion at the easier tier releases the pin (normal governor order resumes).
- **Telemetry**: write a `product_events` row (`scaffold_down`, service-role pattern already established) so post-launch data can tune the trigger — no new table.
- Respect every existing scaffold rule (§5 of DESIGN_BRIEF; placement carve-out untouched).

## PHASE 6 — PACKAGE A COUPLING (required, small)
Add the truncation guard to `computeWeeklyMasteryCrossings`: for each in-window crossing, compare the replay's final `(attemptCount, correctCount)` to the stored `word_progress` row (already fetched for charts 5/6). Mismatch = the 84-day window truncated that word's history = the "crossing" may be a re-cross of a long-mastered word's reviews — skip it. Unit-test both branches (genuine in-window crossing kept; truncated-history review sequence skipped). Note in the report: this makes chart 1 slightly under-count the rare word that began pre-window and genuinely crossed in-window — the honest direction of error.

## PHASE 7 — FIXTURES + TESTS
Seed: a one-tap-100% word, a genuine ≥3-attempt mastered word, a struggle sequence (two completed errors), a >84-day synthetic history exercising Phase 6's guard, mixed reviewOnly pool. Specs: the one-tap word is non-mastered in every Phase 3 surface (galaxy state, masteredCount, This Week, chart 1, unit progress) and still selected by the generator; scaffold-down triggers, pins, resets, and writes its product_event; attempt_number monotonic per word; weeklyStats/chart-1 agreement; the two truncation-guard cases. 60 + new only.

## PHASE 8 — GATES, VERIFY, SHIP
Full gates (build + all 5 checks, no-emoji, Playwright `workers:1`). **Re-run `scripts/idor-proof.mjs`** — session-generator selection and progress-derivation changes are the standing trigger. Preview walk on a fresh disposable: the full one-tap-word journey (play once → still current → play to 3 attempts → masters → celebrates once → galaxy/counts/charts all agree), a scaffold-down live trigger, a reviewOnly Quiz Boss. Merge `--no-ff` → approval → push → deployment check → production walk (same journey, light seed) → cleanup + cascade-verify → report DONE with end timing → **docs push, self-certified in FINAL STATUS**.

## REPORT (docs/PEDAGOGY_CALIBRATION_REPORT.md)
### RUN TIMING
### CONSUMER CENSUS — the Phase 1 table, with any later corrections
### ARCHITECTURE — confirmation the stored formula is untouched (or the STOP that fired); server-side predicate strategy; retroactive chart-history note
### SCAFFOLD-DOWN — trigger/response/reset as shipped, the tier map verbatim, telemetry
### ATTEMPT_NUMBER — schema finding, writer change, forward-only reliability note
### PACKAGE A COUPLING — truncation guard + tests
### VERIFICATION — fixtures, results vs. 60 baseline, gates, idor-proof, preview + production walks
### NOTES FOR PACKAGE C — what the placement report / Star Check-In should reuse
