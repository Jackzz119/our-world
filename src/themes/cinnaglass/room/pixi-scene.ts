// pixi-scene.ts — the WebGL room compositor (PixiJS v8). One render tree,
// one lighting story: base art, rain (masked to the glass), clock hands,
// characters and the weather light pass all live in the same pipeline, so
// mood grading reaches every layer — the "pasted on" look of the CSS
// prototype is gone by construction.
//
// Layer tree (all coordinates in base-image pixels, root scales to cover):
//   root
//   ├─ world                       ← AdjustmentFilter (weather desaturation)
//   │   ├─ base sprites (per mood art, alpha cross-fade)
//   │   ├─ rain container          ← masked by window-pane Graphics
//   │   ├─ clock (shadow + hands)  ← mood tint
//   │   └─ characters              ← mood tint + contact shadow
//   └─ light (wash/glow/breath, rebuilt per mood, alpha fade)

import {
    Application,
    Assets,
    CanvasSource,
    Container,
    Graphics,
    PerspectiveMesh,
    Rectangle,
    Sprite,
    Texture
} from 'pixi.js';
import { AdjustmentFilter } from 'pixi-filters';
import type { PxEllipse, PxPoint, PxRect, RoomMood, RoomTemplate, RoomWeather } from './room-types';
import { resolveRoomArt } from './room-types';

export type CharacterAssets = Record<string, { open: string; closed: string }>;

export type SceneHandle = {
    setMood: (mood: RoomMood, animate: boolean) => void;
    setWeather: (weather: RoomWeather, animate: boolean) => void;
    /** Screen-space (CSS px) anchor above a seat's head, for DOM overlays. */
    getSeatScreenPos: (seatId: string) => { x: number; y: number } | null;
    resize: () => void;
    destroy: () => void;
};

/* ------------------------------------------------------------------ */
/* mood & weather recipes                                              */
/* ------------------------------------------------------------------ */

type LightRecipe = {
    /** character/clock multiply tint — how much of the room's light they eat */
    actorTint: number;
    washTop: string;
    washBottom: string;
    washAlpha: number;
    washBlend: 'multiply' | 'screen' | 'normal';
    glowColor: string;
    glowAlpha: number;
    breathAlpha: number; // cloud-cover light breathing (rain only)
};

const RECIPES: Record<RoomMood, Record<RoomWeather, LightRecipe>> = {
    golden: {
        sun: {
            actorTint: 0xffe8cf,
            washTop: 'rgba(255,190,120,0.30)',
            washBottom: 'rgba(150,130,190,0.12)',
            washAlpha: 0.5,
            washBlend: 'normal',
            glowColor: 'rgba(255,205,140,1)',
            glowAlpha: 0.42,
            breathAlpha: 0,
        },
        rain: {
            actorTint: 0xd8dde8,
            washTop: 'rgba(150,170,200,0.42)',
            washBottom: 'rgba(110,130,165,0.22)',
            washAlpha: 0.55,
            washBlend: 'normal',
            glowColor: 'rgba(205,220,238,1)',
            glowAlpha: 0.28,
            breathAlpha: 0.30,
        }
    },
    // codex audit M3: dim less globally, keep faces warm — washes dropped
    // ~15%, actor tints lifted toward lamp-warm
    twilight: {
        sun: {
            actorTint: 0xf8ddd2,
            washTop: 'rgba(235,150,150,0.22)',
            washBottom: 'rgba(95,90,170,0.16)',
            washAlpha: 0.42,
            washBlend: 'normal',
            glowColor: 'rgba(250,170,130,1)',
            glowAlpha: 0.34,
            breathAlpha: 0,
        },
        rain: {
            actorTint: 0xd4d2e4,
            washTop: 'rgba(140,140,178,0.30)',
            washBottom: 'rgba(75,80,130,0.22)',
            washAlpha: 0.47,
            washBlend: 'normal',
            glowColor: 'rgba(190,200,228,1)',
            glowAlpha: 0.24,
            breathAlpha: 0.34,
        }
    },
    night: {
        sun: {
            actorTint: 0xc2cbe6,
            washTop: 'rgba(90,120,190,0.13)',
            washBottom: 'rgba(25,32,68,0.20)',
            washAlpha: 0.47,
            washBlend: 'normal',
            glowColor: 'rgba(165,195,245,1)',
            glowAlpha: 0.20,
            breathAlpha: 0,
        },
        rain: {
            actorTint: 0xb8c0dd,
            washTop: 'rgba(80,100,155,0.17)',
            washBottom: 'rgba(22,28,60,0.23)',
            washAlpha: 0.5,
            washBlend: 'normal',
            glowColor: 'rgba(150,180,235,1)',
            glowAlpha: 0.18,
            breathAlpha: 0.28,
        }
    }
};

// weather-wide grading applied to the whole world container (art included)
const WEATHER_GRADE: Record<RoomWeather, { saturation: number; brightness: number }> = {
    sun: { saturation: 1, brightness: 1 },
    rain: { saturation: 0.86, brightness: 0.96 }
};

/* ------------------------------------------------------------------ */
/* gradient texture helpers (offscreen canvas — version-stable)        */
/* ------------------------------------------------------------------ */

function linearGradientTexture(top: string, bottom: string, angleDeg = 115): Texture {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const rad = (angleDeg * Math.PI) / 180;
    const x = Math.cos(rad) * 64;
    const y = Math.sin(rad) * 64;
    const g = ctx.createLinearGradient(32 - x / 2, 32 - y / 2, 32 + x / 2, 32 + y / 2);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return Texture.from(c);
}

function radialGradientTexture(color: string, innerAlpha = 1): Texture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    const rgba = (a: number) => color.replace(/,\s*[\d.]+\)$/, `,${a})`);
    g.addColorStop(0, rgba(innerAlpha));
    g.addColorStop(0.55, rgba(innerAlpha * 0.45));
    g.addColorStop(1, rgba(0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return Texture.from(c);
}

/* ------------------------------------------------------------------ */
/* living props: cuts taken from the base art itself                   */
/* ------------------------------------------------------------------ */

type ArtImage = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

/** Texture over an offscreen canvas drawn at `res`× so rotation resampling stays crisp. */
function canvasTexture(c: HTMLCanvasElement, res: number): Texture {
    return new Texture({ source: new CanvasSource({ resource: c, resolution: res }) });
}

/* --- tiny 3×3 homography kit (row-major) --- */
type Mat3 = [number, number, number, number, number, number, number, number, number];

function mul3(a: Mat3, b: Mat3): Mat3 {
    const r = new Array(9).fill(0) as Mat3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
}

function inv3(m: Mat3): Mat3 {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det) as Mat3;
}

