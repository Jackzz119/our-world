// textures.ts — offscreen-canvas textures the scene draws with. Only the
// sparkle star remains: the hotspot hint (affordance.ts). Pure: same pixels
// every call, no state, nothing here knows about the scene.

import { Texture } from 'pixi.js';

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
