# src/ 分区审阅（01-S04）

> 项目 our-world · 分支 dev · 基线 `3fd52a5` · 审阅日 2026-09-18 · 范围：inventory.csv 中 `src/` 下全部 64 个文件（均为文本）。
> 本文只做第一步「文件层面」判定：职责、被谁引用、死文件、放错目录、命名一致性、注释里的文档引用是否仍有效。不评代码质量、不拆模块、不改任何文件。

## 0. 范围与方法

- **清单来源**：`ai/project-audit/runs/2026-09-18-01/metrics/baseline/inventory.csv` 过滤 `path` 前缀 `src/` → 64 行；覆盖 CSV `src-coverage.csv` 与之一一对应（python 集合差集为空，见 §7）。
- **阅读**：64 个文件全部用 Read/cat 读完全文（最大 pixi-scene.ts 1167 行、screens.tsx 1093 行）。
- **引用核验**：
  - 静态 import 图：`grep -rnoE "from '…'|import('…')|^import '…'" src`（排除 npm 包）→ 得到每个文件的 importer 列表；
  - CSS `@import`、`url()`、TSX 字符串里的 `/…png|webp|woff2` 资源路径 → 对照 inventory 中 `public/` 集合，逐条 OK/MISS；
  - 非 src 消费者：`index.html`、`scripts/*.mjs`（动态 `import('/src/…')`）、`vite.config.ts`、`tsconfig*.json`、`eslint.config.js`、`package.json`；
  - 文档引用：注释里出现的 `ai/…` 路径、`§` 章节、任务/决策编号（CH-xx、EMO-x、D-x、S-4、W-3、R1、ST-O、codex audit/spec）逐条到 `ai/`、`codex-visual/` 用 grep/find 核实存在与否；
  - 类型检查：`node_modules/.bin/tsc -p tsconfig.app.json --noEmit --incremental --tsBuildInfoFile <scratchpad>`（buildinfo 写入会话 scratchpad，不落项目目录）。
- **对照文档**：`ai/PROJECT.md` §项目结构 / §已有功能资产 / §代码侧不一致、`ai/Features/ui-system/audit.md` §2 入口表与 §4 依赖表、`ai/TODO.md`、`ai/UX.md`、`ai/STYLE.md`。
- **受保护范围**：未读 `.claude/`、`.agents/`、`ai/sessions/` 正文、`.env*`；`CLAUDE.md`/`AGENTS.md` 只引用存在。
- **元数据**：`git log -1 --date=short -- <file>` 取每个文件最后提交日（2026-03-05 ～ 2026-09-13）。

## 1. 全局结论（先看这里）

1. **64 个文件中 62 个在运行时可达**（从 `index.html → main.tsx` 出发的 import/@import/url() 闭包）。**2 个零引用死文件**：`src/types/database.ts`（Supabase 模板残留，高把握）、`src/themes/cinnaglass/journal-book.tsx`（被 journal-room-book.tsx 取代的旧翻页实现；文档明说暂留作历史，需用户决定）。
2. **基线上 `pnpm build` 必失败**：`tsc -p tsconfig.app.json` 唯一错误 `shell/chat-card.tsx(10,15): TS2305 Module '../model' has no exported member 'Msg'`（本次实测复现；PROJECT.md/TODO.md:25/audit.md:67 均已登记）。Vite dev/`vite build` 单独跑不受影响（类型导入被 esbuild 抹掉），所以 UI 一直能跑。
3. **注释里 20 余处文档引用已失效**：`ai/UX.md §2/§4/§5`、`ai/STYLE.md §6`（两文件 2026-09-12 起只剩链接）、`ai/Features/channel.md`/`world.md`（PROJECT.md:86 明说随 Discord 壳层作废不恢复）、`chat.md CH-12/CH-17/EMO-3/EMO-4/D-7-3`（编号在 ai/ 全部 .md 中零命中）。清单见 §4。
4. **依赖线索（跨分区）**：`@react-three/rapier` 在 package.json dependencies 与 vite.config.ts optimizeDeps 中，但 src 零 import（3D metaspace 已退役）；`page-flip` + `patches/page-flip@2.0.7.patch` + `src/types/page-flip.d.ts` 整条链只被死文件 journal-book.tsx 消费。
5. **PROJECT.md §项目结构 树是草图**：漏列 hooks/、utils/、pages 其余 4 文件、以及 themes/cinnaglass 下 20 个文件（含当前日记实现的整个 journal-* 家族）；同页 :77「types/ ✅ 保留」与 :132「database.ts 死文件→删」自相矛盾。
6. **audit.md（2026-09-11）入口表基本准确**：核对 17 处 `文件:行` 引用，14 处精确命中，3 处偏差 ≤10 行，1 处 `materials.css:18–75` 超出文件长度（70 行）。

## 2. 逐文件用途判定表

列含义：**使用者/引用证据** = grep 实证的 importer 或消费者（文件:行）；**权威性** = 该文件是否为其领域的运行时真源；**生命周期** = 有效 / 半作废 / 已作废 + 备注。

<a id="entry"></a>
### 入口（main / App / index.css）

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/main.tsx` | 应用入口：createRoot + StrictMode，副作用引入 index.css / cinnaglass.css / image-slot.js | index.html:17 `<script src="/src/main.tsx">` | 运行时真源 | 有效 |
| `src/App.tsx` | BrowserRouter 路由表：/login、/reset-password、/（ProtectedRoute 包裹 WorldPage） | main.tsx:6 | 运行时真源 | 有效 |
| `src/index.css` | 全局 reset（替代已移除的 Tailwind preflight），无品牌 token | main.tsx:3 | 运行时真源 | 有效 |

<a id="pages"></a>
### pages/

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/pages/ProtectedRoute.tsx` | 鉴权门：无会话跳 /login；VITE_DEV 为真且有 dev 账号时自动真登录；显式登出标记 | App.tsx:5 | 运行时真源 | 有效 |
| `src/pages/LoginPage.tsx` | 登录/注册/忘记密码页（Google OAuth + 邮箱密码） | App.tsx:3 | 运行时真源 | 有效 |
| `src/pages/LoginPage.module.css` | 登录与重置页的作用域样式（src 内唯一 CSS Module） | LoginPage.tsx:10、ResetPasswordPage.tsx:12 | 运行时真源 | 有效 |
| `src/pages/ResetPasswordPage.tsx` | 恢复邮件落地后设新密码 | App.tsx:4 | 运行时真源 | 有效 |
| `src/pages/WorldPage.tsx` | 世界页根编排：大厅/房间切换、天气、浮窗、弹窗、聊天状态、世界 icon 签名 | App.tsx:2 | 运行时真源 | 有效；注释含 7 处失效文档引用（见 F5）与 3 处 S-4 编号无出处 |

