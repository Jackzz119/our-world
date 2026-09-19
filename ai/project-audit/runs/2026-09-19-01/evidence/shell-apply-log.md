# Shell / Pages / Lib / 配置 分区 —— step 02 A 类落实日志

- run: `2026-09-19-01`，step 02「工程结构、模块化与复用」落实阶段
- 依据：`evidence/shell-structure-review.md` 的 §9「A 类」清单
- 起始 HEAD：`dc74f51`（refactor: reuse shared helpers and drop dead exports and config leftovers）
- 授权范围：注释精简、失效引用修正、死样式删除、小复用。**B 类全部未动。**
- 已在 `dc74f51` 之前完成、本轮未重做：A1 `.prettierignore`、A2 rapier + `optimizeDeps`、A3 `music-tracks.ts` 拆分、A5 `.rooms-tip` 死对、A10 `Msg` 类型复用、A11 `scripts/lib/deps.mjs`、A12 端口统一、A13 `tsconfig.node.json` 注释
- **A9（登录页图标改用 `icons.tsx`）明确不做**：两版 path 数据不同，换了图标形状会变，属视觉改动，已按用户口径排除

---

## 0. 验证口径

| 手段 | 时机 | 结果 |
|---|---|---|
| `pnpm exec tsc -b` | 每改完一个文件 | 全部通过，零错误 |
| `pnpm exec eslint <文件>` | 每改完一个 ts/tsx（css 不 lint） | 全部通过，零 error 零 warning |
| `pnpm exec vite build` | 全部改完后 | 通过（`✓ built`），随后 `rm -rf dist` |
| dist CSS 选择器集合 diff | 删死样式前 / 后各一次 build | 见 §1.3 |
| `verify-comment-only.mjs` | 全部改完后 | 21 个文件，18 comment-only，3 个 code-changed（见 §4，已人工复核为「模板字符串里的 CSS 注释」，非代码改动） |

**注意（环境）**：本分区与 room / journal / chat 分区在**同一个工作树上并行修改**。因此 `git status` 与 dist 选择器 diff 都会混入其他分区的改动，§1.3 已逐条归属。

---

## 1. 死样式删除（A4）

### 1.1 `src/themes/cinnaglass/cinnaglass.css`

每一块删除前都重新 grep 了全 `src`（`className=`、模板拼接、`querySelector`、`data-*` 属性选择器），排除 `.css` 自身的定义行。

| 删除项 | grep 结果 | 处置 |
|---|---|---|
| `.sb-rcard`、`.sb-pcard` | `src` 内零命中（含 index.html） | 从 `.paper` token remap 的逗号选择器列表里**只删这两行选择器**，声明块保留 |
| `.chsc-pick` | 零命中 | 同上，只删选择器行 |
| `.tl-card` | **元素消费者零命中**。`screens.tsx:162-200` 只有 9 行 CSS 规则，没有任何 `className="tl-card"`、模板拼接或动态 class；`grep "'tl-\|\"tl-\|\`tl-" src` 为空 | 从 `.paper` 列表移除。**登记**：`screens.tsx:162-200` 那 9 行规则同样无元素消费者，属 journal/screens 分区，本分区未动 |
| `.sb-user .u-st` 整块 + 其上 4 行说明注释 | `sb-user`、`u-st` 零命中 | 规则与注释一起删 |
| `.modal.tall` + 其上 4 行说明注释 | `grep -w tall src` 唯一命中是 `chat-data.ts:48` 注释里的英文单词 "tally"，非类名 | 规则与注释一起删 |
| `@keyframes floatA / floatB / floatC` | 零命中 | 三个 keyframes + 上方 `/* float keyframes for weightless HUD */` 一起删 |
| `@media (prefers-reduced-motion) { [style*='floatA'\|'floatB'\|'floatC'] }` | 依赖上面，同死 | **只删这三条属性选择器**，同一个 media 块里的 `.mood-stars{animation:none}` **保留**（它活着） |
| `@keyframes beat` + `/* heartbeat */` | `grep -w beat src` 命中两处都是英文散文（`feed.ts:34` "beats emoji"、`emoji-data.ts:63` "heartbeat"），非动画引用 | 删 |

