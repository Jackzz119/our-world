# Shell / Pages / Lib / 配置 分区结构审阅

- run: `2026-09-19-01`，step 02「工程结构、模块化与复用」
- HEAD: `a9f7cfa`（dev）
- 分区：`src/main.tsx`、`src/App.tsx`、`src/index.css`、`src/pages/*`、`src/hooks/useAuth.ts`、`src/lib/{supabase,profiles,worlds}.ts`、`src/utils/index.ts`、`src/types/index.ts`、`src/themes/cinnaglass/{shell/*,calendar,settings,world-settings,music,lobby,icons}`、根配置、`scripts/`
- 方式：分区文件全文通读 + 全仓 grep 交叉验证 + `metrics/structure-*.json`
- 约束：只读审阅，未修改任何项目文件；只评结构/复用/注释，不评视觉

---

## 1. 逐文件职责、变化原因、importer、命名一致性

### 1.1 职责与 importer 表

| 文件 | 职责（一句话） | 会因什么而变 | importer |
|---|---|---|---|
| `src/main.tsx` | 挂载 React 根，按序引入全局 CSS 与 `image-slot` 自定义元素副作用 | 新增全局样式表 / 新增副作用模块 | 无（Vite 入口） |
| `src/App.tsx` | 三条路由的声明：`/login`、`/reset-password`、`/`（受 `ProtectedRoute` 守卫） | 新增页面路由 | `main.tsx` |
| `src/index.css` | 全局 reset（替代已移除的 Tailwind preflight）+ 基础字体栈 | 极少；只在 reset 层面变 | `main.tsx:3` |
| `src/pages/ProtectedRoute.tsx` | 鉴权闸门 + dev 自动登录 + 显式登出粘滞标记 | 鉴权策略、dev 开关语义变化 | `App.tsx:5` |
| `src/pages/LoginPage.tsx` | 登录/注册/忘记密码三态表单 | Supabase auth API、登录方式增减 | `App.tsx:3` |
| `src/pages/ResetPasswordPage.tsx` | 从恢复邮件落地后设新密码 | 同上 | `App.tsx:4` |
| `src/pages/LoginPage.module.css` | 登录壳的 scoped 样式（被 Login 与 Reset 共用） | 登录页视觉 | `LoginPage.tsx:10`、`ResetPasswordPage.tsx:12` |
| `src/pages/WorldPage.tsx` | 世界页总编排：全部共享状态 + 全部弹窗/浮层挂载 | **几乎任何功能变化**（扇出 22，见 §2） | `App.tsx:2` |
| `src/hooks/useAuth.ts` | 订阅 Supabase session，暴露 `{user, loading}` | auth 事件模型变化 | `ProtectedRoute.tsx:11`、`ResetPasswordPage.tsx:9` |
| `src/lib/supabase.ts` | 单例 client | 环境变量、client options | 12 处（fan-in 第 2） |
| `src/lib/profiles.ts` | `profiles` 表按 id 批量取，返回 id→profile map | profiles 表字段 | 3 处 |
| `src/lib/worlds.ts` | `worlds` 表的 读/建/改 三个动作 + `WorldPatch` 类型 | worlds 表字段、RLS | `WorldPage.tsx:27`、`world-settings.tsx:9` |
| `src/utils/index.ts` | 三个 `import.meta.env` 读取器（必需/布尔/可选） | 新增环境变量读取语义 | `supabase.ts:2`、`ProtectedRoute.tsx:13`、`WorldPage.tsx:31` |
| `src/types/index.ts` | `EnvName` 联合类型（环境变量名白名单） | 新增环境变量 | `utils/index.ts:1` |
| `themes/cinnaglass/shell/rail.tsx` | 左侧导航条 + 房间/工具两个 popover + 右缘 `RoomHandle` | 导航条目、模块开关项 | `WorldPage.tsx:17` |
| `themes/cinnaglass/shell/rail-icons.tsx` | 导航专用的 5 个 SVG 剪影 | 导航图标改版 | `rail.tsx:8` |
| `themes/cinnaglass/shell/ambience.tsx` | 顶部居中 mood/weather 控件（含自带 `<style>`） | mood/weather 选项 | `WorldPage.tsx:19` |
| `themes/cinnaglass/shell/floaters.tsx` | 纪念日卡 `MomentCard` + 音乐条 `MusicMini`（含自带 `<style>`） | 浮层组件增减 | `WorldPage.tsx:20` |
| `themes/cinnaglass/shell/navigation-glass.css` | 导航材质与响应式布局（唯一一份独立 CSS 的 shell 组件） | 导航材质 | `rail.tsx:9` |
| `themes/cinnaglass/calendar.tsx` | 日历弹窗 + 时钟/闹钟弹窗（两个不相关屏挤在一个文件） | 日历或闹钟任一变化 | `WorldPage.tsx:13` |
| `themes/cinnaglass/settings.tsx` | 个人设置弹窗（资料/账号/主题） | 设置项 | `WorldPage.tsx:14` |
| `themes/cinnaglass/world-settings.tsx` | 世界设置弹窗（icon/名称/纪念日，直写 DB） | worlds 字段 | `WorldPage.tsx:15` |
| `themes/cinnaglass/music.tsx` | WebAudio 生成式播放器 + `TRACKS` 曲目表 | 播放器与曲目 | `floaters.tsx:9` |
| `themes/cinnaglass/lobby.tsx` | 大厅场景（漂浮岛 SVG + 状态卡） | 大厅流程 | `WorldPage.tsx:11` |
| `themes/cinnaglass/icons.tsx` | 通用线性图标库（`Ico` + 56 个图标），fan-in 14（全仓第 1） | 任何界面新增图标 | 14 处 |

### 1.2 命名一致性（逐目录）

| 目录 | 现状 | 判定 |
|---|---|---|
| `src/pages/` | `WorldPage.tsx`/`LoginPage.tsx`/`ResetPasswordPage.tsx`/`ProtectedRoute.tsx` + `LoginPage.module.css` | **一致**（PascalCase，全部是路由级组件；`ProtectedRoute` 不是页面但是路由元素，放这里可接受） |
| `src/hooks/` | `useAuth.ts`、`useFeed.ts` | **一致**（camelCase + `use` 前缀） |
| `src/lib/` | `supabase/profiles/worlds/chat/emotes/friends/logman/posts/storage.ts` | **一致**（全小写单词） |
| `src/types/` | `index.ts`/`chat.ts`/`feed.ts` | **一致** |
| `src/themes/cinnaglass/` | 全部 kebab-case 或单词小写 | **一致**（唯一例外是 `types.d.ts`，属惯例） |
| `src/themes/cinnaglass/shell/` | `rail/rail-icons/ambience/floaters/chat-card` + `navigation-glass.css` | **一致** |
| `scripts/` | `check-*.mjs` / `pack-*.mjs` / `render-*.mjs` / `compare-*.mjs` / `*.py` | **一致**（动词-宾语 kebab） |

**结论：每个目录内部的命名都自洽，没有需要顺手改正的历史遗留不一致。** 唯一跨目录的不统一是 import 路径写法（§8.3）。

### 1.3 平铺文件是否应归子目录

`themes/cinnaglass/` 根目录现有 **33 个平铺文件**，其中已经分出去的只有 `shell/`（5 个）和 `room/`（4 个）。平铺的 `calendar.tsx` / `settings.tsx` / `world-settings.tsx` / `music.tsx` / `lobby.tsx` / `icons.tsx` 分属三类：

| 文件 | 类别 | 归属建议 |
|---|---|---|
| `calendar.tsx`、`settings.tsx`、`world-settings.tsx` | **模态屏**（都是 `.modal.mini` + `open/onClose`，都由 `WorldPage` 直接挂载） | 归 `screens/`（与已有的 `screens.tsx`、`channel-screen.tsx`、`friends-page.tsx` 同类） |
| `music.tsx` | **被 shell 消费的功能部件**（唯一 importer 是 `shell/floaters.tsx`） | 归 `shell/`（它事实上只服务于 shell 浮层） |
| `lobby.tsx` | **场景**（与 `scene.tsx`、`room/` 同层级的另一种场景） | 留在根，或与 `scene.tsx` 一起归 `scenes/` |
| `icons.tsx` | **跨目录共享原子**（fan-in 14，被 pages 与 themes 双向消费） | **必须留在根**，任何下沉都会制造 `../..` 回指 |

**收益**：`themes/cinnaglass/` 根从 33 降到约 20 个文件，"打开哪个文件改哪种东西"从文件名一眼可判；`screens/` 目录会成为「弹窗层」的天然边界，未来加第 7 个弹窗时不用再想放哪。

**风险**：
1. **纯移动会碰 12+ 个 import**（`WorldPage.tsx:13-15`、`floaters.tsx:9` 等）。无测试，回归只能靠 `tsc -b` + `eslint` + 手动过一遍 5 个弹窗。
2. **`ai/` 文档里有路径引用**（例如 `settings.tsx:213` 的注释指向 `world-settings.tsx`，`ai/features/ui-system/ui-system.md` 也按文件名索引）。移动必须同批改文档，否则制造新的失效引用。
3. **与 UI 统一计划冲突的风险**：`ai/features/ui-system/ui-system.md` 以导航为 A 基准推进，日记线冻结。若目录重排与那条线并行进行，会让 diff 难读。

**判定：归目录属于 B 类（需用户批准），且建议排在 UI 统一计划的 A 基准落地之后做，不要与它并行。**

---

## 2. `WorldPage` 465 行的拆分方案（只给方案，不实施）

### 2.1 现状诊断

`WorldPage.tsx:93-557`，一个函数里装了 **17 个 `useState` + 8 个 `useEffect` + 1 个 22 返回值的 `useChatThreads` 解构 + 9 个内联回调 + 一棵 120 行的 JSX**。扇出 22（全仓第一）。它同时是：

1. **世界生命周期编排**：`getMyWorld` / `createWorld` / 大厅 ↔ 世界的进出（`:163-181`、`:355-376`、`:424-428`）
2. **弹窗路由**：`screen` 字符串 → 6 个不同弹窗（`:101-104`、`:331-351`、`:511-519`）
3. **天气实况**：WMO 映射 + geolocation + open-meteo fetch + 手动覆写（`:59-74`、`:277-317`）
4. **聊天气泡**：从 `lastMsg` 派生未读红点与世界内气泡（`:228-254`）
5. **presence 占位**：`:444-452` 写死 `status:'在你身边', online:true`
6. **本地持久化**：events / alarms / profile / widgets 四份 localStorage 写回（`:255-275`、`:319-330`）
7. **世界身份合成**：DB 名字 + localStorage 兜底 → `liveProfile`（`:379-420`）
8. **世界 icon 签名 URL 轮换**（`:183-207`）

这 8 件事彼此**没有共享状态**，只是都挂在同一个组件上。

### 2.2 拆分方案（5 个 hook + 1 个子组件，接口全部确定）

> 全部抽到 `src/hooks/`（跨主题可复用的）或 `src/themes/cinnaglass/shell/`（主题绑定的）。下面「接口」列是建议签名，`WorldPage` 保留为唯一消费者。

