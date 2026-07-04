# Room（两人共享空间 / 大厅入口）系统设计文档

> 最后更新：2026-07-04
> 路线图位置：① 回忆存储 的地基（房间是回忆/聊天/场景的容器）——见 `ai/PROJECT.md` / `ai/TODO.md`
> 关联代码：`src/lib/worlds.ts`、`src/hooks/useFeed.ts`、`src/pages/WorldPage.tsx`、`src/themes/cinnaglass/{scene.tsx, space.tsx, sidebar.tsx, rooms.ts, model.ts}`
> 关联文档：回忆时间线 `ai/Features/timeline.md`（回忆 feed 活在房间内部；DB 迁移/RLS 细节在其 ST-A）

---

## ⚠️ 术语澄清（重要，代码里有两个 "room"）

| 名字 | 指什么 | 存在哪 |
| --- | --- | --- |
| **DB `worlds` 表**（本文档主角，原 `couples` → `rooms` → `worlds`） | 两人**共享空间/世界**：owner（创建者）+ member（被邀请者，可空）+ status | Supabase `public.worlds` |
| **cinnaglass `rooms`**（`ROOMS_DEFAULT` / `meRoom='living'`） | 世界**内部的房间**（客厅/卧室等，绑定场景的语音频道，见 channel.md） | 前端 localStorage mock（`ow-rooms-v1`），**与 DB 表无关** |

> **术语定型（2026-07-04，见 `ai/Features/channel.md`）**：顶层容器正式改叫**世界（World）**——本文档标题与正文里的「房间/共享空间」今后统称世界；「房间」一词让位给世界内部的场景地点。**迁移已完成（channel.md C-3）**：DB `rooms → worlds`（含枚举/约束/触发器/RPC 全量换名）+ 代码 `src/lib/worlds.ts`（`getMyWorld`/`createWorld`）、`World` 类型、`WorldPage` 的 `world/inWorld/enterWorld`。本文档下文的 R-1~R-5 记录保留当时的 room 命名不回溯改写，读时按上表映射。

---

## 一、功能目标

把「进入两人世界」的入口显性化，放弃「自动建房」：

- **无房 = 没进入共享空间**（没进 3D 场景）。此时中间不渲染 `RoomScene`，改渲染 **大厅（Lobby）**；左侧 `Sidebar`（房间入口列表）+ `Chat` 常驻。
- **大厅 = 漂浮岛 + 传送门**（Discord 式「主动开房」），静态占位版先做；未来换 R3F 俯视空岛模型。
- **主动进入/创建**：点传送门「进入」→ `getMyRoom()`；有房进 `RoomScene`，无房显示「创建房间」→ `createRoom()` → 进入。
- **owner/member 角色**：一个人建房当 owner，单人即可进入、发帖（见 timeline.md）；member 后续通过邀请加入。

**本期范围（大厅 + 进入）：**
- 大厅静态版（漂浮岛 + 传送门 + 创建房间卡片）
- 房间状态从 mock 提升到真实 `getMyRoom()`，WorldPage 按 `hasRoom` 二选一渲染场景
- 点击进入/创建的流程闭环

**本期不做（明确排除，后续独立推进）：**
- 邀请 member 加入的 UI（status pending→active）
- 房主删房 → realtime 踢出所有 member
- cinnaglass 场景区域（客厅/卧室）接真实数据——维持 localStorage mock
- 多个共享空间切换（当前一人一房，`check_room_uniqueness` 限制）

---

## 二、调用链路

### App 层（进入前）

> 设计变更（2026-07-03，用户确认）：**放弃「有房自动进入」**，玩家永远先落大厅、
> 点传送门才进房；自动进入解耦为开发开关 `VITE_AUTO_ENTER`（见 `.env.example`）。