文件行数 987 → 913（净 -74 行）。

### 1.2 未删、已登记

| 项 | 为什么不删 |
|---|---|
| `navigation-glass.css:40-48` 的 `[data-mood='day'\|'morning']` 块 | 有明确前瞻意图。审阅结论是「保留，只改注释措辞」，已照做（§2.2） |
| `screens.tsx` 的 `.tl-card` 规则（9 行） | 属其他分区文件，本分区不碰。已在上表登记它无元素消费者，供该分区处置 |
| `materials.css` | 审阅确认 14 个块全部有消费者，无需改动；文件头注释准确，也未动 |
| `index.css` | 全是元素级 reset，无死选择器；与 `cinnaglass.css` 的 reset 重叠属 B 类（B5），未动 |

### 1.3 dist CSS 选择器集合 diff（删前 / 删后）

方法：两次 `vite build`，用同一段脚本把产物 CSS 拆成「规则前导（含 `@media` 嵌套路径）」集合，排序后 `comm` 取差集。

**差集里属于本分区的（= 我删的，逐条对得上）：**

```
.modal.tall
.sb-user .u-st
.paper,.sb-rcard,.sb-pcard,.tl-card,.compose,… → 变为 .paper,.compose,…（少了 4 个选择器）
@keyframes beat            （含 0%,to / 14% / 28% / 42% 四个关键帧）
@keyframes floatA          （含 0%,to / 50%）
@keyframes floatB          （含 0%,to / 50%）
@keyframes floatC          （含 0%,to / 50%）
@media(prefers-reduced-motion:reduce) >> [style*=floatA],[style*=floatB],[style*=floatC]
```

**差集里不属于本分区的（journal 分区并行改的 `diary.css`，-79 行）：**

```
.diary-surface .compose-collapsed.draft .journal-quill
.journal-binding / .journal-binding:after / .journal-book[data-single=true] .journal-binding
.journal-engine
.journal-pager（及 button / button:disabled / small / span）
@media(max-width:767px),(max-height:599px) >> .journal-pager
```

**新增项只有一条**，就是被删掉 4 个选择器之后的那条 `.paper,…` 列表本身（同一条规则改写，不是新规则）。

**保留性验证**：`.mood-stars`、`@media(prefers-reduced-motion:reduce) >> .mood-stars`、`[data-mood=night] .mood-stars` 三条在 after 集合里都在 —— 确认拆 reduced-motion 块时没有误伤。

---

## 2. 逐文件改动

### 2.1 `src/main.tsx`
- **加**：`import './themes/cinnaglass/image-slot.js'` 上方一句，说明它是纯副作用导入（注册 `<image-slot>` 自定义元素）。
- 验证：tsc ✓ eslint ✓ comment-only ✓

### 2.2 `src/themes/cinnaglass/shell/navigation-glass.css`
- **改注释（半过时措辞）**：`:1` 原 `Scope the new material to navigation. Existing modals/HUD keep their values.` →「导航作用域材质；modal 仍走 cinnaglass.css 的 `--glass-*`，这里的东西不外泄出 `.rail-wrap`」。删「new」（早已不新）与「HUD」（已退役）。
- **改注释（补"当前不生效"）**：`:39` 原 `Future daytime rooms can inherit this without adopting a green surface.` → 明说 `[data-mood]` 今天只有 `golden|twilight|night`，这一块是 inert 的预留。
- 规则一行未动。

### 2.3 `src/themes/cinnaglass/cinnaglass.css`
删死样式见 §1.1。注释改动：

