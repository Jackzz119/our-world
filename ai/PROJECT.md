# Our World 项目文档

> 项目名 **Our World** 暂定（package.json 已改为 `our-world`，目录名 `still-love` 与 git 远程暂不动）。
> 最后更新：2026-07-04（世界结构定型：世界 > 房间/文字频道/语音频道，见 `ai/Features/channel.md`；UI 术语与 sidebar 房间列表已落地）

## 产品定位

**Our World** 是一个**管理亲密关系记忆的私密空间**——给两个人（尤其异地/两地生活）一个能**沉淀双方回忆资产、并带来陪伴感**的地方。它不是社交产品，没有 feed、没有陌生人，就是属于两个人的小世界。

两个关键词：

- **回忆资产** —— 把两个人的照片、文字、（未来）视频，作为共同资产长期存储、随时回看。
- **陪伴感** —— 通过共享的 timeline、实时互动、共同经营的空间，制造「我们在一起」的实感。这是它区别于普通相册/网盘的灵魂。

### 功能优先级路线（也是开发顺序）

按情感价值与依赖关系，由内向外分四层做：

**① 回忆存储（核心，当前重点）**

- 有相互陪伴感的 **timeline**
- 图文 **post** 存储
- （later）**视频** 存储

**② Metaspace 体验（Discord-like 交互空间）**

- 先做**文字聊天**
- 再做**共同播放音乐**
- 最后做**语音**

**③ 关系小工具**

- 两人**心愿单**
- **日历**、**在一起天数** 等

**④ 3D 场景互动（最后）**

- 当前仅 **placeholder 单间**；未来会有多个房间
- 场景中触发 / 展示具体回忆相关的图片
- 交互小游戏、种植物、养宠物

**视觉风格方向：** 大耳狗（Cinnamoroll）色调——柔和天空蓝 + 奶白为主，点缀淡黄 / 腮红粉，整体清新梦幻；适当加入暗色调（暮色蓝 / 室内阴影）强化沉浸与纵深。沿用 `src/themes/cinnaglass/`。

### 当前阶段策略

- **auth 先做（地基）** —— 两个人的空间需要保密与权限，登录/权限是基础设施。**定位最小化：只为我们两个人**（白名单 2 人 + 登录守卫 + dev 自动登录开关），不做多用户注册体系。**dev 开关语义（2026-07-04 修订）**：`VITE_DEV` 不是跳过登录而是**自动真登录**（`VITE_DEV_EMAIL/PASSWORD` 建立真实会话）——无会话时 RLS 查不到任何数据，"跳过登录"只会得到全 mock 的壳。
- **数据接真实后端** —— 从 ① 回忆存储（timeline + 图文 post）开始接 Supabase，逐层往外做。
- **3D 暂不投入** —— 当前用 cinnaglass 的 2D 等距房间作 placeholder 验证情感闭环；3D 是最后阶段，具体方案后续提供。
- **分层交互原则（2026-07-04 定型）** —— **UI 层**（chrome：sidebar、覆盖式会话大窗、各弹窗 Screen）与**场景层**（stage：场景、HUD、伴随模块 ChatDock）解耦：sidebar 只触发 UI 层覆盖面与导航动作，不触碰场景内悬浮模块；**UI 层任一覆盖面打开时，场景快捷键全部禁用**（现回车实体化 dock，未来人物移动/交互键同规则）。细则见 `ai/Features/chat.md` 解耦规则。

---

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **路由**: React Router DOM v7
- **样式**: Tailwind CSS v4（注意：v4 语法与 v3 不同，例如渐变用 `bg-linear-to-br` 而非 `bg-gradient-to-br`）
- **主 UI / 主题体系**: `src/themes/cinnaglass/`——第一版 MVP 的整套界面，玻璃拟态（glassmorphism）+ 大耳狗色调，自带设计 token、内联 `<style>` 块、图标库、`<image-slot>` 组件。设计为可扩展皮肤体系（未来新皮肤平级放 `src/themes/<name>/`，现阶段只分目录、不建切换引擎）。详见 `ai/Features/handoff-claude-design.md`
- **UI 组件库**: shadcn/ui（Radix 风格，New York style，CSS 变量主题，primary 色调为玫瑰红）——**暂未用于主 UI**，保留给未来真正常规的界面（复杂表单/确认对话框等），与 cinnaglass 两套隔离
    - 已安装组件：`avatar` `card` `button` `textarea` `badge` `separator` `dialog`
    - 工具依赖：`clsx` `tailwind-merge` `class-variance-authority`
    - 配置文件：`components.json`（utils 路径用 `src/lib/utils`，组件生成到 `src/components/ui/`）
    - 注意：shadcn 生成的组件 import 路径需手动改为 `@/lib/utils`（项目使用 `@` alias）
- **3D 渲染**: `@react-three/fiber` + `@react-three/drei`（**尚未安装**，开发 3D 场景时再装）
    - 视角：天空俯视视角（aerial / top-down）
    - 当前用 Canvas 占位，Blender 导出的 GLTF 模型导入后替换为 R3F 场景