```
WorldPage 挂载
  → getMyRoom()                         // src/lib/rooms.ts（只查，不建）
     → 结果只更新大厅状态（sharedRoom / lobbyStatus），默认不自动进入
     → VITE_AUTO_ENTER=true 且有房 → entered=true 直接进房（开发便利）
     → VITE_DEV=true（跳过登录、无会话）→ 查询必抛「未登录」→ 降级为「无房大厅」而非错误卡
  → 渲染：inRoom（entered && 有房）? <RoomScene> : <LobbyScene>；HUD 仅 inRoom 时显示
  → Sidebar（房间入口）+ Chat 始终常驻
```

### 进入 / 创建
```
LobbyScene 卡片按状态四分支：
  → loading            → 「正在寻找你们的小世界…」
  → error              → 错误信息 + 「重试」（bump lobbyTick 重查 getMyRoom）
  → ready + 有房       → 「进入房间」按钮 / 点传送门 → entered=true → RoomScene
  → ready + 无房       → 「创建房间」→ createRoom()（owner=自己、member=null、status=pending）
                          → 成功 → 直接进入；失败（已属于某房 check_room_uniqueness / 未登录）→ 卡片内错误提示
  传送门在无房时点击 = 重查 getMyRoom（房间可能在别处创建）
```

### 与 feed 的关系（见 timeline.md）
```
只有 hasRoom=true 才可能打开时间线弹窗（SubScreen）
  → useFeed() 内部 getMyRoom() 再次确认
     → 查不到房 = 异常（未创建 / 房主已删）→ error 态（正常导航走不到这一步）
```

---

## 三、模块设计

| 模块 | 职责 | 状态 |
| --- | --- | --- |
| `src/lib/rooms.ts` | `getMyRoom()` 只查我的房（无则 null）；`createRoom()` 显式建房 | ✅ 已完成（见 timeline.md ST-G） |
| `src/hooks/useFeed.ts` | feed 读数据 hook：`getMyRoom()` 无房即 error（不建房） | ✅ 已完成（timeline.md ST-D/G） |
| `src/pages/WorldPage.tsx` | 真实共享空间状态（`sharedRoom/lobbyStatus/entered`，与场景区域 mock 分离），`inRoom` 二选一渲染 + 进入/创建 handler + `VITE_AUTO_ENTER` 开关 | ✅ 已完成（R-3/R-5） |
| `src/themes/cinnaglass/lobby.tsx` | 大厅静态版：漂浮岛 + 发光传送门 SVG + 玻璃卡片（loading/error/有房/无房四分支）；CSS 在 `cinnaglass.css` LOBBY 段 | ✅ 已完成（R-4） |
| `src/themes/cinnaglass/{scene,space,sidebar,rooms,model}.tsx` | 场景区域 / 空间切换 / 侧边栏 —— 本期维持现状（mock） | — 不动 |

---

## 四、数据模型（DB `worlds`，2026-07-04 迁移后）

> 沿革：couples→rooms 见 `ai/Features/timeline.md` ST-A；rooms→worlds 见 `ai/Features/channel.md` C-3（migration `rename_rooms_to_worlds`）。此处只列形状。

```
worlds
  - id (uuid, PK)
  - owner_id  (uuid, NOT NULL, FK profiles)   世界创建者
  - member_id (uuid, NULLABLE, FK profiles)   被邀请成员（单人时为空）
  - intimacy_points (int, default 0)
  - status (world_status: 'pending' | 'active', default 'pending')
  - created_at
  约束：owner<>member（worlds_no_self_pair）；active 必须有 member（worlds_active_requires_member）
        [trigger] worlds_check_uniqueness → check_world_uniqueness()：一个人只能属于一个世界
  RLS：select/insert/update 仅限自己参与（owner 或 member）
```

前端 `World` 类型（`src/types/feed.ts`）：`{ id, owner_id, member_id, intimacy_points, created_at }`（不含 status——前端用 `member_id==null` 判断单/双人）。

---

## 五、待实现 / 已知问题

