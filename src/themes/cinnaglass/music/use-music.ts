// use-music.ts — the player's React side: one MusicEngine (src/lib/music/engine.ts) for the whole
// world page, the shared library of the world (loaded through the MusicBackend, kept current by the
// world's music topic), signed covers, the lyrics of whatever plays, likes, per-song version choices
// and downloads. Both player views (desktop dock, phone sheet) and the desktop mini bar read it.
// Playback never depends on a panel being open; nothing here implies listening together.
// Feature doc: ai/features/music/music.md, details in ai/features/music/impl.md §界面.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { artworkFor } from '@/lib/music/artwork';
import { MusicEngine, type EngineState, type PlayMode } from '@/lib/music/engine';
import { parseLyrics, type LyricDoc } from '@/lib/music/lyrics';
import { offlineEstimate } from '@/lib/music/offline';
import { LibrarySources, meteredNetwork, type TrackVersions, type VersionChoice } from '@/lib/music/sources';
import { loadJson, saveJson } from '@/lib/local-store';
import { Logman } from '@/lib/logman';
import {
    BUILTIN_ITEMS,
    BUILTIN_PREFIX,
    LIBRARY_PREFIX,
    builtinLyrics,
    engineTrack,
    libraryItem,
    type MusicItem
} from '@/themes/cinnaglass/music/music-model';
import type { LibraryTrack, LyricsRow, MusicBackend, StorageUsage } from '@/types/music';

const TAG = '[music][web][use-music]';
const SAVE_KEY = 'ow-music-v2';

type Saved = {
    key: string | null;
    context: 'library' | 'builtin';
    pos: number;
    mode: PlayMode;
    volume: number;
    muted: boolean;
    loudness: boolean;
    /** liked soundscapes, kept on this device only */
    liked: string[];
    choices: Record<string, VersionChoice>;
};

// What the player remembers on this device, with the old soundscape-only state carried over once.
const loadSaved = (): Saved => {
    const v2 = loadJson<Partial<Saved> | null>(SAVE_KEY, null);
    const v1 = v2 ? null : loadJson<Record<string, unknown> | null>('ow-music-v1', null);
    const base = v2 ?? {
        key: typeof v1?.i === 'number' ? `${BUILTIN_PREFIX}${v1.i}` : null,
        context: 'builtin' as const,
        pos: typeof v1?.pos === 'number' ? v1.pos * 1000 : 0,
        mode: v1?.mode as PlayMode | undefined,
        volume: v1?.volume as number | undefined,
        muted: v1?.muted === true,
        liked: Array.isArray(v1?.liked) ? (v1.liked as unknown[]).filter((t): t is string => typeof t === 'string') : []
    };
    return {
        key: typeof base.key === 'string' ? base.key : null,
        context: base.context === 'library' ? 'library' : 'builtin',
        pos: Number.isFinite(base.pos) ? Math.max(0, Number(base.pos)) : 0,
        mode: base.mode === 'repeat' || base.mode === 'shuffle' ? base.mode : 'list',
        volume: Number.isFinite(base.volume) ? Math.min(100, Math.max(0, Number(base.volume))) : 70,
        muted: base.muted === true,
        loudness: (base as Partial<Saved>).loudness === true,
        liked: Array.isArray(base.liked) ? base.liked : [],
        choices: (base as Partial<Saved>).choices ?? {}
    };
};

const IDLE: EngineState = {
    queue: [],
    index: -1,
    status: 'idle',
    positionMs: 0,
    durationMs: 0,
    mode: 'list',
    volume: 70,
    muted: false,
    loudness: false,
    error: null,
    preparing: null,
    version: null,
    local: false,
    volumeLocked: false
};
const noSubscribe = () => () => {};

// Newest uploads first; slices of one album image (same moment) in their track order.
const libraryOrder = (a: LibraryTrack, b: LibraryTrack) =>
    b.createdAt.localeCompare(a.createdAt) ||
    (a.album?.title ?? '').localeCompare(b.album?.title ?? '') ||
    (a.discNo ?? 0) - (b.discNo ?? 0) ||
    (a.trackNo ?? 0) - (b.trackNo ?? 0) ||
    a.title.localeCompare(b.title);

// The preferred main lyrics, with a translation folded in line by line when there is one.
const lyricsDoc = (rows: LyricsRow[]): LyricDoc | null => {
    const main = rows.find((r) => r.kind === 'main' && r.preferred) ?? rows.find((r) => r.kind === 'main');
    if (!main) return null;
    const doc = parseLyrics(main.rawText);
    doc.offset += main.offsetMs;
    const translation = rows.find((r) => r.kind === 'translation' && r.preferred);
    if (translation && doc.synced) {
        const t = parseLyrics(translation.rawText);
        for (const line of doc.lines) {
            if (line.translation || line.start === null) continue;
            const match = t.lines.find((l) => l.start !== null && Math.abs(l.start - (line.start as number)) < 300);
            if (match?.text) line.translation = match.text;
        }
    }
    return doc;
};

