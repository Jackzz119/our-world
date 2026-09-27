"""Assemble the across-the-table study from generated layers (ai/features/study-room/study-room.md).

Rules of the pipeline (user directions): parts are produced by generation with
their own alpha — this script never cuts or repaints them. It only
  * trims transparent borders (placement boxes keep every part on the plate),
  * converts to WebP for the runtime,
  * registers the partner's pose canvas onto the master frame (SIFT features,
    uniform scale + translation), and
  * writes a manifest whose numbers the room template copies verbatim.

Inputs (codex-visual batch folders):
  --plates  one or more folders: master-night.png, plate-<mood>-<on|off>[-dry].png
  --parts   fg-her-hands.png, prop-ayu-mug.png, prop-ayu-hoodie.png,
            part-tonearm.png, part-lamp-chain.png, part-vinyl.png
  --poses   ayu-<pose>-open.png / ayu-<pose>-closed.png, ayu-asleep.png, ...

Outputs:
  public/rooms/study/table/*.webp        plates and table parts
  public/characters/ayu/*.webp            pose sprites, one shared (trimmed) canvas
  arts/rooms/study/source/, arts/characters/ayu/source/   adopted originals + reports
  arts/rooms/study/table-manifest.json    measured geometry
  <review>/                               overlays for a visual check (not shipped)

Dependencies: Pillow, numpy, opencv-python (see ai/project-audit/CONVENTIONS.md).

    python scripts/build-study-table.py --plates <dir> --parts <dir> --poses <dir> --review <scratch dir>
"""

import argparse
import json
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

PLATES = ["night-on-dry", "night-off-dry", "night-on", "night-off", "twilight-on", "twilight-off", "golden-on", "golden-off"]
PLATE_PARTS = {
    "fg-her-hands.png": "fg-xiaoman",
    "prop-ayu-mug.png": "mug-ayu",
    "prop-ayu-hoodie.png": "jacket-ayu",
    "part-tonearm.png": "tonearm",
    "part-lamp-chain.png": "lamp-chain",
}
POSES = ["reading", "glance", "writing", "sip", "asleep", "patted", "poked"]
# Blink frames whose changes spread well past the eyes (codex report 2026-09-27: sip differs on
# ~9% of the figure at display size). A 140 ms swap would flicker the sleeves, so the pose ships
# eyes-open only until a clean closed frame is generated. They still count toward the union crop,
# so dropping one never moves the shared canvas.
BLINK_REJECTED = {"sip"}
PAD = 2  # px kept around trimmed alpha so filtering never clips an edge
ALPHA_MIN = 8  # alpha below this counts as empty when trimming


def alpha_box(img: Image.Image) -> tuple[int, int, int, int] | None:
    """Bounding box (x0, y0, x1, y1) of pixels with visible alpha, padded."""
    a = np.asarray(img.getchannel("A"))
    ys, xs = np.nonzero(a >= ALPHA_MIN)
    if not len(xs):
        return None
    w, h = img.size
    return (
        int(max(0, xs.min() - PAD)),
        int(max(0, ys.min() - PAD)),
        int(min(w, xs.max() + 1 + PAD)),
        int(min(h, ys.max() + 1 + PAD)),
    )


def save_webp(img: Image.Image, path: Path, alpha: bool):
    path.parent.mkdir(parents=True, exist_ok=True)
    if alpha:
        img.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
    else:
        img.convert("RGB").save(path, "WEBP", quality=88, method=6)


def check_alpha(img: Image.Image, name: str) -> dict:
    """Report whether a part really carries transparency (generated alpha, not a flat background)."""
    a = np.asarray(img.getchannel("A")) if img.mode == "RGBA" else None
    if a is None:
        return {"file": name, "alpha": False}
    return {
        "file": name,
        "alpha": True,
        "transparent_share": round(float((a < ALPHA_MIN).mean()), 3),
        "soft_edge_share": round(float(((a >= ALPHA_MIN) & (a < 250)).mean()), 4),
    }


