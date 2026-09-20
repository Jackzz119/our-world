# 03 · 分区 C：聊天链路

> 运行：2026-09-19-02 · 第三步 03-S05 · HEAD `f96fc63bb21725ab0f48d0ecb661f9e0fe4eac6d`（branch `dev`）
> 方式：**纯静态**——全文阅读 + 跨文件链路追踪 + 对照已安装的 `@supabase/supabase-js@2.98.0` / `@supabase/realtime-js@2.98.0` 源码。本机无 `.env.local`、Supabase MCP 401、Edge Function 源码不在仓库，**没有任何一条发现是实测**；线上 DDL / RLS / 触发器一律标「待核线上」。
> 授权：只诊断，不改 `src/`。

---

## 0. 覆盖

### 0.1 本分区拥有的文件（全文逐行读完）

| 文件 | 行数 | 读了什么 |
|---|---|---|
| `src/lib/chat.ts` | 204 | 4 组 `*_COLS`、11 个数据访问函数、`subscribeTopic` 订阅生命周期 |
| `src/lib/emotes.ts` | 102 | 贴纸库 CRUD、Edge Function 调用、`downscaleToWebp`、`describeFnError` |
| `src/lib/friends.ts` | 53 | 规范序对、RPC 找人、接受/解除 |
| `src/types/chat.ts` | 106 | 6 张表的行类型 + `WorldEvent` 广播联合类型 |
| `src/lib/supabase.ts` | 15 | 单例 client、`currentUserId` |
| `src/themes/cinnaglass/chat/chat-data.ts` | 189 | façade：5 个 hook 的组合、`threads` / `dmConvs` / 好友三视图 |
| `src/themes/cinnaglass/chat/store.ts` | 182 | 视图类型 + 9 个纯函数（`convsFor` / `mergeRows` / `upsertReactions` / `toMsgs` …） |
| `src/themes/cinnaglass/chat/use-message-store.ts` | 188 | 消息仓库：`absorb` / `handleEvent` / `startVanish` / `loadOlder` |
| `src/themes/cinnaglass/chat/use-world-stream.ts` | 74 | `world:{id}` 加载 + 订阅 + 重连补拉 |
| `src/themes/cinnaglass/chat/use-account-stream.ts` | 95 | `user:{uid}` 加载 + 订阅 + reload 注入 |
| `src/themes/cinnaglass/chat/use-emote-library.ts` | 95 | 贴纸库 + 签名 URL + 40 分钟续签 + 4 个动作 |
| `src/themes/cinnaglass/chat/use-optimistic-send.ts` | 235 | `deliver` 乐观账本 + 8 个写操作 |
| `src/themes/cinnaglass/chat/chat-hub.tsx` | 215 | 大窗壳：convId 解析、onSeen、三块子组件装配 |
| `src/themes/cinnaglass/chat/chat-hub.styles.tsx` | 154 | 大窗全部 CSS（状态类 sending/failed/vanish） |
| `src/themes/cinnaglass/chat/conv-nav.tsx` | 67 | 左栏：好友置顶 + 文字频道 + 私信 |
| `src/themes/cinnaglass/chat/message-list.tsx` | 318 | 消息流：滚动锚定、粒子、hover 操作栏、原位编辑、reaction、已读头像 |
| `src/themes/cinnaglass/chat/chat-composer.tsx` | 105 | 输入行：草稿、emoji 插入、贴纸发送 |
| `src/themes/cinnaglass/chat/bubble-dust.ts` | 74 | 删除粒子 canvas 动画 |
| `src/themes/cinnaglass/chat/friends-page.tsx` | 259 | 好友页三 tab（冻结区） |
| `src/themes/cinnaglass/chat/emote-picker.tsx` | 424 | 选择器两屏：浏览 + 导入（Tenor / URL / 文件） |
| `src/themes/cinnaglass/chat/emoji-data.ts` | 215 | 230 条 emoji 中文索引 |
| `src/themes/cinnaglass/shell/chat-card.tsx` | 236 | 窄卡：首个会话、尾 40、快捷反应、onSeen |
| `src/themes/cinnaglass/shell/use-world-chat-bubble.ts` | 43 | rail 红点 + 头顶气泡 |
| `src/pages/WorldPage.tsx` | 361 | 聊天接线部分：`useChatThreads`、三个提升态、Enter 闸门、`worldConvId`、两个 surface 的 props（其余归分区 D） |

### 0.2 跨分区追读（只读，不拥有）

| 文件 | 目的 |
|---|---|
| `src/lib/storage.ts:10-15, 118-128` | `signImageUrls`、`SIGNED_URL_TTL` / `SIGNED_URL_REFRESH_MS`（分区 B 拥有） |
| `src/lib/profiles.ts` 全文 | `getProfilesByIds`（好友名字来源） |
| `src/lib/worlds.ts:17-26` | `getMyWorld` → `uid` 来源 |
| `src/lib/logman.ts:1-20` | 「lib 抛错不打日志」公约 |
| `src/hooks/useAuth.ts` 全文 | `onAuthStateChange` 只更新 React 态，不碰 realtime |
| `src/pages/world/useWorldSession.ts:15-40` | `uid` / `profiles` 状态 |
| `src/themes/cinnaglass/room/room-scene.tsx:48-49, 171-207` | 头顶气泡渲染（`tagPos[bubble.seatId]`） |
| `src/themes/cinnaglass/shell/rail.tsx:79, 111, 119` | `unread` → `.rail-dot` |
| `src/themes/cinnaglass/surfaces/use-signed-thumbs.ts:31-39` | 对照：缩略图有 `visibilitychange` 重签，贴纸没有 |
| `src/main.tsx:10-12` | `StrictMode` 开着（effect 双跑） |
| `node_modules/.pnpm/@supabase+supabase-js@2.98.0/.../dist/index.mjs:228, 366-373` | realtime `accessToken` 回调接线、`TOKEN_REFRESHED → realtime.setAuth(token)` |
| `node_modules/.pnpm/@supabase+realtime-js@2.98.0/.../dist/module/RealtimeClient.js:274-285, 395, 644-672, 709-752` | `channel()` 同 topic 去重、心跳续 token、断线→`CHANNEL_ERROR`→重连、token 推送到已 join 的 channel |
| `.../RealtimeChannel.js:60-105, 139-188, 359-365, 585-622` | 状态回调、`errored → rejoinTimer`、`unsubscribe` 异步离开 |
| `ai/features/chat.md` 全文；`ai/PROJECT.md:98-132`；`ai/features/supabase.md`（grep 相关段）；`ai/project-audit/CONVENTIONS.md`；`ai/project-audit/INDEX.md`「第三步开工时要知道的」；`ai/project-audit/FINDINGS.md`（PA-016/024/030）；`runs/2026-09-19-01/evidence/chat-refactor-log.md:156-196`、`chat-structure-review.md:31-34, 591-` ；`ai/TODO.md:27, 111, 139, 145` | 文档声明与既有线索 |

