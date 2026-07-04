# Sidebar（贯穿式左侧边栏）系统设计文档

> 最后更新：2026-07-03
> 路线图位置：② Metaspace 体验的骨架 —— 侧边栏是大厅/房间共用的全局导航层
> 关联代码：`src/themes/cinnaglass/sidebar.tsx`（现状，将重构）、`src/pages/WorldPage.tsx`、`src/themes/cinnaglass/lobby.tsx`
> 关联文档：`ai/Features/room.md`（大厅/房间入口）、`ai/Features/channel.md`（频道，**待建**——频道是进房后的概念，独立成档）、`ai/Features/activity.md`（活动/游戏 + 邀请广播，**待建**）

---

## ⚠️ 术语澄清（三层"房间/频道"概念，改动前必读）

| 名字 | 指什么 | Discord 对应物 |
| --- | --- | --- |
| **房间**（DB `rooms`，共享空间） | 两人世界本体，rail 上的入口 icon | **服务器（Server）** |
| **频道**（future，见 `channel.md`） | 房间内部的子空间：文字聊天 / 语音 / 场景区域等 | **频道（Channel）** |
| cinnaglass 场景区域（`ROOMS_DEFAULT`，客厅/卧室） | 3D 场景内的区域导航，现在混在侧边栏里 | 频道的雏形之一，归属频道概念，本文档不定义细节 |

**聊天分两种（2026-07-03 用户定型）：**

| 聊天类型 | 存在范围 | 触发方式 |
| --- | --- | --- |
| **私信（DM）** | **常驻**（大厅 + 房内都可用），挂在 sidebar / 聊天按钮上 | sidebar 私信区块、聊天按钮里的私信会话 |
| **房间/频道说话** | 仅房间内 | 回车键 或 聊天 UI 按钮 → 在某个频道/当前房间说话（链路归 `channel.md`） |

现有 `<Chat />`（底部 launcher + 多会话列表）= 这两类会话共用的聊天 UI 容器：会话列表将来分「私信」与「频道」两组，频道组仅房内出现。

---

## 一、功能目标

侧边栏 = **Discord 式贯穿整个使用体验的全局界面**，大厅和房间内都存在，结构两列：

```
┌──────┬──────────────┬─────────────────────┐
│ rail │ context panel │        stage        │  rail  = 房间入口 icon 竖栏（服务器列）
│ 🏠   │ （随状态变化）  │  （场景/HUD/聊天）    │  panel = 上下文面板（大厅/房间切换内容）
│ ＋   │               │                     │  stage = 场景层
└──────┴──────────────┴─────────────────────┘
```

**布局修订（2026-07-03 用户定型）**：rail + panel 是同一个模块、**通高**，与场景（stage）**同一布局层级**（flex 同排）——展开 panel 会把场景**往右挤压缩小**，不是悬浮覆盖；聊天按钮/聊天模块都在 stage 内，随挤压移动。

- **rail（房间 icon 竖栏）**：永远在最左侧一列。展示我的房间入口 icon（当前一人一房 = 1 个 icon）+「创建/加入」入口；点 icon = 进入该房间。
- **panel（上下文面板）**：
  - **大厅状态（未进房）**：**不显示频道选择**（频道是进房后的概念）——显示别的内容（**待对齐**，见「待定问题」）。
  - **房间内（2026-07-03 修订）**：**文字频道 + 语音频道的管理** + 在场的人 + 底部用户面板。文字频道点击 = 打开覆盖式频道大窗（`ChannelScreen`，见 `chat.md`）；**场景区域切换（客厅/卧室）移出侧边栏**，归"地图切换房间"功能（现暂留 SpaceScreen/HUD 小地图）。
- **可收缩（SaaS 式）**：panel 可以收起，收起后只剩 rail（甚至 rail 也可缩为窄条/dock）；不是现在的"弹出 + 遮罩盖住场景"模式。
- 底部用户面板（头像/状态/静音/设置）贯穿两种状态常驻。

## 二、现状 vs 目标（gap）

| 维度 | 现状（`sidebar.tsx`） | 目标 |
| --- | --- | --- |
| 存在方式 | 弹出式：关闭=头像 dock，打开=遮罩+覆盖面板 | 贯穿式常驻，可收缩为 rail |
| rail | 无 | 房间 icon 竖栏 +「＋」创建/加入 |
| 大厅/房间区分 | 无区分，永远同一套内容 | panel 内容按状态二选一 |
| panel 内容 | 场景区域列表+房间设置+语音频道+在场的人（全 mock） | 房间内=频道列表（channel.md）；大厅=待定 |
| 数据 | 全 localStorage mock | rail 接真实 `getMyRoom()`（复用 room.md 的状态） |

## 三、调用链路（草案）

```
WorldPage
  → sharedRoom / lobbyStatus / inRoom（room.md R-3/R-5 已有，单一数据源）
  → <Sidebar rail={我的房间列表} inRoom={inRoom} ...>
       rail：
         · 房间 icon（来自 sharedRoom；无房只有「＋」）→ 点击 = enterRoom()（复用 room.md 进入流程）
         · 「＋」→ 创建房间（复用 createRoom 流程）/ future: 加入别人的房间
       panel：
         · 私信区块（两状态常驻）→ 点击会话 = 打开 <Chat /> 浮窗（共用聊天容器）
         · inRoom=false（大厅）→ <LobbyPanel>：房间状态卡列表（成员/在线/在干嘛）
                                  + 活动邀请卡（future，见 activity.md）——无频道
         · inRoom=true         → <RoomPanel>（频道列表 → channel.md + 在场的人）
       collapse：panel 开/收 状态持久化（localStorage）；收起后仅 rail
```

