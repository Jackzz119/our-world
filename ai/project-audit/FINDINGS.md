# FINDINGS — 当前审核发现

任务状态仍以 `ai/TODO.md` 为准。本表登记审核发现与待采纳建议，不冒充已实施任务；原始记录见各 run 的 `evidence/*-review.md`。
问题 ID 跨复查稳定，所属步骤可变，状态与证据保留。证据等级：**实测** = 本轮命令/脚本实际执行；**静态** = 全文阅读 + grep 引用面；**待验证** = 需线上或运行环境。

## 第一步（运行 2026-09-18-01，基线 3fd52a5）

### 已处理

| ID | 结论 | 证据 / 定位 |
| --- | --- | --- |
| PA-001 | 删除 55 个证据充分的冗余文件（约 59.7MB）：2 个违反既有 `.gitignore` 规则却被跟踪的文件（`arts/meshes/scene.blend1`、`__pycache__/*.pyc`）、1 个 0 字节安装缓存 `deps/.lock`、3 个零引用死文件（`timeline_3d_posts.html`、`src/types/database.ts`、`public/mock/couple-feed.json`）、1 个与 `navigation-concepts/` 逐字节相同的目录 `ui-concepts/`（4 文件）、13 张可由 `art-relighting-preview/index.html` 同参数再生成的纹理图、5 张脚本失败分支残留截图、27 个可由 `render-journal-turn.mjs`/`check-journal-turn.mjs` 一条命令再生的翻页选帧与 32 字节结果。每项均 grep 全仓（含 CSS url()、HTML src、manifest、脚本读取侧）确认零消费者；恢复依据 `git checkout 3fd52a5 -- <path>` | 静态 + `git check-ignore` 实测；清单 `runs/2026-09-18-01/evidence/deleted-files.txt`；各分区 review 的「删除候选」节 |
| PA-002 | 根 `README.md` 是 Vite+Supabase「todos」模板残留（引用不存在的 `src/services/todos.service.ts`、`useTodos.ts`），已重写为项目入口（定位、文档索引、技术栈、命令、目录） | `evidence/root-review.md#findings` F-01 |
| PA-003 | 活文档逐份压缩并核对源码事实：PROJECT/TODO 由审核直接改写，Features 与设计系统文档由独立子任务压缩并附 ledger（保留/删除/改正清单）；逐文档字节与 2/3 验收见阶段报告 | `runs/2026-09-18-01/metrics/documents/`、`evidence/ledger-*.md` |
| PA-004 | 短文档陈旧陈述修正（不为凑比例裁剪）：`scene.md` 房间模板并无音景字段；`effects.md`「默认静音启动」实为「无手势不自动播放」且音景仅是目标；两份 `production-batches.md`、`visual-principles` 仍以已成桩的 STYLE 为依据；`prompts.md` 参考图路径已迁移；`cinnaglass-history/README.md` 把重复目录列成两份资料；`journal-room-object/codex-report.md` 提案时状态加 2026-09-18 归档说明 | 短文档例外复核结构化结果 `evidence/workflow-structured-results.json`；`evidence/design-review.md#陈旧陈述` |
| PA-005 | `ai/STYLE.md` / `ai/UX.md` 已是兼容桩，但源码 6 处、文档 2 处按旧章节号 `§2/§4/§5/§6/§8` 引用：桩内补「旧章节 → 现文档」对应表，使引用可回溯；源码注释本身留第二步改 | `evidence/src-review.md` F5；`evidence/ai-core-review.md` F3 |
| PA-006 | PROJECT.md 陈旧事实随压缩改正：标签池实际只有 `chat`（`auth` 未走 Logman）；结构树补全 hooks/utils/pages/journal-* 并标 `database.ts` 死文件；`types/ ✅ 保留` 与「database.ts 死文件」自相矛盾已消除；`reboot/` 索引补时点说明；`@react-three/rapier` 残留登记 | `evidence/ai-core-review.md` §2 S1/S10、`evidence/src-review.md` F8 |

### 用户已决定并于 2026-09-19 执行（原「待用户决定」）

