# Our World 项目文档

> 项目名 **Our World** 暂定（package.json 已改为 `our-world`，目录名 `still-love` 与 git 远程暂不动）。
> 最后更新：2026-05-31

## 产品定位

**Our World** 是一个围绕「我和女朋友两个人生活」的私密空间——一个游戏化、可视化的 3D metaspace。

天空视角俯瞰一个属于两个人的小世界，在其中沉淀照片、文字回忆、共同记忆，并实时互动。它不是社交产品，没有多用户、没有 feed 流，就是两个人自己的小世界。

**核心体验：**

- **3D metaspace（天空视角）** — Three.js / React Three Fiber 渲染的两人专属小世界，天空俯视视角。场景模型在 Blender 开发中，**当前阶段用 Canvas 占位**，模型导入后再替换。
- **游戏化 UI（HUD 覆盖层）** — 覆盖在 3D 场景上的游戏化界面，例如左上角 minimap。后续开发。
- **回忆系统（悬浮窗口）** — 通过按钮选单打开悬浮窗，上传/查看 图片、文字回忆、Timeline。**当前开发重点。**
- **实时互动** — 两人实时文字聊天。后续开发。

### 当前阶段策略

**先做 UI，前端骨架优先，数据先用 mock，后端等 UI 成型再接回来。**

1. 主页直接进入带 Canvas 的世界空间——**不需要登录页**。
2. 先开发回忆系统的**三个悬浮窗口**：按钮选单 →（Timeline / 纯文字 / 图片）。
3. 再做实时文字聊天。
4. 游戏化 HUD（minimap 等）、3D 模型导入、场景内交互——放后面。

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
- **3D 渲染**: `@react-three/fiber` + `@react-three/drei`（**尚未安装**，开发 3D 场景时再装）
    - 视角：天空俯视视角（aerial / top-down）
    - 当前用 Canvas 占位，Blender 导出的 GLTF 模型导入后替换为 R3F 场景
- **后端/认证**: Supabase (`@supabase/supabase-js`)
    - 已建好的后端见下方「已建基础设施」，**当前前端先用 mock 数据，暂不接入**
- **包管理器**: pnpm
- **代码格式化**: Prettier

---

## 项目结构

```
src/
├── components/
│   └── ui/               # shadcn/ui 组件（avatar, card, button, textarea, badge, separator, dialog）
├── lib/
│   ├── supabase.ts       # Supabase 客户端初始化
│   └── utils.ts          # cn() 工具函数（clsx + tailwind-merge）
├── pages/                # ⚠️ 待重构：移除登录/配对相关页面，主页直接是世界空间
├── types/
│   ├── index.ts          # 类型定义（EnvName 等）
│   ├── database.ts       # Supabase 数据库类型
│   └── feed.ts           # Feed 相关类型
├── utils/
│   └── index.ts          # getEnv 工具函数
├── App.tsx               # 路由配置（⚠️ 待重构：去掉登录守卫，主页直接进世界空间）
└── main.tsx              # 入口
```

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

> Phase 1 + Phase 2 的 UI 骨架已实现（去登录 + 占位 Canvas 主页 + 悬浮选单 + 三个可拖拽多开悬浮窗口），实现细节见 `ai/Features/world-space-ui.md`。以下为各模块说明。

### 世界空间主页（核心载体）

- 全屏 Canvas，作为 metaspace 的渲染载体
- **当前为占位 Canvas**（纯色/简单绘制即可），Blender 模型导入后替换为 R3F 天空视角场景
- 应用入口即此页面，无登录页、无前厅主页
- 其上覆盖游戏化 HUD（minimap 等，后续）和回忆系统入口（按钮选单）

### 回忆系统 — 三个悬浮窗口（当前开发重点）

一个按钮选单（floating menu），点开后可打开以下三个悬浮窗口（floating panel）之一：

| 窗口        | 功能                                               |
| ----------- | -------------------------------------------------- |
| **Timeline** | 时间轴方式展示两人的回忆记录                        |
| **纯文字**   | 写/看 文字回忆录                                    |
| **图片**     | 上传/查看 两个人的照片                              |

- 三个窗口均为悬浮在 Canvas 之上的面板，可打开/关闭
- 数据先用 mock，后端等 UI 成型再接 Supabase（posts 表 / Storage）

### 实时聊天（后续）

- 两人实时文字聊天
- 计划用 Supabase Realtime broadcast + messages 表持久化

### 游戏化 HUD（后续）

- 左上角 minimap
- 其它游戏化交互选项（待设计）

---

## 已建基础设施（Supabase — 当前前端先 mock，暂不接入）

> 以下后端在转向前已建好，保留为参考。新阶段前端用 mock 数据先行，等 UI 成型后再决定如何接回（couples = 两个人，posts = 回忆）。

```
allowed_emails    # 访问白名单
  - email (text, PK) / note / created_at
  RLS: select 仅自己那行；insert/update/delete 拒绝（仅 Dashboard 管理）

profiles          # 用户资料（扩展 auth.users）
  - id (uuid, FK auth.users) / display_name / avatar_url / created_at
  - [trigger] on_auth_user_created → handle_new_user()：新用户自动填资料
  RLS: select 所有已登录可见；update 仅自己；insert 由 trigger 写入

couples           # 两人关系
  - id / user1_id / user2_id / intimacy_points / created_at
  约束: user1_id < user2_id（唯一）；user1_id <> user2_id（禁自配）
       [trigger] check_couple_uniqueness：每人只能属于一个 couple
  RLS: select/insert/update 仅限自己参与的关系

posts             # 回忆记录
  - id / author_id / couple_id / content / images (text[])
  - privacy (shared|locked|private) / unlock_cost / created_at / updated_at
  - [trigger] set_updated_at、check_post_author_in_couple
  RLS: 自己全可见，对方仅 shared|locked 可见；增删改仅限自己

post_unlocks      # locked post 解锁记录
  - post_id (PK) / user_id (PK) / unlocked_at
  - [trigger] check_post_unlock_validity
  RLS: 仅自己的解锁记录
```

### RPC 函数

```
get_feed_posts(p_couple_id uuid default null)
  # Feed 聚合查询，返回经权限处理的 post 列表
  # 返回 is_unlocked / is_placeholder / visible_content / visible_images 等字段
  # 按 created_at desc 排序
```

---

## Brain Dump / 待探索想法

- 游戏化 HUD：minimap、场景内可点击热点
- 场景天气 / 昼夜系统：随时间或随机变化
- 角色 / 化身：天空视角下两人在世界里的存在形式
- 回忆物品化：post 在 3D 世界里以物品形式呈现（信纸 / 相框 / 小电视）
- 纪念日道具：特殊日子场景出现装饰
- 年度回顾：自动生成「这一年我们的故事」
- AI 卡片生成：发帖时 Claude API 提取关键词，为回忆加描述标签
- 语音消息：聊天支持语音泡泡
- 在一起天数：不在主界面强调，降级到回忆页的小细节