# 200 MAGIC WORDS — PROMPT 5: DRAW IT → LETTER TRACING
## Fifth in the repair sequence (after the Fill the Story rebuild, live on `9c39f25`). Self-contained. Second of the item-4 activity rebuilds — Draw It ONLY. Quiz Boss / Word Song→Find the Word / Magic Video cut are later prompts.

## MISSION
Draw It today: a freeform drawing canvas with Clear/Done, a WordArt reference image (added in the WordArt pass), styled on the old `gameTheme.js` T-token system. Freeform drawing has no literacy value; the locked replacement (decided with mockups — do not re-litigate): **LETTER TRACING** — the child traces the word's letters with animated stroke-order guidance (green start dot, direction arrow), and Nova says the WHOLE word. Ties motor formation to the 200 words.

Rebuild:
1. **Stroke-data system** — an ordered-stroke manifest for the lowercase alphabet with a build-time coverage check (assess strategy FIRST — see PART 2).
2. **Tracing interaction** — letter-by-letter through the word, animated stroke demo, finger-follows-path with generous tolerance, errorless by construction (off-path never fails, it re-cues).
3. **Whole-word audio moment** — word completion → Nova says the whole word → §6 celebration. No letter sounds. No letter names.
4. **Candy-token migration** — the entire Draw It screen moves off `gameTheme.js` T-tokens onto the Candy Galaxy tokens (flagged as a real gap in `docs/WORDART_HYBRID_REPORT.md`).
5. **Scoring contract preserved** — Draw It stays in `SCORELESS_GAME_TYPES` (honest 1★). Tracing could become measurable someday; that is a separate, explicitly-scoped decision (same principle as the `firstTry` note in `docs/FILL_THE_STORY_REPORT.md`). Do NOT change the `onAnswer` field shape or the star path this pass.

Branch `fix/draw-it-tracing` off main. Activity-scoped: do NOT touch other activities, the Guided Path composition, or the scoring pipeline. Verify live before/after; merge, push, production-verify — the full leg.

