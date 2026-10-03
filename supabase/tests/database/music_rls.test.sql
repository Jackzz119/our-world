-- music_rls.test.sql — who can see and change what in the music library (feature doc:
-- ai/features/music/music.md, D5 = L3). A owns world W1 with B as member; C owns W2.
-- Everything runs in one transaction and rolls back.
-- Run offline with `bash scripts/check-music-db.sh`, or against local Supabase with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

-- Fixtures, as the migration owner (bypasses RLS).
insert into auth.users (id, email) values ('aaaaaaaa-0000-4000-8000-000000000001', 'a@test.local'), ('bbbbbbbb-0000-4000-8000-000000000002', 'b@test.local'), ('cccccccc-0000-4000-8000-000000000003', 'c@test.local');
insert into public.worlds (id, owner_id, member_id) values ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002'), ('22222222-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000003', null);
insert into public.music_files (id, world_id, owner_id, sha256, role, path, size_bytes, status)
values ('fcfcfcfc-0000-4000-8000-00000000000c', '22222222-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000003', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', 'audio', '22222222-0000-4000-8000-000000000002/orig/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.flac', 10, 'uploaded');

-- A reserves, uploads and adds tracks in her own world.
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select lives_ok($$ insert into public.music_files (id, world_id, sha256, role, path, size_bytes) values ('f1f1f1f1-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', '1111111111111111111111111111111111111111111111111111111111111111', 'audio', '11111111-0000-4000-8000-000000000001/orig/1111111111111111111111111111111111111111111111111111111111111111.flac', 100) $$, 'A reserves an upload in her world');
select throws_ok($$ insert into public.music_files (world_id, sha256, role, path, size_bytes) values ('22222222-0000-4000-8000-000000000002', '3333333333333333333333333333333333333333333333333333333333333333', 'audio', '22222222-0000-4000-8000-000000000002/orig/3333333333333333333333333333333333333333333333333333333333333333.flac', 1) $$, '42501', null, 'A cannot reserve a file in another world');
select throws_ok($$ insert into public.music_files (world_id, owner_id, sha256, role, path, size_bytes) values ('11111111-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', '3333333333333333333333333333333333333333333333333333333333333333', 'audio', '11111111-0000-4000-8000-000000000001/orig/3333333333333333333333333333333333333333333333333333333333333333.flac', 1) $$, '42501', null, 'A cannot reserve a file in B''s name');
select throws_ok($$ insert into public.music_files (world_id, sha256, role, path, size_bytes) values ('11111111-0000-4000-8000-000000000001', '3333333333333333333333333333333333333333333333333333333333333333', 'audio', '22222222-0000-4000-8000-000000000002/orig/3333333333333333333333333333333333333333333333333333333333333333.flac', 1) $$, '23514', null, 'a file row cannot claim another world''s path');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner, metadata) values ('music', '11111111-0000-4000-8000-000000000001/orig/1111111111111111111111111111111111111111111111111111111111111111.flac', 'aaaaaaaa-0000-4000-8000-000000000001', '{"size": 100}') $$, 'A uploads into her reserved path');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('music', '11111111-0000-4000-8000-000000000001/orig/3333333333333333333333333333333333333333333333333333333333333333.flac', 'aaaaaaaa-0000-4000-8000-000000000001') $$, '42501', null, 'uploading into orig/ needs a reservation');
select is(public.music_finish_upload('f1f1f1f1-0000-4000-8000-000000000001'), 'uploaded', 'A marks her upload done once the stored bytes add up');
select results_eq($$ with u as (update public.music_files set size_bytes = 1 where id = 'f1f1f1f1-0000-4000-8000-000000000001' returning 1) select count(*)::integer from u $$, $$ values (0) $$, 'file facts cannot be changed from the app');
select lives_ok($$ insert into public.music_tracks (id, world_id, title, source_file_id, duration_ms) values ('71717171-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', '雨天的窗边', 'f1f1f1f1-0000-4000-8000-000000000001', 198000) $$, 'A adds a shared track');
select lives_ok($$ insert into public.music_files (id, world_id, sha256, role, path, size_bytes) values ('f2f2f2f2-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', '2222222222222222222222222222222222222222222222222222222222222222', 'audio', '11111111-0000-4000-8000-000000000001/orig/2222222222222222222222222222222222222222222222222222222222222222.flac', 100) $$, 'A reserves a second upload');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner) values ('music', '11111111-0000-4000-8000-000000000001/orig/2222222222222222222222222222222222222222222222222222222222222222.flac', 'aaaaaaaa-0000-4000-8000-000000000001') $$, 'A uploads the second file');
select lives_ok($$ insert into public.music_tracks (id, world_id, visibility, title, source_file_id, duration_ms) values ('72727272-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 'private', '只给自己听', 'f2f2f2f2-0000-4000-8000-000000000002', 120000) $$, 'A adds a private track');
select throws_ok($$ insert into public.music_tracks (world_id, title, source_file_id, duration_ms) values ('11111111-0000-4000-8000-000000000001', 'x', 'fcfcfcfc-0000-4000-8000-00000000000c', 1) $$, '23503', null, 'a track cannot use a file from another world');

-- B, the partner: shared things only, and only some fields.
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
select results_eq($$ select id from public.music_tracks order by id $$, $$ values ('71717171-0000-4000-8000-000000000001'::uuid) $$, 'B sees the shared track, not A''s private one');
select results_eq($$ select id from public.music_files order by id $$, $$ values ('f1f1f1f1-0000-4000-8000-000000000001'::uuid) $$, 'B sees only files behind shared tracks');
select results_eq($$ select name from storage.objects where bucket_id = 'music' order by name $$, $$ values ('11111111-0000-4000-8000-000000000001/orig/1111111111111111111111111111111111111111111111111111111111111111.flac'::text) $$, 'B can reach the shared original but not the private one');
select lives_ok($$ update public.music_tracks set title = '雨天的窗边（现场）' where id = '71717171-0000-4000-8000-000000000001' $$, 'B can retitle a shared track');
select throws_ok($$ update public.music_tracks set visibility = 'private' where id = '71717171-0000-4000-8000-000000000001' $$, '42501', null, 'only the uploader changes visibility');
select throws_ok($$ update public.music_tracks set deleted_at = now() where id = '71717171-0000-4000-8000-000000000001' $$, '42501', null, 'only the uploader deletes');
select lives_ok($$ insert into public.music_lyrics (world_id, track_id, format, raw_text, source) values ('11111111-0000-4000-8000-000000000001', '71717171-0000-4000-8000-000000000001', 'lrc', '[00:00.00]窗外的灯一盏一盏亮起来', 'manual') $$, 'B adds lyrics to a shared track');
select throws_ok($$ insert into public.music_lyrics (world_id, track_id, format, raw_text, source) values ('11111111-0000-4000-8000-000000000001', '72727272-0000-4000-8000-000000000002', 'plain', 'x', 'manual') $$, '42501', null, 'B cannot add lyrics to A''s private track');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner) values ('music', '11111111-0000-4000-8000-000000000001/tmp/bbbbbbbb-0000-4000-8000-000000000002/m0/check.flac', 'bbbbbbbb-0000-4000-8000-000000000002') $$, 'B uploads into her own scratch space');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('music', '11111111-0000-4000-8000-000000000001/tmp/aaaaaaaa-0000-4000-8000-000000000001/check.flac', 'bbbbbbbb-0000-4000-8000-000000000002') $$, '42501', null, 'B cannot write into A''s scratch space');
select lives_ok($$ delete from storage.objects where name = '11111111-0000-4000-8000-000000000001/orig/1111111111111111111111111111111111111111111111111111111111111111.flac' $$, 'B''s delete of an original runs (and must remove nothing)');
select lives_ok($$ delete from storage.objects where name = '11111111-0000-4000-8000-000000000001/tmp/bbbbbbbb-0000-4000-8000-000000000002/m0/check.flac' $$, 'B clears her scratch space');

