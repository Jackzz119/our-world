// ingest.ts — from files the listener picked to rows in the library, on the listener's own device
// (no media server this phase):
//   analyse  — identify the format, read tags, cover and embedded lyrics, hash the bytes, pair the
//              sidecar .lrc / cover / .cue (a CUE sheet turns one album image into slices);
//   upload   — skip content the world already has, reserve, upload (resumable; files over the
//              per-object cap go in parts), let the database check the stored bytes;
//   ingest   — cover sizes, then one RPC writes tracks, artists, album, lyrics and the original;
//   copy     — where the browser can encode, a compact copy per track for metered networks.
// The original's bytes are never changed: tags edited later live in the database only.
// Feature doc: ai/features/music/music.md §上传与入库, details in ai/features/music/impl.md §上传.
import { artworkPath, prepareArtwork } from '@/lib/music/artwork';
import { cueSlices, matchCueFile, parseCue } from '@/lib/music/cue';
import type { IngestItem } from '@/lib/music/ingest-plan';
import { detectLyricsFormat } from '@/lib/music/lyrics';
import { readAudioMetadata, type ParsedAudio } from '@/lib/music/metadata';
import { sha256Blob } from '@/lib/music/sha256';
import { browserFamily, canBrowserPlay, sniffAudio, type SniffResult } from '@/lib/music/sniff';
import { musicMimeOf } from '@/lib/music/storage';
import { decodeText } from '@/lib/music/text';
import { formatLabel, qualityBadge, type QualityBadge } from '@/lib/music/quality';
import type { CopyFormat } from '@/lib/music/transcode';
import { DEFAULT_MAX_OBJECT_BYTES, objectPaths, partLayout } from '@/lib/music/upload';
import type {
    ArtworkSource,
    IngestLyrics,
    IngestPayload,
    IngestTrack,
    LyricsFormat,
    MusicBackend,
    MusicVisibility
} from '@/types/music';

export type DraftStatus =
    | 'analyzing'
    | 'ready'
    | 'duplicate'
    | 'taken'
    | 'unsupported'
    | 'uploading'
    | 'processing'
    | 'copying'
    | 'done'
    | 'failed';

export type DraftSlice = { title: string; performer: string; startSample: number; endSample: number; isrc: string };

export type DraftLyrics = IngestLyrics & { label: string };

// One audio file on its way into the library, as the upload panel shows it.
export type IngestDraft = {
    key: string;
    item: IngestItem;
    status: DraftStatus;
    /** 0..1 within the current phase */
    progress: number;
    error: string | null;
    note: string | null;
    sha256: string | null;
    parsed: ParsedAudio | null;
    sniff: SniffResult | null;
    formatLabel: string;
    badge: QualityBadge;
    playableHere: boolean;
    title: string;
    artists: string[];
    album: string;
    albumArtist: string;
    year: string | null;
    lyrics: DraftLyrics[];
    cover: { source: ArtworkSource; blob: Blob } | null;
    slices: DraftSlice[] | null;
    trackIds: string[];
};

// The base name without extension and leading track numbers ("01 - 雨天的窗边.flac" → 雨天的窗边).
const titleFromName = (name: string): string =>
    name
        .replace(/\.[^.]+$/, '')
        .replace(/^\s*\d{1,3}\s*[-._)\]]\s*/, '')
        .trim() || name;

// Lower-case extension with only safe characters, for the storage path.
const extOf = (name: string): string => {
    const ext = /\.([a-z0-9]{1,5})$/i.exec(name)?.[1]?.toLowerCase();
    return ext ?? 'bin';
};

const lyricsKindOf = (path: string, base: string): { kind: 'main' | 'translation'; lang: string | null } => {
    const name = path.split('/').pop() ?? path;
    const m = new RegExp(
        `^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.([a-z]{2,3}(?:-[a-z0-9]+)?)\\.(lrc|txt)$`,
        'i'
    ).exec(name);
    return m ? { kind: 'translation', lang: m[1].toLowerCase() } : { kind: 'main', lang: null };
};

