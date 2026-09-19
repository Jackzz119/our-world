# 聊天分区结构审阅（02-S05）

> 项目 our-world · 分支 `dev` · 基线 `a9f7cfa` · 审阅日 2026-09-19
> 范围：`src/themes/cinnaglass/{chat-data.ts, channel-screen.tsx, friends-page.tsx, emote-picker.tsx, emoji-data.ts}`、`src/themes/cinnaglass/shell/chat-card.tsx`、`src/lib/{chat,friends,emotes,logman}.ts`、`src/types/chat.ts`（11 文件 / 2838 行，全部全文读完），以及它们的消费者 `src/pages/WorldPage.tsx`。
> 本文只评**结构、复用、注释**。协议 / 事务 / 幂等 / 竞态留第三步；产品行为不评。**只读，未修改任何项目文件。**

---

## 0. 范围与方法

- **读法**：11 个目标文件用 Read 全文读完（最大 `chat-data.ts` 727 行、`channel-screen.tsx` 691 行）；`WorldPage.tsx` 只读与聊天相关的 5 段（L93-161、L214-250、L330-345、L480-560）。
- **引用面**：`grep -rn <module> src` 逐模块取 importer，结果见 §2 表「importer」列；与 `metrics/structure-edges.json` 一致（0 环、0 孤儿）。
- **规模/长函数**：取自 `metrics/structure-summary.json`（`useChatThreads` 605 行、`ChannelScreen` 428 行、`EmotePicker` 235 行、`FriendsPage` 154 行、`ChannelStyles` 148 行、`ChatCardStyles` 95 行、`ChatCard` 86 行）。
- **同体候选**：`structure-summary.json.duplicateBodyCandidates` 第 2 组（`lib/chat.ts:17` / `lib/friends.ts:10` 的 `currentUserId`）已人工语义复核，确认逐字同体。
- **类型基线**：`npx tsc -b --pretty false` 本轮实测，全仓**唯一错误**：
  `src/themes/cinnaglass/shell/chat-card.tsx(10,15): error TS2305: Module '"../model"' has no exported member 'Msg'.`
- **文档核验**：注释里出现的每个 `ai/…` 路径、`§` 章节、编号（CH-12/17、EMO-3/4、D-2/7/7-3/9、B-1/B-3、ST-O、codex spec §5.6）都用 `grep -rl` 在 `ai/` 下逐条落点，结果见 §6。
- **受保护范围**：未读 `.claude/`、`.agents/`、`ai/sessions/`、`.env*`。
- **格式基线**：`.prettierrc` printWidth 120 / tabWidth 4 / singleQuote；本分区 6 个文件在 `prettier-check-baseline.txt` 的待格式化清单里（chat-data、channel-screen、emote-picker、friends-page、chat-card，加上 WorldPage）。下文所有「建议注释原文」都按 120 列写。

---

## 1. 全局结论（先看这里）

1. **分层方向是干净的，没有倒置——只有一处例外。** `types/chat.ts`（纯 DB 行类型）← `lib/*`（数据访问）← `chat-data.ts`（视图模型）← 三个 UI 组件，`lib/` 从不反向 import `themes/`。唯一的逆向边是 **`chat-data.ts:32` 从 UI 组件 `./emote-picker` 导入 `EmoteView` 类型**（`emote-picker.tsx:12` 定义）——数据层依赖了视图组件。见 §7.1。
2. **`tsc` 唯一错误的正确修法不是一行。** 把 `chat-card.tsx:10` 的导入源从 `'../model'` 改成 `'../chat-data'` 之后，会**立刻冒出第二个错误**：`chat-card.tsx:85-86` 读的是 `m.stickerUrl`，而 `chat-data.ts:46` 的 `Msg` 只有 `emoteUrl`（L60）。最小正确修复是**两处 3 行**，且**附带一个行为变化**（窄卡今天根本渲染不出贴纸）。见 §7.2。
3. **`chat-data.ts` 的 `useChatThreads` 一个函数里压了 6 个变化原因**：世界流订阅、账号流订阅、贴纸库（签名 URL + 40 分钟续签）、乐观发送账本、已读游标、好友视图模型。任何一个需求改动都要打开这 605 行。拆分方案见 §3.1（只给方案，不执行）。
4. **`ChannelScreen` 428 行里有 203 行不是 UI 逻辑**：`ChannelStyles` 148 行 CSS 字符串（L23-170）+ `explodeBubble` 53 行 canvas 粒子引擎（L210-262）。这两块搬走是零争议、零 props 设计的纯搬运。见 §3.2。
5. **注释密度两极分化。** `lib/*.ts` 的导出函数几乎每个都有一句准确的职责注释（质量很高，值得作为全项目样板）；而 **6 个最大的导出组件 / hook 里，有 4 个完全没有自己的职责注释**：`ChannelScreen`（428 行）、`EmotePicker`（235 行）、`FriendsPage`（154 行）、`ChatCard`（86 行）。全仓统计 `declarationsWithoutComment = 293 / 383`。
6. **过时叙述集中在三个已删概念上**：`ChatDock`（`chat-dock.tsx` 已删，`chat.md:68` 有记录）、`sidebar` / `sidebar home panel`（Discord 壳层已退役）、`DMs stay mock`（DM 已经是真数据）。它们出现在 `chat-data.ts:2`、`channel-screen.tsx:1-6`、`friends-page.tsx:6`、`WorldPage.tsx:131-134`。这四处是本分区注释清理的**主目标**。
7. **⚠️ 需要纠正任务前提：CH-12 / CH-17 / EMO-3 / EMO-4 / D-7-3 这些编号在 `ai/` 下**不是**零命中。** 第一步的 `src-review.md:§1.3` 写「零命中」，但第一步 S08 重写 `ai/features/chat.md` 之后，`chat.md:13`（已知断链）与 `chat.md:80`（文档回填欠账）已经**把这些编号逐个登记在册**，`D-7-3` 还在 `chat.md:61` 的模块表里有正文。所以正确动作**不是删编号**，而是「补落点 + 删与现状不符的叙述」——详见 §5.0 的注释公约与 §6。
8. **`ReactionRow.channel_id` 是一个幻列。** `types/chat.ts:68` 声明了它，`lib/chat.ts:14` 的 `REACTION_COLS` 不 select 它，`ai/PROJECT.md:110` 的 `message_reactions` 列表也没有它，全仓**零处读取**；唯一的「写」是 `chat-data.ts:649` 为了满足类型而伪造的 `channel_id: ''`。删一行类型 + 删一个字面量即可。见 §7.3。
9. **`currentUserId` 不止 2 处同体，是 6 处同形。** `lib/chat.ts:17` 与 `lib/friends.ts:10` 逐字相同（扫描命中的那组）；此外 `lib/worlds.ts:16/34`、`lib/posts.ts:37`、`lib/emotes.ts:42` 是同一形状的内联版本，只是报错文案不同。落点建议见 §4.1。
10. **`chat-data.ts` 内部有 4 组可提取的重复片段**（reaction 合并 3 处、Set 删元素 5 处、跨频道删消息 2 处、乐观行字面量 2 处），合计约 55 行。这些是拆分方案的天然副产品，单独做也划算。见 §4.2。

---

## 2. 逐文件职责 / 变化原因 / importer / 位置判定

「变化原因」= 什么样的需求会让人打开这个文件改它（Single Responsibility 的实用判据）。

| 文件 | 行 | 职责 | 变化原因（几个） | importer（文件:行） | 命名 / 位置判定 |
|---|---|---|---|---|---|
| `src/types/chat.ts` | 91 | 聊天后端类型：`Channel` / `ChatMessageRow` / `ReactionRow` / `ChannelReadRow` / `FriendshipRow` / `EmoteRow` / `EmoteSearchResult` / `WorldEvent` | ① DB 表结构变 | `lib/chat.ts:10`、`lib/friends.ts:6`、`lib/emotes.ts:6`、`chat-data.ts:33`、`channel-screen.tsx:15`、`chat-card.tsx:7`、`emote-picker.tsx:10`（扇入 7） | ✅ 位置正确（`src/types/` 与 `feed.ts`、`index.ts` 同级）。命名 `chat.ts` 与 `lib/chat.ts` 同名但路径不同，项目里一直靠 `@/types/chat.ts` / `@/lib/chat.ts` 全路径区分，未见误引，**不建议改名** |
| `src/lib/chat.ts` | 171 | 频道 / 消息 / reaction / 已读的数据访问 + `subscribeWorld` / `subscribeUser` | ① 表或列变 ② 订阅拓扑变 | `chat-data.ts:25,28`（唯一） | ✅ 位置正确。**`chat-data.ts:25` 与 `:28` 是对同一模块的两条 import 语句**（`:28` 只为 `sendSticker`），应合并 |
| `src/lib/friends.ts` | 57 | `friendships` 规范序对的增删改查 + 按邮箱加好友（RPC） | ① 好友表 / RPC 变 | `chat-data.ts:26`（唯一） | ✅ 位置正确 |
| `src/lib/emotes.ts` | 100 | 世界贴纸库数据访问 + 客户端降采样 + Edge Function 搜图/转存 + 错误解包 | ① 贴纸表变 ② Edge Function 契约变 ③ 图片处理参数变 | `chat-data.ts:27`（唯一） | ✅ 位置正确。`downscaleToWebp`（L69）与 `describeFnError`（L89）是两个**与 emote 无关的通用工具**（一个是 canvas 图像处理、一个是 `functions.invoke` 错误解包），若日后第二个 Edge Function 出现，`describeFnError` 应上移到 `lib/supabase.ts`；现在只有一个调用方，**留在原地** |
| `src/lib/logman.ts` | 16 | console 封装：`[域][运行时][模块]` 换行格式，`log` 仅 dev | ① 日志规范变 | `chat-data.ts:31`（唯一） | ✅ 位置正确，注释也准确（`ai/PROJECT.md:96` 确有标签池，且明写「在用标签：`chat`」） |
| `src/themes/cinnaglass/chat-data.ts` | 727 | 聊天视图模型层：`Msg`/`Conv`/`FRIENDS_VIEW`/`colorFor`/`convsFor` + 605 行的 `useChatThreads` | **6 个**：① 消息管道 ② 世界订阅 ③ 账号订阅 ④ 贴纸库与签名 URL ⑤ 好友视图 ⑥ 乐观态账本 | `WorldPage.tsx:23`、`channel-screen.tsx:14`、`friends-page.tsx:9`、`chat-card.tsx:8,9`（扇入 4） | ⚠️ 名字准确（确实是 data，不是 UI），但**文件名没体现它是 hook**。若走 §3.1 拆分，`useChatThreads` 应落到 `chat/use-chat-threads.ts`，纯投影函数落到 `chat/chat-store.ts` |
| `src/themes/cinnaglass/channel-screen.tsx` | 691 | 覆盖式聊天大窗：左栏会话切换 + 右栏消息流 + 编辑 / reaction / 删除粒子 / 翻页 / 输入区 | **4 个**：① 大窗布局与 CSS ② 消息流交互 ③ 粒子特效 ④ 输入区与选择器挂载 | `WorldPage.tsx:22`（唯一） | ⚠️ 名字是旧 Discord 壳层的遗留（现在它是「聊天中心 / hub」，`chat.md:61` 也叫「聊天中心」，文件头 L2 自称 `CHAT HUB`）。改名 `chat-hub.tsx` 语义更准，但会动 1 处 import + 2 处文档表格；**低收益，建议只在走 §3.2 拆分时顺手改** |
| `src/themes/cinnaglass/friends-page.tsx` | 228 | 大窗右栏的好友页：全部 / 待处理 / 添加好友三 tab | ① 好友交互变 | `channel-screen.tsx:12`（唯一） | ✅ 名字与位置都对。它是 `channel-screen` 的子页，**不是**独立路由页——放进 `chat/` 子目录后语义更清楚 |
| `src/themes/cinnaglass/emote-picker.tsx` | 332 | emoji / 贴纸选择器，一个组件两种 mode（composer / reaction）+ 内嵌导入流程 | ① 选择器交互 ② 导入流程 | `channel-screen.tsx:13`、`chat-data.ts:32`（**类型逆向依赖**） | ⚠️ 位置对，但 `EmoteView`（L12）定义在这里却被数据层消费，见 §7.1 |
| `src/themes/cinnaglass/emoji-data.ts` | 210 | 自维护的 ~230 条 emoji + 中文搜索关键词，7 个分类 + 扁平索引 | ① 加 emoji | `emote-picker.tsx:9`（唯一） | ✅ 纯数据文件，与 `emote-picker.tsx` 一对一，应一起搬 |
| `src/themes/cinnaglass/shell/chat-card.tsx` | 216 | 舞台左下窄聊天卡：只渲染 `convsFor` 的**首个**会话、尾部 40 条、过滤 vanishing、打开即上报已读 | ① 窄卡视觉规格（codex pixel spec） ② 舞台层交互 | `WorldPage.tsx:21`（唯一） | ✅ **应留在 `shell/`**：它与 `floaters.tsx` / `rail.tsx` / `ambience.tsx` 同属舞台悬浮层，共享 `--cg-*` token 与 `navigation-glass.css` 的视觉体系。它是「壳层的聊天入口」而不是「聊天功能的一块」——按层分组胜过按功能分组 |

