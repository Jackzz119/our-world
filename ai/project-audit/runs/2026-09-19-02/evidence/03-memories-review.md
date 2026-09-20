# 03 · 分区 B：回忆链路

> 基线 HEAD `f96fc63bb21725ab0f48d0ecb661f9e0fe4eac6d`（branch `dev`），子步骤 03-S04。证据等级：**实测** = 本轮命令实际执行（grep / node 脚本 / 读 node_modules 源码）；**静态** = 全文阅读 + 链路追踪；**待验证** = 需线上 Supabase 或运行中的浏览器。本机无 `.env.local`、Supabase MCP 401，**全部运行时行为只能静态推断**；七个 `scripts/*.mjs` 只读不跑。

## 0. 覆盖

### 本分区拥有（全文阅读 + 链路追踪）

| 文件 | 行数 | 读了什么 |
|---|---|---|
| `src/hooks/useFeed.ts` | 134 | 三态、闩锁、首页 / 翻页、profiles 降级、取消标志 |
| `src/lib/posts.ts` | 47 | RPC 调用形状、insert 列 |
| `src/lib/storage.ts` | 128 | 路径约定、缩略图生成、上传顺序、签名批量 |
| `src/types/feed.ts` | 37 | `FeedPost` / `World` / `FeedProfile` / `PostPrivacy` |
| `src/types/image-slot.d.ts` | 24 | JSX 属性契约 |
| `src/themes/cinnaglass/surfaces/object-surfaces.tsx` | 206 | 三面常驻、Esc / Tab / 焦点、origin 变换 |
| `surfaces/composer.tsx` | 243 | 草稿规则、选图、发布链、错误显示 |
| `surfaces/photo-wall.tsx` | 122 | 摊平 / 分月 / 灯箱 |
| `surfaces/post-detail.tsx` | 137 | 详情、原图渐进、Esc |
| `surfaces/wishlist.tsx` | 66 | 本地 mock、localStorage |
| `surfaces/use-signed-thumbs.ts` | 43 | 定时续签 + 重可见重签 |
| `surfaces/date-format.ts` | 26 | 日期文案 |
| `surfaces/author-tone.ts` | 43 | 身份色 |
| `surfaces/object-surfaces.css` | 765 | 只查契约：类名、层叠上下文、z-index、死规则 |
| `src/themes/cinnaglass/journal/room-book.tsx` | 399 | 测量、重建、锚点、翻页宿主、目录、键盘 |
| `journal/layout.ts` | 241 | DOM 排版、二分切分、缩略图回填 |
| `journal/turn.ts` | 207 | 舞台、克隆面、24 条纸片、渲染 |
| `journal/turn-controller.ts` | 193 | 队列、RAF、取消 / 完成 / 销毁、监听器 |
| `journal/room.css` / `turn.css` / `diary.css` | 573 / 154 / 523 | 只查契约（同上），冻结区 |
| `src/themes/cinnaglass/image-slot.js` | 520 | 事件契约（无）、`ow-image-slots-v1`、消费者 |
| `src/themes/cinnaglass/shell/world-surfaces.tsx` | 95 | 挂载点 |
| `src/pages/world/useSurfaceRouter.ts` | 64 | 打开 / 关闭 / origin |
| `sql/storage-memories-bucket.sql` | 89 | 桶限制、mime、RLS 首段路径 |
| `sql/dev-create-world.sql` | 33 | 早期脚本与当前代码假设 |
| `scripts/check-diary.mjs` / `check-journal-art.mjs` / `check-journal-turn.mjs` / `render-journal-turn.mjs` / `compare-journal-art.mjs` / `pack-journal-art.mjs` / `scripts/lib/deps.mjs` | 144 / 250 / 397 / 51 / 61 / 89 / 13 | 只记录断言的运行时契约（§7） |

### 跨分区追读（只读，不进 CSV）

`src/lib/worlds.ts`（A）、`src/lib/profiles.ts`（A）、`src/lib/supabase.ts`（A，`currentUserId` 是断网误报的根因所在）、`src/lib/local-store.ts`、`src/pages/WorldPage.tsx:40-42、79-110、215-232、296-320`、`src/pages/world/useWorldSession.ts`（A，第二次 `getMyWorld()` 与 icon 续签）、`src/themes/cinnaglass/settings.tsx:144-180、255-280`（`<image-slot>` 唯一消费者）、`src/themes/cinnaglass/shell/rail.tsx:14`、`room/room-types.ts:145-158`、`room/study-room.ts:57-61`、`src/themes/cinnaglass/cinnaglass.css:89、116-117、517-620`、`materials.css:4-15`、`src/main.tsx:1-12`、`ai/design_system/uiux/cinnaglass/ui-system.html:9-12`、`journal-room-object/turn-prototype.html:73`、`node_modules/.pnpm/@supabase+auth-js@2.98.0/.../GoTrueClient.js:1268-1306`、`lib/fetch.js:10-96`。

## 1. 入口 → 链路图

### 1.1 打开日记（读链路）

