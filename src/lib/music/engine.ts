// engine.ts — the music player, without React: one queue that mixes uploaded songs (played by an
// <audio> element straight from the stored original or its compact copy, nothing in between) and
// the built-in soundscapes (a Web Audio pad). The UI subscribes with useSyncExternalStore.
//
// Things it takes care of:
// - CUE slices: a whole-album image is one file; each library track is a window [startMs, endMs)
//   of it. When the next track continues the same file where this one ends, the engine only moves
//   its window — the audio never stops, so the album plays without gaps and the lock screen sees
//   one uninterrupted stream.
// - iPhone rules: play() must start inside the tap, so a source that is already resolved starts
//   synchronously, and otherwise the element is unlocked with a silent clip before the real file
//   loads; scripts cannot set media volume there (`volumeLocked`).
// - Recovery: an expired signed URL or a dropped connection re-resolves the source and continues
//   at the same spot (twice); a file this browser cannot decode falls back to the compact copy.
// - Lock screen and headphone keys through the Media Session API.
// Feature doc: ai/features/music/music.md, details in ai/features/music/impl.md §播放引擎.
import { SoundscapeSynth } from '@/lib/music/synth';

export type PlayMode = 'list' | 'repeat' | 'shuffle';
export type PlayedVersion = 'original' | 'compact';

export type EngineTrack = {
    /** stable identity in the queue: 'lib:<track id>' or 'builtin:<n>' */
    key: string;
    title: string;
    artist: string;
    album: string | null;
    durationMs: number;
    artwork: string | null;
    source: { kind: 'synth'; root: number; chord: number[] } | { kind: 'file' };
    /** ReplayGain track gain (dB) and peak, for "turn loud songs down" */
    gainDb?: number | null;
    peak?: number | null;
};

// Where a track's audio comes from right now.
export type ResolvedSource = {
    url: string;
    /** the underlying file; CUE slices of one file share it */
    mediaKey: string;
    startMs: number;
    endMs: number | null;
    version: PlayedVersion;
    /** playing from this device (downloaded or cached) */
    local: boolean;
};

export type ResolveOptions = {
    /** true after a playback error: do not reuse a cached URL */
    fresh: boolean;
    /** true after a decode error: the original cannot play here */
    avoidOriginal: boolean;
    onPrepare: (fraction: number) => void;
    signal: AbortSignal;
    /** a look-ahead for the next track: skip anything heavy (whole-file downloads) */
    prefetch?: boolean;
};

// The app supplies how a track turns into something playable (signing, downloads, versions).
export interface SourceResolver {
    resolve(track: EngineTrack, options: ResolveOptions): Promise<ResolvedSource>;
    /** an already resolved source, synchronously, so a tap can start playback inside the gesture */
    peek(track: EngineTrack): ResolvedSource | null;
}

export type EngineStatus = 'idle' | 'loading' | 'playing' | 'paused';

export type EngineState = {
    queue: EngineTrack[];
    index: number;
    status: EngineStatus;
    positionMs: number;
    durationMs: number;
    mode: PlayMode;
    volume: number;
    muted: boolean;
    /** turn songs louder than the reference down (ReplayGain), never up */
    loudness: boolean;
    error: string | null;
    /** 0..1 while a whole file downloads before it can play (files stored in parts) */
    preparing: number | null;
    version: PlayedVersion | null;
    local: boolean;
    /** iPhone: media volume belongs to the hardware buttons */
    volumeLocked: boolean;
};

// 0.1 s of silence, played inside the first tap so iOS lets this element play later on its own.
const SILENCE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAA';

// Clamp to a range, mapping non-numbers to the low end.
const clamp = (value: number, low: number, high: number) =>
    Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;

// iOS keeps media volume read-only for scripts; checked once on a throwaway element.
const detectVolumeLock = (): boolean => {
    try {
        const el = document.createElement('audio');
        el.volume = 0.5;
        return Math.abs(el.volume - 0.5) > 0.01 || /iPhone|iPad|iPod/.test(navigator.userAgent);
    } catch {
        return false;
    }
};

// Plain-language text for a media element error.
const mediaErrorText = (code: number | undefined): string =>
    code === 4
        ? '这台设备放不了这个格式。'
        : code === 3
          ? '这首歌的文件解码出错。'
          : code === 2
            ? '网络不稳，没能继续播放。'
            : '这首歌暂时放不了。';

