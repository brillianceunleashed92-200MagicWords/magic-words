-- CURRICULUM_REPLACE_R1 -- non-destructive, versioned landing of Dr. Blank's
-- consolidated 100 content + 100 non-content word list
-- (docs/design/curriculum/200MW_word_list_100_100.md) alongside the existing
-- 200-word curriculum, per docs/CURRICULUM_RECON_R1.md and
-- docs/CURRICULUM_REPLACE_R1.md.
--
-- Nothing here is user-visible on its own: app_config.active_curriculum_version
-- (added below) is seeded to 'v1-legacy', the value already implied by every
-- existing row, so this migration changes zero read paths until someone
-- deliberately flips that one row AND the app is updated to read it (not
-- done in this migration -- flagged in CURRICULUM_REPLACE_R1.md #7 as
-- required follow-up app work).
--
-- Verified against production before writing this file (not assumed):
--   - public.words: 200 rows, id range 1-200, unique constraint on `word`
--     is actually named `words_word_key` (matches what the plan draft
--     guessed, confirmed via pg_constraint rather than taken on faith).
--   - public.word_progress: unique constraint is `word_progress_child_id_word_key`
--     on (child_id, word). This constraint ALSO needs widening (not just
--     adding the column) -- without it, a v2 progress row for a word
--     spelled identically to a v1 word (86 of 200) would violate the
--     existing unique constraint and upsert straight over the v1 row's
--     data instead of the two curricula's progress staying separate. This
--     was found during production schema verification for this migration,
--     is required for CURRICULUM_REPLACE_R1.md #5's "clean reset" claim to
--     actually hold, and goes beyond what that doc's draft SQL specified.

-- 1. Forms -- per CURRICULUM_RECON_R1.md section 3.
alter table public.words add column if not exists forms jsonb;

comment on column public.words.forms is
  'All taught forms for this headword per Dr. Blank''s all-forms rule '
  '(base + plural/tense/conjugation, taught together, counted as one word). '
  'Array of {form, type, irregular}. First element is always the base form '
  '(equal to words.word). NULL only during backfill.';

-- 2. Curriculum version tag -- lets v1 and v2 rows coexist in one table.
alter table public.words
  add column if not exists curriculum_version text not null default 'v1-legacy';

comment on column public.words.curriculum_version is
  'Which curriculum edition this row belongs to. v1-legacy = the original '
  '200-word seed (ids 1-200). v2-blank-100-100 = Dr. Blank''s consolidated '
  'list (ids 1001+). Which version the app actually serves is controlled by '
  'app_config.active_curriculum_version, not by this column alone -- this '
  'column only tags rows, it does not filter anything by itself.';

-- 3. Notes -- documentation column for modeling decisions made during
--    ingestion (the a/an split, the two pending-unit sentinels below).
--    Not read by any app code.
alter table public.words add column if not exists notes text;

-- 4. Constraint widen on words -- REQUIRED: 86 of Dr. Blank's 200 words are
--    spelled identically to an existing v1 word, so a bare unique(word)
--    blocks inserting v2 at all. Confirmed real name via pg_constraint
--    before writing this (see header note) -- matches the plan's guess.
alter table public.words drop constraint if exists words_word_key;
alter table public.words
  add constraint words_word_curriculum_version_key unique (word, curriculum_version);

-- 5. Active-version flag -- one row, one source of truth for "which
--    curriculum is live". Starts pointed at the existing set so this
--    migration is a no-op from the app's point of view until someone
--    deliberately changes it (and the app is updated to read it).
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

alter table public.app_config enable row level security;

drop policy if exists "App config is public-read" on public.app_config;
create policy "App config is public-read"
  on public.app_config for select
  using (true);

insert into public.app_config (key, value)
  values ('active_curriculum_version', 'v1-legacy')
  on conflict (key) do nothing;

-- 6. word_progress needs the same version tag, AND its own uniqueness
--    grain widened for the same reason as #4 above -- otherwise a v2
--    progress row for a word spelled identically to a v1 word would
--    violate word_progress_child_id_word_key and either fail outright or
--    (worse, if written as an upsert) silently overwrite the v1 row's
--    mastery/attempt data with v2 progress. Existing rows backfill to
--    'v1-legacy' via the column default, same mechanism as words above.
alter table public.word_progress
  add column if not exists curriculum_version text not null default 'v1-legacy';

alter table public.word_progress
  drop constraint if exists word_progress_child_id_word_key;
alter table public.word_progress
  add constraint word_progress_child_id_word_curriculum_version_key
  unique (child_id, word, curriculum_version);

-- 7. Indexes for the new lookup pattern (filter by active version, then
--    teaching order).
create index if not exists words_curriculum_version_idx
  on public.words (curriculum_version, unit, sort_order);

create index if not exists word_progress_curriculum_version_idx
  on public.word_progress (curriculum_version, child_id);
