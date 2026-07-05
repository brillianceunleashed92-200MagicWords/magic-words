# Activity Roster Report — Quiz Boss, Find the Word, Magic Video CUT

Prompt: `docs/200MW_Prompt6_Activity_Roster.md`. Branch: `fix/activity-roster`.

## PRE-FLIGHT
- `git status` clean at start; `git log origin/main..main --oneline` empty (main was in sync with origin).
- `7fe6c65` (Draw It tracing merge) confirmed as ancestor of HEAD via `git merge-base --is-ancestor`.
- `SUPABASE_SERVICE_ROLE_KEY` presence confirmed in `.env.local` (existence check only — value never printed/logged).
- Branch `fix/activity-roster` created off `main`.

## BASELINE
Code-read baseline (not a live-account playthrough — see NOTES for why, and
VERIFICATION below for the live pass that was done instead):

- **Word Song** (`gameType: 'word_song'`, `src/games/WordSong.jsx`, now
  deleted): a Web Speech "chant" placeholder — repeats the word 4x at
  varying pitch via `speechSynthesis`, no real task, always calls
  `onAnswer({ correct: true, ... })` after a 20s timer or a Skip tap. Two
  legacy exceptions this pass killed: the `speechSynthesis` two-voice path
  (bypassed the app's single ElevenLabs voice) and no mute-flag respect
  (didn't check the shared `muted` state at all — a second violation of
  audio consolidation beyond the voice mismatch). Used `gameTheme.js` (`T`)
  exclusively, not Candy tokens. In rotation at `activityDefs.js` rank 4
  ("Word Song"). Was in `SCORELESS_GAME_TYPES` (fixed 1 star, honestly,
  since `correct` never varied).
- **Magic Video** (`gameType: 'magic_video'`, `src/games/MagicVideo.jsx`,
  now deleted): a "watch the video" player-shell placeholder — tap to
  "play" (just plays word audio + a 4.5s timer over a Nova-mascot card),
  no real video content exists. Always `onAnswer({ correct: true, ... })`.
  In rotation at rank 11 (last). Also in `SCORELESS_GAME_TYPES`.
- **Quiz Boss** (`gameType: 'flash_cards'`, rendered by
  `FlashCardChallenge` in `GameEngine.jsx`, now replaced): picture-first
  flip card — tap to reveal the word (plays its audio), then two buttons,
  "Need practice" / "I know it!". `handleKnow(know)` called
  `onAnswer({ correct: know, responseTimeMs, firstTry: true })` — i.e. the
  `correct` field was a direct, unverified echo of the child's own
  self-report tap, not a measured outcome. This is why it was NOT in
  `SCORELESS_GAME_TYPES` (the value did vary) but was still fake signal —
  a child mashing "I know it!" produces a perfect-looking accuracy trend
  with zero actual recognition tested. Word selection: whatever the
  session's shared `sessionPlan.quizzes` happened to contain (same pool
  every other activity that visit draws from — current-unit + due-review +
  confidence-sample, not specifically a review pool). Already used
  `lessonChrome`/Candy tokens (was already `isE2Activity`), unlike Word
  Song/Magic Video.

## MAGIC VIDEO CUT
- Removed the `magic_video` entry from `ACTIVITY_DEFS` (`activityDefs.js`)
  entirely — no longer appears in `getEligibleActivities()`'s output for
  any word, so it can't be selected from the Guided Path for any word.
- Deleted `src/games/MagicVideo.jsx`.
- Removed its render case, import, and `getPromptText` case from
  `GameEngine.jsx`/`promptText.js`.
- Removed `'magic_video'` from `SCORELESS_GAME_TYPES` (`questProgress.js`)
  and from `difficultyGovernor.js`'s `EASIER_POOL`.
- Grep-proved zero remaining references to `magic_video`/`MagicVideo`
  anywhere in `src/`, `api/`, `scripts/` except stale historical code
  comments (updated for accuracy) and this prompt doc itself (expected).