| # | 抽出物 | 位置 | 接口 | 搬走的行 | 消费者 |
|---|---|---|---|---|---|
| S1 | `useWeather` | `src/hooks/useWeather.ts` | `(tweak: WeatherTweak) => Weather` | `:59-74`、`:108`、`:277-317`（含 `mapWmo`、`MANUAL_WX`） | `WorldPage`（传给 `RoomScene` 与 `ClockScreen`） |
| S2 | `useLiveClock` | `src/hooks/useLiveClock.ts` | `(intervalMs?: number) => number` | `:107`、`:210-213` | `WorldPage`（只传 `ClockScreen`） |
| S3 | `useWorldSession` | `src/hooks/useWorldSession.ts` | `() => { world, uid, profiles, memberNames, worldIconUrl, lobbyStatus, lobbyError, lobbyBusy, entered, enterWorld, createAndEnter, retryLobby, leaveWorld, applySavedWorld }` | `:115-129`、`:163-207`、`:355-401`、`:417-420`（不含 `setScreen/setChatOpen` 副作用，见风险 R2） | `WorldPage` → `LobbyScene`、`WorldSettingsScreen` |
| S4 | `useSurfaceRouter` | `src/hooks/useSurfaceRouter.ts` | `() => { screen, surfaceOrigin, open(key, origin?), close(), onRail, onHotspot }` | `:90-91`、`:101-104`、`:331-351` | `WorldPage` → `Rail`、`RoomScene`、6 个弹窗 |
| S5 | `useWorldChatBubble` | `themes/cinnaglass/shell/use-world-chat-bubble.ts` | `(lastMsg, { chatOpen, convOpen }) => { unread, bubble, clearUnread }` | `:228-254`（含 `lastBubbledId` ref） | `WorldPage` → `RoomScene.bubble`、`Rail.unread` |
| S6 | `<WorldSurfaces>` | `themes/cinnaglass/shell/world-surfaces.tsx` | 接 `screen / onClose / events / alarms / nowTs / weather / world / iconUrl / t / setTweak / profile / setProfile / onWorldSaved` | `:511-519` 那 5 个弹窗的挂载 | `WorldPage` |
| S7 | `usePersistedState` | `src/hooks/usePersistedState.ts` | `<T>(key: string, initial: T \| (() => T)) => [T, Dispatch<SetStateAction<T>>]` | 合并 `:255-275` 三个相同形状的写回 effect + `:319-330` 的 widgets 写回 | `WorldPage`（events/alarms/profile/widgets 四处） |

拆完后 `WorldPage` 剩下的职责：**读 hook → 组装 props → 渲染两棵子树（世界内 / 大厅）**，预估 150–180 行，扇出降到约 12。

### 2.3 最小批次（每批独立可验、可单独回滚）

| 批次 | 内容 | 为什么这个顺序 |
|---|---|---|
| **B1** | S2 `useLiveClock` + S1 `useWeather` | 零跨模块耦合，纯搬运；先做它们是为了确认搬运流程本身不出错 |
| **B2** | S7 `usePersistedState`，替换 events/alarms/profile 三处（widgets 暂不动，它有 `REQUIRED` 白名单逻辑） | 删掉 3 个几乎一样的 effect；行为等价性最容易肉眼确认 |
| **B3** | S5 `useWorldChatBubble` | 边界清楚（输入只有 `lastMsg` + 两个开关），但涉及 `useRef` 去重，值得单独一批 |
| **B4** | S4 `useSurfaceRouter` | 触及 rail / hotspot / 键盘三条入口，是最容易出交互回归的一批 |
| **B5** | S3 `useWorldSession` | 触及网络与生命周期，风险最高，放最后 |
| **B6** | S6 `<WorldSurfaces>` | 纯 JSX 搬运，但要等 B4 定下 `screen` 的接口形状 |

### 2.4 无测试下的等价验证清单

项目无测试、无 CI，所以每批次后必须跑这套**人工等价验证**（全部是现成手段，不新增基建）：

1. `pnpm build`（= `tsc -b && vite build`）—— 类型层面保证 props 没接错；
2. `pnpm lint` —— `react-hooks/exhaustive-deps` 是这次拆分最容易踩的坑（把 effect 搬进 hook 后依赖数组语义会变），warning 数量必须**不增加**（当前基线 3 条：`music.tsx:9`、`pixi-scene.ts:16`、`room-scene.tsx:121`）；
3. **现成的 e2e 脚本**：`scripts/check-navigation.mjs`（导航 5 键 + mood 切换 + 触摸布局）与 `scripts/check-diary.mjs`（timeline 弹窗）本来就是对着跑起来的应用做断言的，**B4/B6 之后必须跑这两个**（注意端口，见 §7.5）；
4. **手动脚本（每批都走一遍）**：
   - `?enter=1` 直接进世界 → rail 五个按钮各点一次 → 六个弹窗各开各关一次；
   - 键盘裸 Enter 开聊天卡；在输入框内按 Enter 不应开；
   - 弹窗开着时按 Enter 不应触发场景快捷键（`:216-226` 的 layer gate）；
   - 家具热点（timeline/photos/wishlist/clock/music）各点一次，确认与 rail 打开的是同一个 surface；
   - 设置里改 mood/weather → 场景与 `Ambience` 同步；
   - 世界设置改名保存 → rail/卡片文案立刻变（`onWorldSaved` 链路）；
   - 退出世界回大厅 → 弹窗与聊天卡都关闭（`leaveRoom` 的两个副作用）；
   - 刷新页面 → events/alarms/profile/widgets 都还在（localStorage 链路）。

### 2.5 风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| R1 依赖数组语义漂移 | effect 搬进自定义 hook 后，闭包捕获的变量来源变了，`exhaustive-deps` 可能"变得满意"但行为已变（典型：`:245-254` 的 `lastBubbledId` 去重） | 每批只搬一个 hook；lint warning 数量作为硬门槛 |
| R2 `leaveRoom` 的跨域副作用 | `:424-428` 同时改 `entered`（会话域）、`screen`（路由域）、`chatOpen`（聊天域）。若把它整个塞进 `useWorldSession`，session hook 就会反向依赖 router 与 chat | S3 只暴露 `leaveWorld()` 改自己的状态，**关弹窗/关聊天卡留在 `WorldPage` 的调用点**组合 |
| R3 `useChatThreads` 22 个返回值 | 它已经是超大接口，拆 `WorldPage` 时很容易顺手"整理"它，那是另一个文件的事 | 本轮明确不动 `chat-data.ts` |
| R4 `AUTO_ENTER` / `DEV_SURFACE` 模块级求值 | `:38-42`、`:91` 在模块加载时读 `window.location.search`，搬进 hook 会改变求值时机 | 这两个常量**留在 `WorldPage` 模块顶部**，作为参数传进 hook |
| R5 无测试网 | 任何行为回归只能靠人工发现 | 严格执行 §2.4，且每批单独 commit，便于二分回滚 |

---

## 3. 复用：四处重复与边界

### 3.1 `icons.tsx` 与 `shell/rail-icons.tsx` 的边界

**现状**：两者不是竞争关系——`rail-icons.tsx:3` 就 `import { Ico } from '../icons'`，5 个导航剪影都是 `Ico` 的调用方。边界其实已经成立：

- `icons.tsx` = **通用图标库**（`Ico` 原语 + 56 个 24px 线性图标），fan-in 14；
- `rail-icons.tsx` = **导航专用的 5 个更粗、更"招牌"的剪影**（`rail-icons.tsx:1-2` 注释说明了理由：保留 `currentColor` 让暖光打在描边而不是图片外框上）。

**但边界被破了两处**：

1. `rail.tsx:7` 同时从 `../icons` 取 `IBag/ICalendar/IChevron/ILock/ILogout/IPhoto` —— 也就是说导航条里 **5 个图标用 rail-icons，6 个图标用通用库**，同一个 `.rail-btn` 里两套笔触。这不是错，但需要一条明文规则，否则下一个人不知道新图标该加哪边。
2. `LoginPage.tsx:12-23` 就地定义了 `IMail` 和 `ILock` —— 而 `icons.tsx:233` 已有 `IMail`、`icons.tsx:170` 已有 `ILock`，`ResetPasswordPage.tsx:11` 正是从 `icons.tsx` 导入 `ILock` 的。**同一个登录壳的两个页面，一个用本地副本一个用共享库。**

**建议的边界规则（写进 `icons.tsx:1` 的文件头注释）**：
> `icons.tsx` 是唯一的通用图标来源；`shell/rail-icons.tsx` 只放"导航招牌"——即需要 32px+ 粗剪影、且只在 `.rail-btn` 里出现的图标。页面/组件一律不得就地定义图标。

**A 类可直接做**：删 `LoginPage.tsx:12-23` 的两个本地副本，改从 `icons.tsx` 导入（与 `ResetPasswordPage` 对齐）。风险：两版路径不同，视觉会有细微差别 —— 需目视比对一次登录页。

### 3.2 纪念日：**三份真源 + 一对无人使用的正确实现**

这是本分区最实质的复用问题。

| 位置 | 形式 | 数据来源 |
|---|---|---|
| `src/types/feed.ts:32` `World.anniversary` | DB 字段 | **权威** |
| `themes/cinnaglass/profile.ts:9` `PROFILE_DEFAULT.anniv = '2025-06-04'` | localStorage 兜底 | 离线兜底（合理） |
| `themes/cinnaglass/calendar.tsx:7` `ANNIV = { m: 5, d: 4, year: 2025 }` | **硬编码常量** | 无来源，与上面重复 |

更糟的是**日期数学被实现了三遍，而唯一正确的一份没人用**：

- `profile.ts:27` `daysSince` 和 `profile.ts:35` `daysUntilAnniversary` —— **全仓零消费者**（grep 确认，只在定义处出现）；
- `shell/floaters.tsx:22-32` `MomentCard` 的 `useMemo` 里就地重写了这两段逻辑；
- `calendar.tsx:130-138` `nextAnniv()` 第三次重写，且读的是硬编码 `ANNIV`。

**后果（行为层面，不只是洁癖）**：`WorldPage.tsx:516` 给 `CalendarScreen` 只传了 `events/setEvents`，**没传 `anniv`**。所以用户在世界设置里改了纪念日，`MomentCard`（吃 `liveProfile.anniv`）会更新，**日历弹窗顶部那张"距下一个纪念日"卡片不会更新**，它永远显示 2025.6.4。

**唯一来源方案**：
1. `world.anniversary` 是唯一权威；`PROFILE_DEFAULT.anniv` 保留为离线兜底（`WorldPage.tsx:406-412` 的 `liveProfile` 已经是正确的合成点）；
2. 删 `calendar.tsx:7` 的 `ANNIV`，`CalendarScreen` 增加一个 `anniv: string` prop，由 `WorldPage` 传 `liveProfile.anniv`；
3. `MomentCard` 与 `CalendarScreen` 都改用 `profile.ts` 里现成的 `daysSince` / `daysUntilAnniversary`，删掉两份就地实现。

**风险**：`calendar.tsx:175` 的 `isAnniv` 高亮判定依赖 `ANNIV.m/d`，改成解析 ISO 字符串后要处理 `anniv` 为空的情况（新世界 `anniversary` 可为 `null`）。属 **B 类**（改了 prop 接口与渲染行为）。

### 3.3 三个 shell 组件内的 `<style>` 字符串

| 组件 | `<style>` 位置 | 行数 | 用的 token |
|---|---|---|---|
| `shell/rail.tsx:188-207` `RoomHandleStyles` | 组件内字符串 | 19 | `--cg-stroke`、`--cg-shadow`、`--cg-inset`、`--cg-blur`、`--cg-icon` |
| `shell/ambience.tsx:92-151` `AmbienceStyles` | 组件内字符串 | 58 | `--cg-panel`、`--cg-stroke`、`--cg-blur`、`--cg-shadow`、`--cg-inset`、`--cg-icon`、`--cg-icon-muted`、`--cg-gold-core` |
| `shell/floaters.tsx:120-202` `FloaterStyles` | 组件内字符串 | 82 | `--cg-panel`、`--cg-panel-dense`、`--cg-control-strong`、`--cg-stroke`、`--cg-blur`、`--cg-shadow`、`--cg-inset`、`--cg-icon`、`--cg-icon-muted`、`--cg-pink` |

**重复的到底是什么**：不是 token 值（它们都正确地引用了 `cinnaglass.css:23-43` 的 `--cg-*`，没有硬编码颜色重复），而是**「玻璃面板」这条 5 行声明块**：

```
background: var(--cg-panel);
border: 1px solid var(--cg-stroke);
backdrop-filter: var(--cg-blur);
box-shadow: var(--cg-shadow), var(--cg-inset);
color: var(--cg-icon);
```

它在 `rail.tsx:196-201`、`ambience.tsx:98-102`（`.amb-pill`）、`ambience.tsx:117-120`（`.amb-panel`）、`ambience.tsx:142-146`（`.amb-tab`）、`floaters.tsx:128-132`（`.moment-card`）、`floaters.tsx:158-161`（`.music-bar`）**逐字重复 6 次**。