| 位置 | 旧注释摘句 | 处置 |
|---|---|---|
| 文件头 | `ow.css — …Ported verbatim from the design prototype's 'Our World.html' <style> block.` | 整段重写：文件名改对，删「逐字移植」这个早已不成立的声明与已不在仓内的原型文件引用 |
| concept-c shell tokens 段 | `(codex pixel spec 20260811-055917Z)` | 补全为 `ai/codex-visual/20260811-055917Z/codex-report.md` |
| 两色域说明 | `SHELL = .glass surfaces: sidebar, modals, HUD, dock` | → `modals, the rail and the floating cards` |
| `--app-ground` 上方 | `The sidebar is IN-FLOW, so what sits behind its glass is…` + `(codex audit 2026-08-08, High #3)` | 前提改为「浮起 chrome 合成所依的地面」，结论（必须是渐变）保留；引用补全为报告路径 |
| twilight 档 | `(codex audit, High #1)` | 补全为报告路径 + High #1 |
| night 档 focus 边 | `(codex audit, Med #2)` | 补全为报告路径 + Med #2 |
| `--shell-focus-border` 上方 | `open modal / HUD` + `never applied to the whole sidebar` | → `an open modal` + `never applied to the rail` |
| `.app` 上方 | `the ground the in-flow chrome composites against` | → `the floating chrome` |
| `.stage` 上方 | `the in-flow sidebar squeezes it` | → `the chrome floats above it` |
| scene switches | 9 行注释后面**没有任何 CSS**，前 5 行描述的是已删的规则 | 压缩为 3 行墓志铭，只留「v1 开关已随 concept-c 退役，pixi light pass 接管场景调色」 |
| `.glass` mixin | `SHELLS ONLY (sidebar, modals, HUD, dock)` | → `(modals, rail, floating cards)` |
| MODAL SHELL 段（中文） | `被 SubScreen / 日历 / 时钟 / 设置 / 空间切换器 共用` | 空间切换器已不存在 → 改为 `世界设置` |
| LOBBY 段 | `Static 2D placeholder; replaced by an R3F island later.` | R3F 线已废弃 → `Static 2D art.` |

改完全文再 grep `sidebar|HUD|ow.css|R3F|metaspace|dock|空间切换`：零命中。

### 2.4 `src/pages/WorldPage.tsx`
- **删过时叙述**：文件头 `Ported from the design prototype's app.jsx…(profile, rooms, current room, events, alarms, widgets)` —— 迁移记录 + 早已不存在的「rooms / current room」。重写为「cinnaglass 壳的根编排：持有全部共享世界状态，挂载场景之上的全部 surface」。
- **删过时叙述 + 修失效引用**：world state 注释 `see channel.md` + `NOT the in-world scene rooms mock above (living/bedroom lighting + navigation, local)` —— `channel.md` 不存在，上方也早已没有 rooms mock（是 widgets）。改为 `schema in ai/PROJECT.md, 数据库 section` + 「别和场景内房间搞混，后者是纯本地的」。
- **改过时措辞**：chat 段 `the sidebar only opens the covering conversation window` / `the dock is stage-owned` → 去掉 sidebar、dock 改称 chat card。
- **修失效引用（7 处）**：
  - bubble 注释 `codex audit M2 / ai/UX.md §4` → `ai/codex-visual/20260811-044310Z/codex-report.md M2` + `ai/design_system/uiux/interaction.md`
  - `onHotspot` 上方 `ai/UX.md §2` → `ai/design_system/props.md`、`ai/design_system/uiux/uiux.md`
  - JSX 注释 `(ai/UX.md)` → `ai/design_system/uiux/uiux.md`
  - `S-4 step 2`（member names）、`S-4 step 3`（liveProfile、onWorldSaved）三处编号 → `ai/features/supabase.md`
  - `liveProfile` 注释里 `What the chrome (sidebar/HUD/space) displays` 的 sidebar/HUD 措辞一并去掉
