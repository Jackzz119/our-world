# Timeline · 回忆存储接后端 系统设计文档

> 最后更新：2026-07-04（术语映射备注）
> 路线图位置：① 回忆存储（核心）——见 `ai/PROJECT.md` / `ai/TODO.md`
> 关联代码：`src/lib/posts.ts`、`src/lib/storage.ts`（Storage 上传/签名）、`src/hooks/useFeed.ts`、`src/types/feed.ts`、`src/themes/cinnaglass/screens.tsx`、`src/themes/cinnaglass/image-slot.js`
>
> ⚠️ **术语映射（2026-07-04，见 `ai/Features/channel.md` C-3）**：本文档正文写作时的 `rooms` 表 / `Room` / `getMyRoom` / `room_id` / `roomId`，已全量迁移为 `worlds` / `World` / `getMyWorld`（`src/lib/worlds.ts`）/ `world_id` / `worldId`。下文历史记录不回溯改写，读时按此映射。

---

## 一、功能目标

把回忆系统的 **时间线（timeline）+ 图文 post** 从纯前端 mock（localStorage）升级为**接入真实 Supabase 后端**，让两个人发的回忆能持久化、互相看见。这是产品「回忆资产 + 陪伴感」内核的第一块落地。

**本期范围：**
- 时间线**读**：从后端拉取真实 post 列表展示
- 发帖**写**：文字 + 图片（**原图 + 缩略图存 Supabase Storage**，`posts.images` 存路径）写入后端
- 照片墙：由真实 post 的图片汇聚

**本期不做（明确排除）：**
- locked / private / unlock 解锁经济（本期 post 一律 `privacy = 'shared'`）
- 视频存储（later）
- 房主建房 / 对方加入空间 UI（**已定方向**：Discord 式「房主开房、对方加入」，非邀请配对；本期 couple 用一次性 SQL 建，加入 UI + schema 改造留作后续独立 feature）

> **图片存储方案变更（2026-06-27）**：原计划 Base64 直存 DB，已改为 **Supabase Storage**——为「回忆资产」保留原图画质。private bucket + RLS 按 room 隔离；客户端自生成 webp 缩略图（不走 Supabase 图片转换，省成本）。成本评估见「六」。
>
> **模型变更：couple → room（owner/member），单人可发帖（2026-06-27）**：放弃「必须配对成 couple」前提。`couples` 全量改名为 `rooms`：`owner_id`（房主=创建者）+ `member_id`（可空，被邀请成员）+ `status`（`pending`=单人/待成员、`active`=成员已加入）。**单人 = 只有 owner，照样建房发帖**，UI 去掉「未配对」话术。schema 早已支持（user2 可空 + status），本次把它落地到前端 + 改名。邀请 UI 仍后续。详见下方「实现计划（修订版）」。

---

## 二、调用链路

### 前置（已在别处完成）
- **auth**：`useAuth` + `ProtectedRoute`（dev 跳过）+ cinnaglass 登录页 —— 代码就绪、build 绿，待真机实测
- **Supabase 项目**：当前 `.env.local` 指向 `xrscspcqnsxvfshskfpy`，已确认 5 张表 + `get_feed_posts` RPC 均存在（数据为空）

### 读链路（打开时间线）
```
SubScreen 打开 (screen='timeline')
  → useFeed()
     → getMyRoom()                     // src/lib/rooms.ts —— 只查我的房（owner 或 member）
        → 查不到 → error 态（feed 代表「已进房」，无房=异常：未创建 / 房主已删）
     → getFeedPosts(room.id)           // src/lib/posts.ts
        → supabase.rpc('get_feed_posts', { p_room_id })  // 返回 FeedPost[]（无 wrapper）
  → loading / ready / error 三态（不再有「未配对」；建房是独立主动动作，不在 feed 里）
  → posts 映射为时间线卡片渲染（visible_content / visible_images / created_at）——真 post 渲染见 ST-3
```

