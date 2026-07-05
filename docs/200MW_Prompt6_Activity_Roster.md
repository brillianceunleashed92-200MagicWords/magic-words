# 200 MAGIC WORDS — PROMPT 6: ACTIVITY ROSTER — QUIZ BOSS, FIND THE WORD, MAGIC VIDEO CUT
## Sixth in the repair sequence (after Draw It tracing, live on `7fe6c65`). Self-contained. Completes repair item 4: Quiz Boss → app-measured review battle · Word Song → "Find the Word" · Magic Video → CUT. Three parts, one branch.

## MISSION
1. **Magic Video → CUT.** Non-functional stub; remove from the rotation entirely.
2. **Word Song → "Find the Word."** Blank's own technique: Nova SAYS the whole word; the child finds it among visually similar real words (ran/run/runs). Audio-first recognition — NO phonics, ever. This also removes Word Song's legacy two-voice/mute-flag exceptions and its `gameTheme.js` dependence.
3. **Quiz Boss → app-measured review battle.** Replace learner self-rating ("I know it / need practice" — unreliable at ages 4–8) with real recognition questions over review-due words. The child answers; the app measures. The boss framing is theater and pacing — the child always wins; the measurement is the product.

Branch `fix/activity-roster` off main. Scoped to these three activities + their rotation/scoring wiring. Do NOT touch other activities, the Guided Path engine itself (composition lists yes, engine no), or `SayItWithNova` (item 5). Full leg: verify live before/after; merge, push, production-verify.

## PRE-FLIGHT (gate)
1. `git status` clean; `git log origin/main..main --oneline` empty (push first with approval if not). Confirm `7fe6c65` is an ancestor of HEAD.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is available — shell environment OR `.env.local` (now the standing location, gitignored). Existence check only; NEVER echo, print, log, or write the value. If absent, STOP and ask Sal.

## STEP 0 — WRITE THE REPORT FILE FIRST (non-negotiable)
Immediately create `docs/ACTIVITY_ROSTER_REPORT.md` with the REPORT headers below, "IN PROGRESS" under each. Commit in your first commit; update live.

## AUTONOMY & RULES
Permission hook allows autonomous Bash. Confirmation stops only for: secrets, destructive DB ops (beyond your own `nextgenprecisiondrones+*` test accounts), live payment mode, history rewrites. Standing rules: fresh test accounts (`admin-user.mjs` + `seed-progress`, delete after), Candy tokens only, errorless, whole-screen verification, full gates before merge, `getByRole('button',{name})`, `db-query.mjs` for reads.

Known traps (do not rediscover): rAF throttles in unfocused automation tabs (setTimeout shim, `WORDART_HYBRID_REPORT.md`); hidden tabs can suspend media decode — `Audio.play()` may never resolve/reject/end (race audio waits against a timeout, `DRAW_IT_TRACING_REPORT.md`); overlap probes check `.paused` synchronously at the next `play()` (`FILL_THE_STORY_REPORT.md`); local Vite serves no `/api` routes — server-path behavior verifies on a pushed branch's Vercel preview with `DEPLOY_BASE_URL`; `/api/speak` may be unconfigured on previews (graceful-degrade check there, real-audio checks on production); Playwright runs `workers: 1` by config — keep new specs self-provisioning; Chrome autofill on the shared automation profile can land you in a stray authenticated session (`test@yahoo.com` incident, `DRAW_IT_TRACING_REPORT.md`) — verify the active account from the auth token before acting.

**CORE METHODOLOGY RULE (this prompt sits right on it):** Dr. Blank is anti-phonics. Find the Word is HER technique and must stay pure:
- Nova speaks the WHOLE word (the question audio IS the target word — that is the design, and it does not conflict with the correct-answer=sound-only rule, which governs the feedback moment).
- NEVER letter sounds, NEVER blending, NEVER letter names.
- NO letter-level hinting (no highlighting which letters differ between look-alikes — the discrimination is whole-word). The only hint is replaying the word audio (speaker button).
- Distractors are REAL WORDS ONLY. Never pseudo-words/non-words (rin, nur) — exposing non-words to a beginning reader undermines whole-word learning. This is a hard rule.

**SCORING CHANGES (explicit, principled — the only scoring edits permitted):**
- `word_song` leaves the rotation; `find_the_word` is a REAL recognition quiz → accuracy-based 1/2/3 stars (NOT in `SCORELESS_GAME_TYPES`).
- `magic_video` is removed from `SCORELESS_GAME_TYPES` along with everything else.
- Quiz Boss becomes app-measured: `correct` reflects actual recognition, accuracy-based stars.
- **`firstTry` resolution (closes the ledger item from `FILL_THE_STORY_REPORT.md`):** keep the established convention — `firstTry: true` always, in all errorless activities including these. Rationale: `correct` already distinguishes got-it (including after one errorless retry) from failed-twice, which is what mastery/`isRealMastery` consumes; per-activity `firstTry` semantics would fork the meaning of one field across the dataset. This is the decided position — deviate only if Sal edits this prompt.
- Nothing else about `onAnswer` shape, `onProgress`, `learning_events`, XP, or the star pipeline changes.

