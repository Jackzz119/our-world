-- Music library, phase 1 (local uploads): bucket, tables, row-level security.
-- Feature doc: ai/features/music/music.md (D5 = L3: the uploader owns a track, it is visible to the
-- partner by default, and can be set private; lyrics, artwork and album details are editable by both).
--
-- Three layers: music_files (what was uploaded, stored once per world by content hash, bytes never
-- change) → music_tracks (a row in the library; CUE virtual tracks point at a slice of one file)
-- → music_renditions (what the player streams: the original, or a lossless/lossy derivative).
--
-- Idempotent: safe to re-run from the SQL editor or via `supabase db push`. Needs Postgres 15+
-- (ON DELETE SET NULL with a column list). Verified offline by scripts/check-music-db.sh, which
-- runs supabase/tests/database/music_rls.test.sql.

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- True when the caller owns or has joined the world. SECURITY DEFINER so it does not depend on the
-- worlds table's own policies; search_path pinned (advisor: function_search_path_mutable).
create or replace function public.is_world_member(p_world uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.worlds w
        where w.id = p_world
          and (select auth.uid()) in (w.owner_id, w.member_id)
    );
$$;

revoke all on function public.is_world_member(uuid) from public, anon;
grant execute on function public.is_world_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

-- Every uploaded file (audio, cue sheet, lyrics, image), stored once per world by SHA-256.
-- The path is reserved before the upload starts (status 'uploading'); storage only accepts an
-- upload into orig/ when such a row exists for the caller.
create table if not exists public.music_files (
    id               uuid primary key default gen_random_uuid(),
    world_id         uuid not null references public.worlds(id) on delete cascade,
    owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
    sha256           text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    role             text not null check (role in ('audio', 'cue', 'lyrics', 'image')),
    path             text not null unique,
    original_name    text not null default '',
    relative_path    text not null default '',
    size_bytes       bigint not null check (size_bytes >= 0),
    container        text,
    codec            text,
    lossless         boolean,
    sample_rate      integer check (sample_rate > 0),
    bit_depth        smallint check (bit_depth > 0),
    channels         smallint check (channels > 0),
    duration_samples bigint check (duration_samples >= 0),
    audio_md5        text check (audio_md5 ~ '^[0-9a-f]{32}$'),
    text_encoding    text,
    status           text not null default 'uploading'
                     check (status in ('uploading', 'uploaded', 'verified', 'corrupt', 'trashed')),
    created_at       timestamptz not null default now(),
    trashed_at       timestamptz,
    unique (world_id, sha256),
    unique (id, world_id),
    check (starts_with(path, world_id::text || '/orig/' || sha256))
);

-- Cover art and posters; variants are the three display sizes under base_path.
create table if not exists public.music_artworks (
    id         uuid primary key default gen_random_uuid(),
    world_id   uuid not null references public.worlds(id) on delete cascade,
    owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
    sha256     text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    source     text not null check (source in ('embedded', 'folder', 'upload', 'matched', 'generated')),
    base_path  text not null,
    width      integer check (width > 0),
    height     integer check (height > 0),
    variants   jsonb not null default '{}',
    palette    jsonb,
    thumbhash  text,
    created_at timestamptz not null default now(),
    unique (world_id, sha256),
    unique (id, world_id),
    check (starts_with(base_path, world_id::text || '/art/'))
);

