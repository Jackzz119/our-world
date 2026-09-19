# 分区审阅 · ai-core（子任务 01-S05）

> 基线：`3fd52a5`（分支 dev，HEAD 与基线一致，`git status` 仅 `?? ai/project-audit/`）。审阅日 2026-09-18。
> 范围：`ai/` 下除 `ai/design_system/`、`ai/sessions/` 外的全部清单文件，共 **20** 个（由 `metrics/baseline/inventory.csv` 过滤得出，全部为 text）。
> 方法：每份文本文件 `cat -n` / 分段 Read 读完全文；对文档中的路径、链接、技术事实用 `grep`/`ls`/`git log` 对照源码与磁盘；受保护范围（`.claude/`、`.agents/`、`CLAUDE.md`、`AGENTS.md`）只用 `test -e` 确认存在，未读正文；`ai/sessions/` 只 `find` 列路径。未安装 node_modules，未跑 tsc/构建。

## 0. 范围核对

| 项 | 值 |
| --- | --- |
| 清单内属于本分区的路径 | 20 |
| 已检查（全文 + 引用核验） | 20 |
| 待验证 / 不适用 / 受限 | 0 / 0 / 0 |
| 磁盘上存在但不在清单、故不入 CSV | `ai/project-audit/scripts/measure-docs.py`、`ai/project-audit/{INDEX,STEPS,EXTRA-STEPS,FINDINGS}.md`、`ai/project-audit/.gitattributes`（清单生成后新增的本轮支撑文件，见 §6） |
| `ai/sessions/` 仅列路径 | `ai/sessions/活物件-唱片机-生成优先分层管线.md`（1 个文件，未读） |

## 1. 逐文件用途判定表

权威性取值：**唯一真源** / **摘要** / **临时真源** / **归档** / **兼容入口** / **本轮支撑**。生命周期：**在役** / **归档冻结** / **无消费者** / **待回填**。

