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
IN PROGRESS — see Phase 1 below.

## FUNCTION-WORD UNIVERSALITY
IN PROGRESS.

## MASTERED-CONTENT DAMPING
IN PROGRESS.

## STORY COMPREHENSION
IN PROGRESS.

## VERIFICATION
IN PROGRESS.

## TRAPS
IN PROGRESS.

## NOTES FOR WEEKLY_INSIGHTS
IN PROGRESS.