### 写链路（发帖）
```
Composer（ready 态始终有 roomId）
  → 文字输入 + image-slot 选图（拖入/选文件 → canvas 压缩出 webp 缩略图；原图 File 保留）
  → image-slot 通过 slot-change 事件抛出 { file(原图), dataUrl(webp 缩略图) }（ST-4）
  → React 收集 { content, file, thumbDataUrl }
  → 点发布：
     ① uploadMemoryImage(roomId, file, thumb)              // src/lib/storage.ts
        → 上传原图 + 缩略图到 Storage bucket 'memories'，返回 { originalPath }
     ② createPost({ roomId, content, images:[originalPath], privacy:'shared' })  // src/lib/posts.ts
        → posts.images 存 Storage 路径（不再是 Base64）
  → 成功 → reload() 刷新；失败 → 错误提示，保留草稿
```

### 照片墙
```
PhotosBody → 复用读链路已拉取的 posts → 过滤出含 images 的 post → 瀑布流展示
```

---

## 三、模块设计

| 模块 | 职责 | 状态 |
| --- | --- | --- |
| `src/lib/rooms.ts` | 房间层：`getMyRoom()` 只查我的房（无则返回 null）；`createRoom()` 显式建房（留给独立建房入口） | ✅ 已完成（ST-C / ST-G） |
| `src/lib/posts.ts` | 数据层：`getFeedPosts(roomId?)` 返回 `FeedPost[]` / `createPost({ roomId, ... })` | ✅ 已完成（ST-C） |
| `src/lib/storage.ts` | Storage 层：`uploadMemoryImage()` 传原图+缩略图、`signImageUrls()` 批量签名 private URL | ⬜ 待建（ST-5） |
| `src/hooks/useFeed.ts` | 读数据 hook：解析/自建房 + 三态 + `roomId` + `posts` + `reload` | ✅ 已完成（ST-D） |
| `src/types/feed.ts` | `FeedPost / Room / FeedProfile / PostPrivacy`（RPC/表返回形状） | ✅ 已完成（ST-B） |
| `src/themes/cinnaglass/image-slot.js` | `slot-change` 事件把 { 原图 File, webp 缩略图 dataUrl } 暴露给 React（保留 localStorage 行为） | ⬜ 待改（ST-4） |
| `src/themes/cinnaglass/screens.tsx` | `SubScreen`/`TimelineBody`/`PhotosBody`/`Composer` 从 mock 改接 posts.ts + storage.ts | 🔨 部分（ST-E 已去配对话术；渲染/写链路见 ST-3/5） |

**rooms.ts / posts.ts / storage.ts 设计要点：**
- `getFeedPosts` 走 RPC（服务端处理隐私/解锁规则），不在前端拼权限；**RPC 返回的是 post 行数组，不是 wrapper**
- `createPost` 的 `author_id` 取自 `supabase.auth.getUser()`，`roomId` 由调用方传入
- **图片走 Storage**：`posts.images (text[])` 存的是 Storage **路径**，不是 Base64
- **路径约定**：`<room_id>/<uuid>.<ext>`（原图）、`<room_id>/<uuid>.thumb.webp`（缩略图）；缩略图路径由原图路径按约定推导
- **private bucket**：显示时用 `createSignedUrl` 签名临时 URL（read 路径在 ST-3 处理）

**room_id 处理：** `createPost` 需要 `roomId`，由 UI 从 `useFeed().roomId` 拿。**建房是独立主动动作**（Discord 式「开房」，`createRoom()`），不在 feed 里发生；feed 页代表「已进房」，`getMyRoom()` 查不到房即异常 → error 态（未创建 / 房主已删）。单人房 `member_id` 为 null、`status` 默认 `pending`，被邀请者加入后置 `active`（邀请 UI 后续）。**将来**：realtime 检测到当前房在 DB 消失（房主删房）→ 踢出所有 member。

---

## 四、数据模型对齐

后端 `posts` ↔ 前端当前 `screens.tsx` 的 mock `Post` 差异：

