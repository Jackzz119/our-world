# Our World 项目文档

> v2「放置陪伴小屋」。2026-08-09 产品重定位（决策依据与调研归档见 `ai/reboot/`）。
> 核心文档：本文档（PRD + 技术事实）· `ai/TODO.md`（任务唯一来源）· `ai/design_system/design-system.md`（当前设计系统）。
> 最后更新：2026-09-13（Monet/UI Tailor 改为跨平台工作方法；当前设计集中为常驻 Markdown，区分 concept 档案与 research，移除回合报告与临时文件。产品样式和光照未改，日记本本 session 冻结）

## 产品定位（PRD）

**Our World 是一间开着就行的放置陪伴小屋**——一个网页（之后可能用 Electron 打包成桌面 app）：固定镜头的温馨房间里，两只 Q 版长耳小狗代表一对情侣，各自坐在自己的位置上看书、写字、打盹；窗外光照跟着真实时间晨昏流转；两人的回忆（时间线/相册/聊天）藏在房间的每一件家具里，点击打开。

四个产品要素：

1. **美丽场景**——水彩暖光的房间，时辰光照 + 可切天气，放置产品的第一竞争力是画面
2. **ASMR 声音**——雨声/壁炉/lofi 分层音景，陪工作陪学习
3. **简单个人管理**——时钟·闹钟、日历·约会、心愿单这类轻工具
4. **爱人回忆组件**——timeline 日记、照片墙、实时聊天（v1 已全部接真后端）

### 差异化与市场依据（详见 ai/reboot/market-research.md）

- 品类成功产品（Spirit City 97% 好评 33 万份、Rusty's 55 万份、Desktop Mate 200 万下载）**全是单人+宠物结构**；「两个人共享一个陪伴空间 + 真实共享数据」的交叉点无人交付
- **presence 即陪伴**：产品核心一眼价值 = 瞥一眼就知道「她在不在、在干嘛」——对方在线角色回归座位，离线则空位留痕（留灯/杯子/围巾）
- **形态定位**：网页优先——比 Steam 需要下载的 Spirit City 们**更容易让普通人接触到**（零安装、发链接即达）；桌面壳与桌宠是纯增量演进

### 形态路线

```
R0 验证周   Document PiP 置顶小窗 + Lively 贴壁纸实验（不写壳，验证「常驻」体感）
R1 网页 MVP 场景 + 角色 + presence + 三大回忆组件挂物件（当前重点）
R2 Electron 无边框置顶窗/贴边小窗 + 托盘 + 开机自启（桌宠方向 Electron 优先，Tauri 缺 forward API）
R3 桌宠模式 全屏透明层 + 点击穿透，桌面缩小仅见两只角色（概念图 03）
R4 远期     养成/益智小游戏/更多房间/Steam 公开发行（Brain Dump）
```

### 陪伴设计三铁律（调研沉淀，违反即返工）

1. **零成本在场**：应用开着形象就在；任何要「经营」的 presence 会让更忙的一方先放弃
2. **只做正反馈**：不做惩罚/连坐/排行——「你在的时候我们都变好」
3. **互动长在房间和物件上，不长在信息流里**：两个人没有 feed 存在的理由

### MVP 定义（大耳狗风格，两人自用）

1 个房间模板（书房，概念图 01/02 构图）× 4 时辰 + 双角色状态机（idle/看书/写字/喝咖啡/打盹 + 在线/离线）+ Supabase Realtime Presence + 三物件热点（书桌→timeline、相框→照片墙、电话→聊天）+ 聊天气泡浮头顶 + ASMR 音景 + 极窄玻璃 rail。**不在 MVP**：语音、共享音乐同步、心愿单/日历后端、房间装扮、多房间、养成、小游戏。

## 核心体验