### 2.1 是否值得建 `themes/cinnaglass/chat/` 子目录

**现状**：`themes/cinnaglass/` 根目录 26 个条目平铺，其中 5 个属于聊天（`chat-data`、`channel-screen`、`friends-page`、`emote-picker`、`emoji-data`），第 6 个（`chat-card`）在 `shell/`。

**项目已有的分目录先例**：`room/`（`pixi-scene` / `room-scene` / `room-types` / `study-room`，按**功能**分）与 `shell/`（`rail` / `floaters` / `ambience` / `chat-card` / `rail-icons` / `navigation-glass.css`，按**层**分）。所以「建子目录」本身不违背项目习惯，聊天按功能分正好对上 `room/` 的先例。

**结论：值得做，但不建议单独做。** 理由：改动本身极小（见下），但它**只有在 §3.1 / §3.2 拆分成立时才产生真收益**——拆完会多出 5-7 个文件，那时根目录会从 26 涨到 33；如果不拆，5 个文件平铺其实读得出是一组。单独搬一次、拆分时再搬一次，是两次无谓的路径扰动。

**要改的 import（只有 4 行）**：

| 文件:行 | 现值 | 改后 |
|---|---|---|
| `WorldPage.tsx:22` | `from '@/themes/cinnaglass/channel-screen'` | `from '@/themes/cinnaglass/chat/channel-screen'` |
| `WorldPage.tsx:23` | `from '@/themes/cinnaglass/chat-data'` | `from '@/themes/cinnaglass/chat/chat-data'` |
| `chat-card.tsx:8` | `import type { Conv } from '../chat-data';` | `import { convsFor, type Conv, type Msg } from '../chat/chat-data';`（顺带合并 L8/L9/L10 三行为一行，并修掉 §7.2 的 `Msg`） |
| `chat-card.tsx:9` | `import { convsFor } from '../chat-data';` | （并入上一行） |

`channel-screen.tsx:12,13,14`、`emote-picker.tsx:9`、`friends-page.tsx:9`、`chat-data.ts:32` 都是同目录相对导入，一起搬**不用改**；文件内的 `@/lib/*`、`@/types/*` 也不用改。

**风险**：
- 低：`git mv` 保留历史，`tsc -b` 会把漏改的 import 全部报出来（本项目没有动态 `import()` 引这些模块，`grep -rn "chat-data\|channel-screen" src` 已确认全部是静态导入）。
- 需同步的文档：`ai/features/chat.md` §三模块表 7 行路径、`ai/PROJECT.md` §项目结构树。这两处不改就是新的失效引用。
- `vite` 无路径白名单，`tsconfig` 的 `@/*` 指向 `src/*`，不受影响。

---

## 3. 拆分方案（只给方案，本轮不执行）

### 3.1 `useChatThreads`（`chat-data.ts:123`，605 行）

#### 现在一个函数里的 6 个变化原因

| # | 职责 | 代码位置 | 本地状态 |
|---|---|---|---|
| a | 世界流：频道列表 + 文字频道首屏 + 全员已读 + `subscribeWorld` + 重连补拉 | L362-424 | `channels` |
| b | 账号流：好友关系 + DM 频道 + 好友 profile + `subscribeUser` + 重连补拉 | L427-482 | `dmChannels` / `friendships` / `friendProfiles` |
| c | 贴纸库：`listEmotes` + `signImageUrls` + **40 分钟续签定时器** + `world_emotes` 事件重载 + 导入/删除动作 | L372-388、L671-686 | `emotes` / `emoteUrls` |
| d | 消息仓库：`chanRows` / `reactions` / `reads` / `reachedStart` + `absorb` + `onEvent` + `startVanish` | L132-140、L268-359 | 7 个 state + 6 个镜像 ref |
| e | 乐观发送账本：`deliver` / `appendLocal` / `send` / `sendStickerTo` / `retrySend` / `discardFailed` / `editMessage` / `deleteMsg` | L518-636 | `pendingIds` / `failedIds` / `vanishingIds` |
| f | 视图投影：`threads` / `dmConvs` / `friends` / `requestsIn` / `requestsOut` / `emoteViews` / `nameMap` / `emotesById` | L165-264 | 纯 memo |

#### 目标结构（`themes/cinnaglass/chat/` 下 7 个文件）

```
chat/
├── chat-store.ts          纯函数，零 React（f 的可测部分 + d 的 reducer 片段）
├── use-message-store.ts   d：行 / reaction / 已读 / 三个标志位 + absorb + onEvent
├── use-world-stream.ts    a
├── use-account-stream.ts  b
├── use-emote-library.ts   c
├── use-optimistic-send.ts e
└── use-chat-threads.ts    门面：组合上面 6 个 + f 的 memo，返回面逐字段不变
```

**接口契约（这是整个方案的验收线）**：`useChatThreads(worldId, uid, profiles)` 的返回对象**26 个字段一个不增不减、名字不变、类型不变**，`WorldPage.tsx:135-161` 的解构**一行都不改**。

各模块签名：

| 模块 | 导出 | 入参 | 出参 |
|---|---|---|---|
| `chat-store.ts` | `mergeRows` / `rxKey` / `otherOf` / `fmtTime` / `colorFor` / `convsFor` / `upsertReactions(map, rows)` / `dropMessageEverywhere(map, id)` / `toMsgs(rows, ctx)` | 纯值 | 纯值 |
| `use-message-store.ts` | `useMessageStore()` | 无 | `{ chanRows, reactions, reads, reachedStart, pendingIds, failedIds, vanishingIds, refs, absorb, handleEvent, startVanish, setChanRows, setPendingIds, setFailedIds }` |
| `use-world-stream.ts` | `useWorldStream(worldId, store, onEvent)` | store 的 `absorb` | `{ channels }` |
| `use-account-stream.ts` | `useAccountStream(uid, store, onEvent)` | 同上 | `{ dmChannels, friendships, friendProfiles, reloadRef }` |
| `use-emote-library.ts` | `useEmoteLibrary(worldId)` | — | `{ emotes, emoteUrls, emoteViews, searchWeb, importEmoteUrl, addEmoteFile, removeEmoteById, reloadRef }` |
| `use-optimistic-send.ts` | `useOptimisticSend(store, allChanRef, uidRef)` | — | `{ send, sendStickerTo, retrySend, discardFailed, editMessage, deleteMsg, toggleReaction, markRead }` |

**连线难点（必须先想清楚）**：`onEvent`（L321-359）在收到 `friendships` 事件时要触发账号流重拉（L352），收到 `world_emotes` 事件时要触发贴纸库重拉（L355）。今天靠两个可变 ref（L159-161）在 effect 里自赋值。拆开后推荐：门面持有这两个 ref，把它们作为**参数**传给 `useMessageStore` 的事件工厂 —— 即 `handleEvent = makeHandler({ onFriendshipChange, onEmoteChange })`。不要引入事件总线，那会多一个概念且更难追。

#### 最小批次（每批一个 commit，批间跑 `tsc -b` + `eslint` + `vite build` + 同一份冒烟）

| 批 | 内容 | 为什么这个顺序 | 风险 |
|---|---|---|---|
| 1 | 抽 `chat-store.ts` 纯函数（`mergeRows`/`rxKey`/`otherOf`/`fmtTime`/`colorFor`/`convsFor`/`toMsgs`） | 零 React、零状态、零行为变化；先把「可离线验证的部分」拿出来，后面几批就有了断言靶子 | 极低。`toMsgs` 是从 L182-213 的 map 回调原样搬出，参数化 `uid`/`nameMap`/`reactions`/`emotesById`/`emoteUrls`/三个标志集合 |
| 2 | 抽 `use-emote-library.ts` | 与消息管道耦合最少：只通过 `reloadEmotesRef` 一个接口挂在 `onEvent` 上 | 低。**唯一要盯的是 L387 的 `setInterval(40min)` 与 L420-421 的清理**，漏了会泄漏定时器 |
| 3 | 抽 `use-optimistic-send.ts` | 只依赖 3 个 setter + `allChanRef` + `uidRef`，不碰订阅 | 低-中。`retrySend`（L583）遍历 `chanRowsRef`，拆开后必须继续拿到**同一个** ref 对象而不是快照 |
| 4 | 抽 `use-message-store.ts`，并把两个 effect 拆成 `use-world-stream.ts` / `use-account-stream.ts` | 最危险的一批，单独做 | **高**。见下面「风险」 |
| 5 | 门面 `use-chat-threads.ts` 收口，删旧代码，`chat-data.ts` 只留 re-export（或删除并改 4 处 import） | — | 低 |

#### 无测试时的等价验证手段（本项目零单测、零 CI）

