# 200 MAGIC WORDS — PROMPT 3: WORDART LEGIBILITY / HYBRID ART PASS
## Third in the repair sequence (after audio consolidation). Self-contained. LOAD-BEARING for Prompt 4 (Fill the Story rebuild) — the cloze redesign only works if these pictures can disambiguate answers.

## MISSION
The verb art is the problem: run/jump/swim/dance are near-identical yellow blobs, so no picture can disambiguate an answer — this is WHY Fill the Story feels broken. Three jobs, in order:
1. **Audit + fix vague art** across all shipped WordArt (Units 1–10). Known offenders: run, jump, swim, dance, duck, shark.
2. **Nova verb set** — standalone verbs (Word Match, Draw It, any single-word picture context) are performed by Nova. Run pose = "A" (locked).
3. **Composed scenes for Fill the Story** — the sentence's NOUN performing the VERB ("The dog can run" shows the DOG running, not a generic blob). Assess the engineering honestly BEFORE building (see PART 3).

Art + art-plumbing pass, not an activity redesign. Do NOT touch Fill the Story's interaction (double-tap, distractor logic, cloze flow — all Prompt 4). Do NOT start WordArt Batch 3 (Units 11–18 stays backlog). Branch `fix/wordart-legibility` off main; verify live before/after; merge when green.

## PRE-FLIGHT — CONFIRM HOUSEKEEPING LANDED (gate — verdicts already known, do not re-investigate)
The 2026-07-05 read-only investigation established: the 2026-07-05 stash held the ONLY copy of `docs/200MW_Master_Project_Doc_v3.md` in its untracked layer (the v2→v3 doc swap never landed on main) plus the unapplied `docs/MASTER_BUILD_PROMPT_v2.md` deletion; the 2026-07-03 stash held a unique, orphaned `scripts/verify-checkout.mjs`; the nested `~/magic-words/magic-words` is a git-TRACKED stale scaffold copy (Jun 5–6, ~800 committed cache blobs, zero unique files by path scan). The fix should already be merged before this run.

**Confirm on main before any art work:**
1. `docs/200MW_Master_Project_Doc_v3.md` exists and CLAUDE.md's pointer to it resolves.
2. `docs/MASTER_BUILD_PROMPT_v2.md` is gone.
3. `scripts/verify-checkout.mjs` is committed (with its provenance header).
4. `git stash list` is empty.
5. Exactly one project root — no nested `magic-words/` directory.

**If any check fails, execute the housekeeping first** on `chore/repo-housekeeping` (report file first, standard gates, merge, production READY), then return here:
1. Restore v3 from the 2026-07-05 stash's untracked layer + apply its MASTER_BUILD_PROMPT_v2.md deletion (skip the redundant audio-report slice); commit; verify byte-identical to the stash copy and CLAUDE.md's pointer resolves; drop that stash.
2. Restore `verify-checkout.mjs` from the 2026-07-03 stash into `scripts/` with a provenance header ("recovered from 2026-07-03 stash — review before Stripe-live cutover"); commit (committing makes the drop reversible); drop that stash. Reference stashes by date/message, not index — indices shift after each drop.
3. Byte-level diff the nested folder's 16 non-cache files against their outer counterparts; expect zero unique content — if ANYTHING unique surfaces, STOP and show Sal. Otherwise `git rm -r magic-words`, commit.

No art work starts until all five checks pass. All work happens in the one real root.

## STEP 0 — WRITE THE REPORT FILE FIRST (non-negotiable)
Immediately create `docs/WORDART_HYBRID_REPORT.md` with the REPORT headers below and "IN PROGRESS" under each. Commit it in your first commit; update it live as you work. A run that changes code but leaves no report is a failed run.

## AUTONOMY & RULES
Permission hook allows autonomous Bash. Confirmation stops only for: secrets, destructive DB ops (beyond your own `nextgenprecisiondrones+*` test accounts), live payment mode, history rewrites, and the pre-flight doubt case above. Standing rules: reproduce before/after with a fresh test account (`scripts/admin-user.mjs`, clean up after), Candy Galaxy tokens only, errorless, verify the WHOLE screen, full gates before merge (`npm run build`, `check:no-emoji`, `check-wordart-sync`, `npx playwright test`, `scripts/idor-proof.mjs`). Live-test via `getByRole('button',{name})`. `scripts/db-query.mjs` for DB reads.