-- Albums are grouped by album_key (MusicBrainz release id, or album artist + title + date).
create table if not exists public.music_albums (
    id           uuid primary key default gen_random_uuid(),
    world_id     uuid not null references public.worlds(id) on delete cascade,
    album_key    text not null,
    title        text not null check (length(title) between 1 and 500),
    album_artist text not null default '',
    release_date text,
    mbid_release uuid,
    artwork_id   uuid,
    gain         jsonb,
    created_by   uuid default auth.uid() references auth.users(id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    unique (world_id, album_key),
    unique (id, world_id),
    foreign key (artwork_id, world_id) references public.music_artworks(id, world_id) on delete set null (artwork_id)
);

create table if not exists public.music_artists (
    id         uuid primary key default gen_random_uuid(),
    world_id   uuid not null references public.worlds(id) on delete cascade,
    name       text not null check (length(name) between 1 and 300),
    sort_name  text not null default '',
    mbid       uuid,
    created_by uuid default auth.uid() references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (world_id, name),
    unique (id, world_id)
);

-- A row in the library. start_sample / end_sample slice a whole-album image (CUE virtual track);
-- both null means the whole file. locked_fields lists what the user edited by hand, so automatic
-- matching never overwrites it.
create table if not exists public.music_tracks (
    id             uuid primary key default gen_random_uuid(),
    world_id       uuid not null references public.worlds(id) on delete cascade,
    owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
    visibility     text not null default 'world' check (visibility in ('world', 'private')),
    status         text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
    title          text not null check (length(title) between 1 and 500),
    album_id       uuid,
    disc_no        smallint check (disc_no > 0),
    track_no       smallint check (track_no > 0),
    source_file_id uuid not null,
    start_sample   bigint check (start_sample >= 0),
    end_sample     bigint,
    duration_ms    integer not null check (duration_ms >= 0),
    isrc           text,
    mbid_recording uuid,
    gain           jsonb,
    artwork_id     uuid,
    tags           jsonb not null default '{}',
    tags_raw       jsonb not null default '{}',
    locked_fields  text[] not null default '{}',
    search_text    text not null default '',
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    deleted_at     timestamptz,
    unique (id, world_id),
    check (end_sample is null or (start_sample is not null and end_sample > start_sample)),
    foreign key (source_file_id, world_id) references public.music_files(id, world_id) on delete restrict,
    foreign key (album_id, world_id) references public.music_albums(id, world_id) on delete set null (album_id),
    foreign key (artwork_id, world_id) references public.music_artworks(id, world_id) on delete set null (artwork_id)
);

create table if not exists public.music_track_artists (
    track_id  uuid not null,
    artist_id uuid not null,
    world_id  uuid not null,
    role      text not null default 'main' check (role in ('main', 'feat', 'composer', 'lyricist', 'arranger')),
    position  smallint not null default 0,
    primary key (track_id, artist_id, role),
    foreign key (track_id, world_id) references public.music_tracks(id, world_id) on delete cascade,
    foreign key (artist_id, world_id) references public.music_artists(id, world_id) on delete cascade
);

-- What the player streams. Clients only record the 'original' rendition at ingest; lossless and
-- lossy derivatives are written by the media worker (service role).
create table if not exists public.music_renditions (
    id              uuid primary key default gen_random_uuid(),
    world_id        uuid not null,
    track_id        uuid not null,
    kind            text not null check (kind in ('original', 'lossless', 'lossy')),
    path            text not null,
    storage_backend text not null default 'supabase' check (storage_backend in ('supabase', 'r2')),
    container       text not null,
    codec           text not null,
    lossless        boolean not null,
    sample_rate     integer check (sample_rate > 0),
    bit_depth       smallint check (bit_depth > 0),
    channels        smallint check (channels > 0),
    bitrate         integer check (bitrate > 0),
    size_bytes      bigint not null check (size_bytes >= 0),
    sha256          text check (sha256 ~ '^[0-9a-f]{64}$'),
    audio_md5       text check (audio_md5 ~ '^[0-9a-f]{32}$'),
    params          jsonb not null default '{}',
    created_at      timestamptz not null default now(),
    unique (track_id, kind),
    check (
        (kind = 'original' and starts_with(path, world_id::text || '/orig/'))
        or (kind <> 'original' and starts_with(path, world_id::text || '/r/' || track_id::text || '/'))
    ),
    foreign key (track_id, world_id) references public.music_tracks(id, world_id) on delete cascade
);

-- Lyrics keep the original text as uploaded; doc holds the parsed structure (OpenSubsonic
-- songLyrics v2 shape: lines, word cues, agents). One preferred version per track and kind.
create table if not exists public.music_lyrics (
    id           uuid primary key default gen_random_uuid(),
    world_id     uuid not null,
    track_id     uuid not null,
    kind         text not null default 'main' check (kind in ('main', 'translation', 'pronunciation')),
    lang         text,
    format       text not null check (format in ('plain', 'lrc', 'lrc_word', 'ttml', 'yrc', 'qrc', 'krc')),
    synced       boolean not null default false,
    word_synced  boolean not null default false,
    offset_ms    integer not null default 0,
    raw_text     text not null check (length(raw_text) <= 200000),
    doc          jsonb,
    source       text not null check (source in ('embedded', 'sidecar', 'manual', 'lrclib')),
    is_preferred boolean not null default true,
    updated_by   uuid default auth.uid() references auth.users(id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    foreign key (track_id, world_id) references public.music_tracks(id, world_id) on delete cascade
);

-- 'ours' is the shared playlist (one per world); 'personal' playlists belong to one person.
create table if not exists public.music_playlists (
    id         uuid primary key default gen_random_uuid(),
    world_id   uuid not null references public.worlds(id) on delete cascade,
    owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
    kind       text not null default 'personal' check (kind in ('ours', 'personal')),
    title      text not null check (length(title) between 1 and 200),
    note       text check (length(note) <= 2000),
    artwork_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, world_id),
    foreign key (artwork_id, world_id) references public.music_artworks(id, world_id) on delete set null (artwork_id)
);

-- position is a fractional index (reordering rewrites one row); note is the "a song for you" note.
create table if not exists public.music_playlist_items (
    id          uuid primary key default gen_random_uuid(),
    world_id    uuid not null,
    playlist_id uuid not null,
    track_id    uuid not null,
    position    text not null,
    added_by    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    note        text check (length(note) <= 200),
    added_at    timestamptz not null default now(),
    unique (playlist_id, track_id),
    unique (id, world_id),
    foreign key (playlist_id, world_id) references public.music_playlists(id, world_id) on delete cascade,
    foreign key (track_id, world_id) references public.music_tracks(id, world_id) on delete cascade
);

-- One reaction per person per playlist item (a heart or one emoji).
create table if not exists public.music_reactions (
    item_id    uuid not null,
    world_id   uuid not null,
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    emoji      text not null check (length(emoji) between 1 and 16),
    created_at timestamptz not null default now(),
    primary key (item_id, user_id),
    foreign key (item_id, world_id) references public.music_playlist_items(id, world_id) on delete cascade
);

create table if not exists public.music_likes (
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    track_id   uuid not null,
    world_id   uuid not null,
    created_at timestamptz not null default now(),
    primary key (user_id, track_id),
    foreign key (track_id, world_id) references public.music_tracks(id, world_id) on delete cascade
);

-- One row per listen of 30 s or more; private to the listener.
create table if not exists public.music_plays (
    id         bigint generated always as identity primary key,
    world_id   uuid not null,
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    track_id   uuid not null,
    started_at timestamptz not null default now(),
    ms_played  integer not null check (ms_played >= 0),
    context    text check (length(context) <= 200),
    foreign key (track_id, world_id) references public.music_tracks(id, world_id) on delete cascade
);

-- Exactly one shared playlist per world.
create unique index if not exists music_playlists_one_ours on public.music_playlists (world_id) where kind = 'ours';
create unique index if not exists music_lyrics_preferred on public.music_lyrics (track_id, kind) where is_preferred;

-- Foreign-key and listing indexes (advisor: unindexed_foreign_keys).
create index if not exists music_files_owner_idx on public.music_files (owner_id);
create index if not exists music_artworks_owner_idx on public.music_artworks (owner_id);
create index if not exists music_albums_artwork_idx on public.music_albums (artwork_id);
create index if not exists music_albums_created_by_idx on public.music_albums (created_by);
create index if not exists music_artists_created_by_idx on public.music_artists (created_by);
create index if not exists music_tracks_world_recent_idx on public.music_tracks (world_id, created_at desc) where deleted_at is null;
create index if not exists music_tracks_owner_idx on public.music_tracks (owner_id);
create index if not exists music_tracks_album_idx on public.music_tracks (album_id);
create index if not exists music_tracks_file_idx on public.music_tracks (source_file_id);
create index if not exists music_tracks_artwork_idx on public.music_tracks (artwork_id);
create index if not exists music_track_artists_artist_idx on public.music_track_artists (artist_id);
create index if not exists music_renditions_path_idx on public.music_renditions (path);
create index if not exists music_lyrics_track_idx on public.music_lyrics (track_id);
create index if not exists music_lyrics_updated_by_idx on public.music_lyrics (updated_by);
create index if not exists music_playlists_world_idx on public.music_playlists (world_id);
create index if not exists music_playlists_owner_idx on public.music_playlists (owner_id);
create index if not exists music_playlists_artwork_idx on public.music_playlists (artwork_id);
create index if not exists music_playlist_items_order_idx on public.music_playlist_items (playlist_id, position);
create index if not exists music_playlist_items_track_idx on public.music_playlist_items (track_id);
create index if not exists music_playlist_items_added_by_idx on public.music_playlist_items (added_by);
create index if not exists music_reactions_user_idx on public.music_reactions (user_id);
create index if not exists music_likes_track_idx on public.music_likes (track_id);
create index if not exists music_plays_user_recent_idx on public.music_plays (user_id, started_at desc);
create index if not exists music_plays_track_idx on public.music_plays (track_id);

-- ---------------------------------------------------------------------------------------------
-- Guards: which columns a client may change. The service role (auth.uid() is null) is exempt.
-- ---------------------------------------------------------------------------------------------

-- A client may only mark its own reserved file as uploaded; everything else is set by the worker.
create or replace function public.music_files_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if (select auth.uid()) is null then
        return new;
    end if;
    if old.status = 'uploading' and new.status = 'uploaded'
       and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
        return new;
    end if;
    raise exception 'music_files: only uploading -> uploaded may change from the app' using errcode = '42501';
end;
$$;

-- Identity and slicing never change; visibility, status, loudness and deletion are the uploader's.
create or replace function public.music_tracks_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    me uuid := (select auth.uid());
begin
    if me is null then
        new.updated_at := now();
        return new;
    end if;
    if new.world_id is distinct from old.world_id
       or new.owner_id is distinct from old.owner_id
       or new.source_file_id is distinct from old.source_file_id
       or new.start_sample is distinct from old.start_sample
       or new.end_sample is distinct from old.end_sample
       or new.duration_ms is distinct from old.duration_ms
       or new.created_at is distinct from old.created_at then
        raise exception 'music_tracks: identity fields cannot change' using errcode = '42501';
    end if;
    if me <> old.owner_id
       and (new.visibility is distinct from old.visibility
            or new.status is distinct from old.status
            or new.gain is distinct from old.gain
            or new.deleted_at is distinct from old.deleted_at) then
        raise exception 'music_tracks: only the uploader can change visibility, status, gain or delete'
            using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
end;
$$;

-- A playlist keeps its world, owner and kind for life.
create or replace function public.music_playlists_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if (select auth.uid()) is not null
       and (new.world_id is distinct from old.world_id
            or new.owner_id is distinct from old.owner_id
            or new.kind is distinct from old.kind) then
        raise exception 'music_playlists: world, owner and kind cannot change' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
end;
$$;

-- Lyrics record who touched them last.
create or replace function public.music_lyrics_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    if (select auth.uid()) is not null then
        new.updated_by := (select auth.uid());
    end if;
    return new;
end;
$$;

create or replace function public.music_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists music_files_guard on public.music_files;
create trigger music_files_guard before update on public.music_files
    for each row execute function public.music_files_guard();

drop trigger if exists music_tracks_guard on public.music_tracks;
create trigger music_tracks_guard before update on public.music_tracks
    for each row execute function public.music_tracks_guard();

drop trigger if exists music_playlists_guard on public.music_playlists;
create trigger music_playlists_guard before update on public.music_playlists
    for each row execute function public.music_playlists_guard();

drop trigger if exists music_lyrics_touch on public.music_lyrics;
create trigger music_lyrics_touch before insert or update on public.music_lyrics
    for each row execute function public.music_lyrics_touch();

drop trigger if exists music_albums_touch on public.music_albums;
create trigger music_albums_touch before update on public.music_albums
    for each row execute function public.music_touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Privileges and row-level security
-- ---------------------------------------------------------------------------------------------

do $$
declare
    t text;
begin
    foreach t in array array[
        'music_files', 'music_artworks', 'music_albums', 'music_artists', 'music_tracks',
        'music_track_artists', 'music_renditions', 'music_lyrics', 'music_playlists',
        'music_playlist_items', 'music_reactions', 'music_likes', 'music_plays'
    ] loop
        execute format('alter table public.%I enable row level security', t);
        execute format('revoke all on table public.%I from anon', t);
        execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
        execute format('grant all on table public.%I to service_role', t);
    end loop;
end;
$$;

revoke all on sequence public.music_plays_id_seq from anon;
grant usage on sequence public.music_plays_id_seq to authenticated, service_role;

-- music_files: the owner always; the partner once a world-visible track uses the file.
drop policy if exists "music_files: read" on public.music_files;
create policy "music_files: read" on public.music_files for select to authenticated
    using (
        public.is_world_member(world_id)
        and (
            owner_id = (select auth.uid())
            or exists (
                select 1 from public.music_tracks t
                where t.source_file_id = music_files.id
                  and t.visibility = 'world'
                  and t.deleted_at is null
            )
        )
    );
drop policy if exists "music_files: reserve" on public.music_files;
create policy "music_files: reserve" on public.music_files for insert to authenticated
    with check (owner_id = (select auth.uid()) and public.is_world_member(world_id));
drop policy if exists "music_files: mark uploaded" on public.music_files;
create policy "music_files: mark uploaded" on public.music_files for update to authenticated
    using (owner_id = (select auth.uid()) and public.is_world_member(world_id))
    with check (owner_id = (select auth.uid()));

-- music_tracks: world-visible tracks for both, private ones for the uploader only.
drop policy if exists "music_tracks: read" on public.music_tracks;
create policy "music_tracks: read" on public.music_tracks for select to authenticated
    using (
        public.is_world_member(world_id)
        and (visibility = 'world' or owner_id = (select auth.uid()))
    );
drop policy if exists "music_tracks: add" on public.music_tracks;
create policy "music_tracks: add" on public.music_tracks for insert to authenticated
    with check (owner_id = (select auth.uid()) and public.is_world_member(world_id));
drop policy if exists "music_tracks: edit" on public.music_tracks;
create policy "music_tracks: edit" on public.music_tracks for update to authenticated
    using (
        public.is_world_member(world_id)
        and (visibility = 'world' or owner_id = (select auth.uid()))
    )
    with check (
        public.is_world_member(world_id)
        and (visibility = 'world' or owner_id = (select auth.uid()))
    );

-- music_artworks: covers are world-level; the uploader may fix dimensions or palette.
drop policy if exists "music_artworks: read" on public.music_artworks;
create policy "music_artworks: read" on public.music_artworks for select to authenticated
    using (public.is_world_member(world_id));
drop policy if exists "music_artworks: add" on public.music_artworks;
create policy "music_artworks: add" on public.music_artworks for insert to authenticated
    with check (owner_id = (select auth.uid()) and public.is_world_member(world_id));
drop policy if exists "music_artworks: edit" on public.music_artworks;
create policy "music_artworks: edit" on public.music_artworks for update to authenticated
    using (owner_id = (select auth.uid()) and public.is_world_member(world_id))
    with check (owner_id = (select auth.uid()));

-- music_albums / music_artists: visible when a visible track uses them, or to whoever created them;
-- either partner may edit what they can see.
drop policy if exists "music_albums: read" on public.music_albums;
create policy "music_albums: read" on public.music_albums for select to authenticated
    using (
        public.is_world_member(world_id)
        and (
            created_by = (select auth.uid())
            or exists (select 1 from public.music_tracks t where t.album_id = music_albums.id)
        )
    );
drop policy if exists "music_albums: add" on public.music_albums;
create policy "music_albums: add" on public.music_albums for insert to authenticated
    with check (created_by = (select auth.uid()) and public.is_world_member(world_id));
drop policy if exists "music_albums: edit" on public.music_albums;
create policy "music_albums: edit" on public.music_albums for update to authenticated
    using (
        public.is_world_member(world_id)
        and (
            created_by = (select auth.uid())
            or exists (select 1 from public.music_tracks t where t.album_id = music_albums.id)
        )
    )
    with check (public.is_world_member(world_id));

drop policy if exists "music_artists: read" on public.music_artists;
create policy "music_artists: read" on public.music_artists for select to authenticated
    using (
        public.is_world_member(world_id)
        and (
            created_by = (select auth.uid())
            or exists (select 1 from public.music_track_artists ta where ta.artist_id = music_artists.id)
        )
    );
drop policy if exists "music_artists: add" on public.music_artists;
create policy "music_artists: add" on public.music_artists for insert to authenticated
    with check (created_by = (select auth.uid()) and public.is_world_member(world_id));
drop policy if exists "music_artists: edit" on public.music_artists;
create policy "music_artists: edit" on public.music_artists for update to authenticated
    using (
        public.is_world_member(world_id)
        and (
            created_by = (select auth.uid())
            or exists (select 1 from public.music_track_artists ta where ta.artist_id = music_artists.id)
        )
    )
    with check (public.is_world_member(world_id));

-- Child rows of a track follow the track's visibility (the subquery runs under music_tracks' RLS).
drop policy if exists "music_track_artists: read" on public.music_track_artists;
create policy "music_track_artists: read" on public.music_track_artists for select to authenticated
    using (exists (select 1 from public.music_tracks t where t.id = music_track_artists.track_id));