另外还有一组 hover/active 微交互也重复 5 次：`transition:filter 160ms ease,transform 120ms ease` + `:hover{filter:brightness(1.0x)}` + `:active{transform:scale(0.9x)}`。

**另一个问题是重复挂载**：`FloaterStyles` 在 `floaters.tsx:37`（`MomentCard` 内）和 `floaters.tsx:91`（`MusicMini` 内）**各挂一次**，两个组件同屏时 DOM 里有两个内容完全相同的 `<style>` 标签。`CalClockStyles`（`calendar.tsx:194`、`calendar.tsx:323`）同理。浏览器会去重解析但不会去重 DOM 节点。

**建议（A 类，低风险）**：在 `cinnaglass.css` 的 shell token 块之后加一个 `.cg-panel` 原子类，承载上面那 5 行 + 那组过渡；三个组件的 `<style>` 里对应规则改为 `@extend` 式的手动组合（CSS 没有 extend，所以是在 JSX 上加 `className="cg-panel"`，样式串里只留尺寸/圆角/定位）。**验证**：`pnpm build` + 目视三个浮层在三个 mood 下各一次（`scripts/check-navigation.mjs` 已覆盖 rail 在三个 mood 下的截图，可复用）。

**不建议**：把三份 `<style>` 全部搬进 `navigation-glass.css`。那个文件是导航专属的，塞进 ambience/floaters 会让"改哪个文件"重新变糊。若要抽，应新建 `shell/shell-glass.css`——但那是 B 类，因为会改变样式加载时机（从组件挂载时注入变成模块导入时注入）。

### 3.4 `scripts/` 的 `dependency` 同体

三处逐字相同（`metrics/structure-summary.json` 的 `duplicateBodyCandidates` 已标出，人工复核确认）：

- `scripts/check-diary.mjs:9-10`
- `scripts/check-journal-art.mjs:8-9`
- `scripts/check-navigation.mjs:8-9`

```js
const dependency = (name) =>
    require(process.env.DIARY_NODE_MODULES ? path.join(process.env.DIARY_NODE_MODULES, name) : name);
```

另有 **3 个变体**（同一意图、写法不同，抽取时必须一并统一，否则只是把 3 份变成 3 份 + 3 份）：

| 文件 | 写法 | 差异 |
|---|---|---|
| `scripts/pack-navigation-texture.mjs:6` | 直接内联三元，只取 `sharp` | 没抽成函数 |
| `scripts/pack-journal-art.mjs:8` | 同上 | 同上 |
| `scripts/check-journal-turn.mjs:7-8` | `require(path.join(process.env.DIARY_NODE_MODULES, 'playwright'))` | **无兜底**：`DIARY_NODE_MODULES` 未设时 `path.join(undefined,...)` 直接抛 |
| `scripts/compare-journal-art.mjs:7` | 同上，无兜底 | 同上 |
| `scripts/render-journal-turn.mjs:6` | `const dep = (n) => require(path.join(...))` | 函数名不同 + 无兜底 |

**评估：值得建 `scripts/lib/deps.mjs`。** 理由不是"少写 3 行"，而是：

1. **它消灭的是一个真实的不一致**——3 个脚本有兜底、3 个没有，同样的环境变量缺失在不同脚本里表现完全不同（一个回退到全局 `node_modules`，一个崩在 `path.join`）；
2. **它是 `scripts/` 唯一需要的共享设施**，不会长成一个杂物袋；
3. **零风险**：脚本不参与构建，`tsc -b` / `vite build` / `eslint`（`files: ['**/*.{ts,tsx}']`，不覆盖 `.mjs`）都不会受影响。

建议内容：
```js
// scripts/lib/deps.mjs — resolve a Codex-bundled dependency, falling back to
// this project's own node_modules when DIARY_NODE_MODULES is unset.
export const dependency = (name) => ...
```
**验证**：对每个改过的脚本跑一次 `node scripts/<name>.mjs`（需要先起 dev server，见 §7.5），确认能解析到 `playwright`/`sharp`。**归 A 类**，但因为需要起服务才能完整验证，若本轮不起服务则降级为「只做抽取 + `node --check` 语法校验」。

---

## 4. 死样式（零消费者选择器）

方法：对每个选择器 grep 源码中的 `className=`、字符串字面量、模板拼接（`` `rail-btn ${...}` ``）与 `data-*` 属性选择器，再人工复核动态拼接。

### 4.1 `cinnaglass.css`

| 行号 | 选择器 / 块 | 判定 | 证据 |
|---|---|---|---|
| **294-296** | `.sb-rcard`、`.sb-pcard`（在 `.paper` token remap 列表里） | **死** | 全仓仅此一处出现；`sb-` 前缀属已退役的 Discord 式侧栏 |
| **307** | `.chsc-pick`（同一列表） | **死** | 全仓仅此一处；`channel-screen.tsx` 里没有 `chsc-pick` |
| **327-337** | `.sb-user .u-st` 整块 + 其上 4 行注释 | **死** | `sb-user`、`u-st` 全仓各只出现在这一处；注释描述的"侧边栏账号条"已随 concept-c shell 退役 |
| **529-532** | `.modal.tall` | **死** | 全仓无任何 `tall` 字符串（`grep -rn "tall" src` 为空）；注释里提到的 SubScreen timeline 现在走 `.modal` 默认尺寸 |
| **845-871** | `@keyframes floatA` / `floatB` / `floatC` | **死** | 全仓无 `floatA/B/C` 引用（连 `872-881` 那条 `[style*='floatA']` 的 reduced-motion 兜底一起死） |
| **872-881** | `@media (prefers-reduced-motion)` 里的 `[style*='floatA'|'floatB'|'floatC']` | **死**（依赖上面） | 同上；块内的 `.mood-stars{animation:none}` **活着**，拆分时要保留 |
| **883-898** | `@keyframes beat` | **死** | 全仓无 `animation:beat` / `beat` 类名引用 |
| 300 | `.wish` | **活** | `screens.tsx:932` |
| 297/299 | `.tl-card`、`.pd-card` | **活** | `screens.tsx` |
| 298 | `.compose` | **活** | `screens.tsx` / `diary.css` |
| 305-306/308-309 | `.chsc-m .bub`、`.chsc-rx .rx`、`.abar`、`.epk` | **活** | `channel-screen.tsx`、`emote-picker.tsx` |
| 594-608 | `.room-stage` | **活** | `scene.tsx` |
| 730-818 | `.wx-*` 全族 | **活** | `scene.tsx` |

**可删总量**：约 **39 行**（294-296 部分行、307、327-337、529-532、845-881、883-898）。

**注意（删除时的陷阱）**：`294-313` 是一个**逗号选择器列表**共用一个声明块。删 `.sb-rcard`/`.sb-pcard`/`.chsc-pick` 时只能删那三行选择器，**不能删声明块**（其余 12 个选择器在用）。

### 4.2 `materials.css`

**无死选择器。** 全部 14 个块的选择器都有消费者：

| 选择器片段 | 消费者 |
|---|---|
| `.modal`、`.modal-hd`、`.modal-x` | `calendar.tsx`、`settings.tsx`、`world-settings.tsx`、`screens.tsx` |
| `.collection-surface`、`.object-hd` | `screens.tsx`、`journal-room-book.tsx` |
| `.pola`、`.tape` | `screens.tsx` |
| `.paper`、`.field`、`.wish`、`.set-group` | 多处 |
| `:root` 的 `--craft-*` | `cinnaglass.css:23/33/81-84` 大量引用 |

### 4.3 `shell/navigation-glass.css`

| 行号 | 选择器 | 判定 | 说明 |
|---|---|---|---|
| **286-288** | `.rooms-tip { display: none }` | **死（成对）** | `rail.tsx:118` 确实渲染了 `<span className="rooms-tip" />`，所以严格说不是"零消费者"，但**这对元素+规则整体是死重**：一个永远 `display:none` 的空 span。建议 CSS 规则与 `rail.tsx:118` 的 JSX **一起删**。 |
| **40-48** | `:is([data-mood='day'], [data-mood='morning']) .rail-wrap` | **当前不生效** | `Mood` 类型只有 `golden \| twilight \| night`（`tweaks.ts`），`data-mood` 永远取不到 `day`/`morning`。第 39 行注释明说是给未来白天房间预留的。**建议保留**，但注释要改成明确的"未生效/预留"措辞（见 §5）。 |
| 其余 | `.rail*`、`.room-*`、`.module*` | **活** | `rail.tsx` 全部使用，含 `data-nav-key`（`rail.tsx:78`）、`data-pressed`（`rail.tsx:79`）两个属性选择器 |

### 4.4 `LoginPage.module.css`

**无死选择器。** 15 个导出类全部有消费者，含两个动态取值：

- `styles[msg.type]` → `.info`（138）/ `.error`（143），由 `LoginPage.tsx:165`、`ResetPasswordPage.tsx:95` 动态索引 —— **这两个类不能按静态 grep 判死**，已人工确认。
- `.eye`、`.submit`、`.switchRow`、`.google`、`.or`、`.form`、`.msg`、`.brand`、`.mark`、`.card`、`.wrap`、`.bg`、`.veil` 全部直接使用。

### 4.5 `index.css`

**无死选择器。** 全部是元素级 reset（`*`、`h1-h6`、`ol/ul/menu`、`img/svg/video/canvas`、`a`、`button/input/select/textarea`、`:root`、`body`），按定义不会"零消费者"。

一个**冗余**（不是死，但重复）：`index.css:6-10` 的 `*,::before,::after{box-sizing:border-box}` 与 `cinnaglass.css:134-137` 的 `*{box-sizing:border-box;...}` 重叠；`index.css:78-81` 的 `body{margin:0}` 与 `cinnaglass.css:138-144` 的 `html,body{margin:0;...}` 重叠。两者都由 `main.tsx:3-4` 按序加载，后者覆盖前者，行为无误，但"全局 reset 归 index.css"这条边界事实上已经破了。**属 B 类**（合并 reset 会影响全局，需目视全站）。

---

## 5. 注释审计

### 5.0 总览

`metrics/structure-summary.json`：全仓 383 个声明，**293 个没有注释**（76%）。本分区的密度两极分化——`lib/`、`pages/ProtectedRoute` 注释充分且准确；`icons.tsx`、`rail-icons.tsx`、`utils/` 几乎为零；`calendar.tsx`、`music.tsx`、`settings.tsx` 的顶层常量与内部函数全裸。

原则（沿用现有风格）：**源码注释保持英文**；一句话职责注释写在声明上方；复杂函数最多 3–4 句，必须说清**条件与副作用**；纯属自明的（56 个图标组件、类型别名）**不加**。

### 5.1 `src/main.tsx` / `src/App.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释 |
|---|---|---|---|---|
| `main.tsx:1-6` | （模块体） | 无注释；`:5` 的 `import './themes/cinnaglass/image-slot.js'` 是纯副作用导入，看不出为什么 | 在 `:5` 上方加：`// side-effect import: registers the <image-slot> custom element used by settings/screens` | — |
| `App.tsx:7` | `App` | 无 | 不加（3 条路由一目了然） | — |

### 5.2 `src/pages/ProtectedRoute.tsx`

**本分区注释质量最高的文件**，`:1-7`、`:17-19`、`:37-39`、`:50`、`:53`、`:63-65` 都准确且说明了"为什么"。

| 位置 | 名称 | 现状 | 建议 |
|---|---|---|---|
| `:21` | `Splash` | 无注释 | `// Full-screen placeholder shown while the session check (and the optional dev auto-login) is still pending.` |
| `:40` | `explicitLogout` | 上方 `:37-39` 有注释，但讲的是"为什么需要这个标记"，没讲函数本身 | 保留 `:37-39`，无需再加 |

**无过时叙述。**

