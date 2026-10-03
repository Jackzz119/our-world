// library.ts — the Supabase side of the music library: the MusicBackend the player and the upload
// flow use in the app. Tables, policies and RPCs: supabase/migrations/20261001100000_music_library.sql
// and 20261003100000_music_ingest.sql. Live changes arrive on the private Realtime topic
// `music:<world_id>` (ids only); the caller refetches through the table policies.
// Feature doc: ai/features/music/music.md, details in ai/features/music/impl.md.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { currentUserId, supabase } from '@/lib/supabase';
import { MUSIC_BUCKET } from '@/lib/music/storage';
import { tusUpload } from '@/lib/music/upload';
import type {
    CopyPayload,
    ExistingHash,
    FileReservation,
    IngestLyrics,
    IngestPayload,
    LibraryChange,
    LibraryTrack,
    LyricsRow,
    MusicArtwork,
    MusicBackend,
    MusicRendition,
    MusicVisibility,
    ReservedFile,
    StorageUsage,
    UploadOptions
} from '@/types/music';
import { getEnv } from '@/utils';

// Select list for one library row with everything the list and the player show. Must stay in step
// with the row mapping in toTrack (nothing generates these types).
const TRACK_COLS = [
    'id, world_id, owner_id, visibility, title, disc_no, track_no, source_file_id, start_sample, end_sample,',
    'duration_ms, gain, created_at,',
    'album:music_albums(id, title, album_artist, release_date),',
    'artwork:music_artworks(id, variants, palette),',
    'file:music_files(sample_rate),',
    'renditions:music_renditions(id, kind, path, container, codec, lossless, sample_rate, bit_depth, channels,',
    'bitrate, size_bytes, part_size, part_count),',
    'lyrics:music_lyrics(id, kind, format, synced, is_preferred),',
    'track_artists:music_track_artists(position, role, artist:music_artists(name)),',
    'likes:music_likes(user_id)'
].join(' ');

type Row = Record<string, unknown>;
const one = <T>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

// One PostgREST row (with its embedded relations) as the player's LibraryTrack.
const toTrack = (row: Row): LibraryTrack => {
    const album = one(row.album as Row | Row[] | null);
    const artwork = one(row.artwork as Row | Row[] | null);
    const file = one(row.file as Row | Row[] | null);
    const artists = ((row.track_artists as Row[] | null) ?? [])
        .filter((ta) => ta.role === 'main')
        .sort((a, b) => Number(a.position) - Number(b.position))
        .map((ta) => String(one(ta.artist as Row | Row[] | null)?.name ?? ''))
        .filter(Boolean);
    return {
        id: String(row.id),
        worldId: String(row.world_id),
        ownerId: String(row.owner_id),
        visibility: row.visibility as MusicVisibility,
        title: String(row.title),
        artists,
        album: album
            ? {
                  id: String(album.id),
                  title: String(album.title),
                  albumArtist: String(album.album_artist ?? ''),
                  releaseDate: (album.release_date as string | null) ?? null
              }
            : null,
        discNo: num(row.disc_no),
        trackNo: num(row.track_no),
        fileId: String(row.source_file_id),
        sampleRate: num(file?.sample_rate),
        startSample: num(row.start_sample),
        endSample: num(row.end_sample),
        durationMs: Number(row.duration_ms),
        gain: (row.gain as LibraryTrack['gain']) ?? null,
        artwork: artwork
            ? {
                  id: String(artwork.id),
                  variants: (artwork.variants as Record<string, string>) ?? {},
                  palette: (artwork.palette as MusicArtwork['palette']) ?? null
              }
            : null,
        renditions: ((row.renditions as Row[] | null) ?? []).map(
            (r): MusicRendition => ({
                id: String(r.id),
                kind: r.kind as MusicRendition['kind'],
                path: String(r.path),
                container: String(r.container),
                codec: String(r.codec),
                lossless: Boolean(r.lossless),
                sampleRate: num(r.sample_rate),
                bitDepth: num(r.bit_depth),
                channels: num(r.channels),
                bitrate: num(r.bitrate),
                sizeBytes: Number(r.size_bytes),
                partSize: num(r.part_size),
                partCount: num(r.part_count)
            })
        ),
        lyrics: ((row.lyrics as Row[] | null) ?? []).map((l) => ({
            id: String(l.id),
            kind: l.kind as LyricsRow['kind'],
            format: l.format as LyricsRow['format'],
            synced: Boolean(l.synced),
            preferred: Boolean(l.is_preferred)
        })),
        likedBy: ((row.likes as Row[] | null) ?? []).map((l) => String(l.user_id)),
        createdAt: String(row.created_at)
    };
};

