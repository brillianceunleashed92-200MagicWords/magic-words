# CURRICULUM_REPLACE_R1

**Status: plan + draft SQL only. Nothing in this document has been applied. No migration file exists under `supabase/migrations/`, no `words` row has been written or changed, no app code was touched.**

Date: 2026-07-17
Decision recorded: **total curriculum replacement approved** — the current 200-word `public.words` set is superseded by Dr. Blank's consolidated 100 content + 100 non-content list (`docs/design/curriculum/200MW_word_list_100_100.md`, corrected version, committed `8877d6b`), per `docs/CURRICULUM_RECON_R1.md`'s findings (only 86/200 words matched — this is a replacement, not an edit).

Constraint for this plan: **non-destructive**. Existing rows are never deleted, dropped, or overwritten. The new set lands as new rows under a version tag and stays invisible to the running app until a flag is flipped.

## 1. What "non-destructive + flag-gated" means concretely

- The existing 200 rows (ids 1–200) are untouched — no `UPDATE`, no `DELETE`, no id reuse.
- Dr. Blank's new set lands as **new rows, new id range (1001–1203)**, tagged with a new `curriculum_version` column so both sets coexist in the same `words` table without colliding.
- A single `app_config` flag row (`active_curriculum_version`) determines which version the app actually reads. It defaults to the **existing** value (`v1-legacy`) — so applying this migration changes nothing a user or child sees, until someone deliberately flips that one row.
- Flipping the flag is a data change (one `UPDATE app_config`), not a schema change or a redeploy — reversible by flipping it back.

## 2. Why this can't be purely additive — the one constraint change required

`supabase/migrations/0001_words.sql` declares:

```sql
word text not null unique
```

**86 of the 200 words in Dr. Blank's list are spelled identically to a word already in the current table** (`cat`, `help`, `sun`, `the`, `is`, `you`, …). A bare `unique(word)` constraint makes it impossible to insert her `cat` row while the current `cat` row still exists — which non-destructiveness requires. The uniqueness grain has to widen from `(word)` to `(word, curriculum_version)`.

This is the **only** non-purely-additive change in this plan. Everything else (new columns, new table, new rows) is a pure addition. Flagging it explicitly rather than burying it in the migration, since "additive-only" is this codebase's established migration norm (see `0001`, `0014`, `0019`, `0020` — every prior migration touching `words` has been column-additive only).

## 3. Proposed schema changes (SQL below is a draft for review — not applied)

Four additive column/table changes, plus the one constraint widen from §2:

1. **`words.forms jsonb`** — per `docs/CURRICULUM_RECON_R1.md` §3's proposal, unchanged here: an array of `{form, type, irregular}` objects, first element always the base form.
2. **`words.curriculum_version text not null default 'v1-legacy'`** — backfills all 200 existing rows to `'v1-legacy'` automatically via the column default; new rows get `'v2-blank-100-100'` explicitly.
3. **`words.notes text`** (optional, easy to drop from the migration if unwanted) — free-text flags for the handful of rows below that needed a modeling call (the `a / an` split, the two pending-unit sentinels). Not read by any app code; purely a breadcrumb for whoever reviews or later edits the seed.
4. **`public.app_config`** — a single-row-per-key table holding the active-version flag, seeded to `'v1-legacy'` so v2 stays dark by default.
5. **`word_progress.curriculum_version text`** — see §5, this is a required companion change, not optional, if the flag is meant to behave the way "flag-gated" implies.

```sql
-- ============================================================
-- PROPOSED MIGRATION — NOT APPLIED, NOT YET A FILE UNDER
-- supabase/migrations/. Draft for review only.
-- ============================================================

-- 1. Forms — per CURRICULUM_RECON_R1.md §3.
alter table public.words add column if not exists forms jsonb;

comment on column public.words.forms is
  'All taught forms for this headword per Dr. Blank''s all-forms rule '
  '(base + plural/tense/conjugation, taught together, counted as one word). '
  'Array of {form, type, irregular}. First element is always the base form '
  '(equal to words.word). NULL only during backfill.';

-- 2. Curriculum version tag — lets v1 and v2 rows coexist.
alter table public.words
  add column if not exists curriculum_version text not null default 'v1-legacy';

comment on column public.words.curriculum_version is
  'Which curriculum edition this row belongs to. v1-legacy = the original '
  '200-word seed (ids 1-200). v2-blank-100-100 = Dr. Blank''s consolidated '
  'list (ids 1001+). Which version is actually served to the app is '
  'controlled by app_config.active_curriculum_version, not by this column '
  'alone — this column only tags rows, it does not filter anything by itself.';

-- 3. Notes — optional documentation column for modeling decisions made
--    during ingestion (see the specific rows flagged in the seed below).
--    Safe to omit this column entirely if it's judged unnecessary --
--    nothing else in this migration depends on it.
alter table public.words add column if not exists notes text;

-- 4. Constraint widen — REQUIRED, not optional (see §2 above). Verify the
--    actual constraint name in the live DB first (`\d public.words` in
--    psql, or the Supabase dashboard's table editor) --
--    `words_word_key` is Postgres's default auto-generated name for a
--    bare inline `unique` on `word`, per 0001_words.sql, but confirm
--    before running this against the real database.
alter table public.words drop constraint if exists words_word_key;
alter table public.words
  add constraint words_word_curriculum_version_key unique (word, curriculum_version);

-- 5. Active-version flag -- one row, one source of truth for "which
--    curriculum is live", read once per app load rather than threaded
--    as a per-query filter condition everywhere. Starts pointed at the
--    existing set so this migration is a no-op from the app's point of
--    view until someone deliberately changes it.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

alter table public.app_config enable row level security;

-- Config is read-only, non-secret app metadata -- same public-read
-- reasoning as the existing "Words are public-read" policy on words.
drop policy if exists "App config is public-read" on public.app_config;
create policy "App config is public-read"
  on public.app_config for select
  using (true);

insert into public.app_config (key, value)
  values ('active_curriculum_version', 'v1-legacy')
  on conflict (key) do nothing;

-- 6. word_progress needs the same version tag -- see §5 below for why
--    this is required, not optional, for the flag to behave correctly.
alter table public.word_progress
  add column if not exists curriculum_version text not null default 'v1-legacy';

create index if not exists words_curriculum_version_idx
  on public.words (curriculum_version, unit, sort_order);

create index if not exists word_progress_curriculum_version_idx
  on public.word_progress (curriculum_version, child_id);
```

