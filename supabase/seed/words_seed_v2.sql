-- CURRICULUM_REPLACE_R1 -- Dr. Blank's consolidated 100 content + 100
-- non-content word list (docs/design/curriculum/200MW_word_list_100_100.md,
-- corrected version, commit 8877d6b), landed alongside the existing 200-word
-- v1-legacy set. Requires migration 0040_words_v2_curriculum.sql to have run
-- first (forms/curriculum_version/notes columns, widened unique constraint).
--
-- ****************************************************************
-- NOT APPLIED TO PRODUCTION YET -- DEFERRED, DELIBERATELY.
-- Every real read path against `words` today (src/lib/queries/words.js,
-- and 3 call sites in api/session-generator.js) selects with NO
-- curriculum_version filter -- one of them (session-generator.js's
-- `.lte('unit', maxUnit)` path) would actively MIX v1 and v2 words
-- together for any unit within both curricula's range, not just double
-- the row count. Landing this seed today would therefore NOT be the
-- invisible, flag-gated change CURRICULUM_REPLACE_R1.md describes --
-- found and confirmed during CURRICULUM_REPLACE_R1 execution, decided
-- with the user: apply migration 0040 alone for now (adds the columns/
-- table with zero new rows, genuinely invisible), hold this seed until
-- the app-code read-path filter is a separate, explicitly-scoped task.
-- ****************************************************************
--
-- 200 rows, ids 1001-1200, curriculum_version = 'v2-blank-100-100'.
-- app_config.active_curriculum_version stays 'v1-legacy' after this seed --
-- landing this data does not change what the app serves ONCE the read-path
-- gap above is fixed; until then, do not run this against production.
--
-- Two modeling decisions, both flagged per-row via `notes`:
--   - Blank's 'a / an' row (counted as one headword) is seeded as headword
--     'a', with 'an' folded into forms as a related_word entry.
--   - Blank's 'somebody / anybody / nobody' row (one taught family, no unit
--     number in her doc) is seeded as headword 'somebody', with 'anybody'/
--     'nobody' folded into forms as related_word entries, unit = 999.
--
-- Forms `type` values are derived from surface pattern, not asserted
-- per-word part of speech (several of her words serve as both noun and
-- verb across her list -- park, fish, work, rain): base, s_form, ing_form,
-- ed_form, irregular_form, comparative, derived_adjective (scary, sandy,
-- rainy, sunny), contraction, possessive, related_word. See
-- docs/CURRICULUM_REPLACE_R1.md section 6 for the full rationale.
--
-- Unit 999 is a deliberate PENDING sentinel (not a real teaching-order
-- position) for the two rows whose unit was unspecified in Blank's source
-- doc ('before', 'somebody') -- both need her confirmed unit number before
-- being treated as production-ready. sort_order pairs content and
-- non-content words that share a unit number (her paired-teaching-order
-- design), matching CURRICULUM_REPLACE_R1.md section 4.
--
-- teaching_track/word_type -- pre-existing NOT NULL columns (migrations
-- 0014, 0019) not mentioned in CURRICULUM_REPLACE_R1.md's schema section,
-- found only when this seed was actually run against a schema-accurate
-- test database (see CURRICULUM_RECON_R1 execution notes) -- the insert
-- fails without them, no default exists. Populated as follows:
--   - 87 words spelled identically to a v1 word: REUSED v1's own
--     word_type/teaching_track values verbatim (no new judgment call).
--   - All 100 non-content/function words (55 net-new + 45 reused above):
--     word_type='function', teaching_track='sight' -- mechanical, matches
--     migrations 0014/0019's own rule for every function word.
--   - The 58 content words genuinely new to v2: word_type classified by
--     ordinary noun/verb/adjective judgment; teaching_track defaults to
--     'content' except get/know/make/need/think/try/use, marked 'sight'
--     as abstract/cognitive verbs with no single clear picture referent --
--     same reasoning migration 0014 documented for help/learn/share/stop/
--     count, applied here to a comparable, deliberately narrow set (7 of
--     58, roughly matching that migration's ~12% sight-exception rate
--     among content words). This is a NEW classification pass, not
--     something CURRICULUM_RECON_R1/REPLACE_R1 specified or reviewed --
--     flagged as provisional, worth its own audit pass (in the style of
--     docs/words-classification-audit.md) if precision here matters
--     before this seed is ever actually applied.