- **补职责注释（11 条）**：`REQUIRED/ADDON`（并注明今天只有 `anniv`/`music` 被 render 读，指向 `rail.tsx` 的 `MODULE_DEFS`）、`loadWidgets`、`MANUAL_WX`、`futureDate`、`SEED_EVENTS`、`MODAL_TABS`、`DEV_SURFACE`、三个 localStorage 写回 effect（合并一句）、`setWidget`、`navigate`、`enterWorld`、`createAndEnter`。
- 验证：tsc ✓ eslint ✓ comment-only ✓

### 2.5 `src/pages/ProtectedRoute.tsx`
- **加**：`Splash` 上方一句（会话检查 / dev 自动登录 pending 时的全屏占位）。其余注释审阅判定为本分区质量最高，全部保留。

### 2.6 `src/pages/LoginPage.tsx`
- **加 4 条**：`GoogleMark`（品牌固定色、不跟主题）、`handleGoogle`（OAuth 往返到站点根、由 ProtectedRoute 接住新 session）、`handleForgot`（扩写原来那一行，说明只读 email 字段）、`handleSubmit`（注册留在本页、登录跳世界）。
- **A9 替代处置**：在本地 `IMail`/`ILock` 上方加一段注释，说明 `icons.tsx` 里也有同名图标但 path 网格不同，这两份是为了保住登录页已批准的形状而**刻意保留**，并重申「其他任何组件不得就地定义图标」。**没有删本地副本、没有改 import。**

### 2.7 `src/pages/ResetPasswordPage.tsx`
- **加 1 条**：`handleSubmit` 上方，说明先本地校验（6 位 + 两次一致）再调 `updateUser`，因为某些 Supabase 项目会静默接受短密码。

### 2.8 `src/hooks/useAuth.ts`
- **删过时叙述**：`Restored from the pre-pivot auth stack (1f9b4a8).` —— 一次性迁移记录，对今天读代码的人无用。前两行保留。

### 2.9 `src/lib/supabase.ts` / `profiles.ts` / `worlds.ts`
- `supabase.ts`：**加**单例说明（所有数据模块共用同一个 client，避免 auth 状态与 Realtime channel 重复）。
- `profiles.ts`：**扩写** `getProfilesByIds` 的一行注释，补容错与副作用（去 null 去重、空输入短路不发请求、Supabase 出错抛出交调用方兜底）。
- `worlds.ts`：**修失效引用** `terminology in ai/features/channel.md` → `schema in ai/PROJECT.md, 数据库 section`；**加** `WORLD_COLS` 的一句职责。三个动作函数原有注释准确，保留。

### 2.10 `src/utils/index.ts` / `src/types/index.ts`
- `getEnv`：**加**（缺失即在模块求值期抛，让配置错的构建响亮地失败）。另外两个函数原注释准确，保留。
- `EnvName`：**加**（可读环境变量白名单，防止 `getEnv*` 把拼错的名字解析成 undefined）。

### 2.11 `src/themes/cinnaglass/shell/rail.tsx`
- **修失效引用 2 处**：`MODULE_DEFS` 的 `ai/UX.md §2` → `ai/design_system/props.md` + `uiux.md`（并补一句「`presence` 在 WorldPage 里还没有消费者」）；`RoomHandle` JSDoc 的 `spec §5.8` → `ai/codex-visual/20260811-055917Z/codex-report.md`，同时把「55px visible」改成与实际 CSS 一致的说法（65px 宽、被视口裁掉 10px）。
- **加 4 条**：`RailKey`（`rooms`/`modules` 就地开 popover，其余 key 转发给 `onAction`）、`ROOM_DEFS`（只有 study 有场景，另两个 locked）、`Rail` 组件级（同时只开一个 popover，Escape 与外部 pointerdown 都在 window 捕获阶段监听，所以 modal 里的 popover 也能赢）、`btn` 工厂（pointer 的 up/cancel/leave/blur 都清 pressed，因为离开按钮后不会再有 pointerup）、`RoomHandleStyles`。

