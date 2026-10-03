// metadata.ts — tags and stream facts of one picked audio file, normalized for the library: read with
// music-metadata (imported on demand, so only the upload flow loads it), then corrected with what the
// container header states exactly (sniff.ts readAudioHeader: FLAC sample count and audio MD5, ALAC
// hi-res sample rates, float WAV) and with album-level mojibake repair (text.ts). The raw tag values are
// kept unrepaired in tagsRaw so the repair can be undone.
// Feature doc: ai/features/music/music.md (上传与入库; 数据模型 tags / tags_raw).
import type { IAudioMetadata } from 'music-metadata';
import { serializeLrc, type LyricLine } from '@/lib/music/lyrics';
import { readAudioHeader, type AudioHeader } from '@/lib/music/sniff';
import { decodeMojibake, detectAlbumMojibake, type TextEncodingName } from '@/lib/music/text';

export type ParsedPicture = { mime: string; data: Uint8Array; type: string | null };
export type ParsedGain = {
    trackGain: number | null;
    trackPeak: number | null;
    albumGain: number | null;
    albumPeak: number | null;
};
export type ParsedAudio = {
    container: string;
    codec: string;
    lossless: boolean;
    sampleRate: number | null;
    bitDepth: number | null;
    channels: number | null;
    durationSamples: number | null;
    durationMs: number | null;
    bitrate: number | null;
    /** FLAC STREAMINFO MD5 of the decoded audio (WavPack's when it stores one), lowercase hex */
    audioMd5: string | null;
    title: string | null;
    artists: string[];
    album: string | null;
    albumArtist: string | null;
    trackNo: number | null;
    discNo: number | null;
    year: string | null;
    genre: string | null;
    isrc: string | null;
    mbidRecording: string | null;
    mbidRelease: string | null;
    /** embedded lyrics as stored (LRC or plain text); SYLT is converted to LRC */
    lyrics: string | null;
    gain: ParsedGain;
    pictures: ParsedPicture[];
    /** native tags flattened: key -> string values; binary values are skipped and nothing is repaired */
    tagsRaw: Record<string, string[]>;
    /** the encoding title/artists/album/albumArtist were repaired with, when they were */
    mojibake: TextEncodingName | null;
};

type Native = IAudioMetadata['native'];
type SyncedText = { text: string; timestamp?: number };

// Codecs that keep the original samples, and so the only ones where a bit depth describes the file (lossy
// decoders report an arbitrary one).
const LOSSLESS_CODECS = new Set(['flac', 'alac', 'pcm', 'ape', 'tta', 'dsd', 'wavpack']);
// Native tag ids (case-insensitive, after the last ':') that hold unsynchronized lyrics text.
const LYRICS_IDS = new Set(['USLT', 'ULT', '©LYR', 'LYRICS', 'UNSYNCEDLYRICS', 'UNSYNCED LYRICS', 'WM/LYRICS']);
// Separators that split a single artist string into several artists.
const ARTIST_SEPARATORS = /\s+\/\s+|\s*;\s+|\s*、\s*|\s+(?:feat|ft)\.\s+|\s+&\s+/i;

// A trimmed string, or null when empty or not a string.
const clean = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text ? text : null;
};

// The short codec name ('flac', 'alac', 'aac', 'mp3', 'pcm', 'opus', 'vorbis', 'wavpack', 'ape', 'dsd', …)
// from the sniffed container and music-metadata's codec label.
const codecName = (container: string, header: AudioHeader | null, label: string): string => {
    const text = label.toLowerCase();
    if (container === 'wavpack' || container === 'ape' || container === 'tta') return container;
    if (container === 'dsf' || container === 'dff' || text.includes('dsd')) return 'dsd';
    if (container === 'wav' || container === 'aiff') {
        const hint = header?.codecHint ?? null;
        if (hint === 'pcm' || hint === 'float') return 'pcm';
        if (hint) return hint;
    }
    if (text.includes('flac')) return 'flac';
    if (text.includes('alac')) return 'alac';
    if (text.includes('aac') || text === 'mp4a') return 'aac';
    if (text.includes('layer 3') || text.includes('mpeg/l3') || text === 'mp3') return 'mp3';
    if (text.includes('layer 2')) return 'mp2';
    if (text.includes('opus')) return 'opus';
    if (text.includes('vorbis')) return 'vorbis';
    if (text.startsWith('pcm') || text.includes('non-pcm') || text.includes('float')) return 'pcm';
    return text.split(/[\s/]/)[0] || 'unknown';
};

