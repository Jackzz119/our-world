# Chat（双形态聊天系统）设计文档

> ## 🟢 文档状态（2026-09-19 压缩重整）
>
> **在役活文档**。曾于重定位提交 `7c93c3c` 随 `ai/features/` 一并被误删（原计划要保留），2026-08-22 恢复；本次按「现状 + 有效规则 + 待办」重整，v1 流水压成摘要。
>
> **v2 形态映射**：数据层与实时链路继续服役；UI 已换——v1 双形态里 **ChatDock 已删除**（2026-08-10 退役清理），现为 concept-c 的**聊天窄卡**（`shell/chat-card.tsx`）+ **对方角色头顶气泡**；**Discord 壳层 sidebar 亦已退役**，下文凡「sidebar 触发」按「rail / 窄卡展开」读。数据同源、多 surface 的架构原则不变。
>
> **v1 之后的增量本文未逐条展开**（Broadcast from Database 全链路、乐观发送/重试/原位编辑/删除粒子/reaction chips/已读游标、贴纸、DM），见 `ai/PROJECT.md` §已有功能资产 / §数据库。
>
> **冻结项**：好友 / DM 的**产品入口在新方向收起**（世界外壳无 DM 入口），但大窗左栏的「好友」「私信」分组代码仍在，数据层与表结构冻结保留不删。
>
> **已知断链**：① `sidebar.md` / `channel.md` / `room.md` 随 Discord 壳层作废且不恢复——术语与数据模型**以 `ai/PROJECT.md` §数据库 为准**。② 源码注释引用的 **CH-12 / CH-17**（`lib/chat.ts`）、**EMO-3**（`lib/emotes.ts`）、**EMO-4**（`emote-picker.tsx`、`emoji-data.ts`）、**DM 阶段**（`friends.ts`、`friends-page.tsx`）在本文无对应正文，属 v1 之后未回填的 subtask，回填前按上一条读 PROJECT.md。

> 最后更新：2026-09-19（已对照 `src/lib/{chat,friends,emotes}.ts`、`types/chat.ts`、`chat-data.ts`、`channel-screen.tsx`、`shell/chat-card.tsx`、`WorldPage.tsx` 核实）
> 路线图位置：② Metaspace 体验 —— 聊天是核心交互
> 关联文档：`ai/PROJECT.md`、`ai/features/supabase.md`

---

## 一、功能目标（2026-07-03 用户定型，形态已映射 v2）

**同一份会话内容，多个 surface**（参考 WoW 聊天框 + Discord 频道）：

| 形态 | 组件 | 定位 | 触发 |
| --- | --- | --- | --- |
| 场景伴随聊天 | `shell/chat-card.tsx`（左下窄卡） | 在场景里顺手聊，不遮场景 | 裸回车（无输入焦点）/ rail |
| 聊天中心（覆盖大窗） | `channel-screen.tsx` | 遮住场景专心聊；含好友页 / 私信 / 频道 | 窄卡「展开」（唯一入口） |
| 世界内气泡 | `WorldPage` 的 `bubble` | 对方消息先在世界里冒出来（world-first chat，`ai/UX.md` §4 / codex audit M2） | 自动 |

**会话集合规则（2026-07-05 用户定型，CH-9）**：可切换集合 = **当前世界的文字频道 + 我的私信**（大厅 = 仅私信，频道是世界概念）。集合由 `chat-data.ts` 的 `convsFor(inWorld, channels, dmConvs)` **单点生成**，窄卡与大窗左栏**强制同源**；激活会话 = 提升态 `convOpen` 单一数据源。

**分层快捷键闸门（2026-07-04 用户定型，CH-8；同 PROJECT.md「分层交互原则」）**：大窗属 **UI 层**，场景快捷键属**场景层**——**UI 层任一覆盖面打开（`convOpen` / `screen` 非空）→ 场景快捷键全部禁用**。现仅裸回车一个场景快捷键已加闸（`WorldPage` keydown effect early-return）；未来人物移动与交互键走同一闸门，届时把散落监听收敛为统一 scene-hotkey 管理器。

**会话类型**：DM（账号级，`channels.type='dm'`，规范序对 `dm_user_a < dm_user_b`，走 `user:{uid}` topic）+ 文字频道（世界概念，`type='text'`，走 `world:{id}` topic）。所有 surface 读写同一个 `threads`。ChatDock 的 ghost/solid 状态机随组件退役。

## 二、调用链路

```
WorldPage
  → useChatThreads()            // threads 单一数据源 + send/edit/delete/react/read
  → chatOpen（窄卡）/ convOpen（大窗）/ bubble（气泡）三个提升态
  → keydown Enter（无输入焦点 且 convOpen/screen 均空）→ setChatOpen(true)   // CH-8 闸门
  → <ChatCard onExpand/>        // 展开 = setChatOpen(false) + setConvOpen(worldConvId)
  → <ChannelScreen convId onSelect/>  // 左栏：好友页(FRIENDS_VIEW) + 文字频道 + 私信
  → send() → lib/chat.ts 写库 → DB trigger 广播回 echo（含自己那条）
  → 未读：对方消息在两个 surface 都关着时落地 → rail 红点，打开任一即清
```