- **主画面**：近景固定机位单房间，无 WASD、无自由镜头、无场景漫游，所有交互都是点击
- **物件 → 功能映射**：书桌/日记本→时间线、相框墙→照片库、转盘电话→聊天、挂钟→时钟闹钟、挂历→日历纪念日、唱片机→共享音乐、许愿罐→心愿单、对方角色→轻互动（打招呼/戳一戳）
- **房间模板架构**（可量产设计，见 `ai/design_system/scene.md`）：房间 = 时辰底图 + 两座位锚点 + 热点位 + 窗户天气区 + 音景预设；当前三档，四档为目标。角色动画独立于房间——加房间不加角色成本
- **presence**：在线=角色回归座位+单绿点；离线=空位留痕；远期行为翻译（对方打字→角色执笔、翻相册→拿相框）
- **体验循环**：开着 → 对方上线角色醒来 → 瞥一眼 → 轻互动/气泡 → 点书桌记录 → 点相框回看 → 窗外晨昏流转

## 技术栈

- **框架**: React 19 + TypeScript + Vite 7 + React Router v7，包管理 pnpm，格式化 Prettier
- **样式**: 自有 CSS 体系（无框架）——四载体契约见 `ai/design_system/uiux/cinnaglass/ui-system.md`；主题 `src/themes/cinnaglass/`（玻璃拟态 + 大耳狗色调）
- **场景层**: PixiJS v8 WebGL 合成器 `src/themes/cinnaglass/room/pixi-scene.ts`，吃房间模板 `room-types.ts` / `study-room.ts`（底图×时辰交叉淡化 + 雨层 mask 到玻璃格 + 真实走时挂钟 + 角色 + 光照配方 mood×weather + 星星提示 + 热点点击）。**活物件（living props）**：家具直接从底图抠出来自己动，hover 只改参数不换图——唱片机转盘用「外沿椭圆 + 圆心」像素级量测得到的单应矩阵做**透视真旋转**（`PerspectiveMesh`，圆心与外沿转动时都不漂），唱片机按「**死物吃画里的光，活物吃场景的光**」分离：底图 = 原画在盘位与唱臂脚印内贴入 codex 生成的**无盘无臂机器**（其余像素不动）；唱片（v5，2026-09-07）= 原画盘面按**旋转对称性**分解——每半径角向中值为外观基底（随盘转，保留部分对称绘制光影，并非严格去光 albedo）+ codex 标签印花贴花，原画减去对称部分为逐像素静态光层（add/multiply，不随盘转），静止时按 add/multiply 合成接近原画（复原误差 2.2–2.5/255）；三档各一张外观基底，无 tint；唱臂是 codex 生成的**平光固有色**零件（逐档 tint 光比）；转轴针是死物，直接从各档原画羽化切出。运行时 512² 母图按显示尺寸重采样后 1:1 采样。装配器 `scripts/build-turntable-parts.py`，产物 `public/rooms/study/parts/`；hover = 转速提升 + 抬针（`lift` 驱动绕转轴柱的垂直剪切，唱头抬、柱不动，投影按 mood 光向滑开变淡）。原画真源 `arts/rooms/study/source/`，生成图层归档 `arts/rooms/study/generated/`。量测工具 `scripts/fit-disc-ellipse.py`；方案研究 `ai/design_system/research/living-props.md`
- **角色层**: 双帧透明立绘（睁/闭眼）+ 程序复合变形（呼吸 scaleY / 摇摆 / 随机眨眼），在 pixi 合成器内与场景共享同一套光照；动作丰富化阶段再评估 Rive/Spine（依据见 ai/reboot/tech-plan.md §2）
- **后端**: Supabase（auth + Postgres + Storage + Realtime Broadcast/Presence + Edge Functions）——**新产品功能 100% 命中已有后端，零迁移**
- **桌面壳（R2+）**: Electron（`setIgnoreMouseEvents(..., {forward:true})` 是桌宠穿透唯一官方 API；Tauri 观望）
- **实时架构**: 产品拓扑 = 无数隔离的 2 人房间，Supabase Realtime 足够，不需要权威游戏服务器

## 项目结构（现状 → 翻新方向）

