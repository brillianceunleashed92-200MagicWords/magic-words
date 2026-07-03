-- Security hardening Phase 5 — abuse/rate-limiting infrastructure.
--
-- Every AI/TTS endpoint (speak, session-generator, story-engine,
-- parent-digest, ai-helper) currently has ZERO rate limiting and — before
-- this same phase's code changes — no auth requirement either. Every call
-- costs real money (ElevenLabs/Anthropic); an unauthenticated script
-- hitting these in a loop is a direct billing attack. This table backs a
-- simple per-user, per-endpoint, per-window counter checked/updated by
-- each serverless function using the service role key (bypasses RLS by
-- design — this table has no legitimate client-side use case at all, only
-- the backend needs to touch it).

create table if not exists public.api_rate_limits (
  user_id     uuid not null,
  endpoint    text not null,
  window_start timestamptz not null,
  count       integer not null default 0,
  primary key (user_id, endpoint, window_start)
);

-- No RLS policies defined = deny-all for every role except service_role/
-- table owner, the correct default for a table with no legitimate client
-- access pattern (matches the same "RLS on, zero policies" safe default
-- used for public.profiles in migration 0015).
alter table public.api_rate_limits enable row level security;

-- Old windows accumulate forever otherwise — cheap to prune opportunistically
-- rather than running a cron; called from the rate-limit check helper.
create or replace function public.prune_old_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.api_rate_limits where window_start < now() - interval '2 days';
$$;

-- TTS response cache — extends the existing per-word audio caching
-- pattern (word-audio bucket, migration 0010) to dynamically-generated
-- question sentences, which previously hit ElevenLabs fresh on every
-- single request even for byte-identical text (e.g. "Which picture shows
-- a cat?" gets asked to every child studying "cat"). Cached by a hash of
-- the exact text, public read (audio isn't sensitive), writes via
-- service_role only from api/speak.mjs.
insert into storage.buckets (id, name, public)
values ('tts-cache', 'tts-cache', true)
on conflict (id) do nothing;

drop policy if exists "tts-cache public read" on storage.objects;
create policy "tts-cache public read"
  on storage.objects for select
  using (bucket_id = 'tts-cache');
