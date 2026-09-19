# Ledger · ai/Features/timeline.md 活文档压缩

基线 commit `3fd52a5`，分支 dev。只读项目文件，未修改任何项目文件。

## 体量

| | bytes | 行数 |
| --- | --- | --- |
| 原文 `ai/Features/timeline.md` | 53,433 | 422 |
| 压缩稿 | 20,286 | 225 |
| 目标（≤ 2/3 = 35,622） | ✅ 达成（38.0%，比目标再省 15,336 bytes） |

例外：无。

## 锚点与入向引用核查

`grep -rn "timeline\.md#"` 全仓（排除 `.claude/`、`.agents/`、`ai/sessions/`）：**0 命中**——本文档没有任何标题被别处以 `#anchor` 形式引用。

入向引用（均为整文件链接，不带锚点，压缩不影响）：

- `ai/PROJECT.md:87,171`、`ai/reboot/product-vision.md:41`
- `ai/design_system/uiux/uiux.md:19`、`ai/design_system/uiux/cinnaglass/ui-system.md:35`
- `ai/design_system/uiux/research/cinnaglass-history/journal-book-directions/implementation.md:7`
- `ai/Features/supabase.md:18,20,50`
- `codex-visual/20260905-215344Z/handoff-context-for-codex.md:8,16`、`codex-report.md:54`
- `ai/project-audit/runs/2026-09-18-01/**`（审计自身产物）

**按行号的引用会失效**（如 `design-review.md` 的 “timeline.md L11 / L25 / L31 / L39 / L253 / L367-388”、`ai-core-review.md` 的 L60/L173/L226/L290）。这些是本轮审计自己的证据文件，属预期；无第三方锚点破坏。

**保留的顶级章节标题（Feature 模板全留）**：`一、功能目标` / `二、调用链路` / `三、模块设计` / `四、数据模型对齐` / `五、待实现 / 已知问题` / `六、Storage 成本评估` / `七、…` / `实现计划` / `测试记录`。新增一节 `当前形态（视觉与交互，2026-09-07）` 取代原来散在文首的三段迭代记录。

**符号可解析性**：其它文档引用的 ST 编号（`chat-data.ts:386` 的 ST-O、`supabase.md:50` 的 ST-A~G、Codex 报告的 ST-P~V）在压缩稿「实现计划」索引表中仍逐条可查到。

## 保留清单（原样或等价保留）

| 类别 | 内容 |
| --- | --- |
| 外部契约 | Supabase 项目 `xrscspcqnsxvfshskfpy`（经 PROJECT.md 引用）；RPC `get_feed_posts(p_world_id, p_before, p_limit)` 返回行数组无 wrapper；`posts.images (text[])` 存**原图** Storage 路径；路径约定 `<world_id>/<uuid>.<ext>` 与 `<world_id>/<uuid>.thumb.webp`；private bucket `memories`（25MB 上限、限图片 mime、4 条按路径首段隔离的 RLS）；signed URL TTL 1h；`sql/dev-create-world.sql`、`sql/storage-memories-bucket.sql` |
| 强制规则 | 读只走 RPC 不在前端拼权限；写直插 posts；缩略图路径只推导不入库；缩略图客户端 canvas 自生成、禁用 Supabase 图片转换；建世界是独立主动动作、feed 查不到世界即 error；身份只用颜色/头像/名字标记不用位置、禁淡蓝淡粉铺底（ST-O + PRD 铁律）；草稿隐式动作永不销毁、「取消」是唯一显式清空路径 |
| 独有决策 + 理由 | Storage 而非 Base64（保原图画质）；couple→world owner/member 单人可发帖；三 tab 拆成三张独立 ObjectSurface（v1 弹窗盖住书房与角色）；Esc 层级与 inert；物件方向缩放展开、不画长连接线；`--accent-deep = #2F9AD3` 单真源；ST-P 单列日记流的竞品调研理由；ST-T 弃用 image-slot 的「拖 B 传 A」根因 |
| 术语 | couples → rooms → worlds 全量映射表（含 `getMyRoom`→`getMyWorld`、`room_id`→`world_id`） |
| 未解决问题 | 两个文案 bug（英文原始报错、断网误报未登录）；成员邀请/加入 UI；跨 1 小时签名续签未实测；`【测试数据】` 前缀帖上线前清理；历史孤儿账号 profiles backfill；ST-7 边界联调 |
| 验收条件 | 测试记录中 7 条仍未验证的边界项；明写「未覆盖，不得声称完成」的实景审美验收 / Safari / 低端设备 / 低带宽 / 拿起收回开场 / 羽毛笔交互；完整 tsc 仍被聊天 `Msg` 导入错误阻断 |
| 现役数值 | 24 条纸片、980ms / 470ms / 38% / 最多 3 张；`MAX_IMGS = 9`；`THUMB_MAX = 1024`（webp 0.85）；`PAGE_SIZE = 20`；`SIGN_REFRESH_MS = 40min`；成本表整表 |
| 链接 | 7 个相对链接全部实测可解析（见下「链接校验」） |