## 4. Her content/non-content paired teaching order

Per `CURRICULUM_RECON_R1.md` §2: her list's defining structural feature is that content and non-content words sharing a unit number are **taught together** — this is the "content + function word pairing" principle the product blueprint calls out as Dr. Blank's core insight. The current 18-unit thematic grouping does not do this at all.

The seed below implements the pairing directly in `sort_order`: for each of her ~30 units, all that unit's content words are emitted first (in her original list order), then all that unit's non-content words (in her original list order) — so within any unit, the content words and their paired non-content words sit adjacent in teaching sequence. `unit` itself carries her exact unit number, unchanged.

**Two rows have no real unit number in her source doc** (both shown as `—`):
- **`before`** — her doc's only note was "teach earlier," no specific number. Seeded with a `999` sentinel unit and an explicit `notes` flag — **not a real position, needs her confirmed unit number before this word is production-ready.**
- **`somebody` / `anybody` / `nobody`** — her doc groups these three as one taught family under a single row with no unit number either. Same `999` sentinel treatment, same open flag.

`999` is a deliberate out-of-band value (not a guess dressed up as a real answer) so these four rows are trivially query-able (`where unit = 999`) as "needs her input" before anyone treats this seed as final.

## 5. Old test-account progress — more nuanced than a clean reset

`word_progress` (checked directly: `src/lib/queries/wordProgress.js`) keys rows by **`(child_id, word)` — the literal word text**, not an integer foreign key to `words.id`, and today has no version tag at all. This matters because flipping `active_curriculum_version` does **not** produce a clean reset by itself:

- **The 86 words spelled identically in both lists** (`cat`, `help`, `sun`, …): a child's existing `word_progress` row for `word = 'cat'` would still match by text even after the flag flips to v2 — silently carrying over mastery/attempt counts earned under the old curriculum's `cat` (different unit, no forms) onto the new curriculum's `cat` (different unit, real forms). That's not a reset, that's stale data reappearing under a new context.
- **The 114 words new to v2**: genuinely fresh, no existing progress rows reference them.
- **The 112 words dropped from v2**: existing progress rows for them aren't deleted (nothing in this plan deletes anything) — they just stop being surfaced once the app only queries the active version's words. Orphaned, not destroyed.

**This is why `word_progress.curriculum_version` (migration §3, item 6) is a required companion change, not an optional nice-to-have** — without it, "flag-gated" doesn't actually gate progress, only the word list. With it: existing progress rows get backfilled to `'v1-legacy'` (via the column default, same mechanism as `words`), new progress under v2 writes as `'v2-blank-100-100'`, and the 86-word carryover problem above goes away because a v1 progress row and a v2 progress row for the same spelled word are now distinguishable rows, not one row silently shared.

**Net effect for QA/test accounts**: once both this schema change and the corresponding app-code change (querying/writing `word_progress` scoped by the active version — not built here, flagged as required follow-up app work) are in place, flipping the flag to v2 for a test account **does** behave as a clean reset — no v2 progress rows exist yet for any child, regardless of what they'd done under v1. Real user progress on v1 is never touched or deleted either way.

## 6. Seed — Dr. Blank's 100+100, with forms (draft, not applied)

Derived from the corrected `docs/design/curriculum/200MW_word_list_100_100.md` (commit `8877d6b`). 203 rows, not 200 — see the two splits below.

**Forms classification method**: rather than assuming each word's part of speech (many of her words serve double duty — e.g. `park`, `fish`, `work`, `rain` read as both noun and verb across her list, and several "forms" are actually derived adjectives, not plurals or tenses — `scare→scary`, `sand→sandy`, `rain→rainy`, `sun→sunny`, `dirt→dirty`), every form is tagged from its own surface pattern instead of a hand-asserted noun/verb table for all 100 words:

| Surface pattern | `type` | Example |
|---|---|---|
| equals the headword | `base` | `help` |
| marked irregular in her doc (`*`) or manually known (`said`) | `irregular_form` | `went`, `got`, `had`, `said` |
| ends `n't` | `contraction` | `can't`, `doesn't` |
| known possessive pronoun | `possessive` | `its`, `hers` |
| ends `ing` | `ing_form` | `helping` |
| ends `ed` | `ed_form` | `helped` |
| ends `er` (longer than base) | `comparative` | `slower` |
| ends `y`, base doesn't | `derived_adjective` | `scary`, `sandy` |
| ends `s` (none of the above) | `s_form` | `helps`, `cats` (deliberately not split into plural vs. present-3s — see note below) |
| anything else | `other` | — |

