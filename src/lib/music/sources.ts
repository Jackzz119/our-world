// sources.ts — turns a library track into something the <audio> element can play: which version
// (the original, or the compact copy on a metered network / by the listener's choice for that
// song), from where (this device first, then a signed link), and which window of the file (a CUE
// slice of a whole-album image). Files stored in parts (Free plan) cannot stream through one link,
// so they are fetched whole onto the device first and play from there.
// Feature doc: ai/features/music/music.md, details in ai/features/music/impl.md §音源.
import type { EngineTrack, ResolveOptions, ResolvedSource, SourceResolver } from '@/lib/music/engine';
import { listOffline, readOffline, removeOffline, saveOffline, trimOfflineCache } from '@/lib/music/offline';
import { objectPaths } from '@/lib/music/upload';
import type { LibraryTrack, MusicBackend, MusicRendition } from '@/types/music';

export type VersionChoice = 'auto' | 'original' | 'compact';

// Signed links live this long; they are renewed when less than RENEW_MS is left.
const URL_TTL_S = 6 * 60 * 60;
const RENEW_MS = 30 * 60 * 1000;
// Whole files fetched only so they could play are kept up to this much, oldest dropped first.
const CACHE_KEEP_BYTES = 1.5 * 1024 * 1024 * 1024;

// MIME type with codecs for canPlayType, from the stored container and codec.
export const renditionMime = (r: Pick<MusicRendition, 'container' | 'codec'>): string => {
    const codec = r.codec.toLowerCase();
    switch (r.container.toLowerCase()) {
        case 'flac':
            return 'audio/flac';
        case 'mp3':
            return 'audio/mpeg';
        case 'mp4':
        case 'm4a':
            return codec === 'alac' ? 'audio/mp4; codecs="alac"' : 'audio/mp4; codecs="mp4a.40.2"';
        case 'wav':
            return 'audio/wav';
        case 'aiff':
            return 'audio/aiff';
        case 'ogg':
            return codec === 'opus'
                ? 'audio/ogg; codecs="opus"'
                : codec === 'flac'
                  ? 'audio/ogg; codecs="flac"'
                  : 'audio/ogg; codecs="vorbis"';
        case 'webm':
            return codec === 'vorbis' ? 'audio/webm; codecs="vorbis"' : 'audio/webm; codecs="opus"';
        default:
            return '';
    }
};

let probe: HTMLAudioElement | null = null;
// Whether this browser says it can play a rendition at all.
export const canPlayHere = (r: Pick<MusicRendition, 'container' | 'codec'>): boolean => {
    const mime = renditionMime(r);
    if (!mime) return false;
    probe ??= document.createElement('audio');
    return probe.canPlayType(mime) !== '';
};

type Connection = { type?: string; effectiveType?: string; saveData?: boolean };
// True when the network says it is metered (Android's cellular, or Save-Data on). iPhone browsers
// do not say, so there it is always false and the listener switches per song.
export const meteredNetwork = (): boolean => {
    const c = (navigator as Navigator & { connection?: Connection }).connection;
    return Boolean(c && (c.type === 'cellular' || c.saveData));
};

export type TrackVersions = {
    original: MusicRendition | null;
    lossless: MusicRendition | null;
    compact: MusicRendition | null;
    /** which renditions this browser can play */
    playable: Set<MusicRendition['kind']>;
    /** which rendition paths are on this device */
    local: Set<string>;
};

export class LibrarySources implements SourceResolver {
    private tracks = new Map<string, LibraryTrack>();
    private signed = new Map<string, { url: string; expires: number }>();
    private blobs = new Map<string, string>();
    private offline = new Set<string>();
    private choices: Record<string, VersionChoice>;
    private backend: MusicBackend;
    /** told when what is on this device changed (a download finished or was removed) */
    onOfflineChange: (() => void) | null = null;

    constructor(backend: MusicBackend, choices: Record<string, VersionChoice> = {}) {
        this.backend = backend;
        this.choices = { ...choices };
        void listOffline().then((entries) => {
            for (const e of entries) this.offline.add(e.path);
            this.onOfflineChange?.();
        });
    }

