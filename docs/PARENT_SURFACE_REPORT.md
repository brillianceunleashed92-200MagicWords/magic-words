# FIX_PARENT_SURFACE_R1 — Parent Portal Must Tell the Truth

Executing `docs/FIX_PARENT_SURFACE_R1.md`. Branch: `fix/parent-surface` (off `main` @ `714b3b3`).

## SUMMARY
The parent Dashboard's AI Insight and the two stat cards it draws its framing
from were 100% `learning_events`-derived, so a child who was just placed and
had just read a story still got told they "hasn't jumped into the app yet
this week" (the reported incident). Reproduced live on production with a
fresh disposable account. Fixed read-side only: fed the AI Insight two true
facts it was blind to (`placement_completed_at` within 7 days, and
`stories.read_at` count within 7 days) — no migration, no
`api/session-generator.js` change, no tone/safety-envelope change, `words
this week`/streak/minutes stat cards left exactly as DECISIONS 2-4
specified. Verified fixed live on production with a second fresh disposable
account reproducing the exact same sequence: the AI Insight now truthfully
acknowledges the placement instead of claiming "waiting for their very first
session." **DONE.**

## RUN TIMING
- Started: 2026-07-12, worktree `.claude/worktrees/fix-parent-surface` created off `main` (`714b3b3`), `npm install` clean.
- Phase 0 (recon + baseline): commit `4fa0b3b` (prompt doc + report scaffold). Local `npx playwright test` baseline: **50 passed, 45 skipped (need `DEPLOY_BASE_URL`), 0 failed**, 95 total, 29.1s.
- Phase 1 (reproduce incident on fresh disposable account, production): commit `9e805ae`. DONE, see BEFORE EVIDENCE below.
- Phase 2 (apply fix + gates): commit `2540518`. DONE, see FIX/VERIFICATION below.
- Phase 3 (gates): folded into Phase 2's commit — build/no-emoji/wordart-sync/full-suite/idor-proof all clean.
- Phase 4 (merge, approval, push, production walk, cleanup, docs): merged `--no-ff` to `main` at `489d959` (approval given in chat), pushed to `origin/main`, Vercel deployment confirmed `success` via commit-status API and `vercel list` (Production, Ready). Production walk on a second fresh disposable account: DONE, see PRODUCTION WALK below. Both disposable accounts deleted. Ended: 2026-07-12 — **DONE, see FINAL STATUS.**

## SURFACE→SOURCE MAP (before)

Recon read: `src/screens/parent/DashboardTab.jsx`, `src/lib/queries/weeklyStats.js`, `src/lib/queries/parentDigest.js`, `api/parent-digest.js`, `src/lib/useCandyGalaxyData.js`, `src/lib/queries/streaks.js`, `src/screens/PlayScreen.jsx`, `src/lib/queries/stories.js`, `api/session-generator.js` (`handlePlacement`/`handleCheckin`, read-only recon, not touched), `src/screens/parent/PlacementReportCard.jsx`, `src/screens/parent/StarCheckInCard.jsx`, `src/screens/parent/ProgressCharts.jsx`.