---

## 1. 入口 → 链路图

所有链路的公共骨架：`WorldPage.tsx:133-159` 调 `useChatThreads(world?.id ?? null, uid, profiles)`（`chat-data.ts:49`），它组合 `useMessageStore`（:61）→ `useWorldStream`（:63）+ `useAccountStream`（:64）+ `useEmoteLibrary`（:66-67）+ `useOptimisticSend`（:74-75），在渲染期把 `[...channels, ...dmChannels]` 写进 `allChanRef`（:71），`threads` 由 `toMsgs` 在渲染期投影（:82-87）。两个 surface（窄卡 `WorldPage.tsx:286-299`、大窗 `:323-355`）都只吃这一份返回面。

### 1.1 发消息（文字）
1. 窄卡 `chat-card.tsx:81-86 submit()` → `onSend(cur, t)`；大窗 `chat-composer.tsx:49-54 submit()` → `onSubmit(text)` → `chat-hub.tsx:197` → `onSend(convId, v)`；两者都是 `WorldPage.tsx:297/337` 的 `send`。
2. `use-optimistic-send.ts:85-104 send()`：trim + 空守卫 + `allChanRef` 会话存在守卫（:87-88）→ `crypto.randomUUID()`（:89）→ `appendLocal` 追加本地行（`world_id:null`, `author_id: uidRef.current ?? ''`, `created_at: now`，:90-100）→ `deliver`（:63-74）把 id 放进 `pendingIds`、清 `failedIds`，执行 `sendMessage`。
3. `lib/chat.ts:66-72 sendMessage()`：`currentUserId()`（`supabase.ts:10-15`，`auth.getUser()` 一次网络往返）→ `insert({ id, channel_id, author_id, content })`（:71）。**不送 `world_id` / `kind` / `created_at`**，全靠 DB 默认值与 `set_world` 触发器（待核线上）。
4. 失败：`deliver` 的 catch（:67-71）→ `Logman.error` + pending→failed；`message-list.tsx:269-279` 渲染「🌧️ 没送出去 重试 / 删除」；窄卡对 failed **不区分**（`chat-card.tsx:100-112` 只看 `from`/`kind`）。
5. 成功：无本地状态变更；等 echo（§1.2）。

### 1.2 收消息（echo 与对方）
1. 订阅：`use-world-stream.ts:54` `subscribeWorld(worldId, handleEvent, onStatus)` → `lib/chat.ts:161-193 subscribeTopic`：先 `await supabase.realtime.setAuth()`（:180），再 `supabase.channel('world:{id}', { config: { private: true } })`，绑 `broadcast` 事件 `INSERT`/`UPDATE`/`DELETE`（:185-187）；`handle()`（:168-177）只取 `payload.table / record / old_record`，`operation` 取自绑定的事件名而非 payload 字段。
2. 事件 → `use-message-store.ts:97-133 handleEvent`：`messages` INSERT/UPDATE → `mergeRows(prev[channel_id], [row])`（:104-107，按 id 去重、server 行覆盖本地行、按 `created_at` 重排）；INSERT 再 `without(pendingIds, id)`（:110）——这就是 echo 去重：本地 id == 服务端 id。DELETE → `startVanish(old_record.id)`（:101）。
3. `threads` 重算（`chat-data.ts:82-87`）→ 窄卡 `chat-card.tsx:60` 取尾 40；大窗 `chat-hub.tsx:119` 取整条；`WorldPage.tsx:178` 取 `lastMsg` 喂 `useWorldChatBubble`。
4. 重连补拉：`use-world-stream.ts:59-64` 第二次及以后 `SUBSCRIBED` 时 `load(true)` → `absorb(..., merge=true)`（`use-message-store.ts:64-94`）→ 每频道只拉**最新一页 50 条**并 merge。

### 1.3 编辑
`message-list.tsx:130-139 beginEdit/commitEdit`（仅 own 且 `kind!=='sticker'`，:237-241）→ `use-optimistic-send.ts:157-172 editMessage`：本地先改 `content` 并伪造 `edited_at`（:161-168）→ `lib/chat.ts:90-93 updateMessage` 只 `update({ content })`（`edited_at` 由 guard trigger 盖，待核线上）→ 失败仅 `Logman.error`（:169），本地不回滚。

### 1.4 删除
`message-list.tsx:242-244` 🗑️ → `deleteMsg`（`use-optimistic-send.ts:176-182`）：`startVanish(id)`（`use-message-store.ts:54-60`：进 `vanishingIds`，900ms 后从所有会话删行）+ `deleteMessage`（`lib/chat.ts:96-99`）→ 对方经 DELETE 广播走同一 `startVanish`；粒子 `message-list.tsx:107-117` 每 id 只放一次（`explodedIds`）→ `bubble-dust.ts:12-74`。失败仅 log，本地仍消失。

### 1.5 reaction
`message-list.tsx:223-234` 快捷三枚 + ➕ 打开 `EmotePicker mode="reaction"`（:252-268）；chip 点击（:287）→ `toggleReaction`（`use-optimistic-send.ts:185-213`）：读 `reactionsRef` 判断 mine → 本地翻转（伪造行 `world_id:null`）→ `addReaction`（insert，PK 冲突即重复）/ `removeReaction`（`lib/chat.ts:102-120`）→ echo 走 `handleEvent:113-116 upsertReactions`（`store.ts:99-110` 按 `user:emoji` 键去重）。失败仅 `Logman.warn`。

### 1.6 已读
- 触发：窄卡 `chat-card.tsx:63-65`（`open && cur`，依赖 `msgs.length`）；大窗 `chat-hub.tsx:128-130`（依赖 `threads` 任何变化）。
- `use-optimistic-send.ts:217-232 markRead`：会话守卫 → 取最新**非 pending/failed** 行 → 与 `readsRef[conv][me]` 比较，已覆盖则 return（这是唯一节流）→ 本地写 `now` → `markChannelRead`（`lib/chat.ts:131-140`，`upsert(..., { onConflict: 'channel_id,user_id' })`，不送 `world_id`）。
- 展示：`chat-hub.tsx:124 readAt = reads[convId][dm.otherId]` → `message-list.tsx:80-88 readCursorIdx` → `:294-310` 头像，**仅 DM**（频道 `dm` 为 undefined）。

