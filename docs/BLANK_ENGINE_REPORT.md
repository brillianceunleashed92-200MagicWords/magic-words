# FEAT_BLANK_ENGINE_R1 — REPORT

Branch: `feat/blank-engine` · Prompt: `docs/FEAT_BLANK_ENGINE_R1.md`

## RUN TIMING
- **Start**: 2026-07-08
- **Phase 0 (report + recon)**: IN PROGRESS
- **End**: —

## STEP 0 — RECON FINDINGS (before any code)

Read per the prompt's Phase 0 list: `api/session-generator.js` (full, 830
lines), `src/lib/masteryCalibration.js`, the Story Engine / Story Time flow
(`api/story-engine.js`, `src/screens/StoryScreen.jsx`,
`src/games/StoryTimeActivity.jsx`, `src/components/candy/StoryReader.jsx`,
`src/lib/localStory.js`, `src/lib/queries/storyCatalog.js`,
`supabase/migrations/0030_story_catalog.sql`,
`scripts/seed-story-catalog.mjs`), `src/games/lessonChrome.jsx` (the
errorless tile+scaffold primitive), and the `words` table's
`word_type`/`has_art`/`unit` distribution (live query).

**Package B/C NOTES sections read**: `docs/PEDAGOGY_CALIBRATION_REPORT.md`
§NOTES FOR PACKAGE C (the `isRealMastery` server-mirror pattern +
check-script-guarded sync convention — extended, not forked, by this run).

### Key findings

1. **`selectCandidateWords` (api/session-generator.js:285-387)** is the one
   function that builds the normal-session candidate pool. `reviewOnly`
   (Quiz Boss) returns early at line 363 with its own distinct pool —
   confirmed untouched by this run's changes, which all live after that
   early return. `checkinMode`/`placementMode` never call
   `selectCandidateWords` at all (separate `handleCheckin`/`handlePlacement`
   functions) — confirmed untouched by construction.

2. **Function words never have art** — live query confirms all 45
   `word_type='function'` rows have `has_art=false`, spanning units 11-18.
   `buildQuiz` already routes every function word to the cloze/sentence
   path (`pictureEligible` is hard-`false` for `word_type==='function'`) —
   the "never as isolated picture-matching" rule from the mission is
   **already enforced by existing code**; this run's gap is entirely about
   getting below-floor function words *into* the candidate pool, not about
   how they're quizzed once there.

3. **Free-tier cap interaction (important, confirmed live)**: function
   words occupy units 11-18 exclusively. `FREE_TIER_MAX_UNIT = 5`. The
   `allWords` query in `selectCandidateWords` is `.lte('unit', maxUnit)` —
   for a free-tier account (`maxUnit=5`) this means **zero function words
   are ever loaded into `withProgress` at all**, before any floor logic
   runs. Consequence: the below-floor function-word exemption this run
   adds is a real, live fix for **family-plan** accounts (whose `maxUnit`
   is 18, so a high placement floor can genuinely skip units 11-14's
   function words) but is a structural no-op for free-tier accounts today
   — not because of anything this run does, but because free tier never
   reaches unit 11 at all under the existing plan cap. This is a
   pre-existing, out-of-scope gap (the mission scopes this run to the
   placement-floor *derivation*, not `FREE_TIER_MAX_UNIT` itself) — flagged
   in NOTES FOR WEEKLY_INSIGHTS below, not fixed here. It also means the
   "confirm no premium content leaks through the exemption" check is
   easy to satisfy by construction: the exemption only ever filters
   `withProgress`, which is already hard-capped to `maxUnit` before the
   exemption logic ever runs — there is no path for the exemption to add a
   word above the plan's cap.

