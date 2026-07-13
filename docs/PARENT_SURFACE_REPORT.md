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

**Gates**, all clean on `fix/parent-surface`:
- `npm run build` — clean.
- `npm run check:no-emoji` — "No emoji characters found in scoped UI source. OK."
- `npm run check:wordart-sync` — "WordArt REGISTRY and wordArtManifest.json agree (77 words). OK."
- `npx playwright test` (workers:1) — **56 passed, 45 skipped (need `DEPLOY_BASE_URL`), 0 failed**, 101 total (95 baseline + 6 new). No regressions vs. the Phase 0 baseline (50/45/0/95).
- `node --env-file=.env.local scripts/idor-proof.mjs` — **ALL CHECKS PASSED** (6 checks + 1 skip needing `DEPLOY_BASE_URL`, same as baseline). **Ownership/scope determination (explicit, per GUARDRAILS)**: the one new client-side query (`stories` read in `weeklyStats.js`) uses the exact same RLS policy (`supabase/migrations/0008...sql:20-26`, `parent_id = auth.uid()`) already governing every other `stories`-table consumer (`useStoriesQuery`, child-side) and every other Dashboard query (`learning_events`, `word_progress`, `child_profiles`) — no new table, no new RLS policy, no service-role bypass, no new server endpoint. This is a new *usage* of an already-scoped table, not a scope *change*, so no new idor-proof checks were added; the existing suite was run as a regression check and passed clean.

## PRODUCTION WALK (after fix)
IN PROGRESS

## LOGGED FOR LATER
- Migration 0037/0038 drift (known, pre-existing, unrelated to this fix — noted per GUARDRAILS' log-don't-fix list, not investigated).
- `getChildName()` display-name overflow for unusually long synthetic-email local-parts (pre-existing, unrelated, noted in `CLAUDE.md` already).
- No dedicated dev/staging Supabase project — this run's verification, like every prior run, executed against live production with disposable accounts cleaned up after (pre-existing, standing gap, already tracked in `CLAUDE.md`).
- Placement vs. check-in are not distinguishable from the client's current data shape (`child_profiles.placement_completed_at` is shared by both) — the insight describes either generically ("got measured," "a level check") rather than fabricating which one occurred. If a future feature needs to tell them apart client-side, that's a `product_events`/schema question out of this run's GUARDRAILS-forbidden scope.

## TRAPS
- Signed into the browser and found an already-logged-in **real "Aliya" account** from a prior session before creating the test account — caught before any interaction beyond one read-only screenshot; signed out via `localStorage.clear()`/`sessionStorage.clear()` rather than navigating into Aliya's own Grown-Ups/parent surface (which is exactly the kind of surface this task must never touch). Always check `tabs_context_mcp` / take a screenshot before assuming a fresh session.
- Claude-in-Chrome's `computer` tool cannot sustain the Grown-Ups screen's real ~1.8s `pointerdown`→`pointerup` hold gate (`src/screens/GrownUpsScreen.jsx`'s `Date.now()`-based `HOLD_MS`) — confirmed via the existing spec convention (`page.mouse.down()` / `waitForTimeout(2000)` / `page.mouse.up()`) instead, via a throwaway Playwright script, matching the memory note that this gate needs a real Playwright hold, not synthetic browser-extension events.
