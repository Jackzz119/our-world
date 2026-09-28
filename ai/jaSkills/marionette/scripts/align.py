"""Stage 3 — align: warp every closed-eye frame onto its open frame's geometry.

Generated blink frames always nudge the brows, glasses and hair a pixel or two, so a blink makes the
whole face jump. The dense flow open -> closed says where each point of the open frame went; sampling
the closed frame along it moves everything back into place. Only geometry moves, no pixel is repainted.

Inside the eye band the two frames really differ (lids against irises): the flow there chases the
wrong features and bends the lash line, so it is replaced by the head's motion interpolated from
around the band. A pose whose aligned frame still changes too much outside the eyes loses its blink.

Reads build/raw/, writes build/final/ (open frames copied as they are). Always re-derives from raw,
so re-running never aligns an aligned frame twice.

Review: review/blink-<pose>.jpg, the eye band of open / raw closed / aligned closed, enlarged.
Look for bent lash lines and for anything besides the eyelids that still moves.
"""

import shutil

import cv2
import numpy as np

from common import eye_box, flow, label, load_rgba, on_backdrop, outside_change, remap, save_rgb, save_rgba, tile


def eye_free(f, box):
    x0, y0, x1, y1 = [int(v) for v in box]
    keep = np.ones(f.shape[:2], np.float32)
    keep[max(0, y0) : y1, max(0, x0) : x1] = 0
    # normalised convolution: the average flow of the surroundings, weighted by distance
    fill = cv2.GaussianBlur(f * keep[..., None], (0, 0), 40) / np.maximum(cv2.GaussianBlur(keep, (0, 0), 40), 1e-4)[..., None]
    m = np.clip(cv2.GaussianBlur(1 - keep, (0, 0), 8) * 2, 0, 1)[..., None]
    return f * (1 - m) + fill * m


def run(ctx, args):
    rec = ctx.record("assemble")
    if not rec:
        raise SystemExit("run the assemble stage first")
    if ctx.final.exists():
        shutil.rmtree(ctx.final)
    ctx.final.mkdir(parents=True)
    status = "pass"
    result = {}
    for pose, eyes in rec["poses"].items():
        shutil.copy2(ctx.raw / f"{pose}-open.png", ctx.final / f"{pose}-open.png")
        if "closed" not in eyes:
            continue
        o, c = load_rgba(ctx.raw / f"{pose}-open.png"), load_rgba(ctx.raw / f"{pose}-closed.png")
        box = eye_box(ctx, pose, o)
        before = outside_change(o, c, box)
        # smoothed so the warp is a gentle deformation, never a smear of individual strands
        f = eye_free(cv2.GaussianBlur(flow(o, c), (0, 0), 3), box)
        aligned = remap(c, f)
        after = outside_change(o, aligned, box)
        shipped = after <= ctx.th["blink_after_max"]
        if shipped:
            save_rgba(aligned, ctx.final / f"{pose}-closed.png")
        else:
            status = "warn"
        result[pose] = {"eye_box": box, "before": round(before, 4), "after": round(after, 4), "shipped": shipped}
        verdict = "" if shipped else "  -> over the limit, blink dropped"
        print(f"  blink {pose}: outside-eye change {before * 100:.1f}% -> {after * 100:.1f}%{verdict}")

        # evidence: the eye band with 40px around it, three frames stacked, enlarged 2x
        x0, y0, x1, y1 = box
        h, w = o.shape[:2]
        sl = (slice(max(0, y0 - 40), min(h, y1 + 40)), slice(max(0, x0 - 40), min(w, x1 + 40)))
        rows = [
            label(cv2.resize(on_backdrop(im[sl]), None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC), name)
            for im, name in ((o, "open"), (c, "closed (generated)"), (aligned, "closed (aligned)"))
        ]
        save_rgb(tile(rows, 1), ctx.review / f"blink-{pose}.jpg", quality=90)

    ctx.write_record("align", result)
    return status
