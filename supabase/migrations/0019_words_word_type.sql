-- Sprint 2 Part B — word unification. api/session-generator.js currently
-- selects sessions from an 18-word hardcoded ALL_WORDS list carrying a
-- `wordClass` field (noun/verb/adjective/function) the client's
-- formatQuestion() needs for grammatically correct prompts ("a cat" vs
-- "someone eating" vs "something BIG"). The real words table (200 rows)
-- has `type` (content|function) and `teaching_track` (content|sight) but
-- nothing at the noun/verb/adjective granularity a question formatter
-- needs. This adds that column and populates all 200 rows.
--
-- Classification method: every unit maps cleanly to one grammatical class
-- (verified against docs/words-classification-audit.md's word-by-word
-- content/function pass and cross-checked against the existing 18-word
-- ALL_WORDS/wordMorphology.js WORD_CLASS entries for the words they
-- already cover — no disagreements found). Two categories beyond the
-- audit's content/function split were needed:
--   - 'number' for unit 10 (one..ten, zero) — these are `type='content'`
--     (correctly, per the audit — they carry real quantity-reference, not
--     grammatical function) but templating them as a generic noun reads
--     badly ("Which picture shows a three?"); kept distinct so the client
--     formatter can phrase them correctly ("the number three").
--   - unit 15's read/write/draw/learn/count/share/color/cut are verbs
--     (curriculum activity words: "color the picture", not "a color");
--     pencil/paper/box/bag in that same unit are nouns.
-- Every word from the live 200-row dump is accounted for exactly once;
-- row counts per category (80 noun + 30 verb + 34 adjective + 11 number +
-- 45 function = 200) were cross-checked against the dump before writing
-- this migration.

alter table public.words add column if not exists word_type text;

update public.words set word_type = 'noun' where word in (
  'cat','dog','bird','fish','bear','ball','book','cup',
  'frog','horse','lion','rabbit','duck','cow','pig','turtle','monkey','shark','ant','bee',
  'mom','dad','baby','boy','girl','friend','man','woman',
  'apple','milk','cookie','cake','pizza','bread','egg','water','soup','juice','banana','grapes',
  'bed','chair','door','house','car','bus','hat','shoe','phone','light','clock','table',
  'sun','moon','star','rain','snow','wind','tree','flower','sky','cloud','fire','ice',
  'hand','foot','eye','ear','nose','mouth','head','heart','hair','arm','leg','teeth',
  'pencil','paper','box','bag'
);

update public.words set word_type = 'verb' where word in (
  'eat','jump','run','swim','fly','dance','sing','play',
  'stop','go','look','see','help','sleep','open','sit','push','pull','throw','catch','stand','hop',
  'read','write','draw','learn','count','share','color','cut'
);

update public.words set word_type = 'adjective' where word in (
  'big','small','hot','cold','happy','sad','fast','slow',
  'red','blue','green','yellow','orange','purple','pink','black','white','brown','gray','gold',
  'good','bad','pretty','funny','new','old','loud','quiet','clean','dirty','wet','dry','full','empty'
);

update public.words set word_type = 'number' where word in (
  'one','two','three','four','five','six','seven','eight','nine','ten','zero'
);

update public.words set word_type = 'function' where type = 'function';

-- Fail loudly if the hand-built lists above missed a word, rather than
-- silently shipping NULLs that would make session-generator's question
-- formatter fall back to a guess for that word.
do $$
declare missing_count integer;
begin
  select count(*) into missing_count from public.words where word_type is null;
  if missing_count > 0 then
    raise exception 'word_type migration left % word(s) unclassified', missing_count;
  end if;
end $$;

alter table public.words alter column word_type set not null;