| 后端 / FeedPost | 前端 mock Post | 处理 |
| --- | --- | --- |
| `post_id` | `id` | 用后端 uuid |
| `visible_content` | `text` | 映射 |
| `visible_images` (string[]) | `img`（单个 image-slot id） | 改为 **Storage 路径数组**；显示前 `signImageUrls()` 签名，再喂给 `<image-slot src>` |
| `created_at` | `date`/`meta` | 格式化为「刚刚/昨天/X月X日」 |
| `author` / `author_id` / `couple_id` | — | 读展示用；写入时带 author/couple |
| `privacy` / `unlock_cost` / `is_unlocked` / `is_placeholder` | — | 本期固定 shared；占位/解锁字段先忽略 |
| — | `h`（瀑布流高度） | 前端本地推导，不入库 |

`posts` 表（已建）：`id / author_id / couple_id / content / images(text[]) / privacy / unlock_cost / created_at / updated_at` + 触发器 `set_updated_at`、`check_post_author_in_couple`；RLS：自己全可见、对方仅 shared|locked、增删改仅自己。

---

## 五、待实现 / 已知问题

1. **开发期测试需手动准备数据**（当前项目空）：① 两个账号（登录页注册或 Dashboard 建，注意项目开了**邮箱确认**）② 一条 `couples` 记录把两个 user_id 配上（约束 `user1_id < user2_id`、禁自配）。本期房间靠一次性 SQL「钦定」，不做 UI —— SQL 见 [`sql/dev-create-couple.sql`](../../sql/dev-create-couple.sql)。
   未来「房主开房 + 对方加入」(Discord 式) 需改 schema（`user2_id` 可空 + owner/状态）并连带改 `get_feed_posts` / RLS，单独立 feature。
2. **未配对状态**：单人 / 没 couple 时 `getFeed` 会失败 → 时间线显示「还没有和 TA 配对」之类空状态，发帖入口禁用。
3. **Storage 方案**：原图存 bucket（珍藏），缩略图客户端生成（webp，复用 image-slot 压缩逻辑）。`posts.images` 存路径；private bucket 显示走 signed URL（有有效期，需在前端按需重签/缓存）。**单帖先限 1 张**，多图后续。
4. **image-slot ↔ React 数据出口**：当前图片只进 image-slot 自己的 localStorage，React 拿不到。ST-4 让它把**原图 File + webp 缩略图 dataUrl** 通过 `slot-change` 事件抛出，供上传 Storage 用。
5. **`get_feed_posts` 返回结构**：已按 `feed.ts` 的 `CoupleFeedResponse` 类型对接；真机联调时确认字段一致。
6. **邮箱确认**：项目开启了邮箱确认，邮箱注册需确认邮件才能登录；建议主推 Google 登录或 Dashboard 直接确认。
7. **signed URL 有效期**：private bucket 的图靠 `createSignedUrl` 临时签名展示；前端要管理有效期（过期重签）。后续可考虑缓存策略。
8. **dev 用户早于 signup 触发器，需手动 backfill profiles**（2026-06-27 实测）：`couples.user1/2_id`、`posts.author_id` 外键指向 `public.profiles`。触发器 `on_auth_user_created → handle_new_user()` **存在且启用**，对每个新 `auth.users` 无条件插一行 profiles（display_name 取 metadata.full_name 或邮箱前缀），所以**真实新用户注册会自动建档、无需担心**。本期两个 dev 账号是在该触发器之前创建的（AFTER INSERT 不回填历史行），故 `profiles` 为空、建 couple 外键失败；已手动 backfill 这两行后建 couple 成功。结论：仅历史孤儿账号需手动补，新注册流程正常。
9. **SQL 文件 bug（2026-06-27）**：`dev-create-couple.sql` 用了 `min(id)/max(id)`，但 Postgres 对 `uuid` 无 min/max 聚合 → 报 `function min(uuid) does not exist`。已改用 `order by id asc/desc limit 1`，文件待同步修正。

---

## 六、Storage 成本评估（2026-06-27）

Supabase 官方定价（查证自 supabase.com/pricing）：

| | Free | Pro（$25/月） | 超出后 |
| --- | --- | --- | --- |
| 存储 | 1 GB | 100 GB | $0.0213/GB/月 |
| 出口流量 | 5 GB/月 | 250 GB/月 | $0.09/GB |
| 图片转换 | 无 | 100 张/月 | $5/1000 张 |

