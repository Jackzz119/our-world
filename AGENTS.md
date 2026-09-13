# AI Agents 通用工作协议

本协议适用于参与本项目的所有 AI，包括 Claude、Codex、主 agent 与其调用的其他 agents。
平台专属能力按各自运行环境使用；除明确标注为平台差异的部分外，所有规则对所有 agents 同等生效。

## 上下文准备

每次对话开始时：

1. 读取 `ai/PROJECT.md` 和 `ai/TODO.md`，将项目现状和任务列表纳入上下文
2. 根据任务需要读取 `ai/Features/*.md`、`ai/UNITY_PROJECT.md`、`ai/UNITY_TODO.md`
3. 了解当前运行环境中可用的 skill：
   - Claude 扫描 `.claude/skills/` 目录
   - Codex 查看当前会话提供的 Codex skill 列表，并按需读取对应 `SKILL.md`
   - 其他 agents 使用其运行环境实际提供的 skill，不假设继承了另一平台的注册状态
4. 遇到对应场景时，**必须调用对应的 skill**，不要重新发明已有规范

### Skill 对话规范

在 skill 上下文中回复时，**在回复开头标注 skill 名称**，像这个 skill 的“人”在说话：

```text
**INTJ** 好，我看了一下，你现在还有...
**VC** 当前分支状态如下...
**LOGMAN** 这行 log 格式有问题...
```

格式：`**SKILL名称（全大写）**` + 空格 + 正文。

### Skill 触发规范

始终保持对当前可用 skill 的感知，在对应场景**主动触发**，不等用户提醒：

| 场景                                                                  | 应触发的 skill    |
| --------------------------------------------------------------------- | ----------------- |
| 更新 TODO、记录任务、Bug、优先级判断                                  | `intj`            |
| **查看任务列表、项目进度、待办总览**（如“查看 todo”、“有什么要做的”） | `intj`            |
| **更新项目文档**（如“更新文档”、“同步文档”、“记录到文档”）            | `intj`            |
| 功能开发、Feature 文档读写、Subtask 执行                              | `feature`         |
| git commit、分支、PR 操作                                             | `vc`              |
| 创建或修改 skill 文件（`SKILL.md`、references、scripts 等）           | `skill-creator`   |
| 安装 Codex skill                                                      | `skill-installer` |
| 写/改/检查 log 语句、新增功能域标签                                   | `logman`          |
| UI/UX、概念模型、用户流程、命名、信息架构、交互、界面与 uiux 文档      | `ui-tailor`      |
| 主美、概念/素材、风格统一、视觉比稿、UI 设计调度与审核                 | `monet`          |

**重要**：

- 任何对 `.claude/skills/` 目录下文件的读写，都必须先触发 `skill-creator`，不得绕过 skill 直接修改。
- Codex 的 skill 不放在项目 `.claude/skills/` 中；该目录是 Claude 侧配置，Codex 可以参考其流程，但不要假设它们会被 Codex 自动注册为可调用 skill。
- 主 agent 将工作交给其他 agent 时，应把本协议中与任务有关的规则一起传递；委派不改变规则，也不降低验收标准。

## Skill 系统

### Claude skill 创建规范

Claude skill 放在项目 `.claude/skills/` 中。创建新 skill 时遵循以下结构：

```text
.claude/skills/<skill-name>/
├── SKILL.md        # 必需：入口指令 + frontmatter，控制在 500 行以内
├── reference.md    # 可选：详细规范，需要时才加载
└── examples.md     # 可选：示例
```

**SKILL.md frontmatter 常用字段：**

```yaml
---
name: skill-name
description: 一句话描述，用于决定何时触发
allowed-tools: Bash, Read, Edit   # 预批准工具，免去每次确认
---
```

**支持的动态特性：**

- `` !`shell命令` `` — skill 运行前注入命令输出
- `$ARGUMENTS` — 接收调用时传入的参数
- `${CLAUDE_SKILL_DIR}` — 引用 skill 目录内的文件或脚本

