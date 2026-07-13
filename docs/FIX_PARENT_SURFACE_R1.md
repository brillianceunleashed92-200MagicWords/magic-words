# 200 MAGIC WORDS — FIX_PARENT_SURFACE_R1: PARENT PORTAL MUST TELL THE TRUTH
**Written:** July 12, 2026 · **Execute from:** `~/magic-words` · **Branch:** `fix/parent-surface` (off current `main`)
**Single focus: the parent Dashboard contradicts reality for an active child.** On July 11, minutes after a child completed placement and read a story, the portal showed "0 words / 0 streak / 0 minutes" and the AI Insight said she "hasn't jumped into the app yet this week." Root cause (from chat triage, verify in recon): the insight and stat cards read `learning_events` only — they are blind to `product_events` (placement/check-in) and to `stories.read_at`. Fix the blindness. Log everything else.

## SUGGESTED /goal (paste into the CLI to launch)
> Execute docs/FIX_PARENT_SURFACE_R1.md end to end, committing the prompt doc as part of the run. Approval stops remain binding: pause and ask in chat before `git push origin main`, before `supabase db push` (no migration is expected — if a schema change seems needed, STOP), and before any change to what the AI Insight is *allowed to say* beyond feeding it the two new activity sources (tone/safety rules for parent-facing AI copy are locked). Complete when docs/PARENT_SURFACE_REPORT.md is finished on `fix/parent-surface` with: the exact data sources each Dashboard surface reads (before), the fix applied per the DECISIONS section, a production walk on a fresh disposable account reproducing the incident sequence (placement → story read → open parent Dashboard) showing the insight and cards now acknowledge that activity truthfully, full suite green at its true baseline + any new specs, gates green, FINAL STATUS self-certifying the docs push — and you've pasted FINAL STATUS into your output. Never touch the Aliya child or its parent account — fresh disposables only, cleaned up after. Stop after 80 turns.

## DECISIONS (made by Sal in chat — implement, don't relitigate)
1. **AI Insight** must be aware of placement completion, Star Check-Ins, and story reads. "Hasn't started yet" may only be said when there is genuinely zero activity across `learning_events`, placement/check-in `product_events`, AND story reads. When the only activity is placement + a story read, the insight should reflect that truthfully (e.g. acknowledging she got started, was placed, read her first story) — natural copy, no fabricated metrics.
2. **Minutes card**: story-read time counts toward minutes if a reasonable read-duration signal exists or can be conservatively derived (e.g. `read_at` sessions bounded by a cap). If no honest derivation exists without schema changes, keep minutes as-is and instead ensure the insight carries the story activity — state which path was taken and why in the report.
3. **Words-this-week card: UNCHANGED.** It measures word mastery from `learning_events` and story reads do not count toward it. Placement answers do not count toward it either.
4. **Streak: UNCHANGED** in definition. But verify: does a placement-only or story-only day currently count toward the streak? Whatever the current definition is, document it in the report and leave it — changing streak semantics is Package E territory.

## GUARDRAILS
- Read-side fix only: parent Dashboard surfaces (AI Insight input context, stat cards) and their queries. Do NOT change what any child-side flow writes. Do NOT add `product_events` types, columns, or migrations. Do NOT touch `api/session-generator.js`.
- The AI Insight's tone/safety envelope is locked: no diagnosis-flavored claims, no pressure tactics, no fabricated numbers — feeding it two new true facts (placement result exists, story read happened) is the whole change to its input.
- Recon before code: map every Dashboard surface (insight, 3 stat cards, each Progress chart's empty-state) to its exact query/table with file:line. Some surfaces may already be correct — say so rather than churning them.
- Empty-state copy on charts ("No practice logged...") was reviewed in chat and is fine — leave unless it becomes literally false after this fix.
- `vite preview` serves no `/api/*`; if the insight is server-generated, verify against a real deployment.
- Log-don't-fix: migration 0037/0038 drift (known, separate), placement copy, catalog audit, anything new.

## PHASES
0. Report at STEP 0 with RUN TIMING on `fix/parent-surface` off current `main`; fresh full-suite baseline; the surface→source map (before).
1. Reproduce the incident state on a fresh disposable account (placement → story read → Dashboard) and screenshot/record what each surface says (before evidence).
2. Apply the fix per DECISIONS. New/updated specs: a fresh account with placement+story-read only must (a) not trigger "hasn't started yet" in the insight context, (b) leave words-this-week at 0, (c) minutes per whichever path decision 2 resolved to.
3. Gates: build, no-emoji, wordart-sync, full Playwright `workers:1`; idor-proof if any query's ownership/scope changed (parent reading own child's data — state the determination explicitly).
4. Merge `--no-ff` → **approval** → push → deployment check (commit-status + `vercel list`) → production walk: same fresh-account sequence, Dashboard now truthful (quote the actual insight text served) → cleanup → docs push, self-certified.

## REPORT (docs/PARENT_SURFACE_REPORT.md)
### SUMMARY · RUN TIMING + baseline · SURFACE→SOURCE MAP (before/after, file:line) · BEFORE EVIDENCE (the untruthful state reproduced) · FIX (per decision, incl. which minutes path and why) · VERIFICATION (gates, specs, production walk with insight text quoted) · LOGGED FOR LATER (carry forward the standing list) · TRAPS