### 1.7 贴纸：库 / 搜索 / 导入 / 发送 / 移除
- 库：`use-emote-library.ts:50-56 loadEmotes` = `listEmotes`（`lib/emotes.ts:15-19`，RLS 限世界）+ `signImageUrls`（`storage.ts:118-128`，TTL 1h）；40 分钟 `setInterval` 续签（:65）；`world_emotes` 广播 → `reloadEmotesRef`（`use-message-store.ts:127-129`）→ 整库重拉+重签。
- 搜索：`emote-picker.tsx:150-165 runWebSearch` → `searchWeb` → `lib/emotes.ts:24-29` `functions.invoke('emotes', { action:'search', q })`；错误经 `describeFnError`（:91-102）挖 JSON body。
- 导入：三条路都进 `emote-picker.tsx:170-184 doImport`：① Tenor 结果点击（:368-370）→ `onImportUrl(r.url, name)`；② 粘贴 URL（:398）；③ 本地文件（:404-417，`accept="image/*"`）→ `addEmoteFile` → `lib/emotes.ts:43-59`：`createImageBitmap` 解码 → 长边 512 webp（:71-87）→ Storage `memories/<world>/emotes/<uuid>.webp`（:46-47）→ `world_emotes.insert`（:49-53）；插入失败回滚文件（:55）、23505 映射中文（:56）。①② 走 Edge Function `import`（:33-40，服务端下载 ≤2MB、`image/*`——**源码不在仓库，无法核**）。
- 发送：`emote-picker.tsx:289 onPickSticker` → `chat-composer.tsx:80-83` → `chat-hub.tsx:203` → `sendStickerTo`（`use-optimistic-send.ts:107-125`：本地行 `kind:'sticker'`, `content:':name:'`, `emote_id`）→ `lib/chat.ts:76-87 sendSticker`。
- 渲染：`store.ts:151, 178-179`：`emote_id` 为 null → `emoteGone` 墓碑（`message-list.tsx:200-201`）；有 emote 无 URL → 显示 `:name:`（:205）；窄卡 `chat-card.tsx:106-110` 无 URL 时退回文字气泡。
- 移除：`emote-picker.tsx:296-310` confirm → `removeEmoteById` → `lib/emotes.ts:64-67`（文件不删，FK 置空待核线上）。

### 1.8 好友请求 → DM（冻结区）
`friends-page.tsx:97-111 submitAdd` → `addFriend`（`chat-data.ts:151-154`）→ `lib/friends.ts:24-35`：RPC `find_profile_by_email` → 自查 → `pairOf`（:13）→ `friendships.insert`；接受 `:39-44` `update({status:'accepted'})`（DM channel 由服务端建，待核线上）；两端经 `user:{uid}` 的 `friendships` 事件 → `reloadAccountRef`（`use-message-store.ts:124-126`）→ `use-account-stream.ts:65-69` `load(true)` 全量重拉好友 + DM 频道 + 各 DM 首页 + 资料。`friends` 视图 `chat-data.ts:111-126` 把 DM channel 挂到好友行 → `friends-page.tsx:161-165` 💬 → `onOpenDm` = `setConvOpen(dmId)`。

### 1.9 窄卡
`WorldPage.tsx:286-299` → `chat-card.tsx:58-60`：`convsFor(inWorld, channels, dmConvs)[0]`，过滤 vanishing，尾 40；`:78` 无会话则不渲染；Enter 在 input 内 `submit()` + `stopPropagation()`（:130-133）；「展开」= `setChatOpen(false) + setConvOpen(worldConvId)`（`WorldPage.tsx:289-292`）。

### 1.10 头顶气泡 + rail 红点
`WorldPage.tsx:177-179`：`worldConvId = convsFor(...)[0].id`、`lastMsg = threads[worldConvId].at(-1)` → `use-world-chat-bubble.ts:22-42`：`unread = lastMsg.from !== 'me' && !chatOpen && !convOpen`（:23）；effect（:28-40）对「对方 + 非 pending + 未冒过的 id」设 bubble、4500ms 定时清除 → `RoomScene bubble`（`room-scene.tsx:171-207`，seat `pink`）；`Rail unread`（`rail.tsx:119` → `.rail-dot`）。

### 1.11 大窗
`WorldPage.tsx:323-355` → `chat-hub.tsx:73-215`：`convId` 解析为 `ch`（仅 `type==='text'`，:117）/ `dm`（:118）/ `FRIENDS_VIEW`（:116）；`convs = convsFor(inWorld, channels, dmConvs)`（:120）与窄卡同源；`MessageList` / `ChatComposer` 以 `key={convId}` 重挂（:181, :195）；scrim 点击关闭（:137）。Enter 闸门：`WorldPage.tsx:163-173` `convOpen || screen` 非空时不挂监听。

---

## 2. 契约表

