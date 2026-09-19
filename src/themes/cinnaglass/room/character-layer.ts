// character-layer.ts — the seated characters: one sprite per occupied seat,
// each breathing, swaying and blinking on its own phase. It holds the whole
// per-character state (the sway/breathe containers, the open and blink frames,
// and when each pair of eyes is next due to close) and advances all of it from
// one update() per frame.

import { Container, Sprite, type Texture } from 'pixi.js';
import type { SeatAnchor } from '@/themes/cinnaglass/room/room-types';
import { radialGradientTexture } from '@/themes/cinnaglass/room/textures';

/** Per-seat character art: the open-eye frame and the blink frame. */
export type CharacterAssets = Record<string, { open: string; closed: string }>;

/** One seated character's live state. */
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

export type CharacterLayer = {
    /** The layer to add to the scene tree. */
    container: Container;
    /** Mood grading: the characters eat the room's light via a multiply tint. */
    setTint: (tint: number) => void;
    /** Advance breathing, sway and blinking. `elapsed` drives the loops, `nowMs` the blink schedule. */
    update: (elapsed: number, nowMs: number) => void;
};

/**
 * Build the character layer: every seat that has art in `assets` gets a
 * sprite, a contact shadow and its own blink schedule. Seats without art are
 * skipped — an empty room simply has no characters.
 */
export function createCharacterLayer(
    seats: SeatAnchor[],
    assets: CharacterAssets,
    textures: Record<string, Texture>,
    random: () => number
): CharacterLayer {
    /** Uniform random number in [min, max) from the injected source. */
    const rand = (min: number, max: number) => min + random() * (max - min);

    const chars: Char[] = [];
    const container = new Container();
    // one contact-shadow falloff shared by every seat; each sprite is sized
    // from its own character, so sharing the texture changes nothing on screen
    const contactShadowTex = radialGradientTexture('rgba(30,24,40,1)', 1);

    for (const seat of seats) {
        const art = assets[seat.id];
        if (!art) continue;
        const open = textures[art.open];
        const closed = textures[art.closed];
        const holder = new Container();
        holder.position.set(seat.foot.x, seat.foot.y);

        // contact shadow: grounds the character on the furniture
        const shadow = new Sprite(contactShadowTex);
        shadow.anchor.set(0.5);
        shadow.alpha = 0.3;
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
        container.addChild(holder);

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

    return {
        container,
        setTint(tint) {
            for (const c of chars) c.sprite.tint = tint;
        },
        update(elapsed, nowMs) {
            for (const c of chars) {
                c.breathe.scale.y = 1 + 0.016 * Math.sin((elapsed / 3.6 + c.phase) * Math.PI * 2);
                c.breathe.scale.x = 1 - 0.003 * Math.sin((elapsed / 3.6 + c.phase) * Math.PI * 2);
                c.sway.rotation = 0.009 * Math.sin((elapsed / 7.4 + c.phase * 0.9) * Math.PI * 2);
                if (c.blinkUntil > 0 && nowMs >= c.blinkUntil) {
                    c.sprite.texture = c.open;
                    c.blinkUntil = 0;
                    if (c.doubleBlink) {
                        c.doubleBlink = false;
                        c.nextBlinkAt = nowMs + 180;
                    } else {
                        c.nextBlinkAt = nowMs + rand(2400, 6500);
                    }
                } else if (nowMs >= c.nextBlinkAt && c.blinkUntil === 0) {
                    c.sprite.texture = c.closed;
                    c.blinkUntil = nowMs + 140;
                    if (random() < 0.15) c.doubleBlink = true;
                    c.nextBlinkAt = Infinity;
                }
            }
        }
    };
}
