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

## 第三方技能包：Emil Kowalski 的界面与动效技能

2026-09-30 用户定：装。上游 [emilkowalski/skills](https://github.com/emilkowalski/skills)（提交 `d16ebe6`，MIT，每个目录附 `LICENSE`），**原文照搬、不改写**；升级时从上游整目录重新复制，不 `shelf push` 到货架。第三方原文不受本项目「SKILL.md ≤ 500 行」的约定（`emil-design-eng` 674 行，保持原样便于对齐上游）。没装的三个：`write-swift`、`animate-expo`、`ask-sonner`（本项目不用 Swift、Expo、Sonner）。

| 技能                           | 何时读                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `emil-design-eng`              | UI 打磨、组件设计、动效取舍的总纲；做界面细节前先过一遍                                  |
| `animate`                      | 从零做一个动效：该不该动、用什么、动哪些属性、曲线与时长、怎么打断和退出（配 `RECIPES.md`） |
| `review-animations`            | 审动效改动（只在点名时运行）                                                             |
| `improve-animations`           | 全仓动效体检，产出分优先级的计划（只读）                                                 |
| `find-animation-opportunities` | 找该动没动的地方，给出具体数值（只读）                                                   |
| `animation-vocabulary`         | 把「弹一下的那个效果」对上准确术语                                                       |
| `apple-design`                 | 手势、弹簧、托盘/抽屉、可打断过渡、半透明材质与景深                                      |
| `mobile-native`                | 网页在手机上像装好的 app：粘住的 hover、100vh、输入框缩放、安全区、下拉刷新               |
| `pick-ui-library`              | 为某类需求挑库（只在点名时运行）                                                         |
| `prototype`                    | 做几版真不一样的原型，挂切换器挑（只在点名时运行）                                       |

和本项目的关系：它们给的是手艺标准，项目决定优先。动效 token 以 `src/themes/cinnaglass/ui/motion.css` 为准（技能也要求扩展现有 token、不另起一套）；本项目是游戏 app，用户要求「任何交互都尽量有反馈、不必过分克制」，有低动效模式兜底——所以技能里「高频操作别加动效」一类建议在这里放宽，但时长、曲线、可打断、低动效降级的标准照用。UI/UX 的职责分工仍归 `ui-tailor` / `monet`。

分工边界：`project-audit` 只做审核与授权内的整理，不替代 `feature`（功能开发）与 `intj`（任务/文档维护）；审核发现的待办仍写进 `ai/TODO.md`，审核证据只放 `ai/project-audit/`。

`marionette` 只管「怎么让人物动」：人物长什么样归 `monet`，出图的执行归 `codex-visual`（按它的策略先问）。它是跨项目的写法，但按用户决定登记在这里而不进 `CLAUDE.md` / `AGENTS.md`——不是每次都用得上的技能。

除上面的 Emil 技能包外，本项目没有其他第三方领域知识包（无 ORM / 组件库技能）；PixiJS、Supabase 的用法以官方文档为准，需要时再上架。`blender-create` 已于 2026-09-19 随 3D 管线退役一并移除。

## 更新与工作区

- 通用技能与本表外的技能改动：改 `ai/jaSkills/<name>/`，再 `shelf push ai/jaSkills/<name>` 同步到货架（先不带 `--yes` 看清单）。
- 新检出 / 新 worktree：跑一次 `shelf init --agents claude,codex`（幂等，已有文件不覆盖）还原协议与链接；没有 shelf 时 `bash ai/jaSkills/custom-skill/scripts/sync-worktree.sh`（用 `ai/jaAgents/` 的入库副本兜底）。
- 本表与某个技能自己的 `SKILL.md` 不符时，以 `SKILL.md` 为准，并顺手修订本表。
