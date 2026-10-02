"""Package the generated UI art for the runtime (ai/design_system/codex-visual/art-requests/art-requests.md).

Rules of the pipeline (user directions, design-system.md iron rule 5): every picture comes straight
from generation — this script never paints, clones or cuts one out. It only
  * copies the adopted originals and the Codex reports into arts/ui/<group>/source/,
  * resizes with Lanczos and writes WebP for the runtime, stepping the quality down until the
    size budget of the art request holds,
  * for the tiles, when asked (--seam), blends the wrap with a half-offset copy of the same tile —
    the deterministic seam treatment the art requests allow once two generations in a row still
    show a seam; the blend keeps the grain's contrast instead of averaging it away,
  * trims the fully transparent margin around a tape strip,
  * for the empty-state drawings, pushes the generator's near-white ground to pure white (it is
    multiplied onto paper, so 253–254 speckle would show as a faint square) and, when asked
    (--fill), crops the margin so the pen line keeps its weight at 72–96 px,
  * writes a manifest of what was adopted and every step applied.

Groups (one or more Codex batch folders; a file in a later folder overrides the same file in an
earlier one, so a second round can redo a few pictures and keep the rest):
  covers  afternoon-clouds.png … first-snow.png       -> public/music/covers/*.webp (ART-01)
  paper   paper-tile.png                              -> public/ui/memory/paper-tile.webp (ART-02)
  cork    cork-tile.png, wood-source.png              -> public/ui/memory/cork-tile.webp, wood-rail[-v].webp (ART-04)
  tape    tape-blue|pink|butter|sage.png              -> public/ui/memory/tape-*.webp (ART-03)
  empty   empty-journal|wall|album|projector.png      -> public/ui/memory/empty-*.webp (ART-05)

Dependencies: Pillow, numpy (see ai/project-audit/CONVENTIONS.md).

    python scripts/build-ui-art.py <group> --from <batch folder>... [--review <scratch dir>] [group options]
"""

import argparse
import io
import json
import shutil
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent

COVERS = [
    'afternoon-clouds',
    'rainy-window',
    'lamp-radio',
    'spring-walk',
    'record-corner',
    'seaside-stars',
    'dawn-train',
    'first-snow'
]
TAPES = ['blue', 'pink', 'butter', 'sage']
EMPTIES = ['journal', 'wall', 'album', 'projector']


def rel(path: Path) -> str:
    """Repository-relative path with forward slashes, for manifests."""
    return path.resolve().relative_to(ROOT).as_posix()


def webp_within(
    img: Image.Image, out: Path, budget_kb: float, quality: int = 82, floor: int = 50, step: int = 4, **opts
) -> dict:
    """Write img as WebP at the highest quality (stepping down by `step`) that fits budget_kb; returns what was written."""
    out.parent.mkdir(parents=True, exist_ok=True)
    q = quality
    while True:
        buf = io.BytesIO()
        img.save(buf, 'WEBP', quality=q, method=6, **opts)
        if buf.tell() <= budget_kb * 1024 or q - step < floor:
            break
        q -= step
    out.write_bytes(buf.getvalue())
    return {'file': rel(out), 'size': list(img.size), 'quality': q, 'kb': round(buf.tell() / 1024, 1)}


def adopt(src: Path, dest_dir: Path, name: str | None = None) -> str:
    """Copy one adopted original (or the report) into the tracked source folder."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / (name or src.name)
    shutil.copyfile(src, dest)
    return rel(dest)


def pick(batches: list[Path], name: str) -> Path:
    """The file from the last batch that has it (later rounds override earlier ones); a later round
    often carries unchanged copies of the pictures it kept, so a byte-identical file is credited to
    the earliest batch that has it."""
    for i in range(len(batches) - 1, -1, -1):
        found = batches[i] / name
        if found.exists():
            data = found.read_bytes()
            for earlier in batches[:i]:
                if (earlier / name).exists() and (earlier / name).read_bytes() == data:
                    return earlier / name
            return found
    raise FileNotFoundError(f'{name} is in none of {[b.name for b in batches]}')


def adopt_reports(batches: list[Path], dest_dir: Path) -> list[str]:
    """Copy each batch's Codex report next to the adopted originals, named after its batch."""
    return [
        adopt(b / 'codex-report.md', dest_dir, f'codex-report-{b.name}.md')
        for b in batches
        if (b / 'codex-report.md').exists()
    ]