```
热点 study-room.ts:57 'timeline' / rail 无日记入口（rail.tsx:14 只有 photos）
 → useSurfaceRouter.onHotspot (useSurfaceRouter.ts:47-52) → open('timeline', {x,y,source:'object'})
 → WorldPage:302 <WorldSurfaces screen tab origin> （lobby 期也挂载）
 → world-surfaces.tsx:62 <SubScreen screen={tab}>
 → object-surfaces.tsx:85 useFeed(show)   // 渲染期闩锁 useFeed.ts:52-53，首次 show 才 armed
    → useFeed.ts:67 getMyWorld()          // worlds.ts:17：currentUserId() → auth.getUser()（网络）→ worlds .or(owner|member).maybeSingle()
       ↳ 与 useWorldSession.ts:37 的 getMyWorld() 重复：进世界后打开日记 = 第 2 次 worlds 查询 + 第 2 次 /auth/v1/user
    → useFeed.ts:77 getFeedPosts(world.id,{limit:20}) → posts.ts:19 rpc('get_feed_posts',{p_world_id,p_before:null,p_limit:20})
    → useFeed.ts:78 fetchProfiles(owner, member, ...author_id) → profiles.ts:13 .in('id',…)，失败 → {}（useFeed.ts:35）
    → useFeed.ts:82 setPosts([...page].reverse())  // 唯一顺序真源：oldest→newest
 → object-surfaces.tsx:86 useSignedThumbs(feed.posts) → storage.ts:118 createSignedUrls(thumb paths, 3600)
 → object-surfaces.tsx:95-97 下一帧 setVisibleScreen → section.show / inert=false
 → TimelineBody:49 <JournalRoomBook feed thumbUrls active onDetail>
    → room-book.tsx:83-98 ResizeObserver 量纸 → :106-215 document.fonts.load → buildJournalPages (layout.ts:104) → host.replaceChildren → showPage → new JournalTurnController
    → room-book.tsx:72-78 thumbUrls 到达后 applyThumbUrls 原地补 <img src>
```

### 1.2 翻页与加载历史

```
‹ › 按钮 / ←→ 键 (room-book.tsx:245-260, 355-377) → turner.by(±1) → turn-controller.ts:103 → to()
  → :76 reduced-motion / 无 preserve-3d / tab 隐藏 → finish() 即时跳
  → :92 new JournalTurnStage → host.replaceChildren → onBusy(true)（room-book.tsx:203-209：host.inert + visibility hidden + data-turning）
  → :99 rAF tick → :141 burst 时 elapsed/duration ≥ .38 且 motions<3 再起一张 → :136-139 progress===1 → onCommit=showPage
目录 → 载入更早 (room-book.tsx:335-343) → feed.loadOlder (useFeed.ts:103-119)
  → getFeedPosts(world.id,{before: posts[0].created_at, limit:20}) → prepend → hasMore = page.length===20
  → 失败静默吞掉 (:115-117)，按钮恢复可点
  → posts 身份变化 → room-book.tsx:106 整本重建 → :126-135 按 anchor(post_id+offset) 找回原页
```

### 1.3 发帖（写链路）

```
Composer (room-book.tsx:389，worldId=feed.worldId)
 → composer.tsx:65-73 addFiles：只过滤 type.startsWith('image/')，上限 9，URL.createObjectURL
 → :104 publish：text.trim()；顺序 for 每张 → storage.ts:66 uploadMemoryImage
    ① :71 upload(`<world>/<uuid>.<ext>`, file, {contentType:file.type})   ext 由 EXT_BY_TYPE 定，未知 mime → 'bin'
    ② :76 makeThumbDataUrl（createImageBitmap → canvas 1024 → toDataURL webp .85）失败 → undefined → **只存原图**
    ③ :79 upload(`<world>/<uuid>.thumb.webp`)
 → posts.ts:36 createPost → :37 currentUserId('未登录，无法发帖。')（supabase.ts:10-15：auth.getUser()，忽略 error）→ :39 insert {author_id, world_id, content, images, privacy:'shared'}
 → 成功 composer.tsx:116-119 清空 + onPublished → room-book.tsx:227-231 anchor=null + feed.reload()（整页重拉，非乐观追加）
 → 失败 :121 setErr(e.message) 原文；已传对象无清理
```

### 1.4 照片墙 + 灯箱

```
rail 'photos' / 热点 'photos' → SubScreen photos 面 → photo-wall.tsx:52-72 [...posts].reverse().flatMap(visible_images) → 只保留 thumbUrls 已签的 (:72)
点击 → openView → :34 signImageUrls([原图]) → fullUrl 换入；Esc :41；`.lb` position:fixed（见 B-09）
```

### 1.5 心愿单

`wishlist.tsx:24-25` localStorage `ow-wishes-v1`，纯本地，无后端、无双人同步（文件头已声明）。

### 1.6 签名续签

`use-signed-thumbs.ts:17-41`：首签 → `setInterval(sign, SIGNED_URL_REFRESH_MS)`（storage.ts:15 = 3600·1000·2/3 = **2,400,000 ms = 40 分钟**）→ `visibilitychange` 且 visible 时立即重签 → 失败保留旧 map。**timeline.md §二「显示链路」所述与代码一致。** 详情 / 灯箱原图只签一次（post-detail.tsx:72、photo-wall.tsx:34），不续签。

## 2. 契约表

