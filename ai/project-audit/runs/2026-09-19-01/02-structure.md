# 第二步：工程结构、模块化与复用

2026-09-19。运行 `2026-09-19-01`，分支 `dev`，基线 `a9f7cfa`（第一步三个 commit 已推送）。授权：用户「推送一下，然后开始第二步」；在授权内落实结构优化、复用与注释精简、全局格式化；全面重构只给方案。

## 结论与完成状态

（交付时填写。）

## 基线、全项目覆盖与限制

| 项 | 值 |
| --- | --- |
| 自有源码 | `src/` 61 + `scripts/` 12 + 根配置 2 = 63 文件（含 `.mjs`/`.py`），12,894 行；扫描器 `scan-structure.mjs`（TypeScript AST） |
| 依赖图 | 63 节点、内部导入边按相对路径与 `@/` 别名解析：**0 循环、0 孤儿、0 未解析**；`lib/` 零 React / 零 themes 依赖 |
| 规模信号 | `pixi-scene.ts` 1168（`buildScene` 782 行）、`screens.tsx` 1094、`chat-data.ts` 728（`useChatThreads` 605）、`channel-screen.tsx` 692、`WorldPage.tsx` 560（组件 465）；34 个 >80 行函数 |
| 扇入/扇出 | 扇入最高 `icons.tsx` 14、`lib/supabase.ts` 12、`types/feed.ts` 10；扇出最高 `WorldPage.tsx` 22 |
| 同体候选 | 3 组：三脚本 `dependency`、`lib/chat` 与 `lib/friends` 的 `currentUserId`、`rooms.ts owLoad` 与 `screens.tsx load`（均已收口） |
| 注释 | 383 个具名声明中 293 个无紧邻注释（候选口径，含匿名回调式声明） |
| 验证基线 | `tsc -b` 1 个既有错误（`chat-card.tsx` `Msg`）；`eslint` 1 错 2 警；`prettier --check .` 192 文件（其中源码 30） |

覆盖方式：四个分区 agent 各自全文阅读本分区全部源码与 CSS，写出 `evidence/*-structure-review.md`（职责/依赖/拆分方案/复用/注释审计/失效引用/死样式）；审核汇总并直接执行跨分区复用项。图片/二进制不在本步范围。限制：无测试，等价性靠 tsc、AST 去注释同一性、构建 CSS 选择器集合 diff 与人工冒烟。

## 本步骤调研与适配结论

| 查询 | 检索日期 | 来源标题和 URL | 来源版本 | 可核验的结论 | 适用前提 | 本项目证据 | 采纳/不采纳及理由 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TypeScript 注释规范 | 2026-09-19 | [Google TypeScript Style Guide · Comments and documentation](https://google.github.io/styleguide/tsguide.html) | 当前 | JSDoc 给使用者读，`//` 给实现者读；文件可有 `@fileoverview`；不写重复类型签名的 @param | 通用 | 项目注释为英文 `//` 风格，293 个声明无紧邻注释，多处头注为实施流水 | 采纳方法（职责一句话 + 条件/副作用），不强推 JSDoc 标签；写入 `CONVENTIONS.md` |
| Prettier ignore 语义 | 2026-09-19 | [Prettier · Ignoring Code](https://prettier.io/docs/ignore) | 当前 | `.prettierignore` 用 gitignore 语法；默认忽略 `node_modules` 与 VCS 目录，并遵循同目录 `.gitignore` | Prettier 3 | 项目无 `.prettierignore`，`--check .` 192 文件里 162 个是文档/证据/协议 | 采纳：新建 `.prettierignore`，把 192 收敛到源码与活文档 |
| Fast Refresh 导出约束 | 2026-09-19 | [eslint-plugin-react-refresh README](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) | 当前 | 组件文件混导出非组件会破坏 Fast Refresh；推荐拆文件，或 `allowConstantExport` | Vite + React | `music.tsx` 同时导出 `TRACKS`；`profile.ts:1-2` 已为同规则立过拆文件先例 | 采纳拆文件（`music-tracks.ts`），不开 `allowConstantExport` 以免前后不一 |
| Vite 依赖预构建 | 2026-09-19 | [Vite · Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling) | 站点 v8.3.0（项目 7.3.1，语义一致） | `optimizeDeps.include` 用于扫描发现不到的依赖 | Vite | `include: ['@react-three/rapier']` 与 drei 注释是 three 退役残留，src 零引用 | 采纳：删依赖与整段配置，`pnpm install` 后构建通过 |

## 已讨论方案、授权和取舍

（交付时填写：A 类执行、B 类方案与用户决定。）

## 发现与证据

分区 review：[room](evidence/room-structure-review.md)、[journal/screens](evidence/journal-screens-structure-review.md)、[chat](evidence/chat-structure-review.md)、[shell/config](evidence/shell-structure-review.md)；落实日志 `evidence/*-apply-log.md`。

## 已执行改动

（交付时填写。）

## 验证

（交付时填写。）

## 建议、待办和下一步

（交付时填写。）
