# Our World 项目文档

> v2「放置陪伴小屋」，2026-08-09 产品重定位（决策依据与调研归档见 `ai/reboot/`）。
> 核心文档：本文档（PRD + 技术事实）· `ai/TODO.md`（任务唯一来源）· `ai/design_system/design-system.md`（当前设计系统）· `ai/Features/*.md`（功能细节）。
> 最后更新：2026-09-18（审核第一步：精简为当前事实 + 索引，细节以 Features/设计系统为准；产品未改，日记本冻结）

## 产品定位（PRD）

**Our World 是一间开着就行的放置陪伴小屋**——一个网页（之后可能用 Electron 打包成桌面 app）：固定镜头的温馨房间里，两只 Q 版长耳小狗代表一对情侣，各自坐在自己的位置上看书、写字、打盹；窗外光照跟着真实时间晨昏流转；两人的回忆（时间线/相册/聊天）藏在房间的每一件家具里，点击打开。

四个产品要素：

1. **美丽场景**——水彩暖光的房间，时辰光照 + 可切天气，放置产品的第一竞争力是画面
2. **ASMR 声音**——雨声/壁炉/lofi 分层音景
3. **简单个人管理**——时钟·闹钟、日历·约会、心愿单
4. **爱人回忆组件**——timeline 日记、照片墙、实时聊天（v1 已全部接真后端）

### 差异化与市场依据（详见 `ai/reboot/market-research.md`）

- 品类成功产品（Spirit City、Rusty's、Desktop Mate）全是单人+宠物结构；「两人共享陪伴空间 + 真实共享数据」无人交付
- **presence 即陪伴**：瞥一眼就知道「她在不在、在干嘛」——在线角色回归座位，离线空位留痕（留灯/杯子/围巾）
- **网页优先**：零安装、发链接即达；桌面壳与桌宠是增量演进

### 形态路线

```
R0 验证周   Document PiP 置顶小窗 + Lively 贴壁纸实验（不写壳，验证「常驻」体感）
R1 网页 MVP 场景 + 角色 + presence + 三大回忆组件挂物件（当前重点）
R2 Electron 无边框置顶窗/贴边小窗 + 托盘 + 开机自启（桌宠方向 Electron 优先，Tauri 缺 forward API）
R3 桌宠模式 全屏透明层 + 点击穿透，桌面缩小仅见两只角色（概念图 03）
R4 远期     养成/益智小游戏/更多房间/Steam 公开发行（Brain Dump）
```

### 陪伴设计三铁律（违反即返工）

1. **零成本在场**：应用开着形象就在；任何要「经营」的 presence 会让更忙的一方先放弃
2. **只做正反馈**：不做惩罚/连坐/排行——「你在的时候我们都变好」
3. **互动长在房间和物件上，不长在信息流里**：两个人没有 feed 存在的理由

### MVP 定义（大耳狗风格，两人自用）

1 个房间模板（书房，概念图 01/02 构图）× 4 时辰 + 双角色状态机（idle/看书/写字/喝咖啡/打盹 + 在线/离线）+ Supabase Realtime Presence + 三物件热点（书桌→timeline、相框→照片墙、电话→聊天）+ 聊天气泡浮头顶 + ASMR 音景 + 极窄玻璃 rail。**不在 MVP**：语音、共享音乐同步、心愿单/日历后端、房间装扮、多房间、养成、小游戏。

## 核心体验

