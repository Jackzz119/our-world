// sniff.ts — what an audio file really is, judged from its bytes instead of its extension, and whether a
// browser family can play it directly (the upload screen flags the rest before anything is sent). Also
// reads the exact stream facts some containers state in their headers (FLAC STREAMINFO, the ALAC magic
// cookie, the WAV fmt chunk, the TTA header) for metadata.ts, which music-metadata leaves out or gets wrong.
// Feature doc: ai/features/music/music.md (上传与入库: 放不了的格式先标出).

export type SniffResult = {
    container:
        | 'flac'
        | 'mp3'
        | 'mp4'
        | 'wav'
        | 'aiff'
        | 'ogg'
        | 'webm'
        | 'ape'
        | 'wavpack'
        | 'dsf'
        | 'dff'
        | 'tta'
        | 'unknown';
    codecHint: string | null;
    mime: string;
};
export type BrowserFamily = 'chromium' | 'firefox' | 'safari';
/** Header facts, each null when the container does not state it in a place sniffing reads. */
export type AudioHeader = SniffResult & {
    sampleRate: number | null;
    bitDepth: number | null;
    channels: number | null;
    /** sample frames (one per channel set), from FLAC STREAMINFO or the TTA header */
    totalSamples: number | null;
    /** FLAC STREAMINFO MD5 of the decoded audio, lowercase hex; null when absent or all zero */
    md5: string | null;
};

type Container = SniffResult['container'];

// Bytes read from the start of the file (and after an ID3v2 tag) for magic numbers and headers.
const HEAD_BYTES = 64 * 1024;
// How far into the file a WebM CodecID or an Ogg codec header is looked for.
const SCAN_BYTES = 64 * 1024;
// Most MP4 boxes visited while looking for the audio sample description.
const MAX_BOXES = 256;

// The MIME type stored and sent for each container (storage.ts uses the same names by extension).
const MIME: Record<Container, string> = {
    flac: 'audio/flac',
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    wav: 'audio/wav',
    aiff: 'audio/aiff',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    ape: 'audio/x-ape',
    wavpack: 'audio/x-wavpack',
    dsf: 'audio/x-dsf',
    dff: 'audio/x-dff',
    tta: 'audio/x-tta',
    unknown: 'application/octet-stream'
};

// WAV/RIFF format tags (wFormatTag, or the first two bytes of the extensible SubFormat GUID).
const WAVE_FORMATS: Record<number, string> = {
    0x0001: 'pcm',
    0x0003: 'float',
    0x0002: 'adpcm',
    0x0011: 'adpcm',
    0x0006: 'alaw',
    0x0007: 'mulaw',
    0x0050: 'mp2',
    0x0055: 'mp3'
};

// AIFF-C compression types that are plain integer or float PCM.
const AIFC_PCM: Record<string, string> = {
    NONE: 'pcm',
    twos: 'pcm',
    sowt: 'pcm',
    in24: 'pcm',
    in32: 'pcm',
    'raw ': 'pcm',
    fl32: 'float',
    FL32: 'float',
    fl64: 'float',
    FL64: 'float'
};

type Reader = { size: number; read: (offset: number, length: number) => Promise<Uint8Array> };

// Random access to a blob that serves reads inside the already-loaded head without touching the blob.
const blobReader = (blob: Blob, head: Uint8Array): Reader => ({
    size: blob.size,
    read: async (offset, length) => {
        const end = Math.min(offset + length, blob.size);
        if (offset >= end) return new Uint8Array(0);
        if (end <= head.length) return head.subarray(offset, end);
        return new Uint8Array(await blob.slice(offset, end).arrayBuffer());
    }
});

// The latin1 text of bytes[offset, offset + length) (four-character codes, magic numbers).
const ascii = (bytes: Uint8Array, offset: number, length: number): string =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));

// Big-endian 16-bit integer at offset.
const u16be = (bytes: Uint8Array, offset: number): number => (bytes[offset] << 8) | bytes[offset + 1];

// Big-endian 32-bit unsigned integer at offset.
const u32be = (bytes: Uint8Array, offset: number): number =>
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;

