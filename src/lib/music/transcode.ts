// transcode.ts — the compact copy (省流副本): a small lossy rendition of a track for metered networks, made on
// the uploader's device because this phase has no media server. The original stays as uploaded.
// AAC-LC 256 kbps in MP4 where the browser has a WebCodecs AAC encoder (Safari 26+, Chrome on Windows, macOS
// and Android), otherwise Opus 160 kbps in WebM (Chromium on Linux and ChromeOS, Firefox desktop).
// Decode, downmix, resample and encode run one decoded chunk at a time, so an hour-long album image never sits
// in memory as PCM; only the compressed copy accumulates. Tags, cover art and video tracks stay out of the copy
// (tags live in the database). Resampling is our own Kaiser-windowed sinc: mediabunny's resampler interpolates
// linearly with no anti-alias filter, which folds a hi-res file's ultrasonic content into the audible band.
// Timeline: the copy starts exactly at the slice start. Opus copies keep the encoder's pre-skip in the OpusHead,
// so they line up with the original to the sample in Chromium; browser AAC encoders report no priming, so an AAC
// copy carries no edit list and starts late by the encoder delay (2112 samples is typical). Details and sources:
// ai/features/music/research/transcode.md.
// Feature doc: ai/features/music/music.md
import {
    ADTS,
    AudioSample,
    AudioSampleSink,
    AudioSampleSource,
    BlobSource,
    BufferTarget,
    canEncodeAudio,
    FLAC,
    Input,
    MATROSKA,
    MP3,
    MP4,
    Mp4OutputFormat,
    OGG,
    Output,
    QTFF,
    Quality,
    WAVE,
    WEBM,
    WebMOutputFormat
} from 'mediabunny';
import type { InputAudioTrack } from 'mediabunny';

export type CopyFormat = {
    codec: 'aac' | 'opus';
    container: 'mp4' | 'webm';
    /** target bitrate, bits per second */
    bitrate: number;
    /** Content-Type of the stored copy */
    mime: string;
    ext: 'm4a' | 'webm';
};

export type CopyResult = {
    blob: Blob;
    format: CopyFormat;
    /** length of the audio in the copy (the whole input or the slice), without codec priming or padding */
    durationMs: number;
    sampleRate: number;
    channels: number;
    /** measured average bitrate of the encoded audio, bits per second */
    bitrate: number;
};

type CopyOptions = {
    format: CopyFormat;
    /** slice start in seconds on the input's timeline (a CUE INDEX 01); defaults to the start of the audio */
    startSec?: number;
    /** slice end in seconds (the next track's INDEX 01); defaults to the end of the audio */
    endSec?: number;
    /** 0..1, at most once per percent */
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
};

// The preferred copy: plays everywhere, iPhone included, and goes through Web Audio on Safari.
const AAC_COPY: CopyFormat = { codec: 'aac', container: 'mp4', bitrate: 256_000, mime: 'audio/mp4', ext: 'm4a' };
// Chrome on Windows encodes AAC only up to 192 kbps; still better for an iPhone than Opus (plays on any iOS).
const AAC_COPY_192: CopyFormat = { codec: 'aac', container: 'mp4', bitrate: 192_000, mime: 'audio/mp4', ext: 'm4a' };
// The fallback where no AAC encoder exists: iPhone plays Opus in WebM from iOS 17.4, though not through Web Audio.
const OPUS_COPY: CopyFormat = { codec: 'opus', container: 'webm', bitrate: 160_000, mime: 'audio/webm', ext: 'webm' };

// Containers music arrives in (mediabunny's list without HLS and MPEG-TS).
const AUDIO_FORMATS = [MP4, QTFF, MATROSKA, WEBM, WAVE, OGG, FLAC, MP3, ADTS];

// Decoding starts this far before a slice so MP3, AAC, Vorbis and Opus decoders have settled by its first sample.
const PREROLL_SEC = 0.2;

const UNSUPPORTED_INPUT = '这台设备没法把这种格式转成省流副本';
const UNSUPPORTED_ENCODER = '这台设备做不了这种省流副本';
const BAD_RANGE = '这一段的起止时间不对';
const FAILED = '省流副本没做成';
const OWN_MESSAGES = new Set([UNSUPPORTED_INPUT, UNSUPPORTED_ENCODER, BAD_RANGE, FAILED]);

// Rejection for an aborted copy: named AbortError like fetch's, so callers can tell it from a failure.
const abortError = (): Error => new DOMException('已取消', 'AbortError');

