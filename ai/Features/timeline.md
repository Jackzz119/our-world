# Timeline · 回忆存储接后端 系统设计文档

## 当前迭代 · 竖直翻页与连续翻阅（2026-09-07）

用户授权先导出 GIF 运动样板，再用同一运动实现：纸绕书脊立起翻过；正面文字/图片不提前消失，背面与底下下一页按物理遮挡显露。连续触发累积目标，已经加载的中间页保持真实清晰内容；不为省事统一替换假字。数据库未返回的历史不能伪造页码/正文。

- [x] JT-1：三维纸面运动与 GIF 样板，逐帧核对纸、字、照片和下一页的遮挡。
- [x] JT-2：接入真实页码/目录、连续触发、反向、内容加载、缩略图续签、关闭与尺寸变化。
- [x] JT-3：实景动画与静态回归、降低动态效果、性能/停止渲染检查，更新设计系统。

采用 24 条相接纸片的三维变换：真实正文、日期、页码、图片和旧纸纹理组成同一正反纸面；单张 980ms，连续 470ms/张、行程 38% 接续，最多 3 张在空中。已加载中间页不模糊；未加载历史继续通过目录获取，不伪造页数。读日记时场景与雨保持运行。实现、GIF 与边界见 [竖直翻页实装](../design_system/cinnaglass/journal-room-object/turn-implementation.md)。

实景与静态回归已通过；修复持续阅读背景在缩放时旧唱片贴图过早释放引发的绘制异常。Vite 前端打包通过，完整类型构建仍受既有聊天 `Msg` 导入错误阻断。用户体验验收、Safari/低端设备与低带宽图片仍未覆盖，不报告“完美”或全设备通过。

不在本轮：从桌面拿起/收回的开场，羽毛笔交互。上一轮静态美术保留；旧平面翻折引擎不恢复。

## 上一轮 · 棕皮旧纸书本静态还原（2026-09-07）

用户已认可导航实装；本轮只实施批准稿的书本美术、双页排版、墨色与旧纸质感，羽毛笔为静态图片。新翻页、拿起/收回动画和羽毛笔交互留后续。数据、草稿、原图与缩略图链路保持；现有日期/页码入口仅直接换页，不把旧翻折效果作为本轮验收结果。

- [x] JA-1：批准稿生成参考驱动的空白书本和独立羽毛笔，检查透明通道、纸色与皮纹；保留失败图和处理记录。
- [x] JA-2：居中大书本、双页留白、范围框/头像/照片纸角与书写墨色。
- [x] JA-3：实景与同内容对照，长文/多图/窄屏、导航和草稿回归；登记设计系统。

静态美术已接入，用户实景审美验收待确认；不声称逐像素完美。完整证据、当前几何、资产/字体与未覆盖项见 [棕皮旧纸静态实装](../design_system/cinnaglass/journal-room-object/book-implementation.md)。旧动画不再实例化；该轮未实施的翻页与场景不停播已由顶部当前迭代接续。

视觉参考：`ai/design_system/cinnaglass/journal-room-object/room-journal-concept.png`。实施证据仍归该设计目录，不另建样式真源。旧 B 的视觉已被否决，下文仅为历史实现记录。

## 历史实装 · B「苔绿手札」（2026-09-06，效果已否决）

用户已批准 `ai/design_system/cinnaglass/journal-book-directions/codex-report.md` 推荐 B，并授权完整实施。
本节覆盖下方夜灯玻璃视觉和无限滚动表现；后端链路与历史实现记录保留。

- [x] JB-1：共用暖灰纸、灰苔封皮、轻壳材质与短导航；保留照片/日历/组件入口。
- [x] JB-2：实际内容测量分页、桌面双页/窄屏单页、长文续页、多图保序、日期目录。
- [x] JB-3：软纸翻动、连续多张、页角拖动、减少动态效果、静止停止渲染。
- [x] JB-4：草稿/详情/屏幕尺寸回归、截图与文档同步；未覆盖事项单列在验证报告，不视为已测。

实际实现及验收：[B 苔绿手札实现报告](../design_system/cinnaglass/journal-book-directions/implementation.md)。当前几何为桌面最大 760×430、中屏最大 560×360，小屏单页最大 360×560；实际高度随窗口收缩。阅读顺序仍旧→新，不分作者左右列，原无限滚动被明确替换为分页与日期目录。

影响代码：`screens.tsx`、`journal-book.tsx`、`journal-layout.ts`、`diary.css`、`materials.css`、`cinnaglass.css`、`shell/rail.tsx`（均在 `src/themes/cinnaglass/`），另含翻书依赖及本地验证脚本。
本轮不改 Supabase、posts/storage/useFeed 数据接口，不上传测试帖子，不改场景原图或角色资产。

