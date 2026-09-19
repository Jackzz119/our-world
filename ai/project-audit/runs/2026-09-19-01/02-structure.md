# 第二步：工程结构、模块化与复用

2026-09-19。运行 `2026-09-19-01`，分支 `dev`，基线 `a9f7cfa`（第一步已推送）。授权：用户「推送一下，然后开始第二步」；在授权内落实结构优化、复用与注释精简、全局格式化；全面重构只给方案。

## 结论与完成状态

**第二步已交付**（4 个本地 commit：`dc74f51` 复用与配置、`f3a0ad0` 注释/引用/死样式、`e656ac9` Prettier、`eba7dd2` 删 `rooms.ts` 并同步文档）。全部自有源码与配置 83 项均经分区全文审阅 + AST 结构扫描 + 审核复核（[coverage.csv](coverage.csv)）。

| 指标 | 前 → 后 |
| --- | --- |
| `tsc -b` | 1 既有错误 → **0** |
| `eslint .` | 1 错 2 警 → 0 错 1 警（既有，见 PA-016） |
| `vite build` | 通过 → 通过 |
| `prettier --check .` | 192 文件 → 0（新建 `.prettierignore`） |
| AST 同体函数候选 | 3 组 → 0 |
| 无紧邻注释的具名声明 | 293 → 155 |
| 循环依赖 / 孤儿 / 未解析导入 | 0 / 0 / 0 → 0 / 0 / 0 |
| 源码总行数 | 12,894 → 14,157（注释补齐 + Prettier 换行；同时删死代码/死样式约 400 行） |

大文件拆分（`pixi-scene.ts`、`screens.tsx`、`chat-data.ts`、`channel-screen.tsx`、`WorldPage.tsx`）与纪念日真源修复属需批准的重构，方案见 [FINDINGS](../../FINDINGS.md) PA-028～033，本轮未执行。运行时浏览器冒烟未做（需 Supabase 会话），等价性依据是 tsc、AST 校验、构建 CSS 选择器 diff 与构建通过。

## 基线、全项目覆盖与限制

| 项 | 值 |
| --- | --- |
| 自有源码 | `src/` 61 + `scripts/` 12 + 根配置 = 63 文件 12,894 行；扫描器 [`scan-structure.mjs`](../../scripts/scan-structure.mjs)（TypeScript AST：规模/导入图/扇入扇出/环/长函数/同体候选/注释） |
| 依赖图 | 0 循环、0 孤儿、0 未解析；`lib/` 零 React、零 themes 依赖；唯一逆向边 `chat-data.ts` → UI 的 `EmoteView` 类型（PA-030） |
| 规模信号 | `pixi-scene.ts` 1168（`buildScene` 782）、`screens.tsx` 1094、`chat-data.ts` 728（`useChatThreads` 605）、`channel-screen.tsx` 692、`WorldPage.tsx` 560；34 个 >80 行函数（前后不变，拆分未执行） |
| 覆盖方式 | 四个分区 agent 全文读本分区源码与 CSS → `evidence/*-structure-review.md`；审核执行跨分区复用后，四个 agent 各自只改本分区文件 → `evidence/*-apply-log.md`；审核以 `verify-comment-only.mjs`（[脚本](../../scripts/verify-comment-only.mjs)）与 diff 复核 |
| 限制 | 无测试；未启动 dev server 做冒烟；Python 脚本未运行；图片/二进制不在本步 |

## 本步骤调研与适配结论

