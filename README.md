# 我们的小世界 · Our World

双人「放置陪伴小屋」网页：固定镜头的手绘书房里，两只长耳小狗代表一对情侣各自忙碌，窗外光照随真实时间流转，回忆（日记 / 照片墙 / 聊天）藏在房间的家具里。

- 产品定位、技术事实与数据库结构：[ai/PROJECT.md](ai/PROJECT.md)
- 任务唯一来源：[ai/TODO.md](ai/TODO.md)
- 当前设计系统：[ai/design_system/design-system.md](ai/design_system/design-system.md)
- AI 协作：协议入库副本 [ai/jaAgents/](ai/jaAgents/)，技能正本 [ai/jaSkills/](ai/jaSkills/)，专属技能登记 [ai/JASKILL.md](ai/JASKILL.md)，开工红线见 PROJECT「开工红线」

## 技术栈

React 19 + TypeScript + Vite 7 + React Router 7；场景层 PixiJS 8（`src/themes/cinnaglass/room/`）；后端 Supabase（auth / Postgres / Storage / Realtime）。包管理 pnpm，格式化 Prettier，ESLint 9 flat config。

## 本地运行

```bash
pnpm install
cp .env.example .env.local   # 填 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY；开发开关见文件内注释
pnpm dev                     # http://localhost:5173
```

| 命令                                   | 作用                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev2`               | 开发服务器（5173 / 5174，双实例双账号联调）                    |
| `pnpm build`                           | `tsc -b && vite build`（当前受既有类型错误阻断，见 TODO Bugs） |
| `pnpm lint`                            | ESLint                                                         |
| `pnpm format`                          | Prettier 全仓格式化                                            |
| `node scripts/check-design-system.mjs` | 校验设计系统 Markdown/HTML 的链接与图文（零依赖）              |

`VITE_*` 变量会打进浏览器代码，不要放 `service_role` 密钥。`.env.local` 不入库。

## AI 协作配置

`CLAUDE.md` / `AGENTS.md` 与 `.claude/` `.agents/` `.codex/` **有意不进 git**（个人化；真源在货架 shelf，入库副本在 `ai/jaAgents/`）。技能本体进 git，唯一正本 `ai/jaSkills/`，三个 agent 的技能目录只是指向它的链接。新检出或新 worktree：

```bash
shelf init --agents claude,codex                            # 有 shelf：还原协议 + 链接 + 账本（幂等）
bash ai/jaSkills/custom-skill/scripts/sync-worktree.sh      # 没有 shelf：用 ai/jaAgents/ 副本兜底
```

桌面版 Claude Code / Codex 新建 worktree 时按 `.worktreeinclude` 复制两份协议。通用技能名册在协议「Skill 系统」节，本项目专属技能在 `ai/JASKILL.md`；改技能改 `ai/jaSkills/<名>/` 再 `shelf push`。

## 目录

| 目录               | 内容                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `src/`             | 应用源码：`pages/` 路由页、`lib/` Supabase 数据层、`themes/cinnaglass/` UI 主题与 Pixi 房间 |
| `public/`          | 运行时静态资源（房间底图与部件、角色、UI 贴图、字体）                                       |
| `arts/`            | 原画真源、生成派生层与打包前素材                                                            |
| `scripts/`         | 素材装配/打包与人工验证脚本（依赖与用法见各脚本头注释）                                     |
| `ai/`              | 项目文档、设计系统、功能文档、审核记录                                                      |
| `ai/codex-visual/` | `codex-visual` 技能产出的比稿/审核原始归档（12 个批次）                                     |
| `sql/`             | 两份早期 Supabase 脚本；线上 schema 变更历史不在仓库                                        |
