// steam-layer.ts — steam over a cup (ai/design_system/effects.md 杯子蒸汽):
// two or three thin ribbons rise from the rim out of step, lean side to side
// and fade. Procedural like the rain, so there is no art file: one soft ribbon
// is drawn once and every wisp is that ribbon stretched, leaned and faded.
// Strength sets how often and how visibly wisps rise; at 0 the live ones
// finish and no new one starts, so a cup cools off instead of cutting out.

import { Container, Sprite, Texture } from 'pixi.js';
import type { CupRim } from '@/themes/cinnaglass/room/room-types';

/** One rising ribbon. */
type Wisp = { sprite: Sprite; x0: number; age: number; life: number; lean: number; phase: number; flip: number };

export type SteamLayer = {
    /** The wisps, in plate px; add it right above the cup it belongs to. */
    container: Container;
    /** 0 = no new wisps (a cold cup), 1 = a fresh cup. */
    setStrength: (strength: number) => void;
    /** Scene light on the steam, as a multiply tint. */
    setTint: (tint: number) => void;
    /** Spawn, advance and retire wisps. */
    update: (dt: number) => void;
};

// Seconds; the gap stretches as strength falls.
const WISP_LIFE: [number, number] = [3.2, 4.6];
const WISP_GAP: [number, number] = [0.9, 1.7];
const MAX_WISPS = 3;
const WISP_ALPHA = 0.42;

let ribbon: Texture | null = null;

/** The shared ribbon: a double S-curve stroked from wide and faint to narrow, fading out at both ends. */
function ribbonTexture(): Texture {
    if (ribbon) return ribbon;
    const w = 96;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('steam: no 2d canvas');
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        g.strokeStyle = `rgba(255, 255, 255, ${0.05 + i * 0.05})`;
        g.lineWidth = 30 - i * 4.4;
        g.beginPath();
        g.moveTo(w * 0.5, h - 10);
        g.bezierCurveTo(w * 0.1, h * 0.72, w * 0.92, h * 0.5, w * 0.5, h * 0.3);
        g.quadraticCurveTo(w * 0.2, h * 0.16, w * 0.46, 12);
        g.stroke();
    }
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createLinearGradient(0, h, 0, 0);
    fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fade.addColorStop(0.14, 'rgba(0, 0, 0, 1)');
    fade.addColorStop(0.55, 'rgba(0, 0, 0, 0.65)');
    fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
    ribbon = Texture.from(canvas);
    return ribbon;
}

/** Build the steam over one cup; every draw comes from the scene's shared `random`. */
export function createSteamLayer(cup: CupRim, random: () => number): SteamLayer {
    const rand = (min: number, max: number) => min + random() * (max - min);
    const container = new Container();
    const texture = ribbonTexture();
    // a wisp's curl spans about half the rim and rises a little over a rim's width
    const wispW = cup.width * 0.5;
    const wispH = cup.width * 1.25;
    const wisps: Wisp[] = [];
    let strength = 1;
    let tint = 0xffffff;
    let wait = rand(0, WISP_GAP[0]);

    const spawn = () => {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.blendMode = 'add';
        sprite.tint = tint;
        sprite.alpha = 0;
        const x0 = cup.rim.x + rand(-0.2, 0.2) * cup.width;
        sprite.position.set(x0, cup.rim.y);
        container.addChild(sprite);
        wisps.push({
            sprite,
            x0,
            age: 0,
            life: rand(WISP_LIFE[0], WISP_LIFE[1]),
            lean: rand(0.1, 0.26),
            phase: rand(0, Math.PI * 2),
            flip: random() < 0.5 ? -1 : 1
        });
    };

    return {
        container,
        setStrength(next) {
            strength = Math.min(1, Math.max(0, next));
        },
        setTint(next) {
            tint = next;
            for (const w of wisps) w.sprite.tint = next;
        },
        update(dt) {
            wait -= dt * strength;
            if (strength > 0.01 && wait <= 0 && wisps.length < MAX_WISPS) {
                spawn();
                wait = rand(WISP_GAP[0], WISP_GAP[1]);
            }
            for (let i = wisps.length - 1; i >= 0; i--) {
                const w = wisps[i];
                w.age += dt;
                const t = w.age / w.life;
                if (t >= 1) {
                    w.sprite.destroy();
                    wisps.splice(i, 1);
                    continue;
                }
                // quick fade in, long fade out; it stretches upward as it rises
                const envelope = t < 0.18 ? t / 0.18 : 1 - ((t - 0.18) / 0.82) ** 1.4;
                w.sprite.alpha = WISP_ALPHA * (0.35 + 0.65 * strength) * envelope;
                w.sprite.scale.set((wispW / texture.width) * w.flip, (wispH * (0.55 + 0.6 * t)) / texture.height);
                w.sprite.skew.x = w.lean * Math.sin(w.phase + w.age * 1.6);
                w.sprite.position.set(
                    w.x0 + Math.sin(w.phase + w.age * 0.8) * cup.width * 0.05,
                    cup.rim.y - t * wispH * 0.22
                );
            }
        }
    };
}
