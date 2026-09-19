# CONVENTIONS — 结构与代码规范（审核第二步整理）

项目此前只有 `.prettierrc`（4 空格 / 120 列 / 单引号 / 无尾逗号）与 `eslint.config.js`，没有目录、依赖方向和注释的书面约定。下面按**现状观察**整理，标明「已采纳（现状即如此）」与「待讨论（本轮建议，未强制）」；`AGENTS.md` 的文档规则仍是权威，本文不复述。

## 分层与依赖方向（已采纳：现状无环、无反向依赖）

```
index.html → src/main.tsx → App.tsx（路由）
  pages/          页面与路由守卫（PascalCase 文件）
    ↓ 只向下
  themes/cinnaglass/   UI 主题：组件、Pixi 房间（room/）、悬浮壳层（shell/）、日记族（journal-*）、聊天族
    ↓ 只向下
  hooks/  lib/  types/  utils/   数据访问与纯逻辑：lib/* 零 React、零 themes 依赖
```

- `lib/*` 只依赖 `@/lib/supabase` 与 `@/types/*`，抛错不打日志（调用方决定提示）。
- `types/*.ts` 一个类型对应一张表或一条契约（`feed.ts`、`chat.ts`）；视图模型（如聊天的 `Msg`/`Conv`）留在主题层，不下沉。
- 待讨论：`chat-data.ts` 从 UI 组件导入 `EmoteView` 是唯一的「数据 → UI」逆向边，建议把该类型移到数据层。

## 目录与命名（已采纳：各目录内部一致；跨目录不统一属历史）

| 位置 | 文件名 | 说明 |
| --- | --- | --- |
| `src/pages/` | PascalCase（`LoginPage.tsx` + `.module.css`） | 页面组件 |
| `src/hooks/` | camelCase（`useAuth.ts`） | React hook |
| `src/lib/ types/ utils/` | 小写单词 | 数据层与类型 |
| `src/themes/cinnaglass/**` | kebab-case | 组件、引擎、CSS；`room/`、`shell/` 已分子目录 |
| `ai/` 新目录 | kebab-case | 历史遗留 `design_system` 不改 |

- 待讨论：`journal-*`（7 文件）与聊天族（5 文件）平铺在主题根，可各建子目录；两个校验脚本硬编码了 `/src/themes/cinnaglass/*.ts` 模块 URL，移动时须同步。
- 待讨论：import 路径写法（`@/lib/x.ts` 带扩展名 vs `./x` 不带）69 处不统一，建议统一为 `@/…` 无扩展名，随大改动一起做，不单独刷。

## 复用与拆分原则（已采纳）

- 同一语义只留一个实现：localStorage 读写在 `lib/local-store.ts`；当前用户 id 在 `lib/supabase.ts` 的 `currentUserId()`；签名续签周期由 `lib/storage.ts` 的 `SIGNED_URL_REFRESH_MS` 派生自 TTL。
- 外形相似但变化原因不同的不抽象：设置词汇 `WeatherTweak`（含 `auto`）≠ 合成器能力 `RoomWeather`；登录页 SVG 背景 ≠ Pixi 房间；`Room`（侧栏 mock）≠ `RoomTemplate`（美术契约）。
- 大文件是调查信号不是禁令：`pixi-scene.ts` 1168 行 / `screens.tsx` 1094 行 / `chat-data.ts` 728 行 / `WorldPage.tsx` 560 行 的拆分方案见第二步报告与分区 review，按职责与变化原因拆，不拆成 build/update/dispose 三件套式碎片；每批独立提交并附等价验证。
- 图标库（`icons.tsx`）允许保留零消费者导出，删了下次要重画；其它零消费者导出、字段、样式随审核删除。

## 注释（已采纳：英文，说人话）

- 每个具名函数/方法/组件/导出常量前一句话说清职责；条件与副作用必须写；工具函数一句话，复杂函数最多 3–4 句。
- 模块头可多行：说明文件负责什么、关键约束、功能文档路径（`// Feature doc: ai/features/...`）；不写实施流水与已退役方案。
- 不写复述函数名或色值的注释；引用文档用现路径（`ai/design_system/...`、`ai/features/...`、`ai/codex-visual/<批次>/codex-report.md`），不用已成桩的 `ai/UX.md §N`。
- 保留：许可证/归属、生成标记、工具指令（`eslint-disable`、`prettier-ignore`）。

## 格式化（已采纳）

- `.prettierignore` 排除依赖/锁文件、受保护协议与技能目录、冻结原件（`ai/reboot`、`ai/codex-visual`、`cinnaglass-history`、`ai/sessions`）、审核证据 `ai/project-audit/runs`、`*.diff`、素材树 `arts/`、`public/`。
- 其余文件按 `.prettierrc` 全项目格式化；`pnpm format` 即全仓 `prettier --write .`，`pnpm exec prettier --check .` 应为零。

## 工具脚本（已采纳）

- `scripts/*.mjs` 的浏览器/图像依赖（playwright、sharp、pngjs）**不进** `package.json`；统一经 `scripts/lib/deps.mjs` 的 `dependency()` 解析，`DIARY_NODE_MODULES` 指向含这些包的 node_modules；dev 服务地址用 `JOURNAL_URL`，默认 `http://localhost:5173`。
- `scripts/*.py` 依赖 Pillow / numpy / opencv，需自备 Python 环境（待讨论：是否加 `requirements.txt`）。
