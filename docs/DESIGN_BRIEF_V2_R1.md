# DESIGN_BRIEF_V2_R1 — Lock the Blank-Overhaul Design Canon (docs-only run)

Date authored: 2026-07-13 · Author: chat session (architect) · Executor: Claude Code CLI
Run type: **docs-only**. No app code. No database. No `supabase` commands of any kind. One approval stop (before `git push origin main`).

---

## HOW TO RUN (Sal)

1. Confirm `~/Downloads/200mw-design/` contains all 11 required files (list in PHASE 2), including this file.
2. `cd ~/magic-words`
3. `claude --dangerously-skip-permissions`
4. Paste: `Read ~/Downloads/200mw-design/DESIGN_BRIEF_V2_R1.md and execute it exactly, top to bottom. Stop at the APPROVAL STOP.`

---

## MISSION

Dr. Marion Blank reviewed 200 Magic Words and the instructional core is being redesigned to her method: one word per session taught through a graded trial ladder, errorless handling, compositional review. The design phase is complete — 9 mockups (F–N) plus a distilled pedagogical source document. This run makes that design the repo's committed canon: commit the mockups and sources doc, write `docs/DESIGN_BRIEF_V2.md`, supersede the v1 brief and mockup-D, and add the master-doc changelog entry. **This run changes documentation only.** The build chain (R1–R8) is gated behind CURRICULUM_RECON_R1 and Dr. Blank's sign-off and is NOT part of this run.

---

## HARD RULES