<a id="hooks"></a>
### hooks/

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/hooks/useAuth.ts` | 跟踪 Supabase 会话（getSession + onAuthStateChange） | ProtectedRoute.tsx:11、ResetPasswordPage.tsx:9 | 运行时真源 | 有效 |
| `src/hooks/useFeed.ts` | 回忆 feed 加载：getMyWorld → get_feed_posts 分页、loadOlder 游标 | screens.tsx:9（调用）；类型 UseFeed：journal-book.tsx:3、journal-room-book.tsx:3 | 运行时真源 | 有效 |

<a id="lib"></a>
### lib/

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/lib/supabase.ts` | createClient 单例（未挂 Database 泛型） | useAuth、posts、profiles、worlds、storage、chat、friends、emotes、ProtectedRoute、LoginPage、ResetPasswordPage、settings 共 12 处 | 运行时真源 | 有效 |
| `src/lib/logman.ts` | 日志封装 `[域][web][模块]\n消息`，log 仅 dev | chat-data.ts:31 | 运行时真源 | 有效 |
| `src/lib/posts.ts` | get_feed_posts RPC 读 + posts 表写 | useFeed.ts:9、screens.tsx:10 | 运行时真源 | 有效 |
| `src/lib/profiles.ts` | profiles 表按 id 批量取 | useFeed.ts:10、WorldPage.tsx:29、chat-data.ts:29 | 运行时真源 | 有效 |
| `src/lib/worlds.ts` | worlds 表：取我的世界/创建/更新 | useFeed.ts:11、WorldPage.tsx:27、world-settings.tsx:9 | 运行时真源 | 有效；:2 引用 ai/Features/channel.md（不存在） |
| `src/lib/storage.ts` | memories 私有桶：上传原图+缩略图、世界 icon、批量签名 URL | WorldPage:28、chat-data:30、screens:11、world-settings:10、journal-book:5、journal-layout:2、journal-room-book:5 | 运行时真源 | 有效 |
| `src/lib/chat.ts` | channels/messages/reactions/reads 读写 + private 广播订阅 | chat-data.ts:25、:28 | 运行时真源 | 有效；:1 「chat.md CH-12 / CH-17」编号在 ai/ 全部 .md 中均无出处 |
| `src/lib/friends.ts` | friendships 规范序对增删改 | chat-data.ts:26 | 运行时真源 | 有效（DM/好友 UI 按 PROJECT.md 计划收起，数据层冻结保留） |
| `src/lib/emotes.ts` | world_emotes 库 + emotes Edge Function 搜索/导入 | chat-data.ts:27 | 运行时真源 | 有效；:2 「EMO-3」编号无出处 |

<a id="types"></a>
### types/

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/types/chat.ts` | 聊天后端行类型与 WorldEvent 联合 | lib/chat、lib/friends、lib/emotes、chat-data、channel-screen、emote-picker、chat-card | 运行时真源 | 有效；:3 引用 ai/Features/channel.md（不存在）；ReactionRow.channel_id 从未被 select（chat.ts:14） |
| `src/types/feed.ts` | World / FeedPost / FeedProfile / PostPrivacy | useFeed、posts、profiles、worlds、WorldPage、screens、world-settings、chat-data、journal-book、journal-layout、journal-room-book | 运行时真源 | 有效 |
| `src/types/database.ts` | Supabase 模板式 `Database` 接口，只声明项目不存在的 `todos` 表 | 零引用：grep `types/database`、`\bDatabase\b` 于 src/vite.config/tsconfig/eslint/package.json 仅命中自身与 chat.ts 注释里的普通词；supabase.ts createClient 无泛型 | 已作废（2026-03-05 fcfbdc7 首次加入后从未修改） | 删除候选（F2；TODO.md:115 已登记） |
| `src/types/index.ts` | EnvName 联合类型（6 个 VITE_* 变量名） | utils/index.ts:1 | 运行时真源 | 有效；与 database.ts 无任何关系（无 barrel 导出、无类型引用） |
| `src/types/page-flip.d.ts` | 为无声明的 page-flip@2.0.7 补 `declare module`；注明 stop() 来自 patches/ 补丁 | 唯一需要者：journal-book.tsx:2 `import { PageFlip } from 'page-flip'`（tsconfig include src 自动纳入） | 随 journal-book.tsx 存亡 | 附属于 F3 删除候选链（page-flip 依赖 → patches/page-flip@2.0.7.patch → 本文件） |

<a id="utils"></a>
### utils/

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/utils/index.ts` | getEnv / getEnvFlag / getEnvOptional | supabase.ts:2、ProtectedRoute.tsx:13、WorldPage.tsx:31 | 运行时真源 | 有效 |

