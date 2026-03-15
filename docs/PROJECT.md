# still-love 项目文档

## 产品定位

**still** 是一个以关系为核心的情感记录和共同合作平台，不同的关系类型对应独立的 workspace：

- **still-love** — 情侣（当前项目）
- **still-family** — 家庭
- **still-friend** — 朋友
- **still-work** — 工作伙伴

每个 workspace 共享同一套底层理念：**Shared Diary + Relationship Game + Emotional Timeline-Todo Management**

- **Shared Diary** — 成员间共享的私密记录空间
- **Relationship Game** — 游戏化互动机制，驱动关系深度
- **Emotional Timeline** — 时间轴沉淀记忆，看见关系的成长轨迹

> 当前聚焦 still-love，MVP 验证核心体验后再扩展其他 workspace。

---

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **路由**: React Router DOM v7
- **样式**: Tailwind CSS v4（注意：v4 语法与 v3 不同，例如渐变用 `bg-linear-to-br` 而非 `bg-gradient-to-br`）
- **后端/认证**: Supabase (`@supabase/supabase-js`)
- **包管理器**: pnpm
- **代码格式化**: Prettier

---

## 项目结构

```
src/
├── lib/
│   └── supabase.ts       # Supabase 客户端初始化
├── pages/
│   ├── HomePage.tsx      # 主页（需要登录）
│   ├── LandingPage.tsx   # 落地页
│   ├── LoginPage.tsx     # 登录页
│   └── ProtectedRoute.tsx # 路由守卫
├── types/
│   ├── index.ts          # 类型定义（EnvName 等）
│   └── database.ts       # Supabase 数据库类型
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

### Auth

- 邮箱/密码登录注册
- Google OAuth
- devMode（`VITE_DEV=true`）跳过验证
- ProtectedRoute 路由守卫

### 情侣配对

- 邀请码生成与输入
- 配对关系写入 couples 表
- 未配对用户引导至配对页

### Timeline（主页）

- 双方动态按时间倒序排列
- 分页/无限滚动加载
- 隐私等级差异化渲染：
  - `shared` → 正常显示
  - `locked` → 模糊/锁定，显示解锁所需亲密值；Mood Post 仅露出情绪色块
  - `private` → 对方不可见，自己看到私密标记
- 纪念册模式（聚合视图）：按 Day / Week / Month / Anniversary 归组展示

### 发布动态

- 普通 post：文字 + 图片上传（Supabase Storage）
- Mood Post：一句话 + 情绪背景色/渐变色，视觉与普通 post 区分
- 隐私等级选择：shared / locked / private
- Private post 支持「延迟分享」：发布后可在未来某天选择 share to our space

### 亲密值系统

- 行为触发增加亲密值（登录、发动态、互动）
- 消耗亲密值解锁 locked 动态

---

## Brain Dump / 待探索想法

- 纪念日提醒功能
- 双方共同编辑的「我们的故事」页面
- 地图打卡（去过的地方）
- 年度回顾自动生成
- 推送通知（对方发动态时）
- 个人空间：用户拥有独立于情侣空间的个人 post 记录（couple_id 为 null），用于记录私人生活；数据库设计上 posts.couple_id 需支持 nullable
