-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → Run

create table if not exists learning_events (
  id               bigserial   primary key,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  word             text        not null,
  correct          boolean     not null,
  game_type        text        not null default 'word_match',
  response_time_ms integer,
  created_at       timestamptz not null default now()
);

create index if not exists learning_events_user_created
  on learning_events (user_id, created_at desc);

alter table learning_events enable row level security;

create policy "Users manage own events"
  on learning_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