<a id="cg-core"></a>
### themes/cinnaglass/ 核心与弹窗

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/themes/cinnaglass/cinnaglass.css` | 全局设计 token（--cg-*/--shell-*/--glass-*/--paper-*）、mood/glass 分层、modal 外壳、scene/mood/wx/lobby 样式 | main.tsx:4；:1 `@import './materials.css'` | 设计 token 运行时真源 | 有效；:3 自称 ow.css、:294-337 `.sb-rcard/.sb-pcard/.sb-user .u-st` 侧栏选择器在 src 中零消费者、:902 R3F 说法陈旧 |
| `src/themes/cinnaglass/materials.css` | B 暖灰纸材质 --craft-* token + .stage .modal/.collection-surface 覆盖 | 仅 cinnaglass.css:1 `@import`（无 TS import，grep import 图看不到） | 运行时真源 | 有效；ui-system.md:21、audit.md:78 明确本轮不删 |
| `src/themes/cinnaglass/model.ts` | 主题共享类型 Weather/Profile/Room/CalEvent/Alarm/Widgets/WidgetPos | WorldPage:26、calendar:5、settings:7、profile:3、rooms:7、rail:10；chat-card:10 错误地从此导入不存在的 Msg | 运行时真源 | 有效；`Room` 仅 rooms.ts 用、`WidgetPos` 零消费者 |
| `src/themes/cinnaglass/tweaks.ts` | useTweaks：mood/glass/weather/chatAlign 本地持久化 | WorldPage:25、model.ts:2、settings:8、ambience:10、channel-screen:16 | 运行时真源 | 有效 |
| `src/themes/cinnaglass/profile.ts` | PROFILE_DEFAULT + gload + 纪念日日期算法 | WorldPage.tsx:16（PROFILE_DEFAULT、gload） | 运行时真源 | 有效；daysSince/daysUntilAnniversary 零消费者（floaters.tsx 自算一遍） |
| `src/themes/cinnaglass/rooms.ts` | 旧房间 mock（ROOMS_DEFAULT/ROOM_ICONS/VOICE_DEFAULT）+ 通用 localStorage loader owLoad | WorldPage.tsx:24 仅 `owLoad`；其余三个导出 grep 零消费者 | 半作废（mock 已随 Discord 壳层退役） | 保留文件、迁出 owLoad 后再删（TODO.md:114、audit.md:74 已登记）；:1 头注「sidebar/space switcher」陈旧、:2 channel.md 缺失 |
| `src/themes/cinnaglass/icons.tsx` | 线性图标集 Ico + 60 余个 I* 组件 | LoginPage、ResetPasswordPage、calendar、channel-screen、music、rooms、screens、settings、world-settings、ambience、chat-card、floaters、rail、rail-icons | 运行时真源 | 有效 |
| `src/themes/cinnaglass/scene.tsx` | 旧 SVG 等距房间 RoomArt/RoomScene（登录/重置页背景） | LoginPage.tsx:8、ResetPasswordPage.tsx:10；RoomArt 无其他消费者 | 运行时真源（旧背景） | 有效；:3 引用不存在的 ow.css、:4 「minimap 复用」无对应消费者；TODO.md:114/audit.md:73 已登记待账户页背景替换后清 |
| `src/themes/cinnaglass/lobby.tsx` | 进世界前的大厅（浮岛+传送门，loading/empty/error 三态） | WorldPage.tsx:11 | 运行时真源 | 有效；:2-3 「DB `rooms` row — see channel.md」表名错（实为 worlds）且 channel.md 缺失；:4 「swapped for an R3F island later」方向已废 |
| `src/themes/cinnaglass/screens.tsx` | 物件表面：日记（JournalRoomBook）/照片墙/心愿单 + Composer/PostDetail/SubScreen | WorldPage.tsx:12 | 运行时真源 | 有效；:15 以 `JournalRoomBook as JournalBook` 接入当前日记；:177 `image-slot` 选择器已无对应 JSX（:498 注释亦说明已替换） |
| `src/themes/cinnaglass/calendar.tsx` | 日历·约会 + 时间·闹钟弹窗 | WorldPage.tsx:13 | 运行时真源 | 有效；:7 ANNIV 硬编码 2025.6.4 与 world.anniversary 双真源（audit.md:61 P2 已登记） |
| `src/themes/cinnaglass/settings.tsx` | 设置弹窗：昵称/邮箱/密码(假保存)/应用锁/登出/主题 | WorldPage.tsx:14 | 运行时真源 | 有效；:213 引用 world.md W-3（ai/Features/world.md 不存在）；:191 直接 console.warn 未走 Logman；假保存 audit.md:58 P1 已登记 |
| `src/themes/cinnaglass/world-settings.tsx` | 世界设置弹窗：icon/名称/纪念日写回 DB | WorldPage.tsx:15 挂载（screen==='world-settings'）；grep 无任何 navigate('world-settings') 调用 | 运行时真源 | 挂载但无入口（audit.md:35/60 P2 已登记）；:6 「Entry: sidebar world-panel header」描述的侧栏已退役 |
| `src/themes/cinnaglass/music.tsx` | MusicPlayer：WebAudio 生成式 pad + TRACKS | shell/floaters.tsx:9 | 运行时真源 | 有效 |
| `src/themes/cinnaglass/image-slot.js` | `<image-slot>` 自定义元素（拖图/裁切/localStorage 持久化） | main.tsx:5 副作用 import；settings.tsx:134 `<image-slot>`（头像） | 运行时真源 | 有效；src 内唯一 .js：eslint.config.js 只 lint ts/tsx、tsconfig 无 allowJs → 既不 lint 也不类型检查；PROJECT.md「image-slot 仍在用」属实 |
| `src/themes/cinnaglass/types.d.ts` | 为 `<image-slot>` 补 React JSX IntrinsicElements 类型 | 环境声明（tsconfig include src）；服务 settings.tsx:134 | 运行时真源 | 有效；与 src/types/page-flip.d.ts 分居两处（F7 目录组织） |
| `src/themes/cinnaglass/emoji-data.ts` | 约 230 条中文关键词 emoji 数据 | emote-picker.tsx:9 | 运行时真源 | 有效 |

<a id="cg-chat"></a>
### themes/cinnaglass/ 聊天族

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/themes/cinnaglass/emote-picker.tsx` | emoji/贴纸选择器 + 导入流程 | channel-screen.tsx:13；类型 EmoteView：chat-data.ts:32 | 运行时真源 | 有效；:1 「chat.md EMO-4」编号无出处；:2 emoji-picker.html 存在于 design_system/uiux/research/cinnaglass-history/ 但未给路径；:7 D-9 见历史 ux-decisions.md |
| `src/themes/cinnaglass/friends-page.tsx` | 聊天大窗内的好友页 | channel-screen.tsx:12 | 运行时真源 | 有效（PROJECT.md 计划收起 DM/好友 UI，现仍可达）；:2 mockup 路径存在 |
| `src/themes/cinnaglass/channel-screen.tsx` | 完整聊天大窗（频道/DM/好友切换、消息操作、粒子） | WorldPage.tsx:22 | 运行时真源 | 有效；:1-6 头注「opened from the sidebar / in-scene ChatDock」已退役（实为 chat-card onExpand 打开）；:8-9 「ux decisions.md D-7 / D-7-3」——D-7 在历史档 ux-decisions.md:53，D-7-3 无出处 |
| `src/themes/cinnaglass/chat-data.ts` | useChatThreads：频道/DM/好友/贴纸的单一状态源；导出真正的 `Msg` | WorldPage:23、chat-card:8-9、channel-screen:14、friends-page:9 | 运行时真源 | 有效；:2 「in-scene ChatDock」已被 ChatCard 取代；:386 ST-O 在 timeline.md 有出处；:562 B-3 仅 timeline.md 有同名编号 |

