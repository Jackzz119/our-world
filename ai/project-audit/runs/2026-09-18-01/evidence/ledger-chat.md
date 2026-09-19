# chat.md 压缩 ledger（2026-09-19）

- 原文：`ai/Features/chat.md` — 13365 bytes / 148 行
- 压缩稿：8885 bytes / 97 行（占原文 66.5%，**达标**，阈值 8910）
- exception：无
- 锚点扫描：全仓 grep `chat.md#` **零命中**（无任何文档以 `#锚点` 引用本文标题）；入向引用为 `ai/PROJECT.md:92,172`、`ai/Features/supabase.md:20,52` 与 9 处源码注释（`src/types/chat.ts`、`src/lib/{chat,emotes,friends}.ts`、`src/pages/WorldPage.tsx`、`cinnaglass/{chat-data,channel-screen,emote-picker,emoji-data,friends-page}`），均为整文件引用，不依赖具体标题。
- 顶级章节标题：全部保留（文档状态 / 一、功能目标 / 二、调用链路 / 三、模块设计 / 四、时间线 · 参数 / 五、待实现 · 已知问题 / 实现计划 / 测试记录）。

## 保留清单

| 项 | 为什么留 |
| --- | --- |
| 状态头恢复叙事（`7c93c3c` 误删 → 2026-08-22 恢复） | 任务指定保留一句；解释源码注释为何一度断链 |
| v2 形态映射（ChatDock → 聊天窄卡 + 头顶气泡；sidebar 退役） | 读旧文的必要转译规则 |
| 冻结项：好友 / DM UI 收起、数据层与表结构不删 | 强制规则，防误删表 |
| 编号 CH-8 / CH-9 | 原文有对应正文（快捷键闸门、会话集合规则），且规则仍在代码里生效 |
| 编号 CH-12 / CH-17 / EMO-3 / EMO-4 / 「DM 阶段」 | 原文**无**对应正文；仍在状态头「已知断链」逐个列出 + 标注引用它们的源码文件，保证代码注释可追溯（见下「待核清单」） |
| 会话集合规则（当前世界文字频道 + 我的私信；大厅仅私信；`convsFor` 单点生成；`convOpen` 单一数据源） | 独有决策 + 强制同源规则，代码仍照此实现 |
| 分层快捷键闸门（UI 层覆盖面打开 → 场景快捷键全禁） | 强制规则，`WorldPage` keydown effect 仍在执行 |
| 投递模型 Broadcast from Database（客户端只写行、DB trigger 扇出 private topic、回声含自己那条） | 外部契约 + 强制规则（原文无此段，据源码补入——见改正清单） |
| 外部契约：`channels` / `messages` / `message_reactions` / `channel_reads` / `world_emotes` / `friendships` 表名；topic `world:{id}` / `user:{uid}`；RPC `find_profile_by_email`；Edge Function `emotes`；Storage `<worldId>/emotes/`；`TENOR_API_KEY` | 跨文档/跨系统契约 |
| 术语：ghost/solid、`Conv`、`FRIENDS_VIEW`、`ChannelType`（text/voice/room/dm）、`kind`（text/sticker）、贴纸墓碑、独占游标 | 术语表价值，源码里直接出现 |
| 参数：inset 3%/4%、气泡 4500ms、`VANISH_MS=900`、`MESSAGE_PAGE_SIZE=50`、窄卡尾部 40 条 | 验收/调参依据，已逐条核过源码 |
| D-7 / D-7-3（已读头像仅 DM 显示） | 跨文档决策引用（`ux decisions.md`） |
| 测试记录中 CH-8 闸门、双面同源、`send()` 空文本守卫、scrim 关闭 | 仍然有效的验收边界 |
| 未解决问题：Presence 未接、TENOR key 未配、好友/DM 去留待拍板、文档回填欠账、陈旧源码注释 | 未解决问题清单 |

## 删除清单

