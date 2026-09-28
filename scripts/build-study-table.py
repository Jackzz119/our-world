"""Assemble the across-the-table study from generated layers (ai/features/study-room/study-room.md).

Rules of the pipeline (user directions): parts are produced by generation with
their own alpha — this script never cuts or repaints them. It only
  * trims transparent borders (placement boxes keep every part on the plate),
  * converts to WebP for the runtime, and
  * writes a manifest whose numbers the room template copies verbatim.

The partner is not built here: the marionette pipeline (ai/jaSkills/marionette) turns the adopted
pose originals into the runtime rig, and its assemble stage measures where the pose canvas sits on
the master frame (arts/characters/ayu/build/assemble.json, "registration"):

    python ai/jaSkills/marionette/scripts/rig.py all --config arts/characters/ayu/rig.json

--poses only adopts a pose batch: its PNGs, report and prompts are copied to the source folder.

Inputs (codex-visual batch folders):
  --plates  one or more folders: master-night.png, plate-<mood>-<on|off>[-dry].png
  --parts   fg-her-hands.png, prop-ayu-mug.png, prop-ayu-hoodie.png,
            part-tonearm.png, part-lamp-chain.png, part-vinyl.png
  --poses   (optional) ayu-<pose>-open.png / ayu-<pose>-closed.png, ayu-asleep.png, ... to adopt

Outputs:
  public/rooms/study/*.webp              plates, table parts and the room-picker thumbnail
  arts/rooms/study/source/, arts/characters/ayu/source/   adopted originals + reports
  arts/rooms/study/table-manifest.json    measured geometry
  <review>/                               overlays for a visual check (not shipped)

Dependencies: Pillow, numpy (see ai/project-audit/CONVENTIONS.md).

    python scripts/build-study-table.py --plates <dir> --parts <dir> [--poses <dir>] --review <scratch dir>
"""

import argparse
import json
import shutil
from pathlib import Path

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


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plates", type=Path, nargs="+", required=True)
    ap.add_argument("--parts", type=Path, required=True)
    ap.add_argument("--poses", type=Path, help="a pose batch to adopt into the source folder")
    ap.add_argument("--review", type=Path, required=True, help="scratch dir for overlays, never shipped")
    ap.add_argument("--public", type=Path, default=Path("public"))
    ap.add_argument("--arts", type=Path, default=Path("arts"))
    args = ap.parse_args()
    args.review.mkdir(parents=True, exist_ok=True)

    room_out = args.public / "rooms/study"
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
        manifest["plates"][name] = f"/rooms/study/plate-{name}.webp"
        # the room picker's card: the clear night plate, cut to the old 400x250 card (a resize, no repaint)
        if name == "night-on-dry":
            crop_h = round(base_w * 250 / 400)
            top = (base_h - crop_h) // 2
            thumb = img.convert("RGB").crop((0, top, base_w, top + crop_h)).resize((400, 250), Image.LANCZOS)
            thumb.save(room_out / "thumb.webp", "WEBP", quality=85, method=6)
            manifest["thumb"] = "/rooms/study/thumb.webp"

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
        manifest["parts"][key] = {"src": f"/rooms/study/{key}.webp", "box": {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}}
    vinyl = args.parts / "part-vinyl.png"
    if vinyl.exists():
        img = Image.open(vinyl).convert("RGBA")
        manifest["alpha"].append(check_alpha(Image.open(vinyl), vinyl.name))
        save_webp(img, room_out / "vinyl.webp", alpha=True)
        shutil.copy2(vinyl, room_src / vinyl.name)
        manifest["parts"]["vinyl"] = {"src": "/rooms/study/vinyl.webp", "size": img.size[0]}

    # poses: adopted as delivered; marionette builds the rig from the source folder
    if args.poses:
        ayu_src.mkdir(parents=True, exist_ok=True)
        for src in sorted(args.poses.glob("ayu-*.png")):
            shutil.copy2(src, ayu_src / src.name)

    # each batch's report and the prompts it actually ran, kept next to the adopted originals
    batches = [(d, room_src, "plates" + (f"-{i + 1}" if i else "")) for i, d in enumerate(args.plates)]
    batches += [(args.parts, room_src, "parts")] + ([(args.poses, ayu_src, "")] if args.poses else [])
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