<a id="cg-journal"></a>
### themes/cinnaglass/ 日记族

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/themes/cinnaglass/diary.css` | B 苔绿手札样式（日记表面/书页/目录/composer 覆盖） | screens.tsx:14 | 运行时真源 | 有效；`.journal-engine/.journal-pager/.journal-binding` 只被死文件 journal-book.tsx 使用（第二步死样式线索） |
| `src/themes/cinnaglass/journal-layout.ts` | 真实 DOM 量测分页 buildJournalPages / journalEntry | journal-book.tsx:6、journal-room-book.tsx:6；scripts/check-journal.mjs:158、check-journal-art.mjs:180 动态 import | 运行时真源 | 有效 |
| `src/themes/cinnaglass/journal-room-book.tsx` | 当前日记实现：栗色书本 + JournalTurnController 翻页 | screens.tsx:15（别名 JournalBook） | 运行时真源 | 有效（2026-09-11 5b96700 引入，取代 journal-book.tsx） |
| `src/themes/cinnaglass/journal-room.css` | 栗色书本样式 + Journal WenKai @font-face | journal-room-book.tsx:8；引用 /fonts/journal/*.woff2、/ui/journal/*.webp 均存在于 public/ | 运行时真源 | 有效 |
| `src/themes/cinnaglass/journal-turn.ts` | 3D 翻页舞台 JournalTurnStage + sheetPose | journal-turn-controller.ts:1；scripts/check-journal-turn.mjs:254 动态 import | 运行时真源 | 有效 |
| `src/themes/cinnaglass/journal-turn-controller.ts` | 翻页队列控制器（rAF、reduced-motion、visibility） | journal-room-book.tsx:7 | 运行时真源 | 有效 |
| `src/themes/cinnaglass/journal-turn.css` | 翻页舞台样式 | journal-room-book.tsx:9 | 运行时真源 | 有效 |
| `src/themes/cinnaglass/journal-book.tsx` | 旧日记实现：page-flip@2.0.7 HTML 模式 + 队列 + JournalQuill SVG | 零引用：src 内无 import（screens.tsx 改用 journal-room-book）；scripts/*.mjs 只 import journal-layout/journal-turn；`JournalQuill` 亦零消费者 | 已作废实现（book-implementation.md:27「保留作历史实现」；audit.md:81「即使无引用也不在本 session 清理」） | 删除候选（F3，需用户决定；连带 page-flip 依赖、patches/page-flip@2.0.7.patch、src/types/page-flip.d.ts） |

<a id="cg-room"></a>
### themes/cinnaglass/room/

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/themes/cinnaglass/room/pixi-scene.ts` | PixiJS v8 房间合成器（底图/雨/钟/角色/光照/活物件/热点） | room-scene.tsx:9 | 运行时真源 | 有效；:81 「codex audit M3」、:1151 「codex audit H1」出处为 codex-visual/20260811-044310Z/codex-report.md:39/:33（代码未写路径）；:421 living-props.md 路径存在 |
| `src/themes/cinnaglass/room/room-scene.tsx` | Pixi Application 的 React 壳 + 头顶气泡/在场胶囊 DOM 覆盖 | WorldPage.tsx:9 lazy import | 运行时真源 | 有效；:160/:200 「codex spec §5.9/§5.5」在 codex-visual/20260811-055917Z/codex-report.md 有对应章节；4 张 /characters/*.png 均存在 |
| `src/themes/cinnaglass/room/room-types.ts` | 房间模板数据契约 + resolveRoomArt/moodFromHour | pixi-scene:28-29、room-scene:8、study-room:5、WorldPage:18 | 运行时真源 | 有效；:124 「ai/STYLE.md §6」、:136 「ai/UX.md §2/§5」失效（两文件已是只含链接的入口）；:39 living-props.md、:4 PROJECT.md 存在 |
| `src/themes/cinnaglass/room/study-room.ts` | 书房模板：底图/窗/钟/座位/热点/唱片机零件路径 | room-scene.tsx:10 | 运行时真源 | 有效；:52 「ai/UX.md §2」失效；引用的 19 个 /rooms/study/** 路径全部存在于 public/ |

<a id="cg-shell"></a>
### themes/cinnaglass/shell/

| 路径 | 用途 | 使用者 / 引用证据 | 权威性 | 生命周期判定 |
|---|---|---|---|---|
| `src/themes/cinnaglass/shell/rail.tsx` | 左侧导航 Rail + 房间/工具弹出 + RoomHandle | WorldPage.tsx:17 | 运行时真源 | 有效；:27 「ai/UX.md §2」失效；ROOM_DEFS 三张 thumb 均存在 |
| `src/themes/cinnaglass/shell/rail-icons.tsx` | 导航专用 5 个剪影图标 | rail.tsx:8 | 运行时真源 | 有效 |
| `src/themes/cinnaglass/shell/navigation-glass.css` | 导航磨砂材质 --nav-*（按 mood 预设） | rail.tsx:9；/ui/nav/frost.webp 存在 | 运行时真源 | 有效（ai/Features/navigation-glass.md 记录） |
| `src/themes/cinnaglass/shell/ambience.tsx` | 顶部灯光/天气面板 | WorldPage.tsx:19 | 运行时真源 | 有效；:2 「codex pixel spec §5.3」可追溯至 codex-visual/20260811-055917Z |
| `src/themes/cinnaglass/shell/floaters.tsx` | 纪念卡 MomentCard + 音乐迷你条 MusicMini | WorldPage.tsx:20；/ui/disc-cover.png 存在 | 运行时真源 | 有效；§5.4/§5.7 可追溯；进度固定 34% 等已由 audit.md:57 登记 |
| `src/themes/cinnaglass/shell/chat-card.tsx` | 左下聊天窄卡 | WorldPage.tsx:21 | 运行时真源 | 有效但**类型错误**：:10 `import type { Msg } from '../model'`，model.ts 无此导出（真正的 Msg 在 chat-data.ts:46）→ tsc TS2305（F1） |

## 3. 发现（每条带证据与建议）

### F1 · 测试脚本/构建 · chat-card.tsx 从 model 导入未导出的 Msg（只核实，不修）

- **证据**：`src/themes/cinnaglass/shell/chat-card.tsx:10` `import type { Msg } from '../model'`；`src/themes/cinnaglass/model.ts` 全文 27 行只导出 Weather/Profile/Room/CalEvent/Alarm/Widgets/WidgetPos；真正的 `Msg` 在 `chat-data.ts:46`，channel-screen.tsx:14 正是从那里导入。本次运行 `tsc -p tsconfig.app.json --noEmit` 唯一输出即此 TS2305。
- **影响**：`package.json` `build` = `tsc -b && vite build` → 基线上无法产出生产构建；audit.md:67 与 TODO.md:25 早已登记，状态未变。
- **建议**：第二步修复时把导入源改为 `../chat-data`（一行改动）；本轮不动。需要用户决定：否。

### F2 · 冗余文件 · src/types/database.ts 是死文件（高把握）

- **证据**：全文 44 行只声明 `todos` 表的 Row/Insert/Update；`grep -rn "types/database\|\bDatabase\b" src vite.config.ts tsconfig*.json eslint.config.js package.json` 仅命中自身与 lib/chat.ts:2 注释里的普通英文词 "Broadcast from Database"；`lib/supabase.ts` 的 `createClient` 没有 `<Database>` 泛型；PROJECT.md §数据库 表清单里没有 `todos`；`git log` 显示 2026-03-05 fcfbdc7 首次加入后再无改动；`src/types/index.ts` 只导出 `EnvName`，无 barrel、与之零关系。
- **文档状态**：PROJECT.md:132「死文件→删」、TODO.md:115「死文件清理」、audit.md:80「真正删除前搜索源码、脚本和构建引用」——本次已完成该搜索（src、scripts、index.html、配置文件均无命中）。
- **建议**：可删；恢复依据 git `3fd52a5`。需要用户决定：否（文档三处已定性）。

### F3 · 冗余文件 · journal-book.tsx 零引用，且拖着 page-flip 整条依赖链（需用户决定）

- **证据**：`grep -rn "journal-book" src scripts` 中唯一 import 语句是 `screens.tsx:15 import { JournalRoomBook as JournalBook } from './journal-room-book'`——引用的是 journal-**room**-book；journal-book.tsx 自身零 importer；其导出的 `JournalQuill` 也零消费者；三支验证脚本 `scripts/check-journal*.mjs` 只动态 import `journal-layout.ts` 与 `journal-turn.ts`。
- **依赖链**：journal-book.tsx:2 是 src 内唯一 `import 'page-flip'` → `package.json` 固定 `page-flip@2.0.7` → `patches/page-flip@2.0.7.patch`（88 KB，patches/ 不在本分区）→ `src/types/page-flip.d.ts`（专为它写的 declare module）。这四样一起进退。
- **文档状态**：`ai/design_system/uiux/cinnaglass/journal-room-object/book-implementation.md:27`「旧 journal-book.tsx / diary.css 和翻页依赖保留作历史实现，本轮没有删除」；`ai/Features/ui-system/audit.md:81`「即使无引用也不在本 session 清理」；`cinnaglass-history/README.md:13`「苔绿方案已否决」。即：**留是明确决定，不是遗忘**。
- **连带**：`diary.css` 里 `.journal-engine`、`.journal-pager`、`.journal-binding` 三组选择器只被 journal-book.tsx 使用（第二步死样式线索）。
- **建议**：列为删除候选但由用户决定时点；删时四件一起删并 `pnpm install` 刷 lock；恢复依据 git `3fd52a5`。

### F4 · 依赖 · @react-three/rapier 零引用（跨分区线索）

- **证据**：`grep -rn "react-three\|drei\|rapier" src` 零命中；`package.json:15` dependencies 含 `@react-three/rapier ^2.2.0`；`vite.config.ts:12-17` 的 optimizeDeps.include 与注释仍在讨论 drei 预打包；`room-scene.tsx:4`「replaces the retired 3D metaspace」、PROJECT.md §技术栈 已改为 PixiJS。
- **建议**：交给根目录/配置分区处理（移除依赖 + 清 vite 注释）；本分区只登记。需要用户决定：否。

### F5 · 断链 · 注释引用的文档路径/章节/编号已失效（文档修复线索，不改代码）

格式：`文件:行` → 引用文本 → 现状。

| 文件:行 | 引用文本 | 现状 |
|---|---|---|
| `src/pages/WorldPage.tsx:242` | codex audit M2 / ai/UX.md §4 — world-first chat | ai/UX.md 已是 4 行链接入口，无 §4；M2 实际在 codex-visual/20260811-044310Z/codex-report.md:38 |
| `src/pages/WorldPage.tsx:345` | furniture hotspots → … (ai/UX.md §2) | UX.md 无 §2；正文迁至 ai/design_system/uiux/interaction.md |
| `src/pages/WorldPage.tsx:434` | retired with the idle-companion pivot (ai/UX.md) | 同上，入口文件本身无内容 |
| `src/pages/WorldPage.tsx:113` | see channel.md | ai/Features/channel.md 不存在（PROJECT.md:86：随 Discord 壳层作废，不恢复） |
| `src/pages/WorldPage.tsx:379 / :405 / :416` | S-4 step 2 / step 3 | S-4 编号在 TODO.md、PROJECT.md 零命中，只在 ai/Features/supabase.md（2026-07-04 快照）出现 |
| `src/themes/cinnaglass/room/room-types.ts:124` | see ai/STYLE.md §6 | ai/STYLE.md 已是链接入口；风格正文在 ai/design_system/design-system.md |
| `src/themes/cinnaglass/room/room-types.ts:136` | (ai/UX.md §2/§5) | UX.md 无章节 |
| `src/themes/cinnaglass/room/study-room.ts:52` | (ai/UX.md §2) | 同上 |
| `src/themes/cinnaglass/shell/rail.tsx:27` | drag editing retired — ai/UX.md §2 | 同上 |
| `src/lib/worlds.ts:2` | terminology in ai/Features/channel.md | 文件不存在 |
| `src/types/chat.ts:3` | see ai/Features/chat.md + ai/Features/channel.md | channel.md 不存在（chat.md 存在） |
| `src/themes/cinnaglass/lobby.tsx:2-3` | DB `rooms` row — see channel.md | 表名实为 `worlds`（worlds.ts:1-2）；channel.md 不存在 |
| `src/themes/cinnaglass/rooms.ts:2` | Terminology (channel.md) | 文件不存在 |
| `src/themes/cinnaglass/settings.tsx:213` | see world-settings.tsx / world.md W-3 | ai/Features/world.md 不存在（作废）；W-3 编号零命中 |
| `src/lib/chat.ts:1` | chat.md CH-12 / CH-17 | 两编号在 ai/ 全部 .md 零命中（chat.md 已重写为 v1 论述） |
| `src/lib/emotes.ts:2` | ai/Features/chat.md 表情系统 EMO-3 | EMO-3 零命中 |
| `src/themes/cinnaglass/emote-picker.tsx:1` | chat.md EMO-4 | EMO-4 零命中；:2 emoji-picker.html 存在于 ai/design_system/uiux/research/cinnaglass-history/ 但未写路径 |
| `src/themes/cinnaglass/channel-screen.tsx:8-9` | ux decisions.md D-7 … (D-7-3 修订) | D-7 在历史档 ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md:53（该文件头注声明已移出、非新指令）；D-7-3 零命中；当前决策表为 ai/design_system/uiux/cinnaglass/decisions.md |
| `src/themes/cinnaglass/emote-picker.tsx:7` | Panel is paper-solid (D-9) | D-9 在 ux-decisions.md（历史）与 decisions.md 均有；历史档头注称 D-9～D-12 已被后续裁决覆盖 |
| `src/themes/cinnaglass/scene.tsx:3` | mood overlays in ow.css | ow.css 不存在，实为 cinnaglass.css（其 :3 头注也自称 ow.css） |
| `src/themes/cinnaglass/cinnaglass.css:4` | Ported verbatim from the design prototype's `Our World.html` | 仓库内无此文件（历史来源说明，非断链但不可追溯） |
| `src/themes/cinnaglass/cinnaglass.css:111 / :212 / :517` | codex audit 2026-08-08, High #3 / High #1 / Med #2 | 编号可在 cinnaglass-history/ux-decisions.md:139 追到「codex 审核 High #3」；对应 codex-visual/20260808-200206Z 目录存在（未读，非本分区） |
| `shell/ambience.tsx:2、floaters.tsx:2-3、chat-card.tsx:2、rail.tsx:174、room-scene.tsx:160/:200` | codex pixel spec §5.3/§5.4/§5.6/§5.7/§5.8/§5.5/§5.9 | 章节存在于 codex-visual/20260811-055917Z/codex-report.md:117-237；只有 cinnaglass.css:18 写了批次号，组件文件未写路径（可追溯，建议补路径） |
| `src/themes/cinnaglass/room/pixi-scene.ts:81 / :1151` | codex audit M3 / H1 | 存在于 codex-visual/20260811-044310Z/codex-report.md:39/:33，代码未写路径 |

**仍有效的引用**（对照通过）：pixi-scene.ts:421 与 room-types.ts:39 → `ai/design_system/research/living-props.md`；room-types.ts:4、logman.ts:4 → `ai/PROJECT.md`；friends-page.tsx:2 → `…/cinnaglass-history/friends-page.html`；screens.tsx:119 → `…/timeline-redesign.html`；screens.tsx:54 → `composer-redesign.html`（存在，未写路径）；cinnaglass.css:46 → `…/mood-progression-codex/`；WorldPage.tsx:449「TODO R1」→ TODO.md 4 处；chat-data.ts:386「ST-O」→ timeline.md 4 处；types/chat.ts:2、emotes.ts:2、WorldPage.tsx:131 → `ai/Features/chat.md` 存在。

### F6 · 陈旧陈述 · 代码头注描述的架构已不成立

- `chat-data.ts:2`、`channel-screen.tsx:6`「in-scene ChatDock」：src 无 ChatDock；现为 `shell/chat-card.tsx`（PROJECT.md:90 亦注明「ChatDock 已被 concept-c 聊天窄卡取代」）。
- `channel-screen.tsx:1-2`「opened from the sidebar」：侧栏已随 Discord 壳层退役；实际入口为 chat-card 的「展开完整聊天」→ `WorldPage.tsx:498-501 setConvOpen`。
- `world-settings.tsx:6`「Entry: clicking the sidebar world-panel header」：`grep -rn "world-settings" src` 只有 WorldPage:15 import 与 :519 挂载，**没有任何 navigate('world-settings')**——弹窗有真实保存链却无 UI 入口（audit.md:35/60 已登记 P2）。
- `rooms.ts:1`「used by sidebar, space switcher, App」：仅 `owLoad` 被 WorldPage:24 使用；ROOMS_DEFAULT/ROOM_ICONS/VOICE_DEFAULT 零消费者（TODO.md:114 已登记「迁出 loader 后再删」）。
- `lobby.tsx:4`、`cinnaglass.css:902`「swapped for an R3F top-down island later」：R3F 路线已废（F4）。
- `scene.tsx:4`「RoomArt is exported so the minimap can reuse it」：`grep RoomArt` 无 minimap 消费者。
- `cinnaglass.css:294-337` `.sb-rcard / .sb-pcard / .sb-user .u-st`：侧栏类名在 src 全部 tsx 零命中（死样式，第二步）。
- `screens.tsx:177` `.tl-card.has-media image-slot`：screens.tsx 已无 `<image-slot>` JSX（:498 注释自证已替换为多图 picker）；`<image-slot>` 现仅 settings.tsx:134 头像使用。
- `WorldPage.tsx:45-46` widget 键 `days/minimap/memory/ambient/lighting` 与 `rail.tsx:28-32` MODULE_DEFS `anniv/music/presence` 不一致（audit.md:79 已登记）。
- `calendar.tsx:7` `ANNIV` 硬编码 2025.6.4 与 `world.anniversary`（floaters.tsx MomentCard）双真源（audit.md:61 已登记）。

### F7 · 目录组织与命名（只登记，不建议本轮动）

- **唯一 .js**：`themes/cinnaglass/image-slot.js` 是 src 内唯一 JavaScript；`eslint.config.js` 只匹配 `**/*.{ts,tsx}`、`tsconfig.app.json` 无 `allowJs` → 该文件既不被 lint 也不被类型检查，只靠 `themes/cinnaglass/types.d.ts` 给 JSX 侧补类型。它是被 main.tsx:5 副作用引入的自定义元素，`settings.tsx:134` 是唯一 `<image-slot>` 消费者。
- **环境声明分居两处**：`src/types/page-flip.d.ts`（第三方模块声明）与 `src/themes/cinnaglass/types.d.ts`（JSX IntrinsicElements）；后者文件名泛化，前者随死文件存亡。
- **命名风格按目录各成一派**：`pages/` PascalCase（`LoginPage.tsx`、`LoginPage.module.css`）、`hooks/` camelCase（`useAuth.ts`）、`lib/ types/ utils/` 全小写单词、`themes/cinnaglass/**` kebab-case（`chat-card.tsx`、`journal-room-book.tsx`）。每目录内部一致，跨目录不统一；无 codeStyle.md，仅 `.prettierrc`。
- **hook 位置不统一**：`hooks/` 只有 useAuth/useFeed；`useTweaks`（tweaks.ts）、`useChatThreads`（chat-data.ts）、`useSignedThumbs`（screens.tsx 内部）都在 themes/cinnaglass。
- **样式载体四种并存**（ui-system.md 已定性「四载体」）：全局 CSS（cinnaglass/materials/diary/journal-*/navigation-glass）、CSS Module（LoginPage.module.css）、组件内 `<style>` 字符串（calendar/settings/world-settings/music/friends-page/emote-picker/channel-screen/screens/ambience/floaters/chat-card/rail 共 12 文件）、内联 style 对象（room-scene.tsx、ProtectedRoute.tsx）。
- **themes/cinnaglass/ 平铺 38 文件**：数据 hook（chat-data.ts）、纯数据（emoji-data.ts）、引擎（journal-turn*.ts）、组件、CSS 混在一层；room/ 与 shell/ 已分子目录，journal-* 七个文件尚未。

