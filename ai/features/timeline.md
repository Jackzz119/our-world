# Timeline · 回忆存储接后端 系统设计文档

> 🟢 **在役活文档**。回忆链路（时间线/日记本 + 照片墙 + Composer + Storage）的功能细节唯一载体，PROJECT.md 只留摘要 + 本文引用。
> 最后更新：2026-09-07（棕皮旧纸竖直翻页、连续翻阅、阅读时雨不停播接入本地；拿起/收回与羽毛笔交互仍待办，数据链路未动）
> 路线图位置：① 回忆存储（核心）——见 `ai/PROJECT.md` / `ai/TODO.md`
> 关联代码：`src/lib/posts.ts`、`src/lib/storage.ts`、`src/lib/worlds.ts`、`src/lib/profiles.ts`、`src/hooks/useFeed.ts`、`src/types/feed.ts`、`src/themes/cinnaglass/screens.tsx`、`journal-room-book.tsx`、`journal-layout.ts`、`journal-turn.ts`、`journal-turn-controller.ts`、`journal-room.css`、`journal-turn.css`、`diary.css`
>
> ⚠️ **术语映射（2026-07-04 完成迁移）**：`couples` → `rooms` → **`worlds`**。历史 ST 条目与已归档的实现报告里写的 `rooms` / `Room` / `getMyRoom` / `room_id` / `roomId`（更早写 `couple*`），线上与代码均已是 `worlds` / `World` / `getMyWorld`（`src/lib/worlds.ts`）/ `world_id` / `worldId`。表结构与 RPC 现状真源见 [`ai/PROJECT.md`「数据库」章](../PROJECT.md)。本文一至六章已按当前命名改写，下方「实现计划」的历史条目保留原始措辞不回溯改写。

## 当前形态（视觉与交互，2026-09-07）

日记打开的是**桌上同一本棕皮旧纸书**：居中双页、手写风墨色、真实日期/页码/照片与旧纸纹理同属一张纸面；羽毛笔是静态装饰图片。翻页用 24 条相接纸片的三维变换（单张 980ms；连续时 470ms/张、行程 38% 接续、最多 3 张在空中），已加载的中间页显示真实清晰内容、不伪造页码或正文，未加载的历史继续通过日期目录按游标取。读日记时场景与雨保持运行，不重置播放与聊天状态。

- 实装、GIF 证据与边界：[竖直翻页实装](../design_system/uiux/cinnaglass/journal-room-object/turn-implementation.md)
- 静态美术（书本几何、纸色、双页排版、资产/字体、未覆盖项）：[棕皮旧纸静态实装](../design_system/uiux/cinnaglass/journal-room-object/book-implementation.md)
- 批准稿：`ai/design_system/uiux/cinnaglass/journal-room-object/room-journal-concept.png`；样式真源在 design_system 侧，本文不另建第二份样式真源。
- **未覆盖，不得声称完成**：用户实景审美验收、Safari/低端设备、低带宽图片加载、从桌面拿起/收回的开场动画、羽毛笔交互。完整类型构建仍受既有聊天 `Msg` 导入错误阻断（Vite 前端打包通过）。

已否决的历史视觉（白纸 v2、夜灯玻璃、B 苔绿手札）压在下方第七章。

---

## 一、功能目标

把回忆系统的 **时间线（timeline）+ 图文 post** 从纯前端 mock（localStorage）升级为 **接入真实 Supabase 后端**，让两个人发的回忆能持久化、互相看见。产品「回忆资产 + 陪伴感」内核的第一块落地。

**本期范围**：时间线读（后端拉真实 post）、发帖写（文字 + 图片，原图 + 缩略图进 Storage，`posts.images` 存路径）、照片墙（由真实 post 的图片汇聚）。

**本期不做（明确排除）**：locked / private / unlock 解锁经济（本期 post 一律 `privacy = 'shared'`）；视频存储。

**两条仍然有效的方案决策：**