// Our own errors pass through; anything else becomes `message`, keeping the original as its cause.
const asCopyError = (error: unknown, message: string): Error =>
    error instanceof Error && (error.name === 'AbortError' || OWN_MESSAGES.has(error.message))
        ? error
        : new Error(message, { cause: error });

// The best copy format this browser can encode, AAC first (256, then Windows' 192); null without WebCodecs
// audio encoding (Safari < 26).
export async function pickCopyFormat(): Promise<CopyFormat | null> {
    for (const format of [AAC_COPY, AAC_COPY_192, OPUS_COPY]) {
        // AAC keeps a 44.1 kHz source at 44.1 kHz, so both rates must encode; Opus always runs at 48 kHz.
        const rates = format.codec === 'aac' ? [44_100, 48_000] : [48_000];
        const quality = new Quality({ bitrate: format.bitrate });
        const answers = await Promise.all(
            rates.map((sampleRate) => canEncodeAudio(format.codec, { numberOfChannels: 2, sampleRate, quality }))
        );
        if (answers.every(Boolean)) return { ...format };
    }
    return null;
}

// Taps per side at the lower of the two rates, Kaiser β and passband edge (share of the lower Nyquist rate):
// about 80 dB of image and alias rejection, flat to about 19 kHz for 44.1 → 48 kHz.
const SINC_ZEROS = 32;
const KAISER_BETA = 8;
const ROLLOFF = 0.95;
// Cap on stored filter phases; real rate pairs need at most 640 (11.025 → 48 kHz).
const MAX_PHASES = 4096;

// Zeroth-order modified Bessel function of the first kind (power series), for the Kaiser window.
const besselI0 = (x: number): number => {
    const q = (x * x) / 4;
    let sum = 1;
    let term = 1;
    for (let k = 1; term > sum * 1e-12; k++) {
        term *= q / (k * k);
        sum += term;
    }
    return sum;
};

// Greatest common divisor, to reduce the rate ratio to up/down.
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

type Resampler = {
    /** adds input; returns the output it settles, planar stereo [left…, right…] */
    push: (left: Float32Array, right: Float32Array) => Float32Array;
    /** ends the input (silence follows it) and returns the rest of the output */
    flush: () => Float32Array;
};

// A streaming polyphase resampler for stereo. Output sample n sits exactly at input position n·inRate/outRate,
// so the timeline is kept to the sample; the filter looks `half` samples ahead, which flush() fills with silence.
const createResampler = (inRate: number, outRate: number): Resampler => {
    const divisor = gcd(inRate, outRate);
    const up = outRate / divisor;
    const down = inRate / divisor;
    const scale = Math.min(1, up / down);
    const half = Math.ceil(SINC_ZEROS / scale);
    const taps = 2 * half;
    const phases = Math.min(up, MAX_PHASES);
    const cutoff = 0.5 * scale * ROLLOFF; // cycles per input sample
    const table = new Float32Array(phases * taps);
    const windowNorm = besselI0(KAISER_BETA);
    for (let p = 0; p < phases; p++) {
        let sum = 0;
        for (let k = 0; k < taps; k++) {
            const t = k - half + 1 - p / phases; // tap k's input sample, relative to the output position
            const r = t / half;
            const x = 2 * cutoff * t;
            const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
            const tap = r * r < 1 ? (sinc * besselI0(KAISER_BETA * Math.sqrt(1 - r * r))) / windowNorm : 0;
            table[p * taps + k] = tap;
            sum += tap;
        }
        for (let k = 0; k < taps; k++) table[p * taps + k] /= sum; // unity gain at DC in every phase
    }

    let left = new Float32Array(8192 + taps);
    let right = new Float32Array(8192 + taps);
    let base = 1 - half; // input index held at left[0]; the half-1 zeros before input 0 are silence
    let held = half - 1;
    let received = 0;
    let produced = 0;

    const append = (l: Float32Array, r: Float32Array) => {
        if (held + l.length > left.length) {
            const size = Math.max(2 * left.length, held + l.length);
            const grownLeft = new Float32Array(size);
            const grownRight = new Float32Array(size);
            grownLeft.set(left.subarray(0, held));
            grownRight.set(right.subarray(0, held));
            left = grownLeft;
            right = grownRight;
        }
        left.set(l, held);
        right.set(r, held);
        held += l.length;
    };

    // Makes every output sample whose taps are all held (at most `limit` in total), then drops spent input.
    const run = (limit: number): Float32Array => {
        const last = base + held - 1;
        const room = Math.max(0, Math.min(limit, Math.ceil(((last - half + 2) * up) / down) + 1) - produced);
        const out = new Float32Array(2 * room);
        // Locals for the hot loop: closure variables would be reloaded on every tap.
        const [inLeft, inRight, from] = [left, right, base];
        let count = 0;
        let n = produced;
        while (count < room) {
            const position = n * down;
            let i = Math.floor(position / up);
            let phase = position - i * up;
            if (phases !== up) {
                phase = Math.round((phase * phases) / up);
                if (phase === phases) {
                    phase = 0;
                    i += 1;
                }
            }
            if (i + half > last) break;
            const at = i - half + 1 - from;
            const offset = phase * taps;
            let l = 0;
            let r = 0;
            for (let k = 0; k < taps; k++) {
                const c = table[offset + k];
                l += c * inLeft[at + k];
                r += c * inRight[at + k];
            }
            out[count] = l;
            out[room + count] = r;
            count++;
            n++;
        }
        produced = n;
        const drop = Math.min(held, Math.floor((produced * down) / up) - half + 1 - base);
        if (drop > 0) {
            left.copyWithin(0, drop, held);
            right.copyWithin(0, drop, held);
            held -= drop;
            base += drop;
        }
        out.copyWithin(count, room, room + count);
        return out.subarray(0, 2 * count);
    };

    return {
        push: (l, r) => {
            received += l.length;
            append(l, r);
            return run(Infinity);
        },
        flush: () => {
            const silence = new Float32Array(half + 1);
            append(silence, silence);
            return run(Math.ceil((received * up) / down));
        }
    };
};