export class MusicEngine {
    private state: EngineState;
    private listeners = new Set<() => void>();
    private audio: HTMLAudioElement;
    private synth = new SoundscapeSynth();
    private resolver: SourceResolver;
    private loaded: ResolvedSource | null = null;
    private loadedKey: string | null = null;
    private upcoming: { key: string; source: ResolvedSource } | null = null;
    private token = 0;
    private abort: AbortController | null = null;
    private ticker: number | null = null;
    private boundary: number | null = null;
    private unlocked = false;
    private retries = 0;
    private history: number[] = [];
    private wantPlaying = false;
    private pendingPlays = 0;
    private expectedPauses = 0;
    private preloadingKey: string | null = null;
    /** told about each track that played for 30 s or more (play history) */
    onListened: ((track: EngineTrack, msPlayed: number) => void) | null = null;
    private listenedMs = 0;
    private listenedReported = false;

    constructor(
        resolver: SourceResolver,
        initial?: Partial<Pick<EngineState, 'mode' | 'volume' | 'muted' | 'loudness'>>
    ) {
        this.resolver = resolver;
        this.audio = new Audio();
        this.audio.preload = 'auto';
        this.state = {
            queue: [],
            index: -1,
            status: 'idle',
            positionMs: 0,
            durationMs: 0,
            mode: initial?.mode ?? 'list',
            volume: clamp(initial?.volume ?? 80, 0, 100),
            muted: initial?.muted ?? false,
            loudness: initial?.loudness ?? false,
            error: null,
            preparing: null,
            version: null,
            local: false,
            volumeLocked: detectVolumeLock()
        };
        this.wireAudio();
        this.wireMediaSession();
        this.synth.onInterrupted = () => {
            this.wantPlaying = false;
            this.set({ status: 'paused', error: '声音被系统打断了，点播放继续。' });
        };
        this.applyVolume();
    }

    /** the media element (browser checks read its src and clock) */
    get element(): HTMLAudioElement {
        return this.audio;
    }

    // --- store ---------------------------------------------------------------------------------

    getState = (): EngineState => this.state;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    private set(patch: Partial<EngineState>): void {
        this.state = { ...this.state, ...patch };
        for (const listener of this.listeners) listener();
    }

    private current(): EngineTrack | null {
        return this.state.queue[this.state.index] ?? null;
    }

    // --- queue ---------------------------------------------------------------------------------

    // Replace the queue. Without `autoplay`, what plays (or is paused) now stays put when it is still
    // in the new queue (a library refresh); otherwise selects `index` and starts it when `autoplay`
    // (which must come from a tap).
    setQueue(queue: EngineTrack[], index: number, options: { autoplay?: boolean; positionMs?: number } = {}): void {
        const playingKey = this.current()?.key;
        const keep = playingKey ? queue.findIndex((t) => t.key === playingKey) : -1;
        if (keep >= 0 && options.autoplay === undefined) {
            this.set({ queue, index: keep, durationMs: queue[keep].durationMs });
            return;
        }
        this.set({ queue });
        if (!queue.length) {
            this.stopAll();
            this.set({ index: -1, status: 'idle', positionMs: 0, durationMs: 0 });
            return;
        }
        this.history = [];
        this.go(clamp(index, 0, queue.length - 1), options.autoplay ?? false, options.positionMs ?? 0);
    }

    // Update titles, artwork and durations in place (a library edit) without touching playback.
    refreshTracks(tracks: EngineTrack[]): void {
        const byKey = new Map(tracks.map((t) => [t.key, t]));
        const queue = this.state.queue.map((t) => byKey.get(t.key) ?? t);
        const now = queue[this.state.index];
        this.set({ queue, durationMs: now ? now.durationMs : this.state.durationMs });
        this.updateMediaMetadata();
    }

    // Play queue item `index` from the start (a tap on a row).
    select(index: number): void {
        if (!this.state.queue[index]) return;
        if (this.state.index >= 0 && this.state.index !== index) this.history.push(this.state.index);
        this.go(index, true, 0);
    }

    // --- transport -----------------------------------------------------------------------------