// The lyrics a draft carries: sidecar files first, embedded text after; synced versions before plain.
const collectLyrics = async (item: IngestItem, parsed: ParsedAudio | null): Promise<DraftLyrics[]> => {
    const base = (item.audio.file.name.replace(/\.[^.]+$/, '') || item.audio.file.name).toLowerCase();
    const found: DraftLyrics[] = [];
    for (const side of item.lyrics) {
        const { text } = decodeText(new Uint8Array(await side.file.arrayBuffer()));
        if (!text.trim()) continue;
        const format = detectLyricsFormat(text) as LyricsFormat;
        const { kind, lang } = lyricsKindOf(side.path.toLowerCase(), base);
        found.push({
            kind,
            lang,
            format,
            synced: format !== 'plain',
            word_synced: format === 'lrc_word',
            raw_text: text,
            source: 'sidecar',
            label:
                kind === 'translation'
                    ? `翻译 · ${side.file.name}`
                    : `同名 ${side.file.name.split('.').pop()?.toLowerCase()}`
        });
    }
    if (parsed?.lyrics?.trim()) {
        const format = detectLyricsFormat(parsed.lyrics) as LyricsFormat;
        found.push({
            kind: 'main',
            format,
            synced: format !== 'plain',
            word_synced: format === 'lrc_word',
            raw_text: parsed.lyrics,
            source: 'embedded',
            label: '内嵌'
        });
    }
    const rank = (l: DraftLyrics) =>
        (l.kind === 'main' ? 0 : 10) + (l.synced ? 0 : 2) + (l.source === 'sidecar' ? 0 : 1);
    return found.sort((a, b) => rank(a) - rank(b));
};

// Read everything about one picked audio file. Never throws: problems end up in status/error.
export async function analyzeItem(
    item: IngestItem,
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal
): Promise<IngestDraft> {
    const file = item.audio.file;
    const draft: IngestDraft = {
        key: item.key,
        item,
        status: 'analyzing',
        progress: 0,
        error: null,
        note: null,
        sha256: null,
        parsed: null,
        sniff: null,
        formatLabel: extOf(file.name).toUpperCase(),
        badge: null,
        playableHere: false,
        title: titleFromName(file.name),
        artists: [],
        album: '',
        albumArtist: '',
        year: null,
        lyrics: [],
        cover: null,
        slices: null,
        trackIds: []
    };
    try {
        draft.sniff = await sniffAudio(file);
        if (draft.sniff.container === 'unknown') throw new Error('认不出这个文件的格式。');
        draft.parsed = await readAudioMetadata(file, file.name);
        const p = draft.parsed;
        draft.formatLabel = formatLabel(p);
        draft.badge = qualityBadge(p.lossless, p.sampleRate);
        draft.playableHere =
            canBrowserPlay(draft.sniff.container, p.codec, browserFamily(navigator.userAgent)) !== 'no';
        draft.title = p.title?.trim() || draft.title;
        draft.artists = p.artists.filter(Boolean);
        draft.album = p.album?.trim() ?? '';
        draft.albumArtist = p.albumArtist?.trim() ?? '';
        draft.year = p.year;
        if (p.mojibake) draft.note = `标签按 ${p.mojibake.toUpperCase()} 修复了乱码`;
        draft.lyrics = await collectLyrics(item, p);
        if (item.cover) draft.cover = { source: 'folder', blob: item.cover.file };
        else if (p.pictures.length) {
            const front = p.pictures.find((pic) => /front|cover/i.test(pic.type ?? '')) ?? p.pictures[0];
            draft.cover = { source: 'embedded', blob: new Blob([front.data as BlobPart], { type: front.mime }) };
        }
        if (item.cue) {
            const { text } = decodeText(new Uint8Array(await item.cue.file.arrayBuffer()));
            const sheet = parseCue(text);
            const cueFile = matchCueFile(sheet, file.name);
            if (cueFile && p.sampleRate && p.durationSamples) {
                const slices = cueSlices(cueFile, p.sampleRate, p.durationSamples);
                if (slices.length > 1) {
                    draft.slices = slices.map((s) => ({
                        title: s.title || `第 ${s.number} 轨`,
                        performer: s.performer,
                        startSample: s.startSample,
                        endSample: s.endSample,
                        isrc: s.isrc
                    }));
                    draft.album = sheet.title || draft.album || draft.title;
                    draft.albumArtist = sheet.performer || draft.albumArtist;
                    draft.year = sheet.rem.DATE ?? draft.year;
                    draft.title = draft.album;
                }
            }
        }
        draft.sha256 = await sha256Blob(file, (done, total) => onProgress?.(total ? done / total : 1), signal);
        draft.status = draft.playableHere ? 'ready' : 'unsupported';
        if (!draft.playableHere)
            draft.note = `这台设备的浏览器放不了 ${draft.formatLabel.split(' ')[0]}；原件照样入库，换台设备或等省流版后再听`;
    } catch (e) {
        draft.status = 'failed';
        draft.error = e instanceof Error ? e.message : '这个文件读不出来。';
    }
    draft.progress = 1;
    return draft;
}

export type UploadContext = {
    backend: MusicBackend;
    worldId: string;
    visibility: MusicVisibility;
    copyFormat: CopyFormat | null;
    maxObjectBytes?: number;
    signal?: AbortSignal;
    onPhase: (status: DraftStatus, progress: number, note?: string) => void;
};

