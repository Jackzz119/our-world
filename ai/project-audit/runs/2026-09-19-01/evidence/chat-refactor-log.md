# 聊天分区重构执行记录（PA-030 / B1 + B2 + B4 + A7）

> 项目 our-world · 分支 `dev` · 起始 HEAD `596d5ea` · 执行日 2026-09-19
> 方案来源：`ai/project-audit/runs/2026-09-19-01/evidence/chat-structure-review.md` §3.1（B1）、§3.2（B2）、§7.1（B4）、§4.2（A7）
> 范围：`src/themes/cinnaglass/` 下的聊天模块 + `emote-picker.tsx` 一处类型导入。**未提交、未跑 prettier。**
> 未做（本轮明确排除，留给后续统一阶段）：B3（`chat/` 子目录归位）、B5（`channel-screen.tsx` → `chat-hub.tsx` 改名）。

---

## 1. 新旧对照表

### 1.1 B1 — `useChatThreads` 拆分（`chat-data.ts` 797 行 → 7 文件）

| 新文件 | 行 | 承接原 `chat-data.ts` 的哪一块 | §3.1 里的代号 |
|---|---|---|---|
| `chat-store.ts` | 182 | 全部视图模型类型（`Msg`/`MsgReaction`/`Conv`/`FriendEntry`/`FriendRequest`/`EmoteView`）+ `colorFor`/`convsFor`/`fmtTime`/`errMsg`/`mergeRows`/`rxKey`/`otherOf`/`toMsgs` + A7 的 `upsertReactions`/`without`/`dropMessageEverywhere` | `chat-store.ts`（f 的可测部分） |
| `use-message-store.ts` | 188 | 7 个 state + 5 个镜像 ref + `startVanish` + `absorb` + `handleEvent`（原 `onEvent`）+ `loadOlder` | `use-message-store.ts`（d） |
| `use-world-stream.ts` | 74 | world effect（`channels` + 首屏页 + 全员已读 + `subscribeWorld` + 重连补拉） | `use-world-stream.ts`（a） |
| `use-account-stream.ts` | 95 | account effect（好友关系 + DM 频道 + 好友 profile + `subscribeUser` + 重连补拉） | `use-account-stream.ts`（b） |
| `use-emote-library.ts` | 95 | `emotes`/`emoteUrls` + `emotesById`/`emoteViews` + 40 分钟续签定时器 + 4 个贴纸动作 | `use-emote-library.ts`（c） |
| `use-optimistic-send.ts` | 235 | `deliver`/`appendLocal`/`send`/`sendStickerTo`/`retrySend`/`discardFailed`/`editMessage`/`deleteMsg`/`toggleReaction`/`markRead` | `use-optimistic-send.ts`（e） |
| `chat-data.ts`（保留） | 189 | 门面：组合上面 5 个 hook + 6 个投影 memo + 3 个好友动作 + 原样 re-export | §3.1 的 `use-chat-threads.ts` |

**与 §3.1 的两处有意偏差**

1. **门面仍叫 `chat-data.ts`**，没有另建 `use-chat-threads.ts`。任务边界要求 `chat-data.ts` 的路径与对外导出不变、`WorldPage` 的 import 不许动；再加一层只做 re-export 的壳会白白多一个文件。改名与 `chat/` 归位由后续统一阶段做。
2. **`reloadAccountRef` / `reloadEmotesRef` 由门面 `useRef` 创建后**作为参数**传下去**，而不是由子 hook 创建再返回。原因是顺序死锁：`useMessageStore` 的事件处理器要在 `useEmoteLibrary` / `useAccountStream` 之前就拿到这两个 ref。ref 对象本身恒定，所以 `handleEvent` 的依赖面（`[startVanish, reloadAccountRef, reloadEmotesRef]`）仍然全是稳定引用，与拆分前的 `[startVanish]` 等价。

### 1.2 B2 — `ChannelScreen` 拆分（`channel-screen.tsx` 764 行 → 6 文件）