### 5.3 `src/pages/LoginPage.tsx` / `ResetPasswordPage.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释 |
|---|---|---|---|---|
| `LoginPage.tsx:12` | `IMail` | 无 | **不加注释——直接删掉这个本地副本，改用 `icons.tsx:233` 的 `IMail`**（见 §3.1） | — |
| `LoginPage.tsx:18` | `ILock` | 无 | **同上，改用 `icons.tsx:170`** | — |
| `LoginPage.tsx:25` | `GoogleMark` | 无 | `// Google's official four-colour "G" mark — fixed brand colours, not themed.` | — |
| `LoginPage.tsx:46` | `Msg` | 无 | 不加（类型自明） | — |
| `LoginPage.tsx:59` | `handleGoogle` | 无 | `// OAuth redirect: Supabase bounces the browser to Google and back to the site root, where ProtectedRoute picks up the new session.` | — |
| `LoginPage.tsx:69` | `handleForgot` | `:68` 已有一行 | 扩为：`// Forgot password: sends a recovery email whose link lands on /reset-password. Requires the email field to be filled — it is the only input this path uses.` | — |
| `LoginPage.tsx:89` | `handleSubmit` | 无 | `// Sign-up stays on this page (the account may still need email confirmation); sign-in navigates to the world.` | — |
| `ResetPasswordPage.tsx:25` | `handleSubmit` | 无；`:27-34` 的两个校验分支无说明 | `// Validates locally (6+ chars, both fields equal) before calling updateUser — Supabase would accept a short password silently on some projects.` | — |
| `ResetPasswordPage.tsx:1-5` | 文件头 | 准确 | 保留 | — |

**无过时叙述。**

### 5.4 `src/hooks/useAuth.ts` / `src/lib/*` / `src/utils/` / `src/types/`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释 |
|---|---|---|---|---|
| `useAuth.ts:1-3` | 文件头 | 准确，但 `:3` "Restored from the pre-pivot auth stack (1f9b4a8)" 是**一次性迁移记录**，对今天读代码的人无用 | 保留 `:1-2`，删 `:3` | 删：`// token refresh). Restored from the pre-pivot auth stack (1f9b4a8).` 的后半句 |
| `useAuth.ts:13` | `useAuth` | 文件头已覆盖 | 不加 | — |
| `supabase.ts:1-4` | （整文件） | **零注释** | 在 `:3` 上方加：`// Single shared Supabase client. Every data module imports this one instance so auth state and Realtime channels are not duplicated.` | — |
| `profiles.ts:1-3` | 文件头 | 准确 | 保留 | — |
| `profiles.ts:8` | `getProfilesByIds` | `:7` 有一行 | 补一句副作用/容错说明：`// Nulls and duplicates are filtered out; an empty input short-circuits without a request. Throws on a Supabase error — callers decide whether to fall back.` | — |
| `worlds.ts:1-5` | 文件头 | **含失效引用**（`ai/features/channel.md` 不存在） | 改指向 `ai/PROJECT.md` 数据库节（见 §6） | 删：`— terminology in ai/features/channel.md).` |
| `worlds.ts:9` | `WORLD_COLS` | 无 | `// The column set every worlds read/write returns, so callers always get the same shape.` | — |
| `worlds.ts:15/33/49` | `getMyWorld`/`createWorld`/`updateWorld` | 三处注释都准确、都说明了副作用与约束 | 保留 | — |
| `worlds.ts:45` | `WorldPatch` | `:43-44` 有 | 保留 | — |
| `utils/index.ts:3` | `getEnv` | **无注释**（另外两个有） | `// Required env var: throws at module-eval time when missing, so a misconfigured build fails loudly instead of silently talking to nothing.` | — |
| `utils/index.ts:13/19` | `getEnvFlag`/`getEnvOptional` | 准确 | 保留 | — |
| `types/index.ts:1` | `EnvName` | **无注释** | `// Whitelist of env var names the app may read (see .env.example) — keeps getEnv* from resolving typos to undefined.` | — |

### 5.5 `src/pages/WorldPage.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释 |
|---|---|---|---|---|
| `:1-4` | 文件头 | **半过时**：`:2` "Ported from the design prototype's app.jsx" 是迁移记录；`:3` 列举的 "rooms, current room" 已不存在（单房间） | 重写为：`// WorldPage.tsx — root orchestration for the cinnaglass shell: owns every piece of shared world state (world row, profile, events, alarms, widgets, weather, clock) and mounts every surface above the scene.` | 删：`// Ported from the design prototype's app.jsx: live clock, real weather, / tweaks, navigation, and all shared state (profile, rooms, current room, / events, alarms, widgets) + localStorage persistence.` |
| `:7` | `RoomScene` (lazy) | 准确 | 保留 | — |
| `:33-37` | `AUTO_ENTER` | 准确 | 保留 | — |
| `:44` | `REQUIRED` / `ADDON` | 有一行，但**与实际消费者对不上**（见 §5.9） | 改为：`// Widget registry. REQUIRED entries can never be switched off; ADDON entries can. NOTE: only 'anniv' and 'music' are read by the render today — see rail.tsx MODULE_DEFS.` | — |
| `:47` | `loadWidgets` | 无 | `// Merge the persisted widget map over the all-on defaults, so a key added in a later version defaults to on instead of undefined.` | — |
| `:58` | `mapWmo` | 有一行 | 保留 | — |
| `:69` | `MANUAL_WX` | 无 | `// Fixed readings for the manual weather tweak — no network, no geolocation.` | — |
| `:76` | `futureDate` | 无 | `// yyyy-mm-dd N days from today, for the seeded demo events.` | — |
| `:81/85` | `SEED_EVENTS`/`SEED_ALARMS` | 无 | `// First-run demo content; replaced as soon as the user edits and localStorage takes over.` | — |
| `:90` | `MODAL_TABS` | 无 | `// The three surfaces SubScreen owns; every other screen key maps to its own modal.` | — |
| `:91` | `DEV_SURFACE` | 无 | `// ?surface=<tab> opens one SubScreen tab straight from the URL (dev/headless screenshots only — gated on import.meta.env.DEV).` | — |
| `:95-96` | v2 shell 说明 | 准确 | 保留 | — |
| `:112-114` | world state | **含失效引用**（channel.md）；且 `:114` 说 "the in-world scene rooms mock above" —— **上方已没有 rooms mock**（`:44-56` 是 widgets） | 改为：`// World state (DB 'worlds' row — the couple's shared space; schema in ai/PROJECT.md). Not to be confused with the in-scene room, which is local-only.` | 删：`channel.md). NOT the in-world scene rooms mock above (living/bedroom / lighting + navigation, local).` |
| `:131-134` | chat 说明 | 准确，`ai/features/chat.md` **存在** | 保留 | — |
| `:183-185` | icon 签名 | 准确 | 保留 | — |
| `:209` | live clock | 准确 | 保留 | — |
| `:214-215` | Enter 键 | 准确 | 保留 | — |
| `:228-229` | unread pip | 准确 | 保留 | — |
| `:241-242` | bubble | **含两处失效引用**（codex audit M2、ai/UX.md §4） | 见 §6 映射 | 改引用，叙述保留 |
| `:255-275` | 三个持久化 effect | **零注释**（三段完全一样） | 抽成 `usePersistedState` 后自然消失；不抽则在第一个上方加：`// Mirror these slices to localStorage on every change; a blocked storage quota is non-fatal.` | — |
| `:319` | `setWidget` | `:320` 行内有 | 提到声明上方：`// Toggle an addon widget and persist the map. Required widgets are silently ignored.` | — |
| `:331` | `navigate` | 无 | `// Open a surface. SubScreen tabs additionally record where the click came from, so the modal can grow out of that point; other screens ignore origin.` | — |
| `:337-338` | `onRail` | 准确 | 保留 | — |
| `:345-346` | `onHotspot` | **含失效引用**（ai/UX.md §2） | 见 §6 | 改引用 |
| `:353-354` | `retryLobby` | 准确 | 保留 | — |
| `:360` | `enterWorld` | `:362` 行内有 | 补：`// Explicit entry. With no known world we re-fetch instead of failing — the partner may have created one.` | — |
| `:364` | `createAndEnter` | **无注释** | `// Create the world and walk straight in. Errors surface on the lobby card; busy blocks a double-create (the DB also rejects a second world per user).` | — |
| `:379-381` | member names | **含失效编号**（S-4 step 2） | 见 §6 | 改引用 |
| `:403-405` | `liveProfile` | 准确但含 S-4 编号 | 见 §6 | 改引用 |
| `:414-416` | `onWorldSaved` | 准确但含 S-4 编号 | 见 §6 | 改引用 |
| `:422-423` | `leaveRoom` | 准确 | 保留 | — |
| `:432-434` | JSX 注释 | **含失效引用**（ai/UX.md） | 见 §6 | 改引用 |
| `:446-449` | presence 占位 | 准确（TODO R1） | 保留 | — |
| `:470-472` / `:491-493` | 两个空回调 | 准确 | 保留 | — |

### 5.6 `themes/cinnaglass/shell/`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释 |
|---|---|---|---|---|
| `rail.tsx:1-2` | 文件头 | 准确（含批准日期，有价值） | 保留 | — |
| `rail.tsx:12` | `RailKey` | 无；但联合里 **`'rooms'`/`'modules'` 是 popover 开关，其余是动作** —— 这个区别不写出来读不出 | `// Rail actions. 'rooms' and 'modules' toggle a popover in place; every other key is forwarded to onAction.` | — |
| `rail.tsx:21` | `ROOM_DEFS` | 无 | `// The three planned rooms. Only 'study' has a scene today; the others render locked.` | — |
| `rail.tsx:27` | `MODULE_DEFS` | 有一行，但**含失效引用**（ai/UX.md §2），且 **`'presence'` 这个 key 在 WorldPage 里没有消费者** | `// Fixed-layout widget toggles (drag editing retired — see ai/design_system/uiux/uiux.md). NOTE: 'presence' has no consumer in WorldPage yet.` | 替换 `ai/UX.md §2` |
| `rail.tsx:44` | `Rail` | **无组件级注释**（128 行） | `// Left navigation rail. Owns one popover at a time (rooms or modules) and closes it on Escape or an outside pointer-down, both captured at window level so a popover inside a modal still wins.` | — |
| `rail.tsx:66` | `btn` | 无（内部工厂，40 行） | `// One rail button. Pointer-down/up/cancel/leave/blur all clear the pressed flag, because a pointer that leaves the button never fires pointerup on it.` | — |
| `rail.tsx:173-177` | `RoomHandle` JSDoc | **含失效引用**（spec §5.8）；且 `55px visible` 与实际 `width:65px;right:-10px` 是同一件事的两种说法 | 见 §6；改为：`// Right-edge room handle: 65px wide, 10px clipped by the viewport, left corners r24. Real switching arrives with the second room.` | 删 `(spec §5.8)` 改为具体报告路径 |
| `rail.tsx:187` | `RoomHandleStyles` | 无 | `// Scoped styles for RoomHandle; mounted inside the button so they arrive with it.` | — |
| `rail.tsx:118` | `<span className="rooms-tip" />` | 无 | **删除该元素**（配套 CSS 也删，见 §4.3） | — |
| `rail-icons.tsx:1-2` | 文件头 | 准确，说明了为什么不用图片 | 保留 | — |
| `rail-icons.tsx:5/10/18/25/30` | 5 个图标 | 无 | 不加（自明） | — |
| `ambience.tsx:1-4` | 文件头 | **含失效引用**（codex pixel spec §5.3） | 见 §6 | 改引用，叙述保留 |
| `ambience.tsx:19/24` | `MOODS`/`WXS` | 无 | `// Mood row / weather row of the panel, in comp order.` | — |
| `ambience.tsx:30` | `Ambience` | `:31` 有一行 | 补：`// Collapsed by default; the open panel is dismissed by its drop tab or by the full-screen scrim behind it.` | — |
| `ambience.tsx:92` | `AmbienceStyles` | 无 | `// Scoped styles; every colour comes from the --cg-* shell tokens in cinnaglass.css.` | — |
| `floaters.tsx:1-5` | 文件头 | **含失效引用**（§5.4/§5.7）；`no second info line and NO volume rail` 是有价值的负面规格，保留 | 见 §6 | 只改引用 |
| `floaters.tsx:12/63` | 段落分隔注释 | **含失效引用** | 见 §6 | 改引用 |
| `floaters.tsx:21` | `MomentCard` | 无 | `// Anniversary card: days together and days to the next recurrence. Renders nothing when anniv is unparseable.` **并改用 `profile.ts` 的 daysSince/daysUntilAnniversary**（§3.2） | — |
| `floaters.tsx:66` | `MusicMini` | `:75-77` 有，准确 | 保留 | — |
| `floaters.tsx:85-86` | `useMemo` 的 eslint-disable | 准确（解释了为什么依赖 `open`） | 保留 | — |
| `floaters.tsx:120` | `FloaterStyles` | 无；**且被两个组件各挂一次**（`:37`、`:91`） | `// Scoped styles for both floaters. Mounted by each of them, so either can appear alone.` | — |

