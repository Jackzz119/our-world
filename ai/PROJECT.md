# Our World 项目文档

> 第三期「对坐」，2026-09-25 选定、09-27 定为开发方向（概念与决定见 `ai/design_system/concept/across-the-table/`）。上一期「放置陪伴小屋」的重定位依据仍在 `ai/reboot/`，美术资料在 `arts/archive/v2-companion-house/`。
> 核心文档：本文档（PRD + 技术事实）· `ai/TODO.md`（任务唯一来源）· `ai/design_system/design-system.md`（当前设计系统）· `ai/features/*.md`（功能细节）。
> 最后更新：2026-09-29（UI 迭代：动效体系与低动效模式、手机底部托盘、音乐主页面、进入世界加载页，本地实现待看样；书房：大动作改成关键帧链，喝一口的杯子交接不再出双杯，小满入座，默认他的视角）

## 产品定位（PRD）

**Our World 是一张和你在乎的人对坐的桌子**——一个网页（之后打包成桌面 app，可置顶小窗）加手机端：镜头就是你，桌子对面坐着对方的半身形象，前景是你自己的手和杯子；每个人的屏幕上都是对方，是同一张桌子的两头。对方真实在做什么（在线、输入中、离开、睡着），对面的角色就在做什么。聊天、回忆（日记、照片墙）和音乐是功能；房间里的物件是两个人之间的小仪式。

四个产品要素：

1. **对坐的场景**——二次元 CG 厚涂的半身角色 + 有景深和实景光源的房间，时辰与天气会变，画面是长期挂着的第一竞争力
2. **对面是真人**——角色的每个主动动作都来自对方的真实状态或 TA 亲手留下的东西（录音、便条、送来的咖啡），不是 AI 陪伴
3. **房间里的仪式**——一个房间 = 一个功能 + 一个小游戏：倒一杯咖啡给对方、拉灯、落针放歌、一起养花；结果留在对方那边，最后变成回忆
4. **回忆与聊天**——timeline 日记、照片墙、实时聊天（v1 起已接真后端）

### 差异化与市场依据

- AI 陪伴很多，**真人陪伴**没人做好：同类竞品要么是单人加宠物（Spirit City、Desktop Mate），要么是和虚拟角色恋爱（Love and Deepspace）；这里的「角色」就是你的另一半或朋友本人
- **presence 即陪伴**：瞥一眼就知道 TA 在不在、在干嘛；在线时 TA 坐在对面，离开时空椅留痕（外套、还冒热气的杯子）
- **网页优先，三端同一视觉**：手机竖屏像一通画出来的视频通话，桌面置顶小窗就是 TA 的脸；桌宠是增量演进
- 市场调研的原始依据见 `ai/reboot/market-research.md`（上一期写成，结论仍适用）

### 形态路线

```
R1 网页第一期  书房：男女角色、基本动作、在场状态、台灯/咖啡/唱片机等个别物件交互，手机与电脑同步（当前重点）
R2 桌面壳       Electron 无边框置顶小窗 + 托盘 + 开机自启；小窗构图 = TA 的半身
R3 更多房间     唱片角、暗房、深夜书房、温室……十个房间按功能分批；大厅（亮着的窗）承载多人与多空间
R4 远期         自定义形象与声音名片完善、多人小桌、公开发行
```

### 陪伴设计铁律（违反即返工）

1. **零成本在场**：应用开着形象就在；任何要「经营」的 presence 会让更忙的一方先放弃
2. **只做正反馈**：不做惩罚、连坐、排行、连续打卡——植物不会死
3. **互动长在房间和物件上，不长在信息流里**；场景不做 UI 功能的重复入口
4. **对面是真人**：只翻译应用内已知的真实状态；人不在就空椅留痕，不装作在；「睡着了」只由本人主动设置

### 第一期定义（书房，两人自用）

翻新现有书房为对坐书房（雨夜城市窗边桌），先做她的视角（登录她的账号，对面是阿屿），再做他的视角；男女角色的基本动作（看书、抬眼、写字、喝一口、酣睡、摸头与戳一下反应、离开留痕）；台灯拉绳、倒一杯咖啡、唱片机落针、日记本入口；手机与电脑布局同步。细节与进度见 `ai/features/study-room/study-room.md`。**不在第一期**：声音名片存储、共享同听、必须双方同时在线的互动（掌心相贴、碰杯）、其他房间、大厅、自定义形象。

