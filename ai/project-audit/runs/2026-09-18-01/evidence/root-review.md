# 分区审阅：root（根文件 + scripts/ + sql/ + patches/ + public/）

- 子任务：01-S03　基线：dev @ 3fd52a5　日期：2026-09-18
- 范围：inventory.csv 中路径不含斜杠的根文件 17 个 + scripts/ 12 + sql/ 2 + patches/ 1 + public/ 41 = **73 个文件**（CSV 行数与之相等）。
- 方法：
  - 文本文件全部 `cat -n` 全文阅读（pnpm-lock.yaml 为生成文件，采用结构化检索 + 与 package.json 程序化对照；patches 为压缩单行 diff，用 difflib 定位改动）。
  - 引用核验：对每个文件/basename grep 全仓（排除 node_modules/.git/ai/sessions/ai/project-audit），覆盖 src import、index.html src/href、CSS `url()`、scripts 参数、ai 文档链接、manifest JSON、动态模板字符串（如 `/ui/journal/avatar-${…}.webp`）。
  - 二进制：`file`/`sips` 取尺寸与格式、inventory sha256、`shasum` 校验字体清单；只依据元数据与消费者关系判定，未逐像素审核。
  - git 只读命令：`git ls-files`、`git check-ignore --no-index`、`git log`、`git show --stat`、`git grep <rev>`，用于生命周期定年与消费者删除史。
  - 受保护：`.claude/`、`.agents/` 仅 `test -d` 确认目录存在；AGENTS.md/CLAUDE.md 全文阅读但不提修改；ai/sessions/ 未读；.env* 未读（仅 .env.example）。


## protected

### 受保护协议文件（只读，登记规则，不提修改）

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
|---|---|---|---|---|---|
| `AGENTS.md` | 跨 agent 通用工作协议（Claude/Codex 通用）：上下文准备、skill 触发表（含 ui-tailor/monet/skill-installer）、Codex skill 位置（.agents/skills/）、文档分工（PROJECT/TODO/Features）、命名/日志/代码修改/auto 模式报告规则 | 所有 AI agent | 协议（受保护）；2026-09-13 3fd52a5 最新，是 CLAUDE.md 的超集 | 只读；规则摘录见 #protected；L11 引用 ai/UNITY_PROJECT.md、ai/UNITY_TODO.md（不存在，仅登记不提修改） | 当前有效 |
| `CLAUDE.md` | Claude 专属工作协议：与 AGENTS.md 同源的上下文准备/skill 触发表/文档维护/命名/日志/代码修改/auto 模式报告规则；无 ui-tailor/monet 行 | Claude Code | 协议（受保护）；末次改动 2026-08-09 822fa92，早于 AGENTS.md | 只读；规则摘录见 #protected；差异：AGENTS.md 多出 ui-tailor/monet/skill-installer 触发行与 Codex skill 段落 | 当前有效 |

**两份协议对文档体系的规则（摘录，供其它分区引用）：**

- **PROJECT.md**：项目结构、已完成功能细节、数据库表结构、Brain Dump；只在实际完成后更新技术细节；功能模块/数据库章节须与线上一致。
- **TODO.md**：所有待办与已完成条目的唯一来源；只写高层描述，不写数据结构。
- **工作流**：新想法 → TODO 或 Brain Dump；决定做 → 移入 TODO；完成 → TODO 打 `[x]` → 细节回写 PROJECT.md。
- **Feature 文档**：`ai/Features/*.md` 已有的细节不重复写入 PROJECT.md（一句摘要 + 路径引用）；超过一个 .md 的功能建 `ai/Features/<功能名>/` 文件夹（2026-07-13 用户定规）。
- **skills 目录**：`.claude/skills/` 为 Claude 侧配置，任何读写先经 `skill-creator`；Codex skill 放用户目录 `~/.codex/skills/`，本项目可发现技能在 `.agents/skills/`（ui-tailor、monet），不复制成两套真源；项目决定/素材位置/设计文档只在 `ai/` 维护，不登记到 CLAUDE.md 或 skills 目录。
- **设计系统入口**：`ai/design_system/design-system.md`；README 只描述结构；技能目录只放通用方法。
- **命名**：先扫描既有模式，多数派/最近新增优先；历史不一致顺手改正。
- **代码修改**：用户未说「帮我改」前只分析不改；auto 模式每轮给逐文件代码对照的详细报告。

**观察（仅登记，不提出修改协议文件）：**

- AGENTS.md L11 要求按需读取 `ai/UNITY_PROJECT.md`、`ai/UNITY_TODO.md`，两文件在仓库中不存在。
- AGENTS.md L41 / CLAUDE.md 触发表中的 `skill-creator` 在 `.claude/skills/` 下没有同名目录（本会话中它以 `anthropic-skills:skill-creator` 插件形式存在），`skill-installer` 亦无项目内目录（属 Codex 侧）。
- CLAUDE.md（2026-08-09）缺少 AGENTS.md（2026-09-13）新增的 ui-tailor/monet 触发行；AGENTS.md 自述为对所有 agent 生效的超集，故不构成冲突。
- 与本分区相关：AGENTS.md L136「不创建无关的 README.md…」针对 skill 目录；根 README.md 不受此约束，但其内容已作废（见 F-01）。


## root