### 2.12 `src/themes/cinnaglass/shell/ambience.tsx`
- **修失效引用 4 处**：文件头 `codex pixel spec (§5.3)` → 完整报告路径；模板串里的 `spec 5.3:` / `spec: no plate on options` 与 JSX 的 `{/* spec: center drop tab */}` → 统一改成 `comp:`（不再引一个不存在的章节号，尺寸数字本身就是规格）。
- **加 3 条**：`MOODS`/`WXS`（面板的 mood 行 / weather 行，按 comp 顺序）、`Ambience` 组件级（默认折叠，开着时由 drop tab 或背后全屏 scrim 关闭）、`AmbienceStyles`（颜色全部来自 `--cg-*`）。

### 2.13 `src/themes/cinnaglass/shell/floaters.tsx`
- **修失效引用 6 处**：文件头 `codex pixel spec … (§5.4 / §5.7)` → 完整报告路径；两个段落分隔注释 `(spec §5.4)` / `(spec §5.7)` 去掉章节号；模板串里 `spec §5.4: 233×105 r19`、`spec §5.7: 437×88 r22`、`spec: one 193×8 r4 track` 与 JSX 的 `{/* spec: 67×62 … */}` 同样改为不带章节号的规格描述 / `comp:`。文件头那句有价值的负面规格（`NO second info line and NO volume rail`）原样保留。
- **加 3 条**：`MomentCard`（在一起天数 + 到下一个纪念日的天数；`anniv` 解析不出来时什么都不渲染）、`MusicMini`、`FloaterStyles`（两个浮层各挂一份，所以任一单独出现时也有样式）。
- **未做（B 类）**：`MomentCard` 改用 `profile.ts` 的 `daysSince`/`daysUntilAnniversary`（属 B1，改接口/行为）；`FloaterStyles` 重复挂载的合并（涉及 DOM 结构）。

### 2.14 `src/themes/cinnaglass/calendar.tsx`
- **加**文件头一句：两个不相关的屏放同一个文件，是因为共用 `CalClockStyles` 与 `.modal.mini` 外壳。
- **改行内注释**：`const ANNIV = {...}; // 在一起：2025.6.4` → 前置两行 `DUPLICATE SOURCE` 警告，明说权威来源是 `worlds.anniversary`、这个常量没有接上去、所以这张卡永远不跟随世界设置。**常量本身保留**（删它属 B1）。
- **加 5 条**：`pad`/`ymd`（本地日历日期键的形状）、`CalClockStyles`、`CalendarScreen`（月历 + 添加行 + 最近六条；events 由调用方持有并持久化）、`nextAnniv`（并注明它读的是硬编码常量而不是世界行）、`move`（跨月滚年）、`ClockScreen`（`nowTs` 由调用方 tick 所以这里是纯渲染；闹钟今天只展示，没有任何东西会触发它）。

### 2.15 `src/themes/cinnaglass/settings.tsx`
- **修失效引用**：个人资料段 JSX 注释 `world-settings.tsx / world.md W-3` → `world-settings.tsx and ai/features/supabase.md`（`world.md` 不存在）。
- **加 6 条**：`SettingsStyles`、三个 `*_OPTS`（主题外观三个分段控件的选项集）、`Segmented`、`PersonRow`（昵称仍是纯本地，DB 写回没接）、`SettingsScreen`（资料与主题即时改本地状态，只有退出登录碰后端）、`pwValid`/`savePw` 上方的**危险沉默警示**：这是纯 UI 占位，会显示成功态但**根本没调 Supabase**，别把那个勾当成真的改了密码。

