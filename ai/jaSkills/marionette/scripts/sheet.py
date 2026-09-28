"""Turn a folder of captured frames into a contact sheet and a GIF, for looking at a transition.

    python sheet.py <frames dir> [--cols 7] [--width 320] [--gif] [--ms 110]

Writes <dir>.jpg (the sheet, frames in order, left to right) and with --gif <dir>.gif (the burst at
roughly real speed, holding the last frame). Also prints a brightness trace of every frame: a
see-through moment during a pose change shows up as a dip there even when the eye misses it.
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frames", type=Path)
    ap.add_argument("--cols", type=int, default=7)
    ap.add_argument("--width", type=int, default=320)
    ap.add_argument("--gif", action="store_true")
    ap.add_argument("--ms", type=int, default=110, help="GIF frame duration")
    args = ap.parse_args()
    files = sorted(args.frames.glob("*.png"))
    if not files:
        raise SystemExit(f"no PNG frames in {args.frames}")
    ims = [Image.open(f).convert("RGB") for f in files]
    w, h = ims[0].size
    tw, th = args.width, round(h * args.width / w)
    rows = (len(ims) + args.cols - 1) // args.cols
    sheet = Image.new("RGB", (tw * min(args.cols, len(ims)), th * rows), (20, 20, 28))
    for k, im in enumerate(ims):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), ((k % args.cols) * tw, (k // args.cols) * th))
    out = args.frames.with_suffix(".jpg")
    sheet.save(out, quality=88)
    lum = [float(np.asarray(im.convert("L")).mean()) for im in ims]
    print(f"{out}  ({len(ims)} frames)")
    print("brightness:", " ".join(f"{v:.1f}" for v in lum))
    dip = min(lum) - min(lum[0], lum[-1])
    if dip < -3:
        print(f"  a dip of {-dip:.1f} below both ends: something went see-through mid-change")
    if args.gif:
        g = args.frames.with_suffix(".gif")
        ims[0].save(g, save_all=True, append_images=ims[1:] + [ims[-1]] * 6, duration=[500] + [args.ms] * (len(ims) + 5), loop=0)
        print(g)


if __name__ == "__main__":
    main()
