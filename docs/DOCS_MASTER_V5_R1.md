# 200 MAGIC WORDS — DOCS_MASTER_V5_R1: MASTER DOC v4 → v5
**Written:** July 11, 2026 · **Execute from:** `~/magic-words` · **Branch:** work directly on `main` (docs-only) or `docs/master-v5` if you prefer — your call, state it in the report.
**Docs-only run. Zero code changes. Zero migrations.** Produce `docs/200MW_Master_Project_Doc_v5.md` reconciling everything shipped since v4 was written, so the Master Doc is once again the single trustworthy source of truth.

## SUGGESTED /goal (paste into the CLI to launch)
> Execute docs/DOCS_MASTER_V5_R1.md end to end, committing the prompt doc as part of the run. This is a docs-only run: you may not modify any file outside docs/ — if a code change seems needed, STOP and say so. Approval stop remains binding: pause and ask in chat before `git push origin main`. Complete when docs/200MW_Master_Project_Doc_v5.md exists on main (or a docs branch, stated), every claim in it is verified against the repo/reports rather than recalled (census discipline: counts come from fresh measurement — spec count from `npx playwright test --list`, migration count from ls, word count from the words source — not from prose in older docs), a SOURCES table maps each major section to the report/commit it was reconciled from, `git diff --stat` for the run touches only docs/, and FINAL STATUS is pasted into your output self-certifying the docs push. Stop after 60 turns.

## MISSION
`docs/200MW_Master_Project_Doc_v4.md` predates: FIX_CELEBRATION_R1, FEAT_BLANK_ENGINE_R1, QA_HARDENING_R1, FIX_NO_BLANK_SCREENS_R1, PERF_ACTIVITY_LOAD_R1, FIX_STORY_QUALITY_R1, and FIX_STORY_FOLLOWUP_R1 — all now merged to main with reports in docs/. Write v5 as a full, current document (not a changelog appended to v4): same overall structure as v4, every section updated to present-tense truth, with a SOURCES table and a clearly-marked OPEN ITEMS section.

## INPUTS (all in docs/ on main — read them, don't trust memory)
- `200MW_Master_Project_Doc_v4.md` (the base)
- `CELEBRATION_FIX_REPORT.md`, `BLANK_ENGINE_REPORT.md`
- QA_HARDENING_R1's report (find it — likely on the `qa/e2e-audit` branch; if it's not on main, pull the report content via `git show qa/e2e-audit:...` and say so in SOURCES)
- `ACTIVITY_LOAD_PERF_REPORT.md`, `STORY_QUALITY_REPORT.md`, `STORY_FOLLOWUP_REPORT.md`
- The blank-screens fix (report/commits around the `4b2dfd0` merge)
- Recent git history on main for anything the above miss: `git log --oneline v4-era..HEAD` (find v4's approximate commit by date)

## WHAT v5 MUST CAPTURE (verify each against source, cite in SOURCES)
1. **Architecture/current state**: ErrorBoundary at router root + 404 route; session-plan caching + Home-mount prefetch + focusWord reorder (perf run); story pipeline as it exists NOW — quality floor constant, catalog-first routing for below-floor children, catalog served ungated, exact-match validation on the AI path only, vocab-safe template as last resort, console.warn fallback telemetry.
2. **Pedagogy engine**: Blank-engine changes (function-word universality, mastered-content damping, story comprehension as sixth skill) + the perf run's finding that word selection is deterministic and computed before the AI flavor-text call.
3. **Fresh census** (measured, not recalled): Playwright spec count, migration count and latest number, story_catalog row count, the 200-word list source of truth, current suite pass state with the known flaky/prod-locked specs named.
4. **Known issues / OPEN ITEMS** (consolidated from all reports' LOGGED FOR LATER sections + chat triage): parent-surface blindness (AI Insight + stat cards blind to product_events/story reads); migration 0037 (`story_fallback` event type — CHECK constraint + api/track allowlist + positive-landing test, per the 0035 lesson); catalog coverage audit (all 20 rows vs 200-word list); placement polish ("3-5 minutes" copy vs ~21s reality, no progress indicator, two-miss floor question); cold-tap sessionLength decision (3 options from the perf report) + session-ordering question (pedagogy batch); QA_HARDENING backlog items still open (verify each against current main before listing — some may have been fixed since); CSP blob: script-src errors; suite reliability debt (flaky prod-locked specs, the 7 specs locked to production baseURL); Galaxy map unvirtualized; LoginScreen legacy theme; streak_freeze recon note for Package E resumption.
5. **Launch-critical Sal-side path** (unchanged, list as-is): counsel email, key rotation (Stripe/ElevenLabs/Supabase service-role, hCaptcha flip, Google OAuth, spend alerts), virtual mailbox + business phone, device test session, Stripe live cutover.
6. **Traps registry**: consolidate the TRAPS sections from all reports into one deduplicated list (this is now scattered across 5+ reports and is some of the most valuable institutional knowledge in the repo).
7. **Workstream state**: what's parked (`feat/quick-wins` Package E mid-Phase-2 with the streak_freeze_count recon note), what's merged, what branches are dead and can be deleted (recommend, don't delete).

## GUARDRAILS
- Docs-only: `git diff --stat` at the end must show only docs/ paths. No code, no tests, no migrations, no deletions of old reports (v4 stays in place, marked superseded in its header is fine — a one-line docs edit).
- Census discipline: any number in v5 (spec counts, unit counts, word counts, row counts) comes from a fresh measurement command run during this session, with the command noted in SOURCES.
- Where reports conflict (e.g. suite counts across runs), state the current measured truth and footnote the history briefly — don't average or guess.
- No new claims about behavior you haven't read in a report or verified in code. If something is uncertain, put it in OPEN ITEMS as a question, not in the body as a fact.

## REPORT
No separate report file — the deliverable IS the doc. FINAL STATUS goes in your output: doc path, verification that the diff is docs-only, the census numbers with their commands, and the docs-push self-certification.