/** Apply a homography to a point (with the perspective divide). */
function apply3(m: Mat3, x: number, y: number): [number, number] {
    const w = m[6] * x + m[7] * y + m[8];
    return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

/**
 * Homography from disc-plane coordinates (unit circle = the vinyl rim,
 * origin = its true center) to base-image px. The painted rim ellipse fixes
 * the plane up to a circle-preserving projective map; the painted center
 * pins that down to a Klein-model translation, leaving exactly one freedom:
 * the spin angle — the thing we animate. Flat (affine) spinning cannot keep
 * both the rim AND the label still under real perspective, this can.
 */
function discHomography(e: PxEllipse, center: PxPoint): Mat3 {
    const cos = Math.cos(e.tilt);
    const sin = Math.sin(e.tilt);
    // affine part: unit circle → painted rim ellipse
    const A: Mat3 = [e.rx * cos, -e.ry * sin, e.cx, e.rx * sin, e.ry * cos, e.cy, 0, 0, 1];
    const [px, py] = apply3(inv3(A), center.x, center.y); // painted center inside the unit disc
    const a = Math.hypot(px, py);
    if (a < 1e-4 || a >= 0.98) return A; // no measurable perspective (or a bad measurement)
    const phi = Math.atan2(py, px);
    const s = Math.sqrt(1 - a * a);
    // hyperbolic translation of the unit disc taking the origin to (a, 0)
    const B: Mat3 = [1, 0, a, 0, s, 0, a, 0, 1];
    const R: Mat3 = [Math.cos(phi), -Math.sin(phi), 0, Math.sin(phi), Math.cos(phi), 0, 0, 0, 1];
    const Rt: Mat3 = [Math.cos(phi), Math.sin(phi), 0, -Math.sin(phi), Math.cos(phi), 0, 0, 0, 1];
    return mul3(A, mul3(R, mul3(B, Rt)));
}

type Corners = [number, number, number, number, number, number, number, number];

/**
 * Screen corners of the disc-plane unit square turned by `spin`, in the
 * order PerspectiveMesh wants (top-left, top-right, bottom-right, bottom-left).
 */
function discCorners(H: Mat3, spin: number): Corners {
    const c = Math.cos(spin);
    const s = Math.sin(spin);
    const pts: number[] = [];
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pts.push(...apply3(H, u * c - v * s, u * s + v * c));
    }
    return pts as Corners;
}

const artPixelCache = new WeakMap<object, ImageData>();

/** Whole-art RGBA readback, cached per decoded image. */
function artPixels(img: ArtImage): ImageData {
    let id = artPixelCache.get(img);
    if (!id) {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        id = ctx.getImageData(0, 0, c.width, c.height);
        artPixelCache.set(img, id);
    }
    return id;
}

type DiscCut = {
    /** the record itself — turns */
    spin: Texture;
    /** its broad specular sheen — additive, never turns */
    sheen: Texture;
};

/**
 * Lift the painted vinyl into a true top-down disc texture by inverse-warping
 * the base art through the disc homography (bilinear taps). Painted details
 * that must not turn (tonearm, spindle) are inpainted from the same radius at
 * another angle — grooves are concentric circles here, so the fill is
 * seamless — and re-laid on top as static patches by the caller; the broad
 * sheen is split off into its own static additive layer (`splitSheen`). The
 * rim is feathered 1px inside the painted edge so the static outer ring hides
 * any sub-pixel drift. Rendered at 2× so the spin resamples crisply.
 */
function carveDisc(img: ArtImage, H: Mat3, rx: number, stills: PxPoint[][]): DiscCut {
    const RES = 2;
    const S = Math.ceil(rx * 2) * RES; // texture covers disc-plane [-1, 1]²
    const art = artPixels(img);
    const AW = art.width;
    const AH = art.height;
    const src = art.data;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;
    const out = ctx.createImageData(S, S);
    const o = out.data;
    const rIn = (rx - 3.5) / rx; // fully opaque inside
    const rOut = (rx - 1) / rx; // transparent from here out
    for (let j = 0; j < S; j++) {
        const v = ((j + 0.5) / S) * 2 - 1;
        for (let i = 0; i < S; i++) {
            const u = ((i + 0.5) / S) * 2 - 1;
            const r = Math.hypot(u, v);
            if (r >= rOut) continue; // stays transparent
            const [x, y] = apply3(H, u, v);
            const x0 = Math.floor(x - 0.5);
            const y0 = Math.floor(y - 0.5);
            if (x0 < 0 || y0 < 0 || x0 + 1 >= AW || y0 + 1 >= AH) continue;
            const fx = x - 0.5 - x0;
            const fy = y - 0.5 - y0;
            const k = (j * S + i) * 4;
            const p00 = (y0 * AW + x0) * 4;
            const p10 = p00 + 4;
            const p01 = p00 + AW * 4;
            const p11 = p01 + 4;
            for (let ch = 0; ch < 3; ch++) {
                const top = src[p00 + ch] * (1 - fx) + src[p10 + ch] * fx;
                const bot = src[p01 + ch] * (1 - fx) + src[p11 + ch] * fx;
                o[k + ch] = top * (1 - fy) + bot * fy;
            }
            const t = r <= rIn ? 1 : 1 - (r - rIn) / (rOut - rIn);
            o[k + 3] = 255 * t * t * (3 - 2 * t); // smoothstep feather
        }
    }
    if (stills.length) polarInpaint(out, S, inv3(H), stills);
    const sheen = splitSheen(out, S, 6 * RES);
    ctx.putImageData(out, 0, 0);
    const c2 = document.createElement('canvas');
    c2.width = S;
    c2.height = S;
    c2.getContext('2d')!.putImageData(sheen, 0, 0);
    return { spin: canvasTexture(c, RES), sheen: canvasTexture(c2, RES) };
}

