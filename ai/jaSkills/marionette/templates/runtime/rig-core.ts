// rig-core.ts — engine-agnostic runtime for a marionette character rig.
//
// Everything here is plain math on typed arrays and timestamps: no renderer, no DOM, no clock of
// its own (the caller passes `nowMs`), no randomness of its own (the caller passes `random`), so a
// test can replay any sequence exactly. An engine adapter (rig-pixi.ts, or your own) owns the
// meshes and applies what this computes:
//
//   deformVertices  idle breath / lean / hair sway, plus a morph shift, into a mesh's positions
//   createSwitcher  which poses are visible at what opacity, and which ones are mid-morph
//   createBlinker   when the current pose shows its closed-eye frame
//
// The files it reads are written by the pipeline's export stage (rig.json + data PNGs).

/** The export stage's manifest (rig.json). */
export type RigManifest = {
    version: 2;
    canvas: { w: number; h: number };
    /** Canvas px between mesh vertices: the mesh is (w / grid + 1) x (h / grid + 1) vertices. */
    grid: number;
    flowFormat: 'rgb12';
    anchor: string;
    poses: Record<string, { open: string; closed?: string; idle?: string; slow: boolean }>;
    /** Flow fields keyed `from-to`; both directions of a pair are always present together. */
    morphs: Record<string, string>;
    /** Where the canvas sits in the scene frame it was registered onto, if any. */
    placement?: { origin: [number, number]; scale: number };
};

/** Per-vertex motion weights, 0..1, row by row. */
export type WeightMap = { cols: number; rows: number; breath: Float32Array; hair: Float32Array };

/** Per-vertex flow: where each vertex's content sits in the other pose, canvas px. */
export type FlowField = { dx: Float32Array; dy: Float32Array };

/** Vertex grid size for a canvas, matching the pipeline's sampling. */
export const gridSize = (m: Pick<RigManifest, 'canvas' | 'grid'>) => ({
    cols: Math.floor(m.canvas.w / m.grid) + 1,
    rows: Math.floor(m.canvas.h / m.grid) + 1
});

/** Decode an idle weight map from its RGBA bytes (R = breath, G = hair). */
export function decodeWeights(px: Uint8ClampedArray, cols: number, rows: number): WeightMap {
    const breath = new Float32Array(cols * rows);
    const hair = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) {
        breath[i] = px[i * 4] / 255;
        hair[i] = px[i * 4 + 1] / 255;
    }
    return { cols, rows, breath, hair };
}

/** Decode a flow field from its RGBA bytes: dx, dy as 12 bits each at 1/8 px (pipeline pack_flow). */
export function decodeFlow(px: Uint8ClampedArray, cols: number, rows: number): FlowField {
    const dx = new Float32Array(cols * rows);
    const dy = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) {
        const r = px[i * 4];
        const g = px[i * 4 + 1];
        const b = px[i * 4 + 2];
        dx[i] = (((r << 4) | (g >> 4)) - 2048) / 8;
        dy[i] = ((((g & 15) << 8) | b) - 2048) / 8;
    }
    return { dx, dy };
}

/* ---------------------------------------------------------------- idle motion */

/** Idle motion, in canvas px, radians and seconds. Tune per character, keep it subtle. */
export type Motion = {
    breathPx: number;
    breathS: number;
    leanRad: number;
    leanS: number;
    hairPx: number;
    /** Three incommensurate periods, so the sway never visibly repeats. */
    hairS: [number, number, number];
    /** Canvas y the upper body leans about (the seat / the torso cut). */
    pivotY: number;
};

export const DEFAULT_MOTION: Omit<Motion, 'pivotY'> = {
    breathPx: 3.2,
    breathS: 3.6,
    leanRad: 0.004,
    leanS: 7.4,
    hairPx: 4.5,
    hairS: [4.2, 2.3, 3.1]
};

const TAU = Math.PI * 2;

/**
 * Write one moment of a pose's mesh into `out` (x, y interleaved, same layout as `rest`).
 * Breath lifts along -y by the breath weight; the lean turns the weighted upper body about pivotY;
 * hair drifts sideways by the hair weight with its phase running down the hair, so the tips follow
 * the roots. `shift` * `amount` adds a morph on top, so idle motion never stops during a transition.
 */
