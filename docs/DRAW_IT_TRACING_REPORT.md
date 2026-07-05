# Draw It → Letter Tracing — Rebuild Report

Tracking doc for `docs/200MW_Prompt5_Draw_It_Tracing.md`. Branch `fix/draw-it-tracing`.
Filled live as work proceeds — sections start IN PROGRESS.

## PRE-FLIGHT — sync state, key presence (existence only)
- `git status` clean at start (only the untracked prompt doc itself).
- `git log origin/main..main --oneline` empty — main was fully pushed before this run started.
- `9c39f25` (Fill the Story merge) confirmed an ancestor of HEAD via `git merge-base --is-ancestor`.
- `SUPABASE_SERVICE_ROLE_KEY`: absent from both the shell environment and `.env.local` at
  first check. Per the gate, stopped and asked Sal rather than guessing/proceeding without it.
  Sal supplied the key; it was appended to `.env.local` (gitignored — confirmed via `.gitignore`
  lines 14-16/37 before writing) and never echoed/printed/logged anywhere in this report or
  any command output — only an existence + length check was run against it.
- Branch `fix/draw-it-tracing` created off `main`.

## BASELINE — current canvas/scoring/reference/T-token state, screenshots
Reproduced live on the local dev server (`npm run dev -- --port 5183`) with two fresh
admin-provisioned accounts (`scripts/admin-user.mjs`), each seeded with `learning_events` for
the 9 activities ranked ahead of Draw It (rank 10 in `src/lib/activityDefs.js`) so Draw It became
the current Guided Path node for a chosen target word. Both accounts deleted after.

- **Has-art word ("cat", unit 1, fresh child, no mastery seeded)**: `DrawIt.jsx` renders "Draw a
  cat!" prompt text, a `<WordArt word="cat" size={80}/>` reference image (real illustration,
  80px, no chunk shadow / plain flex-centered div), a 320×320 white canvas with a plain
  `2px solid` border (`T.border`, i.e. `${ink}1f` — a very faint tint, not a chunk shadow), and
  Clear/Done pill buttons. Freeform drawing works: mouse-down+drag paints a continuous
  `T.teal` (mint) stroke, 6px round-cap, exactly as `draw()` implements. Clicking Clear wipes the
  canvas via `clearRect`. Clicking Done: button becomes disabled + relabels "Saving…", triggers
  `canvas.toBlob` -> Storage upload to the private `drawings` bucket -> signed URL -> a
  `magic_moments` insert (kind `drawing`) -> `onAnswer({correct:true, responseTimeMs, firstTry:true})`
  fires unconditionally (no pass/fail ever possible, matches `SCORELESS_GAME_TYPES` inclusion in
  `questProgress.js`). GameEngine then advances to word 2/6 ("dog") and increments "correct" count
  (1 correct) — confirmed the generic session-level chime path also fires here (draw_it is not
  yet in the `story_builder`-style skip-list at `GameEngine.jsx` ~1782).
- **No-art word ("play", unit 3, units 1-2 + eat/jump/run/swim/fly/dance/sing mastery=100 seeded
  so "play" becomes the lowest-sort_order unmastered pathWord)**: prompt "Draw a play!", and the
  reference slot renders `WordArt`'s **typographic fallback** — a solid Marigold/`sun`-colored
  pill with "play" text — NOT a clean absence. This is the concrete "before" state PART 3/4 must
  fix: DrawIt.jsx calls `<WordArt word={quiz.word} size={80} />` unconditionally, with no
  `quiz.pictureEligible` gate, unlike the StoryBuilder/Fill-the-Story pattern
  (`showCue = !!quiz?.pictureEligible`) that already exists elsewhere in `GameEngine.jsx`.
- **T-token chrome, confirmed by direct read + live screenshot**: top chrome is the OLD
  `SessionProgress` bar (`GameEngine.jsx`, grey segment pills, "Word N of M" text, star-count top
  right, speaker icon) — Draw It is absent from the `isE2Activity` allowlist
  (`GameEngine.jsx` ~1871: `['word_match','word_hunt','rhyme_time','story_builder','flash_cards','word_builder']`),
  so it falls back to the pre-Candy-Galaxy orchestrator chrome + the old full-screen
  `ConfettiBurst`, never the `lessonChrome.jsx` (`NovaPorthole`/`StarProgress`/`ConfettiStars`/
  `AnswerTile`) primitives every rebuilt E2 activity uses. `gameTheme.js`'s `T` object is
  colour-equivalent to `theme/tokens.js` (already remapped in an earlier pass), so the *hues* are
  already correct Candy Galaxy colors — the actual gap is architecture: no chunk shadow
  (`shadows.chunk`/`chunkSm`), no press-down contract, plain CSS border instead of a Cloud card,
  pill buttons styled ad hoc instead of via a shared primitive.
- **Scoring contract to preserve byte-for-byte**: `onAnswer({correct: true, responseTimeMs, firstTry: true})`,
  called exactly once per word, from `handleDone` today. `draw_it` is in `SCORELESS_GAME_TYPES`
  (`questProgress.js`) — stays there; tracing must call `onAnswer` with the identical shape.
- Both fixture accounts (`nextgenprecisiondrones+drawithasArt*`, `+drawitnoArt*`) deleted via
  `scripts/admin-user.mjs delete` after the walkthrough.