| 新文件 | 行 | 承接内容 |
|---|---|---|
| `channel-screen.styles.tsx` | 155 | `ChannelStyles`（148 行 CSS 字符串），仍是内联 `<style>`，仍是 fragment 的第一个子节点 |
| `bubble-dust.ts` | 74 | `VANISH_COLORS` + `explodeBubble`（canvas 粒子引擎，零 React） |
| `chat-composer.tsx` | 105 | `ChatComposer`：输入行 + 草稿 state + caret 插入 emoji + composer 侧 `EmotePicker` |
| `conv-nav.tsx` | 67 | `ConvNav`：左栏会话切换（好友入口 + 文字频道 + 私信） |
| `message-list.tsx` | 332 | `MessageList`：消息流、hover 操作条、行内编辑、reaction、失败行、已读头像、粉尘 canvas、滚动/锚点/粒子 3 个 effect |
| `channel-screen.tsx`（保留） | 215 | 壳层：解析 `convId` → 频道 / DM / 好友页，scrim + 容器 + header + 好友页分支 + `onSeen` effect |

### 1.3 B4 — `EmoteView` 归位

| 位置 | 改前 | 改后 |
|---|---|---|
| 定义处 | `emote-picker.tsx:17`（UI 组件） | `chat-store.ts`（数据层，与 `Msg`/`Conv` 同处） |
| `chat-data.ts` | `import type { EmoteView } from './emote-picker'`（**数据层 → UI 的逆向边**） | 逆向边删除；改为 `export type { EmoteView } from './chat-store'` |
| `emote-picker.tsx` | 自己定义 | `import type { EmoteView } from './chat-data'`（方向 UI → 数据，正确） |
| `channel-screen.tsx` | `import { EmotePicker, type EmoteView } from './emote-picker'` | `EmoteView` 并入已有的 `./chat-data` 导入 |

`structure-edges.json` 复查：`chat-data.ts` 的出边里已无 `./emote-picker`。

### 1.4 A7 — 三个纯函数复用

| # | 函数 | 替换掉的内联片段 | 行数变化 |
|---|---|---|---|
| 1 | `upsertReactions(prev, rows, remove?)` | `absorb`、`handleEvent`（message_reactions 分支）、`loadOlder` 共 3 处 | 3 处 × 6–8 行 → 3 处 × 1 行 |
| 2 | `without(set, id)` | `startVanish`、`handleEvent`（INSERT 确认）、`deliver` 起手、`deliver.catch`、`discardFailed` 共 5 处 | 5 处 × 5 行 → 5 处 × 1 行 |
| 3 | `dropMessageEverywhere(map, id)` | `startVanish`、`discardFailed` 共 2 处 | 2 处 × 5 行 → 2 处 × 1 行 |

**一处语义收敛（已断言验证）**：原来 5 处删 Set 元素里，3 处带「不在就返回原引用」的守卫、2 处（`deliver.catch`、`discardFailed`）不带，每次都新建 Set。统一后全部带守卫。**内容完全相同**，唯一差别是「id 不存在时返回同一个 Set 引用」，效果是少触发一次无意义的重渲染，不改变任何可见行为。断言脚本对两种旧形态分别比对过。

### 1.5 对外契约

| 检查 | 结果 |
|---|---|
| `useChatThreads` 返回面 | **25 个字段逐字不变**（`git show 596d5ea:` 的 `return {…}` 块与当前逐行 diff 为空） |
| `chat-data.ts` 对外导出 | 旧 9 项全部保留（`FRIENDS_VIEW`/`MsgReaction`/`Msg`/`colorFor`/`Conv`/`convsFor`/`FriendEntry`/`FriendRequest`/`useChatThreads`），新增 `EmoteView`（B4） |
| `channel-screen.tsx` 对外导出 | `ChannelScreen` 一项，props 类型逐字不变 |
| `WorldPage.tsx` | **零改动**（`git status` 未列出） |
| `shell/chat-card.tsx`、`friends-page.tsx`、`emoji-data.ts`、`src/types/chat.ts`、`src/lib/{chat,friends,emotes}.ts` | **零改动** |

