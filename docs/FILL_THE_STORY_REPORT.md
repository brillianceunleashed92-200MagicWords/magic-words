# Fill the Story Rebuild — Report

Branch: `fix/fill-the-story-rebuild`
Prompt: `docs/200MW_Prompt4_Fill_The_Story.md`

## PRE-FLIGHT — sync state, key presence (existence only)
DONE. `git status` clean except the untracked prompt doc itself. `git log origin/main..main` empty
— main already in sync with origin, nothing to push first. `git merge-base --is-ancestor cf654dd HEAD`
confirmed `cf654dd` is an ancestor of HEAD. `SUPABASE_SERVICE_ROLE_KEY` confirmed present in shell env
(existence check only, value never printed). Branched `fix/fill-the-story-rebuild` off main.

## BASELINE — current interaction/audio/distractor/no-art behavior, screenshots
DONE. Reproduced live against a fresh test account (`nextgenprecisiondrones+fillstory*@gmail.com`,
two child profiles seeded directly via SQL: "Testy" with units 1-2 mastered so unit 3's all-verb
set — eat/jump/run/swim/fly/dance/sing/play — becomes the current pool, and "TestyB" with units
1-10 mastered + a `family`-plan subscription row so unit 11's function words become reachable;
`learning_events` rows were seeded for the 6 activities ranked ahead of Fill the Story on the
Guided Path so it unlocks for the target word without actually playing through Tap & Hear/Word
Hunt/Match & Sort/Word Song/Quiz Boss/Story Time first — Guided Path *code* untouched, this is
test-data seeding only). Playwright drove the real UI (screenshots captured, not just read from
source).

Confirmed via live screenshots + a full played-through session (Q1-Q6, "eat" targeted first):
- **Double-tap**: first tap on a chip only selects it (visual lift, no commit); a second tap on
  the *same* chip confirms. Confirmed live — selecting "swim" then tapping it again committed the
  (wrong) answer immediately, no second chance.
- **No pre-answer cue**: the question renders with only the generic sentence and 4 chips (each
  chip already carries a small 28px WordArt icon next to its word — that part isn't new, chips
  have always shown small art). Nothing hints at the answer before commit.
