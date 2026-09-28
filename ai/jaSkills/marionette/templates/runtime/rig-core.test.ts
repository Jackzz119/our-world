// rig-core.test.ts — behaviour checks for rig-core and rig-director, no test framework needed:
//   node rig-core.test.ts            (Node >= 22.18 runs TypeScript directly)
// Port the cases into the project's test runner when copying the templates.
//
// The one that matters most is the see-through check: while the top pose is not opaque, some pose
// under it must be. Breaking it is what makes a character flicker on a pose change.

import { createBlinker, createGesturePlayer, createSwitcher, decodeFlow, GESTURES, REST_PULSE } from './rig-core.ts';
import { createDirector } from './rig-director.ts';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
    if (!cond) {
        failures++;
        console.log('FAIL', msg);
    }
};

// flow decoding mirrors the pipeline's pack_flow (scripts/common.py)
{
    const pack = (d: number) => Math.min(4095, Math.max(0, Math.round(d * 8) + 2048));
    const samples: [number, number][] = [
        [0, 0],
        [-127.5, 3.25],
        [200.125, -255.875],
        [0.125, -0.125]
    ];
    const px = new Uint8ClampedArray(samples.length * 4);
    samples.forEach(([dx, dy], i) => {
        const x = pack(dx);
        const y = pack(dy);
        px.set([x >> 4, ((x & 15) << 4) | (y >> 8), y & 255, 255], i * 4);
    });
    const f = decodeFlow(px, samples.length, 1);
    samples.forEach(([dx, dy], i) =>
        ok(f.dx[i] === dx && f.dy[i] === dy, `flow ${i}: ${f.dx[i]},${f.dy[i]} != ${dx},${dy}`)
    );
}

// switching never shows the scene through the character
{
    const sw = createSwitcher({ morphs: { 'a-b': 'x', 'b-a': 'x' }, slow: (p) => p === 's' });
    const seeThrough = (from: number, to: number, top: string) => {
        for (let t = from; t <= to; t += 4) {
            const fr = sw.frame(t);
            const topAlpha = fr.get(top)?.alpha ?? 0;
            const covered = [...fr].some(([p, v]) => p !== top && v.alpha >= 0.999);
            if (topAlpha < 0.999 && !covered) return t;
        }
        return -1;
    };
    sw.show('a', 0, false);
    sw.show('b', 1000, true);
    ok(sw.morphing(), 'a -> b has fields both ways: it should morph');
    ok(seeThrough(1000, 1500, 'b') === -1, 'see-through during a morph');
    const landed = sw.frame(1500);
    ok(landed.get('b')?.alpha === 1 && !landed.has('a'), 'a morph lands on the new pose only');

    sw.show('c', 2000, true);
    ok(!sw.morphing(), 'b -> c has no field: cover-and-fade');
    ok(seeThrough(2000, 2600, 'c') === -1, 'see-through during cover-and-fade');
    const faded = sw.frame(2600);
    ok(faded.get('c')?.alpha === 1 && !faded.has('b'), 'cover-and-fade settles on the new pose only');

    sw.show('a', 3000, false);
    sw.frame(3000);
    sw.show('b', 4000, true);
    sw.frame(4200);
    sw.show('a', 4210, true); // interrupt the morph halfway
    ok(seeThrough(4210, 4800, 'a') === -1, 'see-through after interrupting a morph');
    const back = sw.frame(4800);
    ok(back.get('a')?.alpha === 1 && !back.has('b'), 'an interrupted morph lands, then the new change runs');

    sw.show(null, 5000, true);
    ok(sw.frame(5300).size === 0, 'nobody there: nothing visible');

    sw.show('a', 6000, false);
    sw.frame(6000);
    sw.show('s', 7000, true);
    ok((sw.frame(7200).get('s')?.alpha ?? 0) < 0.6, 'a slow pose is still fading in at 200 ms');
}

