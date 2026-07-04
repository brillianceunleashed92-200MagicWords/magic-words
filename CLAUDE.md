## COMMAND RULES — READ FIRST
- NEVER prefix any command with `cd ~/magic-words &&` or any `cd`. You are ALWAYS already in ~/magic-words. Compound cd+git commands trigger unavoidable manual permission prompts and stall autonomous runs. Run commands bare: `git status`, NOT `cd ~/magic-words && git status`.

# 200 Magic Words — CLAUDE.md

Literacy app for young children, built on Dr. Marion Blank's Mastering Language and
Communication (MLC) method (any child can be taught with ~200 content + non-content
words). React 19 + Vite + Supabase (project `ozhqsaysltiamadpcruz`) + Vercel +
ElevenLabs TTS (voice `QeKcckTBICc3UuWL7ETc`) + Claude API.

This file is the durable source of truth for repo structure and known gaps. Update it
as facts change — don't let it drift into a stale snapshot.

## Current structure (as of the front-end redesign, started 2026-06-18)

Two mega-files hold almost all logic, styled entirely with inline `style={{}}`
objects — no Tailwind, no CSS modules, no component library existed before the
redesign below:

- `src/App.jsx` (~1676 lines) — single component tree, manual `screen` state
  variable for navigation (no router existed pre-redesign). Screens: `home`,
  `learn`, `words` (Word Galaxy), `parent`, `teacher`, `sessionComplete`. Bottom
  tab nav. **No public/marketing route existed** — the whole app was one
  authenticated tree.
- `src/games/GameEngine.jsx` (~1783 lines) — all 5 live lesson/game components
  plus 2 disabled ones.
- `src/hooks/useAuth.js`, `src/hooks/useSessionPlan.js`, `src/components/AuthGuard.jsx`,
  `src/components/ErrorBoundary.jsx`.

### De facto palette/type before the redesign (superseded — see Design tokens below)
Dark navy `#0F0A1E` bg, teal `#4ECDC4`, gold `#FFE66D`, coral `#FF6B6B`, pink
`#FF8B94`, purple `#7B68EE`. Fredoka One (display) + Nunito (body). This read as a
gaming/web3 dark theme, wrong register for parents/clinicians — replaced by the
dawn-gradient token system below.

### Level/XP system — gap vs. MLC's real progression
8-level XP-threshold system (`App.jsx` ~260–283): Star Cadet (0 XP) through
Legendary Reader (5000 XP, level 8). This is an arbitrary point scale, **not**
the MLC method's real 24-level progression (two-word phrases → noun-verb →
expanding structure → tense → compound sentences → question forms → summarizing
events). XP per answer: 10 base + 5 first-try + 5 speed bonus, capped 20/question
+50 perfect-session bonus (`GameEngine.jsx` ~1617–1626). **Open task**: remap
this to the real 24-level curriculum before/during Phase 5 (propagate-to-app).

### Word Galaxy — flat list, not a map
`App.jsx` ~1267–1386, "My Word Galaxy". Currently a scrollable flat word list
grouped by 18 units (locked units 6–18 shown "🔒 PRO"), word pills colored by
mastery %, click opens detail modal with mastery/type/unit. **Not** a
constellation/visual map despite the name. Content vs. non-content word
distinction exists in data (`WORDS` array ~18–238, `type: "content"|"function"`)
and shows as a badge *inside the modal only* — not visible at a glance in the
grid. **Open task**: make content/non-content visually distinct in the grid
itself (ties to the dawn-token content/non-content chip convention below), and
consider an actual visual map for Phase 5's Brilliant/CodeCombat-style
progression UI.

### Lesson types — no MLC category mapping
5 live games in `GameEngine.jsx`: WordMatch (426–604), SoundMatch (606–732),
WordHunt (734–823), RhymeTime (825–922), FlashCardChallenge (926–1013). 2 built
but disabled (`available: false` in `GAME_TYPES`, ~1404–1412): StoryBuilder
(1015–1132), SpellItOut (1134–1270). **None of these are explicitly bound to**
the MLC method's four interaction types (Following Commands, Verbal Imitation,
Answering Questions, Sentence Completion) — WordHunt/RhymeTime loosely cover
"answering," StoryBuilder/SpellItOut loosely cover "sentence completion," but
there's no structural mapping. **Open task** for Phase 5.

### Error/feedback handling — reactive, not errorless-learning
Immediate right/wrong overlay (WordMatch ~472–510), locks on tap, no
scaffolding before the first wrong answer. Hint only appears after 2
consecutive misses (`showHint={consecutiveWrong >= 2}`, ~1738). **Open task**:
move toward scaffold-before-failure per the MLC errorless-learning approach
(narrow choices / highlight target before commit) when reworking lesson UI in
Phase 5.

