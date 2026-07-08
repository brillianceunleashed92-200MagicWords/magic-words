# FEAT_QUICK_WINS_R1 — REPORT (Package E)

Branch: `feat/quick-wins` · Prompt: `docs/FEAT_QUICK_WINS_R1.md`

## RUN TIMING
- **Start**: 2026-07-08
- **Phase 0/1 (recon + locked decisions)**: done, 2026-07-08
- **End**: —

## RECON — current state per item

### 1. Streak freeze
- **Schema (live, confirmed via direct query)**: `user_streaks(user_id,
  current_streak, longest_streak, last_activity_date, streak_freeze_count
  int NOT NULL DEFAULT 1, timezone text DEFAULT 'America/New_York',
  updated_at, child_id)`. `streak_freeze_count` **already exists** —
  every new row starts holding 1 freeze by column default.
- **Decision point (client, not a server function)**:
  `src/lib/queries/streaks.js`'s `useUpdateStreakMutation` — reads
  `daysDiff` between `last_activity_date` and today, and **already
  implements consumption**: `daysDiff===1` → streak++; `daysDiff===2 &&
  freezes>0` → streak++ AND `freezes--` (freeze silently spent, no
  telemetry); `daysDiff===2 && freezes===0` or `daysDiff>=3` → reset to
  1. Called from `src/screens/PlayScreen.jsx` (two call sites: natural
  session end, and early-exit-with-progress) — this is the exact
  reset-vs-increment decision point per the architecture note.
- **What's missing**: (a) grant/accrual — `streak_freeze_count` only ever
  decreases today, nothing ever increments it back after the initial
  column-default 1 is spent; (b) telemetry
  (`streak_freeze_used`/`streak_freeze_granted`) — consumption is silent;
  (c) a UI indicator for a held freeze — none exists on the dashboard
  streak pill (`Pill value={streak.current_streak} label="Streak"
  variant="fire"` in `HomeScreen.jsx`) or anywhere else.
- **No migration needed for the freeze count itself** — but the locked
  rule ("grant 1 at the start of each ISO week... if holds 0") needs to
  know WHEN a freeze was last granted, and no such column exists
  (`updated_at` changes on every streak write, not specifically grants —
  unusable as a grant-tracking field). **A migration is required**: one
  new nullable column, `freeze_last_granted_at date`. See STREAK FREEZE
  section below for the migration text and STOP.

### 2. Sleeping stars
- **Star Keeper ladder** (`src/lib/starKeeper.js`) — `REVIEW_LADDER_DAYS
  = [1,3,7,14,30]`, `isStarSleepy(nextReviewAt, now)` — **already exists,
  untouched by this run** (architecture note honored by construction: no
  edits planned to this file).
- **Already wired into data, not yet into the Galaxy grid**:
  `useCandyGalaxyData.js` already computes `w.sleepy =
  isStarSleepy(p.next_review_at)` per word and aggregates `sleepyStars =
  words.filter(isRealMastery && sleepy)`. `HomeScreen.jsx` already shows
  **one** sleepy word as a "getting sleepy" nudge card
  (`sleepyStars[0]`), but tapping it calls the same `onStartQuest` handler
  as the normal current-word CTA — `CandyGalaxyShell.jsx`:
  `onStartQuest={(word) => { setQuestWord(word); setNavTab('play'); }}` —
  which launches a **normal focus-word session**, not `reviewOnly`.
- **Word Galaxy grid** (`src/screens/GalaxyScreen.jsx`,
  `pathWords`/`GalaxyPath`): status derivation is
  `premium|done|current|inProgress|locked` — **no sleepy/asleep status
  exists here at all**. `onNodeTap={onOpenWord}` → same
  `setQuestWord`+navigate-to-play pattern, always a normal session.