换算到 2 人回忆 App（原图按 ~4MB/张）：
- **Free 1GB ≈ 250 张原图**；**Pro 100GB ≈ 2.5 万张**。两人精选回忆增长慢，Free 可撑数月～年，Pro 基本填不满。
- 流量：列表用缩略图、点开才加载原图 → 2 人浏览量对 5GB/月 是零头。
- **结论：对 2 人量级基本免费**；即便上 Pro，存储/流量成本可忽略。
- **省钱关键**：缩略图客户端用 canvas 自生成（复用 image-slot 逻辑），**不用 Supabase 图片转换**（$5/1000），成本 $0。

---

## 实现计划

> **执行顺序已按「couple → 发 post → 渲染 post」重排**（原读先行 → 改为写先行，每步可端到端验证）。ST 编号保留原始编号便于追溯，实际推进按下方序号。

进度：13 / 15 subtasks 完成（约 87%）

> **修订（2026-06-30，room/solo 落地）**：ST-2 的「未配对四态」被废弃，couple 全量改名 room（ST-A~F）。原 ST-3/4/5/6/7 续做，`coupleId` 一律改 `roomId`。
> **再修订（2026-07-02，建房改主动式）**：放弃「进 feed 自动建房」，改为 feed 只查房、无房即 error；建房是独立主动动作（ST-G 拆函数，ST-H 做入口 UI）。故「重复建房竞态」边界随之消失（用户手动点，不并发）。

- [x] **ST-A: DB 迁移 couples → rooms（owner/member）+ 单人发帖支持**（2026-06-30，MCP apply_migration `rename_couples_to_rooms_owner_member` + `rename_couple_status_enum_to_room_status`，已验证）
   - 影响：Supabase schema
   - 说明：`couples`→`rooms`，`user1_id`→`owner_id`、`user2_id`→`member_id`；删 uuid 定序约束；`posts.couple_id`→`room_id`；触发器函数/触发器/RPC 参数与返回列（`p_room_id`/`room_id`）、`posts: select` RLS、4 条 storage RLS、rooms 策略名、`couple_status`→`room_status` enum 全量改名。验证：旧 couples 消失、`get_feed_posts(room)` 可执行、dev room 数据完好。

- [x] **ST-B: feed.ts 类型对齐**（2026-06-30，tsc 绿）
   - 影响文件：`src/types/feed.ts`
   - 说明：删 `CoupleMeta`/`CoupleFeedResponse`（RPC 实际只吐 post 行数组、无 wrapper）；`FeedPost.couple_id`→`room_id` + 补 `updated_at`、删不存在的 `author` 字段；新增 `Room` 类型（不含 status——前端用 `member_id` 判断单/双人）。

- [x] **ST-C: rooms.ts + posts.ts 数据层**（2026-06-30，tsc/eslint 绿）
   - 影响文件：`src/lib/rooms.ts`（新）、`src/lib/posts.ts`
   - 说明：`rooms.ts` 的房间层（初版为 `getOrCreateMyRoom`，**后经 ST-G 拆分**为只查的 `getMyRoom` + 显式建房的 `createRoom`）。`posts.ts` 的 `getFeed`→`getFeedPosts(roomId)` 返回 `FeedPost[]`（修原 `as CoupleFeedResponse` 形状 bug）、`createPost` 的 `coupleId`→`roomId`。**建房逻辑独立于 posts.ts**（关注点分离）。

- [x] **ST-D: useFeed 去未配对态**（2026-06-30，tsc/eslint 绿）
   - 影响文件：`src/hooks/useFeed.ts`
   - 说明：删 `unpaired` 态与 `isUnpaired` 启发式，改 `loading/ready/error` 三态；流程（ST-G 后）`getMyRoom()`→查不到房进 error 态→否则 `getFeedPosts(room.id)`→ready；暴露 `room`/`roomId`/`currentUserId`/`posts`/`reload`。