**投递模型（强制规则，不可绕过）**：Broadcast from Database——客户端**只写行**（`messages` / `message_reactions` / `channel_reads`），DB trigger 把变更扇出到 private realtime topic（订阅权限由 `realtime.messages` 的 RLS 授权）。**客户端从不直接 broadcast**，发送者自己的变更也从同一条 echo 回来。

## 三、模块设计

| 模块 | 职责 / 关键契约 | 状态 |
| --- | --- | --- |
| `lib/chat.ts` | 频道/消息/回应/已读数据访问 + `subscribeWorld` / `subscribeUser`；`getMessages` 用 `before`（独占游标）翻页，返回 oldest→newest | ✅ |
| `lib/friends.ts` | `friendships` 规范序对；加好友只能按邮箱（无用户目录），走 RPC `find_profile_by_email`；accepted 由服务端建 DM channel | ✅（UI 收起） |
| `lib/emotes.ts` | 共享贴纸库 `world_emotes`；图片存私有 `memories` 桶 `<worldId>/emotes/`（沿用世界级存储策略 + signed URL）；搜图/转存走 `emotes` Edge Function（Tenor key 留服务端，≤2MB、仅 `image/*`） | ✅ |
| `types/chat.ts` | 单表变体模型：`ChannelType = text \| voice \| room \| dm`（room = 绑 `scene_id` 的语音频道；dm = `world_id` 为 null 的账号对频道）；`kind = text \| sticker`（`emote_id` 为 null = 贴纸已删 → 渲染墓碑，`content` 存 `:name:` 兜底） | ✅ |
| `chat-data.ts` | 共享状态：`Conv` / `convsFor` / `FRIENDS_VIEW`（大窗内好友页的虚拟会话 id）/ `useChatThreads`（消息、乐观态、reaction、已读、贴纸、好友） | ✅ |
| `channel-screen.tsx` | 聊天中心：左栏（好友页置顶 + 文字频道仅世界内 + 私信）+ 右侧会话流；hover 操作 / reaction / 删除粒子遵循 `ux decisions.md` D-7；**已读头像仅 DM 显示（D-7-3 修订：频道不显示已读）** | ✅ |
| `shell/chat-card.tsx` | 窄卡：只渲染 `convsFor` 的**首个**会话（无 tab 切换），尾部 40 条、过滤 vanishing、打开即 `onSeen` | ✅ |
| `emote-picker.tsx` / `emoji-data.ts` | emoji/贴纸选择器 + 自维护 230 emoji 中文索引 | ✅ |

🗑 已删除：`chat-dock.tsx`、`contacts.ts`（DM mock 联系人）、旧 `chat.tsx`。

## 四、时间线 / 参数

- ChannelScreen：`inset 3% 4%`，scrim 点击关闭，入场 .34s
- 头顶气泡 4500ms；贴纸显示「发来一张贴纸」；只对**对方**且**非 pending**的消息触发，同一条不重复冒泡
- 删除粒子 `VANISH_MS = 900`（删除后继续渲染这么久放完粒子）；分页 `MESSAGE_PAGE_SIZE = 50`，窄卡只取尾部 40 条
- 窄卡视觉规格：codex pixel spec §5.6（277px 宽卡）

## 五、待实现 / 已知问题

1. **Presence 未接**：在场头像仍是前端 mock，Realtime Presence 通道未建（PROJECT.md R1 待办）。
2. **`TENOR_API_KEY` 未配**：`emotes` Edge Function 搜图分支会抛「key 未配置」，本地上传不受影响。
3. **好友 / DM 定位待定**：入口收起但代码与数据层仍在（`friends-page.tsx`、大窗左栏、`friendships` 表），去留需用户拍板；**拍板前不得删表**。
4. **群聊**：无群聊概念（两人产品暂不需要），`channels` 单表变体模型已留位。
5. **文档回填欠账**：CH-12 / CH-17 / EMO-3 / EMO-4 / DM 阶段只存在于源码注释（见「已知断链」）。
6. **陈旧源码注释**：`WorldPage.tsx:131-134` 仍写「the dock is stage-owned」「DMs stay mock」，与现状不符，待清理。

## 实现计划

v1 阶段 **CH-1 ~ CH-9 九个 subtask 于 2026-07-05 全部完成**；在役产物见三章，ChatDock、挤压式 sidebar 布局、DM 假回复池、`TEXT_CHANNELS` / `SEED_THREADS` 种子数据均随 v2 退役。v1 之后的后端化与贴纸 / DM 增量未在本文立项，待办见 `ai/TODO.md`。

## 测试记录

**2026-07-04 / 07-05 真机验收中仍然有效的边界**（当时 console 零报错）：

- ✅ **CH-8 闸门**：大窗打开时 blur 输入框后按回车，不会唤起底下的场景聊天 surface
- ✅ **多面同源**：大窗内发的消息，关窗后立刻出现在场景伴随 surface 尾部
- ✅ `send()` 空文本守卫生效（空回车不产生消息）
- ✅ 大窗开合与 scrim 点击关闭正常；DM 头部显示头像 / 在线状态 /「发给 xx…」占位

（ChatDock 两态、sidebar 回弹、DM 假回复等验收项随组件退役，不再有效。）
