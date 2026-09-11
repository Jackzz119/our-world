"""Assemble the study-room turntable from FULLY SEPARATED generated layers.

Rule of the pipeline (user direction 2026-09-06): static things keep the
painting's light; moving things ship as flat albedo and are lit by the engine.
Codex generates (3x the base resolution, crop x 800-1140 / y 680-940):
  machine-<mood>.png   the turntable with NO record and NO tonearm (empty well
                       + spindle pin); static, so painted light stays
  platter.png          the record TOP-DOWN, flat-lit, on #00FF00 — since v5
                       only its LABEL PRINT is used (moon, brush marks)
  tonearm.png          the arm alone, flat-lit, in place, on #00FF00

This script turns them into engine assets:
  * <mood>.png            the room painting with the platter area and the arm
                          footprint replaced by the machine donor (one donor
                          geometry, colour-matched per mood on a ring) — under
                          the spinning record there is now an empty well, never
                          a painted record
  * parts/platter-<mood>.png  the record's albedo per mood in disc space (unit
                          circle inscribed in the square): the painting's own
                          ROTATIONALLY SYMMETRIC part (angular median per
                          radius) plus the generated label print. A record's
                          look is light on grooves, so "albedo without light"
                          is a blank disc — the split is by symmetry instead:
                          what would look the same after any turn rotates,
                          what would not stays put (v5, 2026-09-07)
  * parts/platter-light-add|mul-<mood>.png  the rest of the painting on the
                          record — sheen, groove sparkle, rim highlight, shadow
                          side — per pixel, unblurred, as add/multiply overlays
                          that never turn. albedo x light == the painting at rest
  * parts/spindle-<mood>.png  the painted pin cut out with a feathered outline:
                          it stands through the record and never moves, so it
                          keeps the painting's light like every other still
  * parts/tonearm.png     the arm albedo, keyed, registered onto the painted
                          arm's position, with its placement box; manifest
                          carries a per-mood tint (painted arm / albedo)
  * gate                  outside the patch the plate is bit-identical; seam
                          ring error; registration offsets; REST RECOMPOSITION
                          error (albedo x light + pin vs the painting inside the
                          record, off the arm); review strips

    python scripts/build-turntable-parts.py --gen arts/rooms/study/generated/<run> \
        --src arts/rooms/study/source --out public/rooms/study --review scratch/review \
        --platter arts/rooms/study/generated/20260907-055939Z/platter.png

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
DISC_TEX = 512  # px, disc-space master textures (unit square); the engine refits them to the on-screen size
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
# the painted spindle pin, traced on a 12x grid (arts/rooms/study/source, all
# three moods agree within a pixel): body x 959-967, y 833-845, soft base below
PIN_POLY = [(958, 833), (961, 831.5), (965, 831.5), (968, 834), (968.5, 839), (967.5, 844), (964, 846.5), (960, 846.5), (957.5, 843), (957, 838)]
PIN_FEATHER = 1.0  # px, at base resolution
ARM_LIGHT_MARGIN = 6  # px: the arm's contact shadow on the record travels with the arm, so it is not static light
WELL_MARGIN = 1.06  # rho: patch reaches this far past the painted rim so the well's rim comes from the machine
FEATHER = 3.0
KEY_LO, KEY_HI = 40, 120
PRINT_DEV = (25, 65)  # colour distance from the generated label's flat fill that counts as print (ramp)


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


def warp_to_disc(img, Hm, size, interp=cv2.INTER_LINEAR):
    """Inverse-warp a room image into disc space (unit square → size x size)."""
    # disc (u,v) in [-1,1] → room px: map via H; cv2.warpPerspective needs disc px → room px
    S = np.array([[2.0 / size, 0, -1 + 1.0 / size], [0, 2.0 / size, -1 + 1.0 / size], [0, 0, 1]])  # texel → (u,v)
    M = Hm @ S  # texel → room px
    # WARP_INVERSE_MAP wants the dst→src map, which is exactly M (texel → room px)
    return cv2.warpPerspective(img, M, (size, size), flags=interp | cv2.WARP_INVERSE_MAP)


def disc_to_room(tex, Hm, shape):
    """Forward-warp a disc-space texture (size x size, unit square) into a room-sized image."""
    size = tex.shape[0]
    S = np.array([[2.0 / size, 0, -1 + 1.0 / size], [0, 2.0 / size, -1 + 1.0 / size], [0, 0, 1]])
    return cv2.warpPerspective(tex, Hm @ S, (shape[1], shape[0]), flags=cv2.INTER_LINEAR)


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
def disc_grid(n):
    yy, xx = np.mgrid[0:n, 0:n]
    u = (xx + 0.5) / n * 2 - 1
    v = (yy + 0.5) / n * 2 - 1
    return np.hypot(u, v), np.arctan2(v, u)


def rim_alpha(rr):
    """Soft record edge: ~1px of the painted rim stays with the plate, the rest is the record."""
    edge = 1 - 1.0 / PLATTER["rx"]
    a = np.clip((edge - rr) / (2.5 / PLATTER["rx"]) + 1, 0, 1)
    return a * a * (3 - 2 * a)


def radial_median(disc, excl, rr):
    """Rotationally symmetric part of the painted record: per radius (1 texel
    wide rings) the angular median over pixels not covered by arm or pin.
    Rings mostly hidden (under the pin) borrow the nearest visible ring."""
    bins = np.minimum(np.round(rr * DISC_TEX / 2).astype(int), DISC_TEX // 2)
    nb = bins.max() + 1
    prof = np.zeros((nb, 3))
    good = np.zeros(nb, bool)
    for bn in range(nb):
        ring = bins == bn
        m = ring & ~excl
        if m.sum() >= max(8, 0.25 * ring.sum()):
            prof[bn] = np.median(disc[m].reshape(-1, 3), axis=0)
            good[bn] = True
    idx = np.nonzero(good)[0]
    for bn in np.nonzero(~good)[0]:
        prof[bn] = prof[idx[np.argmin(np.abs(idx - bn))]]
    return prof[bins], bins


def inpaint_angular(diff, excl, bins, ang):
    """Fill the excluded sector of every ring by interpolating along the ring
    (with wrap-around), so the static light has no hole under the arm."""
    out = diff.copy()
    for bn in np.unique(bins[excl]):
        ring = bins == bn
        good, bad = ring & ~excl, ring & excl
        if good.sum() < 4:
            out[bad] = 0
            continue
        a_good = ang[good]
        order = np.argsort(a_good)
        a_good = a_good[order]
        vals = diff[good][order]
        a_pad = np.concatenate([a_good[-3:] - 2 * np.pi, a_good, a_good[:3] + 2 * np.pi])
        for c in range(3):
            v_pad = np.concatenate([vals[-3:, c], vals[:, c], vals[:3, c]])
            out[..., c][bad] = np.interp(ang[bad], a_pad, v_pad)
    return out


def label_print(path, radial, rr):
    """The generated record's label PRINT only (moon, brush marks) as a decal:
    everything that departs from the label's flat fill, recoloured so it
    inherits the painted label's shading ring by ring."""
    rgb, alpha = chroma_key(load_rgb(path))
    ys, xs = np.nonzero(alpha > 0.5)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    r = ((xs.max() - xs.min()) + (ys.max() - ys.min())) / 4
    M = np.float32([[DISC_TEX / (2 * r), 0, -(cx - r) * DISC_TEX / (2 * r)], [0, DISC_TEX / (2 * r), -(cy - r) * DISC_TEX / (2 * r)]])
    tex = cv2.warpAffine(rgb, M, (DISC_TEX, DISC_TEX), flags=cv2.INTER_AREA)
    # the painted label's radius: the sharpest luminance step of the symmetric profile in the label range
    lum = radial @ np.array([0.299, 0.587, 0.114])
    n = DISC_TEX // 2
    prof = np.array([np.median(lum[(rr * n).astype(int) == k]) for k in range(n)])
    lo, hi = int(0.2 * n), int(0.5 * n)
    label_r = (lo + int(np.argmax(np.abs(np.diff(prof[lo:hi]))))) / n
    lab = rr < label_r * 0.96
    fill = np.median(tex[lab].reshape(-1, 3), axis=0)
    dev = np.abs(tex - fill).sum(axis=2)
    da = np.clip((dev - PRINT_DEV[0]) / (PRINT_DEV[1] - PRINT_DEV[0]), 0, 1) * lab
    da = cv2.GaussianBlur(da, (0, 0), 0.7)
    dec = tex * (radial / np.maximum(fill, 1))  # print colour relative to its fill, times the painted ring
    return dec, da, label_r


