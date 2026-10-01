// probe.ts — what this browser actually does with music, measured instead of assumed (M0 device
// check, ai/features/music/m0.md). Plain DOM APIs, no React. Anything that makes sound must be
// started inside a tap: iOS only lets media play from a user gesture.

export type DeviceReport = {
    userAgent: string;
    os: string;
    secureContext: boolean;
    /** label -> canPlayType() answer: '' | 'maybe' | 'probably' */
    canPlay: Record<string, string>;
    /** MediaSource / ManagedMediaSource presence and isTypeSupported() answers */
    mediaSource: Record<string, boolean | null>;
    apis: Record<string, boolean>;
};

export type OutputReport = { sampleRate: number; baseLatency: number | null; outputLatency: number | null };

export type RangeReport = {
    status: number | null;
    partial: boolean;
    contentRange: string | null;
    acceptRanges: string | null;
    contentType: string | null;
    bytes: number | null;
    ms: number;
    error?: string;
};

export type PlaybackReport = {
    ok: boolean;
    metadataMs: number | null;
    playingMs: number | null;
    seekMs: number | null;
    duration: number | null;
    error?: string;
};

export type WebAudioReport = { ok: boolean; peakRms: number; contextRate: number | null; error?: string };

export type BackgroundReport = {
    hiddenSeconds: number;
    advancedSeconds: number;
    continued: boolean;
    pausedWhileHidden: boolean;
};

const CODECS: [label: string, type: string][] = [
    ['FLAC', 'audio/flac'],
    ['FLAC in MP4', 'audio/mp4; codecs="flac"'],
    ['ALAC', 'audio/mp4; codecs="alac"'],
    ['AAC-LC', 'audio/mp4; codecs="mp4a.40.2"'],
    ['MP3', 'audio/mpeg'],
    ['WAV', 'audio/wav'],
    ['AIFF', 'audio/aiff'],
    ['Opus (Ogg)', 'audio/ogg; codecs="opus"'],
    ['Opus (WebM)', 'audio/webm; codecs="opus"'],
    ['Vorbis (Ogg)', 'audio/ogg; codecs="vorbis"'],
    ['WavPack', 'audio/x-wavpack'],
    ['APE', 'audio/x-ape']
];

const MSE_TYPES: [label: string, type: string][] = [
    ['FLAC in MP4', 'audio/mp4; codecs="flac"'],
    ['Opus in MP4', 'audio/mp4; codecs="opus"'],
    ['Opus in WebM', 'audio/webm; codecs="opus"'],
    ['AAC in MP4', 'audio/mp4; codecs="mp4a.40.2"']
];

type AudioContextCtor = typeof AudioContext;
type WithLegacyAudio = { webkitAudioContext?: AudioContextCtor };
type WithMediaSource = { MediaSource?: typeof MediaSource; ManagedMediaSource?: typeof MediaSource };
type WithAudioSession = { audioSession?: { type: string } };

const audioContextCtor = (): AudioContextCtor | undefined =>
    window.AudioContext ?? (window as unknown as WithLegacyAudio).webkitAudioContext;

const since = (t0: number): number => Math.round(performance.now() - t0);

const errorText = (error: unknown): string =>
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);

// MediaError codes in words; MEDIA_ERR_SRC_NOT_SUPPORTED is what an unplayable format looks like.
const mediaErrorText = (error: MediaError | null): string => {
    const names = ['', '已中止', '网络错误', '解码失败', '格式或来源不支持'];
    return error
        ? `${names[error.code] ?? `错误 ${error.code}`}${error.message ? `：${error.message}` : ''}`
        : '未知播放错误';
};

// OS family and version from the user agent; iPadOS 13+ reports itself as a Mac with touch.
const osOf = (ua: string): string => {
    const ios = /(?:iPhone|iPad|iPod).*? OS (\d+)[_.](\d+)/.exec(ua);
    if (ios) return `iOS ${ios[1]}.${ios[2]}`;
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'iPadOS';
    const android = /Android (\d+(?:\.\d+)?)/.exec(ua);
    if (android) return `Android ${android[1]}`;
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Linux/.test(ua)) return 'Linux';
    return '未知系统';
};

// Ask the platform for "media playback" audio (Safari 16.4+), so Web Audio is not silenced by the
// ringer switch or stopped in the background. Absent elsewhere; harmless to call more than once.
export const requestPlaybackSession = (): void => {
    const session = (navigator as Navigator & WithAudioSession).audioSession;
    if (session) session.type = 'playback';
};