- **图片存 Supabase Storage，不 Base64 直存 DB**（2026-06-27）——为「回忆资产」保留原图画质。private bucket + RLS 按 world 隔离；缩略图由客户端 canvas 自生成 webp，**不用 Supabase 图片转换**（$5/1000 张），成本 $0。见第六章。
- **couple → world（owner/member），单人可发帖**（2026-06-27）——放弃「必须配对成 couple」前提。`owner_id`（创建者）+ `member_id`（可空）+ `status`（`pending` 单人 / `active` 成员已加入）。**单人 = 只有 owner，照样建世界、照样发帖**，UI 不出现「未配对」话术。加入/邀请 UI 仍是独立 feature。

---

## 二、调用链路

### 读链路（打开日记 / 时间线）

```
ObjectSurface 打开（日记本热点或 rail 入口）
  → useFeed(enabled)                      // src/hooks/useFeed.ts；enabled 是渲染期闩锁，首次打开才拉数据
     → getMyWorld()                       // src/lib/worlds.ts —— 只查我的世界（owner 或 member）
        → 查不到 → error 态「找不到你们的世界——可能还没创建，或已被删除。」
     → getFeedPosts(world.id, { limit: 20 })         // src/lib/posts.ts
        → supabase.rpc('get_feed_posts', { p_world_id, p_before, p_limit })  // 返回 FeedPost[]（无 wrapper）
     → getProfilesByIds([...owner, member, 各 author_id])   // src/lib/profiles.ts，失败降级为空 map
  → loading / ready / error 三态；posts 以 **oldest → newest** 暴露（渲染顺序）
  → loadOlder() 用 posts[0].created_at 作独占游标向前翻历史，prepend
  → 渲染：visible_content / visible_images / created_at
```

### 写链路（发帖）

```
Composer（ready 态始终有 worldId）
  → 受控多图选择器：整个展开态皆可拖放，objectURL 预览，上限 MAX_IMGS = 9
  → 点发布，逐张：
     ① uploadMemoryImage(worldId, file)       // src/lib/storage.ts
        → 原图按 mime 定扩展名上传；缩略图由原图 createImageBitmap 重生成
          （长边 THUMB_MAX = 1024，webp q=0.85；解码失败才回落到传入的 fallback dataUrl）
        → 返回 { originalPath }
     ② createPost({ worldId, content, images: [原图路径...], privacy: 'shared' })
        → author_id 取自 supabase.auth.getUser()；posts.images 存 **原图** 路径数组
  → 成功 → 清空并 onPublished() = reload()；失败 → setErr(e.message)，草稿与已选图保留
```

### 显示链路（签名）

`useSignedThumbs(posts)` 把每个原图路径经 `thumbPathOf()` 推导出缩略图路径 → `signImageUrls()` 批量签一次 → 时间线/日记页与照片墙共用同一份 `path → url` map。**签名 TTL 1 小时；前端每 40 分钟自动重签，并在标签页 `visibilitychange` 重新可见时立即重签**（后台 tab 定时器会被浏览器节流，不重签会 403「图片消失」）。原图只在详情/lightbox 按需单独签名，渐进换入。

### 照片墙

`PhotosBody` 复用同一份 posts，把每帖 `visible_images` 摊平为图块走瀑布流；点击开 lightbox。

---

## 三、模块设计