- **主画面**：近景固定机位单房间，无 WASD、无自由镜头、无漫游，所有交互都是点击
- **物件 → 功能映射**：书桌/日记本→时间线、相框→照片库、挂钟→时钟闹钟、唱片机→音乐、许愿罐→心愿单（当前实装五热点，以 `study-room.ts` / `ai/design_system/props.md` 为准）；规划：转盘电话→聊天、挂历→日历纪念日、对方角色→轻互动
- **房间模板架构**（见 `ai/design_system/scene.md`）：房间 = 时辰底图 + 座位锚点 + 热点 + 窗格 + 钟面 + 活物件；当前三档 mood，四档为目标；角色动画独立于房间
- **presence**：在线=角色回归座位+单绿点；离线=空位留痕；远期行为翻译（对方打字→角色执笔、翻相册→拿相框）
- **体验循环**：开着 → 对方上线角色醒来 → 瞥一眼 → 轻互动/气泡 → 点书桌记录 → 点相框回看 → 窗外晨昏流转

## 技术栈

- **框架**: React 19 + TypeScript + Vite 7 + React Router 7；pnpm；Prettier；无单元测试、无 CI
- **样式**: 自有 CSS（无框架），四载体契约见 `ai/design_system/uiux/cinnaglass/ui-system.md`；主题 `src/themes/cinnaglass/`
- **场景层**: PixiJS v8 合成器 `src/themes/cinnaglass/room/pixi-scene.ts`，吃房间模板 `room-types.ts` / `study-room.ts`：底图×mood（golden/twilight/night）交叉淡化、雨层 mask 到窗格、真实走时挂钟、角色层、光照配方 mood×weather（weather 仅 sun/rain，雪待做）、星星提示、热点点击。**活物件（living props）**：家具从底图分离后自己动，hover 只改参数不换图；唱片机已按「死物吃画里的光，活物吃场景的光」分层并做透视真旋转。分层原则、闸门数值与教训见 `ai/design_system/research/living-props.md`（唯一技术正文），物件规范 `ai/design_system/props.md`，进度 `ai/TODO.md`「活物件」；装配器 `scripts/build-turntable-parts.py` → `public/rooms/study/parts/`，量测 `scripts/fit-disc-ellipse.py`，原画真源 `arts/rooms/study/source/`，装配输入 `arts/rooms/study/generated/`
- **角色层**: 双帧透明立绘（睁/闭眼）+ 程序复合变形（呼吸/摇摆/眨眼），与场景共享光照（参数见 `ai/design_system/character.md`）；动作丰富化再评估 Rive/Spine（`ai/reboot/tech-plan.md` §2）
- **后端**: Supabase（auth + Postgres + Storage + Realtime Broadcast/Presence + Edge Functions）——新产品功能 100% 命中已有后端，零迁移
- **桌面壳（R2+）**: Electron（`setIgnoreMouseEvents(..., {forward:true})` 是桌宠穿透唯一官方 API；Tauri 观望）
- **实时架构**: 隔离的 2 人房间，Supabase Realtime 足够，无需权威游戏服务器

## 项目结构（现状）

```
src/
├── App.tsx / main.tsx   # 路由 /login、/reset-password、/（ProtectedRoute → WorldPage）
├── pages/               # LoginPage · ResetPasswordPage · ProtectedRoute（VITE_DEV 自动真登录）· WorldPage（场景满屏 + 悬浮壳 + 弹窗编排）
├── hooks/ · utils/      # useAuth、useFeed · getEnv/getEnvFlag
├── lib/                 # supabase / worlds / posts / storage / profiles / chat / emotes / friends / logman
├── types/               # feed.ts、chat.ts 在用；database.ts 死文件
└── themes/cinnaglass/
    ├── cinnaglass.css · materials.css · diary.css   # token、mood 氛围层、暖纸覆盖
    ├── room/            # pixi-scene（合成器）· room-scene（React 壳）· room-types · study-room
    ├── shell/           # rail + navigation-glass.css · ambience · floaters（纪念卡/音乐条）· chat-card
    ├── journal-*        # 日记本实体与翻页（C 类物件 UI，冻结）
    ├── screens.tsx      # 时间线/照片墙/心愿单弹窗 + lightbox
    ├── calendar · settings · world-settings · music · emote-picker + emoji-data · chat-data
    ├── channel-screen · friends-page · lobby        # 完整聊天大窗、旧社交入口、大厅（待 M4/M5 收敛）
    ├── scene.tsx        # 旧 SVG 背景，仍被登录/重置页使用
    ├── rooms.ts         # 旧 mock，`owLoad` 仍被 WorldPage 使用
    └── image-slot.js    # 图片选择器 web component，仍在用
```

