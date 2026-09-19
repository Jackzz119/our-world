# STEPS — 审核子步骤

## 第一步 · 蓝图版本 v1 · 运行 `2026-09-18-01`

阶段目标与适用范围：整个项目（587 个可枚举文件，不含 `.git`/`.claude`/`.agents`/`ai/sessions`/本轮审核输出），重点检查 `ai/` 上下文。判定每个文件的用途、使用者、权威性、引用与生命周期；清理证据充分的冗余；活文档逐份压缩；目录职责与命名核对。代码边界与依赖方向留给第二步。

阶段报告链接：[runs/2026-09-18-01/01-documents.md](runs/2026-09-18-01/01-documents.md)

技能来源：`/Users/chengzheng/Desktop/Files/hyber_platform/hyber-operator-portal/ai/jaSkill/project-audit/`（SKILL.md、reference.md）。本项目内未安装该技能，本轮按技能正文执行，不复制技能本体进仓。

| ID     | 目标 / 范围                                                                                                              | 依赖 / 方法                                                                                                   | 产出 / 验收                                                                                   | 状态   |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| 01-S01 | 基线：分支/提交、工作区、版本、全仓清单、活文档快照                                                                       | 无；`inventory.py`、`git ls-files`、`before.zip`、`run-meta.json`                                              | `metrics/baseline/`、`evidence/before.zip`；排除目录逐项列出                                   | 完成：587 文件清单、45 组重复、4 条链接线索；`run-meta.json`；tsc/eslint/链接检查基线 |
| 01-S02 | 本步真实调研：Vite 7 public 目录契约、pnpm patch 机制、文档维护原则、Blender 版本备份文件                                 | 无；打开官方原文核对实际版本（Vite 7.3.1、pnpm 10.22、Blender 手册）                                           | 报告「调研」表：查询/日期/URL/版本/结论/本项目证据/采纳                                        | 完成：5 条一手来源（Vite 7.3.1 源、pnpm 10.x、Google docguide、git 2.55、Blender 手册源仓） |
| 01-S03 | 根配置、`scripts/`、`sql/`、`patches/`、`public/`、`index.html`、根 HTML、README：用途、消费者、引用、生命周期            | S01；全文读自有文本；public 二进制按消费者引用与元数据核验                                                     | `evidence/root-review.md` + `root-coverage.csv`；未被引用的 public 资源与陈旧 README 有证据     | 完成：73/73 已检查；12 项发现、6 个删除候选 |
| 01-S04 | `src/` 64 文件：文件级用途、死文件、错位文件、注释中失效的文档引用（不评代码质量）                                        | S01；全文读                                                                                                    | `evidence/src-review.md` + `src-coverage.csv`                                                  | 完成：64/64 全文 + tsc；2 个死文件、20+ 处失效注释引用 |
| 01-S05 | `ai/` 核心文档（PROJECT/TODO/Features/reboot/STYLE/UX/blender）用途、权威关系、跨文档重复地图、陈旧陈述；`ai/sessions` 仅列 | S01；全文读并对照源码                                                                                          | `evidence/ai-core-review.md` + `ai-core-coverage.csv`                                          | 完成：20/20；重复地图、14 条陈旧陈述、12 项发现 |
| 01-S06 | `ai/design_system/` 全部 Markdown/HTML/JSON 与验证截图：引用关系、孤儿素材、历史与当前的边界                              | S01；文本全文读，图片按引用与元数据                                                                            | `evidence/design-review.md` + `design-coverage.csv`                                            | 完成：246/246（68 文本全文、178 二进制元数据+引用）；114 张零引用图分级 |
| 01-S07 | `codex-visual/`、`arts/`：原始批次内容、与设计系统/`public`/`arts` 的重复、批次内脚本与杂项、体积与生命周期                | S01；报告与脚本全文读，图片按哈希/引用                                                                          | `evidence/batches-review.md` + `batches-coverage.csv`                                          | 完成：184/184；子任务中断后 CSV 按 review 判定表程序化补齐；11 项发现 |
| 01-S08 | 活文档逐份压缩（目标 ≤ 原文 2/3）与保真/准确性对抗验证                                                                    | S01（快照）；每份先核对源码事实，再压缩；两名独立验证者分别查「保真」与「准确」，不过则修复后复验                | 压缩稿与逐份 ledger；`measure-docs.py` 指标；例外逐项说明                                        | 完成：见阶段报告「文档压缩」表与 `evidence/ledger-*.md`；PROJECT/TODO 由审核直接改写并自核 |
| 01-S09 | 近期整理过的短文档例外复核：只修陈旧陈述，不为凑比例裁剪                                                                  | S05/S06 发现                                                                                                   | 例外清单与理由；修正清单                                                                        | 完成：25 份短文档全文核对，19 份例外保留、6 份只修陈旧陈述 |
| 01-S10 | 删除候选对抗核验（静态引用 / 构建配置 / 人工流程与文档链接两条线）并执行已确证项，修复断链                                 | S03–S07；每个候选两名独立反驳者                                                                                | 删除清单：路径、用途判定、引用证据、权威源、恢复依据（提交）、验证                                | 完成：55 项确证删除（两分区独立核 + 审核复核引用面，替代原计划的两名反驳 agent）；中/低置信项转 FINDINGS 待用户决定 |
| 01-S11 | 测试与 CI 成本审核：本项目无单测/CI；登记 `scripts/check-*.mjs` 等人工验证脚本的保护对象、依赖与可运行性                   | S03                                                                                                            | 报告「测试与 CI」节；不适用项说明                                                                | 完成：无测试/CI，12 个脚本登记表见 `evidence/root-review.md#scripts` |
| 01-S12 | 指标、覆盖合并（`merge-coverage.py`）、链接与设计系统图检查、类型检查、阶段报告、独立 commit                              | S08–S11                                                                                                        | `coverage.csv`、`metrics/`、`01-documents.md`、`FINDINGS.md`、commit SHA                          | 完成：commit `f7a151a` |
| 01-S13 | 用户对 PA-007～013 裁决后的执行：3D/page-flip 删除、codex-visual 重整入 `ai/`、public 只留运行时文件、旧截图清理、技能目录对齐、`ai/features` 改名 | 用户 2026-09-19 决定；程序化改链接 + 全仓链接/构建复验                                                       | 报告「用户决定后的执行」节、FINDINGS 状态更新、第二个 commit                                         | 完成：见报告 |