drop policy if exists "music_track_artists: add" on public.music_track_artists;
create policy "music_track_artists: add" on public.music_track_artists for insert to authenticated
    with check (exists (select 1 from public.music_tracks t where t.id = music_track_artists.track_id));
drop policy if exists "music_track_artists: remove" on public.music_track_artists;
create policy "music_track_artists: remove" on public.music_track_artists for delete to authenticated
    using (exists (select 1 from public.music_tracks t where t.id = music_track_artists.track_id));

drop policy if exists "music_renditions: read" on public.music_renditions;
create policy "music_renditions: read" on public.music_renditions for select to authenticated
    using (exists (select 1 from public.music_tracks t where t.id = music_renditions.track_id));
drop policy if exists "music_renditions: record original" on public.music_renditions;
create policy "music_renditions: record original" on public.music_renditions for insert to authenticated
    with check (
        kind = 'original'
        and exists (
            select 1 from public.music_tracks t
            where t.id = music_renditions.track_id and t.owner_id = (select auth.uid())
        )
    );

drop policy if exists "music_lyrics: read" on public.music_lyrics;
create policy "music_lyrics: read" on public.music_lyrics for select to authenticated
    using (exists (select 1 from public.music_tracks t where t.id = music_lyrics.track_id));
drop policy if exists "music_lyrics: add" on public.music_lyrics;
create policy "music_lyrics: add" on public.music_lyrics for insert to authenticated
    with check (exists (select 1 from public.music_tracks t where t.id = music_lyrics.track_id));