| 契约 | 代码位置 | 类型层 | 与 PROJECT.md / timeline.md 的差异 |
|---|---|---|---|
| RPC `get_feed_posts(p_world_id, p_before, p_limit)` → 行数组 | posts.ts:19-25 | `FeedPost[]` = 传输层直接当领域 + 视图用（layout.ts:11 `JournalPart.post`、photo-wall.tsx:15），**无映射层** | 一致。`p_world_id:null`/`p_limit:null`「取全部」分支（posts.ts:15-17、22）无调用方，语义**待核线上** |
| `FeedPost.visible_images: string[]` | feed.ts:21 | 类型非空，但 useFeed 之外 5 处 `?? []` / `|| []`（photo-wall.tsx:55、107；post-detail.tsx:60、70；use-signed-thumbs.ts:21；layout.ts:158） | 类型与用法自相矛盾：要么 RPC 可能回 null（应改类型），要么防御是死代码 → **待核线上** |
| `FeedPost.updated_at / unlock_cost / is_unlocked / privacy` | feed.ts:13-18 | 传输层字段，UI 零消费者（只有 `is_placeholder` 在 layout.ts:65 用） | timeline.md §四「先忽略」一致 |
| `posts` insert 列 `author_id, world_id, content, images, privacy` | posts.ts:39-45 | `NewPost`（posts.ts:28-33）→ 行 | PROJECT.md 表列多列出 `unlock_cost/created_at/updated_at`（DB 默认值），一致 |
| `content` 长度 | 无客户端限制（composer.tsx 无 maxLength；实测 grep `maxLength` 只有聊天 500 / 昵称 12 / 世界名 16） | — | DB 侧是否有 check **待核线上**；messages 的 ≤4000 与 posts 无关 |
| Storage 路径 `<world_id>/<uuid>.<ext>` + `.thumb.webp` | storage.ts:67-69、25 | 字符串约定，`thumbPathOf` 正则 `\.[^./]+$` | 一致。`icon-<uuid>.webp` storage.ts:108 一致 |
| 桶：25MB、png/jpeg/webp/avif、私有 | sql/storage-memories-bucket.sql:18-29 | 客户端 `EXT_BY_TYPE` 4 键与桶 mime 表**相同**（storage.ts:17-22），但 Composer 过滤是 `image/*`（composer.tsx:67）→ 见 B-02 | PROJECT.md 一致 |
| RLS 首段路径 = world_id 判成员 | sql:35-85 `(storage.foldername(name))[1]::uuid` | `signImageUrls` 依赖 select 策略；跨世界路径签名失败→逐项 error→被 storage.ts:125 静默过滤 | 一致；策略只 `to authenticated` |
| 签名 TTL 3600s / 续签 40min / 重可见 | storage.ts:13、15；use-signed-thumbs.ts:31-35 | — | 一致。`useWorldSession.ts:16` 另有硬编码 `40*60*1000` 且无 visibilitychange（跨 A，PA-023「由 TTL 派生」只做了一半） |
| localStorage `ow-wishes-v1` | wishlist.tsx:24-25 经 `lib/local-store` | `Wish[]` | 未入 PROJECT.md（属 mock，可不记） |
| localStorage `ow-image-slots-v1` | image-slot.js:9、17、24 | `{[id]: {u:dataURL,s,x,y} | string}` | timeline.md §三 表仍写「通过 `slot-change` 抛出」：**当前文件无任何 `dispatchEvent`/自定义事件**（实测 grep 全仓仅注释与 d.ts 提到 slot），事件契约已不存在 |
| `<image-slot>` 属性 | image-slot.js:135 observedAttributes 8 个；d.ts:7-16 声明 8 个 | 一致 | 消费者只剩 settings.tsx:165（ids `set-ava-her`/`set-ava-me`）；头像图**只存本地、不进 profiles.avatar_url**，日记 / 详情头像读的是 profiles（layout.ts:45-49、post-detail.tsx:27） |
| 自定义事件 `HotspotOpenEvent {id, clientX, clientY}` | room-types.ts:153-157 → useSurfaceRouter.ts:47-52 | `id: string` 宽类型，路由靠字面量比较 | — |
| `?surface=<tab>` / `?enter` | WorldPage.tsx:81（`import.meta.env.DEV` 门控）、:42 | — | 三个校验脚本依赖它（§7） |
| CSS 类契约 | 实测脚本交叉比对：8 个 TS/TSX 中引用的类在 4 份 CSS + cinnaglass.css 中**全部有定义**；4 份 CSS 中的类在 `src` 内**全部有消费者**（唯一命中 `woff2` 为 `format('woff2')` 误报） | — | `.tl` 与 `journal-photo-corner tl` 的命名碰撞是「有消费者」的假阳性，见 B-15 |

## 3. 发现

> 优先级：P0 = 数据丢失 / 安全；P1 = 用户可见的功能失败或误导；P2 = 边界、维护性、文档。冻结区（`journal/*`、共享 `.modal/.paper`）只建议不动手。

### B-01 · 断网发帖 / 开日记误报「未登录」——根因在 `currentUserId()` 吞掉 error
- **位置**：`src/lib/supabase.ts:10-15`（A 拥有，B 触发）；调用点 `posts.ts:37`、`worlds.ts:18`。
- **问题**：`auth.getUser()` 每次都请求 `/auth/v1/user`。断网时 auth-js 2.98 `lib/fetch.js:10/96` 抛 `AuthRetryableFetchError`，`GoTrueClient.js:1293-1303` 捕获后返回 `{ data: { user: null }, error }`；`currentUserId` 只看 `data.user?.id`，于是抛「未登录，无法发帖。」。
- **影响**：TODO「回忆链路边界测试」第二条文案 bug **成立**；且不只是文案——发帖前多一次不必要的网络往返。
- **证据**：实测（读 node_modules 源码）+ 静态；调研表 R6 已核对官方口径。
- **建议**：`currentUserId` 改读 `supabase.auth.getSession()`（本地，必要时刷新），`error` 非空时按类型抛：`AuthRetryableFetchError` → 「网络好像断了」、`AuthSessionMissingError` → 「未登录」。代价：改 1 个文件 6 行；`author_id` 的真实性仍由 RLS/触发器兜底，无安全退化。
- **验收**：DevTools Offline 下点「记下这一刻」→ 提示含「网络」而非「未登录」，草稿保留；在线正常发布。

