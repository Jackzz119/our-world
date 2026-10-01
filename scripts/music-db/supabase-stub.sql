-- supabase-stub.sql — the smallest stand-in for a Supabase database that the music migration and
-- its pgTAP test need: the API roles, auth.users + auth.uid(), storage.buckets/objects with
-- storage.foldername(), Supabase's default grants on public, and the app's worlds table.
-- Used only by scripts/check-music-db.sh on a throwaway local Postgres; never run against Supabase.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema extensions;
create extension pgtap with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
alter database postgres set search_path = "$user", public, extensions;
set search_path = "$user", public, extensions;

-- auth: the users table and the uid() helper exactly as PostgREST requests resolve it.
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
    id    uuid primary key,
    email text
);
create function auth.uid() returns uuid
language sql stable
as $$
    select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- storage: buckets and objects with RLS on, as Supabase ships them.
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
    id                 text primary key,
    name               text not null unique,
    owner              uuid,
    public             boolean default false,
    file_size_limit    bigint,
    allowed_mime_types text[],
    created_at         timestamptz default now(),
    updated_at         timestamptz default now()
);
create table storage.objects (
    id               uuid primary key default gen_random_uuid(),
    bucket_id        text references storage.buckets(id),
    name             text,
    owner            uuid,
    owner_id         text,
    created_at       timestamptz default now(),
    updated_at       timestamptz default now(),
    last_accessed_at timestamptz default now(),
    metadata         jsonb,
    path_tokens      text[] generated always as (string_to_array(name, '/')) stored,
    version          text,
    user_metadata    jsonb,
    unique (bucket_id, name)
);
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
create function storage.foldername(name text) returns text[]
language plpgsql
as $$
declare
    _parts text[];
begin
    select string_to_array(name, '/') into _parts;
    return _parts[1:array_length(_parts, 1) - 1];
end
$$;

-- public: Supabase grants the API roles everything by default and relies on RLS.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- The app's worlds table (only the columns the music schema touches), members can read their own.
create table public.worlds (
    id         uuid primary key default gen_random_uuid(),
    owner_id   uuid references auth.users(id) on delete cascade,
    member_id  uuid references auth.users(id) on delete cascade,
    name       text,
    created_at timestamptz default now()
);
alter table public.worlds enable row level security;
create policy "worlds: members read" on public.worlds for select to authenticated
    using ((select auth.uid()) in (owner_id, member_id));