### 链接校验（从 `ai/Features/` 解析）

`../PROJECT.md` / `../../sql/dev-create-world.sql` / `../../sql/storage-memories-bucket.sql` / `../design_system/uiux/cinnaglass/journal-room-object/turn-implementation.md` / `…/book-implementation.md` / `../design_system/uiux/research/cinnaglass-history/journal-book-directions/implementation.md` / `../design_system/uiux/research/cinnaglass-history/timeline-night-glass/implementation.md` —— **7/7 存在**，且已逐个打开确认确实承载被移出的内容。原文内部锚点未新增（唯一一处 `#七…` 中文锚点已改为纯文字「下方第七章」，避免 slug 不确定）。

## 删除清单（原文位置 / 摘句 → 理由）

| 原文位置 | 摘句 | 理由 |
| --- | --- | --- |
| :3–15 当前迭代 JT-1/2/3 三条 `[x]` + 授权叙述 | 「用户授权先导出 GIF 运动样板…」 | 已完成流水；结论与数值已进「当前形态」，证据全在 turn-implementation.md |
| :17–27 上一轮 JA-1/2/3 三条 `[x]` + 本轮范围声明 | 「本轮只实施批准稿的书本美术…」 | 同上；book-implementation.md 是权威正文 |
| :29–42 B 苔绿 JB-1~4 四条 `[x]` + 几何尺寸 + 影响代码清单 | 「桌面最大 760×430、中屏最大 560×360…」 | 整套视觉已被用户否决；尺寸对现状无效，留着会误导改代码 |
| :44–46 文档状态块的误删/恢复叙事 | 「于 2026-08-09 重定位提交 `7c93c3c` 中被误删…当时 tech-plan §119 明确写的是…」 | 无继续价值的历史叙述；PROJECT.md:84、TODO.md:160、chat.md:5、supabase.md:5 已各留一份，本文只留「🟢 在役活文档」一句 |
| :48 v2 适用性段 | 「ST-A~ST-V 为 v1 完成记录，作为设计理由存档不再回溯改写」 | 与新写的术语映射段重复 |
| :50 「v1 之后的增量（本文未含，见 PROJECT.md）」 | 「单列日记流重设计、polaroid 照片墙、多图受控选择器 + 草稿、缩略图 1024、40 分钟签名续签、宽屏吉祥物」 | 已过时的免责声明——这些增量其实就是 ST-P~V，本文正文与索引都已覆盖 |
| :54 「v2 历史记录：第七章结构拆分、物件开合等保留」 | — | 第七章自身已重写成「仍生效 / 已否决」两栏，该导读冗余 |
| :78 本期不做第三条 | 「本期 couple 用一次性 SQL 建，加入 UI + schema 改造留作后续独立 feature」 | schema 改造早已做完（ST-A/G），建世界 UI 也已落地；只保留「邀请/加入 UI 仍未做」这一仍成立的部分，移入第五章 |
| :149 room_id 处理整段 | 「`createPost` 需要 `roomId`，由 UI 从 `useFeed().roomId` 拿…」 | 与第二章写链路重复；只留「建世界是独立主动动作」与「将来 realtime 踢人」两条规则 |
| :207–209 第七章背景与产物段 | 「两侧云朵吉祥物与真角色重复」「改前实景 before-open.png 为当日临时抓屏」 | 一次性比稿过程记录；拆 tab 的理由已压成一句 |
| :211–218 Codex 裁决摘要 6 条（含评分 86/84/91、Phase 0~4 分期） | 「推荐方向 3『系回日记本的纵向长纸』」 | 方向 3 与分期均已执行完或被棕皮书取代，比稿评分无继续价值 |
| :220–228 Claude 独立复核 7 条（明度采样数值、方向 3 宽度矛盾、气泡底色建议） | 「纸 253.7 / 242.9 / 241.0，rail 壳 44.2…」 | 针对已废弃比稿图的量测；其中唯一仍有约束力的「禁淡色铺底」已提炼为铁律保留 |
| :230–241 Codex 历史裁决 6 条中的视觉部分 | 「封皮露边、折角和短书签尾」「504/432/288px」「纯白卡 + 3px 作者色左边线」 | 已被夜灯玻璃继而被棕皮书两次覆盖；仅移入「已否决方案」表一行 |
| :243–249 v2 实现记录 5 条 | 「桌面向左偏移 40px，中档偏移 16px」「真实 CSS 量测：纸页和条目背景均为 rgb(255,255,255)」 | 白纸形态已否决，量测数字与现状不符；其中仍生效的结构/Esc/开合裁决已上提 |
| :251–258 夜灯玻璃 7 条实装明细 | 「烟茶外壳 + 单层 18px 磨砂」「宽 520 / 440 / 340px」 | 已否决视觉的逐条实现复述；压成表格一行 + 链接 |
| :262–267 实现计划前言与两次修订说明 | 「原读先行 → 改为写先行」「重复建房竞态边界随之消失」 | 已完成的排期调整说明 |
| :269–398 共 24 条 ST 明细（影响文件 / 迁移名 / 逐条实测记录 / CSS 选择器级描述） | 「`.tl-item::after` 16px 连接枝」「DataTransfer 注入 3 张 canvas 生成图」 | 已完成流水 + 对源码的逐行复述；压成 24 行索引表，保留编号可追溯与仍有约束力的结论 |
| :353–358 ST-N 宽屏中央脊线交错布局全段 | 「我的帖靠右…`.mine .ava{left:-48px}`」 | 自述「已被 ST-O 修订」，ST-P 又整段删除——作废方案 |
| :404 测试记录前言 | 「本机无法 `pnpm dev` / 无真实登录态…以下为 ST-7 在另一台机器的**待执行**清单」 | 与实际已通过的实测记录自相矛盾的陈旧前言 |
| :408–413 主链路 6 条勾选清单 | — | 已通过项压成一段摘要，只保留仍未验证的 1 条（双人对照）到边界清单 |
| :421 边界「无房 → error 提示（竞态问题随之消失）」 | — | 与 :410 的「无房账号」条目重复，合并为一条 |

