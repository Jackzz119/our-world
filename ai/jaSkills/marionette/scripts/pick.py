"""pick — choose the best of several generated candidates for one pose, by measurement, not by eye.

Image models drift a little differently every time, so the stable way to get a frame that matches
the anchor is to ask for several candidates and keep the one that measures closest. Each candidate
gets the check stage's acceptance (canvas, genuine alpha, shoulder line, torso cut), and then its
consistency with the anchor: the head is fitted onto the anchor's by the face boxes (--fit head, for
poses whose head moves on purpose), the geometry is aligned like the align stage (only the face may
differ), and what still disagrees in the hair outline around the head is counted. That residual is
content the generator drew differently (an extra lock, a restyled outline), the thing alignment
cannot fix. Blink candidates (--open <open frame>) are scored on how much changed outside the eyes.

    python rig.py pick --config rig.json --pose poked --files c1.png c2.png c3.png [--fit head]
    python rig.py pick --config rig.json --pose sip --open sip-open.png --files closed-c1.png ...

Prints the ranking (lowest score first, any FAIL last) and writes review/pick-<pose>.jpg: each
candidate's head with the residual painted on (red = only the candidate, blue = only the anchor).
Nothing is copied anywhere: adopting the winner into the source folder is the caller's decision.
"""

import cv2
import numpy as np

from align import region_free
from common import (
    caption,
    cut_probe,
    eye_box,
    face_box,
    first_solid_y,
    flow,
    label,
    load_rgba,
    on_backdrop,
    outside_change,
    remap,
    save_rgb,
    tile,
)


def score(ctx, pose, anchor, img, fit):
    th = ctx.th
    out = {"issues": [], "fail": False}
    a = img[..., 3]
    if img.shape != anchor.shape:
        out.update(fail=True, issues=[f"canvas {img.shape[1]}x{img.shape[0]} != anchor"])
        return out, None
    if (a == 0).mean() < 0.05:
        out["fail"] = True
        out["issues"].append("no genuine transparency")
    solid = a >= 128
    out["body_alpha"] = round(float(a[solid].mean()), 1)
    p = ctx.cfg["poses"][pose]
    if p["probe"] and ctx.cfg["canvas"]["probes_x"]:
        d = [first_solid_y(img, x) - first_solid_y(anchor, x) for x in ctx.cfg["canvas"]["probes_x"]]
        out["shoulder_dy"] = d
        if max(abs(v) for v in d) > th["probe_fail_px"]:
            out["fail"] = True
            out["issues"].append(f"shoulders off by {max(d, key=abs)}px")
    cut_y = ctx.cfg["canvas"]["cut_y"]
    if p["probe"] and cut_y is not None and ctx.cut_columns(pose):
        window = ctx.cfg["canvas"]["cut_window"]
        seen = [v - cut_y for v in (cut_probe(img, x, cut_y, window) for x in ctx.cut_columns(pose)) if v is not None]
        out["cut_dy"] = seen
        if seen and max(abs(v) for v in seen) > th["cut_fail_px"]:
            out["fail"] = True
            out["issues"].append(f"torso cut off by {max(seen, key=abs)}px")

    # consistency with the anchor around the head
    afx, afy, afw, afh = face_box(ctx, ctx.cfg["anchor"], anchor, build=False)
    moved = img
    if fit:
        fx, fy, fw, fh = face_box(ctx, pose, img, build=False)
        s = afw / fw
        m = np.float32([[s, 0, afx - fx * s], [0, s, afy - fy * s]])
        moved = cv2.warpAffine(img, m, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        out["head_fit"] = {"scale": round(float(s), 3), "shift": [round(float(afx - fx * s)), round(float(afy - fy * s))]}
    free = [afx - afw * 0.1, afy + afh * 0.05, afx + afw * 1.1, afy + afh * 1.08]
    head = np.zeros(anchor.shape[:2], bool)
    head[max(0, int(afy - afh * 0.9)) : int(afy + afh * 1.1), max(0, int(afx - afw * 0.8)) : int(afx + afw * 1.8)] = True
    head[int(free[1]) : int(free[3]), int(free[0]) : int(free[2])] = False
    aligned = remap(moved, region_free(cv2.GaussianBlur(flow(anchor, moved), (0, 0), 3), free))
    sa, sc = anchor[..., 3] > 128, aligned[..., 3] > 128
    extra, missing = (sc & ~sa) & head, (sa & ~sc) & head
    out["hair_extra_px"], out["hair_missing_px"] = int(extra.sum()), int(missing.sum())
    out["score"] = out["hair_extra_px"] + out["hair_missing_px"]
    if "shoulder_dy" in out:
        out["score"] += 200 * max(abs(v) for v in out["shoulder_dy"])

    y0, y1 = max(0, int(afy - afh * 0.9)), int(afy + afh * 1.1)
    x0, x1 = max(0, int(afx - afw * 0.8)), int(afx + afw * 1.8)
    view = on_backdrop(aligned) * 0.55
    view[extra] = (255, 70, 70)
    view[missing] = (70, 190, 255)
    return out, np.concatenate([on_backdrop(img)[y0:y1, x0:x1], view[y0:y1, x0:x1]], axis=1)


def run(ctx, args):
    if not args.pose or not args.files:
        raise SystemExit("pick needs --pose and --files")
    if args.pose not in ctx.cfg["poses"]:
        raise SystemExit(f"'{args.pose}' is not a pose in rig.json")
    anchor = load_rgba(ctx.source_file(ctx.cfg["anchor"], "open"))
    rows, results = [], []
    for path in args.files:
        img = load_rgba(path)
        if args.open:
            # a blink candidate: only the eyes may differ from its open frame
            o = load_rgba(args.open)
            change = outside_change(o, img, eye_box(ctx, args.pose, o, build=False))
            r = {"issues": [], "fail": change > ctx.th["blink_reject"], "outside_eye_change": round(change, 4), "score": change * 1e5}
            if r["fail"]:
                r["issues"].append(f"{change * 100:.1f}% changed outside the eyes")
            view = None
        else:
            r, view = score(ctx, args.pose, anchor, img, args.fit == "head")
        r["file"] = str(path)
        results.append(r)
        if view is not None:
            rows.append(label(view, f"{path.name}  score {r['score']}{'  FAIL' if r['fail'] else ''}", 0.8))
    results.sort(key=lambda r: (r["fail"], r["score"]))
    for i, r in enumerate(results):
        keys = ("shoulder_dy", "cut_dy", "hair_extra_px", "hair_missing_px", "outside_eye_change", "head_fit", "body_alpha")
        detail = ", ".join(f"{k} {r[k]}" for k in keys if k in r)
        print(f"  {i + 1}. {'FAIL ' if r['fail'] else ''}{r['file']}: {detail}{'; ' + '; '.join(r['issues']) if r['issues'] else ''}")
    if rows:
        save_rgb(caption(tile(rows, 1), f"{args.pose}: red = only the candidate, blue = only the anchor"), ctx.review / f"pick-{args.pose}.jpg", quality=86)
    ctx.write_record(f"pick-{args.pose}", results)
    best = results[0]
    print(f"  best: {best['file']}{' (every candidate FAILs: regenerate)' if best['fail'] else ''}")
    return "fail" if best["fail"] else "pass"