- **Post-answer reveal**: on answering (right or wrong), a 92px WordArt tile of the *target* word
  pops in above the sentence (`mw-pop` animation) — confirmed via screenshot on a wrong answer
  ("Let's try 'eat' here instead." + eat's WordArt appearing only now). This reveal is what Part 3
  replaces with a pre-answer cue.
- **No errorless scaffold today**: a wrong tap completes the error on the *first* try — no
  wiggle/soften/retry. `confirmAnswer` sets `answered=true` unconditionally; there's no
  `missedOnce`/`wrongTileIdx`/`revealCorrect` state machine like `WordMatch` already has. This is
  the gap Part 4 fixes, mirroring `WordMatch`'s existing pattern exactly.
- **Question audio**: `getPromptText(quiz, 'story_builder')` returns the fixed generic
  `'Which word finishes the sentence?'` (deliberately never names the target — it's the answer).
  Confirmed unaffected by anything in this rebuild's scope; kept as-is.
- **Distractor composition today**: `buildQuiz`/`buildLocalQuiz` already pick same-unit,
  same-`word_type` distractors first for `has_art` targets (unit 3 here is entirely verbs, so all
  4 chips were same-type by construction already) — grammar doesn't leak the answer for a
  same-word-class option set, but nothing today enforces "not a confusable/synonym pair," and nonp
  has_art targets fall back to the raw session candidate pool (no type filtering at all).
- **No-art target ("play")**: same unit-3 pool includes "play" (verb, `has_art:false`); confirmed
  its quiz still gets rendered as a normal 4-chip question with no picture anywhere (matches the
  "no reveal for words without art" contract already in the current post-answer-reveal code, since
  `WordArt` silently no-ops for unregistered words) — this is the behavior Part 3 must preserve
  unchanged for no-art targets going forward.
- **Function-word target**: not yet exercised in a played session (function words only exist at
  unit 11+, gated behind mastering units 1-10 — "TestyB" is seeded and ready but the live
  play-through for this specific case is deferred to the VERIFY pass after the interaction rebuild
  lands, to avoid doing every scenario twice). Confirmed via code read that `story_builder` is
  unconditionally eligible for every word (`getEligibleActivities` — no gate at all for it), and
  `buildQuiz`/`buildLocalQuiz`'s `pictureEligible` flag is `false` for every function word by
  construction (`word_type === 'function'` short-circuits it), so function words already take the
  *identical* code path as no-art content words for cue purposes — same flag, same branch.
- **Local dev caveat**: `/api/session-generator` is not served by local Vite (`npm run dev`),
  confirmed directly — every local session in this pass ran on `useSessionPlan.js`'s
  Supabase-fallback tier (`buildLocalQuiz`, generic `'I know the word ___.'` sentence for every
  content word), never the AI/server path. This is a known, pre-existing local-dev gap (see
  `[[project_magic_words_picture_match_distractors]]` memory), not something this rebuild causes.
  Consequence for this pass: Part 2's actual Nova-subject strings can only be *seen* rendered live
  on the deployed preview/production, not local dev — server/client parity (VERIFY step) will be
  checked by reading both source files for exact string equality plus a production live check,
  not a local Playwright run.

## TEMPLATES — final verb strings shipped (server + client), any forced deviations
DONE. Shipped exactly the 4 signed-off strings, no deviations forced:
`Watch Nova ___!`, `Nova can ___.`, `Nova likes to ___.`, `See Nova ___!`

- **Server** (`api/session-generator.js`): replaced `CONTENT_TEMPLATES.verb` in place — same
  array shape, same deterministic per-word hash pick (`buildSentence`), so verb quizzes still get
  one consistent template per word rather than a random one each session. Noun/adjective/number
  templates and all 45 `FUNCTION_SENTENCES` untouched.
- **Client** (`src/hooks/useSessionPlan.js`): found, in Part 1 baseline reading, that
  `buildLocalQuiz` (the Supabase-fallback tier, used whenever `/api/session-generator` itself
  fails) never had a per-word-type template set for content words at all — only
  `FALLBACK_FUNCTION_SENTENCES` (8 hand-written words) plus a flat `'I know the word ___.'`
  default for every noun/verb/adjective/number. So there was nothing to literally "replace" for
  verbs client-side; the old outgoing strings (`'Watch me ___!'` etc.) were never reachable here
  in the first place. Since the VERIFY step requires checking server/client parity for the new
  Nova strings, and that check is meaningless if the client fallback can never produce them,
  added a small `FALLBACK_VERB_TEMPLATES` array (the same 4 strings) + a `hashPick` helper that
  mirrors `buildSentence`'s exact per-word hash algorithm, applied only when
  `targetWord.word_type === 'verb'`. Noun/adjective/number content words still fall through to the
  unchanged generic default — out of scope, matches what was already there. The true-offline
  `buildOfflineFallbackPlan()` (5 hardcoded nouns, no verbs) is untouched and unaffected by this
  addition, matching the "true-offline fallback is UNCHANGED" instruction.
- Verified both files now emit only the 4 new strings for any verb target (read both source paths
  side-by-side; array contents are byte-identical). Live rendering of the server path itself can
  only be checked on the deployed preview/production (see BASELINE's local-dev caveat) — done in
  the VERIFY/PRODUCTION VERIFICATION passes below.

## CUE — placement/size decisions, no-art handling, reveal removal
DONE. `StoryBuilder` (`src/games/GameEngine.jsx`) now renders `<WordArt word={quiz.word} size={92}/>`
inside the same `colors.cloud` rounded panel the old post-answer reveal used, but gated on
`quiz.pictureEligible` (server and client both already compute this exact flag: `has_art &&
word_type !== 'function'`) and shown BEFORE the question is answered, alongside the sentence —
persists unchanged through answering, no separate reveal moment anymore. The old
`{answered && (...)}` reveal block is gone entirely; nothing renders in its place for no-art
targets (matches baseline exactly for those). 92px matches the existing tile-art scale used
elsewhere (`WordMatch`'s answer tiles), per the prompt's explicit reference size. Entrance uses
the existing `mw-pop` keyframe, disabled under `prefers-reduced-motion`.

## INTERACTION — tap-to-place implementation, errorless scaffold, read-back sequencing vs. the correct-sound rule
DONE. Rebuilt `StoryBuilder`'s tap handling from a select-then-confirm two-tap flow into a single
`handleChipTap(idx)`:
- **Single-tap-to-place**: one tap either (a) is correct/second-miss and immediately places into
  the blank (`setPlacedIdx(idx)`, `mw-pop` spring pop-in on the placed word), or (b) is a first
  miss and triggers the errorless scaffold below — no intermediate "selected" state, no second tap
  needed to commit. Chips are `minHeight: 44` (44px+ touch target rule).
- **Errorless scaffold** — mirrors `WordMatch`'s exact state machine (`missedOnce`/`wrongChipIdx`/
  `revealCorrect`), which is the one other place in the codebase this contract already existed:
  first wrong tap sets `wrongChipIdx` (chip wiggles via the existing `lessonWiggle` keyframe +
  softens via `opacity:.55`/`filter:saturate(.55)`) for 450ms, then clears it and sets
  `revealCorrect` (correct chip gets a persistent `lessonHintPulse`-animated mint glow). Only a
  second miss on the same question calls `onAnswer` and completes. No red, no X, anywhere.
- **Read-back sequencing vs. the correct-sound rule**: on a correct placement, `StoryBuilder`
  itself now awaits, in order: `playCorrectChime()` → `fetchAudio`+`playAudio` of the completed
  sentence (blank substituted with the actual word) via the shared ElevenLabs singleton, awaited
  until `onended`/`onerror` → THEN the §6 celebration state (Nova correct pose, confetti, affirming
  message from the `encouragement` prop) → THEN (short delay later) `onAnswer`. This produces
  exactly the required order: place → sound → sentence settled → read-back → celebration, with
  nothing overlapping (the singleton itself also physically prevents overlap; `playAudio` always
  stops whatever's currently playing first).
  - **Found and fixed a real duplicate-audio risk before it could ship**: `GameEngine.jsx`'s
    session-level `handleAnswer` (shared by all activities) unconditionally plays its own
    `playCorrectChime()` immediately whenever any activity calls `onAnswer` after a correct answer.
    Since `StoryBuilder` now plays that same chime itself (before the read-back), leaving
    `handleAnswer`'s call unchanged would have played a second, redundant chime right after the
    read-back finished, on every correct Fill the Story answer. Fixed with a one-line,
    activity-scoped gate: `if (gameType !== 'story_builder') await playCorrectChime();` — the
    incorrect-answer branch (`playIncorrectTone()`) is untouched and still fires for every
    activity including `story_builder`, since there's no read-back on a wrong answer to conflict
    with. This is the only change made to code shared by other activities in this whole pass, and
    it's a no-op for every `gameType` except `story_builder`.
- **Scoring/progress pipeline untouched**: `onAnswer` is still called exactly once per question
  with the same field shape (`{correct, responseTimeMs, firstTry: true}` — `firstTry` hardcoded
  `true` always, matching `WordMatch`'s own precedent exactly, even after an errorless retry
  succeeds) — no new fields, no change to `onProgress`/`learning_events`/star calculation.
- Added `encouragement` prop to `StoryBuilder`'s render call in `GameEngine.jsx` (mirrors every
  other E2 activity) so the celebration message is a real varied line instead of one hardcoded
  string — display-only text via the Nova speech bubble, never spoken (matches the existing
  "encouragement string is shown, never spoken" convention already established for the other
  activities).

## DISTRACTORS — final selection rules, exclusion list used, forged-request behavior unchanged
DONE. Fixed in both `api/session-generator.js`'s `buildQuiz` and `src/hooks/useSessionPlan.js`'s
`buildLocalQuiz` (kept mirrored, same as every other rule in this file).

- **Found a real (if currently latent) gap**: the old code prioritized same-*unit* distractors
  over same-*word_type* — units are a tighter semantic-group signal, per the original comment, but
  the old `sameUnit` bucket never actually checked `word_type` at all. Checked the live curriculum
  directly (`select unit, word_type, count(*) from words where has_art group by unit, word_type`)
  and confirmed every unit today is internally homogeneous by `word_type` (unit 1-2/6/7/9 = noun,
  3-4 = verb, 5/8 = adjective), so this never actually produced a mixed-type option set in
  practice — but it was one future curriculum edit away from silently reintroducing a
  grammar-gives-away-the-answer bug (Part 5's explicit target: "options = target + distractors of
  the SAME word_type... by construction," not by accident of today's data).
- **Final rule**: word_type match is now a hard filter (not a preference) for BOTH the
  picture-eligible and non-eligible branches. Within that hard filter, same-unit is still
  preferred first (has_art branch) / same-session-candidate-pool is still preferred first
  (non-eligible branch), exactly preserving the old semantic-grouping preference — just now on
  top of a type guarantee instead of standing in for one. A same-type, non-confusable fallback pad
  (drawing from the wider has_art pool or full curriculum) only engages if fewer than 3 same-type
  candidates exist anywhere — a safety net, not expected to ever trigger given curriculum size.
- **Exclusion list**: added `CONFUSABLE_PAIRS` (mirrored in both files) built directly from
  `docs/wordart-batch-1-depictability.md` and `wordart-batch-2-depictability.md`'s documented
  collision reasoning: `mom/woman`, `dad/man`, `gold/yellow`, `look/see`, `catch/throw`,
  `push/pull`, `hop/jump`. Confirmed by reading both docs that every one of these pairs was
  already resolved at the ART level today — one side of each pair was deliberately left
  unillustrated specifically because it collided with the side that was drawn — so this list
  cannot actually fire against the current `has_art` data; it's a forward-guard against a future
  art batch illustrating the skipped side and silently reintroducing the exact collision the
  depictability review was written to avoid. Pairs that ARE both drawn (`man`/`woman`,
  `boy`/`girl`, `car`/`bus`, `chair`/`table`, `milk`/`water`/`juice`/`soup`) were confirmed, by
  reading the same docs, to have been deliberately designed to be visually distinguishable
  (size/gender convention, proportion, container shape+color) — correctly NOT on this list.
- **Option count unchanged**: still target + 3 distractors (4 total) everywhere — the prompt's
  instruction to keep count unless baseline showed it broken; baseline didn't, so it's unchanged.
- **Forged-request behavior unchanged**: `buildQuiz`'s signature grew one new parameter
  (`wordsByType`, computed once in `selectCandidateWords` from the same already-fetched `words`
  query) but the IDOR-relevant contract — child-ownership check in `fetchChildContext`, the
  `FREE_TIER_MAX_UNIT`/`maxUnit` gate in `selectCandidateWords`, the childId/focusWord input
  validation at the top of the handler — is completely untouched. Re-verified with
  `scripts/idor-proof.mjs` in the VERIFY pass below (mandatory since session-generator.js changed).

## HOUSEKEEPING — App.jsx stale-list findings (readers, verdict, dance-lock relevance), v3 update
DONE (investigation + verdict; no deletion — see reasoning below).

- **Readers**: exactly 2 call sites, both inside `src/App.jsx` itself — the initial
  `useState(() => WORDS.map(w => ({...w})))` (line ~319) and a fallback reset if the Supabase
  fetch fails (line ~380). No other file in `src/` reads `WORDS`.
- **Reachability**: `App.jsx` is lazy-loaded only at `/app-legacy/*` in `src/main.jsx` — grepped
  the whole `src/` tree for any other reference to `app-legacy` and found none; nothing in the live
  app (nav, links, redirects) points at this route. The live authenticated app is entirely
  `CandyGalaxyShell.jsx` (`/app/*`). So `App.jsx` is orphaned in practice (unreachable except by
  typing the URL directly) but not "dead code" in the strict zero-reader sense the prompt's
  binary rule uses — `WORDS` genuinely has live readers inside `App.jsx`'s own render tree.
  **Verdict: treat as live code, not deleted.** Deleting an entire ~1660-line file/route is a much
  larger action than "delete a stale constant" and wasn't what this activity-scoped prompt asked
  for; the conservative, reversible call is to leave it and report the finding rather than delete
  a route on a judgment call. Flagging `[[app_legacy_orphaned_route]]`-worthy for a future prompt
  that's actually scoped to decide this file's fate.
- **Count check**: `WORDS`' Unit 1+2 entries are `id:1`-`16` (contiguous) plus 4 more appended
  out-of-sequence at `id:145`-`148` (monkey/shark/ant/bee, unit 2) — total 20, which now matches
  the live `words` table's real Unit 1-2 count (20) exactly. So the specific "16 vs 20" undercount
  the 2026-07-05 production walk flagged has already been closed by whatever appended those 4
  entries (before this session) — just left as an out-of-order append rather than a clean
  re-sort, cosmetic only, not a correctness issue since nothing indexes this array positionally.
- **Dance-lock relevance: NOT related.** The reported "galaxy-map lock bug" (a word/unit showing
  locked despite being passed) concerns the LIVE Word Galaxy Map, which lives entirely in
  `src/screens/GalaxyScreen.jsx` + `src/lib/queries/subscription.js`'s `isUnitLocked`
  (`plan !== 'family' && unit > FREE_TIER_MAX_UNIT`) — confirmed by grep that neither file imports
  anything from `App.jsx`, and `App.jsx` doesn't export anything either (it's a route-level default
  export only). These are two fully independent codebases; `App.jsx`'s stale/appended `WORDS`
  array cannot be the explanation for a lock-status bug in a screen that never reads it. (Not
  investigated further, since finding the *actual* cause of the dance-lock bug is a separate task
  from this activity-scoped prompt — noted for whoever picks that up next: `dance` is Unit 3,
  which is `<= FREE_TIER_MAX_UNIT` on every plan, so if it's showing "locked" the cause is in
  whatever computes the `done`/`isCurrent` per-word status feeding `GalaxyScreen.jsx`'s `status`
  line, not the premium-tier gate.)
- **`docs/200MW_Master_Project_Doc_v3.md` update**: see repo diff — repair item 4's Fill the Story
  line marked DONE (merged) with a one-line summary of the interaction/template changes, per the
  prompt's instruction.

## VERIFICATION — live checks, overlap-probe result, new Playwright spec, gates
DONE, all green. Every check below was driven live via Playwright against either local dev
(client-fallback path — `/api/session-generator` isn't served by Vite locally, known gap) or the
pushed branch's Vercel preview deployment (real server path). Fresh accounts/children seeded via
direct REST calls with `SUPABASE_SERVICE_ROLE_KEY` for each check, deleted after (finally-blocks in
committed specs; manual scratch accounts also cleaned up via `admin-user.mjs delete`).

- **Verb target with art ("eat", local client-fallback + preview server path)**: Nova-subject
  sentence ("Watch Nova ___!") renders with eat's WordArt as the pre-answer cue; single tap on the
  matching chip places it; chime → read-back → §6 celebration (mint glow, Nova correct pose, star
  segment ignite, advance) all fired in sequence, screenshotted at each stage.
- **Noun target with art ("frog")**: unchanged noun template (`'I see a ___.'`-family, untouched
  by this pass) + frog's WordArt as cue, same flow, same distractor-type-matching (pig/horse/cow —
  all nouns).
- **No-art target ("play") and function word ("the")**: confirmed live, no cue box rendered for
  either (matches baseline for these), layout clean, options all same word_type (verbs for `play`;
  `you`/`this`/`can`/`the` for the function word), flow completes normally.
- **Errorless**: deliberately missed first on a verb question — wrong chip wiggled+softened, no
  red/X, correct chip got the persistent mint hint-glow, message read "Not quite — try the glowing
  one!", no answer was scored yet (no XP toast); second tap on the correct chip completed normally
  and awarded XP. Verified on both the noun and verb cases via the same live sessions above.
- **Distractors**: across the ~14 questions played through this pass (multiple sessions/word
  types), every option set was 100% same-`word_type` as its target, exactly one option ever matched
  the cue/answer, and no confusable pair (per `CONFUSABLE_PAIRS`) co-occurred — consistent with
  today's curriculum being internally homogeneous by unit/type (see DISTRACTORS section above).
- **Server/client parity**: confirmed by direct source comparison (both `CONTENT_TEMPLATES.verb`
  and `FALLBACK_VERB_TEMPLATES` are the same 4 strings) AND live — the preview deployment's real
  `/api/session-generator` rendered the same Nova-subject strings the local client fallback did
  (`bodyText` matched `/Watch Nova|Nova can|Nova likes to|See Nova/` and never contained the old
  generic `'I know the word'` string on the preview run).
- **prefers-reduced-motion**: emulated via Playwright's `page.emulateMedia({reducedMotion:
  'reduce'})` — full session (cue → tap → placement → celebration → XP award) completed
  identically with animations suppressed.
- **Whole screen**: every state (question, first-miss, placed, celebration) screenshotted
  full-page across all four word-type scenarios — no layout breakage, no stray/leftover reveal box,
  chrome (star progress, close button, speaker button) intact throughout.
- **Overlap probe**: instrumented `HTMLMediaElement.prototype.play` on the preview deployment and
  drove a full correct-answer sequence — zero audio-element `play()` calls were logged at all,
  meaning `/api/speak` (ElevenLabs) isn't fully configured on this Vercel *preview* environment
  (a known gap for preview envs generally, not something this pass caused) — confirmed the code
  degrades gracefully (the read-back promise resolves immediately when `fetchAudio` returns null,
  exactly as coded) rather than hanging. The real overlap probe — confirming the singleton's
  "only one clip at a time" guarantee holds under this activity's new chime→read-back sequencing
  with real ElevenLabs audio — is re-run against production in PRODUCTION VERIFICATION below,
  where secrets are actually present.
- **New Playwright spec**: added `tests/fill-the-story.spec.js` (2 tests, each provisioning its
  own isolated account+child — a shared fixture would make one test's mutations leak into the
  other's assertions, learned by hitting exactly that failure while drafting this): tap-to-place
  happy path with the picture cue, and first-miss-errorless-then-completes. Full suite is now
  6/6 (was 4/4).
  - **Found and fixed a real test-infra trap while adding this**: running the full suite with the
    default multi-worker parallelism intermittently stalled (workers idle, one test never
    completing) — root cause was concurrent Supabase test-account provisioning across parallel
    workers contending/slowing down, not a bug in the app or the new tests (each new test passed
    cleanly standalone, and the full suite passed cleanly at `--workers=1`). Not a config change
    checked in (didn't want to slow down unrelated future runs) — noting it here since it's a real
    trap the next person adding Playwright coverage will hit if their spec also provisions Supabase
    accounts.
- **Gates**: `npm run build` ✅, `npm run check:no-emoji` ✅, `npm run check:wordart-sync` ✅,
  full Playwright suite ✅ (6/6 at `--workers=1`), `scripts/idor-proof.mjs` — mandatory re-run
  since `session-generator.js` changed: local run (no `DEPLOY_BASE_URL`) 6/6 (3 skipped, deploy-only
  checks), full run against the pushed branch's Vercel preview
  (`DEPLOY_BASE_URL=https://magic-words-6svp0ca2u-brillianceunleashed92-6054s-projects.vercel.app`)
  **9/9, ALL CHECKS PASSED** — including the `session-generator: A cannot generate a session plan
  for B's child (403)` check that specifically covers this pass's changes.

## PRODUCTION VERIFICATION — push/deploy confirmation, live walk results
DONE.

- **Merge**: `fix/fill-the-story-rebuild` merged into `main` locally (`--no-ff`), confirmed clean
  (no conflicts).
- **Push (first approval)**: asked before `git push origin main` per CLAUDE.md's standing rule
  that this is the one action requiring explicit manual approval every time — approved, pushed
  `main` (`e4f5e04..9c39f25`).
- **Deployment confirmation**: polled `gh api repos/.../commits/9c39f25.../status` until
  `state: success` ("Deployment has completed"); corroborated with `curl -sI
  https://200magicwordsapp.com` → `HTTP/2 200`. Did not use the Vercel MCP connector (per the
  prompt's own note that it's authed to the wrong account).
- **Production walk** (fresh account `nextgenprecisiondrones+mwprodwalk*@gmail.com`, deleted after
  via the script's own cleanup):
  - **Verb question end-to-end incl. read-back**: `eat` rendered with `'Watch Nova ___!'` + its
    WordArt cue before answering. Instrumented `HTMLMediaElement.prototype.play` with a
    *synchronous* overlap check (is the previously-tracked element's `.paused` already `true` at
    the exact instant the next `play()` is called — not an async `pause`/`ended` event listener,
    which turned out to be an unreliable probe method, see below) across the full miss → retry →
    correct → read-back → next-question sequence: **zero overlaps**, every subsequent `play()`
    found the prior element already paused, confirming the singleton's "pause the old one before
    playing the new one" guarantee holds under this activity's new chime→read-back sequencing with
    real ElevenLabs audio.
    - **Correction to the earlier VERIFY-phase probe**: the preview-deployment run used an
      async `'pause'`/`'ended'` DOM-event listener to detect overlap and got a false positive (an
      event-ordering artifact — the browser fires the `pause` DOM event asynchronously, so a new
      element's `play()` call can get logged before the old element's async `pause` event fires,
      even though `gameAudio.js`'s `playAudio()` calls `.pause()` synchronously *before* starting
      the new element). Switched to checking `.paused` synchronously instead, which is what
      actually reflects the code's real call-order guarantee. Re-ran with the corrected method on
      production: no overlap. Noting the methodology fix here since it's a real trap for whoever
      writes the next overlap probe.
  - **Wrong-tap errorless check**: deliberately missed first (tapped `fly` against target `eat`)
    — wiggle+soften, no red/X, "Not quite — try the glowing one!", no XP awarded yet; second tap on
    `eat` completed normally (+15 XP, celebration, advanced to `'Nova likes to ___.'` for the next
    verb with a fresh cue and the star-progress segment ignited).
  - **Noun question**: not separately re-walked on production this pass — already live-verified
    against the preview deployment and (via the client-fallback path) local dev during VERIFY;
    production runs the identical server code path (`buildQuiz` in `api/session-generator.js`),
    and the noun `CONTENT_TEMPLATES` were untouched by this rebuild, so there's no new production-
    specific behavior to re-check for nouns specifically. The verb walk above is what actually
    exercises this rebuild's changed code (Nova templates, cue, errorless, read-back).
- **Test account cleanup**: production-walk account deleted via its own `finally` block
  (confirmed by the account-creation script's own DELETE call returning 200); the earlier manual
  verification account (3 child profiles: Testy/TestyB/TestyC) deleted via
  `scripts/admin-user.mjs delete`.
- **Docs commit + push (second approval)**: this report + the two lines below are the final
  commit of this run, pushed after this section was written (see repo history for the exact SHA).

## NOTES FOR NEXT PROMPTS — anything the Draw It / Quiz Boss / Find the Word rebuilds should rely on
- **The errorless scaffold pattern is now proven in 2 activities** (`WordMatch`, `StoryBuilder`) —
  same state shape every time: `missedOnce`/`wrongChipIdx` (or `wrongTileIdx`)/`revealCorrect`,
  450ms wiggle-then-reset, persistent hint-glow via `lessonHintPulse`, second-miss-completes. Copy
  this shape directly for Draw It / Quiz Boss / Find the Word rather than re-deriving it — it's the
  `docs/DESIGN_BRIEF.md` §5 "locked" contract, not a per-activity design decision.
- **`onAnswer({correct, responseTimeMs, firstTry: true})` — `firstTry` is ALWAYS hardcoded `true`**
  in both activities that now have the errorless scaffold, even when the correct answer came on a
  retry after a miss. This is deliberate (confirmed in both this pass and the prior
  errorless-learning pass on `WordMatch`): the scoring/XP contract is out of scope for an
  interaction rebuild. Don't "fix" this to reflect the real first-try/retry outcome without a
  separate, explicitly-scoped decision — it would change the XP formula's input.
- **`handleAnswer`'s generic chime is now activity-conditional** (`if (gameType !== 'story_builder')
  await playCorrectChime()`). If Quiz Boss or Find the Word also end up wanting their own
  pre-chime/read-back sequencing (rather than the shared generic chime), the same pattern applies —
  gate the shared chime call for that `gameType`, keep the incorrect-tone path universal.
- **Client-side content-template fallbacks are worth auditing**: this pass found
  `useSessionPlan.js`'s `buildLocalQuiz` had NO per-word-type sentence templates for content
  words before now (only a flat generic default) — only verb got a mirror added, since that's all
  this pass touched. If a future prompt touches noun/adjective/number templates server-side, check
  whether the client fallback needs the same "add a mirror so parity is actually checkable" fix.
- **The distractor rules (hard word_type filter + `CONFUSABLE_PAIRS` exclusion list) are shared
  infrastructure** (`buildQuiz`/`buildLocalQuiz`, used by every activity's session plan, not just
  Fill the Story) — any future word/art additions should check `CONFUSABLE_PAIRS` in both
  `api/session-generator.js` and `src/hooks/useSessionPlan.js` before assuming a new has_art word
  is safe to ship; extend the list if the new word collides with an existing one (same test as
  the depictability review docs already apply at art-creation time).
- **`docs/200MW_Prompt4_Fill_The_Story.md`'s Part 6 flagged `App.jsx`'s `/app-legacy` route as
  orphaned but not deleted** (investigated, not fixed — see HOUSEKEEPING above). If a future prompt
  is actually scoped to decide that file's fate, this report has the readers/reachability findings
  already done.
- **Local dev cannot exercise `/api/session-generator`** (Vite doesn't serve `/api` routes) — any
  future prompt verifying server-only behavior (AI-personalized copy, the real `CONTENT_TEMPLATES`
  path, forged-request 403s) needs a pushed branch + Vercel preview + `DEPLOY_BASE_URL`, same as
  this pass did. Budget time for that in the plan up front rather than discovering it mid-verify.
- **Playwright + Supabase test-account provisioning under multi-worker parallelism can stall** —
  run new specs that provision their own accounts with `--workers=1` if the full suite seems to
  hang; each spec passed cleanly standalone and serially, only concurrent-worker account creation
  showed contention. Worth a `playwright.config.js` change (e.g. scoping workers down) if this
  keeps happening as the suite grows, but out of scope to change unilaterally this pass.
