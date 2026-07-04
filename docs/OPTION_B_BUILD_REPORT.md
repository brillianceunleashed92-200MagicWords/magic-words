# Option B — Guided Path Build Report

Branch: `option-b-guided-path` (backup tag on main: `pre-option-b-backup`)
Status: IN PROGRESS

## Pre-flight

- [x] `git fetch --all --prune`, confirmed clean tree on `main`, up to date with origin.
- [x] Tagged `pre-option-b-backup` on main, pushed to origin (rollback point).
- [x] Created and checked out `option-b-guided-path`.
- [x] Confirmed `.env.local` has Supabase vars.
- [x] Codebase discovery complete (see "Critical architecture correction" below).

## CRITICAL ARCHITECTURE CORRECTION (read first)

**CLAUDE.md is badly stale for this exact screen.** The live app is NOT the
`App.jsx` monolith CLAUDE.md describes. `src/main.jsx` routes: `/` → Landing,
**`/app` → `CandyGalaxyShell.jsx` (the real live app)**, `/app-legacy` →
`App.jsx` (mechanically proven unreachable — nothing links to it; this is
now enforced by `scripts/check-no-emoji.mjs`'s reachability-graph check,
which throws if `/app-legacy` or its dependents are ever wired back in).
`GameEngine.jsx`'s `GameTypeSelector`/`GAME_TYPES`/`MLC_TYPES`/`UpgradeModal`
are only reachable from that dead legacy tree — real premium gating, MLC
category tags, and 8-of-11-activity coverage all live only in dead code.
An entire undocumented rewrite (Candy Galaxy v2 — `src/screens/*`,
`src/components/candy/*`, a Sparks economy, `src/stores/useUIStore.js`
celebration queue) happened after CLAUDE.md's last update and was never
folded back into it. Built against the real live tree below.

**The actual screen being replaced**: `src/screens/PlayScreen.jsx` (224
lines), rendered by `CandyGalaxyShell.jsx` when `navTab === 'play'`. It
already says "Today's Quest" as its heading. Its `ACTIVITIES` array (11
items: word_match, word_hunt, story_builder, rhyme_time, flash_cards,
word_builder, draw_it, story_time, word_song, magic_video, say_it) is
rendered as a static 2-column grid with **zero eligibility gating** — every
activity is always tappable for every word, gold-border "RECOMMENDED"
badge is the only per-word signal (from `difficultyGovernor.js`'s
`suggestActivity`, advisory only). This is the real gap Option B closes.

**`learning_events` schema drift, verified directly against the live DB**:
the committed `supabase/add_learning_events.sql` only defines
`id/user_id/word/correct/game_type/response_time_ms/created_at`, but the
**live table** also has `child_id`, `attempt_number`, `recorded_at`
(default `now()`), and `session_id` — none of the last three are in any
committed migration. Confirmed via `information_schema.columns` against
production. This means `PlayScreen.jsx`'s insert (which uses
`attempt_number`) and `weeklyStats.js`'s read (which uses `recorded_at`)
both actually work — the repo's migration history just doesn't reflect
live reality. Verified RLS: `Users manage own events` policy scoped to
`auth.uid() = user_id`, so a child-scoped read (`child_id` + `word` +
`recorded_at >= today`) is safe to build the guided path's completion
tracking on. **This is the only real "did the child do X today" signal
that exists — there is no live "Today's Quest" completion concept prior
to this build** (CLAUDE.md's `questsCompleted` object is legacy-only; a
`QuestTile.jsx` component that looks purpose-built for this is fully dead
code, zero import sites).

**`words` table also has real schema drift worth knowing**: `useWordsQuery`
(consumed by every live screen via `useCandyGalaxyData`) selects
`id, word, type, teaching_track, unit, sort_order, emoji, definition,
audio_url, image_url` — it does **not** select `word_type` or `has_art`,
even though both are real, populated columns (verified: `word_type` is the
fine-grained noun/verb/adjective/function classification `api/session-
generator.js`/`WordArt.jsx` use; `type` is a coarser content/function flag;
`has_art` is real and populated for the same word set confirmed earlier).
Every word row, even ones with real WordArt, still carries a populated
`emoji` DB value (e.g. cat → 🐱) — but the only live consumer of `.emoji`
(`WordIcon.jsx`, via `WordGalaxyMap.jsx`) is mechanically proven
unreachable, so this isn't a live bug today, just dormant data. **Extended
`useWordsQuery` to also select `word_type`/`has_art`** (additive, safe) so
Option B's eligibility gate has real data to check — see below.