// A random short tag for copy file names (each copy is a new object; nothing is overwritten).
const shortId = () => Math.random().toString(36).slice(2, 10);

// Upload one object in parts when it is over the cap; progress covers all parts.
const storeObject = async (
    backend: MusicBackend,
    path: string,
    blob: Blob,
    contentType: string,
    maxObject: number,
    onProgress: (fraction: number) => void,
    signal?: AbortSignal
): Promise<{ partSize: number | null; partCount: number | null }> => {
    const layout = partLayout(blob.size, maxObject);
    const paths = objectPaths(path, layout.partCount);
    let done = 0;
    for (let i = 0; i < paths.length; i++) {
        const from = layout.partSize ? i * layout.partSize : 0;
        const piece = layout.partSize ? blob.slice(from, Math.min(blob.size, from + layout.partSize)) : blob;
        await backend.uploadObject(paths[i], piece, {
            contentType: layout.partCount ? 'application/octet-stream' : contentType,
            onProgress: (sent) => onProgress(blob.size ? (done + sent) / blob.size : 1),
            signal
        });
        done += piece.size;
        onProgress(blob.size ? done / blob.size : 1);
    }
    return layout;
};

const albumKey = (d: IngestDraft) =>
    [d.albumArtist || d.artists[0] || '', d.album, d.year ?? ''].map((s) => s.trim().toLowerCase()).join('|');

// Upload, ingest and (where possible) copy one analysed draft. Returns the new track ids.
export async function uploadDraft(draft: IngestDraft, ctx: UploadContext): Promise<string[]> {
    const { backend, worldId, signal } = ctx;
    const maxObject = ctx.maxObjectBytes ?? DEFAULT_MAX_OBJECT_BYTES;
    const p = draft.parsed;
    const file = draft.item.audio.file;
    if (!p || !draft.sha256 || !draft.sniff) throw new Error('还没读完这个文件。');

    // 1. already in this world?
    const [existing] = await backend.existingHashes(worldId, [draft.sha256]);
    if (existing && !existing.readable) {
        ctx.onPhase('taken', 1, 'TA 已经传过这首，并设成了仅自己可见');
        return [];
    }
    if (existing && !existing.mine) {
        ctx.onPhase('duplicate', 1, '曲库里已经有这首');
        return [];
    }

    // 2. reserve and upload (or resume, or skip when the bytes are already stored)
    ctx.onPhase('uploading', 0);
    const layout = partLayout(file.size, maxObject);
    const reserved = await backend.reserveFile({
        worldId,
        sha256: draft.sha256,
        ext: extOf(file.name),
        sizeBytes: file.size,
        partSize: layout.partSize,
        partCount: layout.partCount,
        originalName: file.name,
        relativePath: draft.item.audio.path,
        container: draft.sniff.container,
        codec: p.codec,
        lossless: p.lossless,
        sampleRate: p.sampleRate,
        bitDepth: p.bitDepth,
        channels: p.channels,
        durationSamples: p.durationSamples,
        audioMd5: p.audioMd5
    });
    if (reserved.status === 'uploading') {
        await storeObject(
            backend,
            reserved.path,
            file,
            musicMimeOf(file.name),
            reserved.partSize ? reserved.partSize : maxObject,
            (f) => ctx.onPhase('uploading', f),
            signal
        );
        await backend.finishUpload(reserved.id);
    }
    ctx.onPhase('processing', 0);

    // 3. cover sizes (a cover that fails to process is skipped, not fatal)
    let artwork: IngestPayload['artwork'] = null;
    if (draft.cover) {
        try {
            const art = await prepareArtwork(draft.cover.blob);
            const variants: Record<string, string> = {};
            for (const v of art.variants) {
                const path = artworkPath(worldId, art.sha256, v);
                await backend.uploadObject(path, v.blob, { contentType: v.contentType, signal });
                variants[String(v.size)] = path;
            }
            artwork = {
                sha256: art.sha256,
                source: draft.cover.source,
                base_path: `${worldId}/art/${art.sha256}`,
                width: art.width,
                height: art.height,
                variants,
                palette: art.palette
            };
        } catch (e) {
            draft.note = `封面没处理成：${e instanceof Error ? e.message : '未知原因'}`;
        }
    }
    ctx.onPhase('processing', 0.5);

    // 4. one transaction for the rows
    const rate = p.sampleRate ?? 0;
    const gain = {
        track_gain: p.gain.trackGain,
        track_peak: p.gain.trackPeak,
        album_gain: p.gain.albumGain,
        album_peak: p.gain.albumPeak
    };
    const mainLyrics: IngestLyrics[] = draft.lyrics.map((l) => ({
        kind: l.kind,
        lang: l.lang,
        format: l.format,
        synced: l.synced,
        word_synced: l.word_synced,
        offset_ms: l.offset_ms,
        raw_text: l.raw_text,
        source: l.source
    }));
    const tracks: IngestTrack[] = draft.slices
        ? draft.slices.map((s, i) => ({
              title: s.title,
              artists: s.performer ? [s.performer] : draft.artists,
              track_no: i + 1,
              start_sample: s.startSample,
              end_sample: s.endSample,
              duration_ms: rate ? Math.round(((s.endSample - s.startSample) / rate) * 1000) : 0,
              isrc: s.isrc || null,
              gain: null,
              tags: { cue: true },
              tags_raw: {}
          }))
        : [
              {
                  title: draft.title,
                  artists: draft.artists,
                  disc_no: p.discNo,
                  track_no: p.trackNo,
                  duration_ms: Math.round(p.durationMs ?? 0),
                  isrc: p.isrc,
                  gain,
                  tags: { year: draft.year, genre: p.genre, mojibake: p.mojibake },
                  tags_raw: p.tagsRaw,
                  lyrics: mainLyrics
              }
          ];
    const trackIds = await backend.ingest({
        world_id: worldId,
        file_id: reserved.id,
        visibility: ctx.visibility,
        album: draft.album
            ? { key: albumKey(draft), title: draft.album, album_artist: draft.albumArtist, release_date: draft.year }
            : null,
        artwork,
        rendition: { bitrate: p.bitrate ? Math.round(p.bitrate) : null },
        tracks
    });
    draft.trackIds = trackIds;

    // 5. compact copies: only worth it for lossless or very high-bitrate originals
    const worthCopy = p.lossless || (p.bitrate ?? 0) > 330_000;
    if (ctx.copyFormat && worthCopy && draft.playableHere) {
        try {
            for (let i = 0; i < trackIds.length; i++) {
                const slice = draft.slices?.[i];
                await makeCopy(
                    file,
                    trackIds[i],
                    slice && rate ? { startSec: slice.startSample / rate, endSec: slice.endSample / rate } : {},
                    {
                        ...ctx,
                        maxObjectBytes: maxObject,
                        onPhase: (status, f) => ctx.onPhase(status, (i + f) / trackIds.length)
                    }
                );
            }
        } catch (e) {
            if ((e as Error).name === 'AbortError') throw e;
            draft.note = `省流版没做成（${e instanceof Error ? e.message : '未知原因'}），原件已入库`;
        }
    } else if (!ctx.copyFormat && worthCopy) {
        draft.note = '这台设备做不了省流版，原件已入库；以后在电脑上点「生成省流版」';
    }
    ctx.onPhase('done', 1, draft.note ?? undefined);
    return trackIds;
}

