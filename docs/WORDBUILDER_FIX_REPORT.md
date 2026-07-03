# Word Builder Fix Report — `ui-candy-polish`

Branch: `ui-candy-polish`, off `main`, **not merged**. 2 commits (`8a5dcf6`,
`4edd06b`), both self-verified (lint/build/`check:no-emoji`/Playwright/live
screenshots) and confirmed green on their own preview deployments.

Three bugs were reported against two screenshots of the deployed preview: a
beige background with emoji despite a passing `check:no-emoji`, an invalid
morphology prompt ("frog" + "ing" → "froging"), and a tile-count mismatch
(4 locked tiles + 3 empty for a word that can't validly fill 7 slots).

## Bug 1 — reachability and styling

**The screenshots are `src/games/WordBuilder.jsx`, not `SpellItOut`.**

The previous `UI_POLISH_REPORT.md` claimed `SpellItOut` (a function inside
`GameEngine.jsx`) was confirmed unreachable and exempted it from both the
E2 visual rebuild and the emoji check. That claim is correct — `SpellItOut`
really is dead, confirmed again here via grep of `PlayScreen.jsx`'s
`ACTIVITIES` array. The mistake was assuming `word_builder` (the activity
tile actually offered on Play) rendered `SpellItOut`. It doesn't — it
renders `WordBuilder.jsx`, a completely separate file that was **never
audited at all** during the UI polish pass, not exempted for a real reason.

Two independent problems compounded into "still looks like the old app":

1. **Wrong background.** `WordBuilder.jsx` had no background styling of its
   own, so it inherited whatever the orchestrator gave it. `word_builder`
   wasn't in `GameEngine`'s `isE2Activity` list, so it fell back to the
   pre-redesign `T.bg`/Cloud path instead of the candy sky-gradient every
   rebuilt activity uses. Fixed by adding `'word_builder'` to that list
   (`src/games/GameEngine.jsx`).
2. **Runtime emoji, not source emoji.** The component rendered
   `{quiz.emoji}` — a value from data, not a literal character in the file.
   This is exactly why `check-no-emoji.mjs` reported clean while the
   screenshots showed 🐸/🐶: the script is a static source grep, and there
   was no emoji character anywhere in `WordBuilder.jsx`'s source to find.
   Traced the actual origin: `api/session-generator.js`'s `ALL_WORDS` list
   (the real AI-backed session generator's word data) carried a literal
   `emoji: '🐸'` per word, which flowed into every `quiz.emoji` reference
   downstream. Fixed by removing the field at the source and swapping the
   render to `<WordArt word={quiz.word} />` (commit `8a5dcf6`).

**While fixing this, found the identical pattern in 4 more live
activities** (`WordSong`, `MagicVideo`, `SayItWithNova`, `DrawIt`) and one
fallback path (`localStory.js`'s offline story generator) — all rendered
`quiz.emoji` directly. Fixed all of them in commit `4edd06b`, along with
the AI prompt in `session-generator.js` that explicitly instructed
"Use emojis" for encouragement text (a runtime-generation source no static
check could ever catch — fixed by changing the instruction, not by trying
to scan Claude's output).

**`check-no-emoji.mjs` only scanned `src/`.** Extended it to also scan
`api/`, which is how `session-generator.js`'s literal emoji went
unnoticed through the entire prior pass. The script's header now states
its real limitation plainly: it proves no literal emoji character ships in
source, not that no emoji can ever appear on screen. Sanity-checked the
extended scanner by planting a violation in `api/` and confirming it's
caught (then removed).

## Bug 2 — invalid morphology ("froging", "doged")

**Root cause:** `WordBuilder.jsx`'s `pickVariant()` chose a suffix
(`''`/`'ing'`/`'ed'`) from a hash of the word's character codes, with zero
knowledge of whether the word was even a verb. "frog" and "dog" are nouns;
neither can take `-ing`/`-ed` in any form.

**Fix:** new `src/lib/wordMorphology.js` — a single source of truth for
"can this word take a suffix, and what's the correct spelling." Word class
alone turned out not to be enough either: of the four verbs in this word
list (the only words `WordBuilder`'s `quiz.word` can ever be, sourced from
`session-generator.js`'s 18-word `ALL_WORDS`), three are irregular past
tense — eat→ate, fly→flew, run→ran, never eated/flied/runed. Only `jump`
is a regular verb that can validly take both `-ing` and `-ed`. Each verb's
valid suffix list is explicit and hand-curated rather than derived from a
blanket "is a verb" rule:

| word | valid suffixes | why |
|---|---|---|
| eat | ing | irregular past ("ate"), -ed excluded |
| fly | ing | irregular past ("flew"), -ed excluded |
| run | ing (CVC-doubled → "running") | irregular past ("ran"), -ed excluded |
| jump | ing, ed | regular verb, both real words |
| nouns/adjectives/function words | none | never inflected |

`inflect(word, suffix)` handles CVC-doubling (`run` → `running`, not
`runing`) and e-drop, and throws in dev if ever asked for a suffix outside
a word's valid list — a defensive check that should be structurally
unreachable given `pickValidSuffix()`, but is exactly the kind of silent
corruption that produced "froging" in the first place.

## Bug 3 — tile-count math ("impossible" 7-slot puzzle)

**Turned out not to be a separate bug.** The tile/slot construction code
was already internally consistent — slots always equal `target.length`,
and the tray always contains exactly `target`'s letters, shuffled. The
"impossible puzzle" was a direct symptom of Bug 2: once the target itself
("froging") wasn't a real word, no tray could ever fill it validly, even
though the construction math producing that tray was correct by its own
(insufficient) rules. Confirmed this collapses once Bug 2's fix is in —
see verification below.

Added dev-mode invariant assertions in `WordBuilder.jsx` anyway, per the
request and matching the Story Engine validator's spirit: asserts the
picked suffix is actually in the word's valid list, and that the tray's
letters (sorted) exactly match the target's letters (sorted). Fails loudly
in dev if either is ever violated, rather than silently shipping a broken
puzzle again.

## Verification

All verification was live, via a temporary debug harness (`/_debug_*`
routes, removed before each commit) rendering `GameEngine` with
`gameType="word_builder"` and hand-picked words — not simulated, not
assumed from code review.

- **frog** (noun): base form only, 4 tiles (F/R/O/G), no suffix text shown.
  Played through F→R→O→G to completion — 1/1 correct.
- **dog** (noun): base form only, 3 tiles (D/O/G), no suffix text shown.
- **jump** (verb, both suffixes valid): deterministic pick landed on base
  form for this word's hash — a valid choice (`''` is always in the option
  set).
- **run** (verb, -ing only): picked "add ing", 7 tiles (G,I,R,U,N,N,N) —
  sorted, exactly the letters of "running" (correctly CVC-doubled). Never
  offered the invalid "runed".
- **eat** (verb, -ing only): base form picked, 3 tiles (A,T,E), no invalid
  "-ed" ("eated") ever offered.
- **fly** (verb, -ing only): picked "add ing", 6 tiles (I,N,F,L,G,Y) —
  sorted, exactly "flying". Never offered the invalid "-ed" ("flied").
- **Say It with Nova** (spot-check of the sibling `quiz.emoji` fix):
  renders "frog"/"dog" as plain text, no emoji artifact.

An early run of the debug harness showed a stale "Session Complete"
screen with no interaction — traced to leftover browser/HMR state from
prior debugging in the same tab, not a real bug (a hard reload reproduced
the correct fresh-load behavior every time after; confirmed by adding a
temporary `console.log` trace to `tapLetter` that never fired during the
stale state, then confirmed it fired correctly post-reload).

- `npm run lint` — 99 problems, exact baseline parity, unchanged by this fix.
- `npm run check:no-emoji` — clean, including the new `api/` coverage.
- `npm run build` — clean.
- Playwright (`tests/smoke.spec.js`) — full suite (3/3) against live
  Supabase, run after both commits.
- Both commits confirmed `READY` on their own Vercel preview deployment
  (matched by `githubCommitSha`, not just "a deployment happened").

## What's still open, flagged rather than silently expanded into

- **The three other divergent word lists.** This fix surfaced that
  `WordBuilder.jsx`'s `quiz.word` can only ever be one of the 18 words in
  `api/session-generator.js`'s `ALL_WORDS` — a completely separate,
  much smaller list from the real 200-word Supabase `words` table (which
  has its own `teaching_track` column from an earlier phase) and from
  `useSessionPlan.js`'s 10-word client-side fallback. All three can drift
  independently. `src/lib/wordMorphology.js`'s coverage matches the
  18-word list on purpose — extending the real curriculum's full verb set
  into this file, or unifying the three word sources, is a real, separate,
  larger piece of work, not bundled into this bug fix.
- **The AI's own encouragement/wrongAnswerMessage text** is no longer
  instructed to include emoji, but nothing enforces that at the response
  boundary — a determined enough model output could still slip one
  through. No static check can fully close this; flagged, not solved.
- **The four sibling activities fixed for the emoji leak** (`WordSong`,
  `MagicVideo`, `SayItWithNova`, `DrawIt`) still render on the old
  pre-redesign token system, not the E2 candy standard `WordBuilder.jsx`
  now uses. Only their emoji leak was fixed here — a full visual rebuild
  of those four was out of scope for this specific bug report.

## Round 2 (2026-07-03) — live audit against the deployed preview

A follow-up report described emoji still visible on the primary quiz
screen (a "dog" quiz showing ✅/🐶/✈️/📖 as answer options, including a
checkmark as a nonsense answer), a `fly.png` 404 in the console, emoji in
the bottom nav (🎮🌌🧑‍🤝‍🧑) and `SessionComplete`'s word chips, and Nova
still showing a CSS placeholder instead of the real PNG art — all
allegedly slipping past `check:no-emoji` because its exemption list was
hiding real violations.

### What actually happened, and how it was found

Rather than trust the round-1 report's exemption reasoning or the
screenshots' visual appearance, this round did a live audit: signed into
the actual deployed `ui-candy-polish` preview with a real provisioned
account, played a full `WordMatch` session end to end (6 rounds,
including a genuine "dog" quiz and a genuine "fly" quiz — the exact
scenarios named in the report), and inspected the rendered DOM directly
rather than eyeballing screenshots.

**None of the four specific bugs reproduced on `ui-candy-polish`.** Every
element that looked emoji-like in a screenshot turned out, on direct DOM
inspection, to be a real hand-drawn SVG (`WordArt`'s `CatArt`, `HomeScreen`'s
`RocketInline`/`AvatarRocket`) — visually similar to an emoji by design
(they're meant to read as friendly cartoon icons), but confirmed via
`querySelector('svg')` child-count matching the source component exactly,
not a literal character. The "dog" quiz, played live, showed real
`WordArt` illustrations and typographic chips for every option — no
checkmark, no emoji. No `fly.png` reference exists anywhere in this
codebase (`WordArt.jsx` has zero external image references at all — grepped
directly); the "fly" quiz round, played live, showed the `FlyArt` SVG
correctly with zero network 404s for the entire session (confirmed via
`performance.getEntriesByType('resource')`). The bottom nav and
`SessionComplete` chips were confirmed via `document.body.innerText` to
contain zero emoji-range characters. Nova's real PNG art was confirmed
loading successfully (not falling back) in the quiz porthole, Home hero,
and story card via network resource timing (first load at full ~1.5MB
size, cached on repeat) and a zoomed screenshot of the actual rendered
pixels.

**Strong evidence points to the screenshots being taken against
`200magicwordsapp.com` instead of the `ui-candy-polish` preview.** That
domain has `gitBranch: null` in its Vercel config, meaning it serves
whatever is deployed to Production — which is `main`, untouched by any of
this branch's work (explicitly never merged, per the original
instruction). The very first tab open in this session's browser was that
domain, showing a completely different Home screen layout (round avatar
image, differently-structured hero card) with exactly the emoji described
in the report (🚀🔥⭐💎 stat cards, 🎮🌌🧑‍🤝‍🧑 bottom nav) — none of which
match any component in this branch's source. This is stated plainly
rather than glossed over: **test against the actual preview URL for this
branch, not the production custom domain, to keep future reports
accurate.**

### What the audit found that WAS real, and fixed

Pushing back on a report doesn't mean nothing was wrong — the audit found
two genuine issues the round-1 `check:no-emoji` had missed, both for a
reason worth understanding:

1. **`WordRise.jsx` (landing page) had a real, live emoji** — a placeholder
   astronaut (🧑‍🚀) in the word-rise-into-Nova sequence, plus 5 dead
   `emoji` fields in `sampleWords.js` that were never actually read by
   their only consumer. Round 1's `check-no-emoji.mjs` exempted the whole
   landing page with a category error, not a factual one: "separate,
   previously-approved design system" was treated as sufficient grounds
   for an exemption, but the landing page IS reachable — it's the root
   route, the first thing every visitor sees. Fixed: the placeholder now
   renders the real Nova PNG (CLAUDE.md already documented the emoji as
   "placeholder... until Higgsfield final version" — this fulfills that
   exact intent), and the dead `emoji` fields were removed rather than
   left as inert data carrying a literal character.
2. **`check-no-emoji.mjs`'s exemptions were asserted in comments, never
   proven.** Rewrote it so `assertUnreachable()` mechanically walks the
   actual same-repo import graph from the real live entry points
   (`Landing.jsx`, `CandyGalaxyShell.jsx`) at run time and throws if an
   "exempt" file turns out to be reachable — verified this actually works
   by temporarily wiring `App.jsx` into `Landing.jsx` and confirming the
   check failed loudly, then reverting. A future change that accidentally
   makes legacy code reachable again now fails automatically instead of
   depending on someone noticing.

Also added `tests/no-emoji-live.spec.js` — a genuinely different kind of
proof than the source grep, requested explicitly: drives the real running
app in a headless browser, plays a full quiz session, and asserts zero
emoji-range characters in `document.body.innerText` and zero image 404s
at every screen, with automatic screenshots on failure. Verified this
catches real violations by planting one in `HomeScreen.jsx`, confirming
the test failed with the right screen name and a saved screenshot, then
reverting.

### Nova: already wired, fallback removed anyway

The PNGs were already correctly wired to `NovaSprite.jsx`/`NovaPortrait.jsx`
and loading successfully (see audit findings above) — the "still shows
CSS placeholder" half of the report didn't reproduce. What WAS real:
`NovaSprite.jsx` had a silent `onError` fallback to a CSS-built sprite,
which the report's own request called out as worth removing regardless
("a missing image fails visibly instead of silently showing the
placeholder") — a legitimate defensive improvement independent of current
pass/fail state. Removed it, along with the 3 CSS keyframes that existed
only to animate it (confirmed zero other consumers before deleting).

### Nova PNG compression

Real and needed: the 4 PNGs were 1024×1024 (Higgsfield's native output)
despite rendering at 88–130px everywhere they're used — 8–11× oversized.
Resized to 256×256 (still 2×-retina-safe): 1.29–1.51MB → 37–45KB per file.
Added WebP versions alongside (7.7–11.4KB, preserving transparency) served
via `<picture><source type="image/webp">` with the compressed PNG as
fallback. Verified in a real browser that Chrome actually requests the
`.webp` (not the PNG), and that a zoomed screenshot of the rendered pixels
shows no visible quality loss at display size.

### Round 2 verification

- `npm run lint` — 99/100 (100 includes the new Playwright test file,
  which adds one instance of an already-existing `process`-in-tests
  ESLint gap shared with `smoke.spec.js` — confirmed via diffing against
  the file removed, not assumed).
- `npm run check:no-emoji` — clean, with the new mechanical reachability
  proof passing (and verified to actually fail when reachability is
  simulated).
- `npm run build` — clean at every commit.
- Full Playwright suite (4/4, including the new live-DOM test) — passes
  against real Supabase, at every commit that touched a tested surface.
- 5 commits, each pushed individually and confirmed `READY` on its own
  preview deployment (matched by `githubCommitSha`).

**Not merged to `main`.**