### Gamification inventory
Confetti (CSS, 18 pieces, `App.jsx` 329–354, fires `GameEngine.jsx` 1633),
XP float-up toast (977–987, 1713–1723), level-up overlay (990–1001, full-screen
blur + bounce, 3s), particles (348–350, 652–662), Nova mascot CSS-keyframe
animations (`index.css` — `nova-float`, `nova-bounce`, `nova-shake`,
`nova-wave`), streak badge (1133–1140). No sound effects beyond TTS
pronunciation — no win/correct fanfare currently. Keep this restrained per the
MLC "mastery is the reward" guidance — don't add SFX/density beyond what's there
without reason.

### Nova mascot
Emoji-only (👨‍🚀), no custom SVG/image asset. Two contexts: home screen
(`App.jsx` 1089–1093, click-to-speak + `nova-wave`), in-game (`GameEngine.jsx`
512–520, state-driven: idle→float, correct→bounce, wrong→shake). Animations
defined in `index.css` 1–31.

### Auth flow — post-signup confirmation screen (added 2026-06-19)
`LoginScreen` (`App.jsx` ~799+) now tracks `signedUpEmail` state: on a
successful `supabase.auth.signUp()` call it shows a "Check your email"
screen (Dawn Indigo page bg, Cloud card, Space Grotesk headline, Atkinson
Hyperlegible body, Sunrise Coral button) instead of silently doing nothing.
This was the first design-token usage outside the landing page — confirmed
working via a real signup round-trip. Scoped to this one screen only; the
rest of `LoginScreen`'s legacy inline styles are untouched pending Phase 5.

### Dashboards
Parent dashboard (`App.jsx` 1389–1520): streak, weekly activity chart, mastery
heatmap (first 40 words), "Needs Attention" (<50% mastery words), AI coaching
tip, child share code. One child per account, no multi-child support. Teacher
dashboard (1522–1668): classroom create + QR join code + roster list
(join-date only — no per-student progress). "Assign Unit" / "Export Report"
buttons are disabled placeholders. Freemium gate: units 6–18 + 3 of 5 game
types locked, hardcoded "$9.99/mo", `UpgradeModal` in `GameEngine.jsx`
1422–1479.

### Confirmed bug locations (separate workstream — only fix if redesign work
surfaces them directly, per the master prompt's Phase 6 rule)
- **Auth persistence**: `useAuth.js` 16/24–40 — hardcoded 5s `INITIAL_SESSION`
  timeout; app hangs until timeout if localStorage session restore stalls.
- **QR code generation**: `App.jsx` 517–525 — no error handling around the
  `qrcode` library call; silent fail if it errors.
- **XP toast z-index**: `GameEngine.jsx` ~1717 — fixed `z-index: 10001`, can
  layer above modals unexpectedly.
- **Audio**: `GameEngine.jsx` 45–67 — module-level single-clip audio cache, no
  documented handling for rapid repeat taps. (Reported "TTS reads only the
  word not the sentence" bug not yet located — needs a closer look when this
  workstream is picked up.)
- One non-critical TODO: `ErrorBoundary.jsx` 95 (analytics/error-tracking
  integration stub).
- **Open item — no staging/dev Supabase project (flagged 2026-06-19)**: every
  test run across this entire redesign session — Playwright suite, manual
  verification, screenshots — has executed against the live production
  project (`ozhqsaysltiamadpcruz`), because none other exists. Each run
  required manual admin-API account creation/cleanup to avoid leaving rows
  behind. This works today only because every test path happens to be
  narrowly scoped (synthetic emails, immediate cleanup) — it does not scale
  to CI, doesn't protect against a forgotten cleanup step, and means a
  bug in test code has a real (if currently low-blast-radius) path to
  touching production data. Provisioning a real dev/staging project (or at
  minimum a clearly-separated test schema/branch) should happen before this
  testing pattern is relied on long-term or handed to CI.
- **Known soft spot — hardcoded production fallback in `supabaseClient.js`**:
  when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset, the client
  falls back to the live project's URL + publishable anon key baked directly
  into source. The key itself is safe to expose (anon keys are meant to be
  public), but the soft spot is the *behavior*: there is no separate
  dev/staging Supabase project, so any local run with no env configured
  silently writes to the same production project everyone else uses — it
  fails open to prod instead of failing loudly or pointing at a sandbox.
  We hit this directly: every local test run this session created real rows
  in the live project, requiring manual admin-API cleanup each time (see
  smoke test notes below). **`.env.local` is optional, not required** — the
  app runs either way — but treat "optional" as a gap to eventually close
  (e.g. a real dev/staging project) rather than a feature, especially before
  any test or seed scripts run unattended.