| 模块                                                                                     | 职责                                                                                                                           | 状态             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `src/lib/worlds.ts`                                                                      | `getMyWorld()` 只查（无则 null）、`createWorld()` 显式建世界、`updateWorld()` 世界设置                                         | ✅               |
| `src/lib/posts.ts`                                                                       | `getFeedPosts(worldId?, { before, limit })` → `FeedPost[]`；`createPost({ worldId, content, images, privacy })`                | ✅               |
| `src/lib/storage.ts`                                                                     | `uploadMemoryImage()`、`thumbPathOf()`、`signImageUrls()`、`uploadWorldIcon()`                                                 | ✅               |
| `src/lib/profiles.ts`                                                                    | `getProfilesByIds()` —— RPC 只回 `author_id`，作者名/头像在此补                                                                | ✅               |
| `src/hooks/useFeed.ts`                                                                   | 三态 + `worldId` + `posts`（升序）+ `profiles` + 游标分页（`hasMore/loadingOlder/loadOlder`）+ `reload` + `enabled` 懒加载闩锁 | ✅               |
| `src/types/feed.ts`                                                                      | `FeedPost / World / FeedProfile / PostPrivacy`                                                                                 | ✅               |
| `src/themes/cinnaglass/screens.tsx`                                                      | 三张 ObjectSurface（日记 / 照片墙 / 心愿单）、`Composer`、`PostDetail`、`useSignedThumbs`                                      | ✅               |
| `src/themes/cinnaglass/journal-room-book.tsx` + `journal-layout.ts` + `journal-turn*.ts` | 棕皮书本的实测分页、页面装订与三维翻页引擎                                                                                     | ✅               |
| `src/themes/cinnaglass/image-slot.js`                                                    | 用户可填图占位 web component。**Composer 已不再使用它**（ST-T 换成受控多图选择器）；现仅头像设置等处在用                       | ✅（用途已收窄） |

**数据层设计要点（仍是硬约束）：**

- 读**只走 RPC**（`get_feed_posts` 在服务端解析隐私/解锁规则 + 游标分页），不在前端拼权限；**RPC 返回 post 行数组，不是 wrapper**。写直插 `posts` 表。
- **`posts.images (text[])` 存 Storage 路径，不是 Base64，且存的是原图路径**；缩略图路径一律由原图路径按约定推导，不单独入库。
- **路径约定**：`<world_id>/<uuid>.<ext>`（原图）、`<world_id>/<uuid>.thumb.webp`（缩略图）。private bucket，展示必须走 `createSignedUrl`。
- **建世界是独立主动动作**（Discord 式「开房」）：feed 页代表「已进世界」，`getMyWorld()` 查不到即异常 → error 态；建世界入口在 lobby（`lobby.tsx` → `WorldPage.createAndEnter`）。
- **将来**：realtime 检测到当前世界在 DB 消失（owner 删除）→ 踢出所有 member。

---

## 四、数据模型对齐

**表结构 / RPC / Storage 的现状真源是 [`ai/PROJECT.md`「数据库」章](../PROJECT.md)**（结构审计另见 `ai/features/supabase.md`）。本节只留本功能特有的前后端形状映射。

| 后端 `FeedPost`                                              | 前端处理                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `post_id`                                                    | 直接用后端 uuid 作 key                                                   |
| `visible_content`                                            | 正文；`overflow-wrap:anywhere` + 6 行省略，全文进详情                    |
| `visible_images` (string[])                                  | **Storage 原图路径数组**；显示前推导 thumb 路径并 `signImageUrls()` 签名 |
| `created_at`                                                 | 格式化为「刚刚 / 今天 / 昨天 / M月D日」+ 时间；日期分组按本地时区        |
| `author_id`                                                  | RPC **不返回** author 对象，作者名/头像另查 `profiles`                   |
| `privacy` / `unlock_cost` / `is_unlocked` / `is_placeholder` | 本期固定 `shared`，占位/解锁字段先忽略                                   |
| —                                                            | 瀑布流高度等纯展示量前端本地推导，不入库                                 |

`posts` 表触发器 `set_updated_at`、作者必须属于该 world 的检查触发器；RLS：自己全可见、对方仅 `shared|locked`、增删改仅自己。

---

## 五、待实现 / 已知问题

1. **签名 URL 生命周期**：private bucket 的图靠 1 小时签名展示，前端已有 40 分钟轮转 + 重可见重签；**跨越一小时的挂机/休眠场景仍未实测**（见测试记录）。
2. **两个待修文案 bug（边界实测发现，已挂 `ai/TODO.md`）**：
    - 上传超 25MB / 非图片 mime 时，Composer 直接把 Supabase 的英文原始报错贴给用户（`setErr(e.message)`），需要中文化。
    - **断网时误报「未登录」**：`getMyWorld()` / `createPost()` 在 `supabase.auth.getUser()` 拿不到 user 时抛「未登录，无法…」，网络失败与真的未登录被混为一谈，需要区分。