用户 2026-09-19 决定：① 3D 源不需要 → 已删 `ai/blender/` 与 `arts/meshes/`；② page-flip 历史链不需要 → 已删 `journal-book.tsx`、`page-flip.d.ts`、`patches/`、`pnpm-workspace.yaml`、`check-journal.mjs` 与依赖，lockfile 已刷新；③ `codex-visual/` 移入 `ai/codex-visual/` 只留 `codex-visual` 技能的 12 个比稿/审核批次，比稿图与设计系统/public 重复的副本删除并改链接，生产用生成批次的已采用原件移到 `arts/`（characters、rooms/thumbs、rooms/study/source 与 generated），失败尝试与被取代轮次删除；`public/` 只留运行时真正读取的文件，4 份 manifest/turntable.json 移到 `arts/`（装配器 `--manifest` 参数改写出路径）；④ 旧验证截图删除 35 张（`_shots` 23、`journal-book-directions/verification` 12），近期（2026-09-07～11）验证素材保留；⑤ 技能目录：项目无 `ai/jaSkill`，以内容更新的一侧为准把 `.claude/skills` 与 `.agents/skills` 对齐（monet / ui-tailor / codex-visual 正文一致，仅 Codex 显示元数据 `agents/openai.yaml` 留在 `.agents`），删除旧 `.claude/skills/monet/design-system.md`；`ai/Features` → `ai/features`，30 个文件的引用同步。字体源 ttf 与 `book-alpha.png` 未提及，保留（PA-011 ◐）。

| ID | 范围 / 结论 | 证据 | 尚需什么 |
| --- | --- | --- | --- |
| PA-007 ✅ | `ai/blender/scripts/*.py`（3）+ `arts/meshes/{metaspace,avatar,scene}.blend`（1.9MB）：three.js 场景 2026-08-10 退役（`4619fff`），脚本引用的 `metaspace.tsx`、`public/models/*.glb`、`ai/blender/metaspace.md` 均已不存在，脚本写死 `D:\Repo` 路径，全仓零消费者；`scene.blend` 无生成脚本、配套文档已删 | 静态；`evidence/ai-core-review.md` F7、`evidence/batches-review.md` F-6 | 用户确认是否为 R2/R3 保留 3D 源作备用。是 → 保留并在 PROJECT 索引标「已退役 3D 试验」；否 → 删除整组（恢复依据 3fd52a5） |
| PA-008 ✅ | `page-flip` 依赖 + `patches/page-flip@2.0.7.patch` + `pnpm-workspace.yaml` 条目 + `src/types/page-flip.d.ts` + `src/themes/cinnaglass/journal-book.tsx`（零 importer）+ `scripts/check-journal.mjs`（驱动已退役引擎）：整条链只服务被 `journal-room-book` 取代的旧翻页；`book-implementation.md:27` 明示「保留作历史实现」 | 静态；`evidence/src-review.md` F3、`evidence/root-review.md` F-05/F-07 | 用户定时点：删则六件一起删并 `pnpm install` 刷 lock、build + 手测翻页；留则 TODO 记带期限清理项 |
| PA-009 ✅ | `codex-visual/` ↔ `ai/design_system` / `arts` / `public` 精确重复约 66MB（概念图 6 张、活物分解 3 张、导航比稿 3 张、三档原画 3 张、角色 4 张、头像/唱片封面 3 张、唱片机三批图层 18 文件）。设计系统 2026-09-12 自述「正式副本在本域」、codex-visual 为「原始批次含失败尝试」——两侧都被登记链接 | 静态 sha256；`evidence/batches-review.md` F-1/F-2/F-4/F-5、`evidence/design-review.md` F-01 | 用户选策略：A 保持双份（现状）；B design_system 侧改链接指向 codex-visual 原件（省 36MB，常驻文档不再自足）；C `arts/rooms/study/generated/` 改定义为「装配输入库」只留装配器实际读取的 3 个文件 + README（省 12MB，见 batches F-2 方案 A） |
| PA-010 ✅ | 验证脚本一次性输出仍留仓约 48MB：`navigation-verification` 23 张状态/视口图、`book-verification` 8 张、`journal-book-directions/verification` 13 张已否决方案回归图、`cinnaglass-history/_shots` 23 张零引用截图 | 静态；`evidence/design-review.md` D-05/D-07/D-08 | 用户决定保留几张作视觉存档还是按清单删除；建议每档留 1 张 scene 图 |
| PA-011 ◐ | `arts/ui/journal/LXGWWenKaiLite-Regular.ttf`（13.9MB 第三方字体源，运行时只用 woff2，manifest 已记 upstream URL + sha）；`arts/ui/journal/book-alpha.png`（打包器每次重写的中间产物） | 静态；`evidence/batches-review.md` F-7 | 离线可重转 vs 体积，用户决定 |
| PA-012 ✅ | `.claude/skills/` 与 `.agents/skills/` 两套技能目录内容已漂移（codex-visual、monet 各 3 文件不同；`ui-tailor` 只在 `.agents`；`monet/design-system.md` 只在 `.claude`），`AGENTS.md` 规定不复制成两套真源 | `evidence/skills-dir-drift.txt`（目录级 diff，未读正文） | 受保护范围，须经 `skill-creator` 且用户同意后处理 |
| PA-013 ✅ | `ai/` 子目录命名三风格并存（`Features` PascalCase、`design_system` snake、其余 kebab/小写）；协议文件示例即用 `ai/Features/`，引用面 25+ 处 | `evidence/ai-core-review.md` F9 | 建议不重命名、新目录统一 kebab-case；用户确认是否接受长期不一致 |