drop policy if exists "music_lyrics: edit" on public.music_lyrics;
create policy "music_lyrics: edit" on public.music_lyrics for update to authenticated
    using (exists (select 1 from public.music_tracks t where t.id = music_lyrics.track_id))
    with check (exists (select 1 from public.music_tracks t where t.id = music_lyrics.track_id));
drop policy if exists "music_lyrics: remove" on public.music_lyrics;
create policy "music_lyrics: remove" on public.music_lyrics for delete to authenticated
    using (exists (select 1 from public.music_tracks t where t.id = music_lyrics.track_id));

-- Playlists: 'ours' is shared by both partners, 'personal' belongs to its owner.
drop policy if exists "music_playlists: read" on public.music_playlists;
create policy "music_playlists: read" on public.music_playlists for select to authenticated
    using (
        public.is_world_member(world_id)
        and (kind = 'ours' or owner_id = (select auth.uid()))
    );
drop policy if exists "music_playlists: add" on public.music_playlists;
create policy "music_playlists: add" on public.music_playlists for insert to authenticated
    with check (owner_id = (select auth.uid()) and public.is_world_member(world_id));
drop policy if exists "music_playlists: edit" on public.music_playlists;
create policy "music_playlists: edit" on public.music_playlists for update to authenticated
    using (
        public.is_world_member(world_id)
        and (kind = 'ours' or owner_id = (select auth.uid()))
    )
    with check (public.is_world_member(world_id));
