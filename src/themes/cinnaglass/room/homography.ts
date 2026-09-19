// homography.ts — the 3x3 projective map between a painted disc's own plane
// and base-image pixels, plus the corner list a spinning quad needs. Pure
// math with no state: the turntable prop is its only caller today, but any
// future prop that turns inside a painted surface uses the same two calls.

import type { PxEllipse, PxPoint } from '@/themes/cinnaglass/room/room-types';

/** Row-major 3x3 matrix. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

/** Matrix product a*b. */
function mul3(a: Mat3, b: Mat3): Mat3 {
    const r = new Array(9).fill(0) as Mat3;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
}

/** Matrix inverse by cofactors; the caller guarantees a non-degenerate matrix. */
function inv3(m: Mat3): Mat3 {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h,
        B = -(d * i - f * g),
        C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
        A,
        -(b * i - c * h),
        b * f - c * e,
        B,
        a * i - c * g,
        -(a * f - c * d),
        C,
        -(a * h - b * g),
        a * e - b * d
    ].map((v) => v / det) as Mat3;
}

/** Apply a homography to a point (with the perspective divide). */
function apply3(m: Mat3, x: number, y: number): [number, number] {
    const w = m[6] * x + m[7] * y + m[8];
    return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

/**
 * Homography from disc-plane coordinates (unit circle = the vinyl rim,
 * origin = its true center) to base-image px. The painted rim ellipse fixes
 * the plane up to a circle-preserving projective map and the painted center
 * pins that down, leaving the spin angle as the only freedom — the thing we
 * animate. Affine spinning cannot hold both the rim and the label still under
 * real perspective; this can.
 */
export function discHomography(e: PxEllipse, center: PxPoint): Mat3 {
    const cos = Math.cos(e.tilt);
    const sin = Math.sin(e.tilt);
    // affine part: unit circle → painted rim ellipse
    const A: Mat3 = [e.rx * cos, -e.ry * sin, e.cx, e.rx * sin, e.ry * cos, e.cy, 0, 0, 1];
    const [px, py] = apply3(inv3(A), center.x, center.y); // painted center inside the unit disc
    const a = Math.hypot(px, py);
    if (a < 1e-4 || a >= 0.98) return A; // no measurable perspective (or a bad measurement)
    const phi = Math.atan2(py, px);
    const s = Math.sqrt(1 - a * a);
    // hyperbolic translation of the unit disc taking the origin to (a, 0)
    const B: Mat3 = [1, 0, a, 0, s, 0, a, 0, 1];
    const R: Mat3 = [Math.cos(phi), -Math.sin(phi), 0, Math.sin(phi), Math.cos(phi), 0, 0, 0, 1];
    const Rt: Mat3 = [Math.cos(phi), Math.sin(phi), 0, -Math.sin(phi), Math.cos(phi), 0, 0, 0, 1];
    return mul3(A, mul3(R, mul3(B, Rt)));
}

/** PerspectiveMesh corner list: x/y for top-left, top-right, bottom-right, bottom-left. */
export type Corners = [number, number, number, number, number, number, number, number];

/**
 * Screen corners of the disc-plane unit square turned by `spin`, in the
 * order PerspectiveMesh wants (top-left, top-right, bottom-right, bottom-left).
 */
export function discCorners(H: Mat3, spin: number): Corners {
    const c = Math.cos(spin);
    const s = Math.sin(spin);
    const pts: number[] = [];
    for (const [u, v] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1]
    ]) {
        pts.push(...apply3(H, u * c - v * s, u * s + v * c));
    }
    return pts as Corners;
}