### B-02 · 客户端选图过滤（`image/*`）比桶 mime 表宽，且无大小预检
- **位置**：`composer.tsx:67`、`:202`（`accept="image/*"`）；`storage.ts:17-22、67`；`sql/storage-memories-bucket.sql:23-24`。
- **问题**：gif / svg / bmp / heic 都通过前端过滤，扩展名落成 `.bin`，上传时桶按 `contentType: file.type` 拒绝，英文原文（`mime type image/heic is not supported`）经 `composer.tsx:121/239` 直接显示。25MB 上限同样无预检：整包上传完才得到 `The object exceeded the maximum allowed size`。
- **影响**：TODO 第一条文案 bug **成立**；iPhone 相册 HEIC 走桌面拖放时是常见路径（iOS 相机胶卷经 `<input>` 通常会转 JPEG，拖放不一定）→ **待验证**。
- **证据**：静态 + 桶脚本对照。
- **建议**：`addFiles` 用 `file.type in EXT_BY_TYPE`（从 storage.ts 导出常量）且 `size <= 25MB` 预检，被拒文件当场中文提示；`accept` 收窄为四种 mime。代价：10 行。真正的错误映射见 §4。
- **验收**：拖 1 张 gif + 1 张 30MB jpg → 两条中文提示、不发请求；4 种合法格式照常。

### B-03 · 部分上传成功后失败 → Storage 孤儿对象，无清理；重试再传一遍
- **位置**：`composer.tsx:109-124`、`storage.ts:66-86`。
- **问题**：顺序上传，第 k 张失败或 `createPost` 失败时，前 k-1 张原图 + 缩略图已在桶里；`storage.ts` 全文无 `remove()`；重试时 `picked` 未记录已传路径，整批重新 `newId()` 上传 → 每次重试都翻倍。缩略图上传失败（:82 throw）同样留下已成功的原图。
- **影响**：两人量级成本可忽略（timeline.md §六），但 RLS 只按 world 隔离、无生命周期策略，孤儿永久占存储且不可从 UI 发现。
- **证据**：静态。
- **建议**：`publish` 内记 `uploaded: string[]`，catch 时 best-effort `supabase.storage.from('memories').remove([...uploaded, ...uploaded.map(thumbPathOf)])`（失败忽略）；或把已传路径存进 `picked[i].uploadedPath`，重试跳过。代价：15 行；`remove` 走已有 delete 策略（sql:76-85）。
- **验收**：DevTools 把第 2 次 upload 改 503 → 桶内无该次残留；重试成功后桶内恰好 N 原图 + N 缩略图。

### B-04 · 缩略图生成失败的帖子在照片墙「消失」、日记里永远显示「照片加载中」
- **位置**：`storage.ts:76-77`（失败只存原图）；`storage.ts:125`（签名失败项被静默丢弃）；`photo-wall.tsx:72`（`filter(!!ph.src)`）；`layout.ts:73-76`（无 url 不设 src）。
- **问题**：`createImageBitmap` 对 AVIF（Safari 16 前）、CMYK JPEG、超大图可能失败；此时 `.thumb.webp` 不存在 → `createSignedUrls` 逐项 `error`（调研 R8）→ map 里没有 → 墙上过滤掉、书页 `<img>` 无 src。只有详情页（post-detail.tsx:125）会单签原图而显示。计数「来自时间线的 N 个瞬间」也随之少算。
- **证据**：静态。
- **建议**：`signImageUrls` 保留逐项 error（返回 `{ urls, failed }`），`useSignedThumbs` 对 failed 的 thumb 回落签原图（一次批量补签）；或上传阶段缩略图失败时把原图再传一份到 `.thumb.webp` 路径（最省改动，多占一份空间）。代价：20 行。
- **验收**：mock sign 返回某 thumb `error` → 墙上仍出现该图（用原图）。

### B-05 · 发布进行中允许折叠（点外部 / Esc）→ 失败提示不可见，成功无反馈
- **位置**：`composer.tsx:33-51`（折叠监听不看 `busy`）、`:127-155`（折叠态不渲染 `err`）、`:239`。
- **问题**：`busy` 期间点纸面任意处或 Esc → `open=false` → 展开 DOM 卸载；随后 `setErr` 只在重新展开时可见；折叠 pill 显示「✎ 草稿」，用户会误以为已发。
- **影响**：与 ST-U「隐式动作不销毁内容」不冲突，但错误路径断了因果链。
- **证据**：静态。
- **建议**：`onDown`/`onKey` 里 `if (busy) return;`；折叠 pill 在 `err` 非空时显示「上次发布失败」。代价：4 行。
- **验收**：503 mock 下发布中按 Esc → 不折叠；失败文案可见。

### B-06 · `feed.error` 文案从未显示；「找不到你们的世界」只存在于状态里
- **位置**：`useFeed.ts:73、88`（写入）；实测 grep `surfaces/`、`journal/`、`shell/` 无任何 `.error` 读取；`room-book.tsx:379-387` 只按 `status` 显示固定文案「回忆暂时没能载入。重试」。
- **影响**：timeline.md §二「查不到 → error 态『找不到你们的世界——…』」只对了一半；无世界 / RLS 拒绝 / 网络失败三种情况给用户同一句话，重试对前两种无意义。
- **证据**：实测 grep + 静态。
- **建议**：`journal-status` 里追加 `{feed.error}`（经 §4 映射后）；无世界时不显示「重试」而显示「回大厅创建」。冻结区：文案节点在 `room-book.tsx`（日记本 UI）→ **仅建议**。
- **验收**：mock `worlds` 返回 0 行 → 书页显示「找不到你们的世界…」。