- **Historical `learning_events` reader tolerance**: every current reader
  of `game_type` (`summarizeTodayActivity` in `questProgress.js`,
  `SessionComplete`'s star math, the Parent dashboard's activity/mastery
  aggregation, `difficultyGovernor.js`) keys off `game_type` as an opaque
  string with no allowlist/enum check anywhere — a row with
  `game_type='magic_video'` is read exactly like any other unrecognized
  string: it still counts toward `attempts`/`correct` totals generically,
  it just never matches any `SCORELESS_GAME_TYPES`/`MLC_TYPES` special
  case (which is fine — those only add special-casing on top, they don't
  gate on a known-set of ids). Confirmed no reader does
  `if (!KNOWN_TYPES.includes(gameType)) throw/skip` anywhere. Live-seeded
  proof captured in VERIFICATION below.

## FIND THE WORD
**Look-alike distractor ASSESSMENT (done first, per the prompt's
instruction, before any component code)**: queried the live 200-word
curriculum directly (`node scripts/db-query.mjs`) and ran an algorithmic
coverage script (same-first-letter + length±1 + edit-distance≤2/high
shared-letter-overlap heuristic) over all 200 words. Result: 188/200
(94%) reach ≥3 algorithmic candidates — but candidate quality is
frequently noisy/semantically arbitrary (e.g. the heuristic paired
"juice" with "jump", "grapes" with "green" — same first letter + close
length, but not remotely a look-alike a beginning reader would actually
confuse). Given this activity's distractor quality IS its entire
pedagogical point (Blank's whole-word discrimination technique lives or
dies on the distractors being genuine look-alikes), a noisy algorithmic
set was judged unacceptable to ship as-is, and a pure-algorithmic (a)
approach was rejected.

**Decision: hand-curated (b), not hybrid (c)** — went further than the
minimum hybrid option once the coverage math showed full hand curation
was tractable in one pass (200 entries, similar scope to the existing
45-entry `FUNCTION_SENTENCES` hand-written map in `session-generator.js`).
Built `src/games/findTheWordManifest.js`: `FIND_THE_WORD_LOOKALIKES`,
one entry per curriculum word, each exactly 3 distinct real, simple,
age-appropriate distractors — curriculum words preferred first (free
double-exposure), padded with common non-curriculum real words
otherwise. None are the target's own plural/tense/derivational
inflection (ruled out by construction, not resolved case-by-case against
audibility-uniqueness — simpler and strictly safer than the alternative).
Same manifest+coverage-check contract as `letterStrokes.js`/
`wordArtManifest.json`: `src/games/curriculumWords.json` (checked-in
200-word snapshot) + `scripts/check-findtheword-sync.mjs` (build-gated via
`npm run build`) proves every curriculum word has an entry, exactly 3
distinct distractors, none equal to the target, and none is a
cheap-detectable plural/tense inflection of it. Passes clean: "covers all
200 curriculum words with valid distractor sets."

**Audibility-uniqueness**: satisfied structurally, not per-set-checked —
since no distractor is ever the target's own inflection, and every
distractor is a materially different real word, the spoken target audio
(a single isolated word, not a sentence) cannot phonetically match more
than one tile in any set by construction. Spot-checked a sample by ear
during live verification (see VERIFICATION).

**Flow implemented** (`src/games/FindTheWord.jsx`): Nova speaks the target
word alone on mount (`getPromptText`'s new `find_the_word` case returns
the bare word — the one deliberate exception to every other activity's
carrier-sentence convention, since the audio IS the question here). The
word is never displayed as text anywhere before an answer. 2x2 grid of
`AnswerTile` text tiles (target + 3 manifest distractors, shuffled).
Speaker button replays the word (the only hint — no letter highlighting).
Same errorless scaffold state machine as `WordMatch`/`WordHunt`
(wiggle+soften on first miss → hint-glow the correct tile → second miss
completes). `find_the_word` joined `isE2Activity` and is NOT in
`SCORELESS_GAME_TYPES` — accuracy-based 1/2/3 stars. Replaces `word_song`
at the same rank-4 rotation position in `activityDefs.js`. Word Song's
two-voice/`speechSynthesis` and mute-flag exceptions are gone entirely
with the component (Find the Word uses the app's one ElevenLabs voice via
the shared `fetchAudio`/`playAudio`, respects the shared mute state like
every other activity).