1. **类型即契约测试**：`WorldPage.tsx:135-161` 用解构消费全部 26 个返回字段，`tsc -b` 会在任何字段丢失 / 改名 / 类型漂移时报错。这是现成的、免费的、覆盖返回面 100% 的回归网。**每批必跑。**
2. **纯函数断言脚本**（只适用于批 1）：在 scratchpad 写一个一次性 `node --experimental-strip-types` 脚本，喂固定的 row 数组给 `mergeRows` / `toMsgs`，比对拆分前后 `JSON.stringify` 完全一致。跑完即弃，不入库。
3. **AST 去注释同一性**：批 1、批 3 是纯搬运，可用 `metrics/` 里 `scan-structure.mjs` 同一套「去注释规范化打印哈希」比对搬运前后的函数体，哈希一致即证明只是换了位置。
4. **固定 8 条手动冒烟**（每批后跑同一份，逐条记 pass/fail）：
   ① 进世界 → 大窗打开 → 频道消息显示；② 发一条文字（气泡 pending → 云朵消失 = 确认）；③ 断网发一条（变粉色 failed → 重试 → 成功）；④ failed 消息点「删除」消失且不复现；⑤ 发一张贴纸；⑥ 加 / 取消一个 reaction；⑦ 上滚到顶加载更早一页（视口不跳）；⑧ 另一端删一条消息 → 本端播粒子后消失。
5. **订阅次数对账**：`Logman.log` 已经在 L407 / L467 打了每次订阅状态。拆分前后各录一次 console，比对 `SUBSCRIBED` 出现次数与 `world`/`account` 各一次。**这是检测「effect 依赖抖动导致重复订阅」的唯一现成手段。**

#### 风险（按严重度）

- **重复订阅 / 订阅抖动（高）**：两个 effect 的依赖数组是 `[worldId, onEvent, absorb]` / `[uid, onEvent, absorb]`（L424、L482）。`onEvent` 的 `useCallback` 依赖 `[startVanish]`、`absorb` 依赖 `[]`。拆开后如果 `onEvent` 变成依赖更多东西（比如直接依赖 `reloadAccount` 函数），身份就会每渲染变一次 → 每次渲染都 unsubscribe + subscribe → Realtime 抖动 + 每次重连触发一次 `load(true)` 全量补拉。**缓解**：门面里 `onEvent` 的依赖面必须保持与今天一致（只依赖稳定引用），reload 一律走 ref。批 4 完成后用上面第 5 条验证。
- **状态撕裂（中）**：`absorb`（L287-318）一次调 4 个 setState。React 18 的自动批处理让它们在同一次提交里落地。如果拆分后把其中某个 set 移到另一个 hook 并且**跨了 `await`**，就会多渲染一帧，表现为消息先出现、reaction 后补上（视觉闪一下）。**缓解**：`absorb` 必须保持单函数、单模块，不能按 state 种类拆开。
- **ref 渲染期赋值时序（中）**：`allChanRef.current = [...channels, ...dmChannels]`（L155-156）是**渲染期**赋值，`send`/`markRead`/`loadOlder` 都靠它做「这个 conv 存不存在」的守卫（L487、L544、L659）。拆开后 `channels` 来自世界流 hook、`dmChannels` 来自账号流 hook，门面必须在**两个 hook 都调用完之后、返回之前**拼这一次，顺序不能变。
- **`cancelled` / `everSubscribed` 闭包（中）**：两个 effect 各有一对局部标志（L369-370、L434-435）。搬进独立 hook 时必须整体搬，不能把 `load` 提到 hook 外面——那样 `cancelled` 就失效，卸载后仍会 setState。
- **文档同步（低但必然）**：`ai/features/chat.md:63` 的 `chat-data.ts` 行写的是「`useChatThreads`（消息、乐观态、reaction、已读、贴纸、好友）」，拆完必须改成新的 7 文件表，否则第三步又多一条失效引用。

### 3.2 `ChannelScreen`（`channel-screen.tsx:264`，428 行）

| 拆出 | 源行 | 行数 | 接口 | 争议 |
|---|---|---|---|---|
| `channel-screen.styles.tsx`（`ChannelStyles`） | L23-170 | 148 | 无 props | 无。**注意第一批只搬到 `.tsx` 保持 `<style>` 内联，不要改成 `.css` 文件**——`cinnaglass.css` 是全局导入的，改成 `.css` 会改变层叠顺序，`.chsc-*` 可能被覆盖 |
| `bubble-dust.ts`（`explodeBubble` + `VANISH_COLORS`） | L21、L210-262 | 55 | `(canvas, host, el) => void` | 无。纯 canvas，零 React，可单独在浏览器里跑 |
| `chat-composer.tsx` | L649-684 + `insertEmoji`(L403) + `inputPicker` state | ~55 | `{ placeholder, onSubmit(text), emotes, canImport, onSendSticker, onSearchWeb, onImportUrl, onImportFile, onRemoveEmote }` | ⚠️ **必须叫 `ChatComposer`**：`screens.tsx:503` 已经有一个 `Composer`（日记编辑器），重名会让人读错 |
| `conv-nav.tsx` | L430-459 | 30 | `{ convId, isFriends, chConvs, dmConvs, pendingCount, onSelect }` | 无 |
| `message-list.tsx` | L491-647 + `onScroll`(L383) + 三个 effect(L345/349/370) + `readCursorIdx`(L330) | ~200 | 见下 | **这是难点** |

**`message-list.tsx` 的 props 设计**：如果照搬现状，它需要 14 个 props，其中 `editingId` / `editText` / `pickerFor` 是今天存在父组件里的状态（L298-300）。更好的切法是**把这三个状态一起下沉**到 `MessageList`（它们只被消息流用到，父组件只在切会话时清空它们——L314-320）。这样 props 降到 8 个：

```ts
type MessageListProps = {
    convId: string;          // 也当 key 用，切会话自动重置内部状态，省掉 L314-320 的手动清理
    msgs: Msg[];
    isChannel: boolean;      // 影响顶部提示文案（频道开头 / 私信开头）
    reachedStart: boolean;
    dm?: Conv;               // 有值才画已读头像
    readAt?: string;
    chatAlign: ChatAlign;
    actions: { onRetry; onDiscard; onEdit; onDelete; onReact; onLoadOlder };  // 一个对象，不是 6 个 prop
    emotePicker: { emotes: EmoteView[]; onSearchWeb; onImportUrl; onImportFile; onRemoveEmote };
};
```

用 `key={convId}` 挂载 `MessageList` 可以顺便**删掉 `ChannelScreen` L313-320 的渲染期 setState 块**（`prevConv` 那段）——React 官方推荐的 key-reset 写法，比手动 5 个 setState 更可靠。这是拆分的一个附加收益，但**它改变了「切会话时输入框草稿是否清空」的行为归属**（输入框在 composer 里，需要单独用 `key={convId}` 处理——今天 L672 已经这么做了），所以要一起验。

拆完 `ChannelScreen` 剩 ~90 行：props 透传、`ch`/`dm`/`isFriends` 解析（L321-326）、scrim + 容器 + header、好友页分支。

**最小批次**：① `ChannelStyles` ② `explodeBubble` ③ `ChatComposer` ④ `ConvNav` ⑤ `MessageList`（含 key-reset 改造）。前四批各自独立、零 props 争议，可以一批一 commit；第 5 批单独做。
**验证**：每批 `tsc -b` + 同一份冒烟（开窗 / 切会话 / 发消息 / 编辑 / 删除看粒子 / 上滚翻页 / reaction / 贴纸 / 好友页切回），外加**一次视觉对照截图**——批 1 之后必须确认 `<style>` 仍在 `.chsc` 之前挂载（今天是 `channel-screen.tsx:425`）。
**风险**：批 5 的 key-reset 改造是唯一有行为面的改动（切会话时未提交的编辑内容处理方式变了）；批 1 若手滑改成 `.css` 会引入层叠问题；`explodeBubble` 搬走后 `bubbleEls` ref（L306）仍留在消息流里，不要一起搬。

### 3.3 不拆的边界（防止拆成碎片）

判据是**变化原因**，不是行数。以下明确**不拆**：

1. **`absorb` / `onEvent` / `mergeRows` 三者是一条数据通路**，分到三个文件只会让「一条消息怎么进到屏幕上」变成三跳。它们同属「消息仓库」一个变化原因。
2. **`deliver` + `send` + `sendStickerTo` + `retrySend` + `discardFailed` 共享 `pendingIds`/`failedIds` 账本**，必须同模块；拆开就要把两个 Set 提成参数传来传去。
3. **不抽 `<MessageBubble>` 单条气泡组件**。它读 `Msg` 的 8 个字段、5 个回调、2 个父状态（`editingId`/`pickerFor`）、1 个 ref map（`bubbleEls`）。抽出来的 props 声明会比现在的 JSX 还长，且 `bubbleEls` 的 ref 回调（L536-539/L553-556）要跨组件传，得不偿失。
4. **`friends-page.tsx`（228 行）不拆**：一个 tab 状态 + 三个分支，一个变化原因。
5. **`emote-picker.tsx`（332 行）本轮不拆**：其中 57 行是 CSS 字符串、74 行是 `importing` 导入分支（L255-328）。真要拆只有「把 `PickerStyles` 和导入分支分出去」这一种切法，收益小于改动面；**等它下次再长时再说**。
6. **`emoji-data.ts`（210 行）不拆**：纯数据表，长度来自条目数，不是复杂度。
7. **目标不是「每文件 200 行」，是「一个文件一个变化原因」。** `chat-data.ts` 今天 6 个、`ChannelScreen` 今天 4 个；拆到各自 1-2 个就停，别再往下切。

---

## 4. 复用与重复

### 4.1 `currentUserId` 同体 → 唯一实现放哪

**事实**（`grep -rn "auth.getUser" src`，6 处）：

| 位置 | 形态 | 报错文案 |
|---|---|---|
| `lib/chat.ts:17-22` | 具名 `currentUserId` | `未登录。` |
| `lib/friends.ts:10-15` | 具名 `currentUserId` | `未登录。` |
| `lib/emotes.ts:42-44` | 内联在 `addEmoteFromFile` | `未登录。` |
| `lib/worlds.ts:16-18` | 内联 | `未登录，无法进入世界。` |
| `lib/worlds.ts:34-36` | 内联 | `未登录，无法创建世界。` |
| `lib/posts.ts:37-39` | 内联 | `未登录，无法发帖。` |

前两处**逐字同体**（扫描器命中的那组），后四处是同形不同文案。

**候选落点对比**：

| 方案 | 优点 | 缺点 | 判定 |
|---|---|---|---|
| **A. `lib/supabase.ts`** | 该文件只有 4 行（一个 `createClient`），扇入 12 是全项目第二高，每个 lib 都已经 import 它 → **零新增 import 语句**；"客户端 + 它携带的会话"是一个概念 | 让「纯 client 工厂」多了一个函数 | ✅ **推荐** |
| B. 新建 `lib/auth.ts` | `supabase.ts` 保持纯工厂 | 为 6 行代码新建文件；且项目里已经有 `hooks/useAuth.ts` 和 `pages/ProtectedRoute.tsx`，第三个叫 auth 的东西会造成「该找哪个」的混淆 | ❌ |
| C. `hooks/useAuth.ts` | 已存在 | 它是 React hook（`useState`+`useEffect`），**不能在 `lib/` 的异步函数里调用** | ❌ 技术上不可行 |

**建议实现**（放 `lib/supabase.ts`）：

```ts
// The signed-in user's id, for writes that must stamp an author. Throws with
// `action` in the message when there is no session, so callers keep their own
// wording (e.g. currentUserId('无法发帖')).
export const currentUserId = async (action?: string): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) throw new Error(action ? `未登录，${action}。` : '未登录。');
    return id;
};
```