### 1.6 Logman 标签（触发 `logman` skill 确认）

功能域仍是 `chat`、运行时仍是 `web`，只按文件名换模块名，`ai/PROJECT.md` 的功能域标签池无需变动：

`[chat][web][chat-data]`（保留）、`[chat][web][use-message-store]`、`[chat][web][use-world-stream]`、`[chat][web][use-account-stream]`、`[chat][web][use-emote-library]`、`[chat][web][use-optimistic-send]`。

`chat-store.ts` / `bubble-dust.ts` / 4 个 UI 组件不打 log，不设 TAG。

---

## 2. 每批改动与门禁结果

每批的门禁都是 `pnpm exec tsc -b` → `pnpm exec eslint <改动文件>` → `pnpm exec vite build`（成功后 `rm -rf dist`）。

| 批 | 内容 | tsc | eslint | vite build | 备注 |
|---|---|---|---|---|---|
| 基线 | `596d5ea` 原样 | ✅ 0 错 | ✅ 0 错 | ✅ | `scan-structure`：0 环 / 0 未解析 / 0 孤儿 |
| B1-1 | 抽 `chat-store.ts`（纯函数 + 类型 + A7 三函数）；同批做 B4 | ✅ | ✅ | ✅ | 另跑 node 断言 58 条全过 |
| B1-2 | 抽 `use-emote-library.ts` | ✅ | ✅ | ✅ | 见 §4「意外发现」 |
| B1-3 | 抽 `use-optimistic-send.ts` | ✅ | ✅ | ✅ | — |
| B1-4 | 抽 `use-message-store.ts` + `use-world-stream.ts` + `use-account-stream.ts`，`chat-data.ts` 收口为门面 | ✅ | ✅ | ✅ | 风险最高的一批 |
| B1-5 | 契约校验（返回面 diff、导出面 diff、`WorldPage` 未动）+ 结构扫描 | ✅ | ✅ | ✅ | 0 环 / 0 未解析 |
| B2-1 | 抽 `channel-screen.styles.tsx` | ✅ | ✅ | ✅ | 仍是 `.tsx` 内联 `<style>`，未改成 `.css` |
| B2-2 | 抽 `bubble-dust.ts` | ✅ | ✅ | ✅ | `bubbleEls` ref 按方案留在消息流侧 |
| B2-3 | 抽 `chat-composer.tsx` | ✅ | ✅ | ✅ | 见 §3「props 与 §3.2 的差异」 |
| B2-4 | 抽 `conv-nav.tsx` | ✅ | ✅ | ✅ | — |
| B2-5 | 抽 `message-list.tsx`（含 key-reset 改造） | ✅ | ✅ | ✅ | 见 §3 |
| 终检 | 全部 13 个聊天文件一起过一遍 | ✅ | ✅ | ✅ | `scan-structure`：0 环 / 0 未解析 / 0 孤儿；断言 58 条复跑全过 |

---

## 3. §3.1 / §3.2 风险表逐项缓解

### 3.1 风险表

