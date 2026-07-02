-- Phase 2 (Parent Loop) — Storage buckets for word audio (public) and
-- child drawings (private, parent-owned). Additive; storage.objects RLS
-- policies scope access without touching any other bucket's existing
-- policies (there were none — this project had zero buckets before this
-- migration, confirmed via `select * from storage.buckets` first).

insert into storage.buckets (id, name, public)
values ('word-audio', 'word-audio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('drawings', 'drawings', false)
on conflict (id) do nothing;

-- word-audio: public read (matches the public-read `words` table);
-- writes only via the service_role key (scripts/generate-word-audio.mjs),
-- which bypasses RLS entirely, so no insert/update policy is needed here.
drop policy if exists "word-audio public read" on storage.objects;
create policy "word-audio public read"
  on storage.objects for select
  using (bucket_id = 'word-audio');

-- drawings: objects are stored at `{parent_user_id}/{child_id}/{filename}`.
-- A parent can read/write/delete only under their own top-level folder.
drop policy if exists "drawings owner access" on storage.objects;
create policy "drawings owner access"
  on storage.objects for all
  using (bucket_id = 'drawings' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'drawings' and (storage.foldername(name))[1] = auth.uid()::text);
