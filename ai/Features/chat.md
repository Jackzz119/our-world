# Chat（双形态聊天系统）设计文档

> 最后更新：2026-07-04
> 路线图位置：② Metaspace 体验 —— 聊天是 Discord-like 空间的核心交互
> 关联代码：`src/themes/cinnaglass/{chat-data.ts, chat-dock.tsx, channel-screen.tsx, contacts.ts}`、`src/pages/WorldPage.tsx`
> 关联文档：`ai/Features/sidebar.md`（侧边栏/频道入口）、`ai/Features/channel.md`（世界结构 + 频道数据模型，2026-07-04 已建——文字频道是其中 `type='text'` 的 channel）
> 前身：旧 `chat.tsx`（launcher + 浮窗多会话）已废弃删除，会话 mock 数据迁入 `chat-data.ts` / `contacts.ts`

---

## 一、功能目标（2026-07-03 用户定型）

**同一份会话内容，两种聊天体验**（参考魔兽世界聊天框 + Discord 频道）：

| 形态 | 组件 | 体验定位 | 触发 |
| --- | --- | --- | --- |
| **场景伴随聊天** | `ChatDock`（左下角常驻悬浮小块） | **在场景中互动时**顺手聊：平时虚化不挡场景，随时能瞄到最新消息 | **仅 stage 内**：场景聊天按钮 / 裸回车 |
| **覆盖式会话窗口** | `ChannelScreen`（几乎盖住场景的大窗） | **遮住场景专心聊**：沉浸式会话（文字频道 + 私信） | **仅 sidebar**：点文字频道 / 点私信 |

**解耦规则（2026-07-04 用户定型）**：sidebar 管理型交互与场景内悬浮模块**分离**——sidebar 的唯一聊天出口是覆盖式大窗（`onOpenConv`，频道与私信同一回调）；ChatDock 归 stage 所有（聊天按钮/回车实体化、点场景虚化），**不再被 sidebar 触发**（原"私信点击实体化 dock 定位"废弃）。

**分层快捷键闸门（2026-07-04 用户定型，全局原则同 PROJECT.md「分层交互原则」）**：大窗属 **UI 层**（sidebar 触发的 chrome），场景快捷键属**场景层**——**UI 层任一覆盖面打开（`convOpen` / `screen` 弹窗）→ 场景快捷键全部禁用**。现在只有裸回车一个场景快捷键（已加闸，CH-8）；未来人物移动（WASD/方向键）与交互键接入时走同一个闸门，届时快捷键注册收敛成统一的 scene-hotkey 管理器。

**ChatDock 实体化/虚化状态机（WoW 式）：**

```
ghost（虚化）：opacity .62、只读、只显示当前会话最后 5 条、消息带描边阴影浮在场景上
   │  点聊天按钮 / 裸回车（无输入框聚焦时）
   ▼
solid（实体化）：玻璃卡实体、会话 tab（频道 + 私信）、输入框自动聚焦、可发送
   │  pointer-down 场景任意处（.cdk / .chsc 之外）
   ▼
ghost
```

**会话类型**：私信 DM（`contacts.ts`，常驻）+ 文字频道（`TEXT_CHANNELS`，房内概念）。内容同源——dock 和频道窗口读写同一个 threads。

## 二、调用链路

```
WorldPage
  → useChatThreads()                    // chat-data.ts：threads 单一数据源 + send()
  → dockSolid / dockActive / channelOpen 状态
  → <div class="app" flex>
       <Sidebar>
         私信点击 / 文字频道点击 → onOpenConv(id) → setConvOpen(id)  // 唯一出口：覆盖式大窗
       <div class="stage" onPointerDownCapture=ghost判定>       // 场景层，被 sidebar 挤压
         RoomScene / LobbyScene、HUD、各 modal
         <ChatDock solid active threads onSend/>               // 左下角，stage 专属触发
         <ChannelScreen convId threads typingId onSend/>       // inset 3%/4% 覆盖 stage（频道+私信）
  → window keydown Enter（无输入框聚焦）→ setDockSolid(true)
  → send(convId, text)：追加我的消息；DM 有假回复（replies 池），频道暂无（等 Realtime）
```

