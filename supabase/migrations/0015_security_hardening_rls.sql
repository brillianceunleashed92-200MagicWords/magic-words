-- Security hardening Phase 2 — RLS audit and fixes.
--
-- Audited every public-schema table's actual RLS state and policies live
-- (pg_class.relrowsecurity + pg_policies via the Management API), not
-- assumed from migration files — several tables' committed migrations
-- were apparently never fully applied, matching the exact pattern the
-- unmerged fix/rls-user-stats-policies branch already found for
-- user_stats/user_streaks/learning_events (that fix is confirmed already
-- live — verified via pg_policies, not reapplied here).
--
-- ============================================================
-- CRITICAL: word_progress has RLS DISABLED entirely.
-- ============================================================
-- Any authenticated user (just a valid anon-key + JWT, the same
-- credentials every signed-in client already has) can SELECT, INSERT,
-- UPDATE, or DELETE every row in this table for every child on the
-- platform — read or tamper with any child's word-mastery data by
-- guessing/enumerating child_id or user_id. word_progress has both
-- user_id and child_id columns (same shape as user_stats/user_streaks/
-- learning_events), so the fix is the same direct-ownership pattern.
alter table public.word_progress enable row level security;

create policy "Users manage own word progress"
  on public.word_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- HIGH: learning_plans and profiles have RLS disabled and are exposed
-- via PostgREST regardless of whether any current app code queries
-- them — grepped, zero references in src/ or api/, but Supabase's REST
-- layer exposes every public-schema table by default whether or not
-- the JS client ever calls it. "Unused by the app" is not "unreachable."
-- ============================================================

-- learning_plans has child_id but no direct user_id — same JOIN-through-
-- child_profiles pattern already used correctly by magic_moments/stories.
alter table public.learning_plans enable row level security;

create policy "Parents manage their children's learning plans"
  on public.learning_plans for all
  using (exists (select 1 from public.child_profiles cp where cp.id = learning_plans.child_id and cp.parent_id = auth.uid()))
  with check (exists (select 1 from public.child_profiles cp where cp.id = learning_plans.child_id and cp.parent_id = auth.uid()));

-- profiles has no owner column at all (id, name, avatar, streak,
-- last_active — no user_id/parent_id/child_id). Zero code references
-- anywhere in the app; looks like orphaned schema from before
-- child_profiles existed. There's no way to write a correct ownership
-- policy without an owner column, so this enables RLS with no policies
-- at all — the safe default (deny-all for every role except service_role/
-- table owner) rather than leaving it world-readable/writable. Flagged in
-- docs/SECURITY_CHECKLIST_FOR_SAL.md as a candidate to drop entirely if
-- confirmed unused.
alter table public.profiles enable row level security;

-- ============================================================
-- MEDIUM: class_members, parent_child_links, teacher_classes have RLS
-- enabled but zero policies defined — currently deny-all for every
-- authenticated user (safe, but broken: the classroom/teacher feature,
-- while only reachable today via the legacy unreachable App.jsx tree —
-- confirmed via grep, only src/App.jsx references these tables — would
-- fail every operation if that tree were ever re-linked). Fixed for
-- completeness and defense-in-depth, not urgency.
-- ============================================================

create policy "Parents manage own child links"
  on public.parent_child_links for all
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

create policy "Teachers manage own classes"
  on public.teacher_classes for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- class_members has no direct owner column (class_id, student_id,
-- joined_at) — two legitimate owners: the teacher of that class, and the
-- parent of that student (student_id references child_profiles.id, this
-- app has no separate child-login concept). A parent may only insert a
-- membership for their OWN child (never enroll someone else's child);
-- either the teacher or the enrolled child's parent may view/manage it.
create policy "Teachers and parents manage class membership"
  on public.class_members for all
  using (
    exists (select 1 from public.teacher_classes tc where tc.id = class_members.class_id and tc.teacher_id = auth.uid())
    or exists (select 1 from public.child_profiles cp where cp.id = class_members.student_id and cp.parent_id = auth.uid())
  )
  with check (
    exists (select 1 from public.teacher_classes tc where tc.id = class_members.class_id and tc.teacher_id = auth.uid())
    or exists (select 1 from public.child_profiles cp where cp.id = class_members.student_id and cp.parent_id = auth.uid())
  );

-- ============================================================
-- LOW: achievements has RLS enabled but its one policy is structurally
-- broken — `auth.uid() = child_id` can never be true (child_id
-- references child_profiles.id, a child never has its own Supabase Auth
-- session in this app's model; only parents authenticate). Currently
-- deny-all in practice, which is safe but means the achievements feature
-- (zero code references found, likely unused/legacy) would silently fail
-- for every real caller. Replaced with the correct JOIN-through-
-- child_profiles pattern.
-- ============================================================
drop policy if exists "users own achievements" on public.achievements;

create policy "Parents manage their children's achievements"
  on public.achievements for all
  using (exists (select 1 from public.child_profiles cp where cp.id = achievements.child_id and cp.parent_id = auth.uid()))
  with check (exists (select 1 from public.child_profiles cp where cp.id = achievements.child_id and cp.parent_id = auth.uid()));

-- ============================================================
-- Hardening earn_sparks(): ownership check was already correct (verified
-- child_id belongs to auth.uid() before crediting — a compromised client
-- can't grant Sparks to a child it doesn't own), but `amount` had no
-- upper bound beyond "must be positive." A client can call this RPC
-- directly via supabase-js with any amount, bypassing whatever the game
-- UI normally computes — e.g. earn_sparks(999999999, my_own_child_id)
-- succeeds today. Capped at 500/call: generously above the real earning
-- formula's ceiling (documented elsewhere as roughly half of a capped
-- session XP total, well under 200 for even a perfect multi-question
-- session) without hand-tuning this migration to today's exact game
-- economy.
-- ============================================================
create or replace function public.earn_sparks(amount integer, p_child_id uuid)
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
  if amount > 500 then
    raise exception 'amount exceeds the maximum allowed per call';
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
