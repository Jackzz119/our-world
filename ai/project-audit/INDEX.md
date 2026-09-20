# PROJECT-AUDIT — 当前审核入口（交接用）

> 新会话续接审核：**第 0 步先自举**——刚拉下来的仓库没有根 `CLAUDE.md` / `AGENTS.md` 与 `.claude/skills`（gitignore），运行 `bash ai/jaSkills/custom-skill/scripts/sync-worktree.sh`（不依赖 shelf）生成协议与技能链接，然后从头读 `./CLAUDE.md` 与 `ai/PROJECT.md`「开工红线」；技能未被本会话自动发现时直接读 `ai/jaSkills/project-audit/SKILL.md` + `reference.md` 按其执行。之后读本文、[STEPS.md](STEPS.md) 当前阶段与 [FINDINGS.md](FINDINGS.md)，按需再打开各 run 的报告与证据；不要重读全部历史报告。
>
> Windows 机器注意：`sync-worktree.sh` 的 `ln -s` 在 MSYS 下会**复制目录**而不是建链接，`.agents/skills` 需用 `cmd /c mklink /J .agents\skills <绝对路径>\ai\jaSkills` 补成 junction（2026-09-19 实测）。

## 现在在哪

- **第一步（文档/冗余文件/目录）已结束**：commits `f7a151a`、`5e6652a`、`a9f7cfa`，已推送。
- **第二步（结构/复用/注释/格式化 + 用户批准的全部重构）已交付并推送**：commits `dc74f51` → `365b0aa`；其后 `055db5c`..`f96fc63` 为技能/协议体系复刻与交接文档，不属于审核步骤。
- **第三步（协议、后端与前端深度 review）已交付——静态范围已审，只有诊断与建议，未改源码**：运行 `2026-09-19-02`，基线 `f96fc63`，报告 [runs/2026-09-19-02/03-protocol-review.md](runs/2026-09-19-02/03-protocol-review.md)，发现 PA-034～053（P1 九条）。commit 主题 `docs: audit step 3 protocol, backend and frontend review`。
- **下一步 = 用户裁决 P1 实施 + 运行时验收 → 第四步（性能：先静态分析再真实运行 profiler）** → 拓展（[EXTRA-STEPS.md](EXTRA-STEPS.md) 当前无启用项）→ 第五步（AI 上下文与 token 成本收尾）。

## 技能与运行方式

技能本体在唯一正本 `ai/jaSkills/project-audit/`（`.claude/skills`、`.agents/skills` 为指向 `ai/jaSkills` 的链接，货架 `skills/project-audit` 记账于 `.shelf.json`）——`SKILL.md`、`reference.md`、`references/{context,performance}.md`；来源为 hyber-operator-portal 的 `ai/jaSkill/project-audit/`（2026-09-19 复制，此后以本仓副本为准，改技能须用户同意）；每一步按技能「共用流程」：刷新基线 → 上网核对官方原文（写调研表）→ 全域诊断并给具体方案 → 授权内落实 → 验证 → 独立 commit 交付。每步全项目范围重新成立，不继承上一步问题列表。

运行目录约定：新一步新建 `runs/<日期-序号>/`，报告命名 `0N-<主题>.md`；`STEPS.md` 先拆子步骤再执行；发现进 `FINDINGS.md`（稳定 ID，已到 PA-053）；可复用脚本在 `scripts/`（见 STEPS「可复用工具」：`inventory.py`、`merge-coverage.py`、`measure-docs.py`、`scan-structure.mjs`、`verify-comment-only.mjs`）。Windows 上跑 Python 脚本加 `PYTHONIOENCODING=utf-8`。

## 项目画像（2026-09-19 核实）