## 核心体验

- **主画面**：第一人称固定机位，对方半身居中，桌子挡住下半身；前景是自己的手和杯子；只做小幅视差，无自由镜头、无漫游，所有交互都是点击 / 按住
- **物件是仪式**：台灯拉绳开关灯、咖啡壶倒一杯给对方、唱片机落针放歌、日记本打开日记；完整功能仍从导航进入（物件与功能的对应以 `study-table.ts` / `ai/design_system/props.md` 为准）
- **对方的状态**：在线看书、输入中低头写字、离开时空椅留痕、主动设为睡着时趴桌酣睡；戳一下、摸头随时能做，对方回来也能看到
- **房间模板**：房间 = 时辰底图（台灯开 / 关）+ 对面座位 + 桌面前沿 + 前景 + 活物件 + 互动热区；角色与房间解耦（见 `ai/design_system/scene.md`）
- **体验循环**：开着 → 对方上线坐到对面 → 瞥一眼 → 戳一下 / 倒杯咖啡 / 聊一句 → 一起听歌、翻日记 → 窗外晨昏流转

## 技术栈

- **框架**: React 19 + TypeScript + Vite 7 + React Router 7；pnpm；Prettier；无单元测试、无 CI
- **样式**: 自有 CSS（无框架），四载体契约见 `ai/design_system/uiux/cinnaglass/ui-system.md`；主题 `src/themes/cinnaglass/`
- **动效**: 无动画库（2026-09-29 调研 Motion / Vaul 后不采用）。曲线与时长 token 在 `ui/motion.css`，低动效模式由 `ui/motion-preference.ts` 解析后写到 `html[data-motion]`（CSS 与 Pixi 房间都读它）；退场靠 `ui/use-presence.ts`，粒子与失败轻晃在 `ui/feedback.ts`，手机底部托盘 `ui/sheet.tsx`。规则见 `ai/design_system/uiux/interaction.md` §6
- **场景层**: 对坐书房。PixiJS v8 合成器 `src/themes/cinnaglass/room/table-scene.ts`，吃模板 `room-types.ts` / `study-table.ts`：整幅底图 × 时辰（golden/twilight/night）× 台灯开 / 关 × 晴 / 雨，新组整组盖上再退旧组；雨层 mask 到窗格；对方姿势层（`partner-layer.ts`；导演 `rig-director.ts`，书房的配置在 `partner-state.ts`：所有关键帧链连成图，喝一口 / 写字 / 入睡都一步步走，桌上的杯子交接时跟着手走）；杯子蒸汽 `steam-layer.ts`；台灯拉绳与热点星芒（`affordance.ts`）；前景的手；活物吃 `lighting.ts` 的时辰 tint；宽屏从对方头顶往下取、窄屏以脸为中心。React 壳 `room-scene.tsx` 负责挂载、气泡与名牌落位和 dev 对方状态面板。素材由 `scripts/build-study-table.py` 装配（manifest 在 `arts/rooms/study/table-manifest.json`），细节与进度见 `ai/features/study-room/study-room.md`。上一期的水彩书房、双犬、挂钟与唱片机代码已于 2026-09-27 删除（原画源在 `arts/archive/v2-companion-house/rooms/study/`，代码在 git 历史）
- **角色层**: 对方的半身姿势图（同一张横版透明画布、同锚点，睁 / 闭眼两帧）+ 程序呼吸 / 微摆 / 眨眼 + 状态机，吃场景光；制作方式见 `ai/design_system/character.md`；动作变多时再评估 Spine / Live2D
- **后端**: Supabase（auth + Postgres + Storage + Realtime Broadcast/Presence + Edge Functions）——新产品功能 100% 命中已有后端，零迁移
- **桌面壳（R2+）**: Electron（`setIgnoreMouseEvents(..., {forward:true})` 是桌宠穿透唯一官方 API；Tauri 观望）
- **实时架构**: 隔离的 2 人房间，Supabase Realtime 足够，无需权威游戏服务器

