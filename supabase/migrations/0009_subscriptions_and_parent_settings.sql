-- Phase 2 (Parent Loop) — Stripe subscriptions + parent settings.
-- Both keyed by the parent's auth user_id (account-level, not per-child —
-- a Family plan covers all of that parent's children). Additive only.

create table if not exists public.subscriptions (
  user_id                 uuid        primary key references auth.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text        not null default 'free' check (plan in ('free', 'family')),
  status                  text,
  current_period_end      timestamptz,
  updated_at              timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No client insert/update policy — subscriptions are only ever written by
-- api/stripe-webhook.js via the service_role key, never directly by the
-- client (a compromised client must not be able to grant itself Family).

create table if not exists public.parent_settings (
  user_id                 uuid        primary key references auth.users(id) on delete cascade,
  daily_minutes_limit     integer,
  bedtime_lockout         jsonb       not null default '{}',
  weekend_streak_pause    boolean     not null default false,
  updated_at              timestamptz not null default now()
);

alter table public.parent_settings enable row level security;

drop policy if exists "Users manage own parent settings" on public.parent_settings;
create policy "Users manage own parent settings"
  on public.parent_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
