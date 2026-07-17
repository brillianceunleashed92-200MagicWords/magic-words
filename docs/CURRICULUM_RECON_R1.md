# CURRICULUM_RECON_R1

**Status: analysis only. No app code, no `words` table edits, no Supabase migration were applied. Everything in Section 3 is a proposal to review, not a change that has been made.**

Date: 2026-07-17
Scope: reconcile the current live curriculum (Supabase `public.words`, 200 rows) against Dr. Blank's newly-consolidated 100 content + 100 non-content word list (`docs/design/curriculum/200MW_word_list_100_100.md` / `.xlsx`).

## Sources compared

- **Dr. Blank's list**: `docs/design/curriculum/200MW_word_list_100_100.md`, cross-checked against the `.xlsx`'s three tabs (Content Words, Non-Content Words, Method/Cuts/Flags — all three agree with the `.md`). 100 content headwords + 100 non-content headwords (101 once `a / an` is split into two literal words), consolidated from her Nov 2024 and Mar 2026 source docs.
- **Current live curriculum**: `supabase/migrations/0001_words.sql` (base schema) → `0014`/`0019`/`0020`+ (added `teaching_track`, `word_type`, `has_art`) → `supabase/seed/words_seed.sql` (200 rows, the actual data). This is the real, in-use table — `src/App.jsx`'s old hardcoded `WORDS` array (documented in `CLAUDE.md`) has already been migrated into this table per the seed file's header comment ("Auto-generated from src/App.jsx WORDS array... 200 rows"). **CLAUDE.md's "Word Galaxy" section describing a hardcoded `WORDS` array is stale** — the array was a one-time seed source, not the live data model anymore.
- Also read: `docs/words-classification-audit.md` (a prior audit of the DB's content/function split) and `src/lib/wordMorphology.js` (the only forms/inflection logic that exists anywhere in the codebase today).

## 1. Her 100/100 vs our current set

**Headline finding: these are two almost entirely different word lists**, not a list that needs light editing. Only 86 of 200 words (43%) match by both spelling and classification.

| | Count |
|---|---|
| Current DB: content / function | 155 / 45 (200 total) |
| Blank's list: content / non-content | 100 / 100 (200 total, 201 split literal words) |
| Clean matches (same word, same class) | 86 (42 content + 44 non-content) |
| Classification mismatch (same word, different class) | 1 (`one`) |
| In Blank's list, missing from DB entirely | 114 (58 content + 56 non-content) |
| In DB, absent from Blank's list entirely | 113 (112 content + 1 function: `or`) |

### Words to ADD (in Blank's list, not in the DB at all) — 114

**Content (58):** animal, ask, bug, change, come, computer, cry, day, dig, dirt, drink, face, fat, find, fix, food, get, ground, hole, home, hungry, hurt, kid, know, make, mice, move, name, need, nice, park, pet, place, plane, pool, put, rest, robot, rocket, sand, scare, smile, swing, take, talk, tell, thing, think, top, toy, truck, try, use, walk, way, wing, work, yell

**Non-content (56):** about, again, also, am, an, any, are, be, both, by, could, did, each, even, every, from, have, her, him, his, just, like, most, much, near, never, nothing, of, once, only, other, our, out, over, say, some, somebody, still, such, than, their, them, these, those, too, us, very, want, was, were, which, who, why, will, would, your

### Words to DROP (in the DB, absent from Blank's list) — 113

**Content (112):** ant, apple, ball, banana, bear, bed, bee, black, blue, book, box, bread, brown, bus, cake, car, catch, chair, clock, cloud, cold, color, cookie, count, cow, cup, cut, dad, dance, dirty, door, draw, dry, ear, egg, eight, empty, eye, fast, fire, five, flower, foot, four, friend, full, funny, gold, grapes, gray, green, hair, hat, heart, hop, horse, hot, ice, juice, learn, light, lion, loud, milk, mom, monkey, mouth, new, nine, nose, old, orange, paper, pencil, phone, pig, pink, pizza, pretty, pull, purple, push, quiet, rabbit, read, red, seven, share, shark, shoe, sing, six, sky, small, snow, soup, stand, star, table, teeth, ten, three, throw, turtle, two, wet, white, wind, woman, write, yellow, zero

**Function (1):** or

Almost the entire current content bucket — colors, foods, animals beyond a handful, numbers, body parts, household objects, most adjectives — has no counterpart in Dr. Blank's consolidated list at all. This isn't drift at the margins; the DB's content vocabulary looks like it was built from a generic "common kid words" list (colors, animals, food, furniture) rather than from either of Dr. Blank's two source documents. Recommend confirming with her whether these ~112 words are meant to be cut outright, or whether her Nov/Mar source docs simply didn't capture a category (numbers, colors) she still wants taught — the Method tab's cut list only explains 8 specific removed words (same, group, luck, float, better, real, ever, idea), nowhere near 112.

### Classification mismatch — 1

- **`one`**: DB tags it `content` / `word_type: number`. Dr. Blank's list places it in the **non-content** table (row 28, unit 9). This is the only word present in both lists under different classifications.

### Data-quality note carried over from Dr. Blank's own source docs

The xlsx's Method tab lists "Reinstated from Nov 2024 (gold rows)... Non-content: **said**, our, again, because, why, after" — but the actual consolidated table's non-content rows 94–100 (tagged "Reinstated from Nov 2024") are **down**, each, our, again, because, why, after — `said` does not appear where the Method tab says it should, and `down` isn't mentioned in the Method tab's reinstated list. `said` is in fact already covered as a form of `say` (row 68, non-content), so this looks like a stale note left over from an earlier draft rather than a real gap — flagging for her confirmation rather than silently resolving it either way.

## 2. Teaching-order deltas

The two systems are structurally incompatible, not just numbered differently. A sample of the 86 words that exist in both lists, with each system's unit number, shows no correlation at all:

| word | DB unit | Blank unit | word | DB unit | Blank unit |
|---|---|---|---|---|---|
| cat | 1 | 2 | dog | 1 | 9 |
| big | 5 | 7 | help | 4 | 14 |
| open | 4 | 25 | sleep | 4 | 28 |
| house | 9 | 20 | tree | 16 | 30 |
| the | 11 | 3 | more | 18 | 1 |
| do | 18 | 7 | down | 13 | 30 |

Two different design philosophies, not just two different orderings:

- **Current DB (18 units)**: thematic/topical grouping — unit 1 is "small zoo/pet animals" (cat, dog, bird, fish, bear, ball, book, cup), unit 8 is "colors," unit 10 is "numbers," etc. Content and function words live in almost entirely separate unit ranges (function words only appear in units 11–13 and 18); they are not taught unit-by-unit alongside each other.
- **Blank's list (30 units)**: finer-grained, sentence-construction-order sequencing — each unit is 2–7 words mixing parts of speech (Unit 1: kid, girl, boy + non-content some, a/an, more; Unit 3: eat, fly, rest + the, can, are, here, not), and **content and non-content units share the same unit number by design** — this is the "content + function word pairing" principle CLAUDE.md's product blueprint calls out as Dr. Blank's core insight ("we teach [function words] in context from day one"). The current DB does not implement this pairing at all.

Recommendation: teaching order can't be reconciled by renumbering the existing 18 "units" — they'd need to be rebuilt as Blank's ~30 paired content/non-content units, which is a bigger structural change than a word-swap. Flagging for a scoping decision, not proposing a fix here per the hard-stop.

## 3. PROPOSED forms schema (not applied)

### Current state: there is no forms data anywhere for any of the 200 words

- `public.words` has no `forms`/`plural`/`tense` column at all (confirmed against every migration file `0001`–latest touching `words`).
- The only forms/inflection logic in the whole codebase is `src/lib/wordMorphology.js` — a hand-written JS map, not DB data. It covers **8 words** for word class (`cat, dog, bird, frog, eat, fly, jump, run`) and **4 words** for valid suffixes (`eat, fly, run, jump` — `-ing` only, since all four have irregular pasts it correctly refuses to guess). Its own header comment says expanding to the full 200-word list is an unstarted follow-up.
- Rule-based suffix inflection (what `wordMorphology.js` does) **cannot satisfy Dr. Blank's rule on its own** — her list marks irregular forms explicitly (`eat→ate*`, `go→went*`, `tell→told*`, plus `get→got` and `have→had` per the Method tab), and irregulars are exactly the case a suffix rule can't derive. Forms need to be stored as data, not computed.

### Proposal: additive `forms` JSONB column on `public.words`

Chosen over a normalized `word_forms` join table because every migration touching this table so far (`teaching_track`, `word_type`, `has_art`) has followed the same pattern — a single additive column on `words`, no new tables, no joins — and every consumer (`session-generator.js`, `useSessionPlan.js`, the game components) already fetches `words` by row by id/word rather than joining. A JSONB array keeps that one-row-per-word shape intact and is still directly queryable (`jsonb_array_elements`) if a future feature needs to query across all words' forms at once.

```sql
-- PROPOSED — NOT APPLIED. For review only.
alter table public.words add column if not exists forms jsonb;

comment on column public.words.forms is
  'All taught forms for this headword per Dr. Blank''s all-forms rule '
  '(base + plural + tense/conjugation, taught together, counted as one word). '
  'Array of {form, type, irregular}. First element is always the base/headword '
  '(equal to words.word). NULL only during backfill — every row should end up '
  'with at least one element.';

-- Informal type enum (app-layer validated, not a DB check constraint, so new
-- grammatical categories don't require a migration):
--   base | plural | present_3s | past | past_irregular | gerund |
--   possessive | contraction | other
```

Example rows (illustrative, not applied):

```json
// word: "help"  (regular verb — matches Blank's row 42)
[
  {"form": "help",    "type": "base"},
  {"form": "helps",   "type": "present_3s"},
  {"form": "helping", "type": "gerund"},
  {"form": "helped",  "type": "past"}
]

// word: "go"  (irregular past — matches Blank's row 44, "went*")
[
  {"form": "go",    "type": "base"},
  {"form": "goes",  "type": "present_3s"},
  {"form": "going", "type": "gerund"},
  {"form": "went",  "type": "past", "irregular": true}
]

// word: "big"  (non-inflecting adjective — single form is correct, not a gap)
[
  {"form": "big", "type": "base"}
]
```

This directly supports the "Spot It: hop vs hopping vs hops" form-discrimination ladder item named in her teaching rule: the game reads `words.forms` for a given word and picks 2–3 entries to contrast, using `type` to label them if the UI needs to (or to guarantee it never contrasts two identical-looking forms).

**Not addressed here (deliberately, per hard stop):** the backfill itself (writing real `forms` data for all 200, or however many survive the Section 1 reconciliation), whether `wordMorphology.js` gets retired in favor of reading `words.forms`, and the `not null` + non-empty-array constraint that should land once backfill is complete. All three are natural follow-ups once the word-list and schema shape are signed off.

## 4. Words missing forms data

- **All 200 current DB words are missing forms data** — the column doesn't exist yet, so this is total, not partial.
- Once `docs/design/curriculum/200MW_word_list_100_100.md` is treated as the forms source of truth, two entries in **her own document** are internally inconsistent and will need her call before backfilling:
  - **`get`**: the Method tab says `got→get` is folded in as a taught irregular past form, but the main table's row for `get` only lists `get, gets, getting` — no `got`.
  - **`have`**: the Method tab says `had→have` is folded in, but the main table's row for `have` only lists `have, has` — no `had`.
- One row's "Forms taught" cell isn't actually forms data: **`before`** (non-content, row 92) has the cell value `"teach earlier (her note)"` — a sequencing note, not a form. A literal ingestion of the doc would need to special-case this row to avoid writing a fake form.
- One row names a family of related words rather than inflected forms of one headword: **`somebody`** (non-content, row 93) has `"somebody / anybody / nobody"` in the Forms taught cell. These aren't plural/tense forms of "somebody" — they're three separate indefinite pronouns being taught as a set. The proposed `type` enum in Section 3 doesn't have a good bucket for this (closest is `other`); worth a direct question to her on whether this should become three headwords instead of one entry with unusual "forms."
- Many non-content rows correctly have **no additional forms** (the base is the only taught form) — `the`, `is`, `but`, `not`, etc. don't inflect and this is expected, not a gap. The genuine forms-bearing non-content words are: `can` (can't), `it` (its), `do` (does/don't/doesn't), `like` (likes), `want` (wants), `one` (ones), `have` (has [, had]), `her` (hers), `say` (says, said).

## Summary / what needs a decision before any code or DB work starts

1. Is the ~112-word content overlap gap intentional (her list really does replace most of the current content vocabulary — colors, numbers, animals beyond a handful, food, furniture all drop) or does her source material have gaps that shouldn't become app gaps?
2. `one`'s classification (content vs non-content) — her call, per her own doc's Open Question B/C pattern.
3. Sign-off on rebuilding teaching order around her ~30 paired content/non-content units vs. keeping the current 18 thematic units — these can't be reconciled by renumbering.
4. Sign-off on the proposed `forms` JSONB column shape (Section 3) before any migration is written.
5. Her call on `get`/`got`, `have`/`had`, and the `somebody` family row before backfill.

No files outside `docs/` were touched. No migration was written or applied.
