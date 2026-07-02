-- Phase 2 (Parent Loop) — earn_sparks() must target a specific child now
-- that user_sparks is keyed by child_id (migration 0011), not user_id.
-- The old single-argument version upserted on user_id, which is no
-- longer unique — it would have thrown on any second child. Replaced
-- (not just altered) since the signature changes; ownership is verified
-- server-side (the child must belong to auth.uid()) before crediting, so
-- a compromised client can't grant Sparks to a child it doesn't own.

drop function if exists public.earn_sparks(integer);

create function public.earn_sparks(amount integer, p_child_id uuid)
returns public.user_sparks
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.user_sparks;
  owner_id uuid;
begin
  if amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select parent_id into owner_id from public.child_profiles where id = p_child_id;
  if owner_id is null or owner_id <> auth.uid() then
    raise exception 'child % does not belong to the caller', p_child_id;
  end if;

  insert into public.user_sparks (user_id, child_id, balance, lifetime_earned, updated_at)
  values (auth.uid(), p_child_id, amount, amount, now())
  on conflict (child_id) do update set
    balance         = public.user_sparks.balance + excluded.balance,
    lifetime_earned = public.user_sparks.lifetime_earned + excluded.balance,
    updated_at      = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.earn_sparks(integer, uuid) to authenticated;
