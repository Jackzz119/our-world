"""Pixel sampler for concept-c-narrow-rail.png.

Uses only Python's standard library so the measurement is reproducible in the
repository's restricted environment.  It decodes non-interlaced 8-bit PNGs,
provides scan/gradient helpers, and emits evidence used by codex-report.md.
"""

from __future__ import annotations

import json
import math
import statistics
import struct
import zlib
from collections import Counter
from pathlib import Path


SOURCE = Path(r"D:\Repo\our-world\ai\concept\ui-system\concept-c-narrow-rail.png")
OUT = Path(r"D:\Repo\our-world\codex-visual\20260811-055917Z\pixel-evidence.json")


def read_png(path: Path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos = 8
    chunks = []
    width = height = ctype = depth = interlace = None
    while pos < len(data):
        n = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        payload = data[pos + 8 : pos + 8 + n]
        pos += 12 + n
        if kind == b"IHDR":
            width, height, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            chunks.append(payload)
        elif kind == b"IEND":
            break
    assert depth == 8 and interlace == 0 and ctype in (2, 6), (depth, ctype, interlace)
    channels = 4 if ctype == 6 else 3
    raw = zlib.decompress(b"".join(chunks))
    stride = width * channels
    rows = []
    prev = bytearray(stride)
    i = 0
    for _ in range(height):
        f = raw[i]
        i += 1
        src = raw[i : i + stride]
        i += stride
        row = bytearray(stride)
        for x, val in enumerate(src):
            a = row[x - channels] if x >= channels else 0
            b = prev[x]
            c = prev[x - channels] if x >= channels else 0
            if f == 0:
                q = val
            elif f == 1:
                q = (val + a) & 255
            elif f == 2:
                q = (val + b) & 255
            elif f == 3:
                q = (val + ((a + b) >> 1)) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if pa <= pb and pa <= pc else b if pb <= pc else c
                q = (val + pr) & 255
            else:
                raise ValueError(f"Unsupported PNG filter {f}")
            row[x] = q
        rows.append(row)
        prev = row

    def px(x: int, y: int):
        off = x * channels
        rgb = tuple(rows[y][off : off + channels])
        return rgb if channels == 4 else (*rgb, 255)

    return width, height, px


def write_rgba_png(path: Path, width: int, height: int, pixel_fn):
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixel_fn(x, y))
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
    blob = b"\x89PNG\r\n\x1a\n"
    blob += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    blob += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    blob += chunk(b"IEND", b"")
    path.write_bytes(blob)


W, H, px = read_png(SOURCE)


def rgb_hex(c):
    return "#%02X%02X%02X" % c[:3]


