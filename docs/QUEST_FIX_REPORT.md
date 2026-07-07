# Quest Progression Fix Report

**Run:** `docs/FIX_QUEST_PROGRESSION.md`, executed 2026-07-07
**Branch:** `fix/quest-progression`
**Bug context from user:** Tap & Hear was completed just now, same sitting,
immediately before observing the stuck "0 of 10 done today" counter — same
day, no overnight gap. This rules out a simple cross-day timing
misunderstanding as the direct explanation (H4's daily-boundary hypothesis
is still checked, but a same-session repro is the priority).

## STEP 0 — RUN TIMING

- Start: 2026-07-07
- Status: IN PROGRESS

## PHASE 1.0 — Reconcile repo state

Status: DONE — no undocumented commits; the "9 vs 10" discrepancy is a
wording slip in a prior report, not a code regression

`git log --oneline 0e69411..HEAD` (checked before making any change on this
branch, branched fresh off `main` at `0e69411`): **empty output.** No
commits exist beyond CONTENT_R1's close-out. This run's own branch is the
only thing ahead of that point.

**Verbatim `ACTIVITY_DEFS`** (`src/lib/activityDefs.js` lines 17-29):

| rank | `id` (game_type key) | label |
|---|---|---|
| 1 | `word_match` | Tap & Hear |
| 2 | `word_hunt` | Word Hunt |
| 3 | `rhyme_time` | Match & Sort |
| 4 | `find_the_word` | Find the Word |
| 5 | `flash_cards` | Quiz Boss |
| 6 | `story_time` | Story Time |
| 7 | `story_builder` | Fill the Story |
| 8 | `word_builder` | Word Builder |
| 9 | `say_it` | Say It with Nova |
| 10 | `draw_it` | Draw It |

**10 entries, confirmed** — matches the bug screenshot's "0 of 10," not a
recent addition. Traced this against the DEVICE_PREP run's own live evidence
(same file, browsed directly in that session, `docs/DEVICE_PREP_REPORT.md`):
that report's screenshots at the time showed "8 of 10 done today" and "2
more to go" after finishing Word Builder — i.e., the live UI already said
**10** in that session. That report's *prose*, though, says "gates all 9
activities" and "reaching rank 9" — sloppy wording on my part (describing
Say It as sitting at rank 9 of the sequence, not stating the total count),
not a discovery that the file had 9 entries. **No code change has happened
to `ACTIVITY_DEFS` between that session and now** — it was already 10
entries with "Fill the Story" at rank 7 back then. This is a documentation
imprecision, not the "#1 regression suspect" the prompt doc worried it might
be — ruled out as the explanation for Sal's bug, cleanly, with a receipt.

## PHASE 1 — Reproduce

Status: IN PROGRESS

## PHASE 2 — Root cause

Status: IN PROGRESS

## PHASE 3 — Fix

Status: IN PROGRESS

## PHASE 4 — Regression tests

Status: IN PROGRESS

## PHASE 5 — Ship + prove on production

Status: IN PROGRESS

## COMPLETION

Status: IN PROGRESS
