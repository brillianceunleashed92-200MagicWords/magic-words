# 200 MAGIC WORDS — STORY_FOLLOWUP_REPORT

## SUMMARY
Tightly-scoped follow-up to FIX_STORY_QUALITY_R1, two Sal-approved changes. (1) Removed the vocabulary gate on the freeform Story Engine's catalog path — curated content's richer read-aloud vocabulary (e.g. "The Curious Cat"'s "yard", "paw", "nap") is the methodology, not a violation; AI-generated text still validates exactly in `api/story-engine.js`, untouched. (2) Replaced the `scaffold_down` product_events reuse (added by the prior fix) with a plain `console.warn` — that write was polluting a pedagogically meaningful signal WEEKLY_INSIGHTS clusters on.

Found and fixed in passing (necessary for change 1 to actually work, not scope creep): `useStoryCatalogQuery`'s select never fetched `vocabulary_used`, so a served catalog story's `vocabulary_used` always persisted as `[]` — latent since the prior fix, only surfaced once the new spec asserted verbatim serving.

Verified: change sites located by code inspection first (reproduce-first in miniature), both changes applied, updated `tests/story-quality.spec.js` split into two cases (catalog-covered word → served verbatim; uncovered word → vocab-safe template), full suite green (94/95, the one failure pre-existing/unrelated), gates green, merged and pushed to `main` (approved), deployed, and confirmed live on a fresh production account: a brand-new child targeting "cat" now receives **"The Curious Cat"** verbatim from `story_catalog`, and `scaffold_down` write counts are confirmed unchanged (16 before, 16 after; zero for the test child) via direct query.

## RUN TIMING + baseline
- STEP 0 started: 2026-07-12 ~01:40 UTC
- Branch: `fix/story-followup`, off `origin/main` @ `5bb1116` (docs(story-quality): FINAL STATUS)
- First commit on branch: `6d4f852` docs(story-followup): add prompt doc
- Isolated in a git worktree (`.claude/worktrees/fix-story-followup`)
- **Baseline run contaminated, discarded**: a full-suite run was started in the background right after `npm install`, intended as a pre-change baseline — but both changes were then applied and committed *while it was still running* (19.3m total), so it tested a mix of pre- and post-change source across its run, not a clean snapshot of either state. Discarded; see the clean post-fix run below instead. **Trap logged** so this mistake isn't repeated: never edit source files while a background full-suite run against the same working tree is still in flight, even across a `git commit` — the dev server serves live file contents, not the git-committed state.
- Clean full-suite run (all changes committed, working tree untouched during the run): 94 passed / 1 failed (pre-existing, unrelated) — see VERIFICATION.

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

**Merge, push, deployment:**
- Merged `fix/story-followup` → `main` locally, `--no-ff` (`eac7a0b`), after gates re-verified green on the merged tree.
- **Approval requested and given** before `git push origin main` — pushed `5bb1116..eac7a0b`.
- Deployment check: `gh api .../commits/eac7a0b/status` — `pending` → **`success`**; cross-checked with `vercel inspect` on the latest deployment showing `status ● Ready`.
- No `supabase db push` — no migration in this fix, matching the prompt doc's expectation.

**Production walk (fresh disposable account, post-deploy):**
- `nextgenprecisiondrones+storyfollowup1783874408090@gmail.com` (auth user `45ac6d9c-4408-4251-b016-f8359c69d263`), child "FollowupKid," "brand-new reader" placement path, Unit 1 / target word "cat" / "New Story Friday!" on first Home render — identical setup to both prior runs.
- **`scaffold_down` count queried before the walk: 16.** Clicked the card — the reader's cover page showed **"The Curious Cat"** immediately (screenshot-confirmed), matching the catalog title exactly, not the vocab-safe fallback's `"The cat"` format.
- Resulting `stories` row (queried directly) matches the `story_catalog` "cat" row **verbatim**, including the previously-broken `vocabulary_used` field (now the real 28-word array, not `[]`):
  ```
  title: "The Curious Cat"
  body: ["This is a cat.", "The cat is small and orange.", "The cat likes to play.",
         "It jumps and runs in the yard.", "The cat sees a red ball.",
         "It rolls the ball with its paw.", "The cat is happy and tired.",
         "Now the cat takes a nap."]
  target_word: "cat"
  vocabulary_used: [28 words incl. "likes","jumps","runs","yard","sees","rolls","its","paw","tired","takes","nap"]
  audio_url: null
  ```
- Read the story live in the app (screenshot-confirmed): "This is a [cat]." with target word highlighted, "Page 1 of 8" (the full 8-sentence catalog story, not the 6-sentence vocab-safe template), no comprehension question shown (Story Engine invariant preserved).
- **`scaffold_down` count queried after the walk: 16 — unchanged.** Also confirmed directly: zero `scaffold_down` rows exist for this test child specifically (`child_id` filter, count 0). Zero new writes from this story path, as intended.
- Cleaned up: cleared local browser session storage, deleted the test account via `scripts/admin-user.mjs delete`. The Aliya account was never touched (no interaction with it this run at all).

## LOGGED FOR LATER
- Carried forward from FIX_STORY_QUALITY_R1 (unchanged, not touched by this follow-up): migration 0037 (`story_fallback` product_events type) is now a real TODO in code (`stories.js`'s `reportStoryFallback` comment) rather than just a report note — whoever picks this up should add the migration, then swap the `console.warn` for a real `logProductEvent`-style write.
- Carried forward: catalog-coverage audit of all 20 `story_catalog` rows' actual word-by-word vocabulary against `words` (started informally here for "cat" only — 28 words, 11 outside the 200-word list — the other 19 rows likely follow a similar pattern given the same authored-prose style, but not individually checked this run).
- Carried forward, untouched: parent-surface blindness to placement/story events, placement "3-5 minutes" copy/two-miss floor/CSP blob errors.

## TRAPS
- **Never edit source files while a background full-suite Playwright run against the same working tree is still executing — even across a `git commit`.** The dev server serves live file contents from disk, not the git-committed snapshot; committing doesn't protect an in-flight test run from seeing your edits mid-run. Caught here: a run started as an intended "baseline" ended up testing a contaminated mix of pre- and post-change code because both changes were applied and committed while it was still going (19.3m). Discarded and re-run cleanly afterward with the working tree fully settled. Always wait for a background suite run to actually finish (via its completion notification) before touching any file it might read.
- **A gate function can silently break "verbatim" if the query feeding it is incomplete.** `findCatalogStory` computed a `vocabularyUsed` field correctly, but the `useStoryCatalogQuery` select statement never fetched the underlying column — a bug that stayed invisible for an entire prior task (FIX_STORY_QUALITY_R1) because the vocab gate's fallback path never touched that field. Removing the gate immediately exposed it. Lesson: when a change makes a previously-unreached code path reachable, re-verify that path's *entire* data flow, not just the new logic — don't assume a field "already worked" just because it was defined correctly somewhere upstream.
- **Test fixtures can pick their target word via `placement_unit` alone, no `word_progress` seeding needed**, when `currentWord`'s derivation is floor-based (`placementFloor = min(placement_unit, planCap)`, scans from there). Used this to build two below-floor fixtures with completely different target words (unit 1 → "cat", catalog-covered; unit 3 → "eat", not) without ever touching `word_progress` — simpler and more direct than seeding fake mastery rows.

## FINAL STATUS
**Self-certified DONE.** `docs/STORY_FOLLOWUP_REPORT.md` complete on `fix/story-followup`, merged `--no-ff` into `main` (`eac7a0b`), pushed to `origin/main` with explicit approval, deployed (Vercel `success`/`Ready`), and confirmed live: a fresh production account with the exact incident setup (Unit 1, target word "cat") now receives **"The Curious Cat" verbatim** from `story_catalog` — title, all 8 sentences, and `vocabulary_used` (28 words) exact matches, confirmed by direct DB query and by reading the story live in the app. `scaffold_down` product_events writes confirmed unchanged by the story path via direct query (16 before, 16 after the walk; 0 for the test child). Full Playwright suite 94/95 (one pre-existing, unrelated failure). Gates green (build, no-emoji, wordart-sync); `idor-proof` correctly determined not applicable (no ownership/RLS path touched, if anything less surface area than before). One real bug found and fixed in passing (`vocabulary_used` never selected) was necessary for change 1 to actually deliver verbatim serving, not scope creep. No `supabase db push` — no migration in this fix. Test account created and cleaned up; the Aliya account was never touched.