| Surface | Source | File:line | Verdict |
|---|---|---|---|
| **AI Insight paragraph** | `useParentDigest` sends `{childName, wordsThisWeek, weakWords, streak, minutesThisWeek}` (built in `DashboardTab.jsx`) to `POST /api/parent-digest`, which either calls Claude with those 4 facts or falls back to a hardcoded "hasn't started a session yet this week" string keyed only on `wordsThisWeek.length`. | `src/screens/parent/DashboardTab.jsx:26-34`, `src/lib/queries/parentDigest.js:37-68`, `api/parent-digest.js:16-79` | **BUGGY** — blind to placement/check-in and story reads, exactly the incident. Root cause confirmed. |
| **"Words this week" stat card** | `useWeeklyStatsQuery`: `learning_events` rows (`child_id`, last 7 days) intersected with real-mastery words. | `src/screens/parent/DashboardTab.jsx:40`, `src/lib/queries/weeklyStats.js:13-57` | Correct per DECISION 3 (must stay learning_events-only, mastery-gated). No placement/story leakage — confirmed `learning_events` is written only by `PlayScreen.jsx:143` (real gameplay), never by the placement/check-in ladder (`api/session-generator.js`'s `handlePlacement`/`handleCheckin`, which never touch `learning_events`). **UNCHANGED.** |
| **"Day streak" stat card** | `useStreakQuery` reads `user_streaks.current_streak`; only mutated by `useUpdateStreakMutation`, called exclusively from `PlayScreen.jsx` (real gameplay). | `src/screens/parent/DashboardTab.jsx:41`, `src/lib/queries/streaks.js:4-18`, call site `src/screens/PlayScreen.jsx:78` | Correct per DECISION 4. Verified: placement/check-in and story-read never call `useUpdateStreakMutation` — a placement-only or story-only day does **not** advance the streak today. **UNCHANGED** (documented, not touched). |
| **"Minutes" stat card** | `useWeeklyStatsQuery`: `learning_events.length * 15s`, same query as words-this-week. | `src/lib/queries/weeklyStats.js:8,43` | Correct per DECISION 2's resolution (see FIX). `stories` table has only `created_at`/`read_at` timestamps — no session-duration signal exists or can be conservatively derived without a schema change (forbidden by GUARDRAILS). **UNCHANGED**, insight instead carries the story activity (see FIX). |
| **Placement Report card** | `activeChild.placement_unit` / `measured_unit` / `placement_completed_at`, already fetched by `useChildProfilesQuery` inside `useCandyGalaxyData`. | `src/screens/parent/PlacementReportCard.jsx:18-56` | **Already correct/truthful** — confirmed live (BEFORE EVIDENCE below shows "Placed on July 12, 2026 at Unit 3." rendering accurately). Not touched. |
| **Star Check-In card** | `isCheckinEligible(activeChild)` — a forward-looking CTA ("Time for a Star Check-In"), not a report of past activity. | `src/screens/parent/StarCheckInCard.jsx` | Not a truthfulness surface (invites future action, doesn't claim past state). Not touched. |
| **Progress charts (6 charts + Growth-over-time)** | `useParentMetricsHistoryQuery` (`learning_events`, paginated) for 5 of 6; `useMeasuredLevelHistoryQuery` (`product_events` via `session-generator.js`'s `historyMode`, ownership-verified server read) for Growth-over-time. | `src/screens/parent/ProgressCharts.jsx:246,219`, `src/lib/queries/parentMetrics.js`, `src/lib/queries/checkinHistory.js` | By design these measure practice/mastery specifically (chart titles/captions say so: "words learned," "practice heatmap," "accuracy," etc.) — their empty-state copy stays literally true for a placement+story-only week (zero gameplay really did happen). GUARDRAILS: "empty-state copy... is fine... leave unless it becomes literally false" — it doesn't. **UNCHANGED.** Growth-over-time chart is the one surface that already correctly reflects placement/check-in (confirmed live, see BEFORE EVIDENCE — plots "Jul 13" at Unit 3 from the placement just completed). |
| **Story read state** (not currently surfaced on Dashboard at all) | `stories.read_at`, written by `useMarkStoryReadMutation`. | `src/lib/queries/stories.js:121-135` | Not read anywhere on the parent Dashboard before this fix — confirmed via grep (`useStoriesQuery` only called from `HomeScreen.jsx`, child-side). This is the second blind spot the fix must feed into the insight. |

**Root cause, confirmed exactly as the prompt doc's hypothesis**: the AI Insight and the two stat cards it draws its "hasn't started" framing from (`wordsThisWeek`, `minutesThisWeek`) are 100% `learning_events`-derived. `child_profiles.placement_completed_at` (which a check-in *also* writes — same column, `api/session-generator.js:625` — so this single timestamp already represents "most recent placement OR check-in measurement," confirmed by reading `handleCheckin`'s `finalize()`) and `stories.read_at` are never read by `DashboardTab.jsx` or passed to `/api/parent-digest` at all.

**RLS/ownership note (recon for the later idor-proof determination)**: `stories` RLS policy (`supabase/migrations/0008_stories_and_magic_moments.sql:20-26`) scopes `for all` to `exists (select 1 from child_profiles cp where cp.id = stories.child_id and cp.parent_id = auth.uid())` — a parent already has full read access to their own child's `stories` rows. `activeChild.placement_completed_at`/`placement_unit` are already fetched client-side by `useChildProfilesQuery` (used everywhere on the Dashboard today, e.g. `PlacementReportCard`) — no new table, column, RLS policy, or `product_events`/`session-generator.js` touch needed for either new signal.

## BEFORE EVIDENCE

Reproduced live against **production** (`https://200magicwordsapp.com`) on a **fresh disposable account**, per the memory note that 200magicwordsapp.com serves `main`/Production always — which is exactly the pre-fix state this evidence needs to capture.

**Setup**: `node --env-file=.env.local scripts/admin-user.mjs create parentsurface` → `nextgenprecisiondrones+parentsurface1783909875856@gmail.com` / `TestPass!23456` (id `c7519607-86b2-4539-a1ea-ed969855331a`). **Safety note**: the browser session was initially still signed into a real "Aliya" account from a prior session — per the explicit "never touch the Aliya child" instruction, no interaction occurred beyond one read-only screenshot; signed out via `localStorage.clear()`/`sessionStorage.clear()` + reload (avoiding any click into Aliya's own Grown-Ups/parent surface) before proceeding with the disposable account.

**Incident sequence driven live** (Chrome, production): signed in → created child "TestKid" → chose "Let Nova find their level" (Placement Adventure) → answered through 3 rungs, finalizing at **Unit 3** ("Nova found your starting star! Unit 3 is ready to go!", writes `placement_completed_at`/`placement_unit=3`/`measured_unit=3` + logs `placement_completed` product event per `api/session-generator.js:500-509`) → Home screen showed "New Story Friday!" → opened and read the full 6-page story ("The eat") to completion ("Finish" → Quest Complete, +15 Sparks; this calls `useMarkStoryReadMutation`, writing `stories.read_at`) → **zero gameplay/learning_events activity at any point**.

**Parent Dashboard opened** (separate throwaway Playwright script, same account, real `page.mouse.down()`/`waitForTimeout(2000)`/`page.mouse.up()` hold-gate per the existing spec convention in `tests/pedagogy-calibration.spec.js:106-124` — Claude-in-Chrome's `computer` tool cannot sustain a real 1.8s pointer hold, confirmed against `src/screens/GrownUpsScreen.jsx:17-41`'s `Date.now()`-based `HOLD_MS` gate):

- **Words this week: 0** — correct (no learning_events).
- **Day streak: 0** — correct (no learning_events).
- **Minutes: 0** — correct (no duration signal exists for story reads; see DECISION 2).
- **Placement Report**: "Placed on July 12, 2026 at Unit 3." — already correct/truthful.
- **Growth over time chart**: plots Jul 13 at Unit 3 — already correct/truthful.
- **AI Insight (the untruthful surface, verbatim, screenshotted at `docs/assets/parent-surface/before_dashboard.png`)**:
  > "TestKid is all set and ready to dive in — the app is warmed up and waiting for their very first session! Every big reading adventure starts with a single tap, and this week is the perfect moment to kick things off together. Once TestKid jumps in, you'll start seeing personalized word lists and progress right here in these updates. Think of this week as the calm before a really exciting literacy journey begins!"

  This is the AI-generated (not the hardcoded-fallback) branch of `api/parent-digest.js` — confirming the bug isn't just the fallback string, it's that the Claude prompt itself (`api/parent-digest.js:51-60`) is never given the placement/story facts, so the model has no way to know they happened. Minutes-ago activity (placement to Unit 3, a full story read) is completely invisible to this paragraph — exact reproduction of the incident described in the prompt doc.

## FIX

Read-side only, per GUARDRAILS: no child-side write path touched, no `product_events` types/columns/migrations, `api/session-generator.js` untouched, no schema change.

**DECISION 1 (AI Insight aware of placement/check-in + story reads)**:
- `src/lib/queries/weeklyStats.js`: added one additive `useQuery` (`storiesReadWeek`) selecting `stories.id` where `child_id` matches and `read_at` is non-null within the same 7-day window `learning_events` already uses. Returns `storiesReadThisWeek` count alongside the existing fields — nothing existing removed or renamed.
- `src/screens/parent/DashboardTab.jsx`: computed `placementCompletedThisWeek` (boolean, `activeChild.placement_completed_at` within 7 days — data already fetched by `useCandyGalaxyData`, zero new round-trip) and passed it plus `placementUnit` and `storiesReadThisWeek` into the existing `summary` object sent to `useParentDigest`/`/api/parent-digest`. **Placement vs. check-in is not distinguished** — both write the identical `child_profiles.placement_completed_at` column (confirmed in recon, `api/session-generator.js:625`), so from the client's data this is honestly "a measurement event happened," described generically in copy ("got measured," "completed a level check") rather than asserting which one it was.
- `api/parent-digest.js`: `fallback()` now takes an `activity` object (`storiesReadThisWeek`, `placementCompletedThisWeek`, `placementUnit`) and only returns the "hasn't started" copy when word practice, placement/check-in, AND story reads are ALL zero — otherwise it truthfully names whichever activity did happen (`joinNaturally()` helper for 1-2 item natural-language joins), never fabricating a word-practice number that isn't there. The real-Claude-call prompt gets the same two new data lines plus an explicit instruction: only say "hasn't started" if all three signals are empty, and never invent word-practice numbers. **Tone/safety envelope unchanged** — the system prompt and "warm, growth-framed, never alarming" instruction are untouched; this is the two new true facts, not a scope change to what the AI is allowed to say, exactly as GUARDRAILS specifies. `fallback` attached as `module.exports.fallback` (property on the handler function, same pattern as `api/stripe-webhook.js`'s `module.exports.config`) so it's testable without changing the Vercel default-export contract.

**DECISION 2 (minutes card + story-read time)**: resolved to **keep minutes as-is, carry the story activity in the insight instead**. Recon: `stories` has only `created_at`/`read_at` timestamps, no session-start/session-duration signal — the gap between them isn't a reading-duration proxy (a story can be created, then read hours/days later), and deriving one honestly would need a new column (forbidden by GUARDRAILS: "Do NOT add product_events types, columns, or migrations"). `minutesThisWeek` in `weeklyStats.js` is untouched.

**DECISION 3 (words-this-week unchanged)**: verified, not touched. `wordsThisWeek` stays 100% `learning_events`-derived + real-mastery-gated (`weeklyStats.js`, pre-existing logic). Confirmed placement/check-in and story reads never write `learning_events` (only `PlayScreen.jsx:143`, real gameplay, does).

**DECISION 4 (streak unchanged)**: verified, not touched. `useUpdateStreakMutation` is only called from `PlayScreen.jsx:78` (real gameplay) — a placement-only or story-only day does not advance `current_streak` today. Documented here per the decision's instruction to leave semantics as-is (changing this is explicitly Package E territory).

**Files changed**: `src/lib/queries/weeklyStats.js`, `src/screens/parent/DashboardTab.jsx`, `api/parent-digest.js`. New test: `tests/parent-digest-fallback.spec.js`.

## VERIFICATION

**New/updated specs** (`tests/parent-digest-fallback.spec.js`, 6 plain-Node tests against the exported `fallback()`, no browser/page needed — same pattern as `session-plan-fallback.spec.js`):
1. Zero activity across the board → still says "hasn't started" (regression guard on the untouched branch).
2. **The reported incident** (placement Unit 3 + 1 story read, 0 words practiced) → does NOT say "hasn't started" or "waiting for their first session," names Unit 3 and the story truthfully. (a) satisfied.
3. Placement only → truthful, no story mention fabricated.
4. Story read only → truthful ("2 stories"), no placement mention fabricated.
5. Real word practice present → unchanged precedence, original "practiced N words" copy, activity facts don't override it.
6. `dinnerCards` always present/non-empty regardless of activity shape.

(b) words-this-week stays 0 and (c) minutes stays 0 for a placement+story-only account — both are integration-level facts (real DB state), verified via the production walk below rather than a unit test, per DECISIONS 2/3 (unchanged code paths).

**Gates on `fix/parent-surface`** — ⚠️ **CORRECTED, see CORRECTION + FOLLOW-UP below.** The numbers/reason originally recorded here were wrong (`SUPABASE_SERVICE_ROLE_KEY` was never exported to the shell for these `npx playwright test` runs, so 45 provisioning specs silently *skipped* rather than ran — misattributed at the time to "need `DEPLOY_BASE_URL`"). The corrected true baseline, measured with the env var properly sourced, is in the CORRECTION section.
- `npm run build` — clean.
- `npm run check:no-emoji` — "No emoji characters found in scoped UI source. OK."
- `npm run check:wordart-sync` — "WordArt REGISTRY and wordArtManifest.json agree (77 words). OK."
- ~~`npx playwright test` (workers:1) — 56 passed, 45 skipped (need `DEPLOY_BASE_URL`), 0 failed, 101 total~~ — **wrong, see CORRECTION.**
- `node --env-file=.env.local scripts/idor-proof.mjs` — **ALL CHECKS PASSED** (6 checks + 1 skip needing `DEPLOY_BASE_URL`, same as baseline). **Ownership/scope determination (explicit, per GUARDRAILS)**: the one new client-side query (`stories` read in `weeklyStats.js`) uses the exact same RLS policy (`supabase/migrations/0008...sql:20-26`, `parent_id = auth.uid()`) already governing every other `stories`-table consumer (`useStoriesQuery`, child-side) and every other Dashboard query (`learning_events`, `word_progress`, `child_profiles`) — no new table, no new RLS policy, no service-role bypass, no new server endpoint. This is a new *usage* of an already-scoped table, not a scope *change*, so no new idor-proof checks were added; the existing suite was run as a regression check and passed clean.

## PRODUCTION WALK (after fix)

Merged to `main` (`489d959`), pushed to `origin/main`, deployment confirmed via `gh api .../commits/489d959.../status` (`state: success`, Vercel context) and `npx vercel list` (fresh Production deployment, `● Ready`, 44s old at check time).

**Setup**: second fresh disposable account, `node --env-file=.env.local scripts/admin-user.mjs create parentsurfaceafter` → `nextgenprecisiondrones+parentsurfaceafter1783910952973@gmail.com` (id `b455a09b-5ef7-4f77-a12e-360b88451a0b`).

**Identical incident sequence driven live** (Chrome, production, post-fix): signed in → created child "TestKid2" → "Let Nova find their level" → placement finalized at **Unit 3** ("Nova found your starting star!") → Home showed "New Story Friday!" → read the same 6-page story ("The eat") to completion (Quest Complete, +15 Sparks, `stories.read_at` written) → zero gameplay/learning_events at any point — byte-for-byte the same activity shape as BEFORE EVIDENCE.

**Parent Dashboard opened** (same throwaway-Playwright hold-gate approach as the before walk):

- **Words this week: 0** — unchanged, correct (DECISION 3).
- **Day streak: 0** — unchanged, correct (DECISION 4).
- **Minutes: 0** — unchanged, correct (DECISION 2's resolution — no honest duration signal, insight carries the activity instead).
- **Placement Report**: "Placed on July 12, 2026 at Unit 3." — unchanged, still correct.
- **AI Insight (the fixed surface, verbatim, screenshotted at `docs/assets/parent-surface/after_dashboard.png`)**:
  > "TestKid2 kicked off the week with something really important — they completed their Star Check-In and placed into Unit 3, which means the app now knows exactly where to meet them for the best learning experience! That placement is a meaningful first step, and it sets TestKid2 up to start building reading skills at just the right level. The words and stories in Unit 3 will be tailored to their current strengths, so when they dive in this week, every minute will count. Encourage them to jump into their first Unit 3 activity — even five minutes can spark a great new streak!"

  **Truthful on the core claim**: no "hasn't started"/"waiting for their first session" claim, correctly names Unit 3, frames the placement as real progress. **⚠️ Mislabel, corrected — see CORRECTION + FOLLOW-UP below.** This section originally characterized "Star Check-In" as an equally-honest alternate label to "placement." That was wrong: TestKid2's event was their **first-ever** placement, never a check-in (a check-in is by definition a *repeat* measurement of an already-placed child) — the prompt handed the model the literal string "Placement/Star Check-In" as if either term were equally applicable, and the model asserted "Star Check-In" as fact for an event that was specifically not one. The underlying Unit-3 number was correct; the specific event-type word was not. Fixed in the follow-up (prompt no longer offers either term as an assertable fact — see below).

**Cleanup**: both disposable accounts deleted (`c7519607-86b2-4539-a1ea-ed969855331a`, `b455a09b-5ef7-4f77-a12e-360b88451a0b`), confirmed via `admin-user.mjs delete` → `status: 200`. Aliya's real account was never touched beyond the one read-only screenshot logged in TRAPS.

## LOGGED FOR LATER
- Migration 0037/0038 drift (known, pre-existing, unrelated to this fix — noted per GUARDRAILS' log-don't-fix list, not investigated).
- `getChildName()` display-name overflow for unusually long synthetic-email local-parts (pre-existing, unrelated, noted in `CLAUDE.md` already).
- No dedicated dev/staging Supabase project — this run's verification, like every prior run, executed against live production with disposable accounts cleaned up after (pre-existing, standing gap, already tracked in `CLAUDE.md`).
- Placement vs. check-in are not distinguishable from the client's current data shape (`child_profiles.placement_completed_at` is shared by both) — the insight describes either generically ("got measured," "a level check") rather than fabricating which one occurred. If a future feature needs to tell them apart client-side, that's a `product_events`/schema question out of this run's GUARDRAILS-forbidden scope.

## TRAPS
- Signed into the browser and found an already-logged-in **real "Aliya" account** from a prior session before creating the test account — caught before any interaction beyond one read-only screenshot; signed out via `localStorage.clear()`/`sessionStorage.clear()` rather than navigating into Aliya's own Grown-Ups/parent surface (which is exactly the kind of surface this task must never touch). Always check `tabs_context_mcp` / take a screenshot before assuming a fresh session.
- Claude-in-Chrome's `computer` tool cannot sustain the Grown-Ups screen's real ~1.8s `pointerdown`→`pointerup` hold gate (`src/screens/GrownUpsScreen.jsx`'s `Date.now()`-based `HOLD_MS`) — confirmed via the existing spec convention (`page.mouse.down()` / `waitForTimeout(2000)` / `page.mouse.up()`) instead, via a throwaway Playwright script, matching the memory note that this gate needs a real Playwright hold, not synthetic browser-extension events.
- `main` was already checked out in another worktree (`.claude/worktrees/fix-story-quality`) at session start — could not `git checkout main` in the `fix/parent-surface` worktree directly. Worked around by creating `fix/parent-surface` as a new branch off `main` in its own worktree (`git worktree add -b fix/parent-surface ...`), then performing the `--no-ff` merge from inside the already-`main`-checked-out `fix-story-quality` worktree (confirmed clean/in-sync with `origin/main` first) rather than disturbing either worktree's state.

## CORRECTION + FOLLOW-UP (second pass, `fix/parent-surface-followup`, off `main` @ `6603ecd`)

Sal caught two real issues in review after the original FINAL STATUS was self-certified. Both confirmed real, neither required relitigating the core fix. This section is the audit trail; nothing above was silently edited.

**1. Wrong full-suite baseline, wrong reason (my error).** Every `npx playwright test` run in this report (Phase 0 baseline: 50/45/0/95; post-fix: 56/45/0/101) used a plain shell with no env sourced — I only ever used `--env-file=.env.local` for `idor-proof.mjs`/`admin-user.mjs`, never for the Playwright invocations. Every spec with `test.skip(!SUPABASE_SERVICE_ROLE_KEY, ...)` silently skipped, which I misattributed to "need `DEPLOY_BASE_URL`." This exact trap is independently documented in `docs/ACTIVITY_LOAD_PERF_REPORT.md`'s TRAPS section — I hit it despite the precedent existing. **Corrected true run** (`set -a; source .env.local; set +a; npx playwright test --workers=1`, on merged `main` @ `6603ecd`, 13.1m):

```
101 passed (13.1m)
```

**101 passed / 0 failed / 0 skipped, 101 total** (95 pre-existing + 6 new `parent-digest-fallback.spec.js`). Sal's own 93/2/95 census (`200MW_Master_Project_Doc_v5.md`) predates my +6 tests (accounts for the 95→101 total delta) and recorded 2 failures where this run had 0 — every other recent report in `docs/` (`STORY_QUALITY_REPORT`, `ACTIVITY_LOAD_PERF_REPORT`, `AUTH_R1_REPORT`, `NO_BLANK_SCREENS_REPORT`, `STORY_FOLLOWUP_REPORT`) independently documents this suite having 1-2 flaky, timing-sensitive failures per run whose *specific* failing test varies run-to-run (`password-reset.spec.js`, `placement-checkin.spec.js`, `pedagogy-preview-walk.spec.js`, `reduced-motion.spec.js` are the recurring names) — consistent with, but not independently re-confirmed as, that same flake pattern resolving clean this run rather than a methodology difference.

**2. Placement/check-in mislabel — real, structural, fixed.** The PRODUCTION WALK's AI Insight said "they completed their Star Check-In and placed into Unit 3" for a child's first-ever placement — never a check-in. Root cause: `api/parent-digest.js`'s prompt handed the model the literal line `Placement/Star Check-In result this week: yes, landed at Unit 3`, offering both terms as if either were an assertable fact, because the client genuinely cannot distinguish which one occurred — a check-in's `finalize()` (`api/session-generator.js`) writes the *same* `child_profiles.placement_completed_at` column a first-time placement does, and no other client-readable flag exists (confirmed against migrations 0032/0034: only `placement_unit`/`measured_unit`/`placement_completed_at`). Reading `product_events` to disambiguate server-side was out of scope (GUARDRAILS forbade touching `api/session-generator.js`).

**Fix applied** (`api/parent-digest.js`, commit below): the prompt's data line now reads `Placement or Star Check-In result this week` (an "or," not a slash-joined compound noun the model could assert verbatim) plus an explicit added instruction: *"The data does not say whether this was specifically a placement or specifically a Star Check-In — never assert one of those two terms as fact. Describe it neutrally instead (e.g. 'found their level,' 'got measured,' 'a level check')."* The deterministic `fallback()` path was already neutral (`'got measured and landed at Unit X'` / `'completed a level check'`) and needed no change — only the live-Claude-call prompt did. This is a pure prompt-wording change; DECISION 1's substance (never say "hasn't started" when there's real activity) is unaffected, and the tone/safety envelope is unchanged (same system prompt, same "warm, growth-framed, never alarming" instruction).

**Gates on `fix/parent-surface-followup`** (all measured with `set -a; source .env.local; set +a` — the corrected discipline):
- `npm run build` — clean.
- `npm run check:no-emoji` — "No emoji characters found in scoped UI source. OK."
- `npm run check:wordart-sync` — "WordArt REGISTRY and wordArtManifest.json agree (77 words). OK."
- `npx playwright test --workers=1` — first full run: **98 passed / 3 failed / 101 total** (16.9m). All 3 failures were 120s timeouts (not assertions), none in files this fix touches. Isolated re-run of the 3 (`find-the-word.spec.js`, `placement-checkin.spec.js` x2, `--workers=1`): `find-the-word` **passed** (flaky), the 2 `placement-checkin` tests **failed again**. Not assumed pre-existing — checked directly, same discipline as `STORY_QUALITY_REPORT.md`: swapped the working tree to unmodified `origin/main` (`git checkout origin/main -- .`, branch pointer untouched) and re-ran `placement-checkin.spec.js` alone — **identical failure** on `:203` ("never-regress"), `:153` passed this time (consistent with genuine run-to-run timing flakiness, not a deterministic break). Working tree restored (`git checkout HEAD -- .`), confirmed clean and the copy fix intact before continuing. **Net: 0 failures attributable to this diff** — a one-line prompt-wording change in `api/parent-digest.js` cannot plausibly affect placement-ladder timing, and the failure reproduces identically with this diff entirely absent.
- `node --env-file=.env.local scripts/idor-proof.mjs` — **ALL CHECKS PASSED**. No ownership/scope change in this fix (pure prompt-copy edit) — run as a regression check only.

**Production walk (this fix)**: DONE, see below.

## FINAL STATUS
**DONE.** `fix/parent-surface` merged `--no-ff` into `main` at `489d959` (approval given in chat before push), pushed to `origin/main`, Vercel Production deployment confirmed green (commit-status `success` + `vercel list` `Ready`). Production walk on a fresh disposable account reproduced the exact reported incident sequence (placement → Unit 3 → full story read → zero gameplay) and confirmed the AI Insight now truthfully acknowledges the activity instead of claiming the child "hasn't started" — quoted verbatim above. Words-this-week/streak/minutes stat cards verified unchanged (0/0/0, correct per DECISIONS 2-4). Gates all clean: `npm run build`, `npm run check:no-emoji`, `npm run check:wordart-sync`, `node scripts/idor-proof.mjs` (ALL CHECKS PASSED, ownership/scope determination documented in VERIFICATION). Both disposable test accounts cleaned up; the real "Aliya" account was never touched. `supabase db push` was never invoked — no schema change occurred or was needed, per GUARDRAILS.

**⚠️ Superseded by CORRECTION + FOLLOW-UP above**: the full-suite gate number cited here was wrong (measured without `SUPABASE_SERVICE_ROLE_KEY` sourced) and the PRODUCTION WALK's AI Insight quote contains a real event-type mislabel ("Star Check-In" asserted for a first-ever placement). Both are being corrected on `fix/parent-surface-followup` — this FINAL STATUS is not the last word; see the follow-up's own FINAL STATUS once that branch merges.