    // Start or resume. Call it straight from a tap: on iOS the first playback must begin inside it.
    play(): void {
        const track = this.current();
        if (!track) return;
        this.wantPlaying = true;
        this.set({ error: null });
        if (track.source.kind === 'synth') {
            this.quietPause();
            void this.startSynth(track, this.state.positionMs);
            return;
        }
        this.synth.pause();
        if (this.loaded && this.loadedKey === track.key) {
            this.unlocked = true;
            this.fadeIn();
            this.startElement();
            return;
        }
        // not loaded yet: start inside the gesture when the source is at hand, else unlock first
        const ready = this.resolver.peek(track);
        if (ready) {
            this.attach(track, ready, this.state.positionMs, true);
            return;
        }
        this.unlock();
        void this.load(track, this.state.positionMs, true);
    }

    pause(): void {
        this.wantPlaying = false;
        const track = this.current();
        if (track?.source.kind === 'synth') {
            this.synth.pause();
            this.set({ status: 'paused', positionMs: this.synth.positionMs() });
        } else {
            this.fadeOutThen(() => this.audio.pause());
            this.set({
                status: this.state.status === 'loading' ? 'paused' : this.state.status,
                positionMs: this.positionNow()
            });
        }
        this.stopTicker();
        this.updatePositionState();
    }

    toggle(): void {
        if (this.wantPlaying || this.state.status === 'playing') this.pause();
        else this.play();
    }

    // Jump within the current track.
    seek(positionMs: number): void {
        const track = this.current();
        if (!track) return;
        const target = clamp(positionMs, 0, Math.max(0, track.durationMs - 250));
        if (track.source.kind === 'synth') this.synth.seek(target);
        else if (this.loaded && this.loadedKey === track.key)
            this.audio.currentTime = (this.loaded.startMs + target) / 1000;
        this.set({ positionMs: target });
        this.armBoundary();
        this.updatePositionState();
    }

    next(): void {
        const index = this.pickNext(true);
        if (index === null) return;
        if (this.state.index >= 0) this.history.push(this.state.index);
        this.go(index, this.wantPlaying || this.state.status === 'playing', 0);
    }

    // Back to the start of the track after 3 s, else to the previous one.
    prev(): void {
        if (this.positionNow() > 3000 || this.state.queue.length < 2) {
            this.seek(0);
            return;
        }
        const index =
            this.state.mode === 'shuffle' && this.history.length
                ? (this.history.pop() as number)
                : (this.state.index - 1 + this.state.queue.length) % this.state.queue.length;
        this.go(index, this.wantPlaying || this.state.status === 'playing', 0);
    }

    setMode(mode: PlayMode): void {
        this.set({ mode });
        this.upcoming = null;
    }

    setVolume(volume: number): void {
        this.set({ volume: clamp(volume, 0, 100) });
        this.applyVolume();
    }

    setMuted(muted: boolean): void {
        this.set({ muted });
        this.applyVolume();
    }

    setLoudness(loudness: boolean): void {
        this.set({ loudness });
        this.applyVolume();
    }

    // Re-resolve the current track (its version changed, or it was just downloaded) and continue
    // at the same spot.
    reload(): void {
        const track = this.current();
        if (!track || track.source.kind !== 'file') return;
        this.upcoming = null;
        const playing = this.wantPlaying;
        void this.load(track, this.positionNow(), playing);
    }

    // Stop everything and let go of the audio hardware.
    destroy(): void {
        this.stopAll();
        this.synth.close();
        this.audio.removeAttribute('src');
        this.audio.load();
        this.listeners.clear();
        if ('mediaSession' in navigator) {
            for (const action of [
                'play',
                'pause',
                'previoustrack',
                'nexttrack',
                'seekto',
                'seekbackward',
                'seekforward'
            ] as const) {
                try {
                    navigator.mediaSession.setActionHandler(action, null);
                } catch {
                    /* unsupported action */
                }
            }
        }
    }

    // --- internals: moving between tracks --------------------------------------------------------