- **Smoke test signup-rate-limit handling (decided 2026-06-19)**: the
  signup-confirmation-screen test in `tests/smoke.spec.js` calls the real
  `supabase.auth.signUp()`, which is the exact call Supabase's account-level
  email rate limit throttles. Provisioning that account via the service_role
  admin API instead (as the sign-in test does) was considered but rejected —
  it would create an already-confirmed user without ever exercising the
  signup code path, defeating the point of testing it. Raising the
  project's email rate limit was also considered but rejected — that's a
  shared/production setting we don't want a test silently depending on.
  Resolution: the test accepts either the confirmation screen *or* the
  known `email rate limit exceeded` message as a valid outcome, and only
  fails loudly if neither appears (which would indicate a real regression).

## Design tokens (approved 2026-06-18, supersedes "de facto palette" above)

Anchor concept: a dawn gradient (night sky → sunrise) as the structural
backbone of the brand, not a decorative accent — lets the existing space/Nova
motif and "warm, trustworthy for parents/clinicians" coexist as one idea
instead of two competing accent colors bolted onto a dark theme.

**Color** — bright values are for fills/backgrounds/illustrations only; deep
values are the only WCAG-safe choice for colored text on light surfaces (see
contrast table). Dawn Indigo text on Cloud bg, or Cloud/white text on Dawn
Indigo bg, are the default body-copy pairings (13.92 / 14.67 contrast, AAA).

| Token | Hex | Use | Contrast notes |
|---|---|---|---|
| Dawn Indigo | `#2A2150` | landing/hero bg, primary body text on light surfaces | 13.92:1 on Cloud (AAA) |
| Cloud | `#FFF8F0` | dashboard/lesson-player surfaces | — |
| Comet Teal | `#2DD4BF` | fills, content-word chip bg, dark-bg accents | 7.88:1 as text on Dawn Indigo (AAA); fails as text on Cloud — don't use as light-surface text |
| Comet Teal Deep | `#135D54` | teal *text* on light surfaces only | 7.33:1 on Cloud (AAA) |
| Sunrise Coral | `#FF7A59` | CTA fills, streaks/energetic accents, attention/concern states, content-word emphasis — **not** correct/wrong feedback specifically (corrected 2026-06-19: real usage across the Parent dashboard and lesson player treats it as a warm energetic accent, not a fixed "correct = coral" rule; comet teal owns "correct," coral owns "needs attention") | fails as text on Cloud or white-on-fill; use Dawn Indigo text on top of Coral fills (5.71:1, AA) |
| Sunrise Coral Deep | `#8F1C00` | coral *text* on light surfaces only | 8.54:1 on Cloud (AAA) |
| Marigold | `#FFB84D` | progress/achievement fills, non-content-word chip bg | Dawn Indigo text on top: 8.53:1 (AAA) |
| Marigold Deep | `#704300` | marigold *text* on light surfaces only | 8.00:1 on Cloud (AAA) |
| Slate-Violet | `#6B6580` (+ tints) | dashboard neutral text hierarchy, borders | — |

Rule of thumb: never put white or a bright accent as *text* directly on the
Cloud surface or as text on its own bright fill — always pair bright fills
with Dawn Indigo text, and use the *Deep* variant when the text itself needs
to carry the brand color on a light surface.

Content vs. non-content word convention: content words = solid Comet Teal
chip w/ Dawn Indigo text, bold. Non-content/function words = outline Marigold
chip w/ Dawn Indigo text, regular weight. Apply this in the grid itself
(Word Galaxy), not just in a detail modal.

**Type**:
- Display: Space Grotesk — hero/section headlines only, large sizes, used with
  restraint. Replaces Fredoka One's toddler-cartoon register.
- Body: Atkinson Hyperlegible — all dashboard/lesson copy. Chosen specifically
  for the low-vision-optimized legibility research behind it, serving tired
  parents and teachers scanning dense screens.
- Utility/data: Inter with tabular numerals, dense stat tables only.

**Layout**: landing page is cinematic/scroll-driven (clip-path section
transitions, dawn gradient travels with scroll position). In-app screens
(dashboards, lesson player) stay dense and low-motion — hero-page choreography
must not bleed into daily-use screens.

**Signature element**: hero sequence where the 200 core words rise like stars
across the indigo-to-coral sky and coalesce into Nova — literalizes "200
words," ties directly to the existing Word Galaxy/Nova mascot. Placeholder
CSS/SVG during iteration; final version generated via Higgsfield once layout
is locked.

## Interaction Design addendum (pending sign-off, written 2026-06-19)

Same status as the color/type brief: proposed, not yet approved. Do not start
Phase 4 extraction until this is signed off, same gate as the original design
brief.