**CORE METHODOLOGY RULE:** Dr. Blank is anti-phonics — nothing in this pass may sound out or blend words. Art-side corollary: **NO letterforms anywhere in WordArt** (Word Hunt answer-leak rule). Motion lines yes; letters never.

**ART LAW (from DESIGN_BRIEF.md — binding):**
- Construction: chunky rounded primitives, ~4px stroke in the paired darker outline shade, two dot eyes with white highlight, blush-pink cheeks, minimal internal detail.
- Every new word/scene gets its OWN fill/outline/inner triad (outline = clearly darker shade of fill; inner = pale tint). Never reuse another word's exact triad for an unrelated word. **Append every new triad to DESIGN_BRIEF.md's palette table in the same commit that introduces it** — the table stays authoritative.
- Nova's palette is locked (radial #FFF6D8 → --sun → #F09A12 core, --ink eyes/smile, white eye highlights) — every Nova pose reuses it verbatim. A Nova pose is still recognizably Nova.
- No emoji. No red. No X marks.

Read first: `WordArt.jsx`, `wordArtManifest.json`, `scripts/check-wordart-sync.mjs`, DESIGN_BRIEF.md §1 + the construction-rule comment block in `docs/mockup-E2-no-emoji.html`, the undepictable-words doc, Word Match's art rendering, Draw It's art rendering, and — critical for PART 3 — wherever Fill the Story's sentences come from (static templates? DB rows? generated at runtime via session-generator/ai-helper?) and how its picture is currently chosen. `words` table via db-query: `has_art`, `word_type`, `teaching_track`, `unit`.

## PART 1 — LEGIBILITY AUDIT (establish the before state)
- Build a contact sheet: every shipped WordArt rendered at ACTUAL answer-tile size — one copy with labels visible, one with labels hidden. Screenshot both into the report.
- **The label-cover test:** with labels hidden, (a) each illustration must be identifiable as its word, and (b) every verb must be distinguishable from every other verb. Classify each word PASS / VAGUE / WRONG with a one-line verdict.
- Confirm the six known offenders and characterize each failure precisely (run/jump/swim/dance sameness; duck reading as the existing bird; shark reading as generic fish) — plus anything else the sheet exposes.

## PART 2 — NOVA VERB SET (standalone contexts)
- Enumerate every content-track verb with art in Units 1–10 (db-query). Each gets a Nova-performing-the-verb illustration used wherever the verb appears STANDALONE (Word Match, Draw It, any single-word picture context).
- **Run pose = "A" — LOCKED:** side stride + motion lines. Do not re-litigate.
- Design the remaining poses so the WHOLE SET passes the label-cover test against each other. Suggestive anchors (yours to refine — not locked): jump = airborne with a visible gap to the ground shadow + upward lines; swim = waterline + splash; dance = tilted pose + music notes; eat = open mouth + food item; fly = high zoom over small clouds. Distinguishing props are encouraged; letterforms are not.
- Nouns keep their own dedicated art. Fix vague nouns in place with distinguishing features in-style (duck: flat bill/water so it cannot be the bird; shark: dorsal-fin silhouette — keep it friendly, this is ages 4–8).
- If any word flips `has_art` false→true (verbs gaining art), that is a `words` migration + manifest + component change together — sync-checked as one unit. It also changes picture-activity eligibility server-side, so the idor-proof re-run is mandatory (it runs in the gates anyway).

