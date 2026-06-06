-- Run this in the Supabase SQL editor:
-- Dashboard → SQL Editor → New query → paste → Run

alter table word_progress
  add column if not exists correct_count  integer   not null default 0,
  add column if not exists attempt_count  integer   not null default 0,
  add column if not exists last_seen      timestamptz,
  add column if not exists mastery_score  integer   not null default 0;

-- Back-fill mastery_score from existing mastery column
update word_progress set mastery_score = mastery where mastery_score = 0 and mastery > 0;