def luminance(rgb: np.ndarray) -> np.ndarray:
    """sRGB-weighted luma of an HxWx3 array (0–255), the measure the art requests quote."""
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def hexcolor(c) -> str:
    return '#' + ''.join(f'{int(round(v)):02x}' for v in c[:3])


def dominant(img: Image.Image, k: int = 3) -> list[str]:
    """The k main colours (largest cluster first), from a deterministic k-means on a 64px thumbnail."""
    px = np.asarray(img.convert('RGB').resize((64, 64), Image.LANCZOS), dtype=np.float64).reshape(-1, 3)
    order = np.argsort(luminance(px[:, None, :])[:, 0])
    centres = px[order[np.linspace(0, len(px) - 1, k).astype(int)]].copy()
    for _ in range(30):
        label = np.argmin(((px[:, None, :] - centres[None]) ** 2).sum(-1), axis=1)
        for i in range(k):
            if (label == i).any():
                centres[i] = px[label == i].mean(0)
    counts = np.bincount(label, minlength=k)
    return [hexcolor(centres[i]) for i in np.argsort(-counts)]


def seamless(img: Image.Image, band: float, axes: str = 'xy') -> Image.Image:
    """Make the tile wrap without a seam: blend it with its half-offset copy, whose own edges meet
    exactly, using a weight that is 0 at the original edges and 1 from `band` (fraction of the size)
    inward. Mixing two textures flattens their grain, so the blend divides by the weights' norm
    (a variance-preserving blend) to keep the grain's contrast."""
    a = np.asarray(img.convert('RGB'), dtype=np.float64)
    h, w = a.shape[:2]
    shifted = np.roll(a, (h // 2 if 'y' in axes else 0, w // 2 if 'x' in axes else 0), axis=(0, 1))

    def ramp(n: int) -> np.ndarray:
        d = np.minimum(np.arange(n), n - 1 - np.arange(n)) / max(1.0, band * n)
        t = np.clip(d, 0, 1)
        return t * t * (3 - 2 * t)

    wx = ramp(w) if 'x' in axes else np.ones(w)
    wy = ramp(h) if 'y' in axes else np.ones(h)
    m = np.minimum(wy[:, None], wx[None, :])[..., None]
    mean = a.reshape(-1, 3).mean(0)
    out = mean + (m * (a - mean) + (1 - m) * (shifted - mean)) / np.sqrt(m * m + (1 - m) ** 2)
    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))


def resize_tile(img: Image.Image, size: tuple[int, int], axes: str = 'xy') -> Image.Image:
    """Lanczos resize of a tile treated as periodic: a plain resize clamps at the edges and would
    print a faint line where the tiles meet, so wrap a margin around it, resize, and cut it back off."""
    w, h = img.size
    pad = 16
    a = np.asarray(img.convert('RGB'))
    a = np.pad(a, ((pad, pad) if 'y' in axes else (0, 0), (pad, pad) if 'x' in axes else (0, 0), (0, 0)), mode='wrap')
    sx, sy = size[0] / w, size[1] / h
    big = Image.fromarray(a).resize((round(a.shape[1] * sx), round(a.shape[0] * sy)), Image.LANCZOS)
    ox, oy = (round(pad * sx) if 'x' in axes else 0), (round(pad * sy) if 'y' in axes else 0)
    return big.crop((ox, oy, ox + size[0], oy + size[1]))