// The container name: the sniffed one, or music-metadata's label when sniffing did not recognize the file;
// a raw ADTS stream (sniffed as MPEG audio carrying AAC) is called 'adts'.
const containerName = (header: AudioHeader | null, label: string): string => {
    if (header && header.container !== 'unknown') {
        return header.container === 'mp3' && header.codecHint === 'aac' ? 'adts' : header.container;
    }
    const text = label.toLowerCase();
    if (text.startsWith('ebml')) return 'webm';
    if (text.startsWith('m4a') || text.startsWith('mp4') || text.includes('isom')) return 'mp4';
    if (text === 'mpeg') return 'mp3';
    return text.split(/[\s/]/)[0] || 'unknown';
};

// One native tag value as text: strings as they are, numbers and booleans spelled out, the text of
// comment-like objects (USLT, COMM); null for pictures and other binary or structured values.
const tagText = (value: unknown): string | null => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value && typeof value === 'object' && !ArrayBuffer.isView(value) && !('data' in value)) {
        const text = (value as { text?: unknown }).text;
        if (typeof text === 'string') return text;
    }
    return null;
};

// Every native tag flattened to key -> string values (binary skipped), across all tag formats present.
const flattenTags = (native: Native): Record<string, string[]> => {
    const flat: Record<string, string[]> = {};
    for (const tags of Object.values(native)) {
        for (const tag of tags) {
            const text = tagText(tag.value);
            if (text !== null) (flat[tag.id] ??= []).push(text);
        }
    }
    return flat;
};

// The original slash-joined value of an ID3v2.2/2.3 artist frame that music-metadata split on '/'
// ("AC/DC" -> ["AC", "DC"]); null when no such split happened.
const id3SlashJoined = (md: IAudioMetadata, frames: string[]): string | null => {
    for (const type of ['ID3v2.3', 'ID3v2.2']) {
        const values = (md.native[type] ?? []).filter((tag) => frames.includes(tag.id)).map((tag) => tag.value);
        if (values.length < 2 || values.some((value) => typeof value !== 'string')) continue;
        const nullSeparated = md.quality.warnings.some((warning) =>
            frames.some((frame) => warning.message.includes(`${frame} uses non standard null-separator`))
        );
        if (!nullSeparated) return values.join('/');
    }
    return null;
};

// The artist values as the tags hold them: an ID3v2.3 slash split undone, else music-metadata's list.
const artistValues = (md: IAudioMetadata): string[] => {
    const list = (md.common.artists ?? (md.common.artist ? [md.common.artist] : []))
        .map((value) => value.trim())
        .filter(Boolean);
    const joined = id3SlashJoined(md, ['TPE1', 'TP1']);
    return joined && joined.split('/').join('\u0000') === list.join('\u0000') ? [joined] : list;
};

// The album artist as the tags hold it, with an ID3v2.3 slash split undone.
const albumArtistValue = (md: IAudioMetadata): string | null => {
    const joined = id3SlashJoined(md, ['TPE2', 'TP2']);
    const value = clean(md.common.albumartist);
    return joined && value === joined.split('/')[0] ? joined : value;
};

// Chinese, Japanese or Korean script anywhere in a string.
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]/;

// A bare '/' between names written in CJK script ("周杰伦/费玉清", the NetEase habit) separates
// artists; between Latin names it is usually part of one ("AC/DC"), so those stay whole.
const splitCjkSlash = (part: string): string[] => {
    const pieces = part.split('/');
    return pieces.length > 1 && pieces.every((p) => p.trim() && CJK.test(p)) ? pieces : [part];
};

// Split one artist string on the common separators; several tag values are kept as they are.
const splitArtists = (values: string[]): string[] => {
    const parts = values.length === 1 ? values[0].split(ARTIST_SEPARATORS).flatMap(splitCjkSlash) : values;
    return [...new Set(parts.map((part) => part.trim()).filter(Boolean))];
};

