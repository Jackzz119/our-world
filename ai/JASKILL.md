# JASKILL — 本项目专属技能登记

> 本文件由 `shelf init` 植入一次，之后归项目自己维护，不随货架同步（`shelf sync` 不会覆盖它）。
> 这里只登记**本项目专属**或**非通用包**的技能；通用工作流技能（`intj` / `feature` / `vc` / `logman` / `custom-skill` / `monet` / `ui-tailor` / `codex-visual` / `shelf-ops`）的名册与触发规范在根 `CLAUDE.md` / `AGENTS.md`「Skill 系统」节。

## 读法

技能唯一正本在 `ai/jaSkills/<name>/`；`.claude/skills`、`.agents/skills`、`.codex/skills` 都是指向它的整目录链接，从哪边读都是同一份。先读对应 `SKILL.md`，再按需读 `reference.md` / `references/`，不整包加载。遇到表里的场景**主动触发**，不等用户提醒。

## 技能与触发场景

| 技能            | 何时读                                                                                                                                                                  | 上游                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `project-audit` | 用户说「audit / 审核 / 项目体检 / 全仓审核 / 清理冗余 / 性能复查」，或要继续、复查审核的某一步；开工先读 `ai/project-audit/INDEX.md`，再读 `STEPS.md` 当前阶段与 `FINDINGS.md` | 货架 `skills/project-audit`（自建，跨项目） |
| `marionette` | 要做会动的 2D 人物、接手一套姿势图，或人物动画出问题（闪烁、眨眼跳脸、切姿势多出一块、反应生硬）；本项目的人物 rig 配置在 `arts/characters/<人物>/rig.json`，运行时核心 `src/themes/cinnaglass/room/rig-core.ts` 是技能模板的副本 | 本项目自建（通用写法，暂不上货架，2026-09-28 用户定） |

分工边界：`project-audit` 只做审核与授权内的整理，不替代 `feature`（功能开发）与 `intj`（任务/文档维护）；审核发现的待办仍写进 `ai/TODO.md`，审核证据只放 `ai/project-audit/`。

`marionette` 只管「怎么让人物动」：人物长什么样归 `monet`，出图的执行归 `codex-visual`（按它的策略先问）。它是跨项目的写法，但按用户决定登记在这里而不进 `CLAUDE.md` / `AGENTS.md`——不是每次都用得上的技能。

本项目当前没有第三方领域知识包（无 ORM / 组件库技能）；PixiJS、Supabase 的用法以官方文档为准，需要时再上架。`blender-create` 已于 2026-09-19 随 3D 管线退役一并移除。

## 更新与工作区

- 通用技能与本表外的技能改动：改 `ai/jaSkills/<name>/`，再 `shelf push ai/jaSkills/<name>` 同步到货架（先不带 `--yes` 看清单）。
- 新检出 / 新 worktree：跑一次 `shelf init --agents claude,codex`（幂等，已有文件不覆盖）还原协议与链接；没有 shelf 时 `bash ai/jaSkills/custom-skill/scripts/sync-worktree.sh`（用 `ai/jaAgents/` 的入库副本兜底）。
- 本表与某个技能自己的 `SKILL.md` 不符时，以 `SKILL.md` 为准，并顺手修订本表。