**Scope boundary**: CSS 3D transforms (`transform: perspective(...) rotateX/Y`)
driven by `motion`, only. True WebGL/3D (Three.js, react-three-fiber) is
explicitly out of scope for this redesign — not a future phase, just not part
of this product's interaction vocabulary. Keeps every effect cheap enough to
run on the low-end devices this audience is likely to have, and keeps the
visual language consistent with the CSS-driven approach already used for Nova
and gamification.

**(a) Tilt-toward-cursor hover/depth convention.** A reusable pattern, not a
site-wide default: on `pointermove` over an eligible card, compute cursor
position relative to the card center and map it to a small `rotateX`/`rotateY`
(±4–6deg max) plus a subtle `translateZ`/shadow-depth increase, using `motion`'s
spring physics for the return-to-rest. Eligible surfaces: landing-page feature
cards (`HowItWorks`, `Audience`), and — once built — Word Galaxy unit tiles and
level-select tiles. Not applied to: dashboard stat cards, lesson-player UI, or
any element a user interacts with rapidly/repeatedly (tilt-on-hover is a
landing/exploration affordance, not a data-density one — matches the existing
low-motion rule for daily-use screens).

**(b) Word Galaxy as a parallax-tilt map (spec only — build is Phase 5).**
Replaces the current flat scrollable word list with a spatial map: units laid
out on a loose grid/path (CodeCombat-style world-map metaphor already called
for in the original brief), each unit tile using the (a) tilt convention on
hover/touch-drag, with a parallax offset between the tile's icon layer and its
background layer (icon moves slightly more than background under the same
tilt, ~1.4x factor) to sell depth without WebGL. Locked units (6–18 in the
current freemium gate) get a flatter, desaturated tilt response (smaller max
angle, no parallax) — depth as a reward for what's unlocked, not decoration on
what isn't. Content/non-content word color convention (Comet Teal / Marigold)
carries into this view unchanged.

**(c) Level-up/level-complete gets a rare, bigger cinematic moment.**
Direct consequence of the MLC "mastery is the reward, don't over-celebrate
every correct answer" principle already documented above: if routine
correct-answer feedback stays restrained, the few moments that *are* big
(level-up, unit-complete) need to feel proportionally larger to register as
genuinely rare, not just "the same confetti, slightly longer." Concretely:
a full-screen takeover (not the current inline overlay), using the same
dawn-gradient signature treatment from the landing page rather than a new
effect — i.e. level-up briefly replays a compressed version of the WordRise
moment scoped to that unit's words. Reserved for level-up and unit-complete
only; per-question correct/wrong feedback stays exactly as restrained as it is
today. This is the trade that keeps restraint everywhere else intentional
instead of just "low-budget."

## Redesign execution order (do not skip ahead)
1. Audit (done 2026-06-18, captured above).
2. Design brief / token sign-off (done 2026-06-18, captured above).
3. Landing page only, new route, isolated from authenticated app routes
   (done 2026-06-18/19 — cinematic scroll-driven landing page, dawn-gradient
   signature element, committed).
4. Extract shared design system (tokens/primitives) out of the landing page
   (done 2026-06-19 — see `src/design-system/`: `tokens.js`, `motion.js`,
   `useTilt.js`, and `primitives/` for Button, Card (Light/Glass),
   SectionReveal, TiltCard. Landing sections refactored to consume these
   instead of duplicated inline motion/className blocks).
