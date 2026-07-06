-- Prompt 7 Part 6: Draw It (letter-tracing rebuild, Prompt 5) writes a
-- lightweight magic_moments row on word completion so the Parent Portal's
-- Moments feed recovers the content source tracing removed (the old
-- freeform-canvas Draw It's 'drawing' kind predates the tracing rebuild
-- and represented a different concept -- a user-drawn artifact; tracing
-- has no artifact, just a completed word, hence a distinct kind rather
-- than reusing 'drawing' for a shape it was never really seeded with).
-- No Storage upload, no new table -- just widening the existing kind
-- check constraint. RLS policy (0008) is unchanged: it already scopes by
-- child_id -> parent_id ownership regardless of kind value.
alter table public.magic_moments drop constraint if exists magic_moments_kind_check;
alter table public.magic_moments add constraint magic_moments_kind_check
  check (kind in ('star_ignition', 'drawing', 'audio_reading', 'milestone', 'streak', 'tracing'));
