# Channel（世界结构：世界 / 房间 / 频道）设计文档

> 最后更新：2026-07-04
> 路线图位置：② Metaspace 体验的**概念地基** —— 本文档是「世界 > 房间/频道」层级结构与音频规则的单一事实来源
> 关联代码：`src/themes/cinnaglass/{sidebar.tsx, rooms.ts, lobby.tsx}`、`src/pages/WorldPage.tsx`、`src/lib/worlds.ts`
> 关联文档：`ai/Features/room.md`（世界入口/大厅，其「房间」= 本文档的「世界」）、`ai/Features/sidebar.md`、`ai/Features/chat.md`

---

## 一、概念模型（2026-07-04 UX 对齐，用户定型）

```
世界 World（顶层容器 = DB `worlds` 表，rail 上的入口，产品名 "Our World" 的本体）
 ├── 房间 Room     —— 语音频道的扩展：继承语音频道的一切 + 绑定一个场景
 │                    「走进去」= 切换场景 + 自动接入房间音频（人到了，声音就到了）
 ├── 文字频道 Text  —— 只发文字/图片的 channel（点击开覆盖式 ChannelScreen，见 chat.md）
 └── 语音频道 Voice —— 纯语音通道，无场景绑定（体验上是「打电话」，房间是「共处一室」）
```

| 概念 | Discord 对应物 | 现状代码位置 |
| --- | --- | --- |
| 世界 | 服务器 Server | DB `worlds` 表（2026-07-04 已完成迁移）、`world` 状态 / `getMyWorld` / `createWorld` |
| 房间 | 无直接对应（Gather/ZEP 的空间房间） | cinnaglass `ROOMS_DEFAULT`（客厅/卧室…，localStorage mock） |
| 文字频道 | 文字频道 | `chat-data.ts` `TEXT_CHANNELS` |
| 语音频道 | 语音频道 | `rooms.ts` `VOICE_DEFAULT`（mock） |

## 二、已定决策（全部 2026-07-04 用户拍板）

1. **房间 = 语音频道的扩展**（is-a 继承）：语音频道有的一切（加入/说话/在场者/静音）房间全有，另绑定一个场景。数据落地为单表异型：`channels(type: 'text' | 'voice' | 'room', scene_id?)`，room 型 `scene_id` 非空，纯语音频道 = 没有场景的房间。
2. **单一语音线路**：一个人同时只在一个声音空间（房间 or 语音频道）。理由：两人产品双线路必回声/啸叫；「她在哪」必须有唯一答案。
3. **身体在场与声音在场分离**：在房间内加入语音频道 ≠ 离开房间——人还在场景里，声音切走（"戴上耳机"）。切换体验：
   - 房间环境语音 fade out（~500ms）→ 语音频道 fade in，不硬切
   - 场景 avatar 挂 🎧 角标 + 状态「通话中 · #频道名」，**对方永远能看到解释**（不能出现"他突然听不到我了"）
   - 挂断语音频道 → **自动回落**接回当前房间语音，🎧 消失
4. **进房自动接入音频，默认闭麦**：进入房间自动接入房间语音（能听到），**麦克风默认静音**；房间内共享音乐同理——进房自动听到，但不抢用户主动权。
5. **入口统一**：sidebar 房间列表与场景内房间模块（地图）点击是**同一个动作**（切场景 + 接音频）；点击当前所在房间 = 无操作（只高亮，不重载）。
6. **私信与世界分离（2026-07-04 用户定型，Discord 式）**：私信不与世界的频道混排。rail 顶部为**产品 logo = Home/私信入口**（分隔线下才是世界 icon），点击 logo → panel 切到 Home 栏（好友、商店等功能入口 + 已打开的私信列表，点击私信 = 开覆盖式会话大窗）；点世界 icon → panel 切到世界栏。落地见 sidebar.md SB-7 / chat.md CH-7。

## 三、调用链路（现状 UI 层）

```
WorldPage
  → rooms / meRoom（localStorage mock）+ enterSpace(r)（切场景 + mood）
  → <Sidebar rooms meRoom onEnterSpace>
       房间区块：ROOM_ICONS 图标 + 在场者 mini 头像（mock：我=meRoom、她=第一间）
         点击非当前房间 → enterSpace(r)；点击当前 → no-op（.on 高亮）
       文字频道 → ChannelScreen（chat.md）
       语音频道 → mock 加入/离开（默认闭麦，muted 初始 true）
  → SpaceScreen（地图模块）同样调 enterSpace —— 决策 5 的另一入口
```

## 四、数据模型（future，C-3 落地时细化）

```
worlds（由现 rooms 表改名迁移；owner/member/status/intimacy_points 不变）
channels
  - id (uuid, PK)
  - world_id (uuid, FK worlds, NOT NULL)
  - type ('text' | 'voice' | 'room')
  - name (text)
  - scene_id (text, NULLABLE)   -- type='room' 时非空，绑定场景
  - position (int)              -- sidebar 排序
  RLS：仅限所在世界成员
messages（文字频道持久化，归 chat.md 后端接入时一并设计）
```

## 五、待实现 / 已知问题