export function deformVertices(
    rest: Float32Array,
    out: Float32Array,
    w: WeightMap,
    t: number,
    m: Motion,
    shift: FlowField | null = null,
    amount = 0
): void {
    const lift = -m.breathPx * 0.5 * (1 + Math.sin((t / m.breathS) * TAU));
    const lean = m.leanRad * Math.sin((t / m.leanS) * TAU);
    const a1 = (t / m.hairS[0]) * TAU;
    const a2 = (t / m.hairS[1]) * TAU + 1.3;
    const a3 = (t / m.hairS[2]) * TAU + 0.6;
    for (let i = 0, n = w.cols * w.rows; i < n; i++) {
        const x = rest[i * 2];
        const y = rest[i * 2 + 1];
        const b = w.breath[i];
        const h = w.hair[i];
        let dx = lean * (m.pivotY - y) * b;
        let dy = lift * b;
        if (h > 0.01) {
            dx += m.hairPx * h * (0.65 * Math.sin(a1 + y * 0.011) + 0.35 * Math.sin(a2 + y * 0.017));
            dy += m.hairPx * 0.25 * h * Math.sin(a3 + y * 0.013);
        }
        if (shift) {
            dx += shift.dx[i] * amount;
            dy += shift.dy[i] * amount;
        }
        out[i * 2] = x + dx;
        out[i * 2 + 1] = y + dy;
    }
}

/* ---------------------------------------------------------------- pose switching */

export type Timing = {
    /** A morph between two poses with flow fields. */
    morphMs: number;
    /** Cover-and-fade: the incoming pose fades in above the (still opaque) outgoing one... */
    crossfadeMs: number;
    /** ...which then fades out once covered. */
    handoverMs: number;
    /** The same two steps for poses marked `slow` (falling asleep reads as dozing off). */
    slowCrossfadeMs: number;
    slowHandoverMs: number;
};

export const DEFAULT_TIMING: Timing = {
    morphMs: 420,
    crossfadeMs: 180,
    handoverMs: 120,
    slowCrossfadeMs: 400,
    slowHandoverMs: 300
};

/** One visible pose this frame: its opacity, and the morph field bending it, if any. */
export type PoseFrame = { alpha: number; shift: { field: string; amount: number } | null };