```
src/
├── themes/cinnaglass/    # UI 皮肤：token/图标/弹窗组件继续用
│   ├── cinnaglass.css    # 设计 token + mood/wx 氛围层（时辰系统直接复用）
│   ├── screens.tsx       # 时间线/照片墙/心愿单弹窗 ✅ 保留（挂到物件下）
│   ├── shell/            # 当前导航/天气/聊天窄卡/纪念卡/音乐条；材质尚未统一
│   ├── channel-screen.tsx / friends-page.tsx # 完整聊天与旧社交入口仍可达
│   ├── calendar.tsx / settings.tsx / music.tsx  # ✅ 保留
│   ├── scene.tsx         # 旧 SVG 背景仍由登录/重置页使用，不能直接删
│   ├── rooms.ts          # 旧 mock 残留，但 owLoad 仍被 WorldPage 使用
│   └── room/             # 当前 Pixi 房间、物件与场景锚定状态 UI
├── lib/                  # supabase/worlds/posts/storage/profiles/chat 数据层 ✅ 全保留
├── pages/WorldPage.tsx   # 已接房间场景与悬浮层，仍组织旧弹窗
└── types/                # ✅ 保留
```

## 已有功能资产（v1 保留部分的技术事实）

> v1（Discord-like 时代）已完成且**继续服役**的功能，此处为技术事实**摘要**。
>
> **功能细节的载体是 `ai/Features/*.md`**（`CLAUDE.md` 文档维护规则）——2026-08-09 提交 `7c93c3c` 曾把该目录一刀全删（与 `ai/reboot/tech-plan.md` §119「保留 timeline/chat/supabase」的计划相悖），已于 2026-08-22 恢复 timeline / chat / supabase 三份。channel / sidebar / ui-system / settings / world / world-space-ui / image-slot / handoff 等随 Discord 壳层作废，不恢复。

- **auth 地基**：登录页 + 路由守卫 + 忘记密码/重置 + 登出；白名单 = Supabase 关闭注册开关（已验证 422 拦截）；dev 模式 `VITE_DEV` = 自动**真登录**（`VITE_DEV_EMAIL/PASSWORD`，无会话则 RLS 全空）；手动加账号走 Dashboard「Add user」/Admin API，不 SQL 直插
- **timeline / 我们的日记**（2026-09-07）：棕皮旧纸居中双页接入真实图文随纸竖直翻动、连续翻阅与阅读时雨不停播；羽毛笔仍为静态图片。验收、加载边界与数据约束见 `ai/Features/timeline.md`，设计状态见 `ai/design_system/uiux/cinnaglass/ui-system.html#journal-turn`。
- **随光磨砂导航**（2026-09-07 实现，2026-09-11 复核）：固定细纹图片、实时背景模糊与按 mood 预设的 CSS 边光，非运行时随机/物理反射；作为悬浮 UI 基准，详见 `ai/Features/navigation-glass.md`。
- **UI / UX 审计**（2026-09-11）：完成全 UI 入口、材质/状态/弹层与清理依赖盘点，并记录 A 悬浮 / B 任务 / C 专属物件统一计划；产品尚未迁移，证据与边界见 `ai/Features/ui-system/ui-system.md`、同目录 `audit.md`。
- **原画分层与环境光照工作流**（2026-09-12）：已创建用户级 Codex `art-relighting` skill、局部渲染比较工具及三张原画/六种环境配方的渐变预览；资产模式与当前实现边界见 `ai/design_system/research/art-relighting.md`。
- **照片墙**：自然纵横比 polaroid 拼贴（暖灰纸框/胶带/微旋转/月份分组）+ lightbox 原图渐进加载
- **聊天全链路**：Broadcast from Database（写库 + trigger 广播 private topic `world:{id}`）；乐观发送/失败重试/原位编辑/删除粒子/reaction chips/已读游标；贴纸系统（`world_emotes` 共享库 + Edge Function Tenor 代理转存 + EmotePicker 自维护 230 emoji 中文索引）；DM = channels `type='dm'`（账号级 topic `user:{uid}`）——**DM/好友 UI 在新方向收起，数据层冻结保留**。**📄 细节文档**：`ai/Features/chat.md`（v1 双形态论述读时注意 ChatDock 已被 concept-c 聊天窄卡 + 头顶气泡取代）
- **世界属性**：`worlds.name/anniversary/icon_emoji/icon_path`（icon 图存 memories 桶 256px webp）；纪念日/在一起天数从 DB 实时计算；**欠：昵称编辑写回 profiles.display_name**（个人设置仍本地缓冲）
- **双实例调试**：`pnpm dev2` 双端口双账号（jack/sherry）互发验收
- **UI 基建现状**：`.modal` 基础样式共用，但完整聊天/物件弹层独立；导航、`--cg-*` 浮窗、`--glass-*` 旧壳、`--craft-*` 暖纸覆盖并存。`data-glass` 仅影响部分旧组件；image-slot 仍在用。当前不能称为完整统一体系，实况与迁移计划见 UI Feature。
- **Debug log**：`src/lib/logman.ts`（`Logman.log` 仅 dev；格式 `[功能域][web][模块]`）；现有标签池：`auth`、`chat`