### 待第二步或后续步骤处理

| ID | 结论 | 后续动作 |
| --- | --- | --- |
| PA-014 | `package.json` 残留 `@react-three/rapier`（src 零引用）与 `vite.config.ts` 的 `optimizeDeps` 段/drei 注释是 three 退役漏删；lockfile 因此仍锁 three/fiber | 第二步：移除依赖与配置块，`pnpm install && pnpm build` 验证；TODO 退役清理已登记 |
| PA-015 | 源码注释 20 余处引用失效文档/编号：`ai/UX.md §N`、`ai/STYLE.md §6`（6 处）、`ai/Features/channel.md`/`world.md`（5 处）、`chat.md CH-12/CH-17/EMO-3/EMO-4`、`ux decisions D-7-3`、`ow.css`；`sql/dev-create-world.sql:9` 引用不存在的 `ai/Features/world.md R-6`（应为 `supabase.md`） | 第二步注释精简时按 `evidence/src-review.md` F5 表逐条改指向 |
| PA-016 | 既有构建阻断：`shell/chat-card.tsx:10` 从 `../model` 导入不存在的 `Msg`（实际在 `chat-data.ts`），`tsc -b` 失败；`music.tsx:9` react-refresh lint error | 第二步一行修复；TODO Bugs 已有 |
| PA-017 | `scripts/` 12 个脚本无一登记于 `package.json`，9 个 `.mjs` 依赖 playwright/sharp/pngjs 借用外部 `DIARY_NODE_MODULES`（3 个无回退硬依赖），2 个 `.py` 无 requirements，默认端口 5175 与 dev 5173/5174 不一致；唯一零依赖可运行的是 `check-design-system.mjs` | 第二步：加 `check:design` npm script、脚本登记表（可复用 `evidence/root-review.md#scripts` 表）、决定依赖策略 |
| PA-018 | `ui-system.html` 组件表仍描述已否决的 B 苔绿日记几何、16px/1.75 正文、`diary.css` 现役等（S-05～S-08、S-13、S-14）；`decisions-v2.md` 白纸形态被两处活引用当依据未标替代 | UI Tailor 在 M1 前修正预览页陈旧项并在引用处加「形态以 book-implementation.md 为准」 |
| PA-019 | `ux-decisions.md:9/24/37` 反引号路径指向不存在的 `ai/Features/ui-system.md`、`channel.md`、`settings.md`；`ux-decisions.md` 章节顺序 D-10→D-12→D-11 | 历史归档原件，只在文首加阅读说明，不改正文；本轮未动 |
| PA-020 | `public/` 内 4 份 JSON（3 manifest + `turntable.json`）是溯源文档，随 build 发布（<4KB）；`public/vite.svg` 模板 logo 仍作 favicon | 低优先：迁到 `arts/` 需同步 manifest/设计文档/monet skill 链接；favicon 待美术产出后替换 |
| PA-021 | `AGENTS.md:11` 要求按需读取不存在的 `ai/UNITY_PROJECT.md`、`ai/UNITY_TODO.md`；触发表中的 `skill-creator`/`skill-installer` 在 `.claude/skills/` 无同名目录（本会话以插件形式存在） | 受保护协议，仅登记 |
| PA-022 | `inventory.py` 因 `SKIP_NAMES` 含 `__pycache__` 漏收 1 个已跟踪 `.pyc`（本轮已删）；下轮清单应对「被 git 跟踪但被忽略规则命中」的文件单独列出 | 第五步/下轮脚本迭代 |

已在 `ai/TODO.md` Bugs 与 `ai/Features/ui-system/audit.md` 登记、不重复开 ID 的线索：世界设置有真实保存链但无 UI 入口；`WorldPage` widget 键与 `rail.tsx` MODULE_DEFS 不一致；`calendar.tsx` `ANNIV` 硬编码与 `world.anniversary` 双真源；`rooms.ts`/`scene.tsx` 待迁出消费者后清理；`diary.css` 中仅被 `journal-book.tsx` 使用的死样式。
