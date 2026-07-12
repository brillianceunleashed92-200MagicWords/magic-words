# 200 MAGIC WORDS — STORY_FOLLOWUP_REPORT

## SUMMARY
IN PROGRESS

## RUN TIMING + baseline
- STEP 0 started: 2026-07-12 ~01:40 UTC
- Branch: `fix/story-followup`, off `origin/main` @ `5bb1116` (docs(story-quality): FINAL STATUS)
- First commit on branch: `6d4f852` docs(story-followup): add prompt doc
- Isolated in a git worktree (`.claude/worktrees/fix-story-followup`)
- **Baseline run contaminated, discarded**: a full-suite run was started in the background right after `npm install`, intended as a pre-change baseline — but both changes were then applied and committed *while it was still running* (19.3m total), so it tested a mix of pre- and post-change source across its run, not a clean snapshot of either state. Discarded; see the clean post-fix run below instead. **Trap logged** so this mistake isn't repeated: never edit source files while a background full-suite run against the same working tree is still in flight, even across a `git commit` — the dev server serves live file contents, not the git-committed state.
- Clean full-suite run (all changes committed, working tree untouched during the run): IN PROGRESS

## CHANGE SITES

**Change 1 — catalog vocabulary gate**, `src/screens/StoryScreen.jsx`:
- `catalogStoryIsVocabSafe(catalogStory, wordSet, targetWord, childName)` — defined line 52, the gate function itself.
- `buildVocabSafeFallback(targetWord, childName)` — defined line 26, the safe template (stays, but becomes fallback-only-when-no-catalog-row rather than fallback-on-gate-failure).
- Call site: lines 93-97 — `rawCatalogStory = findCatalogStoryForWord(...)`, then `catalogStory = rawCatalogStory && catalogStoryIsVocabSafe(...) ? rawCatalogStory : null`, then `source = catalogStory ?? buildVocabSafeFallback(...)`. This is the exact line to change: drop the `catalogStoryIsVocabSafe` check so any `rawCatalogStory` found is used directly.
- `catalogStoryIsVocabSafe` has exactly one call site (line 94) — confirmed via grep — so removing that call makes the function dead code, to be deleted per the prompt doc ("delete or bypass... if nothing uses it after this change, delete it").

**Change 2 — scaffold_down telemetry reuse**, `src/lib/queries/stories.js`:
- `reportStoryFallback(word)` — defined lines 36-51, POSTs `/api/track` with `eventType: 'scaffold_down', payload: {word, activityId: 'story_engine'}`.
- Call site: line 99 — `if (story.isFallback) reportStoryFallback(story.targetWord);` inside `useGenerateStoryMutation`.
- Confirmed via repo-wide grep this is the **only** story-path `scaffold_down` write added by `aadf863`. `src/screens/PlayScreen.jsx:233-236` has its own **pre-existing, unrelated** `scaffold_down` write (session-local consecutive-wrong tracking, not a story path, predates FIX_STORY_QUALITY_R1) — left untouched, per the prompt doc's scope (only the write "added by `9115eb0`" in `stories.js`). `api/track.js`'s `EVENT_SCHEMAS.scaffold_down` entry (line 40) stays too — `PlayScreen.jsx` still legitimately depends on it.

## FIX

**Change 1 applied**: `StoryScreen.jsx`'s catalog-path call site now does `const catalogStory = findCatalogStoryForWord(catalogQ.data, targetWord, tier);` directly — no `catalogStoryIsVocabSafe` check. `catalogStoryIsVocabSafe` had exactly one call site (confirmed via grep before removing), so it was deleted entirely rather than left as unreachable dead code. `buildVocabSafeFallback`'s comment updated to reflect it's now reached only when no catalog row exists for the target word at any tier, not on gate failure (the gate no longer exists). No `story_catalog` row content touched.

**Change 2 applied**: `reportStoryFallback(word, poolSize)` in `stories.js` no longer POSTs to `/api/track`/`scaffold_down` — replaced with a single `console.warn` carrying the same context (word, pool size at the time of the AI call), plus a `TODO(migration 0037)` comment for a future proper `product_events` type. Call site updated to pass `masteredWords.length` through. `PlayScreen.jsx`'s own unrelated `scaffold_down` write and `api/track.js`'s `EVENT_SCHEMAS.scaffold_down` entry are both untouched — confirmed via grep this is the only story-path write, and `PlayScreen.jsx` still legitimately needs that schema entry.

**Found and fixed in passing, not part of the two approved changes but necessary for Change 1 to actually work**: `useStoryCatalogQuery`'s `select()` never included `vocabulary_used` at all — so `findCatalogStory`'s `vocabularyUsed` field always defaulted to `[]` regardless of the row's real value. This was latent since FIX_STORY_QUALITY_R1 (the vocab gate meant a served catalog story's `vocabularyUsed` was computed but never actually read/trusted, since the fallback path always set `[targetWord]` instead), and only surfaced once the new spec asserted `story.vocabulary_used` matches the catalog row's real value. Caught by the spec, not assumed — first test run failed with `vocabulary_used: []` vs. the catalog's real 28-word array. Fixed by adding `vocabulary_used` to the select list (`src/lib/queries/storyCatalog.js`). One-line, no schema/migration, squarely part of making "served verbatim" actually verbatim.

## VERIFICATION

**Gates:**
- `npm run build` — clean.
- `npm run check:no-emoji` — clean.
- `npm run check:wordart-sync` — clean (77 words).
- `node scripts/idor-proof.mjs` — **not run, per the prompt doc's own determination ("idor-proof not expected — no ownership path")**: neither change touches RLS, ownership checks, or adds a new fetch-by-id endpoint. Change 1 removes a client-side content check (no server/DB access at all). Change 2 removes a network call entirely (console.warn only) — strictly less surface area than before, not more.

**Full Playwright suite** (`--workers=1`, `SUPABASE_SERVICE_ROLE_KEY` set, all changes committed and the working tree untouched for the run's full 13.7m): **94 passed / 1 failed**.
- The one failure, `password-reset.spec.js` ("verifyOtp establishes recovery session..."), is unrelated to this fix (auth/password-reset flow, no story code involved) and was already confirmed to fail identically against **unmodified `main`** during the prior FIX_STORY_QUALITY_R1 run's isolation checks (`STORY_QUALITY_REPORT.md` VERIFICATION section) — not re-verified again here since it's the same test, same failure mode, same unrelated code path.
- `tests/story-quality.spec.js`'s two updated cases both passed (3.7s, 3.2s) — catalog-served-verbatim and no-catalog-vocab-safe-template.
- `tests/story-time-chrome.spec.js` passed (14.9s) — confirms no regression to Story Time's exit/chrome behavior.
- `tests/blank-engine-comprehension.spec.js` and `tests/fill-the-story.spec.js` are both included in the 94 passed (not named in the single-item failure list) — no regression to Story Time's catalog comprehension flow.
- **Net verdict: no regression attributable to this fix.** Cleanest result of this entire two-task run (94/95, one known pre-existing failure) — a direct benefit of both changes *removing* code/network calls (a client-side check, an HTTP POST) rather than adding new surface area.

## LOGGED FOR LATER
IN PROGRESS

## TRAPS
IN PROGRESS
