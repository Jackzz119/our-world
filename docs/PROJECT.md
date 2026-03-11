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

couples           # 情侣关系
  - id
  - user1_id (FK profiles)
  - user2_id (FK profiles)
  - intimacy_points (int)
  - created_at

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