| 路径 | 用途 | 使用者 | 权威性 | 引用证据（入向） | 最后更新 | 生命周期判定 |
| --- | --- | --- | --- | --- | --- | --- |
| `ai/PROJECT.md` | PRD + 技术事实 + 数据库临时真源 + 文档索引 | 人 / agent（CLAUDE.md 要求每次会话读） | PRD 唯一真源；数据库节自称临时真源；技术栈节含大段唱片机管线（重复，见 §3） | TODO.md:5、reboot/README.md:4、src/lib/logman.ts:3-4（标签池）、design_system 多处、codex-visual 报告 | 3fd52a5 2026-09-13 | 在役 |
| `ai/TODO.md` | 任务唯一来源（Epic/Bug/Phase/继承待办/已完成） | 人 / agent（intj skill） | 任务唯一真源；但 §活物件 五轮记录是实现细节长文（重复，见 §3） | PROJECT.md:169、STYLE.md:5、design_system/design-system.md:55、art-relighting.md:4、ui-system.md:5 | 3fd52a5 2026-09-13 | 在役 |
| `ai/STYLE.md` | 旧风格文档的兼容入口（5 行，跳转 design_system） | 旧链接 / 旧代码注释 | 兼容入口 | design_system/research/visual-principles-2026-09-12.md:3、concept/baselines/companionship-room/codex-report.md:3、reboot/README.md:4、src/themes/cinnaglass/room/room-types.ts:124（`§6`）、codex-visual 4 份历史报告 | 9645dbc 2026-09-13（95 行→5 行） | 在役（兼容入口） |
| `ai/UX.md` | 旧交互文档的兼容入口（6 行） | 旧链接 / 旧代码注释 | 兼容入口 | src 5 处注释引用 `ai/UX.md §2/§4/§5`（WorldPage.tsx:242,345,434；rail.tsx:27；room-types.ts:136；study-room.ts:52）；codex-visual 3 份历史报告 | 9645dbc 2026-09-13（101 行→6 行） | 在役（兼容入口，章节引用已失效，见 F3） |
| `ai/Features/timeline.md` | 回忆链路（时间线/照片墙/Composer/Storage）功能文档；头部叠三轮日记本实装记录 + §七 v2 三方向比稿 + ST-A~V v1 完成记录 | 人 / agent（feature skill） | 功能细节唯一真源（数据链路部分）；视觉部分多为已否决历史 | PROJECT.md:87,171；design_system/uiux/uiux.md:19；ui-system.md:35；journal-book-directions/implementation.md:7；codex-visual/20260905-215344Z 两份 | 9645dbc 2026-09-13 | 在役（结构臃肿，见 F12） |
| `ai/Features/chat.md` | 聊天系统 v1 设计文档 + 2026-08-22 恢复状态头 | agent；源码 6 个文件注释指向 | 数据层/架构原则真源；UI 形态论述已被状态头映射覆盖 | src/types/chat.ts:2、lib/emotes.ts:2、pages/WorldPage.tsx:131、channel-screen.tsx:9、friends-page.tsx:7、chat-data.ts:3；PROJECT.md:92,172 | 7357af4 2026-08-22 | 在役 |
| `ai/Features/supabase.md` | 2026-07-04 后端结构审计快照 + 状态头（MCP 令牌失效记录） | agent | 待回填的目标真源；正文非当前结构（文档自述） | PROJECT.md:102,173；TODO.md:141,142 | 4ce641d 2026-09-05 | 待回填 |
| `ai/Features/navigation-glass.md` | 随光磨砂导航机制澄清 + NG-1~4 完成状态 | 人 / agent | 导航机制事实真源（数值/验证在 design_system 实现记录） | PROJECT.md:88,174；TODO.md:103；design_system/uiux/uiux.md:14；cinnaglass/ui-system.md:13；decisions.md:9；navigation-implementation.md:87 | 9645dbc 2026-09-13 | 在役 |
| `ai/Features/ui-system/ui-system.md` | 全项目 UI/UX 统一目标、A/B/C 分类、M0-M6 顺序与闸门 | 人 / agent（UI Tailor） | 计划真源（自述"任务勾选只在 TODO"，正确） | TODO.md:15,39；PROJECT.md:89,175；design_system 6 处 | 9645dbc 2026-09-13 | 在役 |
| `ai/Features/ui-system/audit.md` | 2026-09-11 UI 现状审计（材质来源、组件地图、P1/P2、依赖、验证限制） | 人 / agent | 现状证据（时点快照，自述"审计对象为本地工作树"） | ui-system.md 多处；TODO.md:22；design_system/uiux/uiux.md:15,16,20；cinnaglass/ui-system.md:17,39 | 9645dbc 2026-09-13 | 在役（时点证据，随 M2-M5 推进会过期） |
| `ai/reboot/README.md` | 重启启动包导航 + 决策清单；自述"状态：归档" | 人 | 归档 | PROJECT.md:3,181；TODO.md:5,158 | 63f6ef1 2026-08-09（此后未改） | 归档冻结 |
| `ai/reboot/product-vision.md` | 重定位声明、体验循环、功能迁移映射、MVP、开放问题 Q1-Q6 | 人 | 归档（结论已吸收进 PROJECT.md §产品定位/核心体验） | 仅 reboot/README.md 表格链接；PROJECT.md 未直接引用 | 63f6ef1 | 归档冻结 |
| `ai/reboot/market-research.md` | Steam 放置陪伴品类 + 中国自习室两线调研 | 人 | 归档（PROJECT.md:18 直接引用为市场依据） | PROJECT.md:18；reboot/README.md | 63f6ef1 | 归档冻结（仍被活文档引用为出处） |
| `ai/reboot/tech-plan.md` | 媒介/形态/重启 vs 翻新/数据库沿用方案 | 人 | 归档；§2 场景 R3F、角色 Rive、§1 表 33 行 Blender 转产均为**已作废方案** | PROJECT.md:57,84；TODO.md:160；三份 Features 状态头引 §119 | 63f6ef1 | 归档冻结（被引用为"§119 保留 Features"依据） |
| `ai/reboot/concept-art.md` | 2026-08-09 六张概念图索引 + codex 结论 + Claude 复核 | 人 | 归档（"白色细光环""纸恒白"等已被否决） | reboot/README.md；product-vision.md Q4/Q5 | 63f6ef1 | 归档冻结 |
| `ai/blender/scripts/build_metaspace.py` | Blender 参数化建大宅场景 → `arts/meshes/metaspace.blend` + `public/models/metaspace.glb`（R3F 用） | 程序（headless blender，Windows `D:\Repo`） | 无 | 无任何文档/代码引用；唯一提及 tech-plan.md:33（归档，"转产原料"计划） | 822fa92 2026-08-09 | **无消费者**（见 F7） |
| `ai/blender/scripts/build_avatar.py` | Blender 建云朵小狗 → `arts/meshes/avatar.blend` + `public/models/avatar-cloudpup.glb` | 程序 | 无 | 同上 | 822fa92 | **无消费者** |
| `ai/blender/scripts/preview_cameras.py` | 按 `metaspace.tsx` ZONES 渲五机位预览 | 程序 | 无 | 同上；镜像对象 `src/themes/cinnaglass/metaspace.tsx` 已于 4619fff 删除 | 822fa92 | **无消费者** |
| `ai/project-audit/scripts/inventory.py` | 本轮审核清单/哈希/链接线索生成器 | 程序（本轮审核） | 本轮支撑 | STEPS.md（本轮） | 未跟踪 | 本轮支撑文件 |
| `ai/project-audit/scripts/merge-coverage.py` | 合并各分区 coverage CSV | 程序（本轮审核） | 本轮支撑 | STEPS.md（本轮） | 未跟踪 | 本轮支撑文件 |