### B-07 · `loadOlder` 无取消 / 无世界守卫；`reload()` 可在其进行中触发
- **位置**：`useFeed.ts:103-119`（无 `cancelled`，直接 `setPosts(cur => [...older, ...cur])`）；`room-book.tsx:345-352`「刷新回忆」在 `loadingOlder` 期间可点（只禁 `status==='loading'`）。
- **问题**：刷新把 posts 换成最新 20 条后，旧的 older 页再 prepend：若期间有新帖，最新页已把原 `posts[0]` 挤出 → older 页与新页之间**缺一条**；`hasMore` 被 older 结果覆盖。反向（loadOlder 在 reload 中启动）已被 `status !== 'ready'` 挡住。游标本身：`before` 独占、按 `created_at` 字符串回传（timestamptz 微秒精度保留），同一微秒的两帖会被跳过——**待核线上** RPC 是否有 `post_id` 次序键。另：帖子无 Realtime 订阅，对方新帖只在 reload 时出现（产品层面，非 bug）。
- **证据**：静态。
- **建议**：`loadOlder` 记录 `worldId + 发起时的 tick`，结果到达时若 `tick` 已变则丢弃；或 reload 时把 `loadingOlder` 结果视为过期。代价：6 行。
- **验收**：mock 延迟 older 3s，期间刷新 → 最终 posts 无重复无缺口。

### B-08 · 打开面板时的首焦点很可能落空（inert 竞态）
- **位置**：`object-surfaces.tsx:95-97`（rAF 后才 `setVisibleScreen`）、`:110-112`（同一帧 rAF 内 `.object-x.focus()`）、`:179`（`inert={!active}`）。
- **问题**：两个 rAF 回调同帧顺序执行；第一个的 `setVisibleScreen` 是默认优先级更新，React 19 经 Scheduler 宏任务提交，**不会在第二个回调前完成** → `focus()` 作用在仍 `inert` 的子树上被忽略。timeline.md §七.3「打开时焦点进关闭按钮」因此可能不成立；`check-journal-art.mjs` 未断言初始焦点。
- **证据**：静态推理，**待验证**（浏览器实测 `document.activeElement`）。
- **建议**：把聚焦放进 `visibleScreen` 变化后的 effect（`useEffect(() => {...}, [visibleScreen])`），或用 `flushSync` 提交 `setVisibleScreen`。代价：5 行。
- **验收**：打开任一面板后 `document.activeElement.classList.contains('object-x')`。

### B-09 · 照片墙灯箱 `position: fixed` 被 transform 祖先「收编」，超宽图被 `overflow: hidden` 裁切
- **位置**：`object-surfaces.css:26-57`（`.object-surface` 永远带 `transform` + `overflow: hidden`）、`:601-626`（`.lb` fixed inset 0，`img max-width: min(92vw, 1240px)`）、`:101-105`（面板 720px 宽）；`.lb` 渲染在面板内（photo-wall.tsx:111-119）。
- **问题**：transform 祖先是 fixed 后代的包含块 → `.lb` 只覆盖 720×760 面板而非视口；图片按 92vw 撑到 1240px 后被面板裁掉两侧。日记面的 `.pd` 有专门的 `.diary-surface .pd` 覆盖（diary.css:438-445，`inset:0; padding:18px`）说明「详情落在书上」是有意的；照片墙 `.lb` 没有对应规则，92vw 的意图是视口。
- **证据**：静态 CSS 推理，**待验证**。
- **建议**：`.lb` 改用 Portal 挂到 body（React `createPortal`）或把 `img max-width` 改为 `100%`/`min(92%, 1240px)`。代价：3 行 CSS 或 5 行 TSX。
- **验收**：1440 宽下点开横图 → 图完整可见。

### B-10 · 心愿单 Enter 提交不检查 IME 组合态
- **位置**：`wishlist.tsx:56` `onKeyDown={(e) => e.key === 'Enter' && add()}`。
- **问题**：中文输入法选词的 Enter 会把半截拼音当心愿添加（`isComposing`/`keyCode 229` 未判断）。
- **证据**：静态（中文产品，必现）。
- **建议**：`if (e.key === 'Enter' && !e.nativeEvent.isComposing) add()`。代价：1 行。
- **验收**：中文输入法输入「看海」中途按 Enter 选词 → 不新增条目。

### B-11 · 一处过滤把两人以外的作者当「伴侣色」——`toneOf` 与 `PostDetail` 各算各的
- **位置**：`author-tone.ts:39-43`（owner/member → PARTNER，其余 hash）；`post-detail.tsx:110`（名字颜色只看 `mine`，忽略 `tone.deep`）；`:111` 名字回落 `'TA'` vs `layout.ts:35` 回落 `'你'`。
- **问题**：同一作者在书页叫「你」、在详情叫「TA」；guest 色在详情丢失。今天只有两人，属一致性债。
- **证据**：静态。
- **建议**：`pd-name` 用 `tone.deep`；回落名统一为一个常量。代价：2 行。P2。

### B-12 · `FeedPost` 传输类型直穿到 DOM 排版层，`visible_images` 空值语义不明
- **位置**：见 §2 第 2 行；`layout.ts:11` `JournalPart.post: FeedPost`。
- **问题**：无 transport→domain 映射，RPC 改一列即牵动 layout/photo-wall/post-detail；`?? []` 与非空类型互相否定。
- **建议**：先**核线上** RPC 返回定义（`visible_images` 是否 `coalesce(..., '{}')`）；确定后二选一：改类型为 `string[] | null` 或删 5 处防御。若将来要做 locked/unlock，再引入 `MemoryPost` 领域类型。代价：类型级。P2。