export type Switcher = {
    /** Change to `pose` (null = nobody there). The adapter must draw `pose` above the others. */
    show: (pose: string | null, nowMs: number, animate: boolean) => void;
    /** Opacity and morph per pose at `nowMs`; poses not listed are invisible. */
    frame: (nowMs: number) => Map<string, PoseFrame>;
    /** True while a morph runs: hold the blink until it lands. */
    morphing: () => boolean;
    current: () => string | null;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

type Tween = { from: number; to: number; start: number; ms: number };

/**
 * Pose switching without a see-through moment. Two rules carry it:
 *  1. Never two poses half-transparent at once: the scene would show through the figure (reads as a
 *     flicker). The outgoing pose stays opaque until the incoming one covers it.
 *  2. Morph where the pipeline found a trustworthy flow, so silhouettes meet instead of dissolving.
 */
export function createSwitcher(opts: {
    morphs: Pick<RigManifest, 'morphs'>['morphs'];
    slow: (pose: string) => boolean;
    timing?: Partial<Timing>;
}): Switcher {
    const T = { ...DEFAULT_TIMING, ...opts.timing };
    const alpha = new Map<string, number>();
    const tweens = new Map<string, Tween>();
    let handovers: { pose: string; at: number; ms: number }[] = [];
    let morph: { from: string; to: string; start: number } | null = null;
    let current: string | null = null;

    const tween = (pose: string, to: number, now: number, ms: number) => {
        const from = valueAt(pose, now);
        if (ms <= 0 || from === to) {
            tweens.delete(pose);
            alpha.set(pose, to);
        } else tweens.set(pose, { from, to, start: now, ms });
    };
    const valueAt = (pose: string, now: number) => {
        const tw = tweens.get(pose);
        if (!tw) return alpha.get(pose) ?? 0;
        const k = Math.min(1, (now - tw.start) / tw.ms);
        return tw.from + (tw.to - tw.from) * k;
    };
    const land = () => {
        if (!morph) return;
        alpha.set(morph.from, 0);
        alpha.set(morph.to, 1);
        morph = null;
    };

    return {
        show(pose, now, animate) {
            if (pose === current) return;
            // a new change lands the running morph first; half-bent meshes never stack
            land();
            const from = current;
            const slow = (from !== null && opts.slow(from)) || (pose !== null && opts.slow(pose));
            // coming back before a hand-over finished: that pose simply fades up again
            handovers = handovers.filter((h) => h.pose !== pose);
            if (animate && from && pose && opts.morphs[`${from}-${pose}`] && opts.morphs[`${pose}-${from}`]) {
                tweens.delete(from);
                tweens.delete(pose);
                alpha.set(from, 1);
                alpha.set(pose, 0);
                morph = { from, to: pose, start: now };
            } else {
                if (pose) tween(pose, 1, now, animate ? (slow ? T.slowCrossfadeMs : T.crossfadeMs) : 0);
                if (from) {
                    if (!animate) tween(from, 0, now, 0);
                    else if (pose)
                        handovers.push({
                            pose: from,
                            at: now + (slow ? T.slowCrossfadeMs : T.crossfadeMs),
                            ms: slow ? T.slowHandoverMs : T.handoverMs
                        });
                    else tween(from, 0, now, T.crossfadeMs);
                }
            }
            current = pose;
        },
        frame(now) {
            handovers = handovers.filter((h) => {
                if (now < h.at) return true;
                tween(h.pose, 0, now, h.ms);
                return false;
            });
            const out = new Map<string, PoseFrame>();
            for (const [pose, tw] of tweens) {
                if (now >= tw.start + tw.ms) {
                    alpha.set(pose, tw.to);
                    tweens.delete(pose);
                }
            }
            if (morph) {
                const t = (now - morph.start) / T.morphMs;
                if (t >= 1) land();
                else {
                    const e = easeInOut(t);
                    // shapes travel the whole way; the pictures swap only in the middle, and whatever
                    // the flow could not bend into the new silhouette leaves once it is covered
                    out.set(morph.from, {
                        alpha: 1 - smoothstep(0.8, 1, t),
                        shift: { field: `${morph.from}-${morph.to}`, amount: e }
                    });
                    out.set(morph.to, {
                        alpha: smoothstep(0.25, 0.75, t),
                        shift: { field: `${morph.to}-${morph.from}`, amount: 1 - e }
                    });
                }
            }
            for (const pose of new Set([...alpha.keys(), ...tweens.keys()])) {
                if (out.has(pose)) continue;
                const a = valueAt(pose, now);
                if (a > 0) out.set(pose, { alpha: a, shift: null });
            }
            return out;
        },
        morphing: () => morph !== null,
        current: () => current
    };
}

/* ---------------------------------------------------------------- blinking */

export type BlinkTiming = { closeMs: number; gapMs: [number, number]; doubleChance: number; doubleGapMs: number };
export const DEFAULT_BLINK: BlinkTiming = { closeMs: 140, gapMs: [2400, 6500], doubleChance: 0.15, doubleGapMs: 180 };

export type Blinker = {
    /** Restart the rhythm (after a pose change). */
    reset: (nowMs: number) => void;
    /** Whether the closed-eye frame shows at `nowMs`. */
    closed: (nowMs: number) => boolean;
};

export function createBlinker(random: () => number, nowMs: number, timing: Partial<BlinkTiming> = {}): Blinker {
    const B = { ...DEFAULT_BLINK, ...timing };
    const gap = () => B.gapMs[0] + random() * (B.gapMs[1] - B.gapMs[0]);
    let next = nowMs + gap() * 0.6;
    let until = 0;
    let again = false;
    return {
        reset(now) {
            until = 0;
            again = false;
            next = now + gap();
        },
        closed(now) {
            if (until > 0 && now >= until) {
                until = 0;
                next = now + (again ? B.doubleGapMs : gap());
                again = false;
            } else if (until === 0 && now >= next) {
                until = now + B.closeMs;
                again = random() < B.doubleChance;
            }
            return until > 0;
        }
    };
}
