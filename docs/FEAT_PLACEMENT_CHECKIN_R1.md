# 200 MAGIC WORDS — FEAT_PLACEMENT_CHECKIN_R1: THE ASSESSMENT SURFACE
## Backlog Package C · **Written:** July 7, 2026 · **Execute from:** `~/magic-words` · **Branch:** `feat/placement-checkin`
Self-contained. No gate tokens. **Run FIX_CELEBRATION_R1 first** — it touches the completion/celebration pipeline this feature's probe flow borders.

## MISSION
Make assessment a visible, recurring part of the product instead of a one-time hidden fork. Three pieces:
1. **Placement Report** — a parent-facing card/section in the Parent Portal Dashboard that formalizes what placement already measured: when the child was placed, at what unit, whether they started at the beginning by choice, and (free tier) the true measured level vs. the unit-5 floor — the existing sanctioned upsell surface, now a real report instead of a buried banner.
2. **Star Check-In** — a recurring ~8-item re-probe, parent-initiated from the portal (a card that activates when ≥30 days have passed since the last measurement), adventure-framed for the child exactly like Placement Adventure. Reuses the placement ladder's machinery: signed stateless ladder token, server adjudication, DESIGN_BRIEF §5a measurement carve-out (one tap per question, miss indistinguishable from hit in tone). Scoped to the child's current neighborhood (current unit ±2 rungs), not the full 8-rung ladder.
3. **Growth over time** — placement baseline + each check-in plotted as the measured-level line in the Parent Portal (joins Package A's charts). This is the before/after retention surface the external assessment's #2 called for.

## PHASE 0 — REPORT + RECON (the notes live in the repo, read them there)
Create `docs/PLACEMENT_CHECKIN_REPORT.md` with RUN TIMING + headers below. Then read, in the repo: `docs/PARENT_METRICS_REPORT.md` § NOTES FOR PACKAGES B/C, `docs/PEDAGOGY_CALIBRATION_REPORT.md` § NOTES FOR PACKAGE C, `docs/PLACEMENT_ADVENTURE_REPORT.md`, the placement ladder implementation (`PlacementProbe.jsx`, the token signing/adjudication endpoint, `placement_unit`/`placement_completed_at` + their column-level REVOKE), `useParentMetricsHistoryQuery` (the one fetch point to extend, never duplicate), and `product_events`' schema + CHECK constraint (post-migration-0035 state).

## RULES
1. **Storage recon before design lock**: check-in results need durable, queryable history (a growth line needs rows, not a single overwritable column). Recon what exists; if a new table or columns are required, STOP and present the migration for approval — migration lands before any code reading it. Any new `product_events` event types must be added to BOTH the `api/track` allowlist AND the DB CHECK constraint in the same change (the migration-0035 lesson), with a positive-assertion test proving a legit row actually lands.
2. **The child never sees assessment framing.** Check-in is a Nova adventure; results, levels, and growth surface ONLY in the Grown-Ups-gated portal. Free-tier floor behavior unchanged: measured level may exceed the floor; the child's experience stays capped at min(measured, 5).
3. §5a carve-out applies inside the probe only; every other surface keeps the full errorless scaffold. No test-anxiety language anywhere. Candy tokens, no emoji, no red/X, no phonics.
4. **idor-proof extends, with the vacuous-check lesson applied**: forged/replayed check-in tokens rejected, forged childId rejected, direct writes to any new columns/table rejected — and EVERY negative check paired with a positive twin (the legitimate path demonstrably lands) so no check can pass on an empty result set. New checks that live behind `DEPLOY_BASE_URL` must actually execute against the preview before being counted green.
5. Approval stops: `git push origin main`, `supabase db push`, destructive ops. Report live-updated; **FINAL STATUS self-certifies the docs push**. Test accounts `nextgenprecisiondrones+mwcheckin*` with `parental_consent` metadata; clean up + cascade-verify. Suite baseline **65** — only add.

## PHASE 1 — DESIGN LOCK (in the report, before code)
Write the locked design: check-in rung selection (current unit ±2, 2 words/rung, same pass rules as placement or justify a delta), the result record's shape and where it lives, the 30-day eligibility rule and where it's evaluated, how a check-in result interacts with `placement_unit` (proposal: it NEVER lowers anything — a check-in can raise the measured level and the portal's growth line, but the floor/current-unit derivation never regresses from a bad day; a measured level below current progress is shown to the parent as information, not enforced on the child), and the growth chart's data contract. Deviations later = census-correction entries, not silent changes.

## PHASE 2 — BUILD
Server: check-in token issuance + adjudication (mirror the placement endpoint's patterns; JWT identity; rate-limit like siblings). Client: portal Placement Report card + Check-In card (eligibility-gated) + the child-facing probe flow reusing `PlacementProbe` machinery; growth line into the Progress section (extend the existing fetch/derivation modules — never a second competing fetch). `product_events`: `checkin_started` / `checkin_completed` (allowlist + CHECK together, per rule 1).

## PHASE 3 — FIXTURES + TESTS
Seed: a child with placement at unit 3 + synthetic 35-day-old measurement (eligibility on), a fresh child (eligibility off, report shows placement only), a free-tier child with measured > floor. Specs: eligibility gating, full check-in flow (§5a tone parity — tapped tile renders identically right or wrong), result recorded + growth line updates, floor never regresses, child surfaces show zero assessment language. Positive-assertion telemetry test.

## PHASE 4 — GATES, VERIFY, SHIP
Full gates + idor-proof (extended checks executed against the live preview, not just skipped locally). Preview walk: parent initiates check-in, child completes it, portal shows the growth point, free-tier upsell reads correctly. Merge `--no-ff` → approval → push → deployment check → production walk (light) → cleanup + cascade-verify → report DONE with end timing → **docs push, self-certified in FINAL STATUS**.

## REPORT (docs/PLACEMENT_CHECKIN_REPORT.md)
### RUN TIMING
### DESIGN LOCK — as shipped, incl. the never-regress rule and storage decision (+ migration record if one fired)
### SERVER — token/adjudication endpoints, rate limits, telemetry (allowlist+CHECK proof)
### PORTAL + PROBE — surfaces built, §5a compliance evidence
### VERIFICATION — fixtures, tests vs 65 baseline, gates, idor-proof (incl. positive twins executed against preview), walks
### TRAPS — reusable lessons
### NOTES FOR PACKAGES D/E — what admin + quick-wins should reuse