### B-13 · `getFeedPosts` 的「无 worldId / 无 limit 取全部」分支是死灵活性
- **位置**：`posts.ts:15-17、20-22`；唯一调用方 `useFeed.ts:77、108` 两参齐全。
- **问题**：`p_world_id:null` 语义未知（**待核线上**），`p_limit:null` 无上界。
- **建议**：签名收紧为 `(worldId: string, page: { before?: string|null; limit: number })`。代价：3 行。P2。

### B-14 · StrictMode 下首屏 RPC 双发；无 AbortController
- **位置**：`main.tsx:10` `<StrictMode>`；`useFeed.ts:63-94` 用 `cancelled` 标志、请求本身不中止；全链路无 `AbortSignal`（storage / posts / profiles 均无）。
- **影响**：仅开发期 2 次 `get_feed_posts` + 2 次 `worlds`（第二次结果生效）；生产 1 次。supabase-js 2.98 支持 `.abortSignal()`，但两人量级不值得。
- **结论**：记录为已知、不修。P2。

### B-15 · `.tl` 类名碰撞被「刻意保留」——纸角 `<i class="journal-photo-corner tl">` 吃到时间线死样式
- **位置**：`object-surfaces.css:377-395`（注释自述）、`layout.ts:79`。
- **问题**：`.tl { position:relative; width:100%; padding-left:48px }` + `.tl::before` 虚线会应用到左上纸角；`room.css:238-254` 的 `.journal-photo-corner` 规则在后加载、`position:absolute; width:34px` 覆盖前两项，但 `padding-left:48px` 与 `::before` 虚线**仍生效**（`clip-path` 三角把 48px padding 与 `::before` 一起裁掉了，视觉上不可见，但这是靠巧合）。
- **建议**：纸角 class 改 `corner-tl` 等四个，删 `.tl/.tl::before`（19 行）。冻结区（消费者在 `journal/layout.ts`）→ **仅建议**。P2。

### B-16 · `diary.css` 死规则与死变量（冻结区，仅建议）
- `diary.css:17、481` `--book-height` 零读取（实测 grep）；`:21-35` `.diary-surface::before/::after` 无 `content`（本文件）且 `room.css:34-37` 设 `content:none`；`:202-208` `.journal-page-number{display:none}` 后再定位 `--right` 的页码为死；`:67-76` `.journal-engine-slot` 的圆角/阴影被 `room.css:101-111` 全覆盖。PA-029 已冻结 diary.css，本条只登记。

### B-17 · 三个浏览器校验脚本的样式表断言未随第二步改名同步；`check-diary.mjs` 已整体失效
- **位置**：`check-journal-art.mjs:231` `includes('journal-room.css')`、`check-journal-turn.mjs:377` `includes('journal-turn.css')`；`ui-system.html:10-12` 现在链接 `journal/room.css`、`journal/turn.css` → 两个断言**必假**（`'…/journal/turn.css'.includes('journal-turn.css') === false`）。`check-diary.mjs:34、54、81、93-94` 等待 `.tl-card`、`.tt`、`.tl-time`——实测 `src` 内零命中（夜灯玻璃时代 DOM），脚本 30s 超时必失败。
- **证据**：实测 grep + 静态；未运行脚本。CONVENTIONS「两个校验脚本的模块 URL 已同步」只覆盖了 `import('/src/themes/cinnaglass/journal/layout.ts|turn.ts')`（:177、:255，已正确）。
- **建议**：两处 `includes` 改为 `journal/room.css` / `journal/turn.css`；`check-diary.mjs` 退役（其输出目录 `cinnaglass-history/timeline-night-glass/verification` 本就是历史存档），或改写到 `.journal-room-entry`。代价：2 行 + 删 1 文件。P2。
- **验收**：`pnpm dev` 后跑两脚本通过。

### B-18 · 步骤二改名后的陈旧文件名残留在模块头 / 注释 / 文档
- **代码**：`object-surfaces.tsx:1`「screens.tsx」、`:4`「journal-room-book.tsx」、`:18`「journal-room.css」；`object-surfaces.css:1-8`「screens.tsx / journal-room.css / journal-turn.css」；`room-book.tsx:1`、`:144`「journal-layout」；`layout.ts:1`、`turn.ts:1`、`turn-controller.ts:1-2`；`composer.tsx:3`、`photo-wall.tsx:3`、`post-detail.tsx:3`、`wishlist.tsx:3`、`use-signed-thumbs.ts:3`、`date-format.ts:3`、`author-tone.ts:3`「Moved out of screens.tsx verbatim」（CONVENTIONS「不写实施流水」）。
- **文档**：`timeline.md:6` 关联代码列表混用 `journal-turn*.ts` 与 `journal/turn*.ts`；`:62-63`「解码失败才回落到传入的 fallback dataUrl」——`uploadMemoryImage(worldId, file)` 已无该参数（PA-024 删除），现行为是「只存原图」；`:90` 表格说 `object-surfaces.tsx` 含 Composer / PostDetail / useSignedThumbs——已拆成 `surfaces/` 五个文件；`:92` image-slot「通过 slot-change 抛出」——事件已不存在（§2）。`sql/dev-create-world.sql:9` 引用 `ai/features/world.md R-6` 断链（supabase.md:17 已知）。
- P2，文档类改动可一次批处理。

