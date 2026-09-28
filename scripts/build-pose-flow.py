"""Stabilise the partner's pose frames with dense optical flow (ai/features/study-room/study-room.md).

Generated frames are drawn one by one, so a blink frame also nudges the brows,
glasses and hair a pixel or two, and two poses disagree on the hair outline.
Instead of generating more frames, this measures where every point of one
frame sits in another (OpenCV DIS optical flow) and uses it twice:

1. Blink alignment: each closed-eye frame is warped onto its open frame's
   geometry, so everything around the eyes stays exactly where it was.
   Only geometry moves; no pixel is repainted.
2. Morph flows: for every pair of poses the runtime cross-fades, the flow
   sampled at the mesh vertices (same grid as the idle weights). The runtime
   moves the outgoing pose towards the incoming one's shape while the incoming
   one relaxes from the outgoing shape, which gives computed in-between frames
   instead of a dissolve. Written as RGB PNGs: R = dx + 128, G = dy + 128
   (pose-canvas px), B = 255 where the flow is trusted.

Pairs the flow cannot explain get no morph file and keep the runtime's
cover-and-fade: asleep (the head moves onto the arms) is never tried, and sip
fails the silhouette check (both hands leave the book for the cup, so the
flow drags the book along instead). src/themes/cinnaglass/room/study-table.ts
lists the pairs that pass.

Blink alignment rewrites the closed frames in place, so run this once after
each scripts/build-study-table.py; --no-blinks rebuilds only the morphs.

    python scripts/build-pose-flow.py [--no-blinks] [--review <dir>]
"""

import argparse
import itertools
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SRC = Path("public/characters/ayu")
MORPHABLE = ["reading", "glance", "writing", "sip", "patted", "poked"]
BLINKS = ["reading", "glance", "writing"]
GRID = 24  # must match scripts/build-idle-weights.py
TRUST_ERR = 0.12  # mean abs error (0..1) after warping, above which a pair falls back to a cross-fade
TRUST_SIL = 0.05  # share of the target silhouette the warp misses; measured <= 0.025 for good pairs, >= 0.068 for sip


def load(name):
    return np.asarray(Image.open(SRC / f"{name}.webp").convert("RGBA")).astype(np.float32)


def grey(rgba):
    """Luminance over a neutral backdrop, so the silhouette counts as much as the drawing."""
    a = rgba[..., 3:4] / 255
    rgb = rgba[..., :3] * a + 128 * (1 - a)
    return cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)


def flow(a, b):
    """Dense flow from a to b: a's pixel p is found at p + flow(p) in b."""
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    return dis.calc(grey(a), grey(b), None)