**DESIGN LAW:** DESIGN_BRIEF.md throughout — Candy tokens, `lessonChrome.jsx` primitives (NovaPorthole/StarProgress/AnswerTile/ConfettiStars), errorless scaffold state machine copied from the proven shape (`missedOnce`/`wrong*Idx`/`revealCorrect`, 450ms wiggle+soften, persistent mint hint-glow, second-miss-completes), the standard celebration contract (900ms confetti / 1200ms before `onAnswer`), chunk shadows + press-down, 44px+, no red/X, no emoji, `prefers-reduced-motion`. Both rebuilt activities join `isE2Activity` and drop `gameTheme.js`. No new mascots or characters — the boss framing uses existing Nova + meter/celebration primitives only.

Read first: `src/lib/activityDefs.js` (rotation/ranking), how the Guided Path composes activity lists per word, current `WordSong.jsx` (incl. its two-voice/mute-flag exceptions), current Quiz Boss implementation (identify its actual gameType/component — prior notes suggest Flash Cards/SpellItOut involvement; baseline what actually renders and what it reports today), `MagicVideo.jsx`, `questProgress.js` (`SCORELESS_GAME_TYPES`), `api/session-generator.js` (spaced-repetition/confidence selection — the review-pool source), `useSessionPlan.js`, `lessonChrome.jsx`, the errorless state machine in `WordMatch`/`StoryBuilder`, `GameEngine.jsx` (chime gating pattern at the `story_builder` skip, `isE2Activity` list), prior report NOTES sections.

## PART 1 — BASELINE (all three, before state)
Fresh accounts: reach and play each of Word Song, Quiz Boss, and Magic Video (or document precisely how Magic Video fails as a stub). Capture: each one's gameType string, what it renders, what `onAnswer`/progress data it reports today (Quiz Boss's self-rating flow especially — what does "I know it" actually write?), where each appears in path composition, and their `gameTheme.js`/audio dependencies. Screenshots. This defines every removal and replacement below.

## PART 2 — MAGIC VIDEO CUT (do first — simplifies the rotation before rebuilds)
- Remove from `activityDefs`/rotation/path composition; delete the component and its stub assets; remove `magic_video` from `SCORELESS_GAME_TYPES`.
- Grep-prove zero remaining references (imports, gameType strings, quest/galaxy/selector mentions).
- Historical `learning_events` rows with `game_type='magic_video'` remain in the DB — verify every reader (stats, mastery, parent dashboard, insights) tolerates an unknown/retired gameType without crashing or miscounting. Report how each reader handles it.

## PART 3 — FIND THE WORD (replaces Word Song)
- **New gameType `find_the_word`**, replacing `word_song` in the rotation at the same path position (or the pedagogically right one — justify if moved). Old `word_song` events stay as harmless history; same reader-tolerance check as Part 2.
- **Flow**: Nova porthole speaks the target word on mount (whole word, singleton); the word is NOT displayed anywhere as a cue — the audio is the cue. 2×2 grid of TEXT tiles (Baloo 2, big, AnswerTile primitive): the target + 3 look-alike real words. Speaker button replays the word (the only hint). Errorless scaffold per the locked state machine. Correct → success sound → standard celebration. Accuracy-based stars.
- **Look-alike distractors — assess FIRST, then build.** The quality of this activity IS the distractor quality. Cost in the report:
  - (a) Algorithmic similarity over the 200-word curriculum: same first letter and/or length ±1 and/or high shared-letter overlap / low edit distance — free double-exposure to curriculum words, but audit coverage: how many of the 200 have ≥3 decent curriculum look-alikes?
  - (b) A hand-curated look-alike map (per-word lists of real words, curriculum-first, padded with simple real non-curriculum words like `rug` where the curriculum lacks look-alikes) — bounded, quality-controlled, same manifest+coverage-check contract as `letterStrokes`/WordArt.
  - (c) Hybrid: algorithmic from curriculum, curated pad only where coverage falls short.
  - Whatever wins: REAL words only, age-appropriate, never the target's plural/inflection AND the target together if audio can't disambiguate them when spoken (e.g., if `run` is the target and `runs` is shown, the spoken word "run" must uniquely match exactly one tile — verify audibility-uniqueness per set), never `CONFUSABLE_PAIRS` semantics (that list guards pictures; this needs its own audio/visual-uniqueness rule). Write ASSESSMENT + RECOMMENDATION, then proceed; STOP and surface if coverage math makes all options ugly.
- Kill Word Song's two-voice/mute-flag special cases with the component; nothing outside the singleton remains.