## PRE-FLIGHT (gate)
1. `git status` clean; `git log origin/main..main --oneline` empty (push first with approval if not). Confirm `9c39f25` is an ancestor of HEAD.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` present in the shell environment (existence check only — NEVER echo, print, log, or write the value). If absent, STOP and ask Sal.

## STEP 0 — WRITE THE REPORT FILE FIRST (non-negotiable)
Immediately create `docs/DRAW_IT_TRACING_REPORT.md` with the REPORT headers below, "IN PROGRESS" under each. Commit in your first commit; update live.

## AUTONOMY & RULES
Permission hook allows autonomous Bash. Confirmation stops only for: secrets, destructive DB ops (beyond your own `nextgenprecisiondrones+*` test accounts), live payment mode, history rewrites. Standing rules: reproduce before/after with fresh test accounts (`admin-user.mjs create` / `seed-progress` / `delete` after), Candy tokens only, errorless, whole-screen verification, full gates before merge, `getByRole('button',{name})`, `db-query.mjs` for reads.

Known traps (from prior reports — do not rediscover them): browser-automation tabs are unfocused → rAF throttles (setTimeout shim documented in `WORDART_HYBRID_REPORT.md`); Playwright specs that provision Supabase accounts contend under multi-worker parallelism (see PART 5 — this pass FIXES that properly); local Vite does not serve `/api` routes, so anything needing `/api/speak` with real audio verifies on a pushed branch's Vercel preview or production, and `/api/speak` may be unconfigured on previews (secrets absent — code must degrade gracefully, prod is where the real audio check happens); audio overlap probes must check `.paused` synchronously at the next `play()` call, not async pause/ended events (false-positive trap documented in `FILL_THE_STORY_REPORT.md`).

**CORE METHODOLOGY RULE (heightened for this activity):** Dr. Blank is anti-phonics. Letter tracing sits right at the danger line, so the rule is absolute here:
- Audio in this activity is the WHOLE WORD only, via the ElevenLabs singleton. NEVER letter sounds ("cuh"), NEVER blending, and NEVER letter names ("see-ay-tee") — spoken audio and the word are paired as whole units, period.
- On-screen letterforms are obviously required (it IS letter tracing) — that does not conflict with the "no letterforms in WordArt" rule, which governs the ART. The WordArt reference image shown alongside remains letterform-free as always.

**DESIGN LAW:** DESIGN_BRIEF.md throughout — Candy tokens, chunk shadows + press-down on all chrome, 44px+ targets, no red/X ever, no emoji, `prefers-reduced-motion` respected. Traced-stroke fill uses `--sun`; per-letter micro-affirm uses `--mint`; start dot is the locked green cue.

Read first: current `DrawIt` component (canvas, Clear/Done, how `onAnswer` is called and with what fields — the SCORELESS contract to preserve), `questProgress.js` (`SCORELESS_GAME_TYPES`), `gameTheme.js` usage in the Draw It screen, `src/theme/tokens.js`, the WordArt reference rendering added in the last pass, the audio singleton + `/api/speak`, DESIGN_BRIEF §3/§5/§6, `tests/fill-the-story.spec.js` (the self-provisioning spec pattern), `playwright.config.js`.

## PART 1 — REPRODUCE THE BASELINE (before state)
Fresh account: play Draw It on a word WITH art and one WITHOUT. Capture in the report: the freeform canvas behavior, Clear/Done flow, the exact `onAnswer` call shape and when it fires, the WordArt reference / no-art fallback behavior, and screenshots showing the T-token styling (this defines the migration's before state). This baseline defines "preserved" (scoring, reference image, activity slot in the Guided Path) vs "replaced" (everything on the canvas).

## PART 2 — STROKE-DATA STRATEGY (assess FIRST, then build)
The load-bearing feasibility step. Do the assessment before authoring anything:
1. **Inventory**: query the `words` table — which lowercase letters actually appear across all 200 words? (Expect ~all 26.) The app renders words lowercase; this pass builds LOWERCASE ONLY. No uppercase, no punctuation.
2. **Cost the options in the report:**
   - **(a) Hand-author the lowercase alphabet** as ordered stroke data: per letter, 1–3 strokes, each an SVG path with a defined start point and direction, in a single `letterStrokes` manifest + a build-time coverage check (every letter used by the 200 words has stroke data; build fails on a gap — the exact contract pattern `wordArtManifest`/`check-wordart-sync` already established). Expected pragmatic path: bounded at 26 assets, fully controllable.
   - **(b) Derive from font glyph outlines** — expect to reject: outlines are filled shapes, not ordered strokes; they carry zero stroke-order/direction data. Reject with evidence, not hand-waving.
   - **(c) Single-stroke vector sources (e.g., Hershey-style fonts)** as a skeleton to hand-adjust into (a) — allowed if it genuinely accelerates; document provenance/licensing if used.
3. **Letterform style**: traced glyphs are standard early-education PRINT forms (the simple continuous-stroke lowercase shapes handwriting instruction uses) — NOT Baloo 2's display shapes. The child is learning to form letters; the guide must match what they'll write. Document the stroke-order convention followed (standard print conventions; note the reference used) in the report.
4. Write ASSESSMENT + RECOMMENDATION, then proceed. If authoring cost balloons beyond a hand-authorable batch (it should not — the cap is 26), STOP and surface options to Sal.

## PART 3 — TRACING INTERACTION (errorless by construction)
- **Word flow**: the full word displayed; letters traced one at a time, left to right; current letter large and centered on the tracing stage, its position highlighted in the word above. WordArt reference (when `has_art`) stays visible as the meaning anchor; clean absence for no-art words (same contract as everywhere).
- **Per stroke**: guide path rendered; the green start dot + direction arrow animate the stroke once before the child traces (auto-demo); if the child idles ~5s, re-demo. Under `prefers-reduced-motion`: no animated demo — static numbered start dots + direction arrows instead; tracing itself still works.
- **Trace detection**: pointer/touch follows the path with GENEROUS tolerance (small fingers, ages 4–8); traced progress fills the stroke with `--sun`. Off-path beyond tolerance: the trace simply stops advancing and the start dot/arrow gently pulses to re-cue — NO error state, no red, no X, no fail, no attempt counter. The child cannot lose; they can only finish.
- **Progression**: stroke complete → next stroke; letter complete → small `--mint` tick (micro-affirm, NOT the §6 celebration); WORD complete → Nova says the WHOLE word once via the singleton → §6 celebration (per-question size) → `onAnswer` with the exact baseline field shape. One `onAnswer` per word, same as today.
- Clear/redo affordance per letter (44px+, chunk shadow, press-down). No freeform mode remains anywhere.

## PART 4 — CANDY-TOKEN MIGRATION
Migrate the entire Draw It screen off `gameTheme.js` T-tokens: background, chrome, buttons, stage — everything on `tokens.js`/DESIGN_BRIEF values with the §3 shadow + press-down contract. If this screen was the LAST consumer of any `gameTheme.js` values, report that (do not delete the file unless it becomes fully reader-less and the deletion is trivial — report either way). Whole-screen rule applies with extra force here: the migration IS a whole-screen change.

## PART 5 — HOUSEKEEPING (bounded)
- **Playwright determinism**: implement the minimal change so `npx playwright test` passes deterministically at its DEFAULT invocation despite Supabase account-provisioning contention (documented in `FILL_THE_STORY_REPORT.md` NOTES). Pick the least invasive fix — e.g., serial mode for provisioning specs or a scoped workers cap — and justify the choice in the report. The gate must not depend on an undocumented `--workers=1` flag.
- Update `docs/200MW_Master_Project_Doc_v3.md` repair item 4's Draw It line to DONE (merged) style at the end, one-line summary.

## VERIFY (fresh account via admin-user.mjs + seed-progress; delete after)
- **Coverage**: the build-time letter-coverage check is green for all 200 words; deliberately break it once (remove a letter locally) to prove it fails the build, then restore.
- **Trace end-to-end**: one short word (e.g. `cat`) and one longer word (4–5 letters from the child's pool) — every stroke demos, traces, fills; letter ticks; word completion speaks the WHOLE word exactly once (overlap probe using the corrected synchronous `.paused` method) and fires §6 once.
- **Errorless**: deliberately trace off-path — no error state of any kind, re-cue pulse works, progress resumes; idle 5s → re-demo fires.
- **Audio audit**: nothing in this activity ever plays letter sounds or letter names — confirm the only speech is the whole word (and any pre-existing prompt line), all via the singleton, one voice.
- **No-art word**: reference area cleanly absent, tracing unaffected.
- **Scoring**: `onAnswer` field shape byte-identical to baseline; star result still the honest scoreless 1★ via `SCORELESS_GAME_TYPES`; `learning_events` writes unchanged.
- **prefers-reduced-motion**: static-cue mode verified end to end.
- **Token migration**: whole-screen screenshots on every state; zero `gameTheme.js` T-token values remain on this screen; chrome obeys §3.
- **New Playwright spec**: tracing happy path + off-path-recue, self-provisioning per the established pattern; FULL suite green at default invocation (proving the PART 5 fix) — suite grows to 7+.
- **Gates**: `npm run build`, `check:no-emoji`, `check-wordart-sync`, Playwright (default invocation), `idor-proof.mjs` 9/9 with `DEPLOY_BASE_URL` against the pushed branch's Vercel preview (standing gate, even though this pass shouldn't touch server queries — if it somehow does, say so explicitly).

## MERGE & PRODUCTION (the full leg — do not stop at "merged locally")
All green → merge to main → push (approval) → confirm deployment via `gh api repos/.../commits/<sha>/status` + `curl -sI https://200magicwordsapp.com` (do not use the Vercel MCP connector — wrong account) → production walk with a fresh account: trace one full word end to end on production including the whole-word audio + corrected overlap probe, one off-path errorless check, one no-art word → append PRODUCTION VERIFICATION to the report → commit docs → push (second approval). Delete test accounts.

## REPORT (docs/DRAW_IT_TRACING_REPORT.md — created at STEP 0, filled live)
### PRE-FLIGHT — sync state, key presence (existence only)
### BASELINE — current canvas/scoring/reference/T-token state, screenshots
### STROKE-DATA ASSESSMENT — letter inventory, options costed, recommendation + decision, stroke-order convention + source
### TRACING INTERACTION — detection/tolerance implementation, errorless re-cue, demo/idle behavior, audio moment sequencing
### TOKEN MIGRATION — before/after, gameTheme.js reader status
### HOUSEKEEPING — Playwright determinism fix chosen + why, v3 update
### VERIFICATION — coverage-check proof, live checks, overlap-probe result, new spec, gates
### PRODUCTION VERIFICATION — push/deploy confirmation, live walk results
### NOTES FOR NEXT PROMPTS — anything Quiz Boss / Find the Word should rely on (esp. reusable stroke/trace primitives, celebration sequencing)