def decompose_platter(room, Hm, excl_room, print_path):
    """Painted record → (albedo, light-add, light-mul) in disc space.
    albedo = angular median per radius (+ label print); light = painting − albedo,
    per pixel, split by sign. Recomposed at rest they give back the painting."""
    disc = warp_to_disc(room, Hm, DISC_TEX, cv2.INTER_CUBIC)
    excl = warp_to_disc(excl_room, Hm, DISC_TEX) > 0.3
    rr, ang = disc_grid(DISC_TEX)
    radial, bins = radial_median(disc, excl, rr)
    dec, da, label_r = label_print(print_path, radial, rr)
    albedo = radial * (1 - da[..., None]) + dec * da[..., None]
    diff = inpaint_angular(disc - radial, excl, bins, ang)
    a = rim_alpha(rr)
    add = np.clip(diff, 0, 255)
    mul = np.clip(255 + np.minimum(diff, 0), 0, 255)
    return rgba_u8(albedo, a), rgba_u8(add, a), rgba_u8(mul, a), label_r


def cut_pin(room):
    """The painted spindle pin as a feathered patch at PART_RES, plus its base-px box."""
    xs, ys = zip(*PIN_POLY)
    pad = 3
    x0, y0 = int(math.floor(min(xs))) - pad, int(math.floor(min(ys))) - pad
    x1, y1 = int(math.ceil(max(xs))) + pad, int(math.ceil(max(ys))) + pad
    crop = room[y0:y1, x0:x1]
    up = cv2.resize(crop, None, fx=PART_RES, fy=PART_RES, interpolation=cv2.INTER_CUBIC)
    mask = poly_mask(up.shape[:2], [(x * PART_RES, y * PART_RES) for x, y in PIN_POLY], offset=(x0 * PART_RES, y0 * PART_RES))
    mask = cv2.GaussianBlur(mask, (0, 0), PIN_FEATHER * PART_RES)
    return rgba_u8(up, mask), {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}