    private go(index: number, autoplay: boolean, positionMs: number): void {
        const track = this.state.queue[index];
        if (!track) return;
        this.reportListened();
        const previous = this.current();
        this.set({ index, positionMs, durationMs: track.durationMs, error: null, preparing: null });
        this.retries = 0;
        this.updateMediaMetadata();
        if (track.source.kind === 'synth') {
            this.quietPause();
            this.loaded = null;
            this.loadedKey = null;
            if (previous?.source.kind === 'synth') this.synth.retune(track.source.root, track.source.chord);
            this.synth.seek(positionMs);
            if (autoplay) {
                this.wantPlaying = true;
                void this.startSynth(track, positionMs);
            } else {
                this.synth.pause();
                this.set({ status: this.state.status === 'idle' ? 'idle' : 'paused', version: null, local: false });
            }
            return;
        }
        this.synth.pause();
        if (autoplay) this.wantPlaying = true;
        const ready = this.resolver.peek(track);
        if (ready) {
            this.attach(track, ready, positionMs, autoplay);
            return;
        }
        // the old song must not keep playing while the new one is fetched
        if (this.loadedKey !== track.key) this.quietPause();
        if (autoplay) this.unlock();
        void this.load(track, positionMs, autoplay);
    }

    private async startSynth(track: EngineTrack, positionMs: number): Promise<void> {
        if (track.source.kind !== 'synth') return;
        this.set({ status: 'loading', version: null, local: true });
        try {
            await this.synth.start(track.source.root, track.source.chord, positionMs);
            if (this.current()?.key !== track.key || !this.wantPlaying) return;
            this.applyVolume();
            this.set({ status: 'playing' });
            this.startTicker();
            this.updatePositionState();
        } catch (e) {
            this.wantPlaying = false;
            this.set({ status: 'paused', error: e instanceof Error ? e.message : '暂时无法播放声音。' });
        }
    }

    // Resolve the track's source (sign, download, pick a version) and attach it.
    private async load(
        track: EngineTrack,
        positionMs: number,
        autoplay: boolean,
        avoidOriginal = false
    ): Promise<void> {
        const token = ++this.token;
        this.abort?.abort();
        const abort = new AbortController();
        this.abort = abort;
        this.set({ status: 'loading', error: null });
        try {
            const source = await this.resolver.resolve(track, {
                fresh: this.retries > 0,
                avoidOriginal,
                onPrepare: (fraction) => {
                    if (token === this.token) this.set({ preparing: fraction });
                },
                signal: abort.signal
            });
            if (token !== this.token) return;
            this.set({ preparing: null });
            this.attach(track, source, positionMs, autoplay && this.wantPlaying);
        } catch (e) {
            if (token !== this.token || (e as Error).name === 'AbortError') return;
            this.wantPlaying = false;
            this.set({
                status: 'paused',
                preparing: null,
                error: e instanceof Error ? e.message : '这首歌暂时放不了。'
            });
        }
    }

    // Point the element at a resolved source and start at `positionMs` within the track.
    private attach(track: EngineTrack, source: ResolvedSource, positionMs: number, autoplay: boolean): void {
        const sameMedia = this.loaded?.mediaKey === source.mediaKey && this.audio.src === source.url;
        this.loaded = source;
        this.loadedKey = track.key;
        this.upcoming = null;
        this.set({ version: source.version, local: source.local });
        const at = (source.startMs + positionMs) / 1000;
        if (!sameMedia) {
            this.audio.src = source.url;
            this.seekWhenReady(at);
        } else if (Math.abs(this.audio.currentTime - at) > 0.05) {
            this.audio.currentTime = at;
        }
        this.applyVolume();
        if (autoplay) {
            this.wantPlaying = true;
            this.unlocked = true;
            this.set({ status: 'loading' });
            this.fadeIn();
            this.startElement();
        } else {
            this.set({ status: this.state.status === 'idle' ? 'idle' : 'paused' });
        }
        this.armBoundary();
    }

    // currentTime can only be set once the element knows the file's duration.
    private seekWhenReady(seconds: number): void {
        if (seconds <= 0.001) return;
        if (this.audio.readyState >= 1) {
            this.audio.currentTime = seconds;
            return;
        }
        const el = this.audio;
        const src = el.src;
        const apply = () => {
            if (el.src === src) el.currentTime = seconds;
        };
        el.addEventListener('loadedmetadata', apply, { once: true });
    }

    // Pause the element for a switch of songs; the pause it fires is ours, not the system's.
    private quietPause(): void {
        if (this.audio.paused) return;
        this.expectedPauses++;
        this.audio.pause();
    }