    // The library changed: remember the rows and sign everything streamable ahead of time, so a
    // tap can start playback without waiting for the network (iOS needs that).
    async setLibrary(tracks: LibraryTrack[]): Promise<void> {
        this.tracks = new Map(tracks.map((t) => [t.id, t]));
        const paths = tracks.flatMap((t) =>
            t.renditions.filter((r) => !r.partCount && canPlayHere(r)).map((r) => r.path)
        );
        await this.signAhead(paths).catch(() => undefined);
    }

    // Sign the paths whose links are missing or about to expire.
    private async signAhead(paths: string[], fresh = false): Promise<void> {
        const now = Date.now();
        const due = [...new Set(paths)].filter((p) => fresh || (this.signed.get(p)?.expires ?? 0) - now < RENEW_MS);
        for (let i = 0; i < due.length; i += 200) {
            const batch = due.slice(i, i + 200);
            const urls = await this.backend.sign(batch, URL_TTL_S);
            for (const [path, url] of Object.entries(urls))
                this.signed.set(path, { url, expires: now + URL_TTL_S * 1000 });
        }
    }

    private signedUrl(path: string): string | null {
        const hit = this.signed.get(path);
        return hit && hit.expires - Date.now() > 60_000 ? hit.url : null;
    }

    choiceFor(trackId: string): VersionChoice {
        return this.choices[trackId] ?? 'auto';
    }

    setChoice(trackId: string, choice: VersionChoice): Record<string, VersionChoice> {
        if (choice === 'auto') delete this.choices[trackId];
        else this.choices[trackId] = choice;
        return { ...this.choices };
    }

    // What exists for a track, what plays here, what is on this device.
    versions(track: LibraryTrack): TrackVersions {
        const find = (kind: MusicRendition['kind']) => track.renditions.find((r) => r.kind === kind) ?? null;
        const original = find('original');
        const lossless = find('lossless');
        const compact = find('lossy');
        const playable = new Set<MusicRendition['kind']>();
        for (const r of [original, lossless, compact]) if (r && canPlayHere(r)) playable.add(r.kind);
        const local = new Set<string>();
        for (const r of [original, lossless, compact]) if (r && this.offline.has(r.path)) local.add(r.path);
        return { original, lossless, compact, playable, local };
    }

    isOffline(path: string): boolean {
        return this.offline.has(path);
    }

    // Pick the rendition to play: anything already on this device first; then the listener's
    // choice for this song; on a metered network the compact copy; otherwise the best that plays.
    pick(track: LibraryTrack, avoidOriginal = false): MusicRendition | null {
        const v = this.versions(track);
        const full = [v.original, v.lossless].filter(
            (r): r is MusicRendition => !!r && v.playable.has(r.kind) && !(avoidOriginal && r.kind === 'original')
        );
        const compact = v.compact && v.playable.has('lossy') ? v.compact : null;
        const choice = this.choiceFor(track.id);
        const wantsCompact = choice === 'compact' || (choice === 'auto' && meteredNetwork());
        const localFull = full.find((r) => v.local.has(r.path));
        const localCompact = compact && v.local.has(compact.path) ? compact : null;
        if (wantsCompact) return localCompact ?? localFull ?? compact ?? full[0] ?? null;
        return localFull ?? full[0] ?? localCompact ?? compact ?? null;
    }

    // The time window of a track inside the rendition that plays it.
    private window(track: LibraryTrack, r: MusicRendition): { startMs: number; endMs: number | null } {
        if (r.kind === 'lossy' || track.startSample === null || !track.sampleRate) return { startMs: 0, endMs: null };
        const startMs = (track.startSample / track.sampleRate) * 1000;
        const endMs = track.endSample !== null ? (track.endSample / track.sampleRate) * 1000 : null;
        return { startMs, endMs };
    }

    private source(track: LibraryTrack, r: MusicRendition, url: string, local: boolean): ResolvedSource {
        return {
            url,
            mediaKey: r.path,
            ...this.window(track, r),
            version: r.kind === 'lossy' ? 'compact' : 'original',
            local
        };
    }

    peek(engineTrack: EngineTrack): ResolvedSource | null {
        const track = this.tracks.get(engineTrack.key.replace(/^lib:/, ''));
        if (!track) return null;
        const r = this.pick(track);
        if (!r) return null;
        const blob = this.blobs.get(r.path);
        if (blob) return this.source(track, r, blob, true);
        if (r.partCount || this.offline.has(r.path)) return null;
        const url = this.signedUrl(r.path);
        return url ? this.source(track, r, url, false) : null;
    }