/**
 * Split the broad specular sheen off the disc. Real light stays put while a
 * record turns, so everything brighter than the disc's rotationally
 * symmetric baseline (per-radius median), taken at low frequency, moves to a
 * static additive layer. Fine streaks and the label's mottling stay on the
 * spinning cut — they ARE the visible proof of the spin. At spin 0 the two
 * layers sum back to the base art exactly.
 */
function splitSheen(o: ImageData, S: number, blurPx: number): ImageData {
    const d = o.data;
    const half = S / 2;
    const nb = Math.ceil(half) + 1;
    const buckets: number[][] = Array.from({ length: nb }, () => []);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const i = (y * S + x) * 4;
            if (d[i + 3] === 0) continue;
            const r = Math.round(Math.hypot(x + 0.5 - half, y + 0.5 - half));
            if (r < nb) buckets[r].push(i);
        }
    }
    const baseline = new Float32Array(nb * 3);
    for (let b = 0; b < nb; b++) {
        const idx = buckets[b];
        if (!idx.length) continue;
        for (let ch = 0; ch < 3; ch++) {
            const vals = idx.map((i) => d[i + ch]).sort((p, q) => p - q);
            baseline[b * 3 + ch] = vals[vals.length >> 1];
        }
    }
    const resid = new Float32Array(S * S * 3);
    for (let b = 0; b < nb; b++) {
        for (const i of buckets[b]) {
            const p = (i / 4) * 3;
            for (let ch = 0; ch < 3; ch++) resid[p + ch] = Math.max(0, d[i + ch] - baseline[b * 3 + ch]);
        }
    }
    const low = boxBlur(boxBlur(resid, S, blurPx), S, blurPx); // two box passes ≈ gaussian
    const sheen = new ImageData(S, S);
    const sd = sheen.data;
    for (let i = 0, p = 0; i < d.length; i += 4, p += 3) {
        if (d[i + 3] === 0) continue;
        for (let ch = 0; ch < 3; ch++) {
            const l = Math.min(low[p + ch], d[i + ch]);
            sd[i + ch] = l;
            d[i + ch] -= l;
        }
        sd[i + 3] = d[i + 3];
    }
    return sheen;
}

/** Separable box blur over a 3-channel float image; outside the image counts as 0. */
function boxBlur(src: Float32Array, S: number, r: number): Float32Array {
    const norm = 1 / (2 * r + 1);
    const pass = (inp: Float32Array, vertical: boolean) => {
        const out = new Float32Array(inp.length);
        const at = (line: number, k: number, ch: number) => (k < 0 || k >= S ? 0 : inp[(vertical ? k * S + line : line * S + k) * 3 + ch]);
        for (let line = 0; line < S; line++) {
            for (let ch = 0; ch < 3; ch++) {
                let acc = 0;
                for (let k = -r; k <= r; k++) acc += at(line, k, ch);
                for (let k = 0; k < S; k++) {
                    out[(vertical ? k * S + line : line * S + k) * 3 + ch] = acc * norm;
                    acc += at(line, k + r + 1, ch) - at(line, k - r, ch);
                }
            }
        }
        return out;
    };
    return pass(pass(src, false), true);
}

/**
 * Paint over disc-texture regions that must NOT turn with the vinyl, using
 * pixels from the same radius at another angle. `regions` are polygons in
 * base px; a homography keeps straight edges straight, so mapping the
 * vertices through `Hinv` is enough to rasterize them in disc space.
 */
function polarInpaint(tex: ImageData, S: number, Hinv: Mat3, regions: PxPoint[][]): void {
    const m = document.createElement('canvas');
    m.width = S;
    m.height = S;
    const mctx = m.getContext('2d')!;
    mctx.fillStyle = '#fff';
    mctx.strokeStyle = '#fff';
    mctx.lineWidth = 4; // margin so anti-aliased edges of the detail go too
    mctx.lineJoin = 'round';
    for (const poly of regions) {
        mctx.beginPath();
        poly.forEach((p, i) => {
            const [u, v] = apply3(Hinv, p.x, p.y);
            const tx = ((u + 1) / 2) * S;
            const ty = ((v + 1) / 2) * S;
            if (i) mctx.lineTo(tx, ty);
            else mctx.moveTo(tx, ty);
        });
        mctx.closePath();
        mctx.fill();
        mctx.stroke();
    }
    const mask = mctx.getImageData(0, 0, S, S).data;
    const d = tex.data;
    const src = new Uint8ClampedArray(d); // always read the untouched copy
    const half = S / 2;
    // candidate angular offsets, nearest first, so groove phase drifts least
    const STEPS = [0.7, -0.7, 1.4, -1.4, 2.1, -2.1, Math.PI];
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const i = (y * S + x) * 4;
            if (mask[i + 3] < 128) continue;
            const dx = x + 0.5 - half;
            const dy = y + 0.5 - half;
            const r = Math.hypot(dx, dy);
            const a = Math.atan2(dy, dx);
            for (const step of STEPS) {
                const sx = Math.round(half + r * Math.cos(a + step) - 0.5);
                const sy = Math.round(half + r * Math.sin(a + step) - 0.5);
                if (sx < 0 || sy < 0 || sx >= S || sy >= S) continue;
                const j = (sy * S + sx) * 4;
                if (mask[j + 3] >= 128) continue;
                d[i] = src[j];
                d[i + 1] = src[j + 1];
                d[i + 2] = src[j + 2];
                d[i + 3] = src[j + 3];
                break;
            }
        }
    }
}

/**
 * Re-cut a hand-traced polygon of the base art as its own sprite with a
 * feathered silhouette, so it can sit above a moving prop (and be nudged a
 * pixel or two itself) without a hard seam. Returns the texture plus the
 * base-px box it was cut from, for placement.
 */
