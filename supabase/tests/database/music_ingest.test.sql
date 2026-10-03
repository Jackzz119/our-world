-- music_ingest.test.sql — the upload flow's database side (feature doc: ai/features/music/impl.md):
-- files stored in parts, the verified upload finish, dedupe, one-transaction ingest of a CUE album,
-- copies made on a device, the storage meter, the shared playlist and live updates. A owns world
-- W1 with B as member; C owns W2. Everything runs in one transaction and rolls back.
-- Run offline with `bash scripts/check-music-db.sh`, or against local Supabase with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

insert into auth.users (id, email) values ('aaaaaaaa-0000-4000-8000-000000000001', 'a@test.local'), ('bbbbbbbb-0000-4000-8000-000000000002', 'b@test.local'), ('cccccccc-0000-4000-8000-000000000003', 'c@test.local');
insert into public.worlds (id, owner_id, member_id) values ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002'), ('22222222-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000003', null);

-- A uploads a whole-album image too big for one object: 150 bytes in parts of 100.
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select lives_ok($$ insert into public.music_files (id, world_id, sha256, role, path, size_bytes, part_size, part_count, container, codec, lossless, sample_rate, bit_depth, channels, duration_samples) values ('f3f3f3f3-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', '4444444444444444444444444444444444444444444444444444444444444444', 'audio', '11111111-0000-4000-8000-000000000001/orig/4444444444444444444444444444444444444444444444444444444444444444.flac', 150, 100, 2, 'flac', 'flac', true, 44100, 16, 2, 88200) $$, 'A reserves a file stored in two parts');
select throws_ok($$ insert into public.music_files (world_id, sha256, role, path, size_bytes, part_size, part_count) values ('11111111-0000-4000-8000-000000000001', '5555555555555555555555555555555555555555555555555555555555555550', 'audio', '11111111-0000-4000-8000-000000000001/orig/5555555555555555555555555555555555555555555555555555555555555550.flac', 300, 100, 2) $$, '23514', null, 'parts must add up to the size');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner, metadata) values ('music', '11111111-0000-4000-8000-000000000001/orig/4444444444444444444444444444444444444444444444444444444444444444.flac/000', 'aaaaaaaa-0000-4000-8000-000000000001', '{"size": 100}') $$, 'A uploads part 000');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner, metadata) values ('music', '11111111-0000-4000-8000-000000000001/orig/4444444444444444444444444444444444444444444444444444444444444444.flac/002', 'aaaaaaaa-0000-4000-8000-000000000001', '{"size": 1}') $$, '42501', null, 'a part beyond part_count is refused');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner, metadata) values ('music', '11111111-0000-4000-8000-000000000001/orig/4444444444444444444444444444444444444444444444444444444444444444.flac', 'aaaaaaaa-0000-4000-8000-000000000001', '{"size": 150}') $$, '42501', null, 'a file reserved in parts cannot also be stored whole');
select throws_ok($$ select public.music_finish_upload('f3f3f3f3-0000-4000-8000-000000000003') $$, 'P0001', null, 'finishing with a part missing is refused');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner, metadata) values ('music', '11111111-0000-4000-8000-000000000001/orig/4444444444444444444444444444444444444444444444444444444444444444.flac/001', 'aaaaaaaa-0000-4000-8000-000000000001', '{"size": 50}') $$, 'A uploads part 001');
select is(public.music_finish_upload('f3f3f3f3-0000-4000-8000-000000000003'), 'uploaded', 'with every part stored the upload finishes');
select is(public.music_finish_upload('f3f3f3f3-0000-4000-8000-000000000003'), 'uploaded', 'finishing again just reports the status');
select results_eq($$ select sha256, mine, readable, status from public.music_existing_hashes('11111111-0000-4000-8000-000000000001', array['4444444444444444444444444444444444444444444444444444444444444444', '9999999999999999999999999999999999999999999999999999999999999999']) $$, $$ values ('4444444444444444444444444444444444444444444444444444444444444444'::text, true, true, 'uploaded'::text) $$, 'dedupe finds the stored file and nothing else');

