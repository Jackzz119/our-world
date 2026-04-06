# still-love 项目文档

## 产品定位

**still** 是一个以关系为核心的情感记录和共同合作平台，不同的关系类型对应独立的 workspace：

- **still-love** — 情侣（当前项目）
- **still-family** — 家庭（暂不做）
- **still-friend** — 朋友（暂不做）
- **still-work** — 工作伙伴（暂不做）

每个 workspace 共享同一套底层理念：**Shared Diary + Relationship Game + Emotional Timeline-Todo Management**

- **Shared Diary** — 成员间共享的私密记录空间
- **Relationship Game** — 游戏化互动机制，驱动关系深度
- **Emotional Timeline** — 时间轴沉淀记忆，看见关系的成长轨迹

### MVP 策略（当前阶段）

当前聚焦 still-love，MVP 以「**Our World — 两人共同的 3D 小世界**」为核心体验：

- **登录页** — 温馨甜蜜色调（奶油 + 柔粉 + 暖光），Three.js 氛围感背景
- **Our World 主场景** — 上帝视角 3D 世界（React Three Fiber），只有两个人，场景小而精
- **记忆 Timeline 弹窗** — 以 UI 大弹窗展示，post 以游戏物品形式渲染（文字 = 信纸、视频 = 小电视、图片 = 相框）
- **角色移动** — 简单 WASD/点击移动，走近特定道具才能触发发帖操作（书桌 = 写文字，相框 = 上传图片）
- **场景内聊天** — 简单的实时文字对话，气泡显示在角色头顶

> MVP 目标：以最快速度上线「两人能一起用的温馨 3D 小世界」，游戏化深度、个人笔记、Todo 等后续迭代。

---

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **路由**: React Router DOM v7
- **样式**: Tailwind CSS v4（注意：v4 语法与 v3 不同，例如渐变用 `bg-linear-to-br` 而非 `bg-gradient-to-br`）
- **UI 组件库**: shadcn/ui（Radix 风格，New York style，CSS 变量主题，primary 色调为玫瑰红）
    - 已安装组件：`avatar` `card` `button` `textarea` `badge` `separator` `dialog`
    - 工具依赖：`clsx` `tailwind-merge` `class-variance-authority`
    - 配置文件：`components.json`（utils 路径用 `src/lib/utils`，组件生成到 `src/components/ui/`）
    - 注意：shadcn 生成的组件 import 路径需手动改为 `@/lib/utils`（项目使用 `@` alias）
- **3D 渲染**: `@react-three/fiber`（React 版 Three.js）+ `@react-three/drei`（helpers/controls）
    - 上帝视角：OrthographicCamera 或 PerspectiveCamera 高角度俯视
    - 角色与场景：MVP 阶段用几何体（CapsuleGeometry/BoxGeometry）代替 GLTF 模型，快速出效果
    - 物理/碰撞：MVP 阶段手写简单 AABB 碰撞，不引入 rapier 等物理引擎
- **后端/认证**: Supabase (`@supabase/supabase-js`)
    - Realtime：用于场景内聊天消息的实时同步（`supabase.channel`）
- **包管理器**: pnpm
- **代码格式化**: Prettier

---

## 项目结构

```
src/
├── components/
│   └── ui/               # shadcn/ui 组件（avatar, card, button, textarea, badge, separator）
├── lib/
│   ├── supabase.ts       # Supabase 客户端初始化
│   └── utils.ts          # cn() 工具函数（clsx + tailwind-merge）
├── pages/
│   ├── HomePage.tsx      # 主页（需要登录）
│   ├── CouplePage.tsx    # 情侣空间（/couple）
│   ├── LandingPage.tsx   # 落地页
│   ├── LoginPage.tsx     # 登录页
│   └── ProtectedRoute.tsx # 路由守卫
├── types/
│   ├── index.ts          # 类型定义（EnvName 等）
│   ├── database.ts       # Supabase 数据库类型
│   └── feed.ts           # Feed 相关类型（FeedPost, CoupleMeta 等）
├── utils/
│   └── index.ts          # getEnv 工具函数
├── App.tsx               # 路由配置 + 认证状态管理
└── main.tsx              # 入口
```