## 改正清单（原陈述 → 实际 → 依据）

| # | 原陈述（原文位置） | 实际 | 依据 |
| --- | --- | --- | --- |
| 1 | :173 `[sql/dev-create-couple.sql](../../sql/dev-create-couple.sql)` | 文件不存在，现为 `sql/dev-create-world.sql` | `ls sql/`（只有 `dev-create-world.sql`、`storage-memories-bucket.sql`） |
| 2 | :60 术语映射「见 `ai/Features/channel.md` C-3」 | `ai/Features/channel.md` 不存在（随 7c93c3c 作废未恢复）；结构真源改指 `ai/PROJECT.md`「数据库」章 | `ls ai/Features/`；`ai/PROJECT.md:98-129` |
| 3 | :226 「token 双真源属实：`cinnaglass.css` 根 `--accent-deep: #268fbe`」 | 已修，现为 `#2f9ad3`，双真源消失（压缩稿在该条后明写「已修」） | `src/themes/cinnaglass/cinnaglass.css:92` |
| 4 | :98/:133/:136/:149 `src/lib/rooms.ts`、`getMyRoom()`、`createRoom()` | 文件为 `src/lib/worlds.ts`，函数 `getMyWorld()` / `createWorld()` / `updateWorld()`；`src/lib/rooms.ts` 不存在（`src/themes/cinnaglass/rooms.ts` 是场景房间，无关） | `src/lib/worlds.ts:15,33,49` |
| 5 | :101 `supabase.rpc('get_feed_posts', { p_room_id })` | 参数为 `{ p_world_id, p_before, p_limit }`（游标分页） | `src/lib/posts.ts:19-23` |
| 6 | :135 `storage.ts` 状态「⬜ 待建（ST-5）」 | 早已建成并含 `uploadMemoryImage / thumbPathOf / signImageUrls / uploadWorldIcon` | `src/lib/storage.ts:21,60,89,112` |
| 7 | :138 `image-slot.js` 状态「⬜ 待改（ST-4）」，且写作 Composer 的图片出口 | Composer 已不用 image-slot（ST-T 改受控多图选择器）；该组件现只服务头像设置等 | `src/themes/cinnaglass/screens.tsx:498-501,560-600`；`settings.tsx:134` |
| 8 | :139 `screens.tsx` 状态「🔨 部分」 | 已完成：三张 ObjectSurface + Composer + PostDetail + useSignedThumbs | `src/themes/cinnaglass/screens.tsx:287,399,503,729,953` |
| 9 | :157-165 数据模型表列 `couple_id`、`author` | `FeedPost` 为 `world_id`，**无 `author` 字段**（作者靠 `profiles` 另查） | `src/types/feed.ts:10-22`；`src/hooks/useFeed.ts:78` |
| 10 | :167 `posts` 表列 `couple_id` + 触发器 `check_post_author_in_couple` | 列为 `world_id`；表结构真源已移交 PROJECT.md「数据库」章（触发器名不再在本文断言） | `ai/PROJECT.md:114`；`src/lib/posts.ts:41-47` |
| 11 | :175 §五「未配对状态：`getFeed` 会失败 → 显示『还没有和 TA 配对』，发帖入口禁用」 | 已作废：`useFeed` 只有 `loading/ready/error` 三态，无 unpaired；单人世界照样发帖 | `src/hooks/useFeed.ts:14,41-94`（ST-D/ST-E 的结果） |
| 12 | :176 §五「**单帖先限 1 张**，多图后续」 | 上限为 9 张（`MAX_IMGS = 9`） | `src/themes/cinnaglass/screens.tsx:501` |
| 13 | :177 §五「image-slot ↔ React 数据出口…ST-4 让它抛 slot-change」 | 已被 ST-T 取代，Composer 走受控 `picked[]` + `<input type=file multiple>` | `src/themes/cinnaglass/screens.tsx:560-600,678-690` |
| 14 | :178 §五「已按 `feed.ts` 的 `CoupleFeedResponse` 类型对接」 | 该类型已在 ST-B 删除，`feed.ts` 无任何 wrapper 类型 | `src/types/feed.ts`（全文无 `CoupleFeedResponse`） |
| 15 | :182 §五 SQL bug「`min(uuid)` 报错，文件待同步修正」 | 已修（ST-F 重写 + 后续 room→world 改名），当前脚本无 min/max | `sql/dev-create-world.sql` |
| 16 | :315 ST-G error 文案「找不到你的房间——可能还没创建，或已被房主删除」 | 实际为「找不到你们的世界——可能还没创建，或已被删除。」 | `src/hooks/useFeed.ts:73` |
| 17 | :317-319 **ST-H「创建房间」入口 UI — `[ ]` 待做** | **已完成**：lobby 卡片 CTA → `createWorld()` → 进入世界 | `src/pages/WorldPage.tsx:27,364-376`；`src/themes/cinnaglass/lobby.tsx:12-16` |
| 18 | :365 ST-O「private bucket 签名 URL TTL 1 小时…每 40 分钟自动重签」（表述为一次性修复） | 仍是现役机制，已上提为第二章「显示链路」的常驻规则：`SIGNED_URL_TTL = 3600`、`SIGN_REFRESH_MS = 40min` + `visibilitychange` 重签 | `src/lib/storage.ts:11`；`src/themes/cinnaglass/screens.tsx:728,749` |
| 19 | :404 测试记录前言「以下为 ST-7 在另一台机器的**待执行**清单」 | 主链路其后已真机通过（:408-412 自相矛盾）；改为「主链路已通过 + 仍未验证的边界」 | 原文 :408-412、:324-325 自身记录 |
| 20 | §二写链路「image-slot 通过 slot-change 抛出 { file, dataUrl }」；「缩略图复用 image-slot 压缩逻辑」 | 缩略图由 `uploadMemoryImage` 从**原图** `createImageBitmap` 重生成（长边 1024，webp 0.85），传入的 dataUrl 只是解码失败时的 fallback | `src/lib/storage.ts:35-54,60-82` |