> ## 🟢 文档状态（2026-08-22 恢复）
>
> **在役活文档**。本文于 2026-08-09 重定位提交 `7c93c3c` 中被误删——当时 `ai/reboot/tech-plan.md` §119 明确写的是「保留 timeline/chat/supabase 等仍然有效的文档」，实际执行成了 `ai/Features/` 一刀全删。现按 `CLAUDE.md` 文档维护规则原样恢复（正文逐字未改），Features 体系继续作为功能细节的唯一载体，PROJECT.md 只留摘要 + 本文引用。
>
> **v2 适用性**：timeline 功能在「放置陪伴小屋」新方向中**继续服役**。书房日记本热点现打开独立的「我们的日记」ObjectSurface（见本文第七章与 `codex-visual/20260905-215344Z/decisions-v2.md`）；照片墙/心愿单也已拆为各自物件的独立 surface。下文一至六章的链路/模块/数据模型**全部仍然成立**；「实现计划」ST-A~ST-V 为 v1 完成记录，作为设计理由存档不再回溯改写。
>
> **v1 之后的增量（2026-07-05~08，本文未含，见 PROJECT.md「已有功能资产」）**：单列日记流重设计、polaroid 照片墙、多图受控选择器 + 草稿、缩略图 1024、40 分钟签名续签、宽屏吉祥物。
>
> **已知欠账**：边界测试两处文案 bug（超限上传抛英文原文、断网误报「未登录」）——详见 `ai/TODO.md` 继承待办。
>
> **v2 历史记录**：第七章结构拆分、物件开合等保留。白纸、夜灯玻璃、B「苔绿手札」均为历史视觉；当前以本文顶部棕皮旧纸静态实装及其报告为准。

> 最后更新：2026-09-07（棕皮旧纸竖直翻页、连续翻阅与阅读时雨不停播接入本地；拿起/收回与羽毛笔仍待办，数据链路保留）
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

