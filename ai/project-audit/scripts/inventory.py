#!/usr/bin/env python3
"""生成可复用的审核清单、完全相同文件候选和本地文档链接线索。

只写指定输出目录，不删除项目文件；禁止目录在遍历前剪枝，凭据文件不读取正文。
"""

import argparse
import csv
import hashlib
import json
import os
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote


SKIP_NAMES = {
    ".git", ".claude", ".agents", "node_modules", ".next", ".turbo",
    ".venv", "__pycache__", ".vercel", "coverage", "dist", "build", "out"
}
PROTECTED_PATHS = {"ai/sessions"}
FIELDS = ["path", "kind", "bytes", "lines", "sha256", "status", "reason"]


def protected_file(path):
    """识别可能存放凭据的文件，避免把正文或摘要带入审核输出。"""
    name = path.name
    return (
        (name.startswith(".env") and name != ".env.example")
        or path.suffix in {".pem", ".key", ".p12", ".pfx"}
        or (path.as_posix().startswith("scripts/deploy/config.") and name != "config.example.sh")
    )


def read_record(path, relative):
    """记录文件元数据和可读文本；符号链接与敏感文件只记边界，不追踪或读取内容。"""
    record = dict.fromkeys(FIELDS, "")
    record.update(path=relative.as_posix(), status="仅清单，待人工核验")
    if path.is_symlink():
        record.update(kind="symlink", reason="未跟随链接")
        return record, None
    record["bytes"] = path.stat().st_size
    if protected_file(relative):
        record.update(kind="protected", status="受限", reason="凭据文件正文不读取")
        return record, None
    if record["bytes"] > 32 * 1024 * 1024:
        record.update(kind="large-file", reason="超过32MiB，仅元数据；人工按资源关系核验")
        return record, None
    data = path.read_bytes()
    record["sha256"] = hashlib.sha256(data).hexdigest()
    try:
        content = data.decode("utf-8") if b"\0" not in data else None
    except UnicodeDecodeError:
        content = None
    record["kind"] = "text" if content is not None else "binary"
    if content is not None:
        record["lines"] = len(content.splitlines())
    return record, content


def markdown_links(content, relative, root):
    """找代码围栏外的本地 Markdown 链接线索；无法解析的语法留给人工判断，不自动修复。"""
    findings = []
    fence = None
    for line_number, line in enumerate(content.splitlines(), 1):
        marker = re.match(r"^\s*(`{3,}|~{3,})", line)
        if marker:
            if fence is None:
                fence = marker.group(1)[0]
            elif marker.group(1)[0] == fence:
                fence = None
            continue
        if fence:
            continue
        for match in re.finditer(r"\]\((<[^>]+>|[^\s)]+)(?:\s+['\"].*?['\"])?\)", line):
            target = match.group(1).strip("<>")
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
                continue
            target = unquote(target.split("#", 1)[0])
            if not target:
                continue
            if target.startswith("/"):
                findings.append(dict(path=relative.as_posix(), line=line_number, target=target, status="根路径语义待人工核验"))
                continue
            joined = Path(os.path.normpath(relative.parent / target))
            if joined.as_posix().startswith("../"):
                status = "项目外引用，未读取"
            elif any(joined == Path(p) or Path(p) in joined.parents for p in PROTECTED_PATHS):
                status = "受保护引用，未探测"
            else:
                status = "存在" if (root / joined).exists() else "未解析到本地文件"
            if status != "存在":
                findings.append(dict(path=relative.as_posix(), line=line_number, target=target, status=status))
    return findings


def scan(root, output, extra_excludes):
    """遍历允许的项目范围并产生候选数据，始终把清单扫描与人工审核状态分开。"""
    records, exclusions, links = [], [], []
    duplicates = defaultdict(list)
    excluded = PROTECTED_PATHS | set(extra_excludes)
    try:
        excluded.add(output.relative_to(root).as_posix())
    except ValueError:
        pass
    for current, directories, files in os.walk(root, topdown=True, followlinks=False):
        parent = Path(current)
        kept = []
        for name in sorted(directories):
            path = parent / name
            relative = path.relative_to(root)
            if name in SKIP_NAMES or name.startswith("chrome-profile") or relative.as_posix() in excluded or path.is_symlink():
                exclusions.append({"path": relative.as_posix(), "reason": "生成/依赖/受保护/本轮输出目录或链接；未枚举"})
            else:
                kept.append(name)
        directories[:] = kept
        for name in sorted(files):
            path = parent / name
            relative = path.relative_to(root)
            if relative.as_posix() in excluded:
                exclusions.append({"path": relative.as_posix(), "reason": "显式排除文件；未读取正文"})
                continue
            record, content = read_record(path, relative)
            records.append(record)
            if record["sha256"] and record["bytes"]:
                duplicates[record["sha256"]].append(record["path"])
            if content is not None and path.suffix.lower() in {".md", ".mdx"}:
                links.extend(markdown_links(content, relative, root))
    records.sort(key=lambda item: item["path"])
    output.mkdir(parents=True, exist_ok=True)
    with (output / "inventory.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)
    summary = {
        "files": len(records),
        "bytes": sum(item["bytes"] or 0 for item in records),
        "text_files": sum(item["kind"] == "text" for item in records),
        "exclusions": exclusions,
        "exact_duplicate_candidates": [items for items in duplicates.values() if len(items) > 1],
        "unresolved_link_candidates": links,
        "limitations": "不枚举排除目录；大小/哈希/链接线索不构成人工审阅或删除依据；链接解析不含锚点与全部Markdown语法。",
    }
    (output / "inventory-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: summary[key] for key in ("files", "bytes", "text_files")}, ensure_ascii=False))
    print(f"重复候选组 {len(summary['exact_duplicate_candidates'])}；链接线索 {len(links)}；排除根 {len(exclusions)}")


def main():
    """读取可复用的根目录和输出参数，拒绝把输出放到项目根从而意外覆盖文件。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--exclude", action="append", default=[])
    args = parser.parse_args()
    root = args.root.resolve()
    output = args.output.resolve()
    if output == root:
        parser.error("output 必须是独立的审核输出目录")
    scan(root, output, args.exclude)


if __name__ == "__main__":
    main()