// Little-endian 16-bit integer at offset.
const u16le = (bytes: Uint8Array, offset: number): number => bytes[offset] | (bytes[offset + 1] << 8);

// Little-endian 32-bit unsigned integer at offset.
const u32le = (bytes: Uint8Array, offset: number): number =>
    (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

// Position of an ASCII pattern within the first `limit` bytes, or -1.
const indexOfAscii = (bytes: Uint8Array, pattern: string, limit = bytes.length): number => {
    const end = Math.min(limit, bytes.length) - pattern.length;
    for (let i = 0; i <= end; i++) {
        let k = 0;
        while (k < pattern.length && bytes[i + k] === pattern.charCodeAt(k)) k += 1;
        if (k === pattern.length) return i;
    }
    return -1;
};

// A header result with only the container identified.
const result = (container: Container, codecHint: string | null, mime = MIME[container]): AudioHeader => ({
    container,
    codecHint,
    mime,
    sampleRate: null,
    bitDepth: null,
    channels: null,
    totalSamples: null,
    md5: null
});

// Total size of an ID3v2 tag that starts at bytes[0] (header, syncsafe body size, optional footer).
const id3Size = (bytes: Uint8Array): number => {
    const body = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    return 10 + body + (bytes[5] & 0x10 ? 10 : 0);
};

// The codec of an MPEG audio frame header or ADTS AAC header at bytes[0], or null when there is none.
const mpegCodec = (bytes: Uint8Array): string | null => {
    if (bytes.length < 4 || bytes[0] !== 0xff || (bytes[1] & 0xe0) !== 0xe0) return null;
    const layer = (bytes[1] >> 1) & 3;
    if (layer === 0) return (bytes[1] & 0xf6) === 0xf0 ? 'aac' : null;
    if (((bytes[1] >> 3) & 3) === 1 || bytes[2] >> 4 === 15 || ((bytes[2] >> 2) & 3) === 3) return null;
    return layer === 1 ? 'mp3' : layer === 2 ? 'mp2' : 'mp1';
};

// FLAC: STREAMINFO is always the first metadata block (rate, channels, depth, sample count, audio MD5).
const flacHeader = (bytes: Uint8Array): AudioHeader => {
    const header = result('flac', 'flac');
    if (bytes.length < 42 || (bytes[4] & 0x7f) !== 0) return header;
    const info = 8;
    header.sampleRate = (bytes[info + 10] << 12) | (bytes[info + 11] << 4) | (bytes[info + 12] >> 4);
    header.channels = ((bytes[info + 12] >> 1) & 7) + 1;
    header.bitDepth = (((bytes[info + 12] & 1) << 4) | (bytes[info + 13] >> 4)) + 1;
    const total = (bytes[info + 13] & 0x0f) * 0x100000000 + u32be(bytes, info + 14);
    header.totalSamples = total > 0 ? total : null;
    const md5 = bytes.subarray(info + 18, info + 34);
    header.md5 = md5.some((byte) => byte !== 0)
        ? Array.from(md5, (byte) => byte.toString(16).padStart(2, '0')).join('')
        : null;
    return header;
};

// WAV (RIFF, RF64, BW64): the fmt chunk gives the format tag (resolved through WAVE_FORMAT_EXTENSIBLE),
// channels, rate and bit depth.
const waveHeader = (bytes: Uint8Array): AudioHeader => {
    const header = result('wav', null);
    for (let pos = 12; pos + 8 <= bytes.length; ) {
        const id = ascii(bytes, pos, 4);
        const size = u32le(bytes, pos + 4);
        if (id === 'fmt ' && pos + 24 <= bytes.length) {
            const data = pos + 8;
            let tag = u16le(bytes, data);
            if (tag === 0xfffe && size >= 40 && data + 26 <= bytes.length) tag = u16le(bytes, data + 24);
            header.codecHint = WAVE_FORMATS[tag] ?? null;
            header.channels = u16le(bytes, data + 2);
            header.sampleRate = u32le(bytes, data + 4);
            header.bitDepth = u16le(bytes, data + 14) || null;
            return header;
        }
        if (id === 'data') break;
        pos += 8 + size + (size & 1);
    }
    return header;
};

// TTA: the TTA1 header gives channels, bit depth, rate and the sample count (music-metadata reads none of it).
const ttaHeader = (bytes: Uint8Array): AudioHeader => {
    const header = result('tta', 'tta');
    if (bytes.length < 18) return header;
    header.channels = u16le(bytes, 6) || null;
    header.bitDepth = u16le(bytes, 8) || null;
    header.sampleRate = u32le(bytes, 10) || null;
    header.totalSamples = u32le(bytes, 14) || null;
    return header;
};

// An 80-bit IEEE extended float (the AIFF sample rate) as a number.
const extended80 = (bytes: Uint8Array, offset: number): number => {
    const exponent = (((bytes[offset] & 0x7f) << 8) | bytes[offset + 1]) - 16383;
    const high = u32be(bytes, offset + 2);
    const low = u32be(bytes, offset + 6);
    const value = high * 2 ** (exponent - 31) + low * 2 ** (exponent - 63);
    return bytes[offset] & 0x80 ? -value : value;
};

// AIFF / AIFF-C: the COMM chunk gives channels, sample frames, bit depth, rate and (AIFF-C) compression.
const aiffHeader = (bytes: Uint8Array, aifc: boolean): AudioHeader => {
    const header = result('aiff', aifc ? null : 'pcm');
    for (let pos = 12; pos + 8 <= bytes.length; ) {
        const id = ascii(bytes, pos, 4);
        const size = u32be(bytes, pos + 4);
        if (id === 'COMM' && pos + 26 <= bytes.length) {
            const data = pos + 8;
            header.channels = u16be(bytes, data);
            header.bitDepth = u16be(bytes, data + 6) || null;
            header.sampleRate = Math.round(extended80(bytes, data + 8)) || null;
            if (aifc && pos + 30 <= bytes.length) {
                const compression = ascii(bytes, data + 18, 4);
                header.codecHint = AIFC_PCM[compression] ?? compression.trim().toLowerCase();
            }
            return header;
        }
        if (id === 'SSND') break;
        pos += 8 + size + (size & 1);
    }
    return header;
};

// Ogg: the codec's identification header opens the first page; a multiplexed stream is searched.
const oggCodec = (bytes: Uint8Array): string | null => {
    const packet = bytes.length > 27 ? 27 + bytes[26] : bytes.length;
    const signatures: [string, string][] = [
        ['OpusHead', 'opus'],
        ['\x01vorbis', 'vorbis'],
        ['\x7fFLAC', 'flac'],
        ['Speex   ', 'speex']
    ];
    for (const [signature, codec] of signatures) if (ascii(bytes, packet, signature.length) === signature) return codec;
    for (const [signature, codec] of signatures) if (indexOfAscii(bytes, signature, SCAN_BYTES) >= 0) return codec;
    return null;
};

// WebM / Matroska: the first audio CodecID found in the head.
const matroskaCodec = (bytes: Uint8Array): string | null => {
    const ids: [string, string][] = [
        ['A_OPUS', 'opus'],
        ['A_VORBIS', 'vorbis'],
        ['A_FLAC', 'flac'],
        ['A_AAC', 'aac'],
        ['A_MPEG/L3', 'mp3'],
        ['A_ALAC', 'alac'],
        ['A_PCM', 'pcm']
    ];
    let best: { at: number; codec: string } | null = null;
    for (const [id, codec] of ids) {
        const at = indexOfAscii(bytes, id, SCAN_BYTES);
        if (at >= 0 && (!best || at < best.at)) best = { at, codec };
    }
    return best?.codec ?? null;
};

type Box = { type: string; start: number; end: number; body: number };

// The boxes laid end to end in [start, end), read header by header so large boxes (mdat, covers) are
// skipped without being loaded.
const listBoxes = async (reader: Reader, start: number, end: number): Promise<Box[]> => {
    const boxes: Box[] = [];
    for (let pos = start; pos + 8 <= end && boxes.length < MAX_BOXES; ) {
        const head = await reader.read(pos, 16);
        if (head.length < 8) break;
        let size = u32be(head, 0);
        let body = pos + 8;
        if (size === 1 && head.length >= 16) {
            size = u32be(head, 8) * 0x100000000 + u32be(head, 12);
            body = pos + 16;
        } else if (size === 0) {
            size = end - pos;
        }
        if (size < body - pos) break;
        boxes.push({ type: ascii(head, 4, 4), start: pos, end: Math.min(pos + size, end), body });
        pos += size;
    }
    return boxes;
};

// The first child box of a type inside a parent box.
const childBox = async (reader: Reader, parent: Box, type: string): Promise<Box | null> =>
    (await listBoxes(reader, parent.body, parent.end)).find((box) => box.type === type) ?? null;

// The first sample entry of the first sound track (moov/trak/mdia/minf/stbl/stsd), wherever moov sits
// (encoders that do not "fast start" put it after the audio data); the file's boxes begin at start.
const mp4AudioEntry = async (reader: Reader, start: number): Promise<Uint8Array | null> => {
    const moov = (await listBoxes(reader, start, reader.size)).find((box) => box.type === 'moov');
    if (!moov) return null;
    for (const trak of await listBoxes(reader, moov.body, moov.end)) {
        if (trak.type !== 'trak') continue;
        const mdia = await childBox(reader, trak, 'mdia');
        if (!mdia) continue;
        const hdlr = await childBox(reader, mdia, 'hdlr');
        if (hdlr && ascii(await reader.read(hdlr.body + 8, 4), 0, 4) !== 'soun') continue;
        const minf = await childBox(reader, mdia, 'minf');
        const stbl = minf && (await childBox(reader, minf, 'stbl'));
        const stsd = stbl && (await childBox(reader, stbl, 'stsd'));
        if (!stsd) continue;
        const table = await reader.read(stsd.body, Math.min(stsd.end - stsd.body, SCAN_BYTES));
        if (table.length < 16) continue;
        return table.subarray(8, 8 + Math.min(u32be(table, 8), table.length - 8));
    }
    return null;
};

// MP4: the codec from the sample entry ('mp4a', 'alac', 'flac', 'opus', …); for ALAC also the rate,
// depth and channels of its magic cookie (the entry's own 16-bit rate field cannot hold 96 kHz and up).
const mp4Header = async (reader: Reader, start: number): Promise<AudioHeader> => {
    const entry = await mp4AudioEntry(reader, start);
    if (!entry || entry.length < 36) return result('mp4', null);
    const codec = ascii(entry, 4, 4).trim().toLowerCase();
    const header = result('mp4', codec);
    if (codec === 'alac') {
        const cookie = indexOfAscii(entry.subarray(36), 'alac');
        const config = cookie >= 0 ? 36 + cookie + 8 : -1;
        if (config > 0 && config + 24 <= entry.length) {
            header.bitDepth = entry[config + 5];
            header.channels = entry[config + 9];
            header.sampleRate = u32be(entry, config + 20);
        }
    }
    return header;
};

// Identify the stream whose first bytes are `bytes`, found at `offset` in the file; null when no
// signature matches.
const identify = async (bytes: Uint8Array, offset: number, reader: Reader): Promise<AudioHeader | null> => {
    const magic = ascii(bytes, 0, 4);
    const form = ascii(bytes, 8, 4);
    if (magic === 'fLaC') return flacHeader(bytes);
    if ((magic === 'RIFF' || magic === 'RF64' || magic === 'BW64') && form === 'WAVE') return waveHeader(bytes);
    if (magic === 'FORM' && (form === 'AIFF' || form === 'AIFC')) return aiffHeader(bytes, form === 'AIFC');
    if (magic === 'FRM8') return result('dff', 'dsd');
    if (ascii(bytes, 4, 4) === 'ftyp') return mp4Header(reader, offset);
    if (magic === 'OggS') return result('ogg', oggCodec(bytes));
    if (magic === '\x1a\x45\xdf\xa3') {
        const matroska = indexOfAscii(bytes, 'matroska', 64) >= 0;
        return result('webm', matroskaCodec(bytes), matroska ? 'audio/x-matroska' : MIME.webm);
    }
    if (magic === 'MAC ') return result('ape', 'ape');
    if (magic === 'wvpk') return result('wavpack', 'wavpack');
    if (magic === 'DSD ') return result('dsf', 'dsd');
    if (magic === 'TTA1') return ttaHeader(bytes);
    const mpeg = mpegCodec(bytes);
    if (mpeg === 'aac') return result('mp3', 'aac', 'audio/aac');
    if (mpeg) return result('mp3', mpeg);
    return null;
};

// Identify a file and read the stream facts its header states. ID3v2 tags in front are skipped (FLAC,
// TTA and APE files carry them too); a file that only shows an ID3v2 tag is taken for MP3. MP4 container
// boxes are followed through the file to find the sample description.
export const readAudioHeader = async (blob: Blob): Promise<AudioHeader> => {
    const head = new Uint8Array(await blob.slice(0, Math.min(blob.size, HEAD_BYTES)).arrayBuffer());
    const reader = blobReader(blob, head);
    let bytes: Uint8Array = head;
    let offset = 0;
    let tagged = false;
    for (let guard = 0; guard < 4 && bytes.length >= 10 && ascii(bytes, 0, 3) === 'ID3'; guard++) {
        offset += id3Size(bytes);
        bytes = await reader.read(offset, HEAD_BYTES);
        tagged = true;
    }
    if (tagged) {
        let skip = 0;
        while (skip < Math.min(bytes.length, 4096) && bytes[skip] === 0) skip += 1;
        bytes = bytes.subarray(skip);
        offset += skip;
    }
    const found = await identify(bytes, offset, reader);
    if (found) return found;
    return tagged ? result('mp3', 'mp3') : result('unknown', null);
};

// Identify the container and codec of an audio file from its bytes.
export const sniffAudio = async (blob: Blob): Promise<SniffResult> => {
    const { container, codecHint, mime } = await readAudioHeader(blob);
    return { container, codecHint, mime };
};

// Whether a browser family plays a container/codec in a plain <audio> element, from a static matrix:
// FLAC, MP3, AAC and WAV everywhere; ALAC and AIFF in Safari only; Opus and Vorbis (Ogg or WebM) in
// Chromium and Firefox, and in Safari only from 17.4 (WebM) / 18.4 (Ogg), hence 'maybe'; APE, WavPack,
// DSD and TTA nowhere. Unknown codecs inside a playable container answer 'maybe'.
export const canBrowserPlay = (
    container: SniffResult['container'],
    codec: string | null,
    family: BrowserFamily
): 'yes' | 'maybe' | 'no' => {
    const safari = family === 'safari';
    switch (container) {
        case 'flac':
            return 'yes';
        case 'mp3':
            return codec === null || codec === 'mp3' || codec === 'aac' ? 'yes' : 'maybe';
        case 'wav':
            return codec === null || codec === 'pcm' || codec === 'float' ? 'yes' : 'maybe';
        case 'aiff':
            return safari ? 'yes' : 'no';
        case 'mp4':
            if (codec === 'alac') return safari ? 'yes' : 'no';
            if (codec === 'mp4a' || codec === 'aac') return 'yes';
            if (codec === 'drms' || codec === 'enca') return 'no';
            if (codec === 'flac' || codec === 'opus') return safari ? 'maybe' : 'yes';
            return 'maybe';
        case 'ogg':
        case 'webm':
            if (codec === 'opus' || codec === 'vorbis') return safari ? 'maybe' : 'yes';
            return 'maybe';
        default:
            return 'no';
    }
};

// The engine family behind a user agent string. Every iOS browser is WebKit, so iPhone and iPad count as
// Safari whatever the brand; unknown engines count as Chromium, the most common one.
export const browserFamily = (userAgent: string): BrowserFamily => {
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'safari';
    if (/Firefox\//.test(userAgent)) return 'firefox';
    if (/Chrome\/|Chromium\/|CriOS\/|Edg\/|OPR\//.test(userAgent)) return 'chromium';
    if (/AppleWebKit\//.test(userAgent)) return 'safari';
    return 'chromium';
};
