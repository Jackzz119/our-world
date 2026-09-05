"""Fit the perspective ellipse of a painted disc (vinyl, plate, clock face…)
in a room's base art, for living-prop geometry in the room template.

The disc must be a near-black, low-chroma region; everything the marching
rays hit beyond it (case rim, table) must be either lighter or tinted. Rays
leave a seed point, record the last "dark" sample of the first dark run, and
skip an angular sector where something (a tonearm) crosses the rim. The rim
samples are then fit with a RANSAC-guarded direct least-squares ellipse.

Output is in pixi conventions: tilt in radians, positive = clockwise on
screen, ready for `PxEllipse` in src/themes/cinnaglass/room/room-types.ts.

    python scripts/fit-disc-ellipse.py public/rooms/study/golden.png \
        --seed 963 842 --skip 0 85 --dark 48 --chroma 24 --overlay fit.png

Needs Pillow + numpy only.
"""

from __future__ import annotations

import argparse
import math
import random

import numpy as np
from PIL import Image, ImageDraw


def fit_ellipse(x: np.ndarray, y: np.ndarray):
    """Halir–Flusser stable direct least squares; returns (cx, cy, ra, rb, tilt) or None."""
    x = x.astype(float)
    y = y.astype(float)
    mx, my = x.mean(), y.mean()
    x = x - mx
    y = y - my
    d1 = np.vstack([x * x, x * y, y * y]).T
    d2 = np.vstack([x, y, np.ones_like(x)]).T
    s1, s2, s3 = d1.T @ d1, d1.T @ d2, d2.T @ d2
    try:
        t = -np.linalg.inv(s3) @ s2.T
    except np.linalg.LinAlgError:
        return None
    m = np.array([[0, 0, 0.5], [0, -1, 0], [0.5, 0, 0]], float) @ (s1 + s2 @ t)
    _, v = np.linalg.eig(m)
    ok = np.nonzero(4 * v[0] * v[2] - v[1] ** 2 > 0)[0]
    if len(ok) == 0:
        return None
    a1 = np.real(v[:, ok[0]])
    A, B, C, D, E, F = np.concatenate([a1, t @ a1])
    den = B * B - 4 * A * C
    cx = (2 * C * D - B * E) / den
    cy = (2 * A * E - B * D) / den
    num = 2 * (A * E**2 + C * D**2 - B * D * E + den * F)
    root = math.sqrt((A - C) ** 2 + B**2)
    try:
        r1 = -math.sqrt(num * ((A + C) + root)) / den
        r2 = -math.sqrt(num * ((A + C) - root)) / den
    except ValueError:
        return None
    tilt = math.atan2(C - A - root, B) if B != 0 else (0.0 if A < C else math.pi / 2)
    # the conic angle formula is ambiguous by 90° between the two axes; keep
    # whichever pairing actually puts the input points on the rim
    pts = np.column_stack([x + mx, y + my])
    cands = [(cx + mx, cy + my, max(r1, r2), min(r1, r2), t) for t in (tilt, tilt + math.pi / 2)]
    return min(cands, key=lambda m: float(np.abs(rim_distance(pts, m)).mean()))


def rim_distance(pts: np.ndarray, model) -> np.ndarray:
    """Approximate signed distance (px) from each point to the ellipse rim."""
    cx, cy, ra, rb, th = model
    dx, dy = pts[:, 0] - cx, pts[:, 1] - cy
    u = dx * math.cos(th) + dy * math.sin(th)
    v = -dx * math.sin(th) + dy * math.cos(th)
    rho = np.sqrt((u / ra) ** 2 + (v / rb) ** 2)
    return (rho - 1) * np.sqrt(dx * dx + dy * dy) / np.maximum(rho, 1e-6)


def rim_samples(dark: np.ndarray, seed, skip, r_min, r_max, gap_px) -> np.ndarray:
    pts = []
    for deg in range(0, 360, 2):
        if skip[0] <= deg <= skip[1]:
            continue
        a = math.radians(deg)
        last, gap = None, 0.0
        for r in np.arange(r_min, r_max, 0.5):
            xx = int(round(seed[0] + r * math.cos(a)))
            yy = int(round(seed[1] + r * math.sin(a)))
            if not (0 <= yy < dark.shape[0] and 0 <= xx < dark.shape[1]):
                break
            if dark[yy, xx]:
                last, gap = r, 0.0
            else:
                gap += 0.5
                if gap >= gap_px and last is not None:
                    break
        if last is not None:
            pts.append((seed[0] + last * math.cos(a), seed[1] + last * math.sin(a)))
    return np.array(pts)