## 四、待定问题（需求对齐中，定了再拆 subtask）

1. ~~大厅状态下 panel 显示什么？~~ **已定（2026-07-03，用户确认）：房间状态列表**
   - 大厅 panel = 各房间的**状态卡**：房里有几个人、在干嘛/玩什么游戏；房间里的人可以**发出活动邀请**（如"找人打扑克"），大厅侧显示邀请卡 + 加入入口。
   - 分期：本期 = 1 张真实房间状态卡（当前一人一房）+ 成员/在线的最小版，"在干嘛"文案与邀请卡先 UI 占位；presence 真数据（Realtime）与邀请广播链路后续接。
   - 衍生概念：**活动（Activity，一起玩的游戏/事情）** → future 独立 `activity.md`；邀请 = 活动邀请广播。
2. ~~rail 的收缩粒度~~ **已定：panel 可收起，rail（约 64px）常驻不藏**；原"头像 dock + 遮罩弹出"模式废弃。
3. ~~Chat 归属~~ **已定（修订，2026-07-03）：聊天拆成 私信（常驻）+ 频道说话（仅房内）两种**，见顶部术语表。`<Chat />` 浮窗保留为共用聊天容器；sidebar panel 增加**私信区块**（两状态常驻，点击打开 Chat 浮窗）；房内"回车/聊天按钮 → 频道说话"的链路归 `channel.md`。
4. ~~现有 mock 去留~~ **已定：场景区域/语音/在场的人 原样迁入 RoomPanel（维持 mock）**，纯结构性搬动不改逻辑，频道化等 `channel.md`。
5. ~~窄屏响应式~~ **已定：本期只保底不破版**（rail 固定 + panel 可收起），精细适配等 R3F 场景定型后。

## 五、依赖 / 边界

- rail 数据依赖 room.md 的 `sharedRoom`（R-3 已完成）；进入/创建流程复用 R-5，**不另造一套**。
- 频道列表本档只留插槽位，结构与数据全部归 `channel.md`（待建）。
- 当前一人一房（`check_room_uniqueness`），rail 多 icon 是为 future 多房间预留的形态，本期实现 1 icon +「＋」即可。

## 实现计划

进度：4 / 5 subtasks 完成（80%）

- [x] **SB-1: 骨架重构（弹出式 → 常驻 rail + panel + 收缩）**（2026-07-03，tsc/eslint/build 绿，待真机验证）
   - 影响文件：`src/themes/cinnaglass/sidebar.tsx`（整体重写）、`src/pages/WorldPage.tsx`、`src/themes/cinnaglass/hud.tsx`
   - 说明：废弃"头像 dock + 遮罩弹出"，常驻两列（rail 64px + panel 252px）；panel 开/收持久化（`ow-sbopen-v1`），收起按钮在 rail 底部；Sidebar 改为全局 chrome，`presence` widget（工具箱开关 + HUD 定位项）已删除。

- [x] **SB-2: rail 接真实房间状态**（同上）
   - 影响文件：`src/themes/cinnaglass/sidebar.tsx`、`src/pages/WorldPage.tsx`
   - 说明：rail 显示房间 icon（`sharedRoom` 有房 = 1 个，世界名首字，inRoom 高亮 + 圆角态）；「＋」无房时 = 创建（复用 `createAndEnter`），有房时禁用（一人一房提示）；点 icon = `enterRoom`。

- [x] **SB-3: LobbyPanel + 私信区块**（同上）
   - 影响文件：`src/themes/cinnaglass/sidebar.tsx`、`src/themes/cinnaglass/chat.tsx`、`src/themes/cinnaglass/contacts.ts`（新）、`src/pages/WorldPage.tsx`
   - 说明：大厅 panel = 「房间动态」状态卡（房名/成员数/头像/"在干嘛"占位 + 进入按钮；无房 = 创建引导卡；loading/error 态）+「活动邀请」占位卡（敬请期待，见 activity.md 待建）；**无频道**。私信区块两状态常驻（mock 联系人列表，排除群聊）；CONTACTS 拆到 `contacts.ts`（react-refresh 约束）；`Chat` 加 `openReq` 受控打开请求（渲染期状态调整，非 effect），点私信 = 打开浮窗定位到该会话；Chat launcher/浮窗左移避开 rail（78/80px）。

- [x] **SB-4: RoomPanel（现有内容原样迁入）**（同上）
   - 影响文件：`src/themes/cinnaglass/sidebar.tsx`
   - 说明：房内 panel = 场景区域列表/房间设置/语音频道/在场的人，逻辑与 mock 未动；底部用户面板（状态/静音/设置）两状态常驻。
   - **修订（2026-07-03，chat.md CH-1/CH-5）**：布局改挤压式（`.owsb2` 入流通高，`.app` flex + `.stage`）；RoomPanel 改为 **文字频道**（点击开 ChannelScreen）+ 语音频道 + 在场的人；场景区域列表与房间设置（名称/此刻/光线）移出，随"地图切换"功能回归；私信点击改为实体化 ChatDock（旧 Chat 浮窗已删）。

- [ ] **SB-5: 联调 + 边界**
   - 说明：大厅↔房间切换 panel 内容正确、收缩态持久化、无房态 rail 只有「＋」、创建/进入经由 rail 与 LobbyScene 两条入口都闭环、tsc/eslint、真机 `pnpm dev` 验收。

## 测试记录

（待实现后填写）