**注意事项：**

- 路径别名 `@/` 指向 `src/`
- 环境变量通过 `getEnv()` 工具函数读取，缺失时会抛出错误
- 所有 `EnvName` 类型在 `src/types/index.ts` 中维护

---

## 环境变量 & 认证流程

`.env.local` 中配置（不提交到 git）：

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DEV=true   # 开发模式，跳过登录验证
```

- `App.tsx` 监听 Supabase auth 状态，管理 `session` 和 `loading`
- `ProtectedRoute` 根据 session 决定渲染内容或跳转 `/login`
- `VITE_DEV=true` 时跳过登录验证（devMode）

---

## 常用命令

```bash
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm lint       # ESLint 检查
pnpm format     # Prettier 格式化
```

---

## 数据库设计（Supabase）

```
allowed_emails    # 访问白名单（只有表内邮箱才能使用 still）
  - email (text, PK)
  - note (text)             # 备注，方便 Dashboard 识别是谁
  - created_at

  RLS:
  - select: 已登录用户只能查到自己那一行（email = auth.users.email where id = auth.uid()）
  - insert / update / delete: 全部拒绝（无 policy = 默认拒绝，只能通过 Dashboard 管理）

profiles          # 用户资料（扩展 auth.users）
  - id (uuid, FK auth.users)
  - display_name              # [trigger] on_auth_user_created → handle_new_user()：新用户注册/OAuth 后自动填入，Google 取 full_name，邮箱注册取 @ 前缀
  - avatar_url                # [trigger] on_auth_user_created → handle_new_user()：Google OAuth 自动填入，邮箱注册为 null
  - created_at

  RLS:
  - select: 所有已登录用户可查看（配对时需查对方资料）
  - update: 只能更新自己的行（auth.uid() = id）
  - insert: 由 handle_new_user trigger 写入，绕过 RLS

couples           # 情侣关系
  - id
  - user1_id (FK profiles)
  - user2_id (FK profiles)
  - intimacy_points (int)
  - created_at

  约束:
  - check: user1_id < user2_id            # 保证唯一性（同一对不会出现两行）
  - check: user1_id <> user2_id           # 禁止自我配对
  - [trigger] couples_check_uniqueness → check_couple_uniqueness()：每人只能属于一个 couple，insert/update 前校验

  RLS:
  - select: 只能查到自己参与的行（user1_id = uid 或 user2_id = uid）
  - insert: 已登录用户可创建，自己必须是 user1_id 或 user2_id
  - update: 双方均可更新（用于亲密值等字段）

posts             # 动态/说说
  - id
  - author_id (FK profiles)
  - couple_id (FK couples)
  - content (text)
  - images (text[])         # Supabase Storage URL 数组
  - privacy (enum: shared | locked | private)
  - unlock_cost (int)       # 解锁所需亲密值，locked 级别用
  - created_at
  - updated_at              # [trigger] on_post_updated → set_updated_at()：任意字段修改时自动更新时间戳

  约束:
  - [trigger] posts_check_author_in_couple → check_post_author_in_couple()：insert/update 前校验 author_id 必须属于 couple_id 对应的情侣关系

  RLS:
  - select: 自己的所有 post 可见；对方仅可见 privacy = shared | locked 的 post（通过 couples 表确认关系）
  - insert: author_id 必须为 auth.uid()
  - update: 只能修改自己的 post
  - delete: 只能删除自己的 post

post_unlocks      # 解锁记录（谁解锁了哪条 locked post）
  - post_id (uuid, FK posts, PK)
  - user_id (uuid, FK profiles, PK)
  - unlocked_at (timestamptz)

  约束:
  - primary key (post_id, user_id)
  - [trigger] post_unlocks_check_validity → check_post_unlock_validity()：insert/update 前校验
      · 作者不能解锁自己的 post
      · 只有 privacy = 'locked' 的 post 可被解锁
      · user_id 必须属于该 post 所属的 couple

  RLS:
  - select: 只能查自己的解锁记录（user_id = auth.uid()）
  - insert: user_id 必须为 auth.uid()
  - delete: 只能删除自己的解锁记录