insert into public.words (id, word, type, unit, sort_order, emoji, definition, audio_url, image_url, teaching_track, word_type, has_art, curriculum_version, forms, notes) values
  (1001, 'kid', 'content', 1, 1, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "kid", "type": "base", "irregular": false}, {"form": "kids", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1002, 'girl', 'content', 1, 2, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "girl", "type": "base", "irregular": false}, {"form": "girls", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1003, 'boy', 'content', 1, 3, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "boy", "type": "base", "irregular": false}, {"form": "boys", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1004, 'some', 'function', 1, 4, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "some", "type": "base", "irregular": false}]'::jsonb, null),
  (1005, 'a', 'function', 1, 5, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "a", "type": "base", "irregular": false}, {"form": "an", "type": "related_word", "irregular": false}]'::jsonb, 'Blank''s headword is ''a / an'' (counted as ONE word); modeled here as headword ''a'' with an folded into forms as related_word entries.'),
  (1006, 'more', 'function', 1, 6, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "more", "type": "base", "irregular": false}]'::jsonb, null),
  (1007, 'cat', 'content', 2, 7, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "cat", "type": "base", "irregular": false}, {"form": "cats", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1008, 'bird', 'content', 2, 8, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "bird", "type": "base", "irregular": false}, {"form": "birds", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1009, 'pet', 'content', 2, 9, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "pet", "type": "base", "irregular": false}, {"form": "pets", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1010, 'eat', 'content', 3, 10, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "eat", "type": "base", "irregular": false}, {"form": "eats", "type": "s_form", "irregular": false}, {"form": "ate", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1011, 'fly', 'content', 3, 11, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "fly", "type": "base", "irregular": false}, {"form": "flies", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1012, 'rest', 'content', 3, 12, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "rest", "type": "base", "irregular": false}, {"form": "rests", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1013, 'the', 'function', 3, 13, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "the", "type": "base", "irregular": false}]'::jsonb, null),
  (1014, 'can', 'function', 3, 14, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "can", "type": "base", "irregular": false}, {"form": "can''t", "type": "contraction", "irregular": false}]'::jsonb, null),
  (1015, 'are', 'function', 3, 15, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "are", "type": "base", "irregular": false}]'::jsonb, null),
  (1016, 'here', 'function', 3, 16, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "here", "type": "base", "irregular": false}]'::jsonb, null),
  (1017, 'not', 'function', 3, 17, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "not", "type": "base", "irregular": false}]'::jsonb, null),
  (1018, 'bug', 'content', 4, 18, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "bug", "type": "base", "irregular": false}, {"form": "bugs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1019, 'swim', 'content', 4, 19, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "swim", "type": "base", "irregular": false}, {"form": "swims", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1020, 'talk', 'content', 4, 20, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "talk", "type": "base", "irregular": false}, {"form": "talks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1021, 'jump', 'content', 4, 21, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "jump", "type": "base", "irregular": false}, {"form": "jumps", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1022, 'walk', 'content', 5, 22, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "walk", "type": "base", "irregular": false}, {"form": "walks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1023, 'plane', 'content', 5, 23, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "plane", "type": "base", "irregular": false}, {"form": "planes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1024, 'toy', 'content', 5, 24, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "toy", "type": "base", "irregular": false}, {"form": "toys", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1025, 'robot', 'content', 5, 25, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "robot", "type": "base", "irregular": false}, {"form": "robots", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1026, 'is', 'function', 5, 26, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "is", "type": "base", "irregular": false}]'::jsonb, null),
  (1027, 'but', 'function', 5, 27, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "but", "type": "base", "irregular": false}]'::jsonb, null),
  (1028, 'this', 'function', 5, 28, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "this", "type": "base", "irregular": false}]'::jsonb, null),
  (1029, 'it', 'function', 5, 29, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "it", "type": "base", "irregular": false}, {"form": "its", "type": "possessive", "irregular": false}]'::jsonb, null),
  (1030, 'rocket', 'content', 6, 30, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "rocket", "type": "base", "irregular": false}, {"form": "rockets", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1031, 'sit', 'content', 6, 31, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "sit", "type": "base", "irregular": false}, {"form": "sits", "type": "s_form", "irregular": false}, {"form": "sitting", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1032, 'they', 'function', 6, 32, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "they", "type": "base", "irregular": false}]'::jsonb, null),
  (1033, 'thing', 'content', 7, 33, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "thing", "type": "base", "irregular": false}, {"form": "things", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1034, 'big', 'content', 7, 34, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "big", "type": "base", "irregular": false}]'::jsonb, null),
  (1035, 'baby', 'content', 7, 35, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "baby", "type": "base", "irregular": false}, {"form": "babies", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1036, 'she', 'function', 7, 36, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "she", "type": "base", "irregular": false}]'::jsonb, null),
  (1037, 'who', 'function', 7, 37, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "who", "type": "base", "irregular": false}]'::jsonb, null),
  (1038, 'also', 'function', 7, 38, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "also", "type": "base", "irregular": false}]'::jsonb, null),
  (1039, 'that', 'function', 7, 39, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "that", "type": "base", "irregular": false}]'::jsonb, null),
  (1040, 'do', 'function', 7, 40, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "do", "type": "base", "irregular": false}, {"form": "does", "type": "s_form", "irregular": false}, {"form": "don''t", "type": "contraction", "irregular": false}, {"form": "doesn''t", "type": "contraction", "irregular": false}]'::jsonb, null),
  (1041, 'I', 'function', 7, 41, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "I", "type": "base", "irregular": false}]'::jsonb, null),
  (1042, 'am', 'function', 7, 42, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "am", "type": "base", "irregular": false}]'::jsonb, null),
  (1043, 'we', 'function', 7, 43, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "we", "type": "base", "irregular": false}]'::jsonb, null),
  (1044, 'frog', 'content', 8, 44, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "frog", "type": "base", "irregular": false}, {"form": "frogs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1045, 'like', 'function', 8, 45, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "like", "type": "base", "irregular": false}, {"form": "likes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1046, 'what', 'function', 8, 46, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "what", "type": "base", "irregular": false}]'::jsonb, null),
  (1047, 'to', 'function', 8, 47, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "to", "type": "base", "irregular": false}]'::jsonb, null),
  (1048, 'want', 'function', 8, 48, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "want", "type": "base", "irregular": false}, {"form": "wants", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1049, 'many', 'function', 8, 49, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "many", "type": "base", "irregular": false}]'::jsonb, null),
  (1050, 'those', 'function', 8, 50, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "those", "type": "base", "irregular": false}]'::jsonb, null),
  (1051, 'run', 'content', 9, 51, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "run", "type": "base", "irregular": false}, {"form": "runs", "type": "s_form", "irregular": false}, {"form": "running", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1052, 'dog', 'content', 9, 52, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "dog", "type": "base", "irregular": false}, {"form": "dogs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1053, 'look', 'content', 9, 53, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "look", "type": "base", "irregular": false}, {"form": "looks", "type": "s_form", "irregular": false}, {"form": "looking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1054, 'one', 'function', 9, 54, null, null, null, null, 'sight', 'number', false, 'v2-blank-100-100', '[{"form": "one", "type": "base", "irregular": false}, {"form": "ones", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1055, 'other', 'function', 9, 55, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "other", "type": "base", "irregular": false}]'::jsonb, null),
  (1056, 'which', 'function', 9, 56, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "which", "type": "base", "irregular": false}]'::jsonb, null),
  (1057, 'there', 'function', 9, 57, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "there", "type": "base", "irregular": false}]'::jsonb, null),
  (1058, 'at', 'function', 9, 58, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "at", "type": "base", "irregular": false}]'::jsonb, null),
  (1059, 'now', 'function', 9, 59, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "now", "type": "base", "irregular": false}]'::jsonb, null),
  (1060, 'man', 'content', 10, 60, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "man", "type": "base", "irregular": false}]'::jsonb, null),
  (1061, 'good', 'content', 10, 61, null, null, null, null, 'sight', 'adjective', false, 'v2-blank-100-100', '[{"form": "good", "type": "base", "irregular": false}]'::jsonb, null),
  (1062, 'fix', 'content', 10, 62, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "fix", "type": "base", "irregular": false}, {"form": "fixes", "type": "s_form", "irregular": false}, {"form": "fixing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1063, 'arm', 'content', 10, 63, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "arm", "type": "base", "irregular": false}, {"form": "arms", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1064, 'leg', 'content', 10, 64, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "leg", "type": "base", "irregular": false}, {"form": "legs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1065, 'truck', 'content', 10, 65, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "truck", "type": "base", "irregular": false}, {"form": "trucks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1066, 'of', 'function', 10, 66, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "of", "type": "base", "irregular": false}]'::jsonb, null),
  (1067, 'yes', 'function', 10, 67, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "yes", "type": "base", "irregular": false}]'::jsonb, null),
  (1068, 'have', 'function', 10, 68, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "have", "type": "base", "irregular": false}, {"form": "has", "type": "s_form", "irregular": false}, {"form": "had", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1069, 'he', 'function', 10, 69, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "he", "type": "base", "irregular": false}]'::jsonb, null),
  (1070, 'need', 'content', 11, 70, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "need", "type": "base", "irregular": false}, {"form": "needs", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1071, 'wing', 'content', 11, 71, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "wing", "type": "base", "irregular": false}, {"form": "wings", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1072, 'use', 'content', 11, 72, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "use", "type": "base", "irregular": false}, {"form": "using", "type": "ing_form", "irregular": false}, {"form": "uses", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1073, 'stop', 'content', 11, 73, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "stop", "type": "base", "irregular": false}, {"form": "stopping", "type": "ing_form", "irregular": false}, {"form": "stops", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1074, 'my', 'function', 11, 74, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "my", "type": "base", "irregular": false}]'::jsonb, null),
  (1075, 'you', 'function', 11, 75, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "you", "type": "base", "irregular": false}]'::jsonb, null),
  (1076, 'all', 'function', 11, 76, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "all", "type": "base", "irregular": false}]'::jsonb, null),
  (1077, 'no', 'function', 11, 77, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "no", "type": "base", "irregular": false}]'::jsonb, null),
  (1078, 'their', 'function', 11, 78, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "their", "type": "base", "irregular": false}]'::jsonb, null),
  (1079, 'duck', 'content', 12, 79, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "duck", "type": "base", "irregular": false}, {"form": "ducks", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1080, 'water', 'content', 12, 80, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "water", "type": "base", "irregular": false}]'::jsonb, null),
  (1081, 'way', 'content', 12, 81, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "way", "type": "base", "irregular": false}, {"form": "ways", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1082, 'move', 'content', 12, 82, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "move", "type": "base", "irregular": false}, {"form": "moving", "type": "ing_form", "irregular": false}, {"form": "moves", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1083, 'drink', 'content', 12, 83, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "drink", "type": "base", "irregular": false}, {"form": "drinks", "type": "s_form", "irregular": false}, {"form": "drinking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1084, 'by', 'function', 12, 84, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "by", "type": "base", "irregular": false}]'::jsonb, null),
  (1085, 'these', 'function', 12, 85, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "these", "type": "base", "irregular": false}]'::jsonb, null),
  (1086, 'and', 'function', 12, 86, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "and", "type": "base", "irregular": false}]'::jsonb, null),
  (1087, 'both', 'function', 12, 87, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "both", "type": "base", "irregular": false}]'::jsonb, null),
  (1088, 'in', 'function', 12, 88, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "in", "type": "base", "irregular": false}]'::jsonb, null),
  (1089, 'for', 'function', 12, 89, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "for", "type": "base", "irregular": false}]'::jsonb, null),
  (1090, 'sad', 'content', 13, 90, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "sad", "type": "base", "irregular": false}]'::jsonb, null),
  (1091, 'hurt', 'content', 13, 91, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "hurt", "type": "base", "irregular": false}, {"form": "hurts", "type": "s_form", "irregular": false}, {"form": "hurting", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1092, 'was', 'function', 13, 92, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "was", "type": "base", "irregular": false}]'::jsonb, null),
  (1093, 'only', 'function', 13, 93, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "only", "type": "base", "irregular": false}]'::jsonb, null),
  (1094, 'did', 'function', 13, 94, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "did", "type": "base", "irregular": false}]'::jsonb, null),
  (1095, 'on', 'function', 13, 95, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "on", "type": "base", "irregular": false}]'::jsonb, null),
  (1096, 'could', 'function', 13, 96, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "could", "type": "base", "irregular": false}]'::jsonb, null),
  (1097, 'help', 'content', 14, 97, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "help", "type": "base", "irregular": false}, {"form": "helps", "type": "s_form", "irregular": false}, {"form": "helping", "type": "ing_form", "irregular": false}, {"form": "helped", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1098, 'see', 'content', 14, 98, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "see", "type": "base", "irregular": false}, {"form": "sees", "type": "s_form", "irregular": false}, {"form": "seeing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1099, 'go', 'content', 14, 99, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "go", "type": "base", "irregular": false}, {"form": "goes", "type": "s_form", "irregular": false}, {"form": "going", "type": "ing_form", "irregular": false}, {"form": "went", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1100, 'think', 'content', 14, 100, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "think", "type": "base", "irregular": false}, {"form": "thinks", "type": "s_form", "irregular": false}, {"form": "thinking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1101, 'cry', 'content', 14, 101, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "cry", "type": "base", "irregular": false}, {"form": "cries", "type": "s_form", "irregular": false}, {"form": "crying", "type": "ing_form", "irregular": false}, {"form": "cried", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1102, 'where', 'function', 14, 102, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "where", "type": "base", "irregular": false}]'::jsonb, null),
  (1103, 'his', 'function', 14, 103, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "his", "type": "base", "irregular": false}]'::jsonb, null),
  (1104, 'very', 'function', 14, 104, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "very", "type": "base", "irregular": false}]'::jsonb, null),
  (1105, 'me', 'function', 14, 105, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "me", "type": "base", "irregular": false}]'::jsonb, null),
  (1106, 'near', 'function', 14, 106, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "near", "type": "base", "irregular": false}]'::jsonb, null),
  (1107, 'play', 'content', 15, 107, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "play", "type": "base", "irregular": false}, {"form": "plays", "type": "s_form", "irregular": false}, {"form": "played", "type": "ed_form", "irregular": false}, {"form": "playing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1108, 'face', 'content', 15, 108, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "face", "type": "base", "irregular": false}, {"form": "faces", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1109, 'food', 'content', 15, 109, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "food", "type": "base", "irregular": false}]'::jsonb, null),
  (1110, 'happy', 'content', 15, 110, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "happy", "type": "base", "irregular": false}]'::jsonb, null),
  (1111, 'fat', 'content', 15, 111, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "fat", "type": "base", "irregular": false}]'::jsonb, null),
  (1112, 'most', 'function', 15, 112, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "most", "type": "base", "irregular": false}]'::jsonb, null),
  (1113, 'her', 'function', 15, 113, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "her", "type": "base", "irregular": false}, {"form": "hers", "type": "possessive", "irregular": false}]'::jsonb, null),
  (1114, 'any', 'function', 15, 114, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "any", "type": "base", "irregular": false}]'::jsonb, null),
  (1115, 'hole', 'content', 16, 115, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "hole", "type": "base", "irregular": false}, {"form": "holes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1116, 'find', 'content', 16, 116, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "find", "type": "base", "irregular": false}, {"form": "finds", "type": "s_form", "irregular": false}, {"form": "finding", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1117, 'mice', 'content', 16, 117, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "mice", "type": "base", "irregular": false}]'::jsonb, null),
  (1118, 'get', 'content', 16, 118, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "get", "type": "base", "irregular": false}, {"form": "gets", "type": "s_form", "irregular": false}, {"form": "getting", "type": "ing_form", "irregular": false}, {"form": "got", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1119, 'them', 'function', 16, 119, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "them", "type": "base", "irregular": false}]'::jsonb, null),
  (1120, 'out', 'function', 16, 120, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "out", "type": "base", "irregular": false}]'::jsonb, null),
  (1121, 'be', 'function', 16, 121, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "be", "type": "base", "irregular": false}]'::jsonb, null),
  (1122, 'us', 'function', 16, 122, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "us", "type": "base", "irregular": false}]'::jsonb, null),
  (1123, 'then', 'function', 16, 123, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "then", "type": "base", "irregular": false}]'::jsonb, null),
  (1124, 'park', 'content', 17, 124, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "park", "type": "base", "irregular": false}, {"form": "parks", "type": "s_form", "irregular": false}, {"form": "parked", "type": "ed_form", "irregular": false}, {"form": "parking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1125, 'nice', 'content', 17, 125, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "nice", "type": "base", "irregular": false}]'::jsonb, null),
  (1126, 'place', 'content', 17, 126, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "place", "type": "base", "irregular": false}, {"form": "places", "type": "s_form", "irregular": false}, {"form": "placed", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1127, 'pool', 'content', 17, 127, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "pool", "type": "base", "irregular": false}, {"form": "pools", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1128, 'ground', 'content', 17, 128, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "ground", "type": "base", "irregular": false}]'::jsonb, null),
  (1129, 'dirt', 'content', 17, 129, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "dirt", "type": "base", "irregular": false}, {"form": "dirty", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1130, 'swing', 'content', 17, 130, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "swing", "type": "base", "irregular": false}, {"form": "swings", "type": "s_form", "irregular": false}, {"form": "swinging", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1131, 'still', 'function', 17, 131, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "still", "type": "base", "irregular": false}]'::jsonb, null),
  (1132, 'say', 'function', 17, 132, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "say", "type": "base", "irregular": false}, {"form": "says", "type": "s_form", "irregular": false}, {"form": "said", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1133, 'were', 'function', 17, 133, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "were", "type": "base", "irregular": false}]'::jsonb, null),
  (1134, 'clean', 'content', 18, 134, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "clean", "type": "base", "irregular": false}, {"form": "cleans", "type": "s_form", "irregular": false}, {"form": "cleaned", "type": "ed_form", "irregular": false}, {"form": "cleaning", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1135, 'bag', 'content', 18, 135, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "bag", "type": "base", "irregular": false}, {"form": "bags", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1136, 'put', 'content', 18, 136, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "put", "type": "base", "irregular": false}, {"form": "puts", "type": "s_form", "irregular": false}, {"form": "putting", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1137, 'make', 'content', 18, 137, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "make", "type": "base", "irregular": false}, {"form": "makes", "type": "s_form", "irregular": false}, {"form": "making", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1138, 'will', 'function', 18, 138, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "will", "type": "base", "irregular": false}]'::jsonb, null),
  (1139, 'would', 'function', 18, 139, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "would", "type": "base", "irregular": false}]'::jsonb, null),
  (1140, 'with', 'function', 18, 140, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "with", "type": "base", "irregular": false}]'::jsonb, null),
  (1141, 'too', 'function', 19, 141, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "too", "type": "base", "irregular": false}]'::jsonb, null),
  (1142, 'house', 'content', 20, 142, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "house", "type": "base", "irregular": false}, {"form": "houses", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1143, 'rain', 'content', 20, 143, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "rain", "type": "base", "irregular": false}, {"form": "rains", "type": "s_form", "irregular": false}, {"form": "rainy", "type": "derived_adjective", "irregular": false}, {"form": "rained", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1144, 'sun', 'content', 20, 144, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "sun", "type": "base", "irregular": false}, {"form": "sunny", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1145, 'when', 'function', 20, 145, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "when", "type": "base", "irregular": false}]'::jsonb, null),
  (1146, 'about', 'function', 20, 146, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "about", "type": "base", "irregular": false}]'::jsonb, null),
  (1147, 'just', 'function', 20, 147, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "just", "type": "base", "irregular": false}]'::jsonb, null),
  (1148, 'each', 'function', 20, 148, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "each", "type": "base", "irregular": false}]'::jsonb, null),
  (1149, 'our', 'function', 20, 149, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "our", "type": "base", "irregular": false}]'::jsonb, null),
  (1150, 'again', 'function', 20, 150, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "again", "type": "base", "irregular": false}]'::jsonb, null),
  (1151, 'dig', 'content', 21, 151, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "dig", "type": "base", "irregular": false}, {"form": "digs", "type": "s_form", "irregular": false}, {"form": "digging", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1152, 'work', 'content', 21, 152, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "work", "type": "base", "irregular": false}, {"form": "works", "type": "s_form", "irregular": false}, {"form": "worked", "type": "ed_form", "irregular": false}, {"form": "working", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1153, 'up', 'function', 21, 153, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "up", "type": "base", "irregular": false}]'::jsonb, null),
  (1154, 'because', 'function', 21, 154, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "because", "type": "base", "irregular": false}]'::jsonb, null),
  (1155, 'why', 'function', 21, 155, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "why", "type": "base", "irregular": false}]'::jsonb, null),
  (1156, 'come', 'content', 22, 156, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "come", "type": "base", "irregular": false}, {"form": "comes", "type": "s_form", "irregular": false}, {"form": "coming", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1157, 'how', 'function', 22, 157, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "how", "type": "base", "irregular": false}]'::jsonb, null),
  (1158, 'take', 'content', 23, 158, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "take", "type": "base", "irregular": false}, {"form": "takes", "type": "s_form", "irregular": false}, {"form": "taking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1159, 'after', 'function', 23, 159, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "after", "type": "base", "irregular": false}]'::jsonb, null),
  (1160, 'animal', 'content', 24, 160, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "animal", "type": "base", "irregular": false}, {"form": "animals", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1161, 'moon', 'content', 24, 161, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "moon", "type": "base", "irregular": false}, {"form": "moons", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1162, 'day', 'content', 24, 162, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "day", "type": "base", "irregular": false}, {"form": "days", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1163, 'than', 'function', 24, 163, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "than", "type": "base", "irregular": false}]'::jsonb, null),
  (1164, 'home', 'content', 25, 164, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "home", "type": "base", "irregular": false}, {"form": "homes", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1165, 'scare', 'content', 25, 165, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "scare", "type": "base", "irregular": false}, {"form": "scared", "type": "ed_form", "irregular": false}, {"form": "scary", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1166, 'hungry', 'content', 25, 166, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "hungry", "type": "base", "irregular": false}]'::jsonb, null),
  (1167, 'open', 'content', 25, 167, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "open", "type": "base", "irregular": false}, {"form": "opens", "type": "s_form", "irregular": false}, {"form": "opened", "type": "ed_form", "irregular": false}, {"form": "opening", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1168, 'yell', 'content', 25, 168, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "yell", "type": "base", "irregular": false}, {"form": "yells", "type": "s_form", "irregular": false}, {"form": "yelled", "type": "ed_form", "irregular": false}, {"form": "yelling", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1169, 'bad', 'content', 25, 169, null, null, null, null, 'sight', 'adjective', false, 'v2-blank-100-100', '[{"form": "bad", "type": "base", "irregular": false}]'::jsonb, null),
  (1170, 'over', 'function', 25, 170, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "over", "type": "base", "irregular": false}]'::jsonb, null),
  (1171, 'much', 'function', 25, 171, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "much", "type": "base", "irregular": false}]'::jsonb, null),
  (1172, 'him', 'function', 25, 172, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "him", "type": "base", "irregular": false}]'::jsonb, null),
  (1173, 'fish', 'content', 26, 173, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "fish", "type": "base", "irregular": false}, {"form": "fishes", "type": "s_form", "irregular": false}, {"form": "fished", "type": "ed_form", "irregular": false}, {"form": "fishing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1174, 'top', 'content', 26, 174, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "top", "type": "base", "irregular": false}, {"form": "tops", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1175, 'sand', 'content', 26, 175, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "sand", "type": "base", "irregular": false}, {"form": "sandy", "type": "derived_adjective", "irregular": false}]'::jsonb, null),
  (1176, 'try', 'content', 26, 176, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "try", "type": "base", "irregular": false}, {"form": "tries", "type": "s_form", "irregular": false}, {"form": "tried", "type": "ed_form", "irregular": false}, {"form": "trying", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1177, 'so', 'function', 26, 177, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "so", "type": "base", "irregular": false}]'::jsonb, null),
  (1178, 'ask', 'content', 27, 178, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "ask", "type": "base", "irregular": false}, {"form": "asks", "type": "s_form", "irregular": false}, {"form": "asked", "type": "ed_form", "irregular": false}, {"form": "asking", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1179, 'name', 'content', 27, 179, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "name", "type": "base", "irregular": false}, {"form": "names", "type": "s_form", "irregular": false}, {"form": "named", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1180, 'know', 'content', 27, 180, null, null, null, null, 'sight', 'verb', false, 'v2-blank-100-100', '[{"form": "know", "type": "base", "irregular": false}, {"form": "knows", "type": "s_form", "irregular": false}, {"form": "knowing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1181, 'smile', 'content', 27, 181, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "smile", "type": "base", "irregular": false}, {"form": "smiles", "type": "s_form", "irregular": false}, {"form": "smiled", "type": "ed_form", "irregular": false}, {"form": "smiling", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1182, 'such', 'function', 27, 182, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "such", "type": "base", "irregular": false}]'::jsonb, null),
  (1183, 'your', 'function', 27, 183, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "your", "type": "base", "irregular": false}]'::jsonb, null),
  (1184, 'once', 'function', 27, 184, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "once", "type": "base", "irregular": false}]'::jsonb, null),
  (1185, 'change', 'content', 28, 185, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "change", "type": "base", "irregular": false}, {"form": "changes", "type": "s_form", "irregular": false}, {"form": "changed", "type": "ed_form", "irregular": false}, {"form": "changing", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1186, 'computer', 'content', 28, 186, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "computer", "type": "base", "irregular": false}, {"form": "computers", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1187, 'sleep', 'content', 28, 187, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "sleep", "type": "base", "irregular": false}, {"form": "sleeps", "type": "s_form", "irregular": false}, {"form": "sleeping", "type": "ing_form", "irregular": false}]'::jsonb, null),
  (1188, 'from', 'function', 28, 188, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "from", "type": "base", "irregular": false}]'::jsonb, null),
  (1189, 'even', 'function', 28, 189, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "even", "type": "base", "irregular": false}]'::jsonb, null),
  (1190, 'nothing', 'function', 28, 190, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "nothing", "type": "base", "irregular": false}]'::jsonb, null),
  (1191, 'tell', 'content', 29, 191, null, null, null, null, 'content', 'verb', false, 'v2-blank-100-100', '[{"form": "tell", "type": "base", "irregular": false}, {"form": "tells", "type": "s_form", "irregular": false}, {"form": "telling", "type": "ing_form", "irregular": false}, {"form": "told", "type": "irregular_form", "irregular": true}]'::jsonb, null),
  (1192, 'hand', 'content', 29, 192, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "hand", "type": "base", "irregular": false}, {"form": "hands", "type": "s_form", "irregular": false}, {"form": "handed", "type": "ed_form", "irregular": false}]'::jsonb, null),
  (1193, 'every', 'function', 29, 193, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "every", "type": "base", "irregular": false}]'::jsonb, null),
  (1194, 'head', 'content', 30, 194, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "head", "type": "base", "irregular": false}, {"form": "heads", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1195, 'slow', 'content', 30, 195, null, null, null, null, 'content', 'adjective', false, 'v2-blank-100-100', '[{"form": "slow", "type": "base", "irregular": false}, {"form": "slower", "type": "comparative", "irregular": false}]'::jsonb, null),
  (1196, 'tree', 'content', 30, 196, null, null, null, null, 'content', 'noun', false, 'v2-blank-100-100', '[{"form": "tree", "type": "base", "irregular": false}, {"form": "trees", "type": "s_form", "irregular": false}]'::jsonb, null),
  (1197, 'never', 'function', 30, 197, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "never", "type": "base", "irregular": false}]'::jsonb, null),
  (1198, 'down', 'function', 30, 198, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "down", "type": "base", "irregular": false}]'::jsonb, null),
  (1199, 'before', 'function', 999, 199, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "before", "type": "base", "irregular": false}]'::jsonb, 'Her source note said only ''teach earlier'' with no specific unit number. Unit 999 is a PENDING sentinel, not a real position -- needs her confirmed unit number before this word is production-ready.'),
  (1200, 'somebody', 'function', 999, 200, null, null, null, null, 'sight', 'function', false, 'v2-blank-100-100', '[{"form": "somebody", "type": "base", "irregular": false}, {"form": "anybody", "type": "related_word", "irregular": false}, {"form": "nobody", "type": "related_word", "irregular": false}]'::jsonb, 'Unit also unspecified in her doc (''—''); 999 is a PENDING sentinel, needs her confirmed unit number.')
on conflict (word, curriculum_version) do update set
  type = excluded.type, unit = excluded.unit, sort_order = excluded.sort_order,
  teaching_track = excluded.teaching_track, word_type = excluded.word_type,
  forms = excluded.forms, notes = excluded.notes;