## PART 3 — COMPOSED SCENES FOR FILL THE STORY (assess FIRST, then build)
This is where honesty about engineering cost matters. Do the assessment before drawing a single scene:
1. **Find the sentence source.** Static templates in code? Rows in a table? Generated at runtime? This determines everything downstream.
2. **Extract the full inventory of noun×verb pairs Fill the Story can actually serve.** Report the count.
3. **Cost the options in the report:**
   - **(a) True runtime SVG composition** (parametric noun rigs + per-verb pose transforms): flexible on paper, genuinely hard in practice — every noun has different anatomy; a "run" transform for the dog is meaningless for the bird. Expect this to be rejected, but reject it with evidence, not hand-waving.
   - **(b) Hand-authored noun-in-action scenes**, one per pair actually used: the pragmatic path if the inventory is finite and small (≤ ~25–30 pairs). Each scene is a normal WordArt-style SVG keyed by pair. The noun in the scene must be recognizably the SAME character as its standalone art — same triad, same face rules — now in the verb's pose.
   - **(c) If sentences are generated/unbounded:** CONSTRAIN generation to the authored scene inventory — the generator may only emit sentences whose noun×verb pair has a scene. This inverts the dependency and makes (b) viable at any generator scale. Prefer this over inventing mushy fallbacks (noun art + verb badge composites read as clutter, not meaning).
4. **Write ASSESSMENT + RECOMMENDATION into the report, then proceed with the pragmatic path.** If the assessment lands genuinely ambiguous (huge fixed inventory, sentence source that resists constraining), STOP and surface the costed options to Sal instead of burning the run.
- Wire Fill the Story's PICTURE SOURCE to the scene lookup (pair-keyed). Define the no-scene behavior explicitly — preferred: sentence selection restricted to covered pairs so the case cannot occur, asserted by the sync check; otherwise fall back to the current single-word art AND log the miss.
- Interaction stays untouched — Prompt 4 rebuilds the cloze. This pass only guarantees the picture can disambiguate.

## PART 4 — SYSTEM WIRING (single source of truth extends to scenes)
- Register scenes in the manifest system (extend `wordArtManifest.json` or add a sibling `sceneManifest.json`) and extend `check-wordart-sync.mjs` to cover them: every referenced pair has a scene, every scene is referenced, no orphans, build fails on drift — the same contract single-word art already has.
- `has_art` stays accurate; undepictable-word routing stays untouched.
- DESIGN_BRIEF.md palette table updated with every new triad (per ART LAW).

## VERIFY (live, fresh account via admin-user.mjs)
- After-state contact sheets (labels on + labels off) in the report; label-cover verdicts for the full verb set + fixed nouns.
- Word Match on a verb word: Nova pose renders, distinguishable among the distractor tiles, whole screen clean.
- Draw It on a verb word: Nova art shows (today's Draw It — the letter-tracing rebuild is Prompt 4).
- Fill the Story: the composed scene matches the sentence's noun+verb for several sentences including a dog/run case; confirm the picture visibly disambiguates the answer.
- Walk a full Guided Path: no missing/broken art anywhere; picture activities still draw only `has_art` words.
- prefers-reduced-motion: static motion lines in the art are fine; any animated flourish added must respect the setting.
- Full gates green: build, check:no-emoji, check-wordart-sync (now scene-aware), Playwright, idor-proof 9/9. Clean up test accounts. Report filled in on disk.

## MERGE
Only if all verified + gates green → merge to main, confirm production READY, re-verify live: one Word Match verb question + one Fill the Story sentence showing its composed scene. Then update the repair-sequence item 3 line in `docs/200MW_Master_Project_Doc_v3.md` (one line, status only).

## REPORT (docs/WORDART_HYBRID_REPORT.md — created at STEP 0, filled live)
### PRE-FLIGHT — five-check confirmation results (+ housekeeping execution log if it hadn't landed)
### AUDIT — contact sheets + per-word PASS/VAGUE/WRONG verdicts
### NOVA VERB SET — poses shipped, how the set passes label-cover, new triads added
### SCENE ASSESSMENT — sentence source, pair-inventory count, options costed, recommendation + decision
### SCENES SHIPPED — pair list, no-scene rule, sync-check coverage
### VERIFICATION — live checks + contact-sheet evidence + gates
### NOTES FOR PROMPT 4 — what the Fill the Story rebuild can rely on (scene coverage, lookup API, generation constraints if applied)