4. **Mastered-content damping target**: `currentUnitWords` (the
   current-unit pool) already excludes mastered words by construction
   (`!isRealMastery(...)` filter). `dueForReview` is spaced-repetition
   timing-gated, not a frequency knob — left untouched, matching the
   architecture note "(a) mastered-content word still appears (spaced
   review is pedagogically required)". The one place mastered words enter
   the normal mix at full, undamped rate is **`masteredSample`**
   (`shuffled(withProgress.filter(isRealMastery)).slice(0, 2)`, line 368) —
   the "1-2 mastered words included for confidence" sample. This is also
   the mechanism that (already, today) reintroduces mastered CONTENT words
   from *below* the placement floor at full rate, since `masteredSample`
   draws from all of `withProgress`, not floor-filtered — confirming this
   run's damping fix, applied uniformly to `masteredSample` regardless of
   unit, directly satisfies "confirm the placement floor doesn't
   reintroduce already-mastered content words at full rate."

5. **Story comprehension — structured content ALREADY EXISTS, no STOP
   needed.** This is the biggest recon finding. `story_catalog`
   (migration 0030) has carried a `comprehension_question jsonb` column
   since it was created, and `scripts/seed-story-catalog.mjs` already
   seeded 20 catalog stories (Unit 1's 8 art words + 12 more animal words)
   each with a real, story-content-derived question — e.g. literally
   `{ question: 'What did the frog catch?', choices: ['a fly', 'a ball',
   'a leaf'], correctIndex: 0 }` for the frog story, matching the
   mission's own example almost verbatim. `src/lib/localStory.js`'s
   deterministic fallback (used when no catalog entry matches) also
   already produces a (much simpler, self-referential) comprehension
   question at tiers 2-3. `StoryReader.jsx` (shared by both "Story Time"
   and the separate freeform "Story Engine"/"New Story Friday") already
   *renders* `story.comprehensionQuestion` today — as plain text buttons,
   single-shot (no errorless scaffold, no retry). **The actual gap is
   narrower than "no comprehension check exists": it's (a) the choice UI
   isn't the same picture-tile+scaffold component the rest of the app
   uses, and (b) a wrong answer completes immediately instead of getting
   the standard errorless treatment.** Both are fixable via the existing
   `AnswerTile`/`WordArt` primitives (`src/games/lessonChrome.jsx`,
   `src/components/WordArt.jsx`) with zero schema change — confirmed no
   `supabase db push` is needed for this phase.
   - `WordArt` is confirmed safe to reuse for arbitrary (non-curriculum)
     choice strings: unregistered words fall through to a typographic
     candy-tile (`TypographicWord`), never emoji, never a broken image —
     so comprehension choices that aren't exact curriculum words (e.g.
     "in the park") still render a real picture-choice tile, just the
     typographic variant instead of a hand-illustrated one.
   - `StoryScreen.jsx` (the freeform Story Engine / "New Story Friday")
     never sets `comprehensionQuestion` on its story object (confirmed:
     its own code comment says so explicitly — "no comprehension question
     here"). So upgrading the shared `StoryReader.jsx` comprehension
     section only ever visually fires for Story Time — Story Engine
     behavior is provably unchanged (the question block simply never
     renders there, exactly as today).
   - **Logging is already wired.** `StoryTimeActivity.jsx`'s
     `StoryTimeReader` already calls
     `onAnswer({ correct, responseTimeMs, firstTry: true })` on
     `StoryReader`'s `onComplete`, which is `GameEngine.jsx`'s
     `handleAnswer` — the same `learning_events`-writing pipeline every
     other activity uses, keyed to the story's `targetWord`, under the
     existing `story_time` `game_type` (already an allowed value — this
     run introduces no new `game_type` and no new `product_events` type,
     so the CHECK-constraint/allowlist/positive-landing-test lesson from
     migrations 0035/0036 does not apply here — confirmed, not assumed).

### Local-dev testability constraint (confirmed, matches Package B/C precedent)

`playwright.config.js`'s `baseURL` is `http://localhost:5183` (local Vite
dev), which does not serve `/api/*` (Vercel serverless functions) —
documented repeatedly in this repo's own history
(`docs/PEDAGOGY_CALIBRATION_REPORT.md`). `api/session-generator.js` only
exports its top-level `handler`. Consequence for this run's test strategy:
- **Phases 2 & 3** (selection weighting) are pure server-side logic with no
  independently-reachable local test surface. Following the exact
  established pattern (`src/lib/sessionPlanFallbackUnit.js` +
  `tests/session-plan-fallback.spec.js`: extract pure, zero-import logic
  into `src/lib/`, test it directly with plain Node assertions, no
  Supabase/browser needed), this run extracts the two new weighting rules
  into `src/lib/blankEngineWeighting.js` and mirrors them into
  `api/session-generator.js` as literal constants, guarded by a new
  `scripts/check-blank-engine-weighting-sync.mjs` (same convention as
  `check-mastery-predicate-sync.mjs`), wired into `npm run build`. The
  server's actual live selection behavior is additionally confirmed in the
  production walk (Phase 6), same precedent as Package B.