```

### RPC 函数

```
get_feed_posts(p_couple_id uuid default null)
  # Feed 聚合查询，返回经过权限处理后的 post 列表
  # 调用者：authenticated 用户
  # 参数：p_couple_id 可选，不传则返回所有可见 post

  返回字段:
  - post_id, couple_id, author_id, privacy
  - created_at, updated_at, unlock_cost
  - is_unlocked (bool)    # true: 自己的 post / shared / locked 且已解锁
  - is_placeholder (bool) # true: locked 且非作者且未解锁（前端显示占位卡）
  - visible_content       # locked 未解锁时为 null
  - visible_images        # locked 未解锁时为 []

  逻辑：
  - left join post_unlocks，判断当前用户是否已解锁
  - private post 已被 RLS 过滤，函数内不做额外处理
  - 按 created_at desc 排序
```

---

## 功能模块

### 路由结构

```
/login     → LoginPage（登录入口，未来可扩展为 Landing Page）
/          → HomePage（个人主页，需登录）
/world     → WorldPage（Our World 3D 世界，需登录 + 需配对完成）
```

**路由守卫逻辑：**
- 未登录 → 重定向 `/login`
- 已登录但未配对 → 停留在 `/`（HomePage 内引导完成配对流程）
- 已登录且已配对 → 可进入 `/world`

**注意：** MVP 阶段不设独立的 `/setup` 配对页，配对流程（邀请码创建/输入）在 HomePage 内以弹窗/区块形式完成，保持路由简洁。

### Auth

- 邮箱/密码登录注册
- Google OAuth
- devMode（`VITE_DEV=true`）跳过验证
- ProtectedRoute 路由守卫

### LoginPage 设计（待实现）

**定位：** MVP 只做登录功能，后续可扩展成含产品介绍的 Landing Page。

**色调：** 温馨甜蜜风格
- 背景：奶油白 → 浅粉暖调渐变（`#fff8f5 → #ffeef0`）
- 品牌 Logo：`still`，字体选细衬线或手写感
- 主色：rose/pink，搭配暖米色（amber-50 系）
- Google 登录置顶，邮箱/密码在分割线下方
- 主按钮：`rose-400 → rose-500` 渐变
- 可选：简单 CSS 动画背景（浮动爱心/粒子），不强依赖 Three.js

### HomePage 设计（待实现）

**定位：** 登录后的个人主页，是进入 Our World 前的「前厅」。当前 MVP 保持极简，后续可扩展。

**内容结构（MVP）：**
- 顶部：用户头像 + 昵称 + 登出按钮
- 中央主区域：
  - 「你的小屋」预览区（简单示意图或插画，代表个人空间，后续可扩展）
  - **「进入 Our World」入口卡片** — 核心入口，醒目展示
    - 未配对：显示配对引导（创建空间 / 输入邀请码）
    - 已配对：显示场景缩略图预览，附带状态提示（有未读消息 / 有新 post / 对方在线），点击进入 `/world`
    - 场景缩略图可反映当前天气状态（晴天 / 雨天 / 傍晚等），增加进入前的氛围感

**配对流程（在 HomePage 内完成）：**
- 未配对时，入口卡片展示两个操作：「创建我们的世界」和「加入 TA 的世界」
- 创建：写入 couples 表（status = pending），生成邀请码展示
- 加入：输入邀请码，配对完成（status = active），刷新进入 `/world`

### Our World 主场景（WorldPage）

**场景定位：** 一间两人共同的书房。这是你们一起待着的地方，有书桌、电脑、书架，温暖而私密。

**技术实现：**
- React Three Fiber 渲染，全屏 Canvas
- 上帝视角（45° 斜俯视角，固定），类似俯视 RPG 视角
- 场景模型由 Blender MCP 搭建，导出 GLTF 加载
- 光照：暖色调环境光 + 点光源模拟台灯，室内整体偏暖黄
- 色调：奶油色地板、木质书桌、暖黄灯光