### Codex skill 放置与创建规范

Codex skill 是用户级能力，默认放在用户 Codex 目录：

```text
~/.codex/skills/<skill-name>/SKILL.md
~/.codex/skills/.system/<system-skill-name>/SKILL.md
```

本项目不需要为了 Codex skill 创建 `.codex/` 目录。项目级通用规则写在仓库根目录的
`AGENTS.md`；跨项目复用的 Codex skill 写到 `~/.codex/skills/<skill-name>/`。

本项目现有的可发现技能维护在 `.agents/skills/`；`ui-tailor` 与 `monet` 延续这个位置，
不复制到用户目录造成两套真源。项目专属角色、设计系统路径和当前风格入口登记在 `ai/PROJECT.md`，
不登记到 `CLAUDE.md` 或 `.claude/skills/`。新增跨项目技能仍遵循上面的用户级默认位置。

UI Tailor 统一承接 UI 和 UX，纯概念模型/流程/命名讨论同样调用它；不再保留独立 `ux` 技能。
UI/UX 工作先读设计系统与 Monet 要求，再由 UI Tailor 设计/验证，视觉完成件由 Monet 审核；
没有独立 agent 时加载相应 skill 切换职责，明确标注自审，不虚构委派。每轮产物与决定同步到设计系统。

本项目当前设计入口是 `ai/design_system/design-system.md`，链接角色、场景、物件、效果及
`uiux/uiux.md` 等常驻图文规范；README 只描述结构。技能目录只放通用方法与显示元数据，
项目决定、素材位置和设计文档都在 `ai/` 维护。普通回合报告默认在 session 中给出，
研究/比稿保留有价值的依据，阶段收尾清理陈旧附属资料和临时文件。

创建新 Codex skill 时遵循以下结构：

```text
~/.codex/skills/<skill-name>/
├── SKILL.md          # 必需：frontmatter + 核心指令，控制在 500 行以内
├── agents/
│   └── openai.yaml   # 推荐：UI 展示元数据
├── references/       # 可选：详细规范，需要时才加载
├── scripts/          # 可选：可执行脚本
└── assets/           # 可选：模板、图片、字体等输出资源
```

**Codex SKILL.md frontmatter 必需字段：**

```yaml
---
name: skill-name
description: 一句话描述 skill 的用途，以及什么时候应该触发
---
```

Codex 主要读取 `name` 和 `description` 来判断是否触发 skill。描述要明确覆盖触发场景。

### Skill 通用最佳实践

- `SKILL.md` 只写核心指令和入口，细节拆到 references/reference 文件
- 支持文件按需加载，不增加每次运行的上下文成本
- 通用 skill 不写项目特定内容，保持跨项目复用
- 需要稳定执行的重复流程放到 `scripts/`
- 不创建无关的 `README.md`、安装指南、变更日志等杂项文档

## 文档维护规则

### 职责分工

- **PROJECT.md**：记录项目结构、已完成功能的详细描述、数据库表结构等技术细节、以及 Brain Dump 想法区
- **TODO.md**：时刻跟踪所有待办和已完成条目，是任务的唯一来源

### 工作流程

1. **新想法出现** → 直接加入 `TODO.md` 对应 Phase，或先记入 `PROJECT.md` 的 Brain Dump 区
2. **Brain Dump → 决定做** → 从 Brain Dump 移出，加入 `TODO.md` 对应 Phase
3. **任务完成** → 在 `TODO.md` 标记 `[x]`
4. **标记完成后** → 将实现细节（功能描述、数据库结构、模块说明等）更新到 `PROJECT.md`

### 具体规则