## 已有功能资产（v1 保留部分的技术事实）

> 功能细节在 `ai/Features/*.md`，此处只留摘要。`7c93c3c`（2026-08-09）误删该目录，2026-08-22 恢复 timeline / chat / supabase 三份；channel / sidebar / settings / world / world-space-ui / image-slot / handoff 随 Discord 壳层作废不恢复（现 `ai/Features/ui-system/` 为 2026-09-11 新建）。

- **auth 地基**：登录页 + 路由守卫 + 忘记密码/重置 + 登出；白名单 = Supabase 关闭注册开关（已验证 422 拦截）；`VITE_DEV` = 用 `VITE_DEV_EMAIL/PASSWORD` 自动**真登录**（无会话则 RLS 全空，见 `.env.example`）；加账号走 Dashboard/Admin API，不 SQL 直插
- **timeline / 我们的日记**（2026-09-07）：棕皮旧纸双页、真实图文随纸竖直翻页、连续翻阅、阅读时雨不停播；羽毛笔仍为静态图。细节 `ai/Features/timeline.md`，设计 `ai/design_system/uiux/cinnaglass/ui-system.md`
- **照片墙**：自然纵横比 polaroid 拼贴（纸框/胶带/微旋转/月份分组）+ lightbox 原图渐进加载（细节 timeline.md）
- **随光磨砂导航**（2026-09-07）：固定细纹图 + backdrop 模糊 + 按 mood 的 CSS 边光，无运行时随机/物理反射；A 类悬浮 UI 基准，见 `ai/Features/navigation-glass.md`
- **聊天全链路**：Broadcast from Database（客户端只写库，trigger 广播 private topic `world:{id}`）；乐观发送/失败重试/原位编辑/删除/reaction/已读游标；贴纸系统（`world_emotes` 共享库 + Edge Function `emotes` 代理 Tenor 搜图转存 + EmotePicker 自维护 emoji 中文索引）；DM = `channels.type='dm'`（账号级 topic `user:{uid}`）。**DM/好友 UI 在新方向收起，数据层冻结保留**。细节 `ai/Features/chat.md`（ChatDock 已被聊天窄卡 `shell/chat-card.tsx` + 头顶气泡取代）
- **世界属性**：`worlds.name/anniversary/icon_emoji/icon_path`（icon 存 memories 桶 256px webp）；纪念日/在一起天数由 DB 实时计算；**欠：昵称写回 `profiles.display_name`**（TODO 继承待办）
- **双实例调试**：`pnpm dev2`（5174 端口）双账号互发验收
- **UI 基建现状**：四套材质变量并存、弹层各自独立，不是统一体系；消费者表与迁移计划见 `ai/Features/ui-system/audit.md`、`ui-system.md`
- **Debug log**：`src/lib/logman.ts`（`Logman.log` 仅 dev；格式 `[功能域][web][模块]`）。在用标签：`chat`；`auth` 域尚未走 Logman（`settings.tsx` 一处直接 `console.warn`）

## 数据库（Supabase 项目 `xrscspcqnsxvfshskfpy`）

> 全部继续服役，零迁移开工。**下表是当前结构的临时真源**：2026-08-21 按 `src/lib/*.ts` 的 select 反查，未做线上 DDL 复核，与线上有差异以线上为准；标「待核」者来自 07-04 快照。`ai/Features/supabase.md` 待连 MCP 回填后接管唯一真源、本节缩为摘要（TODO 继承待办）。schema 变更历史不在仓库，`sql/` 只有两份早期脚本。

### 表（列以前端实际 select 为准）