5. Propagate to dashboards/lesson player — lower-motion, denser variants,
   apply the open tasks flagged above (24-level mapping, Word Galaxy
   visual map per addendum (b), MLC lesson-type binding, errorless-learning
   scaffolding, level-up treatment per addendum (c)).
   - **5a (visual restyle only) — done 2026-06-19.** Parent dashboard,
     Teacher dashboard (`App.jsx`), and the entire lesson player
     (`GameEngine.jsx`) now run on the dawn token system. No XP math,
     level thresholds, lesson-type logic, or Word Galaxy data model
     changes — purely color/font swaps. Mechanics:
     - `App.jsx`: Parent/Teacher screen roots got their own
       `bg-cloud`/`text-dawn-indigo` wrapper with a `-mx-5` bleed past
       `.screen-padding`, since both screens render inside the single
       shared dark/starfield shell used by every screen (Home/Learn/
       Words included) — that shell itself is untouched and out of
       scope, so there's now a deliberate visual seam where Parent/
       Teacher (light) meet Home/Learn/Words and the bottom nav (still
       dark) within the same session. Expected, not a bug.
     - `GameEngine.jsx`: the single shared `T` palette object (used by
       every game type, `SessionProgress`, `FeedbackOverlay`,
       `GameTypeSelector`, `SessionComplete`, `UpgradeModal`) now maps
       to `design-system/tokens.js` — one change point propagates
       everywhere. `T.bg` flipped dark→Cloud, `T.white`/`T.muted`
       flipped light-text→Dawn-Indigo-text, `T.card`/`T.border`
       inverted from translucent-white-on-dark to translucent-
       Dawn-Indigo-on-light. Comet Teal owns "correct," Sunrise Coral
       owns "wrong"/streaks/attention (see corrected token table note
       below). Dozens of literal legacy `rgba(78,205,196,…)` /
       `rgba(255,107,107,…)` / `rgba(255,230,109,…)` values scattered
       across every game-type component (bypassing `T` entirely) were
       bulk-converted to the new tokens' decimal RGB equivalents —
       found via visual QA, not assumption; check for this pattern
       again before assuming a future palette change is "done" just
       because `T` was updated.
     - `GameTypeSelector` and `UpgradeModal` needed their own explicit
       `background: T.bg` — they're rendered inside App.jsx's
       still-dark "Learn" tab / Parent dashboard contexts respectively,
       not inside `GameEngine`'s own self-contained root, so they don't
       inherit a light page background for free. Caught via live
       screenshot (dark-on-dark text was otherwise invisible) — **any
       future component sharing `T` needs the same self-contained-
       background check if it might render outside `GameEngine`'s own
       wrapper.**
     - Known minor pre-existing issue, not fixed (out of scope —
       display logic, not styling): `getChildName()`-derived display
       name can overflow the Parent dashboard header when the email
       local-part is unusually long (only seen with synthetic test
       emails). No truncation/wrap logic exists; revisit if real users
       hit it.
     - Per-game-type internals (the actual WordMatch/SoundMatch/
       WordHunt/RhymeTime/FlashCardChallenge/StoryBuilder/SpellItOut
       JSX bodies) were **not** individually rewritten — only their
       shared `T`-derived colors changed. Their structure/layout is
       unchanged from before this pass.
   - **Seam closure — done 2026-06-19.** Extended the same token system to
     Home, Learn (`renderLearnTab`'s wrapper), Words (Word Galaxy list +
     detail modal), and the bottom nav, plus the app's single global shell
     (the dark/starfield wrapper that previously sat behind every screen)
     and `AuthGuard.jsx`'s `GalaxyLoader`. The whole authenticated app is
     now one consistent Cloud surface — no more light/dark seam between
     screens. The starfield motif was kept, not deleted: star color
     changed from white to low-opacity Dawn Indigo ("stardust on paper"
     rather than stars on a night sky), preserving the space/Nova identity
     without a literal dark sky. Bonus (styling only, uses the existing
     `w.type` field, no data-model change): Word Galaxy word pills now
     show the content/bold-fill vs. non-content/marigold-outline
     distinction directly in the grid, partially closing the open task
     from the audit — the full parallax-tilt map rebuild is still Phase 5b
     item (b).
6. Fix known bugs only if redesign work in that area surfaces them directly —
   not a standalone pass.

## Phase 5b (behavioral) — confirmed decisions, 2026-06-19

Phase 5b touches real game logic, so these were confirmed with the user
before any code was written (not just refactors):

