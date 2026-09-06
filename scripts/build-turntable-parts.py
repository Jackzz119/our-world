"""Assemble the study-room turntable parts from GENERATED layers.

Generation first: codex paints (a) the turntable crop with the tonearm gone
and (b) the tonearm alone on a #00FF00 backdrop, both at 3x the base
resolution (1020x780 for the 340x260 crop at x 800-1140, y 680-940). Nothing
is cut out of the painting by colour or by hand. This script turns those into
shippable, mood-consistent assets:

  * plate  — the ORIGINAL room painting, patched only inside the tonearm's
    footprint (+ cast-shadow reach, feathered) with pixels from the generated
    arm-free crop. The donor is registered to the painting (integer offset
    search) and colour-matched on a ring around the footprint, so grooves and
    wood continue without a seam. One donor (twilight) serves all three
    moods so the geometry never morphs during a time-of-day cross-fade.
  * part   — the generated tonearm, chroma-keyed to a soft alpha, registered
    onto the painted arm's position, colour-matched per mood against the
    painted arm, shipped at 2x resolution with its placement box.
  * gate   — outside the footprint the plate is bit-identical to the
    painting; the boundary ring reports the seam error; review strips show
    original | plate | part | rest composite | lifted composite at 3x.

    python scripts/build-turntable-parts.py --gen codex-visual/<run> --src arts/rooms/study/source \
        --out public/rooms/study --review scratch/review

Needs Pillow, numpy, opencv-python-headless.
"""

from __future__ import annotations

import argparse
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

MOODS = ("golden", "twilight", "night")
DONOR_MOOD = "twilight"  # one generated geometry for all moods
CROP = (800, 680, 1140, 940)  # base px region the generated layers cover
UP = 3  # generated layers are 3x the base resolution
PART_RES = 2  # texture resolution shipped to pixi (base px x2)
ARM_PIVOT = (1062.5, 844.0)  # post center in base px (measured on the painting)
# where the PAINTED arm is (hand trace on a contrast-stretched view); this is
# only used to decide which pixels of the painting get replaced
PAINTED_ARM = [
    (1053, 847), (1055, 836), (1061, 832), (1069, 832), (1074, 837), (1075, 847), (1073, 857), (1068, 862), (1060, 863),
    (1052, 866), (1045, 867), (1035, 872), (1025, 878), (1015, 884), (1008, 890),
    (1010, 897), (1006, 907), (996, 910), (985, 909), (977, 901), (977, 891), (984, 885), (994, 884), (1003, 884),
    (1006, 881), (1015, 875), (1025, 869), (1035, 863), (1045, 858), (1052, 855),
]
SHADOW_REACH = 22  # base px around the painted arm its cast shadow can extend (it is long on the vinyl)
FEATHER = 3.0  # px, softness of the patch boundary
KEY_LO, KEY_HI = 40, 120  # green-minus-others: below LO = opaque arm, above HI = pure backdrop


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float64)