- **`reviewOnly` launch entrypoint (client)**:
  `src/screens/PlayScreen.jsx` — `gameType==='flash_cards'` (Quiz Boss's
  internal id) triggers `generateReviewPlan()`
  (`useSessionPlan.js`), which POSTs `{ childId, reviewOnly: true }` to
  `/api/session-generator`. `gameType` is **internal PlayScreen state**,
  only ever set via `QuestPath`'s `onSelectActivity` (the in-screen game
  picker) — there is no existing prop to force-launch directly into
  `flash_cards`/review without going through the picker. This run adds
  one (`initialGameType` prop, set when navigating from a sleepy-star
  tap).

### 3. Session Complete framing
- Component: `SessionComplete` in `src/games/GameEngine.jsx` (lines
  783-977). Currently shows a GLOBAL words-shining bar: `masteredCount /
  totalWordCount` where both come from `useCandyGalaxyData()`
  (`masteredCount` = all-200-words mastered count, `totalWordCount =
  words.length` = 200), passed in from `PlayScreen.jsx`'s
  `<SessionComplete masteredCount={masteredCount}
  totalWordCount={words.length} .../>`.
- **No unit name/label exists anywhere** — not in the `words` table (no
  `unit_name` column, confirmed via live schema query), not in any JS
  constant (searched for a `UNIT_NAMES`/`UNIT_LABELS`-style map — none
  exists; only code comments mention example unit topics). Every other
  surface that shows a unit (`StoryScreen`'s catalog cover, Word Galaxy)
  uses the bare "Unit N" form, no friendly category name. This run
  follows that same existing convention rather than inventing 18 new
  category names with no source of truth.
- `unitsById` (unit number → words in that unit) is already available
  from `useCandyGalaxyData()` and already destructured in
  `PlayScreen.jsx`. The session's own unit is derivable from the played
  words' `.unit` field (looked up against the already-loaded `words`
  array).

### 4. Minutes label
- Computation: `src/lib/queries/weeklyStats.js` — `SECONDS_PER_EVENT =
  15` (documented proxy, "no dedicated session-duration tracking exists
  yet"), `minutesThisWeek = Math.round((events.length *
  SECONDS_PER_EVENT) / 60)`.
- Render site: `src/screens/parent/DashboardTab.jsx` — a 3-stat hero grid
  (`Words this week` / `Day streak` / `Minutes`), Minutes cell currently
  renders the bare rounded number with an uppercase "MINUTES" caption, no
  estimate framing, no note. This screen is the Grown-Ups → Dashboard tab
  (behind the hold+math gate, confirmed via `GrownUpsScreen.jsx`'s
  `TABS` array and gate logic).

### 5. Settings 375px clip
- `src/screens/GrownUpsScreen.jsx` — `TABS` array (`Dashboard`,
  `Moments`, `Mastery Map`, `Settings`), rendered as a `flex` row with
  `overflowX: 'auto'` and each button `flexShrink: 0`. Reproduced live
  (see SETTINGS 375px section) before diagnosing the exact cause rather
  than guessing from source alone.

### 6. Password reset flake
- Component: `src/pages/UpdatePassword.jsx` — a standalone route (not
  inside the authenticated shell, deliberately, per its own header
  comment), `status` state machine (`checking|ready|invalid`) driven
  entirely by an `onAuthStateChange` listener attached in a `useEffect`
  on mount; the form only renders once `status==='ready'`.
- **No explicit `verifyOtp` call exists anywhere in app source** — the
  real production flow relies entirely on `detectSessionInUrl` (PKCE
  `flowType`, on by default) auto-processing a `?code=...` param from
  `resetPasswordForEmail`'s redirect. The TEST fixture
  (`tests/password-reset.spec.js`) uses a documented, deliberate
  workaround: `admin.generate_link`'s `action_link` produces
  implicit-flow hash tokens a PKCE client rejects, so the test instead
  extracts `hashed_token` and calls `supabase.auth.verifyOtp({token_hash,
  type:'recovery'})` directly in-page — the same call a real PKCE
  `token_hash`-style link's processing would make.
- Reproduction happens in PASSWORD RESET section below (RULE 6:
  reproduce-before-fix) — recon alone doesn't reveal a smoking gun in
  `UpdatePassword.jsx` itself (the form is correctly gated behind
  `status==='ready'`), so the race is either in event-ordering between
  `INITIAL_SESSION`/`PASSWORD_RECOVERY`, or a test-fixture-only artifact.
  Determined by actually running the existing spec repeatedly against
  unmodified `main` before touching any code.

## LOCKED DECISIONS TABLE (Sal-ratified, recorded verbatim)

1. **Streak freeze rule v1**: hold at most 1 freeze; grant 1 at the start
   of each ISO week if the child has an active streak (`current_streak >
   0`) and holds 0; on a missed day (`daysDiff===2`), if a freeze is
   held, auto-consume it and preserve the streak (log
   `streak_freeze_used`); two consecutive missed days (`daysDiff>=3`)
   still reset regardless of freeze count — only one freeze exists and
   it's spent on the first gap; a freeze never manufactures streak beyond
   one protected day.
   - **Feasibility**: confirmed. Consumption logic already exists
     (recon above); this run adds grant/accrual at the same decision
     point, gated on a new `freeze_last_granted_at` column (see
     migration, STREAK FREEZE section).
2. **Minutes label**: keep the `SECONDS_PER_EVENT`-derived number; render
   it as an estimate. **Exact copy**: value renders as `"~{n} min"` (e.g.
   `"~12 min"`); micro-note beneath the stat grid: `"Minutes are an
   estimate based on activity, not a timer."`
   - **Feasibility**: confirmed, pure display change at the existing
     render site, no re-instrumentation.
