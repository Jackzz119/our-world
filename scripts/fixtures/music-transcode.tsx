// Isolated harness for the compact-copy encoder (src/lib/music/transcode.ts): no account, no storage.
// scripts/check-music-transcode.mjs serves the generated fixtures from a second origin and calls
// window.musicTranscode from Playwright. Everything that needs decoded audio (duration, timeline
// alignment against the original, alias levels) is measured here, in the page.
import {
    Conversion,
    BufferTarget,
    BlobSource,
    ALL_FORMATS,
    Input,
    Output,
    Quality,
    WebMOutputFormat
} from 'mediabunny';
import { makeCompactCopy, pickCopyFormat, type CopyFormat } from '@/lib/music/transcode';

type CopyRequest = {
    url: string;
    format: CopyFormat;
    startSec?: number;
    endSec?: number;
    /** sample rate of the original, to decode it without resampling for the alignment check */
    sourceRate?: number;
    /** measure the copy's lag behind the original by cross-correlation */
    align?: boolean;
    /** report the level of these frequencies in the copy (alias check) */
    probeHz?: number[];
    /** false skips decoding the copy (an hour of PCM would dwarf what the long check measures) */
    decode?: boolean;
};

const errorOf = (e: unknown) => ({
    error: e instanceof Error ? e.message : String(e),
    errorName: e instanceof Error ? e.name : typeof e
});

// decodeAudioData into a context at `rate`; a rate equal to the file's own avoids any resampling.
const decode = async (bytes: ArrayBuffer, rate: number): Promise<AudioBuffer> =>
    new OfflineAudioContext(1, 1, rate).decodeAudioData(bytes);

// Level in dBFS of a sine at `hz` (Goertzel over one Hann-windowed second from the middle of channel 0).
const levelDb = (buffer: AudioBuffer, hz: number): number => {
    const data = buffer.getChannelData(0);
    const n = Math.min(buffer.sampleRate, data.length);
    const from = Math.max(0, Math.floor((data.length - n) / 2));
    const coeff = 2 * Math.cos((2 * Math.PI * hz) / buffer.sampleRate);
    let s1 = 0;
    let s2 = 0;
    let gain = 0;
    for (let i = 0; i < n; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
        gain += w;
        const s0 = data[from + i] * w + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
    }
    const magnitude = Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2);
    return 20 * Math.log10(Math.max((2 * magnitude) / gain, 1e-12));
};

// How many samples (at the copy's rate) the copy lags the original at `startSec`: normalised cross-correlation of
// a 0.25 s window from 40% into the copy, over ±100 ms (room for AAC priming), refined to a fraction of a sample. The original is decoded
// at its own rate and read by linear interpolation, which is exact enough for the band-limited test signals here.
const lagOf = (copy: AudioBuffer, original: AudioBuffer, startSec: number) => {
    const rate = copy.sampleRate;
    const c = copy.getChannelData(0);
    const o = original.getChannelData(0);
    const width = Math.round(0.25 * rate);
    const reach = Math.round(0.1 * rate);
    const from = Math.round(0.4 * c.length);
    const ref = new Float32Array(width + 2 * reach);
    for (let m = 0; m < ref.length; m++) {
        const at = (startSec + (from - reach + m) / rate) * original.sampleRate;
        const i = Math.floor(at);
        const f = at - i;
        ref[m] = i >= 0 && i + 1 < o.length ? o[i] * (1 - f) + o[i + 1] * f : 0;
    }
    let energyC = 0;
    for (let n = 0; n < width; n++) energyC += c[from + n] * c[from + n];
    const scores: number[] = [];
    for (let lag = -reach; lag <= reach; lag++) {
        let sum = 0;
        let energyR = 0;
        const shift = reach - lag;
        for (let n = 0; n < width; n++) {
            const r = ref[n + shift];
            sum += c[from + n] * r;
            energyR += r * r;
        }
        scores.push(sum / Math.sqrt(energyC * energyR || 1));
    }
    let best = 0;
    for (let k = 1; k < scores.length; k++) if (scores[k] > scores[best]) best = k;
    const [a, b, d] = [scores[best - 1] ?? 0, scores[best], scores[best + 1] ?? 0];
    const fraction = a - 2 * b + d === 0 ? 0 : (0.5 * (a - d)) / (a - 2 * b + d);
    return { lagSamples: Math.round((best - reach + fraction) * 100) / 100, correlation: Math.round(b * 1e4) / 1e4 };
};