-- One ingest turns the album image into two CUE slices with album, artwork, artists and lyrics.
select is(cardinality(public.music_ingest($j${"world_id":"11111111-0000-4000-8000-000000000001","file_id":"f3f3f3f3-0000-4000-8000-000000000003","album":{"key":"lo-fi 时光|live at home|2026","title":"Live at Home","album_artist":"Lo-fi 时光","release_date":"2026"},"artwork":{"sha256":"7777777777777777777777777777777777777777777777777777777777777777","source":"embedded","base_path":"11111111-0000-4000-8000-000000000001/art/7777777777777777777777777777777777777777777777777777777777777777","width":1200,"height":1200,"variants":{"256":"256.webp"}},"rendition":{"bitrate":900000},"tracks":[{"title":"第一段","artists":["Lo-fi 时光","小满"],"track_no":1,"start_sample":0,"end_sample":44100,"duration_ms":1000,"lyrics":[{"kind":"main","format":"lrc","synced":true,"raw_text":"[00:00.00]一","source":"sidecar"},{"kind":"main","format":"plain","raw_text":"一","source":"embedded"}]},{"title":"第二段","artists":["Lo-fi 时光"],"track_no":2,"start_sample":44100,"end_sample":88200,"duration_ms":1000}]}$j$::jsonb)), 2, 'ingest makes one track per CUE slice');
select is(cardinality(public.music_ingest($j${"world_id":"11111111-0000-4000-8000-000000000001","file_id":"f3f3f3f3-0000-4000-8000-000000000003","tracks":[{"title":"重复","duration_ms":1}]}$j$::jsonb)), 2, 'a retried ingest returns the same tracks');
select is((select count(*)::integer from public.music_tracks where source_file_id = 'f3f3f3f3-0000-4000-8000-000000000003'), 2, 'and adds no duplicates');
select results_eq($$ select title, start_sample, end_sample from public.music_tracks where source_file_id = 'f3f3f3f3-0000-4000-8000-000000000003' order by start_sample $$, $$ values ('第一段'::text, 0::bigint, 44100::bigint), ('第二段'::text, 44100::bigint, 88200::bigint) $$, 'the slices keep their sample ranges');
select is((select count(*)::integer from public.music_track_artists ta join public.music_tracks t on t.id = ta.track_id where t.source_file_id = 'f3f3f3f3-0000-4000-8000-000000000003'), 3, 'artists are linked per track');
select is((select count(*)::integer from public.music_artists where world_id = '11111111-0000-4000-8000-000000000001'), 2, 'an artist named twice is stored once');
select results_eq($$ select l.format, l.is_preferred from public.music_lyrics l join public.music_tracks t on t.id = l.track_id where t.title = '第一段' order by l.created_at, l.format $$, $$ values ('lrc'::text, true), ('plain'::text, false) $$, 'the first lyrics of a kind is the preferred one');
select is((select count(*)::integer from public.music_renditions r join public.music_tracks t on t.id = r.track_id where t.source_file_id = 'f3f3f3f3-0000-4000-8000-000000000003' and r.kind = 'original' and r.part_count = 2), 2, 'each slice streams the same original, parts included');
select isnt((select artwork_id from public.music_albums where album_key = 'lo-fi 时光|live at home|2026'), null, 'the album takes the cover');
select lives_ok($$ insert into public.music_files (id, world_id, sha256, role, path, size_bytes) values ('f5f5f5f5-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000001', '5555555555555555555555555555555555555555555555555555555555555555', 'audio', '11111111-0000-4000-8000-000000000001/orig/5555555555555555555555555555555555555555555555555555555555555555.mp3', 10) $$, 'A reserves another file');
select throws_ok($$ select public.music_ingest('{"world_id":"11111111-0000-4000-8000-000000000001","file_id":"f5f5f5f5-0000-4000-8000-000000000005","tracks":[{"title":"x","duration_ms":1}]}'::jsonb) $$, 'P0001', null, 'a file that is not uploaded yet cannot be ingested');
select throws_ok($$ select public.music_ingest('{"world_id":"22222222-0000-4000-8000-000000000002","file_id":"f3f3f3f3-0000-4000-8000-000000000003","tracks":[{"title":"x","duration_ms":1}]}'::jsonb) $$, '42501', null, 'nobody ingests into a world they are not in');
select ok(public.music_ours_playlist('11111111-0000-4000-8000-000000000001') is not null, 'A opens the shared playlist');
select lives_ok($$ update public.music_tracks set visibility = 'private' where title = '第二段' $$, 'A makes the second slice private');

