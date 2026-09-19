# PROJECT-AUDIT — 当前审核入口

当前：**第一步「文档、冗余文件与目录整理」已交付**（2026-09-19），运行 `2026-09-18-01`，本地 `dev` 基线 `3fd52a5`。结果：删除 55 个零消费者冗余文件（59.7MB）、16 份活文档压缩/改写（−32%，3 份达 2/3、13 份有据例外）、10 份短文档修陈旧陈述；PA-007～013 已按用户 2026-09-19 裁决执行（第二个 commit，PA-011 决定保留）；**第一步结束**；**第二步「工程结构、模块化与复用」进行中**（运行 `2026-09-19-01`，基线 `a9f7cfa`）。`node_modules` 为验证临时安装（gitignore）。

技能来源：`/Users/chengzheng/Desktop/Files/hyber_platform/hyber-operator-portal/ai/jaSkill/project-audit/`（SKILL.md、reference.md、references/）。本项目未安装该技能，本轮按技能正文执行；技能本体不复制进仓。

- [子步骤与复用脚本](STEPS.md) / [当前问题](FINDINGS.md) / [拓展要求](EXTRA-STEPS.md)
- 第二步：[报告](runs/2026-09-19-01/02-structure.md)、[结构扫描](runs/2026-09-19-01/metrics/structure-summary.json)、[证据](runs/2026-09-19-01/evidence/)
- 第一步：[报告](runs/2026-09-18-01/01-documents.md)、[覆盖](runs/2026-09-18-01/coverage.csv)、[基线清单与元数据](runs/2026-09-18-01/metrics/baseline/)、[文档指标](runs/2026-09-18-01/metrics/documents/)、[证据](runs/2026-09-18-01/evidence/)

## 项目画像（2026-09-18 核实）

| 维度 | 事实 |
| --- | --- |
| 类型 / 形态 | Web 单页应用「双人放置陪伴小屋」；R1 网页 MVP 阶段，R2/R3 Electron 壳为规划 |
| 技术栈 | React 19、TypeScript 5.9、Vite 7.3.1、React Router 7、PixiJS 8、Supabase JS 2.98；pnpm 10.22；Prettier 3.8；ESLint 9 flat config |
| 规模 | 可枚举 587 文件、约 464MB（`codex-visual/` 161MB、`ai/` 212MB、`arts/` 49MB、`public/` 20MB）；自有源码 `src/` 64 文件；文本文件 240 |
| 测试 / CI | 无单元测试、无 `.github`、无 CI；`scripts/check-*.mjs` 为人工浏览器验证脚本，依赖外部 `DIARY_NODE_MODULES` |
| 后端 | Supabase 项目（auth / Postgres / Storage / Realtime）；schema 变更历史不在仓库，`sql/` 仅两份早期脚本 |
| 协议与文档 | `CLAUDE.md`、`AGENTS.md`（受保护）；`ai/PROJECT.md`（PRD + 技术事实）、`ai/TODO.md`（任务唯一来源）、`ai/features/`、`ai/design_system/`（2026-09-12/13 刚整理的常驻设计 Markdown）、`ai/reboot/`（归档）、`ai/sessions/`（手动会话存档，不读） |
| 技能目录 | `.claude/skills/`（Claude）与 `.agents/skills/`（Codex）正文已于 2026-09-19 对齐，仅 Codex 显示元数据 `agents/openai.yaml` 留在 `.agents` |

## 顺序与授权

顺序：1 文档/文件/目录 → 2 结构/复用/注释 → 3 协议与前后端 review → 4 静态分析 + 真实运行 profiler → 拓展 → 5 上下文成本收尾。每步全项目覆盖、先真实调研、拆子步骤、沟通方案、再落实与验证。

本轮授权：用户指令「切到 dev，拿到 hyper-portal 里的 audit 技能，完成 audit 第一步」。据此执行第一步定义内的工作：证据充分的冗余清理、活文档逐份压缩（≤ 原文 2/3，含例外说明）、目录与链接整理，并以独立 commit 交付。**不做**：推送/合并、修改受保护协议与技能目录、删除证据不足或涉及用户近期刻意决定的素材（列为待用户决定）、代码结构改动（第二步）。

## 报告约定

阶段 review 只列文件路径、改动原因、验证与结论，实现与删除原文以阶段 commit 为准，不贴源码或完整 diff。CSV/JSON 是按需查询的运行证据；第五步清理一次性数据，长期保留精简 review、执行摘要、子步骤迭代经验和有明确下轮用途的脚本/基线。稳定待办仍以 `ai/TODO.md` 为准，普通开发不需要加载审核证据。