3. **Sleeping stars**: stars past `next_review_at` render "asleep"
   (dimmed via existing tokens — reduced opacity + desaturate on
   `--sun`), no emoji; tapping one wakes it into the existing
   `reviewOnly` review. Not-due stars are visually/behaviorally
   unchanged.
   - **Feasibility**: confirmed. Dimming is additive to `GalaxyScreen`'s
     existing status derivation; wake-to-review needs a small,
     additive `initialGameType` prop on `PlayScreen` (recon above) —
     not a new endpoint, not a fork of the review path.

**Other exact copy strings locked here** (so nothing is invented
mid-implementation):
- **Session Complete unit framing** (replaces "{masteredCount} /
  {totalWordCount} words shining"): `"Unit {unit} · {N} of {M} word-stars
  shining"` — bare "Unit N" per the existing app-wide convention (no
  invented category names — recon above confirms none exist anywhere in
  the data model or code).
- **Freeze-held indicator** (small pill/badge near the streak pill, only
  rendered when `streak_freeze_count > 0`): label `"Freeze ready"`, icon
  from `src/components/icons` (a shield/snowflake-style icon — see
  STREAK FREEZE section for the exact icon chosen), `--chunk-sm` +
  press-down since it's informational only (not interactive/tappable —
  a freeze auto-consumes, there's no manual "use freeze" action per the
  locked rule).
- **Freeze-consumed micro-acknowledgment** (shown once, next session
  after a freeze was auto-consumed — read from the just-fetched
  `streak_freeze_used` fact, not a modal): reuses the existing streak
  pill's tooltip/speak-on-tap pattern if one exists (checked during
  implementation), else a small one-line toast: `"Your streak froze
  through {missed date} — freeze used!"` (exact wording finalized in
  STREAK FREEZE section once the render surface is confirmed live).

## STREAK FREEZE

**Migration written, STOP-and-present for approval before `supabase db
push`** (per RULE 2 — a column is needed, as predicted):

`supabase/migrations/0037_streak_freeze_grant_tracking.sql`:
```sql
alter table public.user_streaks
  add column if not exists freeze_last_granted_at date;
```

One nullable column. No backfill, no data migration, no RLS change
(existing `"Users manage own streak"` policy — `auth.uid() = user_id`,
all commands — already covers it). Reasoning: consumption already exists
(recon); accrual needs to know when a freeze was last granted so it
fires at most once per ISO week, and no existing column can safely stand
in for that (`updated_at` changes on every streak write, not just
grants).

