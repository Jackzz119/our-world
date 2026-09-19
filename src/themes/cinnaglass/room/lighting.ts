// lighting.ts — the room's light: the mood x weather recipe tables and the
// light pass they build (gradient wash, window glow, breathing cloud cover).
// This is the only place lighting values are tuned. The pass holds the live
// container, the one currently showing, and its breath sprite, so the ticker
// never searches the tree.

import { Container, Sprite } from 'pixi.js';
import type { PxRect, RoomMood, RoomWeather } from '@/themes/cinnaglass/room/room-types';
import type { FadeQueue } from '@/themes/cinnaglass/room/fade-queue';
import { linearGradientTexture, radialGradientTexture } from '@/themes/cinnaglass/room/textures';

/** One mood x weather lighting setup: the actor tint plus the three light-pass sprites. */
export type LightRecipe = {
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

/**
 * The lighting recipe for every mood and weather; the only place light is
 * tuned. Past tuning rounds are written up in
 * ai/codex-visual/20260811-044310Z/codex-report.md.
 */
export const RECIPES: Record<RoomMood, Record<RoomWeather, LightRecipe>> = {
    golden: {
        sun: {
            actorTint: 0xffe8cf,
            washTop: 'rgba(255,190,120,0.30)',
            washBottom: 'rgba(150,130,190,0.12)',
            washAlpha: 0.5,
            washBlend: 'normal',
            glowColor: 'rgba(255,205,140,1)',
            glowAlpha: 0.42,
            breathAlpha: 0
        },
        rain: {
            actorTint: 0xd8dde8,
            washTop: 'rgba(150,170,200,0.42)',
            washBottom: 'rgba(110,130,165,0.22)',
            washAlpha: 0.55,
            washBlend: 'normal',
            glowColor: 'rgba(205,220,238,1)',
            glowAlpha: 0.28,
            breathAlpha: 0.3
        }
    },
    twilight: {
        sun: {
            actorTint: 0xf8ddd2,
            washTop: 'rgba(235,150,150,0.22)',
            washBottom: 'rgba(95,90,170,0.16)',
            washAlpha: 0.42,
            washBlend: 'normal',
            glowColor: 'rgba(250,170,130,1)',
            glowAlpha: 0.34,
            breathAlpha: 0
        },
        rain: {
            actorTint: 0xd4d2e4,
            washTop: 'rgba(140,140,178,0.30)',
            washBottom: 'rgba(75,80,130,0.22)',
            washAlpha: 0.47,
            washBlend: 'normal',
            glowColor: 'rgba(190,200,228,1)',
            glowAlpha: 0.24,
            breathAlpha: 0.34
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
            glowAlpha: 0.2,
            breathAlpha: 0
        },
        rain: {
            actorTint: 0xb8c0dd,
            washTop: 'rgba(80,100,155,0.17)',
            washBottom: 'rgba(22,28,60,0.23)',
            washAlpha: 0.5,
            washBlend: 'normal',
            glowColor: 'rgba(150,180,235,1)',
            glowAlpha: 0.18,
            breathAlpha: 0.28
        }
    }
};

// weather-wide grading applied to the whole world container (art included)
export const WEATHER_GRADE: Record<RoomWeather, { saturation: number; brightness: number }> = {
    sun: { saturation: 1, brightness: 1 },
    rain: { saturation: 0.86, brightness: 0.96 }
};

/** The live light pass: one container the composer parks under root. */
export type LightPass = {
    /** The layer to add to the scene tree; holds the current pass and any pass still fading out. */
    container: Container;
    /** Cross-fade in the pass for `rec`. With animate=false the old pass is destroyed at once. */
    apply: (rec: LightRecipe, fades: FadeQueue, animate: boolean) => void;
    /** Breathe the rainy cloud cover for this frame; a dry recipe has nothing to breathe. */
    update: (elapsed: number, rec: LightRecipe) => void;
};

/**
 * Build the light pass for a room of `baseW` x `baseH` base pixels, with its
 * window glow centred on `glowRect`. Nothing is drawn until the first apply().
 */
export function createLightPass(baseW: number, baseH: number, glowRect: PxRect): LightPass {
    const container = new Container();
    let current: Container | null = null;
    let breathing: Sprite | null = null;

    // One pass for one recipe: the gradient wash, the window glow and, in
    // rain, the cloud-cover sprite that breathes. Returns the fresh container
    // plus its breath sprite, if this recipe has one.
    const build = (rec: LightRecipe): { layer: Container; breath: Sprite | null } => {
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

        let breath: Sprite | null = null;
        if (rec.breathAlpha > 0) {
            breath = new Sprite(radialGradientTexture('rgba(30,38,62,1)'));
            breath.anchor.set(0.5);
            breath.position.copyFrom(glow.position);
            breath.width = glow.width;
            breath.height = glow.height;
            breath.blendMode = 'multiply';
            breath.alpha = 0;
            c.addChild(breath);
        }

        return { layer: c, breath };
    };

    return {
        container,
        apply(rec, fades, animate) {
            const next = build(rec);
            next.layer.alpha = 0;
            container.addChild(next.layer);
            if (animate) {
                fades.start(next.layer, 1, 900);
                if (current) fades.start(current, 0, 900, true);
            } else {
                next.layer.alpha = 1;
                if (current) {
                    container.removeChild(current);
                    current.destroy({ children: true });
                }
            }
            current = next.layer;
            breathing = next.breath;
        },
        update(elapsed, rec) {
            if (!breathing) return;
            breathing.alpha = rec.breathAlpha * (0.5 + 0.5 * Math.sin((elapsed / 11) * Math.PI * 2));
        }
    };
}
