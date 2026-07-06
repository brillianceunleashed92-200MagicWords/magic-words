# DEVICE SESSION PREP — AUTOMATE THE AUTOMATABLE, TEMPLATE THE REST
**Written:** July 6, 2026 · **Execute from:** `~/magic-words` · **Works on `main`** (this run changes ZERO product code — writes are docs-only)
**Purpose:** knock out the parts of `docs/DEVICE_TEST_CHECKLIST.md` a computer can do (items 5, 3, and the automation-side evidence for 7), and produce a pre-filled results file so Sal's phone session covers only the irreducibly physical items (1, 2, 4, 6, 7-mobile).

## HARD CONSTRAINTS
1. **No product code changes.** Only writes permitted: `docs/DEVICE_TEST_RESULTS_2026-07-06.md`, `docs/DEVICE_PREP_REPORT.md`, and this prompt doc's commit. Bugs or content problems get RECORDED, never fixed here.
2. **Never touch Sal's real accounts or any real user's data.** Disposable accounts only (`scripts/admin-user.mjs`, which now writes `parental_consent` metadata), deleted at the end.
3. Chrome automation via the browser MCP is allowed; standing traps apply (rAF throttling in unfocused tabs, hidden-tab media suspension). No secrets echoed anywhere.
4. Approval stop before `git push origin main`. Report at step 0 with RUN TIMING + live updates.

## PHASE 1 — LOOK-ALIKE MANIFEST AUDIT (checklist item 5, done for Sal to ratify)
Read `src/games/findTheWordManifest.js` in full — all 200 entries. The activity's purpose, per Dr. Blank's method, is **visual/orthographic discrimination between real words**: a good distractor LOOKS like the target (shared letters, shape, length); a bad one is confusing for the wrong reason. For every entry, judge each distractor against these flags:
- **SEMANTIC**: related by meaning rather than appearance (e.g., "dog" as a distractor for "cat") — tests the wrong skill.
- **NOT-ALIKE**: shares too little visually to be a meaningful discrimination (a giveaway, not a look-alike).
- **ODD**: reads strangely to a young child out of context, is not a real word, or is age-inappropriate.
- **DUPLICATE/SELF**: distractor equals the target or repeats within the entry.
Output in the report: a table of FLAGGED entries only — `word | distractor | flag | one-line why | suggested replacement (clearly marked as a suggestion)` — plus summary stats (entries clean / entries flagged / total distractors reviewed). Do not edit the manifest. Sal ratifies the list; edits happen in a later content pass.

## PHASE 2 — GALAXY-LOCK LIVE VERIFICATION (checklist item 3, upgraded from an eyeball to a proof)
The original checklist step eyeballs Sal's real account. Do better, synthetically:
1. Create a disposable account + child (`admin-user.mjs`; complete onboarding via automation Chrome, "Brand-new reader").
2. Via the service-role client (same pattern as prior hardening verifications), upsert `word_progress` for that child so three states exist on path words: one word with `mastery: 40, attempt_count: 2` (expect **in-progress**: percentage + play icon, tappable), one with `mastery: 0` / no row (expect **lock or current** per position), one with `mastery: 85` (expect **done** styling).
3. Load the Galaxy map in automation Chrome, screenshot it, and verify each tile's rendered state against `GalaxyScreen.jsx`'s fix logic (`inProgress = !done && !isCurrent && mastery > 0`) by DOM inspection, not just the screenshot.
4. Record PASS/FAIL per state in the report with the DOM evidence. Delete the account.
Sal's manual step 3 then reduces to an optional glance at his own account.

## PHASE 3 — SAY-IT AUTOMATION-ENV EVIDENCE (the automation half of item 7; bounded, best-effort)
With a disposable account in automation Chrome, attempt to reach the Say It with Nova activity (placement-skip account, play/skip through the session plan as needed). **Time-box this to ~10 minutes** — if the activity isn't reachable cleanly (session composition may not include it for a fresh Unit-1 account), mark SKIPPED-TO-MANUAL and move on; do not force it.
If reached: capture (a) the full network-request log over the screen's lifetime, confirming **zero speech-recognition requests originate from the app itself** (the forensics B1 finding, now with runtime evidence), and (b) every `[SayItDiag]` console line — in an automation context the mic will likely fail permission or never auto-start, and that diagnostic sequence is itself useful data for comparing against Sal's real-device console capture. Record both verbatim in the results file. Note explicitly: browser-process speech traffic is invisible at page level, so an empty log is the expected result, not proof of absence — the mobile screenshots remain Sal's step.

## PHASE 4 — GENERATE THE RESULTS FILE
Create `docs/DEVICE_TEST_RESULTS_2026-07-06.md`, structured to mirror the checklist:
- Items 5, 3, 7-automation: **pre-filled** with this run's findings (manifest flag table, galaxy PASS/FAIL evidence, network/diag captures), each marked `AUTOMATED — [date] — ratify/confirm`.
- Items 1, 2, 4, 6, 7-mobile: **fill-in-the-blank sections** with the exact Observe/Record fields from the checklist as labeled blanks (browser+OS version: ___, auto-listen fired: Y/N, etc.), plus a one-line pointer to the matching step in `SAL_DEVICE_SESSION_GUIDE.md`. Make it something Sal can type into on a phone or paste console lines into without thinking about structure.

## COMPLETION
Report ends with: Phase results, the flagged-manifest count, galaxy verdict, and a printed reminder of exactly what remains human: **(1) real-device mic test, (2) misfire mash attempts, (4) dad/squint test, (6) Chrome saved-password cleanup, (7) mobile network screenshots.** Commit this prompt + report + results template → approval → push.