def remap(img, f):
    """img sampled at p + f(p): moves img's content onto the geometry f was measured from."""
    h, w = f.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(img, gx + f[..., 0], gy + f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def outside_eye_diff(a, b, face_box):
    """Share of solid pixels outside the eye band that differ by more than 24/255 (premultiplied)."""
    x0, y0, x1, y1 = face_box
    pa = a[..., :3] * (a[..., 3:4] / 255)
    pb = b[..., :3] * (b[..., 3:4] / 255)
    d = np.abs(pa - pb).max(axis=2)
    mask = np.maximum(a[..., 3], b[..., 3]) > 128
    mask[y0:y1, x0:x1] = False
    return float((d[mask] > 24).mean())


def eye_band(rgba):
    """A generous box around the eyes: the band between brows and cheeks where a blink really changes."""
    a = rgba[..., 3] > 128
    rgb = rgba[..., :3] / 255
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    skin = a & (r > g) & (g > b) & (r > 0.55)
    skin[int(skin.shape[0] * 0.7):] = False
    n, lab, st, _ = cv2.connectedComponentsWithStats(skin.astype(np.uint8), 8)
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    fx, fy, fw, fh = st[k, :4]
    return (fx - 10, fy + int(fh * 0.12), fx + fw + 10, fy + int(fh * 0.55))


def eye_free(f, box):
    """Inside the eye band the frames really differ (lids against irises), so the flow there chases the
    wrong features and bends the lash line. Replace it with the head's motion interpolated from around
    the band (normalised convolution), feathered in, so the closed eyes move as a whole, never warp."""
    x0, y0, x1, y1 = box
    keep = np.ones(f.shape[:2], np.float32)
    keep[y0:y1, x0:x1] = 0
    fill = cv2.GaussianBlur(f * keep[..., None], (0, 0), 40) / np.maximum(cv2.GaussianBlur(keep, (0, 0), 40), 1e-4)[..., None]
    m = np.clip(cv2.GaussianBlur(1 - keep, (0, 0), 8) * 2, 0, 1)[..., None]
    return f * (1 - m) + fill * m


def grid_sample(f, h, w):
    gx, gy = w // GRID + 1, h // GRID + 1
    xs = np.linspace(0, w - 1, gx).round().astype(int)
    ys = np.linspace(0, h - 1, gy).round().astype(int)
    return f[np.ix_(ys, xs)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--review", type=Path)
    ap.add_argument("--no-blinks", action="store_true", help="skip blink alignment (the closed frames are already aligned)")
    args = ap.parse_args()

    # 1. blink alignment
    for pose in [] if args.no_blinks else BLINKS:
        o, c = load(f"{pose}-open"), load(f"{pose}-closed")
        box = eye_band(o)
        before = outside_eye_diff(o, c, box)
        f = flow(o, c)
        # smooth so the warp is a gentle deformation, never a smear of individual strands
        f = eye_free(cv2.GaussianBlur(f, (0, 0), 3), box)
        aligned = remap(c, f)
        after = outside_eye_diff(o, aligned, box)
        Image.fromarray(np.clip(aligned, 0, 255).astype(np.uint8), "RGBA").save(
            SRC / f"{pose}-closed.webp", "WEBP", quality=90, alpha_quality=100, method=6
        )
        print(f"blink {pose}: outside-eye change {before * 100:.1f}% -> {after * 100:.1f}%")

    # 2. morph flows between every pair the runtime can cross-fade
    imgs = {p: load(f"{p}-open") for p in MORPHABLE}
    h, w = next(iter(imgs.values())).shape[:2]
    for a, b in itertools.permutations(MORPHABLE, 2):
        fab = flow(imgs[a], imgs[b])
        fab = cv2.GaussianBlur(fab, (0, 0), GRID * 0.6)
        # trust: how well a warped along the flow reproduces b (sampling b's geometry needs b->a)
        fba = cv2.GaussianBlur(flow(imgs[b], imgs[a]), (0, 0), GRID * 0.6)
        warped = remap(imgs[a], fba)
        err = float(np.abs(warped[..., :3] / 255 - imgs[b][..., :3] / 255).mean())
        solid_b = imgs[b][..., 3] > 128
        sil = float(((warped[..., 3] > 128) ^ solid_b).sum() / solid_b.sum())
        out = SRC / f"morph-{a}-{b}.png"
        if err > TRUST_ERR or sil > TRUST_SIL:
            out.unlink(missing_ok=True)
            print(f"morph {a}->{b}: error {err:.3f}, silhouette miss {sil:.3f}, cross-fade only")
            continue
        g = grid_sample(fab, h, w)
        png = np.zeros(g.shape[:2] + (3,), np.uint8)
        png[..., 0] = np.clip(np.round(g[..., 0]) + 128, 0, 255)
        png[..., 1] = np.clip(np.round(g[..., 1]) + 128, 0, 255)
        png[..., 2] = 255
        Image.fromarray(png, "RGB").save(out, optimize=True)
        print(f"morph {a}->{b}: error {err:.3f}, silhouette miss {sil:.3f}, max shift {np.abs(g).max():.0f}px")
        if args.review and (a, b) in [("reading", "patted"), ("glance", "reading")]:
            args.review.mkdir(parents=True, exist_ok=True)
            Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), "RGBA").save(args.review / f"warp-{a}-{b}.png")


if __name__ == "__main__":
    main()
