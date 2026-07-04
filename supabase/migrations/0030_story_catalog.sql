-- Mission A4 — pre-generated flagship story catalog. Story Time
-- (src/games/StoryTimeActivity.jsx) checks this table first for a
-- target_word + tier match before falling back to the deterministic
-- local template (src/lib/localStory.js) — same StoryReader.jsx either
-- way (see the story-text-source comment on that component). Storing
-- pre-generated art avoids per-child on-the-fly image generation for
-- kids: unmoderated real-time generation and per-request latency/cost
-- are both worth avoiding for child-facing imagery.
--
-- tier matches src/lib/localStory.js's getStoryTier (1/2/3, mapped from
-- the 24-level MLC progression in src/lib/levels.js) — a catalog can
-- carry multiple entries per word, one per tier, so the same word gets a
-- length/complexity appropriate to whichever child is playing.
create table if not exists public.story_catalog (
  id                     uuid primary key default gen_random_uuid(),
  target_word            text not null,
  tier                   smallint not null check (tier in (1, 2, 3)),
  title                  text not null,
  sentences              jsonb not null,
  comprehension_question jsonb,
  vocabulary_used        text[] not null default '{}',
  art_asset_url          text,
  created_at             timestamptz not null default now(),
  unique (target_word, tier)
);

alter table public.story_catalog enable row level security;

-- Read-only content, same as `words` — every authenticated child/parent
-- can read the whole catalog; nothing here is per-user.
drop policy if exists "story_catalog public read" on public.story_catalog;
create policy "story_catalog public read"
  on public.story_catalog for select
  to authenticated
  using (true);

-- Writes only via the service_role key (the seeding script), matching
-- word-audio's convention — no insert/update/delete policy needed.

insert into storage.buckets (id, name, public)
values ('story-art', 'story-art', true)
on conflict (id) do nothing;

drop policy if exists "story-art public read" on storage.objects;
create policy "story-art public read"
  on storage.objects for select
  using (bucket_id = 'story-art');