| 契约 | 客户端代码位置 | 类型层 | 与 PROJECT.md / chat.md 的差异 · 待核项 |
|---|---|---|---|
| `channels` select `id, world_id, type, name, topic, scene_id, position, dm_user_a, dm_user_b` | `lib/chat.ts:15, 21-36` | `types/chat.ts:12-22`（`ChannelType = text\|voice\|room\|dm`） | 一致。UI **只处理 `text` 与 `dm`**：`store.ts:65` 过滤 `text`，`chat-hub.tsx:117` 只认 `text`；`voice`/`room` 无任何消费者（与 chat.md §三「已留位」一致） |
| `messages` insert `{id, channel_id, author_id, content}`（文字）/ `+ kind:'sticker', emote_id`（贴纸） | `lib/chat.ts:71, 78-85` | `ChatMessageRow` `types/chat.ts:38-48` | 客户端**不送** `world_id`（靠 `set_world` 触发器，PROJECT.md:112 标待核）、`kind`（文字依赖 DB 默认 `'text'`，**待核**）、`created_at`/`edited_at`；`author_id` 由客户端给，**必须靠 RLS 校验 = auth.uid()，待核线上** |
| `messages` select 列 = `MESSAGE_COLS` | `lib/chat.ts:16, 50-61` | 同上 | 一致；`content ≤4000` 只在 PROJECT.md:112 标待核，客户端无对应校验（见 C-05） |
| `messages` update `{content}` / delete by id | `lib/chat.ts:90-99` | — | `edited_at` 由 guard trigger 盖（注释 :89，待核）；own-only 靠 RLS（待核） |
| `message_reactions` insert `{message_id, user_id, emoji}` / delete 三列 / select `REACTION_COLS` | `lib/chat.ts:17, 102-128` | `ReactionRow` `types/chat.ts:65-71`（`world_id` 可空） | 不送 `world_id`（触发器回填待核）；PK(message,user,emoji) 依 PROJECT.md:113。第二步删掉的 `channel_id` 幻列确认已不在（`types/chat.ts:65-71` 无此列） |
| `channel_reads` upsert `{channel_id, user_id, last_read_at}` `onConflict:'channel_id,user_id'` | `lib/chat.ts:131-140` | `ChannelReadRow` `types/chat.ts:74-79` | **需要 (channel_id,user_id) 唯一约束/PK，待核线上**；「只进不退 guard」PROJECT.md:114 待核；不送 `world_id` |
| `channel_reads` select by `world_id` / by `channel_id in` | `lib/chat.ts:143-155` | 同上 | 一致 |
| `friendships` select/insert/update/delete（冻结） | `lib/friends.ts:10, 16-53` | `FriendshipRow` `types/chat.ts:25-32` | 一致；规范序仅客户端 `pairOf`（:13）保证，DB check 待核 |
| RPC `find_profile_by_email(p_email)` → `[{id, display_name}]` | `lib/friends.ts:26-28` | 内联断言 | PROJECT.md:121 一致；返回形状（数组 vs 单行）待核线上 |
| `world_emotes` select `COLS` / insert `{world_id, name, storage_path, added_by}` / delete | `lib/emotes.ts:10, 15-19, 49-53, 64-67` | `EmoteRow` `types/chat.ts:51-59` | 一致；`name` 每世界唯一（23505 映射 :56）；`types/chat.ts:55` 注释写 `<uuid>.<ext>`，代码恒 `.webp`（`lib/emotes.ts:46`）——注释小差 |
| Edge Function `emotes` `{action:'search', q}` → `{results: EmoteSearchResult[]}` / `{action:'import', world_id, url, name}` → `{emote}` ；错误 `{error}` | `lib/emotes.ts:24-40` | `EmoteSearchResult` `types/chat.ts:62` | 源码不在仓库，≤2MB / `image/*` 只能相信注释与 PROJECT.md:122；`TENOR_API_KEY` 未配（chat.md §五.2）无法核 |
| Storage `memories/<world_id>/emotes/<uuid>.webp` upload + `createSignedUrls(TTL 3600)` | `lib/emotes.ts:46-47`、`storage.ts:13, 118-128` | — | PROJECT.md:123 一致；续签周期 `use-emote-library.ts:65` 硬编码 `40*60*1000`，未用 `SIGNED_URL_REFRESH_MS`（CONVENTIONS.md:40 要求派生）；PROJECT.md:123「tab 重可见重签」对贴纸**不成立**（只有缩略图 `use-signed-thumbs.ts:35` 有） |
| Realtime topic `world:{world_id}` / `user:{uid}`，`private: true`，事件名 `INSERT`/`UPDATE`/`DELETE` | `lib/chat.ts:183-187, 196-204` | `WorldEvent` `types/chat.ts:84-106` | 官方 `realtime.broadcast_changes()` payload = `{operation, table, schema, record, old_record}`，客户端读 `table/record/old_record`（:170-176）、**忽略 `operation` 字段而取绑定事件名**——若触发器把事件名写成 `TG_OP` 以外的值，三条 `.on` 一条都不匹配、静默收不到（待核线上） |
| `WorldEvent` 覆盖的表：messages / message_reactions / channel_reads / friendships / world_emotes | `use-message-store.ts:99-130` | `types/chat.ts:84-106` | **`channels` 表没有事件类型也没有处理**：世界内新建频道不会实时出现（见 C-14） |
| 传输 → 领域 → 视图映射点 | 行类型（`types/chat.ts`）→ `useMessageStore` 原样存行 → `toMsgs`（`store.ts:147-182`）在渲染期投影 `Msg`；`Channel` → `Conv` 在 `convsFor`（`store.ts:62-69`）与 `dmConvs`（`chat-data.ts:91-108`）；`EmoteRow` → `EmoteView` 在 `use-emote-library.ts:37-40` | — | 映射单点清晰；乐观行在 `use-optimistic-send.ts:90-100, 111-121, 198-204` 三处手写行字面量（`world_id:null` 是编造值，echo 会覆盖） |
| `MESSAGE_PAGE_SIZE = 50`（也是「还有更多」探针）；窄卡尾 40 | `lib/chat.ts:46`、`use-message-store.ts:88, 149`、`chat-card.tsx:60` | — | chat.md §四 一致；40 ≤ 50 无越界 |
| 输入上限 | 大窗 `chat-composer.tsx:96 maxLength={500}`；窄卡 `chat-card.tsx:125-134` **无上限**；编辑框 `message-list.tsx:165-178` **无上限** | — | 三处不一致，且都不等于 DB 4000（见 C-05） |
| Realtime 鉴权续期 | 应用侧只有 `lib/chat.ts:180` 订阅前一次 `setAuth()`；**没有** `onAuthStateChange → setAuth` | — | 经核对已安装库：`supabase-js index.mjs:228` 把 `accessToken` 回调交给 realtime，`:366-369` 在 `TOKEN_REFRESHED/SIGNED_IN` 时 `realtime.setAuth(token)`；`realtime-js RealtimeClient.js:395` 每次心跳再 `_setAuthSafely`，`:740-752` 把新 token `push('access_token')` 给已 join 的 channel。**JWT 1h 过期由库自动续，应用无需补代码**（静态结论） |

---

## 3. 发现

> 证据等级：**静态** = 读代码推出；**待验证** = 需要线上/双端运行才能定；本分区没有「实测」。冻结区条目标 🧊。

### C-01 头顶气泡定时器被任何 `threads` 重算清掉，气泡可能永远不消失 — **P1**
- **位置**：`shell/use-world-chat-bubble.ts:28-40`；输入来自 `WorldPage.tsx:178`。
- **问题**：effect 依赖 `[lastMsg]`，而 `lastMsg` 是 `threads[...].at(-1)`——`threads` 每次重算（`chat-data.ts:82-87`，任何 `chanRows / reactions / pendingIds / vanishingIds / nameMap / emoteUrls` 变化）都产生**新对象**。React 在 deps 变化时先跑 cleanup（`:39 clearTimeout`）再跑 effect；新一轮 effect 里：(a) `lastMsg.from === 'me'` 直接 return（:29），(b) 或同 id 命中 `lastBubbledId` 直接 return（:30）——两条路都**不再设新定时器也不清 bubble**。
- **触发条件（很日常）**：对方消息落地 → 气泡出现；4.5s 内我在窄卡回一句（`appendLocal` → `chanRows` 变 → `threads` 重算 → `lastMsg` 变成我的） → 定时器被清 → 对方那句气泡**挂在角色头顶直到下一条对方消息**。同理：对方 4.5s 内编辑/撤回/reaction、我点 reaction、资料名字晚到、40 分钟贴纸续签，都会冻住当前气泡。
- **证据等级**：静态（React effect 语义确定）。
- **建议**：deps 改成稳定标量 `[lastMsg?.id, lastMsg?.from, lastMsg?.pending]`，或把定时器句柄放 ref、只在「新 id 冒泡」时 clear+重设，并在 cleanup 里 `setBubble(null)`。≈5 行。
- **验收**：双端：A 发一句 → B 侧气泡出现 → B 在 4.5s 内回一句 → A 的气泡仍在 4.5s 到点消失。

