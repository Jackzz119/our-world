"""Stage 4 — morph: flow fields that let the runtime compute in-between frames for a pose change.

For every pair of morphable poses, the dense flow in both directions, smoothed and sampled at the
mesh vertices. At runtime the outgoing pose bends along a->b while the incoming one relaxes out of
b->a, and the pictures swap in the middle: frame interpolation computed from two frames, instead of
a dissolve whose silhouettes disagree (a strand of the old hair left showing, an arm popping).

A pair ships only when BOTH directions pass two checks, because the runtime needs both:
  err  mean colour error of a warped onto b (0..1)
  sil  share of b's silhouette the warped a misses; this is what catches a hand that leaves its
       place (the flow cannot follow it and drags whatever was there instead)
Pairs that fail keep the runtime's cover-and-fade.

Review: review/morph-<a>-<b>.jpg for every pair, accepted or not: the transition simulated offline
at t = 0, .25, .5, .75, 1 with the runtime's timing. Look at t = .5 for smeared props and ghost limbs.
"""

import itertools

import cv2
import numpy as np
from PIL import Image

from common import caption, ease_in_out, flow, grid_sample, label, load_rgba, on_backdrop, pack_flow, remap, save_rgb, shrink, smoothstep, tile


def simulate(a, b, fab, fba, t):
    """One frame of the runtime morph at progress t (see references/runtime.md)."""
    e = ease_in_out(t)
    # a mesh vertex at p shows a's pixel p at p + e*fab(p); inverting with the field at the target is
    # close enough for fields this smooth
    fa = remap(a, -e * fab)
    fb = remap(b, -(1 - e) * fba)
    from_alpha = 1 - float(smoothstep(0.8, 1, t))
    to_alpha = float(smoothstep(0.25, 0.75, t))
    out = on_backdrop(np.zeros_like(a))
    for img, k in ((fa, from_alpha), (fb, to_alpha)):
        al = img[..., 3:4] / 255 * k
        out = out * (1 - al) + img[..., :3] * al
    return out


def run(ctx, args):
    rec = ctx.record("assemble")
    if not rec or not ctx.final.exists():
        raise SystemExit("run assemble and align first")
    th = ctx.th
    sigma = ctx.grid * 0.6
    poses = [p for p, c in ctx.cfg["poses"].items() if c["morph"] and (ctx.final / f"{p}-open.png").exists()]
    imgs = {p: load_rgba(ctx.final / f"{p}-open.png") for p in poses}
    for old in ctx.final.glob("morph-*.png"):
        old.unlink()

    pairs = {}
    for a, b in itertools.combinations(poses, 2):
        fab = cv2.GaussianBlur(flow(imgs[a], imgs[b]), (0, 0), sigma)
        fba = cv2.GaussianBlur(flow(imgs[b], imgs[a]), (0, 0), sigma)
        dirs = {}
        for src, dst, back in ((a, b, fba), (b, a, fab)):
            # to show src in dst's geometry, sample src along dst -> src
            warped = remap(imgs[src], back)
            err = float(np.abs(warped[..., :3] / 255 - imgs[dst][..., :3] / 255).mean())
            solid = imgs[dst][..., 3] > 128
            sil = float(((warped[..., 3] > 128) ^ solid).sum() / max(solid.sum(), 1))
            dirs[f"{src}-{dst}"] = {"err": round(err, 4), "sil": round(sil, 4)}
        ok = all(d["err"] <= th["morph_err"] and d["sil"] <= th["morph_sil"] for d in dirs.values())
        h, w = imgs[a].shape[:2]
        max_shift = float(np.abs(fab).max())
        if ok:
            for name, f in ((f"{a}-{b}", fab), (f"{b}-{a}", fba)):
                Image.fromarray(pack_flow(grid_sample(f, h, w, ctx.grid)), "RGB").save(ctx.final / f"morph-{name}.png", optimize=True)
        pairs[f"{a}-{b}"] = {"accepted": ok, "max_shift_px": round(max_shift, 1), **dirs}
        worst = max(dirs.values(), key=lambda d: d["sil"])
        print(f"  {a:>10} <-> {b:<10} err {worst['err']:.3f}  silhouette miss {worst['sil']:.3f}  max shift {max_shift:4.0f}px  {'morph' if ok else 'cover-and-fade'}")

        frames = [label(shrink(simulate(imgs[a], imgs[b], fab, fba, t), 320), f"t={t:g}") for t in (0, 0.25, 0.5, 0.75, 1)]
        verdict = "ACCEPTED" if ok else "REJECTED (cover-and-fade)"
        save_rgb(caption(tile(frames, 5), f"{a} -> {b}  {verdict}"), ctx.review / f"morph-{a}-{b}.jpg", quality=85)

    ctx.write_record("morph", pairs)
    return "pass"