## STROKE-DATA ASSESSMENT — letter inventory, options costed, recommendation + decision, stroke-order convention + source
- **Inventory (queried the live `words` table directly, `scripts/db-query.mjs`)**: `select distinct
  word from words` returns exactly 200 rows; lowercasing every word and taking the union of
  characters covers **all 26 lowercase letters, none missing**. Confirms the prompt's "expect
  ~all 26" — it's exactly all 26, so a coverage check has real, non-trivial content to enforce
  (not a tautology over a tiny alphabet subset).
- **Options costed:**
  - **(a) Hand-author the lowercase alphabet, chosen.** Bounded at exactly 26 assets, fully
    controllable start point + direction (both derived from path geometry at render time — see
    TRACING INTERACTION below — not hand-annotated separately, so the manifest only has to stay
    geometrically correct). Built via a small Node generator script (`gen-strokes.mjs`, kept in
    the scratchpad, not committed — its only job was computing arc/line coordinates on a
    consistent grid instead of hand-typing 26 letters' worth of arithmetic) whose output was
    visually QA'd in-browser (rendered all 26 in a temporary debug grid served off the dev
    server, screenshotted, fixed 3 real construction bugs caught only by looking at the render:
    `b`/`p` had their bowl circle centered ON the stem instead of to its right — a copy-paste
    artifact from the straight-stem letters — producing an unrecognizable overlapping shape;
    `r`'s hook arced the wrong way (swept up past the top instead of a short shallow arch); `s`
    was two nearly-flat, too-small arcs that barely read as a curve at all. All three fixed and
    re-verified visually before committing. The debug harness itself was deleted, never shipped.
  - **(b) Derive from font glyph outlines — rejected, with evidence.** Confirmed directly (not
    assumed): a glyph outline from any font (checked via how `@fontsource` packages already
    vendored in this repo — Baloo 2, Quicksand, Atkinson Hyperlegible — ship TTF/WOFF) is a
    closed *fill* path describing the letter's silhouette boundary, not an ordered set of
    pen-strokes — a font's outline for 'a' is one closed loop tracing the OUTSIDE of the bowl,
    then a separate closed loop for the inside of the bowl (a "hole"), with zero notion of "this
    is stroke 1, drawn top-to-bottom, starting here." There is no stroke-order/direction data to
    extract at all; using one would require hand-decomposing the outline into strokes anyway,
    at which point it's no faster than authoring strokes directly and adds a font-parsing
    dependency for no benefit.
  - **(c) Single-stroke vector sources (e.g. Hershey fonts) as a skeleton — not used.** Considered
    as a possible shortcut, but the generator-script approach (a) was already fast enough
    (26 letters, ~1-3 primitive shapes each, computed not hand-tuned) that pulling in an external
    single-line font added a licensing-provenance question (Hershey fonts are public-domain but
    the coordinate data would still need attribution/verification) for no time savings over just
    writing the primitives directly. No such dependency was added; noting the option was
    considered per the prompt's requirement, not because it was actually adopted.
- **Letterform style / stroke-order convention (documented in `letterStrokes.js`'s header
  comment, not just here):** simplified single-story print manuscript — single-story `a`/`g`
  (not the two-story typeset forms), monoline (no serifs, no thick/thin contrast), no cursive
  entry/exit flourishes. Stroke order/direction follows common early-handwriting teaching
  practice: top-to-bottom, left-to-right; every round-bowl letter (`a c d e g o p q`) traces
  counterclockwise starting near 2 o'clock (matching the shape of the letter `c` itself, so the
  bowl direction is internally consistent across every letter that contains one). This is
  explicitly a first, functional MVP glyph set, not a certified occupational-therapy handwriting
  curriculum — flagged honestly in the source header and in NOTES FOR NEXT PROMPTS below.
- **Recommendation followed**: option (a). Authoring cost stayed well within the bounded/
  pragmatic path the prompt expected (26 letters, 1-3 primitive strokes each) — did not balloon,
  so no need to stop and surface options to Sal.
- **Build-time coverage check**: `scripts/check-stroke-coverage.mjs`, same static-source-scan
  technique as `check-wordart-sync.mjs` (reads `letterStrokes.js` as text, regex-extracts the
  manifest's top-level keys — no DB round-trip needed at build time). Unlike WordArt (per-word,
  checked against the live `words.has_art` set), letter coverage only has one meaningful
  invariant ever: does the manifest contain all 26 keys a-z — there is no larger universe to sync
  against since the app only ever renders lowercase a-z (no punctuation/digits/accents), so full
  coverage is a permanent superset of anything the `words` table could contain in the future.
  Wired into `npm run build` right after `check-wordart-sync` (`package.json`), plus its own
  `npm run check:stroke-coverage`. Verified it fails loudly when a letter is removed and passes
  again once restored (see VERIFICATION section for the formal re-run as part of the VERIFY gate).

## TRACING INTERACTION — detection/tolerance implementation, errorless re-cue, demo/idle behavior, audio moment sequencing
IN PROGRESS

## TOKEN MIGRATION — before/after, gameTheme.js reader status
IN PROGRESS

## HOUSEKEEPING — Playwright determinism fix chosen + why, v3 update
IN PROGRESS

## VERIFICATION — coverage-check proof, live checks, overlap-probe result, new spec, gates
IN PROGRESS

## PRODUCTION VERIFICATION — push/deploy confirmation, live walk results
IN PROGRESS

## NOTES FOR NEXT PROMPTS — anything Quiz Boss / Find the Word should rely on (esp. reusable stroke/trace primitives, celebration sequencing)
IN PROGRESS
