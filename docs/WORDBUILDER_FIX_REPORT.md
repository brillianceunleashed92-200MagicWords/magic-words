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

**Not merged to `main`.**