// What the copy file holds besides audio: its tracks and any metadata tags (there should be neither).
const contentsOf = async (blob: Blob) => {
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
    try {
        const tags = await input.getMetadataTags();
        return {
            container: (await input.getFormat()).name,
            audioTracks: (await input.getAudioTracks()).length,
            videoTracks: (await input.getVideoTracks()).length,
            tags: Object.keys(tags).filter((key) => key !== 'raw'),
            rawTags: Object.keys(tags.raw ?? {})
        };
    } finally {
        input.dispose();
    }
};

// One copy, with everything the check asserts on.
const copy = async (req: CopyRequest) => {
    const source = await (await fetch(req.url)).blob();
    const progress: number[] = [];
    const t0 = performance.now();
    try {
        const result = await makeCompactCopy(source, {
            format: req.format,
            startSec: req.startSec,
            endSec: req.endSec,
            onProgress: (f) => progress.push(f)
        });
        const ms = Math.round(performance.now() - t0);
        const report = {
            ok: true as boolean,
            ms,
            size: result.blob.size,
            mime: result.blob.type,
            durationMs: result.durationMs,
            sampleRate: result.sampleRate,
            channels: result.channels,
            bitrate: result.bitrate,
            progress: {
                calls: progress.length,
                first: progress[0] ?? null,
                last: progress[progress.length - 1] ?? null,
                monotonic: progress.every((f, i) => i === 0 || f >= progress[i - 1])
            },
            decoded: null as null | { duration: number; channels: number; error?: string },
            alignment: null as null | { lagSamples: number; correlation: number },
            probes: {} as Record<string, number>,
            contents: await contentsOf(result.blob)
        };
        let decoded: AudioBuffer | null = null;
        try {
            if (req.decode !== false) decoded = await decode(await result.blob.arrayBuffer(), result.sampleRate);
            if (decoded) report.decoded = { duration: decoded.duration, channels: decoded.numberOfChannels };
        } catch (e) {
            report.decoded = { duration: 0, channels: 0, error: errorOf(e).error };
        }
        if (decoded && req.align && req.sourceRate) {
            const original = await decode(await source.arrayBuffer(), req.sourceRate);
            report.alignment = lagOf(decoded, original, req.startSec ?? 0);
        }
        if (decoded) for (const hz of req.probeHz ?? []) report.probes[hz] = Math.round(levelDb(decoded, hz) * 10) / 10;
        return report;
    } catch (e) {
        return {
            ok: false,
            ms: Math.round(performance.now() - t0),
            ...errorOf(e),
            progress: { calls: progress.length }
        };
    }
};

// Abort a copy once it passes `atFraction`: it must reject with an AbortError, promptly.
const abort = async (req: CopyRequest & { atFraction: number }) => {
    const source = await (await fetch(req.url)).blob();
    const controller = new AbortController();
    let abortedAt = 0;
    const run = makeCompactCopy(source, {
        format: req.format,
        signal: controller.signal,
        onProgress: (f) => {
            if (f >= req.atFraction && !abortedAt) {
                abortedAt = performance.now();
                controller.abort();
            }
        }
    });
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 30_000));
    try {
        const outcome = await Promise.race([run.then(() => 'resolved' as const), timeout]);
        return { outcome, abortedAt: abortedAt > 0 };
    } catch (e) {
        return { outcome: 'rejected', ...errorOf(e), settleMs: Math.round(performance.now() - abortedAt) };
    }
};

// The same Opus copy through mediabunny's own Conversion and resampler, for comparison on hi-res input.
const builtinProbe = async ({ url, probeHz }: { url: string; probeHz: number[] }) => {
    const source = await (await fetch(url)).blob();
    const target = new BufferTarget();
    const output = new Output({ format: new WebMOutputFormat(), target });
    const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
    const conversion = await Conversion.init({
        input,
        output,
        audio: { codec: 'opus', quality: new Quality({ bitrate: 160_000 }), sampleRate: 48_000, numberOfChannels: 2 },
        video: { discard: true },
        tags: {},
        showWarnings: false
    });
    await conversion.execute();
    const decoded = await decode(target.buffer!, 48_000);
    return Object.fromEntries(probeHz.map((hz) => [hz, Math.round(levelDb(decoded, hz) * 10) / 10]));
};

Object.assign(window, { musicTranscode: { pick: pickCopyFormat, copy, abort, builtinProbe } });
document.getElementById('status')!.textContent = 'ready';
