-- Candy Galaxy v2, Phase 1 — Sparks economy (200MW_Product_Blueprint.md 2.3).
-- Sparks are earned only through learning actions, never purchasable —
-- this table has no path for a client to increase `balance`/`lifetime_earned`
-- beyond what the learning-event RPC below grants.

create table if not exists public.user_sparks (
  user_id         uuid        primary key references auth.users(id) on delete cascade,
  balance         integer     not null default 0,
  lifetime_earned integer     not null default 0,
  updated_at      timestamptz not null default now()
);

alter table public.user_sparks enable row level security;

drop policy if exists "Users can read own sparks" on public.user_sparks;
create policy "Users can read own sparks"
  on public.user_sparks for select
  using (auth.uid() = user_id);

-- No direct insert/update policy for the client — balance changes only
-- through the earn_sparks() RPC (security definer), so a compromised
-- client can't self-grant Sparks by writing straight to the table.
drop function if exists public.earn_sparks(integer);
create function public.earn_sparks(amount integer)
returns public.user_sparks
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.user_sparks;
begin
  if amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into public.user_sparks (user_id, balance, lifetime_earned, updated_at)
  values (auth.uid(), amount, amount, now())
  on conflict (user_id) do update set
    balance         = public.user_sparks.balance + excluded.balance,
    lifetime_earned = public.user_sparks.lifetime_earned + excluded.balance,
    updated_at      = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.earn_sparks(integer) to authenticated;