drop policy if exists "music_playlists: remove personal" on public.music_playlists;
create policy "music_playlists: remove personal" on public.music_playlists for delete to authenticated
    using (kind = 'personal' and owner_id = (select auth.uid()));

-- Items: visible when both the playlist and the track are; 'ours' only takes world-visible tracks.
drop policy if exists "music_playlist_items: read" on public.music_playlist_items;
create policy "music_playlist_items: read" on public.music_playlist_items for select to authenticated
    using (
        exists (select 1 from public.music_playlists p where p.id = music_playlist_items.playlist_id)
        and exists (select 1 from public.music_tracks t where t.id = music_playlist_items.track_id)
    );
drop policy if exists "music_playlist_items: add" on public.music_playlist_items;
create policy "music_playlist_items: add" on public.music_playlist_items for insert to authenticated
    with check (
        added_by = (select auth.uid())
        and exists (
            select 1
            from public.music_playlists p
            join public.music_tracks t on t.id = music_playlist_items.track_id
            where p.id = music_playlist_items.playlist_id
              and (p.kind = 'ours' or p.owner_id = (select auth.uid()))
              and (p.kind <> 'ours' or t.visibility = 'world')
        )
    );
drop policy if exists "music_playlist_items: reorder" on public.music_playlist_items;
create policy "music_playlist_items: reorder" on public.music_playlist_items for update to authenticated
    using (
        exists (
            select 1 from public.music_playlists p
            where p.id = music_playlist_items.playlist_id
              and (p.kind = 'ours' or p.owner_id = (select auth.uid()))
        )
    )
    with check (
        exists (
            select 1 from public.music_playlists p
            where p.id = music_playlist_items.playlist_id
              and (p.kind = 'ours' or p.owner_id = (select auth.uid()))
        )
    );