### B-19 · 进世界后打开日记重复 `getMyWorld()`；世界行两份副本
- **位置**：`useWorldSession.ts:37` 与 `useFeed.ts:67`（跨 A/B）。
- **问题**：每次 feed reload 都再查一次 `worlds` + `/auth/v1/user`；`feed.world` 与 session `world` 各自为政（世界设置保存只更新后者，`toneOf` 用前者——今天只用 owner/member id，无可见后果）。
- **建议**：`useFeed(enabled, world)` 接收已知世界（无则 error 态），删掉内部 `getMyWorld`。代价：15 行，两个分区协同。P2。

### B-20 · Safari `toDataURL('image/webp')` 回落 PNG 时缩略图会被贴错 mime
- **位置**：`storage.ts:57`（请求 webp）、`:30`（从 dataURL 头解析真实 mime）、`:81`（仍以 `contentType:'image/webp'`、路径 `.thumb.webp` 上传）。
- **问题**：Safari 14 之前 `toDataURL` 忽略 webp 回 `data:image/png`，Blob 类型对、上传声明错。timeline.md 明写 Safari 未覆盖。
- **建议**：`contentType` 取 `thumb.type`。代价：1 行。P2 **待验证**。

## 4. 中间件 / 适配器判断

**值得做，且只做一层薄映射。** 现状三处把原始错误直接给用户：`composer.tsx:121`（Storage / PostgREST 英文）、`useFeed.ts:88`（写入但没人显示，B-06）、`useWorldSession.ts:47、128`（A）。聊天发送（C）同类。

- **位置**：`src/lib/user-error.ts`（零 React，符合 CONVENTIONS「lib 抛错不打日志」——lib 仍抛原始错误，映射在 UI 边界调用）。
- **签名**：`toUserError(e: unknown): { message: string; retryable: boolean; kind: 'offline' | 'auth' | 'storage-size' | 'storage-mime' | 'forbidden' | 'unknown'; raw: string }`。
- **判定顺序**（先结构化字段、后正则、最后兜底）：`TypeError`/`AuthRetryableFetchError`（`name` 或 `status===0`）→ offline；`AuthSessionMissingError` → auth；storage-js `StorageError` 的 `statusCode`（413 → size；415 或 message `/mime type .* is not supported/` → mime）；PostgrestError `code` `42501` → forbidden（RLS）、`23514`/`23503` → 校验；其余 → unknown（中文兜底 + `raw` 供折叠显示）。
- **消费者**：composer（B-02/B-05）、room-book 状态条（B-06）、lobby 卡片（A）、聊天发送失败（C）。
- **成本**：约 40 行 + 4 个调用点各 1 行；风险是 Supabase 文案不版本化——所以以 `statusCode/code` 为主键、正则为辅、必保 `raw`。
- **不做的**：不做重试策略、不做 toast 系统；`retryable` 只是给按钮决定是否显示「重试」。

## 5. 不适用与受限项

- 运行时行为（焦点、灯箱裁切、Safari、HEIC、签名过期跨 1h、双人可见性）全部**待验证**：本机无 `.env.local`，进不了世界。
- 线上 DDL / RPC 定义 / RLS / 触发器 / `posts.content` 约束 / `visible_images` 空值语义 / 游标次序键：**待核线上**（MCP 401）。
- 七个脚本未运行；§7 只比对静态契约。
- CSS 只查契约与死规则，不评美学。
- 心愿单无后端，权限 / 并发项不适用。
- 编辑 / 删除帖子：**代码中不存在**（无 `update`/`delete` on `posts`，无 Storage `remove`），故「author-only 编辑删除」依赖 RLS 的问题不适用；RLS 增删改策略只是未来的护栏。

## 6. 复核了的已知线索

| 线索 | 结论 | 证据 |
|---|---|---|
| timeline.md §五-1 签名 URL 生命周期（40 分钟 + 重可见） | **成立**（代码与文档一致），跨 1h 挂机仍待验证 | storage.ts:13、15；use-signed-thumbs.ts:31-35 |
| §五-2a 超限 / 非法 mime 英文原文 | **成立** | composer.tsx:121、239；B-02 |
| §五-2b 断网误报未登录 | **成立**，根因在 `supabase.ts:11-13` 忽略 `error` | B-01；auth-js `GoTrueClient.js:1293-1303` |
| §五-3 邮箱确认 | 不适用（auth，A） | — |
| §五-4 两份 SQL 是早期版本 | **成立**；`dev-create-world.sql:9` 断链；桶脚本的 mime / 25MB / 首段 RLS 与代码假设一致 | §2 |
| §五-5 测试帖残留 | 待核线上 | — |
| §五-6 历史账号需 backfill profiles | 待核线上；代码有降级（useFeed.ts:35、layout.ts:35 回落「你」） | — |
| §五-7 邀请 UI 未做 | **成立**（grep 无 invite / member 写入） | — |
| §五-8 9 张仅前端约束 | **成立**；桶无数量限制，`posts.images` 数组长度无 check（待核线上） | composer.tsx:13、71 |
| TODO「回忆链路边界测试」两条文案 bug | **均成立、均未修**（2026-09-19 再核） | B-01、B-02 |
| §七.2 三面常驻互不复用 | **成立** | object-surfaces.tsx:166-201 |
| §七.3 Esc 层级 / Tab 锁 / 焦点回入口 / inert | 层级 **成立**（PostDetail `stopImmediatePropagation` post-detail.tsx:83；Composer `stopPropagation` composer.tsx:41；SubScreen 检查 `.pd,.lb,.compose-open` object-surfaces.tsx:117；目录 React 级 `stopPropagation` room-book.tsx:295）；Tab 锁成立（:121-136）；焦点回入口成立（:104-107）；**「打开时焦点进关闭按钮」待验证**（B-08） | — |
| ST-U / ST-V 草稿规则 | **成立** | composer.tsx:33-51、116-118、215-220 |
| FINDINGS PA-023「续签周期由 TTL 派生」 | **部分成立**：`storage.ts:15` 派生了，`useWorldSession.ts:16` 仍硬编码且无 visibilitychange（A） | — |
| PA-024 删除 `uploadMemoryImage` 死参数 | 成立，但 timeline.md:62-63 未同步（B-18） | — |
| PA-029 diary.css 冻结 | 本轮只登记死规则（B-16） | — |
| PA-033 image-slot 是否换 React | 补充事实：当前 image-slot **无事件出口**，头像不进 DB，仅 settings 本地装饰；换 React 时只丢 `ow-image-slots-v1` 与 reframe 手势 | §2 |
| INDEX「三张始终挂载 / 翻日记」运行时验收清单 | 本轮无法执行 | — |

