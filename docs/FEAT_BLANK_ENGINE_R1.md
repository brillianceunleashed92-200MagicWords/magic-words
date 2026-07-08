# 200 MAGIC WORDS — FEAT_BLANK_ENGINE_R1: EXPOSURE RULE + STORY COMPREHENSION
**Written:** July 7, 2026 · **Execute from:** `~/magic-words` · **Branch:** `feat/blank-engine`
Self-contained. No gate tokens. Touches the session-generator's selection logic (Packages B and C's territory) — read their reports' NOTES sections in-repo first.

## MISSION — two Dr. Blank fidelity gaps, one comprehension gap
Dr. Blank's Six-Skill method has two exposure principles the app currently violates, plus a missing sixth skill:
1. **Function words are universal.** In Blank's method, ALL children work function words in context regardless of reading level — they're where struggling readers break, so they're never skipped. Today the placement floor makes a child who places at unit 9 skip units 1–8 entirely, function words included — backwards. Fix: the function-word track is EXEMPT from the placement-floor skip; below-floor function words keep surfacing at low frequency inside context/cloze activities (never as isolated picture-matching — they have no art).
2. **Mastered content words recede.** Genuinely-mastered (`isRealMastery`) content words should appear LESS as the child demonstrates they know them. Star Keeper's review ladder already spaces reviews; the gap is (a) damping mastered-content frequency in the normal session mix and (b) confirming the placement floor doesn't reintroduce already-mastered content words at full rate.
3. **Sixth skill — comprehension after text.** Blank's six skills are sequencing, writing, phonology, semantics, syntax, and TEXT. Story Time delivers text but nothing verifies the child understood it. Add 1–2 errorless picture-choice comprehension questions after a story ("Tap what the frog found!") — the app's first real comprehension check.

## ARCHITECTURE NOTES (locked)
- **Do not change the stored mastery formula or `isRealMastery`.** This run changes SELECTION WEIGHTING and adds a comprehension step — not calibration. (Same lock as Package B; the replay proof stays valid.)
- **Function-word exemption is a floor-derivation change, not a mastery change.** The placement floor currently gates candidate words by unit; this run makes the function-word subset exempt from that unit gate while leaving content-word gating exactly as is. Verify the free-tier cap interaction explicitly (a free-tier child must still not access premium-unit CONTENT, but universal function-word exposure from already-unlocked units is the point — confirm no premium content leaks through the exemption).
- **Damping is a weighting change, not an exclusion.** A mastered content word still appears (spaced review is pedagogically required) — just at reduced frequency in the mix. Put the exact weighting rule (e.g., mastered-content weight multiplier) verbatim in the report; conservative v1, tunable later by WEEKLY_INSIGHTS.
- **Comprehension questions reuse existing errorless machinery** — the same picture-choice tile component and scaffold Story-adjacent activities already use; no new question engine. Story vocabulary is already vocab-validated (Story Engine), so the comprehension distractors draw from the same validated pool. If stories have no structured content model to generate a comprehension question from (recon will tell), STOP and report options — a comprehension question needs something true about the story to ask about, and fabricating one that the story doesn't support is worse than shipping the other two gaps alone.

