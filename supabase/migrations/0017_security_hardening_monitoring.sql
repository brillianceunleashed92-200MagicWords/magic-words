-- Security hardening Phase 6 — failure/security-event logging.
--
-- api/stripe-webhook.js currently logs-and-returns-200 when the Supabase
-- upsert fails (correct — avoids Stripe retry storms for something that
-- isn't Stripe's problem) but that failure was otherwise invisible: a
-- paying customer could be charged with no subscription row ever written
-- and nobody would know unless someone happened to grep Vercel logs.
-- webhook_failures gives that failure a durable, queryable home; the
-- distinctive console.error prefix (kept, not replaced) is what a log
-- drain/alert would actually watch for in the moment.
create table if not exists public.webhook_failures (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  event_id    text,
  error       text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.webhook_failures enable row level security;
-- No policies — service_role only, same deny-all-by-default pattern as
-- api_rate_limits (migration 0016) and profiles (migration 0015).

-- security_events — lightweight log of auth/security-relevant events from
-- the serverless layer: rate-limit trips, JWT verification failures,
-- IDOR-check rejections. User UUIDs only, no names/emails/child data —
-- this table exists to answer "is something attacking us," not to store
-- PII.
create table if not exists public.security_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,
  user_id     uuid,
  endpoint    text,
  detail      text,
  created_at  timestamptz not null default now()
);
alter table public.security_events enable row level security;
-- No policies — service_role only, same reasoning as above.

-- Both tables grow forever otherwise; cheap opportunistic prune (called
-- from the logging helper, no cron needed at this scale).
create or replace function public.prune_old_security_logs()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.webhook_failures where created_at < now() - interval '90 days';
  delete from public.security_events where created_at < now() - interval '30 days';
$$;
