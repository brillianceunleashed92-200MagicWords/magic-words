# FEAT_PLACEMENT_CHECKIN_R1 — The Assessment Surface (Backlog Package C)

Executing `docs/FEAT_PLACEMENT_CHECKIN_R1.md`. Branch: `feat/placement-checkin`.

## RUN TIMING
- Started: 2026-07-08 (session continuation, immediately after FIX_CELEBRATION_R1 shipped to main at `811c573`).

## DESIGN LOCK — as shipped, incl. the never-regress rule and storage decision (+ migration record if one fired)

**Recon read**: `docs/PARENT_METRICS_REPORT.md` §NOTES FOR PACKAGES B/C, `docs/PEDAGOGY_CALIBRATION_REPORT.md` §NOTES FOR PACKAGE C, `docs/PLACEMENT_ADVENTURE_REPORT.md` (full), `api/_lib/placementLadder.js`, `api/session-generator.js`'s `handlePlacement`/`finalize`/`issueRung`, migrations 0032-0035, `src/lib/queries/childProfiles.js`, `src/lib/queries/parentMetrics.js` (`useParentMetricsHistoryQuery`), `src/screens/parent/ProgressCharts.jsx`, `src/screens/parent/DashboardTab.jsx`, `src/screens/parent/SettingsTab.jsx` (retake-placement), `src/screens/PlacementChoiceScreen.jsx`, `src/screens/PlacementAdventureScreen.jsx`, `src/components/candy/PlacementProbe.jsx`.

**1. Storage decision — NO migration required (real recon finding, not assumed).**
- **Current-state columns are reused, not duplicated**: `child_profiles.placement_unit` / `measured_unit` / `placement_completed_at` (from migrations 0032/0034) already exist, are already selected by `useChildProfilesQuery`, and already have exactly the RLS/REVOKE shape this feature needs (client SELECT allowed, all writes service-role-only). A check-in's `finalize()` writes these SAME three columns — see never-regress rule below — rather than adding parallel ones.
- **Historical growth-line rows reuse `product_events`** (migration 0032, already a generic `(event_type, user_id, child_id, payload jsonb, created_at)` table, service-role-only, no client policies) — exactly the shape `PLACEMENT_ADVENTURE_REPORT.md`'s own "events-home verdict" said future events should generalize into. Two new event types: `checkin_started`, `checkin_completed`. **Migration needed for the CHECK constraint only** (event-type allowlist, not a new table/column) — see MIGRATION below.
- **`api/track.js` allowlist is deliberately NOT touched.** Rule 1 says new `product_events` types need both the `api/track` allowlist and the DB CHECK constraint "in the same change" — checked against precedent first: `placement_started`/`completed`/`skipped`/`retaken` were never added to `api/track.js`'s `EVENT_SCHEMAS` because they're logged server-side only, from inside `api/session-generator.js`'s own `logProductEvent` calls, never posted by the client through `/api/track`. `checkin_started`/`checkin_completed` follow the identical pattern (logged from the new `checkinMode` branch, same file, same helper) — so only the CHECK constraint needs updating. Documented here explicitly so this isn't mistaken for skipping half of rule 1: the rule's purpose (don't let a write path exist that the CHECK constraint doesn't know about) is satisfied because there is no client-facing write path for these two types at all.
- **Client can't read `product_events` directly (by design, unchanged)** — a new **read-only, ownership-verified server endpoint** (`historyMode` on `api/session-generator.js`, same precedent as `placementMode`/`reviewOnly` — no new file) queries `product_events` server-side with the service-role client and returns a minimal projection (`[{date, measuredUnit, source}]`), never raw rows or other event types. Preserves the "backend telemetry only" invariant `PLACEMENT_ADVENTURE_REPORT.md` established for this table while still powering a parent-facing chart.

**2. Migration** (approval required before it lands, per rule 1 — presented below, not yet applied): extend `product_events_event_type_check` to add `'checkin_started', 'checkin_completed'` to the existing 7-value list (`placement_started/completed/skipped/retaken`, `paywall_viewed`, `checkout_started`, `scaffold_down`), same pattern as migrations 0034/0035 (`drop constraint` + `add constraint ... check (event_type in (...))`).

**3. Check-in rung selection**: reuses `RUNGS = [1,3,5,7,9,12,15,18]` from `placementLadder.js` verbatim (no new rung table). Server computes `startRungIndex` = the highest rung index whose unit is `<=` the child's current effective level (`measured_unit ?? placement_unit ?? 1`), then bounds the ladder walk to `[max(0, startRungIndex-2), min(RUNGS.length-1, startRungIndex+2)]` — a child never sees a rung outside their neighborhood, and the walk still uses the exact same 2-word/tiebreak pass rules as placement (2/2 advance, 0/2 finalize-at-last-passed, 1/2 single tiebreak word) with **no delta** — reusing `issueRung`'s adjudication logic parameterized by a `bounds` range rather than forking a second implementation of the same rules.

**4. Never-regress rule, precise mechanic**: check-in's `finalize()` computes `rawMeasured = RUNGS[rungIndex]` (the raw reading, which CAN be lower than the child's stored level — a bad day) then `appliedMeasured = Math.max(rawMeasured, storedMeasuredUnit)` before writing `child_profiles.measured_unit`/`placement_unit` (floored per plan, same as placement's existing floor logic) — the enforced floor and the child's session-generator experience never regress. `placement_completed_at` always bumps to "now" regardless of raw vs. applied (a check-in IS a fresh measurement event either way — this is what drives the 30-day eligibility clock). The **raw** `rawMeasured` (not the applied/floored value) is what's logged in `checkin_completed`'s `product_events` payload and is what the growth chart plots — a dip is real information for the parent, never enforced on the child, matching the mission's own framing verbatim.

**5. 30-day eligibility rule, evaluated client-side**: `daysSince(activeChild.placement_completed_at) >= 30`, using data already fetched by `useChildProfilesQuery` — no new round-trip needed just to show/hide the eligibility card. `placement_completed_at === null` (never placed, or "start at the beginning" chosen) → **not eligible** — check-in re-probes an existing measurement; a beginner-by-choice child has nothing to re-check (the Placement Report card shows their state as "started at the beginning" instead, see PORTAL section).

**6. Growth chart data contract**: `[{date: 'YYYY-MM-DD', measuredUnit: number, source: 'placement' | 'checkin'}]`, ascending by date, sourced from the new `historyMode` endpoint's read of `product_events` (`placement_completed`/`placement_retaken`/`checkin_completed`, each event's `payload.trueMeasuredUnit` or `payload.rawMeasured` respectively). Deliberately plots the **raw/true** measured value at each point (never the free-tier-floored `placement_unit`) — floor-vs-measured is a display-time annotation (the existing upsell banner logic), not a data-shape decision, consistent with the mission's framing that measured level and enforced floor are different concepts everywhere in this feature.

**Deviation record**: none yet — will log any drift here as it's discovered, per the prompt's own instruction ("deviations later = census-correction entries, not silent changes").

## SERVER — token/adjudication endpoints, rate limits, telemetry (allowlist+CHECK proof)
IN PROGRESS

## PORTAL + PROBE — surfaces built, §5a compliance evidence
IN PROGRESS

## VERIFICATION — fixtures, tests vs 65 baseline, gates, idor-proof (incl. positive twins executed against preview), walks
IN PROGRESS

## TRAPS — reusable lessons
IN PROGRESS

## NOTES FOR PACKAGES D/E — what admin + quick-wins should reuse
IN PROGRESS