| 风险 | 缓解措施 | 验证 |
|---|---|---|
| **重复订阅 / 订阅抖动（高）** | 两个 effect 的依赖数组从 `[worldId, onEvent, absorb]` / `[uid, onEvent, absorb]` 变成 `[worldId, handleEvent, absorb]` / `[uid, handleEvent, absorb, reloadRef]` —— 新增的 `reloadRef` 是门面的 `useRef` 对象，**永不变**。`handleEvent` 的 `useCallback` 依赖是 `[startVanish, reloadAccountRef, reloadEmotesRef]`，三项全稳定（`startVanish` 依赖 `[]`），`absorb` 依赖 `[]`。订阅身份与拆分前一一对应。 | tsc + build 通过；**`SUBSCRIBED` 次数对账未做**，见 §5 |
| **状态撕裂（中）** | `absorb` 整体搬进 `use-message-store.ts`，仍是单函数单模块、4 个 setState 连续同步调用、中间无 `await`，React 自动批处理仍把它们合成一次提交。文件头写明了这条不可拆的理由。 | 代码结构检查 |
| **ref 渲染期赋值时序（中）** | `allChanRef.current = [...channels, ...dmChannels]` 仍在**渲染期**赋值，且位置改到「两个 stream hook 都调用完之后、`useOptimisticSend` 之前」，顺序与语义不变。`uidRef` 同样保持渲染期赋值。5 个镜像 ref 随 `useMessageStore` 整体搬走，仍是渲染期赋值。**没有改成 effect 同步**——那会让 `markRead`（由子组件的 effect 调用，子 effect 先于父 effect 执行）读到落后一帧的值。 | tsc；两个文件里都写了这条注释 |
| **`cancelled` / `everSubscribed` 闭包（中）** | 两个 effect 各自整体搬进独立 hook，`load` 仍定义在 effect 内部，`cancelled` / `everSubscribed` 仍是 effect 的局部变量。`reloadRef.current` 仍在 effect 内赋值、在 cleanup 里置 null，所以 reload 闭包永远绑着当前这次 effect 的 `cancelled`。 | 逐行对照原实现 |
| **文档同步（低但必然）** | `ai/features/chat.md:63` 的模块表还写着「`chat-data.ts` — `useChatThreads`（消息、乐观态、reaction、已读、贴纸、好友）」，**本轮未改**，见 §5 未验证项。 | — |

### 3.2 风险表

| 风险 | 处理 |
|---|---|
| 批 1 CSS 层叠顺序 | 只搬到 `.tsx`，保持内联 `<style>`。`<ChannelStyles />` 仍是 return fragment 的**第一个**子节点，排在 `.chsc-scrim` / `.chsc` 之前，挂载顺序未变。 |
| 批 5 key-reset 改变切会话时编辑态的清理方式 | 见下。 |
| `explodeBubble` 搬走后 `bubbleEls` 不要一起搬 | 已遵守：`bubbleEls` / `explodedIds` / `dustRef` 都留在 `message-list.tsx`（消息流侧），`bubble-dust.ts` 只导出一个纯函数。 |

### 3.3 key-reset 改造带来的行为面变化（唯一一处）

**改前**：`ChannelScreen` 用渲染期 `if (convId !== prevConv)` 一次性 `setText('') / setEditingId(null) / setPickerFor(null) / setInputPicker(false)` 五连清；`<input key={convId}>` 另外重置 DOM 输入框。

**改后**：`MessageList` 与 `ChatComposer` 都用 `key={convId}` 挂载，切会话时整个组件卸载重建 —— 草稿（`text`）、行内编辑（`editingId`/`editText`）、reaction 选择器（`pickerFor`）全部随组件销毁而清空；壳层只剩 `setInputPicker(false)` 一行渲染期重置（😊 调色板的开关仍归壳层，因为点击消息区要关掉它）。

**用户可见的结果与改前一致**（切会话后草稿空、编辑框关、选择器关）。差别在实现路径：现在是 React 官方推荐的 key-reset，而不是手写五连 setState。

**另外两处顺带变化，方向都是「更少的多余动作」，非退化**：

1. **滚动到底 effect 的依赖**从 `[threads, convId]` 变成 `[msgs]`。改前：任意**别的**会话来一条消息，`threads` 引用变化，当前会话也会被强行滚到底。改后只在当前会话的消息变化时滚。
2. **锚点清理 effect 删除**（原 `useEffect(() => { anchorRef.current = null }, [convId])`）。切会话时 `MessageList` 重建，`anchorRef` 天然是 `null`，这个 effect 失去了存在理由。

---

## 4. 意外发现：拆分让 3 条 lint 规则从「静默」变成「报错」

