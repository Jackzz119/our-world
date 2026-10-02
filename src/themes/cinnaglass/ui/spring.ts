// spring.ts — Apple's spring for UI motion (WWDC23 "Animate with springs", WWDC18 "Designing Fluid
// Interfaces"; ai/jaSkills/apple-design). A spring is set by how long it feels (duration, seconds) and
// how far it overshoots (bounce: 0 none, 0.15 a hint, 0.3 visible), with mass 1, stiffness
// (2π / duration)² and damping ratio 1 − bounce. It starts from wherever the element is and can take
// the finger's velocity, so letting go of a drag never jolts. The CSS curves in motion.css are these
// same springs sampled into linear() (scripts/spring-curves.mjs prints them).
// Pure math and the Web Animations API only: the curve script imports this file under Node.

export type Spring = { duration: number; bounce: number };

// The springs the UI uses. smooth: something travelling that was not thrown (a sheet rising, a page);
// snappy: panels and cards settling; bouncy: something flipped (the sliding pill of a tab bar or a view
// switch); pop: a press springing back, a badge popping in — the game's own extra bounce.
export const SPRING = {
    smooth: { duration: 0.42, bounce: 0 },
    snappy: { duration: 0.36, bounce: 0.15 },
    bouncy: { duration: 0.42, bounce: 0.3 },
    pop: { duration: 0.34, bounce: 0.42 },
    // let go mid-drag: Apple's drawer spring (damping ratio ~0.85, response under 0.4 s)
    release: { duration: 0.38, bounce: 0.12 },
    // thrown: a little more bounce, because the gesture itself carried momentum
    fling: { duration: 0.34, bounce: 0.22 },
    // sent away (a sheet pulled down to close): no bounce, it must not come back up
    away: { duration: 0.32, bounce: 0 }
} satisfies Record<string, Spring>;

// Distance from the target over time (t in seconds) for a spring let go `x0` away from it while moving
// at `v0` (units per second, positive = away from the target on the same side as x0).
export function springMotion({ duration, bounce }: Spring, x0: number, v0: number): (t: number) => number {
    const w0 = (2 * Math.PI) / duration;
    const zeta = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
    if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        const b = (v0 + zeta * w0 * x0) / wd;
        return (t) => Math.exp(-zeta * w0 * t) * (x0 * Math.cos(wd * t) + b * Math.sin(wd * t));
    }
    if (zeta === 1) {
        const b = v0 + w0 * x0;
        return (t) => (x0 + b * t) * Math.exp(-w0 * t);
    }
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    const c2 = (v0 - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    return (t) => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
}

// How long the motion runs before it stays within `rest` of the target (same units as x0).
export function settleTime(motion: (t: number) => number, rest: number, limit = 3): number {
    const step = 1 / 240;
    let last = 0;
    for (let t = 0; t <= limit; t += step) if (Math.abs(motion(t)) > rest) last = t;
    return Math.min(limit, last + step);
}

// Past an edge the element follows less and less the further the finger goes (UIScrollView's
// constant 0.55): `overshoot` is how far past the edge the finger is, `dimension` the moving thing's size.
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Where a flick would come to rest, the way a scroll view decelerates (Apple's projection, used to pick
// the snap point a throw is heading for). velocity in px per ms; returns px.
export function project(velocity: number, decelerationRate = 0.998): number {
    return (velocity * decelerationRate) / (1 - decelerationRate);
}

// Move an element's vertical offset from `from` to `to` (px) on a spring, starting at `velocity` (px per
// ms, the finger's). The spring is sampled at 60 fps into keyframes the compositor plays; the inline
// value is set to the target first, so the element rests there once the animation ends or is
// cancelled. Grab it again mid-flight: read the computed value, then cancel(). `property` is the one
// the element is placed with: transform (translateY) or the individual translate property.
export function springTranslateY(
    el: HTMLElement,
    from: number,
    to: number,
    velocity: number,
    spec: Spring,
    property: 'transform' | 'translate' = 'transform'
) {
    const motion = springMotion(spec, from - to, velocity * 1000);
    const total = settleTime(motion, 0.5);
    const steps = Math.max(2, Math.ceil(total * 60));
    const at = (y: number) => (property === 'transform' ? `translateY(${y}px)` : `0 ${y}px`);
    const frames: Keyframe[] = [];
    for (let i = 0; i < steps; i++) frames.push({ [property]: at(+(to + motion((i / steps) * total)).toFixed(2)) });
    frames.push({ [property]: at(to) });
    el.style[property] = at(to);
    return el.animate(frames, { duration: total * 1000, easing: 'linear' });
}
