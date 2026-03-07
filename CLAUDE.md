# still-love 项目说明

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **路由**: React Router DOM v7
- **样式**: Tailwind CSS v4（注意：v4 语法与 v3 不同，例如渐变用 `bg-linear-to-br` 而非 `bg-gradient-to-br`）
- **后端/认证**: Supabase (`@supabase/supabase-js`)
- **包管理器**: pnpm
- **代码格式化**: Prettier

## 常用命令

```bash
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm lint       # ESLint 检查
pnpm format     # Prettier 格式化
```

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

## 环境变量

`.env.local` 中配置（不提交到 git）：

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DEV=true   # 开发模式，跳过登录验证
```

## 认证流程

- `App.tsx` 监听 Supabase auth 状态，管理 `session` 和 `loading`
- `ProtectedRoute` 根据 session 决定渲染内容或跳转 `/login`
- `VITE_DEV=true` 时跳过登录验证（devMode）

## 文档

- **[docs/TODO.md](./docs/TODO.md)** — MVP 开发计划与任务进度
- **[docs/PROJECT.md](./docs/PROJECT.md)** — 功能模块设计、数据库结构、Brain Dump

---

## 注意事项

- 路径别名 `@/` 指向 `src/`
- 环境变量通过 `getEnv()` 工具函数读取，缺失时会抛出错误
- 所有 `EnvName` 类型在 `src/types/index.ts` 中维护
