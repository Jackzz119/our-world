# Our World 项目文档

> v2「放置陪伴小屋」。2026-08-09 产品重定位（决策依据与调研归档见 `ai/reboot/`）。
> 三件套：本文档（PRD + 技术事实）· `ai/TODO.md`（任务唯一来源）· `ai/STYLE.md`（风格效果基准）。
> 最后更新：2026-08-09

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
- **房间模板架构**（可量产设计，结构见 STYLE.md §3）：房间 = 背景图×4 时辰 + 两座位锚点 + 热点位 + 窗户天气区 + 音景预设；角色动画独立于房间——加房间不加角色成本
- **presence**：在线=角色回归座位+单绿点；离线=空位留痕；远期行为翻译（对方打字→角色执笔、翻相册→拿相框）
- **体验循环**：开着 → 对方上线角色醒来 → 瞥一眼 → 轻互动/气泡 → 点书桌记录 → 点相框回看 → 窗外晨昏流转

## 技术栈

- **框架**: React 19 + TypeScript + Vite 7 + React Router v7，包管理 pnpm，格式化 Prettier
- **样式**: 自有 CSS 体系（无框架）——四载体契约见 `ai/STYLE.md` §8；主题 `src/themes/cinnaglass/`（玻璃拟态 + 大耳狗色调）
- **场景层（新）**: 媒介待拍板（静态图 / 静态+微动效 / 3渲2 分层，见 TODO R1 首条）；若走 3渲2，Blender 管线已有（`ai/blender/`、blender-create skill）
- **角色层（新）**: 候选 Rive（runtime MIT、状态机）或 sprite 帧动画——样板实测后定（依据见 ai/reboot/tech-plan.md §2）
- **后端**: Supabase（auth + Postgres + Storage + Realtime Broadcast/Presence + Edge Functions）——**新产品功能 100% 命中已有后端，零迁移**
- **桌面壳（R2+）**: Electron（`setIgnoreMouseEvents(..., {forward:true})` 是桌宠穿透唯一官方 API；Tauri 观望）
- **实时架构**: 产品拓扑 = 无数隔离的 2 人房间，Supabase Realtime 足够，不需要权威游戏服务器

## 项目结构（现状 → 翻新方向）

```
src/
├── themes/cinnaglass/    # UI 皮肤：token/图标/弹窗组件继续用
│   ├── cinnaglass.css    # 设计 token + mood/wx 氛围层（时辰系统直接复用）
│   ├── screens.tsx       # 时间线/照片墙/心愿单弹窗 ✅ 保留（挂到物件下）
│   ├── chat-dock.tsx 等  # 聊天组件 ✅ 保留（大窗保留，dock 概念被头顶气泡替代）
│   ├── calendar.tsx / settings.tsx / music.tsx  # ✅ 保留
│   ├── sidebar.tsx / hud.tsx / space.tsx / channel-screen.tsx / scene.tsx(旧SVG房间)
│   │                     # ❌ 退役对象（Discord 壳层），R1 清理任务删除
│   └── metaspace.tsx     # ❌ 退役（3D Canvas）
├── lib/                  # supabase/worlds/posts/storage/profiles/chat 数据层 ✅ 全保留
├── pages/WorldPage.tsx   # 改造：场景部分换成新场景层组件
└── types/                # ✅ 保留
```

## 已有功能资产（v1 保留部分的技术事实）

> v1（Discord-like 时代）已完成且**继续服役**的功能。旧过程文档已清理，此处为技术事实存档。

