# 200 MAGIC WORDS — FEAT_PARENT_METRICS_R1: PARENT METRICS DASHBOARD
## Backlog Package A · **Written:** July 7, 2026 · **Execute from:** `~/magic-words` · **Branch:** `feat/parent-metrics`
Self-contained. Additive feature, display-only. **No schema change. No new server endpoints. No gate tokens** (no key-dependent phases in this run).

## MISSION
Give parents a real progress dashboard: six charts derived entirely from existing tables, rendered with Recharts inside the Parent Portal's Dashboard tab (behind the existing Grown-Ups gate — zero child-reachable surface changes). Charts: (1) words learned per week, (2) practice heatmap, (3) accuracy by activity, (4) answer-speed fluency trend, (5) review-due forecast, (6) unit progress. This run writes nothing to the database except its own disposable test fixtures. Every number a parent sees must be defensible — where a number is an estimate, it is labeled as one.

## RULES
1. **No schema change, no new API endpoints.** All charts compute client-side from date-bounded reads of `learning_events`, `word_progress`, and `words` through the existing RLS-protected client, keyed by the selected child. If you conclude a server endpoint is genuinely unavoidable, STOP and report why instead of building it — that changes the IDOR surface and needs a decision.
2. **Reuse, never re-declare, existing semantics:** `SCORELESS_GAME_TYPES` (`src/lib/queries/questProgress.js`), the `isRealMastery` predicate (mastery ≥ 80 AND attempt_count ≥ 3 — the celebration gate; locate it), activity ids/labels from `src/lib/activityDefs.js` (never a hardcoded list — the new build gate keeps defs↔writers honest, and this dashboard must ride the same source of truth), and the Star Keeper ladder intervals (1/3/7/14/30). Where one of these lives somewhere the chart code can't import (a server file, or a module importing `supabaseClient.js` — which Playwright's Node loader cannot load), **extract the pure constant/function into `src/lib/` and re-import it at the original site**. Extraction, not duplication.
3. **Honest numbers.** The known A2 calibration gap (mastery can hit 100% off one tap) means any "words learned" figure computed from raw `mastery ≥ 80` ships an inflated number to paying parents — every learned/mastered figure in this feature uses `isRealMastery`. And no new unlabeled proxies: do NOT surface "minutes" anywhere new (the 15s-per-event proxy stays confined to the existing This Week stat until Package E labels it). The heatmap is answer-count based.
4. **Design law:** Candy Galaxy tokens only, Baloo 2 (titles/numbers) + Quicksand (body), `--chunk`/`--chunk-sm` + press-down on anything interactive, NO emoji (build gate), no red anywhere — chart series colors come from `--sun`/`--mint`/`--bubble`/`--tang`/`--sky` on `--cloud` cards.
5. **Reduced motion:** all Recharts animation disabled (`isAnimationActive={false}` or equivalent) under `prefers-reduced-motion`; subtle initial-render animation otherwise.
6. **Approval stops:** `git push origin main`, anything destructive. `supabase db push` should never be needed this run — if you think it is, re-read rule 1 and STOP. Deployment check after push per convention (Vercel status AND a deployment for the exact SHA within ~3 min; never poll silently past 5).
7. **Report `docs/PARENT_METRICS_REPORT.md` at STEP 0** with RUN TIMING (start timestamp now; end timestamp + total wall-clock at close), headers below, live updates, committed in the first commit. A run that changes code but leaves no report is a failed run.
8. **Test accounts:** `nextgenprecisiondrones+*` via `scripts/admin-user.mjs`, admin-provisioned **with `parental_consent` metadata** (fixtures without it hang on the COPPA interstitial). Clean up after; cascade-verify. Never touch Sal's real accounts or data — seeding happens only on disposables. `scripts/db-query.mjs` for DB reads.

## PHASE 0 — REPORT FILE + RECON (read before writing anything)
Create the report. Then read: the Parent Portal Dashboard tab component(s) and how its existing queries key on the selected child + the child-switcher mechanism; `questProgress.js` (SCORELESS + the client-local "today" convention — the heatmap must use the same day boundary); `activityDefs.js`; the exact code path that computes and writes `word_progress.mastery` from answers (Phase 1 depends on understanding this formula precisely); the Star Keeper rung/interval logic in `api/session-generator.js`; and `package.json` for `recharts` — add it pinned if absent. Charts must live in the lazy-loaded Parent Portal chunk: confirm from build output that child-route chunk sizes do not grow.

## PHASE 1 — THE MASTERY-CROSSING DECISION (foundation for chart 1)
"Words learned per week" needs the week each word FIRST satisfied `isRealMastery`. `word_progress` stores only current state — no `mastered_at`, and rule 1 forbids adding one. Decide by evidence, not preference:
- **If mastery is a pure, deterministic function of the child's ordered event stream** (correct/attempt accumulation with no server-side hidden state): write a small pure util that replays a word's `learning_events` in order and returns the timestamp of the first event at which `isRealMastery` held. Prove purity: replay ≥3 real seeded sequences and assert the replayed final state equals the stored `word_progress` values those same events produced. Unit-test the util. It must live where Playwright's Node loader can import it (no `supabaseClient` import).
- **If it is not pure** (decay, spaced factors, anything stateful): do NOT approximate silently. Fall back to the defined approximation "first client-local day on which the word's cumulative events reached ≥3 attempts AND ≥80% cumulative accuracy," label the chart **Est.** with a one-line tooltip, and record the decision + evidence in the report.

