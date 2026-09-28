"""Stage 4 — morph: fields that let the runtime compute in-between frames for a pose change.

For every pair of morphable poses, the dense flow in both directions, smoothed and sampled at the
mesh vertices. At runtime the outgoing pose bends along a->b while the incoming one relaxes out of
b->a, and the pictures swap in the middle: frame interpolation computed from two frames, instead of
a dissolve whose silhouettes disagree (a strand of the old hair left showing, an arm popping).

A flow pair ships only when BOTH directions pass two checks, because the runtime needs both:
  err  mean colour error of a warped onto b (0..1)
  sil  share of b's silhouette the warped a misses; this is what catches a hand that leaves its
       place (the flow cannot follow it and drags whatever was there instead)

Guided pairs, for moves too large for a flow (the head going down onto the arms, the hands leaving
the book for the cup): when a pair fails the flow checks or involves a pose with "morph": false, and
both poses mark the same named region, the field is built from that correspondence instead: each
region's box in one pose is mapped onto its box in the other (scale + translation), feathered out
so the rest of the figure stays put. The head needs no configuration (it comes from the face box);
other regions are boxes in rig.json ("regions": {"hands": {"reading": [...], "sip": [...]}}).
Nothing measures whether a guided pair looks right, so its review sheet MUST be looked at; a pair
with no shared region keeps the runtime's cover-and-fade.

Review: review/morph-<a>-<b>.jpg for every pair: the transition simulated offline at t = 0, .25,
.5, .75, 1 with the runtime's timing. Look at t = .5 for smeared props, ghost limbs and a head that
floats where nothing covers it.
"""

import itertools

import cv2
import numpy as np
from PIL import Image

from common import (
    caption,
    ease_in_out,
    face_box,
    flow,
    grid_sample,
    label,
    load_rgba,
    on_backdrop,
    pack_flow,
    remap,
    save_rgb,
    shrink,
    smoothstep,
    tile,
)


def simulate(a, b, fab, fba, t, slow=False):
    """One frame of the runtime morph at progress t (see references/runtime.md, rig-core morphSwap)."""
    e = ease_in_out(t)
    # a mesh vertex at p shows a's pixel p at p + e*fab(p); inverting with the field at the target is
    # close enough for fields this smooth
    fa = remap(a, -e * fab)
    fb = remap(b, -(1 - e) * fba)
    swap_in, swap_out = (0.35, 0.65) if slow else (0.25, 0.75)
    from_alpha = 1 - float(smoothstep(swap_out + 0.05, 1, t))
    to_alpha = float(smoothstep(swap_in, swap_out, t))
    out = on_backdrop(np.zeros_like(a))
    for img, k in ((fa, from_alpha), (fb, to_alpha)):
        al = img[..., 3:4] / 255 * k
        out = out * (1 - al) + img[..., :3] * al
    return out


def region_boxes(ctx, pose, img):
    """Named regions of a pose, assembled-canvas boxes: the head from the face box, the rest from rig.json."""
    fx, fy, fw, fh = face_box(ctx, pose, img)
    # the head with its hair: the face box grown to the crown and the sides of the hair
    boxes = {"head": [fx - fw * 0.55, fy - fh * 0.7, fx + fw * 1.55, fy + fh * 1.05]}
    for name, per_pose in ctx.cfg.get("regions", {}).items():
        if pose in per_pose:
            boxes[name] = ctx.to_build(per_pose[pose])
    return boxes


def soft_box(shape, box):
    """1 inside the box, fading to 0 over a margin of a third of its smaller side."""
    h, w = shape
    x0, y0, x1, y1 = box
    feather = max(8.0, min(x1 - x0, y1 - y0) / 3)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = np.maximum(np.maximum(x0 - xx, xx - x1), 0)
    dy = np.maximum(np.maximum(y0 - yy, yy - y1), 0)
    return (1 - smoothstep(0, feather, np.hypot(dx, dy))).astype(np.float32)