### F8 · 文档对照 · ai/PROJECT.md §项目结构（:62-78）与现状偏差

- 树中列出：`themes/cinnaglass/{cinnaglass.css, screens.tsx, shell/, channel-screen.tsx, friends-page.tsx, calendar.tsx, settings.tsx, music.tsx, scene.tsx, rooms.ts, room/}`、`lib/`、`pages/WorldPage.tsx`、`types/`。
- **未列出**（30 个）：`main.tsx`、`App.tsx`、`index.css`；`hooks/useAuth.ts`、`hooks/useFeed.ts`；`utils/index.ts`；`pages/{LoginPage.tsx, LoginPage.module.css, ResetPasswordPage.tsx, ProtectedRoute.tsx}`；`themes/cinnaglass/{chat-data.ts, emote-picker.tsx, emoji-data.ts, icons.tsx, image-slot.js, types.d.ts, model.ts, profile.ts, tweaks.ts, lobby.tsx, world-settings.tsx, diary.css, materials.css, journal-book.tsx, journal-layout.ts, journal-room-book.tsx, journal-room.css, journal-turn.ts, journal-turn-controller.ts, journal-turn.css}`。其中 journal-* 七文件是 2026-09-07/11 落地的**当前日记实现**，PROJECT.md:84 功能条目有提，结构树没有。
- `:74`「lib/ supabase/worlds/posts/storage/profiles/chat」漏 `friends.ts`、`emotes.ts`、`logman.ts`。
- `:77`「types/ ✅ 保留」与 `:132`「src/types/database.ts 是死文件 → 删」同页矛盾。
- 树标题「现状 → 翻新方向」说明它本意是草图；但作为 CLAUDE.md 规定的「项目结构」权威段落，建议改成完整目录树或明确标注「示意，非完整清单」。

