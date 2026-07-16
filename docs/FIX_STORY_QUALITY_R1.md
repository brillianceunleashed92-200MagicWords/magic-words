# 200 MAGIC WORDS — FIX_STORY_QUALITY_R1: DEGENERATE STORY FOR NEW ACCOUNTS
**Written:** July 11, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/story-quality` (off current `main`)
Diagnose-first quality run. **Single focus: a brand-new child received a degenerate generated story ("Aliya cats. Cat cat.") while a hand-authored catalog story for the same word sat unused.** Reproduce it, pin the exact generator path with evidence, answer the routing question from the code, then fix. Log any other issue you notice; do not fix it.

## SUGGESTED /goal (paste into the CLI to launch)
> Execute docs/FIX_STORY_QUALITY_R1.md end to end, committing the prompt doc as part of the run. Permissions are bypassed at the CLI level, but these approval stops remain binding: pause and ask in chat before `git push origin main`, before `supabase db push`, and before ANY change to story content-generation rules beyond the quality floor and routing fix defined in the doc (rewriting the AI story prompt's pedagogy, changing catalog story content, or altering which vocabulary counts as "known" are pedagogy, not bug-fix — STOP and present). Complete when EITHER (a) docs/STORY_QUALITY_REPORT.md is finished on `fix/story-quality` with: a reproduction of the degenerate story on a fresh account against production with captured evidence of which generator path ran and why, the routing question answered from code (was the Story Engine the intended surface for this child, or should Story Time / the catalog have served), the fix applied and proven (a fresh new account now receives a real story — catalog or valid generation — never a degenerate one, never out-of-list vocabulary), the full suite green at its true current baseline + any new specs, gates green, production walk on a fresh account confirming the fixed behavior live, FINAL STATUS self-certifying the docs push — and you've pasted FINAL STATUS into your output; OR (b) a documented STOP: diagnosis complete but the correct fix requires a content/pedagogy rule change needing Sal's approval, pasted into your output. A documented STOP after diagnosis is valid completion. Do not change content rules beyond the defined floor, do not push main, without approval. Never touch the existing `Aliya` child or its parent account — provision fresh disposables only. Stop after 100 turns.

## MISSION
On July 11 (~23:23 UTC), a brand-new child profile (placed at Unit 1 minutes earlier) received this from the Story Engine — stored in `stories`:

```
id: 6a63ad1e-648e-454a-8f38-4f66fcb7b2aa
title: "Aliya Cat"
body: ["Aliya cat.", "Cat cat.", "Aliya cats.", "Cat Aliya.", "Cats cats.",
       "Aliya cat cat.", "Cat cats Aliya.", "Aliya cats cats."]