- **auth 地基**：登录页 + 路由守卫 + 忘记密码/重置 + 登出；白名单 = Supabase 关闭注册开关（已验证 422 拦截）；dev 模式 `VITE_DEV` = 自动**真登录**（`VITE_DEV_EMAIL/PASSWORD`，无会话则 RLS 全空）；手动加账号走 Dashboard「Add user」/Admin API，不 SQL 直插
- **timeline 时间线**：单列日记流（上旧下新、游标分页无限上滚、拖拽滚动+惯性、橡皮筋刷新）；Composer 多图受控选择器（所见即所传）+ 草稿（点外收起保草稿，取消是唯一清空）+ textarea 自动长高；作者色身份系统（我=蓝 accent、对方=粉 `#EF9DB4`，打在光环/名字/边线）；图片签名 URL **40 分钟自动续签** + tab 重可见重签；缩略图 `THUMB_MAX=1024` webp
- **照片墙**：自然纵横比 polaroid 拼贴（白框/胶带/微旋转/月份分组）+ lightbox 原图渐进加载
- **聊天全链路**：Broadcast from Database（写库 + trigger 广播 private topic `world:{id}`）；乐观发送/失败重试/原位编辑/删除粒子/reaction chips/已读游标；贴纸系统（`world_emotes` 共享库 + Edge Function Tenor 代理转存 + EmotePicker 自维护 230 emoji 中文索引）；DM = channels `type='dm'`（账号级 topic `user:{uid}`）——**DM/好友 UI 在新方向收起，数据层冻结保留**
- **世界属性**：`worlds.name/anniversary/icon_emoji/icon_path`（icon 图存 memories 桶 256px webp）；纪念日/在一起天数从 DB 实时计算；**欠：昵称编辑写回 profiles.display_name**（个人设置仍本地缓冲）
- **双实例调试**：`pnpm dev2` 双端口双账号（jack/sherry）互发验收
- **UI 基建**：弹窗壳 `.modal` 全局唯一、`.btn-primary/.chip-accent` 收敛、image-slot token 化；光照递进 token 体系（`[data-mood]` 明度轴 + `[data-glass]` 材质轴 + 纸面重映射）——**直接成为新时辰系统的 UI 侧**
- **Debug log**：`src/lib/logman.ts`（`Logman.log` 仅 dev；格式 `[功能域][web][模块]`）；现有标签池：`auth`、`chat`

## 数据库（Supabase 项目 `xrscspcqnsxvfshskfpy`）

> 全部继续服役，零迁移开工。翻新只做渐进清理（见下备注）。

```
allowed_emails    # 访问白名单（email PK / note）；RLS: select 仅自己
profiles          # 用户资料（FK auth.users / display_name / avatar_url）
                  # [trigger] on_auth_user_created → handle_new_user()
worlds            # 两人世界：owner_id / member_id / status(pending|active) / intimacy_points
                  # + name / anniversary / icon_emoji / icon_path（世界属性）
                  # 约束: no_self_pair、active_requires_member；trigger: 每人限一世界
posts             # 回忆：author/world/content/images[]/privacy(shared|locked|private)/unlock_cost
                  # [RPC] get_feed_posts(p_world_id)：隐私/解锁服务端解析
post_unlocks      # locked 帖解锁记录
storage.memories  # 私有图片桶 <world_id>/<uuid>.<ext>（+.thumb.webp、emotes/、icon）
channels          # 频道：world 型(text|voice|room) + dm 型(dm_user_a/b 规范序对)
                  # 新方向 UI 无频道概念，表保留当聊天管道；trigger: 新世界自动建默认频道
messages          # 消息：content(≤4000)/kind(text|sticker)/emote_id/edited_at
                  # [trigger] set_world 回填 + broadcast(I/U/D → topic world:{id})
message_reactions # 表情回应（PK message/user/emoji）
channel_reads     # 已读游标（只进不退 guard）
world_emotes      # 世界共享贴纸库（LINE 单轨模式）；[Edge Function] emotes：Tenor 搜图+转存
friendships       # 好友（账号级规范序对；accepted → 自动建 DM）——新方向冻结不删
```

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

## 文档索引

- `ai/TODO.md` — 任务唯一来源
- `ai/STYLE.md` — 风格效果基准（概念图/角色/光照/声音/UI/验收标准）
- `ai/concept/` — **定稿概念图正式存放处**（六张 + codex 报告；后续新概念稿也入此处）
- `ai/reboot/` — 重定位启动归档（市场调研/产品愿景/技术方案/概念图解读，2026-08-09）
- `ai/design_system/cinnaglass/` — 大耳狗主题 UI 设计系统资产，留作参考（`ui-system.html` 为 token 活文档真源）
- `codex-visual/` — codex 工作产物目录（按批次归档，定稿的才升入 ai/concept/）
- `.claude/skills/ux/decisions.md` — UX 决策登记表（D-1~D-12；其中 Discord 壳层相关决策随重定位废弃，登记表待 ux skill 下轮清理标注）
