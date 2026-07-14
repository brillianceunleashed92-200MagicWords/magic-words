-- FIX_EVENTS_PURGE_R1 — make account deletion actually purge
-- product_events, at the database level.
--
-- product_events (migration 0032) has always had plain user_id/child_id
-- uuid columns with NO foreign key of any kind -- confirmed live
-- (docs/EVENTS_PURGE_REPORT.md Phase 1): 737 of 768 rows (96%) belong to
-- already-deleted accounts. This is NOT simply a missing app-level purge:
-- api/delete-account.js (the real, JWT-authenticated deletion endpoint)
-- already deletes product_events explicitly before removing the auth
-- user, and that code works correctly under normal and even
-- adversarially-fast timing in most cases. Two failure modes still leak
-- past it, both closed by this migration and neither closeable in
-- application code alone: (a) a genuine, live-reproduced fire-and-forget
-- write race, where an event insert still in flight at delete-time lands
-- afterward, orphaned; (b) every test/admin-script account deletion this
-- whole codebase's history has ever used (scripts/admin-user.mjs,
-- idor-proof.mjs, every self-provisioning Playwright spec) calls the
-- Supabase Admin API directly, bypassing api/delete-account.js's purge
-- code entirely -- the same gap a real support engineer using the
-- Supabase dashboard, or any future script, would also hit. A database-
-- level ON DELETE CASCADE closes both: it fires atomically with the row
-- deletion itself, regardless of which code path (or none) triggered it.

-- Purge existing orphans first -- required before the FK constraints
-- below can be added (a FK addition fails if any existing row would
-- violate it). Orphan definition matches the Phase 1 census exactly: a
-- non-null user_id/child_id pointing at a since-deleted owner. Rows with
-- NULL in both owner columns (none currently exist, but permitted by the
-- non-negotiables) are untouched by construction -- NULL never matches
-- "not in (select ...)" as true, so those rows are never deleted here,
-- and NULL never violates a foreign key either.
delete from public.product_events
where (user_id is not null and user_id not in (select id from auth.users))
   or (child_id is not null and child_id not in (select id from public.child_profiles));

-- Same idempotent add-constraint style as migration 0018.
alter table public.product_events drop constraint if exists product_events_user_id_fkey;
alter table public.product_events
  add constraint product_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.product_events drop constraint if exists product_events_child_id_fkey;
alter table public.product_events
  add constraint product_events_child_id_fkey
  foreign key (child_id) references public.child_profiles(id) on delete cascade;