**氛围细节：**
- 窗外有雨景（雨滴粒子或贴图动画）
- 配合背景音乐 + 雨声音效，营造温馨沉浸感
- 室内灯光与窗外雨天形成反差，强化「窝在一起」的私密感

**MVP 场景道具（交互触发点）：**

| 道具   | 功能触发                                       |
| ------ | ---------------------------------------------- |
| 书桌   | 走近 → 弹出发帖输入框（文字 + 图片上传）        |

**角色系统：**
- 两个角色，CapsuleGeometry 或简单 BoxGeometry，不同颜色区分
- 自己：键盘 WASD 或点击地面移动（click-to-move）
- 对方：从 Supabase Realtime 同步位置（实时广播 position）
- 移动动画：MVP 阶段不做骨骼动画，位置插值平滑即可

**UI 覆盖层（HUD）：**
- 左上角：两人名字 + 在一起天数
- 右下角：「我们的记忆」按钮 → 打开 Timeline 弹窗
- 角色头顶：聊天气泡（实时消息）
- 走近道具时：屏幕底部出现交互提示（`[E] 写下今天`）

### 记忆 Timeline 弹窗

**触发：** 点击 HUD「我们的记忆」按钮，或走近信箱/柜触发

**布局：** 全屏大弹窗，半透明毛玻璃背景，内含横向或竖向 Timeline

**Post 物品化渲染：**

| post_type | 视觉物品     | 点击行为                         |
| --------- | ------------ | -------------------------------- |
| `text`    | 信纸/便签    | 弹窗展开完整文字内容             |
| `image`   | 相框/立即照  | 弹窗全屏图片查看                 |
| `video`   | 小电视机     | 弹窗嵌入视频播放器               |

- posts 新增 `post_type` 字段（`text | image | video`）
- 时间轴按日期排列，每个 post 是一个可点击的「物品卡片」

### 发帖系统（场景交互）

- **文字帖**：走到书桌旁 → 屏幕出现输入提示 → 按 E 或点击 → 弹出文字输入框 → 提交写入 posts 表
- **图片帖**：走到相框旁 → 触发图片上传 → 上传至 Supabase Storage → 写入 posts 表
- **视频帖**：走到小电视旁 → 触发视频上传（后续 Phase 补充）
- MVP 阶段所有帖子 privacy 默认 `shared`，隐私等级后续再加

### 场景内聊天

- 输入框：HUD 底部，按 Enter 发送
- 消息通过 Supabase Realtime channel 广播（`presence` 或 `broadcast`）
- 收到消息后在对方角色头顶显示气泡（3-5 秒后消失）
- 消息同时写入 `messages` 表做持久化（可选：只做 Realtime 广播，不持久化）

### 情侣配对（SetupPage）

- 登录后检查 couple 状态，无配对 → 引导至 `/setup`
- 创建空间：写入 couples 表（status = pending）
- 生成邀请码，对方输入后配对完成（status = active）
- 配对完成 → 跳转 `/world`

---

## 数据库补充（Our World 新增）

```
posts 表新增字段:
  - post_type (enum: text | image | video)  # 决定 Timeline 渲染物品类型

messages              # 场景内聊天消息
  - id (uuid, PK)
  - couple_id (FK couples)
  - sender_id (FK profiles)
  - content (text)
  - created_at

  RLS:
  - select: 属于自己 couple 的消息可见
  - insert: sender_id = auth.uid()，couple_id 需为自己所在的 couple
```

---

## Brain Dump / 待探索想法

- 场景装扮系统：两人可以共同布置房间，添加家具、更换壁纸
- 角色外形自定义：发型、衣服颜色等
- 纪念日道具：特殊纪念日时场景出现节日装饰
- 地图扩展：当前小屋 → 庭院 → 小镇
- 推送通知：对方进入场景时通知
- 年度回顾：自动生成「这一年我们的故事」动画
- AI 卡片生成：发帖时 Claude API 提取关键词，为 Timeline 物品添加描述标签
- 亲密值系统：行为积分，解锁特殊场景装扮或隐藏记忆
- 语音消息：聊天支持语音泡泡
- 原有的 locked post 隐私等级机制（移至后续迭代）