## 项目结构（现状）

```
src/
├── App.tsx / main.tsx   # 路由 /login、/reset-password、/（ProtectedRoute → WorldPage）
├── pages/               # LoginPage · ResetPasswordPage · ProtectedRoute（VITE_DEV 自动真登录）· WorldPage（场景、浮窗与任务窗编排）
│   └── world/           # WorldPage 的 hooks：useWorldSession · useSurfaceRouter · useWeather · useLiveClock · usePersistedState
├── hooks/ · utils/      # useAuth、useFeed · getEnv/getEnvFlag
├── lib/                 # supabase（含 currentUserId）/ worlds / posts / storage / profiles / chat / emotes / friends / logman / local-store
├── types/               # feed.ts、chat.ts（一个类型对一张表）、image-slot.d.ts
└── themes/cinnaglass/
    ├── cinnaglass.css · materials.css       # C/兼容材质与基础主题；reset 在 src/index.css
    ├── ui/              # ui-system.css（A/B 材质与控件、--ui-display 标题字）· motion.css + motion-preference（动效 token / 低动效）· sheet（手机托盘）· use-panel-focus · use-presence · feedback · task-dialog · use-ui-environment
    ├── room/            # table-scene（Pixi 合成器入口）+ room-scene（React 壳）· room-types · study-table · partner-layer · partner-state · steam-layer · rain-layer · affordance · lighting · fade-queue · textures
    ├── shell/           # rail + navigation-glass.css · ambience · floaters（纪念卡/音乐条与停靠栏）· chat-card · world-loader + load-progress（进入世界加载）· world-surfaces · use-world-chat-bubble
    ├── journal/         # 棕皮书日记与翻页（C 类物件 UI，设置「书本（旧版）」时使用）：room-book · layout · turn · turn-controller · room.css · turn.css · diary.css
    ├── surfaces/        # 物件功能面：object-surfaces（SubScreen 编排）· memory-surface（回忆面板：日记 + 照片墙）· journal-stream · journal-index · photo-wall · memory-lightbox · memory-photos · memory.css · composer · post-detail · wishlist · use-signed-thumbs · date-format · author-tone · object-surfaces.css
    ├── chat/            # chat-data（门面）· store · use-message-store · use-world-stream · use-account-stream · use-emote-library · use-optimistic-send · chat-hub（完整聊天大窗）· conv-nav · message-list · chat-composer · bubble-dust · friends-page · emote-picker · emoji-data
    ├── calendar · settings · world-settings · music + music-tracks + use-music-playback · lobby · entry.css
    ├── icons · model · profile · tweaks    # 共享图标/类型/偏好；旧登录 SVG 已移除
    └── image-slot.js    # 图片选择器 web component，仅设置页头像在用
```

## 已有功能资产（v1 保留部分的技术事实）

> 功能细节在 `ai/features/*.md`，此处只留摘要。`7c93c3c`（2026-08-09）误删该目录，2026-08-22 恢复 timeline / chat / supabase 三份；channel / sidebar / settings / world / world-space-ui / image-slot / handoff 随 Discord 壳层作废不恢复（现 `ai/features/ui-system/` 为 2026-09-11 新建）。

