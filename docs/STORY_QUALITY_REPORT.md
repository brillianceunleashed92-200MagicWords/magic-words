# 200 MAGIC WORDS — STORY_QUALITY_REPORT

## SUMMARY
IN PROGRESS

## RUN TIMING + suite baseline
- STEP 0 started: 2026-07-11 ~23:46 UTC
- Branch: `fix/story-quality`, off `origin/main` @ `d9408d4` (docs(activity-load-perf): FINAL STATUS — merged, deployed, verified live)
- First commit on branch: `8a8be61` docs(story-quality): add prompt doc
- Isolated in a git worktree (`.claude/worktrees/fix-story-quality`) so this run never touches `feat/quick-wins`'s in-progress uncommitted work on the primary checkout.
- Full-suite baseline (`npx playwright test --workers=1`, local vite dev server, no `/api/*` served): **14 failed / 43 skipped / 36 passed** (93 total, 3.6m). The 14 failures are pre-existing environment artifacts of running against local dev with no API routes and no real hCaptcha/Google OAuth wiring (landing page, signup, hCaptcha, not-found-route, session-plan-cache — none touch story code). This is the baseline any post-fix diff is measured against, not a target to fully green.

## RECON — the story pipeline map

### A) Entry points — no shared decision point between the two surfaces
- **Freeform Story Engine** ("New Story Friday"): `src/screens/HomeScreen.jsx:147-168`, gated only by `storyDue` = `isNewStoryDue(storiesQ.data)` (`src/lib/queries/stories.js:25-30`). A brand-new child has zero `stories` rows, so `stories?.length` is falsy and `isNewStoryDue` returns `true` on the very first Home render — no 6-day wait applies to a child who has never had a story. Click → `CandyGalaxyShell.jsx:152-154` renders `<StoryScreen>`.
- **Story Time**: reached only via the guided-path activity picker (`src/lib/activityDefs.js:26`, rank 6, eligible for effectively every word) → `GameEngine.jsx:1337-1338` → `<StoryTimeActivity>`.
- No cross-link either direction — `StoryScreen.jsx` never imports `storyCatalog.js`; there is no "story pool too small, go do Story Time instead" branch anywhere.

### B) Generation path (freeform Story Engine)
- Client mount effect: `src/screens/StoryScreen.jsx:29-41`. Pool = `words.filter(isRealMastery).map(w => w.word)` (line 31) → POST `/api/story-engine` via `useGenerateStoryMutation` (`src/lib/queries/stories.js:35-71`) → inserts the raw response straight into `stories` (lines 52-62). No catalog lookup anywhere in this path.
- AI call: `api/story-engine.js:147-156` (`claude-sonnet-4-6`), prompt built at `api/story-engine.js:129-145`.
- Deterministic fallback triggers: (1) `api/story-engine.js:205-211` — no `ANTHROPIC_API_KEY` at all → `localFallbackStory()` immediately; (2) `api/story-engine.js:239-246` — `MAX_ATTEMPTS=3` (line 174) failed *validation* attempts → same fallback. **Neither fired for the reported incident** — see Root Cause.
- `vocabulary_used` construction: client pool (`StoryScreen.jsx:31`) → server `allowedWords = [...new Set([...masteredWords, targetWord])]` (`api/story-engine.js:199`) → persisted verbatim as `vocabulary_used` (`stories.js:59`). With `masteredWords = []`, `allowedWords = ["cat"]` — pool size 1, exactly matching the reported row.
- **Pluralization source**: `stripsToAllowed()` (`api/story-engine.js:80-89`) treats any token ending in `s/es/ed/ing/'s/d` as valid if the base form is in the allowed set — `"cats"` strips to `"cat"` ∈ `{"cat"}` → accepted. The prompt itself instructs this (`api/story-engine.js:137,132`: "...or a simple form of one of these words (add s/es/ed/ing)"). This is a documented, intentional "allowed inflections" rule (comment at `api/story-engine.js:76-79`, attributed to "the master prompt") — but it lets validation pass content containing a word ("cats") that is not literally one of the 200 curriculum words, which is the methodology violation flagged in the bug report.

### C) Catalog path
- `useStoryCatalogQuery()` (`src/lib/queries/storyCatalog.js:11-23`) fetches the whole `story_catalog` table once (1hr staleTime). `findCatalogStory(catalog, word, tier)` (lines 29-39) does an exact `(target_word, tier)` match.
- Only call site: `src/games/StoryTimeActivity.jsx:37` — `findCatalogStory(catalog, quiz.word, tier) ?? buildLocalStory(quiz, levelInfo?.level)`.
- **No existing logic anywhere prefers/routes to the catalog based on a sparse vocabulary pool.** Catalog is reachable exclusively through Story Time; the freeform engine has no fallback-to-catalog branch, only its own local template fallback (part B).
- **Production data check** (read query against `story_catalog`, 2026-07-11): **all 20 rows are `tier = 3`** — zero tier-1 or tier-2 rows exist yet, despite the schema (`0030_story_catalog.sql:17`) supporting 1/2/3 and the table being designed for "one entry per (word, tier)". This matters for the fix: an exact-tier catalog lookup for a level-1 child (tier 1, per `getStoryTier` below) would *never* match anything today, catalog or not — the lookup must not be tier-exact-only or it's dead code. `"cat"` (`"The Curious Cat"`, 8 sentences, comprehension question, 28-word vocab) is one of the 20 seeded rows — this is the exact story that sat unused during the incident.