### 2.16 `src/themes/cinnaglass/world-settings.tsx`
- **修失效引用**：`:4` 的 `S-4 step 3` → `ai/features/supabase.md`。
- **删过时叙述**：`:6` `Entry: clicking the sidebar world-panel header (icon + name strip).` —— sidebar 已随 v2 壳退役，这个弹窗**今天在 UI 上没有任何入口**。改为明确的 `NOTE: no UI entry point today … Reachable only by setting screen='world-settings'.`（补入口是 B8，产品决策，未做）。
- **改模板串里的过时 CSS 段注释**：`the same three-way fallback the sidebar renders` → `the same three-way fallback the world icon uses everywhere`。
- **加 5 条**：`WorldSettingsStyles`、`draftOf`（把行快照成可编辑草稿，每个字段用 `''` 表示"未设"）、`WorldSettingsScreen` 组件级、`pickFile`（object URL 边换边 revoke，所以开着的弹窗最多漏一个）、`save`（有文件先传再 patch；上传失败在任何 DB 写之前中止，所以行不会指向一个不存在的对象）。

### 2.17 `src/themes/cinnaglass/music.tsx` / `music-tracks.ts`
- **删过时叙述**（`music.tsx` 文件头）：`One taps play, everyone in the current room "hears" it.` —— 描述的是**没实现的功能**，实际没有任何共享播放链路。改为明说 `Shared playback is NOT implemented: each client plays locally.`
- **加 9 条**：`muLoad`（坏存储降级到默认）、`AudioPad`（四个失谐声部 → master gain → lowpass → 输出）、`MusicStyles`、`MusicPlayer`（首次播放才懒建音频图，所以不会在无用户手势时创建 AudioContext；卸载时关闭）、`ensure`（建一次缓存在 ref 上；WebAudio 不可用时返回 null，所有调用方都要容忍）、`applyChord`（声部 0 降八度当低音）、`ramp`（渐入渐出，硬起会咔哒）、`prev`（超过 3s 重播当前曲，否则退一首）、`stop`（包一层，防止控件点击穿到背后的卡片）。
- `music-tracks.ts`：**加** `TRACKS` 一句（每条是给 WebAudio pad 的和弦配方，不是音频文件）。
- 匿名回调、`fmt`、`next`、`seek`、`toggle` 这些自明的，按审阅口径**没有机械加注释**。

### 2.18 `src/themes/cinnaglass/lobby.tsx`
- **删全部 5 行过时文件头**，三处错都在里面：(a) 表名写成 `rooms`（实为 `worlds`）；(b) `see channel.md`（文件不存在）；(c) `swapped for an R3F top-down island later`（R3F 线已废弃，`@react-three/*` 在 src 零引用）。重写为：大厅 = 进世界前的漂浮岛 + 传送门，数据是 `worlds` 行（schema 在 `ai/PROJECT.md`），静态 2D 美术，与世界内房间场景无关。
- **加 2 条**：`P`（岛屿配色集中一处，保证与房间 diorama 调性一致）、`LobbyScene`（岛屿美术 + 一张四态状态卡：loading / 拉取失败 / 有世界 / 没世界）。
- `LobbySceneProps` 每个字段都有高质量行内注释，原样保留；`LobbyStatus` 三值自明，未加。

### 2.19 `src/themes/cinnaglass/icons.tsx`（A14）
- **文件头扩写**，写死边界规则：这是项目**唯一的通用图标来源**；描边继承 `currentColor`，尺寸与线宽是 props；导航专用剪影只在 `shell/rail-icons.tsx`；**其他组件一律不得就地定义图标**。
- **标注零消费者导出**（本轮重新 grep 全 src 复核，仍是 15 个，与审阅一致）：`INote, IMapPin, IThermo, IChat, IShrink, ISmile, IGrid, IWand, IBell, IDate, IMove, IUsers, IPencil, IMic, IMicOff`，并写明保留理由（图标库留冗余比重画便宜）。**一个导出都没删。**
- **加 2 条**：`IcoProps`、`Ico`。56 个具体图标按审阅口径不加（名字即内容）。