- **后端/认证**: Supabase (`@supabase/supabase-js`)
    - 已建好的后端见下方「已建基础设施」；回忆链路（worlds/posts/Storage）读写已接入，auth 收口与真机端到端验收待做
    - **实时架构**：聊天 / 在场 / 2 人化身同步用 Supabase Realtime（Broadcast + Presence + Postgres Changes）即可——产品拓扑是无数个隔离的「2 人房间」而非 MMO，不需要权威游戏服务器。仅当未来高频/多方同步证明不够，再**旁挂** Colyseus（TS 房间制多人框架）这类实时层、Supabase 仍当主干。**不用 Java**。
- **包管理器**: pnpm
- **代码格式化**: Prettier

---

## 项目结构

```
src/
├── themes/
│   └── cinnaglass/       # 第一版 MVP UI 皮肤（玻璃拟态 + 大耳狗色调），由 Claude Design 原型复刻
│       ├── cinnaglass.css    # 全局设计 token + 场景/光线/天气层 + 关键帧
│       ├── icons.tsx         # 全套线性图标（Ico + I*）
│       ├── scene.tsx         # RoomScene + RoomArt（等距房间 SVG）
│       ├── hud.tsx           # 悬浮玻璃 HUD + Toolbox（拖拽编辑/吸附对齐）
│       ├── screens.tsx       # SubScreen（时间线/照片墙/文字回忆/心愿单）
│       ├── calendar.tsx      # CalendarScreen + ClockScreen
│       ├── settings.tsx      # SettingsScreen（个人资料/账号密码/主题外观）
│       ├── sidebar.tsx       # Discord 式侧边栏
│       ├── space.tsx         # SpaceScreen 空间切换器
│       ├── music.tsx         # MusicPlayer（生成式 WebAudio）
│       ├── chat.tsx          # Chat（停靠/全屏/群聊/表情/拖拽改尺寸）
│       ├── image-slot.js     # <image-slot> 照片占位 Web Component（localStorage 持久化）
│       ├── tweaks.ts         # useTweaks（mood/glass/weather 等，localStorage 持久化）
│       ├── model.ts / rooms.ts / profile.ts / types.d.ts  # 共享类型与数据
├── components/
│   └── ui/               # shadcn/ui 组件（暂未用于主 UI，保留给未来常规界面）
├── lib/
│   ├── supabase.ts       # Supabase 客户端初始化
│   └── utils.ts          # cn() 工具函数（clsx + tailwind-merge）
├── pages/
│   └── WorldPage.tsx     # 世界空间主页：合并原型 App 编排（时钟/天气/状态/导航/弹窗挂载/持久化）
├── types/                # Supabase 数据库类型 / Feed 类型 / EnvName
├── utils/                # getEnv 工具函数
├── App.tsx               # 路由配置（当前单路由 / → WorldPage；auth 守卫待做）
└── main.tsx              # 入口（import cinnaglass.css + 注册 image-slot + render App）
```