3. **邮箱确认**：项目开启了邮箱确认，邮箱注册需确认邮件才能登录；建议主推 Google 登录或 Dashboard 直接确认。
4. **开发期测试数据**：本期两人世界靠一次性 SQL 钦定，脚本见 [`sql/dev-create-world.sql`](../../sql/dev-create-world.sql)（桶与 RLS 见 [`sql/storage-memories-bucket.sql`](../../sql/storage-memories-bucket.sql)）。dev world `a8e83aff-7e7b-4b12-8944-9d5f3ac3a2ea`（active，owner=jacklovesherryfav、member=jackzhenghw）。**注意这两份脚本是早期版本，不代表当前线上结构**。
5. **库里还留着测试帖**：以 member 身份插入的若干 `【测试数据】` 前缀帖子按用户要求保留在库中，**上线前按前缀统一清理**。
6. **历史孤儿账号需手动 backfill `profiles`**（2026-06-27 实测结论）：`posts.author_id` 外键指向 `public.profiles`；触发器 `on_auth_user_created → handle_new_user()` 存在且启用，**新注册会自动建档**。只有早于该触发器创建的账号（AFTER INSERT 不回填历史行）需要手动补一行。
7. **成员邀请 / 加入 UI** 仍未做（`status` 从 `pending` 置 `active` 的那一步），属独立 feature。
8. **多图上限 9 张是前端约束**，后端无限制；超限只在 UI 层拦。

---

## 六、Storage 成本评估（2026-06-27）

Supabase 官方定价（查证自 supabase.com/pricing）：

|          | Free    | Pro（$25/月） | 超出后        |
| -------- | ------- | ------------- | ------------- |
| 存储     | 1 GB    | 100 GB        | $0.0213/GB/月 |
| 出口流量 | 5 GB/月 | 250 GB/月     | $0.09/GB      |
| 图片转换 | 无      | 100 张/月     | $5/1000 张    |

换算到 2 人回忆 App（原图 ~4MB/张）：Free 1GB ≈ 250 张原图，Pro 100GB ≈ 2.5 万张；列表只加载缩略图、点开才取原图，2 人浏览量对 5GB/月 是零头。**结论：对 2 人量级基本免费**。**省钱关键：缩略图客户端 canvas 自生成，不用 Supabase 图片转换。**

---

## 七、v2 与视觉迭代历史（已否决方案存档）

本章只留仍然有效的裁决与索引；被否决的视觉方案不再在此展开，实现细节各归其设计文档。

**仍然生效的结构性裁决**（2026-09-05 Codex 比稿 + Claude 复核，原报告与最终决策见 `ai/codex-visual/20260905-215344Z/codex-report.md` 与 `decisions-v2.md`）：

1. **界面名叫「我们的日记」**，代码内部 `timeline` 命名不动。
2. **拆掉三 tab**：日记本 / 相框 / 许愿罐各开各的 ObjectSurface，三张始终挂载、互不复用容器（切物件不重置日记草稿、滚动与照片详情）；rail 与「更多」只是效率入口。原因：v1 把三件物件塞进一个近全屏弹窗，盖住整间书房、两只角色完全不可见。
3. **Esc 层级**：详情/灯箱 → Composer → ObjectSurface；打开时焦点进关闭按钮，Tab 锁在当前纸面，关闭后焦点回入口；不活动 surface 用 `inert` 排除键盘交互。
4. **物件开合**：Pixi 热点与 rail 把点击屏幕坐标交给 surface，纸面从物件方向缩放展开；不画跨场景长连接线。
5. **`--accent-deep` 规范值 `#2F9AD3`**（夜间外壳若要更亮的蓝，另建 shell 专用 token，不改写品牌深蓝）。**已修**：`src/themes/cinnaglass/cinnaglass.css` 现为 `#2f9ad3`，双真源问题消失。
6. 照片墙、心愿单只做独立 surface 适配，不连带完整视觉重做。