**本轮范围**：只改 `lib/chat.ts:17-22` 与 `lib/friends.ts:10-15`（删 12 行，各加一个 import 名）——这两个在本分区内、文案完全一致、零行为变化。`worlds.ts` / `posts.ts` / `emotes.ts:42-44` 属于 S06 壳层分区，**在此登记、交给那边一起做**，否则会出现两个 agent 改同一个文件。

**验证**：`tsc -b` + 手动触发一次未登录写入（登出后在 console 调 `sendMessage`）确认报错文案不变；或更简单地 `grep -c "未登录" src/lib/*.ts` 前后对账。
**风险**：极低。`currentUserId` 是私有函数（两处都没 export），改成从 `supabase.ts` 导入不影响任何外部契约。

### 4.2 `chat-data.ts` 内部的 4 组重复片段（约 55 行）

| # | 片段 | 出现位置 | 建议 |
|---|---|---|---|
| 1 | **reaction 按 `rxKey` 去重后 upsert 进 map** | `absorb` L298-302、`onEvent` L342-345、`loadOlder` L497-504 | 提 `upsertReactions(prev, rows, remove?)` 纯函数到 `chat-store.ts`。**3 处变 1 处**，这是本分区最值得做的一个小复用 |
| 2 | **从 Set 里删一个 id（带「不在就返回原引用」的优化）** | `startVanish` L276-281、`onEvent` L331-336、`deliver` L520-525、`deliver.catch` L529-533、`discardFailed` L607-611 | 提 `const without = (s: Set<string>, id: string) => (s.has(id) ? new Set([...s].filter(x => x !== id)) : s)`。5 处 × 5 行 → 5 处 × 1 行 |
| 3 | **跨所有频道桶删一条消息** | `startVanish` L271-275、`discardFailed` L602-606 | 提 `dropMessageEverywhere(map, id)` 到 `chat-store.ts` |
| 4 | **乐观 `ChatMessageRow` 字面量** | `send` L546-556、`sendStickerTo` L566-577 | 提 `localRow(convId, authorId, { content, kind, emoteId })`。⚠️ 两处都硬写 `world_id: null`（L549、L569）**即使是世界频道** —— 这是「乐观行不是真行」的结构味道，提函数时把它记在注释里，不要在本步改语义（world_id 由 DB trigger 回填，属第三步的协议问题） |

### 4.3 `chat-data` 与 `lib/chat` 之间的类型 / 映射重复

**结论：几乎没有真重复，只有一处类型抄写。**

- ✅ `chat-data.ts` 不重新定义任何 DB 行类型，全部从 `@/types/chat.ts` 导入（L33）。行 → `Msg` 的投影只在 `threads` memo 一处（L178-217），没有第二份。
- ⚠️ **一处抄写**：`absorb` 的第 4 个参数（L288）把类型内联写成 `{ channel_id: string; user_id: string; last_read_at: string }[]`，这正是 `ChannelReadRow` 去掉 `world_id`。`chat-data.ts` 甚至没 import `ChannelReadRow`。**建议**：`import type { ChannelReadRow }` 并把参数改成 `ChannelReadRow[]`（两个调用点 L398、L452 传的本来就是 `getChannelReads` / `getReadsForChannels` 的返回值，即真 `ChannelReadRow[]`）。零行为变化，`tsc` 验证。
- ⚠️ `lib/chat.ts:12-15` 的四个 `*_COLS` 常量是「select 列清单」，与 `types/chat.ts` 的字段列表是**同一份信息的两种写法**，改表时必须同时改两处。这是 Supabase 项目的通病，目前 4 组 × 5-9 列还在可控范围。**不建议**引入代码生成（会把 `supabase gen types` 整条链拉进来）；**建议**在 `types/chat.ts` 文件头加一句公约注释：字段增删必须同步 `lib/chat.ts` 的 `*_COLS`。见 §5.7。

### 4.4 `emoji-data` 的索引构建是否重复计算

**结论：模块级索引没问题；渲染级过滤有一次可省的重复，但不值得为它单独动手。**

- `ALL_EMOJI = EMOJI_CATEGORIES.flatMap(...)`（`emoji-data.ts:210`）在**模块加载时算一次**，之后是常量。✅ 正确。
- `emote-picker.tsx:122` 的 `ALL_EMOJI.filter(x => x.k.toLowerCase().includes(query))` 在 `EmotePicker` **每次渲染**都重跑，且对 230 条里的每一条都新建一个小写字符串。触发渲染的不只是打字——父组件 `ChannelScreen` 每次 `threads` 变化（每来一条消息）都会重渲染挂着的 picker。
- **量级**：230 次 `toLowerCase` + 230 次 `includes`，约几十微秒。**不构成性能问题。**
- **建议（低优先，只在动这个文件时顺手做）**：`const emojiHits = useMemo(() => query ? ALL_EMOJI.filter(...) : null, [query])`，`worldHits` 同理（L123，依赖 `[query, emotes]`）。或者更彻底：在 `emoji-data.ts` 里把 `k` 预存小写。**两者都只是整洁，不是修 bug**，不进 A 类清单。

### 4.5 Logman 使用范围与 PROJECT 规范的关系

**事实**：`grep -rn "Logman" src` → **只有 `chat-data.ts` 一个消费者**，17 处调用（L381-697）。全仓另有 2 处裸 `console.warn`：`settings.tsx:191`（`[auth][web][SettingsScreen]`，格式手写但**符合规范**）与 `image-slot.js:386`（`<image-slot> ingest failed:`，**不符合规范**，但那是个 Web Component，不在本分区）。

**与规范的关系**：`ai/PROJECT.md:96` 已经**准确记录了这个现状**——「在用标签：`chat`；`auth` 域尚未走 Logman（`settings.tsx` 一处直接 `console.warn`）」。`CLAUDE.md` 的 Debug Log 规范要求 `[功能模块][平台][类名]` + 换行，`logman.ts:8/11/14` 的 `` `${tag}\n${msg}` `` 正是这个格式。

**判定**：
- ✅ `logman.ts` 本身设计正确、注释准确、位置正确，**不动**。
- ✅ `chat-data.ts` 的 17 处调用全部用同一个 `TAG = '[chat][web][chat-data]'`（L36），符合「标签反映方法所属功能域」。**不动**。
- ⚠️ 但 **`TAG` 是文件级常量**。如果走 §3.1 拆分，7 个文件各自需要 `[chat][web][use-world-stream]` 之类的模块名。拆分方案里要为每个新文件定 TAG，**这属于 `logman` skill 的范围，拆分执行时要触发它**。
- 📌 **登记（不在本分区执行）**：`lib/chat.ts` / `lib/friends.ts` / `lib/emotes.ts` 三个数据访问模块**全部 throw 不 log**，所以订阅失败、RPC 失败这些只有在 `chat-data` 的 catch 里才可见；这个设计是自洽的（错误向上冒到有 UI 上下文的地方才打），**不建议改**，但值得在 `logman.ts` 的文件头写清楚，否则下一个人会在 lib 里加 log。

---

## 5. 注释审计

### 5.0 先定三条公约（下面所有建议都按这三条）

源码注释**保持英文**（全分区现状一致，不改语言）。

1. **一个具名声明一句职责注释**；复杂函数最多 3-4 句，必须说清**条件**与**副作用**（发起写、起定时器、改全局状态）。纯搬运式复述（`// set the text` 之于 `setText`）一律不写。
2. **编号引用只在文件头出现一次，且带落点路径。** 函数级注释里不再复述编号。
   ⚠️ 本条**纠正任务书的前提**：CH-12 / CH-17 / EMO-3 / EMO-4 / D-7-3 **不是**「在 `ai/` 全部文档零命中」。第一步 S08 重写 `ai/features/chat.md` 之后，`chat.md:13`（已知断链）与 `chat.md:80`（文档回填欠账）**已把这些编号逐个登记在册**，`D-7-3` 在 `chat.md:61` 的模块表里还有正文。所以**编号不删**——删了反而丢掉「这条实现对应哪个待回填 subtask」的线索。正确动作是**补落点路径**（见 §6）。
   同理 D-2 / D-7 / D-9 / B-1 / B-3 都能落到 `ai/design_system/uiux/research/cinnaglass-history/`，codex spec §5.6 能落到 `ai/codex-visual/20260811-055917Z/codex-report.md:171`。
3. **真正要删的是与现状不符的叙述**，共四类：`ChatDock`（组件已删）、`sidebar` / `sidebar home panel`（Discord 壳层已退役）、`DMs stay mock`（DM 已是真数据）、`the sidebar's only chat trigger`（现在入口是 `ChatCard` 的展开按钮与 rail）。

下表「现状」取值：**无**（无注释）｜**复述**（只重述代码）｜**过时**（与现状不符）｜**冗长**（超 4 句或跑题）｜**合格**。
只列**具名函数 / 方法 / 组件 / 导出常量 / 导出类型**；局部变量与 trivial 表达式不列。