### 根目录文件（15，除受保护 2 份）

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
|---|---|---|---|---|---|
| `.agent-toolkit.json` | agent-toolkit 拉取清单：登记 6 个从 Jackzz119/agent-toolkit 拉入 .claude/skills 的 skill（blender-create/custom-skill/feature/intj/logman/vc）及 sourceCommit/contentHash/pulledAt | 外部 agent-toolkit 同步工具；人 | 工具元数据，权威（对拉取来源） | 6 个 skill 目录均存在（仅 test -d）；本地自建 codex-visual/monet 不在清单内属正常；末次改动 2026-07-03 eea8070 | 当前有效 |
| `.env.example` | 环境变量模板：VITE_SUPABASE_URL/ANON_KEY + 开发开关 VITE_DEV/VITE_DEV_EMAIL/VITE_DEV_PASSWORD/VITE_AUTO_ENTER，注释解释 dev 自动登录是真实 signInWithPassword | 开发者（cp 成 .env.local）；README.md §1 | 权威（与 src/types/index.ts EnvName 与 src/utils getEnvFlag/getEnvOptional、ProtectedRoute.tsx 一致） | grep src：6 个键全部被读取；README.md L12-23 引用 | 当前有效 |
| `.gitignore` | 忽略规则：日志、node_modules、dist、*.local、编辑器、.mcp.json、.claude/settings.local.json、.env、*.blend1、__pycache__/ | git | 权威 | git ls-files \| git check-ignore --no-index -v：2 个已跟踪文件命中规则（arts/meshes/scene.blend1 ← L33；codex-visual/20260811-055917Z/__pycache__/measure_concept.cpython-312.pyc ← L36），见发现 F-08 | 当前有效（规则）；2 处历史遗留冲突 |
| `.prettierrc` | Prettier 配置：4 空格、120 列、单引号、无尾逗号、LF | pnpm format；所有代码文件 | 权威（唯一代码风格文件；无 .editorconfig/codeStyle.md） | scripts/*.mjs 与 src 均按 4 空格；初始提交 0ff06ec 以来未变 | 当前有效 |
| `README.md` | 项目 README，但内容是 Vite+React+Supabase「todos」模板说明（服务层/hook/SQL 建 todos 表/下一步） | 新开发者/GitHub 首页 | 已陈旧（2026-03-06 6c8108e 后未更新） | 对照 src：src/services/todos.service.ts、src/hooks/useTodos.ts 不存在；src/types/database.ts 存在但仅声明无人用的 todos 表（TODO.md L115 已列死文件）；无任何文档链接到 README.md | 已作废内容（文件本身应保留并重写） |
| `eslint.config.js` | ESLint 9 flat config：只 lint **/*.{ts,tsx}，忽略 dist；三条 warn 规则 | pnpm lint | 权威 | scripts/*.mjs、vite.config.ts 之外的 .js/.mjs 不在 lint 范围；2026-03-05 起未变 | 当前有效 |
| `index.html` | Vite 入口：favicon /vite.svg、Google Fonts（Baloo 2 + Noto Sans SC，src/themes/cinnaglass/cinnaglass.css 等 4 文件使用）、标题「我们的小世界 · Our World」、挂载 /src/main.tsx | Vite dev/build | 权威 | grep：/vite.svg 唯一引用点；字体族在 src 有使用 | 当前有效（favicon 为模板 logo，见 F-09） |
| `package.json` | 依赖与脚本清单：dev/dev2(5174)/build/lint/preview/format；deps 含 @react-three/rapier（src 零引用）、page-flip 2.0.7（仅被未挂载的 journal-book.tsx 引用）、pixi.js/pixi-filters/supabase/react/router | pnpm/Vite/TS | 权威 | grep src：rapier/three/drei 零 import；page-flip 仅 src/themes/cinnaglass/journal-book.tsx 与 src/types/page-flip.d.ts，而 journal-book.tsx 无人 import（screens.tsx 用 journal-room-book）；无 test/CI 脚本；scripts/ 下 12 个脚本无一登记 | 当前有效；含 2 项可清理依赖（F-04/F-05） |
| `pnpm-lock.yaml` | pnpm v9 锁文件：importers 与 package.json 完全一致；patchedDependencies 记录 page-flip 补丁 hash；经 rapier 间接锁入 three@0.185.1、@react-three/fiber 9.6.1、three-stdlib | pnpm install | 生成文件，权威（对安装结果） | python 对照 importers 与 package.json 双向差集为空；grep 定位 patchedDependencies/three | 当前有效（随 F-04/F-05 变化） |
| `pnpm-workspace.yaml` | pnpm 配置：patchedDependencies page-flip@2.0.7 → patches/page-flip@2.0.7.patch | pnpm install | 权威 | lockfile L7-10 记录同一路径与 hash；补丁文件存在 | 当前有效（绑定 F-05） |
| `timeline_3d_posts.html` | 独立实验页（HTML 片段，无 html/head）：CDN three.js r128 为每条回忆渲染小 3D 物件的时间线 + 撰写/阅读弹层，硬编码 9 条 mock POSTS | 无（无人引用） | 已作废（2026-04-05 1cbd06f 加入的 3D 场景时代原型） | grep 全仓：仅 ai/TODO.md L115（列为待删死文件）与 ai/Features/ui-system/audit.md L80（候选）提及；无 src/href/import/vite 引用 | 已作废方案；删除候选 D-01 |
| `tsconfig.app.json` | 应用 TS 配置：ES2022、bundler 解析、strict、@/* → src/*、include src | tsc -b / IDE | 权威 | alias 与 vite.config.ts resolve.alias 一致 | 当前有效 |
| `tsconfig.json` | TS 项目引用根：指向 tsconfig.app.json / tsconfig.node.json | tsc -b | 权威 | 两个子配置存在 | 当前有效 |
| `tsconfig.node.json` | Node 侧 TS 配置：仅 include vite.config.ts | tsc -b | 权威 | — | 当前有效 |
| `vite.config.ts` | Vite 配置：react 插件、@ 别名、optimizeDeps.include [@react-three/rapier] 及关于 drei 深导入的注释 | Vite | 权威但含陈旧段 | drei 已于 2026-08-10 4619fff 从 package.json 移除；src 无 three/rapier/drei import；注释描述的问题已不存在（F-04） | 当前有效；optimizeDeps 段为已作废方案残留 |

## scripts

### scripts/（12）—— 测试与 CI 成本审核输入

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
|---|---|---|---|---|---|
| `scripts/build-turntable-parts.py` | 唱片机分层装配器（v5）：输入 --gen（codex 生成 machine-<mood>/platter/tonearm.png）、--src arts/rooms/study/source、--platter 覆盖；输出 --out public/rooms/study/{golden,twilight,night}.png + parts/（platter/light-add/light-mul/spindle/tonearm + turntable.json）+ --review 审阅条 | 美术管线（人工触发）；产物被 src/themes/cinnaglass/room/study-room.ts 硬编码引用 | 权威（唯一产物生成源） | 依赖 Pillow/numpy/opencv（未声明，无 requirements）；文档：PROJECT.md L56、TODO.md L78-79、design_system/props.md、research/art-relighting.md、room-types.ts L53、study-room.ts L72 | 当前有效（构建产物脚本） |
| `scripts/check-design-system.mjs` | 设计系统校验：遍历 ai/design_system/**/*.{md,html} 检查本地链接/锚点、从 design-system.md 可达性、常驻文档含图；stdout JSON + 退出码；不写文件 | 人工/可 CI；ai/design_system/README.md L23 指示运行 | 权威 | 仅 node 内建模块，零外部依赖；唯一可直接运行的脚本 | 当前有效（校验脚本） |
| `scripts/check-diary.mjs` | 日记面板只读视觉回归：playwright(chrome channel)+pngjs，访问 localhost:5173/?enter=1&surface=timeline，断言草稿/Esc/溢出/对比度，截图 + results.json 写入 ai/design_system/uiux/research/cinnaglass-history/timeline-night-glass/verification/ | 人工验证 | 历史实现的验证脚本（针对 .tl-card 旧时间线 DOM） | 依赖经 DIARY_NODE_MODULES 或默认解析（均未在 package.json）；文档：timeline-night-glass/implementation.md L90；端口 5173 与其余脚本 5175 不一致；对当前 DOM 的有效性未运行验证 | 已完成历史（研究归档配套） |
| `scripts/check-journal-art.mjs` | 旧纸书本（journal-room-book）只读验证：playwright+sharp，断言 .journal-room-entry、无 .stf__parent（不再用翻页库）、字体 Journal WenKai、分页函数 buildJournalPages 无溢出、public/ui/journal 三张 webp 有 alpha、ui-system.html 图文可加载；写 journal-room-object/book-verification/ | 人工验证 | 当前实现的验证脚本 | 依赖未声明；端口 5175/JOURNAL_URL；用 page.route 拦截 get_feed_posts 与 storage sign，不写后端；文档：book-implementation.md、turn-implementation.md | 当前有效（人工验证） |
| `scripts/check-journal-turn.mjs` | 翻页动画（journal-turn.ts 自研引擎）验证：硬依赖 DIARY_NODE_MODULES 的 playwright+sharp；断言 sheet DOM/连续翻页帧时/反向/草稿取消/移动端/reduced-motion/历史加载重试/几何 sheetPose；可选 JOURNAL_EXPORT_GIF 导出 gif；写 journal-room-object/turn-verification/ | 人工验证 | 当前实现的验证脚本 | 无 DIARY_NODE_MODULES 回退；端口 5175；文档：turn-implementation.md | 当前有效（人工验证） |
| `scripts/check-journal.mjs` | 旧「苔绿手札」page-flip 书本验证：驱动 .journal-engine 的 journalEngine（getState/owRunning/flip 事件/拖角），写 ai/design_system/uiux/research/cinnaglass-history/journal-book-directions/verification/ | 人工验证 | 绑定已退役引擎：journalEngine 只由 src/themes/cinnaglass/journal-book.tsx 在 DEV 挂载，而该文件已无人 import（book-implementation.md L27 记录旧引擎不再实例化） | 依赖 playwright（DIARY_NODE_MODULES/默认）；端口 5175；文档：journal-book-directions/implementation.md、book-implementation.md、turn-implementation.md 提及 | 已作废（对当前应用无法通过）；候选 D-05 |
| `scripts/check-navigation.mjs` | 导航玻璃栏验证：playwright+sharp，三种 mood 的 idle/hover/pressed/focus 截图、图标对比度像素统计、触屏 CDP 事件、视口边界、ui-system.html 引用图加载；生成 comparison.png（ui-system.html 嵌入）；写 journal-room-object/navigation-verification/ | 人工验证 | 当前实现的验证脚本 | 依赖未声明；端口 5175；文档：navigation-implementation.md、book-implementation.md | 当前有效（人工验证） |
| `scripts/compare-journal-art.mjs` | QA 取样：sharp（硬依赖 DIARY_NODE_MODULES）对比 room-journal-concept.png 与 book-verification 截图的局部亮度，生成 book-comparison.png/alpha-review.png/pixel-samples.json | 人工 QA | 辅助工具 | 输入均存在；文档：book-implementation.md | 当前有效（人工工具） |
| `scripts/fit-disc-ellipse.py` | 量测工具：对底图中的近黑圆盘做射线采样 + RANSAC 直接最小二乘椭圆拟合，输出 room-types.ts 需要的 PxEllipse 参数与可选 overlay | 美术/工程人工量测 | 权威（量测方法） | 依赖 Pillow+numpy（未声明）；文档：PROJECT.md L56、TODO.md L78、room-types.ts L41、study-room.ts | 当前有效（人工工具） |
| `scripts/pack-journal-art.mjs` | 日记美术打包：sharp，从 arts/ui/journal/book-checker-source.png 洪水填充去棋盘底、裁右页、纸角、羽毛、从概念图裁两枚 84px 头像 → public/ui/journal/*.webp + arts/ui/journal/book-alpha.png + pack-results.json | 美术管线（人工触发）；产物被 journal-room.css/journal-room-book.tsx/journal-turn.ts/journal-layout.ts 使用 | 权威（唯一产物生成源） | 输入源均存在；文档：arts/ui/journal/manifest.json、book-prompts.md | 当前有效（构建产物脚本） |
| `scripts/pack-navigation-texture.mjs` | 导航磨砂纹理打包：sharp，从 arts/ui/navigation/frost-source.png 生成 512² 偏差-透明度纹理 → public/ui/nav/frost.webp | 美术管线（人工触发）；产物被 navigation-glass.css 使用 | 权威（唯一产物生成源） | 输入存在；文档：arts/ui/navigation/manifest.json、navigation-implementation.md、navigation-texture-prompt.md | 当前有效（构建产物脚本） |
| `scripts/render-journal-turn.mjs` | 翻页原型帧导出：playwright+sharp（硬依赖 DIARY_NODE_MODULES），加载 localhost:5175/ai/design_system/.../turn-prototype.html 的 window.turnDemo 逐帧截图 → turn-verification/*.png + 3 个 gif + prototype-results.json | 研究/人工 | 研究阶段配套工具（原型页仍存在） | 输入 turn-prototype.html 存在；文档：turn-implementation.md | 已完成历史（研究配套，仍可用） |

**脚本登记汇总：**

| 脚本 | 类型 | 输入 | 输出目录 | 外部依赖 | 依赖来源 | 现在可否运行 |
|---|---|---|---|---|---|---|
| build-turntable-parts.py | 构建产物 | arts/rooms/study/generated/<run>、arts/rooms/study/source | public/rooms/study + parts/、--review | Pillow、numpy、opencv-python-headless | 未声明（无 requirements/pyproject） | 需自备 Python 环境 |
| fit-disc-ellipse.py | 人工量测 | 任一底图 png + --seed | stdout（+ --overlay png） | Pillow、numpy | 未声明 | 需自备 Python 环境 |
| check-design-system.mjs | 校验（可 CI） | ai/design_system/** | stdout/exit code | 无 | node 内建 | **可直接运行** |
| check-diary.mjs | 人工验证 | dev server :5173 | ai/design_system/uiux/research/cinnaglass-history/timeline-night-glass/verification | playwright(chrome)、pngjs | DIARY_NODE_MODULES 或默认解析；不在 package.json | 否（依赖未安装；DOM 针对旧时间线，未验证） |
| check-journal.mjs | 人工验证（旧引擎） | dev server :5175 | …/journal-book-directions/verification | playwright | 同上 | 否（绑定已退役 page-flip 引擎，见 F-07） |
| check-journal-art.mjs | 人工验证 | dev server :5175 | journal-room-object/book-verification | playwright、sharp | 同上 | 否（依赖未安装） |
| check-journal-turn.mjs | 人工验证 | dev server :5175 | journal-room-object/turn-verification | playwright、sharp | **硬依赖** DIARY_NODE_MODULES | 否 |
| check-navigation.mjs | 人工验证 | dev server :5175 | journal-room-object/navigation-verification | playwright、sharp | DIARY_NODE_MODULES 或默认 | 否 |
| compare-journal-art.mjs | 人工 QA | book-verification 截图 + 概念图 + public/ui/journal/book-open.webp | journal-room-object/book-verification | sharp | **硬依赖** DIARY_NODE_MODULES | 否 |
| pack-journal-art.mjs | 构建产物 | arts/ui/journal/*.png、概念图 | public/ui/journal、arts/ui/journal | sharp | DIARY_NODE_MODULES 或默认 | 否 |
| pack-navigation-texture.mjs | 构建产物 | arts/ui/navigation/frost-source.png | public/ui/nav | sharp | 同上 | 否 |
| render-journal-turn.mjs | 研究配套 | dev server :5175 + turn-prototype.html | journal-room-object/turn-verification | playwright、sharp | **硬依赖** DIARY_NODE_MODULES | 否 |

要点：package.json `scripts` 未登记任何一个；9 个 .mjs 的 playwright/sharp/pngjs 不在 package.json（设计为借用 Codex 自带 node_modules，见 check-diary.mjs L2 与 timeline-night-glass/implementation.md L90「不往项目安装新依赖」）；默认端口 5175 与 `dev`(5173)/`dev2`(5174) 均不对应，只能靠 `JOURNAL_URL` 或手动 `vite --port 5175`；所有浏览器脚本均声明只读、用 `page.route` 拦截后端、不写共享数据。


## sql

### sql/（2）

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
|---|---|---|---|---|---|
| `sql/dev-create-world.sql` | 开发一次性脚本：为两位已确认邮箱的用户手工建 public.worlds 两人世界（owner/member、status active）并校验 | 开发者在 Supabase SQL Editor 手工执行 | 早期脚本；PROJECT.md L104 明确「不代表当前结构」 | 表名已是 worlds（rooms→worlds 于 2026-07-04 7938619 完成）；L9 注释引用 ai/Features/world.md R-6 —— 文件不存在，R-6 在 ai/Features/supabase.md（F-10）；timeline.md L290 以旧名 dev-create-couple/room 提及（历史条目） | 已完成历史（保留作参考） |
| `sql/storage-memories-bucket.sql` | Storage 私有桶 memories（25MB、图片 mime）+ 4 条按路径首段 world_id 隔离的 RLS 策略；幂等；头注 2026-07-04 说明 room→world 策略重命名需重跑此脚本 | 开发者手工执行 | 早期脚本；PROJECT.md L104 声明不代表当前结构 | 策略体已用 public.worlds 且 drop 旧 room 名；ai/Features/timeline.md L293 链接有效；PROJECT.md L127 提到桶内还有 emotes/ 与世界 icon，与本脚本「首段必须为 world uuid」的策略不完全一致 → 线上以 DB 为准（限制项） | 已完成历史（保留作参考） |

- 与 ai/PROJECT.md 数据库章节（L104-139）的关系：PROJECT.md L104 明确「schema 变更历史不在仓库，sql/ 只剩两份早期脚本，不代表当前结构」，本分区核验与之一致；两脚本表名/策略已完成 rooms→worlds 改名（7938619，2026-07-04）。
- 与 ai/Features/timeline.md 的关系：L293 链接 `../../sql/storage-memories-bucket.sql` 有效；L290、L295 为 2026-06-30 的历史条目，引用的旧文件名与旧策略名不再存在（见陈旧陈述）。


## patches

### patches/（1）

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
|---|---|---|---|---|---|
| `patches/page-flip@2.0.7.patch` | pnpm 补丁：改 dist/js/page-flip.browser.js（压缩单行）——render() 帧索引 Math.max(0,…) 防负；start() 幂等（owRunning）、重置 timer=performance.now()、仅在动画中或 state≠read 时继续 rAF；新增 stop() 取消 rAF | pnpm install（经 pnpm-workspace.yaml/lockfile hash） | 权威（对 page-flip 行为）；但 page-flip 仅被未挂载的 journal-book.tsx 使用 | difflib 定位 5 处改动；lockfile hash 333ac2e2…；文档：journal-book-directions/implementation.md L60-62；book-implementation.md L27 记录旧引擎保留作历史 | 已完成历史（随 F-05 决定） |

- 补丁改动（difflib 对比压缩单行）：① `render()` 帧索引 `Math.max(0, Math.round(...))`；② `start()` 加 `owRunning` 幂等守卫、重置 `timer=performance.now()`、rAF 循环只在有动画或 `getState()!=="read"` 时续帧，否则自动停；③ 新增 `stop()`（置 `owRunning=false` + `cancelAnimationFrame`）。
- 链路：pnpm-workspace.yaml → 本补丁 → lockfile hash `333ac2e2…`；src 中 `page-flip` 仅 `src/themes/cinnaglass/journal-book.tsx`（`new PageFlip`）与 `src/types/page-flip.d.ts`，而 `journal-book.tsx` 没有任何 import 者（`screens.tsx` 导入的是 `journal-room-book`）；`book-implementation.md` L27 记录「旧 journal-book.tsx / diary.css 和翻页依赖保留作历史实现，本轮没有删除；当前日记不再实例化旧翻页引擎」。


## public

### public/ 文本文件（7）

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
|---|---|---|---|---|---|
| `public/fonts/journal/OFL.txt` | 字体许可证：SIL OFL 1.1；版权 LXGW（保留字体名 霞鹜/LXGW 等，附加许可允许转 WOFF2 供 web 分发）+ Klee Project（Fontworks） | 法律合规随字体分发（OFL 第 2 条要求随附） | 权威 | manifest.json license 字段指向它；仅被两份 manifest 引用；归属正确对应 LXGWWenKaiLite-Regular.woff2 | 当前有效（必须随字体保留） |
| `public/fonts/journal/manifest.json` | 字体溯源清单：LXGW WenKai Lite → Journal WenKai，来源 URL、arts 源 ttf sha、woff2 sha/bytes、转换方式、5.27MB 未子集化的性能告警 | 人/agent（设计系统、arts 清单、monet skill）；非运行时 | 权威（溯源） | sha256 8BCACE4F… 与 bytes 5269840 与实际文件一致（shasum 核验）；被 arts/ui/journal/manifest.json、living-props.md、.claude/skills/monet/design-system.md 引用 | 当前有效（溯源文档，随 build 发布） |
| `public/mock/couple-feed.json` | 早期 mock 数据：couple/user1/user2/posts（couple_id、unlock_cost、is_placeholder…） | 无 | 已作废（命名 couple→room→world 两代之前） | grep 全仓 basename/“mock/”/fetch('/ 零命中（src、index.html、scripts、ai、codex-visual、CSS）；唯一历史消费者 src/pages/CouplePage.tsx 于 2026-05-31 4fd4f48 删除 | 已作废；删除候选 D-02 |
| `public/rooms/study/parts/turntable.json` | build-turntable-parts.py 输出的零件清单：pivot、arm box、spindle box、platterArt/platterLight 路径、armTint、donor | 人/agent 对照；运行时不读取（值被手抄进 study-room.ts：arm box 976/834/102/82 一致） | 构建产物（溯源） | grep src 无 fetch；仅 scripts/build-turntable-parts.py 写入 | 当前有效（构建产物，非运行时消费） |
| `public/ui/journal/manifest.json` | 日记美术采用清单：6 张 webp 的尺寸与角色、源清单 arts/ui/journal/manifest.json、样式文件 | 人/agent；非运行时 | 权威（溯源） | sips 核验 6 张尺寸全部与清单一致；被 arts 清单、living-props.md、monet skill 引用 | 当前有效（溯源文档） |
| `public/ui/nav/manifest.json` | 导航纹理采用清单：frost.webp 512²、源 arts/ui/navigation/frost-source.png | 人/agent；非运行时 | 权威（溯源） | sips 核验 512×512 一致 | 当前有效（溯源文档） |
| `public/vite.svg` | Vite 官方 logo（模板自带） | index.html L5 favicon | 模板遗留 | 唯一引用 index.html；无项目自有图标替代 | 当前有效但为模板残留（F-09 / D-06 低置信） |

### public/ 二进制（34）

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
|---|---|---|---|---|---|
| `public/avatars/blue.png` | 默认头像（蓝）256² RGBA | src/themes/cinnaglass/screens.tsx、shell/chat-card.tsx；3 个 check 脚本当上传夹具 | 运行时资源；public 为唯一副本（源自 codex 2026-08-10 批次，arts/ 无真源） | grep 命中 5 个代码/脚本文件 | 当前有效 |
| `public/avatars/pink.png` | 默认头像（粉）256² RGBA | screens.tsx、chat-card.tsx | 运行时资源；唯一副本 | grep 命中 2 个代码文件 | 当前有效 |
| `public/characters/blue-reading-closed.png` | 角色立绘 蓝耳闭眼阅读帧 1024² RGBA（约 1.1–1.2MB） | src/themes/cinnaglass/room/room-scene.tsx；ai/design_system/character.md 图文 | 运行时资源；唯一副本（arts/ 无真源） | grep 命中 room-scene.tsx + character.md | 当前有效 |
| `public/characters/blue-reading-open.png` | 角色立绘 蓝耳睁眼阅读立绘 1024² RGBA（约 1.1–1.2MB） | src/themes/cinnaglass/room/room-scene.tsx；ai/design_system/character.md 图文 | 运行时资源；唯一副本（arts/ 无真源） | grep 命中 room-scene.tsx + character.md | 当前有效 |
| `public/characters/pink-writing-closed.png` | 角色立绘 粉耳闭眼书写帧 1024² RGBA（约 1.1–1.2MB） | src/themes/cinnaglass/room/room-scene.tsx；ai/design_system/character.md 图文 | 运行时资源；唯一副本（arts/ 无真源） | grep 命中 room-scene.tsx + character.md | 当前有效 |
| `public/characters/pink-writing-open.png` | 角色立绘 粉耳睁眼书写立绘 1024² RGBA（约 1.1–1.2MB） | src/themes/cinnaglass/room/room-scene.tsx；ai/design_system/character.md 图文 | 运行时资源；唯一副本（arts/ 无真源） | grep 命中 room-scene.tsx + character.md | 当前有效 |
| `public/fonts/journal/LXGWWenKaiLite-Regular.woff2` | 日记字体 WOFF2 5.27MB（未子集化） | src/themes/cinnaglass/journal-room.css @font-face url(/fonts/journal/…) | 运行时资源；源 ttf 在 arts/ui/journal | sha256 与 manifest 一致；grep 命中 journal-room.css；manifest 自带性能告警 | 当前有效 |
| `public/rooms/gameroom/thumb.png` | 房间缩略图 棋牌室（锁定）400×267 | src/themes/cinnaglass/shell/rail.tsx ROOMS 列表；ai/design_system/scene.md | 运行时资源；唯一副本 | grep 命中 rail.tsx | 当前有效 |
| `public/rooms/garden/thumb.png` | 房间缩略图 植物园（锁定）400×267 | src/themes/cinnaglass/shell/rail.tsx ROOMS 列表；ai/design_system/scene.md | 运行时资源；唯一副本 | grep 命中 rail.tsx | 当前有效 |
| `public/rooms/study/golden.png` | 书房底图 golden 1586×992 RGB（约 2.4MB），由 build-turntable-parts.py 从 arts/rooms/study/source/golden.png 贴入无盘无臂机器生成 | src/themes/cinnaglass/room/study-room.ts；设计文档多处 | 构建产物；真源 arts/rooms/study/source | grep 命中 study-room.ts L14-16 | 当前有效（构建产物） |
| `public/rooms/study/night.png` | 书房底图 night 1586×992 RGB（约 2.4MB），由 build-turntable-parts.py 从 arts/rooms/study/source/night.png 贴入无盘无臂机器生成 | src/themes/cinnaglass/room/study-room.ts；设计文档多处 | 构建产物；真源 arts/rooms/study/source | grep 命中 study-room.ts L14-16 | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-golden.png` | 唱片机零件 唱片外观基底 golden 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-light-add-golden.png` | 唱片机零件 静态加色光层 golden 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-light-add-night.png` | 唱片机零件 静态加色光层 night 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-light-add-twilight.png` | 唱片机零件 静态加色光层 twilight 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-light-mul-golden.png` | 唱片机零件 静态乘色光层 golden 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-light-mul-night.png` | 唱片机零件 静态乘色光层 night 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-light-mul-twilight.png` | 唱片机零件 静态乘色光层 twilight 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-night.png` | 唱片机零件 唱片外观基底 night 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/platter-twilight.png` | 唱片机零件 唱片外观基底 twilight 512²，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/spindle-golden.png` | 唱片机零件 转轴针 golden 36×44，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/spindle-night.png` | 唱片机零件 转轴针 night 36×44，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/spindle-twilight.png` | 唱片机零件 转轴针 twilight 36×44，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/parts/tonearm.png` | 唱片机零件 唱臂固有色零件 204×164，build-turntable-parts.py 产物 | src/themes/cinnaglass/room/study-room.ts 硬编码路径；turntable.json 登记 | 构建产物；可由脚本+arts 真源重建 | grep 命中 study-room.ts | 当前有效（构建产物） |
| `public/rooms/study/thumb.png` | 房间缩略图 书房 400×250 | src/themes/cinnaglass/shell/rail.tsx ROOMS 列表；ai/design_system/scene.md | 运行时资源；唯一副本 | grep 命中 rail.tsx | 当前有效 |
| `public/rooms/study/twilight.png` | 书房底图 twilight 1586×992 RGB（约 2.4MB），由 build-turntable-parts.py 从 arts/rooms/study/source/twilight.png 贴入无盘无臂机器生成 | src/themes/cinnaglass/room/study-room.ts；设计文档多处 | 构建产物；真源 arts/rooms/study/source | grep 命中 study-room.ts L14-16 | 当前有效（构建产物） |
| `public/ui/disc-cover.png` | 唱片封面 256² RGBA | src/themes/cinnaglass/shell/floaters.tsx | 运行时资源；唯一副本（codex 2026-08-11 批次） | grep 命中 floaters.tsx | 当前有效 |
| `public/ui/journal/avatar-blue.webp` | 日记默认自己头像 84² webp（pack-journal-art.mjs 从概念图裁出） | src/themes/cinnaglass/journal-layout.ts 动态 `/ui/journal/avatar-${defaultAvatar}.webp`；check-journal-turn.mjs 测试 URL | 构建产物 | 动态路径 grep 命中 journal-layout.ts L39；尺寸与 manifest 一致 | 当前有效（构建产物） |
| `public/ui/journal/avatar-pink.webp` | 日记默认伴侣头像 84² webp | journal-layout.ts 动态路径（同上） | 构建产物 | basename 静态 grep 无命中，动态模板命中；尺寸与 manifest 一致 | 当前有效（构建产物） |
| `public/ui/journal/book-open.webp` | 翻开的空白日记本 1536×1024 透明 webp | journal-room-book.tsx L241、journal-turn.ts；3 个脚本 | 构建产物（pack-journal-art.mjs） | grep 命中 2 代码文件 | 当前有效（构建产物） |
| `public/ui/journal/book-single.webp` | 窄屏右页裁切 789×1024 webp | journal-room.css、journal-turn.ts | 构建产物 | grep 命中 2 代码文件 | 当前有效（构建产物） |
| `public/ui/journal/paper-corner.webp` | 纸纤维贴图 256² webp | journal-room.css L247/L317 url() | 构建产物 | grep 命中 CSS url() | 当前有效（构建产物） |
| `public/ui/journal/quill.webp` | 羽毛笔 310×680 透明 webp | journal-room.css mask url()、journal-room-book.tsx L370 | 构建产物 | grep 命中 2 代码文件 | 当前有效（构建产物） |
| `public/ui/nav/frost.webp` | 导航玻璃微纹理 512² webp（pack-navigation-texture.mjs 产物） | src/themes/cinnaglass/shell/navigation-glass.css url()；check-navigation.mjs 断言 | 构建产物；真源 arts/ui/navigation/frost-source.png | grep 命中 CSS + 设计文档多处 | 当前有效（构建产物） |

**public/ 消费者核验结论：**

- 41 个文件中 **无消费者的只有 1 个**：`public/mock/couple-feed.json`（D-02）。
- 非运行时消费但有文档消费者：`fonts/journal/manifest.json`、`ui/journal/manifest.json`、`ui/nav/manifest.json`、`rooms/study/parts/turntable.json`（F-11）。
- manifest 一致性：`ui/journal/manifest.json` 6 张尺寸与 sips 实测一致；`ui/nav/manifest.json` 512² 一致；`fonts/journal/manifest.json` sha256/bytes 与文件一致；`turntable.json` 的 arm box 与 `study-room.ts` L85 手抄值一致。`public/ui/journal/` 目录里没有 manifest 未登记的文件，也没有登记了却不存在的文件。
- 许可证：`fonts/journal/OFL.txt` = SIL OFL 1.1，版权人 LXGW（LXGW WenKai Lite，保留字体名 霞鹜/落霞孤鹜/LXGW；附加许可明确允许 WOFF/WOFF2 转换用于 web 分发）+ Klee Project（Fontworks，上游字形来源）。与 woff2 文件归属正确；OFL 第 2 条要求随字体附带，**必须保留**。
- 真源关系：`rooms/study/*.png`、`rooms/study/parts/*`、`ui/journal/*.webp`、`ui/nav/frost.webp`、字体均可由 arts/ 真源 + scripts/ 重建；`avatars/*.png`、`characters/*.png`、`rooms/*/thumb.png`、`ui/disc-cover.png` 在 arts/ 无源文件，public/ 是唯一副本（来源仅见 codex-visual/20260811-055917Z/resize_assets.py 中的 Windows 绝对路径）。
- 体积提示：characters 4×~1.15MB PNG + study 底图 3×~2.4MB + 字体 5.27MB ≈ 17MB 静态负载（非冗余问题，仅记录）。


## findings

### 发现

| 编号 | 类别 | 标题 | 证据 | 建议 | 风险 | 验证 | 需用户决定 |
|---|---|---|---|---|---|---|---|
| F-01 | 陈旧陈述 | README.md 是 Vite+Supabase「todos」模板说明，与项目无关 | README.md L1 标题、L3-8 列出的 `src/services/todos.service.ts`、`src/hooks/useTodos.ts` 不存在（find src 确认）；L30-71 SQL 建 `public.todos` 表，PROJECT.md L104-127 的实际表为 worlds/posts/profiles/…；L86 建议替换的 `src/types/database.ts` 已被 TODO.md L115 判为死文件。末次改动 2026-03-06。 | 重写为项目结构/启动说明（保留 §1 环境变量与 §3 运行两段真实内容），或缩成一段指向 ai/PROJECT.md。 | 低：纯文档。 | 对照 src 目录树与 ai/PROJECT.md 项目结构章节。 | 是（内容取舍） |
| F-02 | 冗余文件 | 根目录 timeline_3d_posts.html 为 4 月 3D 时代独立实验页 | 462 行 HTML 片段，CDN three r128，硬编码 mock；全仓 grep 仅 ai/TODO.md L115（已列为待删）与 ai/Features/ui-system/audit.md L80 提及；无 import/href/vite 引用。 | 删除（D-01）；若要保留为历史 mockup，按 CLAUDE.md 规则移入 `ai/Features/timeline/` 并在 timeline.md 链接。 | 极低：无消费者；git 3fd52a5 可恢复。 | 删除后 `pnpm build` 与 grep 不受影响。 | 是（删除） |
| F-03 | 冗余文件 | public/mock/couple-feed.json 零消费者 | basename/`mock/`/`fetch('/` 全仓 grep 零命中；唯一历史消费者 src/pages/CouplePage.tsx 于 2026-05-31 4fd4f48 删除；字段仍是 couple_id 旧命名。 | 删除（D-02），并连带删除空目录 public/mock/。 | 极低。 | 删除后 `pnpm build` 与 grep 不受影响。 | 是（删除） |
| F-04 | 依赖 | @react-three/rapier 依赖与 vite.config.ts optimizeDeps 段是 three 场景退役残留 | package.json L15 仍有 `@react-three/rapier`；src 对 rapier/three/drei 零 import；git 4619fff（2026-08-10）移除了 drei/fiber/three/@types/three 却漏了 rapier；lockfile 因此仍锁 three@0.185.1、@react-three/fiber 9.6.1、three-stdlib；vite.config.ts L13-17 注释讨论的 drei 深导入问题已不存在；TODO.md L113 却记「three 全家依赖」已删。 | 移除依赖 + 删除 optimizeDeps 块，`pnpm install` 刷新 lockfile；同步修正 TODO.md L113。 | 低：无引用；需 `pnpm install && pnpm build` 验证。 | `grep -rn "react-three\\|three" src` 为空 + build 通过。 | 是（依赖变更） |
| F-05 | 依赖 | page-flip 依赖 + patches/page-flip@2.0.7.patch + pnpm-workspace.yaml 仅为未挂载的历史实现存在 | `page-flip` 只被 src/themes/cinnaglass/journal-book.tsx 与 src/types/page-flip.d.ts 引用，journal-book.tsx 无任何 import 者；book-implementation.md L27 明确记录「保留作历史实现，本轮没有删除」；scripts/check-journal.mjs 依赖它的 `owRunning`。 | 用户决定：A) 删 page-flip + 补丁 + workspace 条目 + d.ts + journal-book.tsx + diary.css 残留 + check-journal.mjs（研究文档 implementation.md L60-62 已完整记录补丁内容，可作恢复依据）；B) 明确保留并在 TODO.md 记一条带期限的清理项。 | 中：涉及 src 文件（其它分区）与 pnpm 配置；须 build + 手测日记翻页。 | `pnpm install && pnpm build`；打开日记确认翻页仍走 journal-turn.ts。 | 是 |
| F-06 | 测试脚本 | scripts/ 无一登记于 package.json，依赖全部未声明，端口约定不统一 | 12 个脚本 0 个在 package.json scripts；9 个 .mjs 依赖 playwright/sharp/pngjs（设计上借 DIARY_NODE_MODULES 指向 Codex 自带 node_modules，3 个脚本无回退硬依赖该变量）；2 个 .py 依赖 Pillow/numpy/opencv 无 requirements；默认端口 5175（check-diary 5173）与 dev 5173/dev2 5174 不一致；唯一零依赖可直接运行的是 check-design-system.mjs（design_system/README.md L23 指示运行）。 | ① 在 package.json 加 `check:design` 脚本并可作为最小 CI 步骤；② 建 scripts/README.md（或 PROJECT.md 一节）登记每个脚本的类型/输入/输出/依赖/端口（可直接复用上表）；③ 为 .py 加 requirements 文件；④ 决定 playwright/sharp 是否进 devDependencies（会显著增大安装）或维持 DIARY_NODE_MODULES 约定并写明。 | 低（文档/登记）到中（加依赖）。 | 按登记表逐个 `node`/`python` 试跑一遍。 | 是（依赖策略） |
| F-07 | 测试脚本 | scripts/check-journal.mjs 绑定已退役的 page-flip 引擎 | 脚本读取 `.journal-engine` 元素的 `journalEngine.getState()/getRender().owRunning`，该属性只由 journal-book.tsx（DEV）挂载，而它已不被渲染（check-journal-art.mjs 反而断言 `.stf__parent` 数量为 0）。 | 随 F-05 决定：删除，或移入 `ai/design_system/uiux/research/cinnaglass-history/journal-book-directions/` 与其 verification 目录同住。 | 低。 | — | 是 |
| F-08 | 其他 | .gitignore 规则与 2 个已跟踪文件冲突 | `git ls-files \| git check-ignore --no-index -v`：`arts/meshes/scene.blend1`（L33 `*.blend1`）、`codex-visual/20260811-055917Z/__pycache__/measure_concept.cpython-312.pyc`（L36 `__pycache__/`）。两条规则 2026-09-05 d880d1f 加入时文件早已入库。 | `git rm --cached` 两文件（属 arts/、codex-visual/ 分区，由对应分区/用户确认），保留工作区副本由 .gitignore 接管。 | 低；.blend1 为 Blender 自动备份，.pyc 为缓存。 | 再次运行 check-ignore 应为空。 | 是（git 写操作） |
| F-09 | 目录组织 | public/vite.svg 是 Vite 模板 logo，仍作项目 favicon | index.html L5 `<link rel=icon href="/vite.svg">` 是唯一引用；项目标题为「我们的小世界 · Our World」，arts/ 无自有图标。 | 由 monet/ui-tailor 产出项目 favicon 替换，再删 vite.svg（D-06，低置信，依赖替换）。 | 低。 | 浏览器 tab 图标。 | 是 |
| F-10 | 断链 | sql/dev-create-world.sql L9 引用 `ai/Features/world.md R-6`，文件不存在 | ai/Features/ 现有 chat.md、navigation-glass.md、supabase.md、timeline.md、ui-system/；R-6 出现在 ai/Features/supabase.md。 | 注释改为 `ai/Features/supabase.md R-6`。 | 极低（注释）。 | grep R-6。 | 否（机械修正，仍需用户点头后改） |
| F-11 | 目录组织 | public/ 内 4 份 JSON（3 个 manifest + turntable.json）是溯源文档而非运行时资源，会随 build 发布到线上 | 运行时 grep：src 无 fetch/import 任一 JSON；turntable.json 的值被手抄进 study-room.ts；manifest 被 arts/ 清单、ai/design_system 文档与 .claude/skills/monet/design-system.md 引用。内容与实际文件一致（见 #public）。 | 可接受现状（体积 <4KB）；若要清理线上产物，迁到 arts/ 对应目录需同步改 arts 清单、设计文档及 monet skill 链接（后者须走 skill-creator）。 | 低。 | check-design-system.mjs 链接校验。 | 是 |
| F-12 | 目录组织 | scripts/ 内 .py 与 .mjs 混放、无总览；public/ 部分资源没有 arts/ 真源 | scripts/ 无 README，依赖靠各脚本 docstring/首行注释说明；PROJECT.md L56 只登记两个 .py。avatars/characters/thumbs/disc-cover 在 arts/ 无源，只在 codex-visual/20260811-055917Z/resize_assets.py 见 Windows 绝对路径来源。 | ① 与 F-06 合并成 scripts 登记表；② 决定是否把 codex 生成的原图回填到 arts/（或在设计系统文档声明 public 为这些资源的真源）。 | 低。 | — | 是 |

