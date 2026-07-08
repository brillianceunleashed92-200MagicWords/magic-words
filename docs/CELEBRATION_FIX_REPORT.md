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

**Account**: `drmarionsformula+devicetest@gmail.com` (Sal's own device-test account — read-only queries only, per rule 3). Child `263fdbe4-61fd-44e9-bce1-0aca5224e43f`.

**Package B deploy timestamp**: merge `633d68e` 2026-07-07 15:26:15 ET, push+deploy confirmed by `a8504fd` 15:30:32 ET (= **19:26–19:30 UTC**). The bug screenshot is 2026-07-07 ~15:39 ET = **19:39 UTC**, 9–13 minutes post-deploy.

**Full ordered `learning_events` history for `word='ball'`, this child:**

| recorded_at (UTC) | game_type | correct | attempt_number |
|---|---|---|---|
| 2026-07-07 11:06:49.435885 | word_match | true | 1 |
| 2026-07-07 11:15:46.307230 | word_match | true | 1 |
| **2026-07-07 19:39:05.239654** | word_match | true | **3** |

`word_progress` row (current): `mastery=100, correct_count=3, attempt_count=3, last_seen=19:39:05.027`.

**`attempt_number` reliability, checked not assumed**: the two morning rows (11:06, 11:15 UTC) both predate Package B's 19:26 UTC deploy and both read `attempt_number=1` — this is the documented pre-deploy hardcoded value (`PlayScreen.jsx`'s own comment: "reliable for today's rows if they postdate B's production deploy; historical rows are not backfilled"), **not** evidence of a reset/race — a genuine second attempt that morning was simply mis-logged as "1" because the real wiring wasn't live yet. Only the 19:39:05 UTC row postdates the deploy, and it is the *only* row this adjudication can trust.

**Adjudication**: `word_progress` shows exactly 3 total attempts, all correct (`correct_count=3, attempt_count=3`, mastery=100). The single post-deploy `learning_events` row carries `attempt_number=3` — consistent with the real, true attempt count at that moment (2 real attempts that morning, both correct, whatever their mislogged `attempt_number`, then this 3rd correct answer). `isRealMastery(100, 3)` is true; the child's own two prior attempts (`attempt_count` 1 and 2, both real) were each `< MIN_ATTEMPTS_FOR_MASTERY_CELEBRATION`, so `wasMasteredBefore` was false at both of those points and true only from this 19:39:05 answer forward. **One clean crossing, exactly here, no earlier crossing, no duplicate row for it.** This rules out a stale-baseline double-fire or a wrong-word mislabel at the write-path/DB level — the crossing arithmetic itself is correct.

**The bare-gradient render — explained from the code (Phase 0) and confirmed live (Phase 2):**
- `GameEngine.handleAnswer` (`src/games/GameEngine.jsx:1101`) calls `onProgress?.(...)` — i.e. `PlayScreen.handleProgress` — **without awaiting it**. `handleProgress` is `async` and does `await saveWordProgress.mutateAsync(...)` (a real Supabase network round trip, `src/lib/queries/wordProgress.js:44-60`) *before* computing `wasMasteredBefore`/`isMasteredNow` and calling `queueCelebration` (`src/screens/PlayScreen.jsx:115-168`).
- On the session's last question, `handleAnswer` proceeds (after only an awaited chime, ~1s) straight to `onSessionEnd?.(...)` (`GameEngine.jsx:1144`), which is `PlayScreen.handleSessionEnd` — this sets `sessionResult`, swapping `<GameEngine>` for `<SessionComplete>` (`PlayScreen.jsx:392-409`).
- Because `onProgress` was never awaited, `handleSessionEnd` can run to completion — and the screen can transition — **before** the still-in-flight `handleProgress` promise resolves and calls `queueCelebration`. The orphaned promise keeps running after its originating screen has moved on (JS doesn't cancel it on unmount) and pushes into the **global** Zustand celebration queue, drained by `<CelebrationRenderer/>` (`src/components/candy/CelebrationRenderer.jsx`), which is mounted once at the `CandyGalaxyShell` level (`src/CandyGalaxyShell.jsx:155`) — a portal-style overlay completely decoupled from whichever screen happens to be mounted underneath it at that later moment (`SessionComplete`, `HomeScreen`, or — if `HomeScreen`'s own `isLoading` gate is still true, e.g. `src/screens/HomeScreen.jsx:59-67` — a literally bare sky-gradient div with only a "Loading your galaxy…" line, no chrome, no path).
- **Live confirmation** (`tests/zz-celebration-repro.spec.js`, temporary Phase 2 spec, deleted before merge): seeded a fresh disposable child so unit 1's fallback quiz plan (`buildSupabaseFallbackPlan`, ascending-mastery stable sort) selects exactly `cat,dog,bird,fish,bear,ball` — "ball" last (sort_order 6 of 8) — then delayed every `word_progress` REST call 3s. Answered "ball" correctly as the 6th/last question (crossing attempt 3). ~1.2s later the screen already read **"Session Complete! ... Words you practiced ... 8/200 words shining"** with **no** ignition text present. ~3.5s after that (once the delayed write resolved), the SAME screen's body text now also contained **`"ball" star ignited!`** layered on top of the already-rendered Session Complete card. This is the exact decoupling: the crossing/celebration fired only after the qualifying answer's own screen had already been replaced.