-- C, from another world: nothing.
set local request.jwt.claims to '{"sub":"cccccccc-0000-4000-8000-000000000003"}';
select is_empty($$ select id from public.music_tracks where world_id = '11111111-0000-4000-8000-000000000001' union all select id from public.music_files where world_id = '11111111-0000-4000-8000-000000000001' union all select id from public.music_lyrics where world_id = '11111111-0000-4000-8000-000000000001' $$, 'C sees nothing from W1');
select is_empty($$ select name from storage.objects where name like '11111111-0000-4000-8000-000000000001/%' $$, 'C cannot reach W1 files');
select throws_ok($$ insert into public.music_tracks (world_id, title, source_file_id, duration_ms) values ('11111111-0000-4000-8000-000000000001', 'x', 'f1f1f1f1-0000-4000-8000-000000000001', 1) $$, '42501', null, 'C cannot add tracks to W1');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('music', '11111111-0000-4000-8000-000000000001/tmp/cccccccc-0000-4000-8000-000000000003/check.flac', 'cccccccc-0000-4000-8000-000000000003') $$, '42501', null, 'C cannot upload into W1');
select ok(not public.is_world_member('11111111-0000-4000-8000-000000000001'), 'C is not a member of W1');
select results_eq($$ select id from public.music_files $$, $$ values ('fcfcfcfc-0000-4000-8000-00000000000c'::uuid) $$, 'C still sees her own file in W2');

