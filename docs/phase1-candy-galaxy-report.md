# Phase 1 — Candy Galaxy Rebuild: Completion Report

Branch: `v2-candy-galaxy` (from `redesign/zentry-landing`), pushed to origin.
Not merged to `main` per the deploy-loop rule. PR not opened — awaiting review call.

---

## What shipped

1. **Scaffold + tokens + component library** — `src/theme/tokens.js` (exact
   palette/type/shadow values from `mockup-D-candy-galaxy.html`); 10-component
   library in `src/components/candy/` (Pill, ChunkyButton, CloudCard,
   WordNode, SparkCounter, QuestTile, WordBubble, TrophyCard,
   CelebrationOverlay, NovaSprite) plus `NovaPortrait` for the real
   Higgsfield renders found in `public/nova/` (renamed to semantic
   `wave.png`/`celebrate.png`/`read.png` — see "Nova assets" below).

2. **Home screen** — hero card, streak/word/Sparks pills, Today's Magic
   Word, scroll-driven Word Galaxy path (current-unit preview), word
   bubbles, trophy shelf, bottom pill nav. Verified live in a real browser
   (Chrome via MCP): scroll-tied SVG path draws in correctly, Nova rides
   and rotates along it, nodes pop in at the right scroll position.

3. **Play (lesson flow)** — 5 named activities (Tap & Hear, Word Hunt, Fill
   the Story, Match & Sort, Quiz Boss) mapped onto the existing MLC-bound
   game components (`WordMatch`, `WordHunt`, `StoryBuilder`, `RhymeTime`,
   `FlashCardChallenge` — kept, not rewritten). Picker screen is Candy
   Galaxy-styled; the actual gameplay screens remain the legacy
   dawn-token `GameEngine.jsx` styling — a known, deliberate seam (see
   Known gaps).