拆分过程中 `react-hooks/refs` 与 `react-hooks/set-state-in-effect` 两条规则开始报错。**这两条规则命中的都是一字未改、原样搬运的代码**。

原因是 eslint-plugin-react-hooks v7 的这两条规则由 React Compiler 驱动；原来的 `useChatThreads` 有 605 行，编译器分析不下来直接 bail out，于是整个 hook 的这两条规则都被跳过了。拆成小 hook 之后编译器能分析了，规则就开始说话。**用一个探针文件验证过**：把 `chat-data.ts` 里那段 ref 镜像代码原样抄进一个 10 行的小 hook，规则立刻报 2 个错；留在原文件里则 0 错。

处理原则是**不为了让 lint 闭嘴而改行为**：

| 文件 | 处理 | 理由 |
|---|---|---|
| `use-emote-library.ts` | **改代码**：删掉 `worldIdRef`，`importEmoteUrl` / `addEmoteFile` 直接闭包 `worldId` 并加进依赖数组 | 零行为差异：这两个回调只由用户动作触发，读到的 `worldId` 与从 ref 读完全一致；唯一变化是换世界时回调引用会更新，而它们只作为 props 传给 `EmotePicker`，不进任何 effect 依赖 |
| `use-emote-library.ts`、`use-world-stream.ts`、`use-account-stream.ts` | **加带说明的 `eslint-disable react-hooks/set-state-in-effect`** | 「离开世界 / 登出就清空列表」是状态重置，不是派生状态。改成派生会让旧世界的贴纸和频道在重新进入时残留一帧，是实打实的行为变化 |
| `chat-data.ts` | **加带说明的 `eslint-disable react-hooks/refs`** | `uidRef` / `allChanRef` 的渲染期赋值，理由同 §3.1 风险表第三行 |
| `use-message-store.ts` | **不加 disable**，只留一段说明注释 | 实测这个 hook 里规则没触发（加了 disable 反而会报「未使用的 disable 指令」警告）。若日后触发，说明注释已经把理由写在那儿了 |

**登记为后续项**：这 4 处 disable 反映的是同一个真问题——聊天状态层大量依赖「渲染期 ref 镜像」和「effect 里清空 state」。要真正消掉，得动状态模型（例如把会话状态改成 `useReducer` + key 隔离），属于行为面改造，不该混在等价重构里。建议单独立项。

---

## 5. 验证结果与未验证项

### 5.1 已做

| 手段 | 结果 |
|---|---|
| ① **类型即契约测试**（`WorldPage.tsx` 对 25 个返回字段的解构） | 每批 `pnpm exec tsc -b` 全绿；`WorldPage.tsx` 一行未改，说明返回面没有任何字段丢失 / 改名 / 类型漂移 |
| ① 补充：`return {…}` 块逐行 diff | 与 `git show 596d5ea:src/themes/cinnaglass/chat-data.ts` 完全一致 |
| ② **纯函数断言脚本** | `scratchpad/refactor-chat/assert-pure.mjs` + `old-impl.mjs`（后者逐字转写自 `596d5ea` 的旧实现）。**58 条断言全过**，覆盖 `colorFor` / `convsFor` / `fmtTime` / `errMsg` / `rxKey` / `otherOf` / `mergeRows` / `toMsgs`（3 组 context × 含 pending/failed/vanishing/贴纸/墓碑/多人 reaction）/ A7 三个函数（含旧实现的两种 `without` 形态、INSERT 与 DELETE 两条 reaction 路径、`without` 的引用同一性）。另外单独比对了 `toMsgs` 输出对象的**键顺序** |
| ③ **结构扫描** `ai/project-audit/scripts/scan-structure.mjs` | 终检：**0 循环依赖、0 未解析导入、0 孤儿**；`structure-edges.json` 确认 `chat-data.ts → ./emote-picker` 这条逆向边已消失（B4 达成） |
| ④ `pnpm exec vite build` | 每批通过，终检通过（产物已 `rm -rf dist`） |
| ⑤ Vite dev 模块加载 | 13 个聊天模块逐个 `curl` dev server，全部 HTTP 200 且转换无报错 |

