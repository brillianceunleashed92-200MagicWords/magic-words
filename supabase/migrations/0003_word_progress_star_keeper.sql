-- Candy Galaxy v2, Phase 1 — Star Keeper v1 (fixed-interval spaced repetition).
-- word_progress already EXISTS (supabase/add_word_progress_counts.sql on the
-- prior branch) — additive columns only, no drops/renames.

alter table public.word_progress
  add column if not exists next_review_at     timestamptz not null default now(),
  add column if not exists review_interval_days integer    not null default 1;

comment on column public.word_progress.next_review_at is
  'When this word''s star next needs "waking up" (Star Keeper review prompt). Fixed-interval v1 — SM-2-style adaptive intervals are a later iteration.';
comment on column public.word_progress.review_interval_days is
  'Fixed interval in days used to compute next_review_at after each review, v1 (1/3/7/14/30 fixed ladder — see useStarKeeper.js).';