**24-level mapping.** The 18 existing "units" are a vocabulary-topic axis
(Animals, Actions, Family, …) and stay as-is — levels are a *separate,
orthogonal* sentence-complexity axis layered on top, not a renaming of
units. The 24 stages follow the MLC arc from the original master prompt:
single content word → two-word phrases → simple noun-verb sentences →
introducing "I" → expanding structure → introducing "you" → tense
(present/past/future) → multi-word combinations → negation → compound
sentences (and/but/or) → question forms (action, location, identification,
desire/ability, negation, past, future, yes/no) → summarizing events. Full
table is the `LEVELS` array in `App.jsx`. **Level is still XP-gated for
now** — this remap changes the number of brackets (8→24) and what each
bracket *means* (each now names a real grammar milestone via a `stage`
field, not an arbitrary point tier), but does **not** yet build a
curriculum-content-sequencing engine where question templates actually
change per level. That would be a separate, larger effort — flagged here,
not silently bundled in.
- **Level vs. XP hierarchy (confirmed):** Level is now the primary
  progress metric on Home and the Parent dashboard ("Level X of 24 ·
  {stage}"), XP demoted to a small secondary line. Each `LEVELS` entry has
  both a kid-facing celebratory `title` (keeps the space/Nova motif, e.g.
  "Two-Word Voyager") and a parent-facing `stage` (the real grammar
  milestone name, e.g. "Two-word phrases") — two naming tracks for two
  audiences, same underlying level number.

**Lesson-type bindings.** Based on actual interaction mechanics, not
surface prompt phrasing (all 5 games phrase their prompt as a question in
the UI, which would make that criterion meaningless):
- Following Commands → WordMatch, SoundMatch (child acts on "show me X")
- Answering Questions → WordHunt, RhymeTime (explicitly posed as a
  question rather than a direct instruction)
- Verbal Imitation → FlashCardChallenge — **honest caveat: the app has no
  speech-input capture**, so this is "hear word, self-rate" scaffolding
  for imitation practice, not verified imitation. Real product gap, not
  papered over by the binding.
- Sentence Completion → StoryBuilder. **Confirmed: re-enabling it** (was
  `available: false`, already built per the original audit) so this
  category has a live game instead of a conceptual-only binding.
- SpellItOut doesn't cleanly fit any of the four MLC categories — left
  unbound rather than forced.

Constraint: Supabase schema, auth logic, XP/streak data model, and dashboard
business logic stay untouched unless a task explicitly says otherwise. Verify
build + auth + dashboards after every phase.

### Phase 5b progress
1. ✅ Done 2026-06-19 — 24-level remap (`LEVELS` array, `MAX_LEVEL`,
   Home/Parent dashboard hierarchy change). Verified live: build clean,
   Playwright suite passes, Home and Parent screenshotted showing
   "Level 1 of 24 · First Word" / stage name correctly.

   **✅ MIGRATION BLOCKER — resolved on `v2-candy-galaxy`, 2026-07-02.**
   This was originally assumed safe because `user_stats` was empty in
   production (the RLS bug on a separate branch,
   `fix/rls-user-stats-policies`, meant XP never persisted for anyone).
   That RLS bug has since been fixed and verified in production. Checking
   `user_stats` again *after* the fix went live found a real account
   (`brillianceunleashed92@gmail.com`) with `total_xp = 185`,
   `current_level = 2` — written after the fix, meaning a real user had
   already played and earned real XP under the old 8-tier table. Under
   the new 24-tier table, that same 185 XP recalculates to Level 3, not
   Level 2 — confirmed by computing both tables directly, not assumed.
   Decision made: **recalculate, don't grandfather** — the stored
   `current_level` column is write-mostly (the app always recomputes
   level fresh from `total_xp` via `getLevelInfo()` for display; nothing
   reads the stored column back for the UI), so making it match the
   24-tier table is a data-consistency fix, not a user-visible change.
   Fixed by `supabase/migrations/0004_recalc_user_stats_current_level.sql`
   (idempotent `UPDATE`, safe to re-run), applied live via
   `supabase db push --linked` and verified: the
   `brillianceunleashed92@gmail.com` account's `current_level` is now `3`.
2. ✅ Done 2026-06-19 — lesson-type bindings + StoryBuilder re-enabled.
   `MLC_TYPES` map added in `GameEngine.jsx` (game id -> MLC category),
   shown as a small uppercase tag on each `GameTypeSelector` tile.
   StoryBuilder's `unlockedGames` entry added in `App.jsx` (the actual
   functional gate — **`GAME_TYPES[].available` turned out to be dead,
   unread metadata anywhere in the codebase**; flipping it alone would
   have done nothing. Left it `true` for documentation consistency, but
   the real fix was `unlockedGames`). Caught and fixed a real bug found
   only by testing the offline-fallback path directly: `buildLocalQuiz()`
   in `useSessionPlan.js` never set a `sentence` field, which
   `StoryBuilder` requires — would have rendered a context-less blank
   for any user hitting AI-generation fallback (which is this sandbox's
   default state). Added the same generic fallback sentence the real
   `api/session-generator.js` uses. Verified live: build clean, full
   Playwright suite passes, StoryBuilder played end-to-end including the
   wrong-answer state, screenshotted.
3. ✅ Done 2026-06-19 — Word Galaxy rebuilt as a spatial unit map
   (`src/components/WordGalaxyMap.jsx`), replacing the flat scrollable
   list. 3-column grid of unit tiles (icon = first word's emoji per
   unit, name, progress bar, mastered/total), tap-to-expand reveals that
   unit's word pills below the grid instead of nesting one giant list.
   Uses the tilt-toward-cursor convention via an extended `useTilt`
   (now also returns `springX`/`springY`) plus a new `useParallaxOffset`
   helper so the tile's icon layer drifts further than the tile itself
   under the same tilt (~1.4x, per the addendum). Locked units get a
   flatter response (`max: 2` vs `7`, no icon parallax) and desaturated
   styling — depth as a reward for what's unlocked, not decoration on
   what isn't. App.jsx's `activeWord` detail modal and all mastery
   mutation logic (`setWordMastery`, etc.) are untouched — this is a
   presentation/interaction rebuild only, data model unchanged.
   - **Found and fixed in passing**: `getMasteryColor` (App.jsx) still
     used pre-redesign legacy hex values, never migrated during Phase 5a/
     the seam-closure pass — a real gap since it's used by the Word
     Galaxy pills, the detail modal, and the Home word-garden orbs.
     Updated it to the real tokens (matches the legend: Learning ->
     Marigold, Getting there -> Comet Teal, Mastered -> Sunrise Coral).
     Also removed `getMasteryGlow`, which had silently become fully dead
     code (zero call sites) during that same earlier pass.
   - Verified live: build clean, full Playwright suite passes, map
     screenshotted (grid, tile selection/expand, hover) and StoryBuilder
     re-checked still works after the `getMasteryColor` change.