## RULES
1. Report `docs/BLANK_ENGINE_REPORT.md` at STEP 0, RUN TIMING, live, first commit. **FINAL STATUS self-certifies the docs push.**
2. Approval stops: `git push origin main`, `supabase db push` (only if comprehension-question storage needs a column — recon first; STOP-and-present if so), destructive ops. Deployment check after push.
3. **Server predicate reuse**: the function/content split already exists (`word_type` column + `masteryCalibration.js`'s server mirror from Package B). Reuse both — do NOT re-declare what "function word" or "mastered" means. If the session-generator needs the mastered predicate it already has the mirrored constant (check-script-guarded) from Package B; extend, don't fork.
4. **idor-proof reruns** — selection-logic changes are the standing trigger. Any new comprehension-result write path gets the full treatment: ownership-verified, and if it writes `product_events`/`learning_events`, the CHECK-constraint + positive-landing-test discipline (migrations 0035/0036 lesson). Negative checks get positive twins.
5. Candy tokens, errorless, no emoji, no red/X. **No phonics, ever** — comprehension questions are meaning-based (picture choice), never sound-based. Suite baseline **75** — only add.
6. **TRAPS section required** in the report.

## PHASE 0 — REPORT + RECON
Read: `api/session-generator.js` (candidate selection, the placement-floor derivation, free-tier cap, `word_type` usage, the Package-B mastered-predicate mirror, `reviewOnly`/`checkinMode`/`historyMode` so this doesn't collide), `masteryCalibration.js`, the Story Engine / Story Time flow and whether a story carries any structured content (characters, a simple event, a target vocab set) a comprehension question could be built from, the errorless picture-choice tile component, and `words` (`word_type`, `has_art`, unit).

## PHASE 1 — CENSUS (report table, before code)
Every point where word selection reads unit-gating or mastery: file, line, current weighting, intended weighting, child-visible effect. Cover: the placement-floor unit gate (where function words will now be exempted), the normal-pool candidate weighting (where mastered content gets damped), the free-tier cap interaction, and confirm `reviewOnly`/`checkinMode` selection is untouched (different pools — verify, don't assume).

## PHASE 2 — FUNCTION-WORD UNIVERSALITY
Exempt the function-word subset from the placement-floor skip; below-floor function words surface at low frequency in context/cloze activities only. Verify live: a child placed at a high unit now sees low-unit function words in context; a free-tier child sees no premium CONTENT via the exemption; content-word gating is byte-identical to before.

## PHASE 3 — MASTERED-CONTENT DAMPING
Apply the verbatim weighting rule to reduce mastered-content frequency in the normal mix. Verify live: a genuinely-mastered content word still appears (spaced), but less often than an unmastered peer; placement floor doesn't reintroduce mastered content at full rate.

## PHASE 4 — STORY COMPREHENSION CHECK
After a Story Time story, present 1–2 errorless picture-choice comprehension questions built from the story's validated content, reusing the existing tile+scaffold. Wrong answers get the standard errorless treatment (wiggle/soften/hint-glow, second-miss-completes) — comprehension is a LEARNING activity, full scaffold applies (NOT the placement §5a measurement carve-out). Log the result like any other activity (`learning_events`; if a new `game_type` or `product_events` type is introduced, CHECK-constraint + allowlist + positive-landing test per the standing lesson). Respect prefers-reduced-motion.

## PHASE 5 — FIXTURES + TESTS
Seed: a high-placement child (function-word universality visible), a child with mastered + unmastered content in the same unit (damping visible), a story run reaching the comprehension step. Specs: below-floor function words appear for the high-placement child; free-tier sees no premium content via the exemption; mastered content appears at reduced rate; the comprehension question renders, scaffolds a wrong answer correctly, and logs its result. 75 + new only.

## PHASE 6 — GATES, VERIFY, SHIP
Full gates (build + all sync checks, no-emoji, Playwright `workers:1`, **idor-proof** — selection changed). Capture browser console on the first full-suite run (the dead-import lesson — a uniform-timeout pattern gets a console check, not a memory assumption). Preview walk: high-placement function-word exposure, mastered-content damping, a full story→comprehension flow, all live. Merge `--no-ff` → approval → push → deployment check → production walk → cleanup + cascade-verify → report DONE with end timing → **docs push, self-certified**.

## REPORT (docs/BLANK_ENGINE_REPORT.md)
### RUN TIMING
### CENSUS — the selection-weighting table
### FUNCTION-WORD UNIVERSALITY — the exemption mechanic, free-tier-content-leak proof
### MASTERED-CONTENT DAMPING — the verbatim weighting rule, live before/after
### STORY COMPREHENSION — how questions are built from story content (or the STOP if stories carry no structured content), scaffold + logging
### VERIFICATION — fixtures, tests vs 75 baseline, gates, idor-proof, walks
### TRAPS — reusable lessons
### NOTES FOR WEEKLY_INSIGHTS — which signals this run makes tunable (damping multiplier, function-word frequency, comprehension accuracy) that the self-improvement loop should read and propose adjustments to
```
