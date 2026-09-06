"""Build the study-room turntable parts from the painted base art.

  * clean plates  - the base art with the tonearm AND its cast shadow erased
    from the vinyl (per mood). Inside the platter the hole is rebuilt from the
    per-radius median of the untouched angles: the vinyl is rotationally
    symmetric, so this is exact and never copies a streak. The case is left
    untouched: the post is the pivot (it never moves) and the arm's root
    swings well under a pixel, so the part simply re-covers it.
  * tonearm parts - RGBA cutouts along a hand-traced, shape-based silhouette
    (colour thresholds cannot tell a black arm from black vinyl), plus a soft
    synthetic shadow under the arm on the vinyl so it still sits ON the disc.
  * a diff gate   - arm laid back over the plate must reproduce the original
    (the only intended difference is the repainted shadow).

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
from PIL import Image, ImageDraw

MOODS = ("golden", "twilight", "night")
PLATTER = dict(cx=963.6, cy=844.7, rx=82.4, ry=49.9, tilt=0.128)
CENTER = (962.6, 841.0)
ARM_PIVOT = (1062.5, 844.0)
# tight silhouette traced on a dark-range-stretched 6x view: post cap → arm
# underside → headshell + cartridge → arm top edge → back to the post
ARM_SILHOUETTE = [
    (1053, 847), (1055, 836), (1061, 832), (1069, 832), (1074, 837), (1075, 847), (1073, 857), (1068, 862), (1060, 863),
    (1052, 866), (1045, 867), (1035, 872), (1025, 878), (1015, 884), (1008, 890),
    (1010, 897), (1006, 907), (996, 910), (985, 909), (977, 901), (977, 891), (984, 885), (994, 884), (1003, 884),
    (1006, 881), (1015, 875), (1025, 869), (1035, 863), (1045, 858), (1052, 855),
]
SHADOW_REACH = 14  # px around the arm the painted cast shadow can extend on the vinyl
NEAR_PIVOT = 30  # px from the post within which the arm barely moves and the case stays as painted
RHO_RING = 1.12  # platter recess ring: still symmetric about the disc, polar fill allowed
STEPS = [0.7, -0.7, 1.05, -1.05, 1.4, -1.4, 1.75, -1.75, 2.1, -2.1, 2.6, -2.6, math.pi]
SYN_SHADOW = dict(dx=1.5, dy=4.0, blur=2.5, alpha=0.45)


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


def poly_mask(size, poly):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.asarray(m)


def rho_map(shape, Hinv):
    """Disc-plane radius (1 = rim) for every pixel."""
    ys, xs = np.mgrid[0:shape[0], 0:shape[1]]
    pts = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5, np.ones(xs.size)]).T @ Hinv.T
    return np.hypot(pts[:, 0] / pts[:, 2], pts[:, 1] / pts[:, 2]).reshape(shape)


def clean_plate(img, arm, rho, Hm):
    """Erase the arm where it MOVES: on the vinyl (arm + cast shadow), and on
    the case only far from the pivot (the headshell overhangs the rim and
    swings ~4px; the root next to the post moves under a pixel and just stays
    covered). The platter recess ring around the rim is rotationally
    symmetric too, so the polar median reaches a little past rho = 1."""
    h, w = arm.shape
    ys, xs = np.mgrid[0:h, 0:w]
    far = np.hypot(xs + 0.5 - ARM_PIVOT[0], ys + 0.5 - ARM_PIVOT[1]) > NEAR_PIVOT
    k = 2 * SHADOW_REACH + 1
    reach = cv2.dilate(arm, np.ones((k, k), np.uint8)) > 127
    near = cv2.dilate(arm, np.ones((9, 9), np.uint8)) > 127
    region = (reach & (rho < 1.0)) | (near & (rho >= 1.0) & far)
    src = img.astype(np.float64)
    out = src.copy()
    deep = np.zeros(arm.shape, np.uint8)
    for y, x in zip(*np.nonzero(region)):
        u, v = apply(np.linalg.inv(Hm), x + 0.5, y + 0.5)
        r, a = math.hypot(u, v), math.atan2(v, u)
        cands = []
        if r < RHO_RING:
            for st in STEPS:
                sx, sy = apply(Hm, r * math.cos(a + st), r * math.sin(a + st))
                xi, yi = int(sx), int(sy)
                if 0 <= yi < h and 0 <= xi < w and not region[yi, xi]:
                    s = bilinear(src, sx, sy)
                    if s is not None:
                        cands.append(s)
        if len(cands) >= 3:
            out[y, x] = np.median(np.array(cands), axis=0)
        else:
            deep[y, x] = 255
    plate = np.clip(out, 0, 255).astype(np.uint8)
    if deep.any():
        plate = cv2.inpaint(plate, deep, 5, cv2.INPAINT_TELEA)  # leftovers on the case top
    return plate, region, int(deep.astype(bool).sum())


def arm_part(img, arm, rho):
    """RGBA cutout: the arm itself (1px feather) over a soft synthetic shadow
    that only falls on the vinyl (the case keeps its painted shadow)."""
    ys, xs = np.nonzero(arm)
    pad = 12
    x0, y0 = int(xs.min()) - pad, int(ys.min()) - pad
    x1, y1 = int(xs.max()) + pad + 1, int(ys.max()) + pad + 1
    a_arm = cv2.GaussianBlur(arm, (3, 3), 0.7).astype(np.float64) / 255.0
    sh = SYN_SHADOW
    M = np.float32([[1, 0, sh["dx"]], [0, 1, sh["dy"]]])
    shifted = cv2.warpAffine(arm, M, (arm.shape[1], arm.shape[0]))
    a_sh = cv2.GaussianBlur(shifted, (0, 0), sh["blur"]).astype(np.float64) / 255.0 * sh["alpha"]
    a_sh = np.where(rho < 1.0, a_sh, 0.0) * (1 - a_arm)  # vinyl only, never over the arm
    rgb = img.astype(np.float64)
    alpha = a_arm + a_sh
    # premultiplied blend of arm colour over black shadow, then un-premultiply
    col = rgb * a_arm[..., None] / np.maximum(alpha, 1e-6)[..., None]
    rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    return rgba[y0:y1, x0:x1], (x0, y0, x1 - x0, y1 - y0)


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
        arm = poly_mask((img.shape[1], img.shape[0]), ARM_SILHOUETTE)
        rho = rho_map(img.shape[:2], Hinv)
        plate, region, telea_px = clean_plate(img, arm, rho, Hm)
        part, box = arm_part(img, arm, rho)
        Image.fromarray(plate).save(os.path.join(args.out, f"{mood}.png"))
        Image.fromarray(part, "RGBA").save(os.path.join(args.out, "parts", f"tonearm-{mood}.png"))
        manifest["box"] = {"x": box[0], "y": box[1], "w": box[2], "h": box[3]}
        rest = composite(plate, part, box)
        armpx = arm > 127
        d_arm = np.abs(rest.astype(int) - img.astype(int)).max(axis=2)[armpx]
        d_out = np.abs(plate.astype(int) - img.astype(int)).max(axis=2)[~region]
        print(f"{mood:9s} rebuilt px {int(region.sum())} (telea {telea_px}) | gate on the arm itself: mean {d_arm.mean():.2f} max {d_arm.max()} | "
              f"outside rebuilt region max {d_out.max()} | part box {box}")
        swung = composite(plate, part, box, angle_deg=-3.0)
        w3, h3 = (crop[2] - crop[0]) * 3, (crop[3] - crop[1]) * 3
        strip = Image.new("RGB", (w3 * 4 + 30, h3), (18, 18, 18))
        for i, t in enumerate([img, plate, rest, swung]):
            strip.paste(Image.fromarray(t).crop(crop).resize((w3, h3), Image.LANCZOS), (i * (w3 + 10), 0))
        strip.save(os.path.join(args.review, f"turntable-{mood}.png"))
    with open(os.path.join(args.out, "parts", "tonearm.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    print("manifest:", json.dumps(manifest))


if __name__ == "__main__":
    main()