| 模块                                  | 职责                                                                                           | 状态                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/lib/rooms.ts`                    | 房间层：`getMyRoom()` 只查我的房（无则返回 null）；`createRoom()` 显式建房（留给独立建房入口） | ✅ 已完成（ST-C / ST-G）                           |
| `src/lib/posts.ts`                    | 数据层：`getFeedPosts(roomId?)` 返回 `FeedPost[]` / `createPost({ roomId, ... })`              | ✅ 已完成（ST-C）                                  |
| `src/lib/storage.ts`                  | Storage 层：`uploadMemoryImage()` 传原图+缩略图、`signImageUrls()` 批量签名 private URL        | ⬜ 待建（ST-5）                                    |
| `src/hooks/useFeed.ts`                | 读数据 hook：解析/自建房 + 三态 + `roomId` + `posts` + `reload`                                | ✅ 已完成（ST-D）                                  |
| `src/types/feed.ts`                   | `FeedPost / Room / FeedProfile / PostPrivacy`（RPC/表返回形状）                                | ✅ 已完成（ST-B）                                  |
| `src/themes/cinnaglass/image-slot.js` | `slot-change` 事件把 { 原图 File, webp 缩略图 dataUrl } 暴露给 React（保留 localStorage 行为） | ⬜ 待改（ST-4）                                    |
| `src/themes/cinnaglass/screens.tsx`   | `SubScreen`/`TimelineBody`/`PhotosBody`/`Composer` 从 mock 改接 posts.ts + storage.ts          | 🔨 部分（ST-E 已去配对话术；渲染/写链路见 ST-3/5） |

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

| 后端 / FeedPost                                              | 前端 mock Post              | 处理                                                                                |
| ------------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------- |
| `post_id`                                                    | `id`                        | 用后端 uuid                                                                         |
| `visible_content`                                            | `text`                      | 映射                                                                                |
| `visible_images` (string[])                                  | `img`（单个 image-slot id） | 改为 **Storage 路径数组**；显示前 `signImageUrls()` 签名，再喂给 `<image-slot src>` |
| `created_at`                                                 | `date`/`meta`               | 格式化为「刚刚/昨天/X月X日」                                                        |
| `author` / `author_id` / `couple_id`                         | —                           | 读展示用；写入时带 author/couple                                                    |
| `privacy` / `unlock_cost` / `is_unlocked` / `is_placeholder` | —                           | 本期固定 shared；占位/解锁字段先忽略                                                |
| —                                                            | `h`（瀑布流高度）           | 前端本地推导，不入库                                                                |

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

|          | Free    | Pro（$25/月） | 超出后        |
| -------- | ------- | ------------- | ------------- |
| 存储     | 1 GB    | 100 GB        | $0.0213/GB/月 |
| 出口流量 | 5 GB/月 | 250 GB/月     | $0.09/GB      |
| 图片转换 | 无      | 100 张/月     | $5/1000 张    |

换算到 2 人回忆 App（原图按 ~4MB/张）：

- **Free 1GB ≈ 250 张原图**；**Pro 100GB ≈ 2.5 万张**。两人精选回忆增长慢，Free 可撑数月～年，Pro 基本填不满。
- 流量：列表用缩略图、点开才加载原图 → 2 人浏览量对 5GB/月 是零头。
- **结论：对 2 人量级基本免费**；即便上 Pro，存储/流量成本可忽略。
- **省钱关键**：缩略图客户端用 canvas 自生成（复用 image-slot 逻辑），**不用 Supabase 图片转换**（$5/1000），成本 $0。

---

## 七、v2 重做：Codex 策划 + 三方向比稿（2026-09-05，设计已定稿，待实现）

> 背景：v1 时间线（2026-07 Discord 时代）在 v2「放置陪伴小屋」里成了「弹窗里的一个 app」——近全屏 `.modal glass tall` 盖住整间书房、两只角色完全不可见、三 tab 把三件物件的功能塞进一个容器、两侧云朵吉祥物与真角色重复。用户要求按当前风格基准（STYLE/UX/D-9~D-12）重做，委派 Codex（`codex-visual` skill，design 模式）出策划 + 比稿。
>
> **产物**：`codex-visual/20260905-215344Z/`（codex-report.md + 三张 1440×900 方向图）。改前实景 `before-open.png` / `before-idle.png` 为当日临时抓屏（scratchpad，未入库——含真实帖图与输入法候选条）。

### Codex 裁决摘要（原报告 §1.3 / §10）

1. 界面名改「回忆日记」（代码 `timeline` 不动）
2. **照片墙 / 心愿单退出三 tab**，各自物件各开各的 surface；rail/更多只是效率入口
3. 「翻开日记本」隐喻只延伸到入口、页边、书签、220ms 开合、一次轻纸声；内容区仍是数字滚动（不做双页/逐条翻/透视滚动）
4. **推荐方向 3「系回日记本的纵向长纸」**：前视平直白纸 + 6–8px 封皮露边 + 折角 + 单条书签 tether 回真实日记本；借方向 2 的「从桌面展开」作开场姿态，落稳后回平纸
5. 评分（7 项成功标准等权）：方向 1 居中白纸 86 / 方向 2 桌面展开 84 / **方向 3 = 91**
6. 分期：Phase 0 结构止血（拆 tab、删吉祥物、弃 `.modal.tall`）→ Phase 1 静态落地（DiarySurface + 三断点 1440/960/640×400）→ Phase 2 物件开合 origin + Esc 栈/focus → Phase 3 回归 → Phase 4 presence 增量（书桌一次性微光 P0）

### Claude 独立复核

- ✅ **明度层级（成功标准 1）复算一致**：纸 253.7 / 242.9 / 241.0，rail 壳 44.2 / 42.9 / 41.7，暗场景 36.9 / 31.8 / 35.9（Rec.709 luma，Codex 给的采样矩形）。补充：右墙受灯光的场景点 54–62 **高于**石墨 rail——「壳 > 场景」只在暗区成立，属正常（rail 本就是石墨），核心的「纸最亮」三图都以巨大差距成立
- ✅ 两只角色可见（标准 2）：方向 2/3 两张脸完整；方向 1 粉狗只露侧脸——同意 Codex 打分
- ⚠️ **方向 3 图与规格自相矛盾**：图中纸页实测 369px（25.6%），规格却写 560–590px。太窄会让 16:10 图与 6 行正文都局促；建议落地取 **480–520px（33–36%）**，兼顾角色露出与图片尺寸，用真实 DOM 截图定
- ⚠️ **气泡底色是新增的视觉语言**：三图都给每条回忆铺了淡蓝/淡粉底（聊天气泡感）。v1/ST-O 裁决是身份只打「光环 / 名字 / 卡片边线」，卡片本体恒白。淡色底会把日记读成聊天线程，与 PRD「互动不长在信息流里」的铁律相悖——**建议落地保持白卡 + 3px 作者色边线，最多极淡（≤6%）作者色底**，此项需用户拍板
- ✅ **token 双真源属实**（Codex §7.3）：`cinnaglass.css` 根 `--accent-deep: #268fbe`（golden 档 `#2e9fd0`、night 档 `#83d8f5`），而 `--accent-orb` 尾色与 `screens.tsx` guest tone 用 `#2f9ad3`（D-9 定稿值）。落地前必须二选一并同步 `ui-system.html`
- ✅ 三 tab 拆分符合 UX.md §2「每个物件各开白纸卡」，也顺带完成 TODO「白纸功能卡收敛」；成本 M，需先拆 `SubScreen`
- ℹ️ 方向 3 第三条文案为生图不稳被置空（Codex 已声明），不是设计意图；生图不能证明 CSS 可实现，最终以 `<link>` 真实 css 的 headless 截图 + 像素采样为验收

### Codex 历史裁决（2026-09-05；白纸视觉已于 09-06 被用户否决）

完整决策与原报告修订版见 `codex-visual/20260905-215344Z/decisions-v2.md`。以下为执行摘要：

