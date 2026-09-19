// fade-queue.ts — the one alpha tween runner the whole compositor shares.
// Every cross-fade in the room (mood art, prop cuts, the light pass, the rain
// layer) is queued here and stepped once per frame, so a layer never has to
// grow its own tween loop. It holds exactly one piece of state: the list of
// tweens still in flight.

import type { Container, Sprite } from 'pixi.js';

/** Anything the queue can fade: a display object with an `alpha`. */
export type FadeTarget = Container | Sprite;

/** A queued alpha tween; kill=true destroys the object once it lands. */
type Fade = { obj: FadeTarget; from: number; to: number; start: number; dur: number; kill?: boolean };

export type FadeQueue = {
    /** Queue an alpha tween on obj, replacing any tween already running on it. */
    start: (obj: FadeTarget, to: number, durMs: number, kill?: boolean) => void;
    /** Advance every tween to wall-clock `nowMs` and retire the finished ones. */
    update: (nowMs: number) => void;
};

/** A fresh, empty tween queue. */
export function createFadeQueue(): FadeQueue {
    let fades: Fade[] = [];

    return {
        start(obj, to, durMs, kill = false) {
            fades = fades.filter((f) => f.obj !== obj);
            fades.push({ obj, from: obj.alpha, to, start: performance.now(), dur: durMs, kill });
        },
        update(nowMs) {
            for (const f of fades) {
                const t = Math.min(1, (nowMs - f.start) / f.dur);
                f.obj.alpha = f.from + (f.to - f.from) * t;
                if (t >= 1 && f.kill) {
                    f.obj.parent?.removeChild(f.obj as Container);
                    (f.obj as Container).destroy({ children: true });
                }
            }
            fades = fades.filter((f) => nowMs - f.start < f.dur);
        }
    };
}