1. ~~DB 迁移时机~~ → **已完成（2026-07-04，C-3）**：DB + 代码全量换名一次做完。storage 策略补记：`alter policy rename` 无权限（需 storage.objects owner），改用 **drop + create** 走通，四条 "memories: world can …" 已全部换名，无遗留手动步骤。
2. **在场 presence 是 mock**：房间列表的 mini 头像（她固定在第一间）等 Realtime presence 接入后换真数据。
3. **音频规则全部未实现**：fade 切换、🎧 角标、自动回落、默认闭麦（UI 上 muted 初始值已按规则设 true）依赖语音基建（WebRTC/SFU）。
4. **场景区域编辑**：房间配置（名称/mood/note）编辑随地图功能回归。
5. **`channels` 表未建**：文字/语音/房间的后端结构（§四）等文字聊天接后端时一起落地（C-7）。

## 实现计划

进度：4 / 7 subtasks 完成（57%）

- [x] **C-1: UI 术语对齐（容器改叫「世界」）**（2026-07-04，tsc/eslint/build 绿，待真机验证）
   - 影响文件：`src/themes/cinnaglass/sidebar.tsx`、`src/themes/cinnaglass/lobby.tsx`、`src/themes/cinnaglass/rooms.ts`、`src/pages/WorldPage.tsx`
   - 说明：用户可见文案「创建/进入房间→创建/进入世界」「房间动态→世界动态」「在房间的人→成员」；代码注释同步新术语；代码标识符不动（随 C-3 迁移一起改）。

- [x] **C-2: sidebar 房间列表（场景绑定 + 点击切换）**（同上）
   - 影响文件：`src/themes/cinnaglass/sidebar.tsx`、`src/pages/WorldPage.tsx`
   - 说明：房内 panel 新增「房间」区块（ROOM_ICONS 图标 + 在场者 mini 头像 mock），点击 = `enterSpace`（与地图模块同一动作），当前房间高亮 + no-op；麦克风默认闭麦（muted 初始 true）。

- [x] **C-3: 术语迁移 `rooms → worlds`（DB + 代码全量）**（2026-07-04，tsc/eslint/build 绿 + DB 迁移已应用验证，待真机验证）
   - 影响：DB migration `rename_rooms_to_worlds`（表/枚举 `world_status`/`posts.world_id`/全部 `couples_*` 约束名/触发器/函数/`get_feed_posts(p_world_id)`/public 策略名）；代码 `src/lib/rooms.ts→worlds.ts`（`getMyWorld`/`createWorld`）、`src/types/feed.ts`（`World`、`FeedPost.world_id`）、`posts.ts`/`useFeed.ts`/`storage.ts`/`screens.tsx`（`worldId`）、`WorldPage.tsx`（`world`/`inWorld`/`enterWorld`）、`lobby.tsx`（`hasWorld`）、`sidebar.tsx`；`sql/dev-create-world.sql`（改名）+ `sql/storage-memories-bucket.sql`（worlds 化）。
   - 顺手修复：`check_post_unlock_validity` 仍引用已改名的 `couples` 表（解锁必炸的潜伏 bug）+ 删除重复约束 `couples_check1`；storage 四条策略经 drop+create 完成换名（见 §五-1）。

- [ ] **C-4: 语音接入（WebRTC/SFU）**
   - 说明：房间语音自动接入（默认闭麦）、语音频道加入/挂断、单线路 fade 切换 + 🎧 角标 + 自动回落。TODO ② 的「语音」条目即此。

- [ ] **C-5: 共享音乐接入**
   - 说明：进房自动听到房间在放的音乐（同"不抢主动权"规则），接共享播放状态。TODO ② 的「共同播放音乐」条目关联。

- [x] **C-6: 联调 + 真机验收（C-1/C-2/C-3 部分）**（2026-07-04，Chrome 扩展直连 `pnpm dev` 实测通过，见测试记录）
   - 说明：房间列表点击切场景/mood、当前房高亮 + no-op、她的头像挂在第一间、文案全为「世界」、默认闭麦图标态、真机进世界/读 feed 链路（验证 worlds 迁移）。**发帖写链路**（posts/Storage 写入）未在本轮触发，归 timeline.md ST-7。

- [ ] **C-7: `channels` 表建表 + RLS**
   - 说明：§四 的 channels 结构（type: text|voice|room + scene_id + position），等文字聊天接后端（Supabase Realtime + messages 表）时一起落地。

## 测试记录

**2026-07-04 真机验收（localhost:5173 + Chrome 扩展实测，console 零报错）：**

- ✅ **worlds 迁移实战**：页面加载 `GET /auth/v1/user` 200（持久化会话恢复）→ `GET /rest/v1/worlds?...owner_id.eq.<uid>...` 200（查到真实世界行 `a8e83aff…`，active 双人）→ `POST /rpc/get_feed_posts` 200（新签名 `p_world_id` 正常）
- ✅ 房间 = 场景绑定语音频道的 UI 语义：点卧室 → `meRoom=bedroom` + `data-mood=night`（场景换夜色）+ 侧栏高亮 + 我的头像移到卧室行（她留在客厅——"看她在哪"生效）；再点当前房 no-op
- ✅ 术语：大厅卡「你们的小世界已就绪 / 进入世界」、Home/世界双栏文案全为新术语
- ✅ 默认闭麦：加入语音频道 mock 后成员行显示闭麦图标、无说话光晕
- 遗留观察：「在一起天数」sidebar 头部与 HUD 挂件数值不一致（两处各算各的 localStorage mock）——世界属性入库（supabase.md 讨论点 2）时消灭