1. **形态**：方向 3 的窄幅前视白纸 + 方向 2 的物件起点开场；打开后删除跨场景长 tether，只留封皮露边、折角和短书签尾
2. **命名**：界面标题定为「我们的日记」，内部 `timeline` 命名不动
3. **信息架构**：拆掉三 tab；日记本 / 相框 / 许愿罐分别打开日记 / 照片墙 / 心愿单的独立 ObjectSurface
4. **条目视觉**：纯白卡 + 头像光环 / 作者名 / 3px 作者色左边线；禁止淡蓝、淡粉作者色铺底
5. **纸页宽度**：`≥1200 = 504px`、`768–1199 = 432px`、`≤767 = 288px`；真实截图若角色安全区失败，优先再缩窄 16px
6. **Token**：`--accent-deep` 规范值固定为 `#2F9AD3`；夜间外壳若需更亮的蓝，另建 shell 专用 token，不再改写品牌深蓝

实现分为：结构拆分与 token 止漂 → 静态视觉与三断点 → 物件开合/无障碍 → 真实截图回归 → MVP 后 Presence。照片墙、心愿单本轮默认只做独立 surface 适配，不连带完整视觉重做。

### v2 实现记录（2026-09-05）

- `SubScreen` 已改为三张始终挂载、互不切 tab 的 ObjectSurface；切换物件时日记草稿、滚动与照片详情状态不被共用容器重置
- Pixi 热点与 rail 快捷入口会把点击的屏幕坐标交给 surface，纸面从物件/按钮方向缩放展开；打开后无长连接线
- 日记纸页实装宽度 `≥1200 = 504px`、`768–1199 = 432px`、`≤767 = 288px`；桌面向左偏移 40px，中档偏移 16px
- Esc 层级为详情/灯箱 → Composer → ObjectSurface；打开时焦点进关闭按钮，Tab 留在当前纸面，关闭后返回入口
- 真实 CSS 量测：纸页和条目背景均为 `rgb(255, 255, 255)`；`--accent-deep` 为 `#2f9ad3`；紧凑档无页面横向溢出

### 夜灯玻璃改版（2026-09-06 用户采纳并授权实装）

- 采用稿：`ai/design_system/cinnaglass/timeline-night-glass/night-memory-concept.png`；工程说明与测试证据：同目录 `implementation.md`。
- `screens.tsx`：头像与作者信息移到正文框外；现有头像优先，无头像时用项目已有蓝/粉狗头像；卡片可键盘打开详情；缩略图改普通只读图片（不再带上传组件的替换/删除控件）；图在文字下且保留边距；草稿与详情 Esc 一次只关一层；不活动 surface 使用 inert 排除键盘交互。
- `diary.css`：日记域专用 token 与组件规则，也是 design system 实时引用的样式真源。烟茶外壳 + 单层 18px 磨砂，正文中性半实底；外壳 1px 局部反光，没有全圈外发光/持续动画。宽 520 / 440 / 340px，小屏仍受容器宽度限制；展开 composer 可内部滚动，动作可达。
- **覆盖旧裁决**：日记不再恒白，取消作者色左边线、折角、封皮露边和短书签。标题/物件入口/上旧下新/分页/草稿/多图上限/签名续签不变；照片墙/心愿单不连带重做。
- 阅读态整体拉近房间取景，保持角色/家具相对位置；暂时隐藏非必要浮窗，关闭日记恢复，不重置播放与聊天状态。
- 进度：结构与材质已接入，三断点/三时辰与图文草稿回归通过，证据见上述工程说明；Vite 打包通过，TypeScript 全项目检查仍受已有聊天 Msg 导入错误阻断。

## 实现计划

> **执行顺序已按「couple → 发 post → 渲染 post」重排**（原读先行 → 改为写先行，每步可端到端验证）。ST 编号保留原始编号便于追溯，实际推进按下方序号。

进度：27 / 29 subtasks 完成（93%）

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
    - **部分完成（2026-07-04，浏览器实测）**：读链路已真机验证——持久化会话恢复 → `get_feed_posts(p_world_id)` 200、照片墙空态正确渲染（DB 0 帖）。
    - **写链路已通（2026-07-05，浏览器实测，经 ST-J 修复后）**：发帖传图 → `memories/<worldId>/` 下原图 + `.thumb.webp` 两对象、`posts.images` 存原图路径、时间线缩略图 + 照片墙均正确渲染。**边界（上传失败/URL 过期/断网等）仍待测。**