### D) "Known words" predicate
- `isRealMastery(mastery, attemptCount)` (`src/lib/masteryCalibration.js:20-22`): `mastery >= 80 && attemptCount >= 3` (`MASTERED_THRESHOLD = 80`, `MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION = 3`, lines 17-18). Deliberate design (comment lines 9-16): a single correct answer computes to 100% mastery under the cumulative formula, so a minimum attempt count stops "one tap = mastery."
- Applied to `word_progress` rows (`src/lib/queries/wordProgress.js:8-21`) left-joined onto the static `words` table in `useCandyGalaxyData.js:46-66`; no `word_progress` row defaults to `mastery: 0, attemptCount: 0`.
- **Why pool size was exactly 1 for this child**: a just-placed child has zero (or near-zero) `word_progress` rows with `attemptCount >= 3`, so `words.filter(isRealMastery)` (`StoryScreen.jsx:31`) evaluates to `[]`. `currentWord` (`useCandyGalaxyData.js:99-102`) resolves to the first not-yet-mastered word at/above the child's placement floor — for a child placed at Unit 1, that's `"cat"`. `allowedWords = [...new Set([...[], "cat"])] = ["cat"]`. This is **expected behavior of the current predicate for any brand-new account** — not a bug in the predicate itself, but it means pool-size-1 is the *normal*, common case for every new child, not an edge case.
- `audio_url: null` is consistent too: `useGenerateStoryMutation`'s insert (`stories.js:52-61`) never sets `audio_url` — no TTS step exists in this path at all, fallback or not.

## REPRODUCTION
Fresh disposable account (`nextgenprecisiondrones+storyqual1783814137984@gmail.com`, auth user `877ecd5a-d0c0-425d-ac38-1e8cebddbee9`, created via `scripts/admin-user.mjs create storyqual`) walked on **production** (`https://200magicwordsapp.com/app`, live `main`) exactly as a real new user would: signed in fresh (an existing Claude-Chrome session was logged in as **Aliya** — Sal's manual test account named in the guardrails; cleared local/session storage only, a purely client-side action, to sign out without touching any Aliya server data, then signed in as the new test account), created child "StoryQualTest" (interest: Animals), chose "Brand-new reader — start at the beginning" at the placement-mode prompt. Landed on Home exactly matching the incident: Unit 1, target word "cat", **"New Story Friday!" card already showing** on the very first Home render (child `158e6175-bae7-4b6b-934f-9fbf063430a0`, zero `word_progress` rows).

Clicked the card. Captured via `read_network_requests` + a live Vercel log pull (`vercel logs 200magicwordsapp.com --since 5m --json`) for the exact request:
- `POST https://200magicwordsapp.com/api/story-engine` → `200`.
- **Server-side attempt log (ground truth for what the AI call actually did):**
  ```
  [story-engine] attempt 1/3 — passed=false rejected=see,the,sees,a
  [story-engine] attempt 2/3 — passed=true
  ```
- Resulting `stories` row (`id 6df8fec1-a2da-4f06-a4a1-622bd48363d1`, queried directly from `public.stories`):
  ```
  title: "StoryQualTest and cats"
  body: ["StoryQualTest cats.", "cats cats cats.", "StoryQualTest cat.", "cat cat.",
         "cats StoryQualTest.", "StoryQualTest cats cats.", "cat cats StoryQualTest.",
         "StoryQualTest cat cats."]
  target_word: "cat"
  vocabulary_used: ["cat"]
  audio_url: null
  ```

**Reproduces cleanly** — same shape as the original incident (bare permutations, out-of-list "cats", `vocabulary_used` pool of 1, `audio_url: null`), if anything more degenerate ("cats cats cats.").

**What the logs prove, plainly**: the AI call did **not** fail and did **not** silently fall back. Attempt 1 tried to write ordinary sentences ("I see the cat", "The cat sees...") using common function words ("see", "the", "sees", "a") that are outside the 1-word allowed set `{"cat"}` and got rejected by `validateStory`. Attempt 2, now told (via `retryNote`, `api/story-engine.js:131-133`) exactly which words were rejected, produced a story using *only* "cat"/"cats"/the child's name — which **passed validation legitimately under the current rules** (the `stripsToAllowed` inflection allowance lets "cats" count as valid). This is not a failure path at all; it's the success path, operating correctly against an artificially starved 1-word pool. Test account and child cleaned up after evidence capture (see VERIFICATION).

## ROOT CAUSE + ROUTING VERDICT
IN PROGRESS

## FIX
IN PROGRESS

## VERIFICATION
IN PROGRESS

## LOGGED FOR LATER
IN PROGRESS

## TRAPS
IN PROGRESS