**STOP: awaiting Sal's approval before `supabase db push`.** There is no
separate dev/staging Supabase project (documented pre-existing gap,
`magic-words/CLAUDE.md`'s own "Open item" section) — this migration can
only be meaningfully tested once applied to the one real project, so
Phase 2's client logic is written below but its live verification is
blocked until approval lands. Continuing with the rest of Package E's
independently shippable items (sleeping stars, display honesty, Settings
clip, password reset) in the meantime, per the mission's own "each item
is independently shippable" framing — not idling on this one approval.

**Migration 0038 also approved and pushed** — `streak_freeze_granted`/
`streak_freeze_used` added to `product_events_event_type_check`, plus
the matching `api/track.js` `EVENT_SCHEMAS` entry (both client-posted,
same commit per RULE 3 — this pair is NOT server-only like
`checkin_started`/`checkin_completed`, since the decision point is
entirely client-side, recon above).

**Rule as shipped** (`src/lib/streakFreeze.js`, pure/zero-import —
directly testable, same precedent as `masteryCalibration.js`/
`starKeeper.js`):
- `isEligibleForFreezeGrant({currentStreak, freezeCount,
  freezeLastGrantedAt, today})` — true iff `currentStreak > 0 &&
  freezeCount === 0 && (freezeLastGrantedAt is null OR
  isoWeekStartString(freezeLastGrantedAt) !== isoWeekStartString(today))`.
- Wired into `src/lib/queries/streaks.js`'s `useUpdateStreakMutation` —
  the exact decision point recon identified — evaluated AFTER the
  existing consumption math (using the POST-consumption
  streak/freeze-count), so a freeze spent this same call can be
  immediately replenished if it's already a new ISO week (this is what
  makes "accrual restores one freeze the next ISO week" true even for a
  child whose gap-day lands right at a week boundary).
- Telemetry: fire-and-forget `track('streak_freeze_used', {}, childId)`
  / `track('streak_freeze_granted', {}, childId)` (extended
  `src/lib/queries/track.js`'s existing `track()` helper to accept an
  optional `childId`, matching `PlayScreen.jsx`'s inline `scaffold_down`
  call's shape) — never blocks the streak write itself.
- UI indicator: `HomeScreen.jsx`, a small `--chunk-sm`-weight badge
  ("Freeze ready" + new `IconShield`, `src/components/icons/index.jsx`)
  under the existing streak/words/sparks pill row, shown only when
  `streak_freeze_count > 0`. Non-interactive by design (locked rule: a
  freeze auto-consumes, there's no manual "use freeze" action), so no
  press-down/tap semantics — just the same visual weight class the
  card's other chips use.

**Real bug found and fixed by the pure-function tests, not live
behavior** (`tests/streak-freeze.spec.js`): the first `isoWeekStartString`
implementation used `new Date("2026-07-06")` + `.toISOString()`. A
bare-date string constructor parses as **UTC midnight**, which shifts to
the previous calendar day the instant the runtime's local timezone
offset is negative (any US timezone) — `new Date("2026-07-06")` becomes
"2026-07-05, 8pm" locally, a Sunday, not Monday, corrupting the whole
week-boundary calculation (a real Monday input resolved to the *prior*
week's Monday). Fixed by parsing/computing/formatting entirely in local
calendar terms (split the string into y/m/d and construct
`new Date(y, m-1, day)`, never round-trip through `toISOString()`) —
matches `streaks.js`'s own existing local-calendar convention
(`Intl.DateTimeFormat('en-CA', {timeZone: tz})` for
`last_activity_date`). Caught by 2 of the 7 new pure-function tests
failing on the first run, fixed, all 7 pass now.

**Freeze-kept vs no-freeze-reset twins**: exercised live in Phase 7's
fixture-driven Playwright spec (below), not simulated — the pure-function
tests above cover eligibility exhaustively; the actual upsert/consumption
path needs a real `user_streaks` row and a real session completion to
prove end to end.