- [x] **⑩ ST-J: 修复 Composer 丢图 bug + 作者身份标识**（2026-07-05，tsc/eslint 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`、`src/hooks/useFeed.ts`、`src/lib/profiles.ts`（新）
    - 说明：**Bug**——Composer 绑定 `slot-change` 的 effect 只依赖 `[imgId]`，而组件初始为折叠态（slot 未挂载、ref=null），effect 空跑后不再重跑，监听器从未绑上 → 拖图后 `pickedRef` 恒为 null → 发布只走文字分支（`images: []`、Storage 空）。修复：effect 依赖改 `[open, imgId]`；另修「取消」不清 `pickedRef` 的隐性 stale 图问题（关闭时置 null + 换新 imgId）。
    - **作者身份标识**：RPC 只回 `author_id`，新增 `lib/profiles.ts#getProfilesByIds`，`useFeed` 拿到 world 后并行查 owner/member 两条 profile（失败降级为空 map，不影响 feed）；时间线卡片 meta 行显示作者——自己的帖显「我」（蓝 accent）+ 卡片左缘 accent 细线，对方的帖显 `display_name`（粉色）+ 粉色时间线节点。（节点样式随 ST-K 演进为 rail 头像）

- [x] **⑪ ST-K: 时间线重设计——聊天式方向 + rail 头像 + 无限上滚 + 底部 composer + lightbox + 裁撤文字回忆**（2026-07-05，UX 裁决 + tsc/eslint/build 绿 + 浏览器实测，28 条临时测试帖验证后已清理）
    - 影响：DB `get_feed_posts`（迁移 `get_feed_posts_cursor_pagination`：drop 旧签名重建，加 `p_before`/`p_limit` 游标分页，默认值向后兼容）、`src/lib/posts.ts`（`FeedPage` 参数）、`src/lib/storage.ts`（上传时从原图重生成 480px webp 缩略图，槽位预览仅作解码失败的 fallback）、`src/hooks/useFeed.ts`（分页态 `hasMore/loadingOlder/loadOlder`，posts 改升序暴露，profiles 按实际 author_id 增量补查）、`src/themes/cinnaglass/screens.tsx`（大改）、`cinnaglass.css`（`.modal.tall`）、`WorldPage.tsx`（MODAL_TABS 去 notes）
    - 设计（UX skill 裁决记录）：时间线心智从「博客 feed」换成「对话流/日记本」——上旧下新、composer 在底部（续写故事）、往上翻加载历史（游标分页 + prepend 滚动锚定）、发布后平滑滑底迎接新帖（glide 期间抑制顶部误加载 + 900ms 落底校正）；rail 节点升级为**作者头像**（名字首字 + uid 稳定散列渐变底色，支持任意多作者，`avatar_url` 就绪后自动显图）；日期改为居中 day chip 分组（今天/昨天/N月N日）；弹窗加高（`.modal.tall`）增强长卷轴感；照片墙点击开 **lightbox**（缩略图立即呈现 → 原图签名后换入，Esc/点击关闭）；**裁撤「文字回忆」tab**（与时间线同数据无独立心智，其情感价值将来归 private/locked post 类型）
    - 已知边界：发布后 `reload()` 回到最新一页（历史翻页状态重置，符合「跳回最新」预期）；日期分组按本地时区

- [x] **⑫ ST-L: 拖拽滚动 + 底部橡皮筋刷新 + member 成对配色**（2026-07-05，tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`、`cinnaglass.css`（`.modal-body` 加 `overscroll-behavior: contain`）
    - **拖拽滚动**：鼠标按住时间线任意空白处可拖动滚动（pointer 事件驱动 `scrollTop`，5px 阈值区分点击/拖动，拖动后吞掉尾随 click 防误触卡片/composer，`grab/grabbing` 光标 + 拖动中禁选中文字）；触屏保持原生滚动惯性不劫持
    - **橡皮筋刷新**：滚到底后继续上拉（鼠标拖/手指划）→ 列表带 0.5 阻尼上移（上限 96px），过 52px 阈值 caption 变「松开，刷新最新回忆」（accent 高亮），松手回弹 + `reload()` 拉最新页；未过阈值只回弹。底部常驻 caption「已经看到最新的回忆了 ·」告知已到最新；触屏路径用 `touchmove preventDefault` + `overscroll-behavior: contain` 防止手势链到页面
    - **member 成对配色**（UX 裁决）：对方帖补齐与「我」对称的三重标记——粉名字 `#D97A96` + 粉头像光环 `rgba(239,157,180,.8)` + 卡片左缘粉线 `#F2B9CB`（我 = accent 蓝三件套）；未来多作者再升级为按头像散列色
    - **member 测试数据**：以 jacklovesherryfav（member）身份插了 6 条 `【测试数据】` 前缀的帖用于双人视觉验证，**按用户要求保留在库中，上线前按前缀统一清理**