**布局前提**（同 sidebar.md 修订）：sidebar 与 stage 同层 flex，展开挤压场景；聊天按钮/浮窗都在 stage 内，随挤压移动。

## 三、模块设计

| 模块 | 职责 | 状态 |
| --- | --- | --- |
| `chat-data.ts` | `Msg`/`TextChannel` 类型、`TEXT_CHANNELS`、`SEED_THREADS`（DM + 频道种子）、`useChatThreads()`（threads + typing + send） | ✅ 基础模板 |
| `chat-dock.tsx` | 场景伴随聊天：ghost/solid 两态、会话 tab、尾部 5 条、输入行、聊天按钮 | ✅ 基础模板 |
| `channel-screen.tsx` | 覆盖式会话窗口（频道 + 私信）：scrim + inset 3%/4% 玻璃大窗、气泡消息流、输入行、DM 头像/状态/正在输入 | ✅ 基础模板 |
| `contacts.ts` | DM 联系人 mock（dock tab、sidebar 私信区共用） | ✅ |
| 旧 `chat.tsx` | launcher + dock/full 浮窗 | 🗑 已删除 |

## 四、时间线 / 参数

- ghost 显示尾部条数：5；ghost 透明度 .62；顶部 mask 渐隐
- DM 假回复延迟：900–2000ms 随机
- ChannelScreen：inset 3% 4%，scrim 点击关闭
- dock 宽度：min(336px, stage-28px)；消息区 max-height 168px

## 五、待实现 / 已知问题

1. **频道消息后端**：接 Supabase Realtime broadcast + `messages` 表（数据模型归 `channel.md` 待建）；现在频道发言只在本地。
2. **未读数**：旧 Chat 的 unread 红点在基础模板中移除，后端接入时重做（dock 按钮红点 + sidebar 频道加粗）。
3. **表情面板 / 窗口缩放**：旧 Chat 的 emoji picker 与拖拽 resize 未迁移，属增强项。
4. **dock ghost 的可读性**：夜晚 mood 下描边阴影是否够，真机验收调。
5. ~~回车实体化 vs 游戏快捷键~~ → 方向已定（CH-8 闸门）：UI 层打开即禁用场景快捷键；3D 键盘操作接入时把散落监听收敛为统一 scene-hotkey 管理器（届时另拆 subtask）。
6. **群聊 grp**：contacts 里的群聊会话未进 dock tab（两人产品暂不需要），数据保留。

## 实现计划

进度：8 / 8 subtasks 完成（100%，2026-07-04）

- [x] **CH-1: 挤压式布局重构**（2026-07-03，tsc/eslint/build 绿，待真机验证）
   - 影响文件：`src/pages/WorldPage.tsx`、`src/themes/cinnaglass/cinnaglass.css`、`src/themes/cinnaglass/sidebar.tsx`
   - 说明：`.app` 改 flex；Sidebar 入流通高（`.owsb2` 不再 absolute）；新增 `.stage`（relative/flex:1）容纳场景/HUD/modal/聊天，展开侧边栏 = 挤压场景。

- [x] **CH-2: chat-data 共享数据层**（同上）
   - 影响文件：`src/themes/cinnaglass/chat-data.ts`（新）
   - 说明：threads 单一数据源（DM + 频道种子迁自旧 chat.tsx）+ `useChatThreads`（send + DM 假回复 + typing）。

- [x] **CH-3: ChatDock 基础模板（WoW 式伴随聊天）**（同上）
   - 影响文件：`src/themes/cinnaglass/chat-dock.tsx`（新）、`src/pages/WorldPage.tsx`
   - 说明：ghost/solid 状态机；按钮/回车实体化、点场景虚化（stage pointerdown capture）；会话 tab（频道+私信）；ghost 只读尾部 5 条带阴影描边。