## 数据库（Supabase 项目 `xrscspcqnsxvfshskfpy`）

> 全部继续服役，零迁移开工。翻新只做渐进清理（见下备注）。
>
> **📄 细节文档**：`ai/Features/supabase.md`（结构审计 + 安全/性能顾问发现）。**该文正文仍是 2026-07-04 快照**，待 2026-08-22 连 MCP 拉真实结构后回填；回填完成即由它接管「后端结构唯一真源」，本节缩为摘要 + 引用。在那之前，**下表是当前结构的临时真源**。
>
> **核对时点 2026-08-21**：下表按前端数据层实际读写**反查确认**——`src/lib/*.ts` 的 `*_COLS` 常量就是应用真正依赖的列。核对当次 Supabase MCP 离线，**未做线上 DDL 复核**，若与线上有差异以线上为准。另注：**schema 变更历史不在仓库**（历次迁移都经 MCP 直接应用到线上），`sql/` 目录只剩两份早期脚本（`dev-create-world.sql`、`storage-memories-bucket.sql`），不代表当前结构。

### 表（列以前端实际 select 为准）

| 表                  | 应用读写的列                                                                                                         | 备注                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `allowed_emails`    | email(PK) / note / created_at                                                                                        | 白名单表；**实际拦截靠 Dashboard 关闭注册开关**，当前**无任何代码引用**                                               |
| `profiles`          | id(FK auth.users) / display_name / avatar_url                                                                        | trigger `on_auth_user_created → handle_new_user()` 自动建档                                                           |
| `worlds`            | id / owner_id / member_id / name / anniversary / icon_emoji / icon_path / intimacy_points / created_at               | 另有 `status`(pending\|active) 列存在但前端不 select；约束 no_self_pair、active_requires_member；trigger 每人限一世界 |
| `posts`             | author_id / world_id / content / images[] / privacy(shared\|locked\|private) / unlock_cost / created_at / updated_at | **写直插、读只走 RPC**                                                                                                |
| `post_unlocks`      | post_id / user_id / unlocked_at                                                                                      | locked 帖解锁记录，解锁经济未启用                                                                                     |
| `channels`          | id / world_id / type(text\|voice\|room\|dm) / name / topic / scene_id / position / dm_user_a / dm_user_b             | world 型 + dm 型（规范序对）；trigger 新世界自动建默认频道。新方向 UI 无频道概念，表保留当聊天管道                    |
| `messages`          | id / channel_id / world_id / author_id / content(≤4000) / created_at / edited_at / kind(text\|sticker) / emote_id    | trigger `set_world` 回填 world_id + 广播                                                                              |
| `message_reactions` | message_id / user_id / world_id / emoji / created_at                                                                 | PK(message, user, emoji)                                                                                              |
| `channel_reads`     | channel_id / user_id / world_id / last_read_at                                                                       | 已读游标，只进不退 guard                                                                                              |
| `world_emotes`      | id / world_id / name / storage_path / source_url / added_by / created_at                                             | 世界共享贴纸库（LINE 单轨模式）                                                                                       |
| `friendships`       | user_a / user_b / requested_by / status / created_at / responded_at                                                  | 账号级规范序对；accepted → 自动建 DM。**新方向 UI 冻结，数据层保留不删**                                              |