### F9 · 文档对照 · ai/Features/ui-system/audit.md §2/§4 行号核对

| audit.md 引用 | 现状 | 判定 |
|---|---|---|
| `shell/rail.tsx:96 / :178` | onAction 调用在 :96；RoomHandle 定义在 :178 | 精确 |
| `shell/ambience.tsx:34` | Ambience 函数 :30，折叠 pill 按钮 :40；:34 是 WxIcon 赋值 | 偏差 ≤10 行 |
| `shell/floaters.tsx:25 / :77` | MomentCard :21；MusicMini :66（:75-77 为注释） | 偏差 ≤11 行 |
| `floaters.tsx:77–116,178–181` | mb-main 按钮 JSX :106，CSS :179-187 | 大致对应 |
| `shell/chat-card.tsx` | 文件存在，Msg 错误仍在 | 精确 |
| `room/room-scene.tsx:155` | bubble 渲染起点 :155 | 精确 |
| `channel-screen.tsx / friends-page.tsx / emote-picker.tsx` | 均存在且可达 | 精确 |
| `settings.tsx:199 / :165–174` | modal-scrim :199、modal :200；savePw :166-174 | 精确 |
| `WorldPage:519` | WorldSettingsScreen 挂载 :519 | 精确 |
| `calendar.tsx:195 / :325` | CalendarScreen modal :195-196；ClockScreen modal :324-325 | 精确 |
| `pages/LoginPage.tsx / ResetPasswordPage.tsx / ProtectedRoute.tsx:27` | Splash 背景渐变 :27 | 精确 |
| `lobby.tsx` | 存在，IslandArt 自绘 | 精确 |
| `WorldPage.tsx:337–350` | onRail :338-344、onHotspot :346-351 | 精确 |
| `cinnaglass.css:23–43 `--cg-*`` | --cg-panel :23 … --cg-blur :43 | 精确（09-13 改动未移位） |
| `materials.css:18–75` | 文件仅 70 行；--craft-* 定义 :3-16，覆盖规则 :18-70 | **超界**（75 > 70） |
| `LoginPage:8、ResetPasswordPage:10 import scene.tsx` | 均精确 | 精确 |
| `WorldPage:24 owLoad` | 精确 | 精确 |
| `audit.md:67 tsc 失败唯一输出 Msg` | 2026-09-18 复测结果一致 | 仍成立 |

