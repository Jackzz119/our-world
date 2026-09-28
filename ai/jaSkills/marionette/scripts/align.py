"""Stage 3 — align: put every frame that should share geometry back onto that geometry.

Generated frames always drift a little: a blink frame nudges the brows, glasses and hair a pixel or
two (a blink makes the face jump), and a reaction drawn as an edit of the anchor comes back with the
hair a little fuller on one side (switching to it grows a chunk of hair). A dense optical flow says
where every point of the reference went; sampling the drifted frame along it moves everything back.
Only geometry moves, no pixel is repainted.

Two kinds, both opt-in per pose in rig.json:
  blink     "blink": true    the closed frame onto its own open frame; only the eye band may differ
  reaction  "align_to": id   the open frame onto pose `id`; only the `free` region may differ
  cut       "fit_cut": true  the torso cut onto canvas.cut_y, when a generator lands it a few px off:
            only the band just above the cut is stretched vertically (at most fit_cut_max_px),
            the same map on the open and closed frame; further off still fails in check
            "free": "face" (default) / "eyes" / [x0, y0, x1, y1] in source px
            Use it for reactions whose head and body should not move (a laugh, a blush), never for
            ones that move on purpose (a head tilting up into a hand).

Inside the region that may differ the two frames show different things (lids against irises, a laugh
against a smile): the flow there chases the wrong features and bends lines, so it is replaced by the
motion of the surroundings (normalised convolution). The region moves as a whole, never warps.

Reads build/raw/, writes build/final/. Always re-derives from raw, so re-running never aligns an
aligned frame twice.

Review:
  review/blink-<pose>.jpg  the eye band of open / generated closed / aligned closed, enlarged: look for
                           bent lash lines and anything besides the eyelids that still moves
  review/align-<pose>.jpg  silhouette against the target before and after (red = only this pose,
                           blue = only the target): the red and blue slivers outside the face should go
"""

import shutil

import cv2
import numpy as np

from common import (
    caption,
    cut_probe,
    eye_box,
    face_box,
    flow,
    label,
    load_rgba,
    on_backdrop,
    outside_change,
    remap,
    save_rgb,
    save_rgba,
    shrink,
    tile,
)


def region_free(f, box):
    """Replace the flow inside `box` with the motion of its surroundings, feathered in."""
    x0, y0, x1, y1 = [int(v) for v in box]
    keep = np.ones(f.shape[:2], np.float32)
    keep[max(0, y0) : max(0, y1), max(0, x0) : max(0, x1)] = 0
    fill = cv2.GaussianBlur(f * keep[..., None], (0, 0), 40) / np.maximum(cv2.GaussianBlur(keep, (0, 0), 40), 1e-4)[..., None]
    m = np.clip(cv2.GaussianBlur(1 - keep, (0, 0), 8) * 2, 0, 1)[..., None]
    return f * (1 - m) + fill * m


def silhouette_miss(a, b, box):
    """Share of b's solid pixels, outside `box`, where a and b disagree on being solid."""
    sa, sb = a[..., 3] > 128, b[..., 3] > 128
    x0, y0, x1, y1 = [max(0, int(v)) for v in box]
    diff = sa ^ sb
    diff[y0:y1, x0:x1] = False
    return float(diff.sum() / max(sb.sum(), 1))


def free_box(ctx, pose, rgba, spec):
    if isinstance(spec, list):
        return ctx.to_build(spec)
    if spec == "eyes":
        return eye_box(ctx, pose, rgba)
    if spec != "face":
        raise SystemExit(f"poses.{pose}.free must be 'face', 'eyes' or a box")
    fx, fy, fw, fh = face_box(ctx, pose, rgba)
    # the whole face: a laugh opens the jaw and a blush reaches the cheeks
    return [int(fx - fw * 0.1), int(fy + fh * 0.05), int(fx + fw * 1.1), int(fy + fh * 1.08)]


