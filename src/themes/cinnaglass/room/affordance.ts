// affordance.ts — how the room says "this is tappable": invisible hit zones
// over the furniture, warm gold sparkles, and the scheduler that lets one
// piece whisper at a time. It owns the hover state of every hotspot, the live
// sparkle particles, its own elapsed clock and when the next hint is due, so
// the pointer callbacks read state that lives right next to them.
//
// Affordance v5 (2026-08-22 user direction: no glow, no edge, no image swap —
// "the furniture itself moves"). Three states:
//   silent — nothing at all, the room is just a painting
//   hint   — sparkles ONLY, a touch dimmer than hover
//   hover  — a greeting sparkle plus the prop's own state change (the vinyl
//            leans faster, the tonearm swings; that part lives with the prop)
// Hotspots without a living prop yet only sparkle on hover.

import { Container, Rectangle, Sprite } from 'pixi.js';
import type { HotspotOpenEvent, HotspotSpec, PxRect } from './room-types';
import { sparkleTexture } from './textures';

/** Runtime state of one furniture hotspot: hover, the periodic hint slot and when its next sparkle is due. */
type Hot = {
    rect: PxRect;
    hovered: boolean;
    nextSparkleAt: number;
    hintPhase: number; // >0 while the periodic hint plays (start time)
    hoverAt: number; // when the pointer entered
};

/** One live sparkle particle and the curve parameters it lives out. */
type Spark = {
    sprite: Sprite;
    born: number;
    life: number;
    size: number;
    spin: number;
    drift: number;
    peak: number;
};

// Pacing: first hint after 8–12s idle, then 22–45s between hints — companion
// products hint far slower than puzzle games, and any tap resets the clock
// (hints must never nag).
const HINT_EVERY: [number, number] = [22, 45];
const HINT_DUR = 2.6; // fade in 0.6 + hold/breathe 1.3 + fade out 0.7
// rhythm: idle 0–1 per spot (3–6 visible room-wide), hover ≤2 per spot at a
// calm 0.9–1.4s pace — never a pulse train
const IDLE_GAP: [number, number] = [2.8, 6.5];
const HOVER_GAP: [number, number] = [0.9, 1.4];
const MAX_SPARKS = 8;

export type Affordance = {
    /** Hit areas only, nothing drawn. Add it below the sparkles. */
    hitContainer: Container;
    /** The sparkle particles. Add it above the hit areas. */
    sparkContainer: Container;
    /** Advance the hint schedule and every live sparkle by one frame. */
    update: (dt: number) => void;
    /** Whether the pointer is over that hotspot; living props read their own. */
    isHovered: (id: string) => boolean;
};

/**
 * Wire up the room's hotspots. Every random draw comes from `random`, and
 * `onHotspot` fires on a real tap with the screen point that was hit, which is
 * what the shell anchors the opened surface to.
 */
export function createAffordance(
    hotspots: HotspotSpec[],
    random: () => number,
    onHotspot?: (event: HotspotOpenEvent) => void
): Affordance {
    /** Uniform random number in [min, max) from the injected source. */
    const rand = (min: number, max: number) => min + random() * (max - min);

    // this layer keeps its own clock: the pointer callbacks below need the
    // current time, and they fire between frames, not inside update()
    let elapsed = 0;
    // assigned right after the hotspots are built, so the draws below happen
    // in the same order they always did
    let nextHintAt = 0;

    const hots: Hot[] = [];
    const byId = new Map<string, Hot>();
    const hitContainer = new Container();

    for (const h of hotspots) {
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
        zone.on('pointertap', (event) => {
            // a real interaction satisfies curiosity — quiet the hints a while
            nextHintAt = elapsed + rand(18, 30);
            onHotspot?.({ id: h.id, clientX: event.clientX, clientY: event.clientY });
        });
        hots.push(hot);
        if (!byId.has(h.id)) byId.set(h.id, hot);
        hitContainer.addChild(zone);
    }

    nextHintAt = rand(8, 12);

    const sparks: Spark[] = [];
    const sparkTex = sparkleTexture();
    const sparkContainer = new Container();

    // Spawn one sparkle biased toward the center of `hot`'s rect. `peak` caps
    // its brightness so the three states stay ranked: idle whisper < periodic
    // hint < hover confirmation (v4 user direction).
    const spawnSpark = (hot: Hot, t: number, sizeRange: [number, number] = [12, 22], peak = 0.78) => {
        if (sparks.length >= MAX_SPARKS + 6) return; // hard cap incl. bursts
        const s = new Sprite(sparkTex);
        s.anchor.set(0.5);
        // biased toward the object's center so sparks sit ON the furniture
        const bx = 0.22 + random() * 0.56;
        const by = 0.22 + random() * 0.56;
        s.position.set(hot.rect.x + hot.rect.w * bx, hot.rect.y + hot.rect.h * by);
        s.blendMode = 'add';
        s.alpha = 0;
        const size = rand(sizeRange[0], sizeRange[1]);
        s.width = size;
        s.height = size;
        sparkContainer.addChild(s);
        sparks.push({
            sprite: s,
            born: t,
            life: rand(1.6, 2.4), // 1.6–2.4s, jittered so they never pulse together
            size,
            spin: rand(-0.5, 0.5),
            drift: rand(0.5, 3), // px/s upward — twinkle in place, no flight path
            peak
        });
    };

    return {
        hitContainer,
        sparkContainer,
        isHovered(id) {
            return byId.get(id)?.hovered ?? false;
        },
        update(dt) {
            elapsed += dt;

            // periodic hint: one spot at a time bursts a few big sparkles —
            // "you can tap me", said politely. No edge here (v4).
            if (elapsed >= nextHintAt) {
                const candidates = hots.filter((h) => !h.hovered && h.hintPhase === 0);
                if (candidates.length) {
                    const pick = candidates[Math.floor(random() * candidates.length)];
                    pick.hintPhase = elapsed;
                    // 4–5 visible stars sell the "look here" moment
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
                            // hover state: a small ring of stars greets the pointer
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
                // scale curve 0.35→1.0→0.25: bloom in, peak, melt away
                const a = Math.sin(Math.PI * t);
                sp.sprite.alpha = a * sp.peak;
                const sc = (0.3 + 0.7 * a) * (sp.size / sparkTex.width);
                sp.sprite.scale.set(sc);
                sp.sprite.rotation = sp.spin * t;
                sp.sprite.y -= sp.drift * dt; // gentle upward shimmer
            }
        }
    };
}