### 5.2 未验证项（必须看）

1. **运行时冒烟未做**。仓库里**没有 `.env.local`**（只有 `.env.example`），`pnpm dev` 起来后 `/login` 的控制台唯一报错是 `Missing required environment variable: VITE_SUPABASE_URL`（抛自 `src/lib/supabase.ts:3`，与本次改动无关，且在任何聊天代码执行之前）。应用无法启动 → **§3.1 的 8 条固定冒烟一条都没跑**，`ChatCard` / 聊天大窗从未在浏览器里渲染过。
2. **`SUBSCRIBED` 次数对账未做**。这条依赖能进世界，同 1。「重复订阅 / 订阅抖动」这条高风险项目前**只有静态论证**（依赖数组逐项核对全是稳定引用），没有运行时证据。
3. **视觉对照截图未做**（§3.2 批 1 要求）。同 1。
4. **文档未同步**：`ai/features/chat.md:63` 的模块表仍写老结构，`ai/PROJECT.md` 的项目结构树未加这 11 个新文件。本轮任务范围只含 `src/`，故未改。
5. **未跑 prettier、未 commit**（按任务边界）。

### 5.3 建议用户拿到环境后按这 8 条走一遍

① 进世界 → 大窗打开 → 频道消息显示；② 发一条文字（气泡 pending → 云朵消失）；③ 断网发一条（变粉色 failed → 重试 → 成功）；④ failed 消息点「删除」消失且不复现；⑤ 发一张贴纸；⑥ 加 / 取消一个 reaction；⑦ 上滚到顶加载更早一页（视口不跳）；⑧ 另一端删一条消息 → 本端播粒子后消失。
外加 key-reset 专项：⑨ 打开行内编辑 / reaction 选择器 / 😊 调色板后切会话，三者都应关闭且草稿清空。
对账：控制台里 `[chat][web][use-world-stream]` 与 `[chat][web][use-account-stream]` 的 `订阅状态：SUBSCRIBED` 应各出现 **1 次**（重连除外）。

---

## 6. 环境侧两条说明

1. **本工作树里有另一个会话在并行改文件**。执行期间 `git status` 出现了不属于本任务的改动（`src/pages/LoginPage.tsx`、`ResetPasswordPage.tsx`、`scene.tsx` → `login-backdrop.tsx` 改名、`room/` 下 8 个新文件、`screens.tsx` 等）。本记录里的所有 `tsc` / `eslint` / `build` 结论都是在这个混合工作树上得到的；**本任务只改了** `chat-data.ts`、`channel-screen.tsx`、`emote-picker.tsx` 三个已有文件，外加 11 个新文件。
2. **误停了另一个会话的 dev server**。收尾时用 `pkill -f vite` 停自己起的 5174 端口服务，连带把 5173 上那个（并行会话的）也停了。无数据影响，重启即可。

---

## 7. 产物清单

- 改动的已有文件（3）：`src/themes/cinnaglass/chat-data.ts`、`channel-screen.tsx`、`emote-picker.tsx`
- 新增文件（11）：`chat-store.ts`、`use-message-store.ts`、`use-world-stream.ts`、`use-account-stream.ts`、`use-emote-library.ts`、`use-optimistic-send.ts`、`channel-screen.styles.tsx`、`bubble-dust.ts`、`chat-composer.tsx`、`conv-nav.tsx`、`message-list.tsx`
- 验证脚本（不入库，在 scratchpad）：`refactor-chat/assert-pure.mjs`、`refactor-chat/old-impl.mjs`、`refactor-chat/chat-data.old.ts`、`refactor-chat/scan-before|scan-b1|scan-after/`
- 净行数：改动的 3 个文件 −1262 / +103；新增 11 个文件共 1602 行。总量基本持平，换来的是「一个文件一个变化原因」。