| 表 | 应用读写的列 | 备注 |
| --- | --- | --- |
| `allowed_emails` | email(PK) / note / created_at（待核） | 白名单表；实际拦截靠 Dashboard 关闭注册开关，**代码零引用** |
| `profiles` | id(FK auth.users) / display_name / avatar_url | trigger `on_auth_user_created → handle_new_user()` 自动建档（待核） |
| `worlds` | id / owner_id / member_id / name / anniversary / icon_emoji / icon_path / intimacy_points / created_at | 另有 `status`(pending\|active) 列前端不 select；约束 no_self_pair、active_requires_member（待核）；`check_world_uniqueness` 每人限一世界 |
| `posts` | author_id / world_id / content / images[] / privacy(shared\|locked\|private) / unlock_cost / created_at / updated_at | **写直插、读只走 RPC** |
| `post_unlocks` | post_id / user_id / unlocked_at（待核，前端不直接读写） | locked 帖解锁记录，解锁经济未启用 |
| `channels` | id / world_id / type(text\|voice\|room\|dm) / name / topic / scene_id / position / dm_user_a / dm_user_b | world 型 + dm 型（规范序对）；新世界自动建默认频道（待核）。新方向无频道 UI，表保留当聊天管道 |
| `messages` | id / channel_id / world_id / author_id / content(≤4000 待核) / created_at / edited_at / kind(text\|sticker) / emote_id | trigger `set_world` 回填 world_id + 广播（待核） |
| `message_reactions` | message_id / user_id / world_id / emoji / created_at | PK(message, user, emoji) |
| `channel_reads` | channel_id / user_id / world_id / last_read_at | 已读游标，只进不退 guard |
| `world_emotes` | id / world_id / name / storage_path / source_url / added_by / created_at | 世界共享贴纸库；name 每世界唯一 |
| `friendships` | user_a / user_b / requested_by / status(pending\|accepted) / created_at / responded_at | 账号级规范序对（user_a < user_b）；accepted → 自动建 DM。**UI 冻结，数据层保留不删** |

### RPC / Edge Function / Storage / Realtime

- **RPC** `get_feed_posts(p_world_id, p_before, p_limit)` — 时间线读链路唯一入口；服务端解析隐私/解锁 + 游标分页（`p_before` 独占游标，null 取最新页）
- **RPC** `find_profile_by_email(p_email)` — 好友流程按邮箱找人
- **Edge Function** `emotes` — `action:'search'`（Tenor 搜图）/ `'import'`（≤2MB 图片服务端转存 + 入库）；**待配 TENOR_API_KEY**
- **Storage** 私有桶 `memories`（25MB/文件，png/jpeg/webp/avif；RLS 按首段路径 = world_id 判成员）：`<world_id>/<uuid>.<ext>` 原图 + `<uuid>.thumb.webp`（长边 1024）· `<world_id>/emotes/<uuid>.webp` 贴纸（长边 512）· `<world_id>/icon-<uuid>.webp` 世界 icon；展示走 signed URL（TTL 1h），前端 40 分钟自动续签 + tab 重可见重签
- **Realtime = Broadcast from Database**：客户端从不主动广播，DB trigger 把 I/U/D 推到 private topic `world:{id}`（消息/回应/已读/贴纸库）与 `user:{uid}`（DM/好友）；**Presence 尚未接**（`WorldPage` 头顶胶囊为占位文案，R1 待办）

### 代码侧不一致（清理项）

- `src/types/database.ts` 死文件（只声明不存在的 `todos` 表，零引用）→ 删；`package.json` 残留 `@react-three/rapier`（src 零引用）→ 删。均在 TODO「退役清理」

### 待执行的审计遗留（2026-07-04 顾问扫描）