## 待核清单（未在本轮核实，或需要用户/线上确认）

1. **线上 DDL 未复核**：`posts` 的触发器与 RLS 具体名称本轮只依据 PROJECT.md 的 2026-08-21 反查快照，未连 Supabase MCP 验证。压缩稿已把表结构断言让位给 PROJECT.md，仅保留「RLS：自己全可见、对方仅 shared|locked、增删改仅自己」这一层语义描述。
2. **dev world `a8e83aff-7e7b-4b12-8944-9d5f3ac3a2ea` 与两个 dev 账号是否仍存在** —— 无法在只读本地核实。
3. **`【测试数据】` 前缀帖是否仍在库中** —— 同上，按原文保留为待清理项。
4. **bucket 25MB 上限与图片 mime 限制** —— 来自 ST-8 迁移记录与 `sql/storage-memories-bucket.sql`，未连线上核对当前值。
5. **「完整类型构建仍受聊天 `Msg` 导入错误阻断」** —— 本轮未运行 `tsc`；沿用原文陈述，但 `src/themes/cinnaglass/chat-data.ts` 确实导出 `Msg`，该阻断可能已解除，建议下轮实跑确认。
6. **`.env.local` 指向的 Supabase 项目 id** —— 按硬规则未读 `.env*`，项目 id 取自 PROJECT.md:98，压缩稿只经 PROJECT.md 引用、不再自行断言。

## 顺带发现（不在本次压缩范围，供审计主流程登记）

- **`src/themes/cinnaglass/journal-book.tsx`（475 行）疑似死代码**：`screens.tsx` 只 import `./journal-room-book`，全仓无任何 `from './journal-book'`；`journal-room.css` 里的 `.journal-book` 选择器由 `journal-room-book.tsx:215` 的 `className="journal-book journal-room-book"` 命中，与该文件无关。
- `src/themes/cinnaglass/lobby.tsx:3` 注释仍写「DB `rooms` row — see channel.md」，两处均已过时（表名 `worlds`，`channel.md` 不存在）。
