# FIX_CELEBRATION_R1 — Star-Ignition Firing Between Answers

Executing `docs/FIX_CELEBRATION_R1.md`. Branch: `fix/celebration-timing`.

## RUN TIMING
- Started: 2026-07-07 (session start, ET timestamps below use local commit times)
- STEP 0 (this report + recon) committed as first commit on branch.

## PROVENANCE RECONCILIATION — the Phase 0.5 table

**Package A** = `feat/parent-metrics`, merged `d8290d4` (2026-07-07 11:59 ET / 15:59 UTC). Every commit on `main` from `d8290d4` to the pre-this-run HEAD (`a8504fd`) is accounted for:

| Commit | What | Run/report |
|---|---|---|
| `2afd849`, `94620d4` | Parent Metrics report close-out, push, deploy | `docs/PARENT_METRICS_REPORT.md` (Package A itself) |
| `c08e329`…`d6ba7db` (18 commits) | Pedagogy Calibration Phases 0–8: `isRealMastery` predicate everywhere, `attempt_number` wiring, scaffold-down v1, truncation guard, migration 0035, gates, preview+prod walk | `docs/FEAT_PEDAGOGY_CALIBRATION_R1.md` / `docs/PEDAGOGY_CALIBRATION_REPORT.md` (**Package B**) |
| `633d68e` | merge: feat/pedagogy-calibration → main | Package B report |
| `f66ea02`, `a8504fd` | Package B push + deploy + FINAL STATUS | Package B report |
| `88e9d9c` | This run's STEP 0 | this report |

**No undocumented commit found on `main`.** Every commit since Package A traces to a report with a matching phase/timestamp.

**Migrations ≥0032** — all four are documented, contrary to this run's own recon-audit premise for one of them:

| Migration | What | Commit | Report |
|---|---|---|---|
| `0032_placement_adventure.sql` | Placement Adventure server ladder | `5ba5a07` | `docs/PLACEMENT_ADVENTURE_REPORT.md` |
| `0033_placement_unit_revoke_fix.sql` | `child_profiles` UPDATE grant was still table-level after 0032 | `50e488f` | `docs/PLACEMENT_ADVENTURE_REPORT.md` |
| `0034_launch_analytics.sql` | `subscriptions.created_at`, `child_profiles.measured_unit` | `9e01a0c`/`612b6b5` | `docs/LAUNCH_ANALYTICS_REPORT.md` — **correction: this run's own premise ("no report on record") is wrong.** `LAUNCH_ANALYTICS_REPORT.md` documents 0034 in full (privilege re-verification, backfill approach, approval-before-push). Treat the FIX_CELEBRATION_R1 prompt's Phase 0.5 framing on this one point as stale, not a real gap. |
| `0035_product_events_scaffold_down.sql` | `scaffold_down` added to `product_events` CHECK constraint | `5d029df` | `docs/PEDAGOGY_CALIBRATION_REPORT.md` (Package B) |

**`tests/story-time-chrome.spec.js`** — also not from an undocumented branch. `git log --all` on the file shows it was added at `8732fc7` ("fix: migrate Story Time onto the shared Candy chrome"), which is inside the `575f3b0` merge bundle ("Launch Analytics + Story Time chrome + Placement true-level fix", Prompt 9) — fully covered by `docs/LAUNCH_ANALYTICS_REPORT.md` §"STORY TIME — the three-step migration order." Second correction to this run's own premise.

**`mwstorytime*` test accounts — the one finding that IS real.** Queried `auth.users` directly (read-only):

| Email (suffix = epoch ms) | created_at (UTC) | created_at (ET) |
|---|---|---|
| `mwstorytime1783308892350` | 2026-07-06 03:34:52 | 2026-07-05 23:34 |
| `mwstorytime1783343119249` | 2026-07-06 13:05:19 | 2026-07-06 09:05 |
| `mwstorytime1783444216586` | 2026-07-07 17:10:16 | 2026-07-07 13:10 |
| `mwstorytime1783448001136` | 2026-07-07 18:13:21 | 2026-07-07 14:13 |
| `mwstorytime1783449214680` | 2026-07-07 18:33:34 | 2026-07-07 14:33 |
| `mwstorytime1783449733557` | 2026-07-07 18:42:13 | 2026-07-07 14:42 |

`docs/PEDAGOGY_CALIBRATION_REPORT.md` (its own recovery audit, ~14:48 ET) already flagged the 17:10/18:13 pair as "a different, later workstream... not touched, not deleted." **This run's own fresh query finds two MORE rows the pedagogy-calibration audit never saw** (18:33, 18:42 ET-adjacent UTC times = 14:33/14:42 ET) — created after that audit's own query ran but before its commit landed. All four July-7 rows cluster within a ~90-minute window (13:10–14:42 ET), entirely before Package B's merge (15:26 ET) and roughly 55–90 minutes before the bug screenshot (15:39 ET). No local or remote branch has a last-commit timestamp inside that window (closest is `feat/pedagogy-calibration` itself at 15:25 ET, i.e., after) — **whatever created these ran `tests/story-time-chrome.spec.js`'s self-provisioning fixture directly (e.g. manual/local Playwright runs), leaving no commit trail.** Cannot confirm from repo evidence alone whether this is still live. Per the prompt's own rule, touched nothing; carried into Phase 6 as an exclusion pending Sal's confirmation. The 2 July-6 rows are >24h stale and cluster nowhere near this activity — treated as ordinary orphans, not part of the same workstream.

**Remote branches** — `git branch -a` lists 23 local + 22 remote-tracking branches (see raw listing captured this run); all remote branches' last-commit dates predate 2026-07-07, except `origin/feat/pedagogy-calibration` (15:25 ET, Package B's own branch, already merged) and `origin/main` (15:30 ET). `content/manifest-r1` (local only, no `origin/` counterpart) is already merged into `main` (`e460a23` is an ancestor) — a stale local branch pointer, not a parallel workstream. No other local-only branch shows any commit in or after the suspicious July-7 window.

## FORENSICS — the "ball" event history and the adjudication
IN PROGRESS

## VERDICT — H-BY-DESIGN vs H-REGRESSION, with the exact mechanism and lines
IN PROGRESS

## FIX — what shipped, per the pre-specified branch taken
IN PROGRESS

## CLEANUP — accounts deleted, exclusions, before/after
IN PROGRESS

## VERIFICATION — tests vs 65 baseline, gates, walks
IN PROGRESS

## TRAPS — every reusable lesson from this run, phrased as standing rules
IN PROGRESS
