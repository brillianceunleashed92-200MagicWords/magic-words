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
| Sunrise Coral | `#FF7A59` | CTA fills, correct-state, content-word emphasis | fails as text on Cloud or white-on-fill; use Dawn Indigo text on top of Coral fills (5.71:1, AA) |
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

## Redesign execution order (do not skip ahead)
1. Audit (done 2026-06-18, captured above).
2. Design brief / token sign-off (done 2026-06-18, captured above).
3. Landing page only, new route, isolated from authenticated app routes.
4. Extract shared design system (tokens/primitives) out of the landing page.
5. Propagate to dashboards/lesson player — lower-motion, denser variants,
   apply the open tasks flagged above (24-level mapping, Word Galaxy
   visual map, MLC lesson-type binding, errorless-learning scaffolding).
6. Fix known bugs only if redesign work in that area surfaces them directly —
   not a standalone pass.

Constraint: Supabase schema, auth logic, XP/streak data model, and dashboard
business logic stay untouched unless a task explicitly says otherwise. Verify
build + auth + dashboards after every phase.