### C-02 rail 红点不看已读游标：读完关掉，红点又亮 — **P1**
- **位置**：`use-world-chat-bubble.ts:23`（`unread = lastMsg.from !== 'me' && !chatOpen && !convOpen`）；注释 :18-21 明说「closing it again re-lights it」。
- **问题**：红点定义为「最新一条是对方的 且 两面都关着」，与 `reads`（本人游标，`markRead` 已经在 `use-optimistic-send.ts:228` 本地写入）完全脱钩。只要对方是最后发言者，红点在关窗后就常亮，直到我回一句。
- **对照 chat.md §二**「对方消息在两个 surface 都关着时落地 → rail 红点，打开任一即清」——「即清」只在打开期间成立，关闭后回弹，属**部分不符**。
- **证据等级**：静态。
- **建议**：`unread = lastMsg.from !== 'me' && !chatOpen && !convOpen && Date.parse(lastMsg.ts) > Date.parse(reads[worldConvId]?.[uid] ?? 0)`；`WorldPage.tsx:179` 多传 `reads`/`uid`。≈4 行；不改数据层。
- **验收**：对方发一句 → 红点亮 → 打开窄卡再关 → 红点灭且不再回弹；对方再发 → 再亮。

### C-03 断线期间的删除 / 撤 reaction 永远补不回来 — **P1**
- **位置**：`use-world-stream.ts:59-64` 与 `use-account-stream.ts:80-84` 的重连补拉 → `absorb(merge=true)`（`use-message-store.ts:72-79`）→ `mergeRows` 是**并集**（`store.ts:85-89`），`upsertReactions` 只增不减（`store.ts:99-110`）。
- **问题**：Broadcast 无回放；重连后只能靠补拉。补拉是「最新 50 条 ∪ 本地」，所以：断线期间对方删掉的消息本地变鬼影、撤掉的 reaction 本地仍显示；超过 50 条的缺口也不补（两人产品可接受，但前两条是正确性问题）。
- **证据等级**：静态；行为需双端断网验证（TODO:145「断网重试」正是这条）。
- **建议**：补拉时按「服务端页覆盖本地同区间」而非并集：对拉回页的 `created_at` 区间 `[min, max]`，本地落在区间内但不在页内的行删掉（保留 pending/failed）；reaction 同理用 `getReactions(pageIds)` 结果整体替换这些 message_id 的桶。≈20 行，纯函数可加进 `store.ts` 并延续第二步的断言脚本。
- **验收**：A 断网 → B 删一条、撤一个 reaction → A 恢复 → A 侧该消息消失、reaction 消失。

### C-04 编辑 / 删除 / reaction / 已读失败后本地与服务端分叉且无提示 — **P1**
- **位置**：`use-optimistic-send.ts:169`（编辑只 `Logman.error`，本地已换内容+伪 `edited_at`）、`:176-182`（删除先 `startVanish` 900ms 后真删本地行，服务端失败不复活）、`:208-210`（reaction 翻转不回滚）、`:229`（已读只 warn）。
- **问题**：文字/贴纸发送有 failed 态与重试（做得对），其余四类写失败**用户什么都看不到**，本地显示的是从未落库的状态；注释 :155-156 说「由下次重连补拉纠正」，但补拉是并集（C-03），被删失败的行**不会**回来，编辑失败的内容只有在页内才被覆盖。
- **证据等级**：静态。
- **建议**：最小改法——失败时回滚：编辑 catch 里 `setChanRows` 恢复旧 `content/edited_at`（闭包里留旧行即可）；删除 catch 里 `setVanishingIds(without)` 并重新 `mergeRows` 旧行；reaction catch 里反向翻转；加一句 `Logman.warn` 之外的 UI 提示（大窗顶部一行「刚才那步没保存上」即可）。≈25 行。
- **验收**：用 devtools 把 `messages` 的 PATCH 设为离线 → 编辑 → 内容回弹为原文并有提示。

### C-05 消息长度三处不一致、DB 上限无客户端护栏 — **P2**
- **位置**：大窗 `chat-composer.tsx:96 maxLength={500}`；窄卡 `chat-card.tsx:125-134` 无；编辑框 `message-list.tsx:165-178` 无；`send()` / `editMessage()` 只 trim。DB `content ≤4000` PROJECT.md:112 标待核。
- **问题**：窄卡贴 5000 字 → 若 DB 有 check，得到 failed 气泡，重试永远失败，控制台是英文 Postgres 文案；若 DB 无 check，则写入超长行而大窗却限 500——产品规则自相矛盾。
- **证据等级**：静态 + 待核线上（4000 是否存在）。
- **建议**：`lib/chat.ts` 或 `store.ts` 导出 `MESSAGE_MAX_LEN`，三处 `maxLength` 与 `send/editMessage` 守卫共用；DB 侧核实后对齐。≈6 行。
- **验收**：三处输入同一上限；超长粘贴被截断而不是发失败。

### C-06 重试对「其实已落库」的消息会二次插入冲突，永远卡在 failed — **P2**
- **位置**：`use-optimistic-send.ts:129-144 retrySend` → `sendMessage` 同 id 再 insert；`deliver` catch（:67-71）把任何错误都记 failed。
- **问题**：INSERT 请求发出、服务端写成功、响应在网络上丢了（弱网常见）：echo 会到（`pendingIds` 清掉），随后 catch 又把 id 放进 `failedIds` → 气泡显示「没送出去」但对方已收到；点重试 → 23505 主键冲突 → 继续 failed；点「删除」只删本地，服务端那条还在。
- **证据等级**：静态；需弱网复现。
- **建议**：`deliver` catch 里若 `e.code === '23505'`（已存在）视为成功；或 catch 前检查 `pendingRef.current.has(id)`——echo 已清 pending 就不再标 failed。≈4 行。
- **验收**：devtools 让 POST 返回 504 但服务端已写 → 气泡不显示失败。

### C-07 `subscribeTopic` 对同 topic 的「正在离开」channel 无防护 — **P2（潜伏）**
- **位置**：`lib/chat.ts:180-193`；库侧 `RealtimeClient.js:274-285 channel()` 按 topic 返回**已存在**实例，`RealtimeChannel.js:359-365 unsubscribe()` 是异步离开（等 leave 'ok' 才从列表移除）。
- **问题**：若同一 topic 在上一实例离开完成前再次 `subscribeTopic`（worldId A→B→A 快速切换、登出登入、HMR），`supabase.channel()` 会拿到 `leaving` 状态的旧实例，`.on()` 叠加绑定后 `.subscribe()` 在 `joinedOnce` 实例上抛「tried to subscribe multiple times」——发生在 `setAuth().then` 里，成为未捕获 rejection，订阅静默失败、聊天再也不刷新直到刷新页面。
- **当前触发面**：StrictMode 双跑**不会**触发（第一轮 cleanup 时 `ch` 仍为 null，:181 `disposed` 守卫兜住）；`worldId`/`uid` 在正常流程里不会快速翻转（离开世界只把 `entered` 置 false，`world` 保留）。所以是潜伏项。
- **证据等级**：静态（库源码确认）。
- **建议**：`.then` 加 `.catch` 上报 `onStatus('CHANNEL_ERROR')`；或订阅前 `await removeChannel` 旧实例——放进 §4 提议的小适配器里顺手做。≈6 行。

