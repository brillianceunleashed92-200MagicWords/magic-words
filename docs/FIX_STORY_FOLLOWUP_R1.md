# 200 MAGIC WORDS — FIX_STORY_FOLLOWUP_R1: SERVE THE CATALOG + CLEAN TELEMETRY
**Written:** July 11, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/story-followup` (off current `main`)
Small, tightly-scoped follow-up to FIX_STORY_QUALITY_R1 (report: `docs/STORY_QUALITY_REPORT.md`, merged at `9115eb0`). Two changes, Sal-decided in chat. Nothing else.

## SUGGESTED /goal (paste into the CLI to launch)
> Execute docs/FIX_STORY_FOLLOWUP_R1.md end to end, committing the prompt doc as part of the run. Approval stops remain binding: pause and ask in chat before `git push origin main` and before `supabase db push` (no migration is expected — if one seems needed, STOP). Complete when docs/STORY_FOLLOWUP_REPORT.md is finished on `fix/story-followup` with: both changes applied and verified, a production walk on a fresh disposable account showing a brand-new child now receives "The Curious Cat" (or the tier-appropriate catalog story for their target word) verbatim from story_catalog, zero scaffold_down writes from any story path confirmed by query, full suite green at its true baseline + updated specs, gates green, FINAL STATUS self-certifying the docs push — and you've pasted FINAL STATUS into your output. Never touch the Aliya child or its parent account — fresh disposables only, cleaned up after. Stop after 60 turns.

## THE TWO CHANGES (Sal-approved, in scope — nothing else)

### 1. Exempt hand-authored catalog stories from the vocabulary gate
Sal's decision: the strict 200-word gate is correct paranoia for **AI-generated** text and stays there (`api/story-engine.js` exact-match validation is untouched). It was over-applied to curated content: catalog stories using richer read-aloud vocabulary ("yard", "paw", "nap") with the target word highlighted are words-in-meaningful-context — the methodology, not a violation.
- In `StoryScreen.jsx`: when the quality-floor routing selects a catalog story, serve it **without** passing it through `catalogStoryIsVocabSafe`. Remove the gate from the catalog path (delete or bypass — keep the code only if the generated path still uses it; if nothing uses it after this change, delete it and its imports).
- The vocab-safe template (`buildVocabSafeFallback`) remains the fallback ONLY when no catalog story exists for the target word at any tier.
- Do NOT edit any `story_catalog` row content.

### 2. Replace the scaffold_down telemetry reuse
The FIX_STORY_QUALITY_R1 fallback telemetry wrote `scaffold_down` product_events from story paths — that pollutes a pedagogically meaningful signal WEEKLY_INSIGHTS will cluster on.
- Remove the `scaffold_down` write(s) added by `9115eb0` in `src/lib/queries/stories.js` (and anywhere else that run added them — check the `aadf863` diff).
- Replace with a `console.warn` carrying the same context (path taken, pool size, target word), plus a code comment: `// TODO(migration 0037): add 'story_fallback' to product_events CHECK constraint, then log properly`.
- Do NOT add a new event type or touch the CHECK constraint — that's a migration, out of scope.

## GUARDRAILS
- No changes beyond the two above. `api/story-engine.js`, `story_catalog` content, quality-floor constant, session-generator: all untouched.
- Reproduce-first still applies in miniature: before changing anything, confirm on current `main` (code inspection + the existing spec) exactly where the gate and the telemetry writes live, and list them in the report.
- Update the specs from FIX_STORY_QUALITY_R1 (`story-quality.spec.js`) to match the new expectation: below-floor child + catalog story exists → catalog story served verbatim; below-floor child + no catalog story → vocab-safe template; generated-path validation still exact-match (unchanged assertion).
- `vite preview` serves no `/api/*`; the production walk is the authoritative check for the end-to-end path.

## PHASES
0. Report at STEP 0 with RUN TIMING on `fix/story-followup` off current `main`; fresh full-suite baseline count; locate both change sites with file:line.
1. Apply change 1 + update specs. Apply change 2.
2. Gates: build, no-emoji, wordart-sync, Playwright `workers:1` (full suite). idor-proof not expected (no ownership path) — state the determination.
3. Merge `--no-ff` → **approval** → push → deployment check (commit-status + `vercel list`) → production walk: fresh account, placement to Unit 1, open the story — confirm "The Curious Cat" sentences served verbatim, and confirm via query zero new `scaffold_down` rows were written during the walk. Cleanup → docs push, self-certified.

## REPORT (docs/STORY_FOLLOWUP_REPORT.md)
### SUMMARY · RUN TIMING + baseline · CHANGE SITES (file:line, before/after) · VERIFICATION (gates, specs, production walk with the served sentences quoted, scaffold_down query result) · LOGGED FOR LATER (carry forward: migration 0037 story_fallback event type; catalog-coverage audit of all 20 rows; parent-surface blindness; placement copy/floor) · TRAPS