    // Play a silent clip inside the tap so iOS keeps letting this element play after the await.
    private unlock(): void {
        if (this.unlocked) return;
        this.unlocked = true;
        try {
            this.audio.src = SILENCE;
            void this.audio.play().catch(() => {});
        } catch {
            /* best effort */
        }
    }

    // audio.play(), remembering that a play is pending so the pause a source switch fires is not
    // mistaken for the system pausing us.
    private startElement(): void {
        this.pendingPlays++;
        void this.audio
            .play()
            .then(
                () => undefined,
                (e: unknown) => this.onPlayRejected(e)
            )
            .finally(() => {
                this.pendingPlays--;
            });
    }

    private onPlayRejected(e: unknown): void {
        const name = (e as { name?: string })?.name;
        if (name === 'AbortError') return; // the source changed under a pending play()
        this.wantPlaying = false;
        this.set({
            status: 'paused',
            error: name === 'NotAllowedError' ? '浏览器要求先点一下播放。' : '暂时无法播放，请再点一次播放。'
        });
    }

    // Which index comes after the current one; null when the queue is empty. `manual` (the next
    // button) moves on even in repeat-one mode.
    private pickNext(manual: boolean): number | null {
        const { queue, index, mode } = this.state;
        if (!queue.length) return null;
        if (mode === 'repeat' && !manual) return index;
        if (mode === 'shuffle' && queue.length > 1) {
            let pick = index;
            while (pick === index) pick = Math.floor(Math.random() * queue.length);
            return pick;
        }
        return (index + 1) % queue.length;
    }

    // The current slice (or file) ended: continue seamlessly when the next track starts exactly
    // where this one stops in the same file, otherwise load it.
    private advance(): void {
        const index = this.pickNext(false);
        if (index === null) return;
        const nextTrack = this.state.queue[index];
        if (index === this.state.index && this.loaded) {
            // repeat one: back to the start of this slice
            this.reportListened();
            this.audio.currentTime = this.loaded.startMs / 1000;
            this.set({ positionMs: 0 });
            if (this.audio.paused && this.wantPlaying) this.startElement();
            this.armBoundary();
            return;
        }
        const follow =
            this.upcoming?.key === nextTrack.key
                ? this.upcoming.source
                : nextTrack
                  ? this.resolver.peek(nextTrack)
                  : null;
        if (
            follow &&
            this.loaded &&
            follow.mediaKey === this.loaded.mediaKey &&
            this.loaded.endMs !== null &&
            Math.abs(follow.startMs - this.loaded.endMs) < 1
        ) {
            this.reportListened();
            this.history.push(this.state.index);
            this.loaded = { ...follow, url: this.loaded.url };
            this.loadedKey = nextTrack.key;
            this.upcoming = null;
            this.set({
                index,
                durationMs: nextTrack.durationMs,
                positionMs: Math.max(0, this.audio.currentTime * 1000 - follow.startMs),
                version: follow.version,
                local: follow.local
            });
            this.updateMediaMetadata();
            this.applyVolume();
            this.armBoundary();
            return;
        }
        this.history.push(this.state.index);
        this.go(index, this.wantPlaying, 0);
    }

    // Resolve the next track a few seconds early, so a contiguous CUE slice can follow without a gap.
    private preloadNext(): void {
        const index = this.pickNext(false);
        if (index === null || index === this.state.index) return;
        const track = this.state.queue[index];
        if (!track || track.source.kind !== 'file' || this.upcoming?.key === track.key) return;
        const peeked = this.resolver.peek(track);
        if (peeked) {
            this.upcoming = { key: track.key, source: peeked };
            return;
        }
        if (this.preloadingKey === track.key) return;
        this.preloadingKey = track.key;
        const abort = new AbortController();
        void this.resolver
            .resolve(track, {
                fresh: false,
                avoidOriginal: false,
                onPrepare: () => {},
                signal: abort.signal,
                prefetch: true
            })
            .then((source) => {
                if (this.current() && this.pickNextPeek() === track.key) this.upcoming = { key: track.key, source };
            })
            .catch(() => {})
            .finally(() => {
                if (this.preloadingKey === track.key) this.preloadingKey = null;
            });
    }