### RPC / Edge Function / Storage / Realtime

- **RPC** `get_feed_posts(p_world_id, p_before, p_limit)` — 时间线读链路唯一入口；服务端解析隐私/解锁 + 游标分页（`p_before` 为独占游标，传 null 取最新页）
- **RPC** `find_profile_by_email(p_email)` — 按邮箱找人（好友流程用）
- **Edge Function** `emotes` — Tenor 搜图 + 转存（`action:'search'` 等）；**待配 TENOR_API_KEY**
- **Storage** 私有桶 `memories`：`<world_id>/<uuid>.<ext>` 原图 + `<uuid>.thumb.webp`（长边 1024）· `emotes/` 贴纸 · 世界 icon 256px webp；展示走 signed URL（TTL 1h），前端 40 分钟自动续签 + tab 重可见重签
- **Realtime = Broadcast from Database**：客户端从不主动广播，DB trigger 把 I/U/D 推到 private topic `world:{id}`（世界内消息/回应/已读）与 `user:{uid}`（账号级 DM/好友）；**Presence 通道尚未接**（R1 待办）

### 代码侧不一致（清理项）

- `src/types/database.ts` 是**死文件**：里面只声明了一张项目里根本不存在的 `todos` 表（Supabase 模板残留），全库零引用 → 删
- 真实使用中的类型在 `src/types/feed.ts`（World/FeedPost/FeedProfile）与 `src/types/chat.ts`

### 待执行的审计遗留（原 supabase.md 审计要点，2026-07-04 顾问扫描）

- **⚠️ 高优先**：`worlds` 的 owner/member 外键是 `ON DELETE CASCADE`——**member 删号会连带删掉整个世界和全部回忆**；应改 `SET NULL` + status 回退 pending（一条 migration）
- 安全加固（一个 migration 打包）：6 个函数 `search_path` 固定；`handle_new_user` revoke anon/authenticated 的 RPC 执行权；GraphQL 可发现性收紧；Dashboard 开启泄露密码保护
- 性能（一个 migration 打包）：13 条 RLS 策略 `auth.uid()` → `(select auth.uid())`（initplan 重估）；补 4 个 FK 索引（posts.author/world、post_unlocks.user、worlds.member）

## Brain Dump / 待探索想法

- **养成系统**：两人重叠在线时段自动养植物/宠物，长成落进 timeline 成共同记忆（Forest 正反馈版）
- **益智小游戏**：房间内触发的双人轻游戏
- **更多房间类别**：模板化量产（卧室/厨房/阳台/咖啡角…），房间商店/解锁
- **小纸条**：忙碌中给对方桌上放纸条/咖啡，对方回来才看到（异步轻互动）
- **重逢时刻**：两人先后收工，角色碰头 + 今日共处时长小结
- **行为翻译进阶**：对方打字→角色执笔、翻相册→角色拿相框
- **异地时差**：窗外切「对方那边的天色」
- **离线生长**：几天没开，回来墙上多了拍立得、植物长高
- 角色互动 emote（对着对方笑/抱抱/挥手）、语音消息、年度回顾、AI 回忆标签、纪念日场景装饰
- 远期公开化：Steam（免费+装扮 DLC，SteamID 静默映射 Supabase 账号）、WE/Lively 只读壁纸输出口

## 美术与 UI/UX 技能登记