### 5.7 `themes/cinnaglass/calendar.tsx` / `settings.tsx` / `world-settings.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释 |
|---|---|---|---|---|
| `calendar.tsx:1-2` | 文件头 | 准确；但没说明**为什么两个不相关的屏在一个文件里**（答案：共用 `CalClockStyles`） | 补一句：`// Both screens live here because they share CalClockStyles and the .modal.mini shell.` | — |
| `calendar.tsx:7` | `ANNIV` | 行内注释 `// 在一起：2025.6.4` | **删除该常量**（§3.2）。若本轮不删，注释必须改为：`// DUPLICATE SOURCE — the authoritative anniversary is worlds.anniversary; this constant is not wired to it.` | 删 `// 在一起：2025.6.4` |
| `calendar.tsx:8-10` | `WK`/`pad`/`ymd` | 无 | `WK`: 不加；`pad`/`ymd`: `// Local-calendar date key, 'yyyy-mm-dd' — matches the shape CalEvent.date and worlds.anniversary use.` | — |
| `calendar.tsx:12` | `CalClockStyles` | 无 | `// Styles shared by both screens in this file; each mounts its own copy.` | — |
| `calendar.tsx:102` | `CalendarScreen` | 无（179 行） | `// Calendar modal: month grid, add-a-date row, and the next six upcoming events. Events live in the caller's state and are persisted there, not here.` | — |
| `calendar.tsx:130` | `nextAnniv` | 无 | **删除**（改用 `profile.ts:35 daysUntilAnniversary`） | — |
| `calendar.tsx:140/155/161/164` | `move`/`addEvent`/`delEvent`/`cntdown` | 无 | `move`: `// Step one month, rolling the year.`；其余不加（自明） | — |
| `calendar.tsx:283` | `ClockScreen` | 无（100 行） | `// Clock and alarm modal. nowTs is ticked by the caller so this stays a pure render; alarms are display-only today — nothing fires them yet.` | — |
| `settings.tsx:1-2` | 文件头 | 准确 | 保留 | — |
| `settings.tsx:10` | `SettingsStyles` | 无 | `// Scoped styles for the settings rows, inline edits and segmented controls.` | — |
| `settings.tsx:82-96` | `SegOpt`/三个 OPTS | 无 | 三个 OPTS 上方一句：`// Option sets for the three segmented controls in 主题外观.` | — |
| `settings.tsx:98` | `Segmented` | 无 | `// Segmented control: one option is always on; the caller owns the value.` | — |
| `settings.tsx:115` | `PersonRow` | 无 | `// One person row: avatar slot plus an inline-editable nickname. Names are still local-only (the DB write-back is not wired here).` | — |
| `settings.tsx:144` | `SettingsScreen` | 无（224 行） | `// Personal settings modal. Profile and theme edits apply immediately to local state; only sign-out touches the backend.` | — |
| `settings.tsx:165-174` | `pwValid`/`savePw` | 无 —— **危险的沉默**：`savePw` 显示"已更新"但**根本没有调用 Supabase** | `// UI-only placeholder: shows the success state without calling Supabase. Wiring updateUser here is still open — do not read the check mark as a real password change.` | — |
| `settings.tsx:176-178` | logout | 准确 | 保留 | — |
| `settings.tsx:211-213` | 个人资料段 JSX 注释 | **含失效引用**（world.md W-3） | 见 §6 | 改引用 |
| `world-settings.tsx:1-7` | 文件头 | `:4` 含失效编号（S-4 step 3）；**`:6` 明确过时**——"Entry: clicking the sidebar world-panel header" 里的 sidebar 已退役，现在这个弹窗**在 UI 上没有任何入口**（`WorldPage.tsx:519` 只在 `screen === 'world-settings'` 时显示，而 `onRail`/`onHotspot` 都不会产生这个 key） | 改 `:4` 引用；`:6` 改为：`// NOTE: no UI entry point today — the sidebar header that opened this retired with the v2 shell. Reachable only by setting screen='world-settings'.` | 删：`// Entry: clicking the sidebar world-panel header (icon + name strip).` |
| `world-settings.tsx:14` | `WorldSettingsStyles` | 无 | `// Scoped styles; mirrors the personal settings' field feel.` | — |
| `world-settings.tsx:72` | `ICON_EMOJIS` | 有一行，准确 | 保留 | — |
| `world-settings.tsx:79/86` | `Draft`/`draftOf` | 字段有行内注释 | `draftOf` 上方补：`// Snapshot the row into an editable draft; '' stands for "unset" in every field.` | — |
| `world-settings.tsx:93` | `WorldSettingsScreen` | 无（206 行） | `// World settings modal. Writes name/anniversary/icon straight to the worlds row, so both members see the change; the caller syncs its localStorage fallback via onSaved.`（与文件头合并，避免重复） | — |
| `world-settings.tsx:114` | 重置 draft 的 render-time state | `:114` 有一行，准确（解释了为什么不用 effect） | 保留 | — |
| `world-settings.tsx:129/139/148` | `pickFile`/`pickEmoji`/`removeImage` | `:140` 有一行 | `pickFile` 上方补：`// Object URLs are revoked as they are replaced, so an open modal never leaks more than one.` | — |
| `world-settings.tsx:160` | `save` | 无 | `// Upload first (if a file is pending), then patch the row. A failed upload aborts before any DB write, so the row never points at a missing object.` | — |

### 5.8 `themes/cinnaglass/music.tsx` / `lobby.tsx` / `icons.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释 |
|---|---|---|---|---|
| `music.tsx:1-3` | 文件头 | 准确；但 "One taps play, everyone in the current room hears it" **描述的是未设计完的功能**——实际没有任何共享播放链路 | 改为：`// music.tsx — the "listen together" widget. Sound is a generative WebAudio pad (no audio files). Shared playback is NOT implemented: each client plays locally. State persists to ow-music-v1.` | 删：`One taps play, everyone in / the current room "hears" it.` |
| `music.tsx:7/9` | `Track`/`TRACKS` | 无；`TRACKS` 是**触发 `react-refresh/only-export-components` 的那个导出**（见 §7.2） | `// Built-in "tracks": each is a chord recipe for the WebAudio pad, not an audio file.` | — |
| `music.tsx:15/22` | `muLoad`/`fmt` | 无 | `muLoad`: `// Read the persisted {i, pos, muted}; a blocked or corrupt store degrades to defaults.`；`fmt`: 不加 | — |
| `music.tsx:27` | `AudioPad` | 无 | `// The live WebAudio graph: four detuned voices → master gain → lowpass → output.` | — |
| `music.tsx:35` | `MusicStyles` | 无 | `// Scoped styles for the expanded player.` | — |
| `music.tsx:78` | `MusicPlayer` | 无（199 行） | `// Generative player. The audio graph is built lazily on the first play so no AudioContext is created without a user gesture, and it is closed on unmount.` | — |
| `music.tsx:109` | `ensure` | `:108` 有一行分隔符 | `// Build the audio graph once and cache it on the ref. Returns null where WebAudio is unavailable — every caller must tolerate that.` | — |
| `music.tsx:143/150` | `applyChord`/`ramp` | 无 | `applyChord`: `// Retune the four voices to the current track's chord; voice 0 drops an octave for the bass.`；`ramp`: `// Fade the master gain in/out instead of hard-starting — a hard start clicks.` | — |
| `music.tsx:178/193/197/205/210` | `toggle`/`next`/`prev`/`seek`/`stop` | 无 | `prev`: `// Standard transport behaviour: restart the track if we are past 3s, otherwise step back one.`；`stop`: `// Wrap a handler so a control click never reaches the card behind it.`；其余不加 | — |
| `lobby.tsx:1-5` | 文件头 | **三处过时**：(a) `DB 'rooms' row` —— 表叫 `worlds`；(b) `see channel.md` —— 文件不存在；(c) `swapped for an R3F top-down island later` —— R3F 线已废弃（`@react-three/*` 在 src 中零引用） | 改为：`// lobby.tsx — the pre-world lobby: a floating island with a glowing portal, shown before entering the world (DB 'worlds' row; schema in ai/PROJECT.md). Static 2D art. Not related to the in-world room scene.` | **删全部 5 行**，特别是 `DB 'rooms' row — see channel.md for terminology` 与 `swapped for an R3F top-down island later` |
| `lobby.tsx:7` | `LobbyStatus` | 无 | 不加（三值自明） | — |
| `lobby.tsx:9-16` | `LobbySceneProps` | **每个字段都有行内注释，质量很好** | 保留 | — |
| `lobby.tsx:18` | `P` | 无（单字母命名 + 无注释） | `// Island palette, kept in one place so the art stays tonally consistent with the room diorama.` | — |
| `lobby.tsx:30-31` | `IslandArt` | 准确 | 保留 | — |
| `lobby.tsx:124` | `LobbyScene` | **无注释** | `// Lobby: the island art plus a status card whose four states are loading / fetch-error / has-world / no-world.` | — |
| `icons.tsx:1` | 文件头 | 准确但太短，没有说明**这是唯一的通用图标来源** | 扩为：`// icons.tsx — the project's only general-purpose icon set. Stroke inherits currentColor; size and stroke-width are props. Navigation-only silhouettes live in shell/rail-icons.tsx; components must not define icons inline.` | — |
| `icons.tsx:4` | `IcoProps` | 无 | `// Any <svg> prop, plus size (both dimensions), sw (stroke-width) and an optional single-path shorthand d.` | — |
| `icons.tsx:12` | `Ico` | 无 | `// Base icon: a 24-grid svg with round caps/joins. Pass d for a one-path icon, or children for a composite.` | — |
| `icons.tsx:28-327` | 56 个图标 | 无 | **不加**（名字即内容）。但应在文件末尾或头部标注当前有 **15 个零消费者导出**：`INote, IMapPin, IThermo, IChat, IShrink, ISmile, IGrid, IWand, IBell, IDate, IMove, IUsers, IPencil, IMic, IMicOff` | — |

### 5.9 CSS 文件的段落注释

