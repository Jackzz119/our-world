// quality.ts — how the library names a file's quality: the badge (Hi-Res / 无损 / 有损) and the short
// format label shown in rows and in the signal path. Kept apart from the upload code so the player
// can use it without loading the parsers. Feature doc: ai/features/music/music.md §二 (如实标注).

export type QualityBadge = 'hires' | 'lossless' | 'lossy' | null;

// Hi-Res follows Apple's line: lossless and above 48 kHz. Lossless at 44.1/48 kHz is 无损.
export const qualityBadge = (lossless: boolean | null, sampleRate: number | null): QualityBadge =>
    lossless === null ? null : lossless ? ((sampleRate ?? 0) > 48000 ? 'hires' : 'lossless') : 'lossy';

const CODEC_NAMES: Record<string, string> = {
    flac: 'FLAC',
    alac: 'ALAC',
    aac: 'AAC',
    mp3: 'MP3',
    pcm: 'PCM',
    opus: 'Opus',
    vorbis: 'Vorbis',
    wavpack: 'WavPack',
    ape: 'APE',
    dsd: 'DSD'
};

// "FLAC 24/96", "ALAC 16/44.1", "MP3 320", "AAC 256", "Opus 160", "DSD 64".
export const formatLabel = (p: {
    codec: string;
    lossless: boolean;
    bitDepth: number | null;
    sampleRate: number | null;
    bitrate: number | null;
}): string => {
    const codec = p.codec.toLowerCase();
    const name = CODEC_NAMES[codec] ?? p.codec.toUpperCase();
    if (codec === 'dsd') return p.sampleRate ? `DSD ${Math.round(p.sampleRate / 44100)}` : 'DSD';
    if (p.lossless) {
        const khz = p.sampleRate ? +(p.sampleRate / 1000).toFixed(1) : null;
        return `${name} ${p.bitDepth ?? '?'}/${khz ?? '?'}`;
    }
    return p.bitrate ? `${name} ${Math.round(p.bitrate / 1000)}` : name;
};

// Bytes as people read them: 812 KB, 28.4 MB, 1.2 GB.
export const formatBytes = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};
