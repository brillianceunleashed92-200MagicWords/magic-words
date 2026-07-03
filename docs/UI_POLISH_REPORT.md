# UI Polish Report — `ui-candy-polish`

> **Correction added after this report was written**: the "What's explicitly out of
> scope" section below incorrectly claimed `word_builder` was unreachable by
> conflating it with the genuinely-unreachable `SpellItOut`. It is a completely
> separate file (`src/games/WordBuilder.jsx`) that IS live and reachable, and was
> never actually audited. This was caught from real screenshots of the deployed
> preview, not by this pass's own testing. See `docs/WORDBUILDER_FIX_REPORT.md` for
> the fix and the full account of what went wrong in this report's verification.

Branch: `ui-candy-polish`, off `main`, **not merged**. 8 commits, each self-verified
(lint + build + `check:no-emoji` + Playwright) and confirmed green on its own preview
deployment before the next step started. Preview alias:
`magic-words-git-ui-92aae2-brillianceunleashed92-6054s-projects.vercel.app`.

## Two provenance notes, upfront

The task named two inputs that turned out not to exist in this environment:

1. **`docs/mockup-E2-no-emoji.html`** was never in the repo or git history (checked
   both) despite being described as the existing gold standard. Built it directly
   from the detailed spec instead (candy tokens, 780px stage, 2×2 tiles, errorless
   scaffold, star progress, Nova porthole, zero emoji) — see commit `f3a5481`. It's
   now the real, working reference the rest of this pass was built against.
2. **The "impeccable" plugin** wasn't installed anywhere in this Claude Code
   environment (checked all registered marketplaces). `docs/DESIGN_BRIEF.md` was
   authored directly from the two mockups instead.

Both are flagged here plainly rather than presented as if they were pre-existing —
see commit `f3a5481`/`8df0c8c` messages for the full account.

## Step-by-step summary

| Step | Commit | What it did |
|---|---|---|
| 1 | `8ba399f` | `teaching_track` column on `words` (content\|sight), additive migration, applied + verified live (200/200 rows). Honest disclosure: requested as "100/100," a real word-by-word pass converges on 137/63 — documented why forcing even split would mean mis-tagging real picturable words. |
| 2 | `f3a5481` | Built `mockup-E2-no-emoji.html` — the 4 locked animal SVGs (dog/elephant/cat/bird), lesson-stage layout, errorless scaffold, star progress, confetti. Verified interactively in-browser. |
| 3 | `8df0c8c` | `docs/DESIGN_BRIEF.md` — token palette, type, chunk-shadow contract, 780px stage, forbidden patterns. |
| 4 | `b94e65f` | `src/components/WordArt.jsx` — 11 illustrated words (dog, elephant, cat, bird, frog, eat, fly, jump, run, big, sad) + typographic fallback for sight-track/unillustrated words. First pass on fly/jump/run read wrong (wings looked like ears, legs looked like an X) — caught by actually rendering and looking, reworked before committing. |
| 5 | `5aa0634` | `src/components/icons/` — 11 chrome icons + avatar/interest glyph sets. Swept avatar/interest pickers of all emoji; found and fixed a real bug (avatar picker stored raw emoji as the DB value — now stores an `id` slug for new profiles, old emoji values still resolve via a legacy lookup). |
| 6 | `1d114d1` | Rebuilt all 5 named lesson activities to the E2 standard. Real finding: `GameEngine.jsx` was still on the *old* dawn-gradient token system while every other Candy Galaxy screen had already moved to candy tokens — a real, currently-shipping inconsistency, not just a style preference. Fixed at the single change point (`gameTheme.js`). Also fixed `NovaPortrait`/`NovaSprite`, which were both silently broken (referenced renamed PNG files). |
| 7 | `62f4ea6` | Home/Galaxy/Grown-ups conformance + emoji sweep. Two icons (galaxy, bubble) read wrong at small size on first pass — caught via real screenshots, reworked. |
| 8 | `80e3bcb` | Closed out remaining live-reachable emoji (Play picker, level-up, parent portal, Say It with Nova, Word Song, Moments feed) + added `scripts/check-no-emoji.mjs` (`npm run check:no-emoji`), the grep-test proof. |

## Per-screen before/after

