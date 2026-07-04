# Chat（双形态聊天系统）设计文档

> 最后更新：2026-07-03
> 路线图位置：② Metaspace 体验 —— 聊天是 Discord-like 空间的核心交互
> 关联代码：`src/themes/cinnaglass/{chat-data.ts, chat-dock.tsx, channel-screen.tsx, contacts.ts}`、`src/pages/WorldPage.tsx`
> 关联文档：`ai/Features/sidebar.md`（侧边栏/频道入口）、`ai/Features/channel.md`（频道数据模型，**待建**）
> 前身：旧 `chat.tsx`（launcher + 浮窗多会话）已废弃删除，会话 mock 数据迁入 `chat-data.ts` / `contacts.ts`

---

## 一、功能目标（2026-07-03 用户定型）

**同一份会话内容，两种聊天体验**（参考魔兽世界聊天框 + Discord 频道）：

| 形态 | 组件 | 体验定位 | 触发 |
| --- | --- | --- | --- |
| **场景伴随聊天** | `ChatDock`（左下角常驻悬浮小块） | **在场景中互动时**顺手聊：平时虚化不挡场景，随时能瞄到最新消息 | 场景聊天按钮 / 裸回车 |
| **覆盖式频道窗口** | `ChannelScreen`（几乎盖住场景的大窗） | **遮住场景专心聊**：沉浸式频道会话 | sidebar 点文字频道 |

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
         私信点击   → setDockActive(id) + setDockSolid(true)   // dock 实体化定位到 DM
         文字频道点击 → setChannelOpen(chId)                    // 打开覆盖窗口
       <div class="stage" onPointerDownCapture=ghost判定>       // 场景层，被 sidebar 挤压
         RoomScene / LobbyScene、HUD、各 modal
         <ChatDock solid active threads onSend/>               // 左下角，跟 stage 走
         <ChannelScreen channelId threads onSend/>             // inset 3%/4% 覆盖 stage
  → window keydown Enter（无输入框聚焦）→ setDockSolid(true)
  → send(convId, text)：追加我的消息；DM 有假回复（replies 池），频道暂无（等 Realtime）
```

**布局前提**（同 sidebar.md 修订）：sidebar 与 stage 同层 flex，展开挤压场景；聊天按钮/浮窗都在 stage 内，随挤压移动。

## 三、模块设计

| 模块 | 职责 | 状态 |
| --- | --- | --- |
| `chat-data.ts` | `Msg`/`TextChannel` 类型、`TEXT_CHANNELS`、`SEED_THREADS`（DM + 频道种子）、`useChatThreads()`（threads + typing + send） | ✅ 基础模板 |
| `chat-dock.tsx` | 场景伴随聊天：ghost/solid 两态、会话 tab、尾部 5 条、输入行、聊天按钮 | ✅ 基础模板 |
| `channel-screen.tsx` | 覆盖式频道窗口：scrim + inset 3%/4% 玻璃大窗、气泡消息流、输入行 | ✅ 基础模板 |
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
5. **回车实体化 vs 游戏快捷键**：将来 3D 场景有键盘操作时需要输入焦点管理。
6. **群聊 grp**：contacts 里的群聊会话未进 dock tab（两人产品暂不需要），数据保留。

## 实现计划

进度：5 / 6 subtasks 完成（83%）

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

- [ ] **CH-6: 联调 + 真机验收**
   - 说明：挤压布局不破 HUD/modal、dock 两态切换手感、频道窗开合、回车/点场景、收起 sidebar 后 stage 回弹、tsc/eslint/build（已绿）+ `pnpm dev` 真机。

## 测试记录

（待 CH-6 填写）