- [x] **⑬ ST-M: 交互打磨——惯性拖拽 / 独立滚动区 + 渐变边界 / composer 输入框化 / post 详情**（2026-07-05，tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - **光标**：默认光标不再是 grab，仅拖动中 `grabbing`（`data-dragging` 属性驱动）+ 拖动中禁文字选中
    - **鼠标惯性**：松手速度 >0.15px/ms 时进入 rAF 动量滚动（速度平滑采样 0.7/0.3、上限 3px/ms、指数摩擦 0.994^dt），碰到上下边界或衰减到 0.02 停止；滚轮/再按下/触摸即取消。触屏继续用浏览器原生滚动（自带惯性），仅接管「到底继续上划」的橡皮筋手势
    - **布局重构**：timeline tab 不再让 modal-body 整体滚动——`.tl-host`（flex 列）内 `.tl-scroll`（独立滚动区，上下 `mask-image` 渐变淡出）+ composer 作为**兄弟节点**固定在下方，列表内容永远不会滑到 composer 底下（原 sticky 方案废弃）
    - **composer 输入框化**：折叠态从「+ 加文字」改为完整的 pill 输入框造型（边框 + 玻璃底），hover 亮 accent 边框 + 浮现「点击书写 ✎」提示——整条可点的 affordance 不再依赖左侧加号
    - **post 详情**：时间线卡片可点（hover 微浮起）→ 打开 `PostDetail` 弹层：头像 + 作者（蓝/粉规则一致）+ 完整日期（年月日·时分）+ 原图（缩略图先显、签名原图渐进换入）+ 全文（`pre-wrap`）；Esc/点外关闭；拖拽后的误触 click 已被吞掉不会误开
    - Avatar 原子化：`.tl-ava` 拆为通用 `.ava`（+ `.ava-mine/.ava-theirs` 光环）供时间线与详情共用，rail 定位移到 `.tl .ava` 作用域