## PART 4 — QUIZ BOSS → APP-MEASURED REVIEW BATTLE
- **Review pool**: previously-encountered words due for review — reuse the spaced-repetition/confidence selection the session-generator already implements (server-side, child-ownership + tier gates untouched). If Quiz Boss sessions are composed client-side today, route its word selection through the same server-authoritative path; report how.
- **Battle structure**: 5–6 questions, each a real whole-word recognition question reusing proven shapes — audio-word → pick the word (Find the Word mechanics) and, for `has_art` words, picture → pick the word. Errorless scaffold per question. A boss/energy meter fills with each completed question (correct = bigger surge, retry = smaller — visual only); the boss is ALWAYS defeated at the end (errorless spirit: the child cannot lose; the run's accuracy is what the app measures and reports through the normal pipeline). End = standard celebration, per-question size discipline maintained; no new mega-celebration.
- **Self-rating is fully removed** — no "I know it / need practice" UI remains anywhere; report what its old writes looked like and confirm nothing downstream depended on that shape.
- Migrates to `lessonChrome`/Candy tokens; joins `isE2Activity`.

## PART 5 — HOUSEKEEPING (bounded)
- **Port the audio-stall guard to Fill the Story**: `StoryBuilder`'s read-back awaits `ended` with no timeout — the exact pattern `DRAW_IT_TRACING_REPORT.md` proved can hang. Apply the same `Promise.race` 4s timeout. Two-line fix; verify the read-back still completes normally with real audio in the production walk.
- **`test@yahoo.com` stray account**: investigate only — creation date, children, data volume — and report. Do NOT delete (not a `nextgenprecisiondrones+*` account; deletion needs Sal's explicit confirmation).
- **`gameTheme.js` reader census** after these migrations — list what still reads it (expect: SayItWithNova + the GameEngine internals: SoundMatch/SpellItOut/SessionComplete/UpgradeModal/GameTypeSelector, minus whatever this pass retired). Do not force full retirement; just report the updated map.
- Update `docs/200MW_Master_Project_Doc_v3.md`: Quiz Boss, Word Song→Find the Word, and Magic Video lines to DONE (merged) style — item 4 complete.

## VERIFY (fresh accounts; delete after)
- **Magic Video**: absent from every path/selector; zero references (grep output in report); stats/dashboard/insights render correctly for an account with historical `magic_video` events (seed one to prove it).
- **Find the Word**: audio-first (word never displayed as cue); replay works; across ≥10 questions every option set is real words, audibly unique against the spoken target, look-alike quality spot-checked and screenshotted; errorless scaffold verified (first miss wiggle/soften/hint-glow, no red/X, second miss completes); accuracy-based stars confirmed (deliberately answer a session at known accuracy and check the star result); no phonics anywhere; overlap probe (synchronous `.paused`) zero overlaps.
- **Quiz Boss**: review pool draws previously-seen words (seed a profile with mixed mastery and verify selection skews to low-confidence/due words); boss meter fills; child always wins; per-question errorless; measured accuracy flows to `learning_events`/stars correctly (verify a known-accuracy run end to end); no self-rating UI remains.
- **Fill the Story regression**: read-back still plays and completes with the new timeout guard (production walk).
- **prefers-reduced-motion** on both rebuilt activities.
- **Whole screen** on every state of both rebuilds; both on Candy chrome; zero `gameTheme.js` reads in either (grep).
- **Playwright**: new specs — Find the Word happy path + errorless; Quiz Boss measured-accuracy path (self-provisioning) — full suite green at default invocation (grows to 10+).
- **Gates**: `npm run build` (all sync checks), `check:no-emoji`, Playwright default invocation, `idor-proof.mjs` 9/9 with `DEPLOY_BASE_URL` against the pushed branch's preview — MANDATORY here: if Quiz Boss's word selection touches session-generator/queries, that's exactly the surface idor-proof guards.

## MERGE & PRODUCTION (the full leg)
All green → merge to main → push (approval) → confirm deployment via `gh api repos/.../commits/<sha>/status` + `curl -sI https://200magicwordsapp.com` (never the Vercel MCP connector) → production walk with a fresh account: one Find the Word question end to end (real audio, overlap probe), one Quiz Boss battle end to end (measured accuracy verified in the written `learning_events`), one Fill the Story read-back (timeout-guard regression), confirm Magic Video absent → append PRODUCTION VERIFICATION → commit docs → push (second approval). Delete test accounts.

## REPORT (docs/ACTIVITY_ROSTER_REPORT.md — created at STEP 0, filled live)
### PRE-FLIGHT — sync state, key presence (existence only)
### BASELINE — all three activities' current gameTypes/flows/writes, screenshots
### MAGIC VIDEO CUT — removals, grep proof, historical-event reader tolerance
### FIND THE WORD — look-alike assessment (coverage math, options costed, decision), flow implementation, audibility-uniqueness rule
### QUIZ BOSS — review-pool sourcing, battle structure, self-rating removal, measurement path
### SCORING — SCORELESS list changes, star behavior for both rebuilds, firstTry resolution applied
### HOUSEKEEPING — StoryBuilder timeout port, test@yahoo.com findings (report only), gameTheme reader census, v3 update
### VERIFICATION — live checks per activity, probes, new specs, gates
### PRODUCTION VERIFICATION — push/deploy confirmation, live walk results
### NOTES FOR NEXT PROMPTS — anything the Say-It overhaul / polish pass (item 5) should rely on