### 5.1 `src/themes/cinnaglass/chat-data.ts`

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-7 | 文件头 | **过时** | `// chat-data.ts — the chat view-model layer: turns the rows fetched by lib/chat|friends|emotes into`<br>`// everything the two chat surfaces render — the stage-side ChatCard (shell/chat-card.tsx) and the`<br>`// covering chat hub (channel-screen.tsx). World text channels ride the world:{id} topic, DMs and`<br>`// friendships ride the account topic user:{uid}; one pipeline serves both, since a DM is just a`<br>`// channel without a world. Feature doc: ai/features/chat.md.` | 「the in-scene **ChatDock** (WoW-style ambient box)」——`chat-dock.tsx` 已删（`chat.md:68` 记录），现在的第二个 surface 是 `shell/chat-card.tsx` |
| L36 | `TAG` | **无** | `// Logman tag for this module (ai/PROJECT.md §已有功能资产 keeps the domain tag pool).` | — |
| L38 | `VANISH_MS` | 合格 | 保留原文 | — |
| L42 | `FRIENDS_VIEW` | 合格 | 保留原文 | — |
| L44 | `MsgReaction` | **无** | `// One emoji chip under a message: the tally, whether I'm in it, and who to name in the tooltip.` | — |
| L46 | `Msg` | **无**（字段行内注释齐全） | `// A message as the UI renders it: the DB row plus a formatted time, a side relative to the reader,`<br>`// the optimistic/failed/vanishing flags and the sticker's signed url.` | — |
| L65 | `colorFor` | 合格 | 保留原文 | — |
| L77 | `Conv` | **冗长**（5 行，讲的是 `convsFor` 不是 `Conv`） | `// One entry in a conversation switcher — a world text channel or a DM.` | 把「convsFor is the single source for every conversation switcher…」整段移到 L87 `convsFor` 头上 |
| L87 | `convsFor` | **无**（靠上一条代讲） | `// The conversation set every switcher shows (dock tabs, hub nav, unread badges): the current`<br>`// world's text channels first (in-world only — channels are a world concept), then my DMs, which`<br>`// are account-level and therefore present in the lobby too.` | — |
| L95/96 | `FriendEntry` / `FriendRequest` | 合格 | 保留原文（可改 `// View models for the friends page.`，去掉已退役的「sidebar home-panel」措辞） | 「sidebar home-panel view models」中的 **sidebar** |
| L98 | `pad` | **无** | （trivial，可不加；若加：`// Zero-pad to two digits.`） | — |
| L100 | `fmtTime` | 合格 | 保留原文 | — |
| L106 | `errMsg` | **无** | `// Any thrown value → a string safe to show or log (Supabase throws both Errors and plain objects).` | — |
| L110 | `mergeRows` | 合格 | 保留原文 | — |
| L116 | `rxKey` | **无** | `// A reaction's identity inside one message: one row per user per emoji.` | — |
| L117 | `otherOf` | **无** | `// The other participant of a DM channel.` | — |
| L123 | `useChatThreads` | 合格但不完整（没说返回面） | `// Single source of truth for every conversation, shared by both chat surfaces. Loads each`<br>`// channel's latest page once, then keeps the stores live from the two broadcast topics — our own`<br>`// writes included, since the DB echo is the only render path. Returns the conversation lists, the`<br>`// rendered threads, the read cursors and every mutation the surfaces can trigger.` | — |
| L165 | `nameMap` | **无** | `// Display names; world-member profiles win over friend profiles when both know an id.` | — |
| L167 | `emotesById` | **无** | `// Sticker lookup for the row → Msg projection below.` | — |
| L174 | `emoteViews` | 合格 | 保留原文 | — |
| L178 | `threads` | 合格 | 保留原文 | — |
| L222 | `dmConvs` | **冗长**（提到已退役的「home 面板 私信区」和 mockup 文件名） | `// DM conversations for every switcher; hint = the latest message, so a DM row reads like a`<br>`// conversation list entry.` | 「/ home 面板 私信区」与裸文件名「mockup friends-page.html」（要么给全路径，要么删） |
| L234 | `friends` | **过时**（「home-panel friend view models」） | `// Accepted friendships as rows for the friends page, each carrying its DM channel if one exists.` | 「home-panel」 |
| L245 | `requestsIn` | **无** | `// Friend requests waiting for my answer.` | — |
| L255 | `requestsOut` | **无** | `// Friend requests waiting for theirs.` | — |
| L268 | `startVanish` | 合格 | 保留原文 | — |
| L287 | `absorb` | 合格 | 保留原文（参数类型改用 `ChannelReadRow[]`，见 §4.3） | — |
| L321 | `onEvent` | 合格 | 保留原文 | — |
| L362 | world effect | 合格（分隔线注释） | 保留原文 | — |
| L386 | 40 分钟续签 | 合格但引用不全 | `// signed urls expire after an hour — re-sign well before that so stickers survive long idle`<br>`// sessions (same bug class as ST-O in ai/features/timeline.md)` | 裸编号 `ST-O` → 补路径 |
| L427 | account effect | 合格 | 保留原文 | — |
| L486 | `loadOlder` | 合格 | 保留原文 | — |
| L518 | `deliver` | 合格但裸编号 | `// Run one write under the optimistic bookkeeping: mark the id pending, clear any earlier failure,`<br>`// and flip it to failed if the write throws. `exec` is the real write (text or sticker) so both`<br>`// kinds share one ledger. Content is never dropped implicitly — a failed bubble waits for an`<br>`// explicit retry or discard.` | 裸编号「(D-2/D-7)」→ 落点移到文件头（见 §6） |
| L537 | `appendLocal` | **无** | `// Put an optimistic row at the tail of a conversation before its write starts.` | — |
| L541 | `send` | **无** | `// Send text: the optimistic bubble appears now, the client-side id makes the echo land on it.` | — |
| L563 | `sendStickerTo` | 合格但裸编号 | `// Sticker send rides the exact same optimistic pipeline as text.` | 裸编号「(B-3)」→ 文件头 |
| L583 | `retrySend` | **无** | `// Re-run the write for a failed message — text or sticker — keeping its id so the echo still matches.` | — |
| L601 | `discardFailed` | 合格 | 保留原文 | — |
| L616 | `editMessage` | 合格 | 保留原文 | — |
| L630 | `deleteMsg` | 合格 | 保留原文 | — |
| L639 | `toggleReaction` | 合格 | 保留原文 | — |
| L657 | `markRead` | 合格 | 保留原文 | — |
| L673-686 | `searchWeb` / `importEmoteUrl` / `addEmoteFile` / `removeEmoteById` | 合格（一组共用注释） | 保留原文 | — |
| L689-698 | `addFriend` / `acceptRequest` / `removeFriend` | 合格（一组共用注释） | 保留原文（去掉「home panel」） | 「(home panel)」 |

### 5.2 `src/themes/cinnaglass/channel-screen.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-9 | 文件头 | **过时 + 冗长**（9 行里 4 行讲已退役的 sidebar / ChatDock） | `// channel-screen.tsx — the covering CHAT HUB: it floats over the stage so you can talk with the`<br>`// scene tucked away. Opened from the ChatCard's expand button (WorldPage.tsx); once open, its own`<br>`// left column switches between every conversation convsFor() yields, plus a pinned friends entry.`<br>`// Threads are shared with the stage-side ChatCard — same store, two experiences.`<br>`// Specs: ai/features/chat.md §三; message states / hover bar / reactions / delete particles follow`<br>`// D-7 in ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md (historical register);`<br>`// the read avatar renders in DMs only (D-7-3 revision, ai/features/chat.md:61).` | ①「opened from the **sidebar** (text channels AND DMs — **the sidebar's only chat trigger**)」——无 sidebar，入口是 `WorldPage.tsx:499-502` 的 `onExpand`；②「The **sidebar entries** are summon buttons」；③「Threads are shared with the in-scene **ChatDock**」；④「ux decisions.md」文件名实为 `ux-decisions.md` 且在 history 目录 |
| L19 | `QUICK_EMOJI` | 合格 | 保留原文 | — |
| L21 | `VANISH_COLORS` | **无** | `// Glass-dust palette for the delete effect.` | — |
| L23 | `ChannelStyles` | **无**（148 行 CSS 组件） | `// All hub CSS, injected as one <style> so the hub stays a single file to read. Block comments`<br>`// below cite D-7 clause numbers from the historical register named in the file header.` | — |
| L73-78 | chatAlign 块 | 合格 | 保留原文 | — |
| L91/98/105/110/134/141 | D-7 ①②⑦④⑤⑥ 块注释 | 合格（编号带子句号，有信息量） | **保留**——这些不是裸编号，①②④⑤⑥⑦ 精确对应 D-7 表的行 | — |
| L126 | 贴纸块「(B-1/B-3, LINE-style)」 | 合格 | 保留（落点已在文件头） | — |
| L147 | 已读头像「DMs ONLY (D-7-3 修订)」 | 合格 | 保留 | — |
| L172 | `ChannelScreenProps` | **无**顶注（字段行内注释质量很高） | `// Everything the hub renders and every mutation it can trigger; all state is lifted to WorldPage`<br>`// so the ChatCard and the hub read the same store.` | — |
| L210 | `explodeBubble` | 合格 | `// Dissolve one bubble into glass-star dust: samples the element's box into a 7px particle grid on`<br>`// the hub-wide canvas and animates it left→right until every particle fades. Runs one rAF loop per`<br>`// call and clears the canvas when done.` | 「(telegram-style, D-7 ⑦)」中的裸 telegram 比喻可留，编号落点已在文件头 |
| L264 | `ChannelScreen` | **无**（428 行，全分区最大的无注释导出） | `// The hub. Resolves convId into a text channel, a DM or the friends page, then renders the`<br>`// switcher plus that conversation. Viewing a conversation reports the read cursor (onSeen);`<br>`// scrolling to the top pulls the previous page and keeps the viewport pinned while it prepends.` | — |
| L308-312 | `anchorRef` | 合格 | 保留原文 | — |
| L313 | `prevConv` 渲染期重置块 | 合格 | 保留原文（若走 §3.2 批 5 的 key-reset，这段连同注释一起删） | — |
| L330 | `readCursorIdx` | 合格 | 保留原文 | — |
| L345 | 清锚点 effect | 合格 | 保留原文 | — |
| L349 | 滚动 effect | **无**顶注（内部有行内） | `// Keep the view at the bottom on new messages, or restore the reading position after an older`<br>`// page was prepended.` | — |
| L364 | onSeen effect | 合格 | 保留原文 | — |
| L370 | 粒子 effect | 合格 | 保留原文 | — |
| L383 | `onScroll` | 合格 | 保留原文 | — |
| L394 | `submit` | **无** | `// Send the composer's text and close the emoji palette; the draft clears even if the write fails,`<br>`// because the failed bubble keeps the content.` | — |
| L403 | `insertEmoji` | 合格 | 保留原文 | — |
| L413 | `beginEdit` | **无** | `// Enter inline edit for one of my own messages (closes any open reaction picker first).` | — |
| L418 | `commitEdit` | **无** | `// Commit the inline edit and leave edit mode; an empty value is dropped by the hook.` | — |

### 5.3 `src/themes/cinnaglass/friends-page.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-7 | 文件头 | **过时**（1 处）+ 引用需补 | `// friends-page.tsx — the FRIENDS PAGE inside the chat hub: the hub's left nav pins a 好友 entry`<br>`// above the DM list and selecting it swaps the right pane to this page. Top tabs filter the views`<br>`// (全部 / 待处理 / ＋添加好友); an 在线 tab is reserved until presence lands — no fake online states.`<br>`// Friend management lives only here. Mockup 方案 A:`<br>`// ai/design_system/uiux/research/cinnaglass-history/friends-page.html`<br>`// Status (UI frozen, data layer kept): ai/features/chat.md §五.3.` | 「**the sidebar home panel just links in**」——sidebar home panel 已随 Discord 壳层退役；「See ai/features/chat.md **DM 阶段**」——chat.md 无此章节，它在 `chat.md:13` 被登记为断链 |
| L11 | `FriendsStyles` | **无** | `// Friends-page CSS, injected alongside the hub's own <style>.` | — |
| L62 | `Tab` | **无** | `// 全部 / 待处理 / ＋添加好友 — the 在线 tab is rendered but disabled.` | — |
| L64 | `FriendsPageProps` | **无**顶注（字段行内注释齐全） | `// All data and actions come from useChatThreads via the hub; this page holds no server state.` | — |
| L75 | `FriendsPage` | **无** | `// Renders one of the three tabs over the same friend lists. Removing a friend and declining or`<br>`// cancelling a request are the same call (onRemove) — the row just reads differently.` | — |
| L82 | `submitAdd` | **无** | `// Send a friend request by email, then report the resolved display name or the server's reason`<br>`// inline. Guards against double submits while the request is in flight.` | — |

### 5.4 `src/themes/cinnaglass/emote-picker.tsx` 与 `emoji-data.ts`