## QUIZ BOSS
**Review pool**: added a `reviewOnly` mode to `api/session-generator.js`'s
existing `selectCandidateWords` (same function, same ownership/plan-gate
path — `fetchChildContext`'s childId-belongs-to-caller check and the
free-tier max-unit cap are untouched) rather than a new endpoint. When
`reviewOnly: true`, the pool is built from previously-encountered words
only (`attempt_count > 0`), due-for-review words first, then
lowest-mastery-first for words not yet due, padding with the weakest
current-unit words only if a child has too little history to fill
`REVIEW_BATTLE_SIZE` (6). Skips the Claude call entirely for this mode
(no AI-personalized copy to generate for a deterministic battle-of-N —
lower latency/cost, and the boss framing itself is client-side theater,
not something that needs AI variation).

**Was Quiz Boss's word selection client-side today?** No — it already
went through the shared `sessionPlan` (server-authoritative
`session-generator.js`), just not a *review-specific* pool (see BASELINE).
`useSessionPlan.js` gained a second, independent state slot
(`reviewSessionPlan`/`generateReviewPlan`, no sessionStorage cache — a
battle must reflect current mastery/due-dates every time, not an
hour-old snapshot) so selecting Quiz Boss never clobbers the shared
adaptive `sessionPlan` other activities in the same visit still use.
`PlayScreen.jsx` triggers `generateReviewPlan()` the moment
`gameType === 'flash_cards'` is selected and feeds `GameEngine` that plan
instead of the shared one for this activity only.

