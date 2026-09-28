"""Motion weights for the partner's idle mesh (ai/features/study-room/study-room.md).

Wallpaper Engine animates flat character art by painting masks that say how
much each area moves (its Shake and Puppet Warp tools); this derives the same
kind of mask from each pose's own pixels, so no art is cut, repainted or
regenerated. Per pose it writes a small RGB PNG at the runtime mesh's grid size:

  R  breath  0 = anchored (hands, book, anything on the table), 1 = rides the
             chest (shoulders, neck, head)
  G  hair    0 = roots and face, 1 = the loosest tips

Classification (thresholds on the pose art):
  face  the largest warm skin blob in the upper canvas
  hair  dark pixels around the face, above the chin, outside the face oval
  hands skin below the chin; book = bright low-saturation pixels below the chin

    python scripts/build-idle-weights.py [--review <dir>]
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

POSES = ["reading", "glance", "writing", "sip", "asleep", "patted", "poked"]
SRC = Path("public/characters/ayu")
GRID = 24  # pose-canvas px between mesh vertices; the runtime reads the grid size from the PNG
TABLE_Y = 960  # pose-canvas y of the torso cut (the table's far edge)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def weights(rgba: np.ndarray):
    h, w = rgba.shape[:2]
    rgb = rgba[..., :3].astype(np.float32) / 255
    a = rgba[..., 3].astype(np.float32) / 255
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    solid = a > 0.5
    skin = solid & (r > g) & (g > b) & (r > 0.55) & (lum > 0.42) & (sat > 0.12) & (sat < 0.55)

    # face: the largest skin blob in the upper 70% of the canvas
    upper = skin.copy()
    upper[int(h * 0.7):] = False
    n, labels, stats, _ = cv2.connectedComponentsWithStats(upper.astype(np.uint8), 8)
    if n < 2:
        raise SystemExit("no face found")
    k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    fx, fy, fw, fh = stats[k, :4]
    cx, cy = fx + fw / 2, fy + fh / 2
    chin = fy + fh
    radius = max(fw, fh) / 2

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dist = np.hypot((xx - cx) / (fw / 2), (yy - cy) / (fh / 2))  # 1 = the face oval

    # hair: dark pixels in a band around the face (wider above the forehead, where the hair spreads), no
    # lower than just under the chin, outside the face oval, and connected to the hair above the forehead.
    # The hoodie is as dark as the hair, so position, not colour, keeps the shoulders out.
    eyes = fy + fh * 0.45
    pad = np.where(yy < fy, fw * 0.6, np.where(yy < eyes, fw * 0.38, fw * 0.22))
    in_band = (xx > fx - pad) & (xx < fx + fw + pad) & (yy < chin)
    cand = solid & (lum < 0.3) & in_band & (dist > 1.02)
    cand = cv2.morphologyEx(cand.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(cand, 8)
    crown = [i for i in range(1, n2) if st2[i, cv2.CC_STAT_TOP] < fy + fh * 0.15]
    hair = np.isin(lab2, crown)
    # tips move, roots stay: grows with distance from the face centre
    tip = smoothstep(1.0, 2.6, np.hypot((xx - cx) / radius, (yy - cy) / radius))
    hair_w = np.where(hair, 0.25 + 0.75 * tip, 0).astype(np.float32)

    # breath: 0 at the table, 1 from the shoulders up; hands and book below the chin stay nearly still
    shoulder = chin + fh * 0.35
    breath = smoothstep(TABLE_Y, shoulder, yy).astype(np.float32)
    below_chin = yy > chin
    hands = skin & below_chin
    book = solid & below_chin & (lum > 0.62) & (sat < 0.18)
    held = cv2.dilate((hands | book).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32)

    # smooth so neighbouring vertices never pull apart; the mesh interpolates between them anyway.
    # The hold is applied after the blur, so the chest's motion cannot bleed onto the book
    breath = cv2.GaussianBlur(breath, (0, 0), GRID * 1.2)
    held = np.clip(cv2.GaussianBlur(held, (0, 0), GRID * 0.5) * 1.6, 0, 1)
    breath = breath * (1 - 0.92 * held)
    hair_w = cv2.GaussianBlur(hair_w, (0, 0), GRID * 0.8)
    hair_w = hair_w / max(hair_w.max(), 1e-6)
    return breath, hair_w, (fx, fy, fw, fh)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--review", type=Path, help="write debug overlays here (not shipped)")
    args = ap.parse_args()
    for pose in POSES:
        img = np.asarray(Image.open(SRC / f"{pose}-open.webp").convert("RGBA"))
        h, w = img.shape[:2]
        breath, hair_w, face = weights(img)
        gx, gy = w // GRID + 1, h // GRID + 1
        # sample at the vertex positions the runtime mesh uses (evenly spaced across the canvas)
        xs = np.linspace(0, w - 1, gx).round().astype(int)
        ys = np.linspace(0, h - 1, gy).round().astype(int)
        out = np.zeros((gy, gx, 3), np.uint8)
        out[..., 0] = (breath[np.ix_(ys, xs)] * 255).round()
        out[..., 1] = (hair_w[np.ix_(ys, xs)] * 255).round()
        Image.fromarray(out, "RGB").save(SRC / f"idle-{pose}.png", optimize=True)
        print(f"{pose}: grid {gx}x{gy}, face {face}")
        if args.review:
            args.review.mkdir(parents=True, exist_ok=True)
            base = img[..., :3].astype(np.float32)
            over = base * 0.45
            over[..., 0] += breath * 140
            over[..., 1] += hair_w * 200
            Image.fromarray(np.clip(over, 0, 255).astype(np.uint8)).save(args.review / f"idle-{pose}.png")


if __name__ == "__main__":
    main()