def compose_rest(plate, Hm, albedo, add, mul, pin_rgba, pin_box, spin_deg=0.0):
    """Offline replica of the engine's layering: albedo (turned by spin) under
    static mul/add light, then the pin patch. Used by the gate and the review."""
    n = albedo.shape[0]
    alb = albedo.astype(np.float64)
    if spin_deg:
        R = cv2.getRotationMatrix2D((n / 2 - 0.5, n / 2 - 0.5), spin_deg, 1.0)
        alb = cv2.warpAffine(alb, R, (n, n), flags=cv2.INTER_LINEAR)
    pr = disc_to_room(alb, Hm, plate.shape)
    ar = disc_to_room(add.astype(np.float64), Hm, plate.shape)
    mr = disc_to_room(mul.astype(np.float64), Hm, plate.shape)
    a = pr[..., 3:4] / 255
    out = plate * (1 - a) + pr[..., :3] * a
    am = mr[..., 3:4] / 255
    out = out * (1 - am) + out * (mr[..., :3] / 255) * am
    aa = ar[..., 3:4] / 255
    out = np.clip(out + ar[..., :3] * aa, 0, 255)
    pin = cv2.resize(pin_rgba.astype(np.float64), (pin_box["w"], pin_box["h"]), interpolation=cv2.INTER_AREA)
    x, y = pin_box["x"], pin_box["y"]
    pa = pin[..., 3:4] / 255
    out[y:y + pin_box["h"], x:x + pin_box["w"]] = out[y:y + pin_box["h"], x:x + pin_box["w"]] * (1 - pa) + pin[..., :3] * pa
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gen", required=True, help="dir with machine-<mood>.png, platter.png, tonearm.png")
    ap.add_argument("--src", required=True, help="dir with the untouched room arts")
    ap.add_argument("--out", required=True, help="dir receiving <mood>.png plates and parts/")
    ap.add_argument("--review", required=True, help="dir receiving review strips")
    ap.add_argument("--platter", help="override: top-down record PNG whose label print is used (default <gen>/platter.png)")
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

    print_path = args.platter or os.path.join(args.gen, "platter.png")
    # what is NOT the record inside the rim: the painted arm (+ its contact
    # shadow) and the pin — both excluded from the symmetric part and inpainted
    # out of the static light
    excl_room = cv2.dilate(poly_mask(rooms[DONOR_MOOD].shape[:2], PAINTED_ARM), np.ones((2 * ARM_LIGHT_MARGIN + 1,) * 2, np.float64))
    excl_room = np.maximum(excl_room, poly_mask(rooms[DONOR_MOOD].shape[:2], PIN_POLY))

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
    print(f"donor offset {ddx:+d},{ddy:+d} (ring {dscore:.1f}) | arm offset {adx / UP:+.1f},{ady / UP:+.1f} (fit {ascore:.1f})")

    manifest = {"pivot": {"x": ARM_PIVOT[0], "y": ARM_PIVOT[1]}, "arm": {"src": "/rooms/study/parts/tonearm.png", "box": box},
                "spindle": {"src": {}, "box": None}, "platterArt": {}, "platterLight": {}, "armTint": {}, "donor": DONOR_MOOD}
    painted1 = poly_mask((ch, cw), PAINTED_ARM, offset=(cx0, cy0))
    for mood in MOODS:
        room = rooms[mood]
        crop = room[cy0:cy1, cx0:cx1]
        donor_m = affine_match(donor1, crop, ring)
        patched = crop * (1 - soft[..., None]) + donor_m * soft[..., None]
        plate = room.copy()
        plate[cy0:cy1, cx0:cx1] = patched
        Image.fromarray(np.clip(plate, 0, 255).astype(np.uint8)).save(os.path.join(args.out, f"{mood}.png"))
        # the record of this mood, split by symmetry: albedo turns, light stays
        platter_rgba, light_add, light_mul, label_r = decompose_platter(room, Hm, excl_room, print_path)
        Image.fromarray(platter_rgba, "RGBA").save(os.path.join(args.out, "parts", f"platter-{mood}.png"))
        Image.fromarray(light_add, "RGBA").save(os.path.join(args.out, "parts", f"platter-light-add-{mood}.png"))
        Image.fromarray(light_mul, "RGBA").save(os.path.join(args.out, "parts", f"platter-light-mul-{mood}.png"))
        manifest["platterArt"][mood] = f"/rooms/study/parts/platter-{mood}.png"
        manifest["platterLight"][mood] = {"add": f"/rooms/study/parts/platter-light-add-{mood}.png", "mul": f"/rooms/study/parts/platter-light-mul-{mood}.png"}
        # the pin: a still, so the painting's own pixels
        pin_rgba, pin_box = cut_pin(room)
        Image.fromarray(pin_rgba, "RGBA").save(os.path.join(args.out, "parts", f"spindle-{mood}.png"))
        manifest["spindle"]["src"][mood] = f"/rooms/study/parts/spindle-{mood}.png"
        manifest["spindle"]["box"] = pin_box
        # engine tint for the flat arm: painted arm mean / albedo mean, per channel
        w = (alpha1 * painted1)
        painted_mean = np.array([np.average(crop[..., c], weights=w) for c in range(3)])
        gold_crop = rooms["golden"][cy0:cy1, cx0:cx1]
        golden_mean = np.array([np.average(gold_crop[..., c], weights=w) for c in range(3)])
        t = np.clip(painted_mean / np.maximum(golden_mean, 1), 0, 1.0)
        manifest["armTint"][mood] = "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in t)
        # gate
        seam = np.abs(patched - crop).max(axis=2)[ring > 0.5]
        outside = np.abs(plate - room).max(axis=2)
        outside[cy0:cy1, cx0:cx1][soft > 0.002] = 0
        # rest recomposition: albedo x light + pin over the plate must give the painting back
        rest = compose_rest(plate, Hm, platter_rgba, light_add, light_mul, pin_rgba, pin_box)
        turned = compose_rest(plate, Hm, platter_rgba, light_add, light_mul, pin_rgba, pin_box, spin_deg=40)
        rho_full = rho_map(room.shape[:2], Hinv)
        judge = (rho_full < 0.97) & (excl_room < 0.5)
        rerr = np.abs(rest - room).mean(axis=2)[judge]
        print(f"{mood:9s} seam ring mean {seam.mean():.2f} p95 {np.percentile(seam, 95):.0f} | outside patch max {outside.max():.0f} | "
              f"rest vs painting mean {rerr.mean():.2f} p95 {np.percentile(rerr, 95):.1f} | label r {label_r:.3f} | armTint {manifest['armTint'][mood]}")
        # review: original | rest recomposed | turned 40deg | albedo | light add x3 | light mul | arm on checker
        w3, h3 = cw * UP, ch * UP
        strip = Image.new("RGB", (w3 * 4 + h3 * 3 + 60, h3), (18, 18, 18))
        add3 = light_add.copy()
        add3[..., :3] = np.clip(add3[..., :3].astype(np.float64) * 3, 0, 255).astype(np.uint8)
        tiles = [
            Image.fromarray(crop.astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.fromarray(np.clip(rest[cy0:cy1, cx0:cx1], 0, 255).astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.fromarray(np.clip(turned[cy0:cy1, cx0:cx1], 0, 255).astype(np.uint8)).resize((w3, h3), Image.LANCZOS),
            Image.alpha_composite(checker((h3, h3)).convert("RGBA"), Image.fromarray(platter_rgba, "RGBA").resize((h3, h3), Image.LANCZOS)).convert("RGB"),
            Image.alpha_composite(checker((h3, h3)).convert("RGBA"), Image.fromarray(add3, "RGBA").resize((h3, h3), Image.LANCZOS)).convert("RGB"),
            Image.alpha_composite(checker((h3, h3)).convert("RGBA"), Image.fromarray(light_mul, "RGBA").resize((h3, h3), Image.LANCZOS)).convert("RGB"),
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