- [x] **ST-E: screens.tsx 去配对话术**（2026-06-30，tsc/eslint 绿）
   - 影响文件：`src/themes/cinnaglass/screens.tsx`
   - 说明：`TimelineBody` 删「还没有和 TA 配对」分支，`coupleId`→`roomId` 全量改名；ready 态 Composer 始终拿到 roomId 可发帖。仍渲染 mock SEED_POSTS（真 post 见 ST-3）。

- [x] **ST-F: SQL 文件 + 文档同步**（2026-06-30）
   - 影响文件：`sql/dev-create-couple.sql`→`sql/dev-create-room.sql`（重写为 owner/member 两人房 + 说明单人房现由 app 自动建）、`sql/storage-memories-bucket.sql`（room_id/rooms 改名）、本文档。

- [x] **② ST-8: Storage bucket + RLS（后端前置）**（2026-06-27，MCP apply_migration `create_memories_storage_bucket`，已验证 bucket + 4 策略存在）
   - 影响：Supabase（SQL，本机 MCP 断时走 Dashboard）；SQL 见 [`sql/storage-memories-bucket.sql`](../../sql/storage-memories-bucket.sql)
   - 说明：建 private bucket `memories`（25MB 上限、限图片 mime）+ 4 条 RLS 策略（按路径首段 room_id 隔离读写；策略已随 ST-A 改名 `memories: room can …`）。
   - **同时建好 dev room**：`a8e83aff-7e7b-4b12-8944-9d5f3ac3a2ea`（active，owner=jacklovesherryfav、member=jackzhenghw）。

- [x] **③ ST-4: image-slot 把「原图 File + webp 缩略图」暴露给 React**（2026-07-01，tsc/eslint 绿）
   - 影响文件：`src/themes/cinnaglass/image-slot.js`
   - 说明：新增 `_emitChange(dataUrl, file)`，`_ingest` 成功时派发 `slot-change`（detail `{ id, dataUrl(webp 缩略图), file(原图) }`，`bubbles+composed`）、clear 时派发 `(null,null)`；localStorage 行为不变。

- [x] **④ ST-5: storage.ts + 发帖写链路接入**（2026-07-01，tsc/eslint 绿）
   - 影响文件：`src/lib/storage.ts`（新）、`src/themes/cinnaglass/screens.tsx`
   - 说明：`storage.ts` 实现 `uploadMemoryImage(roomId, file, thumbDataUrl)`（原图 + webp 缩略图各传一份到 `memories`，返回原图路径）、`thumbPathOf()`、`signImageUrls()`；`Composer` 用 ref 监听 `slot-change` 收 { file, dataUrl } + 文字 → 上传 Storage → `createPost({ roomId, images:[原图路径] })` → `onPublished()=reload`；发布中 `发布中…`/禁用、失败提示、单帖限 1 图。**此步起能发出真 post，原图进 Storage、路径进 DB。**

- [x] **⑤ ST-3: 时间线渲染（读链路展示）**（2026-07-01，tsc/eslint 绿）
   - 影响文件：`src/themes/cinnaglass/screens.tsx`、`src/lib/storage.ts`（`signImageUrls`）
   - 说明：`TimelineBody` 改吃 `useFeed()` 全量 → 渲染 `feed.posts`（替换 SEED_POSTS）；对 `visible_images` 推导缩略图路径 `thumbPathOf` → `signImageUrls()` 批量签名 → 喂 `<image-slot src>`（无 id 直显、无图则不渲染 slot）；`visible_content` + `created_at` 格式化（刚刚/今天/昨天/日期 + 时间）；空态「还没有回忆 · 记录第一条吧」。**图片策略采用方案 A：DB 只存原图路径，列表只显缩略图（签名），原图仅按需下载。**

- [x] **⑥ ST-6: 照片墙接入**（2026-07-01，tsc/eslint 绿）
   - 影响文件：`src/themes/cinnaglass/screens.tsx`
   - 说明：`PhotosBody` 改吃 `feed.posts`，把每帖 `visible_images` 摊平为图块、用共享缩略图 URL 渲染瀑布流，空态提示。**签名逻辑上提为 `useSignedThumbs(posts)` hook 并放到 `SubScreen`，时间线与照片墙共用一份 `path→url` map（一次网络请求，不重复签名）**。附带清理：Composer 的 `<image-slot>` 去掉 `id`，选图不再写 localStorage（避免发帖后残留孤儿 webp）；删除 mock `Post` 类型 / `SEED_POSTS` / `ow-posts-v1` 读写。

