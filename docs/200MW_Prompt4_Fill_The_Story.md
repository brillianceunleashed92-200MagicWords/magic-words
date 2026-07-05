# 200 MAGIC WORDS — PROMPT 4: FILL THE STORY REBUILD
## Fourth in the repair sequence (after the WordArt legibility pass, which is live on `cf654dd`). Self-contained. First of the item-4 activity rebuilds — Fill the Story ONLY. Draw It / Quiz Boss / Word Song / Magic Video are later prompts.

## MISSION
Fill the Story today: deterministic template sentence with one blank, word-chip options, a **tap-once-to-select-then-tap-again-to-place** interaction (confirmed live in the 2026-07-05 production walk), and the target word's art shown only as a ~1.6s **reveal after answering** (`GameEngine.jsx` StoryBuilder, ~line 1008). Nothing disambiguates the answer before the child commits, and the double-tap is hostile to ages 4–8.

Rebuild, per the signed-off decision (option 1+2):
1. **Picture-as-cue** — for `has_art` targets, the target word's own WordArt renders WITH the question, before answering, as the meaning cue. The child maps meaning → whole word. This replaces the post-answer reveal (the cue persists; no separate reveal moment).
2. **Nova-subject verb sentences** — verb templates name Nova, so sentence + Nova-pose art form one illustrated scene ("Watch Nova jump!" beside Nova jumping).
3. **Single-tap-to-place** — tap a chip, it places into the blank. Kill the double-tap entirely.
4. **Read-back** — after a correct placement, the completed sentence is read aloud once (Blank's cloze-in-context: fill the blank, then read it).
5. **Errorless scaffold** — the DESIGN_BRIEF §5 wiggle/soften/hint-glow contract, applied to the chips.

Branch `fix/fill-the-story-rebuild` off main. Activity-scoped: do NOT touch other activities, the Guided Path composition, the scoring pipeline, or any art. Verify live before/after; merge, push, production-verify.

## PRE-FLIGHT (gate)
1. `git status` clean; `git log origin/main..main --oneline` — if the last session's docs commits are unpushed, push them first (one approval) before branching. Confirm `cf654dd` is an ancestor of HEAD.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is present in the shell environment (existence check only — NEVER echo, print, log, or write the value anywhere). If absent, STOP and ask Sal to export it — the gates and admin scripts need it.

## STEP 0 — WRITE THE REPORT FILE FIRST (non-negotiable)
Immediately create `docs/FILL_THE_STORY_REPORT.md` with the REPORT headers below and "IN PROGRESS" under each. Commit it in your first commit; update it live. A run that changes code but leaves no report is a failed run.

## AUTONOMY & RULES
Permission hook allows autonomous Bash. Confirmation stops only for: secrets, destructive DB ops (beyond your own `nextgenprecisiondrones+*` test accounts), live payment mode, history rewrites. Standing rules: reproduce before/after with a fresh test account (`scripts/admin-user.mjs create` / the new `seed-progress` command — it sets `word_progress.user_id` correctly / `delete` after), Candy Galaxy tokens only, errorless, verify the WHOLE screen, full gates before merge (`npm run build`, `check:no-emoji`, `check-wordart-sync`, `npx playwright test`, `scripts/idor-proof.mjs`). Live-test via `getByRole('button',{name})`. `scripts/db-query.mjs` for DB reads. Known test-infra trap: browser-automation tabs are unfocused → `document.hidden` throttles `requestAnimationFrame` (bit the last run on HoldGate) — use the documented setTimeout shim if any rAF-driven UI stalls under automation.

**CORE METHODOLOGY RULE:** Dr. Blank is anti-phonics — never sound out or blend words anywhere. The target word and the completed sentence are always spoken as whole words. Cloze-in-context is Blank's own technique; the read-back after placement is the pedagogical point, not decoration.

**AUDIO RULES (from the audio-consolidation pass — binding):**
- One voice: everything spoken goes through the ElevenLabs singleton (`/api/speak`, cached by text hash — the small template set is cache-friendly). No `speechSynthesis`, no second voice, no overlap (singleton enforces one-at-a-time).
- Correct answer = success sound only, no spoken word AT the feedback moment. The read-back is activity content, not feedback: sequence is tap → place animation → success sound → THEN the completed sentence reads aloud once. They must not overlap.
- Question audio: read the current prompt-audio behavior first and preserve its semantics (whole-word only); adding the picture cue must not introduce double-speaking. If current question audio is incoherent, propose the minimal fix in the report before changing it.

**DESIGN LAW:** DESIGN_BRIEF.md throughout. Chips/tiles get `--chunk-sm`/`--chunk` + press-down, 44px+ targets, no red/X ever, no emoji, no full-width answer bars. Placement/entrance animations respect `prefers-reduced-motion`.

Read first: `GameEngine.jsx` StoryBuilder (current interaction, reveal at ~1008, prompt audio path), `api/session-generator.js` (`buildSentence`, `CONTENT_TEMPLATES`, `FUNCTION_SENTENCES`, distractor selection if any), `useSessionPlan.js` (`buildLocalQuiz` mirror + true-offline `'I know the word ___.'`), the audio singleton + `/api/speak`, DESIGN_BRIEF §5–6, `questProgress.js` (Fill the Story must remain a real-quiz activity with accuracy-based 1/2/3 stars — pipeline untouched).

## PART 1 — REPRODUCE THE BASELINE (before state)
Fresh test account on the live site or local against prod data: play a Fill the Story session and capture (screenshots + notes in the report): the double-tap interaction, the absence of any pre-answer cue, the post-answer reveal, current question-audio behavior, current distractor composition (how options are chosen today), and behavior for a no-art target (e.g. `play`) and a function-word target if they occur. This baseline defines "preserved" vs "changed" for everything below.

## PART 2 — NOVA-SUBJECT VERB TEMPLATES (sentence content — signed off 2026-07-05)
Replace `CONTENT_TEMPLATES.verb` in `api/session-generator.js` with exactly these four, and mirror in `useSessionPlan.js`'s fallback set:
- `Watch Nova ___!`
- `Nova can ___.`
- `Nova likes to ___.`
- `See Nova ___!`
Same register as the outgoing set ('Watch me ___!' → 'Watch Nova ___!'). Adjust a string only if a technical constraint forces it, and log the change in the report. Noun/adjective/number templates and all 45 `FUNCTION_SENTENCES` are UNCHANGED. The true-offline `'I know the word ___.'` fallback is UNCHANGED. Server and client mirrors must not drift — verify both paths emit the new strings.

## PART 3 — PICTURE-AS-CUE
- For `has_art` targets: render `<WordArt word={quiz.word}/>` with the question, positioned as the cue beside/above the sentence, at a size consistent with the lesson-stage layout (the existing 92px tile-art scale is the reference). It persists through answering; the old post-answer reveal moment is removed (the celebration per DESIGN_BRIEF §6 replaces it on correct).
- For no-art targets (e.g. `play`, function words): NO picture cue — preserve the baseline's promptexperience for these. Do not show a typographic chip of the target as a cue (that displays the answer; out of scope to redesign that mode this pass).
- The cue must never appear for a word whose art doesn't exist (`has_art`/REGISTRY is the source of truth — same contract as everywhere else).

## PART 4 — INTERACTION REBUILD (kill the double-tap)
- **Single tap places**: tapping a chip immediately animates the word into the blank (spring, Candy easing, chunk press-down on the chip). No select-then-place state. No drag-drop this pass (locked decision allowed either; single-tap is the choice — it's the motor-skill-safe option for 4–8).
- **Errorless scaffold (DESIGN_BRIEF §5, exact contract):** first wrong tap does NOT complete the error — the wrong chip wiggles (~450ms) and softens (saturate .55 / opacity .55), the correct chip gets the persistent `--mint` hint-glow. Second miss on the same question completes the error and advances. No red, no X, ever.
- **Correct flow:** place animation → success sound → completed sentence displayed whole (blank filled, visually settled) → sentence read aloud once via the singleton → §6 celebration (mint flash, Nova celebrate, specific affirming line, star confetti, segment ignition — per-question size, not the level-up treatment).
- Scoring/progress pipeline untouched: same `onProgress` events, accuracy-based stars, `learning_events` writes.

## PART 5 — DISTRACTOR RULES (one clearly-correct answer, by construction)
- Options = target + distractors of the SAME `word_type`, so grammar never gives the answer away; correctness comes from matching the cue/meaning, which is now legible.
- Distractors must be semantically distinct from the target (never a synonym-ish or picture-confusable pair — consult the depictability/collision docs' known pairs as the exclusion list for art-backed types).
- Prefer distractors from words the child has already encountered (session plan / word_progress pool) when available; fall back to same-type curriculum words.
- Keep the current option COUNT unless the baseline shows it's broken; log the final rule set in the report. Selection lives server-side in session-generator with the client fallback mirroring it — same no-drift requirement as Part 2, and forged-request behavior must remain unchanged (tier gating, child ownership).

## PART 6 — HOUSEKEEPING (bounded)
- **Stale 16-word list in `App.jsx`** (found in the 2026-07-05 production walk — live `words` table says Units 1–2 hold 20 words). Find every reader of that list/constant. Dead code → delete it. Live code → do NOT refactor; report exactly what reads it and whether it could explain the known galaxy-map lock bug (dance shows locked despite passed). Investigation + dead-code deletion only.
- Update `docs/200MW_Master_Project_Doc_v3.md` repair item 4's Fill the Story line to DONE (merged) style at the end, and note the interaction/template changes in one line.

## VERIFY (fresh account via admin-user.mjs + seed-progress; delete after)
- **Verb target with art:** Nova-subject sentence renders with the matching Nova pose as cue; the pictured verb is the only option matching the cue; single tap places; success sound then read-back (no overlap — re-run the audio-consolidation overlap probe: never >1 simultaneously-playing audio across rapid taps); §6 celebration fires once.
- **Noun target with art:** unchanged template + noun art as cue; same flow.
- **No-art target (`play` or similar) and a function word:** baseline prompt experience preserved, no cue, no broken layout, flow completes.
- **Errorless:** deliberately miss first — wiggle + soften + hint-glow, no red/X, error does not complete; second miss completes and advances. Verify on both a verb and a noun question.
- **Distractors:** across ≥10 questions, confirm exactly one option ever matches the cue, all options same word_type, no known-confusable pairs co-occur.
- **Server/client parity:** force the client fallback path and confirm Nova-subject verb strings + distractor rules match the server's.
- **prefers-reduced-motion:** placement/celebration animations reduced; flow still completes.
- **Whole screen** on every state (question, wrong-tap, placed, celebration, session summary) — layout, z-index, console clean.
- **Playwright:** ADD a spec covering the new interaction (tap-to-place happy path + first-miss errorless behavior) so the suite grows with the rebuild; full suite green (was 4/4, now 5+/5+).
- **Gates:** `npm run build`, `check:no-emoji`, `check-wordart-sync`, Playwright, and `idor-proof.mjs` — session-generator changed, so the idor re-run is mandatory and must be 9/9 with `DEPLOY_BASE_URL` set.

## MERGE & PRODUCTION (the full leg — do not stop at "merged locally")
Only when all verified + gates green: merge to main → **push** (approval) → confirm the Vercel deployment for the merge commit is READY via `gh api repos/.../commits/<sha>/status` (the Vercel MCP connector is authed to the wrong account — don't use it) plus a `curl -sI https://200magicwordsapp.com` corroboration → **production walk** with a fresh account (one verb question end to end incl. read-back, one wrong-tap errorless check, one noun question) → append a PRODUCTION VERIFICATION section to the report → commit docs → push (second approval). Delete the test account.

## REPORT (docs/FILL_THE_STORY_REPORT.md — created at STEP 0, filled live)
### PRE-FLIGHT — sync state, key presence (existence only)
### BASELINE — current interaction/audio/distractor/no-art behavior, screenshots
### TEMPLATES — final verb strings shipped (server + client), any forced deviations
### CUE — placement/size decisions, no-art handling, reveal removal
### INTERACTION — tap-to-place implementation, errorless scaffold, read-back sequencing vs. the correct-sound rule
### DISTRACTORS — final selection rules, exclusion list used, forged-request behavior unchanged
### HOUSEKEEPING — App.jsx stale-list findings (readers, verdict, dance-lock relevance), v3 update
### VERIFICATION — live checks, overlap-probe result, new Playwright spec, gates
### PRODUCTION VERIFICATION — push/deploy confirmation, live walk results
### NOTES FOR NEXT PROMPTS — anything the Draw It / Quiz Boss / Find the Word rebuilds should rely on