### C-08 大窗消息流对任何 `msgs` 变化都强制滚到底 — **P2**
- **位置**：`message-list.tsx:92-103`（deps `[msgs]`，无 anchor 时 `scrollTop = scrollHeight`）。
- **问题**：用户上滚读旧消息时，对方一个 reaction / 一次已读回写（DM）/ 自己名字晚到，都触发 `threads` 重算 → 视图跳回底部。另 `:120-127 onScroll` 在 `scrollTop<40` 的**每个滚动事件**都写 `anchorRef` 并调 `onLoadOlder`；`loadOlder` 因 in-flight 早退时 `anchorRef` 仍留着过期值，下一次任意 `msgs` 变化会套用「恢复」公式（:96-99）把视口算到错误位置。
- **证据等级**：静态。
- **建议**：只在「新消息追加到尾部且用户本来就在底部附近」时贴底（记录 `wasNearBottom`）；`anchorRef` 只在 `loadOlder` 真正开始时设置（让 hook 返回 boolean）。≈12 行。

### C-09 世界没有文字频道时，窄卡/气泡/红点会落到私信；有 DM 之前窄卡干脆不显示 — **P2**（🧊 部分涉及冻结区）
- **位置**：`store.ts:62-69 convsFor` 顺序 = 文字频道 + DM；`chat-card.tsx:59 cur = convs[0]`、`:78` 无会话 return null；`WorldPage.tsx:177 worldConvId = convsFor(...)[0]`。
- **问题**：「新世界自动建默认频道」PROJECT.md:111 标待核。若某世界无 `text` 频道：① 有 DM 时 `convs[0]` 是 DM → 窄卡标题无、气泡把好友私信当「她」冒出来、红点也跟 DM 走；② 无 DM 时按 Enter 什么都不出现（`return null`），也没有空状态。
- **证据等级**：静态 + 待核线上（默认频道触发器）。
- **建议**：`worldConvId` 与窄卡改为显式取 `channels.find(type==='text')`（DM 不参与窄卡/气泡）；无频道时窄卡渲染一行「这个世界还没有频道」。≈8 行。
- **验收**：Dashboard 删掉测试世界的频道 → Enter 后窄卡显示空状态而非无反应。

### C-10 贴纸库任何变动都整库重拉 + 重签，所有贴纸 `<img src>` 换 URL 闪一下 — **P2**
- **位置**：`use-message-store.ts:127-129` → `use-emote-library.ts:57-61 loadEmotes`（`listEmotes` + `signImageUrls` 全量）→ `emoteUrls` 新对象 → `toMsgs:178` 每条贴纸新 URL → `message-list.tsx:203` / `chat-card.tsx:107` 重新加载图片。
- **问题**：对方加一张贴纸，我这边历史里全部贴纸重新请求（签名 URL 变了浏览器缓存不命中）。40 分钟续签同理（这个是必要的）。
- **证据等级**：静态。
- **建议**：广播 `record` 里已有新行：INSERT 只追加该行并单独签一个 URL；DELETE 只删该 id（保留旧 URL）。`handleEvent` 已能拿到 `ev.record`，改 `reloadEmotesRef` 签名为 `(ev) => void`。≈15 行。

### C-11 贴纸续签周期硬编码，且没有 `visibilitychange` 重签；PROJECT.md 的描述对贴纸不成立 — **P2**
- **位置**：`use-emote-library.ts:65`（`40 * 60 * 1000`）；`storage.ts:15` 已导出 `SIGNED_URL_REFRESH_MS`；缩略图 `use-signed-thumbs.ts:31-39` 有 interval + visibility；PROJECT.md:123「前端 40 分钟自动续签 + tab 重可见重签」。
- **问题**：违反 CONVENTIONS.md:40「续签周期派生自 TTL」；后台 tab 的 `setInterval` 被浏览器节流，回到前台时贴纸可能已 403（同 ST-O bug 类）。
- **建议**：改用 `SIGNED_URL_REFRESH_MS` + 复用 `use-signed-thumbs` 的 visibility 模式；或把「签名 URL 池」抽成一个共享 hook 给缩略图、贴纸、世界 icon（`useWorldSession.ts:17 ICON_RESIGN_MS` 是第三份硬编码）三处共用。≈10 行 / 抽 hook ≈40 行。

### C-12 已读游标在页面不可见时也会上报（DM 会显示假「已读」） — **P2**（🧊 展示面冻结，游标数据层在役）
- **位置**：`chat-hub.tsx:128-130`（deps 含 `threads`）、`chat-card.tsx:63-65`；`markRead` 未检查 `document.visibilityState`。
- **问题**：大窗开着挂后台，对方来消息 → 立刻回写 `last_read_at` → 对方 DM 里看到我的头像挪到最新一条（`message-list.tsx:294-310`），实际我没看。频道不显示所以只影响 DM。
- **建议**：`markRead` 或两个 effect 加 `document.visibilityState === 'visible'` 守卫，并在 `visibilitychange` 回到前台时补一次。≈6 行。

### C-13 Enter 闸门漏了聚焦在按钮 / contenteditable 上的情况 — **P2**
- **位置**：`WorldPage.tsx:165-169` 只排除 `INPUT`/`TEXTAREA`。
- **问题**：焦点在 rail 按钮或任何 `<button>` 上按 Enter：按钮触发 click 的同时窄卡也弹出（`chat-card.tsx:130-133` 的 `stopPropagation` 只保护卡内 input）。`chatOpen` 本身不在闸门里——按 chat.md §一 只有 `convOpen/screen` 算 UI 层，符合文档，但键盘可达性上是双重响应。
- **建议**：排除 `BUTTON`/`[contenteditable]`，或改为 `if (el && el !== document.body) return`。1 行。

### C-14 `channels` 表没有实时事件：世界内新建频道不会出现 — **P2**
- **位置**：`types/chat.ts:84-106` 无 `channels` 变体；`use-message-store.ts:99-130` 无分支；`use-world-stream.ts:35-48` 只在首载和重连时 `getChannels`。
- **问题**：仅在服务端/Dashboard 建频道的场景；两人产品目前只有默认频道，影响小。记录以便与线上触发器族对齐（若触发器确实广播 `channels`，客户端现在是静默丢弃）。
- **建议**：暂不改；核线上时确认触发器覆盖表清单。

### C-15 错误文案直接把 Supabase / 浏览器英文原文给用户 — **P2**
- **位置**：`friends-page.tsx:107`、`emote-picker.tsx:161, 180`（`e.message` 原样）；来源 `lib/emotes.ts:48, 54, 72`（`createImageBitmap` 非图片时 DOMException 英文）、`lib/friends.ts:27, 32`（PostgREST 原文）、`storage` 上传错误。
- **问题**：与 TODO:141-143 已登记的「回忆链路把 Storage 英文原文抛给用户」同一类；聊天侧同样存在。断网时 `currentUserId()`（`supabase.ts:10-15`）先失败 → 发消息、贴纸、好友全部误报「未登录。」（同 TODO:143 那条的机制）。
- **建议**：见 §4 的错误映射 helper。