## stale

### 陈旧陈述清单

| 文件:行 | 陈述 | 实际 |
|---|---|---|
| README.md:1 | 标题「Vite + React + Supabase」，把项目描述为 todos 模板 | 项目是「我们的小世界 · Our World」（index.html L13）：React 19 + PixiJS 8 场景合成器 + Supabase |
| README.md:3-8 | 「includes a practical Supabase API layer: src/services/todos.service.ts, src/hooks/useTodos.ts, src/types/database.ts」 | 前两者不存在；src/lib/ 为 worlds/posts/profiles/chat/storage 数据层；database.ts 仅声明无人用的 todos 表（TODO.md L115 列为死文件） |
| README.md:30-71 | 建 `public.todos` 表与 4 条 RLS 的 SQL | 项目无 todos 表；实际表见 ai/PROJECT.md L104-127（worlds/posts/profiles 等），schema 迁移历史不在仓库 |
| README.md:82-86 | 「Next Step: Add auth… replace local src/types/database.ts」 | auth（LoginPage/ResetPassword/ProtectedRoute dev 自动登录）早已实现；database.ts 待删 |
| vite.config.ts:13-17 | 注释：AV 软件阻塞大预打包文件，代码须深导入 drei 子模块；include @react-three/rapier | drei/fiber/three 已于 2026-08-10 4619fff 移除，src 无任何 three/rapier import；该配置已无作用 |
| ai/TODO.md:113 | 「已删（2026-08-10/11）：… three 全家依赖」 | package.json 仍含 @react-three/rapier，lockfile 仍锁 three@0.185.1/@react-three/fiber/three-stdlib |
| ai/Features/timeline.md:290 | ST-F：`sql/dev-create-couple.sql`→`sql/dev-create-room.sql` | 当前文件为 `sql/dev-create-world.sql`（2026-07-04 7938619 二次改名）；该条为 2026-06-30 历史记录，非链接 |
| ai/Features/timeline.md:295 | 「策略已随 ST-A 改名 `memories: room can …`」 | sql/storage-memories-bucket.sql 现建 `memories: world can …` 并 drop 旧 room 名（脚本头注 2026-07-04）；历史条目 |
| sql/dev-create-world.sql:9 | 「See ai/Features/world.md R-6」 | ai/Features/world.md 不存在；R-6 在 ai/Features/supabase.md |
| AGENTS.md:11（受保护，仅登记） | 「根据任务需要读取 ai/Features/*.md、ai/UNITY_PROJECT.md、ai/UNITY_TODO.md」 | ai/UNITY_PROJECT.md、ai/UNITY_TODO.md 不存在 |

## deletion

### 删除候选（恢复依据：git 基线 3fd52a5，`git show 3fd52a5:<path>`）

| 编号 | 路径 | 理由 | 查过的引用面 | 置信 |
|---|---|---|---|---|
| D-01 | timeline_3d_posts.html | 4 月 3D 场景时代独立实验页；TODO.md L115 已列为待删 | 全仓 grep（src/index.html/vite/scripts/ai 文档/codex-visual）：仅 TODO.md L115、ui-system/audit.md L80 两处「候选」提及；无 href/src/import；文件为片段无法独立打开 | 高 |
| D-02 | public/mock/couple-feed.json（含空目录 public/mock/） | 零消费者；couple_id 旧命名；历史消费者 CouplePage.tsx 2026-05-31 删除 | 全仓 grep basename、`mock/`、`fetch('/`、CSS url()、scripts、ai 文档、codex-visual 均零命中；git grep 4fd4f48^ 定位到最后消费者 | 高 |
| D-03 | package.json → dependencies["@react-three/rapier"] + vite.config.ts optimizeDeps 块 | three 场景退役漏删；src 零引用 | grep src `react-three\|rapier\|drei\|three`；git log -p package.json 追溯 4619fff | 高（需 pnpm install + build 验证） |
| D-04 | page-flip 依赖 + patches/page-flip@2.0.7.patch + pnpm-workspace.yaml patchedDependencies 条目 | 只服务于未挂载的 journal-book.tsx；文档明示「保留作历史实现」→ 需用户拍板 | grep src `page-flip\|PageFlip\|journal-book`（无 import 者）；lockfile；design_system 文档 implementation.md L60-62 已记录补丁内容可作恢复依据 | 中（有意保留的历史实现） |
| D-05 | scripts/check-journal.mjs | 驱动已退役 page-flip 引擎（journalEngine/owRunning），对当前应用不可通过 | grep src `.journal-engine`（只在 journal-book.tsx/journal-room-book.tsx/CSS）；journal-book.tsx 无 import 者；design 文档三处提及作历史 | 中（随 D-04；或移入研究归档） |
| D-06 | public/vite.svg | Vite 模板 logo 当 favicon | index.html L5 唯一引用 → 须先替换图标再删 | 低（依赖替换） |

## limits

### 限制与未完成

- 未运行任何脚本（node_modules 未安装、无 playwright/sharp/Python 依赖、无 dev server），因此 9 个浏览器/图像脚本「对当前 DOM 是否仍能通过」仅凭源码选择器与 src 交叉比对推断：check-journal.mjs 判为不可通过（依据明确），check-diary.mjs 针对 `.tl-card` 旧时间线 DOM，是否仍成立未验证。
- pnpm-lock.yaml（89KB）与 patches/page-flip@2.0.7.patch（88KB 压缩单行）未逐字符通读：前者做 importers 双向差集 + 关键段检索；后者用 difflib 定位全部 5 处改动并复述语义。
- 二进制 34 个文件仅核元数据、sha256、尺寸与消费者引用，未做视觉/像素审核。
- 受保护范围：`.claude/`、`.agents/` 只做目录存在性检查；AGENTS.md/CLAUDE.md 只读登记，不提修改；ai/sessions/ 未读。
- 线上 Supabase 未核对（无 MCP/凭据）：sql/ 与 PROJECT.md L127（memories 桶还放 emotes/ 与世界 icon，而脚本策略要求路径首段是 world uuid）之间的差异只能记为「以线上为准」，不下结论。
- F-08 涉及的两个已跟踪文件属 arts/、codex-visual/ 分区，本分区只报告 .gitignore 侧事实，不代其判定删除。
- codex 生成资源（avatars/characters/thumbs/disc-cover）的原图来源只追到 codex-visual/20260811-055917Z 的 Windows 绝对路径，未能在仓库内定位真源。

