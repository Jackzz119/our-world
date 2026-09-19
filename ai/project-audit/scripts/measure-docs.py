#!/usr/bin/env python3
"""对照执行前 ZIP 逐文档量 UTF-8 bytes / 行数 / 非空白字节，并给出精确差异；不读取排除目录。

适用文档清单由 --applicable 文件（每行一个仓库相对路径）给出，避免把项目路径写死在脚本里。
"""

import argparse
import csv
import difflib
import hashlib
import json
import re
import zipfile
from pathlib import Path


def measure(raw):
    """量 bytes、行数、非空白字节；三者都不是模型 token。"""
    text = raw.decode("utf-8")
    return len(raw), len(text.splitlines()), len(re.sub(r"\s", "", text).encode("utf-8"))


def main():
    """写逐文档度量 CSV、汇总 JSON 与 unified diff。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--before", type=Path, required=True, help="执行前快照 ZIP（仓库相对路径）")
    parser.add_argument("--applicable", type=Path, required=True, help="适用活文档清单，每行一个路径")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    args.output.mkdir(parents=True, exist_ok=True)
    applicable_set = {line.strip() for line in args.applicable.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")}
    rows, diffs = [], []
    with zipfile.ZipFile(args.before) as archive:
        names = sorted(archive.namelist())
        for name in names:
            if not name.endswith(".md"):
                continue
            before = archive.read(name)
            current = root / name
            after = current.read_bytes() if current.is_file() else b""
            old, new = measure(before), measure(after)
            applicable = name in applicable_set
            row = {
                "path": name,
                "applicable": applicable,
                "before_bytes": old[0],
                "after_bytes": new[0],
                "before_lines": old[1],
                "after_lines": new[1],
                "before_nonspace_bytes": old[2],
                "after_nonspace_bytes": new[2],
                "reduction_percent": round((1 - new[0] / old[0]) * 100, 2) if old[0] else None,
                "content_reduction_percent": round((1 - new[2] / old[2]) * 100, 2) if old[2] else None,
                "target_met": applicable and new[0] * 3 <= old[0] * 2,
                "content_target_met": applicable and new[2] * 3 <= old[2] * 2,
                "before_sha256": hashlib.sha256(before).hexdigest(),
                "after_sha256": hashlib.sha256(after).hexdigest() if current.is_file() else "deleted",
            }
            rows.append(row)
            if before != after:
                diffs.extend(difflib.unified_diff(
                    before.decode().splitlines(keepends=True),
                    after.decode().splitlines(keepends=True),
                    fromfile="before/" + name, tofile="after/" + name, n=2,
                ))
    missing = sorted(applicable_set - {row["path"] for row in rows})
    if missing:
        raise SystemExit(f"适用清单中的文档不在基线 ZIP 内：{missing}")
    with (args.output / "documents.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    active = [row for row in rows if row["applicable"]]
    summary = {
        "method": "UTF-8 bytes 与非空白 UTF-8 bytes；不是模型 token",
        "applicable_documents": len(active),
        "target_met": sum(row["target_met"] for row in active),
        "content_target_met": sum(row["content_target_met"] for row in active),
        "exceptions_or_pending": [row["path"] for row in active if not row["target_met"]],
        "content_exceptions_or_pending": [row["path"] for row in active if not row["content_target_met"]],
        "all_markdown_documents": len(rows),
    }
    for key in ("before_bytes", "after_bytes", "before_lines", "after_lines", "before_nonspace_bytes", "after_nonspace_bytes"):
        summary[key] = sum(row[key] for row in active)
        summary["all_" + key] = sum(row[key] for row in rows)
    summary["reduction_percent"] = round((1 - summary["after_bytes"] / summary["before_bytes"]) * 100, 2) if summary["before_bytes"] else None
    summary["content_reduction_percent"] = round((1 - summary["after_nonspace_bytes"] / summary["before_nonspace_bytes"]) * 100, 2) if summary["before_nonspace_bytes"] else None
    (args.output / "documents-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.output / "documents.diff").write_text("".join(diffs), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