// Static capabilities: codec answers, MediaSource support and the APIs the player relies on.
export const deviceReport = (): DeviceReport => {
    const probe = document.createElement('audio');
    const w = window as unknown as WithMediaSource;
    const mse = w.ManagedMediaSource ?? w.MediaSource;
    const nav = navigator as Navigator & WithAudioSession & { wakeLock?: unknown };
    const ctor = audioContextCtor();
    return {
        userAgent: navigator.userAgent,
        os: osOf(navigator.userAgent),
        secureContext: window.isSecureContext,
        canPlay: Object.fromEntries(CODECS.map(([label, type]) => [label, probe.canPlayType(type)])),
        mediaSource: {
            MediaSource: !!w.MediaSource,
            ManagedMediaSource: !!w.ManagedMediaSource,
            ...Object.fromEntries(MSE_TYPES.map(([label, type]) => [label, mse ? mse.isTypeSupported(type) : null]))
        },
        apis: {
            mediaSession: 'mediaSession' in navigator,
            audioSession: !!nav.audioSession,
            setSinkId: 'setSinkId' in HTMLMediaElement.prototype,
            audioContextSetSinkId: !!ctor && 'setSinkId' in ctor.prototype,
            wakeLock: 'wakeLock' in nav,
            storagePersist: typeof navigator.storage?.persist === 'function',
            audioDecoder: 'AudioDecoder' in window
        }
    };
};

// iPhone ignores volume set from script on media elements (iPad and desktops honour it), which
// decides whether "turn down only" normalisation can work without Web Audio.
export const volumeLocked = async (): Promise<boolean> => {
    const el = document.createElement('audio');
    el.volume = 0.5;
    await new Promise((resolve) => setTimeout(resolve, 80));
    return Math.abs(el.volume - 0.5) > 0.01;
};

// The rate the system mixes at, which every web player is resampled to. Call inside a tap on iOS.
export const outputReport = async (): Promise<OutputReport | null> => {
    const Ctor = audioContextCtor();
    if (!Ctor) return null;
    const ctx = new Ctor();
    try {
        await ctx.resume().catch(() => undefined);
        return {
            sampleRate: ctx.sampleRate,
            baseLatency: typeof ctx.baseLatency === 'number' ? ctx.baseLatency : null,
            outputLatency: typeof ctx.outputLatency === 'number' ? ctx.outputLatency : null
        };
    } finally {
        void ctx.close().catch(() => undefined);
    }
};

// The two-byte request iOS sends before it will play anything: it needs a 206 with Content-Range.
// A thrown fetch here usually means the response carried no CORS headers.
export const rangeProbe = async (url: string): Promise<RangeReport> => {
    const t0 = performance.now();
    try {
        const res = await fetch(url, { headers: { Range: 'bytes=0-1' }, mode: 'cors', cache: 'no-store' });
        const body = await res.arrayBuffer();
        return {
            status: res.status,
            partial: res.status === 206,
            contentRange: res.headers.get('content-range'),
            acceptRanges: res.headers.get('accept-ranges'),
            contentType: res.headers.get('content-type'),
            bytes: body.byteLength,
            ms: since(t0)
        };
    } catch (error) {
        return {
            status: null,
            partial: false,
            contentRange: null,
            acceptRanges: null,
            contentType: null,
            bytes: null,
            ms: since(t0),
            error: errorText(error)
        };
    }
};

// Plays the URL from a plain <audio> element (call inside a tap): time to metadata, time to sound,
// then a jump to the middle and the time until sound moves again. Stops itself afterwards.
export const playbackProbe = (url: string): Promise<PlaybackReport> => {
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.src = url;
    const t0 = performance.now();
    const report: PlaybackReport = { ok: false, metadataMs: null, playingMs: null, seekMs: null, duration: null };

    return new Promise((resolve) => {
        let done = false;
        let watch = 0;
        const timers: number[] = [];
        const finish = (error?: string) => {
            if (done) return;
            done = true;
            timers.forEach((id) => window.clearTimeout(id));
            window.clearInterval(watch);
            el.pause();
            el.removeAttribute('src');
            el.load();
            resolve({ ...report, ok: !error && report.playingMs !== null, error });
        };
        timers.push(window.setTimeout(() => finish('20 秒内没有出声'), 20000));
        el.addEventListener(
            'loadedmetadata',
            () => {
                report.metadataMs = since(t0);
                report.duration = Number.isFinite(el.duration) ? el.duration : null;
            },
            { once: true }
        );
        el.addEventListener('error', () => finish(mediaErrorText(el.error)), { once: true });
        el.addEventListener(
            'playing',
            () => {
                report.playingMs = since(t0);
                timers.push(
                    window.setTimeout(() => {
                        if (!report.duration) return finish();
                        const target = report.duration * 0.5;
                        const tSeek = performance.now();
                        el.currentTime = target;
                        watch = window.setInterval(() => {
                            if (!el.seeking && el.currentTime > target + 0.05) {
                                report.seekMs = since(tSeek);
                                finish();
                            }
                        }, 40);
                        timers.push(window.setTimeout(() => finish('拖动后 8 秒内没有恢复'), 8000));
                    }, 1500)
                );
            },
            { once: true }
        );
        el.play().catch((error) => finish(errorText(error)));
    });
};

