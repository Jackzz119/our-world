-- Music library, phase 1 continued: what the upload flow and the player call.
-- Feature doc: ai/features/music/music.md (implementation notes: ai/features/music/impl.md).
--
-- 1. Large files on the Free plan: Supabase Free stores at most 50 MB per object, so a whole-album
--    image or a Hi-Res original is stored as numbered parts `<path>/000`, `<path>/001`, … next to
--    its logical path; part_size / part_count say how to put it back together. Bytes never change.
-- 2. Upload bookkeeping: music_existing_hashes (dedupe before uploading), music_finish_upload
--    (checks the stored bytes before a file counts as uploaded), music_ingest (one transaction
--    for track rows, artists, album, artwork, lyrics and the original rendition).
-- 3. Compact copies made on a device (no media server this phase): any member who can see a track
--    may store a lossy copy under r/<track>/ and record it with music_record_copy.
-- 4. Live library updates: row changes are broadcast (ids only, never titles) to the private
--    Realtime topic `music:<world_id>`, which only members of that world may join.
--
-- Idempotent like the first music migration; verified offline by scripts/check-music-db.sh
-- (supabase/tests/database/music_ingest.test.sql).

-- ---------------------------------------------------------------------------------------------
-- Parts
-- ---------------------------------------------------------------------------------------------

alter table public.music_files add column if not exists part_size bigint;
alter table public.music_files add column if not exists part_count integer;
alter table public.music_files drop constraint if exists music_files_parts_check;
alter table public.music_files add constraint music_files_parts_check check (
    (part_size is null and part_count is null)
    or (
        part_size > 0
        and part_count between 2 and 999
        and size_bytes > part_size * (part_count - 1)
        and size_bytes <= part_size * part_count
    )
);

alter table public.music_renditions add column if not exists part_size bigint;
alter table public.music_renditions add column if not exists part_count integer;
alter table public.music_renditions drop constraint if exists music_renditions_parts_check;
alter table public.music_renditions add constraint music_renditions_parts_check check (
    (part_size is null and part_count is null)
    or (
        part_size > 0
        and part_count between 2 and 999
        and size_bytes > part_size * (part_count - 1)
        and size_bytes <= part_size * part_count
    )
);

-- The stored objects behind a logical path: (number of objects, total bytes). One object for a
-- whole file, or exactly part_count numbered parts.
create or replace function public.music_stored_bytes(p_path text, p_part_count integer)
returns table (objects bigint, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
    select count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0)
    from storage.objects o
    where o.bucket_id = 'music'
      and (
          (p_part_count is null and o.name = p_path)
          or (
              p_part_count is not null
              and starts_with(o.name, p_path || '/')
              and right(o.name, 3) ~ '^[0-9]{3}$'
              and length(o.name) = length(p_path) + 4
              and right(o.name, 3)::integer < p_part_count
          )
      );
$$;

revoke all on function public.music_stored_bytes(text, integer) from public, anon, authenticated;
grant execute on function public.music_stored_bytes(text, integer) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Storage decisions, now part-aware, with copies writable by whoever can see the track
-- ---------------------------------------------------------------------------------------------