`emote-picker.tsx`：

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-7 | 文件头 | 合格但引用不全 | `// emote-picker.tsx — the full emoji/sticker picker: search + tabs 🕐recent / 😊emoji / 💗world`<br>`// stickers / 🎞️gif(placeholder). One component, two modes — the composer's 😊 (emoji inserts,`<br>`// stickers send) and the reaction bar's ➕ (emoji only; stickers are not reactions). The world tab`<br>`// hosts the import flow: Tenor search via the emotes edge function, local upload, paste-URL.`<br>`// Specs: ai/features/chat.md §三 (subtask EMO-4 not yet backfilled, see chat.md:13);`<br>`// mockup 方案 B: ai/design_system/uiux/research/cinnaglass-history/emoji-picker.html;`<br>`// paper-solid panel per D-9 in .../cinnaglass-history/ux-decisions.md:80.` | 裸文件名「mockup emoji-picker.html」（无路径）；裸编号「D-7/B-1」「D-9」（补路径后保留编号） |
| L12 | `EmoteView` | **无**（且被数据层反向导入，见 §7.1） | `// A library emote plus its signed display url (null while the url is still being signed).` | — |
| L14/15 | `RECENT_KEY` / `RECENT_MAX` | **无** | `// Recently picked emoji, per browser (localStorage — never synced, never server state).` | — |
| L16 | `loadRecent` | **无** | `// Read the recent list, tolerating absent or corrupted storage.` | — |
| L25 | `PickerStyles` | **无** | `// Picker panel CSS; the hub only positions the panel (.chsc-pop), it does not style it.` | — |
| L83 | `Tab` | **无** | `// The world tab exists in composer mode only.` | — |
| L85 | `EmotePickerProps` | **无**顶注（`canImport` 有行内） | `// Emoji picking is always available; sticker picking and importing are composer-only.` | — |
| L97 | `EmotePicker` | **无**（235 行） | `// The picker. Two screens in one component: the browse screen (search + tabs) and the import`<br>`// screen reached from the world tab's ＋ tile. A non-empty search box overrides the emoji tabs but`<br>`// not the world tab, which filters its own tiles by sticker name.` | — |
| L110 | `pickEmoji` | **无** | `// Emit the pick and move it to the front of the per-browser recent list.` | — |
| L121-123 | `query` / `emojiHits` / `worldHits` | **无** | `// Search is case-insensitive over the Chinese-first keyword strings; null hits = not searching.` | — |
| L125 | `runWebSearch` | **无** | `// Search Tenor through the edge function; an unconfigured API key surfaces as an inline message,`<br>`// not a throw. Seeds the sticker name from the query when the user hasn't typed one.` | — |
| L142 | `doImport` | **无** | `// Shared wrapper for every import path (search result / pasted url / local file): one in-flight`<br>`// guard, one success message, one error surface. The library itself refreshes via the`<br>`// world_emotes broadcast, not from here.` | — |
| L157 | `nameOr` | **无** | `// The typed alias, or a fallback, clamped to the 24-char column limit.` | — |

`emoji-data.ts`：

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-4 | 文件头 | 合格但引用不全 | 保留原文，末尾把「(chat.md EMO-4)」改成 `// Spec: ai/features/chat.md §三 (subtask EMO-4 not yet backfilled, see chat.md:13).` | 裸编号「chat.md EMO-4」 |
| L5/6 | `EmojiEntry` / `EmojiCategory` | **无** | `// e = the character, k = space-separated search keywords (Chinese first, then English).` | — |
| L8 | `EMOJI_CATEGORIES` | **无**（文件头代讲） | `// Display order in the emoji tab; also the source of the flat search index below.` | — |
| L210 | `ALL_EMOJI` | 合格 | 保留原文 | — |

### 5.5 `src/themes/cinnaglass/shell/chat-card.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-4 | 文件头 | 合格但引用不全，且漏了最重要的契约 | `// chat-card.tsx — the stage-side chat card (bottom left): the ambient surface you talk through`<br>`// without leaving the scene. It shows the FIRST conversation convsFor() yields and has no tabs —`<br>`// the covering hub (channel-screen.tsx) is one expand away. Tail 40 messages, vanishing ones`<br>`// filtered out, opening it reports the read cursor.`<br>`// Built 1:1 against the codex pixel spec §5.6 (277-wide dense-glass card, 61px ringed avatars,`<br>`// 17px bubbles, floating reaction pill, 56px input group):`<br>`// ai/codex-visual/20260811-055917Z/codex-report.md:171. Materials come from --cg-* tokens.` | 无过时叙述；**缺失**的是「只渲染首个会话 / 尾部 40 / 过滤 vanishing」这条契约——今天它只写在 `ai/features/chat.md:62`，源码里没有 |
| L13 | `QUICK` | **无** | `// One-tap reactions; they send as ordinary messages, not as reaction rows.` | — |
| L18 | `AVATARS` | **无** | `// Fixed two-person avatar art (public/avatars); real per-account avatars are not wired yet.` | — |
| L23 | `ChatCardProps` | **无**顶注（`onExpand` 有行内） | `// The card owns no server state — everything comes from useChatThreads through WorldPage.` | — |
| L35 | `ChatCard` | **无**（86 行） | `// Renders the first conversation only (no switcher, by design) and keeps the list pinned to the`<br>`// bottom. Opening the card, or a new message arriving while it is open, moves our read cursor.` | — |
| L40-42 | `convs` / `cur` / `msgs` | **无** | `// The tail the card shows: 40 messages, already-deleted ones filtered out so no particle plays here.` | — |
| L44 | onSeen effect | 合格 | 保留原文 | — |
| L49 | 滚底 effect | **无** | `// Stick to the newest message.` | — |
| L54 | focus effect | **无** | `// Opening the card puts the caret in the composer — Enter opens it, so typing should just work.` | — |
| L60 | `submit` | **无** | `// Send the trimmed draft and clear the box; empty input is a no-op.` | — |
| L122 | `ChatCardStyles` | **无**（95 行 CSS，内部 spec 注释质量高） | `// Card CSS; the /* spec: */ comments below quote the pixel values from the codex report named in`<br>`// the file header.` | — |

### 5.6 `src/lib/chat.ts` / `friends.ts` / `emotes.ts` / `logman.ts`

> 这四个文件的注释质量是**全项目最好的**（`lib/chat.ts` 14 个导出里 12 个有准确的一句话职责注释）。下表只列缺口。

`lib/chat.ts`：

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-7 | 文件头 | 合格但裸编号 | 保留 L2-7 的投递模型原文；L1 改为 `// chat.ts — data access for channel chat. Spec: ai/features/chat.md §三「lib/chat.ts」`<br>`// (subtasks CH-12 / CH-17 were never backfilled into that doc — see chat.md:13).` | 裸编号「(chat.md CH-12 / CH-17)」——**编号保留**，只补落点 |
| L12-15 | `CHANNEL_COLS` / `MESSAGE_COLS` / `REACTION_COLS` / `READ_COLS` | **无** | `// Select lists. These must stay in sync with src/types/chat.ts — the row types are hand-written,`<br>`// nothing generates them.` | — |
| L17 | `currentUserId` | **无**（且与 `friends.ts:10` 同体，见 §4.1） | 删除本地实现，改为从 `@/lib/supabase.ts` 导入 | — |
| L38 | `MessagePage` | **无**顶注（`before` 有行内） | `// Cursor + size for one page of history.` | — |
| L44 | `MESSAGE_PAGE_SIZE` | **无** | `// Also the "is there more" probe: a short page means we reached the start of the conversation.` | — |
| L92 | `addReaction` | **无** | `// React to a message as me; the PK (message, user, emoji) makes a repeat insert a conflict.` | — |
| L98 | `removeReaction` | **无** | `// Take back one of my reactions.` | — |
| 其余 11 个导出 | — | 合格 | 全部保留原文 | — |

`lib/friends.ts`：

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-4 | 文件头 | 引用失效 | `// friends.ts — data access for the account-level friend system. Friendships are canonical pairs`<br>`// (user_a < user_b); accepting a request triggers the DM channel creation server-side. Changes`<br>`// reach both accounts through their user:{uid} broadcast topics.`<br>`// Status (UI frozen, table must not be dropped): ai/features/chat.md §五.3.` | 「(chat.md **DM 阶段**)」——chat.md 无此章节（`chat.md:13` 登记为断链） |
| L8 | `COLS` | **无** | `// Select list; keep in sync with FriendshipRow in src/types/chat.ts.` | — |
| L10 | `currentUserId` | **无**（同体） | 删除本地实现，改为从 `@/lib/supabase.ts` 导入 | — |
| L17 | `pairOf` | **无** | `// Canonical order for a friendship pair — both rows and queries must use it.` | — |
| 其余 4 个导出 | — | 合格 | 全部保留原文 | — |

`lib/emotes.ts`：

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-4 | 文件头 | 合格但裸编号 | L1-2 改为 `// emotes.ts — data access for the world emote (sticker) library. Spec:`<br>`// ai/features/chat.md §三「lib/emotes.ts」(subtask EMO-3 was never backfilled — see chat.md:13).`；L3-4 原文保留 | 裸编号「(ai/features/chat.md 表情系统 EMO-3)」——编号保留，补落点 |
| L8 | `COLS` | **无** | `// Select list; keep in sync with EmoteRow in src/types/chat.ts.` | — |
| L10 | `STICKER_MAX` | 合格 | 保留原文 | — |
| L42-44 | `addEmoteFromFile` 内的取 uid | — | 换成共用的 `currentUserId()`（S06 分区执行，见 §4.1） | — |
| L69 | `downscaleToWebp` | **无**顶注（内部行内注释好） | `// Re-encode an image file to webp within STICKER_MAX on the long edge. Throws on non-image input`<br>`// (createImageBitmap) and always releases the bitmap.` | — |
| L89 | `describeFnError` | 合格 | 保留原文 | — |

`lib/logman.ts`：

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-5 | 文件头 | 合格（`ai/PROJECT.md:96` 确有标签池，措辞准确） | 建议**补一句**说明使用边界：`// Convention: only modules with UI context log. lib/* data access throws instead, so a failure is`<br>`// reported once, where there is something to tell the user.` | — |
| L6 | `Logman` | 合格 | 保留原文 | — |

### 5.7 `src/types/chat.ts`

| 位置 | 名称 | 现状 | 建议注释原文 | 删除的旧注释摘句 |
|---|---|---|---|---|
| L1-3 | 文件头 | **引用失效** | `// chat.ts — chat backend types, one per DB table (channels / messages / message_reactions /`<br>`// channel_reads / friendships / world_emotes). Hand-written and hand-maintained: the authoritative`<br>`// column list is ai/PROJECT.md §数据库, and every change here must also update the *_COLS select`<br>`// lists in src/lib/chat.ts. Feature doc: ai/features/chat.md.` | 「see ai/features/chat.md + **ai/features/channel.md**」——`channel.md` 不存在，`chat.md:13` 明写它「随 Discord 壳层作废且不恢复，术语与数据模型以 ai/PROJECT.md §数据库 为准」 |
| L5-9 | `ChannelType` | 合格 | 保留原文 | — |
| L11 | `Channel` | **无**顶注（`ChannelType` 的注释代讲变体模型） | 现状可接受；若加：`// A channels row.` | — |
| L24 | `FriendshipRow` | 合格 | 保留原文 | — |
| L37 | `ChatMessageRow` | 合格 | 保留原文 | — |
| L50 | `EmoteRow` | 合格 | 保留原文 | — |
| L61 | `EmoteSearchResult` | 合格 | 保留原文 | — |
| L64 | `ReactionRow` | 合格，但**声明的字段撒谎** | 保留注释；**删掉 L68 的 `channel_id: string;`**（见 §7.3） | — |
| L74 | `ChannelReadRow` | 合格 | 保留原文 | — |
| L84 | `WorldEvent` | 合格 | 保留原文 | — |

