// An in-memory MusicBackend for the music fixtures: the same contract the app's Supabase backend
// (src/lib/music/library.ts) fulfils, with the database rules that matter to the UI mirrored here
// (dedupe by hash, bytes checked before a file counts as uploaded, one ingest per file, copies
// recorded per track, the partner's private songs hidden). Storage objects are Blobs; "signed"
// links are object URLs, which the <audio> element can seek in like a Range-capable server.
// Not used by the app; never ships.
import type {
    CopyPayload,
    ExistingHash,
    FileReservation,
    IngestLyrics,
    IngestPayload,
    LibraryChange,
    LibraryTrack,
    LyricsRow,
    MusicBackend,
    MusicRendition,
    MusicVisibility,
    ReservedFile,
    StorageUsage,
    UploadOptions
} from '@/types/music';

type FileRow = ReservedFile & {
    worldId: string;
    ownerId: string;
    sha256: string;
    sampleRate: number | null;
    res: FileReservation;
};
type TrackRow = Omit<LibraryTrack, 'renditions' | 'lyrics' | 'likedBy'> & { deleted: boolean };
type RenditionRow = MusicRendition & { trackId: string };
type LyricsDbRow = LyricsRow & { trackId: string };

// A row without its track id (the shape the backend contract returns).
const withoutTrack = <T extends { trackId: string }>(row: T): Omit<T, 'trackId'> => {
    const copy: Partial<T> = { ...row };
    delete copy.trackId;
    return copy as Omit<T, 'trackId'>;
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type FakeOptions = {
    /** the signed-in user */
    me?: string;
    /** pretend upload speed in bytes per second (0 = instant) */
    bytesPerSecond?: number;
};

export function createFakeMusicBackend(options: FakeOptions = {}) {
    let me = options.me ?? 'fixture-me';
    const objects = new Map<string, Blob>();
    const urls = new Map<string, string>();
    const files = new Map<string, FileRow>();
    const tracks = new Map<string, TrackRow>();
    const renditions: RenditionRow[] = [];
    const lyrics: LyricsDbRow[] = [];
    const likes = new Set<string>();
    const listeners = new Set<(c: LibraryChange) => void>();
    const log: string[] = [];

    const emit = (table: string, op: LibraryChange['op'], trackId: string | null) =>
        setTimeout(() => listeners.forEach((fn) => fn({ table, op, id: trackId, trackId })), 30);

    const visible = (t: TrackRow) => !t.deleted && (t.visibility === 'world' || t.ownerId === me);

    const stored = (path: string, partCount: number | null) => {
        const names = partCount
            ? Array.from({ length: partCount }, (_, i) => `${path}/${String(i).padStart(3, '0')}`)
            : [path];
        let bytes = 0;
        let count = 0;
        for (const n of names) {
            const blob = objects.get(n);
            if (blob) {
                bytes += blob.size;
                count++;
            }
        }
        return { bytes, count, expected: names.length };
    };

    const toLibrary = (t: TrackRow): LibraryTrack => ({
        ...t,
        renditions: renditions.filter((r) => r.trackId === t.id).map((r) => withoutTrack(r)),
        lyrics: lyrics
            .filter((l) => l.trackId === t.id)
            .map((l) => ({ id: l.id, kind: l.kind, format: l.format, synced: l.synced, preferred: l.preferred })),
        likedBy: [...likes].filter((k) => k.endsWith(`:${t.id}`)).map((k) => k.split(':')[0])
    });

    const backend: MusicBackend = {
        me: async () => me,

        async loadLibrary(worldId) {
            await wait(60);
            return [...tracks.values()].filter((t) => t.worldId === worldId && visible(t)).map(toLibrary);
        },

        async loadLyrics(trackId) {
            await wait(30);
            return lyrics.filter((l) => l.trackId === trackId).map((l) => withoutTrack(l));
        },

        async sign(paths) {
            const out: Record<string, string> = {};
            for (const p of paths) {
                const blob = objects.get(p);
                if (!blob) continue;
                if (!urls.has(p)) urls.set(p, URL.createObjectURL(blob));
                out[p] = urls.get(p) as string;
            }
            return out;
        },

        subscribe(_worldId, onChange, onStatus) {
            listeners.add(onChange);
            setTimeout(() => onStatus?.('SUBSCRIBED'), 10);
            return () => listeners.delete(onChange);
        },

        async existingHashes(worldId, hashes) {
            const out: ExistingHash[] = [];
            for (const f of files.values()) {
                if (f.worldId !== worldId || !hashes.includes(f.sha256)) continue;
                const readable =
                    f.ownerId === me ||
                    [...tracks.values()].some((t) => t.fileId === f.id && t.visibility === 'world' && !t.deleted);
                out.push({
                    sha256: f.sha256,
                    fileId: readable ? f.id : null,
                    status: f.status,
                    mine: f.ownerId === me,
                    readable
                });
            }
            return out;
        },

        async reserveFile(res) {
            const existing = [...files.values()].find((f) => f.worldId === res.worldId && f.sha256 === res.sha256);
            if (existing) {
                if (existing.ownerId !== me)
                    throw new Error('这首歌 TA 已经传过，并设成了仅自己可见；请让 TA 改成共享。');
                return existing;
            }
            const row: FileRow = {
                id: uid(),
                path: `${res.worldId}/orig/${res.sha256}.${res.ext}`,
                status: 'uploading',
                sizeBytes: res.sizeBytes,
                partSize: res.partSize,
                partCount: res.partCount,
                worldId: res.worldId,
                ownerId: me,
                sha256: res.sha256,
                sampleRate: res.sampleRate,
                res
            };
            files.set(row.id, row);
            return row;
        },

        async uploadObject(path: string, blob: Blob, opts: UploadOptions) {
            if (objects.has(path)) return;
            const speed = options.bytesPerSecond ?? 0;
            if (speed > 0) {
                const steps = Math.max(1, Math.ceil(blob.size / (speed / 10)));
                for (let i = 1; i <= steps; i++) {
                    if (opts.signal?.aborted) throw Object.assign(new Error('上传已取消。'), { name: 'AbortError' });
                    await wait(100);
                    opts.onProgress?.(Math.min(blob.size, (blob.size * i) / steps));
                }
            }
            objects.set(path, blob);
            log.push(`put ${path} ${blob.size}`);
        },

        async finishUpload(fileId) {
            const f = files.get(fileId);
            if (!f || f.ownerId !== me) throw new Error('music_finish_upload: no such upload');
            if (f.status !== 'uploading') return f.status;
            const s = stored(f.path, f.partCount);
            if (s.count !== s.expected || s.bytes !== f.sizeBytes)
                throw new Error(`music_finish_upload: stored ${s.bytes} bytes in ${s.count} objects`);
            f.status = 'uploaded';
            return 'uploaded';
        },

        async ingest(p: IngestPayload) {
            const f = files.get(p.file_id);
            if (!f || f.ownerId !== me || f.status !== 'uploaded')
                throw new Error('music_ingest: the file is not an uploaded audio file of yours');
            const already = [...tracks.values()].filter((t) => t.fileId === f.id && t.ownerId === me && !t.deleted);
            if (already.length) return already.map((t) => t.id);
            const artwork = p.artwork ? { id: uid(), variants: p.artwork.variants, palette: p.artwork.palette } : null;
            const album = p.album
                ? {
                      id: `album:${p.album.key}`,
                      title: p.album.title,
                      albumArtist: p.album.album_artist,
                      releaseDate: p.album.release_date
                  }
                : null;
            const now = new Date().toISOString();
            const ids: string[] = [];
            for (const t of p.tracks) {
                const id = uid();
                tracks.set(id, {
                    id,
                    worldId: p.world_id,
                    ownerId: me,
                    visibility: p.visibility ?? 'world',
                    title: t.title,
                    artists: t.artists,
                    album,
                    discNo: t.disc_no ?? null,
                    trackNo: t.track_no ?? null,
                    fileId: f.id,
                    sampleRate: f.sampleRate,
                    startSample: t.start_sample ?? null,
                    endSample: t.end_sample ?? null,
                    durationMs: t.duration_ms,
                    gain: t.gain ?? null,
                    artwork,
                    createdAt: now,
                    deleted: false
                });
                const kinds = new Set<string>();
                for (const l of t.lyrics ?? []) {
                    lyrics.push({
                        id: uid(),
                        trackId: id,
                        kind: l.kind,
                        format: l.format,
                        synced: l.synced,
                        preferred: !kinds.has(l.kind),
                        lang: l.lang ?? null,
                        wordSynced: l.word_synced,
                        offsetMs: l.offset_ms ?? 0,
                        rawText: l.raw_text,
                        source: l.source
                    });
                    kinds.add(l.kind);
                }
                renditions.push({
                    id: uid(),
                    trackId: id,
                    kind: 'original',
                    path: f.path,
                    container: f.res.container,
                    codec: f.res.codec,
                    lossless: f.res.lossless,
                    sampleRate: f.res.sampleRate,
                    bitDepth: f.res.bitDepth,
                    channels: f.res.channels,
                    bitrate: p.rendition?.bitrate ?? null,
                    sizeBytes: f.sizeBytes,
                    partSize: f.partSize,
                    partCount: f.partCount
                });
                ids.push(id);
            }
            emit('music_tracks', 'INSERT', ids[0]);
            return ids;
        },

        async recordCopy(trackId: string, c: CopyPayload) {
            const s = stored(c.path, c.part_count);
            if (s.count !== s.expected || s.bytes !== c.size_bytes)
                throw new Error('music_record_copy: bytes do not add up');
            const existing = renditions.find((r) => r.trackId === trackId && r.kind === 'lossy');
            if (existing) return existing.id;
            const id = uid();
            renditions.push({
                id,
                trackId,
                kind: 'lossy',
                path: c.path,
                container: c.container,
                codec: c.codec,
                lossless: false,
                sampleRate: c.sample_rate,
                bitDepth: null,
                channels: c.channels,
                bitrate: c.bitrate,
                sizeBytes: c.size_bytes,
                partSize: c.part_size,
                partCount: c.part_count
            });
            emit('music_renditions', 'INSERT', trackId);
            return id;
        },

        async storageUsage(): Promise<StorageUsage[]> {
            let bytes = 0;
            for (const b of objects.values()) bytes += b.size;
            return [{ bucket: 'music', objects: objects.size, bytes }];
        },

        async updateTrack(trackId, patch: { title?: string; visibility?: MusicVisibility }) {
            const t = tracks.get(trackId);
            if (!t) throw new Error('没有这首歌。');
            if (patch.visibility && t.ownerId !== me) throw new Error('只有上传的人能改可见范围。');
            Object.assign(t, patch);
            emit('music_tracks', 'UPDATE', trackId);
        },

        async trashTrack(trackId) {
            const t = tracks.get(trackId);
            if (!t || t.ownerId !== me) throw new Error('只有上传的人能删除。');
            t.deleted = true;
            emit('music_tracks', 'UPDATE', trackId);
        },

        async setLike(trackId, _worldId, liked) {
            const key = `${me}:${trackId}`;
            if (liked) likes.add(key);
            else likes.delete(key);
            emit('music_likes', liked ? 'INSERT' : 'DELETE', trackId);
        },

        async saveLyrics(trackId: string, _worldId: string, l: IngestLyrics) {
            for (const row of lyrics) if (row.trackId === trackId && row.kind === l.kind) row.preferred = false;
            lyrics.push({
                id: uid(),
                trackId,
                kind: l.kind,
                format: l.format,
                synced: l.synced,
                preferred: true,
                lang: l.lang ?? null,
                wordSynced: l.word_synced,
                offsetMs: l.offset_ms ?? 0,
                rawText: l.raw_text,
                source: l.source
            });
            emit('music_lyrics', 'INSERT', trackId);
        },

        async recordPlay() {}
    };

    return {
        backend,
        /** act as another member of the world (seed the partner's uploads) */
        actAs(user: string) {
            me = user;
        },
        objects,
        files,
        tracks,
        renditions,
        log
    };
}
export type FakeMusic = ReturnType<typeof createFakeMusicBackend>;
