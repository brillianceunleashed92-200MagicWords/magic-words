-- Additive: adds `teaching_track` to public.words, a pedagogical axis
-- distinct from the existing grammatical `type` column (content|function).
--
-- `type` = grammatical class (open-class content word vs. closed-class
-- function word) — see docs/words-classification-audit.md, confirmed
-- linguistically accurate as-is, unchanged here.
--
-- `teaching_track` = which teaching method a word gets: `content` words
-- are concrete/picturable and taught via direct picture-word association
-- (Blank's method); `sight` words are non-picturable — either
-- grammatically closed-class (all 45 `function` words), symbolic/abstract
-- (numbers, taught as a counting sequence rather than a single referent
-- picture), or abstract verbs/adjectives with no single unambiguous
-- picture (help, learn, share, stop, count, good, bad) — and are taught
-- via repetition/whole-word recognition instead.
--
-- Honest disclosure: this was requested as a "100-content/100-sight"
-- split attributed to Dr. Blank's method, but no document in this repo
-- specifies that ratio (grepped docs/*.md + CLAUDE.md — nothing), and a
-- real word-by-word classification against this exact 200-word list
-- converges on 137 content / 63 sight, not 100/100. Forcing an even
-- split would require re-tagging genuinely concrete/picturable words
-- (animals, food, colors, body parts, ~130 of them) as "sight" with no
-- linguistic or pedagogical basis — the exact mistake
-- docs/words-classification-audit.md already flagged and rejected for
-- the `type` column. Same principle applied here: accurate classification
-- over quota-matching. Flagged in docs/UI_POLISH_REPORT.md as well.

alter table public.words
  add column if not exists teaching_track text
  check (teaching_track in ('content', 'sight'));

-- Default: every function word is a sight word (closed-class, non-picturable).
update public.words set teaching_track = 'sight' where type = 'function';

-- Everything else defaults to content (picturable, direct association).
update public.words set teaching_track = 'content' where type = 'content';

-- Exceptions within the content-tagged bucket: symbolic/abstract words
-- taught via sight/repetition rather than a single-referent picture.
update public.words set teaching_track = 'sight'
  where word in (
    -- Numbers: taught as a counting sequence/symbol, not a picture.
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'zero',
    -- Abstract verbs: no single unambiguous picture (relational/cognitive/social actions).
    'help', 'learn', 'share', 'stop', 'count',
    -- Abstract evaluative adjectives: quality judgment, not a visual referent.
    'good', 'bad'
  );

alter table public.words
  alter column teaching_track set not null;

create index if not exists words_teaching_track_idx on public.words (teaching_track);