// Frames [offset, offset + count) of a decoded sample as planar stereo: mono is doubled, quad and 5.1 fold down
// by the Web Audio "speakers" rules (L R C LFE SL SR order), any other layout keeps its first two channels.
const stereoOf = (sample: AudioSample, offset: number, count: number): Float32Array => {
    const out = new Float32Array(2 * count);
    const left = out.subarray(0, count);
    const right = out.subarray(count);
    const read = (plane: number, into: Float32Array) =>
        sample.copyTo(into, { planeIndex: plane, format: 'f32-planar', frameOffset: offset, frameCount: count });
    read(0, left);
    if (sample.numberOfChannels === 1) {
        right.set(left);
        return out;
    }
    read(1, right);
    const channels = sample.numberOfChannels;
    if (channels !== 4 && channels !== 6) return out;
    const extra = new Float32Array(count);
    const mix = (plane: number, into: Float32Array, gain: number) => {
        read(plane, extra);
        for (let i = 0; i < count; i++) into[i] += gain * extra[i];
    };
    if (channels === 4) {
        mix(2, left, 1);
        mix(3, right, 1);
        for (let i = 0; i < 2 * count; i++) out[i] *= 0.5;
    } else {
        mix(2, left, Math.SQRT1_2);
        mix(2, right, Math.SQRT1_2);
        mix(4, left, Math.SQRT1_2);
        mix(5, right, Math.SQRT1_2);
    }
    return out;
};

// The primary audio track when this device can decode it; otherwise the "can't convert here" error.
const openTrack = async (media: Input): Promise<InputAudioTrack> => {
    const track = await media.getPrimaryAudioTrack().catch((error: unknown) => {
        throw new Error(UNSUPPORTED_INPUT, { cause: error });
    });
    if (!track || !(await track.canDecode())) throw new Error(UNSUPPORTED_INPUT);
    return track;
};

// Where the audio ends, in seconds, for progress only: header metadata first, else the last packet; 0 if unknown.
const endOf = async (track: InputAudioTrack): Promise<number> =>
    (await track.getDurationFromMetadata().catch(() => null)) ?? (await track.computeDuration().catch(() => 0));

