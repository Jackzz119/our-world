"""Build the study-room turntable parts from the painted base art:

  * clean plates  - the base art with the tonearm erased (per mood). Inside
    the platter plane the hole is filled from the same radius at another
    angle (the vinyl is rotationally symmetric, so this is exact); deep in the
    case the small remainder is filled with OpenCV Telea inpainting.
  * tonearm parts - RGBA cutouts of the arm (post, tube, headshell, shadow),
    tight against the wood, generous over the vinyl (black over black is
    harmless), pivot-ready.
  * a diff gate   - arm laid back over the plate must reproduce the original.

Geometry mirrors src/themes/cinnaglass/room/study-room.ts (keep in sync).

    python scripts/build-turntable-parts.py --src arts/rooms/study/source --out public/rooms/study --review scratch/review

Needs Pillow, numpy, opencv-python-headless.
"""

from __future__ import annotations

import argparse
import json
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

MOODS = ("golden", "twilight", "night")
PLATTER = dict(cx=963.6, cy=844.7, rx=82.4, ry=49.9, tilt=0.128)
CENTER = (962.6, 841.0)
ARM_PIVOT = (1062.5, 844.0)
ARM_POLY = [(1056, 853), (1040, 861), (1025, 868), (1012, 873), (1003, 878), (994, 880), (980, 884), (972, 892),
            (973, 903), (982, 912), (996, 914), (1008, 908), (1012, 898), (1022, 890), (1036, 878), (1048, 872), (1058, 866)]
POST_BOX = (1062.5 - 13, 844 - 16, 1062.5 + 13, 844 + 14)
# "not wood": max |R-B| that still counts as arm metal / vinyl, per mood
CHROMA = {"golden": 26, "twilight": 16, "night": 16}
STEPS = [0.7, -0.7, 1.4, -1.4, 2.1, -2.1, math.pi]



def disc_homography():
    e = PLATTER
    c, s = math.cos(e["tilt"]), math.sin(e["tilt"])
    A = np.array([[e["rx"] * c, -e["ry"] * s, e["cx"]], [e["rx"] * s, e["ry"] * c, e["cy"]], [0, 0, 1.0]])
    p = np.linalg.inv(A) @ np.array([CENTER[0], CENTER[1], 1.0])
    px, py = p[0] / p[2], p[1] / p[2]
    a = math.hypot(px, py)
    if a < 1e-4:
        return A
    phi = math.atan2(py, px)
    sq = math.sqrt(1 - a * a)
    B = np.array([[1, 0, a], [0, sq, 0], [a, 0, 1.0]])
    R = np.array([[math.cos(phi), -math.sin(phi), 0], [math.sin(phi), math.cos(phi), 0], [0, 0, 1.0]])
    return A @ R @ B @ R.T


def apply(Hm, x, y):
    v = Hm @ np.array([x, y, 1.0])
    return v[0] / v[2], v[1] / v[2]


def bilinear(img, x, y):
    h, w = img.shape[:2]
    x0, y0 = int(math.floor(x - 0.5)), int(math.floor(y - 0.5))
    if x0 < 0 or y0 < 0 or x0 + 1 >= w or y0 + 1 >= h:
        return None
    fx, fy = x - 0.5 - x0, y - 0.5 - y0
    top = img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx
    bot = img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx
    return top * (1 - fy) + bot * fy


def arm_region(size):
    """Dilated footprint (arm + post + shadow margin) as a bool array."""
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.polygon(ARM_POLY, fill=255)
    d.ellipse(POST_BOX, fill=255)
    m = m.filter(ImageFilter.MaxFilter(7))
    return np.asarray(m) > 127


RHO_VINYL = 0.97  # inside this the disc is rotationally symmetric; the rim band and case are not


def sample_at_angle(src, region, Hm, r, a):
    sx, sy = apply(Hm, r * math.cos(a), r * math.sin(a))
    xi, yi = int(sx), int(sy)
    if 0 <= yi < region.shape[0] and 0 <= xi < region.shape[1] and not region[yi, xi]:
        return bilinear(src, sx, sy)
    return None


def clean_plate(img, region, Hm, Hinv):
    src = img.astype(np.float64)
    out = src.copy()
    ys, xs = np.nonzero(region)
    deep = np.zeros(region.shape, np.uint8)
    for y, x in zip(ys, xs):
        u, v = apply(Hinv, x + 0.5, y + 0.5)
        r = math.hypot(u, v)
        a = math.atan2(v, u)
        s = None
        if r < RHO_VINYL:
            # vinyl: median over several angles so a copied streak or sheen
            # never lands in the hole
            cands = [c for c in (sample_at_angle(src, region, Hm, r, a + st) for st in STEPS) if c is not None]
            if len(cands) >= 3:
                s = np.median(np.array(cands), axis=0)
        if s is not None:
            out[y, x] = s
        else:
            deep[y, x] = 255
    plate = np.clip(out, 0, 255).astype(np.uint8)
    # rim band + case wood: a smooth diffusion fill. Structured clones (rim
    # lines, plank edges) read as junk here, and the tonearm part covers this
    # area anyway except for slivers while it swings.
    if deep.any():
        plate = cv2.inpaint(plate, deep, 5, cv2.INPAINT_TELEA)
    return plate, int(deep.astype(bool).sum())