**Sparks/celebration infrastructure, more complete than expected**:
`useUIStore.js` has a generic `celebrationQueue` (drained one at a time,
never overlapping) rendered by `CelebrationRenderer.jsx` via
`CelebrationOverlay.jsx` (respects `usePrefersReducedMotion`, clamps
duration rather than skipping). Four types already exist:
`wordMastered`/`questComplete`/`unitBoss`/`streakMilestone`. **Found: the
`questComplete` type's payload shape (`wordsCorrect/totalWords/
sparksEarned`) is clearly built for "a single quiz session just ended,"
but `PlayScreen.jsx` never actually queues it** — only `StoryScreen.jsx`
does, on finishing a story. This is a real, pre-existing gap, logged as a
DEFERRED audit finding rather than fixed here (see rationale below) —
wiring it in would mean a full-screen celebration after every one of up to
11 activities per word, which cuts against this app's own documented
"mastery is the reward, don't over-celebrate every correct answer"
principle. Instead, Option B adds its own **new** celebration type,
`pathComplete`, fired once when every eligible activity for the focus word
is done for the day — a rarer, bigger moment, consistent with that same
principle.

`earn_sparks(amount, p_child_id)` RPC: security-definer, ownership-checked,
capped at 500/call (migration 0015). Path-completion bonus set to a fixed
25 Sparks — comfortably under the cap, clearly bigger than a typical
per-session award (`round(sessionXP/2)`, usually single-to-low-double
digits).

**Design tokens — resolved ambiguity**: the mission's "Candy design tokens
only (no raw hex outside `src/theme/tokens.js`)" instruction turned out to
correctly name the real live token file. `src/design-system/tokens.js`
(Dawn Indigo/Space Grotesk) is a *different*, legacy-only system used by
the landing page and dead `App.jsx`/`LevelUpCelebration.jsx`. Built Option
B entirely on `src/theme/tokens.js` (Baloo 2 display / Quicksand body,
`shadows.chunk*`, `touchTarget = 64`, `radii`) — the system `PlayScreen`/
`HomeScreen`/`GameEngine`/every `candy/` component actually runs on.

Motion: the `motion` package (not framer-motion, same API,
`from 'motion/react'`) is already used throughout `candy/`. Reduced-motion:
`src/lib/usePrefersReducedMotion.js` exists and is wired into
`CelebrationOverlay` only — every new motion site in Option B wires it in
itself, since it isn't inherited automatically.

## Decisions log

- **Eligibility rules** (`src/lib/activityDefs.js`), verified per-component
  rather than assumed:
  - `word_match`, `word_hunt` — require `word_type !== 'function' &&
    has_art` (mirrors the exact has_art gate already proven correct in
    `api/session-generator.js`/`useSessionPlan.js`/`GameEngine.jsx`'s
    `PICTURE_MATCH_GAME_TYPES` filter).
  - `rhyme_time` — requires the word to exist in `GameEngine.jsx`'s
    `RHYME_MAP` (exported for reuse), **not** `has_art` — confirmed by
    reading `RhymeTime`: it renders nothing useful (`if (!rhymeAnswer)
    return null`) for a word with no rhyme entry, regardless of art. This
    is a *more correct* gate than the has_art-based `PICTURE_MATCH_GAME_
    TYPES` set GameEngine itself uses for rhyme_time's session-level quiz
    filtering — a pre-existing looseness in that shared filter, not
    something changed here (out of scope: it only ever risks a thin
    session falling back to non-rhyme quizzes, not a broken tile).
  - `draw_it` — requires `word_type !== 'function'` only (confirmed via
    `DrawIt.jsx`: no WordArt/image dependency, just "Draw a {word}!" — but
    you can't meaningfully draw "the"/"is").
  - `story_builder`, `flash_cards`, `word_builder`, `story_time`,
    `word_song`, `magic_video`, `say_it` — verified via direct read of each
    component: none require an image or rhyme entry (FlashCardChallenge
    shows `WordArt` decoratively, which already no-ops to a typographic
    chip for art-less words; `StoryTimeActivity` uses a generic local
    template; `MagicVideo` is an explicitly-documented placeholder shell
    keyed only on word + audio). Always eligible.
- **Sequencing** (mission 1.3): fixed pedagogical rank list (receptive →
  productive: word_match → word_hunt → rhyme_time → word_song →
  flash_cards → story_time → story_builder → word_builder → say_it →
  draw_it → magic_video), filtered down to the eligible subset per word.
  `difficultyGovernor.suggestActivity()` is consumed as-is (not reordering
  the path) — its recommendation is surfaced as a secondary "Nova
  recommends" annotation on whichever eligible node it points to, since
  overriding the single-current-step mechanic with a second competing
  signal would fight the mission's core "one glowing current step" ask.
- **Completion source of truth**: `learning_events` rows for
  `(child_id, word, recorded_at >= start of today)`, grouped by
  `game_type` client-side (Supabase JS client doesn't do GROUP BY without
  an RPC/view; dataset is small enough per-word that client-side
  aggregation is fine). Star rating: accuracy ≥90% → 3, ≥70% → 2, else → 1
  (never 0 — errorless-learning: any real completion still earns a star).

## What was built

(filled in during Phase 1)

## Ordering / completion / reward logic

(filled in during Phase 1)

## Screenshots

(filled in during Phase 2 self-test)
