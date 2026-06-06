-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → Run

create table if not exists user_streaks (
  user_id             uuid        primary key references auth.users(id) on delete cascade,
  current_streak      integer     not null default 0,
  longest_streak      integer     not null default 0,
  last_activity_date  date,
  streak_freeze_count integer     not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table user_streaks enable row level security;

create policy "Users manage own streak"
  on user_streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
