-- Fix discovered while cleaning up a manual test account: child_profiles'
-- parent_id FK (inherited from the earlier abandoned prototype this table
-- came from) has no ON DELETE CASCADE. Deleting a parent's auth.users row
-- threw a foreign-key violation (23503) instead of cascading — meaning
-- any real parent trying to delete their account today would hit a 500,
-- not the intended cascade cleanup. Found by actually deleting a test
-- account via the admin API, not by inspection alone.

alter table public.child_profiles drop constraint if exists child_profiles_parent_id_fkey;
alter table public.child_profiles
  add constraint child_profiles_parent_id_fkey
  foreign key (parent_id) references auth.users(id) on delete cascade;