### F10 · 其他与 PROJECT.md 的小偏差

- PROJECT.md:96「现有标签池：auth、chat」：src 中 `[chat][web][chat-data]` 走 Logman；`[auth][web][SettingsScreen]`（settings.tsx:191）是裸 `console.warn`，未走 `src/lib/logman.ts`。标签池陈述成立，但 logman 封装未被 auth 域使用（第二步/logman skill 范围）。
- PROJECT.md:113 `message_reactions` 列「message_id / user_id / world_id / emoji / created_at」与 `chat.ts:14 REACTION_COLS` 一致；但 `types/chat.ts:75 ReactionRow` 多声明了从未 select 的 `channel_id`，chat-data.ts:649 乐观插入时填 `''`。类型与查询不一致（第二步）。
- PROJECT.md:90「DM/好友 UI 在新方向收起」：截至基线，好友页仍可从聊天大窗左栏「好友」进入（channel-screen.tsx:431）。这是方向而非现状，与 audit.md:32「B 旧入口；按产品计划收起」一致，不算陈旧，但读者易误以为已收起。
- `.env.example` 6 个变量与 `src/types/index.ts` EnvName 6 项一一对应，`utils/index.ts` 三种读取方式与 ProtectedRoute/WorldPage 用法一致。
- `study-room.ts`、`room-scene.tsx`、`rail.tsx`、`chat-card.tsx`、`screens.tsx`、`floaters.tsx`、`journal-room.css`、`journal-turn.ts`、`journal-room-book.tsx`、`navigation-glass.css` 引用的 **全部 40 个 `/public` 资源路径均存在**于 inventory（含字体、webp、png）。