- **Phase 4** (comprehension) is fully client-side (`StoryReader.jsx`,
  `useStoryCatalogQuery` hits Supabase directly via the client SDK, not
  `/api`) — genuinely testable locally via Playwright against local dev.

## CENSUS — the selection-weighting table

Every point in `api/session-generator.js` where word selection reads
unit-gating or mastery, before any code changed:

| Location | Current weighting | Intended weighting (this run) | Child-visible effect |
|---|---|---|---|
| `selectCandidateWords` line 294, `effectiveFloor = placementFloor ? min(placementFloor, maxUnit) : null` | Gates ALL words (content + function) below the floor out of new-session selection | Unchanged for content words. Function words get a separate, additive exemption path (see next row) | Content-word placement behavior byte-identical to before |
| `selectCandidateWords` line 327-328, `units = [...].filter(u => !effectiveFloor \|\| u >= effectiveFloor)` → drives `currentUnit` | Determines where NEW vocabulary starts; below-floor units (content or function) never become `currentUnit` | Unchanged — this is a content-progression axis, not touched | A high-placement child's *new* vocabulary still starts at their measured level |
| `selectCandidateWords` line 366, `currentUnitWords = withProgress.filter(unit===currentUnit && !isRealMastery)` | Only the (at-or-above-floor) current unit's unmastered words | Unchanged | No change |
| `selectCandidateWords` line 367, `dueForReview = withProgress.filter(dueForReview && unit!==currentUnit)` | Any previously-played word due for spaced review, **not floor-filtered today** (already reaches below-floor words, but only ones with prior play history) | Unchanged (architecture note (a): spaced review stays as-is) | No change |
| `selectCandidateWords` line 368, `masteredSample = shuffled(withProgress.filter(isRealMastery)).slice(0,2)` | Up to 2 random mastered words (content or function), **full rate**, not floor-filtered, not damped | **NEW**: filtered through `applyMasteredContentDamping` — function words always eligible (weight 1.0), content words pass at `MASTERED_CONTENT_INCLUSION_WEIGHT` (0.35) before the sample is drawn | A genuinely-mastered content word appears in the confidence sample roughly 35% as often as an equally-mastered function word or as it did before this run |
| `selectCandidateWords` (new, after line 368) | Below-floor function words (unmastered) have **no path** into the pool — never appear until the child's floor drops to their unit, which never happens | **NEW**: `eligibleBelowFloorFunctionWords` (function-type, `unit < effectiveFloor`, not mastered) sampled to `BELOW_FLOOR_FUNCTION_SAMPLE_SIZE` (1) and merged into the pool | A high-placement child now sees ~1 low-unit function word per session, always via the cloze/sentence quiz path (never picture-matching — confirmed no below-floor function word is ever `pictureEligible`) |
| `selectCandidateWords` line 286, `maxUnit = plan==='family' ? 18 : FREE_TIER_MAX_UNIT (5)` → gates the `allWords` query itself (`.lte('unit', maxUnit)`) | Free-tier accounts never load any word above unit 5 | Unchanged — confirmed this pre-existing gate is what makes premium-content leakage through the new exemption structurally impossible (nothing above `maxUnit` is ever in `withProgress` to begin with) | Free-tier accounts see no behavior change from this run (function words all live in units 11-18, already outside their reach — see STEP 0 finding 3) |
| `reviewOnly` branch, lines 336-364 (Quiz Boss) | Distinct pool: `attempt_count > 0` words only, due/lowest-mastery first | **Unchanged** — confirmed by code inspection: this run's new logic lives entirely after the `if (reviewOnly) { ... return ... }` early return | No change to Quiz Boss |
| `handleCheckin`/`handlePlacement` (lines 406-630) | Never call `selectCandidateWords` — independent rung/ladder logic over `allWords` directly | **Unchanged** — confirmed by construction (separate functions, no shared pool-building code) | No change to Placement Adventure or Star Check-In |

