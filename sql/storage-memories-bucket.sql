-- storage-memories-bucket.sql
-- Private Storage bucket for room memory photos: originals + client-made
-- webp thumbnails. Every object is scoped by its first path segment (room_id)
-- so only the members of that room can read/write it.
--
-- Path convention:
--   <room_id>/<uuid>.<ext>        original
--   <room_id>/<uuid>.thumb.webp   thumbnail (generated client-side)
--
-- Run in Supabase SQL Editor (or via MCP execute_sql once authenticated).
-- Idempotent: safe to re-run.

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
--    Shared predicate: the path's first folder is a room the caller belongs to.
--    (storage.foldername(name))[1] -> first path segment -> room_id (uuid).

drop policy if exists "memories: room can read" on storage.objects;
create policy "memories: room can read"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'memories'
        and exists (
            select 1 from public.rooms r
            where r.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (r.owner_id, r.member_id)
        )
    );

drop policy if exists "memories: room can upload" on storage.objects;
create policy "memories: room can upload"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'memories'
        and exists (
            select 1 from public.rooms r
            where r.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (r.owner_id, r.member_id)
        )
    );

drop policy if exists "memories: room can update" on storage.objects;
create policy "memories: room can update"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'memories'
        and exists (
            select 1 from public.rooms r
            where r.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (r.owner_id, r.member_id)
        )
    );

drop policy if exists "memories: room can delete" on storage.objects;
create policy "memories: room can delete"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'memories'
        and exists (
            select 1 from public.rooms r
            where r.id = ((storage.foldername(name))[1])::uuid
              and auth.uid() in (r.owner_id, r.member_id)
        )
    );

-- 3) Verify
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'memories';
select polname from pg_policy where polrelid = 'storage.objects'::regclass and polname like 'memories:%';