- **auth 地基**：登录页 + 路由守卫 + 忘记密码/重置 + 登出；白名单 = Supabase 关闭注册开关（已验证 422 拦截）；`VITE_DEV` = 用 `VITE_DEV_EMAIL/PASSWORD` 自动**真登录**（无会话则 RLS 全空，见 `.env.example`）；加账号走 Dashboard/Admin API，不 SQL 直插
- **timeline / 我们的日记**（2026-09-07）：棕皮旧纸双页、真实图文随纸竖直翻页、连续翻阅、阅读时雨不停播；羽毛笔仍为静态图。细节 `ai/features/timeline.md`，设计 `ai/design_system/uiux/cinnaglass/ui-system.md`
- **照片墙**：自然纵横比 polaroid 拼贴（纸框/胶带/微旋转/月份分组）+ lightbox 原图渐进加载（细节 timeline.md）
- **随光磨砂导航**（2026-09-07）：固定细纹图 + backdrop 模糊 + 按 mood 的 CSS 边光，无运行时随机/物理反射；A 类悬浮 UI 基准，见 `ai/features/navigation-glass.md`
- **聊天全链路**：Broadcast from Database（客户端只写库，trigger 广播 private topic `world:{id}`）；乐观发送/失败重试/原位编辑/删除/reaction/已读游标；贴纸系统（`world_emotes` 共享库 + Edge Function `emotes` 代理 Tenor 搜图转存 + EmotePicker 自维护 emoji 中文索引）；DM = `channels.type='dm'`（账号级 topic `user:{uid}`）。**DM/好友在完整聊天中折叠为次级入口，真实数据链保留**。细节 `ai/features/chat.md`（ChatDock 已被聊天窄卡 `shell/chat-card.tsx` + 头顶气泡取代）
- **世界属性**：`worlds.name/anniversary/icon_emoji/icon_path`（icon 存 memories 桶 256px webp）；纪念日/在一起天数由 DB 实时计算；昵称已写回 `profiles.display_name`（2026-09-19）
- **双实例调试**：`pnpm dev2`（5174 端口）双账号互发验收
- **环境与来信 UI**（2026-09-20）：左上角时钟/云双圆入口沿用导航材质，点击展开/收起、横拖或方向键选择；滑动透镜及真实天气状态沿原偏好与 `useWeather` 链路，较矮桌面面板向右避让导航；`SunlitLetter` 用金亮信纸提示世界未读消息，点击打开聊天并使用已有已读游标，已读后消失。时辰配色、小屏与播放器避让见 `ai/design_system/uiux/cinnaglass/ui-system.md`；暮色玫瑰金适配待用户看样，未新增通知后端。
- **手机版 UI**（2026-09-21）：App 统一发布可见视口，A/B/入口适配安全区与软键盘；完整聊天按需展开会话、横屏播放器消除重复条。8 尺寸 × 12 页面及 4 类合成键盘回归通过，真机待验收；独立功能 `ai/features/mobile-ui.md`，图文 `ai/design_system/uiux/mobile.md`。
- **UI 基建现状**：2026-09-20 本地 A/B 与边缘页面已统一为导航同源材料和原生 TaskDialog，音乐接真实本机 WebAudio、天气与未实现能力状态如实呈现；实现/兼容/验收边界见 `ai/features/ui-system/ui-system.md`，消费者与历史证据见同目录 `audit.md`
- **UI 动效与手机托盘**（2026-09-29 实现，2026-09-30 用户看样保留）：全组件按压 / 进出场反馈与低动效模式；手机上聊天、音乐、工具、房间、回忆从底部托盘升起，对方完整可见；音乐主页面（8 首音景、概念图裁切的占位海报、歌词、歌单、本机收藏、沉浸歌词），桌面右侧停靠栏；进入世界时台灯随真实加载进度亮起；面板标题用站酷小薇。交互与录屏 `ai/design_system/uiux/cinnaglass/ux/ux.md`，比稿 `ai/design_system/codex-visual/ui-motion/ui-motion.md`，看样页 `codex-visual/ui-motion/review/`，手机回归 `ai/features/mobile-ui.md`
- **回忆面板**（2026-09-30，推荐方案已实现，待用户看样）：日记（手帐长卷、写一页、目录日历）与照片墙（拍立得）同一面板两页签，共用灯箱；桌面右侧停靠、手机托盘；旧棕皮书保留为设置「书本（旧版）」。比稿 `ai/design_system/codex-visual/memories/memories.md`，功能 `ai/features/timeline.md`
- **Debug log**：`src/lib/logman.ts`（`Logman.log` 仅 dev；格式 `[功能域][web][模块]`）。设置使用 `[auth][web][settings]` 记录改密/退出失败；聊天与房间也使用各自域标签

## 数据库（Supabase 项目 `xrscspcqnsxvfshskfpy`）

