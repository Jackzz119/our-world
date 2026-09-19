// textures.ts — every offscreen-canvas texture the room compositor draws
// with: gradients for the light pass, baked shadows, feathered cuts of the
// base art and the sparkle star. All pure: same arguments in, same pixels
// out, no state of their own, nothing here knows about the scene.

import { CanvasSource, Texture } from 'pixi.js';
import type { PxPoint, PxRect } from './room-types';

/** A 64x64 two-stop linear gradient at the given angle, stretched into the light wash. */
export function linearGradientTexture(top: string, bottom: string, angleDeg = 115): Texture {
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

/**
 * A 256x256 radial falloff in one color, used for the window glow, the
 * cloud-cover breath and the characters' contact shadows.
 */
export function radialGradientTexture(color: string, innerAlpha = 1): Texture {
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

/** Any image source both Pixi and canvas2d accept to draw from. */
export type ArtImage = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

/** Texture over an offscreen canvas drawn at `res`× so rotation resampling stays crisp. */
export function canvasTexture(c: HTMLCanvasElement, res: number): Texture {
    return new Texture({ source: new CanvasSource({ resource: c, resolution: res }) });
}

/**
 * Bake a soft cast-shadow texture from a part's alpha: its silhouette,
 * blurred, filled black. Position and opacity are driven at runtime (light
 * direction per mood, how far the part is lifted), so the shadow answers the
 * motion.
 */
export function shadowTexture(img: ArtImage, res: number, blurPx: number): Texture {
    const pad = Math.ceil(blurPx * 3);
    const c = document.createElement('canvas');
    c.width = img.width + pad * 2;
    c.height = img.height + pad * 2;
    const ctx = c.getContext('2d')!;
    if ('filter' in ctx) ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(img, pad, pad);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    return canvasTexture(c, res);
}

/**
 * Re-cut a hand-traced polygon of the base art as its own sprite with a
 * feathered silhouette, so it can sit above a moving prop (and be nudged a
 * pixel or two itself) without a hard seam. Returns the texture plus the
 * base-px box it was cut from, for placement.
 */
export function carvePatch(img: ArtImage, poly: PxPoint[]): { tex: Texture; box: PxRect } {
    const RES = 2;
    const PAD = 3;
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    const x0 = Math.floor(Math.min(...xs)) - PAD;
    const y0 = Math.floor(Math.min(...ys)) - PAD;
    const box: PxRect = {
        x: x0,
        y: y0,
        w: Math.ceil(Math.max(...xs)) + PAD - x0,
        h: Math.ceil(Math.max(...ys)) + PAD - y0
    };
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
export function sparkleTexture(): Texture {
    const S = 96;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;
    const m = S / 2;

    // one soft cross ray: a stretched ellipse under a length-wise gradient,
    // so it fades out at both tips instead of ending in a hard edge
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

/**
 * Box-downscale an art image to exactly `px` wide, halving stepwise so no
 * texel is skipped (drawImage is bilinear, so a single big reduction would
 * sample only a fraction of the source). Returns a 1:1 texture over the
 * result, ready to be drawn at that exact size.
 */
export function boxDownscale(img: ArtImage, px: number): Texture {
    let cur: ArtImage = img;
    let w = img.width;
    while (w > px * 2) {
        const c = document.createElement('canvas');
        c.width = c.height = w >> 1;
        const ctx = c.getContext('2d')!;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(cur, 0, 0, c.width, c.height);
        cur = c;
        w = c.width;
    }
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, px, px);
    return canvasTexture(c, 1);
}