// a slow pose with fields morphs longer and still never shows through
{
    const sw = createSwitcher({ morphs: { 'a-s': 'x', 's-a': 'x' }, slow: (p) => p === 's' });
    sw.show('a', 0, false);
    sw.frame(0);
    sw.show('s', 1000, true);
    ok(sw.morphing(), 'a -> s has fields: a slow morph');
    let through = -1;
    for (let t = 1000; t <= 2000; t += 4) {
        const fr = sw.frame(t);
        if ((fr.get('s')?.alpha ?? 0) < 0.999 && (fr.get('a')?.alpha ?? 0) < 0.999) through = t;
    }
    ok(through === -1, `see-through during a slow morph at ${through}`);
    const mid = createSwitcher({ morphs: { 'a-s': 'x', 's-a': 'x' }, slow: (p) => p === 's' });
    mid.show('a', 0, false);
    mid.show('s', 0, true);
    ok(mid.morphing() && mid.frame(800).has('a') && !mid.frame(950).has('a'), 'a slow morph lands after 900 ms');
}

// blink rhythm over a simulated minute
{
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const blinker = createBlinker(random, 0);
    let blinks = 0;
    let closedMs = 0;
    let was = false;
    for (let t = 0; t < 60000; t += 10) {
        const closed = blinker.closed(t);
        if (closed) closedMs += 10;
        if (closed && !was) blinks++;
        was = closed;
    }
    ok(blinks >= 9 && blinks <= 22, `blinks per minute: ${blinks}`);
    ok(Math.abs(closedMs / blinks - 140) <= 10, `closed ms per blink: ${closedMs / blinks}`);
}

// gestures: a real jump, no judder, and back to rest exactly
{
    for (const [name, g] of Object.entries(GESTURES)) {
        let peak = 0;
        let jump = 0;
        let prev = g.at(0);
        for (let t = 4; t < g.ms; t += 4) {
            const p = g.at(t);
            peak = Math.max(peak, p.lift);
            jump = Math.max(
                jump,
                Math.abs(p.lift - prev.lift),
                Math.abs(p.hairX - prev.hairX),
                Math.abs(p.hairLag - prev.hairLag)
            );
            prev = p;
        }
        ok(peak > 4, `${name}: the body should visibly jump (peak ${peak.toFixed(1)} px)`);
        ok(jump < 1, `${name}: no judder between 4 ms samples (worst step ${jump.toFixed(2)} px)`);
        ok(Math.abs(g.at(g.ms - 1).lift) < 0.05, `${name}: ends at rest`);
    }
    const rising = GESTURES.flinchLaugh.at(40);
    ok(rising.hairLag > 0, 'hair trails below the body while it rises');
    const player = createGesturePlayer();
    player.play(GESTURES.flinchLaugh, 1000);
    ok(player.sample(1080).lift > 5 && player.sample(2400) === REST_PULSE, 'player runs a gesture and then rests');
}

// director: priorities, held reactions, states
{
    let seed = 11;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const d = createDirector(
        {
            statePose: { reading: 'reading', away: null },
            reactions: {
                glance: { pose: 'glance', priority: 1, seconds: [2.5, 4], in: ['reading'] },
                poke: { pose: 'poked', priority: 3, seconds: 1.4, in: ['reading'] },
                pat: { pose: 'patted', priority: 4, seconds: 0, in: ['reading'] }
            },
            idle: [{ reaction: 'glance', every: [20, 60], in: ['reading'] }]
        },
        'reading',
        random,
        0
    );
    ok(d.update(1000) === 'reading', 'rests in its state pose');
    ok(d.hold('pat', true, 2000), 'a pat starts');
    ok(!d.react('poke', 2100), 'a poke does not interrupt a held pat');
    ok(d.update(9000) === 'patted', 'a pat lasts while held');
    d.hold('pat', false, 9000);
    ok(d.update(9500) === 'patted' && d.update(9900) === 'reading', 'a pat lingers 0.8 s, then settles');
    d.setState('away', 10000);
    ok(d.update(10001) === null && !d.react('poke', 10002), 'nobody to poke when away');
    d.setState('reading', 11000);
    let glanced = false;
    for (let t = 11000; t < 80000; t += 100) if (d.update(t) === 'glance') glanced = true;
    ok(glanced, 'an idle glance happens within a minute');
}

console.log(failures ? `${failures} failures` : 'all rig-core / rig-director checks passed');
process.exit(failures ? 1 : 0);