| 文件:行 | 段落注释 | 判定 | 处置 |
|---|---|---|---|
| `cinnaglass.css:3-4` | `/* ow.css — ... Ported verbatim from the design prototype's 'Our World.html' <style> block. */` | **过时**：文件不叫 ow.css；"ported verbatim" 早已不成立（下面全是后续的 mood/材质重写） | 改为：`/* cinnaglass.css — global design tokens plus the scene / mood / weather layers. Component-scoped styles live with their components; only cross-surface tokens and primitives belong here. */` |
| `cinnaglass.css:18-22` | concept-c shell tokens（引 `codex pixel spec 20260811-055917Z`） | 引用**有效**（目录存在），但写法是编号不是路径 | 补全路径（见 §6） |
| `cinnaglass.css:45-64` | 光照递进 scheme | **准确且高价值**（解释了 SHELL/PAPER 两个色域的存在理由） | 保留原样 |
| `cinnaglass.css:57-59` | `SHELL = .glass surfaces: sidebar, modals, HUD, dock` | **过时**：sidebar 与 HUD 已退役；dock 现在叫 chat card | 改为：`SHELL = .glass surfaces: modals, the rail and the floating cards` |
| `cinnaglass.css:108-111` | `--app-ground`：`The sidebar is IN-FLOW, so what sits behind its glass is the app ground` | **过时前提**（没有 in-flow sidebar 了），但**结论仍然成立**（`.app` 确实需要一个渐变底） | 改为：`/* The ground the floating chrome composites against. It must stay a gradient: a flat fill gives backdrop-filter nothing to work with (codex audit 2026-08-08, High #3). */` |
| `cinnaglass.css:165` | `/* stage: ... the in-flow sidebar squeezes it */` | **过时**：没有 sidebar 了，`.stage` 现在是绝对定位全屏 | 改为：`/* stage: everything scene-related lives here; the chrome floats above it. */` |
| `cinnaglass.css:173-181` | v1 scene switches 说明 | **是一段"已删除功能的墓志铭"**：整段 9 行注释后面**没有任何 CSS**。前 5 行描述的是已经不存在的规则 | 压缩成 2 行：`/* v1 scene switches (chrome dim strip + museum vignette) were retired with the concept-c shell (2026-08-11): the pixi light pass owns all scene grading now. */`，删掉 173-177 对已删规则的描述 |
| `cinnaglass.css:291-293` | `.paper token remap` 段落头 | 准确 | 保留；但列表里的三个死选择器要删（§4.1） |
| `cinnaglass.css:327-330` | `.sb-user .u-st` 的 4 行说明 | **整块死** | 随规则一起删 |
| `cinnaglass.css:363-365` | SHARED UI PRIMITIVES（中文） | 准确 | 保留 |
| `cinnaglass.css:474-476` | MODAL SHELL（中文），提到"空间切换器" | **过时**：空间切换器已不存在 | 改为：`被 SubScreen / 日历 / 时钟 / 设置 / 世界设置 共用。` |
| `cinnaglass.css:525-528` | `.modal.tall` 的说明 | **随规则一起死** | 删 |
| `cinnaglass.css:900-902` | LOBBY 段落头，`replaced by an R3F island later` | **过时**（R3F 线已废弃） | 删掉最后半句，改为 `Static 2D art.` |
| `materials.css:1-2` | 文件头 | 准确 | 保留 |
| `materials.css:23` | `/* current icon preview — the same three-way fallback the sidebar renders */`（注：此注释实际在 `world-settings.tsx:23`） | 见下 | — |
| `world-settings.tsx:23`（CSS 段注释） | `the same three-way fallback the sidebar renders` | **过时**（无 sidebar） | 改为 `the same three-way fallback the world icon uses everywhere` |
| `navigation-glass.css:1` | `/* Scope the new material to navigation. Existing modals/HUD keep their values. */` | **半过时**："new material" 已不新；"HUD" 已退役 | 改为：`/* Navigation-scoped material. Modals keep the cinnaglass.css --glass-* tokens; nothing here leaks out of .rail-wrap. */` |
| `navigation-glass.css:39` | `/* Future daytime rooms can inherit this without adopting a green surface. */` | 准确但没说"当前不生效" | 改为：`/* Reserved for future daytime rooms — [data-mood] never takes these values today (Mood is golden|twilight|night). */` |
| `navigation-glass.css:84` | `/* Generated neutral glass microtexture: no baked-in room, color or icon. */` | 准确 | 保留 |
| `index.css:1-4` | 文件头 | 准确 | 保留 |
| `LoginPage.module.css:1-3` | 文件头 | 准确 | 保留 |
| `LoginPage.module.css:149/166` | 两条行内段注释 | 准确 | 保留 |

---

## 6. 失效引用的应改目标

下表是**本分区内**每一处引用的逐条映射（分区外的两条 `scene.tsx:3`、`rooms.ts:1` 一并列出，供负责那个分区的人对齐）。

| 文件:行 | 现引用 | 应改为 | 说明 |
|---|---|---|---|
| `lib/worlds.ts:2` | `ai/features/channel.md` | `ai/PROJECT.md` 数据库节 | 文件不存在 |
| `types/chat.ts:3`（分区外） | `ai/features/channel.md` | `ai/PROJECT.md` 数据库节 | 同上 |
| `WorldPage.tsx:113` | `channel.md` | `ai/PROJECT.md` 数据库节 | 同上 |
| `lobby.tsx:3` | `channel.md`，且表名写成 `rooms` | `ai/PROJECT.md` 数据库节，表名改 `worlds` | 双重错误 |
| `rooms.ts:2`（分区外） | `Terminology (channel.md)` + `sidebar, space switcher` | `ai/PROJECT.md` 数据库节；并删除 sidebar/space switcher 措辞 | 双重过时 |
| `settings.tsx:213` | `world-settings.tsx / world.md W-3` | `world-settings.tsx`；编号部分改 `ai/features/supabase.md` | `world.md` 不存在 |
| `world-settings.tsx:4` | `S-4 step 3` | `ai/features/supabase.md` | 编号无索引 |
| `WorldPage.tsx:379` | `S-4 step 2` | `ai/features/supabase.md` | 同上 |
| `WorldPage.tsx:405` | `S-4 step 3` | `ai/features/supabase.md` | 同上 |
| `WorldPage.tsx:416` | `S-4 step 3` | `ai/features/supabase.md` | 同上 |
| `WorldPage.tsx:242` | `codex audit M2 / ai/UX.md §4` | `ai/codex-visual/20260811-044310Z/codex-report.md` + `ai/design_system/uiux/interaction.md` | 两条都要换 |
| `WorldPage.tsx:345` | `ai/UX.md §2` | `ai/design_system/props.md` 与 `ai/design_system/uiux/uiux.md` | — |
| `WorldPage.tsx:434` | `ai/UX.md` | `ai/design_system/uiux/uiux.md` | — |
| `rail.tsx:27` | `ai/UX.md §2` | `ai/design_system/props.md` 与 `ai/design_system/uiux/uiux.md` | — |
| `rail.tsx:174` | `spec §5.8` | `ai/codex-visual/20260811-055917Z/codex-report.md` | — |
| `ambience.tsx:2` | `codex pixel spec (§5.3)` | `ai/codex-visual/20260811-055917Z/codex-report.md` | — |
| `floaters.tsx:2-3` | `codex pixel spec ... (§5.4 / §5.7)` | 同上 | — |
| `floaters.tsx:12` | `spec §5.4` | 同上 | — |
| `floaters.tsx:63` | `spec §5.7` | 同上 | — |
| `floaters.tsx:122` | `spec §5.4` | 同上 | — |
| `floaters.tsx:150` | `spec §5.7` | 同上 | — |
| `floaters.tsx:173` | `spec:` | 同上 | — |
| `ambience.tsx:80` | `spec: center drop tab` | 同上 | — |
| `ambience.tsx:110` | `spec 5.3` | 同上 | — |
| `ambience.tsx:128` | `spec: no plate on options` | 同上 | — |
| `cinnaglass.css:4` | `Our World.html` | 删除该句（原型文件已不在仓内可定位路径上） | 见 §5.9 |
| `cinnaglass.css:18` | `codex pixel spec 20260811-055917Z` | 补全为 `ai/codex-visual/20260811-055917Z/codex-report.md` | 目录存在，只是写法不是路径 |
| `cinnaglass.css:46` | 已是完整路径 | 保留 | 这是本仓引用写法的**正面样板** |
| `cinnaglass.css:111 / 212 / 517` | `codex audit 2026-08-08, High #3` / `codex audit, High #1` / `codex audit, Med #2` | `ai/codex-visual/20260811-044310Z/codex-report.md`（保留 High/Med 编号作为条目定位） | — |
| `scene.tsx:3`（分区外） | `ow.css` | `themes/cinnaglass/cinnaglass.css` | 文件改过名 |
| `room-types.ts:124/136`（分区外） | `ai/STYLE.md §6`、`ai/UX.md §2/§5` | `ai/design_system/character.md`；`ai/design_system/props.md` | — |
| `study-room.ts:52`（分区外） | `ai/UX.md §2` | `ai/design_system/props.md` | — |
| `room-scene.tsx:160/201`、`chat-card.tsx:2`、`pixi-scene.ts:81/1151`（分区外） | `codex spec §5.x` / `codex audit M3` | `ai/codex-visual/20260811-055917Z/codex-report.md`；`.../20260811-044310Z/codex-report.md` | — |

**另需记录**：`ai/UX.md` 和 `ai/STYLE.md` **仍然存在**，且各自在文件里维护了一张「旧章节 → 新文档」对照表（`ai/UX.md` 最后一段、`ai/STYLE.md` 最后一段），明说"源码注释里的 `ai/UX.md §N` 按此表回溯"。所以现有引用**不是断链，只是多一跳**。改与不改都能读通——改的收益是少一跳，代价是一次性触碰 12 个文件。**建议改**，因为这两个入口文件本身写着"只兼容旧链接"，等于承认它们是过渡态。

另有一条 `ux-decisions` 的定位：若源码或文档中再出现该名字，正确路径是 `ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md`（已核实存在）。本分区源码中**未发现**对它的引用。

---

## 7. 配置

### 7.1 `@react-three/rapier` 依赖 + `optimizeDeps` 块

**证据**：
- `package.json:15` `"@react-three/rapier": "^2.2.0"`（在 `dependencies` 里，不是 dev）
- `vite.config.ts:12-18` `optimizeDeps.include: ['@react-three/rapier']`，注释整段在讲 **drei**（`@react-three/drei`），而 drei **根本不在 package.json 里**
- `grep -rn "react-three\|rapier" src` → **零命中**（唯一的 `three` 命中是英文单词 "three features"、"three moods" 等）
- `metrics/structure-summary.json` 的 `externals` 列表里**没有** `@react-three/rapier`，确认无任何模块 import 它

**结论**：依赖与配置块都是 R3F 路线废弃后的残留。注释描述的对象（drei）甚至已经不在依赖树里，所以那段注释现在解释的是一个不存在的问题。

**移除步骤与验证**：
1. 删 `package.json:15` 那一行；
2. 删 `vite.config.ts:12-18` 整个 `optimizeDeps` 段（留空对象反而更费解）；
3. `pnpm install`（锁文件会同步收缩，`pnpm-lock.yaml` 变更需一起提交）；
4. `rm -rf node_modules/.vite`（清掉旧的预打包缓存，否则 dev 可能仍命中旧 chunk）；
5. **验证**：`pnpm build` 通过 → `pnpm dev` 冷启动无 504、无 "Failed to resolve import" → 浏览器进世界一次，pixi 场景正常渲染（rapier 与 pixi 无关，但冷启动预打包路径被动过，值得看一眼）。
6. **回滚**：单独一个 commit，`git revert` 即可。

**风险：低。** 唯一的不确定性是 `pnpm-lock.yaml` 的大幅变更会让下一次 diff 变吵。

### 7.2 `music.tsx` 的 `react-refresh/only-export-components`

**这个导出是什么**：`music.tsx:9` `export const TRACKS: Track[]` —— 4 首曲目的配方表（标题/艺人/根音/和弦/时长/封面渐变）。唯一外部消费者是 `shell/floaters.tsx:9`，用在 `MusicMini` 里读当前曲目标题（`floaters.tsx:81`）。

**为什么会报**：`reactRefresh.configs.vite`（`eslint.config.js:16`）要求一个模块**要么只导出组件，要么只导出非组件**。`music.tsx` 同时导出 `MusicPlayer`（组件）和 `TRACKS`（数据），HMR 无法判断改动该热替换还是整页刷新。

**两种修法对比**：

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A. 拆文件（推荐）** | 新建 `themes/cinnaglass/music-tracks.ts`，搬走 `Track` 类型 + `TRACKS`；`music.tsx` 与 `floaters.tsx` 各自从新文件导入 | 根治；与仓内既有先例完全一致——`profile.ts:1-2` 的文件头就写着「kept out of settings.tsx so that component file only exports components, per react-refresh」，**这条规矩项目已经立过了** | 多一个文件（但 `themes/cinnaglass/` 已有 `model.ts`/`chat-data.ts`/`emoji-data.ts` 这类纯数据文件，放得下） |
| B. `allowConstantExport` | 在 `eslint.config.js` 的 `reactRefresh` 配置里开 `allowConstantExport: true` | 一行改动 | 只对 `const` 生效且是全局放宽；等于**推翻 `profile.ts` 当初的决定**，让这条规矩在同一个仓里前后不一 |

