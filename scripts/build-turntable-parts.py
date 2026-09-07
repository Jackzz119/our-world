"""Assemble the study-room turntable from FULLY SEPARATED generated layers.

Rule of the pipeline (user direction 2026-09-06): static things keep the
painting's light; moving things ship as flat albedo and are lit by the engine.
Codex generates (3x the base resolution, crop x 800-1140 / y 680-940):
  machine-<mood>.png   the turntable with NO record and NO tonearm (empty well
                       + spindle pin); static, so painted light stays
  platter.png          the record TOP-DOWN, flat-lit, on #00FF00
  tonearm.png          the arm alone, flat-lit, in place, on #00FF00

This script turns them into engine assets:
  * <mood>.png            the room painting with the platter area and the arm
                          footprint replaced by the machine donor (one donor
                          geometry, colour-matched per mood on a ring) — under
                          the spinning record there is now an empty well, never
                          a painted record
  * parts/platter.png     albedo of the record in disc space (unit circle
                          inscribed in the square), soft 1px rim
  * parts/platter-light-<mood>.png  the painting's light on the record, in the
                          same disc space: rim band + low-frequency sheen, as a
                          normal-blend overlay that never turns
  * parts/tonearm.png     the arm albedo, keyed, registered onto the painted
                          arm's position, with its placement box; manifest
                          carries a per-mood tint (painted arm / albedo)
  * gate                  outside the patch the plate is bit-identical; seam
                          ring error; registration offsets; review strips

    python scripts/build-turntable-parts.py --gen arts/rooms/study/generated/<run> \
        --src arts/rooms/study/source --out public/rooms/study --review scratch/review

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
DONOR_MOOD = "twilight"
CROP = (800, 680, 1140, 940)
UP = 3
PART_RES = 2
DISC_TEX = 256  # px, disc-space textures (unit square) — near the on-screen size, so mip blending stays crisp
PLATTER = dict(cx=963.6, cy=844.7, rx=82.4, ry=49.9, tilt=0.128)
CENTER = (962.6, 841.0)
ARM_PIVOT = (1062.5, 844.0)
PAINTED_ARM = [
    (1053, 847), (1055, 836), (1061, 832), (1069, 832), (1074, 837), (1075, 847), (1073, 857), (1068, 862), (1060, 863),
    (1052, 866), (1045, 867), (1035, 872), (1025, 878), (1015, 884), (1008, 890),
    (1010, 897), (1006, 907), (996, 910), (985, 909), (977, 901), (977, 891), (984, 885), (994, 884), (1003, 884),
    (1006, 881), (1015, 875), (1025, 869), (1035, 863), (1045, 858), (1052, 855),
]
SHADOW_REACH = 22
WELL_MARGIN = 1.06  # rho: patch reaches this far past the painted rim so the well's rim comes from the machine
FEATHER = 3.0
KEY_LO, KEY_HI = 40, 120
RIM_BAND = (0.93, 0.985)  # rho where the painted record edge stays as static light
LIGHT_GAIN = 1.6  # how strongly the painted angular light is applied to the albedo (add/multiply layers)


# ---------- geometry ----------
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


def rho_map(shape, Hinv, offset=(0, 0)):
    ys, xs = np.mgrid[0:shape[0], 0:shape[1]]
    pts = np.stack([xs.ravel() + offset[0] + 0.5, ys.ravel() + offset[1] + 0.5, np.ones(xs.size)]).T @ Hinv.T
    return np.hypot(pts[:, 0] / pts[:, 2], pts[:, 1] / pts[:, 2]).reshape(shape)


def warp_to_disc(img, Hm, size):
    """Inverse-warp a room image into disc space (unit square → size x size)."""
    # disc (u,v) in [-1,1] → room px: map via H; cv2.warpPerspective needs disc px → room px
    S = np.array([[2.0 / size, 0, -1 + 1.0 / size], [0, 2.0 / size, -1 + 1.0 / size], [0, 0, 1]])  # texel → (u,v)
    M = Hm @ S  # texel → room px
    # WARP_INVERSE_MAP wants the dst→src map, which is exactly M (texel → room px)
    return cv2.warpPerspective(img, M, (size, size), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)


# ---------- image helpers ----------
def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float64)


def chroma_key(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = g - np.maximum(r, b)
    alpha = 1.0 - np.clip((green - KEY_LO) / (KEY_HI - KEY_LO), 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    rgb2 = rgb.copy()
    rgb2[..., 1] = np.minimum(g, np.maximum(r, b) + 8)
    return rgb2, alpha


def best_offset(src_lum, dst_lum, weight, search):
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


def unsharp(rgb, sigma=1.0, amount=0.8):
    """Mild unsharp mask: the engine draws these textures at ~1/3 scale with
    mipmaps, which softens the label edge and groove lines below the painting."""
    blur = cv2.GaussianBlur(rgb, (0, 0), sigma)
    return np.clip(rgb + amount * (rgb - blur), 0, 255)


def rgba_u8(rgb, alpha):
    return np.dstack([np.clip(rgb, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)


def over(base_rgb, rgba):
    a = rgba[..., 3:4].astype(np.float64) / 255.0
    return base_rgb * (1 - a) + rgba[..., :3].astype(np.float64) * a


# ---------- parts ----------
def normalize_platter(path):
    """Generated top-down record → exact unit circle inscribed in a DISC_TEX square, soft rim."""
    rgb, alpha = chroma_key(load_rgb(path))
    ys, xs = np.nonzero(alpha > 0.5)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    r = ((xs.max() - xs.min()) + (ys.max() - ys.min())) / 4
    # sample the square [cx-r, cx+r] x [cy-r, cy+r] into DISC_TEX; keep the disc's own alpha
    M = np.float32([[DISC_TEX / (2 * r), 0, -(cx - r) * DISC_TEX / (2 * r)], [0, DISC_TEX / (2 * r), -(cy - r) * DISC_TEX / (2 * r)]])
    tex = cv2.warpAffine(rgb, M, (DISC_TEX, DISC_TEX), flags=cv2.INTER_AREA)
    yy, xx = np.mgrid[0:DISC_TEX, 0:DISC_TEX]
    rr = np.hypot((xx + 0.5) / DISC_TEX * 2 - 1, (yy + 0.5) / DISC_TEX * 2 - 1)
    edge = 1 - 1.0 / (PLATTER["rx"])  # ~1px of the painted rim stays with the plate
    a = np.clip((edge - rr) / (2.5 / PLATTER["rx"]) + 1, 0, 1)
    a = a * a * (3 - 2 * a)
    return rgba_u8(unsharp(tex), a), (cx, cy, r)


def platter_light(room, Hm, Hinv, arm_mask_room):
    """The painting's light on the record as TWO static overlays in disc space:
    `add` (what the hour makes brighter than the ring average — window/lamp
    sheen) and `mul` (what it makes darker — shadow side, edge shading).
    Both come from the low-frequency angular part of the painted disc, so
    they carry no grooves and no label edge; the albedo keeps its material and
    turns underneath while the light stays put."""
    disc = warp_to_disc(room, Hm, DISC_TEX)
    arm = warp_to_disc(arm_mask_room, Hm, DISC_TEX) > 0.5  # the painted arm + shadow: not light, exclude
    yy, xx = np.mgrid[0:DISC_TEX, 0:DISC_TEX]
    rr = np.hypot((xx + 0.5) / DISC_TEX * 2 - 1, (yy + 0.5) / DISC_TEX * 2 - 1)
    bins = np.round(rr * 400).astype(int)
    radial = np.zeros_like(disc)
    for b in np.unique(bins[rr < 1.0]):
        m = (bins == b) & ~arm
        if not m.any():
            m = bins == b
        radial[bins == b] = np.median(disc[m].reshape(-1, 3), axis=0)
    clean = np.where(arm[..., None], radial, disc)
    low = cv2.GaussianBlur(clean, (0, 0), DISC_TEX / 32)
    low_radial = cv2.GaussianBlur(radial, (0, 0), DISC_TEX / 32)
    sheen = (low - low_radial) * LIGHT_GAIN
    inside = (rr < 1.0).astype(np.float64)
    add = np.clip(sheen, 0, 255)
    # multiply: 255 = untouched; darker where the hour paints the disc darker,
    # plus a gentle edge ramp so the record does not end in a flat cut
    edge = np.clip((rr - RIM_BAND[0]) / (1.0 - RIM_BAND[0]), 0, 1) * 0.35
    mul = np.clip(255 + np.minimum(sheen, 0) - edge[..., None] * 255, 0, 255)
    return rgba_u8(add, inside), rgba_u8(mul, inside)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gen", required=True, help="dir with machine-<mood>.png, platter.png, tonearm.png")
    ap.add_argument("--src", required=True, help="dir with the untouched room arts")
    ap.add_argument("--out", required=True, help="dir receiving <mood>.png plates and parts/")
    ap.add_argument("--review", required=True, help="dir receiving review strips")
    ap.add_argument("--platter", help="override: top-down flat-lit record PNG (default <gen>/platter.png)")
    ap.add_argument("--spindle", help="spindle pin part PNG in crop framing on #00FF00 (static, drawn above the record)")
    args = ap.parse_args()
    os.makedirs(os.path.join(args.out, "parts"), exist_ok=True)
    os.makedirs(args.review, exist_ok=True)
    cx0, cy0, cx1, cy1 = CROP
    cw, ch = cx1 - cx0, cy1 - cy0
    Hm = disc_homography()
    Hinv = np.linalg.inv(Hm)
    rooms = {m: load_rgb(os.path.join(args.src, f"{m}.png")) for m in MOODS}
    ref_crop = rooms[DONOR_MOOD][cy0:cy1, cx0:cx1]

    # --- machine donor (one geometry) ---
    donor1 = downscale(load_rgb(os.path.join(args.gen, f"machine-{DONOR_MOOD}.png")), 1 / UP)
    assert donor1.shape[:2] == (ch, cw), donor1.shape
    rho = rho_map((ch, cw), Hinv, offset=(cx0, cy0))
    well = (rho < WELL_MARGIN).astype(np.float64)
    arm_fp = cv2.dilate(poly_mask((ch, cw), PAINTED_ARM, offset=(cx0, cy0)), np.ones((2 * SHADOW_REACH + 1,) * 2, np.float64))
    footprint = np.maximum(well, arm_fp)
    ring = cv2.dilate(footprint, np.ones((17, 17), np.float64)) - footprint
    soft = cv2.GaussianBlur(footprint, (0, 0), FEATHER)
    (ddx, ddy), dscore = best_offset(donor1.mean(axis=2), ref_crop.mean(axis=2), ring, search=6)
    donor1 = shift(donor1, ddx, ddy)

    # --- platter albedo (disc space) ---
    platter_rgba, (pcx, pcy, pr) = normalize_platter(args.platter or os.path.join(args.gen, "platter.png"))
    Image.fromarray(platter_rgba, "RGBA").save(os.path.join(args.out, "parts", "platter.png"))

    # --- arm albedo, registered to the painted arm ---
    part3, alpha3 = chroma_key(load_rgb(os.path.join(args.gen, "tonearm.png")))
    painted3 = cv2.resize(poly_mask((ch, cw), PAINTED_ARM, offset=(cx0, cy0)), (cw * UP, ch * UP), interpolation=cv2.INTER_NEAREST)
    ref3 = cv2.resize(ref_crop, (cw * UP, ch * UP), interpolation=cv2.INTER_LANCZOS4)
    (adx, ady), ascore = best_offset(part3.mean(axis=2), ref3.mean(axis=2), alpha3 * (1 + 2 * painted3), search=15)
    part3, alpha3 = shift(part3, adx, ady), shift(alpha3, adx, ady)
    # albedo calibration: the generator's colour drifts (reddish), so match it
    # once to the painted arm under the flattest light (golden). Per-mood
    # engine tints are then real lighting ratios relative to that reference.
    gold3 = cv2.resize(rooms["golden"][cy0:cy1, cx0:cx1], (cw * UP, ch * UP), interpolation=cv2.INTER_LANCZOS4)
    part3 = affine_match(part3, gold3, alpha3 * painted3)
    a2 = downscale(alpha3, PART_RES / UP)
    pm2 = downscale(part3 * alpha3[..., None], PART_RES / UP)
    rgb2 = np.where(a2[..., None] > 1e-3, pm2 / np.maximum(a2, 1e-3)[..., None], 0)
    ys, xs = np.nonzero(a2 > 0.02)
    pad = 3 * PART_RES
    y0, y1 = max(0, ys.min() - pad), min(a2.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(a2.shape[1], xs.max() + pad + 1)
    arm_rgba = rgba_u8(rgb2, a2)[y0:y1, x0:x1]
    Image.fromarray(arm_rgba, "RGBA").save(os.path.join(args.out, "parts", "tonearm.png"))
    box = {"x": cx0 + x0 / PART_RES, "y": cy0 + y0 / PART_RES, "w": (x1 - x0) / PART_RES, "h": (y1 - y0) / PART_RES}
    alpha1 = downscale(alpha3, 1 / UP)
    print(f"donor offset {ddx:+d},{ddy:+d} (ring {dscore:.1f}) | arm offset {adx / UP:+.1f},{ady / UP:+.1f} (fit {ascore:.1f}) | platter circle c=({pcx:.0f},{pcy:.0f}) r={pr:.0f}")

    # spindle pin: generated in place, keyed, no registration needed (7x10 px)
    spindle_box = None
    if args.spindle:
        sp3, sa3 = chroma_key(load_rgb(args.spindle))
        sa2 = downscale(sa3, PART_RES / UP)
        spm2 = downscale(sp3 * sa3[..., None], PART_RES / UP)
        srgb2 = np.where(sa2[..., None] > 1e-3, spm2 / np.maximum(sa2, 1e-3)[..., None], 0)
        sys_, sxs = np.nonzero(sa2 > 0.02)
        sy0, sy1 = max(0, sys_.min() - pad), min(sa2.shape[0], sys_.max() + pad + 1)
        sx0, sx1 = max(0, sxs.min() - pad), min(sa2.shape[1], sxs.max() + pad + 1)
        Image.fromarray(rgba_u8(srgb2, sa2)[sy0:sy1, sx0:sx1], "RGBA").save(os.path.join(args.out, "parts", "spindle.png"))
        spindle_box = {"x": cx0 + sx0 / PART_RES, "y": cy0 + sy0 / PART_RES, "w": (sx1 - sx0) / PART_RES, "h": (sy1 - sy0) / PART_RES}
    manifest = {"pivot": {"x": ARM_PIVOT[0], "y": ARM_PIVOT[1]}, "arm": {"src": "/rooms/study/parts/tonearm.png", "box": box},
                "spindle": {"src": "/rooms/study/parts/spindle.png", "box": spindle_box} if spindle_box else None,
                "platter": "/rooms/study/parts/platter.png", "platterLight": {}, "armTint": {}, "donor": DONOR_MOOD}
    painted1 = poly_mask((ch, cw), PAINTED_ARM, offset=(cx0, cy0))
    for mood in MOODS:
        room = rooms[mood]
        crop = room[cy0:cy1, cx0:cx1]
        donor_m = affine_match(donor1, crop, ring)
        patched = crop * (1 - soft[..., None]) + donor_m * soft[..., None]
        plate = room.copy()
        plate[cy0:cy1, cx0:cx1] = patched
        Image.fromarray(np.clip(plate, 0, 255).astype(np.uint8)).save(os.path.join(args.out, f"{mood}.png"))
        # static light of this mood on the record
        arm_room = np.zeros(room.shape[:2], np.float64)
        arm_room[cy0:cy1, cx0:cx1] = arm_fp
        light_add, light_mul = platter_light(room, Hm, Hinv, arm_room)
        Image.fromarray(light_add, "RGBA").save(os.path.join(args.out, "parts", f"platter-light-add-{mood}.png"))
        Image.fromarray(light_mul, "RGBA").save(os.path.join(args.out, "parts", f"platter-light-mul-{mood}.png"))
        manifest["platterLight"][mood] = {"add": f"/rooms/study/parts/platter-light-add-{mood}.png", "mul": f"/rooms/study/parts/platter-light-mul-{mood}.png"}
        # engine tint for the flat arm: painted arm mean / albedo mean, per channel
        w = (alpha1 * painted1)
        painted_mean = np.array([np.average(crop[..., c], weights=w) for c in range(3)])
        gold_crop = rooms["golden"][cy0:cy1, cx0:cx1]
        golden_mean = np.array([np.average(gold_crop[..., c], weights=w) for c in range(3)])
        t = np.clip(painted_mean / np.maximum(golden_mean, 1), 0, 1.0)
        manifest["armTint"][mood] = "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in t)
        # same for the flat platter: how much darker/cooler this hour paints the vinyl than golden does
        vinyl = ((rho > 0.45) & (rho < 0.9)).astype(np.float64)
        pv = np.array([np.average(crop[..., c], weights=vinyl) for c in range(3)])
        gv = np.array([np.average(gold_crop[..., c], weights=vinyl) for c in range(3)])
        tp = np.clip(pv / np.maximum(gv, 1), 0, 1.0)
        manifest.setdefault("platterTint", {})[mood] = "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in tp)
        # gate
        seam = np.abs(patched - crop).max(axis=2)[ring > 0.5]
        outside = np.abs(plate - room).max(axis=2)
        outside[cy0:cy1, cx0:cx1][soft > 0.002] = 0
        print(f"{mood:9s} seam ring mean {seam.mean():.2f} p95 {np.percentile(seam, 95):.0f} | outside patch max {outside.max():.0f} | armTint {manifest['armTint'][mood]} platterTint {manifest['platterTint'][mood]}")
        # review: original | plate | platter albedo | light overlay | arm on checker
        w3, h3 = cw * UP, ch * UP
        strip = Image.new("RGB", (w3 * 5 + 40, h3), (18, 18, 18))
        tiles = [
            Image.fromarray(crop.astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.fromarray(np.clip(patched, 0, 255).astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.alpha_composite(checker((h3, h3)).convert("RGBA"), Image.fromarray(platter_rgba, "RGBA").resize((h3, h3), Image.LANCZOS)).convert("RGB"),
            Image.alpha_composite(checker((h3, h3)).convert("RGBA"), Image.fromarray(light_add, "RGBA").resize((h3, h3), Image.LANCZOS)).convert("RGB"),
            Image.alpha_composite(checker((w3, h3)).convert("RGBA"), Image.fromarray(rgba_u8(part3, alpha3), "RGBA")).convert("RGB"),
        ]
        x = 0
        for t in tiles:
            strip.paste(t, (x, 0))
            x += t.width + 10
        strip.save(os.path.join(args.review, f"turntable-{mood}.png"))
    with open(os.path.join(args.out, "parts", "turntable.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    print("manifest:", json.dumps(manifest))


if __name__ == "__main__":
    main()