### Lesson/quiz screens (WordMatch, WordHunt, RhymeTime, FlashCardChallenge, StoryBuilder)
**Before:** dawn-gradient tokens (wrong system — a real bug, not a style choice), emoji
word tiles, full-screen coral-tinted "wrong" overlay (a direct violation of the "no red
error states" rule the brief was about to lock in), errorless scaffold only on WordMatch.
**After:** candy tokens throughout, WordArt illustrations, chunk-shadow 2×2 tiles with
spring entrance/hover-lift/press-down, star-segment progress, Nova porthole + speech
bubble, SVG confetti, errorless scaffold (wiggle+soften+hint-glow, no red/X) on all 5.
`SessionComplete` (shared across every activity) also swept and re-verified.

### Home
**Before:** structure already matched mockup D closely (Phase 1 built it faithfully) —
this pass was primarily fixing raw-emoji props on shared components (`Pill`, `TrophyCard`,
`WordNode`, `BottomNav`) that had no way to render anything else.
**After:** all four now take component references, not emoji strings; two new icons
(galaxy, bubble) went through a legibility pass after a real screenshot showed the first
attempts reading as an eye and a magnifying glass respectively.

### Galaxy / Grown-ups
**Before:** same `progressLabel`/emoji pattern as Home (shared `WordNode`/`GalaxyPath`),
plus a broken Playwright test dependency (the hold-gate button was matched by literal
"⭐" text).
**After:** swept, and the test fixed to match by `aria-label` instead — same pattern used
for the avatar-picker fix in step 5.

### Parent Portal (Dashboard/Moments/Mastery Map/Settings)
**Before:** small decorative emoji scattered through headings and the Moments share-card
generator (which bakes its content into a downloaded/shared PNG via html2canvas).
**After:** swept; `MomentsTab`'s icon is now a component reference so the *exported image*
doesn't carry emoji either, not just the on-screen list.

### Play (activity picker) / SessionComplete
**Before:** 11-emoji activity grid, "🚀"/"🌟"/"⭐"/"🏠" scattered through the post-session
screen.
**After:** every activity tile has a real icon (2 new: `IconMic`, `IconBook`, `IconSearch`),
`SessionComplete`'s word-result chips use `WordArt`, the rocket/star moments use real SVGs.

### Level-up celebration
**Before:** 24 unique per-level emoji, several unrelated to that level's actual grammar
milestone (e.g. level 20 "Double Negative" = 🙅).
**After:** a single numbered badge (star icon + level number) — more legible across 24
levels than 24 disconnected pictograms, and doesn't imply a meaning the emoji never
actually carried. Kept the dawn-gradient/WordRise-callback visual treatment as-is per its
documented intent (this *is* the one deliberate reuse of that other design system, not
a seam).

## What's explicitly out of scope, and why

- **`src/App.jsx`** (the pre-Candy-Galaxy legacy tree) — confirmed unlinked from any live
  route (`main.jsx`'s own comment: "not linked from anywhere in the UI," reachable only at
  `/app-legacy`). Left untouched throughout, consistent with prior phases' documented
  scope boundary.
- **`SoundMatch`, `SpellItOut`, `GameTypeSelector`, `UpgradeModal`** (inside
  `GameEngine.jsx`) — confirmed unreachable from the live app: `PlayScreen.jsx` (the only
  live entry point into `GameEngine`) never offers `sound_match`/`spell_it_out`, and
  `GameTypeSelector`/`UpgradeModal` are imported only by legacy `App.jsx` (grepped, not
  assumed). Not rebuilt to E2 standard, and their leftover emoji are explicitly exempted
  in `check-no-emoji.mjs` with that reasoning inline. **Correction**: `word_builder` was
  originally (incorrectly) assumed to be covered by this same exclusion via `SpellItOut`.
  It isn't — `word_builder` renders `src/games/WordBuilder.jsx`, a separate file, and is
  directly offered by `PlayScreen.jsx`'s activity list. See `docs/WORDBUILDER_FIX_REPORT.md`.
- **Landing page** (`pages/landing/`) — a separate, previously-approved dawn-gradient
  design system that predates this redesign. Two small data files there still have emoji;
  out of scope for the candy-galaxy `DESIGN_BRIEF.md` this pass enforces.
- **`WordGalaxyMap.jsx`** — only consumer is legacy `App.jsx`; same exclusion by
  inheritance.
- **`LoginScreen.jsx`'s broader visual system** — already-documented pre-existing scope
  boundary ("restyling the auth surface itself is out of Phase 1 scope... a seam, not a
  bug" — see the file's own header comment). Only its 2 emoji were removed; the
  Tailwind/legacy-styled auth surface itself wasn't touched.

## Verification proof

- `npm run check:no-emoji` — new script (`scripts/check-no-emoji.mjs`), scans every
  `src/**/*.js(x)` for emoji-range Unicode characters, exits non-zero on any hit outside
  the itemized, individually-justified exception list above. Sanity-checked the test
  itself catches real violations (planted one, confirmed failure, removed it) before
  relying on the clean pass.
- `npm run lint` — 99 problems throughout every step, byte-identical to the pre-existing
  baseline on `main`. Nothing in this pass added lint debt; verified via `git stash` diffs
  at each step, not assumed.
- `npm run build` — clean at every step.
- Playwright (`tests/smoke.spec.js`) — full suite (3/3) run for real against the live
  Supabase project after every step that touched a tested flow (steps 5, 7, 8), not just
  once at the end. Fixed 2 real test regressions this pass caused (avatar picker, Grown-ups
  hold gate — both previously matched by literal emoji text that the sweep removed) rather
  than leaving them broken or weakening the assertions.
- Visual verification: every step that changed rendered UI was checked with a real
  screenshot via a temporary debug route (always removed before committing), not just
  code review. This caught 3 real issues no amount of code review would have: the
  `fly`/`jump`/`run` WordArt illustrations reading wrong, the galaxy/bubble icons reading
  as an eye/magnifying glass, and (earlier, unrelated to this task but found in the
  working tree) `NovaPortrait`/`NovaSprite` silently rendering broken images.

## Commit/push/deploy discipline

Each of the 8 steps: committed individually, pushed individually, confirmed READY on its
own Vercel preview deployment (verified by fetching the deployment's `githubCommitSha`
from the Vercel API and matching it against the pushed commit — not just "a deployment
happened"). No step was left unverified before starting the next.

**Not merged to `main`** — branch is ready for review at
`ui-candy-polish` / preview `magic-words-git-ui-92aae2-brillianceunleashed92-6054s-projects.vercel.app`.