**已被否决、只作存档的视觉方案**（勿据此改代码）：

| 方案                                                                                                                     | 时间       | 结论与实现记录                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v2 白纸三方向比稿（居中白纸 / 桌面展开 / 系回本子的长纸），含纯白卡 + 3px 作者色左边线、504/432/288px 纸宽、折角与短书签 | 2026-09-05 | 形态与尺寸已被后续棕皮书取代；裁决原文 `ai/codex-visual/20260905-215344Z/decisions-v2.md`                                                                                                                                                                  |
| 夜灯玻璃（烟茶外壳 + 18px 磨砂，520/440/340px）                                                                          | 2026-09-06 | 覆盖了上面的白纸裁决，随后自己也被棕皮书取代；[实装报告](../design_system/uiux/research/cinnaglass-history/timeline-night-glass/implementation.md)                                                                                                         |
| B「苔绿手札」（暖灰纸、灰苔封皮、实测分页、软纸翻动）                                                                    | 2026-09-06 | 用户否决其视觉（文字/纸面脱离、材质平涂、场景暂停）；[实现与验证报告](../design_system/uiux/research/cinnaglass-history/journal-book-directions/implementation.md)。其**功能裁决仍在用**：阅读顺序旧→新、不按作者分左右列、原无限滚动被分页 + 日期目录替换 |

**一条穿越各轮都没变的铁律**（源自 ST-O 与 PRD「互动不长在信息流里」）：**身份只用颜色/头像/名字标记，不用位置**；不得给条目铺淡蓝/淡粉底把日记读成聊天线程。

---

## 实现计划

v1 数据链路 ST-A ~ ST-V **已全部完成**（27+ subtask，2026-06-27 ~ 2026-07-06，逐条都过 tsc/eslint/build + 浏览器实测）。完整逐条记录不再保留，以下为可追溯索引 —— 其它文档（`chat-data.ts`、`supabase.md`、Codex 报告）引用的 ST 编号在此解析。执行顺序当年按「建世界 → 发 post → 渲染 post」重排，编号保留原始序号。