def luminance(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def delta(a, b):
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


def sample_points(points):
    vals = [px(x, y) for x, y in points]
    means = tuple(round(statistics.mean(v[i] for v in vals), 1) for i in range(4))
    return {
        "points": [{"xy": [x, y], "rgba": list(v), "hex": rgb_hex(v)} for (x, y), v in zip(points, vals)],
        "mean_rgba_observed": list(means),
        "mean_hex": rgb_hex(tuple(round(x) for x in means)),
    }


def scan_x(y, x0, x1):
    out = []
    for x in range(x0 + 1, x1 + 1):
        out.append((round(delta(px(x - 1, y), px(x, y)), 2), x, rgb_hex(px(x, y))))
    return sorted(out, reverse=True)[:12]


def scan_y(x, y0, y1):
    out = []
    for y in range(y0 + 1, y1 + 1):
        out.append((round(delta(px(x, y - 1), px(x, y)), 2), y, rgb_hex(px(x, y))))
    return sorted(out, reverse=True)[:12]


def crop_stats(box, inset=0):
    x, y, w, h = box
    colors = []
    for yy in range(y + inset, y + h - inset):
        for xx in range(x + inset, x + w - inset):
            colors.append(px(xx, yy))
    means = tuple(round(statistics.mean(v[i] for v in colors), 1) for i in range(4))
    med = tuple(round(statistics.median(v[i] for v in colors)) for i in range(4))
    return {"mean": list(means), "mean_hex": rgb_hex(tuple(round(v) for v in means)), "median": list(med), "median_hex": rgb_hex(med)}


# Coordinates were first localized by whole-image scans, then refined on the
# original pixels.  They are listed explicitly so every sample can be audited.
boxes = {
    "rail": [14, 39, 56, 914],
    "room_popover_full_with_pointer": [105, 45, 432, 173],
    "room_popover_body": [115, 45, 422, 173],
    "ambience_full_with_pointer": [692, 24, 206, 128],
    "ambience_body": [692, 24, 206, 112],
    "anniversary": [1326, 41, 233, 105],
    "presence": [952, 221, 214, 50],
    "chat": [187, 618, 277, 330],
    "music": [1122, 865, 437, 88],
    "room_handle_visible": [1531, 291, 55, 99],
    "ellipsis_bubble": [899, 289, 54, 54],
    "reaction_bubble": [1395, 413, 78, 75],
    "wish_jar_glow_extent": [1271, 386, 151, 226],
}

samples = {
    "rail_interior": sample_points([(34, 122), (34, 190), (34, 295), (34, 474), (34, 755), (50, 916)]),
    "rail_border": sample_points([(15, 60), (15, 200), (68, 300), (41, 40), (41, 952)]),
    "button_plate": sample_points([(41, 82), (41, 172), (41, 253), (41, 331), (41, 413), (41, 531), (41, 611), (41, 694)]),
    "room_panel_interior": sample_points([(126, 58), (522, 58), (126, 207), (522, 207), (260, 207), (390, 207)]),
    "room_panel_border": sample_points([(132, 46), (520, 46), (536, 90), (130, 216), (520, 216)]),
    "ambience_interior": sample_points([(708, 38), (883, 38), (708, 122), (883, 122), (791, 85)]),
    "anniversary_interior": sample_points([(1342, 55), (1542, 55), (1342, 132), (1542, 132), (1450, 100)]),
    "presence_interior": sample_points([(970, 246), (1030, 246), (1135, 246), (1155, 246)]),
    "chat_interior": sample_points([(201, 635), (449, 635), (201, 928), (449, 928), (340, 803)]),
    "music_interior": sample_points([(1138, 881), (1542, 881), (1138, 937), (1542, 937), (1400, 900)]),
    "highlight_blue": sample_points([(200, 197), (199, 196), (199, 198), (149, 182), (247, 181)]),
    "accent_green": sample_points([(976, 245), (262, 700), (262, 780)]),
    "accent_pink": sample_points([(58, 150), (1144, 245), (1414, 440), (300, 831)]),
    "accent_gold": sample_points([(1436, 449), (343, 831), (1306, 512), (737, 57)]),
    "white_icon": sample_points([(42, 82), (41, 171), (41, 252), (41, 411), (42, 692)]),
    "divider": sample_points([(41, 468), (41, 469), (1497, 909), (1498, 909)]),
}

scan_evidence = {
    "rail_horizontal_at_y500": scan_x(500, 0, 90),
    "rail_vertical_at_x40": scan_y(40, 0, 980),
    "room_panel_horizontal_at_y100": scan_x(100, 80, 560),
    "room_panel_vertical_at_x300": scan_y(300, 20, 240),
    "ambience_horizontal_at_y60": scan_x(60, 650, 940),
    "ambience_vertical_at_x790": scan_y(790, 0, 180),
    "anniversary_horizontal_at_y100": scan_x(100, 1280, 1585),
    "anniversary_vertical_at_x1450": scan_y(1450, 0, 180),
    "presence_horizontal_at_y245": scan_x(245, 900, 1220),
    "presence_vertical_at_x1050": scan_y(1050, 180, 320),
    "chat_horizontal_at_y700": scan_x(700, 130, 520),
    "chat_vertical_at_x300": scan_y(300, 560, 980),
    "music_horizontal_at_y910": scan_x(910, 1080, 1585),
    "music_vertical_at_x1300": scan_y(1300, 820, 980),
}

component_samples = {name: crop_stats(box, inset=4) for name, box in boxes.items() if box[2] > 8 and box[3] > 8}

result = {
    "source": str(SOURCE),
    "canvas": [W, H],
    "coordinate_convention": "0-based CSS-style x/y; width and height count covered pixels",
    "boxes": boxes,
    "samples": samples,
    "crop_stats": component_samples,
    "scan_evidence": scan_evidence,
}
if __name__ == "__main__":
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    crop_dir = OUT.parent / "measurement-crops"
    crop_dir.mkdir(exist_ok=True)
    for name, (x, y, w, h) in boxes.items():
        scale = 2
        write_rgba_png(
            crop_dir / f"{name}.png",
            w * scale,
            h * scale,
            lambda xx, yy, x=x, y=y, scale=scale: px(x + xx // scale, y + yy // scale),
        )
    print(json.dumps({"canvas": [W, H], "evidence": str(OUT), "boxes": boxes}, ensure_ascii=False, indent=2))