## PHASE 2 — DATA LAYER
One date-bounded read per table per child, aggregated client-side:
- `learning_events`: last 84 days for the selected child. **Supabase caps selects at 1000 rows by default — page with `.range()` until exhausted, or charts silently truncate for exactly the most active kids.** The seed data (Phase 4) must be large enough to prove pagination is exercised; say so in the report.
- `word_progress`: all rows for the child. `words`: unit + word_type (denominators for chart 6).
- React-query keys include `childId`; charts refetch on child switch (child-scoping bugs have precedent in this codebase — verify live by switching children). Follow the Dashboard's existing query/invalidation conventions.

Per-chart derivations — locked. A deviation goes in the report as UNRESOLVED with a proposal, never improvised:
1. **Words learned per week** — weekly counts of first-`isRealMastery` crossings (Phase 1), last 8 weeks, bar chart.
2. **Practice heatmap** — last 12 weeks, calendar grid, intensity = `learning_events` count per client-local day (same day convention as `questProgress`). ALL game_types count here, including retired and scoreless — practice is practice.
3. **Accuracy by activity** — last 30 days, per `game_type`: correct/attempts. EXCLUDE scoreless types (import `SCORELESS_GAME_TYPES` — their `correct` field is not an accuracy signal). Ids absent from `ACTIVITY_DEFS` (historical `magic_video` at minimum) are omitted from THIS chart only — not actionable for a parent — while still counting in the heatmap. Hide any activity with <5 attempts in range (a 1-for-1 bar reading 100% is noise, not signal). Labels from `activityDefs`.
4. **Answer speed trend** — weekly MEDIAN `response_time_ms`, correct answers only, excluding events >30s (walked-away outliers), last 8 weeks, line chart. Median, not mean — child response times are outlier-heavy. Parent-friendly framing ("Answer speed — faster is more fluent"), no ms jargon on the axis (use seconds).
5. **Review-due forecast** — next 14 days: words coming due per day, due = `last_seen` + ladder interval for the word's current rung, using the SAME rung derivation the session-generator uses (extract per rule 2). Only started words (mastery > 0). **If the rung turns out not to be derivable client-side from `word_progress` fields alone, STOP on this chart only** — ship the other five, and report exactly what state the server uses so the follow-up is scoped.
6. **Unit progress** — per unit 1–18: `isRealMastery` words / total words in unit, horizontal bars, all 18 visible. Locked/premium units render with the existing Parent-Portal upsell affordance — the portal is the sanctioned true-level surface (Placement precedent), so do not hide them.

**Empty states are first-class.** A fresh child with zero events must see designed, Nova-toned empty cards for every chart — no naked axes, no NaN, no 0-height bars — verified live on an unseeded child.

## PHASE 3 — UI
New "Progress" section within the Dashboard tab, below the This Week stats; do not disturb AI Insight or the printable Dinner Table Cards. One `--cloud` card per chart with `--chunk` shadow, Baloo 2 title, and a one-line Quicksand caption under each telling a parent what the chart means and what good looks like (growth-mindset tone, no jargon). The portal is used on phones: every chart legible at 375px width. After building, verify the WHOLE Dashboard tab rendered end to end, not just the new cards (the too-narrow-check trap).

## PHASE 4 — FIXTURES + TESTS
Seed one disposable child with ≥5 weeks of history: multiple game_types including ≥1 retired `magic_video` row and scoreless rows; **≥1,200 `learning_events` total (forces pagination)**; several words crossing mastery in different weeks; response times with deliberate >30s outliers; words at varied rungs for the forecast. Second child on the same account left unseeded (empty-state + child-switch fixture).
Playwright: (a) Dashboard renders all six charts populated, with data assertions on at least the accuracy exclusions and one known weekly learned-count; (b) empty-state spec on the unseeded child; (c) child-switch refetch spec. **Suite baseline is 42 — new specs only add; any count shrink is an alarm, not a footnote.** Note the fallback-plan trap from the quest run if any spec plays activities against the dev server: the local fallback sorts ascending-by-mastery and caps at 6, which can silently exclude a seeded word.

## PHASE 5 — GATES, VERIFY, SHIP
Full gates: `npm run build` (all 4 sync checks + vite), `npm run check:no-emoji`, Playwright at `workers:1`. **Re-run `scripts/idor-proof.mjs`** — new read queries over progress data is the standing trigger; all existing checks must pass, and the report states explicitly that no new endpoint was added (or that rule 1's STOP fired instead). Preview walk with the seeded account: all six charts, both children (seeded + empty), a reduced-motion pass, a 375px pass. Then merge `--no-ff` → **approval stop** → push → deployment check → production walk on a fresh disposable (light seed; verify charts render + empty states live) → delete test accounts, cascade-verify → final report update to DONE with end timing → docs push.

## REPORT (docs/PARENT_METRICS_REPORT.md — created at STEP 0, filled live)
### RUN TIMING
### MASTERY-CROSSING DECISION — pure replay vs. labeled approximation, with the evidence
### DATA DERIVATIONS — per chart: exact query, formula, exclusions; pagination proof
### UI — placement, tokens, reduced-motion, empty states, 375px
### VERIFICATION — fixtures, test results (count vs. 42 baseline), gates, idor-proof, preview + production walks
### COPPA NOTE — one paragraph legal can read: display-only aggregation of already-inventoried tables, no new collection, no PII in any chart payload
### NOTES FOR PACKAGES B/C — where the calibration gate (B) and placement report / Star Check-In (C) should hook into what this run built