## 7. 脚本契约表

| 脚本 | 断言的运行时契约 | 与当前代码是否一致 |
|---|---|---|
| `scripts/lib/deps.mjs:9-13` | `DIARY_NODE_MODULES` 解析 playwright/sharp/pngjs；`JOURNAL_URL` 默认 `http://localhost:5173` | 一致（`pnpm dev` 5173） |
| `check-diary.mjs` | `?enter=1&surface=timeline`（WorldPage.tsx:42、81，DEV 门控）；`ow-tweaks-v1`；DOM `.diary-surface.show .tl-card`、`.tt`、`.tl-time`、`::before maskComposite`；输出到 `cinnaglass-history/timeline-night-glass/verification` | **不一致**：`.tl-card/.tt/.tl-time` 在 `src` 零命中（实测），脚本必超时；属夜灯玻璃时代遗物 → 建议退役（B-17） |
| `check-journal-art.mjs` | 同上入口；`.journal-room-entry`、`.journal-room-leaf:not([hidden])`、`.journal-page-content`、`.rail`、`.journal-room-quill` pointer-events none、字体 `Journal WenKai`、`.stf__parent`（page-flip 已删，恒真）；路由 mock `**/rest/v1/rpc/get_feed_posts`（回填 `visible_content/visible_images/is_placeholder`）与 `**/storage/v1/object/sign/memories*`（回 `{path, signedURL, error}`，与 storage-js 2.98 传输形状一致）；`import('/src/themes/cinnaglass/journal/layout.ts')` 的 `buildJournalPages(posts,w,h,{profiles,userId,urls,roomArt})`；`public/ui/journal/{book-open,book-single,quill}.webp` 有 alpha；`ui-system.html#journal-static-art` 且 `styleSheets` 含 `journal-room.css` | 模块 URL、DOM 钩子、mock 形状、资产**一致**（`public/ui/journal` 六个文件实测存在）；`:231` 样式表名 **不一致**（B-17） |
| `check-journal-turn.mjs` | 同上入口与 mock（含 `p_before` 503 重试分支）；`.journal-room-book[data-page/data-target/data-turning]`（room-book.tsx:236-238）；`.journal-room-pages` 子节点数；`.journal-turn-sheet[data-progress/from/to]`（turn.ts:176-178）；`.journal-turn-front/.journal-turn-back .journal-turn-copy`（turn.ts:132、78）；`.journal-turn-bases .journal-turn-copy.--right`；`.journal-turn-stage.inert`（turn.ts:65）；24 条 `.journal-turn-strip`；`import('/src/themes/cinnaglass/journal/turn.ts')` 的 `sheetPose(p,dir,width)` 与 `new JournalTurnStage(pages, geometry).render/updateImages/destroy`；`.room-scene canvas` 持续变化；「载入更早的回忆」按钮文案（room-book.tsx:342）；`JOURNAL_EXPORT_GIF` 可选；`ui-system.html#journal-turn` 且 `styleSheets` 含 `journal-turn.css`、两张 `live-*.gif` 960 宽 | DOM / 数据属性 / 模块 API / 文案 **一致**；`:377` 样式表名 **不一致**（B-17）；`turn-verification/live-single.gif、live-continuous.gif` 实测存在 |
| `render-journal-turn.mjs` | `${JOURNAL_URL}/ai/design_system/uiux/cinnaglass/journal-room-object/turn-prototype.html` 暴露 `window.turnDemo.{frame,sequence,back,pages}` | `turn-prototype.html:73` 加载 `./turn-prototype.ts`（Vite dev 可服务），`turnDemo` 定义在 `.ts`（实测 2 处）→ 一致；不依赖产品代码 |
| `compare-journal-art.mjs` | 读 `room-journal-concept.png`、`book-verification/design-content-night.png`、`book-night.png`、`public/ui/journal/book-open.webp`；写 `book-comparison.png`、`alpha-review.png`、`pixel-samples.json` | 四个输入实测存在 → 一致（依赖 `check-journal-art` 先跑） |
| `pack-journal-art.mjs` | 读 `arts/ui/journal/book-checker-source.png`、`quill-source.png`、`room-journal-concept.png`；写 `public/ui/journal/{book-open,book-single,paper-corner,quill,avatar-blue,avatar-pink}.webp`、`arts/ui/journal/book-alpha.png`、`pack-results.json` | 输入 / 输出路径实测存在 → 一致；输出正是 `layout.ts:48`、`room.css:245、315、381`、`turn.ts:91` 引用的六个文件 |
