-- Phase 2 (Parent Loop) — Story Engine + Magic Moments feed.
-- Additive only. RLS: owner is the child's parent (via child_profiles).

create table if not exists public.stories (
  id                uuid        primary key default gen_random_uuid(),
  child_id          uuid        not null references public.child_profiles(id) on delete cascade,
  title             text        not null,
  body              jsonb       not null, -- array of sentence strings
  target_word       text        not null,
  vocabulary_used    text[]      not null default '{}',
  created_at        timestamptz not null default now(),
  read_at           timestamptz,
  audio_url         text
);

create index if not exists stories_child_id_idx on public.stories (child_id, created_at desc);

alter table public.stories enable row level security;

drop policy if exists "Parents manage their children's stories" on public.stories;
create policy "Parents manage their children's stories"
  on public.stories for all
  using (exists (
    select 1 from public.child_profiles cp
    where cp.id = stories.child_id and cp.parent_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.child_profiles cp
    where cp.id = stories.child_id and cp.parent_id = auth.uid()
  ));

create table if not exists public.magic_moments (
  id          uuid        primary key default gen_random_uuid(),
  child_id    uuid        not null references public.child_profiles(id) on delete cascade,
  kind        text        not null check (kind in ('star_ignition', 'drawing', 'audio_reading', 'milestone', 'streak')),
  payload     jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  shared_at   timestamptz
);

create index if not exists magic_moments_child_id_idx on public.magic_moments (child_id, created_at desc);

alter table public.magic_moments enable row level security;

drop policy if exists "Parents manage their children's magic moments" on public.magic_moments;
create policy "Parents manage their children's magic moments"
  on public.magic_moments for all
  using (exists (
    select 1 from public.child_profiles cp
    where cp.id = magic_moments.child_id and cp.parent_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.child_profiles cp
    where cp.id = magic_moments.child_id and cp.parent_id = auth.uid()
  ));
