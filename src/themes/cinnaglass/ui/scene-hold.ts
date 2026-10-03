// scene-hold.ts — a panel on the move asks the room to hold still for a moment. The room is a
// full-screen WebGL canvas redrawn 30 times a second; on a phone those frames compete with a
// panel's first paint and its glass for the GPU, and the panel's rise stutters. A hold lapses by
// itself; a later, longer hold extends it. room/room-scene.tsx stops and restarts its ticker.

type Listener = (held: boolean) => void;

const listeners = new Set<Listener>();
let until = 0;
let timer = 0;

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

/** Hold the room still for at least `ms` from now. */
export function holdScene(ms: number) {
    const end = performance.now() + ms;
    if (end <= until && timer) return;
    until = Math.max(until, end);
    if (timer) return;
    timer = window.setTimeout(lapse, ms);
    for (const fn of listeners) fn(true);
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
