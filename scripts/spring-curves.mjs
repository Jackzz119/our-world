// node scripts/spring-curves.mjs — prints the spring curves for src/themes/cinnaglass/ui/motion.css:
// each spring in ui/spring.ts (Apple's duration + bounce model) sampled into a CSS linear() easing,
// plus the transition duration to pair it with (the time the spring takes to stay within 0.1% of its
// target — longer than the duration it feels, which is what Apple's duration means). Re-run after
// changing a spring and paste the output over the generated block in motion.css.
import { SPRING, settleTime, springMotion } from '../src/themes/cinnaglass/ui/spring.ts';

const TOKENS = [
    ['--spring-smooth', '--dur-smooth', SPRING.smooth],
    ['--spring-snappy', '--dur-snappy', SPRING.snappy],
    ['--spring-bouncy', '--dur-bouncy', SPRING.bouncy],
    ['--spring-pop', '--dur-pop', SPRING.pop]
];
// The curve may drift this far (progress units) from the true spring between kept points.
const TOLERANCE = 0.0025;

// Ramer–Douglas–Peucker: keep the fewest points that stay within the tolerance of the samples.
function simplify(points, from = 0, to = points.length - 1, keep = new Set([from, to])) {
    const [t0, p0] = points[from];
    const [t1, p1] = points[to];
    let worst = -1;
    let far = 0;
    for (let i = from + 1; i < to; i++) {
        const [t, p] = points[i];
        const line = p0 + ((p1 - p0) * (t - t0)) / (t1 - t0);
        const gap = Math.abs(p - line);
        if (gap > far) [far, worst] = [gap, i];
    }
    if (far > TOLERANCE) {
        keep.add(worst);
        simplify(points, from, worst, keep);
        simplify(points, worst, to, keep);
    }
    return keep;
}

for (const [curve, duration, spec] of TOKENS) {
    const motion = springMotion(spec, 1, 0);
    const total = settleTime(motion, 0.001);
    const samples = [];
    for (let i = 0; i <= 400; i++) {
        const t = (i / 400) * total;
        samples.push([i / 400, 1 - motion(t)]);
    }
    const kept = [...simplify(samples)].sort((a, b) => a - b).map((i) => samples[i]);
    const stops = kept.map(([t, p], i) =>
        i === 0 ? '0' : i === kept.length - 1 ? '1' : `${+p.toFixed(4)} ${+(t * 100).toFixed(2)}%`
    );
    const peak = Math.max(...samples.map(([, p]) => p));
    console.log(
        `    /* bounce ${spec.bounce}, feels ${spec.duration}s, overshoots ${Math.max(0, (peak - 1) * 100).toFixed(1)}% */`
    );
    console.log(`    ${curve}: linear(${stops.join(', ')});`);
    console.log(`    ${duration}: ${Math.round(total * 1000)}ms;`);
}