export type DownloadJob = { path: string; fraction: number; error: string | null };

export function useMusic(worldId: string | null, backend: MusicBackend | null) {
    const [saved] = useState(loadSaved);
    const [engine, setEngine] = useState<MusicEngine | null>(null);
    const [sources, setSources] = useState<LibrarySources | null>(null);
    const state = useSyncExternalStore(engine ? engine.subscribe : noSubscribe, engine ? engine.getState : () => IDLE);
    const [library, setLibrary] = useState<LibraryTrack[]>([]);
    const [libraryState, setLibraryState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [libraryError, setLibraryError] = useState<string | null>(null);
    const [covers, setCovers] = useState<Record<string, string>>({});
    const [me, setMe] = useState<string | null>(null);
    const [liked, setLiked] = useState<string[]>(saved.liked);
    const [likeOverrides, setLikeOverrides] = useState<Record<string, boolean>>({});
    const [choices, setChoices] = useState<Record<string, VersionChoice>>(saved.choices);
    const [lyrics, setLyrics] = useState<{ key: string; doc: LyricDoc | null } | null>(null);
    const [downloads, setDownloads] = useState<Record<string, DownloadJob>>({});
    const [offlineTick, setOfflineTick] = useState(0);
    const [usage, setUsage] = useState<StorageUsage[] | null>(null);
    const [device, setDevice] = useState<{ usage: number; quota: number } | null>(null);
    const restored = useRef(false);
    const contextRef = useRef<'library' | 'builtin'>(saved.context);

    // one engine and one source resolver for the page's lifetime
    useEffect(() => {
        if (!backend) return;
        const src = new LibrarySources(backend, saved.choices);
        const eng = new MusicEngine(src, {
            mode: saved.mode,
            volume: saved.volume,
            muted: saved.muted,
            loudness: saved.loudness
        });
        src.onOfflineChange = () => setOfflineTick((n) => n + 1);
        setSources(src);
        setEngine(eng);
        return () => {
            eng.destroy();
            src.dispose();
            setEngine(null);
            setSources(null);
        };
    }, [backend, saved]);

    // dev builds: the engine, for the browser checks (scripts/check-music-library.mjs)
    useEffect(() => {
        if (!import.meta.env.DEV || !engine) return;
        (window as Window & { __owMusic?: unknown }).__owMusic = { engine, element: engine.element };
    }, [engine]);

    // the library: load, then follow the world's music topic
    const reload = useCallback(async (): Promise<boolean> => {
        if (!backend || !worldId) return false;
        try {
            const rows = (await backend.loadLibrary(worldId)).sort(libraryOrder);
            setLibrary(rows);
            setLibraryState('ready');
            setLibraryError(null);
            return true;
        } catch (e) {
            setLibraryState((s) => (s === 'ready' ? s : 'error'));
            setLibraryError(e instanceof Error ? e.message : '曲库没能载入。');
            Logman.warn(TAG, `曲库载入失败：${e instanceof Error ? e.message : String(e)}`);
            return false;
        }
    }, [backend, worldId]);

    useEffect(() => {
        if (!backend || !worldId) return;
        let cancelled = false;
        let timer: number | null = null;
        void backend.me().then(
            (id) => !cancelled && setMe(id),
            () => undefined
        );
        setLibraryState('loading');
        let everSubscribed = false;
        let unsubscribe = () => {};
        // follow the world's music topic only once the library loads (no tables yet = nothing to follow)
        void reload().then((ok) => {
            if (!ok || cancelled) return;
            unsubscribe = backend.subscribe(
                worldId,
                () => {
                    if (timer !== null) window.clearTimeout(timer);
                    timer = window.setTimeout(() => void reload(), 400);
                },
                (status) => {
                    if (status === 'SUBSCRIBED' && everSubscribed) void reload();
                    if (status === 'SUBSCRIBED') everSubscribed = true;
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
                        Logman.warn(TAG, `曲库实时通道：${status}`);
                }
            );
        });
        return () => {
            cancelled = true;
            if (timer !== null) window.clearTimeout(timer);
            unsubscribe();
        };
    }, [backend, worldId, reload]);

    // sign links for playback and covers whenever the library changes
    useEffect(() => {
        if (!sources) return;
        let cancelled = false;
        void sources.setLibrary(library).then(async () => {
            const paths = library.flatMap((t) => [artworkFor(t.artwork, 160), artworkFor(t.artwork, 300)]);
            const signed = await sources.signForDisplay(paths.filter((p): p is string => !!p));
            if (!cancelled) setCovers(signed);
        });
        return () => {
            cancelled = true;
        };
    }, [sources, library]);

    const libraryItems = useMemo(
        () =>
            library.map((t) => {
                const big = artworkFor(t.artwork, 300);
                const small = artworkFor(t.artwork, 160);
                return libraryItem(t, big ? (covers[big] ?? null) : null, small ? (covers[small] ?? null) : null);
            }),
        [library, covers]
    );
    const byKey = useMemo(
        () => new Map([...libraryItems, ...BUILTIN_ITEMS].map((item) => [item.key, item])),
        [libraryItems]
    );

    // keep the queue's titles and covers current without interrupting playback
    useEffect(() => {
        if (!engine || !state.queue.length) return;
        const fresh = state.queue.map((t) => byKey.get(t.key)).filter((i): i is MusicItem => !!i);
        engine.refreshTracks(fresh.map(engineTrack));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the items change, not on every tick
    }, [engine, byKey]);

    // bring back the last song (paused) once its list is known
    useEffect(() => {
        if (!engine || restored.current) return;
        const isLibrary = saved.key?.startsWith(LIBRARY_PREFIX);
        if (isLibrary && libraryState !== 'ready' && libraryState !== 'error') return;
        restored.current = true;
        const context = isLibrary && byKey.has(saved.key ?? '') ? 'library' : 'builtin';
        const list = context === 'library' ? libraryItems : BUILTIN_ITEMS;
        const index = Math.max(
            0,
            list.findIndex((i) => i.key === saved.key)
        );
        contextRef.current = context;
        engine.setQueue(list.map(engineTrack), index, {
            autoplay: false,
            positionMs: list[index]?.key === saved.key ? saved.pos : 0
        });
    }, [engine, libraryState, libraryItems, byKey, saved]);

    // a library that changes under the queue (an upload, a delete) updates the queue in place
    useEffect(() => {
        if (!engine || !restored.current || contextRef.current !== 'library') return;
        engine.setQueue(libraryItems.map(engineTrack), Math.max(0, engine.getState().index));
    }, [engine, libraryItems]);

    const current: MusicItem =
        (state.queue[state.index] && byKey.get(state.queue[state.index].key)) || BUILTIN_ITEMS[0];

    // remember where we are (every few seconds while playing, and on every change of song or mode)
    const lastSave = useRef(0);
    useEffect(() => {
        const now = Date.now();
        if (state.status === 'playing' && now - lastSave.current < 5000) return;
        lastSave.current = now;
        saveJson<Saved>(SAVE_KEY, {
            key: current.key,
            context: contextRef.current,
            pos: Math.floor(state.positionMs),
            mode: state.mode,
            volume: state.volume,
            muted: state.muted,
            loudness: state.loudness,
            liked,
            choices
        });
    }, [
        current.key,
        state.positionMs,
        state.status,
        state.mode,
        state.volume,
        state.muted,
        state.loudness,
        liked,
        choices
    ]);

    // the lyrics of what plays
    useEffect(() => {
        let cancelled = false;
        if (current.builtin) {
            setLyrics({ key: current.key, doc: builtinLyrics(current.builtin) });
            return;
        }
        if (!backend || !current.library) return;
        if (!current.library.lyrics.length) {
            setLyrics({ key: current.key, doc: null });
            return;
        }
        setLyrics(null);
        backend.loadLyrics(current.library.id).then(
            (rows) => !cancelled && setLyrics({ key: current.key, doc: lyricsDoc(rows) }),
            (e: unknown) => {
                Logman.warn(TAG, `歌词载入失败：${e instanceof Error ? e.message : String(e)}`);
                if (!cancelled) setLyrics({ key: current.key, doc: null });
            }
        );
        return () => {
            cancelled = true;
        };
    }, [backend, current.key, current.builtin, current.library]);

    // storage meters: the project's cloud storage and this device's
    const refreshUsage = useCallback(() => {
        if (!backend) return;
        void backend.storageUsage().then(setUsage, () => setUsage(null));
        void offlineEstimate().then(setDevice);
    }, [backend]);

    // --- actions ------------------------------------------------------------------------------

    // Play an item from a list (a tap: starts inside the gesture).
    const play = useCallback(
        (item: MusicItem) => {
            if (!engine) return;
            const context = item.kind === 'library' ? 'library' : 'builtin';
            const list = context === 'library' ? libraryItems : BUILTIN_ITEMS;
            const index = list.findIndex((i) => i.key === item.key);
            if (index < 0) return;
            if (
                contextRef.current === context &&
                state.queue[index]?.key === item.key &&
                state.queue.length === list.length
            ) {
                engine.select(index);
                return;
            }
            contextRef.current = context;
            engine.setQueue(list.map(engineTrack), index, { autoplay: true });
        },
        [engine, libraryItems, state.queue]
    );

    const isLiked = useCallback(
        (item: MusicItem) =>
            item.library
                ? (likeOverrides[item.library.id] ?? (me ? item.library.likedBy.includes(me) : false))
                : liked.includes(item.title),
        [likeOverrides, liked, me]
    );

    const toggleLike = useCallback(
        (item: MusicItem) => {
            if (!item.library) {
                setLiked((l) => (l.includes(item.title) ? l.filter((t) => t !== item.title) : [...l, item.title]));
                return;
            }
            const id = item.library.id;
            const next = !isLiked(item);
            setLikeOverrides((o) => ({ ...o, [id]: next }));
            backend?.setLike(id, item.library.worldId, next).catch((e: unknown) => {
                setLikeOverrides((o) => ({ ...o, [id]: !next }));
                Logman.warn(TAG, `收藏没存上：${e instanceof Error ? e.message : String(e)}`);
            });
        },
        [backend, isLiked]
    );

    const versions = useCallback(
        (item: MusicItem): TrackVersions | null => (item.library && sources ? sources.versions(item.library) : null),
        // offlineTick: what is on this device changed
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sources, offlineTick]
    );

    const setChoice = useCallback(
        (item: MusicItem, choice: VersionChoice) => {
            if (!item.library || !sources || !engine) return;
            setChoices(sources.setChoice(item.library.id, choice));
            if (current.key === item.key) engine.reload();
        },
        [sources, engine, current.key]
    );

    const download = useCallback(
        async (item: MusicItem, kind: 'original' | 'compact') => {
            if (!item.library || !sources) return;
            const v = sources.versions(item.library);
            const r = kind === 'compact' ? v.compact : (v.original ?? v.lossless);
            if (!r) return;
            setDownloads((d) => ({ ...d, [r.path]: { path: r.path, fraction: 0, error: null } }));
            try {
                await sources.download(item.library, kind, (fraction) =>
                    setDownloads((d) => ({ ...d, [r.path]: { path: r.path, fraction, error: null } }))
                );
                setDownloads((d) => {
                    const rest = { ...d };
                    delete rest[r.path];
                    return rest;
                });
                if (current.key === item.key && !state.local) engine?.reload();
                refreshUsage();
            } catch (e) {
                setDownloads((d) => ({
                    ...d,
                    [r.path]: { path: r.path, fraction: 0, error: e instanceof Error ? e.message : '下载失败。' }
                }));
            }
        },
        [sources, engine, current.key, state.local, refreshUsage]
    );

    const forget = useCallback(
        async (path: string) => {
            await sources?.forget(path);
            refreshUsage();
        },
        [sources, refreshUsage]
    );

    const setVisibility = useCallback(
        async (item: MusicItem, visibility: 'world' | 'private') => {
            if (!item.library || !backend) return;
            await backend.updateTrack(item.library.id, { visibility });
            await reload();
        },
        [backend, reload]
    );

    const trash = useCallback(
        async (item: MusicItem) => {
            if (!item.library || !backend) return;
            if (current.key === item.key) engine?.next();
            await backend.trashTrack(item.library.id);
            await reload();
        },
        [backend, reload, current.key, engine]
    );

    const t = engine;
    return {
        state,
        item: current,
        library: libraryItems,
        builtins: BUILTIN_ITEMS,
        libraryState,
        libraryError,
        me,
        lyrics: lyrics?.key === current.key ? lyrics.doc : null,
        lyricsLoading: !lyrics || lyrics.key !== current.key,
        pos: state.positionMs,
        playing: state.status === 'playing',
        starting: state.status === 'loading',
        error: state.error,
        mode: state.mode,
        volume: state.volume,
        muted: state.muted,
        metered: meteredNetwork(),
        downloads,
        usage,
        device,
        refreshUsage,
        reload,
        play,
        toggle: () => t?.toggle(),
        seek: (ms: number) => t?.seek(ms),
        next: () => t?.next(),
        prev: () => t?.prev(),
        setMode: (mode: PlayMode) => t?.setMode(mode),
        setVolume: (volume: number) => t?.setVolume(volume),
        setMuted: () => t?.setMuted(!state.muted),
        setLoudness: (on: boolean) => t?.setLoudness(on),
        isLiked,
        toggleLike,
        versions,
        choiceOf: (item: MusicItem): VersionChoice => (item.library ? (choices[item.library.id] ?? 'auto') : 'auto'),
        setChoice,
        download,
        forget,
        setVisibility,
        trash
    };
}
export type MusicPlayback = ReturnType<typeof useMusic>;