4. ✅ Done 2026-06-19 — errorless-learning scaffold in `WordMatch`
   (`GameEngine.jsx`). A first wrong tap no longer lets the error
   complete: the wrong tile shakes (~450ms), then the correct tile gets
   a persistent highlight that stays lit until the question is answered
   (not a flickering timed pulse — the cue must still be visible the
   instant input re-enables, otherwise the scaffold disappears right
   when the child is allowed to act again). Only a *second* miss on the
   same question lets the error complete (overlay + advance), matching
   the print program's "physical hand support prevents the error;
   letting one complete is the last resort" behavior described in the
   master prompt. The session-level hint threshold (`showHint`, pulses
   the correct tile on a *new* question) also dropped from
   `consecutiveWrong >= 2` to `>= 1` — scaffold sooner, not just after
   two separate misses.
   - **Scoring/XP contract deliberately unchanged**: the eventual
     `onAnswer({correct, responseTimeMs, firstTry: true})` call — exactly
     one per question, same field shape, same `firstTry: true` always —
     is byte-for-byte what it was before. Only the UI/interaction
     leading up to that call changed. This was a deliberate scope
     boundary: making the retry's outcome "more accurate" by passing
     `firstTry: false` would touch the XP bonus formula's input, which
     wasn't part of this confirmed deliverable.
   - **Scope boundary, not silently expanded**: only `WordMatch` got
     this treatment. `SoundMatch`/`WordHunt`/`RhymeTime`/`StoryBuilder`
     still use the old immediate-overlay flow. `FlashCardChallenge` has
     no right/wrong state to scaffold (self-rated). Revisit the other
     multiple-choice games as a follow-up if this pattern proves out.
   - Caught and fixed in passing: a real React dev warning ("mixing
     shorthand and non-shorthand animation properties") from combining
     the hint-pulse's `animation` shorthand with the tile's existing
     `animationDelay` — fixed by omitting `animationDelay` whenever the
     pulse is active, rather than merging both.
   - Verified live: build clean, full Playwright suite passes, full
     wrong-then-retry-correct flow screenshotted end to end (shake ->
     persistent highlight -> correct retry -> normal advance, "Word 2
     of 5" / "1 correct" confirming no double-count or regression).
5. ✅ Done 2026-06-19 — rare/bigger level-up treatment (addendum item c).
   New `src/components/LevelUpCelebration.jsx` replaces the old plain
   dark overlay with a compressed replay of the landing page's WordRise
   signature moment: the same `dawnGradientStops` sweep, a sample of the
   child's own mastered words rising with the content/non-content chip
   convention, then the level emoji + "Level X · {title}" + `stage`.
   Reserved for level-up only — per-question feedback is untouched and
   stays exactly as restrained as before. Auto-dismiss timeout extended
   3000ms -> 4200ms so the sequence has room to play.
   - **Found and fixed before shipping, not after**: the first version
     put text directly on the animated gradient. Checked contrast
     directly rather than eyeballing it — several pairings collapsed to
     as low as 1.4:1 once the gradient reached Sunrise Coral (its held
     end state), far below the 4.5:1 minimum. Fixed by moving all
     foreground content (chips, emoji, text) onto an opaque Cloud panel
     — the same safe-pattern already proven on the landing page's
     ClosingCTA — so the gradient still sweeps and glows around the
     card, but text never rides directly on a color it can disappear
     into. Verify any future full-bleed-gradient UI the same way: check
     contrast at the gradient's *held end state*, not just its starting
     color.
   - Removed `level-up-bounce`, which became fully dead code (zero call
     sites) once the old overlay was replaced.
   - **Found in passing, not fixed (out of scope, pre-existing,
     unrelated to this redesign)**: testing this required driving real
     XP gains through actual gameplay, which surfaced two backend
     issues neither caused by nor fixable within this front-end pass:
     (a) `user_stats` upsert fails with a row-level-security policy
     violation for service-role-admin-created test accounts (likely an
     RLS policy quirk specific to that provisioning path, not regular
     signups — needs backend investigation); (b) the XP-float toast's
     `id: Date.now()` can collide under rapid-fire answers (only
     surfaced by scripted clicking far faster than a real child would
     tap), producing a "duplicate key" React warning. Both are real,
     both are someone's next task, neither is this session's.
   - Verified live: build clean, full Playwright suite passes, a real
     level-up driven through actual gameplay (not simulated) and
     screenshotted, contrast issue caught and re-verified fixed before
     calling this done.

## Phase 5c (visual/interaction polish) — additive only, 2026-06-20

Explicit constraint for this phase: does not touch XP math, level
thresholds, lesson-type bindings, the errorless-learning scaffold, or
RLS/Supabase — visual/interaction only, must not change what anything
*does*. Baseline (4 screenshots: Home, Choose a Game, active WordMatch,
Word Galaxy + full Playwright suite) captured before any change; re-run
and diffed against baseline after each numbered item below.

**Pushback before starting, confirmed with the user**: the brief named
5 "Today's Quest" icons (Watch/Listen/Hunt/Story/Boss). Only 2 quest
items actually exist in the code (`questsCompleted = { session, words }`,
rendered as exactly 2 cards). The other 3 names don't correspond to
anything built — "Boss" traces to an unimplemented `DailyChallenge`
mentioned only in a code comment. Illustrating fictional quest icons
would have implied a 5-quest system that doesn't exist. User confirmed:
illustrate the 2 real ones, skip the other 3 (a richer quest system
would be new logic, a separate task from visual polish).

### 1. ✅ Done 2026-06-20 — custom illustration system (additive, with emoji fallback)

Style reference generated first via Higgsfield (`recraft-v4-1`,
`model_type: vector`, dawn-token hex palette) before any individual
icon — flat single-silhouette + cream negative-space-detail
construction, no gradients/outlines/shadows. First attempt at an
individual icon (passing all 5 palette colors to one object) broke the
established language — scattered multiple colors across separate
features instead of one cohesive silhouette. Fixed by constraining
every individual generation to exactly 2 colors (one accent + cream)
and being explicit about the silhouette/negative-space construction in
the prompt. Also found and fixed: generated SVGs had a stray full-canvas
background fill (sometimes an unrequested color) — stripped
programmatically (first full-canvas `<path>`) so all icons are
genuinely transparent, not just "appears to match the cream bg by luck."

- **Word icons**: 8 of Unit 1's 8 words illustrated (cat, dog, bird,
  fish, bear, ball, book, cup) — not all ~94 words across the
  truly-unlocked-or-Home-hardcoded units 1–9, deliberately. The whole
  point of `src/design-system/wordIcons.js` (a `import.meta.glob` over
  `src/assets/icons/words/*.svg`) is that coverage is incremental —
  drop a new `<word>.svg` in that folder and it's picked up with zero
  code changes elsewhere. `<WordIcon word emoji>` (`design-system/
  primitives/WordIcon.jsx`) renders the icon if one exists, the emoji
  otherwise — same visual slot either way. Wired into: `WordTile`
  (`GameEngine.jsx`, the WordMatch answer tiles), `WordPill` and unit
  representative icons (`WordGalaxyMap.jsx`), and Home's word-garden
  orbs (`App.jsx` — these had no icon at all before, purely additive).
  Verified live: a WordMatch round now shows illustrated cat/bird tiles
  mixed naturally with emoji tiles for not-yet-illustrated words (can,
  jump) on the same screen, no visual seam.
- **Quest icons**: both real ones illustrated (Session/target, Master/
  star), static imports in `App.jsx` (fixed set, no fallback system
  needed — see pushback above for why not 5).
- **Nova**: 3 illustrated expression states (idle/float, correct/
  bounce, wrong/shake) via new `NovaMascot` component
  (`design-system/primitives/NovaMascot.jsx`), swapped by the same
  `novaState` value that already drove the CSS animation choice — the
  state variable and animations are unchanged, only the asset is new.
  Replaces the 👨‍🚀 emoji everywhere it appeared: Home screen
  (click-to-speak wave) and both in-game sites (WordMatch, WordHunt).
- **Incidental fix, called out rather than buried**: `WordTile`'s
  drop-shadow opacity (0.4 → 0.15) — tuned for the old dark theme,
  too heavy/muddy on the Cloud background. Purely cosmetic.
- Verified live: build clean, full Playwright suite passes (3/3,
  unchanged), baseline 4-screenshot diff shows only the intended
  swaps (Nova, quest icons, Unit 1 word icons) — Choose a Game screen
  pixel-identical (game-type icons are a separate, untouched system).

- You are always launched from ~/magic-words; never prefix commands with `cd ~/magic-words &&` — you are already there.
- For production DB queries, write the SQL to a file with the Write tool, then run `node scripts/db-query.mjs <file.sql>`. NEVER build bash commands that combine $() token substitution with JSON heredocs — that shape triggers an unavoidable "expansion obfuscation" permission prompt.