// The resumable endpoint on Storage's own host (Supabase's advice for large uploads); projects on a
// custom domain or the local stack fall back to the API host.
const tusEndpoint = (): string => {
    const base = new URL(getEnv('VITE_SUPABASE_URL'));
    const ref = /^([a-z0-9]+)\.supabase\.co$/i.exec(base.hostname)?.[1];
    return ref
        ? `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`
        : `${base.origin}/storage/v1/upload/resumable`;
};

// A fresh access token for each upload request (long uploads outlive a token).
const accessToken = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.name === 'AuthRetryableFetchError' ? '网络好像断了，稍后再试。' : error.message);
    const token = data.session?.access_token;
    if (!token) throw new Error('未登录，无法上传。');
    return token;
};

// Subscribe to the world's private music topic (broadcast from the database triggers).
const subscribe = (
    worldId: string,
    onChange: (change: LibraryChange) => void,
    onStatus?: (status: string) => void
): (() => void) => {
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    void supabase.realtime.setAuth().then(() => {
        if (disposed) return;
        channel = supabase
            .channel(`music:${worldId}`, { config: { private: true } })
            .on('broadcast', { event: 'change' }, (message: { payload?: unknown }) => {
                const p = message.payload as Record<string, string | null> | undefined;
                if (!p?.table) return;
                onChange({
                    table: p.table,
                    op: p.op as LibraryChange['op'],
                    id: p.id ?? null,
                    trackId: p.track_id ?? null
                });
            })
            .subscribe((status) => onStatus?.(status));
    });
    return () => {
        disposed = true;
        if (channel) void supabase.removeChannel(channel);
    };
};