## VERDICT — H-BY-DESIGN vs H-REGRESSION, with the exact mechanism and lines

**H-BY-DESIGN**, on both halves of the prompt's own framing:

1. **Frequency**: the crossing at 19:39:05 UTC is real and singular — attempt_count reached 3 with mastery=100, exactly the `isRealMastery` predicate Package B moved every reader onto. No duplicate learning_events row, no evidence of a stale cached baseline re-triggering an already-crossed word, no wrong-word mislabeling. Package B's attempt-gating (no more one-tap roll-forward) is precisely why this crossing landed mid/end-of-session instead of on literally every word's first correct tap as it effectively did before — more real crossings land near a session's last question now, which is when the race below is most visible.
2. **Placement** (bare gradient) is a **pre-existing structural defect**, not something Package B's diff introduced: `onProgress` has never been awaited by `GameEngine.handleAnswer`, and `CelebrationRenderer` has always been a shell-level global overlay decoupled from screen lifecycle. Package B didn't create this race; it made crossings common enough (and now correctly attempt-gated, meaning they often coincide with a session's final, mastery-defining rep) that the pre-existing race is hit far more often and is now visibly reported. Per the prompt's own rule, this must be — and is — explained and fixed regardless of verdict.

**Exact mechanism, with lines**: `GameEngine.jsx:1101` (`onProgress?.(...)`, not awaited) → `PlayScreen.jsx:115-168` (`handleProgress`, awaits a network call before detecting the crossing) racing against `GameEngine.jsx:1144` (`onSessionEnd?.(...)`, fires ~1s later regardless) → `PlayScreen.jsx:392-409` (screen swap to `SessionComplete`) → orphaned promise resolves later and calls `queueCelebration`, rendered by the global `CelebrationRenderer` (`CandyGalaxyShell.jsx:155`) on top of whatever is mounted by then, which can be a screen with no lesson chrome at all (`HomeScreen.jsx:59-67`'s bare loading gate) if navigation continued past Session Complete before the celebration fired.

## FIX — what shipped, per the pre-specified branch taken

Verdict was H-BY-DESIGN, so Phase 3's H-BY-DESIGN containment (a)/(b)/(c) was implemented, plus the bare-gradient path closed either way per the prompt's own rule:

**(a) Anchor the ignition to the qualifying answer's own celebration beat.** `src/games/GameEngine.jsx`:
- `handleAnswer` now captures `onProgress`'s returned promise (`const progressPromise = onProgress?.(...)`) instead of firing it truly-forgotten. Mid-session pacing is untouched — the next question still advances (`setCurrentIdx`) without waiting on it.
- Only on the session's **last** question does the code `await progressPromise` — immediately before `setSessionDone`/`onXP`/`onSessionEnd`. This guarantees `PlayScreen.handleProgress`'s mastery-crossing check (and any `queueCelebration` call) has already run before the screen can swap to Session Complete.
- The same race exists via a second door — a manual close tapped right after answering (`handleExitEarly`), which doesn't go through the last-question branch at all. Added `lastProgressPromiseRef` (updated on every `handleAnswer` call) and `await lastProgressPromiseRef.current` at the top of `handleExitEarly`, before it calls `onExitEarly`.

**(b) Defer-to-Session-Complete backstop.** `src/screens/PlayScreen.jsx`: a `sessionEndedRef`, set `true` at the top of both `handleSessionEnd` and `handleExitEarly`. The `wordMastered`/`unitBoss` `queueCelebration` calls are now gated on `!sessionEndedRef.current` — Session Complete's own `masteredThisSession` recap (already pushed to `masteredThisSessionRef` just above, unconditionally) still carries the word even when this guard trips. With (a) in place this should be unreachable in the primary path; kept as a backstop for any future caller of `queueCelebration` that doesn't offer (a)'s guarantee.

**(c) At most one ignition per word per day.** New `src/lib/celebrationDedup.js` (`hasCelebratedToday`/`markCelebratedToday`, localStorage-keyed `mw:celebrated:{childId}:{word}:{YYYY-MM-DD}`). Deliberately client-side/localStorage, not a migration: cumulative mastery (`correct_count/attempt_count`) can dip below 80% after a later miss and legitimately re-cross the same day, and this is a presentation-rate-limit, not data any other device/the server needs to agree on — no schema change, no approval-gated migration needed for this branch (that requirement in the prompt is scoped to the H-REGRESSION branch).

**Bare-gradient path — closed.** The mechanism was CelebrationRenderer (global, shell-level) rendering on whatever screen a *late, orphaned* `queueCelebration` call happened to land on. (a) removes the lateness/orphaning at the source — the celebration is now queued in the same synchronous flow that precedes the screen swap, so there is no window during which navigation can outrun it. Confirmed live (see VERIFICATION below): the gap between Session Complete first rendering and the ignition catching up went from **2815ms to 0ms** on the identical delayed-network repro.

**Scope boundary, deliberately not touched**: the stored mastery formula, `isRealMastery`'s threshold/attempt floor, `pathComplete`/`streakMilestone` celebrations (already synchronously sequenced inside `handleSessionEnd`'s own await chain, not orphaned), and `CelebrationRenderer`'s own queue-draining mechanics.

## CLEANUP — accounts deleted, exclusions, before/after

**48 rows found** across every listed disposable pattern (`candygalaxy20260701`, `mwnoemoji*`, `mwsmokesignup*`, `idora*`/`idorb*`, `mwftseat*`, `mwrm*`, `mwstorytime*`, `mwftw*`):

| Prefix | Count | Date range |
|---|---|---|
| `candygalaxy20260701` | 1 | 2026-07-02 |
| `mwnoemoji*` | 25 | 2026-07-03 |
| `mwsmokesignup*` | 4 | 2026-07-03 – 2026-07-06 |
| `idora*`/`idorb*` | 4 | 2026-07-03 |
| `mwftseat*` | 1 | 2026-07-05 |
| `mwrm*` | 4 | 2026-07-05 – 2026-07-06 |
| `mwstorytime*` | 6 | 2026-07-06 (×2) + **2026-07-07 13:10/14:13/14:33/14:42 ET (×4)** |
| `mwftw*` | 3 | 2026-07-06 (×1) + **2026-07-07 14:25/14:41 ET (×2)** |

**Exclusion, beyond what the prompt named**: the prompt's rider only calls out "the two newest `mwstorytime*` rows." This run's own fresh query (Phase 0.5) found **4** `mwstorytime*` rows from 2026-07-07, not 2, and a fresh check on `mwftw*` (not named in the prompt at all) surfaced **2 more** July-7 rows landing in the exact same 13:10–14:42 ET window. All 6 of these July-7 rows cluster tightly enough (and align with the Phase 0.5 "no matching branch/commit" finding) that treating only 2 of them as "the live workstream" and deleting the other 4 would be arbitrary. **Kill list excludes all 6** — the 4 `mwstorytime*` and 2 `mwftw*` July-7 rows — pending Sal's confirmation on liveness; everything else (42 rows, all >24h stale relative to this run and matching an unambiguous disposable-fixture pattern) is proposed for deletion.

**Kill list (42 rows)**: `candygalaxy20260701` (1) + `mwnoemoji*` (25) + `mwsmokesignup*` (4) + `idora*`/`idorb*` (4) + `mwftseat*` (1) + `mwrm*` (4) + `mwstorytime*` 2026-07-06 only (2) + `mwftw*` 2026-07-06 only (1).

Presented to Sal for one explicit confirmation before executing (approval gate, per rule 4 and the Phase 6 rider itself). **Confirmed by Sal.**

**Executed**: `auth.users` count **53 → 11** (42 deleted, verified — one delete initially returned no confirmation in the batch loop's output and was caught by a post-delete re-query, then deleted individually; final re-query confirms all 42 gone). Remaining 11 = the 6 excluded July-7 rows (4 `mwstorytime*`, 2 `mwftw*`) + 5 other real/non-matching accounts untouched by this rider. Re-ran the exact same orphan query post-delete: **zero rows** from any killed pattern remain; only the 6 intentionally-excluded rows are still present.

## VERIFICATION — tests vs 65 baseline, gates, walks

**Baseline correction, checked not assumed**: `npx playwright test --list` against `main` (pre-this-run) shows **67** tests in 26 files, not 65 — 2 more than the prompt's assumed baseline (Package B's own report claimed 65 at its close-out; something added 2 more between that close-out and this run starting, most plausibly whatever produced the unexplained `mwstorytime*` accounts in Phase 0.5 — not chased further, out of scope for this run beyond the Phase 0.5 flag already filed). This run's own obligation ("only add") is measured against the real, verified 67, not the stale 65: new total is **69** (67 + 2 new tests in `tests/celebration-timing.spec.js`), confirmed via `playwright test --list`. Nothing removed or renamed.

**New spec** (`tests/celebration-timing.spec.js`, Phase 4, permanent):
1. `crossing at attempt 3 fires exactly one ignition, anchored to its own answer` — same sibling-mastery fixture as the Phase 2 repro (cat/dog/bird/fish/bear/book/cup pre-mastered, "ball" seeded at attempt_count=2 so its 3rd correct answer both crosses and ends the 6-question session), 1.5s artificial delay on every `word_progress` write. Asserts the gap between Session Complete first rendering and the ignition catching up is `< 1000ms` (was 2815ms pre-fix, measured directly — see FIX section) and that the ignition doesn't reappear after dismissal.
2. `remount/refetch after a crossing fires zero additional ignitions` — plays the same session to a natural crossing, dismisses the ignition, navigates Home then back into Play (unmount/remount + `wordProgress` refetch), then does a full page reload (forces every query to refetch from scratch). Asserts no ignition text reappears either time.

Both pass against the fixed code (`npx playwright test tests/celebration-timing.spec.js` — 2/2, ~1.2min). Temporary Phase 2 repro spec (`tests/zz-celebration-repro.spec.js`) deleted before this commit, per its own header comment.

**Gates** (Phase 7, local):
- `npm run build` (chains `check-wordart-sync`, `check-stroke-coverage`, `check-findtheword-sync`, `check-activitydefs-sync`, `check-mastery-predicate-sync`, `vite build`) — **clean**.
- `npm run check:no-emoji` — **OK**, no emoji in scoped UI source.
- `npm run check:wordart-sync` — **OK**, 77 words agree between REGISTRY and manifest.
- `node --env-file=.env.local scripts/idor-proof.mjs` — **ALL CHECKS PASSED** (6/6 local checks; the 2 `DEPLOY_BASE_URL`-gated live-endpoint checks skip locally as designed, re-run against the deployed preview below).
- Full Playwright suite (`workers:1`, 69 tests): **66 passed, 3 failed** on the first full run (12.9min). All 3 investigated, not assumed benign:
  - `celebration-timing.spec.js` (new, this run) — timed out at 90s in the full-suite run; re-ran standalone (with the other 2 failures) and **passed clean, 2/2, ~36-37s each** — consistent with resource contention after 60+ prior tests' worth of account provisioning in one sequential run, not a real defect.
  - `pedagogy-preview-walk.spec.js` — failed asserting Home showed `"cat"` (showed an in-progress "bear" question instead); re-ran standalone and **passed clean, 2/2**, including its live production run confirming "cat" still stays current through attempts 1-2 and crosses real mastery at attempt 3 exactly as before this fix. Same contention conclusion.
  - `password-reset.spec.js` (`verifyOtp establishes recovery session...`) — failed both in the full run and standalone. **Verified pre-existing and unrelated**: reproduced identically (`expect(oldResult.errorCode).toBe('invalid_credentials')` → received `undefined`) against unmodified `main` in a throwaway `git worktree`, with zero relation to any file this run touched (auth/password-reset code, untouched by this fix). Not this run's regression — flagged as a standing issue, not blocking this ship.
  - Re-ran the two contention-flaked specs standalone: **all pass**. Full suite total: **68/69 passing** (68 = 66 + 2 re-confirmed), 1 known pre-existing unrelated flake (`password-reset.spec.js`), 0 real regressions from this fix.

**Preview deploy + walk**: pushed `fix/celebration-timing` to origin (feature branch, no approval needed per rule 4). GitHub commit status (Vercel) → `success`; deployment environment URL `https://magic-words-5v3ko7w89-brillianceunleashed92-6054s-projects.vercel.app` (via `gh api .../deployments/<id>/statuses`).
- `node --env-file=.env.local scripts/idor-proof.mjs` with `DEPLOY_BASE_URL` set → **ALL CHECKS PASSED, 20/20** (the 2 that skip locally — `create-portal-session`/`session-generator` live-endpoint checks — ran for real this time, plus every `track` scaffold_down/childId check).
- Preview walk (temporary probe spec, deleted after use): seeded a fresh disposable child identically to the local fixture. **Discovery**: against the real server-side `api/session-generator.js` (unlike the local client-fallback `buildSupabaseFallbackPlan` `celebration-timing.spec.js`'s fixture relies on), a real-mastered word is excluded from the candidate pool entirely and the one non-mastered word ("ball") is placed **first**, not last — same behavior `pedagogy-preview-walk.spec.js` already documented for "cat." So this walk couldn't reproduce the exact last-question race shape live (production's candidate selection can't be forced into that shape from outside); instead it confirmed live: "ball"'s ignition appeared **1917ms** after the qualifying answer, anchored inside the still-active activity (not a bare/later screen) — and a reload afterward showed **no stray re-fire**. The precise last-question race (and its fix) is proven with tighter control by the local network-delay repro (2815ms → 0ms gap, see FIX/VERIFICATION above), which production's opaque server-side selection can't replicate on demand.

## TRAPS — every reusable lesson from this run, phrased as standing rules
IN PROGRESS
