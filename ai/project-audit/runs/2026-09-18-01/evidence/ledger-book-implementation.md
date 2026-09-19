# Ledger · book-implementation.md

源文件：`ai/design_system/uiux/cinnaglass/journal-room-object/book-implementation.md`（只读，未修改）
基线 commit：3fd52a5（分支 dev）

## 体积

| | bytes (UTF-8) | 行数 |
| --- | ---: | ---: |
| 原文 | 8415 | 90 |
| 压缩稿 | 6094 | 65 |
| 目标（2/3） | 5610 | — |

比例 72.4%，**未达 2/3，见「例外说明」**。

## 保留清单（权威正文留在本文）

- 顶部状态与免责：2026-09-07、静态美术已接入本地待用户实景验收、「工程检查通过 ≠ 逐像素复刻」、未部署未提交。
- 活代码与资产真源 7 行表（journal-room.css / journal-room-book.tsx / journal-layout.ts / screens.tsx / public/ui/journal/ / arts/ui/journal/ / public/fonts/journal/）。
- **用户决定原句（L27）**：「旧 `journal-book.tsx` / `diary.css` 和翻页依赖保留作历史实现，本轮没有删除；当前日记不再实例化旧翻页引擎。」连同「新样式在旧基础样式之后加载」「useFeed/posts.ts/storage.ts/数据库未改」。
- 全部数值契约：底图 1536×1024；校色 `contrast(.84) brightness(.95) saturate(1.12)`；墨色 `#594126` / `#604A30` / `#735B3B` / 范围框 `#946A3438`；桌面 26/21/17px、行距 1.65；留白 34px、上下 86/70px、条目间距 22px；中小屏 18px、短窗口 16px；窄屏单页上移 22px；WOFF2 5,269,840 字节（约 5.27 MB）。
- 实测尺寸 4 行表（1440×900 / 960×700 / 640×400 / 390×844）。
- 版式与材质契约条目：multiply 墨色（含大白话解释）、日期无底板与无蓝/粉左边线、真实可选中文字、默认头像/自定义头像规则、照片旧纸角与短文位置、羽毛笔仅装饰不接收点击、「写一页」入口保留、无作者分栏且旧→新流向、三时辰共用同一实体书材质且未做动态受光。
- 验证链接：real-memories.png、design-content-night.png、book-comparison.png、alpha-review.png、pixel-samples.json、results.json，以及三个验证脚本名。
- 采样表三行（187.38/186.58/-0.80；190.29/187.61/-2.68；62.58/60.53/-2.05）与 Rec.709 说明、「不能证明逐像素相同」的限定。
- 工程检查结论（溢出 0、12/18/28/12 页、九图/十图、Escape 草稿、详情、导航回归、透明通道、ESLint/Vite 通过）。
- 未覆盖与阻断项：`shell/chat-card.tsx` 的 `Msg` 导入错误阻断完整类型构建；真实花园、Safari、低端设备、125%/150% 缩放。
- 出向链接：turn-implementation.md、book-prompts.md、霞鹜文楷 Lite 上游。

## 删除清单

| 原文位置 / 摘句 | 理由 |
| --- | --- |
| L5「后续状态：同日已接续实施…本文保留静态轮当时的检查记录；下文『下一轮』事项以新报告为准」 | 并入顶部一句链接，语义不变 |
| L7-14 整节「1. 这轮看到的变化」叙述（「书本在桌面窗口中心放大为 1040×670 左右」等） | 过程叙述 + 与 `ai/Features/timeline.md` L25 功能说明重复；其中的契约事实（真实文字、头像、照片纸角、羽毛笔、写一页入口、multiply）已提升为 §2 契约条目，尺寸 1040×670 已由实测尺寸表精确给出 |
| L31「轻微纤维和磨损留在纸里，不盖住正文，不铺满彩色条目底板」的重复表述 | 与视觉签名句合并 |
| L40「本轮优先保证真实中文内容可用」 | 过程性表态；保留结论「分块字体与低带宽首屏未验收」 |
| L55「普通预览仍显示真实回忆」前后的重复展开 | 合并为一句，事实全保留 |
| L67「第一版左页同一区域为 209.59，偏亮约 22；已通过真实样式校正」 | 已被当前校色参数取代的中间值，非当前契约（校色滤镜本身保留） |
| L74「修复验证脚本对懒加载图片过早断言的问题」的独立成句 | 压进工程检查一句括注 |
| L82 生成空白书的两次失败流水（棋盘背景、透明化失败、只移除与外沿连通的中性背景） | 逐轮尝试流水；结论「含两次失败，原图全留」+ 链接 book-prompts.md 保留 |
| L84「首次实景还发现页码压在封皮、小屏日期与目录太靠外、正文比参考偏大导致短句换行，均已调整并重新截图」 | 逐轮修正流水，最终值已在 §2 数值表中 |
| L88「`WorldPage.tsx` 仍传入 `active={screen === null}`，阅读态场景会停绘，因此雨持续播放也仍是待办，静态雨景截图不证明它已实现」 | **已过期**：现为 `active={screen === null \|\| screen === 'timeline'}`，雨不停播已由 turn-implementation.md 落地；改写为「已由 turn-implementation.md 接续」 |
| L90「本轮未部署、未提交，也未修改 `.claude/`」中的 `.claude/` 部分 | 与当前文档读者无关的执行期声明；未部署未提交保留在顶部 |

## 改正清单

1. 原 L88 的「雨持续播放仍是待办」在 2026-09-18 审计中被证实过期（`src/pages/WorldPage.tsx:439`）。压缩稿改为「已由 turn-implementation.md 接续」，不再声称待办。
2. 原文把「下一轮再做」与「仍待办」混在一句；压缩稿区分为「已接续（翻页/连翻/雨不停播）」与「仍待办（拿起/收回、羽毛笔交互）」，与 `ai/TODO.md` L90 一致。

## 待核清单

- 采样明度（187.38 / 190.29 / 62.58 等）与「12 / 18 / 28 / 12 页」「1040×669.98」等实测值只能由 `book-verification/results.json`、`pixel-samples.json` 佐证，本次未重跑脚本，按原文转录。
- 「WOFF2 5,269,840 字节」已用 `ls -l public/fonts/journal/` 核实一致。
- 所有 CSS 数值已逐条对照 `src/themes/cinnaglass/journal-room.css`（L13/14/50/78-81/101/121/135/136/139/178/194/417/456/472/550）与 `public/ui/journal/manifest.json`，全部一致，无需改正。

## 例外说明

exception = true。压缩到 72.4% 即为保真下的最小体积：剩余内容中约 2.1 KB 是不可删的数值契约（材质/版式/实测尺寸/采样三表），约 1.6 KB 是验证结论与其有效性限定（「不是逐像素相同」「未写入共享数据库」「不等于全项目构建通过」），约 0.9 KB 是资产真源表与用户决定原句。再压只能删数值或删限定句，违反「不能删关键数值」「同一事实只留一个权威正文（本文即数值与验证的权威）」。

## 原文对一次性截图的引用

无。原文只引用 `real-memories.png`、`design-content-night.png`、`book-comparison.png`、`alpha-review.png`、`pixel-samples.json`、`results.json`，均在保留名单内；未引用 `failure.png`、`design-system.png`、`first-real.png`、`real-*.png`、`book-*.png` 等待清理产物，压缩稿也未新增。

## 锚点

全仓 grep `book-implementation.md#` 零命中（入向引用只有文件级：`ai/TODO.md:88`、`ai/Features/timeline.md:25`、`ui-system.html:1358`）。压缩稿仍保留 `## 1..4` 编号标题结构，不影响任何现有链接。