def arm_cutout(img, region, Hinv, chroma):
    """Alpha: inside the footprint keep the platter plane wholesale and, on
    the wood, only non-brown pixels (arm metal + its shadow)."""
    h, w = region.shape
    rb = img[..., 0].astype(int) - img[..., 2].astype(int)
    keep = np.zeros((h, w), bool)
    ys, xs = np.nonzero(region)
    for y, x in zip(ys, xs):
        u, v = apply(Hinv, x + 0.5, y + 0.5)
        if math.hypot(u, v) < 0.985 or abs(rb[y, x]) < chroma:
            keep[y, x] = True
    k = keep.astype(np.uint8) * 255
    k = cv2.morphologyEx(k, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    k = cv2.GaussianBlur(k, (3, 3), 0.8)
    k = np.where(region, k, 0).astype(np.uint8)
    x0, y0 = int(xs.min()) - 2, int(ys.min()) - 2
    x1, y1 = int(xs.max()) + 3, int(ys.max()) + 3
    rgba = np.dstack([img[y0:y1, x0:x1], k[y0:y1, x0:x1]])
    return rgba, (x0, y0, x1 - x0, y1 - y0)


def composite(plate, part, box, angle_deg=0.0):
    base = Image.fromarray(plate).convert("RGBA")
    arm = Image.fromarray(part, "RGBA")
    if angle_deg:
        px, py = ARM_PIVOT[0] - box[0], ARM_PIVOT[1] - box[1]
        arm = arm.rotate(-angle_deg, resample=Image.BICUBIC, center=(px, py), expand=False)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.paste(arm, (box[0], box[1]))
    return np.asarray(Image.alpha_composite(base, layer).convert("RGB"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", required=True, help="dir with golden/twilight/night.png originals")
    ap.add_argument("--out", required=True, help="dir receiving <mood>.png plates and parts/tonearm-<mood>.png")
    ap.add_argument("--review", required=True, help="dir receiving 3x review strips")
    args = ap.parse_args()
    os.makedirs(os.path.join(args.out, "parts"), exist_ok=True)
    os.makedirs(args.review, exist_ok=True)
    Hm = disc_homography()
    Hinv = np.linalg.inv(Hm)
    manifest = {"pivot": {"x": ARM_PIVOT[0], "y": ARM_PIVOT[1]}}
    crop = (800, 680, 1140, 940)
    for mood in MOODS:
        img = np.asarray(Image.open(os.path.join(args.src, f"{mood}.png")).convert("RGB"))
        region = arm_region((img.shape[1], img.shape[0]))
        plate, deep_px = clean_plate(img, region, Hm, Hinv)
        part, box = arm_cutout(img, region, Hinv, CHROMA[mood])
        Image.fromarray(plate).save(os.path.join(args.out, f"{mood}.png"))
        Image.fromarray(part, "RGBA").save(os.path.join(args.out, "parts", f"tonearm-{mood}.png"))
        manifest["box"] = {"x": box[0], "y": box[1], "w": box[2], "h": box[3]}
        # diff gate
        rest = composite(plate, part, box)
        d_in = np.abs(rest.astype(int) - img.astype(int)).max(axis=2)[region]
        d_out = np.abs(plate.astype(int) - img.astype(int)).max(axis=2)[~region]
        print(f"{mood:9s} plate: polar-filled {int(region.sum()) - deep_px} px, telea {deep_px} px | "
              f"gate inside footprint: mean {d_in.mean():.2f} max {d_in.max()} (>=24: {(d_in >= 24).mean() * 100:.1f}%) | "
              f"outside footprint max {d_out.max()} | arm box {box}")
        # review strip: original | clean plate | arm laid back | arm swung 3 deg
        swung = composite(plate, part, box, angle_deg=-3.0)
        tiles = [img, plate, rest, swung]
        w3, h3 = (crop[2] - crop[0]) * 3, (crop[3] - crop[1]) * 3
        strip = Image.new("RGB", (w3 * 4 + 30, h3), (18, 18, 18))
        for i, t in enumerate(tiles):
            tile = Image.fromarray(t).crop(crop).resize((w3, h3), Image.LANCZOS)
            strip.paste(tile, (i * (w3 + 10), 0))
        strip.save(os.path.join(args.review, f"turntable-{mood}.png"))
    with open(os.path.join(args.out, "parts", "tonearm.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    print("manifest:", json.dumps(manifest))


if __name__ == "__main__":
    main()