create or replace function public.music_storage_allows(p_name text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    parts text[] := string_to_array(p_name, '/');
    me uuid := (select auth.uid());
    world uuid;
    logical text := p_name;
    part integer;
    track uuid;
begin
    if me is null
       or coalesce(array_length(parts, 1), 0) < 3
       or parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return false;
    end if;
    world := parts[1]::uuid;
    if not exists (
        select 1 from public.worlds w
        where w.id = world and me in (w.owner_id, w.member_id)
    ) then
        return false;
    end if;
    -- `<logical path>/NNN` is part NNN of a file stored in parts
    if p_name ~ '/[0-9]{3}$' and parts[2] in ('orig', 'r') then
        logical := left(p_name, length(p_name) - 4);
        part := right(p_name, 3)::integer;
    end if;

    case parts[2]
        when 'tmp' then
            return array_length(parts, 1) >= 4
                and parts[3] = me::text
                and p_action in ('read', 'insert', 'delete');
        when 'art' then
            return p_action in ('read', 'insert');
        when 'orig' then
            if p_action = 'insert' then
                return exists (
                    select 1 from public.music_files f
                    where f.path = logical and f.world_id = world
                      and f.owner_id = me and f.status = 'uploading'
                      and (case when part is null then f.part_count is null else part < f.part_count end)
                );
            elsif p_action = 'read' then
                return exists (
                    select 1 from public.music_files f
                    where f.path = logical and f.world_id = world
                      and (case when part is null then f.part_count is null else part < f.part_count end)
                      and (
                          f.owner_id = me
                          or exists (
                              select 1 from public.music_tracks t
                              where t.source_file_id = f.id
                                and t.visibility = 'world'
                                and t.deleted_at is null
                          )
                      )
                );
            end if;
            return false;
        when 'r' then
            if parts[3] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               or coalesce(array_length(parts, 1), 0) < 4 then
                return false;
            end if;
            track := parts[3]::uuid;
            if p_action = 'insert' then
                -- a copy made on a device: whoever can see the track may add one
                return exists (
                    select 1 from public.music_tracks t
                    where t.id = track and t.world_id = world
                      and t.deleted_at is null
                      and (t.visibility = 'world' or t.owner_id = me)
                );
            elsif p_action = 'read' then
                return exists (
                    select 1
                    from public.music_renditions r
                    join public.music_tracks t on t.id = r.track_id
                    where r.path = logical and r.world_id = world and r.track_id = track
                      and (case when part is null then r.part_count is null else part < r.part_count end)
                      and t.deleted_at is null
                      and (t.visibility = 'world' or t.owner_id = me)
                );
            end if;
            return false;
        else
            return false;
    end case;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Upload bookkeeping
-- ---------------------------------------------------------------------------------------------

-- Marking a file uploaded now goes through music_finish_upload, which checks the stored bytes.
drop policy if exists "music_files: mark uploaded" on public.music_files;

-- Which of these hashes the world already holds. `readable` says whether the caller may use the
-- existing file; a file the partner keeps private is reported (the caller holds the same bytes
-- anyway) but without its id.
create or replace function public.music_existing_hashes(p_world uuid, p_hashes text[])
returns table (sha256 text, file_id uuid, status text, mine boolean, readable boolean)
language sql
stable
security definer
set search_path = ''
as $$
    select f.sha256,
           case when v.readable then f.id end,
           f.status,
           f.owner_id = (select auth.uid()),
           v.readable
    from public.music_files f
    cross join lateral (
        select (
            f.owner_id = (select auth.uid())
            or exists (
                select 1 from public.music_tracks t
                where t.source_file_id = f.id and t.visibility = 'world' and t.deleted_at is null
            )
        ) as readable
    ) v
    where public.is_world_member(p_world)
      and f.world_id = p_world
      and f.sha256 = any (p_hashes);
$$;

revoke all on function public.music_existing_hashes(uuid, text[]) from public, anon;
grant execute on function public.music_existing_hashes(uuid, text[]) to authenticated, service_role;

-- The caller's reserved upload is complete: every object is there and the sizes add up to the
-- size recorded at reservation. Returns the file's status afterwards.
create or replace function public.music_finish_upload(p_file uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    me uuid := (select auth.uid());
    f public.music_files;
    stored record;
begin
    select * into f from public.music_files where id = p_file;
    if not found or f.owner_id is distinct from me or not public.is_world_member(f.world_id) then
        raise exception 'music_finish_upload: no such upload' using errcode = '42501';
    end if;
    if f.status <> 'uploading' then
        return f.status;
    end if;
    select * into stored from public.music_stored_bytes(f.path, f.part_count);
    if stored.objects <> coalesce(f.part_count, 1) or stored.bytes <> f.size_bytes then
        raise exception 'music_finish_upload: stored % bytes in % objects, expected % bytes in %',
            stored.bytes, stored.objects, f.size_bytes, coalesce(f.part_count, 1)
            using errcode = 'P0001';
    end if;
    update public.music_files set status = 'uploaded' where id = f.id;
    return 'uploaded';
end;
$$;

revoke all on function public.music_finish_upload(uuid) from public, anon;
grant execute on function public.music_finish_upload(uuid) to authenticated, service_role;

-- One uploaded audio file becomes library rows in one transaction: one track, or one per CUE
-- slice. Runs as the caller, so the table policies decide. Calling it again for a file that
-- already has the caller's tracks returns those tracks instead of adding duplicates (a retry
-- after a lost response).
--
-- p: { world_id, file_id, visibility?, album?: {key, title, album_artist, release_date},
--      artwork?: {sha256, source, base_path, width, height, variants, palette},
--      rendition?: {bitrate},
--      tracks: [{ title, artists: [..], disc_no, track_no, start_sample, end_sample, duration_ms,
--                 isrc, gain, tags, tags_raw,
--                 lyrics: [{kind, lang, format, synced, word_synced, offset_ms, raw_text, source}] }] }
create or replace function public.music_ingest(p jsonb)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
    me uuid := (select auth.uid());
    v_world uuid := (p ->> 'world_id')::uuid;
    v_vis text := coalesce(p ->> 'visibility', 'world');
    f public.music_files;
    v_album uuid;
    v_artwork uuid;
    v_track uuid;
    v_artist uuid;
    v_ids uuid[] := '{}';
    t jsonb;
    l jsonb;
    a text;
    pos integer;
    kinds text[];
begin
    if me is null or v_world is null or not public.is_world_member(v_world) then
        raise exception 'music_ingest: not a member of this world' using errcode = '42501';
    end if;
    select * into f from public.music_files where id = (p ->> 'file_id')::uuid and world_id = v_world;
    if not found or f.owner_id <> me or f.role <> 'audio' or f.status not in ('uploaded', 'verified') then
        raise exception 'music_ingest: the file is not an uploaded audio file of yours' using errcode = 'P0001';
    end if;
    if jsonb_typeof(p -> 'tracks') is distinct from 'array' or jsonb_array_length(p -> 'tracks') = 0 then
        raise exception 'music_ingest: no tracks' using errcode = '22023';
    end if;

    select coalesce(array_agg(id order by start_sample nulls first, track_no nulls last, created_at), '{}')
    into v_ids
    from public.music_tracks
    where source_file_id = f.id and owner_id = me and deleted_at is null;
    if cardinality(v_ids) > 0 then
        return v_ids;
    end if;

    if jsonb_typeof(p -> 'artwork') = 'object' then
        insert into public.music_artworks (world_id, sha256, source, base_path, width, height, variants, palette)
        values (
            v_world,
            p -> 'artwork' ->> 'sha256',
            p -> 'artwork' ->> 'source',
            p -> 'artwork' ->> 'base_path',
            (p -> 'artwork' ->> 'width')::integer,
            (p -> 'artwork' ->> 'height')::integer,
            coalesce(p -> 'artwork' -> 'variants', '{}'),
            p -> 'artwork' -> 'palette'
        )
        on conflict (world_id, sha256) do nothing;
        select id into v_artwork
        from public.music_artworks
        where world_id = v_world and sha256 = p -> 'artwork' ->> 'sha256';
    end if;

    if nullif(btrim(p -> 'album' ->> 'title'), '') is not null then
        insert into public.music_albums (world_id, album_key, title, album_artist, release_date, artwork_id)
        values (
            v_world,
            coalesce(nullif(p -> 'album' ->> 'key', ''), lower(btrim(p -> 'album' ->> 'title'))),
            btrim(p -> 'album' ->> 'title'),
            coalesce(p -> 'album' ->> 'album_artist', ''),
            nullif(p -> 'album' ->> 'release_date', ''),
            v_artwork
        )
        on conflict (world_id, album_key) do nothing;
        -- an album the partner created for a track only they can see stays invisible here: no album
        select id into v_album
        from public.music_albums
        where world_id = v_world
          and album_key = coalesce(nullif(p -> 'album' ->> 'key', ''), lower(btrim(p -> 'album' ->> 'title')));
        if v_album is not null and v_artwork is not null then
            update public.music_albums set artwork_id = v_artwork where id = v_album and artwork_id is null;
        end if;
    end if;

    for t in select value from jsonb_array_elements(p -> 'tracks') loop
        insert into public.music_tracks (
            world_id, visibility, status, title, album_id, disc_no, track_no, source_file_id,
            start_sample, end_sample, duration_ms, isrc, gain, artwork_id, tags, tags_raw, search_text
        )
        values (
            v_world,
            v_vis,
            'ready',
            left(btrim(t ->> 'title'), 500),
            v_album,
            (t ->> 'disc_no')::smallint,
            (t ->> 'track_no')::smallint,
            f.id,
            (t ->> 'start_sample')::bigint,
            (t ->> 'end_sample')::bigint,
            (t ->> 'duration_ms')::integer,
            nullif(t ->> 'isrc', ''),
            t -> 'gain',
            v_artwork,
            coalesce(t -> 'tags', '{}'),
            coalesce(t -> 'tags_raw', '{}'),
            lower(concat_ws(' ', t ->> 'title', (select string_agg(x, ' ') from jsonb_array_elements_text(coalesce(t -> 'artists', '[]')) x), p -> 'album' ->> 'title'))
        )
        returning id into v_track;

        pos := 0;
        for a in select btrim(value) from jsonb_array_elements_text(coalesce(t -> 'artists', '[]')) loop
            continue when a = '';
            insert into public.music_artists (world_id, name) values (v_world, left(a, 300))
            on conflict (world_id, name) do nothing;
            select id into v_artist from public.music_artists where world_id = v_world and name = left(a, 300);
            if v_artist is not null then
                insert into public.music_track_artists (track_id, artist_id, world_id, role, position)
                values (v_track, v_artist, v_world, 'main', pos)
                on conflict do nothing;
                pos := pos + 1;
            end if;
        end loop;

        kinds := '{}';
        for l in select value from jsonb_array_elements(coalesce(t -> 'lyrics', '[]')) loop
            insert into public.music_lyrics (
                world_id, track_id, kind, lang, format, synced, word_synced, offset_ms, raw_text, source, is_preferred
            )
            values (
                v_world,
                v_track,
                coalesce(l ->> 'kind', 'main'),
                nullif(l ->> 'lang', ''),
                l ->> 'format',
                coalesce((l ->> 'synced')::boolean, false),
                coalesce((l ->> 'word_synced')::boolean, false),
                coalesce((l ->> 'offset_ms')::integer, 0),
                l ->> 'raw_text',
                l ->> 'source',
                not (coalesce(l ->> 'kind', 'main') = any (kinds))
            );
            kinds := kinds || coalesce(l ->> 'kind', 'main');
        end loop;

        insert into public.music_renditions (
            world_id, track_id, kind, path, container, codec, lossless, sample_rate, bit_depth, channels,
            bitrate, size_bytes, sha256, audio_md5, part_size, part_count
        )
        values (
            v_world, v_track, 'original', f.path, coalesce(f.container, 'unknown'), coalesce(f.codec, 'unknown'),
            coalesce(f.lossless, false), f.sample_rate, f.bit_depth, f.channels,
            (p -> 'rendition' ->> 'bitrate')::integer, f.size_bytes, f.sha256, f.audio_md5, f.part_size, f.part_count
        );

        v_ids := v_ids || v_track;
    end loop;
    return v_ids;
end;
$$;

revoke all on function public.music_ingest(jsonb) from public, anon;
grant execute on function public.music_ingest(jsonb) to authenticated, service_role;

-- A compact copy made on a device and already stored under <world>/r/<track>/ is recorded as the
-- track's lossy rendition. Anyone who can see the track may add the first copy; later copies are
-- ignored (the earlier one is returned).
--
-- p: { path, container, codec, sample_rate, channels, bitrate, size_bytes, sha256, part_size,
--      part_count, params }
create or replace function public.music_record_copy(p_track uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    me uuid := (select auth.uid());
    t public.music_tracks;
    v_path text := p ->> 'path';
    v_parts integer := (p ->> 'part_count')::integer;
    v_size bigint := (p ->> 'size_bytes')::bigint;
    v_id uuid;
    stored record;
begin
    select * into t from public.music_tracks where id = p_track;
    if not found or me is null or not public.is_world_member(t.world_id) or t.deleted_at is not null
       or (t.visibility <> 'world' and t.owner_id <> me) then
        raise exception 'music_record_copy: no such track' using errcode = '42501';
    end if;
    if v_path is null or not starts_with(v_path, t.world_id::text || '/r/' || t.id::text || '/') then
        raise exception 'music_record_copy: copies live under r/<track>/' using errcode = '22023';
    end if;
    select * into stored from public.music_stored_bytes(v_path, v_parts);
    if stored.objects <> coalesce(v_parts, 1) or stored.bytes <> v_size then
        raise exception 'music_record_copy: stored % bytes in % objects, expected % bytes in %',
            stored.bytes, stored.objects, v_size, coalesce(v_parts, 1)
            using errcode = 'P0001';
    end if;
    insert into public.music_renditions (
        world_id, track_id, kind, path, container, codec, lossless, sample_rate, channels, bitrate,
        size_bytes, sha256, params, part_size, part_count
    )
    values (
        t.world_id, t.id, 'lossy', v_path, p ->> 'container', p ->> 'codec', false,
        (p ->> 'sample_rate')::integer, (p ->> 'channels')::smallint, (p ->> 'bitrate')::integer,
        v_size, nullif(p ->> 'sha256', ''), coalesce(p -> 'params', '{}') || jsonb_build_object('made_by', me),
        (p ->> 'part_size')::bigint, v_parts
    )
    on conflict (track_id, kind) do nothing
    returning id into v_id;
    if v_id is null then
        select id into v_id from public.music_renditions where track_id = t.id and kind = 'lossy';
    end if;
    return v_id;
end;
$$;

revoke all on function public.music_record_copy(uuid, jsonb) from public, anon;
grant execute on function public.music_record_copy(uuid, jsonb) to authenticated, service_role;

-- Bytes stored per bucket in this project (the Free plan's 1 GB covers all buckets together), for
-- the library's storage meter. Members of any world may read the totals; nothing else is exposed.
create or replace function public.music_storage_usage()
returns table (bucket text, objects bigint, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
    select o.bucket_id, count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0)
    from storage.objects o
    where exists (
        select 1 from public.worlds w where (select auth.uid()) in (w.owner_id, w.member_id)
    )
    group by o.bucket_id
    order by o.bucket_id;
$$;

revoke all on function public.music_storage_usage() from public, anon;
grant execute on function public.music_storage_usage() to authenticated, service_role;

-- The world's shared playlist ('ours'), created on first use.
create or replace function public.music_ours_playlist(p_world uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_id uuid;
begin
    select id into v_id from public.music_playlists where world_id = p_world and kind = 'ours';
    if v_id is null then
        insert into public.music_playlists (world_id, kind, title)
        values (p_world, 'ours', '我们的歌单')
        on conflict do nothing;
        select id into v_id from public.music_playlists where world_id = p_world and kind = 'ours';
    end if;
    return v_id;
end;
$$;

revoke all on function public.music_ours_playlist(uuid) from public, anon;
grant execute on function public.music_ours_playlist(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Live updates: Broadcast from Database to the private topic music:<world_id>
-- ---------------------------------------------------------------------------------------------

-- Sends which row changed (ids only, never titles or text, so a private track never leaks through
-- the topic); clients refetch through the table policies.
create or replace function public.music_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    rec jsonb := to_jsonb(coalesce(new, old));
begin
    perform realtime.send(
        jsonb_build_object(
            'table', tg_table_name,
            'op', tg_op,
            'id', rec ->> 'id',
            'track_id', coalesce(rec ->> 'track_id', case when tg_table_name = 'music_tracks' then rec ->> 'id' end)
        ),
        'change',
        'music:' || (rec ->> 'world_id'),
        true
    );
    return null;
end;
$$;

revoke all on function public.music_broadcast() from public, anon, authenticated;

do $$
declare
    t text;
begin
    foreach t in array array[
        'music_tracks', 'music_track_artists', 'music_renditions', 'music_lyrics', 'music_albums',
        'music_likes', 'music_playlists', 'music_playlist_items', 'music_reactions'
    ] loop
        execute format('drop trigger if exists music_broadcast on public.%I', t);
        execute format(
            'create trigger music_broadcast after insert or update or delete on public.%I '
            'for each row execute function public.music_broadcast()',
            t
        );
    end loop;
end;
$$;

-- Joining music:<world_id> is for that world's members only.
drop policy if exists "music: members receive library changes" on realtime.messages;
create policy "music: members receive library changes" on realtime.messages for select to authenticated
    using (
        realtime.messages.extension = 'broadcast'
        and case
            when (select realtime.topic()) ~* '^music:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then public.is_world_member(substr((select realtime.topic()), 7)::uuid)
            else false
        end
    );

comment on function public.music_ingest(jsonb) is 'Upload flow: turn one uploaded audio file into library rows. ai/features/music/impl.md';
comment on function public.music_finish_upload(uuid) is 'Upload flow: check the stored bytes, then mark the reserved file uploaded. ai/features/music/impl.md';