// Turns `input`, or its startSec–endSec slice, into a compact copy in `format`, streaming from decode to encode.
// Rejects with the short Chinese messages above, or with an AbortError when `signal` aborts.
export async function makeCompactCopy(input: Blob, opts: CopyOptions): Promise<CopyResult> {
    const { format, startSec, endSec, onProgress, signal } = opts;
    if (signal?.aborted) throw abortError();
    const badStart = startSec !== undefined && !(startSec >= 0);
    if (badStart || (endSec !== undefined && !(endSec > (startSec ?? 0)))) throw new Error(BAD_RANGE);

    const media = new Input({ source: new BlobSource(input), formats: AUDIO_FORMATS });
    const target = new BufferTarget();
    const container = format.container === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : null;
    const output = new Output({ format: container ?? new WebMOutputFormat(), target });
    let samples: AsyncGenerator<AudioSample, void, unknown> | null = null;
    try {
        const track = await openTrack(media);
        const start = startSec ?? Math.max(0, await track.getFirstTimestamp());
        const end = endSec ?? Infinity;
        const span = (endSec ?? (await endOf(track))) - start;
        const quality = new Quality({ bitrate: format.bitrate });
        let packetBytes = 0;
        const encoder = new AudioSampleSource({
            codec: format.codec,
            quality,
            onEncodedPacket: (packet) => {
                packetBytes += packet.byteLength;
            }
        });
        output.addAudioTrack(encoder);
        await output.start();

        let shown = -1;
        const progress = (fraction: number) => {
            const value = Math.min(1, Math.max(0, fraction));
            if (!onProgress || (value < 1 && value - shown < 0.01)) return;
            shown = value;
            onProgress(value);
        };
        progress(0);

        // Rates and frame counters are fixed by the first decoded sample: decoders may not run at the
        // container's nominal rate (HE-AAC, for one).
        let rate = 0;
        let outRate = 0;
        let startFrame = 0;
        let endFrame = Infinity;
        let cursor = 0; // next input frame of the slice to take
        let written = 0; // output frames handed to the encoder
        let resampler: Resampler | null = null;
        const emit = async (stereo: Float32Array) => {
            if (!stereo.length) return;
            const timestamp = written / outRate;
            const sample = new AudioSample({
                data: stereo,
                format: 'f32-planar',
                numberOfChannels: 2,
                sampleRate: outRate,
                timestamp
            });
            written += stereo.length / 2;
            try {
                await encoder.add(sample);
            } finally {
                sample.close();
            }
        };
        const feed = (stereo: Float32Array) => {
            const frames = stereo.length / 2;
            return emit(resampler ? resampler.push(stereo.subarray(0, frames), stereo.subarray(frames)) : stereo);
        };

        samples = new AudioSampleSink(track).samples(start - PREROLL_SEC, end);
        for (;;) {
            if (signal?.aborted) throw abortError();
            const step = await samples.next().catch((error: unknown) => {
                throw asCopyError(error, UNSUPPORTED_INPUT);
            });
            if (step.done) break;
            const sample = step.value;
            try {
                if (!rate) {
                    rate = sample.sampleRate;
                    outRate = format.codec === 'aac' && (rate === 44_100 || rate === 48_000) ? rate : 48_000;
                    const encoding = { numberOfChannels: 2, sampleRate: outRate, quality };
                    if (!(await canEncodeAudio(format.codec, encoding))) throw new Error(UNSUPPORTED_ENCODER);
                    resampler = rate === outRate ? null : createResampler(rate, outRate);
                    startFrame = cursor = Math.round(start * rate);
                    endFrame = Number.isFinite(end) ? Math.round(end * rate) : Infinity;
                } else if (sample.sampleRate !== rate) {
                    throw new Error(UNSUPPORTED_INPUT);
                }
                const first = Math.round(sample.timestamp * rate);
                const from = Math.max(first, cursor);
                const to = Math.min(first + sample.numberOfFrames, endFrame);
                if (to <= from) continue;
                // A short hole in the decoded audio becomes silence, so the copy keeps the original's timeline.
                if (from - cursor > 0 && from - cursor <= rate) await feed(new Float32Array(2 * (from - cursor)));
                cursor = to;
                await feed(stereoOf(sample, from - first, to - from));
            } finally {
                sample.close();
            }
            progress(span > 0 ? (cursor - startFrame) / rate / span : 0);
            if (cursor >= endFrame) break;
        }
        if (!rate) throw new Error(UNSUPPORTED_INPUT); // nothing decoded at all
        if (cursor === startFrame) throw new Error(BAD_RANGE); // the slice lies past the end of the audio
        if (signal?.aborted) throw abortError();
        if (resampler) await emit(resampler.flush());
        encoder.close();
        await output.finalize();
        if (!target.buffer) throw new Error(FAILED);
        progress(1);

        const seconds = written / outRate;
        return {
            blob: new Blob([target.buffer], { type: format.mime }),
            format: { ...format },
            durationMs: Math.round(seconds * 1000),
            sampleRate: outRate,
            channels: 2,
            bitrate: Math.round((packetBytes * 8) / seconds)
        };
    } catch (error) {
        await output.cancel().catch(() => undefined);
        throw asCopyError(error, FAILED);
    } finally {
        await samples?.return();
        media.dispose();
    }
}