function carvePatch(img: ArtImage, poly: PxPoint[]): { tex: Texture; box: PxRect } {
    const RES = 2;
    const PAD = 3;
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    const x0 = Math.floor(Math.min(...xs)) - PAD;
    const y0 = Math.floor(Math.min(...ys)) - PAD;
    const box: PxRect = { x: x0, y: y0, w: Math.ceil(Math.max(...xs)) + PAD - x0, h: Math.ceil(Math.max(...ys)) + PAD - y0 };
    const c = document.createElement('canvas');
    c.width = box.w * RES;
    c.height = box.h * RES;
    const ctx = c.getContext('2d')!;
    ctx.scale(RES, RES);
    ctx.drawImage(img, -box.x, -box.y);
    ctx.globalCompositeOperation = 'destination-in';
    if ('filter' in ctx) ctx.filter = 'blur(1px)';
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(p.x - box.x, p.y - box.y) : ctx.moveTo(p.x - box.x, p.y - box.y)));
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
    return { tex: canvasTexture(c, RES), box };
}

/**
 * Four-point star sparkle: long soft cross rays + a bright core + a faint
 * halo. Drawn once on an offscreen canvas, reused by every particle.
 */
function sparkleTexture(): Texture {
    const S = 96;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;
    const m = S / 2;

    // color tiers per the sparkle spec: core #FFF8E8, rays #FFE6B5, halo #FFC978
    const ray = (len: number, w: number, angle: number) => {
        ctx.save();
        ctx.translate(m, m);
        ctx.rotate(angle);
        const g = ctx.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0, 'rgba(255,230,181,0)');
        g.addColorStop(0.5, 'rgba(255,230,181,0.95)');
        g.addColorStop(1, 'rgba(255,230,181,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, len, w, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };
    // halo — low-alpha warm amber only, never a solid orange blob
    const halo = ctx.createRadialGradient(m, m, 2, m, m, m * 0.8);
    halo.addColorStop(0, 'rgba(255,201,120,0.4)');
    halo.addColorStop(1, 'rgba(255,201,120,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);
    // long vertical/horizontal rays, short diagonals
    ray(m * 0.9, m * 0.1, 0);
    ray(m * 0.9, m * 0.1, Math.PI / 2);
    ray(m * 0.42, m * 0.07, Math.PI / 4);
    ray(m * 0.42, m * 0.07, -Math.PI / 4);
    // core
    const core = ctx.createRadialGradient(m, m, 0, m, m, m * 0.16);
    core.addColorStop(0, 'rgba(255,255,248,1)');
    core.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, S, S);
    return Texture.from(c);
}

/* ------------------------------------------------------------------ */
/* rain particles (ported from the canvas prototype)                   */
/* ------------------------------------------------------------------ */

type Streak = { pane: number; x: number; y: number; len: number; speed: number; drift: number; alpha: number; width: number };
type TrailPoint = { x: number; y: number; age: number };
type Drop = { pane: number; x: number; y: number; r: number; vy: number; sliding: boolean; wobble: number; trail: TrailPoint[] };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const TRAIL_FADE_S = 1.4;

function makeStreak(room: RoomTemplate, pane: number, anywhere: boolean): Streak {
    const p = room.window.panes[pane];
    const speed = rand(300, 560);
    return {
        pane,
        x: rand(p.x, p.x + p.w),
        y: anywhere ? rand(p.y, p.y + p.h) : p.y - rand(0, 40),
        len: rand(14, 30),
        speed,
        drift: -speed * 0.055,
        alpha: 0.10 + (speed / 560) * 0.22,
        width: rand(1, 1.7)
    };
}

function makeDrop(room: RoomTemplate, pane: number): Drop {
    const p = room.window.panes[pane];
    return {
        pane,
        x: rand(p.x + 6, p.x + p.w - 6),
        y: rand(p.y + 6, p.y + p.h * 0.7),
        r: rand(1.2, 2.4),
        vy: 0,
        sliding: false,
        wobble: rand(0, Math.PI * 2),
        trail: []
    };
}

/* ------------------------------------------------------------------ */
/* scene construction                                                  */
/* ------------------------------------------------------------------ */

export async function buildScene(
    app: Application,
    room: RoomTemplate,
    charAssets: CharacterAssets,
    initialMood: RoomMood,
    initialWeather: RoomWeather,
    onHotspot?: (id: string) => void
): Promise<SceneHandle> {
    const { w: baseW, h: baseH } = room.base;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- asset loading ---------- */
    const artUrls = [...new Set(Object.values(room.art))] as string[];
    const charUrls = Object.values(charAssets).flatMap((a) => [a.open, a.closed]);
    const textures = await Assets.load<Texture>([...artUrls, ...charUrls]);

    /* ---------- tree ---------- */
    const root = new Container();
    const world = new Container();
    const light = new Container();
    root.addChild(world, light);
    app.stage.addChild(root);

    // base art sprites, one per distinct file, cross-faded by alpha
    const baseSprites = new Map<string, Sprite>();
    for (const url of artUrls) {
        const s = new Sprite(textures[url]);
        s.width = baseW;
        s.height = baseH;
        s.alpha = 0;
        world.addChild(s);
        baseSprites.set(url, s);
    }

    /* ---------- living props: the turntable ----------
       Living-diorama direction (2026-08-22, ai/design_system/research/
       living-props.md): furniture moves instead of glowing. The vinyl is
       carved out of EVERY mood's base art (ellipse → un-squashed circle) and
       spun inside a frame that re-applies the perspective squash + tilt; the
       tonearm is re-cut as a soft-edged patch drawn above it, so the arm
       holds still while the record turns. The per-mood cuts cross-fade with
       the base sprites, so the disc never looks pasted on. Hover is a state
       change on the prop: the platter leans faster, the arm gives a swing. */
    const turntable = room.props?.turntable;
    const vinyls: PerspectiveMesh[] = []; // one per art, all sharing the spin
    let vinylH: Mat3 | null = null; // disc plane → base px
    let vinylSpin = 0; // radians turned so far
    let armSwing: Container | null = null; // rotation = nudge about the post
    const propSprites = new Map<string, Container[]>(); // art url → its cuts, faded with the base
    let vinylSpeed = (Math.PI * 2) / 9; // idle: one turn / 9s
    let armVel = 0;
    if (turntable) {
        const { platter: e, center, armPivot, armPatch, stills = [] } = turntable;
        vinylH = discHomography(e, center);
        const platterLayer = new Container();
        const sheenLayer = new Container(); // static light on the record, additive
        const stillLayer = new Container(); // spindle & co: on the platter, never turning
        armSwing = new Container();
        armSwing.position.set(armPivot.x, armPivot.y);
        const restCorners = discCorners(vinylH, 0);
        for (const url of artUrls) {
            // the loaded art texture's source is a decoded image we can sample
            const img = textures[url].source.resource as ArtImage | undefined;
            if (!img) continue;
            const record = carveDisc(img, vinylH, e.rx, [armPatch, ...stills]);
            const disc = new PerspectiveMesh({ texture: record.spin, verticesX: 12, verticesY: 12 });
            platterLayer.addChild(disc);
            vinyls.push(disc);
            const sheen = new PerspectiveMesh({ texture: record.sheen, verticesX: 12, verticesY: 12 });
            sheen.setCorners(...restCorners);
            sheen.blendMode = 'add';
            sheenLayer.addChild(sheen);
            const cuts: Container[] = [disc, sheen];
            for (const poly of stills) {
                const patch = carvePatch(img, poly);
                const still = new Sprite(patch.tex);
                still.position.set(patch.box.x, patch.box.y);
                stillLayer.addChild(still);
                cuts.push(still);
            }
            const armCut = carvePatch(img, armPatch);
            const arm = new Sprite(armCut.tex);
            arm.position.set(armCut.box.x - armPivot.x, armCut.box.y - armPivot.y);
            armSwing.addChild(arm);
            cuts.push(arm);
            propSprites.set(url, cuts);
        }
        world.addChild(platterLayer, sheenLayer, stillLayer, armSwing);
    }
    // place the record quad for the current spin — perspective-correct by
    // construction, so rim and label both stay put while it turns
    const layVinyl = () => {
        if (!vinylH) return;
        const p = discCorners(vinylH, vinylSpin);
        for (const m of vinyls) m.setCorners(...p);
    };
    layVinyl();

    /* ---------- rain (masked to glass panes) ---------- */
    const rainC = new Container();
    const paneMask = new Graphics();
    for (const p of room.window.panes) paneMask.rect(p.x, p.y, p.w, p.h);
    paneMask.fill({ color: 0xffffff });
    rainC.mask = paneMask;
    rainC.addChild(paneMask); // mask must be in the tree
    const streakG = new Graphics();
    const dropG = new Graphics();
    rainC.addChild(streakG, dropG);
    world.addChild(rainC);

    const streaks: Streak[] = [];
    const drops: Drop[] = [];
    room.window.panes.forEach((p, i) => {
        const sc = Math.min(70, Math.round((p.w * p.h) / 5200));
        for (let n = 0; n < sc; n++) streaks.push(makeStreak(room, i, true));
        const dc = Math.min(10, Math.round((p.w * p.h) / 20000));
        for (let n = 0; n < dc; n++) drops.push(makeDrop(room, i));
    });

    /* ---------- clock ---------- */
    const clockC = new Container();
    clockC.position.set(room.clock.center.x, room.clock.center.y);
    const r = room.clock.radius;
    // painted drop shadow behind the hands sells "hands on the wall"
    const handShadow = new Graphics();
    handShadow.position.set(r * 0.03, r * 0.05);
    handShadow.alpha = 0.35;
    const hands = new Graphics();
    clockC.addChild(handShadow, hands);
    world.addChild(clockC);

    const drawHands = (g: Graphics, shadow: boolean) => {
        const now = new Date();
        const s = now.getSeconds() + now.getMilliseconds() / 1000;
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;
        const col = shadow ? 0x2c2118 : undefined;
        const hand = (angleDeg: number, len: number, w: number, color: number) => {
            const a = ((angleDeg - 90) * Math.PI) / 180;
            g.moveTo(0, 0);
            g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            g.stroke({ width: w, color: col ?? color, cap: 'round' });
        };
        hand(h * 30, r * 0.50, r * 0.075, 0x5b4636);
        hand(m * 6, r * 0.74, r * 0.055, 0x6b543f);
        hand(s * 6, r * 0.84, r * 0.026, 0xa4553f); // sweep second — quiet, cozy
        g.circle(0, 0, r * 0.05).fill({ color: col ?? 0x4c3a2c });
    };

    /* ---------- characters ---------- */
    type Char = {
        sway: Container;
        breathe: Container;
        sprite: Sprite;
        open: Texture;
        closed: Texture;
        phase: number;
        nextBlinkAt: number;
        blinkUntil: number;
        doubleBlink: boolean;
    };
    const chars: Char[] = [];
    const actorLayer = new Container();
    world.addChild(actorLayer);

    for (const seat of room.seats) {
        const assets = charAssets[seat.id];
        if (!assets) continue;
        const open = textures[assets.open];
        const closed = textures[assets.closed];
        const holder = new Container();
        holder.position.set(seat.foot.x, seat.foot.y);

        // contact shadow: grounds the character on the furniture
        const shadowTex = radialGradientTexture('rgba(30,24,40,1)', 1);
        const shadow = new Sprite(shadowTex);
        shadow.anchor.set(0.5);
        shadow.alpha = 0.30;
        holder.addChild(shadow);

        const sway = new Container();
        const breathe = new Container();
        const sprite = new Sprite(open);
        sprite.anchor.set(0.5, 1); // feet at the anchor point
        const scale = seat.height / sprite.texture.height;
        sprite.scale.set(scale);
        shadow.width = sprite.width * 0.92;
        shadow.height = sprite.width * 0.17;
        breathe.addChild(sprite);
        sway.addChild(breathe);
        holder.addChild(sway);
        actorLayer.addChild(holder);

        chars.push({
            sway,
            breathe,
            sprite,
            open,
            closed,
            phase: seat.phase,
            nextBlinkAt: performance.now() + rand(1500, 5000),
            blinkUntil: 0,
            doubleBlink: false
        });
    }

    // mood grading for actors + clock: they eat the room's light via tint
    const setActorTint = (tint: number) => {
        for (const c of chars) c.sprite.tint = tint;
        hands.tint = tint;
    };

    /* ---------- furniture hotspots (sparkles + living props + tap) ----------
       Affordance v5 (2026-08-22 user direction: no glow, no edge, no image
       swap — "the furniture itself moves"). Three states:
         silent  — nothing at all, the room is just a painting
         hint    — sparkles ONLY, a touch dimmer than hover
         hover   — a greeting sparkle plus the prop's own state change (the
                   vinyl leans faster, the tonearm swings; see living props)
       Hotspots without a living prop yet only sparkle on hover. */
    type Hot = {
        rect: (typeof room.hotspots)[number]['rect'];
        hovered: boolean;
        nextSparkleAt: number;
        hintPhase: number; // >0 while the periodic hint plays (start time)
        hoverAt: number; // when the pointer entered
    };
    const hots: Hot[] = [];
    const hotLayer = new Container();
    world.addChild(hotLayer);

    for (const h of room.hotspots) {
        const zone = new Container();
        zone.eventMode = 'static';
        zone.cursor = 'pointer';
        zone.hitArea = new Rectangle(h.rect.x, h.rect.y, h.rect.w, h.rect.h);

        const hot: Hot = {
            rect: h.rect,
            hovered: false,
            nextSparkleAt: rand(1, 6), // desynced first twinkles
            hintPhase: 0,
            hoverAt: 0
        };
        zone.on('pointerover', () => {
            hot.hovered = true; // living props read this in the ticker
            hot.hintPhase = 0;
            hot.hoverAt = elapsed;
            hot.nextSparkleAt = -1; // greet the pointer with one spark right away
        });
        zone.on('pointerout', () => {
            hot.hovered = false;
        });
        zone.on('pointertap', () => {
            // a real interaction satisfies curiosity — quiet the hints a while
            nextHintAt = elapsed + rand(18, 30);
            onHotspot?.(h.id);
        });
        hots.push(hot);
        hotLayer.addChild(zone);
    }

    // periodic hint scheduler: one furniture piece takes a turn to whisper
    // "I'm tappable" — a burst of big sparkles, nothing else.
    // Research-tuned pacing (affordance survey 2026-08-15): first hint after
    // 8–12s idle, then 22–45s between hints — companion products hint slower
    // than puzzle games, and any tap resets the clock (hints must never nag).
    let nextHintAt = rand(8, 12);
    const HINT_EVERY: [number, number] = [22, 45];
    const HINT_DUR = 2.6; // fade in 0.6 + hold/breathe 1.3 + fade out 0.7

    /* ---------- sparkle affordance (replaces the idle ring) ----------
       Tuning follows the sparkle mockup brief: warm gold, 6–16px, sine
       fade in/out, ≤8 visible at once across the room. */
    type Spark = { sprite: Sprite; born: number; life: number; size: number; spin: number; drift: number; peak: number };
    const sparks: Spark[] = [];
    const sparkTex = sparkleTexture();
    const sparkLayer = new Container();
    world.addChild(sparkLayer);
    // rhythm per the sparkle spec: idle 0–1 per spot (3–6 visible room-wide),
    // hover ≤2 per spot at a calm 0.9–1.4s pace — never a pulse train
    const IDLE_GAP: [number, number] = [2.8, 6.5];
    const HOVER_GAP: [number, number] = [0.9, 1.4];
    const MAX_SPARKS = 8;

    // `peak` caps a spark's brightness so the three states stay ranked:
    // idle whisper < periodic hint < hover confirmation (v4 user direction)
    const spawnSpark = (hot: Hot, t: number, sizeRange: [number, number] = [12, 22], peak = 0.78) => {
        if (sparks.length >= MAX_SPARKS + 6) return; // hard cap incl. bursts
        const s = new Sprite(sparkTex);
        s.anchor.set(0.5);
        // biased toward the object's center so sparks sit ON the furniture
        const bx = 0.22 + Math.random() * 0.56;
        const by = 0.22 + Math.random() * 0.56;
        s.position.set(hot.rect.x + hot.rect.w * bx, hot.rect.y + hot.rect.h * by);
        s.blendMode = 'add';
        s.alpha = 0;
        const size = rand(sizeRange[0], sizeRange[1]);
        s.width = size;
        s.height = size;
        sparkLayer.addChild(s);
        sparks.push({
            sprite: s,
            born: t,
            life: rand(1.6, 2.4), // spec: 1.6–2.4s with natural jitter
            size,
            spin: rand(-0.5, 0.5),
            drift: rand(0.5, 3), // px/s upward — twinkle in place, no flight path
            peak
        });
    };

    // weather grading for the whole world (art included)
    const weatherFilter = new AdjustmentFilter();
    world.filters = [weatherFilter];

    /* ---------- light pass (rebuilt per recipe, cross-faded) ---------- */
    const glowRect = room.window.glow;
    const buildLight = (rec: LightRecipe): Container => {
        const c = new Container();

        const wash = new Sprite(linearGradientTexture(rec.washTop, rec.washBottom));
        wash.width = baseW;
        wash.height = baseH;
        wash.alpha = rec.washAlpha;
        if (rec.washBlend !== 'normal') wash.blendMode = rec.washBlend;
        c.addChild(wash);

        const glow = new Sprite(radialGradientTexture(rec.glowColor));
        glow.anchor.set(0.5);
        glow.position.set(glowRect.x + glowRect.w / 2, glowRect.y + glowRect.h / 2);
        glow.width = glowRect.w * 2.6;
        glow.height = glowRect.h * 2.1;
        glow.blendMode = 'screen';
        glow.alpha = rec.glowAlpha;
        c.addChild(glow);

        if (rec.breathAlpha > 0) {
            const breath = new Sprite(radialGradientTexture('rgba(30,38,62,1)'));
            breath.anchor.set(0.5);
            breath.position.copyFrom(glow.position);
            breath.width = glow.width;
            breath.height = glow.height;
            breath.blendMode = 'multiply';
            breath.alpha = 0;
            breath.label = 'breath';
            c.addChild(breath);
        }

        // vignette retired (2026-08-11 user call): the frame-rect version
        // read as a black overlay hugging the edges — the design comps have
        // no edge darkening at all, so the light pass ends here.
        return c;
    };

    /* ---------- state & transitions ---------- */
    let mood: RoomMood = initialMood;
    let weather: RoomWeather = initialWeather;
    let currentLight: Container | null = null;
    type Fade = { obj: Container | Sprite; from: number; to: number; start: number; dur: number; kill?: boolean };
    let fades: Fade[] = [];

    const startFade = (obj: Container | Sprite, to: number, dur: number, kill = false) => {
        fades = fades.filter((f) => f.obj !== obj);
        fades.push({ obj, from: obj.alpha, to, start: performance.now(), dur, kill });
    };

    const applyRecipe = (animate: boolean) => {
        const rec = RECIPES[mood][weather];
        const grade = WEATHER_GRADE[weather];
        weatherFilter.saturation = grade.saturation;
        weatherFilter.brightness = grade.brightness;
        setActorTint(rec.actorTint);

        const targetArt = resolveRoomArt(room, mood);
        for (const [url, s] of baseSprites) {
            const to = url === targetArt ? 1 : 0;
            // prop cuts were taken from this very art, so they fade with it
            for (const obj of [s, ...(propSprites.get(url) ?? [])]) {
                if (animate) startFade(obj, to, 900);
                else obj.alpha = to;
            }
        }

        const next = buildLight(rec);
        next.alpha = 0;
        light.addChild(next);
        if (animate) {
            startFade(next, 1, 900);
            if (currentLight) startFade(currentLight, 0, 900, true);
        } else {
            next.alpha = 1;
            if (currentLight) {
                light.removeChild(currentLight);
                currentLight.destroy({ children: true });
            }
        }
        currentLight = next;
    };

    /* ---------- ticker ---------- */
    let elapsed = 0;
    const musicHotIndex = room.hotspots.findIndex((h) => h.id === 'music');
    // tonearm nudge spring: stiff enough to answer within ~0.3s, damped just
    // under critical so it settles with one soft overshoot (dt is capped at
    // 0.1s above, well inside the stable range for this pair)
    const ARM_SPRING_K = 120;
    const ARM_SPRING_DAMP = 14;
    const tick = () => {
        const dtMs = app.ticker.deltaMS;
        const dt = Math.min(dtMs, 100) / 1000;
        elapsed += dt;
        const now = performance.now();

        // alpha fades
        for (const f of fades) {
            const t = Math.min(1, (now - f.start) / f.dur);
            f.obj.alpha = f.from + (f.to - f.from) * t;
            if (t >= 1 && f.kill) {
                f.obj.parent?.removeChild(f.obj as Container);
                (f.obj as Container).destroy({ children: true });
            }
        }
        fades = fades.filter((f) => now - f.start < f.dur);

        // rain
        const raining = weather === 'rain';
        rainC.visible = raining || rainC.alpha > 0.01;
        startRainAlpha(raining);
        if (raining) {
            for (const s of streaks) {
                const p = room.window.panes[s.pane];
                s.y += s.speed * dt;
                s.x += s.drift * dt;
                if (s.y > p.y + p.h + s.len) Object.assign(s, makeStreak(room, s.pane, false));
            }
            for (const d of drops) {
                const p = room.window.panes[d.pane];
                if (!d.sliding) {
                    d.r += dt * rand(0.05, 0.25);
                    if (d.r > 3.3 && Math.random() < dt * 0.35) d.sliding = true;
                } else {
                    d.vy = Math.min(d.vy + 140 * dt, rand(50, 95));
                    d.wobble += dt * 7;
                    d.y += d.vy * dt;
                    d.x += Math.sin(d.wobble) * 4 * dt;
                    d.r = Math.max(1.4, d.r - dt * 0.35);
                    d.trail.push({ x: d.x, y: d.y, age: 0 });
                    if (d.trail.length > 26) d.trail.shift();
                    if (d.y > p.y + p.h + 4) Object.assign(d, makeDrop(room, d.pane));
                }
                for (const t of d.trail) t.age += dt;
                d.trail = d.trail.filter((t) => t.age < TRAIL_FADE_S);
            }
            streakG.clear();
            for (const s of streaks) {
                streakG.moveTo(s.x, s.y);
                streakG.lineTo(s.x - s.drift * 0.05, s.y - s.len);
                streakG.stroke({ width: s.width, color: 0xdeecfc, alpha: s.alpha, cap: 'round' });
            }
            dropG.clear();
            for (const d of drops) {
                for (let i = 1; i < d.trail.length; i++) {
                    const a = d.trail[i - 1];
                    const b = d.trail[i];
                    const fade = Math.max(0, 1 - b.age / TRAIL_FADE_S);
                    if (fade <= 0) continue;
                    dropG.moveTo(a.x, a.y);
                    dropG.lineTo(b.x, b.y);
                    dropG.stroke({ width: d.r * 0.8, color: 0xd7e8fa, alpha: 0.16 * fade, cap: 'round' });
                }
                dropG.circle(d.x, d.y, d.r).fill({ color: 0xe8f2fc, alpha: 0.5 });
                dropG.circle(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.35).fill({ color: 0xffffff, alpha: 0.65 });
            }
        }

        // characters: breathe, sway, blink
        for (const c of chars) {
            c.breathe.scale.y = 1 + 0.016 * Math.sin((elapsed / 3.6 + c.phase) * Math.PI * 2);
            c.breathe.scale.x = 1 - 0.003 * Math.sin((elapsed / 3.6 + c.phase) * Math.PI * 2);
            c.sway.rotation = 0.009 * Math.sin((elapsed / 7.4 + c.phase * 0.9) * Math.PI * 2);
            if (c.blinkUntil > 0 && now >= c.blinkUntil) {
                c.sprite.texture = c.open;
                c.blinkUntil = 0;
                if (c.doubleBlink) {
                    c.doubleBlink = false;
                    c.nextBlinkAt = now + 180;
                } else {
                    c.nextBlinkAt = now + rand(2400, 6500);
                }
            } else if (now >= c.nextBlinkAt && c.blinkUntil === 0) {
                c.sprite.texture = c.closed;
                c.blinkUntil = now + 140;
                if (Math.random() < 0.15) c.doubleBlink = true;
                c.nextBlinkAt = Infinity;
            }
        }

        // clock (redraw is cheap; sweep second hand)
        hands.clear();
        handShadow.clear();
        drawHands(handShadow, true);
        drawHands(hands, false);

        // cloud-cover light breathing
        if (currentLight) {
            const breath = currentLight.getChildByLabel?.('breath') as Sprite | null;
            if (breath) {
                const rec = RECIPES[mood][weather];
                breath.alpha = rec.breathAlpha * (0.5 + 0.5 * Math.sin((elapsed / 11) * Math.PI * 2));
            }
        }

        // living props: the vinyl never stops; hovering the turntable leans
        // on the platter (speed) and the tonearm gives a small swing — state
        // changes on the prop itself, never a glow swap
        if (vinylH && armSwing) {
            const hovered = musicHotIndex >= 0 && hots[musicHotIndex].hovered;
            const target = hovered ? (Math.PI * 2) / 4 : (Math.PI * 2) / 9;
            vinylSpeed += (target - vinylSpeed) * Math.min(1, dt * 3); // soft ramp
            vinylSpin = (vinylSpin + vinylSpeed * dt) % (Math.PI * 2);
            layVinyl();
            // under-damped spring toward the swung/rest angle: it overshoots a
            // touch and settles, which is what "a part just moved" feels like
            const armTarget = hovered ? -0.05 : 0; // ~3°, outward: ~4px at the headshell
            armVel += (ARM_SPRING_K * (armTarget - armSwing.rotation) - ARM_SPRING_DAMP * armVel) * dt;
            armSwing.rotation += armVel * dt;
        }

        // periodic hint: one spot at a time bursts a few big sparkles —
        // "you can tap me", said politely. No edge here (v4).
        if (elapsed >= nextHintAt) {
            const candidates = hots.filter((h) => !h.hovered && h.hintPhase === 0);
            if (candidates.length) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                pick.hintPhase = elapsed;
                // mockup: 4–5 visible stars sell the "look here" moment
                for (let n = 0; n < 4; n++) spawnSpark(pick, elapsed + n * 0.12, [18, 30], 0.88);
            }
            nextHintAt = elapsed + rand(HINT_EVERY[0], HINT_EVERY[1]);
        }
        // release the hint slot once its sparkle burst has lived out
        for (const h of hots) {
            if (h.hintPhase > 0 && elapsed - h.hintPhase >= HINT_DUR) h.hintPhase = 0;
        }

        // sparkle affordance: rare twinkles while idle, a shimmer on hover
        for (const h of hots) {
            if (elapsed >= h.nextSparkleAt) {
                const greeting = h.hovered && h.nextSparkleAt === -1;
                const idleBudget = sparks.length < MAX_SPARKS;
                if (h.hovered || idleBudget) {
                    spawnSpark(h, elapsed, h.hovered ? [16, 28] : [12, 22], h.hovered ? 1 : 0.78);
                    if (greeting) {
                        // mockup hover state: a small ring of stars greets the pointer
                        spawnSpark(h, elapsed + 0.1, [14, 22], 1);
                        spawnSpark(h, elapsed + 0.22, [10, 18], 1);
                    }
                }
                const [lo, hi] = h.hovered ? HOVER_GAP : IDLE_GAP;
                h.nextSparkleAt = elapsed + rand(lo, hi);
            }
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
            const sp = sparks[i];
            const t = (elapsed - sp.born) / sp.life;
            if (t >= 1) {
                sp.sprite.parent?.removeChild(sp.sprite);
                sp.sprite.destroy();
                sparks.splice(i, 1);
                continue;
            }
            // spec scale curve 0.35→1.0→0.25: bloom in, peak, melt away
            const a = Math.sin(Math.PI * t);
            sp.sprite.alpha = a * sp.peak;
            const sc = (0.3 + 0.7 * a) * (sp.size / sparkTex.width);
            sp.sprite.scale.set(sc);
            sp.sprite.rotation = sp.spin * t;
            sp.sprite.y -= sp.drift * dt; // gentle upward shimmer
        }
    };

    let rainFadeTarget = -1;
    const startRainAlpha = (raining: boolean) => {
        const target = raining ? 1 : 0;
        if (rainFadeTarget !== target) {
            rainFadeTarget = target;
            startFade(rainC, target, 900);
        }
    };

    app.ticker.maxFPS = 30;
    app.ticker.add(tick);

    /* ---------- power discipline ---------- */
    const onVisibility = () => {
        if (document.hidden) app.stop();
        else app.start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (reduced) {
        // reduced motion: render one full frame, then freeze
        applyRecipe(false);
        app.render();
        app.stop();
    }

    /* ---------- cover-fit layout ---------- */
    // the shipped base art carries a painted ~20px rounded dark frame (a
    // concept-era window prop); over-scaling the cover pushes it off-canvas
    // until frameless art lands. All anchors share root's transform, so
    // hotspots/seats stay aligned.
    const EDGE_CROP = 1.035;
    const resize = () => {
        const w = app.renderer.width / app.renderer.resolution;
        const h = app.renderer.height / app.renderer.resolution;
        const s = Math.max(w / baseW, h / baseH) * EDGE_CROP; // cover + crop
        root.scale.set(s);
        root.position.set((w - baseW * s) / 2, (h - baseH * s) / 2);
    };
    resize();

    applyRecipe(false);

    return {
        setMood(next, animate) {
            if (next === mood) return;
            mood = next;
            applyRecipe(animate && !reduced);
        },
        setWeather(next, animate) {
            if (next === weather) return;
            weather = next;
            applyRecipe(animate && !reduced);
        },
        getSeatScreenPos(seatId) {
            const seat = room.seats.find((s) => s.id === seatId);
            if (!seat) return null;
            // ~22px of air above the hand-tuned visual head top (codex audit
            // H1: the tag must read as "her status", not a wall toast);
            // toGlobal already yields logical (CSS px) stage coordinates
            return root.toGlobal({
                x: seat.foot.x,
                y: seat.foot.y - seat.height * seat.headRatio - 22
            });
        },
        resize,
        destroy() {
            document.removeEventListener('visibilitychange', onVisibility);
            app.ticker.remove(tick);
        }
    };
}