// SYLT synchronized lyrics as LRC text: one line per entry, or, when entries are syllables that start new
// lines with a line break, word-timed lines. MPEG-frame timestamps are converted with the frame length.
const syltToLrc = (value: unknown, sampleRate: number | null): string | null => {
    const sylt = value as { syncText?: SyncedText[]; timeStampFormat?: number } | null;
    const entries = (sylt?.syncText ?? []).filter((entry) => typeof entry.timestamp === 'number');
    if (!entries.length) return null;
    const frameMs = sampleRate ? ((sampleRate >= 32000 ? 1152 : 576) * 1000) / sampleRate : 26;
    // A SYLT timestamp in milliseconds (format 1 counts MPEG frames, format 2 is already milliseconds).
    const toMs = (timestamp: number) => Math.round(sylt?.timeStampFormat === 1 ? timestamp * frameMs : timestamp);
    const syllables = entries.some((entry) => /^[\r\n]/.test(entry.text));
    const lines: LyricLine[] = [];
    for (const entry of entries) {
        const start = toMs(entry.timestamp as number);
        const text = entry.text.replace(/^[\r\n]+/, '');
        const current = lines[lines.length - 1];
        if (syllables && current?.words && !/^[\r\n]/.test(entry.text)) {
            current.words.push({ start, end: null, text });
            current.text += text;
        } else {
            lines.push(
                syllables ? { start, end: null, text, words: [{ start, end: null, text }] } : { start, end: null, text }
            );
        }
    }
    return serializeLrc({ synced: true, wordSynced: syllables, offset: 0, lines, meta: {} });
};

// The embedded lyrics: every USLT/©lyr/LYRICS/UNSYNCEDLYRICS text and converted SYLT, preferring the first
// one that carries timestamps, else the first non-empty one.
const embeddedLyrics = (native: Native, sampleRate: number | null): string | null => {
    const found: string[] = [];
    for (const tags of Object.values(native)) {
        for (const tag of tags) {
            const id = tag.id.toUpperCase();
            const key = id.includes(':') ? id.slice(id.lastIndexOf(':') + 1) : id;
            const text = LYRICS_IDS.has(key)
                ? tagText(tag.value)
                : key === 'SYLT' || key === 'SLT'
                  ? syltToLrc(tag.value, sampleRate)
                  : null;
            if (text?.trim()) found.push(text);
        }
    }
    return found.find((text) => /\[\d+:\d{1,2}(?:[.:]\d{1,3})?\]/.test(text)) ?? found[0] ?? null;
};

// An EBU R128 gain tag (Q7.8 dB relative to −23 LUFS, Opus convention) as a ReplayGain 2.0 gain (−18 LUFS).
const r128Gain = (native: Native, id: string): number | null => {
    for (const tags of Object.values(native)) {
        const tag = tags.find((item) => item.id.toUpperCase() === id);
        const value = tag ? Number.parseInt(String(tag.value), 10) : Number.NaN;
        if (Number.isFinite(value)) return value / 256 + 5;
    }
    return null;
};

// A finite number or null.
const finite = (value: number | undefined | null): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

// Embedded pictures with their MIME types, the front cover first.
const picturesOf = (md: IAudioMetadata): ParsedPicture[] => {
    const pictures = (md.common.picture ?? []).map((picture) => {
        const format = picture.format.toLowerCase();
        const mime = format.includes('/') ? format : `image/${format === 'jpg' ? 'jpeg' : format}`;
        return { mime, data: picture.data, type: picture.type ?? null };
    });
    return pictures.sort((a, b) => Number(b.type === 'Cover (front)') - Number(a.type === 'Cover (front)'));
};

// Length of the stream in sample frames and milliseconds. FLAC STREAMINFO is exact; for MP3 the duration
// (Xing/LAME header or a full scan) beats music-metadata's file-size estimate of the sample count; otherwise
// the container's sample count, else duration × rate. Opus counts at 48 kHz without its pre-skip.
const streamLength = (
    format: IAudioMetadata['format'],
    header: AudioHeader | null,
    codec: string,
    sampleRate: number | null
): { samples: number | null; ms: number | null } => {
    const seconds = finite(format.duration);
    let samples: number | null = null;
    if (header?.totalSamples) samples = header.totalSamples;
    else if (codec === 'mp3' && seconds && sampleRate) samples = Math.round(seconds * sampleRate);
    else if (finite(format.numberOfSamples) !== null) samples = format.numberOfSamples as number;
    else if (seconds && sampleRate) samples = Math.round(seconds * sampleRate);
    if (samples !== null && sampleRate) return { samples, ms: Math.round((samples * 1000) / sampleRate) };
    return { samples, ms: seconds ? Math.round(seconds * 1000) : null };
};