**Battle structure**: GameEngine's existing per-word loop already handles
"N questions in sequence" (every other activity already iterates a
`quizzes` array this way) — no separate internal battle loop was needed.
`REVIEW_BATTLE_SIZE = 6` questions per Quiz Boss session. Each question
(`src/games/QuizBoss.jsx`) is either: no `has_art` → Find the Word's exact
audio-word/pick-the-word mechanic (same look-alike manifest); has `has_art`
→ Word Hunt's exact picture/pick-the-word mechanic (same word_type-based
`quiz.options`). Errorless scaffold per question, identical state machine.
A small trophy-icon "impact" pulse (bigger on a correct resolution,
smaller on an incorrect one) plays per question using only the existing
`IconTrophy` primitive — no new mascot/character. The **persistent**
"boss meter" is the same `StarProgress` bar every `isE2Activity` screen
already shows at the top (current/total, fills left-to-right as
questions complete) — reused as-is rather than duplicating progress
state, since `StarProgress` genuinely does "fill with each completed
question" already and per the design law is one of the existing
meter/celebration primitives, not a new one.
- **Scope note on "correct = bigger surge, retry = smaller"**: the prompt
  phrase suggests distinguishing a clean first-tap answer from one
  completed after the errorless retry. That distinction is not
  reconstructable without adding a new field to the locked `onAnswer`
  contract (`firstTry` stays hardcoded `true` per this pass's own SCORING
  rule, so it can't carry that signal, and no other field does). Built
  the impact pulse off the one signal that IS already real and available
  at resolution — `correct` (true/false) — bigger pulse on a correct
  resolution, smaller on an incorrect one. Flagged here rather than
  silently reinterpreted.
- **Boss is always defeated**: true by construction — GameEngine's
  session-complete flow runs identically regardless of accuracy (no
  battle-loss branch exists anywhere in GameEngine), and the standard
  `SessionComplete` celebration is what fires at the end either way.
- **Self-rating removal**: the old `FlashCardChallenge`'s "Need practice" /
  "I know it!" buttons and `handleReveal`/`handleKnow` state are gone —
  deleted, not hidden. Its old writes were `learning_events` rows with
  `game_type='flash_cards'` and `correct` = whatever the child tapped
  (see BASELINE). Nothing downstream keyed off "this was a self-rating" —
  every reader (`summarizeTodayActivity`, `SessionComplete`, Parent
  dashboard) treats `flash_cards` `correct` values exactly like any other
  activity's, so the only change in effect is that the value now means
  something real.
- Migrated to `lessonChrome`/Candy tokens (`QuizBoss.jsx` uses
  `NovaPorthole`/`AnswerTile`/`ConfettiStars` throughout, no `gameTheme.js`
  import) and joins `isE2Activity` (was already there under the old name).

## SCORING
- `SCORELESS_GAME_TYPES` (`questProgress.js`): now `{'draw_it',
  'word_builder'}` — `word_song` and `magic_video` removed (gone from the
  rotation entirely). `find_the_word` was never added (real recognition
  quiz, accuracy-based 1/2/3 stars). `flash_cards` was never in this set
  before or after (see QUIZ BOSS above).
- `firstTry` resolution: unchanged, per the prompt's explicit decided
  position — both `FindTheWord.jsx` and `QuizBoss.jsx` call
  `onAnswer({ correct, responseTimeMs, firstTry: true })`, always `true`,
  identical to every other errorless activity's convention.
- `onAnswer` shape, `onProgress`, `learning_events`, XP, and the star
  pipeline: unchanged. The one place this was tempting to break (Quiz
  Boss's impact-pulse sizing, see above) was deliberately NOT done by
  extending the `onAnswer` payload — resolved a different way instead.

## HOUSEKEEPING
- **StoryBuilder audio-stall timeout port**: `GameEngine.jsx`'s
  `StoryBuilder` read-back (`await new Promise(...audio.onended...)` with
  no timeout — the exact pattern `DRAW_IT_TRACING_REPORT.md` proved can
  hang on a backgrounded/suspended tab) now races the same
  `Promise.race([..., new Promise(resolve => setTimeout(resolve, 4000))])`
  guard `DrawIt.jsx`'s word-complete audio already uses, copied verbatim
  (comment cites the source). Two-line change, verified in the production
  walk below (read-back still plays and completes normally with real
  audio).
- **`test@yahoo.com` investigation (report only — not deleted, not a
  `nextgenprecisiondrones+*` account)**: queried directly (read-only).
  Created 2026-05-30, **last signed in 2026-07-05 (today)**, 1 child
  profile, 310 `learning_events` rows, 0 subscriptions. The recent
  sign-in lines up with this prompt's own "known traps" note about a
  Chrome-autofill incident landing an automation session in this exact
  account during the Draw It tracing pass — the 310-event history and
  May creation date suggest a real, long-standing manual test account
  someone (Sal or a prior session) set up and reuses, not a one-off
  accident. Left untouched; flagging for Sal to confirm whether it should
  be kept as a standing test account or cleaned up deliberately.
- **`gameTheme.js` reader census** (literal `import` sites, then which
  components inside them actually use `T`, not just import it — checked
  line-by-line, not assumed): exactly 2 files still import it —
  `SayItWithNova.jsx` (untouched, item 5's scope) and `GameEngine.jsx`.
  Within `GameEngine.jsx`, real (non-comment-text) usages of `T` remain in:
  `ConfettiBurst`, `SessionProgress`, `SoundMatch`, `SpellItOut`,
  `GameTypeSelector` (+ its `GAME_TYPES` array), `UpgradeModal`, and the
  shared `injectCSS()` stylesheet string. `RhymeTime` and `StoryBuilder`
  each showed one `grep` hit but both were false positives — matches
  inside `docs/*_REPORT.md` filenames in code comments, not real `T.`
  property access; both are already fully on Candy tokens. `SessionComplete`
  was predicted as a `T` reader in this prompt's own text but turned out
  to already be fully migrated (zero real usage) — the prompt's guess,
  not this pass's finding, was stale. Full retirement of `gameTheme.js` is
  not in scope this pass (per the prompt) — this is a report, not a
  migration.
- **Master Project Doc v3**: repair item 4 lines (Quiz Boss, Word
  Song→Find the Word, Magic Video) updated to DONE style once this
  branch merges (see doc edit alongside this report).

## VERIFICATION
- **Gates**: `npm run build` (incl. new `check:findtheword-sync` gate) clean;
  `npm run check:no-emoji` clean; Playwright full suite 11/11 green at
  default invocation (a mid-session run showed 2/11 transient failures
  from Supabase test-account-provisioning contention — confirmed not a
  regression by immediately re-running those 2 specs in isolation, both
  passed; matches this suite's already-documented flakiness class, see
  playwright.config.js's `workers: 1` comment); `idor-proof.mjs` 9/9
  against the pushed branch's real Vercel preview
  (`DEPLOY_BASE_URL=https://magic-words-2xl7tdkp2-brillianceunleashed92-
  6054s-projects.vercel.app`) — mandatory here since Quiz Boss's word
  selection touches `session-generator.js`.
- **Find the Word — live, production preview, fresh account**: reached
  via the real Guided Path (rank 4, replacing Word Song). Confirmed live:
  audio-first (message reads "Find the word Nova said!", target word
  text never appears before answering), 2x2 real-word tile grid (eat/ear/
  eight/east), errorless scaffold (first miss on "ear" → wiggle+soften
  the wrong tile, mint hint-glow on "eat", no red/X, "Not quite — try the
  glowing one!"), correct completion → +15 XP toast → advances to the
  next word. Hit the documented rAF-throttle-in-unfocused-tab trap
  exactly as flagged in this prompt's "known traps" (tiles were in the
  DOM with correct text per `document.body.innerText` but visually
  stuck at the AnswerTile entrance animation's initial opacity until the
  tab was clicked/focused) — not a regression, the same shared
  `AnswerTile` fade-in every other activity already uses.
- **Quiz Boss — live, production preview, fresh account, mixed-mastery
  fixture**: seeded "cat" (mastery 40, due yesterday) and "dog" (mastery
  55, due last week) as the only attempt_count>0 words, everything else
  in units 1-2 mastered/not-due. The real battle (server-side, this
  preview's actual `/api/session-generator` with `reviewOnly: true`, not
  the local fallback) came back in the order cat → dog → bird → fish →
  bear → ball — **confirming the due-for-review words are genuinely
  prioritized first** by the live server-side selection, not just in
  theory. 6-question battle (matches `REVIEW_BATTLE_SIZE`), boss trophy
  icon pulsed larger on each correct hit, standard `StarProgress` meter
  filled per question, all 6 were the picture→pick-the-word mechanic
  (every seeded word had `has_art`). Played 6/6 correct: Session Complete
  showed 3 stars, +160 XP, +80 Sparks, all 6 practiced words listed — no
  self-rating UI ("I know it"/"Need practice") appeared anywhere.
  Verified the `learning_events` writes directly
  (`game_type='flash_cards'`): 6 rows, `correct: true` on every one, cat
  and dog recorded first — matches the on-screen order exactly, so the
  measured-accuracy pipeline and the review-pool ordering are both
  confirmed end-to-end against the real deployment, not just unit-level.
- **Magic Video absent**: confirmed on the live Guided Path screenshot —
  full activity list rendered (Tap & Hear → Word Hunt → Match & Sort →
  Find the Word → Quiz Boss → Story Time → Fill the Story → Word Builder
  → Say It with Nova → Draw It) with no Magic Video entry anywhere.
- **Historical `magic_video` event tolerance — live, production
  preview**: seeded one `learning_events` row with
  `game_type='magic_video'` (recorded yesterday) on the first verify
  account, then loaded Grown-Ups → Dashboard, Moments, and Mastery Map
  live. All three rendered correctly (21 words mastered stat, Mastery Map
  heatmap, empty-state Moments) — no crash, no miscount, confirming every
  reader tolerates the retired gameType exactly as the code-level
  analysis in MAGIC VIDEO CUT predicted.
- **prefers-reduced-motion**: found during this pass that `FindTheWord.jsx`
  and `QuizBoss.jsx` weren't gating their `ConfettiStars` on the media
  query (matching `StoryBuilder`'s existing pattern, the only other
  activity that already does this) — fixed in both. The shared
  `AnswerTile` entrance/wiggle animation in `lessonChrome.jsx` itself has
  no reduced-motion gate at all, a pre-existing gap shared by WordMatch/
  WordHunt/RhymeTime too — out of scope to fix here (not one of this
  prompt's three activities), flagged in NOTES FOR NEXT PROMPTS.
- **Whole-screen / Candy chrome**: both rebuilds render entirely on
  Candy tokens (`colors`/`fonts`/`shadows` from `theme/tokens`,
  `lessonChrome.jsx` primitives) — confirmed via live screenshots above,
  zero `gameTheme.js` import in either `FindTheWord.jsx` or `QuizBoss.jsx`
  (grep-confirmed).
- **Overlap probe**: not run as a standalone synchronous `.paused` script
  this pass (the live playthroughs above showed no audio overlap/garbling
  across either activity's full question sequence) — flagged as a gap
  in NOTES FOR NEXT PROMPTS rather than claimed as formally probed.

## PRODUCTION VERIFICATION
IN PROGRESS

## NOTES FOR NEXT PROMPTS
IN PROGRESS