**⚠️ `worlds` owner/member 外键 `ON DELETE CASCADE`——member 删号会连带删掉整个世界和全部回忆，应改 `SET NULL` + status 回退 pending**；另有安全包（6 函数 `search_path`、`handle_new_user` revoke、GraphQL 收紧、泄露密码保护）与性能包（13 条 RLS initplan、4 个 FK 索引）。原始发现 `ai/Features/supabase.md` §三/四，执行项在 TODO 继承待办。

## Brain Dump / 待探索想法

- **养成系统**：两人重叠在线时段自动养植物/宠物，长成落进 timeline 成共同记忆（Forest 正反馈版）
- **益智小游戏**：房间内触发的双人轻游戏
- **更多房间类别**：模板化量产（卧室/厨房/阳台/咖啡角…），房间商店/解锁
- **小纸条**：忙碌中给对方桌上放纸条/咖啡，对方回来才看到（异步轻互动）
- **重逢时刻**：两人先后收工，角色碰头 + 今日共处时长小结
- **行为翻译进阶**：对方打字→角色执笔、翻相册→角色拿相框
- **异地时差**：窗外切「对方那边的天色」
- **离线生长**：几天没开，回来墙上多了拍立得、植物长高
- 角色互动 emote（笑/抱抱/挥手）、语音消息、年度回顾、AI 回忆标签、纪念日场景装饰
- 远期公开化：Steam（免费+装扮 DLC，SteamID 静默映射 Supabase 账号）、WE/Lively 只读壁纸输出口

## 美术与 UI/UX 技能登记

| 角色 | 技能位置与职责 | 项目入口 |
| --- | --- | --- |
| UI Tailor · UI 裁缝 | `.agents/skills/ui-tailor/SKILL.md`；统一负责 UI 与 UX（概念模型、流程、信息架构、术语、界面与可用性） | `ai/design_system/uiux/uiux.md`；主题 `uiux/cinnaglass/ui-system.md` |
| Monet · 主美/概念设计师 | `.agents/skills/monet/SKILL.md`；统筹美术，调度 UI Tailor 并审核；不主导技术选型 | `ai/design_system/design-system.md` 及领域子文档 |
| 视觉制作与第二意见 | 可用时优先 `codex-visual`，缺失时由上述角色用自身工具完成，不虚构工具 | 产物与调研按 concept/uiux 归档，原始批次可登记外部位置 |
| 原画分层与环境光照 | 用户级 Codex skill `art-relighting`，Monet 按材质/光色分离需求调用 | `ai/design_system/research/art-relighting.md` |

工作闭环、技能与项目文档的分工规则见 `AGENTS.md`「Codex skill 放置与创建规范」；此表只登记项目侧入口。

## 文档索引

- `ai/TODO.md` — 任务唯一来源
- `ai/Features/` — 功能细节载体（本文只留摘要 + 引用）：`timeline.md` 🟢 回忆链路 · `chat.md` 🟢 聊天 · `supabase.md` 🟡 后端审计，待 MCP 回填 · `navigation-glass.md` 导航基准 · `ui-system/ui-system.md` + `audit.md` UI 统一计划与现状证据
- `ai/design_system/design-system.md` — 当前整体设计与素材位置；`character` / `scene` / `props` / `effects` 领域子文档；`uiux/uiux.md` + `interaction.md` UI 地图与交互；`uiux/cinnaglass/ui-system.md` 主题规范（`ui-system.html` 预览）、`decisions.md` 当前 UI 决定；`concept/` 构想与否决档案；`research/`、`uiux/research/` 调研与比稿
- `ai/STYLE.md` / `ai/UX.md` — 旧链接兼容入口（含旧章节对应表）
- `ai/reboot/` — 重定位启动归档（2026-08-09 时点原件，不再更新；其中「三件套含 STYLE」「Blender/R3F/Rive 方案」等已被后续决策取代）
- `ai/project-audit/` — 项目审核记录（`INDEX.md` 入口），普通开发不需加载
- `codex-visual/` — 原始制作批次与历史上下文（18 个时间戳目录），使用中资料以常驻设计系统为准
