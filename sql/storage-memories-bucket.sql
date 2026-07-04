-- storage-memories-bucket.sql
-- Private Storage bucket for world memory photos: originals + client-made
-- webp thumbnails. Every object is scoped by its first path segment (world_id)
-- so only the members of that world can read/write it.
--
-- Path convention:
--   <world_id>/<uuid>.<ext>        original
--   <world_id>/<uuid>.thumb.webp   thumbnail (generated client-side)
--
-- Run in Supabase SQL Editor. Idempotent: safe to re-run.
-- NOTE (2026-07-04): the rooms→worlds migration could not rename the
-- storage.objects policies (needs table ownership the MCP role lacks) — the
-- policy BODIES already point at public.worlds (tracked by oid), only the
-- names still say "room". Re-running this script from the SQL editor drops
-- the old-named policies and recreates them with the new names.

-- 1) Bucket: private, 25 MB per file, image mime types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'memories',
    'memories',
    false,
    26214400, -- 25 MB
    array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS policies on storage.objects (RLS is already enabled by Supabase).
--    Shared predicate: the path's first folder is a world the caller belongs
--    to. (storage.foldername(name))[1] -> first path segment -> world_id.

drop policy if exists "memories: room can read" on storage.objects;
drop policy if exists "memories: world can read" on storage.objects;
create policy "memories: world can read"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'memories'
        and exists (
            select 1 from public.worlds w
            where w.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (w.owner_id, w.member_id)
        )
    );

drop policy if exists "memories: room can upload" on storage.objects;
drop policy if exists "memories: world can upload" on storage.objects;
create policy "memories: world can upload"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'memories'
        and exists (
            select 1 from public.worlds w
            where w.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (w.owner_id, w.member_id)
        )
    );

drop policy if exists "memories: room can update" on storage.objects;
drop policy if exists "memories: world can update" on storage.objects;
create policy "memories: world can update"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'memories'
        and exists (
            select 1 from public.worlds w
            where w.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (w.owner_id, w.member_id)
        )
    );

drop policy if exists "memories: room can delete" on storage.objects;
drop policy if exists "memories: world can delete" on storage.objects;
create policy "memories: world can delete"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'memories'
        and exists (
            select 1 from public.worlds w
            where w.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (w.owner_id, w.member_id)
        )
    );

-- 3) Verify
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'memories';
select polname from pg_policy where polrelid = 'storage.objects'::regclass and polname like 'memories:%';