drop policy if exists "music_playlist_items: remove" on public.music_playlist_items;
create policy "music_playlist_items: remove" on public.music_playlist_items for delete to authenticated
    using (
        exists (
            select 1 from public.music_playlists p
            where p.id = music_playlist_items.playlist_id
              and (p.kind = 'ours' or p.owner_id = (select auth.uid()))
        )
    );

drop policy if exists "music_reactions: read" on public.music_reactions;
create policy "music_reactions: read" on public.music_reactions for select to authenticated
    using (exists (select 1 from public.music_playlist_items i where i.id = music_reactions.item_id));
drop policy if exists "music_reactions: mine" on public.music_reactions;
create policy "music_reactions: mine" on public.music_reactions for all to authenticated
    using (user_id = (select auth.uid()))
    with check (
        user_id = (select auth.uid())
        and exists (select 1 from public.music_playlist_items i where i.id = music_reactions.item_id)
    );

-- Likes are visible to both partners (for "we both like it"); each person writes their own.
drop policy if exists "music_likes: read" on public.music_likes;
create policy "music_likes: read" on public.music_likes for select to authenticated
    using (exists (select 1 from public.music_tracks t where t.id = music_likes.track_id));
drop policy if exists "music_likes: add" on public.music_likes;
create policy "music_likes: add" on public.music_likes for insert to authenticated
    with check (
        user_id = (select auth.uid())
        and exists (select 1 from public.music_tracks t where t.id = music_likes.track_id)
    );
