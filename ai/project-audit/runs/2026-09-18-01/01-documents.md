# 第一步：文档、冗余文件与目录整理

2026-09-18～19。运行 `2026-09-18-01`，分支 `dev`，基线 `3fd52a5`。授权：用户指令「完成 audit 第一步」，按技能第一步定义执行；受保护范围（`CLAUDE.md`、`AGENTS.md`、`.claude/`、`.agents/`、`ai/sessions/`、`.env*`）未改，未推送。

## 结论与完成状态

**第一步已交付，全项目静态范围已审**：587 个可枚举文件全部有责任子步骤与人工/程序核验记录（`coverage.csv` 593 行含 54 个删除前记录与 6 个本轮新建审核文件，状态全部「已检查」）。执行了三类改动：

| 改动 | 数量 | 说明 |
| --- | ---: | --- |
| 删除冗余文件 | 55 个 / 59.7MB | 全部零消费者且可由 git 基线 `3fd52a5` 恢复；清单 [evidence/deleted-files.txt](evidence/deleted-files.txt) |
| 活文档压缩/改写 | 16 份适用文档 216,820 → 147,235 bytes（−32.1%），行数 1,963 → 1,486 | 3 份达到 ≤2/3；13 份为有据例外（见「文档压缩」表）；全部 115 份 Markdown 合计 933,202 → 849,504 bytes |
| 短文档陈旧陈述修正 | 10 份 | 只修事实与链接，不为凑比例裁剪 |

**这是文件体积，不是模型 token 实测**；未做运行时性能与线上 Supabase 复核（第四步/待办）。中、低置信的删除候选与策略性重复（约 130MB）未动，作为 [FINDINGS](../../FINDINGS.md) PA-007～PA-013 交用户决定。

## 基线、全项目覆盖与限制

| 项 | 值 |
| --- | --- |
| 可枚举文件 | 基线 587（文本 240、二进制 347，463.7MB）→ 完成后 539（404.0MB） |
| 遍历前排除 | `.git`、`.claude`、`.agents`（受保护技能目录，仅目录级 diff）、`ai/sessions`（手动存档，只列路径）、`ai/project-audit/runs`（本轮输出）、`.idea`（IDE 本地目录，被 gitignore）、`__pycache__`（缓存；其中 1 个被跟踪的 `.pyc` 清单漏收，本轮已删并记 PA-022） |
| 覆盖 | 5 个分区 + 审核支撑文件：root 73、src 64、ai-core 20、design 246、batches 184、audit 6；文本文件全文阅读 + grep 引用面，二进制按元数据（尺寸/sha256/git 入库）+ 消费者引用；`src/` 另经 `tsc` 全量类型检查 |
| 精确重复候选 | 45 组 → 41 组（删除 `ui-concepts/` 后）；其余为 codex-visual ↔ 设计系统/arts/public 的策略性双份（PA-009） |
| 链接线索 | 4 → 0 条真实断链（`timeline.md` 的 sql 链接、arts 副本报告的 3 张 review 图均已修）；剩余 1 条是 INDEX 指向本轮生成的 `coverage.csv`（已存在） |
| 活文档快照 | [evidence/before.zip](evidence/before.zip)：115 份 Markdown（933,202 bytes）；`ai/sessions` 文件在 zip 内文件名编码异常，度量 CSV 中显示为 deleted，实际未动 |
| 工具版本 | node v22.23.1、pnpm 10.22.0、python 3.14.6；`pnpm install --frozen-lockfile` 成功 |

限制：图片未逐像素目视；`scripts/check-*.mjs` 等浏览器脚本未运行（依赖外部 `DIARY_NODE_MODULES`）；线上 Supabase 未连（令牌失效，文档自述）；`.claude/`、`.agents/` 只做目录级比较。清单与指标：[baseline](metrics/baseline/)、[after](metrics/after/)、[coverage-summary.json](metrics/coverage-summary.json)。