    private pickNextPeek(): string | null {
        const { queue, index, mode } = this.state;
        if (mode !== 'list' || !queue.length) return null;
        return queue[(index + 1) % queue.length]?.key ?? null;
    }

    // --- internals: clock ------------------------------------------------------------------------

    private positionNow(): number {
        const track = this.current();
        if (!track) return 0;
        if (track.source.kind === 'synth') return this.synth.positionMs();
        if (!this.loaded || this.loadedKey !== track.key) return this.state.positionMs;
        return Math.max(0, this.audio.currentTime * 1000 - this.loaded.startMs);
    }

    private startTicker(): void {
        if (this.ticker !== null) return;
        this.ticker = window.setInterval(() => this.tick(), 250);
    }

    private stopTicker(): void {
        if (this.ticker !== null) window.clearInterval(this.ticker);
        this.ticker = null;
        if (this.boundary !== null) window.clearTimeout(this.boundary);
        this.boundary = null;
    }

    private tick(): void {
        const track = this.current();
        if (!track) return;
        const positionMs = this.positionNow();
        if (this.state.status === 'playing') this.listenedMs += 250;
        if (!this.listenedReported && this.listenedMs >= 30000) {
            this.listenedReported = true;
            this.onListened?.(track, this.listenedMs);
        }
        if (track.source.kind === 'synth') {
            if (positionMs >= track.durationMs) {
                this.history.push(this.state.index);
                const index = this.pickNext(false);
                if (index !== null) this.go(index, true, 0);
                return;
            }
            this.set({ positionMs });
            return;
        }
        this.set({ positionMs: Math.min(positionMs, track.durationMs) });
        if (this.loaded?.endMs !== null && this.loaded && track.durationMs - positionMs < 4000) this.preloadNext();
        this.armBoundary();
    }

    // Schedule the precise moment the current slice ends (timeupdate is too coarse for gapless).
    private armBoundary(): void {
        if (this.boundary !== null) window.clearTimeout(this.boundary);
        this.boundary = null;
        const loaded = this.loaded;
        if (!loaded || loaded.endMs === null || this.audio.paused) return;
        const left = loaded.endMs - this.audio.currentTime * 1000;
        if (left > 1500) return;
        this.boundary = window.setTimeout(
            () => {
                this.boundary = null;
                if (!this.loaded || this.loaded.endMs === null) return;
                if (this.audio.currentTime * 1000 >= this.loaded.endMs - 8) this.advance();
                else this.armBoundary();
            },
            Math.max(0, left / Math.max(0.25, this.audio.playbackRate))
        );
    }

    private reportListened(): void {
        const track = this.current();
        if (track && !this.listenedReported && this.listenedMs >= 30000) this.onListened?.(track, this.listenedMs);
        this.listenedMs = 0;
        this.listenedReported = false;
    }

    private stopAll(): void {
        this.token++;
        this.abort?.abort();
        this.stopTicker();
        this.audio.pause();
        this.synth.pause();
        this.wantPlaying = false;
        this.loaded = null;
        this.loadedKey = null;
        this.upcoming = null;
    }

    // --- internals: the element ----------------------------------------------------------------

    private wireAudio(): void {
        const a = this.audio;
        a.addEventListener('playing', () => {
            if (a.src === SILENCE) return;
            this.retries = 0;
            this.set({ status: 'playing', error: null });
            this.startTicker();
            this.armBoundary();
            this.updatePositionState();
        });
        a.addEventListener('waiting', () => {
            if (this.wantPlaying) this.set({ status: 'loading' });
        });
        a.addEventListener('pause', () => {
            if (this.expectedPauses > 0) {
                this.expectedPauses--;
                return;
            }
            if (a.src === SILENCE || a.ended || this.pendingPlays > 0) return;
            if (!this.wantPlaying && this.state.status !== 'idle') this.set({ status: 'paused' });
            else if (this.wantPlaying && this.state.status === 'playing') {
                // paused by the system (a call, another app taking audio, a headset unplugged)
                this.wantPlaying = false;
                this.set({ status: 'paused', positionMs: this.positionNow() });
                this.stopTicker();
            }
        });
        a.addEventListener('ended', () => {
            if (a.src === SILENCE) return;
            this.advance();
        });
        a.addEventListener('seeked', () => this.armBoundary());
        a.addEventListener('error', () => {
            if (!a.src || a.src === SILENCE) return;
            const track = this.current();
            if (!track || track.source.kind !== 'file') return;
            const code = a.error?.code;
            const at = this.positionNow();
            if ((code === 2 || code === 4) && this.retries < 2 && !this.loaded?.local) {
                // an expired link and a dropped connection both look like this: fetch a fresh one
                this.retries++;
                void this.load(track, at, this.wantPlaying);
                return;
            }
            if ((code === 3 || code === 4) && this.loaded?.version === 'original') {
                void this.load(track, at, this.wantPlaying, true);
                return;
            }
            this.wantPlaying = false;
            this.set({ status: 'paused', error: mediaErrorText(code) });
        });
    }