> 全部继续服役，零迁移开工。**下表是当前结构的临时真源**：2026-08-21 按 `src/lib/*.ts` 的 select 反查，未做线上 DDL 复核，与线上有差异以线上为准；标「待核」者来自 07-04 快照。`ai/features/supabase.md` 待连 MCP 回填后接管唯一真源、本节缩为摘要（TODO 继承待办）。schema 变更历史不在仓库，`sql/` 只有两份早期脚本。

### 表（列以前端实际 select 为准）

| 表                  | 应用读写的列                                                                                                           | 备注                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `allowed_emails`    | email(PK) / note / created_at（待核）                                                                                  | 白名单表；实际拦截靠 Dashboard 关闭注册开关，**代码零引用**                                                                              |
| `profiles`          | id(FK auth.users) / display_name / avatar_url                                                                          | trigger `on_auth_user_created → handle_new_user()` 自动建档（待核）                                                                      |
| `worlds`            | id / owner_id / member_id / name / anniversary / icon_emoji / icon_path / intimacy_points / created_at                 | 另有 `status`(pending\|active) 列前端不 select；约束 no_self_pair、active_requires_member（待核）；`check_world_uniqueness` 每人限一世界 |
| `posts`             | author_id / world_id / content / images[] / privacy(shared\|locked\|private) / unlock_cost / created_at / updated_at   | **写直插、读只走 RPC**                                                                                                                   |
| `post_unlocks`      | post_id / user_id / unlocked_at（待核，前端不直接读写）                                                                | locked 帖解锁记录，解锁经济未启用                                                                                                        |
| `channels`          | id / world_id / type(text\|voice\|room\|dm) / name / topic / scene_id / position / dm_user_a / dm_user_b               | world 型 + dm 型（规范序对）；新世界自动建默认频道（待核）。新方向无频道 UI，表保留当聊天管道                                            |
| `messages`          | id / channel_id / world_id / author_id / content(≤4000 待核) / created_at / edited_at / kind(text\|sticker) / emote_id | trigger `set_world` 回填 world_id + 广播（待核）                                                                                         |
| `message_reactions` | message_id / user_id / world_id / emoji / created_at                                                                   | PK(message, user, emoji)                                                                                                                 |
| `channel_reads`     | channel_id / user_id / world_id / last_read_at                                                                         | 已读游标，只进不退 guard                                                                                                                 |
| `world_emotes`      | id / world_id / name / storage_path / source_url / added_by / created_at                                               | 世界共享贴纸库；name 每世界唯一                                                                                                          |
| `friendships`       | user_a / user_b / requested_by / status(pending\|accepted) / created_at / responded_at                                 | 账号级规范序对（user_a < user_b）；accepted → 自动建 DM。**UI 作为折叠次级入口保留，数据链不删**                                         |

### RPC / Edge Function / Storage / Realtime

- **RPC** `get_feed_posts(p_world_id, p_before, p_limit)` — 时间线读链路唯一入口；服务端解析隐私/解锁 + 游标分页（`p_before` 独占游标，null 取最新页）
- **RPC** `find_profile_by_email(p_email)` — 好友流程按邮箱找人
- **Edge Function** `emotes` — `action:'search'`（Tenor 搜图）/ `'import'`（≤2MB 图片服务端转存 + 入库）；**待配 TENOR_API_KEY**
- **Storage** 私有桶 `memories`（25MB/文件，png/jpeg/webp/avif；RLS 按首段路径 = world_id 判成员）：`<world_id>/<uuid>.<ext>` 原图 + `<uuid>.thumb.webp`（长边 1024）· `<world_id>/emotes/<uuid>.webp` 贴纸（长边 512）· `<world_id>/icon-<uuid>.webp` 世界 icon；展示走 signed URL（TTL 1h）；缩略图 40 分钟自动续签 + tab 重可见重签，世界 icon 与贴纸目前只有 40 分钟定时、无重可见重签（PA-044）
- **Realtime = Broadcast from Database**：客户端从不主动广播，DB trigger 把 I/U/D 推到 private topic `world:{id}`（消息/回应/已读/贴纸库）与 `user:{uid}`（DM/好友）；**Presence 尚未接**（`WorldPage` 头顶胶囊为占位文案，R1 待办）

### 代码侧不一致（清理项）