// The app's music backend: Supabase tables, RPCs, Storage and Realtime.
export const supabaseMusic: MusicBackend = {
    me: () => currentUserId('未登录。'),

    async loadLibrary(worldId) {
        const { data, error } = await supabase
            .from('music_tracks')
            .select(TRACK_COLS)
            .eq('world_id', worldId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(5000);
        // the tables only exist once the music migrations ran (supabase/migrations/2026100*_music_*.sql)
        if (error && (error.code === 'PGRST205' || error.code === '42P01'))
            throw new Error('曲库还没开通：Supabase 还没运行音乐的两份迁移。');
        if (error) throw error;
        return ((data ?? []) as unknown as Row[]).map(toTrack);
    },

    async loadLyrics(trackId) {
        const { data, error } = await supabase
            .from('music_lyrics')
            .select('id, kind, format, synced, word_synced, offset_ms, raw_text, source, lang, is_preferred')
            .eq('track_id', trackId)
            .order('created_at');
        if (error) throw error;
        return ((data ?? []) as Row[]).map((l) => ({
            id: String(l.id),
            kind: l.kind as LyricsRow['kind'],
            format: l.format as LyricsRow['format'],
            synced: Boolean(l.synced),
            preferred: Boolean(l.is_preferred),
            lang: (l.lang as string | null) ?? null,
            wordSynced: Boolean(l.word_synced),
            offsetMs: Number(l.offset_ms ?? 0),
            rawText: String(l.raw_text ?? ''),
            source: l.source as LyricsRow['source']
        }));
    },

    async sign(paths, ttlSeconds) {
        const unique = [...new Set(paths.filter(Boolean))];
        if (!unique.length) return {};
        const { data, error } = await supabase.storage.from(MUSIC_BUCKET).createSignedUrls(unique, ttlSeconds);
        if (error) throw error;
        const map: Record<string, string> = {};
        for (const row of data ?? []) if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
        return map;
    },

    subscribe,

    async existingHashes(worldId, hashes) {
        if (!hashes.length) return [];
        const { data, error } = await supabase.rpc('music_existing_hashes', { p_world: worldId, p_hashes: hashes });
        if (error) throw error;
        return ((data ?? []) as Row[]).map(
            (r): ExistingHash => ({
                sha256: String(r.sha256),
                fileId: (r.file_id as string | null) ?? null,
                status: r.status as ExistingHash['status'],
                mine: Boolean(r.mine),
                readable: Boolean(r.readable)
            })
        );
    },

    async reserveFile(res: FileReservation): Promise<ReservedFile> {
        const path = `${res.worldId}/orig/${res.sha256}.${res.ext}`;
        const cols = 'id, path, status, size_bytes, part_size, part_count';
        const asReserved = (r: Row): ReservedFile => ({
            id: String(r.id),
            path: String(r.path),
            status: r.status as ReservedFile['status'],
            sizeBytes: Number(r.size_bytes),
            partSize: num(r.part_size),
            partCount: num(r.part_count)
        });
        const { data, error } = await supabase
            .from('music_files')
            .insert({
                world_id: res.worldId,
                sha256: res.sha256,
                role: 'audio',
                path,
                original_name: res.originalName.slice(0, 500),
                relative_path: res.relativePath.slice(0, 1000),
                size_bytes: res.sizeBytes,
                part_size: res.partSize,
                part_count: res.partCount,
                container: res.container,
                codec: res.codec,
                lossless: res.lossless,
                sample_rate: res.sampleRate,
                bit_depth: res.bitDepth,
                channels: res.channels,
                duration_samples: res.durationSamples,
                audio_md5: res.audioMd5
            })
            .select(cols)
            .single();
        if (!error) return asReserved(data as Row);
        if (error.code !== '23505') throw error;
        // the same content was reserved before (an interrupted upload, or a re-import)
        const { data: existing, error: again } = await supabase
            .from('music_files')
            .select(cols)
            .eq('world_id', res.worldId)
            .eq('sha256', res.sha256)
            .maybeSingle();
        if (again) throw again;
        if (!existing) throw new Error('这首歌 TA 已经传过，并设成了仅自己可见；请让 TA 改成共享。');
        return asReserved(existing as Row);
    },

    uploadObject: (path: string, blob: Blob, options: UploadOptions) =>
        tusUpload(
            {
                endpoint: tusEndpoint(),
                token: accessToken,
                apiKey: getEnv('VITE_SUPABASE_ANON_KEY'),
                bucket: MUSIC_BUCKET
            },
            path,
            blob,
            options
        ),

    async finishUpload(fileId) {
        const { data, error } = await supabase.rpc('music_finish_upload', { p_file: fileId });
        if (error) throw error;
        return String(data);
    },

    async ingest(payload: IngestPayload) {
        const { data, error } = await supabase.rpc('music_ingest', { p: payload });
        if (error) throw error;
        return (data ?? []) as string[];
    },

    async recordCopy(trackId: string, payload: CopyPayload) {
        const { data, error } = await supabase.rpc('music_record_copy', { p_track: trackId, p: payload });
        if (error) throw error;
        return String(data);
    },

    async storageUsage(): Promise<StorageUsage[]> {
        const { data, error } = await supabase.rpc('music_storage_usage');
        if (error) throw error;
        return ((data ?? []) as Row[]).map((r) => ({
            bucket: String(r.bucket),
            objects: Number(r.objects),
            bytes: Number(r.bytes)
        }));
    },

    async updateTrack(trackId, patch) {
        const { error } = await supabase.from('music_tracks').update(patch).eq('id', trackId);
        if (error) throw error;
    },

    async trashTrack(trackId) {
        const { error } = await supabase
            .from('music_tracks')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', trackId);
        if (error) throw error;
    },

    async setLike(trackId, worldId, liked) {
        const me = await currentUserId('未登录。');
        const { error } = liked
            ? await supabase
                  .from('music_likes')
                  .upsert({ user_id: me, track_id: trackId, world_id: worldId }, { ignoreDuplicates: true })
            : await supabase.from('music_likes').delete().eq('track_id', trackId).eq('user_id', me);
        if (error) throw error;
    },

    async saveLyrics(trackId: string, worldId: string, lyrics: IngestLyrics) {
        // the edited text replaces the preferred version of that kind; earlier versions stay as history
        const { error: off } = await supabase
            .from('music_lyrics')
            .update({ is_preferred: false })
            .eq('track_id', trackId)
            .eq('kind', lyrics.kind)
            .eq('is_preferred', true);
        if (off) throw off;
        const { error } = await supabase.from('music_lyrics').insert({
            world_id: worldId,
            track_id: trackId,
            kind: lyrics.kind,
            lang: lyrics.lang ?? null,
            format: lyrics.format,
            synced: lyrics.synced,
            word_synced: lyrics.word_synced,
            offset_ms: lyrics.offset_ms ?? 0,
            raw_text: lyrics.raw_text,
            source: lyrics.source,
            is_preferred: true
        });
        if (error) throw error;
    },

    async recordPlay(trackId, worldId, msPlayed) {
        const { error } = await supabase
            .from('music_plays')
            .insert({ track_id: trackId, world_id: worldId, ms_played: Math.round(msPlayed) });
        if (error) throw error;
    }
};