def guided_field(shape, src_boxes, dst_boxes):
    """Displacement mapping each shared region's box in the source onto its box in the destination."""
    total = np.zeros(shape + (2,), np.float32)
    weight = np.zeros(shape, np.float32)
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.float32)
    for name in src_boxes.keys() & dst_boxes.keys():
        a, b = src_boxes[name], dst_boxes[name]
        s = (b[2] - b[0]) / (a[2] - a[0])
        ca = ((a[0] + a[2]) / 2, (a[1] + a[3]) / 2)
        cb = ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)
        m = soft_box(shape, a)
        total[..., 0] += (cb[0] + s * (xx - ca[0]) - xx) * m
        total[..., 1] += (cb[1] + s * (yy - ca[1]) - yy) * m
        weight += m
    # where regions overlap, average them instead of adding their moves
    return total / np.maximum(weight, 1)[..., None], sorted(src_boxes.keys() & dst_boxes.keys())


def run(ctx, args):
    rec = ctx.record("assemble")
    if not rec or not ctx.final.exists():
        raise SystemExit("run assemble and align first")
    th = ctx.th
    sigma = ctx.grid * 0.6
    present = [p for p in ctx.cfg["poses"] if (ctx.final / f"{p}-open.png").exists()]
    imgs = {p: load_rgba(ctx.final / f"{p}-open.png") for p in present}
    h, w = next(iter(imgs.values())).shape[:2]
    flow_poses = [p for p in present if ctx.cfg["poses"][p]["morph"]]
    for old in ctx.final.glob("morph-*.png"):
        old.unlink()

    def write(name, f):
        Image.fromarray(pack_flow(grid_sample(f, h, w, ctx.grid)), "RGB").save(ctx.final / f"morph-{name}.png", optimize=True)

    def review(a, b, fab, fba, verdict, guided=False):
        # slow poses and guided pairs swap in the narrow window (rig-core morphSwap)
        slow = ctx.cfg["poses"][a]["slow"] or ctx.cfg["poses"][b]["slow"] or guided
        frames = [label(shrink(simulate(imgs[a], imgs[b], fab, fba, t, slow), 320), f"t={t:g}") for t in (0, 0.25, 0.4, 0.5, 0.6, 0.75, 1)]
        save_rgb(caption(tile(frames, 7), f"{a} -> {b}  {verdict}"), ctx.review / f"morph-{a}-{b}.jpg", quality=85)

    pairs = {}
    regions = {p: region_boxes(ctx, p, imgs[p]) for p in present}
    for a, b in itertools.combinations(present, 2):
        entry = {"kind": "none"}
        if a in flow_poses and b in flow_poses:
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
            entry.update(dirs)
            if all(d["err"] <= th["morph_err"] and d["sil"] <= th["morph_sil"] for d in dirs.values()):
                entry["kind"] = "flow"
        if entry["kind"] == "none":
            fab, shared = guided_field((h, w), regions[a], regions[b])
            fba, _ = guided_field((h, w), regions[b], regions[a])
            # the head region of every pose exists, but a guide only makes sense where it was asked for:
            # a pose with "morph": false, or a region configured for this pair
            configured = [r for r in shared if r != "head"]
            wanted = not (a in flow_poses and b in flow_poses) or configured
            if shared and wanted:
                entry.update(kind="guided", regions=shared)
        if entry["kind"] != "none":
            write(f"{a}-{b}", fab)
            write(f"{b}-{a}", fba)
            entry["max_shift_px"] = round(float(np.abs(fab).max()), 1)
        pairs[f"{a}-{b}"] = entry
        worst = max((v for k, v in entry.items() if isinstance(v, dict)), key=lambda d: d["sil"], default=None)
        measured = f"err {worst['err']:.3f}  silhouette miss {worst['sil']:.3f}" if worst else "no flow tried"
        verdict = {"flow": "morph", "guided": f"guided ({', '.join(entry.get('regions', []))}): LOOK AT IT", "none": "cover-and-fade"}[entry["kind"]]
        print(f"  {a:>10} <-> {b:<10} {measured}  {verdict}")
        if entry["kind"] == "none":
            review(a, b, np.zeros((h, w, 2), np.float32), np.zeros((h, w, 2), np.float32), "cover-and-fade (no field)")
        else:
            review(a, b, fab, fba, verdict.upper(), entry["kind"] == "guided")

    ctx.write_record("morph", pairs)
    return "pass"