| 原文位置 / 摘句 | 理由 |
| --- | --- |
| :13「未恢复的关联文档 sidebar.md / channel.md……属已知断链」原句 | 按任务改写为一句「已作废不恢复，术语与数据模型见 PROJECT.md §数据库」，并入状态头 |
| :17-18 关联代码/关联文档行里的 `chat-dock.tsx`、`contacts.ts`、`sidebar.md`、`channel.md` | 文件与文档均已不存在，改指现役文件 |
| :19「前身：旧 chat.tsx 已废弃删除，会话 mock 迁入 chat-data.ts / contacts.ts」 | 无继续价值的历史叙述；「已删除」事实压进三章一行 |
| :29 ChatDock 行（「左下角常驻悬浮小块 / 仅 stage 内」） | 组件已删，改为窄卡行 |
| :34 解耦规则整段（sidebar 唯一聊天出口 `onOpenConv`、dock 归 stage、原「私信点击实体化 dock 定位」废弃） | sidebar 已退役，规则的两个主体都不存在；现行入口链路改写进一章表格与二章 |
| :38-48 ChatDock ghost/solid 状态机 ASCII 图 | 状态机随组件退役；保留一句「ghost/solid 状态机随组件退役」保住术语 |
| :50「会话类型：DM（`contacts.ts` 常驻）+ 文字频道（`TEXT_CHANNELS` 房内概念）」 | mock 数据源已删，改写为真实 `channels` 模型 |
| :54-67 旧调用链路代码块（dockSolid/dockActive/channelOpen、`.app` flex、Sidebar onOpenConv、DM 假回复 replies 池） | 与现状不符，整体重写 |
| :69「布局前提（同 sidebar.md 修订）：sidebar 与 stage 同层 flex，展开挤压场景」 | 挤压式布局随 sidebar 退役 |
| :75-79 模块表中 `chat-data.ts` 的 `TEXT_CHANNELS`/`SEED_THREADS`/假回复、`chat-dock.tsx`、`contacts.ts`、旧 `chat.tsx` 四行 | 前三项已删或已被真实数据取代；「已删除」压成表下一行 |
| :83「ghost 显示尾部 5 条 / 透明度 .62 / 顶部 mask 渐隐」、:84「DM 假回复延迟 900–2000ms」、:86「dock 宽度 min(336px, stage-28px)、消息区 max-height 168px」 | 参数所属组件与假回复机制均已退役 |
| :90 待办「频道消息后端：接 Realtime broadcast + messages 表（数据模型归 channel.md 待建）」 | 已完成（见 `src/lib/chat.ts`），且 channel.md 已作废 |
| :91 待办「未读数……后端接入时重做（dock 按钮红点 + sidebar 频道加粗）」 | 已完成，现为 rail 未读红点，写进二章链路 |
| :92 待办「表情面板 / 窗口缩放未迁移」 | 表情面板已完成（EmotePicker）；窗口拖拽 resize 在新形态下不再是计划项 |
| :93 待办「dock ghost 的可读性，夜晚 mood 描边阴影」 | 组件已删 |
| :94 待办 5（已划删除线的回车 vs 快捷键） | 已收敛为一章的 CH-8 规则，原条目是重复 |
| :95 待办 6「群聊 grp：contacts 里的群聊会话未进 dock tab」 | `contacts.ts` 已删；保留「无群聊概念」的产品结论一行 |
| :99-135 CH-1 ~ CH-9 九条 `[x]` 明细（影响文件 + 说明 + CH-9 真机验收步骤） | 已完成流水，按要求压成一段摘要 + 「仍在役产物 / 已退役产物」两串 |
| :141-142、:147-148 测试记录中 dock 实体化/虚化、sidebar 收起 stage 回弹、dock 聊天按钮未点测、DM 假回复「正在输入…」未截帧 | 被测对象已退役，验收结论不再有效；结尾加一句说明避免读者以为遗漏 |

## 改正清单（原陈述 → 实际 → 依据）

| 原陈述 | 实际 | 依据 |
| --- | --- | --- |
| `convsFor(inWorld)` 单参数 | `convsFor(inWorld, channels, dmConvs)`，频道来自 DB 而非常量 | `src/themes/cinnaglass/chat-data.ts:87` |
| 「已打开的私信」现 mock = 全部非群聊联系人 | DM 是真实 `channels.type='dm'` 行，由 `getDmChannels()` 拉取，按账号 topic `user:{uid}` 实时更新 | `src/lib/chat.ts:31-35`、`chat-data.ts:222,465` |
| sidebar 的唯一聊天出口是覆盖式大窗（`onOpenConv`） | sidebar 已不存在；大窗（`ChannelScreen`）唯一入口是聊天窄卡的「展开」按钮，`setConvOpen(worldConvId)` | `src/pages/WorldPage.tsx:495-500,521-533`；`src/themes/cinnaglass/` 下已无 `sidebar.tsx` |
| dock 会话 tab 可在窄卡内切换会话 | 窄卡只渲染 `convsFor(...)[0]`（首个会话），无 tab 切换；多会话切换只在大窗左栏 | `shell/chat-card.tsx:40-41` |
| 频道发言只在本地 / 未读红点已移除待重做 | 频道消息已持久化 + 实时广播；未读为 rail 红点（对方消息落地且两 surface 均关闭时点亮，打开任一即清） | `src/lib/chat.ts:1-7`、`WorldPage.tsx:228-239` |
| 大窗只有「文字频道分组 + 私信分组」 | 左栏还有置顶的「好友」虚拟会话（`FRIENDS_VIEW`）+ 待处理申请角标 | `channel-screen.tsx:431-434` |
| 会话类型只有 text / dm | 类型是单表变体 `text \| voice \| room \| dm`（room = 绑 `scene_id` 的语音频道） | `src/types/chat.ts:9` |
| （原文无投递模型段） | 补记 Broadcast from Database 强制规则：客户端只写行，DB trigger 扇出 private topic，订阅由 `realtime.messages` 的 RLS 授权 | `src/lib/chat.ts:1-7` |
| （原文无气泡描述） | 补记头顶气泡：仅对方且非 pending 的消息触发，4500ms，贴纸显示「发来一张贴纸」，同一条不重复冒泡 | `WorldPage.tsx:241-253` |

## 待核清单

1. **CH-12 / CH-17 / EMO-3 / EMO-4 / 「DM 阶段」无正文**：源码注释指向 chat.md 的这些编号，但原文（及压缩稿）都没有对应章节。压缩稿在状态头逐个列出并注明引用文件，但**编号背后的具体内容需在下一次回填时补写**，无法从现有文档还原。
2. **`ai/UX.md` §4 / codex audit M2 / codex pixel spec §5.6 / `ux decisions.md` D-7·D-7-3**：均来自源码注释的转引，本次未逐一打开这些文档核对编号是否仍然存在。
3. **`TENOR_API_KEY` 是否仍未配置**：结论取自 `ai/PROJECT.md` 的「待配 TENOR_API_KEY」，未验证线上 Edge Function 环境变量。
4. **Presence 未接**：同样取自 PROJECT.md「Presence 通道尚未接（R1 待办）」，未直接在源码中验证不存在 presence 订阅。
5. `WorldPage.tsx:131-134` 的陈旧注释（「the dock is stage-owned」「DMs stay mock」）已作为待清理项写入压缩稿第五章，但**未修改任何项目文件**（本任务只读）。
