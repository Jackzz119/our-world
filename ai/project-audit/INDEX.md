# PROJECT-AUDIT — 当前审核入口（交接用）

> 新会话续接审核：先读本文，再读 [STEPS.md](STEPS.md) 的当前阶段与 [FINDINGS.md](FINDINGS.md)，按需再打开各 run 的报告与证据；不要重读全部历史报告。

## 现在在哪

- **第一步（文档/冗余文件/目录）已结束**：commits `f7a151a`、`5e6652a`、`a9f7cfa`，已推送。
- **第二步（结构/复用/注释/格式化 + 用户批准的全部重构）已交付**：commits `dc74f51` → `365b0aa`（9 个，**本地未推送**，`dev` 领先 `origin/dev` 9）。
- **下一步 = 第三步「协议、后端与前端深度 review」**，尚未开始；之后是第四步（性能：先静态分析再真实运行 profiler）→ 拓展（[EXTRA-STEPS.md](EXTRA-STEPS.md) 当前无启用项）→ 第五步（AI 上下文与 token 成本收尾）。

## 技能与运行方式

技能本体已随仓库提供：`.claude/skills/project-audit/`（Claude）与 `.agents/skills/project-audit/`（Codex，内容相同）——`SKILL.md`、`reference.md`、`references/{context,performance}.md`；来源为 hyber-operator-portal 的 `ai/jaSkill/project-audit/`（2026-09-19 复制，此后以本仓副本为准，改技能须用户同意）；每一步按技能「共用流程」：刷新基线 → 上网核对官方原文（写调研表）→ 全域诊断并给具体方案 → 授权内落实 → 验证 → 独立 commit 交付。每步全项目范围重新成立，不继承上一步问题列表。

运行目录约定：新一步新建 `runs/<日期-序号>/`，报告命名 `0N-<主题>.md`；`STEPS.md` 先拆子步骤再执行；发现进 `FINDINGS.md`（稳定 ID，已到 PA-033）；可复用脚本在 `scripts/`（见 STEPS「可复用工具」：`inventory.py`、`merge-coverage.py`、`measure-docs.py`、`scan-structure.mjs`、`verify-comment-only.mjs`）。

## 项目画像（2026-09-19 核实）

| 维度      | 事实                                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 类型      | Web 单页应用「双人放置陪伴小屋」，R1 网页 MVP 阶段                                                                                                                                                                                                                              |
| 技术栈    | React 19、TypeScript 5.9、Vite 7.3.1、React Router 7、PixiJS 8、Supabase JS 2.98；pnpm 10.22；Prettier 3.8；ESLint 9 flat                                                                                                                                                       |
| 源码      | `src/` 约 95 文件 14.9k 行：`pages/`（+`world/` hooks）→ `themes/cinnaglass/{room,shell,journal,surfaces,chat}` + 平铺弹窗 → `hooks/ lib/ types/ utils/`；0 循环依赖；`tsc -b` 零错误；`eslint` 1 条既有警告（`room-scene.tsx` 的 disable 指令，删掉会触发 react-hooks 新规则） |
| 结构规范  | [CONVENTIONS.md](CONVENTIONS.md)（分层、命名、复用/拆分、注释、格式化、脚本依赖）                                                                                                                                                                                               |
| 测试 / CI | 无单测、无 CI；`scripts/check-*.mjs` 为人工浏览器验证脚本，依赖外部 `DIARY_NODE_MODULES`（playwright/sharp），dev 地址 `JOURNAL_URL` 默认 5173                                                                                                                                  |
| 后端      | Supabase（auth / Postgres / Storage / Realtime Broadcast from Database）；schema 迁移历史不在仓库；`SUPABASE_ACCESS_TOKEN` 失效，MCP 连不上（TODO 继承待办）                                                                                                                    |
| 本机限制  | **无 `.env.local`**，应用进不了世界：第二步的重构等价性靠 tsc / AST / 帧像素 / 计算样式 dump / 纯函数断言证明，运行时冒烟只到 `/login`。第三、四步若要真实运行，需要用户提供 Supabase 会话                                                                                      |
| 文档      | `CLAUDE.md`/`AGENTS.md` 协议（受保护）；`ai/PROJECT.md`、`ai/TODO.md`（任务唯一来源）、`ai/features/`、`ai/design_system/`（常驻设计 Markdown）、`ai/reboot/`（归档）、`ai/codex-visual/`（codex-visual 技能比稿归档）、`ai/sessions/`（手动会话存档，不自动读）                |
| 技能目录  | `.claude/skills` 与 `.agents/skills` 正文已对齐，仅 Codex 显示元数据 `agents/openai.yaml` 留在 `.agents`                                                                                                                                                                        |

## 第三步开工时要知道的

- 授权边界：第三步默认**只交付诊断、重构建议与验收待办**，不改业务行为；用户要求实施时再动。
- 已知待核的协议/行为线索（来自前两步，勿当结论）：`ReactionRow.channel_id` 幻列对应的线上 DDL；`world-settings` 弹窗无 UI 入口、`settings.tsx savePw` 假成功（已记 `ai/TODO.md` Bugs）；`room-scene.tsx` render 期改 ref；`friendships`/DM 数据层冻结；`worlds` 外键 `ON DELETE CASCADE` 等 Supabase 审计遗留（`ai/features/supabase.md` §三/四）；`ai/PROJECT.md` 数据库表是「临时真源」（前端 select 反查，未核线上）。
- 第二步留给用户的产品决定：`image-slot.js` 是否换 React 头像选择器（会丢 reframe 交互与 `ow-image-slots-v1` 旧数据）。
- 下次有 Supabase 会话时的运行时验收清单：进世界、Enter 唤聊天、点五个家具热点、翻日记、改世界设置看纪念卡与日历同步、窄卡收贴纸。

## 各步报告

- 第二步：[报告](runs/2026-09-19-01/02-structure.md)、[覆盖](runs/2026-09-19-01/coverage.csv)、[结构指标前/后](runs/2026-09-19-01/metrics/)、分区审阅与落实/重构日志 `runs/2026-09-19-01/evidence/`
- 第一步：[报告](runs/2026-09-18-01/01-documents.md)、[覆盖](runs/2026-09-18-01/coverage.csv)、[文档指标](runs/2026-09-18-01/metrics/documents/)、[证据](runs/2026-09-18-01/evidence/)

## 报告约定

阶段 review 只列文件路径、改动原因、验证与结论，实现以 commit 为准，不贴源码或完整 diff。CSV/JSON 是按需查询的运行证据；第五步清理一次性数据，长期保留精简 review、执行摘要、子步骤迭代经验与有明确下轮用途的脚本/基线。稳定待办仍以 `ai/TODO.md` 为准，普通开发不需要加载审核证据。