- 2026-09-19 审核第二步已清理：`@react-three/rapier` 与 `optimizeDeps` 残留、`rooms.ts` mock、`database.ts`、page-flip 链、3D 源文件；`tsc -b` 首次零错误。结构规范见 `ai/project-audit/CONVENTIONS.md`

### 待执行的审计遗留（2026-07-04 顾问扫描）

**⚠️ `worlds` owner/member 外键 `ON DELETE CASCADE`——member 删号会连带删掉整个世界和全部回忆，应改 `SET NULL` + status 回退 pending**；另有安全包（6 函数 `search_path`、`handle_new_user` revoke、GraphQL 收紧、泄露密码保护）与性能包（13 条 RLS initplan、4 个 FK 索引）。原始发现 `ai/features/supabase.md` §三/四，执行项在 TODO 继承待办。

## Brain Dump / 待探索想法

对坐深化稿已经把上一期的大部分想法落成了房间玩法（温室养花、棋牌室桌游、蜡封信与小纸条、列车的异地窗景、离线生长的回忆墙），见 `ai/design_system/concept/across-the-table/across-the-table.md`。还没有归宿的：

- **重逢时刻**：两人先后收工，一起伸个懒腰 + 今日共处时长小结
- **行为翻译进阶**：对方翻相册 → 角色拿起相框；对方在听歌 → 戴上耳机轻轻点头
- 年度回顾、AI 回忆标签、纪念日场景装饰
- 远期公开化：Steam（免费 + 装扮 DLC，SteamID 静默映射 Supabase 账号）、WE / Lively 只读壁纸输出口

## 开工红线（本项目专属的强制前置动作）

协议文件（`CLAUDE.md` / `AGENTS.md`）只写通用规则；下面是本项目自己的红线，每次开工必读：

1. **设计入口唯一**：整体风格与素材位置以 `ai/design_system/design-system.md` 及其链接的常驻 Markdown 为准；设计系统只放最新一期，上一期在 `arts/archive/`（只留一期，不作参考源）；UI/UX 以 `ai/design_system/uiux/uiux.md`、主题规范 `uiux/cinnaglass/ui-system.md`、当前决定 `uiux/cinnaglass/decisions.md` 为准。`ai/STYLE.md` / `ai/UX.md` 只是旧链接兼容桩；`concept/` 与 `research/` 里的「定稿」是当时状态，不能覆盖现行决定。
2. **UI/UX 工作流**：先读设计系统与 Monet 要求 → `ui-tailor` 设计/展示/验证 → 视觉完成件交 `monet` 审核 → 决定与素材同步回设计系统。**2026-09-30 用户定规**：UX 用看样页展示（实景方案图 + 状态标签 + 实装录屏 + 动效试验区 + 决定清单 + 调研），UX 是设计系统参考的重要一环、不只用 token 表达（`uiux/cinnaglass/ux/ux.md`）；需要美术图时不在会话里自己生成，先占位，等用户在机器上装好 Codex 再出图。**2026-09-20 目录裁决：比稿、调研和待确认原型统一归 `ai/design_system/codex-visual/`，`uiux/` 只保留已敲定规范与选定展示；方向认可与细节定稿、设计批准与产品实现分别记录。** 技能本体仍在 `ai/jaSkills/`。没有独立 agent 时加载相应 skill 切换职责并标注「同 agent 自审」，不虚构委派；普通回合报告在 session 里给，不逐轮建 report 文件。已有混合目录随 UI 标准板合并后迁移并修正引用。
3. **日记：冻结已解除（2026-09-30 用户：日记与照片墙统一迭代，旧日记先不删）**。默认日记是 A 类回忆面板（`surfaces/memory-surface.tsx`，桌面右侧停靠、手机托盘，TA 始终可见）；棕皮书（`journal/`）原样保留为设置「书本（旧版）」，删除前先问用户。改公共 `.modal` / `.paper` 时仍要确认不破坏书本模式。当前导航是 A 类悬浮 UI 基准。
4. **代码与结构规范**：`ai/project-audit/CONVENTIONS.md`（分层依赖方向、命名、复用/拆分、注释、格式化、脚本依赖）；写代码前看 `.prettierrc` 与 `eslint.config.js`，配置优先于现状；`pnpm exec tsc -b` 必须保持零错误。
5. **数据与后端**：`ai/PROJECT.md` 数据库节是临时真源（前端 select 反查，未核线上），改表结构先看 `ai/features/supabase.md` 的审计遗留；`VITE_*` 变量进浏览器，不放 `service_role`。
6. **审核中**：`project-audit` 五步全项目自审进行到第三步结束（诊断已交付、P1 待用户裁决实施），入口 `ai/project-audit/INDEX.md`；审核发现的待办写回 `ai/TODO.md`，证据只放审核目录。
7. **功能文档**：一个功能一份 `ai/features/<名>.md`；超过一个 md（子功能、调研、mockup、图片）就建 `ai/features/<名>/` 文件夹，主文档与附属材料互链（2026-07-13 用户定规）。