### 本阶段复盘（v1 → v1.1）

- **并行 agent 的可靠性**：第一轮工作流因账户额度耗尽全部失败，第二轮 5 个分区 agent 在写完 review 后才因会话上限中断（结构化返回丢失，文件已落盘）。改进：让 agent **先写文件再返回**（本轮已如此，救回全部 review）；覆盖 CSV 由程序按 review 判定表补齐，不重跑。
- **两名反驳者 × 每候选**在额度受限时不可行；改为「分区 agent 引用面核验 + 审核用脚本复核 grep（含写入侧/读取侧区分）」，只执行高置信项，中/低置信项进 FINDINGS 待用户决定。
- **压缩前必须 grep 锚点与入向引用**（本轮 `cinnaglass/ui-system.md` 四个锚点、`timeline.md` 零锚点），否则易断链。
- **写入侧命中不是引用**：`failure.png`、`prototype-results.json` 被脚本 catch/写出分支命中，需人工区分读取与写入。
- **PROJECT/TODO 由审核直接改写**比委派更快，因为审核已读完全文并掌握跨文档重复地图；其余文档委派后审核用脚本核标题/链接/关键契约。
- 下轮：`inventory.py` 需单列「被忽略规则命中但仍被跟踪」的文件；`measure-docs.py` 的适用清单外置已生效。

## 可复用工具（Python3 标准库）

| scripts/ 下文件   | 用途 / 调用参数                                                                                                                                                                    | 来源与验证                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| inventory.py      | 全仓清单、精确重复候选、Markdown 本地链接线索；`python3 ai/project-audit/scripts/inventory.py --root . --output <dir> --exclude ai/project-audit/runs`；`.git/.claude/.agents/node_modules/__pycache__` 与 `ai/sessions` 在遍历前剪枝 | 复用自 hyber-operator-portal 审核目录，未改；本轮 2026-09-18 真实输入运行通过     |
| merge-coverage.py | 合并 `evidence/*-coverage.csv` 与前后清单为 `coverage.csv`，要求每个路径责任唯一且已读版本与最终快照一致；`--run <dir> [--step 01]`                                                | 复用自 hyber-operator-portal，未改；本轮合并时验证                              |
| measure-docs.py   | 对照 `before.zip` 逐文档 bytes/行/非空白与精确 diff；`--root . --before <zip> --applicable <list> --output <dir>`；适用清单外置为文件，不写死路径                                     | 按本项目改写（适用清单参数化）；本轮真实输入验证                                 |