### C-16 `sendFriendRequest` 的 RPC 是邮箱存在性探针 — **P2** 🧊
- **位置**：`lib/friends.ts:26-29`：任何已登录用户可对任意邮箱调用 `find_profile_by_email`，得到「没有找到」或 `display_name`。
- **问题**：白名单两人产品下风险低，但 RPC 是否 `SECURITY DEFINER` + 是否对未加好友的人返回名字，属线上核项。冻结区，不建议现在动。
- **证据等级**：待核线上。

### C-17 乐观行的 `created_at` 用客户端时钟，时钟偏差会让自己的气泡先排到别人前面/后面再跳位 — **P2**
- **位置**：`use-optimistic-send.ts:96, 117`；排序 `store.ts:88`；分页游标 `use-message-store.ts:141-145` 取 `chanRows[0].created_at`（可能是本地行）。
- **问题**：客户端快 30s：我发一句 → 排在尾部；对方随后 10s 内发的消息 echo 到达 → 排在我前面；我的 echo 回来后再跳到正确位置。另外 `getMessages` 用 `lt('created_at', before)` 独占游标，同毫秒的两条会丢一条（两人产品概率极低）。
- **建议**：排序时 pending 行永远置尾（`mergeRows` 接收 `pendingIds` 或用 `(created_at, id)` 二级序）；游标改 `(created_at, id)` 需要 RPC，暂不值。≈5 行。

### C-18 文件头与注释仍用第二步改名前的文件名 — **P2（文档）**
- `chat-hub.tsx:1, 10`、`chat-hub.styles.tsx:1`、`conv-nav.tsx:4`、`message-list.tsx:5`、`chat-composer.tsx:5`、`bubble-dust.ts:3`、`chat-card.tsx:3` 写 `channel-screen(.styles).tsx`；`chat-data.ts:2-3, 6` 写 `channel-screen.tsx` / `chat-store.ts`；`store.ts:1` 自称 `chat-store.ts`；`use-message-store.ts` 等 4 个 hook 头引用「chat-data.ts 的 world effect」。`WorldPage.tsx:129-132` 的「chat card is stage-owned (chat button / Enter only)」「DMs stay mock」仍在（chat.md §五.6 说的 :131-134 现为 :129-132）。
- **建议**：一次注释批改；`ai/features/chat.md:63` 模块表同步「`chat-data.ts` 已是 façade，5 个 hook 见 `chat/use-*.ts`」。

### C-19 `use-message-store.ts:56-59` `startVanish` 的 900ms 定时器不随卸载清理 — **P2（无害）**
- 卸载后 `setChanRows/setVanishingIds` 仍会被调用；React 19 无警告、无泄漏（闭包很小），记录以完整。其余定时器：气泡 `use-world-chat-bubble.ts:39` 清理 ✅；续签 `use-emote-library.ts:69` 清理 ✅；订阅 `use-world-stream.ts:67-70` / `use-account-stream.ts:87-91` 清理 ✅（`removeChannel`）。

### 复核为「不成立 / 已由库覆盖」的怀疑点
- **JWT 过期 / `setAuth` 续期**：应用没写，但 supabase-js 2.98 `index.mjs:366-369` + realtime-js `RealtimeClient.js:395, 740-752` 已自动续（见 §2 末行）。不立发现。
- **StrictMode 双订阅**：`lib/chat.ts:167, 181, 190` 的 `disposed` 守卫 + `use-*-stream` 的 `cancelled` 守卫覆盖；`absorb(merge=false)` 双跑第一轮被 `cancelled` 跳过。不立发现。
- **echo 去重 / 重复投递**：`mergeRows` 按 id 幂等（`store.ts:85-89`）、`upsertReactions` 按 `user:emoji` 幂等（:99-110）、`without` 返回同引用避免空重渲染（:114-119）。成立且正确。
- **窄卡只渲染首个会话**：`chat-card.tsx:59` ✅。**`convsFor` 单点**：`store.ts:62`，三个消费者 `chat-card.tsx:58`、`chat-hub.tsx:120`、`WorldPage.tsx:177` ✅。**气泡只对对方非 pending 一次**：`use-world-chat-bubble.ts:29-31` ✅（但见 C-01）。**Enter 闸门 `convOpen/screen`**：`WorldPage.tsx:164` ✅（但见 C-13）。
- **按数组下标 key**：仅 `message-list.tsx:298` 已读头像 `key={otherId:i}` 且是有意为之（换位重放动画）；其余全部 `m.id / c.id / rx.emoji / x.e`。
- **贴纸 `:name:` 兜底**：发送 `lib/chat.ts:82`、乐观 `use-optimistic-send.ts:116`、重试解析 `:135`、渲染 `message-list.tsx:205`、墓碑 `:200-201` 闭环 ✅。
- **导入文件类型/大小**：客户端 `accept="image/*"`（`emote-picker.tsx:407`）+ `createImageBitmap` 拒非图（`lib/emotes.ts:72`）+ 输出恒为 ≤512px webp——本地上传不需要 2MB 限制；Edge Function 路径的限制**无法核**（§5）。

---

## 4. 中间件 / 适配器判断

| 候选 | 判断 | 理由 | 依赖方 | 代价 |
|---|---|---|---|---|
| **实时连接适配器**（把 `subscribeTopic` + 两个 stream 里重复的 status 处理收成一个 `useTopicStream(topic, load, onEvent)`） | **值得做，小做** | `use-world-stream.ts:54-66` 与 `use-account-stream.ts:75-86` 逐字重复 12 行（`everSubscribed` / 三种 status 分支 / 补拉）；C-03 的「补拉覆盖语义」与 C-07 的「离开中 channel 防护」都要在同一处改；再顺手暴露一个 `connected: boolean` 给 UI（现在离线时用户零感知，只有发消息才见 failed）。**不需要**做 `setAuth`/token 续期（库已覆盖） | `use-world-stream`、`use-account-stream`（2 处） | ≈60 行新文件 + 两个 hook 各减 15 行；无行为风险（纯搬移 + 两个修复） |
| **错误映射 helper**（`lib/errors.ts`：`describeError(e): string`——TypeError→「网络好像断了」、23505→「已存在」、Storage 超限→中文、`createImageBitmap` DOMException→「不是能识别的图片」、其余保留原文） | **值得做** | C-15 + TODO:141-143（回忆链路）+ `lib/emotes.ts:56`、`lib/friends.ts:33` 已有两处内联映射——同一语义已有三份实现的苗头 | `friends-page`、`emote-picker`、`store.ts errMsg`、时间线发帖（分区 B） | ≈30 行；调用点各改 1 行 |
| 领域/传输类型的自动生成（`supabase gen types`） | **不做**（沿用第二步结论 FINDINGS:74） | 手写 `*_COLS` ↔ 类型的同步公约已写进 `types/chat.ts:1-4`；线上不可达时生成也跑不了 | — | — |
| 乐观写的通用 ledger（把 `deliver` 扩到编辑/删除/reaction） | **不单独建**，随 C-04 的回滚一起在 `use-optimistic-send.ts` 内部做 | 三种写各只有一个调用点 | — | — |