## 4. 陈旧陈述清单（结构化，供 stale_statements 使用）

见 §3 F5 表格（代码注释中的失效文档引用）与 F6（架构头注）、F8（PROJECT.md 结构树）、F9（audit.md 行号）。StructuredOutput 中逐条列出。

## 5. 删除候选

| 路径 | 理由 | 查过的引用面 | 把握 | 恢复依据 |
|---|---|---|---|---|
| `src/types/database.ts` | Supabase 模板残留，只声明不存在的 todos 表；零引用；PROJECT.md/TODO.md 已定性为死文件 | src 全量 grep（import 路径、`Database` 标识符）、vite.config.ts、tsconfig*.json、eslint.config.js、package.json、index.html、scripts/；supabase.ts 无泛型 | 高 | git `3fd52a5` |
| `src/themes/cinnaglass/journal-book.tsx`（连带 `src/types/page-flip.d.ts`、`page-flip` 依赖、`patches/page-flip@2.0.7.patch`） | 被 journal-room-book.tsx 取代的旧翻页实现，零 importer；是 page-flip 链唯一消费者 | src 全量 import grep、scripts/*.mjs 动态 import、ai/ 文档引用（book-implementation.md:27、audit.md:81 明说暂留作历史）、TODO.md | 中（事实清楚，但文档决定暂留 → 需用户拍板时点） | git `3fd52a5` |

**不列为删除候选但已登记**：`rooms.ts`（owLoad 仍被用，TODO.md:114 要求先迁 loader）、`scene.tsx`（登录/重置页仍用）、`materials.css`（ui-system.md 明确不删）、`world-settings.tsx`（有真实保存链，缺入口而非死文件）。

## 6. 限制与未完成

- 未运行 `vite build`/`eslint`（只跑了 tsc 类型检查）；未启动浏览器实测运行时可达性，可达性判断基于静态 import 图 + lazy import + CSS @import/url() + index.html。
- 未读 `codex-visual/**` 与 `patches/page-flip@2.0.7.patch` 正文（不在本分区），只用 grep/ls 确认其存在与章节标题。
- 未核对 `sql/` 与线上 Supabase 结构，`types/chat.ts` 与 `*_COLS` 的对照只做到「代码内一致性」。
- 目录组织与死样式（sb-*、journal-engine、image-slot 选择器）、未使用导出（daysSince、ROOMS_DEFAULT、WidgetPos、JournalQuill）属第二步范畴，本文仅登记线索。
- `tsc` 的 tsbuildinfo 写入会话 scratchpad，未触碰 `node_modules/.tmp`。

## 7. 覆盖校验

`src-coverage.csv` 64 行 = inventory `src/` 64 行；集合差集为空（写入后由脚本断言，见 StructuredOutput 附带的校验输出）。status 全部「已检查」：64 个文本文件均读完全文并完成引用 grep；.ts/.tsx 另经 tsc 全量类型检查。