> ⚠️ 旧占位组件（WorldCanvas / FloatingMenu / FloatingPanel / CenteredPanel / panels/*）已随复刻删除。

**注意事项：**

- 路径别名 `@/` 指向 `src/`
- 环境变量通过 `getEnv()` 工具函数读取，缺失时会抛出错误
- 所有 `EnvName` 类型在 `src/types/index.ts` 中维护
- TypeScript 类型定义统一用 `type`，不用 `interface`

---

## 常用命令

```bash
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm lint       # ESLint 检查
pnpm format     # Prettier 格式化
```

---

## 功能模块

> 第一版 MVP UI 已由 Claude Design 原型整体复刻（`src/themes/cinnaglass/`），取代了早期的占位 Canvas + 三悬浮窗口骨架。完整设计与实现细节见 `ai/Features/handoff-claude-design.md`；早期骨架记录见 `ai/Features/world-space-ui.md`。以下为各模块摘要。

> **世界 / 共享空间入口**：两人共享空间 = **世界**（DB `worlds` 表，原 couples/rooms，owner + member，2026-07-04 已完成术语迁移）。无世界的用户停在**大厅**（漂浮岛 + 传送门，主动创建/进入），有世界才进 `RoomScene`。入口设计见 `ai/Features/room.md`。
> **世界结构（2026-07-04 定型）**：世界 > 房间（绑定场景的语音频道，= cinnaglass 客厅/卧室 mock）/ 文字频道 / 语音频道；音频规则（进房自动接入、默认闭麦、单语音线路）与 `channels` 表设计见 `ai/Features/channel.md`。

### 世界空间主页（核心载体）

- 全屏场景：当前为**手绘等距房间 SVG**（`RoomArt`，含两只 chibi 兔子 + 窗/桌/床等），叠加 mood 光线层（黄昏/暮色/夜晚）与天气层（晴/多云/雨/雪）。Blender 室内场景模型导入后替换为 R3F 场景
- 应用入口当前直接进世界空间（**auth 守卫待做**：两人隐私/权限的登录守卫，见 `ai/TODO.md`）；页面上覆盖**悬浮玻璃 HUD**（游戏化浮窗：纪念日/最近回忆/时间天气/在一起天数/音乐/灯光切换 + minimap），点击浮窗打开对应弹窗
- HUD Toolbox 支持开关附加组件、解锁编辑拖拽摆放（带吸附对齐线）
- 数据先用 mock + localStorage，后端等 UI 成型再接 Supabase

### 回忆系统 — SubScreen 居中弹窗（四 tab）

从 HUD 浮窗打开的居中玻璃弹窗，常驻挂载（状态/滚动保留），含四个 tab：

| Tab | 功能 |
| --- | --- |
| **时间线** | 时间轴展示回忆 + 发帖 Composer（文字 + `<image-slot>` 配图） |
| **照片墙** | 由时间线图片汇成的瀑布流相册 |
| **文字回忆** | 文字回忆录 |
| **心愿单** | 两人共同心愿清单（勾选/进度条/添加） |

- 照片通过 `<image-slot>` 拖拽上传，localStorage 持久化
- 此外还有：日历·约会、时间·闹钟、设置、Discord 式侧边栏、空间切换器、一起听歌播放器、聊天（停靠/全屏/群聊）等弹窗，详见 Feature 文档

### 实时聊天（后续）

- 两人实时文字聊天
- 计划用 Supabase Realtime broadcast + messages 表持久化

### 游戏化 HUD（后续）

- 左上角 minimap
- 其它游戏化交互选项（待设计）

---

## 已建基础设施（Supabase）

> 后端表与 RLS 已建好，回忆读写链路已接入前端（`get_feed_posts` RPC + posts 写入，见 `ai/Features/timeline.md`）。
> 表名沿革：couples →（2026-07-03）rooms →（2026-07-04）**worlds**（术语定型见 `ai/Features/channel.md`；本次迁移同时清理了全部 `couples_*` 约束名、修复了 `check_post_unlock_validity` 仍引用 couples 的遗留 bug）。

```
allowed_emails    # 访问白名单
  - email (text, PK) / note / created_at
  RLS: select 仅自己那行；insert/update/delete 拒绝（仅 Dashboard 管理）

profiles          # 用户资料（扩展 auth.users）
  - id (uuid, FK auth.users) / display_name / avatar_url / created_at
  - [trigger] on_auth_user_created → handle_new_user()：新用户自动填资料
  RLS: select 所有已登录可见；update 仅自己；insert 由 trigger 写入

worlds            # 世界（两人共享空间；原 couples/rooms）
  - id / owner_id / member_id (可空) / intimacy_points / created_at
  - status (world_status: pending|active)
  约束: owner<>member（worlds_no_self_pair）；active 必须有 member（worlds_active_requires_member）
       [trigger] worlds_check_uniqueness → check_world_uniqueness()：每人只能属于一个世界
  RLS: select/insert/update 仅限自己参与（owner 或 member）

posts             # 回忆记录
  - id / author_id / world_id / content / images (text[])
  - privacy (shared|locked|private) / unlock_cost / created_at / updated_at
  - [trigger] posts_updated_at、posts_check_author_in_world
  - [RPC] get_feed_posts(p_world_id)：隐私/解锁规则服务端解析
  RLS: 自己全可见，对方仅 shared|locked 可见；增删改仅限自己

post_unlocks      # locked post 解锁记录
  - post_id (PK) / user_id (PK) / unlocked_at
  - [trigger] post_unlocks_check_validity
  RLS: 仅自己的解锁记录

storage.memories  # 私有图片桶，路径 <world_id>/<uuid>.<ext>（+ .thumb.webp）
  四条 "memories: world can read/upload/update/delete" 策略（2026-07-04 已完成换名）
```

> 安全/性能顾问审计发现与后端规划见 `ai/Features/supabase.md`（待专门讨论）。

### RPC 函数

```
get_feed_posts(p_world_id uuid default null)
  # Feed 聚合查询，返回经权限处理的 post 列表
  # 返回 world_id / is_unlocked / is_placeholder / visible_content / visible_images 等字段
  # 按 created_at desc 排序
```

---

## Brain Dump / 待探索想法

- 游戏化 HUD：场景上方浮起按钮展示近期信息（最近回忆 / 纪念日），参考原神 / 异环；minimap
- 角色移动 + 室内物件交互：两人化身在房间内走动，点击书桌等热点触发功能 / 打开弹窗
- 角色互动动作（emote）：两人化身可对着对方做动作/表情，类似指令式触发（如 `/smile` 对着对方笑、抱抱、挥手等），增强两人临场互动感
- 场景天气 / 昼夜系统：随时间或随机变化（室内可表现为窗外光线 / 灯光氛围）
- 角色 / 化身：俯视视角下两人在房间里的存在形式
- 回忆物品化：post 在 3D 世界里以物品形式呈现（信纸 / 相框 / 小电视）
- 纪念日道具：特殊日子场景出现装饰
- 年度回顾：自动生成「这一年我们的故事」
- AI 卡片生成：发帖时 Claude API 提取关键词，为回忆加描述标签
- 语音消息：聊天支持语音泡泡
- 在一起天数：不在主界面强调，降级到回忆页的小细节