def chroma_key(rgb):
    """Soft alpha from a #00FF00 backdrop plus despill of the arm's edge pixels."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = g - np.maximum(r, b)
    alpha = 1.0 - np.clip((green - KEY_LO) / (KEY_HI - KEY_LO), 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    rgb2 = rgb.copy()
    rgb2[..., 1] = np.minimum(g, np.maximum(r, b) + 8)
    return rgb2, alpha


def best_offset(src_lum, dst_lum, weight, search):
    """Integer (dx, dy) minimising weighted |src - dst| when src is shifted by it."""
    h, w = weight.shape
    ys, xs = np.nonzero(weight > 1e-3)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    wgt = weight[y0:y1, x0:x1]
    s = src_lum[y0:y1, x0:x1]
    best, off = None, (0, 0)
    for dy in range(-search, search + 1):
        for dx in range(-search, search + 1):
            if y0 + dy < 0 or x0 + dx < 0 or y1 + dy > h or x1 + dx > w:
                continue
            d = dst_lum[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
            score = (np.abs(s - d) * wgt).sum() / wgt.sum()
            if best is None or score < best:
                best, off = score, (dx, dy)
    return off, best


def shift(img, dx, dy):
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def downscale(img, factor):
    h, w = img.shape[:2]
    return cv2.resize(img, (round(w * factor), round(h * factor)), interpolation=cv2.INTER_AREA)


def affine_match(src, dst, weight):
    """Per-channel a*src+b ≈ dst over weighted pixels; returns matched src."""
    out = src.copy()
    w = weight.ravel()
    for ch in range(3):
        s, d = src[..., ch].ravel(), dst[..., ch].ravel()
        sm, dm = np.average(s, weights=w), np.average(d, weights=w)
        sv = np.average((s - sm) ** 2, weights=w)
        a = np.average((s - sm) * (d - dm), weights=w) / max(sv, 1e-6)
        a = float(np.clip(a, 0.6, 1.6))
        out[..., ch] = a * (src[..., ch] - sm) + dm
    return out


def poly_mask(shape, poly, offset=(0, 0)):
    m = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon([(x - offset[0], y - offset[1]) for x, y in poly], fill=255)
    return np.asarray(m).astype(np.float64) / 255.0


def checker(size):
    im = Image.new("RGB", size, (200, 60, 200))
    d = ImageDraw.Draw(im)
    for yy in range(0, size[1], 24):
        for xx in range(0, size[0], 24):
            if (xx // 24 + yy // 24) % 2:
                d.rectangle([xx, yy, xx + 23, yy + 23], fill=(60, 200, 60))
    return im


def composite(base, rgba, box, lift_px=0.0, lean=0.0):
    """Lay an RGBA part (base-px box) over a base image; optional cue-up pose."""
    layer = Image.new("RGBA", (base.shape[1], base.shape[0]), (0, 0, 0, 0))
    part = Image.fromarray(rgba, "RGBA").resize((round(box[2]), round(box[3])), Image.LANCZOS)
    if lean:
        px, py = ARM_PIVOT[0] - box[0], ARM_PIVOT[1] - box[1]
        part = part.rotate(-lean, resample=Image.BICUBIC, center=(px, py), expand=False)
    layer.paste(part, (round(box[0]), round(box[1] - lift_px)))
    return np.asarray(Image.alpha_composite(Image.fromarray(base.astype(np.uint8)).convert("RGBA"), layer).convert("RGB")).astype(np.float64)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gen", required=True, help="codex run dir with plate-<mood>.png and part-tonearm-<mood>.png")
    ap.add_argument("--src", required=True, help="dir with the untouched room arts")
    ap.add_argument("--out", required=True, help="dir receiving <mood>.png plates and parts/tonearm-<mood>.png")
    ap.add_argument("--review", required=True, help="dir receiving review strips")
    args = ap.parse_args()
    os.makedirs(os.path.join(args.out, "parts"), exist_ok=True)
    os.makedirs(args.review, exist_ok=True)
    cx0, cy0, cx1, cy1 = CROP
    cw, ch = cx1 - cx0, cy1 - cy0

    # --- donor geometry (one for all moods) ---
    donor3 = load_rgb(os.path.join(args.gen, f"plate-{DONOR_MOOD}.png"))
    part3_raw = load_rgb(os.path.join(args.gen, f"part-tonearm-{DONOR_MOOD}.png"))
    assert donor3.shape[:2] == (ch * UP, cw * UP) == part3_raw.shape[:2], (donor3.shape, part3_raw.shape)
    donor1 = downscale(donor3, 1 / UP)
    part3, alpha3 = chroma_key(part3_raw)

    rooms = {m: load_rgb(os.path.join(args.src, f"{m}.png")) for m in MOODS}
    ref_crop = rooms[DONOR_MOOD][cy0:cy1, cx0:cx1]
    footprint = poly_mask((ch, cw), PAINTED_ARM, offset=(cx0, cy0))
    k = 2 * SHADOW_REACH + 1
    footprint = cv2.dilate(footprint, np.ones((k, k), np.float64))
    ring = cv2.dilate(footprint, np.ones((17, 17), np.float64)) - footprint  # where donor must agree with the painting
    soft = cv2.GaussianBlur(footprint, (0, 0), FEATHER)

    # register the donor crop onto the painting using the ring
    (ddx, ddy), dscore = best_offset(donor1.mean(axis=2), ref_crop.mean(axis=2), ring, search=6)
    donor1 = shift(donor1, ddx, ddy)

    # register the generated arm onto the painted arm (3x space), then to 1x
    painted3 = cv2.resize(poly_mask((ch, cw), PAINTED_ARM, offset=(cx0, cy0)), (cw * UP, ch * UP), interpolation=cv2.INTER_NEAREST)
    ref_crop3 = cv2.resize(ref_crop, (cw * UP, ch * UP), interpolation=cv2.INTER_LANCZOS4)
    (adx, ady), ascore = best_offset(part3.mean(axis=2), ref_crop3.mean(axis=2), alpha3 * (1 + 2 * painted3), search=15)
    part3 = shift(part3, adx, ady)
    alpha3 = shift(alpha3, adx, ady)
    alpha1 = downscale(alpha3, 1 / UP)
    print(f"donor offset {ddx:+d},{ddy:+d}px (ring score {dscore:.1f}) | arm offset {adx / UP:+.1f},{ady / UP:+.1f}px (fit {ascore:.1f})")

    # part texture geometry (shared by all moods)
    pm3 = part3 * alpha3[..., None]
    a2 = downscale(alpha3, PART_RES / UP)
    ys, xs = np.nonzero(a2 > 0.02)
    pad = 3 * PART_RES
    y0, y1 = max(0, ys.min() - pad), min(a2.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(a2.shape[1], xs.max() + pad + 1)
    box = (cx0 + x0 / PART_RES, cy0 + y0 / PART_RES, (x1 - x0) / PART_RES, (y1 - y0) / PART_RES)
    manifest = {"pivot": {"x": ARM_PIVOT[0], "y": ARM_PIVOT[1]}, "box": {"x": box[0], "y": box[1], "w": box[2], "h": box[3]},
                "donor": DONOR_MOOD, "donor_offset_px": [ddx, ddy], "arm_offset_px": [adx / UP, ady / UP], "moods": {}}

    for mood in MOODS:
        room = rooms[mood]
        crop = room[cy0:cy1, cx0:cx1]
        # plate: donor colour-matched on the ring, pasted inside the footprint only
        donor_m = affine_match(donor1, crop, ring)
        patched = crop * (1 - soft[..., None]) + donor_m * soft[..., None]
        plate = room.copy()
        plate[cy0:cy1, cx0:cx1] = patched
        plate_u8 = np.clip(plate, 0, 255).astype(np.uint8)
        Image.fromarray(plate_u8).save(os.path.join(args.out, f"{mood}.png"))
        # part: donor arm colour-matched against this mood's painted arm
        crop3 = cv2.resize(crop, (cw * UP, ch * UP), interpolation=cv2.INTER_LANCZOS4)
        part_m = affine_match(part3, crop3, alpha3 * painted3)
        pm2 = downscale(part_m * alpha3[..., None], PART_RES / UP)
        rgb2 = np.where(a2[..., None] > 1e-3, pm2 / np.maximum(a2, 1e-3)[..., None], 0)
        rgba = np.dstack([np.clip(rgb2, 0, 255), np.clip(a2 * 255, 0, 255)])[y0:y1, x0:x1].astype(np.uint8)
        Image.fromarray(rgba, "RGBA").save(os.path.join(args.out, "parts", f"tonearm-{mood}.png"))
        # gate
        seam = np.abs(patched - crop).max(axis=2)[ring > 0.5]
        outside = np.abs(plate - room).max(axis=2)
        outside[cy0:cy1, cx0:cx1][soft > 0.002] = 0
        rest = composite(plate, rgba, box)
        d_arm = np.abs(rest - room).max(axis=2)[cy0:cy1, cx0:cx1][alpha1 > 0.5]
        print(f"{mood:9s} seam ring mean {seam.mean():.2f} p95 {np.percentile(seam, 95):.0f} | outside footprint max {outside.max():.0f} | "
              f"generated arm vs painted arm (colour) mean {d_arm.mean():.1f}")
        manifest["moods"][mood] = {"seam_ring_mean": round(float(seam.mean()), 2)}
        # review strip at 3x: original | plate | part | rest | cued (lift 3.5px, lean 1.7deg)
        lifted = composite(plate, rgba, box, lift_px=3.5, lean=-1.7)
        w3, h3 = cw * UP, ch * UP
        strip = Image.new("RGB", (w3 * 5 + 40, h3), (18, 18, 18))
        part_img = Image.fromarray(np.dstack([np.clip(part_m, 0, 255), alpha3 * 255]).astype(np.uint8), "RGBA")
        tiles = [
            Image.fromarray(crop.astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.fromarray(np.clip(patched, 0, 255).astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.alpha_composite(checker((w3, h3)).convert("RGBA"), part_img).convert("RGB"),
            Image.fromarray(rest[cy0:cy1, cx0:cx1].astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.fromarray(lifted[cy0:cy1, cx0:cx1].astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
        ]
        for i, t in enumerate(tiles):
            strip.paste(t, (i * (w3 + 10), 0))
        strip.save(os.path.join(args.review, f"turntable-{mood}.png"))
    with open(os.path.join(args.out, "parts", "tonearm.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    print("manifest:", json.dumps(manifest))


if __name__ == "__main__":
    main()
