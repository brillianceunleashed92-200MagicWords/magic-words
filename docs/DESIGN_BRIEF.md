# 200 Magic Words — Candy Galaxy Design Brief

Locked reference for the `ui-candy-polish` rebuild. Source: `docs/mockup-D-candy-galaxy.html`
(home/dashboard direction) and `docs/mockup-E2-no-emoji.html` (lesson-screen gold standard +
illustration style reference — built as part of this same pass, see `docs/UI_POLISH_REPORT.md`
for provenance). No plugin was used to generate this file — authored directly from the two
mockups since no design-brief plugin is installed in this environment.

This document is the single source of truth for anything touching visual language in this
codebase. If a component's styling contradicts this file, the file wins — fix the component.

## 1. Color tokens — locked

| Token | Hex | Use |
|---|---|---|
| `--sky` | `#5B4BD6` | primary background gradient start, primary chrome |
| `--sky-deep` | `#3D2FA8` | background gradient mid, porthole shadow |
| `--sky-night` | `#2B2080` | background gradient end |
| `--sun` | `#FFC531` | streak/star accents, ignited progress fill, primary "positive" glow |
| `--mint` | `#3EE0B8` | success/correct accent, hint-glow color |
| `--bubble` | `#FF6FA5` | "current" state accent, playful accent fills |
| `--tang` | `#FF8A4C` | secondary warm accent, confetti color |
| `--cloud` | `#FFFFFF` | all card/tile surfaces — never tinted |
| `--ink` | `#2A2160` | all text on light (cloud) surfaces |

Animal illustration palette (locked, verbatim from `mockup-E2-no-emoji.html` — every
`WordArt.jsx` illustration reuses these exact hexes, never invents new ones without updating
this table and the mockup together):

| Word/family | Fill | Outline (stroke) | Inner/accent |
|---|---|---|---|
| dog | `#FFB84D` | `#A66A1B` | `#FFF1D6` |
| elephant | `#B8B4E8` | `#6B63B5` | `#E8E6FF` |
| cat | `#FF8A4C` | `#B35A28` | `#FFD9BE` |
| bird | `#5EC8F2` | `#2E86AB` | `#CDEFFF` |
| (shared) blush cheeks | `#FF8FA8` | — | — |
| (shared) eye dot | `#2A2160` | — | — |

New WordArt illustrations (frog, eat, fly, jump, run, big, sad, etc.) each get their own
fill/outline/inner triad in the same relationship as the table above (outline is always a
noticeably darker shade of the fill; inner/accent is always a pale tint) — do not reuse an
existing animal's exact hex triad for an unrelated word.

## 2. Type — locked

- **Display**: `'Baloo 2', sans-serif`, weights 600/700/800. Headlines, prompts, buttons,
  labels, numerals — anything that needs to feel chunky and kid-friendly.
- **Body**: `'Quicksand', sans-serif`, weights 500/600/700. Everything else (base `body`
  font-family).
- No other font family is introduced anywhere in the candy-galaxy surfaces.

## 3. The chunk shadow — locked

```css
--chunk: 0 8px 0 rgba(0,0,0,.16);      /* large surfaces: hero cards, tiles, primary buttons */
--chunk-sm: 0 5px 0 rgba(0,0,0,.14);   /* small surfaces: pills, icon buttons, bubbles */
```

Every elevated candy-surface element (card, tile, button, pill, bubble) uses one of these two
flat offset-shadow values — never a blurred `box-shadow`. Every one of those elements also gets
a **press-down active state**: `transform: translateY(Npx)` on `:active` (or a `.pressed` class
for JS-driven taps), where `N` is roughly the shadow's vertical offset minus 2–3px, so the
element visibly "pushes into" its shadow. This is not optional per-component — it's the base
interaction contract for anything using `--chunk`/`--chunk-sm`.

```css
.tile:active,.tile.pressed{transform:translateY(6px) scale(.98) !important;box-shadow:0 2px 0 rgba(0,0,0,.16) !important}
```

## 4. Lesson stage layout — locked

- Centered, **`max-width: 780px`**, no wider on any viewport.
- Low-motion chrome: top bar (close + star-progress segments + speaker), Nova porthole +
  speech bubble, prompt text, then the answer area. No scroll-driven choreography inside the
  lesson stage (that's a landing-page/Word-Galaxy technique, not a daily-use lesson screen —
  same low-motion rule CLAUDE.md already established for dashboards).