def tile_board(img: Image.Image, out: Path) -> None:
    """Review: the tile 2x2, and rolled by half so the wrap meets in the middle."""
    w, h = img.size
    board = Image.new('RGB', (w * 3, h * 2))
    for x in range(2):
        for y in range(2):
            board.paste(img, (x * w, y * h))
    a = np.asarray(img.convert('RGB'))
    board.paste(Image.fromarray(np.roll(a, (h // 2, w // 2), axis=(0, 1))), (2 * w, 0))
    board.thumbnail((2400, 1600), Image.LANCZOS)
    board.save(out)


def write_manifest(path: Path, key: str, entry: dict) -> None:
    """Merge one group's entry into arts/ui/<group>/manifest.json (other groups' entries are kept)."""
    data = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    data[key] = entry
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def build_covers(batches: list[Path], review: Path | None) -> None:
    """ART-01: eight square playlist covers -> 512px WebP, each within 60 KB."""
    source = ROOT / 'arts/ui/music/covers/source'
    files, thumbs = [], []
    for name in COVERS:
        src = pick(batches, f'{name}.png')
        img = Image.open(src).convert('RGB')
        runtime = img.resize((512, 512), Image.LANCZOS)
        written = webp_within(runtime, ROOT / f'public/music/covers/{name}.webp', 60)
        mean = np.asarray(img, dtype=np.float64).reshape(-1, 3).mean(0)
        files.append(
            {
                'name': name,
                'batch': src.parent.name,
                'source': adopt(src, source),
                'sourceSize': list(img.size),
                'runtime': written,
                'mean': hexcolor(mean),
                'dominant': dominant(img)
            }
        )
        thumbs.append(img)
        print(f"{name}: {written['kb']} KB q{written['quality']}  mean {hexcolor(mean)}  dominant {files[-1]['dominant']}")
    entry = {
        'date': date.today().isoformat(),
        'request': 'ai/design_system/codex-visual/art-requests/art-requests.md#art-01-歌单海报r1',
        'batches': [b.name for b in batches],
        'method': 'Built-in image_gen (Codex), one call per cover; adopted unedited. Runtime = Lanczos resize to 512 and WebP.',
        'reports': adopt_reports(batches, source),
        'prompts': [
            adopt(b / 'prompts.json', source, f'prompts-{b.name}.json')
            for b in batches
            if (b / 'prompts.json').exists()
        ],
        'files': files
    }
    write_manifest(ROOT / 'arts/ui/music/manifest.json', 'covers', entry)
    if review:
        cover_board(thumbs, review / 'covers-review.png')


def cover_board(imgs: list[Image.Image], out: Path) -> None:
    """Review: the eight at 44px on the dark and the light glass (4x nearest), and as the record label circle."""
    n, s = len(imgs), 44
    strip = Image.new('RGB', (n * (s + 8) + 8, 2 * (s + 16)), '#1c1b20')
    ImageDraw.Draw(strip).rectangle([0, s + 16, strip.width, strip.height], fill='#f5f0e8')
    for i, im in enumerate(imgs):
        t = im.resize((s, s), Image.LANCZOS)
        strip.paste(t, (8 + i * (s + 8), 8))
        strip.paste(t, (8 + i * (s + 8), s + 24))
    strip = strip.resize((strip.width * 4, strip.height * 4), Image.NEAREST)
    d = 120
    labels = Image.new('RGB', (n * (d + 16) + 16, d + 32), '#141318')
    mask = Image.new('L', (d, d), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, d - 1, d - 1], fill=255)
    for i, im in enumerate(imgs):
        labels.paste(im.resize((d, d), Image.LANCZOS), (16 + i * (d + 16), 16), mask)
    board = Image.new('RGB', (max(strip.width, labels.width), strip.height + labels.height), '#141318')
    board.paste(strip, (0, 0))
    board.paste(labels, (0, strip.height))
    board.save(out)


def build_paper(batches: list[Path], review: Path | None, seam: float | None) -> None:
    """ART-02: the near-white paper tile, multiplied over the cream paper -> 1024px WebP within 90 KB."""
    source = ROOT / 'arts/ui/memory/source'
    src = pick(batches, 'paper-tile.png')
    img = Image.open(src).convert('RGB')
    steps = ['adopted unedited']
    if seam:
        img = seamless(img, seam)
        steps = [f'seam: variance-preserving blend with the half-offset copy, band {seam:g}']
    runtime = resize_tile(img, (1024, 1024))
    steps.append('periodic Lanczos resize to 1024')
    # the fibres are 1–4 levels deep: q82 keeps a third of them, so start near-lossless and step by 1
    written = webp_within(runtime, ROOT / 'public/ui/memory/paper-tile.webp', 90, quality=97, step=1)
    lum = luminance(np.asarray(runtime, dtype=np.float64))
    stats = {
        'min': round(float(lum.min()), 1),
        'p1': round(float(np.percentile(lum, 1)), 1),
        'mean': round(float(lum.mean()), 1),
        'max': round(float(lum.max()), 1)
    }
    print(f"paper-tile: {written['kb']} KB q{written['quality']}  luminance {stats}")
    entry = {
        'date': date.today().isoformat(),
        'request': 'ai/design_system/codex-visual/art-requests/art-requests.md#art-02-手帐纸纹理r2',
        'batch': src.parent.name,
        'method': 'Built-in image_gen (Codex). Runtime = Lanczos resize to 1024 (tiled at 512 CSS px) and WebP.',
        'source': adopt(src, source),
        'sourceSize': list(Image.open(src).size),
        'steps': steps,
        'runtime': written,
        'luminance': stats,
        'reports': adopt_reports(batches, source)
    }
    write_manifest(ROOT / 'arts/ui/memory/manifest.json', 'paper', entry)
    if review:
        tile_board(runtime, review / 'paper-tiles.png')


def build_cork(
    batches: list[Path], review: Path | None, seam: float | None, wood_seam: float, wood_row: float
) -> None:
    """ART-04: the cork tile (final colour) -> 1024px WebP within 140 KB; one strip of the walnut
    source -> the 840x48 rail (and the same strip turned 90° for the side rails)."""
    source = ROOT / 'arts/ui/memory/source'
    src = pick(batches, 'cork-tile.png')
    img = Image.open(src).convert('RGB')
    steps = ['adopted unedited']
    if seam:
        img = seamless(img, seam)
        steps = [f'seam: variance-preserving blend with the half-offset copy, band {seam:g}']
    runtime = resize_tile(img, (1024, 1024))
    steps.append('periodic Lanczos resize to 1024')
    written = webp_within(runtime, ROOT / 'public/ui/memory/cork-tile.webp', 140)
    mean = hexcolor(np.asarray(runtime, dtype=np.float64).reshape(-1, 3).mean(0))
    print(f"cork-tile: {written['kb']} KB q{written['quality']}  mean {mean} (target #ae8259)")

    wsrc = pick(batches, 'wood-source.png')
    wood = Image.open(wsrc).convert('RGB')
    ww, wh = wood.size
    strip_h = round(ww * 48 / 840)
    top = round((wh - strip_h) * wood_row)
    strip = wood.crop((0, top, ww, top + strip_h))
    wood_steps = [f'crop the full-width strip y {top}–{top + strip_h} of {ww}x{wh} (row {wood_row:g})']
    if wood_seam:
        strip = seamless(strip, wood_seam, 'x')
        wood_steps.append(f'seam along the length: variance-preserving blend with the half-offset copy, band {wood_seam:g}')
    rail = resize_tile(strip, (840, 48), 'x')
    rail_h = webp_within(rail, ROOT / 'public/ui/memory/wood-rail.webp', 40)
    rail_v = webp_within(rail.transpose(Image.ROTATE_90), ROOT / 'public/ui/memory/wood-rail-v.webp', 40)
    wood_steps.append('periodic Lanczos resize to 840x48 (wrapping along the length); the side rails are the same strip turned 90°')
    print(f"wood-rail: {rail_h['kb']} KB  wood-rail-v: {rail_v['kb']} KB")

    entry = {
        'date': date.today().isoformat(),
        'request': 'ai/design_system/codex-visual/art-requests/art-requests.md#art-04-软木板与木框r2图钉可选',
        'method': 'Built-in image_gen (Codex). Runtime = Lanczos resize and WebP.',
        'reports': adopt_reports(batches, source),
        'cork': {
            'batch': src.parent.name,
            'source': adopt(src, source),
            'sourceSize': list(Image.open(src).size),
            'steps': steps,
            'runtime': written,
            'mean': mean
        },
        'wood': {
            'batch': wsrc.parent.name,
            'source': adopt(wsrc, source),
            'sourceSize': [ww, wh],
            'steps': wood_steps,
            'runtime': [rail_h, rail_v]
        }
    }
    write_manifest(ROOT / 'arts/ui/memory/manifest.json', 'cork', entry)
    if review:
        tile_board(runtime, review / 'cork-tiles.png')
        tile_board(rail.resize((840 * 2, 96), Image.LANCZOS), review / 'wood-tiles.png')


def build_tape(batches: list[Path], review: Path | None) -> None:
    """ART-03: four washi tape strips with their own alpha -> trimmed, 240px wide WebP within 20 KB each."""
    source = ROOT / 'arts/ui/memory/source'
    files, strips = [], []
    for colour in TAPES:
        src = pick(batches, f'tape-{colour}.png')
        img = Image.open(src).convert('RGBA')
        bbox = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        trimmed = img.crop(bbox)
        h = round(240 * trimmed.height / trimmed.width)
        runtime = trimmed.resize((240, h), Image.LANCZOS)
        written = webp_within(runtime, ROOT / f'public/ui/memory/tape-{colour}.webp', 20, quality=92, alpha_quality=100)
        a = np.asarray(trimmed, dtype=np.float64)
        body = a[a[..., 3] > 200]
        files.append(
            {
                'name': f'tape-{colour}',
                'batch': src.parent.name,
                'source': adopt(src, source),
                'sourceSize': list(img.size),
                'steps': [f'trim the transparent margin (alpha > 8) to {list(bbox)}', 'Lanczos resize to 240 wide'],
                'runtime': written,
                'bodyMean': hexcolor(body[:, :3].mean(0)) if len(body) else None,
                'bodyAlpha': round(float(a[..., 3][a[..., 3] > 8].mean() / 255), 3)
            }
        )
        strips.append(runtime)
        print(f"tape-{colour}: {written['size']} {written['kb']} KB  body {files[-1]['bodyMean']}  alpha {files[-1]['bodyAlpha']}")
    entry = {
        'date': date.today().isoformat(),
        'request': 'ai/design_system/codex-visual/art-requests/art-requests.md#art-03-和纸胶带r3',
        'method': 'Built-in image_gen (Codex) with a native transparent background; never keyed or cut out.',
        'reports': adopt_reports(batches, source),
        'files': files
    }
    write_manifest(ROOT / 'arts/ui/memory/manifest.json', 'tape', entry)
    if review:
        board = Image.new('RGB', (3 * 300, len(strips) * 90 + 20), '#1d2433')
        ImageDraw.Draw(board).rectangle([300, 0, 600, board.height], fill='#ecdfc2')
        ImageDraw.Draw(board).rectangle([600, 0, 900, board.height], fill='#ffffff')
        for i, s in enumerate(strips):
            for x in range(3):
                board.paste(s, (x * 300 + 30, 20 + i * 90), s)
        board.save(review / 'tape-review.png')


def white_clip(img: Image.Image, lo: int = 244, hi: int = 252) -> Image.Image:
    """Push the generator's near-white ground (253–254 speckle) to pure white so a multiplied drawing
    leaves no faint square on the paper: channels above `hi` become 255, `lo`–`hi` ramp up to it,
    everything darker (ink, washes) is untouched."""
    a = np.asarray(img.convert('RGB'), dtype=np.float64)
    t = np.clip((a - lo) / (hi - lo), 0, 1)
    return Image.fromarray(np.clip(a + t * (255 - a) + 0.5, 0, 255).astype(np.uint8))


def frame_drawing(img: Image.Image, fill: float) -> tuple[Image.Image, list[int]]:
    """Square crop centred on the drawing (pixels darker than 245) so it spans `fill` of the side;
    the generator leaves a wide margin, which makes the pen line too thin at 72–96 px. Where the
    square runs past the canvas it is padded with white."""
    lum = luminance(np.asarray(img, dtype=np.float64))
    ys, xs = np.nonzero(lum < 245)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    side = round(max(xs.max() - xs.min(), ys.max() - ys.min()) / fill)
    box = [round(cx - side / 2), round(cy - side / 2), round(cx - side / 2) + side, round(cy - side / 2) + side]
    canvas = Image.new('RGB', (side, side), (255, 255, 255))
    # only the part of the box inside the picture is copied (crop() would fill the rest with black)
    inside = [max(box[0], 0), max(box[1], 0), min(box[2], img.width), min(box[3], img.height)]
    canvas.paste(img.crop(inside), (inside[0] - box[0], inside[1] - box[1]))
    return canvas, box


def build_empty(batches: list[Path], review: Path | None, fill: float | None) -> None:
    """ART-05: four spot drawings on white (multiplied onto the note) -> 192px WebP within 30 KB each."""
    source = ROOT / 'arts/ui/memory/source'
    files, imgs = [], []
    for name in EMPTIES:
        src = pick(batches, f'empty-{name}.png')
        img = Image.open(src).convert('RGB')
        steps = ['white point: channels above 252 to 255, 244–252 ramped (the near-white ground speckle)']
        art = white_clip(img)
        if fill:
            art, box = frame_drawing(art, fill)
            steps.append(f'square crop {box} so the drawing spans {fill:g} of the side')
        runtime = art.resize((192, 192), Image.LANCZOS)
        steps.append('Lanczos resize to 192')
        written = webp_within(runtime, ROOT / f'public/ui/memory/empty-{name}.webp', 30, quality=95)
        lum = luminance(np.asarray(img, dtype=np.float64))
        files.append(
            {
                'name': f'empty-{name}',
                'batch': src.parent.name,
                'source': adopt(src, source),
                'sourceSize': list(img.size),
                'steps': steps,
                'runtime': written,
                'inkCoverage': round(float((lum < 250).mean()), 4),
                'darkest': round(float(lum.min()), 1)
            }
        )
        imgs.append(runtime)
        print(f"empty-{name}: {written['kb']} KB  ink {files[-1]['inkCoverage']}")
    entry = {
        'date': date.today().isoformat(),
        'request': 'ai/design_system/codex-visual/art-requests/art-requests.md#art-05-空状态小插画r4',
        'method': 'Built-in image_gen (Codex) on white, multiplied in by CSS; the drawing itself is never edited.',
        'reports': adopt_reports(batches, source),
        'files': files
    }
    write_manifest(ROOT / 'arts/ui/memory/manifest.json', 'empty', entry)
    if review:
        board = Image.new('RGB', (len(imgs) * 220 + 20, 240), '#ecdfc2')
        for i, im in enumerate(imgs):
            a = np.asarray(board.crop((20 + i * 220, 20, 212 + i * 220, 212)), dtype=np.float64)
            m = a * np.asarray(im, dtype=np.float64) / 255
            board.paste(Image.fromarray(m.astype(np.uint8)), (20 + i * 220, 20))
        board.save(review / 'empty-review.png')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('group', choices=['covers', 'paper', 'cork', 'tape', 'empty'])
    parser.add_argument(
        '--from', dest='batches', required=True, type=Path, nargs='+', help='Codex batch folders, later ones override'
    )
    parser.add_argument('--review', type=Path, help='scratch folder for review boards (not shipped)')
    parser.add_argument('--seam', type=float, help='tiles only: seam blend band as a fraction of the size, e.g. 0.25')
    parser.add_argument('--wood-seam', type=float, default=0, help='cork only: seam blend band along the rail')
    parser.add_argument('--wood-row', type=float, default=0.5, help='cork only: where the rail strip is cut, 0 top – 1 bottom')
    parser.add_argument('--fill', type=float, help='empty only: crop the margin so the drawing spans this much of the side')
    args = parser.parse_args()
    if args.review:
        args.review.mkdir(parents=True, exist_ok=True)
    if args.group == 'covers':
        build_covers(args.batches, args.review)
    elif args.group == 'paper':
        build_paper(args.batches, args.review, args.seam)
    elif args.group == 'cork':
        build_cork(args.batches, args.review, args.seam, args.wood_seam, args.wood_row)
    elif args.group == 'tape':
        build_tape(args.batches, args.review)
    else:
        build_empty(args.batches, args.review, args.fill)


if __name__ == '__main__':
    main()