---

## 6. 失效 / 不完整引用与应改目标

「状态」：❌ = 目标不存在或叙述与现状不符，必改；⚠️ = 目标存在但路径缺失 / 指向历史文档，应补全；✅ = 有效。

| # | 文件:行 | 现引用 | 状态 | 应改为 |
|---|---|---|---|---|
| 1 | `chat-data.ts:2` | `the in-scene ChatDock (WoW-style ambient box)` | ❌ 组件已删（`chat.md:68`「🗑 已删除：`chat-dock.tsx`」） | `the stage-side ChatCard (shell/chat-card.tsx)` |
| 2 | `chat-data.ts:3` | `ai/features/chat.md` | ✅ 存在 | 不改 |
| 3 | `chat-data.ts:221` | `mockup friends-page.html`（裸文件名） | ⚠️ 文件在 `ai/design_system/uiux/research/cinnaglass-history/friends-page.html` | 删（该 memo 不需要引 mockup）或补全路径 |
| 4 | `chat-data.ts:386` | `same bug class as ST-O` | ⚠️ `ST-O` 在 `ai/features/timeline.md` | `... as ST-O in ai/features/timeline.md` |
| 5 | `chat-data.ts:515` | `(D-2/D-7)` | ⚠️ 两者都在**历史**登记簿 `.../cinnaglass-history/ux-decisions.md`（D-2 在 :11，D-7 在 :53）；`uiux/cinnaglass/decisions.md:16` 明写「D-2～D-8 属旧范围记录，引用前查当前 Feature」 | 编号移到文件头并给全路径：`// Decisions cited below live in ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md` |
| 6 | `chat-data.ts:562` | `(B-3)` | ⚠️ `B-1`/`B-3` 只在 mockup `.../cinnaglass-history/emoji-picker.html` 里 | 同上，落点写 `emoji-picker.html` |
| 7 | `channel-screen.tsx:1-6` | `opened from the sidebar` / `the sidebar's only chat trigger` / `The sidebar entries are summon buttons` | ❌ 无 sidebar；真入口是 `WorldPage.tsx:499-502` 的 `onExpand` | 改为 `opened from the ChatCard's expand button (WorldPage.tsx)` |
| 8 | `channel-screen.tsx:6` | `Threads are shared with the in-scene ChatDock` | ❌ 同 #1 | `... with the stage-side ChatCard` |
| 9 | `channel-screen.tsx:8` | `ux decisions.md D-7` | ⚠️ 文件名实为 `ux-decisions.md`，且在 history 目录 | `ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md` D-7（:53） |
| 10 | `channel-screen.tsx:9` | `(D-7-3 修订: 频道不显示已读)` | ⚠️ D-7-3 的**唯一正文**在 `ai/features/chat.md:61` 的模块表，不在 ux-decisions.md | `(D-7-3 revision — ai/features/chat.md:61)` |
| 11 | `channel-screen.tsx:9` | `See ai/features/chat.md` | ✅ | 不改 |
| 12 | `friends-page.tsx:2` | `mockup ai/design_system/uiux/research/cinnaglass-history/friends-page.html 方案 A` | ✅ 路径完整且文件存在 | 不改 |
| 13 | `friends-page.tsx:6` | `the sidebar home panel just links in` | ❌ 无 sidebar home panel | 删该句 |
| 14 | `friends-page.tsx:7` | `See ai/features/chat.md DM 阶段` | ⚠️ chat.md 无「DM 阶段」章节；`chat.md:13` 把它登记为断链 | `ai/features/chat.md §五.3「好友 / DM 定位待定」` |
| 15 | `emote-picker.tsx:1` | `(chat.md EMO-4, ...)` | ⚠️ 编号在 `chat.md:13`/`:80` 登记为待回填 | `ai/features/chat.md §三「emote-picker.tsx / emoji-data.ts」(subtask EMO-4 not backfilled — chat.md:13)` |
| 16 | `emote-picker.tsx:2` | `mockup emoji-picker.html`（裸文件名） | ⚠️ 在 `.../cinnaglass-history/emoji-picker.html` | 补全路径 |
| 17 | `emote-picker.tsx:5` | `(D-7/B-1)` | ⚠️ 同 #5/#6 | 落点移文件头 |
| 18 | `emote-picker.tsx:7` | `Panel is paper-solid (D-9)` | ⚠️ D-9 在 `.../cinnaglass-history/ux-decisions.md:80`；`decisions.md:16` 说 D-9～D-12 不能覆盖 U-01～U-04 | 补路径，并在文件头注明「historical register」 |
| 19 | `emoji-data.ts:1` | `(chat.md EMO-4)` | ⚠️ 同 #15 | 同 #15 |
| 20 | `chat-card.tsx:1-2` | `codex pixel spec (§5.6)` | ⚠️ 有效但无路径：`ai/codex-visual/20260811-055917Z/codex-report.md:171`「### 5.6 左下聊天卡」 | 补全路径 + 行号 |
| 21 | `lib/chat.ts:1` | `(chat.md CH-12 / CH-17)` | ⚠️ 编号在 `chat.md:13`/`:80` 登记为待回填 | `ai/features/chat.md §三「lib/chat.ts」(CH-12 / CH-17 not backfilled — chat.md:13)` |
| 22 | `lib/friends.ts:1` | `(chat.md DM 阶段)` | ⚠️ 同 #14 | `ai/features/chat.md §三「lib/friends.ts」（状态：UI 收起）` |
| 23 | `lib/emotes.ts:2` | `(ai/features/chat.md 表情系统 EMO-3)` | ⚠️ chat.md 无「表情系统」小节标题 | `ai/features/chat.md §三「lib/emotes.ts」(EMO-3 not backfilled — chat.md:13)` |
| 24 | `lib/logman.ts:4` | `ai/PROJECT.md's tag pool` | ✅ `PROJECT.md:96` 确有，且明写「在用标签：chat」 | 不改（可补 `§已有功能资产`） |
| 25 | `types/chat.ts:2-3` | `ai/features/chat.md + ai/features/channel.md` | ❌ `channel.md` 不存在；`chat.md:13` 明写它作废不恢复，真源是 `ai/PROJECT.md §数据库` | `ai/PROJECT.md §数据库`（保留 `ai/features/chat.md` 作为功能文档） |

**跨分区登记（属 02-S06，本分区不动，只记）**：`WorldPage.tsx:113`「see channel.md」（同 #25）、`WorldPage.tsx:131-134`「the dock is stage-owned」+「DMs stay mock」（`chat.md:85` 已把它列为待清理的陈旧注释）、`WorldPage.tsx:242`「ai/UX.md §4」→ 按 `ai/UX.md:9` 的对照表应改 `ai/design_system/uiux/interaction.md`、`WorldPage.tsx:344`「ai/UX.md §2」→ `ai/design_system/props.md` + `uiux/uiux.md`。

---

## 7. 依赖方向与类型边界

### 7.1 `types/chat.ts`（DB 行）与 `chat-data.ts`（视图模型）的边界

**边界本身是清楚的，且方向正确**：

```
types/chat.ts   纯 DB 行 + WorldEvent 联合        （零 import，被 7 个模块消费）
      ↑
lib/{chat,friends,emotes}.ts   数据访问          （只 import types/ 与 supabase）
      ↑
chat-data.ts    视图模型 Msg / Conv / FriendEntry （import lib/ 与 types/）
      ↑
channel-screen / friends-page / chat-card        （import chat-data 与 types/）
```

`Msg`（`chat-data.ts:46`）是**纯视图模型**，不是 DB 行：`from: 'me' | 'them'` 依赖当前用户、`time` 是格式化字符串、`pending`/`failed`/`vanishing` 是客户端账本、`emoteUrl` 是签名 URL、`reactions` 是按 emoji 聚合后的结果。它**不应该**进 `types/chat.ts`——那个文件的文件头自己定义了范围「chat backend types (DB 表)」，混进视图模型会让「改表要改哪里」这个问题重新变模糊。

**唯一的逆向依赖**：`chat-data.ts:32` `import type { EmoteView } from './emote-picker'`。`EmoteView = EmoteRow & { url: string | null }`（`emote-picker.tsx:12`）是个视图模型，却定义在 UI 组件里，然后被数据层反向 import。

**建议**：把 `EmoteView` 搬到 `chat-data.ts`（和 `Msg`/`Conv`/`FriendEntry` 放一起，都是视图模型），`emote-picker.tsx` 与 `channel-screen.tsx` 改从 `chat-data` 导入。改动：
- `chat-data.ts:32` 删（定义移入本文件）
- `emote-picker.tsx:12` 删定义，改 `import type { EmoteView } from './chat-data';`（注意：`emote-picker` 会因此依赖 `chat-data`，但方向是 UI → 数据，正确）
- `channel-screen.tsx:13` 从 `import { EmotePicker, type EmoteView } from './emote-picker'` 拆成两条（`EmoteView` 改从 `chat-data` 来，它 L14 已经在 import `chat-data` 了，合并即可）
- `emote-picker.tsx:12` 今天是 `export type`，搬走后要保证没有别的消费者——`grep -rn "EmoteView" src` 只有这 3 个文件，✅

**风险**：低。`tsc -b` 全覆盖。但这会让 `emote-picker.tsx` 多一条对 `chat-data` 的依赖，如果日后想让 picker 成为可复用的独立组件，`EmoteView` 更该去 `types/chat.ts`（它确实只是 `EmoteRow` + 一个 url，算「后端行的展示增广」，勉强算得上后端类型）。**两个方案都比现状好；推荐 `chat-data.ts`，因为它与 `Msg` 的性质一致。**

### 7.2 `Msg` 导入修复的正确落点

**现状**：`chat-card.tsx:10` `import type { Msg } from '../model';`，但 `model.ts`（24 行）只有 `Weather` / `Profile` / `Room` / `CalEvent` / `Alarm` / `Widgets` / `WidgetPos`，**从来没有过 `Msg`**（`git log -S "export type Msg" -- model.ts` 零命中；`model.ts` 自 `7b12ed7` 移植进来后没改过）。所以这是**移植时就写错的 import**，不是「Msg 被搬走了」。

**一行改 import 源还是把 Msg 提到 types/chat.ts？——都不对，正确答案是两处 3 行的改动，且带一个行为变化。**

理由：把导入源改成 `'../chat-data'` 之后会**立刻出现第二个 TS 错误**——`chat-card.tsx:85-86` 读的是 `m.stickerUrl`：

```tsx
{m.kind === 'sticker' && m.stickerUrl ? (
    <img className="cc-sticker" src={m.stickerUrl} alt="" draggable={false} />
```

而 `chat-data.ts` 的 `Msg` 上这个字段叫 **`emoteUrl`**（L60）。`stickerUrl` 是那个从来不存在的 `model.Msg` 上的想象字段。

**建议修复（A 类，本轮可做）**：