def ransac(pts: np.ndarray, tol: float, iters: int, rng: random.Random):
    best, best_n = None, -1
    for _ in range(iters):
        sample = pts[rng.sample(range(len(pts)), 7)]
        m = fit_ellipse(sample[:, 0], sample[:, 1])
        if m is None or not (10 < m[3] <= m[2] < 400):
            continue
        n = int((np.abs(rim_distance(pts, m)) < tol).sum())
        if n > best_n:
            best, best_n = m, n
    inl = np.abs(rim_distance(pts, best)) < tol
    for _ in range(2):
        m = fit_ellipse(pts[inl, 0], pts[inl, 1])
        if m is None:
            break
        best = m
        inl = np.abs(rim_distance(pts, best)) < tol
    return best, inl


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--seed", nargs=2, type=float, required=True, metavar=("X", "Y"), help="a point well inside the disc")
    ap.add_argument("--skip", nargs=2, type=float, default=(1, 0), metavar=("A0", "A1"), help="screen-angle sector (deg, y down) to ignore")
    ap.add_argument("--dark", type=int, default=30, help="max(R,G,B) below this counts as disc")
    ap.add_argument("--chroma", type=int, default=12, help="|R-B| below this counts as disc")
    ap.add_argument("--r-min", type=float, default=30, help="start marching past the label")
    ap.add_argument("--r-max", type=float, default=120)
    ap.add_argument("--gap", type=float, default=7, help="px of non-dark that ends the disc run")
    ap.add_argument("--tol", type=float, default=1.5, help="inlier distance px")
    ap.add_argument("--overlay", help="write a 3× crop with the fit drawn on it")
    args = ap.parse_args()

    im = np.asarray(Image.open(args.image).convert("RGB")).astype(int)
    dark = (im.max(axis=2) < args.dark) & (np.abs(im[..., 0] - im[..., 2]) < args.chroma)
    pts = rim_samples(dark, args.seed, args.skip, args.r_min, args.r_max, args.gap)
    if len(pts) < 12:
        raise SystemExit(f"only {len(pts)} rim samples — loosen --dark/--chroma or move --seed")
    model, inl = ransac(pts, args.tol, 4000, random.Random(7))
    cx, cy, ra, rb, th = model
    th = (th + math.pi / 2) % math.pi - math.pi / 2  # normalise to (-90°, 90°]
    rms = math.sqrt(float((rim_distance(pts[inl], model) ** 2).mean()))
    print(f"platter: {{ cx: {cx:.1f}, cy: {cy:.1f}, rx: {ra:.1f}, ry: {rb:.1f}, tilt: {th:.3f} }}")
    # ASCII only: Windows consoles still default to cp1252
    print(f"tilt {math.degrees(th):.2f} deg clockwise | inliers {int(inl.sum())}/{len(pts)} | rms {rms:.2f}px")

    if args.overlay:
        pad = int(ra * 1.4)
        box = (int(cx - pad), int(cy - pad * 0.8), int(cx + pad), int(cy + pad * 0.8))
        crop = Image.open(args.image).convert("RGB").crop(box)
        crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
        d = ImageDraw.Draw(crop)
        poly = []
        for k in range(360):
            t = 2 * math.pi * k / 360
            u, v = ra * math.cos(t), rb * math.sin(t)
            X = cx + u * math.cos(th) - v * math.sin(th)
            Y = cy + u * math.sin(th) + v * math.cos(th)
            poly.append(((X - box[0]) * 3, (Y - box[1]) * 3))
        d.line(poly + [poly[0]], fill=(0, 255, 0), width=2)
        for p, k in zip(pts, inl):
            X, Y = (p[0] - box[0]) * 3, (p[1] - box[1]) * 3
            d.ellipse([X - 2, Y - 2, X + 2, Y + 2], fill=(255, 0, 0) if k else (255, 160, 0))
        crop.save(args.overlay)
        print("overlay:", args.overlay)


if __name__ == "__main__":
    main()