def register(sprite: Image.Image, master: Image.Image, review: Path) -> dict:
    """Uniform scale + translation mapping pose-canvas px onto master px, from SIFT matches."""
    s_rgb = cv2.cvtColor(np.asarray(sprite.convert("RGB")), cv2.COLOR_RGB2GRAY)
    s_mask = (np.asarray(sprite.getchannel("A")) > 200).astype(np.uint8) * 255
    s_mask = cv2.erode(s_mask, np.ones((9, 9), np.uint8))
    m_rgb = cv2.cvtColor(np.asarray(master.convert("RGB")), cv2.COLOR_RGB2GRAY)
    # contrast-normalise both so the neutral-lit sprite and the lamp-lit master match on form, not light
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    s_rgb, m_rgb = clahe.apply(s_rgb), clahe.apply(m_rgb)
    sift = cv2.SIFT_create(nfeatures=6000)
    ks, ds = sift.detectAndCompute(s_rgb, s_mask)
    km, dm = sift.detectAndCompute(m_rgb, None)
    matches = cv2.BFMatcher(cv2.NORM_L2).knnMatch(ds, dm, k=2)
    good = [m for m, n in matches if m.distance < 0.75 * n.distance]
    src = np.float32([ks[m.queryIdx].pt for m in good])
    dst = np.float32([km[m.trainIdx].pt for m in good])
    affine, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=4.0)
    scale = float(np.hypot(affine[0, 0], affine[1, 0]))
    rotation = float(np.degrees(np.arctan2(affine[1, 0], affine[0, 0])))
    keep = inliers.ravel().astype(bool)
    # translation re-solved for the rotation-free model the runtime uses
    offset = (dst[keep] - scale * src[keep]).mean(axis=0)
    residual = np.linalg.norm(dst[keep] - (scale * src[keep] + offset), axis=1)

    # review: the sprite warped onto the master at 60% over a dimmed master
    warped = cv2.warpAffine(
        np.asarray(sprite), np.float32([[scale, 0, offset[0]], [0, scale, offset[1]]]), master.size,
        flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    base = np.asarray(master.convert("RGB")).astype(np.float32) * 0.55
    a = warped[..., 3:4].astype(np.float32) / 255 * 0.6
    over = base * (1 - a) + warped[..., :3].astype(np.float32) * a
    Image.fromarray(over.clip(0, 255).astype(np.uint8)).save(review / "register-reading.png")
    return {
        "matches": len(good),
        "inliers": int(keep.sum()),
        "scale": round(scale, 5),
        "rotation_deg": round(rotation, 3),
        "offset": [round(float(offset[0]), 2), round(float(offset[1]), 2)],
        "residual_px_median": round(float(np.median(residual)), 2),
        "residual_px_p90": round(float(np.percentile(residual, 90)), 2),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plates", type=Path, nargs="+", required=True)
    ap.add_argument("--parts", type=Path, required=True)
    ap.add_argument("--poses", type=Path, required=True)
    ap.add_argument("--review", type=Path, required=True, help="scratch dir for overlays, never shipped")
    ap.add_argument("--public", type=Path, default=Path("public"))
    ap.add_argument("--arts", type=Path, default=Path("arts"))
    args = ap.parse_args()
    args.review.mkdir(parents=True, exist_ok=True)

    room_out = args.public / "rooms/study/table"
    ayu_out = args.public / "characters/ayu"
    room_src = args.arts / "rooms/study/source"
    ayu_src = args.arts / "characters/ayu/source"
    manifest: dict = {"plates": {}, "parts": {}, "alpha": []}

    def find_plate(name: str) -> Path | None:
        return next((d / name for d in args.plates if (d / name).exists()), None)

    master_path = find_plate("master-night.png")
    if master_path is None:
        raise SystemExit("master-night.png not found in --plates")
    master = Image.open(master_path).convert("RGBA")
    base_w, base_h = master.size
    manifest["base"] = {"w": base_w, "h": base_h}
    room_src.mkdir(parents=True, exist_ok=True)
    shutil.copy2(master_path, room_src / "master-night.png")

    for name in PLATES:
        src = find_plate(f"plate-{name}.png")
        if src is None:
            continue
        img = Image.open(src)
        if img.size != (base_w, base_h):
            raise SystemExit(f"{src.name} is {img.size}, expected {(base_w, base_h)}")
        save_webp(img, room_out / f"plate-{name}.webp", alpha=False)
        shutil.copy2(src, room_src / src.name)
        manifest["plates"][name] = f"/rooms/study/table/plate-{name}.webp"

    for file, key in PLATE_PARTS.items():
        src = args.parts / file
        if not src.exists():
            continue
        img = Image.open(src).convert("RGBA")
        if img.size != (base_w, base_h):
            raise SystemExit(f"{file} is {img.size}, expected {(base_w, base_h)}")
        manifest["alpha"].append(check_alpha(Image.open(src), file))
        box = alpha_box(img)
        if box is None:
            raise SystemExit(f"{file} is fully transparent")
        save_webp(img.crop(box), room_out / f"{key}.webp", alpha=True)
        shutil.copy2(src, room_src / file)
        x0, y0, x1, y1 = box
        manifest["parts"][key] = {"src": f"/rooms/study/table/{key}.webp", "box": {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}}
    vinyl = args.parts / "part-vinyl.png"
    if vinyl.exists():
        img = Image.open(vinyl).convert("RGBA")
        manifest["alpha"].append(check_alpha(Image.open(vinyl), vinyl.name))
        save_webp(img, room_out / "vinyl.webp", alpha=True)
        shutil.copy2(vinyl, room_src / vinyl.name)
        manifest["parts"]["vinyl"] = {"src": "/rooms/study/table/vinyl.webp", "size": img.size[0]}

    # poses: one union crop so every pose keeps the shared canvas alignment
    files = {}
    for pose in POSES:
        for eye in ("open", "closed", None):
            name = f"ayu-{pose}-{eye}.png" if eye else f"ayu-{pose}.png"
            if (args.poses / name).exists():
                files[(pose, eye or "open")] = args.poses / name
    if files:
        imgs = {k: Image.open(v).convert("RGBA") for k, v in files.items()}
        sizes = {im.size for im in imgs.values()}
        if len(sizes) != 1:
            raise SystemExit(f"pose canvases differ: {sizes}")
        boxes = [alpha_box(im) for im in imgs.values()]
        ux0 = min(b[0] for b in boxes); uy0 = min(b[1] for b in boxes)
        ux1 = max(b[2] for b in boxes); uy1 = max(b[3] for b in boxes)
        ayu_src.mkdir(parents=True, exist_ok=True)
        poses: dict = {}
        for (pose, eye), im in imgs.items():
            if eye == "closed" and pose in BLINK_REJECTED:
                continue
            manifest["alpha"].append(check_alpha(Image.open(files[(pose, eye)]), files[(pose, eye)].name))
            out = ayu_out / f"{pose}-{eye}.webp"
            save_webp(im.crop((ux0, uy0, ux1, uy1)), out, alpha=True)
            shutil.copy2(files[(pose, eye)], ayu_src / files[(pose, eye)].name)
            poses.setdefault(pose, {})[eye] = f"/characters/ayu/{pose}-{eye}.webp"
        reg = register(imgs[("reading", "open")], master, args.review)
        # the crop moves the canvas origin; fold it into the seat offset
        origin = [reg["offset"][0] + ux0 * reg["scale"], reg["offset"][1] + uy0 * reg["scale"]]
        manifest["partner"] = {
            "canvas": {"w": ux1 - ux0, "h": uy1 - uy0},
            "crop": [ux0, uy0],
            "poses": poses,
            "blink_rejected": sorted(BLINK_REJECTED),
            "registration": reg,
            "seat_origin": [round(origin[0], 2), round(origin[1], 2)],
            "seat_scale": reg["scale"],
            "reading_box_in_canvas": list(alpha_box(imgs[("reading", "open")].crop((ux0, uy0, ux1, uy1)))),
        }

    # each batch's report and the prompts it actually ran, kept next to the adopted originals
    batches = [(d, room_src, "plates" + (f"-{i + 1}" if i else "")) for i, d in enumerate(args.plates)]
    batches += [(args.parts, room_src, "parts"), (args.poses, ayu_src, "")]
    for batch, dest_dir, tag in batches:
        suffix = f"-{tag}" if tag else ""
        for name, ext in (("codex-report", ".md"), ("generation-prompts", ".json")):
            src = batch / f"{name}{ext}"
            if src.exists():
                dest_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest_dir / f"{name}{suffix}{ext}")

    out = args.arts / "rooms/study/table-manifest.json"
    # bytes, not write_text: on Windows write_text turns every \n into \r\n (the repo is LF)
    out.write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