### 1.1 目录级判定

| 目录 | 判定 |
| --- | --- |
| `ai/Features/` | 在役，功能细节载体；`ui-system/` 子目录（2 个 md）遵守"超过一个 md 建文件夹"规则；`navigation-glass.md` 单文件正确。**大写 F** 与 `design_system`（snake）、`reboot`/`blender`/`sessions`/`project-audit`（kebab/小写）不一致，见 F9 |
| `ai/reboot/` | 冻结原件：4 个文档 + README 自 63f6ef1（2026-08-09）后零改动；PROJECT.md:3,18,57,84,181 与 TODO.md:5,158 把它当"决策依据出处"引用，不当活文档。判定：**归档保留、不压缩、不改正文**；仅需 PROJECT.md 索引已存在的一行说明即可 |
| `ai/blender/` | 三脚本；`metaspace.md`（脚本第 3 行声明的 spec）与 `renders/` 从未入 git；整条管线无消费者，见 F7 |
| `ai/project-audit/` | 本轮审核工作区，未跟踪 |

## 2. 陈旧陈述清单（文件:行 → 陈述 → 实际）

| # | 文件:行 | 陈述 | 实际（核验方法） | 性质 |
| --- | --- | --- | --- | --- |
| S1 | `ai/PROJECT.md:96` | Debug log「现有标签池：`auth`、`chat`」 | `grep -rn "Logman\." src`：仅 `chat-data.ts` 19 处调用，`TAG='[chat][web][chat-data]'`；`useAuth.ts`/`supabase.ts`/pages 无任何 Logman 或 console 调用 → 不存在 `auth` 标签。`logman.ts:3-4` 注释又反指 PROJECT.md 为标签池来源 | 陈旧 |
| S2 | `ai/TODO.md:113` | 已删（2026-08-10/11）「…public/models、public/draco、three 全家依赖」 | `git show 4619fff -- package.json` 只删了 `three`/`@react-three/fiber`/`@react-three/drei`/`@types/three`；`@react-three/rapier ^2.2.0`（822fa92 加入）仍在 `package.json:15`，`grep -rn rapier src` 零引用 | 陈旧 / 依赖残留 |
| S3 | `ai/Features/timeline.md:173` | 链接 `[sql/dev-create-couple.sql](../../sql/dev-create-couple.sql)` | 文件不存在；`git log --follow sql/dev-create-world.sql`：ST-F(2026-06-30) couple→room，7938619 room→world。timeline.md:290 也提 `dev-create-room.sql`（历史记录，可不改）。inventory 链接线索已捕获此项 | 断链 |
| S4 | `ai/Features/chat.md:18`、`supabase.md:20`、`timeline.md:60` | 关联文档 `ai/Features/sidebar.md`、`channel.md`、`room.md` | 三文件随 7c93c3c 作废未恢复；chat.md:13 自认"已知断链"。入向同类断链：`src/types/chat.ts:3`、`src/lib/worlds.ts:2` → channel.md；`sql/dev-create-world.sql:9` → `ai/Features/world.md`；`ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md:9/24/37` → `ai/Features/ui-system.md`（应为 `ui-system/ui-system.md`）、`channel.md`、`settings.md` | 断链（已知 + 新发现 4 处） |
| S5 | `ai/Features/chat.md:5` | 「源码里 5 处注释指向本文」 | `grep -rn "Features/chat.md" src`：6 个文件（另有 `src/pages/WorldPage.tsx:131`） | 计数偏差（轻微） |
| S6 | `ai/reboot/README.md:4` | 「结论已吸收进新三件套（PROJECT/TODO/**STYLE**）…旧 Features/TODO/PRD 已清理」 | STYLE.md 已于 9645dbc 缩为兼容 stub，正文在 `design_system/`；Features 三份已于 2026-08-22 恢复。README 为归档原件，**不建议改正文**，但 PROJECT.md:181 索引行可补一句"README 中的三件套/已清理表述为 2026-08-09 时点" | 归档中的时点陈述 |
| S7 | `ai/reboot/tech-plan.md:33,39,60` | Blender 大宅「转产原料——2.5D 预渲染背景层渲染源」；场景 = 「Blender 预渲染 + R3F 全屏 quad shader」；角色 = 「Rive 主推」 | 2026-08-10 定 PixiJS v8（TODO.md:59）；房间底图来自 codex（`public/rooms/study/*.png` 由 4619fff 从 `codex-visual/20260810-024945Z` 引入），design_system 无一处提 Blender；角色为双帧立绘 + 程序变形（PROJECT.md:57）。均为**已作废方案**，归档不改 | 已作废方案（归档） |
| S8 | `ai/reboot/product-vision.md:34` | 「天气与现实脱钩：晴/雨/雪自选，是氛围开关不是天气预报」 | `src/pages/WorldPage.tsx` 含 geolocation → Open-Meteo 实况档（audit.md:65 亦已指出）；TODO.md:66 记「实况天气 auto 档」 | 已作废方案（归档） |
| S9 | `ai/Features/timeline.md:226` | 「token 双真源属实：`--accent-deep: #268fbe`…」（2026-09-05 复核） | `cinnaglass.css:92` 现为 `#2f9ad3`；TODO.md:21、audit.md:85 已记复核消失。timeline.md 该行是历史复核记录，建议加一句"已修" | 历史记录未标已修 |
| S10 | `ai/PROJECT.md:104` | 「`src/lib/*.ts` 的 `*_COLS` 常量就是应用真正依赖的列」 | 仅 `worlds.ts`(WORLD_COLS)、`chat.ts`(CHANNEL/MESSAGE/REACTION/READ_COLS)、`friends.ts`/`emotes.ts`(COLS) 有常量；`profiles.ts:11` 内联 select；`posts` 走 RPC 无列常量；`allowed_emails`/`post_unlocks` 无代码引用（表中已注明）。陈述"基本成立"但不是每张表都有 `*_COLS` | 表述略宽（轻微） |
| S11 | `ai/blender/scripts/build_metaspace.py:3` | 「Spec: ai/blender/metaspace.md」 | `git log --all -- ai/blender/metaspace.md` 为空：该 spec 从未入库 | 断链（脚本注释） |
| S12 | `ai/blender/scripts/preview_cameras.py:3` | 「zone table mirrors ZONES in src/themes/cinnaglass/metaspace.tsx」 | 该文件已于 4619fff 删除 | 断链（脚本注释） |
| S13 | `ai/blender/scripts/*.py`（三份） | `REPO = r"D:\Repo\our-world"`；输出 `public/models/*.glb`、`ai/blender/renders/` | Windows 绝对路径与本机不符；`public/models` 已删（4619fff）；`renders/` 从未入库 | 环境失配 |
| S14 | src 注释 6 处（非本分区文件，登记入向） | `ai/UX.md §2/§4/§5`、`ai/STYLE.md §6` | 两文件已为 5-6 行 stub，无章节；对应正文在 `ai/design_system/uiux/interaction.md`（§2 功能入口地图、§4 聊天体系、§5 可点击物件提示）与 design-system 子文档 | 章节引用失效 |

### 2.1 已核对且**一致**的陈述（避免误判）

- PROJECT.md:62-78 项目结构树列出的 14 个路径全部存在（`ls`）；树是"现状→翻新方向"草图，未列 `hooks/`、`utils/`、`journal-*`、`materials.css`、`model.ts` 等，属不完整而非陈旧。
- PROJECT.md:86 `VITE_DEV` 语义与 `.env.example` 注释一致；PROJECT.md:94 `pnpm dev2` 存在于 package.json。
- PROJECT.md:104「`sql/` 只剩两份早期脚本」— `ls sql/` 恰为 `dev-create-world.sql`、`storage-memories-bucket.sql`。
- PROJECT.md:110 `allowed_emails` 无代码引用 ✓；:125 `find_profile_by_email`（friends.ts:30）✓；:126 Edge Function `emotes`（emotes.ts:23,32）✓；:127 40 分钟续签（screens.tsx:728 `SIGN_REFRESH_MS`）✓；:132 `database.ts` 只声明 `todos` 且零引用 ✓。
- PROJECT.md:56 与 TODO.md:81 描述的唱片机产物：`public/rooms/study/parts/` 有 platter×3、light-add×3、light-mul×3、spindle×3、tonearm.png、turntable.json ✓；`scripts/build-turntable-parts.py`、`scripts/fit-disc-ellipse.py`、`arts/rooms/study/{source,generated}`、`public/ui/nav/frost.webp` 均存在 ✓。
- TODO.md:25 / ui-system.md:161 / audit.md:67 `chat-card.tsx:10` 从 `../model` 导入 `Msg`，而 `model.ts` 导出中无 `Msg` → bug 仍在 ✓。
- TODO.md:114 `scene.tsx` 仍被 `LoginPage.tsx:8`、`ResetPasswordPage.tsx:10` 引用；`rooms.ts` 的 `owLoad` 被 `WorldPage.tsx:24,109,110` 引用 ✓。
- TODO.md:115 `src/types/database.ts`、`timeline_3d_posts.html` 均仍存在 → `[ ]` 状态正确 ✓。
- TODO.md:76 「五件全挂」— `study-room.ts:55-59` 恰 5 个 hotspot（timeline/photos/clock/music/wishlist）✓。
- TODO.md:70,107 Presence 待接 — `grep .track(|presenceState` 零命中 ✓。
- audit.md:35 世界设置挂载 `WorldPage:519` ✓。
- 所有 `](...)` 相对链接 32 条中 31 条解析成功（唯一失败即 S3）；`ui-system.html` 四个被引用锚点 `#journal-turn/#ui-unification/#navigation-glass/#journal-book-proposal` 均存在；design_system 被引用的 29 个路径全部存在。

## 3. 跨文档重复地图与建议权威位置

| 事实 | 出现位置（本分区 + 关联） | 建议唯一权威正文 | 其余处理 |
| --- | --- | --- | --- |
| 唱片机分层/透视/光层管线 | PROJECT.md:56（技术栈内约 600 字）；TODO.md:78-82（五轮，约 2500 字，含教训与闸门数值）；`design_system/props.md §唱片机的活动部分`；`design_system/research/living-props.md`；`design_system/research/art-relighting.md`；`ai/sessions/活物件-唱片机-生成优先分层管线.md`（未读，按标题） | **当前实现事实** → `ai/design_system/props.md`（物件设计文档）+ `scripts/build-turntable-parts.py` 头注释；**过程/教训** → 保留在 sessions 存档 | PROJECT.md:56 缩为 2-3 句 + 链接；TODO.md 五轮各压成一行「[x] 第 N 轮（日期）：一句结论」+ 指向 props.md/sessions。需用户决定（TODO 历史条目是否允许压缩） |
| Supabase 表/RPC/Storage/Realtime 结构 | PROJECT.md:98-139（自称临时真源）；Features/supabase.md（07-04 快照 + 状态头列出增量）；chat.md:9（增量清单）；timeline.md §四；reboot/tech-plan.md §1、§5（归档） | `ai/Features/supabase.md`（回填后）— 两文档自身已约定 | 维持现状直到 TODO.md:141 回填完成；不新增第三处 |
| 导航玻璃机制（frost.webp 固定纹理 / backdrop-filter / conic-gradient 边光 / 74×384、292×62） | Features/navigation-glass.md:20-22；Features/ui-system/ui-system.md §2.1 表（六行复述同一机制）；`design_system/uiux/cinnaglass/ui-system.md:13`；`.../journal-room-object/navigation-implementation.md`；`interaction.md`；`ui-system.html#navigation-glass` | **机制事实** → `navigation-glass.md`；**数值/生成来源/验证** → `navigation-implementation.md` | ui-system.md §2.1 改为一句「机制见 navigation-glass.md」+ 保留 §2.2-2.4 的规则；design_system 两处保持链接不复述 |
| 形态路线 R0-R4 / MVP 定义 / 陪伴三铁律 / 空位留痕 | PROJECT.md:24-42,49；TODO.md:7-8；reboot/product-vision.md §2-4；tech-plan.md §3；market-research.md §7；concept-art.md | `ai/PROJECT.md`（当前 PRD） | reboot 为出处归档，不动；TODO.md:7-8 两行引用可保留 |
| Features 误删/恢复叙事（7c93c3c、tech-plan §119） | PROJECT.md:84；TODO.md:160；chat.md:5；supabase.md:5；timeline.md:46 | `ai/TODO.md` 已完成一行 | 三份 Features 状态头各留一句；PROJECT.md:84 可缩至一句 + 链接 TODO |
| Supabase MCP 令牌失效诊断 | supabase.md:13（约 400 字）；TODO.md:141（摘要 + 引用） | `supabase.md` 状态头 | 一致，无需动 |
| `--accent-deep` 双真源 | timeline.md:226,239,249；TODO.md:21；audit.md:85 | TODO.md:21（已复核消失） | timeline.md:226 加"已修"标注 |
| UI 统一 M0-M6 | TODO.md:41-48；ui-system.md §6；interaction.md:92 | 任务状态 → TODO；交付条件 → ui-system.md §6（两文档自身已划清） | 一致 |
| 日记本三轮实装（棕皮静态 / 竖直翻页 / B 苔绿 / 夜灯玻璃） | timeline.md 头部三节 + §七；TODO.md:87-92；design_system 四份 implementation.md | **实现记录** → design_system 各 implementation.md；**功能状态** → timeline.md 顶部一节 | timeline.md 已否决视觉压入"历史"一节（见 F12） |

## 4. 发现（每条带证据与建议）

### F1 · 断链：timeline.md → sql/dev-create-couple.sql
- 类别：断链　| 文件：`ai/Features/timeline.md:173`（另 :182、:290 提及历史文件名）
- 证据：见 S3。
- 建议：把 :173 链接改为 `../../sql/dev-create-world.sql` 并在括号注明「原名 dev-create-couple.sql→dev-create-room.sql→现名」；:182/:290 属历史记录可不改。
- 风险：低。需用户决定：否（机械修正）。

### F2 · 已作废 Features 文档名仍被 9 处引用
- 类别：断链　| 文件：`chat.md:18`、`supabase.md:20`、`timeline.md:60`（本分区）；`src/types/chat.ts:3`、`src/lib/worlds.ts:2`、`sql/dev-create-world.sql:9`、`ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md:9,24,37`（他分区，登记入向）
- 证据：见 S4；`ls ai/Features/` 无 channel/sidebar/room/world/settings/ui-system.md。
- 建议：在 `ai/PROJECT.md §文档索引` 的 Features 条目下加一行「已作废且不恢复：channel/sidebar/room/world/settings/handoff…，术语与数据模型现以 PROJECT.md §数据库与 `src/lib/*.ts` 注释为准」；代码注释 5 处改指 PROJECT.md 对应节；ux-decisions.md:9 修正路径。
- 需用户决定：否（不恢复旧文档是已定决策，只改指向）。

### F3 · STYLE.md / UX.md 已成 stub，但源码 6 处按章节号引用
- 类别：陈旧陈述 / 断链　| 文件：`ai/STYLE.md`、`ai/UX.md`；入向 `src/pages/WorldPage.tsx:242,345,434`、`src/themes/cinnaglass/shell/rail.tsx:27`、`room/room-types.ts:124,136`、`room/study-room.ts:52`
- 证据：`git show 9645dbc --stat`：STYLE 95→5 行、UX 101→6 行；`interaction.md` 标题 §2「功能入口地图」§4「聊天体系」§5「可点击物件提示」与旧 UX §2/§4/§5 对应。
- 建议：两 stub **保留**（仍有 design_system 两处 + codex-visual 历史报告 + reboot/README 链接）；将 6 处代码注释改为 `ai/design_system/uiux/interaction.md §N`；PROJECT.md:177 已正确标注"兼容入口"。
- 删除方案（备选）：若删 stub，需先改上述 6 处代码注释 + `design_system/research/visual-principles-2026-09-12.md:3` + `concept/baselines/companionship-room/codex-report.md:3`。需用户决定：是（保留 vs 删除）。

### F4 · PROJECT.md 标签池陈旧
- 类别：陈旧陈述　| 文件：`ai/PROJECT.md:96`
- 证据：S1。
- 建议：改为「现有标签池：`chat`（`chat-data.ts`）；`auth` 域尚无日志调用」；或按 logman skill 决定是否给 auth 加日志。需用户决定：否。

### F5 · TODO 称 three 依赖已删，`@react-three/rapier` 残留
- 类别：依赖 / 陈旧陈述　| 文件：`ai/TODO.md:113`；`package.json:15`（root 分区）
- 证据：S2。
- 建议：TODO.md:113 追加「`@react-three/rapier` 漏删，随 M5 清理」并列入退役清理；root 分区登记删依赖（需重生成 `pnpm-lock.yaml`）。需用户决定：否。

### F6 · ai/reboot/ 归档判定
- 类别：目录组织　| 文件：`ai/reboot/**`（5 文件）
- 证据：README 自述归档；5 文件自 63f6ef1 零改动；活文档 PROJECT.md 5 处、TODO.md 2 处、Features 状态头 3 处**引用它作决策出处**（不是当活规范）；tech-plan §2/§3 的媒介/渲染/角色方案已被后续决策取代（S7），product-vision.md:34 天气设定被代码取代（S8），concept-art 的"白色细光环""纸恒白"已被 TODO.md:76 与 design_system 否决。
- 结论：**冻结原件，不压缩、不改正文、不删**。README.md:4 的时点表述（S6）通过 PROJECT.md:181 索引行补一句"时点 2026-08-09，其中三件套/Features 表述已过时"即可。
- 需用户决定：否。

### F7 · ai/blender/ 三脚本 + arts/meshes 整条 3D 管线无消费者
- 类别：冗余文件　| 文件：`ai/blender/scripts/{build_metaspace,build_avatar,preview_cameras}.py`；关联 `arts/meshes/{metaspace,avatar,scene}.blend`、`scene.blend1`（batches 分区登记）
- 证据：
  - 全仓 grep（md/ts/tsx/py/json/html/css/sh/yaml，排除受保护与 sessions）：脚本名/`arts/meshes`/`*.blend` 仅在脚本自身与 `ai/reboot/tech-plan.md:33`（归档的"转产原料"计划）出现；design_system 零提及；`package.json` 无 blender 相关脚本；`scripts/` 12 个文件无 blender 调用。
  - 脚本产物链：`public/models/*.glb` 与 `public/draco/` 已于 4619fff 删除；镜像对象 `metaspace.tsx` 同提交删除；R3F 依赖同提交删除；`ai/blender/metaspace.md`、`ai/blender/renders/` 从未入库；`REPO = D:\Repo\our-world` 为 Windows 机路径。
  - 房间实际底图来源为 codex 生成图（4619fff 引入 `codex-visual/20260810-024945Z` → `public/rooms/study/*.png`），tech-plan §2 "Blender 预渲染分层"方案未执行。
  - `arts/meshes/scene.blend`/`scene.blend1` 无任何脚本生成，`.blend1` 为 Blender 自动备份（`.gitignore` 含 `*.blend1` 但该文件先于规则入库，01-documents.md:30 已记）。
- 建议：**删除** `ai/blender/`（3 脚本）；`arts/meshes/` 4 文件由 batches 分区按同一结论处理（建议一并删除或整体移入 `codex-visual/` 式归档目录）。恢复依据 = `git checkout 3fd52a5 -- ai/blender arts/meshes`。
- 缺少的证据：① 用户是否仍在另一台（Windows）机器维护该 Blender 场景并打算作远期 3D/桌宠素材；② `scene.blend` 的来源与用途（无脚本、无引用）。若①为是，改为"归档保留"并在 PROJECT.md 索引注明"已退役 3D 管线，源文件位置"。
- 需用户决定：是。

### F8 · 唱片机管线在 PROJECT/TODO 中的长段重复
- 类别：重复内容　| 文件：`ai/PROJECT.md:56`、`ai/TODO.md:78-82`
- 证据：§3 第一行；PROJECT.md:56 单行约 600 字、TODO.md 五条合计约 2500 字，均含闸门数值（mean 2.2-2.5/255 等）、教训、文件路径；`design_system/props.md §唱片机的活动部分` 与 `research/living-props.md` 又各有一份。CLAUDE.md 规则「TODO 只写高层描述，不写数据结构细节」「Feature/设计文档已记录的细节不重复写入 PROJECT.md」。
- 建议：见 §3；权威正文放 `design_system/props.md`（当前）+ sessions 存档（过程）。
- 需用户决定：是（是否允许压缩 TODO 已完成条目正文）。

### F9 · 目录命名不一致
- 类别：目录组织　| 文件：`ai/Features/`（PascalCase）、`ai/design_system/`（snake_case）、`ai/reboot`、`ai/blender`、`ai/sessions`、`ai/project-audit`（kebab/小写）
- 证据：`ls ai/`；CLAUDE.md:91 / AGENTS.md:158 示例即用 `ai/Features/<功能名>/`；`Features/` 被 src 8 处注释、design_system 15+ 处链接、sql 1 处、codex-visual 多处引用；CLAUDE.md:90 甚至写成 `Ai/Features/*.md`（大小写混用，受保护文件只登记）。
- 建议：**不重命名** `Features`（引用面广、协议文件受保护）；登记为已知历史不一致；新建目录统一 kebab-case；`design_system` 亦不动（2026-09-13 刚整理）。`Features/ui-system/` 子目录规则遵守 ✓。
- 需用户决定：是（是否接受长期不一致）。

### F10 · timeline.md 结构臃肿，已否决方案与在役事实混排
- 类别：目录组织 / 重复内容　| 文件：`ai/Features/timeline.md`（422 行）
- 证据：文件顺序为「当前迭代(09-07 翻页) → 上一轮(09-07 静态) → 历史 B 苔绿(09-06 已否决) → 2026-08-22 状态头 → 2026-07-04 元信息 → v1 §一~六 → §七 v2 白纸比稿(09-05，视觉已否决) → 夜灯玻璃(09-06 已否决) → ST-A~V 完成记录 → 测试记录」；四套视觉方案中三套已否决，各自 implementation.md 已在 design_system；§五 待实现列表（couples 时代）全部过时但标注了术语映射。
- 建议：重排为「状态头 → 当前功能事实（数据链 + 当前日记形态一节）→ 历史（v2 比稿/夜灯/B 苔绿 各压成 3-5 行 + 链接 design_system implementation.md）→ v1 ST 记录（折叠或保留）」；不删数据链路正文。
- 需用户决定：是（文档重排属编辑决策）。

### F11 · 根 README.md 为 Supabase todos 模板（入向登记）
- 类别：陈旧陈述　| 文件：`README.md`（root 分区）
- 证据：README 引用 `src/services/todos.service.ts`、`src/hooks/useTodos.ts`（不存在）与 `src/types/database.ts`（TODO.md:115 列为死文件）；README 不提 `ai/`。
- 建议：root 分区处理；TODO.md:115 死文件清理条目可加「根 README.md 重写为项目入口（指向 ai/PROJECT.md）」。需用户决定：否。

### F12 · supabase.md 与 PROJECT.md 数据库节的"临时真源"约定一致，无需动作
- 类别：其他　| 文件：`ai/Features/supabase.md:9,11`、`ai/PROJECT.md:102`、`ai/TODO.md:141`
- 证据：三处互相引用且状态一致（回填前置为令牌失效）。仅确认，不列问题。

## 5. 删除候选

| 路径 | 理由 | 查过的引用面 | 恢复依据 | 置信度 |
| --- | --- | --- | --- | --- |
| `ai/blender/scripts/build_metaspace.py` | 产物 GLB/消费者 metaspace.tsx/R3F 依赖均于 4619fff（2026-08-10）退役；spec `ai/blender/metaspace.md` 从未入库；Windows 路径；无任何活文档/代码/脚本引用；tech-plan.md:33 的"转产原料"计划被 codex 底图路线取代 | 全仓 grep（md/ts/tsx/py/json/html/css/sh/yaml/txt，排除 .claude/.agents/sessions/node_modules/.git）；package.json scripts；scripts/ 目录；design_system 全部 md/html；git log --all 查 metaspace.md/renders | `git checkout 3fd52a5 -- ai/blender/scripts/build_metaspace.py` | medium（缺：用户是否另机维护 Blender 源） |
| `ai/blender/scripts/build_avatar.py` | 同上；产物 `avatar-cloudpup.glb` 已删；角色现为双帧立绘（PROJECT.md:57） | 同上 | 同上 | medium |
| `ai/blender/scripts/preview_cameras.py` | 同上；镜像对象 `metaspace.tsx` ZONES 已删，脚本失去同步对象 | 同上 | 同上 | medium |
| （关联，非本分区）`arts/meshes/metaspace.blend`、`avatar.blend`、`scene.blend`、`scene.blend1` | 前两者为上述脚本产物、后两者无生成来源；无消费者 | 同上 | `git checkout 3fd52a5 -- arts/meshes` | medium；由 batches 分区最终登记 |

**不建议删除**：`ai/STYLE.md`、`ai/UX.md`（仍有 8 处入向引用，见 F3，删前须改引用）；`ai/reboot/**`（决策出处，被活文档引用）；`ai/Features/supabase.md`（待回填目标真源）。

## 6. 限制与未完成

- 未安装 node_modules，未运行 tsc/eslint/vite；`chat-card.tsx` Msg 错误仅由 `model.ts` 导出列表静态判定。
- `ai/sessions/活物件-唱片机-生成优先分层管线.md` 受保护未读，重复地图中对它的定位仅凭文件名。
- `.claude/`、`.agents/`、`CLAUDE.md`、`AGENTS.md` 仅 `test -e` 确认存在；PROJECT.md:158-161 引用的 `.agents/skills/ui-tailor/SKILL.md`、`.agents/skills/monet/SKILL.md` 存在但未核内容；grep 输出中偶然带出的 AGENTS.md:11 `ai/UNITY_PROJECT.md`（不存在）与 CLAUDE.md:90 `Ai/Features` 大小写仅登记，不评。
- Supabase 线上结构未复核（令牌失效，文档自述），PROJECT.md 数据库表列只对照了 `src/lib/*.ts` 的 select 字串。
- `ai/project-audit/scripts/measure-docs.py` 与 `ai/project-audit/*.md` 在磁盘但不在 baseline 清单，按规则未入 CSV；下一轮清单应包含。
- `codex-visual/` 18 个批次仅 `ls` 确认 reboot/concept-art.md 与 timeline.md 引用的三个目录及文件存在，未读其报告正文（属 batches 分区）。
- 未读 `ai/design_system/**` 正文（属 S04 分区），重复地图中对其内容的判断基于 `grep` 命中与标题行。