- [x] **⑦ ST-G: 建房改主动式（去自动建房）**（2026-07-02，tsc/eslint 绿）
   - 影响文件：`src/lib/rooms.ts`、`src/hooks/useFeed.ts`
   - 说明：把 `getOrCreateMyRoom` 拆成 **`getMyRoom()`**（只查，无则返回 null）+ **`createRoom()`**（显式建房，owner=自己、单人 pending）。`useFeed` 改用 `getMyRoom()`，**查不到房 → error 态 + 提示**「找不到你的房间——可能还没创建，或已被房主删除」。**理念**：feed 页 = 已进房，建房是独立主动动作（Discord 式），不在 feed 里发生。

- [ ] **ST-H: 「创建房间」入口 UI**（待做，独立于本链路）
   - 影响文件：待定（可能 `space.tsx` SpaceScreen / 一个独立进入页）
   - 说明：无房用户主动点「创建房间」→ 调 `createRoom()` → 进入。位置待与你确认。

- [ ] **⑧ ST-7: 联调 + 边界**
   - 影响文件：全链路 + 测试数据准备
   - 说明：端到端（登录→(已有房)发帖→原图进 Storage→刷新可见）；图片体积/数量、上传失败、signed URL 过期、网络失败、邮箱确认、无房→error 提示、（将来）房主删房踢人等边界。
   - **部分完成（2026-07-04，浏览器实测）**：读链路已真机验证——持久化会话恢复 → `get_feed_posts(p_world_id)` 200、照片墙空态正确渲染（DB 0 帖）。**写链路（发帖 + 传图）与边界仍待测。**

- [x] **⑨ ST-I: feed 懒加载**（2026-07-04，tsc/eslint/build 绿 + 浏览器实测）
   - 影响文件：`src/hooks/useFeed.ts`、`src/themes/cinnaglass/screens.tsx`
   - 说明：`SubScreen` 以 `screen=null` 挂载时钩子照跑，导致页面加载即拉 feed。`useFeed(enabled)` 加渲染期闩锁（首次 enabled 才 arm、之后保持，`reload()` 手动刷新）；实测：加载/进世界均 0 次 `get_feed_posts`，首次打开时间线弹窗恰好 1 次。弹窗保持常驻 DOM（淡入淡出动画依赖 `.show` 切换），故懒的是数据不是挂载。

---

## 测试记录

> 本机无法 `pnpm dev` / 无真实登录态（MCP 走 service role 绕过 RLS），代码已过 tsc + eslint 静态检查。以下为 ST-7 在另一台机器的**待执行**清单。

### 主链路（端到端）
- [ ] 登录（Google 或已确认邮箱）+ 已有房（dev room 或经 ST-H 建房）→ 打开 SubScreen 时间线，`useFeed` 进 ready
- [ ] 无房账号打开时间线 → error 态显示「找不到你的房间…」（而非自动建房）
- [ ] 空房（有房无帖）→ 时间线空态「还没有回忆 · 记录第一条吧」，发布按钮可用
- [ ] 纯文字发帖 → `posts` 落一行（room_id 正确）→ `reload` 后时间线可见
- [ ] 带图发帖 → `memories/<roomId>/` 下出现 原图 + `.thumb.webp` 两个对象 → 时间线显示缩略图（签名 URL）→ 照片墙出现该图
- [ ] 双人房：另一账号（dev room `a8e83aff…`）能看到对方 shared 帖

### 边界
- [ ] 上传失败（超 25MB / 非图片 mime）→ 提示、草稿保留
- [ ] `createPost` 失败 → 错误提示、不清空
- [ ] signed URL 过期（>1h）→ 重开/重签是否正常
- [ ] 网络断开 → 发布中态与错误提示
- [ ] 无房 → error 提示（不再自动建房，竞态问题随之消失）
- [ ] 邮箱确认未完成的账号登录行为