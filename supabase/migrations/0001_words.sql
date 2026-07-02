-- Candy Galaxy v2, Phase 1 — additive only, never drops/renames existing tables/columns.
-- Apply via `supabase db push` or paste into Dashboard → SQL Editor → New query → Run
-- (note in the build report which path was actually used).

create table if not exists public.words (
  id          integer     primary key,
  word        text        not null unique,
  type        text        not null check (type in ('content', 'function')),
  unit        integer     not null,
  sort_order  integer     not null,
  emoji       text,
  definition  text,
  audio_url   text,
  image_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists words_unit_idx on public.words (unit, sort_order);

alter table public.words enable row level security;

-- Content is game data, not user data — every authenticated (and anonymous,
-- for the marketing/placement-preview surfaces) reader can select it.
drop policy if exists "Words are public-read" on public.words;
create policy "Words are public-read"
  on public.words for select
  using (true);

-- No insert/update/delete policy: writes happen only via the seed script /
-- service_role, never from the client.