## 本步骤调研与适配结论

| 查询 | 检索日期 | 来源标题和 URL | 来源版本 | 可核验的结论 | 适用前提 | 本项目证据 | 采纳/不采纳及理由 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vite public 目录契约 | 2026-09-18 | [Static Asset Handling · The public Directory（v7.3.1 文档源）](https://raw.githubusercontent.com/vitejs/vite/v7.3.1/docs/guide/assets.md)；站点 [vite.dev/guide/assets](https://vite.dev/guide/assets) 当前显示 v8.3.0 | 7.3.1 | `public/` 内资源以根绝对路径引用，构建时**原样复制到 dist 根**，不经哈希与依赖图；非必要优先 import | Vite 项目、默认 `publicDir` | vite ^7.3.1；`src/` 用 `/rooms/...`、`/ui/...` 等字面量；`vite.config.ts` 未改 `publicDir` | 采纳：判定 public 文件是否在用须查根路径字面量与拼接；据此确认 `public/mock/couple-feed.json` 零消费者 |
| pnpm 依赖补丁 | 2026-09-18 | [pnpm patch / patch-commit（10.x）](https://pnpm.io/10.x/cli/patch) | pnpm 10.x（本机 10.22.0） | 补丁默认写到 `patches/` 并在 `patchedDependencies` 登记相对路径，安装时应用 | pnpm 10 | `pnpm-workspace.yaml` 登记 `page-flip@2.0.7`；`src/` 仍依赖 page-flip（仅死文件 journal-book.tsx） | 采纳：`patches/` 是安装契约，随 page-flip 去留一起决定（PA-008），本轮保留 |
| 文档维护原则 | 2026-09-18 | [Google Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html) | 当前 | 最小可行文档、随代码更新、**删除死文档**、链接而非复制 | 通用 | `README.md` 描述不存在的 `todos.service.ts`；唱片机管线在 4 份文档重复 | 采纳：作为压缩与单一权威正文的依据；具体事实以源码与项目协议（`AGENTS.md` 对 PROJECT/TODO 的分工）为准 |
| 已跟踪文件与 .gitignore | 2026-09-18 | [git gitignore 文档](https://git-scm.com/docs/gitignore) | git 2.55.0 | 「Files already tracked by Git are not affected」；停止跟踪用 `git rm --cached` | 通用 | `*.blend1`、`__pycache__/` 规则晚于文件入库，两文件仍被跟踪 | 采纳：两文件 `git rm`，规则本身不改 |
| Blender 版本备份文件 | 2026-09-18 | [Blender Manual 源 · Save & Load › Save Versions](https://projects.blender.org/blender/blender-manual/raw/branch/main/manual/editors/preferences/save_load.rst)（`docs.blender.org` 被 Cloudflare 校验拦截，改读手册源仓） | main | 「Number of versions created (for backup) when saving newer versions of a file.」备份以 `.blend1`、`.blend2` 存于同目录 | Blender 保存行为 | `arts/meshes/scene.blend1` 与 `scene.blend` 同目录，无引用 | 采纳：`.blend1` 是保存时的上一版备份，非源文件，删除 |

官方文档描述的是契约（Vite 复制规则、pnpm 补丁应用、git 跟踪语义、Blender 备份命名），Google 原则是方法建议，用于校准而不覆盖项目协议。

## 已讨论方案、授权和取舍

- **执行边界**：只删「零消费者 + 可再生或明确死文件 + 非用户近期刻意决定」的项；涉及用户 2026-09-12/13 刚整理的目录决定（codex-visual 双份、验证截图存档）、有意保留的历史实现（page-flip 链）、3D 源文件、第三方字体源，一律不删，给出具体方案由用户决定。
- **TODO 已完成条目不删除**：`AGENTS.md` 规定 TODO 跟踪待办与已完成条目并打 `[x]`，与技能「删除已完成历史」冲突时以项目协议为准——`[x]` 各压成一行 + 细节所在文档，完成段里的未决子条件提升为独立 `[ ]`。
- **唱片机管线三处重复的权威位置**：`ai/design_system/research/living-props.md` 承接为唯一技术正文（因此它由 5.1KB 增至 9.7KB），PROJECT 技术栈缩为一段摘要 + 链接，TODO 五轮压成一行结论；全仓净减少。
- **短文档不为凑比例裁剪**：25 份 2026-09-12/13 刚整理的设计文档逐份全文核对，19 份为例外保留，6 份只修陈旧陈述；`ai/reboot/`、`cinnaglass-history/`、codex-visual 报告为冻结原件不改（仅在 `journal-room-object/codex-report.md` 顶部加归档说明，`arts/` 副本报告修 3 个断链）。
- **工作流失败的应对**：并行 agent 两轮因账户额度/会话上限中断，分区 review 文件已落盘则直接复用，覆盖 CSV 按 review 判定表程序化补齐；原计划「每候选两名反驳者」改为分区核验 + 审核脚本复核引用面（区分脚本写入侧与读取侧命中），只执行高置信项。

## 发现与证据

发现按稳定 ID 登记在 [FINDINGS.md](../../FINDINGS.md)：已处理 PA-001～006，待用户决定 PA-007～013，待第二步及后续 PA-014～022。每条附证据等级与所在分区 review 的定位。分区 review：[root](evidence/root-review.md)、[src](evidence/src-review.md)、[ai-core](evidence/ai-core-review.md)、[design](evidence/design-review.md)、[batches](evidence/batches-review.md)；短文档例外复核与两份完整结构化返回在 [workflow-structured-results.json](evidence/workflow-structured-results.json)；技能目录漂移 [skills-dir-drift.txt](evidence/skills-dir-drift.txt)。

### 文档压缩（16 份适用文档，UTF-8 bytes）

| 文档 | 前 → 后 | 比例 | 达标 / 例外理由 |
| --- | ---: | ---: | --- |
| `ai/Features/timeline.md` | 53,433 → 20,273 | 37.9% | 达标；20 条对照源码的事实改正（rooms.ts→worlds.ts、RPC 参数、FeedPost 字段、ST-H 已完成等），三套已否决视觉压入 §七 |
| `ai/Features/chat.md` | 13,365 → 8,885 | 66.5% | 达标；ChatDock/sidebar 已退役内容删净，8 条改正 |
| `ai/Features/ui-system/audit.md` | 17,724 → 11,815 | 66.7% | 达标；17 处 `文件:行` 重核并修正（materials.css:18–75 超界等） |
| `ai/Features/ui-system/ui-system.md` | 20,753 → 14,649 | 70.6% | 例外：余量为 A/B/C 定义、M1–M6 闸门、验收矩阵与强制规则；§2.1 机制表已改为链接 |
| `ai/Features/supabase.md` | 9,028 → 7,047 | 78.1% | 例外：三/四章顾问发现被 TODO 引用为待办正文，二章全为未决决策；7 条改正（Realtime/Edge Function 已启用等） |
| `ai/Features/navigation-glass.md` | 2,660 → 2,613 | 98.2% | 例外：24 行机制事实权威正文，无流水可删 |
| `ai/PROJECT.md` | 23,468 → 17,611 | 75.0% | 例外（审核直接改写）：PRD、数据库临时真源、Brain Dump、结构树为协议要求内容；改正标签池、结构树、types 矛盾、rapier 残留、reboot 时点 |
| `ai/TODO.md` | 22,714 → 15,312 | 67.4% | 差 170 bytes：`[x]` 按协议保留为一行制；五轮唱片机流水压成一行；死文件与 rapier 清理项更新 |
| `ai/design_system/uiux/interaction.md` | 8,940 → 7,839 | 87.7% | 例外：入口地图与 12 条反模式为唯一契约；旧动效表压成一行，3 条改正（STYLE §8、商店标签、音效零实现） |
| `ai/design_system/uiux/cinnaglass/ui-system.md` | 5,008 → 4,566 | 91.2% | 例外：2026-09-13 刚整理，4 个被锚点引用的标题与 20 条来源链接不可删 |
| `.../journal-room-object/book-implementation.md` | 8,415 → 6,094 | 72.4% | 例外：数值契约与验证限定；改正「雨仍待办」过期句 |
| `.../journal-room-object/navigation-implementation.md` | 8,013 → 5,996 | 74.8% | 例外：三档材质/尺寸数值权威正文 |
| `.../journal-room-object/turn-implementation.md` | 9,237 → 7,386 | 80.0% | 例外：翻页时值/加载契约规则条款 |
| `ai/design_system/research/art-relighting.md` | 6,909 → 5,257 | 76.1% | 例外：两条资产路线与 5 条未决问题；改正 `lighting-layers/` 路径与 Windows 本机路径 |
| `ai/design_system/research/living-props.md` | 5,122 → 9,728 | 189.9% | 有意增长：承接 PROJECT/TODO 的唱片机管线细节成为唯一正文；4 条改正（`circleFromBase()` 不存在→`discHomography`、9s/圈、弹簧 lift） |
| `README.md` | 2,031 → 2,164 | 106.5% | 重写而非压缩：模板残留全删，改为项目入口 |

逐文档 SHA 与非空白字节：[documents.csv](metrics/documents/documents.csv)、[documents-summary.json](metrics/documents/documents-summary.json)、[完整差异](metrics/documents/documents.diff)。每份委派压缩的保留/删除/改正清单：`evidence/ledger-*.md`。未验证的断言各 ledger 已列（多为需线上或重跑脚本的数值）。

### 测试与 CI 成本

本项目无单元/集成测试、无 `.github`、无 CI，此项**不适用**。12 个 `scripts/` 脚本已按类型/输入/输出/依赖/端口/可运行性登记（[root-review.md#scripts](evidence/root-review.md#scripts)）：唯一零依赖可直接运行的是 `check-design-system.mjs`；9 个 `.mjs` 借用外部 `DIARY_NODE_MODULES`，2 个 `.py` 无 requirements；`check-journal.mjs` 绑定已退役 page-flip 引擎（随 PA-008 处置）。本轮未删除任何脚本，未测量耗时（无 CI 可比）。

## 已执行改动（文件路径、改动目的、原因与 commit 定位）

实现以本步 commit 为准（主题 `chore: project-audit step 1 - prune redundant files and compress living docs`），报告不贴 diff。

- **删除 55 文件**（[清单](evidence/deleted-files.txt)）：`arts/meshes/scene.blend1`、`codex-visual/20260811-055917Z/__pycache__/*.pyc`（gitignore 冲突）；`codex-visual/20260906-192932Z/deps/.lock`（0 字节缓存）；`timeline_3d_posts.html`、`src/types/database.ts`、`public/mock/couple-feed.json`（死文件，TODO/PROJECT 已定性）；`ai/design_system/uiux/research/cinnaglass-history/ui-concepts/`（与 `navigation-concepts/` 逐字节相同）；`research/art-relighting-preview/` 12 张纹理 + `rain-layer-strength.png`（`index.html` 同参数再生成）；5 张 `failure.png`/`design-system-turn.png`（脚本失败分支残留）；`turn-verification/` 27 个选帧与 32 字节结果（脚本一条命令再生，GIF 为正式证据）。
- **改写**：`README.md`（模板残留 → 项目入口）；`ai/PROJECT.md`、`ai/TODO.md`（审核直接压缩并改正陈旧事实）；14 份 Features/设计文档（委派压缩，见上表）。
- **修正**：`ai/STYLE.md`、`ai/UX.md` 补旧章节对应表；`scene.md`（模板无音景字段）、`effects.md`（不自动播放 ≠ 默认静音；音景仅目标）、两份 `production-batches.md`、`visual-principles-2026-09-12.md`（不再以已成桩的 STYLE 为依据）、`prompts.md`（参考图路径）、`cinnaglass-history/README.md`（去掉重复目录）、`journal-room-object/codex-report.md`（顶部归档说明）、`arts/rooms/study/generated/20260906-192932Z/codex-report.md`（3 个 review 图链接指回原批次）。
- **新建**：`ai/project-audit/`（INDEX、STEPS、FINDINGS、EXTRA-STEPS、`.gitattributes`、3 个复用脚本、本轮 run 目录）。

## 验证（命令目的、结果、失败归因与未验证项）

| 命令 / 检查 | 目的 | 结果 |
| --- | --- | --- |
| `python3 ai/project-audit/scripts/inventory.py`（前/后） | 全仓清单、重复、链接线索 | 587 → 539 文件；重复组 45 → 41；真实断链 4 → 0 |
| 删除前逐项 grep（含 CSS `url()`、HTML `src`、manifest、脚本读取侧） | 确认零消费者 | 55 项零读取侧引用；`failure.png`/`prototype-results.json` 仅命中脚本写出分支 |
| `node scripts/check-design-system.mjs`（基线 / 完成后） | 设计系统 Markdown/HTML 链接、锚点、图文 | 58 文档 374 链接 0 失败 → 57 文档 389 链接 0 失败 |
| 压缩稿安装前脚本核验 | 相对链接与锚点解析、入向锚点保留 | 16 份全部通过；`cinnaglass/ui-system.md` 4 个入向锚点、`audit.md` 2 个、`ui-system.md#6` 均保留 |
| `pnpm exec tsc -b`（基线 / 完成后） | 删除 `database.ts` 是否引入新错误 | 前后均只有既有 1 个错误（`chat-card.tsx:10` `Msg`），无新增 |
| `pnpm exec eslint .`（基线 / 完成后） | lint 回归 | 前后均 1 错 2 警（`music.tsx:9` 等既有） |
| `pnpm exec vite build` | 生产打包（不经 tsc） | 通过（`✓ built in 2.16s`，chunk 体积提示为既有） |
| `git diff --check` | 空白错误 | 通过 |
| `measure-docs.py` / `merge-coverage.py` | 文档度量、覆盖合并（责任唯一、修改后复读版本一致） | 16 份适用文档度量完成；593 行覆盖全部「已检查」 |

未验证：浏览器脚本（`check-*.mjs`）与 Python 装配脚本未运行；线上 Supabase 结构；模型 token 实测；删除的选帧/纹理是否能一键再生只核了脚本源码的写出路径，未实际重跑。

## 建议、待办和下一步

1. **需要用户决定**（FINDINGS PA-007～013）：3D 源文件去留、page-flip 历史链时点、codex-visual 与设计系统/arts 双份策略（三选一）、约 48MB 验证截图存档、13.9MB 字体源、技能目录双套漂移（须经 `skill-creator`）、`Features` 目录命名。
2. **第二步承接**（PA-014～017）：移除 `@react-three/rapier` 与 `vite.config.ts` 残留块并 `pnpm install && pnpm build`；修 `chat-card.tsx` `Msg` 导入与 `music.tsx` lint；按 [src-review.md](evidence/src-review.md) F5 表更新 20 余处失效注释引用；`scripts/` 登记表与 `check:design` npm script。
3. **UI Tailor**（PA-018）：`ui-system.html` 组件表陈旧项与 `decisions-v2.md` 引用标注，在 M1 前修正。
4. **下轮审核工具**（PA-022）：`inventory.py` 单列「被忽略规则命中但仍被跟踪」文件；覆盖 CSV 由 agent 先写文件再返回。
5. 第二步开始前重新调研（结构/依赖/注释的官方约定），不继承本步问题列表作为范围。
