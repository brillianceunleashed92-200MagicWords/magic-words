# FIX_PARENT_SURFACE_R1 — Parent Portal Must Tell the Truth

Executing `docs/FIX_PARENT_SURFACE_R1.md`. Branch: `fix/parent-surface` (off `main` @ `714b3b3`).

## SUMMARY
IN PROGRESS

## RUN TIMING
- Started: 2026-07-12, worktree `.claude/worktrees/fix-parent-surface` created off `main` (`714b3b3`), `npm install` clean.
- Phase 0 (recon + baseline): commit `4fa0b3b` (prompt doc + report scaffold). Local `npx playwright test` baseline: **50 passed, 45 skipped (need `DEPLOY_BASE_URL`), 0 failed**, 95 total, 29.1s.
- Phase 1 (reproduce incident on fresh disposable account, production): DONE, see BEFORE EVIDENCE below.
- Phase 2 (apply fix): IN PROGRESS.

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
IN PROGRESS

## VERIFICATION
IN PROGRESS

## LOGGED FOR LATER
IN PROGRESS

## TRAPS
IN PROGRESS