| 查询 | 检索日期 | 来源标题和 URL | 来源版本 | 可核验的结论 | 适用前提 | 本项目证据 | 采纳/不采纳及理由 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TypeScript 注释规范 | 2026-09-19 | [Google TypeScript Style Guide · Comments and documentation](https://google.github.io/styleguide/tsguide.html) | 当前 | JSDoc 给使用者读，`//` 给实现者读；文件可有 `@fileoverview`；不写重复类型签名的 @param | 通用 | 注释为英文 `//` 风格，293 个声明无紧邻注释，多处头注为实施流水 | 采纳方法（职责一句话 + 条件/副作用），不强推 JSDoc 标签；写入 `CONVENTIONS.md` |
| Prettier ignore 语义 | 2026-09-19 | [Prettier · Ignoring Code](https://prettier.io/docs/ignore) | 当前 | `.prettierignore` 用 gitignore 语法；默认忽略 `node_modules` 与 VCS 目录并遵循 `.gitignore` | Prettier 3 | 无 `.prettierignore`，`--check .` 192 文件里 162 个是文档/证据/协议 | 采纳：新建 `.prettierignore` |
| Fast Refresh 导出约束 | 2026-09-19 | [eslint-plugin-react-refresh README](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) | 当前 | 组件文件混导出非组件会破坏 Fast Refresh；推荐拆文件，或 `allowConstantExport` | Vite + React | `music.tsx` 同时导出 `TRACKS`；`profile.ts` 已为同规则立过拆文件先例 | 采纳拆文件（`music-tracks.ts`），不开 `allowConstantExport` |
| Vite 依赖预构建 | 2026-09-19 | [Vite · Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling) | 站点 v8.3.0（项目 7.3.1，语义一致） | `optimizeDeps.include` 用于扫描发现不到的依赖 | Vite | `include: ['@react-three/rapier']` 与 drei 注释是 three 退役残留 | 采纳：删依赖与整段配置，构建通过 |

## 已讨论方案、授权和取舍

- **A / B 分界**：零或极小行为面的项（注释、失效引用、死样式、同语义复用、死导出/依赖、格式化）在授权内直接做；改公开接口、改行为、大范围移动或需逐像素验收的项只给方案（FINDINGS PA-028～033）。
- **两处刻意超出「零行为」的修复，已单独点出**：① `chat-card.tsx` 的 `Msg` 导入修复顺带把 `stickerUrl` 改为 `emoteUrl`——此前该字段运行时恒为 undefined，窄卡渲染不出贴纸，修后会显示贴纸图片（修 bug）；② `music.tsx` 拆出 `music-tracks.ts` 仅为满足 Fast Refresh 规则，运行行为不变。
- **不为凑指标删东西**：`.tl` 选择器被审阅报告判为死样式，执行时发现 `journal-layout.ts` 生成的照片纸角 class 同名命中，保留并注释；`icons.tsx` 的 15 个零消费者图标只标注不删；`room-scene.tsx` 的 eslint-disable 指令保留（删掉会触发 react-hooks 新规则错误）。
- **不承接 `profile.ts` 日期函数删除**：它们是纪念日单一真源方案（PA-032）要复用的正确实现。
- **注释语言**：源码既有注释为英文，项目协议未规定代码注释语言，本轮沿用英文；文档仍为中文。
- **规范文件**：项目没有代码结构规范，按技能约定建 [`CONVENTIONS.md`](../../CONVENTIONS.md)，只写现状与待讨论项，不复述 `AGENTS.md`。

## 发现与证据

分区 review：[room](evidence/room-structure-review.md)、[journal/screens](evidence/journal-screens-structure-review.md)、[chat](evidence/chat-structure-review.md)、[shell/config](evidence/shell-structure-review.md)；落实日志 `evidence/*-apply-log.md`；结构指标 [前](metrics/structure-summary.json) / [后](metrics/after/structure-summary.json)；注释同一性 [comment-only-check.json](metrics/comment-only-check.json)。发现按 ID 见 [FINDINGS](../../FINDINGS.md) PA-023～033。

## 已执行改动（路径与原因；实现见各 commit）

- **`dc74f51` 复用与配置**：`src/lib/local-store.ts`（新）收口 4 份 localStorage 读写；`lib/supabase.ts` 新增 `currentUserId()`，`lib/{chat,friends,worlds,posts,emotes}.ts` 改用；`lib/storage.ts` 导出 `SIGNED_URL_REFRESH_MS`、删死参数；`journal-layout.ts` 新增 `applyThumbUrls` 供 `journal-turn.ts`、`journal-room-book.tsx` 复用；`tweaks.ts` `Mood` = `RoomMood`、删 `hudLayout/density`；删 `moodFromHour`、`WidgetPos`；`shell/chat-card.tsx` `Msg`/`emoteUrl` 修复；`types/chat.ts` 删幻列、`chat-data.ts` 类型对齐；`music-tracks.ts`（新）；`vite.config.ts`/`package.json` 删 three 残留；`.prettierignore`（新）；`tsconfig.node.json` 注释；`pages/LoginPage.tsx` 导出 `Msg` 供重置页复用；`shell/rail.tsx` + `navigation-glass.css` 删 `.rooms-tip` 死对；`scripts/lib/deps.mjs`（新）与 8 个脚本统一依赖解析与端口。
- **`f3a0ad0` 注释/引用/死样式**：49 个 ts/tsx/mjs 文件注释按四份审阅表落地（44 个仅注释）；`room-scene.tsx` 类型收拢；`screens.tsx` `ScreenStyles` 删 31 条时间线选择器；`diary.css` 删 11 块 + 5 变量；`journal-room.css` 删 2 变量；`cinnaglass.css` 删侧栏/浮动动画等死块（987 → 913 行）；`CONVENTIONS.md`、`verify-comment-only.mjs`（新）。
- **`e656ac9` Prettier**：74 文件格式化，受保护/冻结路径零改动。
- **`eba7dd2`**：删 `rooms.ts` 与 `Room` 类型；`ai/PROJECT.md` 结构树、`ai/TODO.md` Bugs 与退役清理同步。

## 验证

| 检查 | 结果 |
| --- | --- |
| `pnpm exec tsc -b` | 每个 commit 后 0 错误（基线 1） |
| `pnpm exec eslint .` | 0 错 1 警（`room-scene.tsx` 既有 disable 指令，见 PA-016） |
| `pnpm exec vite build` | 每个 commit 后通过 |
| `pnpm exec prettier --check .` | 0 |
| `verify-comment-only.mjs --revision dc74f51`（Prettier 前） | 49 文件：44 comment-only；5 code-changed 逐一核对（`room-scene.tsx` 类型、`screens.tsx` 样式字符串、3 个模板字符串内 CSS 注释） |
| 构建 CSS 选择器集合 diff | journal 分区 372 → 362，差集恰为所删 10 个唯一选择器；shell 分区差集与所删选择器逐条对应 |
| `scan-structure.mjs` 前后 | 同体候选 3 → 0；无注释声明 293 → 155；0 环 |
| `node scripts/check-design-system.mjs` | 57 文档 387 链接 0 失败 |
| 未验证 | 浏览器运行冒烟（贴纸显示、弹窗开关、日记翻页）；Python 装配脚本；性能（第四步） |

## 用户批准后的重构执行（2026-09-19，第二阶段交付）

用户批准全部 B 类方案后分三阶段执行（详见 [FINDINGS](../../FINDINGS.md) PA-028～033 与 `evidence/*-refactor-log.md`）：

| 阶段 | 内容 | commit | 关键等价证据 |
| --- | --- | --- | --- |
| 1 | room：`buildScene` 拆九模块（1311 → 273 行）；surfaces：`screens.tsx` 拆八模块（1061 → 211）+ `diary.css` 扁平化；chat：`useChatThreads` 拆六 hook（797 → 189）+ `ChannelScreen` 拆五组件（764 → 215）；`scene.tsx` → `login-backdrop.tsx` | `e674a96` | 10 组冻结帧 PNG 逐字节相同；315 节点 × 4 断点计算样式 dump 差异 0；58 条纯函数断言；WorldPage 返回面 25 字段 diff 为空 |
| 2 | `WorldPage` 615 → 361（五个 hook + 两个 shell 模块）；纪念日单一真源（修 bug：改设置后日历不更新、当天倒数显示 365）；`.cg-panel` 原子类；reset 归 `index.css`；`Weather.kind` 联合类型；import 统一 `@/` | `ff96938` | 99×56034、30×16980 属性差异 0；tsc 全查越界 |
| 3 | 归位 `journal/`、`surfaces/`、`chat/`；`pixi-scene.ts` → `room/compositor.ts`、`channel-screen.tsx` → `chat/chat-hub.tsx`；33 个文件移动、25 个文件 import 重写、23 份文档与 2 个脚本的路径同步 | 见本 commit | tsc 0 错、eslint 1 既有警告、build 通过、0 环、设计系统链接 387/0 失败 |

**行为变化（刻意，已单独说明）**：① 纪念日与在一起天数只读 `world.anniversary`，「在一起 N 天」按纪念日当天为第 1 天计（整体 +1）；② 拆小后 react-hooks v7 编译器规则新暴露的 setState-in-effect，三处改为 render 期派生（结果相同），一处带理由 disable。**未验证**：真实进出世界、Enter 快捷键、Pixi 家具点击回调链在真实会话下的表现（无 `.env.local`）。最终结构指标：99 个源文件、14,928 行、0 环、同体候选 0、无注释声明 173（拆分新增匿名回调式声明）。

## 建议、待办和下一步

1. **需要你批准的重构**（FINDINGS PA-028～033）：五个大文件的拆分方案、纪念日单一真源修复（含现存 bug）、`diary.css` 扁平化（日记冻结中）、子目录归位、其余低收益项。批准哪几项我就按方案分批提交。
2. **第三步**（协议、后端与前端深度 review）待指令：将承接 `ReactionRow` 幻列对应的线上 DDL 核对、`world-settings` 无入口、`savePw` 假成功、`WorldPage` 未传 `anniv`、render 期改 ref 的 react-hooks 规则等行为议题。
3. 低优先：`check:design` npm script、脚本登记表、`requirements.txt`。