**选 A。** 验证：`pnpm lint` warning 从 3 条降到 2 条；`pnpm build` 通过；`pnpm dev` 下改一次 `MusicPlayer` 的 JSX，确认是热替换而不是整页刷新。

### 7.3 `tsconfig.node.json` 只 include `vite.config.ts`

**现状**：`tsconfig.node.json:29` `"include": ["vite.config.ts"]`。于是 `eslint.config.js` 和 `scripts/*.mjs` **不在任何 tsconfig project 里**，`tsc -b` 完全看不见它们。

**评估：本轮不处理，理由如下。**

1. **`eslint.config.js` 是 `.js`**，要让它进类型检查得开 `allowJs` + `checkJs`，那会连带把 `src/themes/cinnaglass/image-slot.js`（536 行，无类型标注）也拖进来——那是个大坑，绝不值得顺手开。
2. **`scripts/*.mjs` 同理**，而且它们的依赖（`playwright`、`sharp`）不在 `package.json` 里（§7.4），没有类型定义可查，`checkJs` 只会产出一堆 `Cannot find module`。
3. **收益极低**：这些文件不参与产物构建，出错在运行时立刻暴露（脚本是手动跑的）。
4. **但有一个值得做的小改**：`tsconfig.node.json` 的名字暗示"所有 Node 侧文件"，实际只管一个文件。**建议在 `tsconfig.node.json` 顶部加一行注释**（JSON 支持 `//`，该文件已在用 `/* Bundler mode */` 风格）说明：`// Only vite.config.ts is typed here. eslint.config.js and scripts/*.mjs are deliberately left out — they are plain JS with untyped, optional dependencies.` 这样下一个人不会以为是漏配。

**若将来要处理**（B 类）：正确做法是给 `scripts/` 单独一个 `tsconfig.scripts.json`，配 `allowJs: true, checkJs: false, types: ["node"]`，只做模块解析不做类型检查；并把 `playwright`/`sharp` 加进 `optionalDependencies`。

### 7.4 scripts 的依赖与端口

**依赖缺口**：`playwright`、`sharp`、`pngjs` 被 6 个脚本 require，但**都不在 `package.json` 的任何依赖段里**。机制是 `DIARY_NODE_MODULES` 环境变量指向 Codex 自带的 node_modules。

- **有兜底**（未设变量时回退到本项目 node_modules）：`check-diary.mjs:9`、`check-journal-art.mjs:8`、`check-navigation.mjs:8`、`pack-navigation-texture.mjs:6`、`pack-journal-art.mjs:8`
- **无兜底**（未设变量直接崩在 `path.join(undefined, ...)`）：`check-journal-turn.mjs:7-8`、`compare-journal-art.mjs:7`、`render-journal-turn.mjs:6`

**建议（随 §3.4 的 `scripts/lib/deps.mjs` 一起）**：统一走带兜底的 `dependency()`，并在 `scripts/lib/deps.mjs` 的文件头说明这三个包为什么不在 `package.json`（避免下一个人"顺手补上"而让 `pnpm install` 多下载 300MB 的 Playwright 浏览器）。**不建议**把它们加进 `dependencies`。

**端口不一致**：

| 脚本 | 端口 | 可否覆盖 |
|---|---|---|
| `check-diary.mjs:36` | `5173` | **硬编码，不可覆盖** |
| `check-journal-art.mjs:21` | `5175` | `JOURNAL_URL` |
| `check-navigation.mjs:23/178/225` | `5175` | `JOURNAL_URL` |
| `check-journal-turn.mjs:13` | `5175` | `JOURNAL_URL` |
| `render-journal-turn.mjs:16` | `5175` | **硬编码** |
| `package.json:7` `dev` | `5173`（Vite 默认） | — |
| `package.json:8` `dev2` | `5174 --strictPort` | — |

**没有任何一个 npm script 会起 5175。** 所以 4 个脚本的默认端口指向一个不存在的服务，必须每次手动设 `JOURNAL_URL`，而 `render-journal-turn.mjs` 连这个口子都没有。

**建议（A 类）**：
- 把 4 个 `5175` 默认值改成 `5173`（与 `pnpm dev` 对齐），保留 `JOURNAL_URL` 覆盖；
- `check-diary.mjs:36` 与 `render-journal-turn.mjs:16` 加上同样的 `process.env.JOURNAL_URL ||` 前缀，让它们和其余脚本行为一致；
- 端口常量本身也应进 `scripts/lib/deps.mjs` 旁边的一个 `scripts/lib/target.mjs`，或就近放在 `deps.mjs` 里导出 `export const appUrl = process.env.JOURNAL_URL || 'http://localhost:5173'`。

**验证**：`pnpm dev` 起在 5173 → 依次 `node scripts/check-navigation.mjs`、`node scripts/check-diary.mjs`，两者应跑到断言阶段而不是超时。

### 7.5 Prettier：`.prettierignore` 建议

**现状**：`.prettierrc` 存在（`printWidth 120 / tabWidth 4 / singleQuote / trailingComma none`），**没有 `.prettierignore`**。`prettier --check .` 报 **192 个文件**，实测按目录分布：

| 目录/文件 | 数量 | 是什么 |
|---|---|---|
| `ai/design_system/` | 52 | 常驻设计文档 + 历史 HTML |
| `ai/project-audit/` | 34 | **本次审核自己的证据与 metrics** |
| `src/themes/` | 21 | 真实源码 |
| `.agents/skills/` | 17 | 技能定义（受保护） |
| `.claude/skills/` | 15 | 技能定义（受保护，CLAUDE.md 明令必须经 skill-creator 才能碰） |
| `ai/codex-visual/` | 14 | Codex 原始报告 |
| `arts/rooms|ui|characters` | 11 | 素材目录里的 json/md |
| `ai/reboot/` | 5 | 冻结原件 |
| `ai/features/` | 5 | 功能文档 |
| `src/pages|types|lib|hooks|App.tsx` | 8 | 真实源码 |
| `scripts/check-journal-turn.mjs` | 1 | 脚本 |
| `pnpm-lock.yaml` | 1 | 锁文件 |
| `ai/sessions/` | 1 | 会话存档 |
| `CLAUDE.md` / `AGENTS.md` / `README.md` / `ai/PROJECT.md` | 4 | 协议与项目文档 |
| `.claude/launch.json` / `.agent-toolkit.json` | 2 | 工具配置 |

**也就是说：192 个里只有 30 个是源码。** 直接跑 `pnpm format` 会一次性重排 162 个与代码无关的文件，把协议文件、冻结原件和审核证据全部搅动。

**建议的 `.prettierignore` 及每条理由**：

```
# 依赖与产物 —— 不是我们写的
node_modules/
dist/
pnpm-lock.yaml          # 由包管理器生成，重排会制造无意义的巨型 diff

# 受保护的协议文件 —— 改动需人工审阅，不接受工具批量重排
CLAUDE.md
AGENTS.md
.claude/
.agents/                # CLAUDE.md 明令：.claude/skills 下的读写必须走 skill-creator

# 冻结 / 原件 —— 价值在于"和当初一模一样"
ai/reboot/
ai/codex-visual/        # Codex 产出的原始报告，是外部产物的存档，不是我们维护的文档
ai/design_system/uiux/research/cinnaglass-history/   # 历史 HTML/md，重排会破坏与截图的对照关系

# 审核证据 —— 每次 run 的快照，重排会让"这份证据当时长什么样"失真
ai/project-audit/runs/

# 会话存档 —— intj 管理，格式由它决定
ai/sessions/

# 二进制与素材附随文件
public/arts/
arts/
*.diff                  # documents.diff 一类的补丁文件，重排即损坏
```

**这样收敛后 `prettier --check .` 的范围**：`src/`、`scripts/`、根配置、`ai/PROJECT.md`、`ai/TODO.md`、`ai/features/`、`ai/design_system/` 的活文档、`README.md` —— 大约 45 个文件，其中 30 个本来就需要格式化。**这是一个人能在一次 commit 里 review 完的量。**

**验证**：`npx prettier --check .` 的报数应从 192 降到约 45；`pnpm format` 后 `git diff --stat` 不应出现 `.claude/`、`.agents/`、`ai/reboot/`、`ai/project-audit/runs/`、`pnpm-lock.yaml` 中的任何文件。

**一个提醒**：`ai/project-audit/runs/` 被忽略后，**本文件自身也不会被 prettier 检查** —— 这是有意的（证据文件的价值在于原样保存）。

---

## 8. 依赖方向

### 8.1 层次是否清楚

`metrics/structure-edges.json` + `structure-summary.json`：**`cycles: []`、`orphans: []`、`unresolvedImports: []`**。方向图是一棵干净的 DAG：

```
main.tsx
  └─ App.tsx
       └─ pages/*  ──────┬──→ themes/cinnaglass/*  ──→ lib/*  ──→ utils → types
                         ├──→ lib/*                      ↑
                         ├──→ hooks/*  ──→ lib/supabase ─┘
                         └──→ types/*
```

**层次清楚，无违规。** 具体核对：

| 检查项 | 结果 |
|---|---|
| `lib/` 是否反向依赖 UI（themes/pages/组件） | **否**。`lib/supabase.ts`→`@/utils`；`lib/profiles.ts`→`lib/supabase` + `types/feed`；`lib/worlds.ts`→同。三个文件都不 import 任何 `.tsx`、不 import `themes/`、不 import `react`。 |
| `lib/` 是否依赖 `themes/` | **否**（全仓 `grep "from '@/themes" src/lib` 为空） |
| `hooks/` 是否依赖 UI | **否**。`useAuth.ts` 只 import `react` + `@supabase/supabase-js` 类型 + `lib/supabase`。 |
| `utils/` 是否依赖上层 | **否**。只 import `@/types`。 |
| `types/` 是否依赖任何东西 | `types/index.ts` **零依赖**（叶子）。 |
| `pages/` 是否被 `themes/` 反向依赖 | **否**（`grep "from '@/pages" src/themes` 为空） |
| `themes/` 是否依赖 `lib/` | **是，且方向正确**：`world-settings.tsx:9-10` → `lib/worlds`、`lib/storage`；`settings.tsx:4` → `lib/supabase`。这是 UI 调数据层，符合层次。 |

**唯一值得注意的形状问题**（不是违规，是耦合度）：`WorldPage.tsx` 扇出 22，其中 **13 条指向 `themes/cinnaglass/`**。也就是说 `pages/` 这一层几乎只有一个成员，而它把整个主题层的公开面全部摊在自己的 import 列表里。§2 的拆分会把这个数字降到约 12，但根因是"只有一个页面"——这是应用形态决定的，不是设计缺陷。

### 8.2 类型放置

| 类型 | 现位置 | 判定 |
|---|---|---|
| `EnvName` | `types/index.ts` | **正确**（跨层共享，`utils` 与 `pages` 都用） |
| `World`、`FeedProfile` | `types/feed.ts` | **正确**（DB 行形状，`lib/` 与 `pages/` 共用，fan-in 10） |
| `WorldPatch` | `lib/worlds.ts:45` | **正确**（是 `updateWorld` 的参数契约，与函数同生共死，不该上移到 `types/`） |
| `AuthState` | `hooks/useAuth.ts:8` | **正确**（未导出，hook 内部形状） |
| `Profile`、`Weather`、`CalEvent`、`Alarm`、`Widgets` | `themes/cinnaglass/model.ts` | **正确**（主题运行时无关类型，`WorldPage` 与多个主题组件共用） |
| `Mood`、`WeatherTweak`、`ChatAlign`、`GlassStyle`、`SetTweak`、`Tweaks` | `themes/cinnaglass/tweaks.ts` | **正确**（与 tweaks hook 同居） |
| `RailKey`、`RoomDef`、`RailProps` | `rail.tsx:12-42` | **正确**（`RailKey` 被 `WorldPage:17` 导入，其余私有） |
| `LobbyStatus`、`LobbySceneProps` | `lobby.tsx:7-16` | **正确**（`LobbyStatus` 被导出消费） |
| `IcoProps` | `icons.tsx:4` | **正确**（跨多个图标文件） |
| `Msg` | `LoginPage.tsx:46` **和** `ResetPasswordPage.tsx:14` | **重复定义**：两个文件逐字相同的 `type Msg = { type: 'info' \| 'error'; text: string } \| null`。两页共用 `LoginPage.module.css`，类型也该共用。**建议**从 `LoginPage.tsx` 导出，`ResetPasswordPage` 导入（不值得为一个类型新建文件）。属 A 类。 |
| `Track`、`AudioPad` | `music.tsx:7/27` | `Track` 应随 `TRACKS` 一起搬到 `music-tracks.ts`（§7.2 方案 A）；`AudioPad` 留在 `music.tsx`（私有） |
| `Draft` | `world-settings.tsx:79` | **正确**（私有） |
| `SegOpt` | `settings.tsx:82` | **正确**（私有） |