1. **Docs-only.** Every added or changed path must be under `docs/`. If `git diff --name-only` ever shows a path outside `docs/`, stop, revert it, note it in the report.
2. **Worktree trap.** The primary checkout `~/magic-words` is on `feat/quick-wins`. `main`'s checkout lives in a worktree with a misleading directory name (expected `.claude/worktrees/fix-story-quality`). Locate everything with `git worktree list` first; trust `git branch --show-current`, never directory names.
3. **Ingest source is `~/Downloads/200mw-design/` only.** Never read or copy design assets from anything under `.claude/worktrees/`.
4. **Mockups are committed byte-identical.** Do not reformat, prettify, "fix," or de-duplicate anything inside them. Known demo-data inconsistencies across mockups (unit names/numbers) are intentional and acceptable. If this prompt and a mockup disagree on a rule or number, this prompt wins — log the discrepancy in the report.
5. **No emoji** in anything committed, including the report. **No new red** (#ff0000-family) anywhere.
6. Do not touch `feat/quick-wins`. Do not delete, prune, or clean any worktrees.
7. **Approval stop:** complete everything through the local merge, print the summary, then WAIT. Push only after Sal replies "approved".
8. **FINAL STATUS proof-of-artifact standard (mandatory, per DOCS_MASTER_V5_R2):** the run is complete only when the report pastes (a) `ls -la` of every deliverable path in the repo, (b) `git log -1 --stat` of the pushed commit, (c) `git log origin/main -1 --oneline` after push. Missing any of the three = run not complete.
9. **Scope discipline:** out-of-scope findings go to the DEFERRED list in the report. Do not pursue.

---

## PHASE 0 — Run report

Create `docs/DESIGN_BRIEF_V2_R1_REPORT.md` (in the run worktree created in PHASE 1; if that ordering is awkward, create it immediately after the worktree exists — it must exist before any substantive work). Record RUN TIMING start timestamp. Live-update at the end of every phase. Last section is FINAL STATUS.

## PHASE 1 — Orientation

1. `git worktree list` — record the full list in the report. Identify the worktree whose branch is `main`.
2. In `main`'s worktree: `git status --porcelain` must be empty (if not, stop and report), then `git fetch origin` and `git log origin/main -1 --oneline`. Expected `85e8762`, but proceed from whatever `origin/main` actually is; if different, record it and continue. `git pull --ff-only` to sync local main.
3. Per current convention, create this run's own worktree: `git worktree add .claude/worktrees/design-brief-v2-r1 -b docs/design-brief-v2-r1 origin/main` (run from `~/magic-words`). All authoring work happens in that worktree.

## PHASE 2 — Verify ingest

`ls -la ~/Downloads/200mw-design/` — required files (11):

```
mockup-F-word-journey.html
mockup-G-home-loop.html
mockup-H-grownups.html
mockup-I-placement.html
mockup-J-unit-gate.html
mockup-K-story-reader.html
mockup-L-galaxy-map.html
mockup-M-first-flight.html
mockup-N-full-experience.html
BLANK_METHOD_SOURCES.md
DESIGN_BRIEF_V2_R1.md   (this file)
```

If ANY required file is missing: stop, list what is missing in the report and console, end the run. Record byte size and `sha256sum` of each required file in the report.

## PHASE 3 — Commit design assets (commit 1)

In the run worktree:

1. `mkdir -p docs/design/mockups`
2. Copy the 9 mockup HTML files into `docs/design/mockups/` unchanged. Verify: `sha256sum` of each committed copy must equal the drop-folder original. Paste both columns in the report (positive evidence, 9/9).
3. Copy `BLANK_METHOD_SOURCES.md` to `docs/BLANK_METHOD_SOURCES.md`.
4. Copy this prompt to `docs/DESIGN_BRIEF_V2_R1.md`.
5. Create `docs/design/mockups/README.md` containing exactly this canon table plus one line — "Files are committed byte-identical from the 2026-07-13 design session. Do not edit mockups in place; superseding designs get new letters." —

| Mockup | Locks | Status |
|---|---|---|
| F word-journey | 7-stage ladder, pretest, guided completion, per-word celebration | CANON |
| G home-loop | Home v2: journey card states, bonus cap, Polish Your Stars review, function-ladder variant | CANON |
| H grownups | Grown-Ups v2: 4 word states incl. pretest-passed, per-word evidence, prescriptions, why-it-works | CANON |
| I placement | Placement v2: warm-up gate, measurement probes, two-miss floor, scoreless results | CANON |
| J unit-gate | Progress Check: measurement probes, pass constellation celebration, polish path | CANON |
| K story-reader | Karaoke read-along, tap-the-word hunt, comprehension | CANON |
| L galaxy-map | 18 constellations, unit detail sheet, Nova's Playground; region names ILLUSTRATIVE | CANON |
| M first-flight | Hold-to-continue grown-up gate, COPPA-lean setup, Star Seeds gentle start | CANON |
| N full-experience | Single-shot integration + live motion/sound reference; UNTESTED | REFERENCE ONLY |
| D, E2, all earlier | Prior generation | SUPERSEDED |

Commit: `DESIGN_BRIEF_V2_R1: commit design canon assets (mockups F-N, Blank method sources)`

## PHASE 4 — Write docs/DESIGN_BRIEF_V2.md (commit 2)

Author the brief with EXACTLY the sections below. Where this prompt supplies facts, transcribe them faithfully — invent nothing. Read the committed mockups for component-level detail. Cite pedagogy to `docs/BLANK_METHOD_SOURCES.md` by section number (e.g. "Sources §6") rather than restating claims — paraphrase-drift on pedagogy is a defect.

**1. Status and canon.** Design canon = mockups F–M; N = reference only (single-shot, untested — if broken it is not debugged, F–M govern). DESIGN_BRIEF v1, mockup-D, mockup-E2, and all earlier mockups are superseded. All designs use the locked Candy Galaxy tokens: no emoji, no red, `prefers-reduced-motion` honored. Include the canon table from PHASE 3.

**2. Non-negotiable rules.**
- Anti-phonics survives every new primitive: letter tiles are SILENT; the whole word speaks only on completion; letter names and letter sounds are never spoken anywhere, ever.
- Teaching vs measurement contract (extends the standing §5a rule): teaching mode = scaffold present, hint-glow, guided completion, Nova assists. Measurement mode (placement, Star Check-In, unit Progress Check) = no scaffold, no hints, unassisted, identical neutral feedback for right and wrong; measurement Build It lets tiles place freely and scores silently. (Sources §6: "Do not offer any assistance.")
- Sounds attach to actions, never to letters. No negative or error sounds — misses are silent; the hint gets a soft sparkle.
- One-hero-motion rule per screen. Transform/opacity only; canvas past ~20 particles.
- No emoji. No red. Reduced-motion honored everywhere.

**3. The Word Journey ladder (content words).** One word per session, ~30–40 trials (a trial = one child response), ~8–12 minutes. Other words appear only as sentence context and distractors.
1. Meet It (2 trials)
2. Spot It (6, engineered look-alike distractors)
3. Know It (4, pictures)
4. Almost It (4, which-frame-can-become-it, includes dead frames)
5. Build It (4–5, scaffold shrinks each trial, FINAL BUILD UNASSISTED)
6. Use It (4, cloze)
7. Story (tap-the-word + shipped comprehension)

Function-word variant: skip stage 3 pictures; add Find-It-in-a-sentence + Use It x2. Grammar formats (Stay 'n Play / Cipher Wiz analogs) deferred to v2.

**4. Session economy.** 1 new word/day = the streak quest; completing it unlocks ONE bonus word; hard cap 2/day. Extra appetite routes to review (Polish Your Stars) + stories.

**5. Pretest — Is It Known.** Every new word opens with one UNASSISTED Build It. Pass = skip forever; counts as mastered for progression; NO mastery celebration; distinguishable in the Parent Portal. Implementation contract for R6 (documented here, NOT built in this run): its own `product_events` type requires the DB CHECK constraint + `api/track` allowlist updated in the same change, with a positive-landing test after migration; the migration takes the next number after what is applied to production per `supabase/migrations/MIGRATIONS.md` (expected 0039+).

**6. Guided completion (teaching mode only; replaces two-miss-completes).** Miss 1 = current behavior (wiggle/soften + hint-glow). Miss 2 = the trial transforms: foils fade to ~15% and lock, Nova models the answer aloud, only the glowing target is tappable; the child ends on their own correct tap; logged completed-with-help (telemetry and mastery stay honest). Ladder mercy: 2 guided completions within one ladder → remaining stages shorten and drop to easier formats (extends scaffold-down v1). Measurement modes unchanged.

**7. Mastery redefinition.** Ladder completion ending in an unassisted Build It = owned same-day; spaced review confirms retention; review misses can un-master. Replaces the 80%/3-attempts rule. Star pacing follows: per-word celebration stays modest; the unit gate owns the big one.

**8. Unit gate.** Quiz Boss becomes a true Progress Check: unassisted, production-weighted, every unit word; pass → unit-complete constellation celebration; weak → the named weak words get 4-stop polish journeys (Meet/Spot/Build/Use), no failure language, parent sees a prescription card. Boss art reuses the existing asset if present.

**9. Placement v2.** Honest copy ("about 2 minutes", early-end normalized — ships the queued copy fix). Sequencing warm-up gate doubles as the tap tutorial; struggle routes to the Star Seeds gentle start (mockup M). Probes mix recognition + MEASUREMENT-MODE Build It + sentence rungs; two-miss floor; scoreless child results. Server ladder, unassisted probes, never-regress display unchanged. Weak check-ins now ADD review prescriptions (display floor stays).

**10. Reintroduction and review.** Compositional carrier sentences built only from the child's owned/prior words; cumulative Book-analog stories per unit; existing spaced `dueForReview` surfaced as the Polish Your Stars block.

**11. Celebration economy.** Correct tap = puff → word owned = burst → unit gate = constellation self-draw + chord + double cannon. Pretest pass = none.

**12. Content data contract (generation is build-chain R1, blocked on CURRICULUM_RECON_R1 — documented only).** Per-word look-alike distractor sets (~6/word; non-curriculum foils allowed since the child never reads them aloud) + carrier-sentence banks (~4/word) constrained to curriculum-cumulative vocabulary. AI-generated behind the vocab gate; Sal ratifies via pre-approved edit tables.

**13. Component contracts.** For each component below, derive from the mockups and write: purpose · states · key data needs · teaching-vs-measurement variant (where applicable) · motion hooks · audio hooks. Components: JourneyMap · WordIntroCard · LetterSlots + LetterTray (silent tiles; 2–3 decoys; wrong tile wiggles + bounces back — errorless by construction; shrinking scaffold levels; measurement variant places freely and scores silently; on-screen QWERTY = v2) · frame tiles (Almost It, incl. dead frames) · guided-completion state machine · measurement-mode variants · constellation system · Star Seeds · Nova's Playground (RhymeTime relocated off-path; code intact, no deletion).

**14. Motion and sound spec.** Free/production stack: Rive (Nova state-machine character: idle blink/bob, listening tilt, point during guided completion, celebrate) · GSAP 3 (fully free since the Webflow acquisition; timelines: constellation draw, map ignition) · Motion (spring physics; layoutId shared elements: word card → star) · canvas-confetti (star shapes, tiered recipes) · Howler + Kenney CC0 audio sprite · CSS `offset-path` (Nova flies the path) · auto-animate (grids) · Haikei (static SVG backdrops). Sound kit: 8–10 sounds, one pentatonic family; the ladder plays a rising arpeggio per stage; ElevenLabs SFX generation available on the existing subscription. Rules: sounds attach to actions, never letters; transform/opacity only; canvas past ~20 particles; lazy-load Rive/GSAP after first paint (protects the cold-tap win); bundle everything, no runtime CDNs (COPPA/offline); `prefers-reduced-motion` honored; one-hero-motion per screen; no negative/error sounds. Ambient layer (demonstrated live in mockup-N): 2-layer parallax starfield + twinkle, aurora warmth tied to ladder progress, squash-and-stretch on every touchable.

**15. Rollout.** Existing tap-mastered words grandfathered as known; optional Build It confirmation later via review prescriptions.

**16. Deferred (documented, not designed).** Word forms (Marion spec Q2 — if non-negotiable, curriculum + schema change lands before the ladder build) · grammar/sequencing formats · on-screen QWERTY · mockup-N debugging · the 18 galaxy region names in L (illustrative; content ratification pass needed).

**17. Build order pointer.** R1 CONTENT_LADDER_DATA → R2 primitives → R3 Word Journey client shell → R4 session inversion (riskiest) → R5 guided completion → R6 pretest + mastery redefinition + migration + parent-dashboard reconciliation → R7 review block + story tap-the-word → R8 QA + device pass. PLACEMENT_V2 slots after R2. All gated behind CURRICULUM_RECON_R1 + Marion sign-off.

Commit: `DESIGN_BRIEF_V2_R1: write DESIGN_BRIEF_V2 (Blank-overhaul design canon)`

## PHASE 5 — Supersede prior canon (part of commit 2 or its own commit)

1. Locate the v1 brief: `git ls-files docs | grep -i brief` (expected `docs/DESIGN_BRIEF.md`). If present, prepend exactly:
   `> SUPERSEDED (2026-07-13): replaced by DESIGN_BRIEF_V2.md. Kept for history. This document and mockups D/E2 no longer govern new work.`
   If absent, note in the report — the V2 canon table already declares supersession.
2. Locate any committed prior mockups: `git ls-files | grep -i mockup`. Do NOT delete anything; record locations in the report.

## PHASE 6 — Master doc changelog (commit 3)

1. Locate the master doc: `git ls-files docs | grep -i -E "Master_Project"` (expected `docs/200MW_Master_Project_Doc_v5.md`).
2. Census, do not assume: read the changelog and find the current highest item number (expected 23 = FIX_MIGRATION_DRIFT_R1 — verify by reading).
3. Append the next item, one entry, surgical edit only:
   `24. DESIGN_BRIEF_V2_R1 (2026-07-13, docs-only): Blank-overhaul design canon locked. Mockups F-M committed as canon (N reference-only) at docs/design/mockups/; BLANK_METHOD_SOURCES.md committed as pedagogical source-of-record; DESIGN_BRIEF_V2.md written (ladder, session economy, pretest, guided completion, mastery redefinition, unit gate, placement v2, celebration economy, component contracts, motion and sound spec); DESIGN_BRIEF v1 and mockups D/E2 superseded. No app code changed.`
   (Renumber if census says otherwise.)

Commit: `DESIGN_BRIEF_V2_R1: master doc changelog entry`

## PHASE 7 — Gates (all must pass; paste evidence for each in the report)

1. **Path gate (positive):** `git diff --name-only origin/main...HEAD` — every line must start with `docs/`. Paste the full list plus `wc -l`. Any non-docs path = stop.
2. **Byte-identity gate:** re-run `sha256sum` on the 9 committed mockups vs the drop-folder originals; 9/9 must match.
3. **No-emoji gate:** run the repo's existing script `npm run check:no-emoji` (it is separate from `build`). Belt-and-braces: also grep the newly added docs files for emoji codepoints and print the count of files scanned (positive twin — the pass must not be vacuous). If a MOCKUP matches: STOP (byte-identity conflict; needs Sal). If a non-mockup doc matches: remove the character, note it.
4. **Build sanity:** `npm run build` passes (runs the 6 sync checks + vite build; if deps are missing, `npm install` then retry). Docs-only should not affect it — this catches accidents.
5. **Playwright / IDOR: intentionally NOT run.** Zero app code changed, enforced by gate 1. State this line verbatim in the report.

## PHASE 8 — Local merge + APPROVAL STOP

1. In `main`'s worktree: `git merge --no-ff docs/design-brief-v2-r1 -m "DESIGN_BRIEF_V2_R1: lock Blank-overhaul design canon (docs-only)"`
2. Print: deliverable list, gate results, the changelog entry text, `git log -3 --oneline`, and `git log -1 --stat`.
3. Print exactly: `AWAITING APPROVAL: reply "approved" to run git push origin main. Nothing has been pushed.` Then WAIT. Do not proceed on anything other than an explicit approval from Sal. The approval covers this push and the final-report docs push in PHASE 10 — no other pushes.

## PHASE 9 — Push + deployment verification (after approval only)

1. `git push origin main`
2. Verify the deployment via the GitHub commit-status API (+ `vercel list` / `vercel inspect` if needed). Do NOT use the Vercel MCP connector — it is authenticated to the wrong account. Derive owner/repo from `git remote get-url origin` (expected `brillianceunleashed92-200MagicWords/magic-words`), poll `https://api.github.com/repos/OWNER/REPO/commits/<sha>/status` until overall state is `success` (timeout 10 minutes; on failure or timeout, paste the raw status JSON and stop).
3. Production walk: **N/A for this run** — no app behavior changed (enforced by gate 1). State this explicitly in the report so the certification is honest.

## PHASE 10 — FINAL STATUS

Update the report: end timestamp + duration, DEFERRED list, and the three proofs —
(a) `ls -la docs/DESIGN_BRIEF_V2.md docs/BLANK_METHOD_SOURCES.md docs/DESIGN_BRIEF_V2_R1.md docs/DESIGN_BRIEF_V2_R1_REPORT.md docs/design/mockups/`
(b) `git log -1 --stat`
(c) `git log origin/main -1 --oneline`

Commit the final report on main (`DESIGN_BRIEF_V2_R1: final report`) and push (covered by the PHASE 8 approval). Last line of the report and console, exactly:

`FINAL STATUS: COMPLETE — docs-only; production walk N/A (no app code changed); proof-of-artifact pasted above; origin/main = <hash>; final report pushed.`

---

## DEFERRED (seed the report's list with these; add discoveries)

- Relocate `main`'s checkout out of the misleadingly named `.claude/worktrees/fix-story-quality` (hygiene run)
- Remove 5 stale run worktrees (docs-master-v5, fix+no-blank-screens, fix-story-followup, qa+e2e-audit, qa+pedagogy-preview-walk) — do not automate casually
- CURRICULUM_RECON_R1 (next run; blocked on the full workbook set / Marion master list)
- Word forms curriculum + schema decision (Marion spec Q2)
- Galaxy region names content ratification (mockup L)
- Placement copy fix may ship standalone before PLACEMENT_V2

— end of prompt —