// Prepares a Web Audio listening test: the element and context are unlocked inside the current
// tap, and run() later plays the URL silently through an analyser. Silence means the response
// had no CORS headers, or this browser cannot route that source into Web Audio.
export const prepareWebAudioProbe = (url: string): { run: () => Promise<WebAudioReport> } => {
    const Ctor = audioContextCtor();
    if (!Ctor) return { run: async () => ({ ok: false, peakRms: 0, contextRate: null, error: '没有 Web Audio' }) };
    requestPlaybackSession();
    const ctx = new Ctor();
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.src = url;
    el.load();
    void ctx.resume().catch(() => undefined);
    const source = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    const silent = ctx.createGain();
    silent.gain.value = 0;
    source.connect(analyser);
    analyser.connect(silent);
    silent.connect(ctx.destination);

    const run = () =>
        new Promise<WebAudioReport>((resolve) => {
            const samples = new Float32Array(analyser.fftSize);
            let peak = 0;
            let done = false;
            let limit = 0;
            const sampler = window.setInterval(() => {
                analyser.getFloatTimeDomainData(samples);
                let sum = 0;
                for (const value of samples) sum += value * value;
                peak = Math.max(peak, Math.sqrt(sum / samples.length));
            }, 100);
            const finish = (error?: string) => {
                if (done) return;
                done = true;
                window.clearInterval(sampler);
                window.clearTimeout(limit);
                el.pause();
                void ctx.close().catch(() => undefined);
                resolve({
                    ok: !error && peak > 1e-4,
                    peakRms: Number(peak.toFixed(5)),
                    contextRate: ctx.sampleRate,
                    error
                });
            };
            limit = window.setTimeout(() => finish('12 秒内没有完成'), 12000);
            el.addEventListener('error', () => finish(mediaErrorText(el.error)), { once: true });
            el.addEventListener('playing', () => window.setTimeout(() => finish(), 2000), { once: true });
            void ctx.resume().catch(() => undefined);
            el.play().catch((error) => finish(errorText(error)));
        });
    return { run };
};

// Lock-screen test: starts playback inside a tap, then compares how far the track moved with how
// long the page was hidden. Media Session metadata is set when the platform offers it (HTTPS).
export class BackgroundProbe {
    private el = new Audio();
    private hiddenAt: { wall: number; position: number } | null = null;
    private pausedWhileHidden = false;
    private report: BackgroundReport | null = null;
    private onChange: (report: BackgroundReport | null, log: string) => void;

    constructor(onChange: (report: BackgroundReport | null, log: string) => void) {
        this.onChange = onChange;
    }

    start(url: string, title: string): Promise<void> {
        this.el.crossOrigin = 'anonymous';
        this.el.setAttribute('playsinline', '');
        this.el.loop = true;
        this.el.src = url;
        this.el.addEventListener('pause', this.handlePause);
        document.addEventListener('visibilitychange', this.handleVisibility);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist: 'Our World · M0 验证',
                album: '后台测试'
            });
            navigator.mediaSession.setActionHandler('play', () => void this.el.play());
            navigator.mediaSession.setActionHandler('pause', () => this.el.pause());
        }
        return this.el.play();
    }

    stop(): void {
        this.el.removeEventListener('pause', this.handlePause);
        document.removeEventListener('visibilitychange', this.handleVisibility);
        this.el.pause();
        this.el.removeAttribute('src');
        this.el.load();
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
        }
    }

    private handlePause = () => {
        if (document.visibilityState === 'hidden') this.pausedWhileHidden = true;
    };

    // Wall-clock time is used because the monotonic clock can stop while a device sleeps.
    private handleVisibility = () => {
        if (document.visibilityState === 'hidden') {
            this.hiddenAt = { wall: Date.now(), position: this.el.currentTime };
            this.pausedWhileHidden = false;
            this.onChange(this.report, `页面隐藏，位置 ${this.hiddenAt.position.toFixed(1)} 秒`);
            return;
        }
        if (!this.hiddenAt) return;
        const hiddenSeconds = (Date.now() - this.hiddenAt.wall) / 1000;
        let advanced = this.el.currentTime - this.hiddenAt.position;
        if (advanced < 0 && Number.isFinite(this.el.duration)) advanced += this.el.duration;
        this.report = {
            hiddenSeconds: Number(hiddenSeconds.toFixed(1)),
            advancedSeconds: Number(advanced.toFixed(1)),
            continued: hiddenSeconds > 2 && advanced >= hiddenSeconds * 0.8,
            pausedWhileHidden: this.pausedWhileHidden
        };
        this.hiddenAt = null;
        this.onChange(
            this.report,
            `回到页面：隐藏 ${this.report.hiddenSeconds} 秒，播放前进 ${this.report.advancedSeconds} 秒`
        );
    };
}