target_word: "cat"
vocabulary_used: ["cat"]
audio_url: null
```

Meanwhile `story_catalog` has a hand-authored `cat` story ("The Curious Cat", tier 3, 8 real sentences, comprehension question, 28-word vocabulary) that was never served. Find out exactly why the child got the degenerate story — with reproduced evidence, not inference from the row above — then fix it so no new account can ever receive non-language as their first story.

## PRIOR EVIDENCE (from chat triage — verify, don't trust)
- `vocabulary_used: ["cat"]` → the generator ran with a 1-word pool (new account, near-zero known words).
- Output pattern (bare permutations, out-of-list plural "cats", `audio_url: null`) suggests the **deterministic fallback** (`localStory.js` or equivalent) rather than the Claude generation path — hypothesis: the AI call failed silently or was never invoked, and the fallback has no minimum-quality floor. **This is a hypothesis to confirm or refute in Phase 1, not a finding.**
- "cats" is not one of the 200 words — wherever pluralization happens is itself a methodology violation (whole words tied to meaning; never introduce untaught forms).
- Known feature split (from BLANK_ENGINE_REPORT recon): **Story Time** (`StoryTimeActivity` → `story_catalog`, has comprehension questions) and the **freeform Story Engine** (`StoryScreen.jsx`, writes to `stories`, explicitly no comprehension question) are separate by design. The open question: for a brand-new child, was routing into the freeform engine *correct per current logic* (making this a generation-quality bug) or *incorrect* (a routing bug) — or both.

## GUARDRAILS (locked)
- **No phonics, ever** — nothing in any fix may sound out, blend, or decompose words.
- **Fix scope = quality floor + routing + failure surfacing.** In scope: a minimum-known-vocabulary floor below which the freeform engine serves/redirects to catalog content instead of generating; eliminating out-of-list vocabulary (no pluralizing/inflecting outside the 200 words); making a failed AI generation visible (log/telemetry) instead of silently falling back; correcting routing if the code shows the catalog path should have served. **Out of scope without a STOP:** rewriting the AI story prompt's pedagogy, editing catalog story content, changing the definition of "known word", touching `api/session-generator.js` selection logic, or adding comprehension questions to freeform stories.
- **Never touch the existing Aliya child/account** (Sal's manual test) — do not delete, modify, or reuse it. Do not delete the degenerate `stories` row; it's evidence. Fresh disposables only, `nextgenprecisiondrones+*` prefix, `parental_consent` metadata, cleaned up after.
- **Reproduce before fixing** — the fix ships only after Phase 1 demonstrates the failure on a fresh account with captured evidence of the code path. If it does NOT reproduce, that is itself a finding: document it, investigate what differed, and STOP for triage discussion rather than fixing blind.
- **Measure against a real deployment** — `vite preview` serves no `/api/*`; anything touching a story-generation endpoint needs the live prod deploy or a SHA-matched preview. Client-only paths (if the fallback runs client-side) can be exercised locally, but say so explicitly next to the evidence.
- Log-don't-fix everything else seen along the way (parent-surface blindness to placement/story events, placement "3-5 minutes" copy, two-miss floor, CSP blob errors — all already logged in chat).

## PHASE 0 — REPORT + RECON
Open `docs/STORY_QUALITY_REPORT.md` at STEP 0 with RUN TIMING, first commit on `fix/story-quality` off current `main`; print a fresh full-suite baseline count. Recon the complete story pipeline in code, with file:line citations:
- Entry points: how does a child reach the freeform Story Engine vs Story Time? What decides which surface a new child sees ("New Story Friday"? Home CTA? both)?
- Generation path: the endpoint or client code that produced the `stories` row — where does the Claude call happen, what triggers the deterministic fallback, where does `vocabulary_used` get built, and where could "cats" have come from (find the pluralization site).
- The catalog path: how `story_catalog` is served (`findCatalogStory`, `useStoryCatalogQuery`), and whether any existing logic prefers catalog for sparse-vocabulary children.
- What "known words" means to the story pool (which table/predicate — is it `word_progress` rows, `isRealMastery`, attempt_count>0?) — a new child's pool being `["cat"]` should be explainable from this.

## PHASE 1 — REPRODUCE WITH EVIDENCE
Fresh account + child on production, walked to the same state (placement to Unit 1, then trigger the story flow the same way a real new user would). Capture: the network request(s) for story generation, the response, any server logs/status distinguishing AI-path vs fallback, and the resulting `stories` row. State plainly which path ran and what the AI call did (succeeded / failed / never fired), with the evidence beside the claim. If the degenerate output does NOT reproduce, stop fixing and document what differs from Sal's session (timing, plan tier, flags) — STOP for discussion.

## PHASE 2 — ROOT CAUSE + THE ROUTING VERDICT
From the evidence, answer in the report:
1. Why was the pool size 1, and is that expected for a fresh account under the current "known words" predicate?
2. Did the AI path fail? If so, why, and why silently?
3. **The routing verdict:** per current code, was serving the freeform engine to this child intended? Should the catalog have served instead? Name the fix as routing, quality-floor, or both — and justify from code, not preference.

## PHASE 3 — FIX (scoped)
Apply the smallest fix set that guarantees: **a brand-new child's first story experience is never degenerate.** Expected shape (adjust to what Phase 2 shows):
- **Quality floor:** if the known-word pool is below a threshold (suggest 4; make it a named constant), do not generate — serve the catalog story for the target word (fall back to any tier-appropriate catalog story if the exact word has none; if truly nothing, a friendly "story coming soon" state beats non-language).
- **No out-of-list vocabulary:** remove/guard the pluralization or any other mechanism that emits words outside the 200-word list in generated text.
- **Surface failures:** a failed AI generation logs a visible event (console + telemetry if an allowed `product_events` type exists — do NOT add a new event type; that needs a migration and approval) instead of silently degrading. Remember the 0035/0036 lesson: an unlisted `product_events` type bounces silently off the CHECK constraint behind a 200.
- If the correct fix requires anything in the out-of-scope list (content rules, prompt pedagogy, "known word" redefinition, schema/migration), **STOP and present it** — do not do it under the bug-fix banner.

## PHASE 4 — VERIFY + SHIP
- New spec(s): a fresh-account story flow that asserts the served story is either catalog content or generation whose every word is in the 200-word list + child's name; assert the degenerate pattern (repeated bare permutations) cannot occur. Note honestly in the report which parts run locally vs require the live deploy.
- Full gates: `npm run build`, `check:no-emoji`, `check:wordart-sync`, Playwright `workers:1`; run `idor-proof` if any story fetch/ownership path changed.
- Confirm no regression to Story Time / catalog comprehension flow (the Blank-engine sixth-skill work) — walk it once on the preview.
- Merge `--no-ff` → **approval** → push → deployment check (commit-status + `vercel list`, not the MCP) → production walk: fresh new account end-to-end (signup → placement → story) confirming a real story is served → cleanup → docs push, self-certified.

## REPORT (docs/STORY_QUALITY_REPORT.md)
### SUMMARY — what the child got, why, what changed, what a new child gets now
### RUN TIMING + suite baseline
### RECON — the story pipeline map (both surfaces, both generator paths, the routing decision point, the "known words" predicate), file:line
### REPRODUCTION — the fresh-account evidence: path taken, AI call outcome, resulting row
### ROOT CAUSE + ROUTING VERDICT — ranked, evidence beside each claim
### FIX — what changed, why it's inside scope, the quality-floor constant, before/after story output for an identical fresh account
### VERIFICATION — gates, new specs, Story Time regression walk, production walk
### LOGGED FOR LATER — parent-surface blindness (insight + stat cards), placement copy/floor/progress-indicator, anything new — untouched
### TRAPS