    // Effective element volume: the slider, the optional loudness trim, a short fade.
    private trim(): number {
        const track = this.current();
        if (!this.state.loudness || !track || track.gainDb == null) return 1;
        const byGain = Math.pow(10, track.gainDb / 20);
        const byPeak = track.peak && track.peak > 0 ? 1 / track.peak : 1;
        return Math.min(1, byGain, byPeak);
    }

    private fade = 1;
    private fadeFrame: number | null = null;

    private applyVolume(): void {
        const level = this.state.muted ? 0 : (this.state.volume / 100) * this.trim();
        this.synth.setLevel(level);
        if (this.state.volumeLocked) {
            this.audio.muted = this.state.muted;
            return;
        }
        this.audio.muted = this.state.muted;
        this.audio.volume = clamp(level * this.fade, 0, 1);
    }

    // 150 ms fades so play, pause and jumps never click (not on iPhone, where volume is locked).
    private rampTo(target: number, done?: () => void): void {
        if (this.fadeFrame !== null) cancelAnimationFrame(this.fadeFrame);
        if (this.state.volumeLocked) {
            this.fade = target;
            done?.();
            return;
        }
        const from = this.fade;
        const start = performance.now();
        const step = (now: number) => {
            const k = Math.min(1, (now - start) / 150);
            this.fade = from + (target - from) * k;
            this.applyVolume();
            if (k < 1) this.fadeFrame = requestAnimationFrame(step);
            else {
                this.fadeFrame = null;
                done?.();
            }
        };
        this.fadeFrame = requestAnimationFrame(step);
    }

    private fadeIn(): void {
        this.fade = 0;
        this.applyVolume();
        this.rampTo(1);
    }

    private fadeOutThen(done: () => void): void {
        if (this.audio.paused) {
            done();
            return;
        }
        this.rampTo(0, () => {
            done();
            this.fade = 1;
            this.applyVolume();
        });
    }

    // --- lock screen ---------------------------------------------------------------------------

    private wireMediaSession(): void {
        if (!('mediaSession' in navigator)) return;
        const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
            ['play', () => this.play()],
            ['pause', () => this.pause()],
            ['previoustrack', () => this.prev()],
            ['nexttrack', () => this.next()],
            ['seekto', (d) => d.seekTime !== undefined && this.seek(d.seekTime * 1000)],
            ['seekbackward', (d) => this.seek(this.positionNow() - (d.seekOffset ?? 10) * 1000)],
            ['seekforward', (d) => this.seek(this.positionNow() + (d.seekOffset ?? 10) * 1000)]
        ];
        for (const [action, handler] of handlers) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch {
                /* this browser does not support the action */
            }
        }
    }

    private updateMediaMetadata(): void {
        if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
        const track = this.current();
        if (!track) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album ?? '',
            artwork: track.artwork ? [{ src: track.artwork, sizes: '512x512' }] : []
        });
    }

    private updatePositionState(): void {
        if (!('mediaSession' in navigator)) return;
        const track = this.current();
        try {
            navigator.mediaSession.playbackState = this.wantPlaying ? 'playing' : 'paused';
            if (track && track.durationMs > 0)
                navigator.mediaSession.setPositionState({
                    duration: track.durationMs / 1000,
                    playbackRate: 1,
                    position: clamp(this.positionNow() / 1000, 0, track.durationMs / 1000)
                });
        } catch {
            /* position state unsupported */
        }
    }
}