### 2.20 未改动的分区内文件
`src/App.tsx`（3 条路由一目了然，审阅判定不加）、`src/themes/cinnaglass/shell/rail-icons.tsx`（文件头已说明为什么不用图片，5 个图标自明）、`src/themes/cinnaglass/materials.css`（无死选择器、文件头准确）、`src/index.css`、`src/pages/LoginPage.module.css`、`vite.config.ts`、`eslint.config.js`、`tsconfig*.json`、`scripts/*`（A11–A13 已在 `dc74f51` 完成）。

---

## 3. 失效引用汇总（§6 表，本分区部分）

| 文件 | 旧引用 | 新目标 | `test -f` |
|---|---|---|---|
| `lib/worlds.ts` | `ai/features/channel.md` | `ai/PROJECT.md` 数据库节 | ✓ |
| `WorldPage.tsx`（world state） | `channel.md` | `ai/PROJECT.md` 数据库节 | ✓ |
| `lobby.tsx` | `channel.md` + 表名 `rooms` | `ai/PROJECT.md` 数据库节 + 表名 `worlds` | ✓ |
| `settings.tsx` | `world.md W-3` | `ai/features/supabase.md` | ✓ |
| `world-settings.tsx` | `S-4 step 3` | `ai/features/supabase.md` | ✓ |
| `WorldPage.tsx` ×3 | `S-4 step 2` / `S-4 step 3` ×2 | `ai/features/supabase.md` | ✓ |
| `WorldPage.tsx`（bubble） | `codex audit M2` | `ai/codex-visual/20260811-044310Z/codex-report.md` | ✓ |
| `WorldPage.tsx`（bubble） | `ai/UX.md §4` | `ai/design_system/uiux/interaction.md` | ✓ |
| `WorldPage.tsx`（onHotspot） | `ai/UX.md §2` | `ai/design_system/props.md` + `ai/design_system/uiux/uiux.md` | ✓ |
| `WorldPage.tsx`（JSX） | `ai/UX.md` | `ai/design_system/uiux/uiux.md` | ✓ |
| `rail.tsx`（MODULE_DEFS） | `ai/UX.md §2` | `ai/design_system/props.md` + `uiux.md` | ✓ |
| `rail.tsx`（RoomHandle） | `spec §5.8` | `ai/codex-visual/20260811-055917Z/codex-report.md` | ✓ |
| `ambience.tsx` ×4 | `codex pixel spec (§5.3)` / `spec 5.3` / `spec:` ×2 | 完整报告路径 / 去章节号改 `comp:` | ✓ |
| `floaters.tsx` ×6 | `codex pixel spec … §5.4 / §5.7` 及 4 处 `spec §…` | 完整报告路径 / 去章节号 | ✓ |
| `cinnaglass.css` | `Our World.html` | 删该句（原型文件不在仓内可定位路径） | — |
| `cinnaglass.css` | `codex pixel spec 20260811-055917Z` | 补全为报告路径 | ✓ |
| `cinnaglass.css` ×3 | `codex audit 2026-08-08, High #3` / `codex audit, High #1` / `codex audit, Med #2` | `ai/codex-visual/20260811-044310Z/codex-report.md`（保留 High/Med 编号定位） | ✓ |

合计 **27 处**。所有新目标改前都跑过 `test -f`，全部存在。

`ux-decisions` 的正确路径（`ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md`）已核实存在；本分区源码中**没有**对它的引用需要改（现存三处在 `channel-screen.tsx` / `chat-data.ts` / `emote-picker.tsx`，属 chat 分区，且已经是正确的完整路径）。

---

## 4. `verify-comment-only.mjs` 结果与人工复核

```
node ai/project-audit/scripts/verify-comment-only.mjs --root . --revision HEAD --files <本分区 21 个 ts/tsx>
→ { total: 21, commentOnly: 18, codeChanged: [
     "src/themes/cinnaglass/world-settings.tsx",
     "src/themes/cinnaglass/shell/ambience.tsx",
     "src/themes/cinnaglass/shell/floaters.tsx" ] }
```