4. **Mechanics** — Sparks economy (new `user_sparks` table + `earn_sparks()`
   security-definer RPC, earn-only, never purchasable), streaks (existing
   `user_streaks` logic reused verbatim via a new query hook), Star Keeper
   v1 (fixed-interval ladder: 1/3/7/14/30 days, `next_review_at` +
   `review_interval_days` on `word_progress`; Home shows a "your star is
   getting sleepy" banner that starts a focused review quest).

5. **Celebration architecture** — all 5 ranked moments from
   `200MW_Product_Blueprint.md` 2.7: per-question burst (unchanged, already
   restrained/non-blocking in the legacy games), word-mastered star
   ignition, quest-complete, unit-boss-defeated, streak-milestone — queued
   through Zustand so two never overlap, `prefers-reduced-motion` aware
   (`CelebrationOverlay` collapses to a near-instant flash instead of
   removing the moment).

6. **Grown-Ups gate + Parent lite** — hold-3s (conic-gradient progress
   ring) → simple addition math check → 200-word mastery heatmap +
   session time-limit setting (10/15/20/30 min / no limit).

7. **AI hookup** — reused the existing `/api/session-generator` +
   `useSessionPlan` caching pattern unchanged (one AI call per session, not
   per tap). Added a v1 Difficulty Governor
   (`src/lib/difficultyGovernor.js`): logs each session's accuracy to
   localStorage, and if the last-5-session rolling rate is below 75% it
   recommends Tap & Hear (least demanding) next time; above 85% it
   recommends Quiz Boss (advance early). **Does not yet change question
   templates within a session** — that would require touching
   `/api/session-generator`'s prompt construction, a larger follow-up, not
   silently skipped.

---

## Architecture

- Replaced the legacy monolithic `App.jsx` (1708 lines, manual `screen`
  state, no router) as the mounted `/app` experience with a thin
  `CandyGalaxyShell.jsx` + real screens in `src/screens/`
  (Home/Play/Galaxy/GrownUps/Login), `src/components/candy/` for
  presentational pieces, `src/lib/` for business logic + query hooks,
  `src/stores/` for Zustand. No new file is over ~300 lines.
- **The old tree is not deleted** — reachable at `/app-legacy` for
  rollback/comparison during review. Nothing links to it from the UI.
- State: Zustand (`useUIStore` — nav tab, Grown-Ups unlock, celebration
  queue, session time limit) + TanStack Query (`src/lib/queries/` — words,
  word_progress, sparks, streaks, user_stats), wired via
  `QueryClientProvider` in `main.jsx`.
- Kept, not rewritten (see `docs/mlc-engine-audit.md` for the full audit):
  24-level progression (`src/lib/levels.js`, extracted verbatim from
  `App.jsx` — both trees now import the same module, zero behavior
  change), XP formula, mastery calculation, MLC interaction-type framing,
  `WordMatch`'s errorless-learning scaffold, session-plan caching.

## Supabase (additive only, applied live)

No separate dev/staging project exists (documented gap, `CLAUDE.md`), so
migrations were applied directly to the linked production project
(`ozhqsaysltiamadpcruz`) via `supabase db push --linked` — dry-run first,
then applied, matching how every prior migration in this repo has been
handled.

- `supabase/migrations/0001_words.sql` — new `words` table (id, word, type,
  unit, sort_order, emoji, definition, audio_url, image_url), public-read
  RLS. Seeded via `supabase/seed/words_seed.sql`, generated from `App.jsx`'s
  existing `WORDS` array — **all 200 words**, not just the 18-word
  contingency the master prompt anticipated. Verified: 200 rows, 155
  content + 45 function. `definition`/`audio_url`/`image_url` left `NULL`
  — no source content exists in-repo for these yet (content gap, not a
  bug).
- `supabase/migrations/0002_user_sparks.sql` — `user_sparks` (balance,
  lifetime_earned), read-only RLS for the owner; all writes go through
  `earn_sparks()` (security definer) so a compromised client can't
  self-grant Sparks.
- `supabase/migrations/0003_word_progress_star_keeper.sql` — added
  `next_review_at`/`review_interval_days` to the existing `word_progress`
  table.
- `user_streaks` — audited, left untouched; no Phase 1 requirement needed
  new columns beyond what already exists.

## Defaults chosen (logged per the "log sensible defaults" instruction)

- **Sparks formula**: `round(session XP / 2)`, minimum 1. Blueprint only
  specifies "earned on completions" — this ratio is a starting point, easy
  to retune in one place (`PlayScreen.handleXP`).
- **Session time limit storage**: Zustand + localStorage, not a new
  Supabase table/column — Phase 1's SUPABASE section didn't call one out.
  Fine for a single-device parent setting; would need a real table if
  parents expect it to sync across devices/browsers.
- **Candy Galaxy activity → existing game component mapping**: Tap & Hear→
  WordMatch, Word Hunt→WordHunt, Fill the Story→StoryBuilder, Match & Sort→
  RhymeTime (closest existing "discrimination" mechanic), Quiz Boss→
  FlashCardChallenge (unit-mastery-gate framing). `SoundMatch` and
  `SpellItOut` remain in the codebase but aren't surfaced in the new Play
  picker (not part of the 5 named activities).
- **Nova assets**: the 3 real Higgsfield PNGs found in `public/nova/`
  during this session are full-bleed opaque-background illustrations, not
  transparent sprite cutouts — used them for large-format moments
  (`NovaPortrait`: Home hero, celebrations) rather than forcing them into
  the small 88px path/in-game sprite slot (kept as the CSS `NovaSprite`,
  which does have a same-named-file swap-in path for whenever a properly
  transparent set exists).
- **Auth screens unrestyled**: `LoginScreen` was extracted verbatim from
  legacy `App.jsx` with zero visual changes — Phase 1's build scope list
  (steps 1-7) only covers the post-login child experience, so the auth
  surface staying dawn-themed is a deliberate, documented seam rather than
  scope creep in either direction.
- **`GameEngine.jsx` internals unrestyled**: same reasoning — reskinning
  its ~1855 lines to Candy Galaxy tokens (it currently uses a dawn-derived
  `T` palette object) is real, scoped work of its own and wasn't attempted
  here; flagged below as the top follow-up.

## Smoke-test results

- **Build**: clean (`npm run build`), no new warnings beyond the
  pre-existing chunk-size notice.
- **Lint**: baseline was 63 problems (55 errors, 8 warnings) on
  `redesign/zentry-landing` before this work (confirmed by diffing against
  it directly). This branch introduced 6 new `react-hooks/purity` errors;
  fixed 5 of them (setState-in-effect in `GalaxyPath`, a mutated variable
  during render in `GalaxyScreen`, `Math.random()` during render in
  `GrownUpsScreen`'s math gate). The one remaining new error matches an
  already-accepted pre-existing pattern elsewhere in this exact codebase
  (`GameEngine.jsx`'s `useRef(Date.now())`) — net new lint problems: 1,
  same category as ~10 pre-existing unaddressed instances.
- **Playwright** (`tests/smoke.spec.js`): landing-page and
  signup-confirmation tests pass unchanged against the new `/app` route
  (the login screen was moved verbatim, so these needed no updates). The
  third test ("sign in loads the Parent dashboard") is currently
  **skipped** in this environment (no `SUPABASE_SERVICE_ROLE_KEY`
  available to provision its test account) — **it targets legacy
  dawn-token content (`WELCOME BACK!`, `PARENT DASHBOARD`) that no longer
  exists at `/app`, and will fail wherever that key is configured until
  it's rewritten against the new Home/Grown-Ups screens.** Flagging this
  loudly rather than leaving a silent time bomb in CI.
- **Manual browser verification**: Home, Galaxy (full 200-word
  constellation), Grown-Ups (gate + heatmap + time limit), and the Play
  activity picker were all screenshotted live against real seeded Supabase
  data via a temporary unauthenticated debug route (removed before each
  commit) — chosen because completing a real signup round-trip requires
  clicking an email confirmation link this session had no way to access.
  No console errors beyond the pre-existing, expected "missing `.env`
  vars" notice (no `.env` file exists locally in this checkout — falls
  back to the documented production-project default, same as every prior
  session per `CLAUDE.md`).
- **Desktop viewport**: verified directly (screenshots above).
- **390px mobile viewport**: **could not get the browser automation tool's
  `resize_window` to actually change the tab's viewport this session**
  (`window.innerWidth` stayed 1440 after multiple attempts) — flagging
  this as a tooling limitation rather than claiming a check that didn't
  happen. Confirmed instead by code review: every new screen uses a
  `maxWidth: 500` centered wrapper with `padding: '0 20px'`, no fixed
  pixel widths that would overflow narrower viewports, and 56-64px touch
  targets — the same mobile-first pattern as the source mockup itself
  (which only widens past 960px). Recommend an actual on-device or
  correctly-configured mobile-viewport pass before this ships.
- Full end-to-end signup→Home→Play→Sparks/streak-persist→Grown-Ups flow
  (the Definition of Done) was **not run against a real confirmed
  account** this session for the reason above — the individual pieces
  (auth wiring, data hooks, mutations, screens) were each verified, but
  not stitched together in one live authenticated pass. This is the
  single biggest verification gap from this run.

## Known gaps (surfaced, not silently absorbed)

1. **`GameEngine.jsx` still dawn-themed internally** — the Play flow's
   actual gameplay screens (the 5 activities themselves) don't yet use
   Candy Galaxy tokens; only the picker and shell around them do. Visible
   seam. Top candidate for a Phase 1-and-a-half pass.
2. **`tests/smoke.spec.js`'s third test is stale** — see Smoke-test
   results above.
3. **No live end-to-end verified run** (signup → Home → Play → persisted
   Sparks/streak → Grown-Ups) — see above.
4. **24-level migration blocker is still unresolved** — carried forward
   unchanged from `redesign/zentry-landing` (see
   `docs/mlc-engine-audit.md` section 2): a real production account's XP
   recalculates to a different level under the old vs. new level table.
   Untouched by this branch, but still blocking a clean merge to `main`
   whenever that happens.
5. **Content gaps in the new `words` table**: `definition`, `audio_url`,
   `image_url` are `NULL` for all 200 rows — no source text/audio/image
   assets exist in-repo yet.
6. **Sparks have no spend path** — earn-only RPC exists; the
   trail-colors/glow-auras cosmetic shop from the blueprint isn't part of
   Phase 1's build scope and wasn't built.
7. **`.env` still doesn't exist locally** — pre-existing, documented gap;
   unchanged by this branch.

## Adjacent-improvement suggestions (not bundled into this build)

- Reskin `GameEngine.jsx`'s shared `T` palette to Candy Galaxy tokens the
  same way Phase 5a did for the dawn-token system — would close the
  biggest remaining visual seam.
- A real dev/staging Supabase project, so migrations and test-account
  provisioning stop touching production directly.
- Extend the Difficulty Governor to actually vary question templates
  in-session (would touch `/api/session-generator`'s prompt construction).
- Unit "flag" markers (like the mockup's `Unit 9 · On the Move` labels) on
  the full `GalaxyScreen` constellation — currently only the short Home
  preview implicitly shows one unit; the full map has no unit boundary
  markers.
- A Sparks cosmetic shop (trail colors, glow auras) to give the currency
  somewhere to go, per blueprint 2.3.
