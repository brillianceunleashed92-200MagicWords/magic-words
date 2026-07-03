-- WordArt sync fix (wordart-batch-1, Step 0) — picture-eligibility used
-- to live in three hardcoded places that had to agree by hand: WordArt.jsx's
-- REGISTRY, PICTURE_ART_WORDS in api/session-generator.js, and its copy in
-- src/hooks/useSessionPlan.js. Every future art batch meant editing all
-- three and hoping. This migration adds the real column; session-generator
-- and useSessionPlan now derive picture-eligibility from it directly
-- instead of a hardcoded constant.
--
-- Single source of truth going forward: src/components/wordArtManifest.json
-- lists every word with real WordArt. This migration's word list below is
-- that same manifest's contents as of this batch (kept in sync by hand at
-- migration-write-time, same as any schema migration mirrors application
-- state) — scripts/check-wordart-sync.mjs then mechanically asserts
-- WordArt.jsx's REGISTRY keys exactly match the manifest on every build, so
-- drift between REGISTRY and the manifest fails loudly. The migration/
-- manifest pairing itself isn't mechanically checked (a one-time seed per
-- batch, reviewed by hand like any migration), but every subsequent read
-- of "is this word picture-eligible" goes through the `has_art` column,
-- not a copy-pasted constant.

alter table public.words add column if not exists has_art boolean not null default false;

update public.words set has_art = true where word in (
  'dog', 'cat', 'bird', 'frog', 'eat', 'fly', 'jump', 'run', 'big', 'sad'
);
