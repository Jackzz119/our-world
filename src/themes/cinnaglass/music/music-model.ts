// music-model.ts — what the player's screens show for one song, whether it is a built-in soundscape
// or a track from the shared library, and how either becomes an item of the engine's queue.
// Kept apart from the components so the component files only export components (react-refresh).
// Feature doc: ai/features/music/music.md §界面.
import type { EngineTrack } from '@/lib/music/engine';
import type { LyricDoc } from '@/lib/music/lyrics';
import { formatLabel, qualityBadge, type QualityBadge } from '@/lib/music/quality';
import { TRACKS, type Track } from '@/themes/cinnaglass/music/builtin-tracks';
import type { LibraryTrack } from '@/types/music';

export type MusicItem = {
    key: string;
    kind: 'library' | 'builtin';
    title: string;
    artist: string;
    album: string | null;
    durationMs: number;
    /** a URL ready for <img>, or null while it is signed / when there is none */
    poster: string | null;
    /** the small cover for list rows */
    thumb: string | null;
    /** painted while the poster loads (and instead of a missing one) */
    tint: string;
    badge: QualityBadge;
    formatLabel: string;
    library: LibraryTrack | null;
    builtin: Track | null;
    /** CUE slice number within its album image */
    slice: number | null;
};

export const BUILTIN_PREFIX = 'builtin:';
export const LIBRARY_PREFIX = 'lib:';

// The built-in soundscapes as items (posters are public files).
export const BUILTIN_ITEMS: MusicItem[] = TRACKS.map((t, i) => ({
    key: `${BUILTIN_PREFIX}${i}`,
    kind: 'builtin',
    title: t.title,
    artist: t.artist,
    album: null,
    durationMs: t.dur * 1000,
    poster: t.poster,
    thumb: t.poster,
    tint: t.tint,
    badge: null,
    formatLabel: '本机音景',
    library: null,
    builtin: t,
    slice: null
}));

// A soundscape's own lyrics as a lyrics document (times in ms).
export const builtinLyrics = (t: Track): LyricDoc => ({
    synced: true,
    wordSynced: false,
    offset: 0,
    meta: {},
    lines: t.lyrics.map((l, i) => ({
        start: l.t * 1000,
        end: t.lyrics[i + 1] ? t.lyrics[i + 1].t * 1000 : null,
        text: l.text
    }))
});

// A warm gradient from a palette colour, so a song without its poster loaded still has a face.
const tintOf = (track: LibraryTrack): string => {
    const p = track.artwork?.palette;
    if (p?.dominant || p?.muted)
        return `linear-gradient(145deg, ${p.light ?? p.muted ?? p.dominant}, ${p.dark ?? p.dominant ?? p.muted})`;
    // no cover: a stable hue from the title
    let h = 0;
    for (const ch of track.title) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `linear-gradient(145deg, hsl(${h} 32% 58%), hsl(${(h + 24) % 360} 30% 34%))`;
};

// A library track as an item; poster/thumb are signed URLs of the cover sizes (null until signed).
export const libraryItem = (track: LibraryTrack, poster: string | null, thumb: string | null): MusicItem => {
    const original = track.renditions.find((r) => r.kind === 'original') ?? null;
    return {
        key: `${LIBRARY_PREFIX}${track.id}`,
        kind: 'library',
        title: track.title,
        artist: track.artists.join(' / ') || track.album?.albumArtist || '未知歌手',
        album: track.album?.title ?? null,
        durationMs: track.durationMs,
        poster,
        thumb: thumb ?? poster,
        tint: tintOf(track),
        badge: original ? qualityBadge(original.lossless, original.sampleRate) : null,
        formatLabel: original ? formatLabel(original) : '',
        library: track,
        builtin: null,
        slice: track.startSample !== null && track.endSample !== null ? track.trackNo : null
    };
};

// The engine's view of an item.
export const engineTrack = (item: MusicItem): EngineTrack => ({
    key: item.key,
    title: item.title,
    artist: item.artist,
    album: item.album,
    durationMs: item.durationMs,
    artwork: item.poster ? new URL(item.poster, location.href).href : null,
    source: item.builtin ? { kind: 'synth', root: item.builtin.root, chord: item.builtin.chord } : { kind: 'file' },
    gainDb: item.library?.gain?.track_gain ?? null,
    peak: item.library?.gain?.track_peak ?? null
});

// The short word on a quality badge.
export const badgeText = (badge: QualityBadge): string | null =>
    badge === 'hires' ? 'Hi-Res' : badge === 'lossless' ? '无损' : null;

// Seconds as m:ss for the time labels.
export const musicTime = (ms: number): string => {
    const safe = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

// The same time read out: "3 分 20 秒".
export const spokenTime = (ms: number): string => {
    const safe = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return m ? `${m} 分 ${s} 秒` : `${s} 秒`;
};