- [x] **⑭ ST-N: 宽屏华丽版时间线（近全屏弹窗 + 中央脊线交错布局）**（2026-07-05，tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/cinnaglass.css`（`.modal.tall` 尺寸）、`src/themes/cinnaglass/screens.tsx`（`@media(min-width:1000px)` 宽屏层）
    - **弹窗放大**：`.modal.tall` 从 760px 宽升级为 `width:min(1280px, calc(100% - 56px)); height:min(1000px, calc(100% - 44px))`——对齐聊天大窗（ChannelScreen `inset:3% 4%`）的近全屏量级；**尺寸基准用 stage 容器百分比而非 vw/vh**（第一版用 92vw 时被 in-flow sidebar 盖住左缘，实测后修正）
    - **宽屏交错布局**（≥1000px 生效，窄屏回落单列左轨）：时间轴脊线移到中央（`left:50%`），我的帖靠右（对应聊天「我在右」心智）、TA 的帖靠左，卡片各占 `calc(50% - 48px)`，头像分别贴向脊线两侧（`.mine .ava{left:-48px}` / `:not(.mine) .ava{right:-48px}`）；日期 chip 骑在脊线上；缩略图 72→96px；composer/心愿单居中限宽（840/820px）；照片墙 4 列
    - 蓝右粉左 + 中央脊线 = 桌面经典 timeline 模式（婚礼/纪念页常用），与二人产品的「对话感」吻合
    - **（已被 ST-O 修订）**「边 = 作者」上线当天即发现视觉跳跃 + 不可扩展，改为 zigzag，见下

- [x] **⑮ ST-O: zigzag 节奏 + 作者色身份系统 + 签名 URL 自动续签**（2026-07-05，UX 裁决 + tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - **UX 裁决**：「边 = 作者」让位置承载双重语义（顺序 + 身份），同人连发聚一侧导致视线跳跃，且第三作者出现即破产。改为**位置只管节奏、颜色只管身份**：左右按发帖顺序严格交错（经典 zigzag timeline）；身份色打在头像光环 + 名字 + 卡片边线三处（`--au-ring`/`--au-deep` 自定义属性按帖注入）
    - **作者色分配**（`toneOf`）：我 = accent 蓝（永远）；世界另一成员 = 粉（保留既有语义）；未来其他作者 = uid 散列从主题色板取（黄/绿/紫/天蓝），同人恒同色
    - **节点强化**：保留脊线头像节点，新增 16px 连接枝（`.tl-item::after`，颜色随作者色）把节点和卡片挂上
    - **图片挂机消失修复**：private bucket 签名 URL TTL 1 小时，页面挂机超时后图片 403"消失"。`useSignedThumbs` 每 40 分钟自动重签 + 标签页重新可见时立即重签（后台 tab 定时器会被浏览器节流）；照片墙补「正在加载照片…」态（签名在飞时不再误显"还没有照片"空态）

- [x] **⑯ ST-P: 时间线单列日记流（去 zigzag / 脊线节点）**（2026-07-05 用户拍板，视觉基准 `ai/design_system/cinnaglass/timeline-redesign.html`；tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - 说明：调研结论——中央脊线 + 字母节点 + 连接枝是 Git graph/企业「发展历程」的技术叙事，与大耳狗玻璃世界观冲突；zigzag 是装饰性模式（业界在窄屏一律折回单列），且情侣/日记类产品（Between/Day One/恋爱记/SumOne）全部单列日记流。改造：单列居中（620px，宽屏 680px）；脊线退成极淡点线小路（`border-left:2px dotted`）；节点/连接枝取消，头像 36px 作贴纸挂卡片左上；day chip 升级手帐日期贴纸（⭐今天/☁️昨天/🌸更早，奶油黄/天蓝渐变按天交替微旋转）；卡片重构为「作者+时间行 → 正文」，图片帖以图为主视觉（16:10 顶部通栏，`has-media` 变体）；作者身份保持颜色三件套（延续 ST-O「颜色管身份」，「位置管节奏」简化为自上而下）；卡片不旋转（用户裁决，旋转只留给贴纸和照片墙）；宽屏 zigzag/side-l/side-r 全部删除
- [x] **⑰ ST-Q: 照片墙拼贴手帐墙（polaroid + 自然纵横比）**（2026-07-05，tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - 说明：修根因——image-slot `:host` 默认 `height:160px` 把每格压成等高横条裁切，masonry 形同虚设。改用普通 `<img loading="lazy">` 保持原始纵横比做真瀑布流；相纸白框（#fffdf8 + 底缘留白）+ 日期铅笔字写相纸下缘（今天/昨天带「M.D · 今天」）+ 按 key 稳定散列 ±2.4° 微旋转（`--rot`）+ washi 胶带贴角（蓝/粉条纹按奇偶交替）+ hover 摆正浮起；月份分组小标题（跨年自动带年份）；lightbox 渐进加载保留
- [x] **⑱ ST-R: 缩略图 1024 升级 + 存量重生成**（2026-07-05，浏览器实测 2/2 成功）
    - 影响文件：`src/lib/storage.ts` + 一次性 dev 模块（已删）
    - 说明：`THUMB_MAX` 480 → 1024（480 在高 DPI + ~280px 列宽下竖图是放大显示，必糊；lightbox 渐进期更是马赛克）；存量帖的 480 缩略图经临时 `dev-regen-thumbs.ts`（挂 window、走登录态用户 RLS、`upsert:true` 覆盖）在浏览器一次性从原图重生成 1024 webp，跑完即删（模块 + App.tsx 临时 import）

- [x] **⑲ ST-S: 白底纸感 + composer 上传区/CTA 重做**（2026-07-05 用户拍板，比稿 `ai/design_system/cinnaglass/composer-redesign.html`；tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - 说明：①post 卡片/详情卡/composer 统一亮白底（`.tl-card` 84% / `.pd-card` 88% / `.compose` 86% 白）——深色场景透过 66% 白玻璃显朦胧蓝，字浮在雾上；②上传区从 62px 方块（空态「图标+标题+副行」竖排三层必剪裁）改 **V1 宽条拖放区**（整宽 ×108px，Fitts 定律最大命中区，文案完整；比稿含 V2 大方块 / V3 icon-only 及否决理由）；③发布按钮改 **B1「✨ 记下这一刻」**（动词+情感价值替代平台向「发布」，与折叠态「记录此刻的我们…」同句式呼应；微光阴影 + busy 态「正在收进小世界…」；仍复用 `.btn-primary` 原子，`.btn-pub` 只加尺寸/光）
- [x] **⑳ ST-T: 多图上传 + 溢出/省略修复 + 输入框自动长高 + 吉祥物**（2026-07-05，比稿 `ai/design_system/cinnaglass/timeline-mascot-multiimg.html`；tsc/eslint/build 绿 + 浏览器端到端实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - **修「拖 B 传 A」bug**：旧 62px `<image-slot>` 方块是极小拖放目标，第二次拖拽脱靶时旧选择原样上传。Composer 弃用 image-slot，改**受控多图选择器**：整个展开态皆可拖放，空态宽条 → 已选缩略图行（×移除 / ＋追加 / 上限 9 张计数），**所见即所传**；objectURL 预览按移除/取消/发布及时 revoke
    - **多图上传**：发布循环 `uploadMemoryImage`（原图+1024 缩略图各一份）→ `posts.images` 存路径数组；卡片=首图 16:10 hero + 右下「＋N 张」徽标；详情=全部图片渐进加载（缩略图先显、签名原图逐张换入）；照片墙天然摊平多图。放开「必须有文字」：有图即可发
    - **溢出修复 + 省略**：`.tt` 加 `overflow-wrap:anywhere`（修无空格长串穿出卡片）+ `-webkit-line-clamp:6`（超 6 行省略，全文进详情）
    - **输入框自动长高**：textarea 随内容长高（scrollHeight，上限 220px ≈ 5-6 行后内部滚动），打开时初算
    - **吉祥物**：原创云朵小狗 SVG（非授权素材）——蓝狗睁眼在左、粉狗眯眼在右（呼应作者色语言），≥1200px 宽屏才出现、pointer-events 关闭、漂浮周期 6s/7.2s 错开、respects prefers-reduced-motion
    - **实测记录**：DataTransfer 注入 3 张 canvas 生成图（横/竖/方）→ ×移除第 3 张 → ＋追加第 4 张 → 发布 → 卡片「＋2 张」徽标 + 6 行省略 + 详情三图（顺序 A/B/D 证明移除/追加正确）+ 照片墙 6 瞬间全对；console 零报错。测试帖带【测试数据】前缀留库，上线前统一清理
- [x] **㉑ ST-U: composer 草稿交互 + 紧凑化**（2026-07-06，UX 裁决 + 比稿 `ai/design_system/cinnaglass/composer-compact.html`；tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - **草稿规则（UX 裁决）**：隐式动作永不销毁内容——点 composer 外部 / Esc → 收起且草稿保留（文字+已选图）；「取消」是唯一显式清空路径；发布成功也清空。配套设计：折叠 pill 有草稿时变**草稿预览**（accent 边框 +「✎ 草稿」奶油黄贴纸 + 首行文字省略预览 + 图片数），否则用户会误以为内容丢失（对齐 X/Gmail 的 draft-on-dismiss 惯例）
    - **紧凑化（选 H2）**：展开态 ≈258px → **实测 127px**——textarea 一行起步（min-height 70→44，自动长高不变）、96px 常驻拖放条撤销（多数发帖不带图，为少数场景常驻付 96px 不值）、照片入口改操作行左侧 34px 圆钮 `.pk-cam`、整个 composer 仍是拖放目标（拖拽悬停高亮外框 `.compose.dropping`，不做布局位移避免 dragleave 抖动）、缩略图行仅选图后出现（76→64px）
    - **实测**：展开 127px；输入文字+1 图 → 点时间线空白 → 草稿 pill 呈现正确 → 重开文字/图完整 → 取消 → 回空占位 pill
- [x] **㉒ ST-V: composer 高度语义修正**（2026-07-06，用户澄清 + tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/themes/cinnaglass/screens.tsx`
    - 说明：ST-U 对「太高」的理解有偏——用户指的是 **idle 折叠条**，展开态原高度 + 拖拽提示没问题。修正：折叠 pill 52→40px（chip 36→28、总高 74→62px 实测）；展开态回退 ST-T 布局（textarea 70px + 96px 宽拖放条常驻 + 选图后缩略图行/＋块），撤销 H2 的 `.pk-cam` 圆钮；**保留** ST-U 的全部草稿能力（点外/Esc 收起保草稿、取消唯一清空、草稿预览 pill）与拖拽悬停高亮