    async resolve(engineTrack: EngineTrack, options: ResolveOptions): Promise<ResolvedSource> {
        const track = this.tracks.get(engineTrack.key.replace(/^lib:/, ''));
        if (!track) throw new Error('这首歌已经不在曲库里了。');
        const r = this.pick(track, options.avoidOriginal);
        if (!r) {
            const v = this.versions(track);
            throw new Error(
                v.original && !v.compact
                    ? `这台设备放不了 ${v.original.codec.toUpperCase()}，等有省流版后再听。`
                    : '这首歌暂时放不了。'
            );
        }
        // on this device already
        const cachedBlob = this.blobs.get(r.path);
        if (cachedBlob && !options.fresh) return this.source(track, r, cachedBlob, true);
        if (this.offline.has(r.path)) {
            const blob = await readOffline(r.path);
            if (blob) return this.source(track, r, this.blobUrl(r.path, blob), true);
            this.offline.delete(r.path);
        }
        // stored in parts: fetch it whole first
        if (r.partCount) {
            if (options.prefetch) throw new Error('prefetch skipped');
            const blob = await this.fetchWhole(r, 'cache', options.onPrepare, options.signal);
            return this.source(track, r, this.blobUrl(r.path, blob), true);
        }
        // stream it
        await this.signAhead([r.path], options.fresh);
        const url = this.signedUrl(r.path);
        if (!url) throw new Error('没能拿到这首歌的播放链接。');
        return this.source(track, r, url, false);
    }

    private blobUrl(path: string, blob: Blob): string {
        const old = this.blobs.get(path);
        if (old) URL.revokeObjectURL(old);
        const url = URL.createObjectURL(blob);
        this.blobs.set(path, url);
        return url;
    }

    // Every track that plays from a rendition path (CUE slices share their album's original).
    private tracksUsing(path: string): string[] {
        return [...this.tracks.values()].filter((t) => t.renditions.some((r) => r.path === path)).map((t) => t.id);
    }

    private async fetchWhole(
        r: MusicRendition,
        reason: 'cache' | 'download',
        onProgress: (fraction: number) => void,
        signal?: AbortSignal
    ): Promise<Blob> {
        const paths = objectPaths(r.path, r.partCount);
        const urls = await this.backend.sign(paths, URL_TTL_S);
        const ordered = paths.map((p) => urls[p]);
        if (ordered.some((u) => !u)) throw new Error('没能拿到下载链接。');
        if (reason === 'cache') await trimOfflineCache(CACHE_KEEP_BYTES).catch(() => undefined);
        const blob = await saveOffline(
            r.path,
            ordered,
            { size: r.sizeBytes, reason, trackIds: this.tracksUsing(r.path) },
            onProgress,
            signal
        );
        this.offline.add(r.path);
        this.onOfflineChange?.();
        return blob;
    }

    // Keep a version of a track on this device for offline listening.
    async download(
        track: LibraryTrack,
        kind: 'original' | 'compact',
        onProgress: (fraction: number) => void,
        signal?: AbortSignal
    ): Promise<void> {
        const v = this.versions(track);
        const r = kind === 'compact' ? v.compact : (v.original ?? v.lossless);
        if (!r) throw new Error(kind === 'compact' ? '这首歌还没有省流版。' : '找不到原件。');
        await this.fetchWhole(r, 'download', onProgress, signal);
    }

    // Remove a downloaded version from this device.
    async forget(path: string): Promise<void> {
        await removeOffline(path);
        this.offline.delete(path);
        const blob = this.blobs.get(path);
        if (blob) URL.revokeObjectURL(blob);
        this.blobs.delete(path);
        this.onOfflineChange?.();
    }

    // Signed links for artwork variants (and anything else shown, not played).
    async signForDisplay(paths: string[]): Promise<Record<string, string>> {
        await this.signAhead(paths).catch(() => undefined);
        const out: Record<string, string> = {};
        for (const p of paths) {
            const url = this.signedUrl(p);
            if (url) out[p] = url;
        }
        return out;
    }

    dispose(): void {
        for (const url of this.blobs.values()) URL.revokeObjectURL(url);
        this.blobs.clear();
    }
}
