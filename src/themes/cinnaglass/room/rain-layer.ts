// rain-layer.ts — rain on the window: streaks falling behind the glass plus
// droplets that grow in place, then break loose and slide, dragging a fading
// trail. It owns every particle, the two Graphics it redraws each frame, the
// pane mask and whether the layer is currently fading in or out.

import { Container, Graphics } from 'pixi.js';
import type { PxRect, WindowSpec } from '@/themes/cinnaglass/room/room-types';
import type { FadeQueue } from '@/themes/cinnaglass/room/fade-queue';

/** A rain streak falling down one glass pane. */
type Streak = {
    pane: number;
    x: number;
    y: number;
    len: number;
    speed: number;
    drift: number;
    alpha: number;
    width: number;
};
/** One sampled position of a sliding droplet's trail, aged out after TRAIL_FADE_S. */
type TrailPoint = { x: number; y: number; age: number };
/** A droplet on the glass: it grows in place, then slides and leaves a trail. */
type Drop = {
    pane: number;
    x: number;
    y: number;
    r: number;
    vy: number;
    sliding: boolean;
    wobble: number;
    trail: TrailPoint[];
};

/** Seconds a droplet trail point stays visible. */
const TRAIL_FADE_S = 1.4;

export type RainLayer = {
    /** The layer to add to the scene tree, already masked to the panes. */
    container: Container;
    /** Tell the layer whether it is raining; it cross-fades itself through the shared queue. */
    setRaining: (raining: boolean, fades: FadeQueue) => void;
    /** Advance and redraw the particles. A dry frame does nothing. */
    update: (dt: number) => void;
};

/**
 * Build the rain layer for one window. Particle counts come from the pane
 * areas, so a bigger window rains harder, and every draw is injected from
 * `random` so a seeded build can replay the same weather.
 */
export function createRainLayer(window: WindowSpec, random: () => number): RainLayer {
    /** Uniform random number in [min, max) from the injected source. */
    const rand = (min: number, max: number) => min + random() * (max - min);

    const panes: PxRect[] = window.panes;

    /**
     * A fresh streak inside pane #pane. With anywhere=false it starts just
     * above the pane, so a recycled streak re-enters from the top instead of
     * popping into view mid-glass.
     */
    const makeStreak = (pane: number, anywhere: boolean): Streak => {
        const p = panes[pane];
        const speed = rand(300, 560);
        return {
            pane,
            x: rand(p.x, p.x + p.w),
            y: anywhere ? rand(p.y, p.y + p.h) : p.y - rand(0, 40),
            len: rand(14, 30),
            speed,
            drift: -speed * 0.055,
            alpha: 0.1 + (speed / 560) * 0.22,
            width: rand(1, 1.7)
        };
    };

    /** A fresh droplet clinging to pane #pane, placed in the upper 70% so it has room to slide. */
    const makeDrop = (pane: number): Drop => {
        const p = panes[pane];
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
    };

    const container = new Container();
    const paneMask = new Graphics();
    for (const p of panes) paneMask.rect(p.x, p.y, p.w, p.h);
    paneMask.fill({ color: 0xffffff });
    container.mask = paneMask;
    container.addChild(paneMask); // mask must be in the tree
    const streakG = new Graphics();
    const dropG = new Graphics();
    container.addChild(streakG, dropG);

    const streaks: Streak[] = [];
    const drops: Drop[] = [];
    panes.forEach((p, i) => {
        const sc = Math.min(70, Math.round((p.w * p.h) / 5200));
        for (let n = 0; n < sc; n++) streaks.push(makeStreak(i, true));
        const dc = Math.min(10, Math.round((p.w * p.h) / 20000));
        for (let n = 0; n < dc; n++) drops.push(makeDrop(i));
    });

    let raining = false;
    let fadeTarget = -1;

    return {
        container,
        setRaining(next, fades) {
            raining = next;
            container.visible = raining || container.alpha > 0.01;
            const target = raining ? 1 : 0;
            if (fadeTarget !== target) {
                fadeTarget = target;
                fades.start(container, target, 900);
            }
        },
        update(dt) {
            if (!raining) return;
            for (const s of streaks) {
                const p = panes[s.pane];
                s.y += s.speed * dt;
                s.x += s.drift * dt;
                if (s.y > p.y + p.h + s.len) Object.assign(s, makeStreak(s.pane, false));
            }
            for (const d of drops) {
                const p = panes[d.pane];
                if (!d.sliding) {
                    d.r += dt * rand(0.05, 0.25);
                    if (d.r > 3.3 && random() < dt * 0.35) d.sliding = true;
                } else {
                    d.vy = Math.min(d.vy + 140 * dt, rand(50, 95));
                    d.wobble += dt * 7;
                    d.y += d.vy * dt;
                    d.x += Math.sin(d.wobble) * 4 * dt;
                    d.r = Math.max(1.4, d.r - dt * 0.35);
                    d.trail.push({ x: d.x, y: d.y, age: 0 });
                    if (d.trail.length > 26) d.trail.shift();
                    if (d.y > p.y + p.h + 4) Object.assign(d, makeDrop(d.pane));
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
    };
}