```tsx
// chat-card.tsx — 三行合一，顺带修掉重复 import
import { convsFor, type Conv, type Msg } from '../chat-data';   // 替换今天的 L8 + L9 + L10

// L85-86
{m.kind === 'sticker' && m.emoteUrl ? (
    <img className="cc-sticker" src={m.emoteUrl} alt="" draggable={false} />
```

**必须向用户说明的行为变化**：今天 `m.stickerUrl` 在运行时**永远是 `undefined`**（`Msg` 对象根本没这个键，类型报错被 `vite` 的 esbuild 抹掉所以 dev 一直能跑）。也就是说**窄卡今天渲染不出任何贴纸**——贴纸消息会走 else 分支，显示成气泡里的 `:name:` 文本。修完之后窄卡会开始正常显示贴纸图片。这是**修 bug**，符合 `ai/features/chat.md:62` 对窄卡的描述，但它确实改变了屏幕上的东西，**要在 S07 汇报里单独点出来，不能混在「修类型错误」里一笔带过**。
附带：贴纸墓碑（`emoteGone`）在窄卡上会退回显示 `:name:` 文本，与大窗的 `✨ 这张贴纸已被移出表情库` 占位不一致。**本轮不补**（那是产品行为决定），只登记。

**为什么不把 `Msg` 提到 `types/chat.ts`**：见 §7.1——`types/chat.ts` 的契约是「一个类型对一张 DB 表」，`Msg` 不对任何表。如果日后走 §3.1 拆分，`Msg` / `MsgReaction` / `Conv` / `FriendEntry` / `FriendRequest` / `EmoteView` 应该一起落到 `themes/cinnaglass/chat/chat-types.ts`。

**验证**：`npx tsc -b` 从 1 错变 0 错（这是全仓第一次类型干净，`pnpm build` 也会因此第一次能过——`src-review.md:§1.2` 记录了基线上 build 必失败）；冒烟：打开窄卡，在大窗发一张贴纸，确认窄卡显示图片而不是 `:name:`。

### 7.3 `ReactionRow.channel_id` 幻列

| 证据 | 位置 |
|---|---|
| 类型声明了 | `types/chat.ts:68` `channel_id: string;` |
| select 不取 | `lib/chat.ts:14` `REACTION_COLS = 'message_id, user_id, world_id, emoji, created_at'` |
| 返回值被强断言 | `lib/chat.ts:109` `return (data ?? []) as ReactionRow[];` ← **类型在这里撒谎**：运行时对象没有 `channel_id` 键 |
| PROJECT.md 的列清单也没有 | `ai/PROJECT.md:110` `message_reactions \| message_id / user_id / world_id / emoji / created_at` |
| 全仓零读取 | `grep -rn "channel_id" src` → 12 处命中全是 `messages` / `channel_reads` 的，**没有一处从 reaction 上读** |
| 唯一的「写」是伪造的 | `chat-data.ts:649` 乐观 reaction 里写死 `channel_id: ''` ——只为了让对象满足类型 |

**建议（A 类）**：删 `types/chat.ts:68` 一行 + 删 `chat-data.ts:649` 的 `channel_id: '', ` 一段。
**风险**：低但不为零。`WorldEvent` 的 `message_reactions` record 直接来自 DB trigger 的整行；**如果线上表真有这一列**，广播 payload 里会带上它，删类型只是让 TS 不再声明它，运行时多余的键不影响任何逻辑（全仓零读取）。反过来，留着它才有害——它让 `as ReactionRow[]` 成了假承诺，下一个人会以为 `rx.channel_id` 可用。
**验证**：`tsc -b` + 加 / 取消一个 reaction 的冒烟（本端立刻变化 + 对端收到）。
**登记给第三步**：`ai/PROJECT.md:110` 的列清单标注「以前端实际 select 为准 / 待核」，本条应在第三步连 MCP 核对线上 DDL 时一并确认。

### 7.4 有没有 UI 层类型下沉到 lib

**没有。** `lib/chat.ts` 导出的 `MessagePage`（L38）与 `MESSAGE_PAGE_SIZE`（L44）是数据访问自己的概念（游标 + 页大小），被 `chat-data.ts` 消费用于判断「是否到达会话开头」（L312、L505），方向正确。`lib/emotes.ts` 的 `EmoteSearchResult` 定义在 `types/chat.ts:61`，也正确。`lib/*` 三个模块**零 `themes/` 导入**、**零 React 导入**，可以直接搬去别的前端而不带 UI 包袱。这一层是本分区最健康的部分。

---

## 8. 建议执行清单

### A 类 — 本轮可直接做（零 / 极小行为面，逐项有验证手段）

按建议执行顺序排列。每项完成后跑 `npx tsc -b` + `npx eslint src` + `npx vite build`。

| # | 项 | 改动面 | 风险 | 验证方法 |
|---|---|---|---|---|
| A1 | **`Msg` 导入修复**：`chat-card.tsx` L8/L9/L10 合并为一条 `import { convsFor, type Conv, type Msg } from '../chat-data';`，L85/L86 的 `m.stickerUrl` → `m.emoteUrl` | 1 文件 4 行 | **中**——**有行为变化**：窄卡今天渲染不出贴纸（`stickerUrl` 运行时恒 undefined），修完会开始显示。必须在 S07 单独向用户点出 | `tsc -b` 从 1 错 → **0 错**（全仓第一次类型干净，`pnpm build` 首次可过）；冒烟：大窗发贴纸 → 看窄卡是否出图 |
| A2 | **`ReactionRow.channel_id` 字段对齐**：删 `types/chat.ts:68`、删 `chat-data.ts:649` 的 `channel_id: ''` | 2 文件 2 行 | 低 | `tsc -b`；冒烟：加 / 取消 reaction，两端同步 |
| A3 | **`absorb` 参数类型对齐**：`chat-data.ts:288` 的内联结构类型换成 `ChannelReadRow[]`（加一个 type import） | 1 文件 2 行 | 极低 | `tsc -b`（两个调用点传的本来就是 `ChannelReadRow[]`） |
| A4 | **`currentUserId` 复用**：在 `lib/supabase.ts` 新增 `currentUserId(action?)`；删 `lib/chat.ts:17-22` 与 `lib/friends.ts:10-15` 的本地实现，改为导入 | 3 文件（+7 / −12 行） | 低 | `tsc -b`；登出后触发一次写入，确认报错仍是「未登录。」。**`worlds.ts` / `posts.ts` / `emotes.ts:42-44` 的三处内联留给 02-S06，避免两个分区改同一文件** |
| A5 | **失效引用改指向**：§6 表里 ❌ 的 5 条（#1 #7 #8 #13 #25）+ ⚠️ 的 15 条补路径 | 9 文件，纯注释 | 极低 | `git diff` 只含注释行；跑一次链接检查（`grep -o "ai/[a-z_/-]*\.md" src -r` 后逐条 `test -f`） |
| A6 | **注释审计落实**：按 §5 各表补 47 条缺失的职责注释、删 4 类过时叙述、按 §5.0 公约把编号统一收到文件头 | 11 文件，纯注释 | 极低 | `git diff` 只含注释行；**AST 去注释同一性校验**（`scan-structure.mjs` 的哈希）必须全部相同 |
| A7 | **`chat-data.ts` 小复用**（§4.2 的第 1、2、3 组）：`upsertReactions` / `without` / `dropMessageEverywhere` 三个纯函数 | 1 文件（约 −40 行） | 低-中 | `tsc -b`；scratchpad 里一次性 node 断言脚本比对三个函数的输入输出；冒烟第 ③⑥⑧ 条（failed 重试 / reaction / 对端删除） |
| A8 | **Prettier**：本分区 6 个文件随 02-S09 全局 `prettier --write` 一起处理 | — | 低 | `--check` 干净；`tsc -b` 不变 |

> A7 与 §3.1 批 1 有重叠——如果用户批准了 B1，A7 应并入 B1 一起做，不要做两遍。

### B 类 — 需用户批准（结构重构，方案已在 §3 给出）

| # | 项 | 规模 | 风险 | 验证方法 | 前置 |
|---|---|---|---|---|---|
| B1 | **拆 `useChatThreads`**（605 行 → 7 文件，见 §3.1，5 个批次） | `chat-data.ts` 全量重排，新增 6 文件；`WorldPage.tsx` **零改动**（返回面契约不变） | **高**（重复订阅 / 状态撕裂 / ref 时序 / cancelled 闭包，逐项缓解见 §3.1「风险」） | ① `tsc -b`（26 字段解构 = 现成契约测试）② 纯函数批次的 node 断言 ③ AST 同一性哈希 ④ 8 条固定冒烟，每批重跑 ⑤ `Logman` 订阅状态行对账 `SUBSCRIBED` 次数 | 无 |
| B2 | **拆 `ChannelScreen`**（428 行 → 6 文件，见 §3.2，5 个批次） | `channel-screen.tsx` 拆分，新增 5 文件 | **中**（批 1 CSS 层叠顺序；批 5 key-reset 改变切会话时编辑态的清理方式） | `tsc -b` + 每批同一份冒烟 + 批 1 后视觉对照截图 | 无（与 B1 独立，可并行批准） |
| B3 | **建 `themes/cinnaglass/chat/` 子目录**（5 文件，`chat-card.tsx` 留在 `shell/`，见 §2.1） | 4 行 import + `ai/features/chat.md` §三 7 行路径 + `ai/PROJECT.md` 项目结构树 | 低 | `tsc -b`（全静态导入，漏改必报）；`grep -rn` 复查文档里的路径 | **建议与 B1/B2 同批做**；单独做是两次无谓的路径扰动 |
| B4 | **`EmoteView` 归位**（从 `emote-picker.tsx` 移到 `chat-data.ts`，消除数据层→UI 的逆向依赖，见 §7.1） | 3 文件各 1-2 行 | 低 | `tsc -b`；`grep -rn "EmoteView" src` 确认只有 3 个消费者 | 可独立做；若做 B3 则并入 |
| B5 | **`channel-screen.tsx` → `chat-hub.tsx` 改名**（文件自称 CHAT HUB，`chat.md:61` 也叫「聊天中心」） | 1 行 import + 2 处文档 | 低 | 同 B3 | 收益低，**只建议在 B2/B3 执行时顺手做** |

### 不做（明确登记，避免下次重提）

- 不拆 `friends-page.tsx` / `emote-picker.tsx` / `emoji-data.ts`（§3.3 第 4-6 条）。
- 不抽 `<MessageBubble>`（§3.3 第 3 条）。
- 不给 `emojiHits` / `worldHits` 加 `useMemo`（§4.4：230 条量级，整洁性改动，不值得单独动文件）。
- 不引入 `supabase gen types` 消除 `*_COLS` 与行类型的双份维护（§4.3：会把整条生成链拉进项目，4 组 × 5-9 列仍可控；改为在 `types/chat.ts` 文件头写一句同步公约）。
- 不把 `Msg` 提到 `types/chat.ts`（§7.2）。
- 不改 `lib/*` 的「throw 不 log」约定（§4.5：设计自洽，只补一句公约注释）。
- `chat-card.tsx` 不搬出 `shell/`（§2 表：它属于舞台悬浮层，按层分组胜过按功能分组）。
