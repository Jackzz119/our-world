// clock-layer.ts — the wall clock's three hands and the painted drop shadow
// behind them. It holds two Graphics objects and nothing else: the time comes
// from the caller once per frame, so the shadow copy and the real hands can
// never land on different sides of a second boundary.

import { Container, Graphics } from 'pixi.js';
import type { ClockSpec } from '@/themes/cinnaglass/room/room-types';

export type ClockLayer = {
    /** The layer to add to the scene tree, already positioned on the dial. */
    container: Container;
    /** Mood grading: the hands eat the room's light, the shadow does not. */
    setTint: (tint: number) => void;
    /** Redraw both hand copies for `now`. */
    update: (now: Date) => void;
};

/** Build the clock layer for one dial (center and radius in base-image px). */
export function createClockLayer(clock: ClockSpec): ClockLayer {
    const container = new Container();
    container.position.set(clock.center.x, clock.center.y);
    const r = clock.radius;
    // painted drop shadow behind the hands sells "hands on the wall"
    const handShadow = new Graphics();
    handShadow.position.set(r * 0.03, r * 0.05);
    handShadow.alpha = 0.35;
    const hands = new Graphics();
    container.addChild(handShadow, hands);

    // Draw the three hands for `now` into g. With shadow=true every hand is
    // drawn in one dark color, for the offset copy sitting behind the real
    // hands.
    const drawHands = (g: Graphics, shadow: boolean, now: Date) => {
        const s = now.getSeconds() + now.getMilliseconds() / 1000;
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;
        const col = shadow ? 0x2c2118 : undefined;
        // one hand: a round-capped stroke out of the dial center (0° = 12 o'clock)
        const hand = (angleDeg: number, len: number, w: number, color: number) => {
            const a = ((angleDeg - 90) * Math.PI) / 180;
            g.moveTo(0, 0);
            g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            g.stroke({ width: w, color: col ?? color, cap: 'round' });
        };
        hand(h * 30, r * 0.5, r * 0.075, 0x5b4636);
        hand(m * 6, r * 0.74, r * 0.055, 0x6b543f);
        hand(s * 6, r * 0.84, r * 0.026, 0xa4553f); // sweep second — quiet, cozy
        g.circle(0, 0, r * 0.05).fill({ color: col ?? 0x4c3a2c });
    };

    return {
        container,
        setTint(tint) {
            hands.tint = tint;
        },
        update(now) {
            // redraw is cheap and the second hand sweeps, so both copies are
            // cleared and re-stroked every frame
            hands.clear();
            handShadow.clear();
            drawHands(handShadow, true, now);
            drawHands(hands, false, now);
        }
    };
}