- [x] **⑨ ST-I: feed 懒加载**（2026-07-04，tsc/eslint/build 绿 + 浏览器实测）
    - 影响文件：`src/hooks/useFeed.ts`、`src/themes/cinnaglass/screens.tsx`
    - 说明：`SubScreen` 以 `screen=null` 挂载时钩子照跑，导致页面加载即拉 feed。`useFeed(enabled)` 加渲染期闩锁（首次 enabled 才 arm、之后保持，`reload()` 手动刷新）；实测：加载/进世界均 0 次 `get_feed_posts`，首次打开时间线弹窗恰好 1 次。弹窗保持常驻 DOM（淡入淡出动画依赖 `.show` 切换），故懒的是数据不是挂载。

---

## 测试记录

> 本机无法 `pnpm dev` / 无真实登录态（MCP 走 service role 绕过 RLS），代码已过 tsc + eslint 静态检查。以下为 ST-7 在另一台机器的**待执行**清单。

### 主链路（端到端）

- [x] 登录 + 已有世界 → 打开 SubScreen 时间线，`useFeed` 进 ready（2026-07-04 真机验证）
- [ ] 无房账号打开时间线 → error 态显示「找不到你的房间…」（而非自动建房）
- [x] 纯文字发帖 → `posts` 落一行（world_id 正确）→ `reload` 后时间线可见（2026-07-05 用户真机实测，即暴露 ST-J bug 的那次发帖）
- [x] 带图发帖 → `memories/<worldId>/` 下出现 原图 + `.thumb.webp` 两个对象 → 时间线显示缩略图（签名 URL）→ 照片墙出现该图（2026-07-05 ST-J 修复后浏览器实测通过；修复前用户实测带图发帖只落了纯文字帖 `images:[]`，该旧帖仍在，可自行删除或补图重发）
- [x] 作者标识：自己的帖显「我」+ 蓝 accent，对方的帖显 display_name + 粉色（2026-07-05，双人帖对照待另一账号发帖后复验）
- [ ] 双人房：另一账号（dev room `a8e83aff…`）能看到对方 shared 帖

### 边界

- [ ] 上传失败（超 25MB / 非图片 mime）→ 提示、草稿保留
- [ ] `createPost` 失败 → 错误提示、不清空
- [ ] signed URL 过期（>1h）→ 重开/重签是否正常
- [ ] 网络断开 → 发布中态与错误提示
- [ ] 无房 → error 提示（不再自动建房，竞态问题随之消失）
- [ ] 邮箱确认未完成的账号登录行为