## 技能与协议在哪

- 技能唯一正本 `ai/jaSkills/`（`.claude/skills`、`.agents/skills`、`.codex/skills` 都是指向它的链接）；通用技能名册在根协议「Skill 系统」节，本项目专属登记在 `ai/JASKILL.md`。
- 根 `CLAUDE.md` / `AGENTS.md` 不入库（个人化，真源在货架），入库副本在 `ai/jaAgents/`；新检出跑 `shelf init --agents claude,codex` 或 `bash ai/jaSkills/custom-skill/scripts/sync-worktree.sh` 还原；桌面版 worktree 按 `.worktreeinclude` 复制两份协议。
- 项目角色入口：UI Tailor → `ai/design_system/uiux/uiux.md`；Monet → `ai/design_system/design-system.md`；视觉制作/第二意见优先 `codex-visual`（原始批次落 `ai/design_system/codex-visual/<时间戳>/`，gitignored；定稿图、提示词与制作注记整理进 concept 或常驻文档后入库）；原画分层 `art-relighting` 为用户级 Codex skill，上一期的使用记录在 `arts/archive/v2-companion-house/research/art-relighting.md`。

## 文档索引

- `ai/TODO.md` — 任务唯一来源
- `ai/features/` — 功能细节载体（本文只留摘要 + 引用）：`study-room/study-room.md` 🟡 书房（对坐第一期，两个视角都已上线，7 / 10）· `timeline.md` 🟢 回忆链路 · `chat.md` 🟢 聊天 · `supabase.md` 🟡 后端审计，待 MCP 回填 · `navigation-glass.md` 导航基准 · `mobile-ui.md` 手机布局与设备验收 · `ui-system/ui-system.md` + `audit.md` UI 当前实现、验收边界与历史收口
- `ai/design_system/design-system.md` — 当前整体设计与素材位置；`character` / `scene` / `props` / `effects` 领域子文档；`uiux/uiux.md` + `interaction.md` UI 地图与交互；`uiux/cinnaglass/ui-system.md` 主题规范（`ui-system.html` 预览）、`decisions.md` 当前 UI 决定；`concept/across-the-table/` 当期对坐概念（77 张图、制作注记与出图 brief）；`uiux/cinnaglass/ux/ux.md` UX 参考（流程、状态、动效、录屏）；`codex-visual/` 待确认的比稿与看样页
- `ai/STYLE.md` / `ai/UX.md` — 旧链接兼容入口（含旧章节对应表）
- `ai/reboot/` — 重定位启动归档（2026-08-09 时点原件，不再更新；其中「三件套含 STYLE」「Blender/R3F/Rive 方案」等已被后续决策取代）
- `ai/project-audit/` — 项目审核记录（`INDEX.md` 入口）与 `CONVENTIONS.md`，普通开发不需加载审核证据
- `ai/jaSkills/` 技能正本 · `ai/JASKILL.md` 专属技能登记 · `ai/jaAgents/` 协议入库副本与 Multica 引导脚本 · `.shelf.json` 货架账本
- `arts/archive/` — 上一期（放置陪伴小屋）的概念、调研、比稿、Codex 批次与原画档案，以及对坐一期落选的方向比稿；只留一期，下次换期整期删除