- 技术实现细节（数据库结构、配置等）只在实际执行完成后才更新到 PROJECT.md，待办的改动只写在 TODO.md
- TODO.md 只写高层描述，不写数据结构细节
- PROJECT.md 的功能模块和数据库章节保持与线上实际状态一致
- **Feature 文档已记录的细节不重复写入 PROJECT.md**：`ai/Features/*.md` 中有详细说明的内容，PROJECT.md 只写一句摘要 + 文档路径引用，不做内容搬运
- **功能文档超过单个 Markdown 时建功能文件夹**（2026-07-13 用户定规）：当一个功能的文档与研究内容超过一个 `.md`（有 subfeature、调研文档、HTML mockup、图片等），在 `ai/Features/<功能名>/` 下建文件夹集中存放（例：`ai/Features/metaspace-controls/`），主文档与附属材料互相链接

## 命名规则

新建文件、文件夹或文档前，**先扫描当前项目已有的命名模式**，遵循它，不要凭习惯套用其他项目的规则。

需观察的维度：

- 文件夹大小写（全小写 / PascalCase / kebab-case）
- 文档（`.md`）命名风格（全大写 / 全小写 / 混合）
- 代码文件命名（camelCase / snake_case / kebab-case）
- 是否有 `codeStyle.md`、`.editorconfig` 等明确规范文件

如果同一类目内存在多种风格，挑**多数派**或**最近新增**的那种；不确定时先问用户。
发现历史遗留不一致的，顺手改正。

## 语言规则

默认使用**中文**与用户沟通。必要时（如代码术语、英文原文引用等）可穿插其他语言。

## Debug Log 规范

### 格式

`[功能模块][平台][类名]`，标签结束后用换行符分隔，消息内容另起一行，方便在 Console 折叠视图中阅读。

### 功能域标签选取

标签应反映**方法所属的功能域**，不跟调用链走。通用/跨功能方法用其所属模块的标签，不要因为被某个功能调用就打那个功能的标签。

## 代码风格

写代码或重命名前，参考项目根目录的 codestyle 文件（如 `codeStyle.md`、`.editorconfig`）；若项目内没有则按通用习惯，不强行套用其他项目的规则。

## 代码修改规则

**未经用户明确说“帮我改”之前，不直接修改代码。**

分析阶段应：

1. 说明要改哪里、为什么这么改
2. 展示改动的代码片段
3. 等用户确认后再动手

用户已明确要求修改时，可直接在授权范围内执行；不要把授权扩大到无关文件或破坏性操作。

## Auto 模式报告规范

用户声明开启 auto 模式后（如“我会开着 auto 模式”），**每一轮任务结束都必须给详细报告**，无需用户每次重申：

1. 自主完成全部工作，中途不停下等确认（破坏性操作除外）
2. 报告必须覆盖：做了什么、为什么这么做、遇到的问题与处理、验证结果
3. **代码修改必须逐文件展示实际代码**（2026-07-13 二次违反后升级为铁则），不能只写文字描述。发报告前必须自查：每个被修改的代码文件在报告里都有对应代码块，缺一个都算违规；`.md` 文档改动可只写摘要：
   - 每个改动文件一节：文件路径 + 这个文件为什么要动
   - 关键改动贴**改动前 → 改动后**的代码对照；新文件或新函数贴核心代码全文，每处配一句“为什么这么改”
   - 一两行的小改动也要贴出那几行；样式改动贴关键 CSS 规则
   - **新写的算法或引擎类代码**（动画、状态机、数据结构）必须贴完整函数全文，不允许用一句功能描述带过
4. **报告必须说人话**（2026-07-10 用户要求）：
   - 术语、英文黑话、缩写（如 optimistic UI / revoke / smoke test / echo）首次出现时，当场用一句大白话解释
   - 不允许只丢结论词（如“已加固”“已对齐”“已节流”）而不解释机制；每个结论词后面说明“怎么做到的”
   - 交互行为要描述完整因果链：用户做了什么 → 前端发生什么 → 后端发生什么 → 对方看到什么，不能只写状态名