- [x] **CH-4: ChannelScreen 基础模板（覆盖式频道窗）**（同上）
   - 影响文件：`src/themes/cinnaglass/channel-screen.tsx`（新）、`src/pages/WorldPage.tsx`
   - 说明：scrim + 几乎覆盖 stage 的玻璃大窗（inset 3%/4%）；频道头（#名 + topic）、气泡消息流、输入行；与 dock 同源 threads。

- [x] **CH-5: sidebar 频道接线 + 旧 Chat 退役**（同上）
   - 影响文件：`src/themes/cinnaglass/sidebar.tsx`、`src/pages/WorldPage.tsx`、`src/themes/cinnaglass/chat.tsx`（删）
   - 说明：sidebar 房内面板改为 文字频道（点击开 ChannelScreen）+ 语音频道 + 在场的人；场景区域切换移出（归地图功能）；私信点击 = dock 实体化定位；删除旧 chat.tsx（ChatOpenReq 机制随之退役）。

- [x] **CH-6: 联调 + 真机验收**（2026-07-04，Chrome 扩展直连 `pnpm dev` 实测通过，见测试记录）
   - 说明：挤压布局不破 HUD/modal、dock 两态切换手感、频道/私信大窗开合、回车/点场景、收起 sidebar 后 stage 回弹。

- [x] **CH-7: sidebar 解耦——私信改开覆盖式大窗**（2026-07-04，tsc/eslint/build 绿，待真机验证）
   - 影响文件：`src/themes/cinnaglass/channel-screen.tsx`、`src/themes/cinnaglass/sidebar.tsx`、`src/pages/WorldPage.tsx`
   - 说明：ChannelScreen 升级为**会话窗口**（`convId` 同时接受频道 id 与 DM 联系人 id：DM 头 = 头像/名字/状态 + 正在输入，占位符「发给 xx…」）；sidebar 的 `onOpenDm`/`onOpenChannel` 合并为 `onOpenConv`（唯一聊天出口）；dock 不再被 sidebar 实体化，成为 stage 专属（见顶部解耦规则）。

- [x] **CH-8: UI 层快捷键闸门**（2026-07-04，tsc/eslint/build 绿，待真机验证）
   - 影响文件：`src/pages/WorldPage.tsx`
   - 说明：回车监听 effect 加闸——`convOpen`（会话大窗）或 `screen`（任一弹窗）非空时不注册场景快捷键；大窗打开时裸回车不再让底下的 dock 实体化。未来场景快捷键统一走此闸门（见分层快捷键闸门规则）。

## 测试记录

**2026-07-04 真机验收（localhost:5173 + Chrome 扩展实测，console 零报错）：**

- ✅ 裸回车（无输入焦点）→ dock 实体化（`.cdk-box solid`，tabs + 输入框自动聚焦）
- ✅ 点场景任意处 → dock 虚化（`.cdk-box ghost`）
- ✅ **CH-8 闸门**：会话大窗打开时 blur 输入框后按回车，dock 保持 ghost 不实体化
- ✅ 文字频道大窗（# 闲聊 + topic + 气泡流）与私信大窗（头像/在线状态头部 + 「发给 小满…」占位）开合正常，scrim 点击关闭
- ✅ 双面同源：大窗内发送「验收测试～」→ 关窗后同一消息出现在 dock ghost 尾部
- ✅ `send()` 空文本守卫生效（输入框内空回车不产生消息）
- ✅ 收起 sidebar → dock/聊天按钮随 stage 回弹左移；展开恢复
- 备注：dock 聊天按钮点击走同一 `setSolid` 路径未单独点测；DM 假回复「正在输入…」在大窗 topic 位显示，本轮未截到帧（逻辑同 dock，已过静态检查）