-- Playlists, reactions, likes, listens.
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select lives_ok($$ insert into public.music_playlists (id, world_id, kind, title) values ('e1e1e1e1-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'ours', '我们的歌单') $$, 'A creates the shared playlist');
select throws_ok($$ insert into public.music_playlist_items (world_id, playlist_id, track_id, position) values ('11111111-0000-4000-8000-000000000001', 'e1e1e1e1-0000-4000-8000-000000000001', '72727272-0000-4000-8000-000000000002', 'a0') $$, '42501', null, 'private tracks stay out of the shared playlist');
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
select lives_ok($$ insert into public.music_playlist_items (id, world_id, playlist_id, track_id, position, note) values ('1e1e1e1e-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'e1e1e1e1-0000-4000-8000-000000000001', '71717171-0000-4000-8000-000000000001', 'a0', '这首想放给你听') $$, 'B adds a shared track to the shared playlist');
select throws_ok($$ insert into public.music_playlists (world_id, kind, title) values ('11111111-0000-4000-8000-000000000001', 'ours', '第二张') $$, '23505', null, 'one shared playlist per world');
select lives_ok($$ insert into public.music_playlists (id, world_id, title) values ('e2e2e2e2-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', '我的') $$, 'B creates a personal playlist');
select lives_ok($$ insert into public.music_reactions (item_id, world_id, emoji) values ('1e1e1e1e-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', '❤') $$, 'B reacts to an item');
select lives_ok($$ insert into public.music_likes (track_id, world_id) values ('71717171-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001') $$, 'B likes the shared track');
select throws_ok($$ insert into public.music_likes (track_id, world_id) values ('72727272-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001') $$, '42501', null, 'B cannot like a track she cannot see');
select lives_ok($$ insert into public.music_plays (world_id, track_id, ms_played) values ('11111111-0000-4000-8000-000000000001', '71717171-0000-4000-8000-000000000001', 45000) $$, 'B records a listen');
select throws_ok($$ update public.music_playlists set kind = 'personal' where id = 'e1e1e1e1-0000-4000-8000-000000000001' $$, '42501', null, 'the shared playlist cannot become a personal one');
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select is_empty($$ select id from public.music_playlists where id = 'e2e2e2e2-0000-4000-8000-000000000002' $$, 'A cannot see B''s personal playlist');
select is((select count(*)::int from public.music_reactions), 1, 'A sees B''s reaction');
select is((select count(*)::int from public.music_likes), 1, 'A sees B''s like');
select is((select count(*)::int from public.music_plays), 0, 'listens stay private to the listener');

-- Albums only show up once they hold something the viewer can see.
select lives_ok($$ insert into public.music_albums (id, world_id, album_key, title) values ('a1b1a1b1-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'test|雨夜', '雨夜') $$, 'A creates an album');
select lives_ok($$ update public.music_tracks set album_id = 'a1b1a1b1-0000-4000-8000-000000000001' where id = '72727272-0000-4000-8000-000000000002' $$, 'A files her private track under it');
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
select is_empty($$ select id from public.music_albums $$, 'an album holding only private tracks stays hidden');
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select lives_ok($$ update public.music_tracks set album_id = 'a1b1a1b1-0000-4000-8000-000000000001' where id = '71717171-0000-4000-8000-000000000001' $$, 'A adds the shared track to the album');
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
select results_eq($$ select id from public.music_albums $$, $$ values ('a1b1a1b1-0000-4000-8000-000000000001'::uuid) $$, 'the album appears once it holds a shared track');

-- Sharing a private track needs no file move.
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select lives_ok($$ update public.music_tracks set visibility = 'world' where id = '72727272-0000-4000-8000-000000000002' $$, 'A shares her private track');
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
select is((select count(*)::int from public.music_tracks), 2, 'B now sees both tracks');
select is((select count(*)::int from storage.objects where bucket_id = 'music' and name like '%/orig/%'), 2, 'and can reach both originals without any file moving');

-- Renditions: clients record only the original; derived copies follow the track's visibility.
select throws_ok($$ insert into public.music_renditions (world_id, track_id, kind, path, container, codec, lossless, size_bytes) values ('11111111-0000-4000-8000-000000000001', '71717171-0000-4000-8000-000000000001', 'lossy', '11111111-0000-4000-8000-000000000001/r/71717171-0000-4000-8000-000000000001/aac256-v1.m4a', 'mp4', 'aac', false, 1) $$, '42501', null, 'only the worker writes derived renditions');
select throws_ok($$ insert into public.music_renditions (world_id, track_id, kind, path, container, codec, lossless, size_bytes) values ('11111111-0000-4000-8000-000000000001', '71717171-0000-4000-8000-000000000001', 'original', '11111111-0000-4000-8000-000000000001/orig/1111111111111111111111111111111111111111111111111111111111111111.flac', 'flac', 'flac', true, 100) $$, '42501', null, 'only the uploader records the original rendition');
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select throws_ok($$ insert into public.music_renditions (world_id, track_id, kind, path, container, codec, lossless, size_bytes) values ('11111111-0000-4000-8000-000000000001', '71717171-0000-4000-8000-000000000001', 'original', '11111111-0000-4000-8000-000000000001/r/72727272-0000-4000-8000-000000000002/flac-v1.flac', 'flac', 'flac', true, 100) $$, '23514', null, 'an original rendition must point into orig/');
select lives_ok($$ insert into public.music_renditions (world_id, track_id, kind, path, container, codec, lossless, sample_rate, bit_depth, channels, size_bytes) values ('11111111-0000-4000-8000-000000000001', '71717171-0000-4000-8000-000000000001', 'original', '11111111-0000-4000-8000-000000000001/orig/1111111111111111111111111111111111111111111111111111111111111111.flac', 'flac', 'flac', true, 96000, 24, 2, 100) $$, 'A records the original rendition');
reset role;
insert into public.music_renditions (world_id, track_id, kind, path, container, codec, lossless, size_bytes)
values ('11111111-0000-4000-8000-000000000001', '72727272-0000-4000-8000-000000000002', 'lossless', '11111111-0000-4000-8000-000000000001/r/72727272-0000-4000-8000-000000000002/flac-v1.flac', 'flac', 'flac', true, 100);
insert into storage.objects (bucket_id, name) values ('music', '11111111-0000-4000-8000-000000000001/r/72727272-0000-4000-8000-000000000002/flac-v1.flac');
update public.music_tracks set visibility = 'private' where id = '72727272-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
select is_empty($$ select name from storage.objects where name like '%/r/%' $$, 'B cannot reach a derived copy of a private track');
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select isnt_empty($$ select name from storage.objects where name like '%/r/%' $$, 'the uploader can');

-- Anonymous visitors get nothing at all.
reset role;
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select 1 from public.music_tracks $$, '42501', null, 'anonymous visitors cannot read the library');
reset role;

-- What the deletes above actually did.
select isnt_empty($$ select 1 from storage.objects where name = '11111111-0000-4000-8000-000000000001/orig/1111111111111111111111111111111111111111111111111111111111111111.flac' $$, 'the original survived B''s delete');
select is_empty($$ select 1 from storage.objects where name = '11111111-0000-4000-8000-000000000001/tmp/bbbbbbbb-0000-4000-8000-000000000002/m0/check.flac' $$, 'B''s scratch file is gone');

select * from finish();
rollback;