**一个缺失**：`Weather.kind` 是 `string`（`model.ts:4`），而实际只有 `'sun' | 'cloud' | 'rain' | 'snow'` 四个值（`WorldPage.tsx:59-74`、`calendar.tsx:307` 的 `WIcon` 三元、`room-scene` 的 `weatherKind`）。收窄成联合类型能让 `calendar.tsx:307` 那串三元获得穷尽性检查。属 **B 类**（改公开类型，会波及 room 分区）。

### 8.3 import 路径写法不统一

| 写法 | 数量 | 例 |
|---|---|---|
| `@/` 别名 **带** `.ts`/`.tsx` 扩展名 | 55 | `WorldPage.tsx:27` `from '@/lib/worlds.ts'` |
| `@/` 别名 **不带** 扩展名 | 14 | `WorldPage.tsx:11` `from '@/themes/cinnaglass/lobby'` |
| 相对路径 | 49 | `rail.tsx:7` `from '../icons'` |

**同一个文件里都混着**：`WorldPage.tsx:11-31` —— `:11-26` 全部不带扩展名（themes 系），`:27-30` 全部带（lib/types 系）。`tsconfig.app.json:13` 开了 `allowImportingTsExtensions`，两种都能编译，所以这纯粹是风格漂移。

**观察到的隐含规律**：`themes/` 内部与 `themes/` 之间用不带扩展名；`lib/`、`types/`、`hooks/`、`pages/` 之间用带扩展名。这个规律**没有写在任何地方**，也没有 `codeStyle.md`（项目根目录不存在）。

**建议**：本轮**不统一**（69 处改动，纯噪音，且会和 §2 的拆分抢 diff），但**应在 `ai/PROJECT.md` 里记一句现行约定**，让它从"漂移"变成"规矩"。属 B 类。

---

## 9. 建议执行清单

### A 类 —— 本轮可直接做（不改行为，不改接口）

| # | 项目 | 涉及文件:行 | 风险 | 验证方法 |
|---|---|---|---|---|
| A1 | 新建 `.prettierignore`（§7.5 清单） | 新文件 | 极低。唯一风险是漏忽略某个该忽略的目录 | `npx prettier --check .` 报数 192 → ~45；`pnpm format` 后 `git diff --stat` 不含 `.claude/`、`.agents/`、`ai/reboot/`、`ai/project-audit/runs/`、`pnpm-lock.yaml` |
| A2 | 移除 rapier 依赖 + `optimizeDeps` 块 | `package.json:15`、`vite.config.ts:12-18` | 低。锁文件 diff 会很大 | `pnpm install` → `rm -rf node_modules/.vite` → `pnpm build` 通过 → `pnpm dev` 冷启动无 504 → 进世界看一眼 pixi 场景 |
| A3 | `react-refresh` 修复：`TRACKS`+`Track` 搬到 `music-tracks.ts` | `music.tsx:7,9`、`floaters.tsx:9` | 低。与 `profile.ts` 已立的先例一致 | `pnpm lint` warning 3 → 2；`pnpm build` 通过；dev 下改 `MusicPlayer` JSX 确认热替换 |
| A4 | 删死样式：`cinnaglass.css` 的 `.sb-rcard`/`.sb-pcard`/`.chsc-pick`/`.sb-user .u-st`/`.modal.tall`/`floatA-C`/`beat` | `cinnaglass.css:294-296,307,327-337,529-532,845-898`（约 39 行） | 中低。**陷阱：294-313 是共用声明块，只能删选择器行** | `pnpm build`；进世界逐个打开 6 个弹窗 + timeline，目视无变化；`scripts/check-navigation.mjs` 三个 mood 截图与上次比对 |
| A5 | 删 `.rooms-tip` 死对：CSS 规则 + JSX 元素 | `navigation-glass.css:286-288`、`rail.tsx:118` | 极低（元素本来就 `display:none`） | `pnpm build`；打开房间 popover 目视 |
| A6 | 失效引用批量改目标（§6 表，本分区 27 处） | 见 §6 | 极低（纯注释） | `pnpm build`（注释不影响）；人工抽查 3 条新路径确实存在 |
| A7 | 过时注释清理（§5 表中标「删除」的条目） | `lobby.tsx:1-5`、`WorldPage.tsx:1-4,112-114`、`world-settings.tsx:6`、`music.tsx:1-3`、`useAuth.ts:3`、`cinnaglass.css:3-4,57-59,108-111,165,173-181,474-476,900-902`、`navigation-glass.css:1,39` | 极低 | 同 A6 |
| A8 | 补一句话职责注释（§5 表中标「建议注释原文」的条目，约 55 处） | 遍布本分区 | 极低 | 同 A6 |
| A9 | 小复用：删 `LoginPage.tsx:12-23` 的本地 `IMail`/`ILock`，改从 `icons.tsx` 导入 | `LoginPage.tsx:9,12-23,140,151` | **中低**：两版 path 数据不同，登录页两个图标的形状会变 | `pnpm build`；**目视登录页**，与改动前截图比对；若形状差异不可接受则回退（保留本地副本但加注释说明为什么） |
| A10 | 小复用：`Msg` 类型从 `LoginPage.tsx` 导出，`ResetPasswordPage.tsx:14` 改为导入 | `LoginPage.tsx:46`、`ResetPasswordPage.tsx:14` | 极低 | `pnpm build` |
| A11 | 建 `scripts/lib/deps.mjs`，6 个脚本统一 `dependency()`（含 3 个无兜底的） | 新文件 + `check-diary.mjs:9`、`check-journal-art.mjs:8`、`check-navigation.mjs:8`、`check-journal-turn.mjs:7-8`、`compare-journal-art.mjs:7`、`render-journal-turn.mjs:6`、`pack-journal-art.mjs:8`、`pack-navigation-texture.mjs:6` | 低（脚本不参与构建） | 每个改过的脚本 `node --check`；起 `pnpm dev` 后跑 `check-navigation.mjs` 与 `check-diary.mjs` 到断言阶段 |
| A12 | 脚本端口统一到 5173 + 给两个硬编码的加 `JOURNAL_URL` 兜底 | `check-journal-art.mjs:21`、`check-navigation.mjs:23,178,225`、`check-journal-turn.mjs:13`、`check-diary.mjs:36`、`render-journal-turn.mjs:16` | 低 | 同 A11 |
| A13 | `tsconfig.node.json` 加一行注释说明 `include` 为何只有一个文件 | `tsconfig.node.json:29` 上方 | 极低 | `pnpm build` |
| A14 | `icons.tsx` 文件头写明"唯一通用图标来源"边界规则 + 标注 15 个零消费者导出 | `icons.tsx:1` | 极低。**不删那 15 个导出**（图标库留冗余是合理的，删了下次要重画） | 同 A6 |

**建议的 commit 切分**（便于二分回滚）：`A1` / `A2` / `A3` / `A4+A5` / `A6+A7+A8+A14` / `A9+A10` / `A11+A12+A13`。

### B 类 —— 需用户批准（改行为、改接口或大范围移动）

| # | 项目 | 为什么需要批准 | 风险 | 验证方法 |
|---|---|---|---|---|
| B1 | **纪念日唯一真源**：删 `calendar.tsx:7 ANNIV`，`CalendarScreen` 加 `anniv` prop，`MomentCard` 与 `CalendarScreen` 都改用 `profile.ts` 的 `daysSince`/`daysUntilAnniversary` | 改组件接口 + **修一个现存 bug**（日历卡片不跟随世界设置），属行为变化 | 中。`anniv` 可为 `null`（新世界），日历高亮与倒数都要处理空值 | `pnpm build`；世界设置改纪念日 → 纪念日卡与日历卡片**同时**更新；把 `anniversary` 清空 → 两处都优雅降级不崩 |
| B2 | **`WorldPage` 拆分**（§2 的 S1–S7，分 B1–B6 六批） | 465 行重构，触及全部交互 | 中高（逐条见 §2.5） | 严格执行 §2.4 的四步清单，每批一次 |
| B3 | **`themes/cinnaglass/` 归子目录**：`calendar/settings/world-settings` → `screens/`，`music` → `shell/` | 12+ 处 import 变更 + `ai/` 文档同步 | 中。纯移动无行为变化，但 diff 大且与 UI 统一计划抢 diff | `pnpm build`；`pnpm lint`；6 个弹窗各开关一次。**建议排在 ui-system 的 A 基准落地之后** |
| B4 | **抽 `.cg-panel` 玻璃原子类**，三个 shell 组件的 `<style>` 去掉重复的 5 行面板声明 | 改样式组织方式，视觉需 Monet/ui-tailor 口径确认 | 中。6 处重复，漏改一处就有一个浮层掉材质 | `pnpm build`；`scripts/check-navigation.mjs` 三 mood 截图比对；ambience 面板与 pill、moment card、music bar、room handle 逐个目视 |
| B5 | **合并全局 reset**：`index.css` 与 `cinnaglass.css:134-150` 的重叠部分二选一 | 影响全站基础样式 | 中。两份 reset 的 `overflow:hidden`、`background` 差异需逐条比对 | `pnpm build`；全站目视（登录页、大厅、世界、6 个弹窗） |
| B6 | **`Weather.kind` 收窄为联合类型** | 改公开类型，波及 room 分区（`room-scene.tsx` 的 `weatherKind`） | 低（编译期就能全查出来），但跨分区 | `pnpm build`；四种天气各切一次 |
| B7 | **统一 import 路径写法**（69 处），并在 `ai/PROJECT.md` 记下约定 | 纯噪音 diff，且会与 B2/B3 抢 | 低 | `pnpm build`；`pnpm lint` |
| B8 | **`world-settings` 弹窗补入口**：目前 `screen='world-settings'` 无任何 UI 可达（`world-settings.tsx:6` 描述的 sidebar 入口已退役） | 这是产品决策（入口放 rail 的哪里），不是重构 | — | 待定入口后再定 |
| B9 | **`settings.tsx:167 savePw` 接真实 Supabase** | 目前显示"已更新"但不调后端，是功能缺口不是结构问题 | — | 归 intj 记为 Bug，不在本步范围 |

### 不建议做

| 项目 | 理由 |
|---|---|
| 把 `scripts/` 纳入 `tsc -b` | 要开 `allowJs/checkJs`，会连带拖进 536 行无标注的 `image-slot.js`；脚本依赖无类型定义；收益极低（§7.3） |
| 把 `playwright`/`sharp`/`pngjs` 加进 `package.json` | 会让每次 `pnpm install` 多下载数百 MB 浏览器；现行 `DIARY_NODE_MODULES` 机制是刻意设计（§7.4） |
| 删 `icons.tsx` 里 15 个零消费者图标 | 图标库留冗余是合理的；删了下次要重画。标注即可（A14） |
| 删 `navigation-glass.css:40-48` 的 `day`/`morning` 块 | 有明确的前瞻意图（第 39 行注释），改注释措辞即可（§4.3） |
| `eslint.config.js` 开 `allowConstantExport` | 会推翻 `profile.ts` 当初立下的规矩，让同一个仓前后不一（§7.2） |
| 本轮动 `chat-data.ts` 的 22 个返回值 | 不在本分区，且会与 `WorldPage` 拆分互相干扰（§2.5 R3） |