**Why `s_form` isn't split into `plural` vs. `present_3s`**: that split needs a real per-word part-of-speech tag, which several of her words don't have a single clean answer for (see `park`/`fish`/`work` above). `CURRICULUM_RECON_R1.md` §3 already anticipated this — `type` is app-layer, not a DB check constraint, specifically so the taxonomy can evolve without a migration. Splitting `s_form` later (once/if a `word_type` column like the current schema's — see `0019_words_word_type.sql` — gets added for v2) is a follow-up, not a blocker: the discrimination-ladder game ("Spot It: hop vs hopping vs hops") only needs surface-form contrast, which every row already has regardless of this finer split.

**Two rows needed a modeling decision, not just a classification**:
- **`a / an`** — her count treats this as one headword; an app row is one real word, so it's split into two rows (`a`, `an`), both unit 1, both flagged via `notes`.
- **`somebody / anybody / nobody`** — same reasoning, split into three rows, all unit `999` (see §4).

```sql
-- ============================================================
-- PROPOSED SEED — NOT APPLIED, NOT YET A FILE UNDER
-- supabase/seed/. Draft for review only. 203 rows (200 headword
-- rows from her doc + 1 extra from the a/an split + 2 extra from
-- the somebody/anybody/nobody split).
-- ============================================================

insert into public.words (id, word, type, unit, sort_order, curriculum_version, forms, notes) values
  (1001, 'kid', 'content', 1, 1, 'v2-blank-100-100', '[{"form": "kid", "type": "base", "irregular": false}, {"form": "kids", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1002, 'girl', 'content', 1, 2, 'v2-blank-100-100', '[{"form": "girl", "type": "base", "irregular": false}, {"form": "girls", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1003, 'boy', 'content', 1, 3, 'v2-blank-100-100', '[{"form": "boy", "type": "base", "irregular": false}, {"form": "boys", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1004, 'some', 'function', 1, 4, 'v2-blank-100-100', '[{"form": "some", "type": "base", "irregular": false}]'::jsonb, null),
  (1005, 'a', 'function', 1, 5, 'v2-blank-100-100', '[{"form": "a", "type": "base", "irregular": false}]'::jsonb, 'Split from Blank''s combined ''a / an'' row (one headword in her count, two real words in an app row model).'),
  (1006, 'an', 'function', 1, 6, 'v2-blank-100-100', '[{"form": "an", "type": "base", "irregular": false}]'::jsonb, 'Split from Blank''s combined ''a / an'' row (one headword in her count, two real words in an app row model).'),
  (1007, 'more', 'function', 1, 7, 'v2-blank-100-100', '[{"form": "more", "type": "base", "irregular": false}]'::jsonb, null),
  (1008, 'cat', 'content', 2, 8, 'v2-blank-100-100', '[{"form": "cat", "type": "base", "irregular": false}, {"form": "cats", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1009, 'bird', 'content', 2, 9, 'v2-blank-100-100', '[{"form": "bird", "type": "base", "irregular": false}, {"form": "birds", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1010, 'pet', 'content', 2, 10, 'v2-blank-100-100', '[{"form": "pet", "type": "base", "irregular": false}, {"form": "pets", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1011, 'eat', 'content', 3, 11, 'v2-blank-100-100', '[{"form": "eat", "type": "base", "irregular": false}, {"form": "eats", "type": "s_form", "irregular": false}, {"form": "ate", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1012, 'fly', 'content', 3, 12, 'v2-blank-100-100', '[{"form": "fly", "type": "base", "irregular": false}, {"form": "flies", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1013, 'rest', 'content', 3, 13, 'v2-blank-100-100', '[{"form": "rest", "type": "base", "irregular": false}, {"form": "rests", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1014, 'the', 'function', 3, 14, 'v2-blank-100-100', '[{"form": "the", "type": "base", "irregular": false}]'::jsonb, null),
  (1015, 'can', 'function', 3, 15, 'v2-blank-100-100', '[{"form": "can", "type": "base", "irregular": false}, {"form": "can''t", "type": "contraction", "irregular": false}]'::jsonb, null),
  (1016, 'are', 'function', 3, 16, 'v2-blank-100-100', '[{"form": "are", "type": "base", "irregular": false}]'::jsonb, null),
  (1017, 'here', 'function', 3, 17, 'v2-blank-100-100', '[{"form": "here", "type": "base", "irregular": false}]'::jsonb, null),
  (1018, 'not', 'function', 3, 18, 'v2-blank-100-100', '[{"form": "not", "type": "base", "irregular": false}]'::jsonb, null),
  (1019, 'bug', 'content', 4, 19, 'v2-blank-100-100', '[{"form": "bug", "type": "base", "irregular": false}, {"form": "bugs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1020, 'swim', 'content', 4, 20, 'v2-blank-100-100', '[{"form": "swim", "type": "base", "irregular": false}, {"form": "swims", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1021, 'talk', 'content', 4, 21, 'v2-blank-100-100', '[{"form": "talk", "type": "base", "irregular": false}, {"form": "talks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1022, 'jump', 'content', 4, 22, 'v2-blank-100-100', '[{"form": "jump", "type": "base", "irregular": false}, {"form": "jumps", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1023, 'walk', 'content', 5, 23, 'v2-blank-100-100', '[{"form": "walk", "type": "base", "irregular": false}, {"form": "walks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1024, 'plane', 'content', 5, 24, 'v2-blank-100-100', '[{"form": "plane", "type": "base", "irregular": false}, {"form": "planes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1025, 'toy', 'content', 5, 25, 'v2-blank-100-100', '[{"form": "toy", "type": "base", "irregular": false}, {"form": "toys", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1026, 'robot', 'content', 5, 26, 'v2-blank-100-100', '[{"form": "robot", "type": "base", "irregular": false}, {"form": "robots", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1027, 'is', 'function', 5, 27, 'v2-blank-100-100', '[{"form": "is", "type": "base", "irregular": false}]'::jsonb, null),
  (1028, 'but', 'function', 5, 28, 'v2-blank-100-100', '[{"form": "but", "type": "base", "irregular": false}]'::jsonb, null),
  (1029, 'this', 'function', 5, 29, 'v2-blank-100-100', '[{"form": "this", "type": "base", "irregular": false}]'::jsonb, null),
  (1030, 'it', 'function', 5, 30, 'v2-blank-100-100', '[{"form": "it", "type": "base", "irregular": false}, {"form": "its", "type": "possessive", "irregular": false}]'::jsonb, null),
  (1031, 'rocket', 'content', 6, 31, 'v2-blank-100-100', '[{"form": "rocket", "type": "base", "irregular": false}, {"form": "rockets", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1032, 'sit', 'content', 6, 32, 'v2-blank-100-100', '[{"form": "sit", "type": "base", "irregular": false}, {"form": "sits", "type": "s_form", "irregular": false}, {"form": "sitting", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1033, 'they', 'function', 6, 33, 'v2-blank-100-100', '[{"form": "they", "type": "base", "irregular": false}]'::jsonb, null),
  (1034, 'thing', 'content', 7, 34, 'v2-blank-100-100', '[{"form": "thing", "type": "base", "irregular": false}, {"form": "things", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1035, 'big', 'content', 7, 35, 'v2-blank-100-100', '[{"form": "big", "type": "base", "irregular": false}]'::jsonb, null),
  (1036, 'baby', 'content', 7, 36, 'v2-blank-100-100', '[{"form": "baby", "type": "base", "irregular": false}, {"form": "babies", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1037, 'she', 'function', 7, 37, 'v2-blank-100-100', '[{"form": "she", "type": "base", "irregular": false}]'::jsonb, null),
  (1038, 'who', 'function', 7, 38, 'v2-blank-100-100', '[{"form": "who", "type": "base", "irregular": false}]'::jsonb, null),
  (1039, 'also', 'function', 7, 39, 'v2-blank-100-100', '[{"form": "also", "type": "base", "irregular": false}]'::jsonb, null),
  (1040, 'that', 'function', 7, 40, 'v2-blank-100-100', '[{"form": "that", "type": "base", "irregular": false}]'::jsonb, null),
  (1041, 'do', 'function', 7, 41, 'v2-blank-100-100', '[{"form": "do", "type": "base", "irregular": false}, {"form": "does", "type": "s_form", "irregular": false}, {"form": "don''t", "type": "contraction", "irregular": false}, {"form": "doesn''t", "type": "contraction", "irregular": false}]'::jsonb, null),
  (1042, 'I', 'function', 7, 42, 'v2-blank-100-100', '[{"form": "I", "type": "base", "irregular": false}]'::jsonb, null),
  (1043, 'am', 'function', 7, 43, 'v2-blank-100-100', '[{"form": "am", "type": "base", "irregular": false}]'::jsonb, null),
  (1044, 'we', 'function', 7, 44, 'v2-blank-100-100', '[{"form": "we", "type": "base", "irregular": false}]'::jsonb, null),
  (1045, 'frog', 'content', 8, 45, 'v2-blank-100-100', '[{"form": "frog", "type": "base", "irregular": false}, {"form": "frogs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1046, 'like', 'function', 8, 46, 'v2-blank-100-100', '[{"form": "like", "type": "base", "irregular": false}, {"form": "likes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1047, 'what', 'function', 8, 47, 'v2-blank-100-100', '[{"form": "what", "type": "base", "irregular": false}]'::jsonb, null),
  (1048, 'to', 'function', 8, 48, 'v2-blank-100-100', '[{"form": "to", "type": "base", "irregular": false}]'::jsonb, null),
  (1049, 'want', 'function', 8, 49, 'v2-blank-100-100', '[{"form": "want", "type": "base", "irregular": false}, {"form": "wants", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1050, 'many', 'function', 8, 50, 'v2-blank-100-100', '[{"form": "many", "type": "base", "irregular": false}]'::jsonb, null),
  (1051, 'those', 'function', 8, 51, 'v2-blank-100-100', '[{"form": "those", "type": "base", "irregular": false}]'::jsonb, null),
  (1052, 'run', 'content', 9, 52, 'v2-blank-100-100', '[{"form": "run", "type": "base", "irregular": false}, {"form": "runs", "type": "s_form", "irregular": false}, {"form": "running", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1053, 'dog', 'content', 9, 53, 'v2-blank-100-100', '[{"form": "dog", "type": "base", "irregular": false}, {"form": "dogs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1054, 'look', 'content', 9, 54, 'v2-blank-100-100', '[{"form": "look", "type": "base", "irregular": false}, {"form": "looks", "type": "s_form", "irregular": false}, {"form": "looking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1055, 'one', 'function', 9, 55, 'v2-blank-100-100', '[{"form": "one", "type": "base", "irregular": false}, {"form": "ones", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1056, 'other', 'function', 9, 56, 'v2-blank-100-100', '[{"form": "other", "type": "base", "irregular": false}]'::jsonb, null),
  (1057, 'which', 'function', 9, 57, 'v2-blank-100-100', '[{"form": "which", "type": "base", "irregular": false}]'::jsonb, null),
  (1058, 'there', 'function', 9, 58, 'v2-blank-100-100', '[{"form": "there", "type": "base", "irregular": false}]'::jsonb, null),
  (1059, 'at', 'function', 9, 59, 'v2-blank-100-100', '[{"form": "at", "type": "base", "irregular": false}]'::jsonb, null),
  (1060, 'now', 'function', 9, 60, 'v2-blank-100-100', '[{"form": "now", "type": "base", "irregular": false}]'::jsonb, null),
  (1061, 'man', 'content', 10, 61, 'v2-blank-100-100', '[{"form": "man", "type": "base", "irregular": false}]'::jsonb, null),
  (1062, 'good', 'content', 10, 62, 'v2-blank-100-100', '[{"form": "good", "type": "base", "irregular": false}]'::jsonb, null),
  (1063, 'fix', 'content', 10, 63, 'v2-blank-100-100', '[{"form": "fix", "type": "base", "irregular": false}, {"form": "fixes", "type": "s_form", "irregular": false}, {"form": "fixing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1064, 'arm', 'content', 10, 64, 'v2-blank-100-100', '[{"form": "arm", "type": "base", "irregular": false}, {"form": "arms", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1065, 'leg', 'content', 10, 65, 'v2-blank-100-100', '[{"form": "leg", "type": "base", "irregular": false}, {"form": "legs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1066, 'truck', 'content', 10, 66, 'v2-blank-100-100', '[{"form": "truck", "type": "base", "irregular": false}, {"form": "trucks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1067, 'of', 'function', 10, 67, 'v2-blank-100-100', '[{"form": "of", "type": "base", "irregular": false}]'::jsonb, null),
  (1068, 'yes', 'function', 10, 68, 'v2-blank-100-100', '[{"form": "yes", "type": "base", "irregular": false}]'::jsonb, null),
  (1069, 'have', 'function', 10, 69, 'v2-blank-100-100', '[{"form": "have", "type": "base", "irregular": false}, {"form": "has", "type": "s_form", "irregular": false}, {"form": "had", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1070, 'he', 'function', 10, 70, 'v2-blank-100-100', '[{"form": "he", "type": "base", "irregular": false}]'::jsonb, null),
  (1071, 'need', 'content', 11, 71, 'v2-blank-100-100', '[{"form": "need", "type": "base", "irregular": false}, {"form": "needs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1072, 'wing', 'content', 11, 72, 'v2-blank-100-100', '[{"form": "wing", "type": "base", "irregular": false}, {"form": "wings", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1073, 'use', 'content', 11, 73, 'v2-blank-100-100', '[{"form": "use", "type": "base", "irregular": false}, {"form": "using", "type": "ing_form", "irregular": false}, {"form": "uses", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1074, 'stop', 'content', 11, 74, 'v2-blank-100-100', '[{"form": "stop", "type": "base", "irregular": false}, {"form": "stopping", "type": "ing_form", "irregular": false}, {"form": "stops", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1075, 'my', 'function', 11, 75, 'v2-blank-100-100', '[{"form": "my", "type": "base", "irregular": false}]'::jsonb, null),
  (1076, 'you', 'function', 11, 76, 'v2-blank-100-100', '[{"form": "you", "type": "base", "irregular": false}]'::jsonb, null),
  (1077, 'all', 'function', 11, 77, 'v2-blank-100-100', '[{"form": "all", "type": "base", "irregular": false}]'::jsonb, null),
  (1078, 'no', 'function', 11, 78, 'v2-blank-100-100', '[{"form": "no", "type": "base", "irregular": false}]'::jsonb, null),
  (1079, 'their', 'function', 11, 79, 'v2-blank-100-100', '[{"form": "their", "type": "base", "irregular": false}]'::jsonb, null),
  (1080, 'duck', 'content', 12, 80, 'v2-blank-100-100', '[{"form": "duck", "type": "base", "irregular": false}, {"form": "ducks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1081, 'water', 'content', 12, 81, 'v2-blank-100-100', '[{"form": "water", "type": "base", "irregular": false}]'::jsonb, null),
  (1082, 'way', 'content', 12, 82, 'v2-blank-100-100', '[{"form": "way", "type": "base", "irregular": false}, {"form": "ways", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1083, 'move', 'content', 12, 83, 'v2-blank-100-100', '[{"form": "move", "type": "base", "irregular": false}, {"form": "moving", "type": "ing_form", "irregular": false}, {"form": "moves", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1084, 'drink', 'content', 12, 84, 'v2-blank-100-100', '[{"form": "drink", "type": "base", "irregular": false}, {"form": "drinks", "type": "s_form", "irregular": false}, {"form": "drinking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1085, 'by', 'function', 12, 85, 'v2-blank-100-100', '[{"form": "by", "type": "base", "irregular": false}]'::jsonb, null),
  (1086, 'these', 'function', 12, 86, 'v2-blank-100-100', '[{"form": "these", "type": "base", "irregular": false}]'::jsonb, null),
  (1087, 'and', 'function', 12, 87, 'v2-blank-100-100', '[{"form": "and", "type": "base", "irregular": false}]'::jsonb, null),
  (1088, 'both', 'function', 12, 88, 'v2-blank-100-100', '[{"form": "both", "type": "base", "irregular": false}]'::jsonb, null),
  (1089, 'in', 'function', 12, 89, 'v2-blank-100-100', '[{"form": "in", "type": "base", "irregular": false}]'::jsonb, null),
  (1090, 'for', 'function', 12, 90, 'v2-blank-100-100', '[{"form": "for", "type": "base", "irregular": false}]'::jsonb, null),
  (1091, 'sad', 'content', 13, 91, 'v2-blank-100-100', '[{"form": "sad", "type": "base", "irregular": false}]'::jsonb, null),
  (1092, 'hurt', 'content', 13, 92, 'v2-blank-100-100', '[{"form": "hurt", "type": "base", "irregular": false}, {"form": "hurts", "type": "s_form", "irregular": false}, {"form": "hurting", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1093, 'was', 'function', 13, 93, 'v2-blank-100-100', '[{"form": "was", "type": "base", "irregular": false}]'::jsonb, null),
  (1094, 'only', 'function', 13, 94, 'v2-blank-100-100', '[{"form": "only", "type": "base", "irregular": false}]'::jsonb, null),
  (1095, 'did', 'function', 13, 95, 'v2-blank-100-100', '[{"form": "did", "type": "base", "irregular": false}]'::jsonb, null),
  (1096, 'on', 'function', 13, 96, 'v2-blank-100-100', '[{"form": "on", "type": "base", "irregular": false}]'::jsonb, null),
  (1097, 'could', 'function', 13, 97, 'v2-blank-100-100', '[{"form": "could", "type": "base", "irregular": false}]'::jsonb, null),
  (1098, 'help', 'content', 14, 98, 'v2-blank-100-100', '[{"form": "help", "type": "base", "irregular": false}, {"form": "helps", "type": "s_form", "irregular": false}, {"form": "helping", "type": "ing_form", "irregular": false}, {"form": "helped", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1099, 'see', 'content', 14, 99, 'v2-blank-100-100', '[{"form": "see", "type": "base", "irregular": false}, {"form": "sees", "type": "s_form", "irregular": false}, {"form": "seeing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1100, 'go', 'content', 14, 100, 'v2-blank-100-100', '[{"form": "go", "type": "base", "irregular": false}, {"form": "goes", "type": "s_form", "irregular": false}, {"form": "going", "type": "ing_form", "irregular": false}, {"form": "went", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1101, 'think', 'content', 14, 101, 'v2-blank-100-100', '[{"form": "think", "type": "base", "irregular": false}, {"form": "thinks", "type": "s_form", "irregular": false}, {"form": "thinking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1102, 'cry', 'content', 14, 102, 'v2-blank-100-100', '[{"form": "cry", "type": "base", "irregular": false}, {"form": "cries", "type": "s_form", "irregular": false}, {"form": "crying", "type": "ing_form", "irregular": false}, {"form": "cried", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1103, 'where', 'function', 14, 103, 'v2-blank-100-100', '[{"form": "where", "type": "base", "irregular": false}]'::jsonb, null),
  (1104, 'his', 'function', 14, 104, 'v2-blank-100-100', '[{"form": "his", "type": "base", "irregular": false}]'::jsonb, null),
  (1105, 'very', 'function', 14, 105, 'v2-blank-100-100', '[{"form": "very", "type": "base", "irregular": false}]'::jsonb, null),
  (1106, 'me', 'function', 14, 106, 'v2-blank-100-100', '[{"form": "me", "type": "base", "irregular": false}]'::jsonb, null),
  (1107, 'near', 'function', 14, 107, 'v2-blank-100-100', '[{"form": "near", "type": "base", "irregular": false}]'::jsonb, null),
  (1108, 'play', 'content', 15, 108, 'v2-blank-100-100', '[{"form": "play", "type": "base", "irregular": false}, {"form": "plays", "type": "s_form", "irregular": false}, {"form": "played", "type": "ed_form", "irregular": false}, {"form": "playing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1109, 'face', 'content', 15, 109, 'v2-blank-100-100', '[{"form": "face", "type": "base", "irregular": false}, {"form": "faces", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1110, 'food', 'content', 15, 110, 'v2-blank-100-100', '[{"form": "food", "type": "base", "irregular": false}]'::jsonb, null),
  (1111, 'happy', 'content', 15, 111, 'v2-blank-100-100', '[{"form": "happy", "type": "base", "irregular": false}]'::jsonb, null),
  (1112, 'fat', 'content', 15, 112, 'v2-blank-100-100', '[{"form": "fat", "type": "base", "irregular": false}]'::jsonb, null),
  (1113, 'most', 'function', 15, 113, 'v2-blank-100-100', '[{"form": "most", "type": "base", "irregular": false}]'::jsonb, null),
  (1114, 'her', 'function', 15, 114, 'v2-blank-100-100', '[{"form": "her", "type": "base", "irregular": false}, {"form": "hers", "type": "possessive", "irregular": false}]'::jsonb, null),
  (1115, 'any', 'function', 15, 115, 'v2-blank-100-100', '[{"form": "any", "type": "base", "irregular": false}]'::jsonb, null),
  (1116, 'hole', 'content', 16, 116, 'v2-blank-100-100', '[{"form": "hole", "type": "base", "irregular": false}, {"form": "holes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1117, 'find', 'content', 16, 117, 'v2-blank-100-100', '[{"form": "find", "type": "base", "irregular": false}, {"form": "finds", "type": "s_form", "irregular": false}, {"form": "finding", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1118, 'mice', 'content', 16, 118, 'v2-blank-100-100', '[{"form": "mice", "type": "base", "irregular": false}]'::jsonb, null),
  (1119, 'get', 'content', 16, 119, 'v2-blank-100-100', '[{"form": "get", "type": "base", "irregular": false}, {"form": "gets", "type": "s_form", "irregular": false}, {"form": "getting", "type": "ing_form", "irregular": false}, {"form": "got", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1120, 'them', 'function', 16, 120, 'v2-blank-100-100', '[{"form": "them", "type": "base", "irregular": false}]'::jsonb, null),
  (1121, 'out', 'function', 16, 121, 'v2-blank-100-100', '[{"form": "out", "type": "base", "irregular": false}]'::jsonb, null),
  (1122, 'be', 'function', 16, 122, 'v2-blank-100-100', '[{"form": "be", "type": "base", "irregular": false}]'::jsonb, null),
  (1123, 'us', 'function', 16, 123, 'v2-blank-100-100', '[{"form": "us", "type": "base", "irregular": false}]'::jsonb, null),
  (1124, 'then', 'function', 16, 124, 'v2-blank-100-100', '[{"form": "then", "type": "base", "irregular": false}]'::jsonb, null),
  (1125, 'park', 'content', 17, 125, 'v2-blank-100-100', '[{"form": "park", "type": "base", "irregular": false}, {"form": "parks", "type": "s_form", "irregular": false}, {"form": "parked", "type": "ed_form", "irregular": false}, {"form": "parking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1126, 'nice', 'content', 17, 126, 'v2-blank-100-100', '[{"form": "nice", "type": "base", "irregular": false}]'::jsonb, null),
  (1127, 'place', 'content', 17, 127, 'v2-blank-100-100', '[{"form": "place", "type": "base", "irregular": false}, {"form": "places", "type": "s_form", "irregular": false}, {"form": "placed", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1128, 'pool', 'content', 17, 128, 'v2-blank-100-100', '[{"form": "pool", "type": "base", "irregular": false}, {"form": "pools", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1129, 'ground', 'content', 17, 129, 'v2-blank-100-100', '[{"form": "ground", "type": "base", "irregular": false}]'::jsonb, null),
  (1130, 'dirt', 'content', 17, 130, 'v2-blank-100-100', '[{"form": "dirt", "type": "base", "irregular": false}, {"form": "dirty", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1131, 'swing', 'content', 17, 131, 'v2-blank-100-100', '[{"form": "swing", "type": "base", "irregular": false}, {"form": "swings", "type": "s_form", "irregular": false}, {"form": "swinging", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1132, 'still', 'function', 17, 132, 'v2-blank-100-100', '[{"form": "still", "type": "base", "irregular": false}]'::jsonb, null),
  (1133, 'say', 'function', 17, 133, 'v2-blank-100-100', '[{"form": "say", "type": "base", "irregular": false}, {"form": "says", "type": "s_form", "irregular": false}, {"form": "said", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1134, 'were', 'function', 17, 134, 'v2-blank-100-100', '[{"form": "were", "type": "base", "irregular": false}]'::jsonb, null),
  (1135, 'clean', 'content', 18, 135, 'v2-blank-100-100', '[{"form": "clean", "type": "base", "irregular": false}, {"form": "cleans", "type": "s_form", "irregular": false}, {"form": "cleaned", "type": "ed_form", "irregular": false}, {"form": "cleaning", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1136, 'bag', 'content', 18, 136, 'v2-blank-100-100', '[{"form": "bag", "type": "base", "irregular": false}, {"form": "bags", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1137, 'put', 'content', 18, 137, 'v2-blank-100-100', '[{"form": "put", "type": "base", "irregular": false}, {"form": "puts", "type": "s_form", "irregular": false}, {"form": "putting", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1138, 'make', 'content', 18, 138, 'v2-blank-100-100', '[{"form": "make", "type": "base", "irregular": false}, {"form": "makes", "type": "s_form", "irregular": false}, {"form": "making", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1139, 'will', 'function', 18, 139, 'v2-blank-100-100', '[{"form": "will", "type": "base", "irregular": false}]'::jsonb, null),
  (1140, 'would', 'function', 18, 140, 'v2-blank-100-100', '[{"form": "would", "type": "base", "irregular": false}]'::jsonb, null),
  (1141, 'with', 'function', 18, 141, 'v2-blank-100-100', '[{"form": "with", "type": "base", "irregular": false}]'::jsonb, null),
  (1142, 'too', 'function', 19, 142, 'v2-blank-100-100', '[{"form": "too", "type": "base", "irregular": false}]'::jsonb, null),
  (1143, 'house', 'content', 20, 143, 'v2-blank-100-100', '[{"form": "house", "type": "base", "irregular": false}, {"form": "houses", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1144, 'rain', 'content', 20, 144, 'v2-blank-100-100', '[{"form": "rain", "type": "base", "irregular": false}, {"form": "rains", "type": "s_form", "irregular": false}, {"form": "rainy", "type": "derived_adjective", "irregular": false}, {"form": "rained", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1145, 'sun', 'content', 20, 145, 'v2-blank-100-100', '[{"form": "sun", "type": "base", "irregular": false}, {"form": "sunny", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1146, 'when', 'function', 20, 146, 'v2-blank-100-100', '[{"form": "when", "type": "base", "irregular": false}]'::jsonb, null),
  (1147, 'about', 'function', 20, 147, 'v2-blank-100-100', '[{"form": "about", "type": "base", "irregular": false}]'::jsonb, null),
  (1148, 'just', 'function', 20, 148, 'v2-blank-100-100', '[{"form": "just", "type": "base", "irregular": false}]'::jsonb, null),
  (1149, 'each', 'function', 20, 149, 'v2-blank-100-100', '[{"form": "each", "type": "base", "irregular": false}]'::jsonb, null),
  (1150, 'our', 'function', 20, 150, 'v2-blank-100-100', '[{"form": "our", "type": "base", "irregular": false}]'::jsonb, null),
  (1151, 'again', 'function', 20, 151, 'v2-blank-100-100', '[{"form": "again", "type": "base", "irregular": false}]'::jsonb, null),
  (1152, 'dig', 'content', 21, 152, 'v2-blank-100-100', '[{"form": "dig", "type": "base", "irregular": false}, {"form": "digs", "type": "s_form", "irregular": false}, {"form": "digging", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1153, 'work', 'content', 21, 153, 'v2-blank-100-100', '[{"form": "work", "type": "base", "irregular": false}, {"form": "works", "type": "s_form", "irregular": false}, {"form": "worked", "type": "ed_form", "irregular": false}, {"form": "working", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1154, 'up', 'function', 21, 154, 'v2-blank-100-100', '[{"form": "up", "type": "base", "irregular": false}]'::jsonb, null),
  (1155, 'because', 'function', 21, 155, 'v2-blank-100-100', '[{"form": "because", "type": "base", "irregular": false}]'::jsonb, null),
  (1156, 'why', 'function', 21, 156, 'v2-blank-100-100', '[{"form": "why", "type": "base", "irregular": false}]'::jsonb, null),
  (1157, 'come', 'content', 22, 157, 'v2-blank-100-100', '[{"form": "come", "type": "base", "irregular": false}, {"form": "comes", "type": "s_form", "irregular": false}, {"form": "coming", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1158, 'how', 'function', 22, 158, 'v2-blank-100-100', '[{"form": "how", "type": "base", "irregular": false}]'::jsonb, null),
  (1159, 'take', 'content', 23, 159, 'v2-blank-100-100', '[{"form": "take", "type": "base", "irregular": false}, {"form": "takes", "type": "s_form", "irregular": false}, {"form": "taking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1160, 'after', 'function', 23, 160, 'v2-blank-100-100', '[{"form": "after", "type": "base", "irregular": false}]'::jsonb, null),
  (1161, 'animal', 'content', 24, 161, 'v2-blank-100-100', '[{"form": "animal", "type": "base", "irregular": false}, {"form": "animals", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1162, 'moon', 'content', 24, 162, 'v2-blank-100-100', '[{"form": "moon", "type": "base", "irregular": false}, {"form": "moons", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1163, 'day', 'content', 24, 163, 'v2-blank-100-100', '[{"form": "day", "type": "base", "irregular": false}, {"form": "days", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1164, 'than', 'function', 24, 164, 'v2-blank-100-100', '[{"form": "than", "type": "base", "irregular": false}]'::jsonb, null),
  (1165, 'home', 'content', 25, 165, 'v2-blank-100-100', '[{"form": "home", "type": "base", "irregular": false}, {"form": "homes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1166, 'scare', 'content', 25, 166, 'v2-blank-100-100', '[{"form": "scare", "type": "base", "irregular": false}, {"form": "scared", "type": "ed_form", "irregular": false}, {"form": "scary", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1167, 'hungry', 'content', 25, 167, 'v2-blank-100-100', '[{"form": "hungry", "type": "base", "irregular": false}]'::jsonb, null),
  (1168, 'open', 'content', 25, 168, 'v2-blank-100-100', '[{"form": "open", "type": "base", "irregular": false}, {"form": "opens", "type": "s_form", "irregular": false}, {"form": "opened", "type": "ed_form", "irregular": false}, {"form": "opening", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1169, 'yell', 'content', 25, 169, 'v2-blank-100-100', '[{"form": "yell", "type": "base", "irregular": false}, {"form": "yells", "type": "s_form", "irregular": false}, {"form": "yelled", "type": "ed_form", "irregular": false}, {"form": "yelling", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1170, 'bad', 'content', 25, 170, 'v2-blank-100-100', '[{"form": "bad", "type": "base", "irregular": false}]'::jsonb, null),
  (1171, 'over', 'function', 25, 171, 'v2-blank-100-100', '[{"form": "over", "type": "base", "irregular": false}]'::jsonb, null),
  (1172, 'much', 'function', 25, 172, 'v2-blank-100-100', '[{"form": "much", "type": "base", "irregular": false}]'::jsonb, null),
  (1173, 'him', 'function', 25, 173, 'v2-blank-100-100', '[{"form": "him", "type": "base", "irregular": false}]'::jsonb, null),
  (1174, 'fish', 'content', 26, 174, 'v2-blank-100-100', '[{"form": "fish", "type": "base", "irregular": false}, {"form": "fishes", "type": "s_form", "irregular": false}, {"form": "fished", "type": "ed_form", "irregular": false}, {"form": "fishing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1175, 'top', 'content', 26, 175, 'v2-blank-100-100', '[{"form": "top", "type": "base", "irregular": false}, {"form": "tops", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1176, 'sand', 'content', 26, 176, 'v2-blank-100-100', '[{"form": "sand", "type": "base", "irregular": false}, {"form": "sandy", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1177, 'try', 'content', 26, 177, 'v2-blank-100-100', '[{"form": "try", "type": "base", "irregular": false}, {"form": "tries", "type": "s_form", "irregular": false}, {"form": "tried", "type": "ed_form", "irregular": false}, {"form": "trying", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1178, 'so', 'function', 26, 178, 'v2-blank-100-100', '[{"form": "so", "type": "base", "irregular": false}]'::jsonb, null),
  (1179, 'ask', 'content', 27, 179, 'v2-blank-100-100', '[{"form": "ask", "type": "base", "irregular": false}, {"form": "asks", "type": "s_form", "irregular": false}, {"form": "asked", "type": "ed_form", "irregular": false}, {"form": "asking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1180, 'name', 'content', 27, 180, 'v2-blank-100-100', '[{"form": "name", "type": "base", "irregular": false}, {"form": "names", "type": "s_form", "irregular": false}, {"form": "named", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1181, 'know', 'content', 27, 181, 'v2-blank-100-100', '[{"form": "know", "type": "base", "irregular": false}, {"form": "knows", "type": "s_form", "irregular": false}, {"form": "knowing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1182, 'smile', 'content', 27, 182, 'v2-blank-100-100', '[{"form": "smile", "type": "base", "irregular": false}, {"form": "smiles", "type": "s_form", "irregular": false}, {"form": "smiled", "type": "ed_form", "irregular": false}, {"form": "smiling", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1183, 'such', 'function', 27, 183, 'v2-blank-100-100', '[{"form": "such", "type": "base", "irregular": false}]'::jsonb, null),
  (1184, 'your', 'function', 27, 184, 'v2-blank-100-100', '[{"form": "your", "type": "base", "irregular": false}]'::jsonb, null),
  (1185, 'once', 'function', 27, 185, 'v2-blank-100-100', '[{"form": "once", "type": "base", "irregular": false}]'::jsonb, null),
  (1186, 'change', 'content', 28, 186, 'v2-blank-100-100', '[{"form": "change", "type": "base", "irregular": false}, {"form": "changes", "type": "s_form", "irregular": false}, {"form": "changed", "type": "ed_form", "irregular": false}, {"form": "changing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1187, 'computer', 'content', 28, 187, 'v2-blank-100-100', '[{"form": "computer", "type": "base", "irregular": false}, {"form": "computers", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1188, 'sleep', 'content', 28, 188, 'v2-blank-100-100', '[{"form": "sleep", "type": "base", "irregular": false}, {"form": "sleeps", "type": "s_form", "irregular": false}, {"form": "sleeping", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1189, 'from', 'function', 28, 189, 'v2-blank-100-100', '[{"form": "from", "type": "base", "irregular": false}]'::jsonb, null),
  (1190, 'even', 'function', 28, 190, 'v2-blank-100-100', '[{"form": "even", "type": "base", "irregular": false}]'::jsonb, null),
  (1191, 'nothing', 'function', 28, 191, 'v2-blank-100-100', '[{"form": "nothing", "type": "base", "irregular": false}]'::jsonb, null),
  (1192, 'tell', 'content', 29, 192, 'v2-blank-100-100', '[{"form": "tell", "type": "base", "irregular": false}, {"form": "tells", "type": "s_form", "irregular": false}, {"form": "telling", "type": "ing_form", "irregular": false}, {"form": "told", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1193, 'hand', 'content', 29, 193, 'v2-blank-100-100', '[{"form": "hand", "type": "base", "irregular": false}, {"form": "hands", "type": "s_form", "irregular": false}, {"form": "handed", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1194, 'every', 'function', 29, 194, 'v2-blank-100-100', '[{"form": "every", "type": "base", "irregular": false}]'::jsonb, null),
  (1195, 'head', 'content', 30, 195, 'v2-blank-100-100', '[{"form": "head", "type": "base", "irregular": false}, {"form": "heads", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1196, 'slow', 'content', 30, 196, 'v2-blank-100-100', '[{"form": "slow", "type": "base", "irregular": false}, {"form": "slower", "type": "comparative", "irregular": false}]'::jsonb, null),
  (1197, 'tree', 'content', 30, 197, 'v2-blank-100-100', '[{"form": "tree", "type": "base", "irregular": false}, {"form": "trees", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1198, 'never', 'function', 30, 198, 'v2-blank-100-100', '[{"form": "never", "type": "base", "irregular": false}]'::jsonb, null),
  (1199, 'down', 'function', 30, 199, 'v2-blank-100-100', '[{"form": "down", "type": "base", "irregular": false}]'::jsonb, null),
  (1200, 'before', 'function', 999, 200, 'v2-blank-100-100', '[{"form": "before", "type": "base", "irregular": false}]'::jsonb, 'Her source note said only ''teach earlier'' with no specific unit number. Unit 999 is a PENDING sentinel, not a real position -- needs her confirmed unit number before this word is production-ready.'),
  (1201, 'somebody', 'function', 999, 201, 'v2-blank-100-100', '[{"form": "somebody", "type": "base", "irregular": false}]'::jsonb, 'Blank groups these 3 as one taught family (indefinite pronouns); modeled here as 3 separate rows, each its own base-only headword. Unit also unspecified in her doc (''--''); 999 is a PENDING sentinel, needs her confirmed unit number.'),
  (1202, 'anybody', 'function', 999, 202, 'v2-blank-100-100', '[{"form": "anybody", "type": "base", "irregular": false}]'::jsonb, 'Blank groups these 3 as one taught family (indefinite pronouns); modeled here as 3 separate rows, each its own base-only headword. Unit also unspecified in her doc (''--''); 999 is a PENDING sentinel, needs her confirmed unit number.'),
  (1203, 'nobody', 'function', 999, 203, 'v2-blank-100-100', '[{"form": "nobody", "type": "base", "irregular": false}]'::jsonb, 'Blank groups these 3 as one taught family (indefinite pronouns); modeled here as 3 separate rows, each its own base-only headword. Unit also unspecified in her doc (''--''); 999 is a PENDING sentinel, needs her confirmed unit number.')
on conflict (word, curriculum_version) do update set
  type = excluded.type, unit = excluded.unit, sort_order = excluded.sort_order,
  forms = excluded.forms, notes = excluded.notes;
```

Row count check: 100 content + 103 function (100 non-content headwords, +1 from the `a/an` split, +2 from the `somebody` family split) = 203. Ids `1001`–`1203`, contiguous, no gaps, no overlap with the existing `1`–`200` range.

## 7. What is explicitly NOT done here (open follow-ups)

1. **Not applied**: no file exists under `supabase/migrations/` or `supabase/seed/` yet — everything above is draft SQL text for review.
2. **`get`/`got`, `have`/`had`, `before`, `somebody` family** — all four already flagged in `CURRICULUM_RECON_R1.md` / this doc as needing Dr. Blank's direct confirmation; the seed encodes best-effort answers (the corrected forms, a `999` sentinel unit) rather than blocking on her, but none of these four should be treated as final without her sign-off.
3. **App-code read path**: nothing here makes the app actually query by `active_curriculum_version` — that's a `session-generator.js` / `useSessionPlan.js` / `WordGalaxyMap.jsx` change, explicitly out of scope per the hard stop, and a prerequisite before flipping the flag would do anything visible.
4. **`s_form` → `plural`/`present_3s` split** — deferred until/unless a per-word part-of-speech tag exists for the v2 set (see §6's rationale).
5. **Retiring `src/lib/wordMorphology.js`** in favor of reading `words.forms` directly — natural once the app-code read path (item 3) exists, not attempted here.

No files outside `docs/` were touched. No migration was written to `supabase/`. No `words` row was written or changed.