**三条 `code-changed` 全部是同一个原因：这三个文件把 CSS 写在 `<style>{\`…\`}</style>` 的模板字符串里，我按 §6 改的是那段 CSS 里的 `/* … */` 注释。** 对 TypeScript AST 来说模板字符串是一个字符串字面量（代码），所以脚本必然判 code-changed —— 脚本自己的文档也写着「false 只说明有非注释差异，仍须人工看 diff」。

**人工复核 + 机械取证**：把三个文件 HEAD 版与工作区版的**全部模板字符串**取出，剥掉 `/* */` 注释与空白后逐字比较：

```
OK   src/themes/cinnaglass/world-settings.tsx — 模板字符串在剥离 CSS 注释后完全相同
OK   src/themes/cinnaglass/shell/ambience.tsx — 同上
OK   src/themes/cinnaglass/shell/floaters.tsx — 同上
```

即：**没有任何选择器、声明或取值被改动**，三处都只是注释文本。`git diff` 逐行复核也确认如此（改动行全是 `/* spec §5.x … */ → /* comp: … */` 这类）。据此**不撤销**，在此登记待复核。

---

## 5. 明确未做的项及原因

| 项 | 原因 |
|---|---|
| **A9** 登录页 `IMail`/`ILock` 改用 `icons.tsx` | 两版 path 网格不同，图标形状会变，属视觉改动，用户口径已排除。改为在本地副本上加注释说明为什么保留 |
| **B1** 纪念日唯一真源（删 `ANNIV`、`CalendarScreen` 加 `anniv` prop、改用 `profile.ts` 的日期函数） | B 类：改组件接口 + 修行为 bug。本轮只在 `ANNIV` 上留了 `DUPLICATE SOURCE` 警告注释 |
| **B2** `WorldPage` 拆 hook | B 类 |
| **B3** `themes/cinnaglass/` 归子目录 | B 类 |
| **B4** 抽 `.cg-panel` 玻璃原子类 | B 类：改样式组织方式，需 Monet / ui-tailor 口径 |
| **B5** 合并 `index.css` 与 `cinnaglass.css` 的 reset 重叠 | B 类：影响全站基础样式 |
| **B6** `Weather.kind` 收窄为联合类型 | B 类，且跨到 room 分区 |
| **B7** 统一 import 路径写法（69 处） | B 类：纯噪音 diff |
| **B8** 给 `world-settings` 弹窗补 UI 入口 | 产品决策，不是重构。本轮只把「今天没有入口」这个事实写进注释 |
| **B9** `settings.tsx` 的 `savePw` 接真实 Supabase | 功能缺口，归 intj 记 Bug。本轮只加了警示注释 |
| `screens.tsx` 的 `.tl-card` 9 行规则 | 属其他分区文件。已在 §1.1 登记它同样无元素消费者 |
| `navigation-glass.css` 的 `day`/`morning` 块 | 有前瞻意图，审阅结论是保留 + 改措辞，已照做 |
| `prettier` / `git commit` | 本轮明令不跑 |

---

## 6. 结论

- A4（死样式）、A6（失效引用 27 处）、A7（过时注释清理）、A8（补职责注释）、A14（icons 边界规则 + 零消费者标注）**全部落实**。
- 本分区共改 **23 个文件**（21 个 ts/tsx + 2 个 css），净 -100 行左右，其中 css 净 -75 行是真正的死代码删除，其余是注释增减。
- `tsc -b`、`eslint`、`vite build` 三关全绿；dist 选择器差集与「我删的选择器」逐条对得上，没有误伤。
- ts/tsx 层面**零行为改动**：18 个文件机器判定 comment-only，3 个被判 code-changed 的已机械证明只动了模板字符串里的 CSS 注释。
