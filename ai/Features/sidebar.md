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

---

## 一、功能目标

侧边栏 = **Discord 式贯穿整个使用体验的全局界面**，大厅和房间内都存在，结构两列：

```
┌──────┬───────────────┐
│ rail │  context panel │   rail  = 房间入口 icon 竖栏（Discord 服务器列）
│ 🏠   │  （随状态变化） │   panel = 上下文面板（随 大厅/房间 状态切换内容）
│ ＋   │               │
└──────┴───────────────┘
```

- **rail（房间 icon 竖栏）**：永远在最左侧一列。展示我的房间入口 icon（当前一人一房 = 1 个 icon）+「创建/加入」入口；点 icon = 进入该房间。
- **panel（上下文面板）**：
  - **大厅状态（未进房）**：**不显示频道选择**（频道是进房后的概念）——显示别的内容（**待对齐**，见「待定问题」）。
  - **房间内**：显示该房间的频道列表（文字/语音/场景区域…，细节归 `channel.md`）+ 在场的人 + 底部用户面板。
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
2. **rail 的收缩粒度**：panel 收起后 rail 常驻？还是 rail 也能藏成现在那种头像 dock？
3. **Chat 组件的归属**：现在 `<Chat />` 独立浮着；频道化之后文字聊天是不是并进"频道"（进房才有）？大厅要不要保留私聊入口？（牵动 channel.md 范围）
4. **现有 mock 的去留**：场景区域列表/语音频道/在场的人 这三块在重构时先原样搬进 RoomPanel（维持 mock），还是等 channel.md 一起动？
5. 移动端窄屏下 rail+panel 的响应式表现。

## 五、依赖 / 边界

- rail 数据依赖 room.md 的 `sharedRoom`（R-3 已完成）；进入/创建流程复用 R-5，**不另造一套**。
- 频道列表本档只留插槽位，结构与数据全部归 `channel.md`（待建）。
- 当前一人一房（`check_room_uniqueness`），rail 多 icon 是为 future 多房间预留的形态，本期实现 1 icon +「＋」即可。

## 实现计划

进度：0 / 0 subtasks 完成（0%）——**待「待定问题」对齐后拆分**

（预估拆分方向：SB-1 骨架重构 rail+panel+collapse → SB-2 rail 接真实房间状态 → SB-3 LobbyPanel → SB-4 RoomPanel 迁移现有内容 → SB-5 联调；以对齐结果为准）

## 测试记录

（待实现后填写）