| 维度      | 事实                                                                                                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 类型      | Web 单页应用「双人放置陪伴小屋」，R1 网页 MVP 阶段                                                                                                                                                                                                                                                    |
| 技术栈    | React 19.2、TypeScript 5.9、Vite 7.3.1、React Router 7.13、PixiJS 8.19、Supabase JS 2.98；pnpm 10.21；Prettier 3.8；ESLint 9 flat（react-hooks v7 recommended）                                                                                                                                       |
| 源码      | `src/` 97 文件 17.3k 行：`pages/`（+`world/` hooks）→ `themes/cinnaglass/{room,shell,journal,surfaces,chat}` + 平铺弹窗 → `hooks/ lib/ types/ utils/`；0 循环依赖；`tsc -b` 零错误；`eslint` 1 条既有警告（`room-scene.tsx:141` unused disable 指令，删掉不会报错——第三步实测）                       |
| 结构规范  | [CONVENTIONS.md](CONVENTIONS.md)（分层、命名、复用/拆分、注释、格式化、脚本依赖）                                                                                                                                                                                                                     |
| 测试 / CI | 无单测、无 CI；`scripts/check-*.mjs` 为人工浏览器验证脚本，依赖外部 `DIARY_NODE_MODULES`（playwright/sharp），dev 地址 `JOURNAL_URL` 默认 5173；三个脚本的样式表断言已随第二步改名失效（PA-050）                                                                                                      |
| 后端      | Supabase（auth / Postgres / Storage / Realtime Broadcast from Database）；schema 迁移历史不在仓库；`SUPABASE_ACCESS_TOKEN` 失效，MCP 连不上（TODO 继承待办）；客户端写入的正确性 100% 依赖 RLS（待核线上）                                                                                            |
| 本机限制  | **按机器区分**：Mac 无 `.env.local`；**Windows 机器有 `.env.local`（dev 自动登录真实账号），可进世界**——运行时验收与第四步 profiler 在 Windows 可做，但会写真实数据（已读游标/发帖/消息对方可见），需用户同意并由用户自己起 `pnpm dev`（5173）。Supabase MCP 两台都 401                               |
| 文档      | `CLAUDE.md`/`AGENTS.md` 协议（受保护，真源在货架，入库副本 `ai/jaAgents/`）；`ai/PROJECT.md`、`ai/TODO.md`（任务唯一来源）、`ai/features/`、`ai/design_system/`（常驻设计 Markdown）、`ai/reboot/`（归档）、`ai/codex-visual/`（codex-visual 技能比稿归档）、`ai/sessions/`（手动会话存档，不自动读） |
| 技能目录  | 唯一正本 `ai/jaSkills/`；`.claude/skills`、`.agents/skills` 均为指向它的链接（gitignore，由第 0 步脚本生成）                                                                                                                                                                                          |

## 第四步开工时要知道的

- 第三步的 P1（PA-034～042）是否先修由用户定；第四步不依赖它们，但 PA-041①（HiDPI cover-fit）会影响任何 DPR>1 的性能录制画面，建议先修再录。
- 第四步静态假设清单已在 PA-049：`useLiveClock` 1 Hz 全壳重渲染、30fps 常渲染 + 三个 start/stop 开关、晴天也跑 `AdjustmentFilter`、切氛围/天气泄漏离屏贴图、`backdrop-filter` 面板叠 canvas；先静态再 DevTools Performance/Memory 真录。
- 运行时验收清单（有 Supabase 会话时）：进世界、Enter 唤聊天、点五个家具热点、翻日记、改世界设置看纪念卡与日历同步（当前无入口，PA-037）、窄卡收贴纸；再加第三步 P1 的验收条件（FINDINGS 各条）。
- 已知待核的线上事实（客户端无法证明）：`worlds.name` 默认值与 update RLS、`profiles` update RLS、`handle_new_user` 是否填 `display_name`、`messages` 触发器事件名是否为 `TG_OP`、`channel_reads (channel_id,user_id)` 唯一约束、`posts.content`/`messages.content` 长度 check、`worlds` 外键 CASCADE（`ai/features/supabase.md` §二-0）。
- 第二步留给用户的产品决定仍在：`image-slot.js` 是否换 React（第三步补充：它当前无事件出口、头像不进 DB，换掉只丢 `ow-image-slots-v1` 与 reframe 手势）。

## 各步报告

- 第三步：[报告](runs/2026-09-19-02/03-protocol-review.md)、[调研表](runs/2026-09-19-02/evidence/03-research.md)、[覆盖](runs/2026-09-19-02/coverage.csv)、分区 review `runs/2026-09-19-02/evidence/03-{auth-session,memories,chat,room-shell}-review.md`
- 第二步：[报告](runs/2026-09-19-01/02-structure.md)、[覆盖](runs/2026-09-19-01/coverage.csv)、[结构指标前/后](runs/2026-09-19-01/metrics/)、分区审阅与落实/重构日志 `runs/2026-09-19-01/evidence/`
- 第一步：[报告](runs/2026-09-18-01/01-documents.md)、[覆盖](runs/2026-09-18-01/coverage.csv)、[文档指标](runs/2026-09-18-01/metrics/documents/)、[证据](runs/2026-09-18-01/evidence/)

## 报告约定

阶段 review 只列文件路径、改动原因、验证与结论，实现以 commit 为准，不贴源码或完整 diff。CSV/JSON 是按需查询的运行证据；第五步清理一次性数据，长期保留精简 review、执行摘要、子步骤迭代经验与有明确下轮用途的脚本/基线。稳定待办仍以 `ai/TODO.md` 为准，普通开发不需要加载审核证据。
