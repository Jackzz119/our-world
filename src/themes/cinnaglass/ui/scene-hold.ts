// scene-hold.ts — a panel on the move asks the room to hold still for a moment. The room is a
// full-screen WebGL canvas redrawn 30 times a second; on a phone those frames compete with a
// panel's first paint and its glass for the GPU, and the panel's rise stutters. A hold lapses by
// itself; a later, longer hold extends it. room/room-scene.tsx stops and restarts its ticker.
// The partner never waits for a panel: when they do something, releaseScene() lets the room move
// at once and holds are ignored until their move has played (their poses run on the wall clock, so
// a held room would show the move late and skip its start).

type Listener = (held: boolean) => void;

const listeners = new Set<Listener>();
let until = 0;
let timer = 0;
// holds are ignored until then: something in the room is moving that must not be delayed
let freeUntil = 0;

// End the hold once its time is up (an extension pushes the check back).
function lapse() {
    const left = until - performance.now();
    if (left > 4) {
        timer = window.setTimeout(lapse, left);
        return;
    }
    timer = 0;
    for (const fn of listeners) fn(false);
}

/** Hold the room still for at least `ms` from now (unless the partner is moving). */
export function holdScene(ms: number) {
    const now = performance.now();
    if (now < freeUntil) return;
    const end = now + ms;
    if (end <= until && timer) return;
    until = Math.max(until, end);
    if (timer) return;
    timer = window.setTimeout(lapse, ms);
    for (const fn of listeners) fn(true);
}

/** End any hold now and ignore new ones for `ms`: the partner's move plays on time, from its start. */
export function releaseScene(ms: number) {
    freeUntil = Math.max(freeUntil, performance.now() + ms);
    if (!timer) return;
    window.clearTimeout(timer);
    timer = 0;
    until = 0;
    for (const fn of listeners) fn(false);
}

/** Whether a hold is running now. */
export const sceneHeld = () => timer !== 0;

/** Follow holds starting and lapsing; returns the unsubscribe. */
export function onSceneHold(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}