| 编号        | 内容                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST-A        | DB 迁移 `couples` → `rooms`（owner/member）+ 单人发帖支持；触发器/RPC/RLS/enum 全量改名                                                                         |
| ST-B        | `types/feed.ts` 对齐：删 `CoupleMeta`/`CoupleFeedResponse`（RPC 无 wrapper）、补 `updated_at`、新增 `Room`（后为 `World`）                                      |
| ST-C        | `rooms.ts`（后为 `worlds.ts`）+ `posts.ts` 数据层；`getFeed` → `getFeedPosts` 返回数组                                                                          |
| ST-D        | `useFeed` 去「未配对」态，改 `loading/ready/error` 三态                                                                                                         |
| ST-E        | `screens.tsx` 去配对话术                                                                                                                                        |
| ST-F        | SQL 文件 + 文档同步（脚本此后又经 room → world 二次改名，现为 `sql/dev-create-world.sql`）                                                                      |
| ST-8        | Storage private bucket `memories`（25MB 上限、限图片 mime）+ 4 条按路径首段隔离的 RLS                                                                           |
| ST-4        | `image-slot` 通过 `slot-change` 抛出原图 File + webp 缩略图（该出口后被 ST-T 的多图选择器取代）                                                                 |
| ST-5        | `storage.ts` + 发帖写链路打通（原图 + 缩略图进 Storage，路径进 DB）                                                                                             |
| ST-3        | 时间线渲染读链路；确立「DB 只存原图路径、列表只显签名缩略图」的方案 A                                                                                           |
| ST-6        | 照片墙接入；签名上提为 `useSignedThumbs` 共用一份 path→url map（一次请求）                                                                                      |
| ST-G        | 建世界改主动式：拆出只查的 `getMyWorld()` + 显式 `createWorld()`，feed 查不到即 error                                                                           |
| ST-H        | 「创建世界」入口 UI —— ✅ **已完成**，落在 lobby（`lobby.tsx` + `WorldPage.createAndEnter`），不在 feed 内                                                      |
| ST-I        | feed 懒加载：`useFeed(enabled)` 渲染期闩锁，进世界 0 次查询，首次打开恰好 1 次                                                                                  |
| ST-J        | 修 Composer 丢图 bug（`slot-change` effect 依赖漏 `open`，监听器从未绑上）+ 作者身份标识                                                                        |
| ST-K        | 时间线改「对话流/日记本」心智：游标分页 + 上翻加载历史、底部 composer、rail 头像、day chip、lightbox；裁撤「文字回忆」tab                                       |
| ST-L        | 拖拽滚动 + 到底橡皮筋刷新 + member 成对配色                                                                                                                     |
| ST-M        | 惯性拖拽、独立滚动区 + 渐变边界、composer 输入框化、post 详情弹层                                                                                               |
| ST-N        | 宽屏近全屏弹窗 + 中央脊线交错（**已被 ST-P 全部删除**）                                                                                                         |
| ST-O        | **位置只管节奏、颜色只管身份**（作者色打在头像光环 / 名字 / 卡片边线三处）+ 签名 URL 40 分钟自动续签                                                            |
| ST-P        | 单列日记流：去 zigzag / 脊线节点；调研结论——情侣日记类产品（Between/Day One/恋爱记/SumOne）全是单列                                                             |
| ST-Q        | 照片墙 polaroid 拼贴；修根因 `image-slot :host{height:160px}` 把瀑布流压成等高横条                                                                              |
| ST-R        | 缩略图 480 → 1024（高 DPI 下 480 竖图必糊）+ 存量一次性重生成                                                                                                   |
| ST-S        | 白底纸感 + composer 宽条拖放区 + CTA「✨ 记下这一刻」                                                                                                           |
| ST-T        | **多图上传（上限 9）**：弃用 image-slot，改受控多图选择器「所见即所传」；溢出/6 行省略；textarea 自动长高                                                       |
| ST-U / ST-V | 草稿规则：**隐式动作永不销毁内容**——点外部 / Esc 只收起并保留草稿（折叠 pill 变草稿预览），「取消」是唯一显式清空路径，发布成功也清空；折叠条高度按用户口径回调 |

**仍未完成：** ST-7 的边界联调（主链路已通，边界项见下）。

---

## 测试记录

主链路（登录 → 打开日记 → 纯文字发帖 → 带图发帖 → `memories/<worldId>/` 下原图 + `.thumb.webp` 两对象 → 时间线缩略图 + 照片墙渲染 → 作者蓝/粉标识）**已在浏览器端到端实测通过**（2026-07-04 ~ 07-06）。多图实测覆盖：注入 3 张 → 移除第 3 张 → 追加第 4 张 → 发布，顺序与「＋N 张」徽标、详情全图、照片墙摊平全部正确。

**仍未验证的边界（不得当作已测）：**

- [ ] 上传失败（超 25MB / 非图片 mime）→ 提示可读、草稿保留（当前会贴英文原始报错，见第五章）
- [ ] `createPost` 失败 → 错误提示、草稿不清空
- [ ] signed URL 跨越 1 小时（挂机/休眠）→ 40 分钟轮转与重可见重签是否真的覆盖
- [ ] 网络断开 → 发布中态与错误提示（当前会误报「未登录」，见第五章）
- [ ] 无世界账号打开日记 → error 态文案正确，且不自动建世界
- [ ] 双人世界：另一账号能看到对方 `shared` 帖（单账号已验，双账号对照未做）
- [ ] 邮箱确认未完成的账号登录行为