-- B, the partner.
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
select results_eq($$ select mine, readable from public.music_existing_hashes('11111111-0000-4000-8000-000000000001', array['4444444444444444444444444444444444444444444444444444444444444444']) $$, $$ values (false, true) $$, 'B learns the shared file exists and may use it');
select results_eq($$ select title from public.music_tracks order by title $$, $$ values ('第一段'::text) $$, 'B sees the shared slice only');
select is((select count(*)::integer from storage.objects where bucket_id = 'music' and starts_with(name, '11111111-0000-4000-8000-000000000001/orig/4444444444444444444444444444444444444444444444444444444444444444.flac/')), 2, 'B can fetch both parts of the shared original');
select throws_ok($$ select public.music_finish_upload('f5f5f5f5-0000-4000-8000-000000000005') $$, '42501', null, 'B cannot finish A''s upload');
select throws_ok($$ select public.music_ingest('{"world_id":"11111111-0000-4000-8000-000000000001","file_id":"f3f3f3f3-0000-4000-8000-000000000003","tracks":[{"title":"x","duration_ms":1}]}'::jsonb) $$, 'P0001', null, 'B cannot turn A''s file into tracks');
select is(public.music_ours_playlist('11111111-0000-4000-8000-000000000001'), (select id from public.music_playlists where kind = 'ours'), 'B gets the same shared playlist');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner, metadata) select 'music', '11111111-0000-4000-8000-000000000001/r/' || id || '/aac256-1.m4a', 'bbbbbbbb-0000-4000-8000-000000000002', '{"size": 10}' from public.music_tracks where title = '第一段' $$, 'B stores a compact copy of the shared slice');
select isnt((select public.music_record_copy(id, jsonb_build_object('path', '11111111-0000-4000-8000-000000000001/r/' || id || '/aac256-1.m4a', 'container', 'mp4', 'codec', 'aac', 'sample_rate', 44100, 'channels', 2, 'bitrate', 256000, 'size_bytes', 10)) from public.music_tracks where title = '第一段'), null, 'and records it');
select results_eq($$ select r.kind, r.codec, r.lossless from public.music_renditions r join public.music_tracks t on t.id = r.track_id where t.title = '第一段' order by r.kind $$, $$ values ('lossy'::text, 'aac'::text, false), ('original'::text, 'flac'::text, true) $$, 'the slice now has an original and a copy');
select throws_ok($$ select public.music_record_copy(id, jsonb_build_object('path', '11111111-0000-4000-8000-000000000001/orig/x.m4a', 'size_bytes', 10)) from public.music_tracks where title = '第一段' $$, '22023', null, 'a copy must live under r/<track>/');
select throws_ok($$ select public.music_record_copy(id, jsonb_build_object('path', '11111111-0000-4000-8000-000000000001/r/' || id || '/aac256-1.m4a', 'size_bytes', 11)) from public.music_tracks where title = '第一段' $$, 'P0001', null, 'a copy whose bytes do not add up is refused');
reset role;
select lives_ok($$ insert into public.music_files (id, world_id, owner_id, sha256, role, path, size_bytes, status) values ('fbfbfbfb-0000-4000-8000-00000000000b', '11111111-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', '6666666666666666666666666666666666666666666666666666666666666666', 'audio', '11111111-0000-4000-8000-000000000001/orig/6666666666666666666666666666666666666666666666666666666666666666.flac', 10, 'uploaded') $$, 'B has an uploaded file of her own');
select lives_ok($$ insert into public.music_tracks (world_id, owner_id, visibility, title, source_file_id, duration_ms) values ('11111111-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'private', 'B 的私房歌', 'fbfbfbfb-0000-4000-8000-00000000000b', 1000) $$, 'which she keeps private');
set local role authenticated;
select throws_ok($$ insert into storage.objects (bucket_id, name, owner, metadata) select 'music', '11111111-0000-4000-8000-000000000001/r/' || id || '/aac256-1.m4a', 'bbbbbbbb-0000-4000-8000-000000000002', '{"size": 10}' from (select id from public.music_tracks where title = '第二段' union all select '72727272-0000-4000-8000-0000000000ff'::uuid) x limit 1 $$, '42501', null, 'B cannot store a copy of a slice she cannot see');

-- Back to A: the partner's private file is reported without its id.
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001"}';
select results_eq($$ select file_id, mine, readable from public.music_existing_hashes('11111111-0000-4000-8000-000000000001', array['6666666666666666666666666666666666666666666666666666666666666666']) $$, $$ values (null::uuid, false, false) $$, 'a file the partner keeps private shows up as taken but unusable');
select ok((select bytes from public.music_storage_usage() where bucket = 'music') >= 160, 'the storage meter counts every stored byte');

-- C, outside the world.
set local request.jwt.claims to '{"sub":"cccccccc-0000-4000-8000-000000000003"}';
select is((select count(*)::integer from public.music_existing_hashes('11111111-0000-4000-8000-000000000001', array['4444444444444444444444444444444444444444444444444444444444444444'])), 0, 'C learns nothing about W1''s files');

-- Live updates: ids only, members only.
reset role;
select ok((select count(*) from realtime.messages where topic = 'music:11111111-0000-4000-8000-000000000001') > 0, 'library changes are broadcast to the world''s topic');
select is((select count(*)::integer from realtime.messages where topic like 'music:%' and (payload ? 'title' or payload::text like '%第一段%')), 0, 'broadcasts carry ids, never titles');
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-4000-8000-000000000002"}';
set local realtime.topic to 'music:11111111-0000-4000-8000-000000000001';
select ok((select count(*) from realtime.messages) > 0, 'B may join her world''s music topic');
set local request.jwt.claims to '{"sub":"cccccccc-0000-4000-8000-000000000003"}';
select is((select count(*)::integer from realtime.messages), 0, 'C may not');
set local realtime.topic to 'music:not-a-uuid';
select is((select count(*)::integer from realtime.messages), 0, 'a malformed topic is refused quietly');

select * from finish();
rollback;
