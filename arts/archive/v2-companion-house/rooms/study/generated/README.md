# 唱片机装配输入

`scripts/build-turntable-parts.py` 的实际输入与产物清单（2026-09-19 整理；此前的完整生成批次含失败尝试已删除，恢复依据 git `f7a151a`）。

| 文件 | 用途 | 来源 |
| --- | --- | --- |
| `20260907-053852Z/machine-twilight.png` | donor：无唱片无唱臂的机器底图（`DONOR_MOOD = twilight`，三档共用几何、逐档配色） | codex 第四轮生成，报告见同目录 `codex-report.md` |
| `20260907-053852Z/machine-golden.png`、`machine-night.png` | 备用 donor（当前脚本不读） | 同上 |
| `20260907-053852Z/tonearm.png` | 唱臂平光固有色零件 | 同上 |
| `20260907-055939Z/platter.png` | 唱片标签印花（`--platter`） | codex 第五轮生成，报告见同目录 `codex-report.md` |
| `turntable.json` | 最近一次装配输出的几何清单（pivot / arm box / 各档贴图路径），数值已手抄进 `src/themes/cinnaglass/room/study-room.ts` | 装配器写出 |

原画真源在 `../source/`，运行时产物在 `public/rooms/study/`（底图三档 + `parts/`）。重跑：

```bash
python scripts/build-turntable-parts.py --gen arts/rooms/study/generated/20260907-053852Z \
    --src arts/rooms/study/source --out public/rooms/study \
    --platter arts/rooms/study/generated/20260907-055939Z/platter.png
```

两份 `codex-report.md` 是当时批次报告的副本，其中列出的 attempt/脚本/qa 文件已不在仓库。分层原则与教训见 `ai/design_system/research/living-props.md`。