结论：**两个小 helper 值得，其余直接调用足够**。都不改数据契约。

---

## 5. 不适用与受限项

| 项 | 状态 | 说明 |
|---|---|---|
| Edge Function `emotes`（search / import 的 ≤2MB、`image/*`、URL 白名单、SSRF 防护、Tenor key） | **受限** | 源码不在仓库；只能确认客户端契约（`lib/emotes.ts:24-40`）。粘贴任意 URL 让服务端下载（`emote-picker.tsx:398`）的安全性完全取决于函数实现 |
| 线上 RLS（`messages.author_id = auth.uid()`、`realtime.messages` 私有 topic 授权、`channels` 成员可见、`world_emotes` 世界隔离） | **待核线上** | Supabase MCP 401；客户端所有写都把 `author_id/user_id/added_by` 当参数送，安全性 100% 依赖 RLS |
| 触发器：`set_world` 回填 `world_id`、`broadcast_changes` 事件名是否为 `TG_OP`、`edited_at` guard、`channel_reads` 单调 guard、accepted → 建 DM、`world_emotes` 删除 → `messages.emote_id` 置空、默认频道 | **待核线上** | 客户端行为全部假定这些存在 |
| `channel_reads (channel_id,user_id)` 唯一约束、`messages.content` 4000 check、`kind` 默认值 | **待核线上** | 直接决定 C-05 / `markChannelRead` 是否可用 |
| 运行时冒烟（8 条固定项，`chat-refactor-log.md:171`）、双端联调（TODO:145） | **不适用（无法运行）** | 无 `.env.local`；第二步拆分后**至今没有在浏览器里渲染过** `ChatCard` / 大窗；本文所有 P1 都是静态推断，需要下一次有 Supabase 会话时一次性验 |
| `find_profile_by_email` 返回形状（数组/单行/`SECURITY DEFINER`） | **待核线上** 🧊 | `lib/friends.ts:28` 按数组 `[0]` 取 |

---

## 6. 复核了的已知线索

### chat.md §五 的 6 条
| # | 线索 | 结论 | 证据 |
|---|---|---|---|
| 1 | Presence 未接 | **成立** | `WorldPage.tsx:235-243` 写死 `online:true, status:'在你身边'`；`chat-card.tsx:104` `.cc-on` 常亮；`friends-page.tsx:130` 「在线」tab disabled |
| 2 | `TENOR_API_KEY` 未配 | **无法核** | 客户端只把错误 body 透出（`lib/emotes.ts:91-102`）；函数源码/Secrets 不可达 |
| 3 | 好友/DM 入口收起、代码与表保留 | **成立** | 世界外壳无 DM 入口（`WorldPage.tsx` 只有 ChatCard 展开一条路进大窗）；大窗左栏仍渲染「好友」置顶 + 「私信」分组（`conv-nav.tsx:23-31, 50-64`）；数据层 `lib/friends.ts`、`use-account-stream.ts` 在役并订阅 `user:{uid}` |
| 4 | 无群聊 | **成立**，n/a | `ChannelType` 留位（`types/chat.ts:10`），无消费者 |
| 5 | CH-12/CH-17/EMO-3/EMO-4/DM 阶段只在源码注释 | **成立** | `lib/chat.ts:2`、`lib/emotes.ts:2`、`emote-picker.tsx:6`、`emoji-data.ts:5`、`lib/friends.ts:4` 都以「未回填，见 chat.md:13」自指 |
| 6 | `WorldPage.tsx:131-134` 陈旧注释 | **成立，行号已变** | 现为 `:129-132`，「DMs stay mock」仍在（见 C-18） |

### TODO「聊天双端联调残项」（`ai/TODO.md:145`：互删粒子 / reaction 同步 / 断网重试 / 贴纸互发）
- 互删粒子：链路完整（§1.4），静态无问题；**运行未验**。
- reaction 同步：链路完整（§1.5）；发现 C-03（断线期撤 reaction 不补）、C-04（失败不回滚）。
- 断网重试：文字/贴纸有 failed→重试（§1.1）；发现 C-06（假失败卡死）、C-03（补拉并集）、C-15（断网误报未登录）。
- 贴纸互发：链路完整（§1.7）；发现 C-10（整库重拉闪烁）、C-11（无 visibility 重签）。
- 结论：该 TODO **仍应保留**，且验收清单应加上本文 C-01 / C-02 / C-03 / C-06 四条。

### FINDINGS / INDEX 相关项
| 线索 | 结论 | 证据 |
|---|---|---|
| `ReactionRow.channel_id` 幻列（INDEX「第三步开工时要知道的」；FINDINGS PA-024） | **已删，且 `REACTION_COLS` 与类型一致**；线上是否真有该列仍待核（对客户端无影响） | `types/chat.ts:65-71` 五列；`lib/chat.ts:17` 五列 |
| PA-016 窄卡 `Msg`/`emoteUrl` 修复（TODO:27 说「现在会显示贴纸图片」） | **静态成立**：`chat-card.tsx:11` 从 `chat-data` 导 `Msg`，`:106-107` 读 `m.emoteUrl` | 但从未运行验证（§5） |
| PA-030 拆分「返回面契约不变」 | **成立**：`chat-data.ts:162-188` 返回 24 个字段，`WorldPage.tsx:133-159` 解构同名 24 个 | 拆分接缝上唯一新增的运行时风险是 `allChanRef.current` 在渲染期赋值（`chat-data.ts:71`）与 `markRead` 从子 effect 读它的时序——注释 :40-43 说明了为什么必须渲染期赋值；静态看无回归 |
| INDEX「`room-scene.tsx` render 期改 ref」 | 不在本分区；聊天侧同类模式（`chat-data.ts:50-51, 71`；`use-message-store.ts:40-49`）已 eslint-disable 并解释，行为正确 | — |
| supabase.md §三「白名单未强制」 | 影响 C-16 的风险评级（白名单靠 Dashboard 关注册兜底 → 探针只对已放行账号可用） | `ai/features/supabase.md:39` |
| PROJECT.md:123「40 分钟续签 + tab 重可见重签」 | **对贴纸部分不成立**（C-11） | `use-emote-library.ts:65` 无 visibility |
| PROJECT.md:124「`world:{id}`（消息/回应/已读/贴纸库）与 `user:{uid}`（DM/好友）」 | 客户端假定**一致**：`handleEvent` 对两条 topic 用同一处理器，不校验 topic 与表的对应；`world_emotes` 事件若从 `user` topic 来也会被处理（无害） | `use-message-store.ts:97-133` |
