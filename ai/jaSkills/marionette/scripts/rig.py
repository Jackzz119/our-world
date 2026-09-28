"""marionette — turn a set of generated flat pose images into a living character rig.

    python rig.py all      --config rig.json            # every stage in order, stops at the first FAIL
    python rig.py <stage>  --config rig.json            # one stage (it reads the previous stages' output)
    python rig.py all      --config rig.json --from morph   # resume from a stage
    python rig.py all      --config rig.json --allow-fail   # keep going past a FAIL (the record keeps it)

Stages, in order (each one owns its outputs and re-derives them from the stage before, so re-running
anything is always safe):

    check     acceptance of the raw generated set          -> build/check.json, review/check-*.jpg
    assemble  shared trimmed canvas (+ scene registration) -> build/raw/, build/assemble.json
    align     closed-eye frames warped onto open frames    -> build/final/<pose>-closed.png, review/blink-*.jpg
    morph     flow fields between pose pairs               -> build/final/morph-*.png, review/morph-*.jpg
    weights   idle motion masks per pose                   -> build/final/idle-*.png, review/weights-*.jpg
    export    runtime files + manifest                     -> <runtime>/*.webp, *.png, rig.json

Exit code: 0 pass or warn, 1 a stage failed, 2 bad config. Requires numpy, opencv-python (>= 4.5,
for DIS optical flow and SIFT), Pillow.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import align  # noqa: E402
import assemble  # noqa: E402
import check  # noqa: E402
import export  # noqa: E402
import morph  # noqa: E402
import weights  # noqa: E402
from common import Ctx  # noqa: E402

STAGES = {"check": check, "assemble": assemble, "align": align, "morph": morph, "weights": weights, "export": export}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("stage", choices=[*STAGES, "all"])
    ap.add_argument("--config", required=True, type=Path)
    ap.add_argument("--from", dest="start", choices=list(STAGES))
    ap.add_argument("--allow-fail", action="store_true")
    args = ap.parse_args()
    try:
        ctx = Ctx(args.config)
    except (OSError, ValueError, SystemExit) as e:
        print(f"config: {e}", file=sys.stderr)
        return 2

    names = list(STAGES) if args.stage == "all" else [args.stage]
    if args.start:
        names = names[names.index(args.start) :] if args.start in names else names
    summary, failed = [], False
    for name in names:
        print(f"[{name}]")
        status = STAGES[name].run(ctx, args)
        summary.append(f"{name} {status.upper()}")
        failed |= status == "fail"
        if status == "fail" and not args.allow_fail:
            print(f"\nstopped at {name}: FAIL. Fix the inputs it names (usually: regenerate those files) and run again.")
            print(" | ".join(summary))
            return 1
    print("\n" + " | ".join(summary))
    print(f"review evidence: {ctx.review} (look at every image a stage wrote before shipping)")
    # --allow-fail keeps going, but the run still did not pass
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