1. **命名冲突**（见顶部术语）：DB `rooms` = 共享空间；cinnaglass `rooms` = 场景区域。新 session 改动前务必分清，避免误改 mock 场景数据。
2. ~~房间状态仍是 mock~~ → 已接真实 `getMyRoom()`（R-3）；场景区域 mock（`ROOMS_DEFAULT`/`ow-meroom-v1`）按计划保留不动。
3. ~~大厅静态版~~ → 已完成 2D 占位（R-4，`lobby.tsx`），3D 换 R3F 后替换。
4. ~~进入态~~ → 已完成（R-5）：loading/error/busy 态 + createRoom 失败卡片内提示；`VITE_DEV` 无会话降级为无房大厅。
5. **邀请 member（future）**：owner 邀请对方加入，member_id 落库、status→active；需 UI + 可能的邀请码/链接机制。
6. **房主删房 → 踢人（future）**：realtime 检测当前房在 DB 消失 → 把 member 踢回大厅（复用 useFeed 的「无房→error/大厅」分支）。
7. **签名 URL 有效期**：属回忆图片显示，细节在 timeline.md（与房间入口无关）。

---

## 实现计划

进度：5 / 8 subtasks 完成（63%）

- [x] **R-1: DB rooms 模型（owner/member/status）** —— 见 timeline.md ST-A（couples→rooms 迁移，已应用并验证）

- [x] **R-2: 数据层 `getMyRoom()` / `createRoom()`** —— 见 timeline.md ST-G（拆分完成，tsc/eslint 绿）
   - 影响文件：`src/lib/rooms.ts`
   - 说明：`getMyRoom()` 只查（无则 null）；`createRoom()` 显式建单人房。

- [x] **R-3: WorldPage 房间状态提升**（2026-07-03，tsc/eslint 绿，待真机验证）
   - 影响文件：`src/pages/WorldPage.tsx`、`src/types/index.ts`、`.env.example`
   - 说明：挂载时 `getMyRoom()` → `sharedRoom/lobbyStatus(loading|ready|error)`，与场景区域 mock 严格分离；新增 `VITE_AUTO_ENTER` 环境开关（true=有房自动进，false=正常玩家流程）；`VITE_DEV` 无会话时降级为无房大厅。

- [x] **R-4: LobbyScene 静态版（漂浮岛 + 传送门）**（2026-07-03，tsc/eslint 绿，待真机验证）
   - 影响文件：`src/themes/cinnaglass/lobby.tsx`（新）、`src/themes/cinnaglass/cinnaglass.css`（LOBBY 段）
   - 说明：漂浮岛 + 发光传送门 SVG（cinnaglass 调色板、浮动动画、reduced-motion 适配、传送门键盘可达）+ 玻璃卡片四分支（loading / error+重试 / 有房→进入 / 无房→创建）；复用 `scene-base`/mood/weather 层，tweaks 仍生效。2D 占位，后续换 R3F。

- [x] **R-5: WorldPage 场景二选一 + 进入/创建流程**（2026-07-03，tsc/eslint 绿，待真机验证）
   - 影响文件：`src/pages/WorldPage.tsx`
   - 说明：`inRoom = entered && 有房` → `<RoomScene>`/`<LobbyScene>` 二选一，HUD 仅 inRoom 显示，`Sidebar`+`Chat` 常驻；传送门/「进入房间」→ entered=true（无房时点传送门=重查）；「创建房间」→ createRoom → 直接进入，失败卡片内提示。

- [ ] **R-6（future）: 邀请 member 加入**
   - 说明：owner 邀请对方 → member_id 落库、status pending→active。需 UI + 邀请机制。独立推进。

- [ ] **R-7（future）: 房主删房 → 踢出 member**
   - 说明：realtime 检测房消失 → member 回大厅。复用 useFeed 无房分支。

- [ ] **R-8: 联调 + 边界**
   - 说明：无房→大厅、点创建→建房→进入、点进入→进房、createRoom 失败容错、未登录、真机 `pnpm dev` 验证。

---

## 测试记录

（待 R-8 填写。注：本机无法 `pnpm dev` 验证，验证在另一台机器进行；每个 subtask 完成先静态检查 tsc/eslint。）