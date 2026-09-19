#!/usr/bin/env python3
"""合并人工覆盖证据与文件快照，拒绝漏记或重复责任，不把扫描结果自动标成已审。"""

import argparse
import csv
import json
from collections import Counter
from pathlib import Path


FIELDS = ["path", "kind", "module", "revision", "step", "substep_id", "status", "method", "evidence", "reason"]


def read_rows(path):
    """读取一份 UTF-8 CSV，保留证据字段原文。"""
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def merge(run, step="01"):
    """按精确路径合并本轮与基线；删除项保留基线版本，新增项也必须有人工证据。"""
    before = {row["path"]: row for row in read_rows(run / "metrics/baseline/inventory.csv")}
    after = {row["path"]: row for row in read_rows(run / "metrics/after/inventory.csv")}
    evidence = {}
    aggregates = []
    for source in sorted((run / "evidence").glob("*-coverage.csv")):
        for row in read_rows(source):
            path = row["path"]
            if path not in before and path not in after:
                aggregates.append({**row, "source": source.name})
                continue
            if path in evidence:
                raise ValueError(f"重复责任：{path}")
            evidence[path] = {**row, "source": source.name}
    missing = sorted((before.keys() | after.keys()) - evidence.keys())
    if missing:
        raise ValueError(f"缺少人工覆盖记录：{missing}")
    rows = []
    for path in sorted(before.keys() | after.keys()):
        meta = after.get(path, before.get(path))
        item = evidence[path]
        reason = item.get("reason", item.get("findings", ""))
        status = item["status"]
        revision = item.get("revision", item.get("sha256", ""))
        reviewed = status == "已检查" or status.startswith("reviewed")
        before_hash = before.get(path, {}).get("sha256", "")
        after_hash = after.get(path, {}).get("sha256", "")
        if not revision:
            if path not in after or (before_hash and before_hash == after_hash):
                revision = before_hash
            elif reviewed:
                raise ValueError(f"变更/新增文件缺少明确的复读版本：{path}")
            else:
                revision = "metadata-only"
        if reviewed and after_hash and revision != after_hash:
            status = "待验证"
            reason += "；受审版本与最终快照不同，需复读变更后再标已检查"
        if path not in after:
            reason += "；本轮已删除，保留删除前版本与检查证据"
        rows.append({
            "path": path, "kind": meta["kind"], "module": "/".join(path.split("/")[:2]),
            "revision": revision, "step": step, "substep_id": item.get("substep_id", step), "status": status,
            "method": item["method"], "evidence": item.get("evidence", "evidence/" + item["source"]), "reason": reason
        })
    with (run / "coverage.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    summary = {
        "baseline_files": len(before), "after_files": len(after), "union_files": len(rows),
        "deleted": sorted(before.keys() - after.keys()), "added": sorted(after.keys() - before.keys()),
        "statuses": dict(Counter(row["status"] for row in rows)),
        "by_kind": {kind: dict(Counter(row["status"] for row in rows if row["kind"] == kind))
                    for kind in sorted({row["kind"] for row in rows})},
        "source_aggregates": aggregates,
        "limits": "状态来自人工证据，不由扫描推断；目录级排除和未知数量见 inventory-summary.json。"
    }
    (run / "metrics/coverage-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: summary[key] for key in ("baseline_files", "after_files", "union_files", "statuses")}, ensure_ascii=False))


def main():
    """接收运行目录；只有完整且责任唯一的证据才生成汇总。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--step", default="01", help="本次审核阶段，默认保留第一步兼容调用")
    args = parser.parse_args()
    merge(args.run.resolve(), args.step)


if __name__ == "__main__":
    main()