// Make, store and record one compact copy of a track (a CUE slice is trimmed out of its album).
export async function makeCopy(
    source: Blob,
    trackId: string,
    window: { startSec?: number; endSec?: number },
    ctx: UploadContext
): Promise<void> {
    if (!ctx.copyFormat) throw new Error('这台设备做不了省流版。');
    const maxObject = ctx.maxObjectBytes ?? DEFAULT_MAX_OBJECT_BYTES;
    ctx.onPhase('copying', 0);
    // the encoder library loads only when a copy is actually made
    const { makeCompactCopy } = await import('@/lib/music/transcode');
    const copy = await makeCompactCopy(source, {
        format: ctx.copyFormat,
        ...window,
        onProgress: (f) => ctx.onPhase('copying', f * 0.7),
        signal: ctx.signal
    });
    const kbps = Math.round(copy.format.bitrate / 1000);
    const path = `${ctx.worldId}/r/${trackId}/${copy.format.codec}${kbps}-${shortId()}.${copy.format.ext}`;
    const layout = await storeObject(
        ctx.backend,
        path,
        copy.blob,
        copy.format.mime,
        maxObject,
        (f) => ctx.onPhase('copying', 0.7 + f * 0.3),
        ctx.signal
    );
    await ctx.backend.recordCopy(trackId, {
        path,
        container: copy.format.container,
        codec: copy.format.codec,
        sample_rate: copy.sampleRate,
        channels: copy.channels,
        bitrate: Math.round(copy.bitrate),
        size_bytes: copy.blob.size,
        part_size: layout.partSize,
        part_count: layout.partCount,
        params: { made_on: navigator.userAgent.slice(0, 120), target_bitrate: copy.format.bitrate }
    });
}