| 角色 | 技能位置与职责 | 项目入口 |
| --- | --- | --- |
| UI Tailor · UI 裁缝 | `.agents/skills/ui-tailor/SKILL.md`；统一负责 UI 与 UX，含概念模型、用户流程、信息架构、术语命名、界面与可用性；独立 ux 技能已移除 | `ai/design_system/uiux/uiux.md`；主题 `uiux/cinnaglass/ui-system.md` |
| Monet · 主美/概念设计师 | `.agents/skills/monet/SKILL.md`；面向游戏与应用统筹美术，调度 UI Tailor 并审核；人设不主导技术选型 | `ai/design_system/design-system.md` 及其角色/场景/物件/效果/UI 常驻子文档 |
| 视觉制作与第二意见 | 可用时优先 `codex-visual`，缺失/不可用由上述角色使用自身工具完成；不虚构工具或独立审查 | 所有最终产物和实质调研按 concept/uiux 归档，原始批次可登记外部位置 |
| 原画分层与环境光照 | 用户级 `art-relighting`，保留原工作流；Monet 按材质/光色分离需求调用 | `ai/design_system/research/art-relighting.md` |

**工作闭环**：读取当前设计系统与用户/Monet 要求 → 调研与同景可见方案 → 细致规格和授权内实现 → UI Tailor 交互验证 / Monet 视觉审核 → 展示并同步登记。无独立 agent 时加载相应 skill 切换职责，标为同 agent 复核。新方案的用户批准与技术/视觉审核分开。

项目风格、决定和实际素材地址只写 `ai` 中的设计系统及相关文档，通用触发在 `AGENTS.md`；不更新 Claude 专属登记。技能只留方法，角色与 UI 技能的 openai.yaml 是显示元数据。`design-system.md` 持续链接当前采用项；README 解释结构，concept 留构想/否决档案，research 留有价值的研究/比稿。阶段收尾清理陈旧附属文件，普通回合报告留 session。HTML 跨设备展示仅在有需要时从常驻 Markdown 更新并按授权发布。

## 文档索引

- `ai/TODO.md` — 任务唯一来源
- `ai/Features/` — **功能细节文档载体**（`AGENTS.md` 规则：细节写这里，PROJECT.md 只留摘要 + 引用）
    - `timeline.md` — 回忆链路（时间线/照片墙/Composer/Storage）🟢 在役，视觉与功能迭代记于此
    - `chat.md` — 聊天系统 🟢 在役（UI 形态已换 concept-c，数据层不变）
    - `supabase.md` — 后端结构审计 🟡 正文待 MCP 复核回填
    - `navigation-glass.md` — 已认可导航基准及真实材质机制
    - `ui-system/ui-system.md` — 全项目 UI / UX 目标、三类边界与迁移计划；同目录 `audit.md` 为现状证据
- `ai/design_system/design-system.md` — 当前整体设计与已采用项、素材位置；角色/场景/物件/效果分别有图文及行为子文档
- `ai/STYLE.md` / `ai/UX.md` — 旧链接兼容入口，正文已集中至设计系统，避免双重维护
- `ai/design_system/README.md` — 只描述目录与维护方式
- `ai/design_system/concept/` — 整体构想、未来想法、脑暴与否决方向；不是当前采用规范
- `ai/design_system/research/` — 美术调研与比稿，包括现有光层预览；UI 研究在 uiux/research
- `ai/reboot/` — 重定位启动归档（市场调研/产品愿景/技术方案/概念图解读，2026-08-09）
- `ai/design_system/uiux/cinnaglass/` — `ui-system.md` 是常驻主题规范，HTML 为组件/参数预览；日记资源与必要实现依据保留
- `ai/design_system/uiux/uiux.md` / `interaction.md` — 全项目 UI 地图与交互正文；图文、状态和素材引用由 UI Tailor 维护，Monet 总审
- `codex-visual/` — 原始制作批次和历史上下文，使用中的资料位置以常驻设计系统为准；不继续逐回合往此处堆普通过程报告
- `ai/design_system/uiux/cinnaglass/decisions.md` — 当前 UI 设计决定；D-1～D-12 在 `uiux/research/cinnaglass-history/ux-decisions.md`，旧外观规则不再作为当前标准