- Answer tiles: **2×2 grid of big-art tiles**, `max-width: 560px`, centered within the stage.
  Each tile: `border-radius: 32px`, `--chunk` shadow, `cloud` background, staggered spring
  entrance (`cubic-bezier(.2,.9,.3,1.5)`, ~0.1s stagger per tile), hover-lift
  (`translateY(-6px) scale(1.02)`), press-down on tap.
- Star progress: horizontal row of pill segments across the top, each "ignitable" — fills
  left-to-right with `--sun` gradient and pops a small star icon when lit, `cubic-bezier(.2,.9,.3,1.3)`
  transition.
- Nova porthole: circular framed window (`border-radius: 50%`, white border, `--chunk-sm`
  shadow), Nova sprite inside swaps pose (idle float vs. celebrate bounce) via a state class,
  paired with a speech-bubble reaction (`border-radius: 22px 22px 22px 4px`, tail-corner
  pointing at the porthole).

## 5. Errorless-learning scaffold — locked, applies to ALL activities

Per `docs/mlc-engine-audit.md` §6, this scaffold currently only exists in `WordMatch` and must
be extended to all 5 activities during this rebuild:

- First wrong tap: **does not complete the error**. The wrong tile plays a `wiggle` animation
  (~450ms, small rotate/translate, no color change to red) and **softens** (`filter: saturate(.55); opacity: .55`)
  so it visually recedes without looking like a punishment.
- The correct tile gets a **persistent hint-glow** (`--mint`-colored pulsing ring, `hintPulse`
  keyframe) that stays lit until answered.
- Only a second miss on the same question lets the error complete and advances the session.
- **No red anywhere in this flow. No X marks, ever.**

## 6. Correct-answer celebration — locked

- Tile gets a `--mint` glow ring (`correct-flash`).
- Nova plays its celebrate pose (bounce + wider smile).
- Speech bubble updates with an affirming, specific line (not generic "Correct!").
- SVG star-shaped confetti bursts from the tile center, using `--sun`/`--mint`/`--bubble`/`--tang`,
  short-lived (<1s), `cubic-bezier(.2,.8,.3,1)` ease-out.
- Star progress segment ignites.
- Per CLAUDE.md's existing "mastery is the reward" principle: this per-question celebration
  stays this size. Level-up/unit-complete gets the bigger, rarer treatment already documented
  there (`LevelUpCelebration.jsx`) — do not scale this one up to match it.

## 7. FORBIDDEN patterns

These are hard rules, not preferences. A PR that reintroduces any of these against this brief
is a regression, not a style choice:

1. **No emoji characters anywhere in shipped UI.** Not in JSX text, not in string constants
   used for rendering, not in fallback content. Illustration = `WordArt.jsx` (picturable
   content-track words) or the typographic treatment (sight-track words); chrome icons =
   `src/components/icons/`. Enforced by a grep-based test (see `docs/UI_POLISH_REPORT.md` for
   the actual test added).
2. **No full-width answer bars.** Answer options are always big-art tiles in a 2×2 grid (or the
   grid pattern appropriate to the activity), never a stacked list of full-width rows — that
   reads as a form, not a game.
3. **No red error states or X marks.** See §5 — wrong answers wiggle, soften, and redirect to
   the glowing correct tile. Red is not in the token palette for a reason.
4. **No flat, unstyled cards.** Every card/tile/button/pill uses the `--chunk`/`--chunk-sm`
   shadow + press-down contract from §3. A `box-shadow: none` or default-browser-button
   anywhere in candy-galaxy surfaces is a bug.

## 8. Icon weight reference

Chrome icons (`src/components/icons/`) match the stroke/fill weight already established in
`mockup-E2-no-emoji.html`'s top-bar icons: simple geometric strokes at `stroke-width: 2.4–3`,
white or `--ink` depending on surface, no multi-color detail, no gradients, no drop shadows on
the icon glyph itself (the containing `--chunk-sm` surface carries the depth). Icons are
symbols, not illustrations — that distinction is what separates `icons/` from `WordArt.jsx`.

## 9. Provenance note

`docs/mockup-E2-no-emoji.html` did not exist anywhere in this repository or its git history when
this rebuild started, despite being named as the pre-existing gold standard. It was built as
step 2 of this same `ui-candy-polish` pass, directly from the detailed spec given for the
lesson-screen rebuild, and verified live in-browser before being locked in here. Flagging this
plainly rather than presenting it as a pre-existing asset — see `docs/UI_POLISH_REPORT.md` for
the full account.