drop policy if exists "music_likes: remove" on public.music_likes;
create policy "music_likes: remove" on public.music_likes for delete to authenticated
    using (user_id = (select auth.uid()));

-- Plays stay private to the listener.
drop policy if exists "music_plays: mine" on public.music_plays;
create policy "music_plays: mine" on public.music_plays for select to authenticated
    using (user_id = (select auth.uid()));
drop policy if exists "music_plays: record" on public.music_plays;
create policy "music_plays: record" on public.music_plays for insert to authenticated
    with check (
        user_id = (select auth.uid())
        and exists (select 1 from public.music_tracks t where t.id = music_plays.track_id)
    );

-- ---------------------------------------------------------------------------------------------
-- Storage: private bucket 'music'
-- ---------------------------------------------------------------------------------------------
--   <world>/orig/<sha256>.<ext>   originals; upload needs a reserved music_files row (status
--                                 'uploading') owned by the caller; readable like music_files
--   <world>/r/<track>/<file>      renditions written by the worker; readable like the track
--   <world>/art/<sha256>/<size>   artwork variants; world members read and upload
--   <world>/tmp/<user>/...        the caller's scratch space (device checks, staging); deletable
-- Nothing is overwritten or deleted from the app outside tmp/; trash goes through an RPC and a
-- scheduled purge (service role). The file size limit stays null so the project-wide limit
-- applies (Storage settings); MIME types are not whitelisted because browsers report none for
-- .ape/.dsf/.cue/.lrc — the app sniffs file headers and sends contentType itself.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music', 'music', false, null, null)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- One decision per storage action, so the policies stay one line each.
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
                    where f.path = p_name and f.world_id = world
                      and f.owner_id = me and f.status = 'uploading'
                );
            elsif p_action = 'read' then
                return exists (
                    select 1 from public.music_files f
                    where f.path = p_name and f.world_id = world
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
            return p_action = 'read'
                and exists (
                    select 1
                    from public.music_renditions r
                    join public.music_tracks t on t.id = r.track_id
                    where r.path = p_name and r.world_id = world
                      and t.deleted_at is null
                      and (t.visibility = 'world' or t.owner_id = me)
                );
        else
            return false;
    end case;
end;
$$;

revoke all on function public.music_storage_allows(text, text) from public, anon;
grant execute on function public.music_storage_allows(text, text) to authenticated, service_role;

drop policy if exists "music: read" on storage.objects;
create policy "music: read" on storage.objects for select to authenticated
    using (bucket_id = 'music' and public.music_storage_allows(name, 'read'));

drop policy if exists "music: upload" on storage.objects;
create policy "music: upload" on storage.objects for insert to authenticated
    with check (bucket_id = 'music' and public.music_storage_allows(name, 'insert'));

drop policy if exists "music: remove scratch" on storage.objects;
create policy "music: remove scratch" on storage.objects for delete to authenticated
    using (bucket_id = 'music' and public.music_storage_allows(name, 'delete'));

comment on table public.music_files is 'Uploaded files, stored once per world by SHA-256; bytes never change. ai/features/music/music.md';
comment on table public.music_tracks is 'Library rows; CUE virtual tracks slice one file by sample. ai/features/music/music.md';
comment on table public.music_renditions is 'What the player streams: original, lossless or lossy copy. ai/features/music/music.md';