def silhouette_view(target, img, box):
    """Dimmed frame with the silhouette disagreement painted on it; the free region outlined."""
    rgb = on_backdrop(img) * 0.55
    st, si = target[..., 3] > 128, img[..., 3] > 128
    rgb[si & ~st] = (255, 70, 70)
    rgb[st & ~si] = (70, 190, 255)
    out = np.ascontiguousarray(rgb.astype(np.uint8))
    x0, y0, x1, y1 = [int(v) for v in box]
    cv2.rectangle(out, (x0, y0), (x1, y1), (230, 230, 230), 2)
    return out.astype(np.float32)


def run(ctx, args):
    rec = ctx.record("assemble")
    if not rec:
        raise SystemExit("run the assemble stage first")
    if ctx.final.exists():
        shutil.rmtree(ctx.final)
    ctx.final.mkdir(parents=True)
    poses_cfg = ctx.cfg["poses"]
    status = "pass"
    result = {"reactions": {}, "blinks": {}}
    for pose in rec["poses"]:
        shutil.copy2(ctx.raw / f"{pose}-open.png", ctx.final / f"{pose}-open.png")

    # 1. reactions onto their target's geometry
    react_flow = {}
    for pose in rec["poses"]:
        target = poses_cfg[pose].get("align_to")
        if not target:
            continue
        if target not in rec["poses"] or poses_cfg[target].get("align_to"):
            raise SystemExit(f"poses.{pose}.align_to: '{target}' must be a pose that is not aligned itself")
        t_img, img = load_rgba(ctx.raw / f"{target}-open.png"), load_rgba(ctx.raw / f"{pose}-open.png")
        box = free_box(ctx, pose, img, poses_cfg[pose].get("free", "face"))
        f = region_free(cv2.GaussianBlur(flow(t_img, img), (0, 0), 3), box)
        aligned = remap(img, f)
        react_flow[pose] = f
        save_rgba(aligned, ctx.final / f"{pose}-open.png")
        m = {
            "target": target,
            "free": box,
            "silhouette_before": round(silhouette_miss(img, t_img, box), 4),
            "silhouette_after": round(silhouette_miss(aligned, t_img, box), 4),
            "change_before": round(outside_change(t_img, img, box), 4),
            "change_after": round(outside_change(t_img, aligned, box), 4),
        }
        result["reactions"][pose] = m
        print(
            f"  {pose} onto {target}: silhouette off by {m['silhouette_before'] * 100:.2f}% -> {m['silhouette_after'] * 100:.2f}%,"
            f" colour change outside the {poses_cfg[pose].get('free', 'face')} {m['change_before'] * 100:.1f}% -> {m['change_after'] * 100:.1f}%"
        )
        views = [
            label(shrink(silhouette_view(t_img, img, box), 640), "generated"),
            label(shrink(silhouette_view(t_img, aligned, box), 640), f"aligned onto {target}"),
        ]
        save_rgb(caption(tile(views, 2), f"{pose}: red = only {pose}, blue = only {target}"), ctx.review / f"align-{pose}.jpg", quality=88)

    # 2. blink frames onto their open frame (then along the reaction's correction, if any)
    for pose, eyes in rec["poses"].items():
        if "closed" not in eyes:
            continue
        o, c = load_rgba(ctx.raw / f"{pose}-open.png"), load_rgba(ctx.raw / f"{pose}-closed.png")
        box = eye_box(ctx, pose, o)
        before = outside_change(o, c, box)
        # smoothed so the warp is a gentle deformation, never a smear of individual strands
        f = region_free(cv2.GaussianBlur(flow(o, c), (0, 0), 3), box)
        aligned = remap(c, f)
        after = outside_change(o, aligned, box)
        shipped = after <= ctx.th["blink_after_max"]
        if pose in react_flow:
            aligned = remap(aligned, react_flow[pose])
        if shipped:
            save_rgba(aligned, ctx.final / f"{pose}-closed.png")
        else:
            status = "warn"
        result["blinks"][pose] = {"eye_box": box, "before": round(before, 4), "after": round(after, 4), "shipped": shipped}
        verdict = "" if shipped else "  -> over the limit, blink dropped"
        print(f"  blink {pose}: outside-eye change {before * 100:.1f}% -> {after * 100:.1f}%{verdict}")

        # evidence: the eye band with 40px around it, three frames stacked, enlarged 2x
        x0, y0, x1, y1 = box
        h, w = o.shape[:2]
        sl = (slice(max(0, y0 - 40), min(h, y1 + 40)), slice(max(0, x0 - 40), min(w, x1 + 40)))
        final_open = load_rgba(ctx.final / f"{pose}-open.png")
        rows = [
            label(cv2.resize(on_backdrop(im[sl]), None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC), name)
            for im, name in ((final_open, "open"), (c, "closed (generated)"), (aligned, "closed (aligned)"))
        ]
        save_rgb(tile(rows, 1), ctx.review / f"blink-{pose}.jpg", quality=90)

    # 3. torso cut onto the cut line, for poses that ask for it
    x0c, y0c = ctx.crop()
    cut_y = ctx.cfg["canvas"]["cut_y"]
    for pose in rec["poses"]:
        if not poses_cfg[pose].get("fit_cut") or cut_y is None:
            continue
        o = load_rgba(ctx.final / f"{pose}-open.png")
        cut_b = cut_y - y0c
        seen = [cut_probe(o, x - x0c, cut_b, ctx.cfg["canvas"]["cut_window"]) for x in ctx.cut_columns(pose)]
        seen = [v for v in seen if v is not None]
        if not seen:
            print(f"  {pose}: fit_cut asked, but no torso cut is visible in its cut columns")
            continue
        measured = float(np.median(seen))
        dy = cut_b - measured
        if abs(dy) > ctx.th["fit_cut_max_px"]:
            raise SystemExit(f"{pose}: torso cut {dy:+.0f}px from the cut line, beyond fit_cut_max_px: regenerate")
        h, w = o.shape[:2]
        top = measured - 150
        ys = np.arange(h, dtype=np.float32)
        # destination row y shows source row src(y): stretched between top and the cut, shifted below it
        src = np.where(ys <= top, ys, np.where(ys <= cut_b, top + (ys - top) * (measured - top) / (cut_b - top), ys - dy))
        map_y = np.repeat(src[:, None], w, axis=1).astype(np.float32)
        map_x = np.repeat(np.arange(w, dtype=np.float32)[None, :], h, axis=0)
        fitted = {}
        for eye in ("open", "closed"):
            f = ctx.final / f"{pose}-{eye}.png"
            if f.exists():
                img = o if eye == "open" else load_rgba(f)
                fitted[eye] = cv2.remap(img, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
                save_rgba(fitted[eye], f)
        stretch = (cut_b - top) / (measured - top)
        result.setdefault("cuts", {})[pose] = {"measured": round(measured + y0c, 1), "fitted_to": cut_y, "stretch": round(float(stretch), 4)}
        print(f"  {pose}: torso cut {measured + y0c:.0f} -> {cut_y} (band above it stretched x{stretch:.3f})")
        band = (slice(int(max(0, top - 40)), int(min(h, cut_b + 30))), slice(0, w))
        views = []
        for name, im in (("generated", o), ("fitted", fitted["open"])):
            v = np.ascontiguousarray(on_backdrop(im[band]).astype(np.uint8))
            cv2.line(v, (0, int(cut_b - band[0].start)), (w, int(cut_b - band[0].start)), (255, 80, 80), 2)
            views.append(label(v.astype(np.float32), name))
        save_rgb(caption(tile(views, 1), f"{pose}: the red line is the table's far edge"), ctx.review / f"fitcut-{pose}.jpg", quality=86)

    ctx.write_record("align", result)
    return status