// An audio MD5 stored by the container (WavPack) as lowercase hex; null when absent or all zero.
const storedMd5 = (bytes: Uint8Array | undefined): string | null =>
    bytes && bytes.some((byte) => byte !== 0)
        ? Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
        : null;

// Metadata with no tags and no stream facts, for formats music-metadata cannot parse (TTA).
const emptyMetadata = (): IAudioMetadata => ({
    format: { tagTypes: [], trackInfo: [] },
    native: {},
    quality: { warnings: [] },
    common: { track: { no: null, of: null }, disk: { no: null, of: null }, movementIndex: { no: null, of: null } }
});

// Read the tags and stream facts of an audio file. A TTA file, which music-metadata does not parse, gets
// the facts of its header and no tags. Throws a user-facing error when the file cannot be read as audio.
export const readAudioMetadata = async (blob: Blob, fileName: string): Promise<ParsedAudio> => {
    const { parseBlob } = await import('music-metadata');
    const file = blob instanceof File ? blob : new File([blob], fileName, { type: blob.type });
    const header = await readAudioHeader(blob).catch(() => null);
    let md: IAudioMetadata;
    try {
        md = await parseBlob(file, { duration: true });
    } catch (error) {
        if (header?.container !== 'tta') {
            throw new Error('读不出这个文件的音频信息，可能已损坏或格式不受支持', { cause: error });
        }
        md = emptyMetadata();
    }
    const format = md.format;
    const container = containerName(header, format.container ?? '');
    const codec = codecName(container, header, format.codec ?? '');
    const lossless = codec === 'wavpack' ? format.lossless !== false : LOSSLESS_CODECS.has(codec);

    const sampleRate = codec === 'opus' ? 48000 : finite(header?.sampleRate) || finite(format.sampleRate) || null;
    const length = streamLength(format, header, codec, sampleRate);

    const common = md.common;
    const rawTitle = clean(common.title);
    const rawArtists = artistValues(md);
    const rawAlbum = clean(common.album);
    const rawAlbumArtist = albumArtistValue(md);
    const named = [rawTitle, ...rawArtists, rawAlbum, rawAlbumArtist].filter((value): value is string => !!value);
    const mojibake = detectAlbumMojibake(named);
    // A tag value with the album decision applied (unchanged when there is none).
    const repaired = (value: string | null): string | null =>
        value && mojibake ? decodeMojibake(value, mojibake) : value;
    const year = common.year ? String(common.year) : (/^\d{4}/.exec(common.date ?? '')?.[0] ?? null);

    return {
        container,
        codec,
        lossless,
        sampleRate,
        bitDepth: LOSSLESS_CODECS.has(codec) ? finite(header?.bitDepth) || finite(format.bitsPerSample) || null : null,
        channels: finite(header?.channels) || finite(format.numberOfChannels) || null,
        durationSamples: length.samples,
        durationMs: length.ms,
        bitrate: finite(format.bitrate) === null ? null : Math.round(format.bitrate as number),
        audioMd5: header?.md5 ?? storedMd5(format.audioMD5),
        title: repaired(rawTitle),
        artists: splitArtists(rawArtists.map((value) => repaired(value) as string)),
        album: repaired(rawAlbum),
        albumArtist: repaired(rawAlbumArtist),
        trackNo: finite(common.track.no),
        discNo: finite(common.disk.no),
        year,
        genre: repaired(clean(common.genre?.find((value) => clean(value)))),
        isrc: clean(common.isrc?.[0]),
        mbidRecording: clean(common.musicbrainz_recordingid),
        mbidRelease: clean(common.musicbrainz_albumid),
        lyrics: repaired(embeddedLyrics(md.native, sampleRate)),
        gain: {
            trackGain:
                finite(common.replaygain_track_gain?.dB) ??
                finite(format.trackGain) ??
                r128Gain(md.native, 'R128_TRACK_GAIN'),
            trackPeak: finite(common.replaygain_track_peak?.ratio) ?? finite(format.trackPeakLevel),
            albumGain:
                finite(common.replaygain_album_gain?.dB) ??
                finite(format.albumGain) ??
                r128Gain(md.native, 'R128_ALBUM_GAIN'),
            albumPeak: finite(common.replaygain_album_peak?.ratio)
        },
        pictures: picturesOf(md),
        tagsRaw: flattenTags(md.native),
        mojibake
    };
};
