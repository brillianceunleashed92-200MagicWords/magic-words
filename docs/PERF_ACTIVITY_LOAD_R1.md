# 200 MAGIC WORDS — PERF_ACTIVITY_LOAD_R1: SPEED UP CHOOSING AN ACTIVITY
**Written:** July 11, 2026 · **Execute from:** `~/magic-words` · **Branch:** `perf/activity-load` (off current `main`)
Diagnose-first performance run. **Single focus: reduce the time between tapping an activity and the session being playable.** Measure where the time actually goes before changing anything. Do NOT alter `session-generator` *selection semantics* (which words/activities get chosen) — that's pedagogy, not perf, and it's protected. Log any other issue you notice; do not fix it.

## SUGGESTED /goal (paste into the CLI to launch)
> Execute docs/PERF_ACTIVITY_LOAD_R1.md end to end, committing the prompt doc as part of the run. Permissions are bypassed at the CLI level, but these approval stops remain binding: pause and ask in chat before `git push origin main`, before `supabase db push`, and before ANY change to the word/activity SELECTION logic in `api/session-generator.js` (perf changes to how it's fetched/cached are fine; changing WHICH items it returns is not). Complete when EITHER (a) docs/ACTIVITY_LOAD_PERF_REPORT.md is finished on `perf/activity-load` with: a measured before/after waterfall of the activity-selection path against production, the identified bottleneck(s) with evidence, the optimizations applied, a stated latency improvement (before vs after, same measurement method), the full suite green at its true current baseline + any new specs, gates green, production walk confirming the activity still loads correctly and faster, FINAL STATUS self-certifying the docs push — and you've pasted FINAL STATUS into your output; OR (b) a documented STOP: diagnosis complete but the only meaningful win requires a selection-semantics or schema change needing Sal's approval, pasted into your output. A documented STOP after diagnosis is valid completion. Do not change selection semantics, do not push, without approval. Stop after 100 turns.

## MISSION
Choosing an activity takes too long. Find out exactly why — with a real measured waterfall, not a guess — then apply the safe optimizations that move the number, and report before/after. Correctness of what loads must not change; only how fast it loads.

## KNOWN SIGNAL (from QA_HARDENING_R1 + network capture)
- Login → Home CTA visible measured 3.9–4.3s (Supabase auth + child-profile fetch + `/api/session-generator`).
- Tapping an activity triggers the `/api/session-generator` round-trip (the adaptive session plan) — prime suspect for the wait.
- Network on `/app` shows redundant/sequential calls: `child_profiles` fetched more than once (one 1.15s), repeated `user` fetches, many CORS preflights. Suspects: session-generator latency, duplicated/un-parallelized fetches, and audio (`/api/speak`)/image prefetch blocking first paint.

## GUARDRAILS (locked)
- **Do not change selection semantics.** No change to which words/activities `session-generator` returns or their pedagogical ordering (that's the live pedagogy question, out of scope here). Caching, parallelizing, prefetching, deduping, payload-trimming, and optimistic UI are all in scope; changing the *result set* is not.
- **Measure against a realistic target.** `vite preview` serves no `/api/*`; measure against the live prod deploy (SHA-matched to this branch) or `vercel dev`. State the target next to every number. Dev-server timings don't count.
- **Before/after, same method.** Every claimed improvement is a measured delta with the identical measurement harness, not an estimate.
- No unbounded waits. Capture the browser console/network for evidence. Log-don't-fix anything unrelated (e.g. the CSP `blob:` console errors, the pedagogy ordering question).

## PHASE 0 — REPORT + RECON
Open `docs/ACTIVITY_LOAD_PERF_REPORT.md` at STEP 0 with RUN TIMING, first commit on `perf/activity-load` off current `main`; print a fresh full-suite baseline count. Recon the exact activity-selection path: what fires from the moment an activity/word is tapped in `QuestPath`/`PlayScreen` to a playable question — the `session-generator` call, `useSessionPlan`/session hook, `child_profiles`/`words`/`user_*` fetches, `/api/speak` audio prefetch, WordArt image loads. Map the call graph and note what's sequential vs parallel, cached vs refetched, and what blocks first render.

## PHASE 1 — MEASURE THE WATERFALL (before)
Instrument the real path against prod: capture the network waterfall + timing from tap → first playable question, at a representative account/state. Record per-request timing (which calls, durations, whether serial or parallel), the `session-generator` server time specifically, and total tap-to-playable. Do at least 3 runs; report the median and the breakdown. This "before" number is the baseline everything is measured against.

## PHASE 2 — IDENTIFY THE BOTTLENECK
From the waterfall, name where the time actually goes, ranked. Likely candidates to confirm or rule out: (a) `session-generator` server latency; (b) duplicate/sequential `child_profiles`/`user` fetches that could be deduped or parallelized; (c) audio/image prefetch on the critical path that could be deferred/lazied; (d) oversized payloads; (e) no caching of a plan/profile that rarely changes; (f) waterfalled auth→profile→plan that could be collapsed. Base the ranking on the measured evidence, not assumption.

## PHASE 3 — OPTIMIZE (safe wins only)
Apply the optimizations that move the measured number without changing what loads:
- Dedupe/parallelize redundant fetches; collapse serial waterfalls where safe.
- Cache/reuse stable data (profile, word list) instead of refetching per activity.
- Defer non-critical work (audio prefetch, non-visible images) off the tap-to-playable path; consider optimistic UI so the activity shell paints while the plan resolves.
- Trim payloads to what the screen needs.
If the only meaningful win requires changing `session-generator` selection semantics or a schema/index change (e.g. a DB index for the plan query), **STOP and present it for approval** — do not do it under the perf banner unilaterally.

## PHASE 4 — VERIFY + SHIP
Re-measure with the identical harness → report before/after median + breakdown; the improvement must be real and stated. Full gates: `npm run build`, `check:no-emoji`, `check:wordart-sync`, Playwright `workers:1`; run `idor-proof` if any fetch/ownership path changed. Confirm the activity still loads the *same correct* content (no selection change) — diff a session plan before/after for an identical seeded account to prove parity. Merge `--no-ff` → **approval** → push → deployment check (commit-status + `vercel list`) → production walk (tap an activity on prod, confirm it loads correctly and faster) → docs push, self-certified.

## REPORT (docs/ACTIVITY_LOAD_PERF_REPORT.md)
### SUMMARY — before/after tap-to-playable, the bottleneck, what changed
### RUN TIMING + suite baseline + measurement target/harness
### CALL-GRAPH RECON — the activity-selection path, serial vs parallel, cached vs refetched
### WATERFALL (BEFORE) — the 3-run measured breakdown
### BOTTLENECK — ranked, with evidence
### OPTIMIZATIONS — what was changed and why it's selection-neutral (with the before/after plan-parity proof)
### WATERFALL (AFTER) — same harness, the delta
### VERIFICATION — gates, idor-proof (if triggered), parity proof, walks
### LOGGED FOR LATER — anything else noticed (CSP blob errors, ordering question, etc.), untouched
### TRAPS