## FUNCTION-WORD UNIVERSALITY

**Exemption mechanic** (`api/session-generator.js`, `selectCandidateWords`):
after the existing `masteredSample` construction, a new
`belowFloorFunctionEligible` filter draws from `withProgress` (already
plan-capped to `maxUnit` at the query level) for `word_type === 'function'
&& unit < effectiveFloor && !isRealMastery(...)`, then samples down to
`BELOW_FLOOR_FUNCTION_SAMPLE_SIZE` (1) via the existing `shuffled()`
helper. Merged into the pool alongside `currentUnitWords`/`dueForReview`/
`masteredSample`, subject to the same `seen`-based de-dup. Constants
mirrored from the canonical `src/lib/blankEngineWeighting.js`, sync-checked
by `scripts/check-blank-engine-weighting-sync.mjs` (wired into `npm run
build`; passes — see VERIFICATION).

**Free-tier-content-leak proof**: `belowFloorFunctionEligible` only ever
reads from `withProgress`, which is built from `allWords`
(`api/session-generator.js` line ~298: `.lte('unit', maxUnit)`) — the plan
cap is applied at the query itself, *before* any floor/exemption logic
runs. There is no code path by which the exemption can add a word whose
`unit > maxUnit`. Confirmed live via STEP 0 recon: for a free-tier account
(`maxUnit = 5`), all 45 function words (units 11-18) are excluded from
`allWords` entirely regardless of this run's changes — the exemption is a
real, live behavior change only for family-plan accounts, whose `maxUnit`
(18) actually reaches the units where a placement floor could otherwise
skip function words. This is a genuine pre-existing free-tier gap
(function words are structurally unreachable below unit 11, entirely
outside this run's scope — see NOTES FOR WEEKLY_INSIGHTS), not a leak
introduced or left unaddressed by this change.

**Content-word gating unchanged**: `effectiveFloor`, the `units` filter
that derives `currentUnit`, `currentUnitWords`, and `dueForReview` are all
byte-identical to before this run — the exemption is purely additive (one
new filter + one new pool member), confirmed by diff.

## MASTERED-CONTENT DAMPING

**Verbatim weighting rule** (`src/lib/blankEngineWeighting.js`,
`applyMasteredContentDamping`, mirrored in
`api/session-generator.js`):

```
MASTERED_CONTENT_INCLUSION_WEIGHT = 0.35

masteredWords.filter(w =>
  w.word_type === 'function' || Math.random() < MASTERED_CONTENT_INCLUSION_WEIGHT
)
```

Applied to the existing `masteredSample` pool (the "1-2 mastered words for
confidence" mechanism) before its `shuffled().slice(0, 2)` draw. A mastered
FUNCTION word always passes (weight 1.0 — function words never recede,
consistent with gap 1's universality principle). A mastered CONTENT word
passes ~35% of the time per session it's considered — never excluded
outright (spaced review via `dueForReview` is untouched, so a mastered
content word due for review still appears on schedule regardless of this
filter), just damped in the "confidence sample" slot specifically. This is
a probabilistic, per-session filter (not a hard N-out-of-M cap), so it's
naturally verified statistically (across many sessions) rather than on any
single session — see VERIFICATION for the live before/after methodology.

**Placement-floor reintroduction check**: `masteredWords` is built from
`withProgress` (not floor-filtered — confirmed unchanged from before this
run), so a mastered CONTENT word from *below* the placement floor was
already reachable via `masteredSample` prior to this run, at full rate.
The damping filter above is applied uniformly to `masteredWords` regardless
of unit, so a below-floor mastered content word now receives the exact same
35% inclusion rate as an above-floor one — confirming the floor does not
reintroduce mastered content at full rate.

## STORY COMPREHENSION

**No STOP — structured content already exists** (see STEP 0 finding 5):
`story_catalog.comprehension_question` was seeded (mission A4,
`scripts/seed-story-catalog.mjs`) with 20 real, story-content-derived
questions before this run started (e.g. the frog story's "What did the
frog catch?" / choices `a fly, a ball, a leaf` / `correctIndex: 0` —
matching the mission's own worked example almost verbatim). `localStory.js`'s
deterministic fallback also already produces a (simpler) comprehension
question at tiers 2-3. No `supabase db push` needed — the column has existed
since migration 0030.

**How questions are built from story content**: unchanged — this run does
not touch question authorship or the data model, only the interaction/UI.
`findCatalogStory` (`src/lib/queries/storyCatalog.js`) already projects
`comprehension_question` into the `{ comprehensionQuestion }` shape
`StoryReader.jsx` reads.

**Data cleanup (in scope, not new authoring)**: two catalog stories (dog,
fish) plus two more found during implementation (pig, turtle) had
prepositional-phrase choices (`"in the park"`, `"on the sand"`) that would
overflow `WordArt`'s typographic-fallback SVG text (untested for
multi-word phrases — it's built for single vocabulary words). Trimmed to
bare nouns (`"park"`, `"sand"`) in `scripts/seed-story-catalog.mjs`,
re-run against production (idempotent upsert on `(target_word, tier)`,
verified all 20 rows re-seeded cleanly). The `ball` story's choices (`"the
dog"`, `"the cat"`, `"the bird"`) now strip to real curriculum words with
genuine hand-illustrated art via the same regex — a nice side effect, not
a separate change.

**Scaffold + tile reuse** (`src/components/candy/StoryReader.jsx`):
- Imports `AnswerTile` (`src/games/lessonChrome.jsx`) and `WordArt`
  (`src/components/WordArt.jsx`) — the exact same primitives WordMatch/
  WordHunt/RhymeTime already use. No new tile/question component built.
- `handleChoiceTap` now implements the identical wiggle+soften →
  hint-glow → second-miss-completes state machine as WordMatch's
  `handleTap` (`src/games/GameEngine.jsx` lines 214-246): first wrong tap
  sets `wrongTileIdx` (450ms wiggle+soften), then `revealCorrect=true`
  (persistent hint-glow on the correct tile — stays lit, not a timed
  pulse, so the cue is still visible the instant input re-enables, per the
  CLAUDE.md lesson from the original WordMatch scaffold work). Only a
  second miss lets the wrong answer complete.
- Scoring contract unchanged: `onComplete(isCorrect)` → StoryTimeReader's
  `onAnswer({ correct, responseTimeMs, firstTry: true })` — same call
  shape as before this run, same as WordMatch's own "byte-for-byte
  unchanged" precedent (docs/BLANK_ENGINE_REPORT.md's mission doesn't ask
  for a `firstTry:false` distinction, matching the established scope
  boundary from Phase 5b item 4 of the redesign work).
- `AnswerTile` internally gates all animation on `usePrefersReducedMotion`
  — inherited for free, confirmed by reading the primitive (STEP 0), not
  re-implemented.
- Choices that aren't exact curriculum words (e.g. category names like
  `"animals"`) fall through to `WordArt`'s typographic candy-tile
  (`TypographicWord`) — never emoji, never broken, confirmed by reading
  `WordArt.jsx`.
- `StoryScreen.jsx` (freeform Story Engine / "New Story Friday") never
  sets `comprehensionQuestion` — confirmed unchanged: the whole question
  block simply never renders there (`hasQuestion` is always false),
  exactly as before this run.

**Logging**: no new `game_type`, no new `product_events` type — confirmed
by inspection, so the CHECK-constraint/allowlist/positive-landing-test
lesson (migrations 0035/0036) does not apply. The existing
`story_time` → `handleAnswer` → `onProgress` → `learning_events` pipeline
is unchanged; only the interaction leading up to the single `onAnswer`
call changed.

## VERIFICATION

**Fixtures**:
- `tests/blank-engine-weighting.spec.js` — 10 plain Node assertions
  against the extracted pure functions in `src/lib/blankEngineWeighting.js`
  (no Supabase, no browser). Covers: below-floor unmastered function word
  is eligible; at/above-floor function word is not; CONTENT word below
  floor is never eligible (content-gating untouched); already-mastered
  below-floor function word is not eligible (already reachable via
  masteredSample); no floor → no candidates; the sample size constant is
  small/deliberate; mastered function words always pass damping; mastered
  content words pass only under the weight; the weight is never 0 or 1
  (never a hard exclusion, never undamped); and a 2000-draw statistical
  sanity check against real `Math.random` lands within ±0.08 of the
  configured 0.35 weight.
- `tests/blank-engine-comprehension.spec.js` — real end-to-end Playwright
  run against a provisioned test account
  (`nextgenprecisiondrones+mwblankcompr*`): seeds the guided path's first
  5 activities for "cat" (deliberately does NOT seed `word_progress` — see
  the fixture's own comment for why "cat," sort_order 1, is the natural
  `currentWord` with zero progress rows, and why the events must be
  stamped for that exact word to satisfy `useTodayWordActivityQuery`'s
  `.eq('word', word)` unlock gate — a real bug caught while building this
  fixture, not the app: an earlier version mastered units 1-2 like
  `story-time-chrome.spec.js`'s exit-only fixture does, which left Story
  Time locked/unclickable because the resulting `currentWord` (from unit 3)
  never matched the events' hardcoded word), plus a `user_stats` row
  (`total_xp: 2000`) so the child computes to level 12+ (tier 3), matching
  the "cat" catalog entry (tier 3 only). Drives real gameplay through to
  Story Time, reads the "cat" catalog story to its comprehension question,
  confirms picture tiles render (`<svg role="img" aria-label="ball">` /
  `"book"`, not plain text buttons), taps the wrong choice first (confirms
  the question does NOT complete — errorless retry), waits past the
  450ms wiggle→hint-glow transition, retries with the correct choice
  (confirms completion + "Great reading!"), then polls
  `learning_events` for the resulting `story_time` row and confirms
  `word: 'cat', correct: true`.
  - **Second real bug found and fixed while building this test, not the
    app**: `renderSentence()` (`StoryReader.jsx`) splits a sentence into
    one `<span>` per word (for tap-to-speak) with CSS `marginRight` for
    visual spacing only — no real space characters exist between the
    words in the DOM, so a `getByText('What did the cat play with?')`
    locator with literal spaces never matches. Fixed the TEST (not the
    component — the split-span structure is intentional, existing
    behavior for tap-to-speak) by detecting question-page arrival via a
    choice tile's label instead (`AnswerTile`'s text child is a single
    plain-string node, not word-split, so it matches reliably).
  - **Third real bug found and fixed while building this test, not the
    app**: `learning_events`' timestamp column is `recorded_at`, not
    `created_at` (confirmed by reading `questProgress.js`'s own comment) —
    an initial `select=...,created_at` silently returned a PostgREST error
    object instead of an array, surfacing as `events.length` being
    `undefined` rather than a clear failure. Fixed the test's own select
    clause.

**Tests vs. 75 baseline**: 75 (baseline) + 10
(`blank-engine-weighting.spec.js`) + 1 (`blank-engine-comprehension.spec.js`)
= **86**, confirmed via `npx playwright test --list` (see full-suite run
below).

Gates, idor-proof, and the preview + production walks continue in Phase 6.

## TRAPS
IN PROGRESS.

## NOTES FOR WEEKLY_INSIGHTS
IN PROGRESS.
