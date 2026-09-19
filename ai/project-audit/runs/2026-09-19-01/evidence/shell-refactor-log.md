# Shell / Pages 分区重构执行日志（PA-031 / PA-032 / B4-B7）

- run：`2026-09-19-01`，step 02 的落地阶段
- 起点 HEAD：`e674a96` refactor: split the room compositor, object surfaces and chat hook into modules
- 依据：`ai/project-audit/runs/2026-09-19-01/evidence/shell-structure-review.md`（§2 S1–S7、§3.2、§3.3、§4.5、§8.2、§8.3）
- 范围内：`src/pages/**`、`src/themes/cinnaglass/{shell/**,calendar,settings,world-settings,music,lobby,icons,cinnaglass.css,materials.css,model,profile,tweaks}`、`src/index.css`、`src/App.tsx`、`src/main.tsx`；B7 的路径替换触及全 `src`
- 明确未做：`world-settings` 弹窗入口（B8，产品决策）、`savePw` 接后端（B9，功能）、`image-slot` 换 React、子目录归位与文件改名（B3）
- 未提交（工作区改动）；未跑全仓 prettier，只对改动文件跑 `--write`

---

## 0. 三行结论

1. `WorldPage.tsx` **615 → 361 行**，八件事拆成 5 个 hook + 1 个子组件 + 1 个主题 hook；剩下的 361 行里有 ~75 行是 `useChatThreads` 的 22 个返回值与 `ChannelScreen` 的 30 个 props 转发，那是 `chat-data.ts` 的事（review R3 明确本轮不动）。
2. **修掉一个真 bug**：改世界设置里的纪念日，日历弹窗顶部的卡片过去永远显示 2025.6.4，现在跟着变了。顺带修掉"纪念日当天倒数显示 365 天"。详见第 3 节。
3. 等价性证据：`tsc -b` / `eslint .` / `vite build` 每批通过，结构扫描 **0 环 0 未解析**；样式改动用 headless Chrome 做了 **99 个探针 × 56034 条计算属性的前后对照，差异 0**；纪念日数学做了 node 逐日对拍；浮层与弹窗在真实浏览器里挂载渲染过，控制台 0 报错。

---

## 1. 新旧对照

### 1.1 文件

| 新文件                                                | 行数 | 从哪来（旧 `WorldPage.tsx` 行号，615 行版）              | 职责                                          |
| ----------------------------------------------------- | ---- | ------------------------------------------------------- | --------------------------------------------- |
| `src/pages/world/useLiveClock.ts`                     | 17   | `:115`、`:217-221`                                      | S2 每秒走一格的时间戳                         |
| `src/pages/world/useWeather.ts`                       | 84   | `:59-76`、`:116`、`:288-334`                            | S1 天气：手动档位 / 实况（定位 → open-meteo） |
| `src/pages/world/usePersistedState.ts`                | 18   | `:264-286`、`:336-349` 的写回部分                       | S7 state + localStorage 回写                  |
| `src/pages/world/useSurfaceRouter.ts`                  | 64   | `:90-91`、`:109-112`、`:350-373`                        | S4 弹窗路由 + rail / 家具热点两条入口         |
| `src/pages/world/useWorldSession.ts`                   | 158  | `:120-137`、`:171-215`、`:375-427`、`:443-454` 的会话片 | S3 世界行 + 大厅流程 + 成员名 + 图标签名 URL  |
| `src/themes/cinnaglass/shell/use-world-chat-bubble.ts` | 43   | `:107`、`:236-263`                                      | S5 未读小红点 + 她的头顶气泡                  |
| `src/themes/cinnaglass/shell/world-surfaces.tsx`       | 95   | `:542-575`                                              | S6 五个弹窗的统一挂载点                       |

放置位置与 §2.2 的「`src/hooks/`」不同：本次任务边界不含 `src/hooks/`，所以通用 hook 落在 `src/pages/world/`（`WorldPage` 唯一消费者，就近放），主题绑定的两个落在 `shell/`。命名各随所在目录的多数派：`pages/world/` 跟 `src/hooks/useAuth.ts` 用 camelCase，`shell/` 跟同目录用 kebab-case。这条已写进 `ai/project-audit/CONVENTIONS.md` 的命名表。

### 1.2 `WorldPage` 现在是什么

读 hook → 拼 props → 渲染两棵子树（世界内 / 大厅）。它只剩三件自己的事：

- 两个模块级常量 `AUTO_ENTER` / `DEV_SURFACE`（review R4：**必须**留在模块顶部，搬进 hook 会改变 `window.location.search` 的求值时机），以及 widget 注册表、种子数据；
- 裸 Enter 开聊天卡的键盘监听（跨 `convOpen` 与 `screen` 两个域的闸门）；
- 三个**跨域组合**动作 —— 这是 review R2 点名要留在调用点的：
    - `leaveRoom()` = `leaveWorld()`（会话域）+ `closeSurface()`（路由域）+ `setChatOpen(false)`（聊天域）
    - `onWorldSaved(w)` = `applySavedWorld(w)`（会话域）+ `setProfile(...)`（本地档案域）
    - `liveProfile` = DB 世界身份 ∪ localStorage 兜底

### 1.3 与 §2.2 方案的三处偏离（都是有意的）

| 偏离                                                                         | 原因                                                                                                                                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useWorldChatBubble` 不返回 `clearUnread`                                    | 旧代码里没有任何地方主动清红点，清除完全由「聊天面开着」这个条件驱动。导出一个没人调的函数等于新增死 API。                                                                                |
| `useSurfaceRouter` 多返回一个 `tab`                                          | `MODAL_TABS` 只能有一份。若放 `world-surfaces.tsx`，那是个组件文件，导出常量会踩 `react-refresh/only-export-components`（`profile.ts` 当初就是为这条规则拆出来的）。改为路由算好 `tab` 交出去，`shell/` 不必反向依赖 `pages/`。 |
| 批次顺序把 §2.3 的 B4（router）放在 B6（surfaces）之前，与方案一致；但两批之间的接口靠 `tab` 而不是 `MODAL_TABS` | 同上。                                                                                                                                                                                   |

`presence` 占位（`:475-483`）没有单独抽：它是 8 行字面量 props，没有逻辑，§2.2 也没有对应的 S 条目，抽出来只是换个地方写死。留在 `WorldPage`，注释仍指向 TODO R1。

---

## 2. 逐批改动与验证

每批后都跑：`pnpm exec tsc -b` / `pnpm exec eslint .` / `pnpm exec vite build`（成功后 `rm -rf dist`）/ `node ai/project-audit/scripts/scan-structure.mjs`。

**基线**：tsc 干净；eslint **1 warning**（`room-scene.tsx:141` 的 unused eslint-disable，本就存在，不在本轮范围）；scan `cycles 0 / unresolved 0 / files 92 / 14674 行`。

| 批次 | 内容                            | tsc | eslint      | build | scan（环 / 未解析） |
| ---- | ------------------------------- | --- | ----------- | ----- | ------------------- |
| 1    | S2 `useLiveClock` + S1 `useWeather` | OK  | 1 warning   | OK    | 0 / 0               |
| 2    | S7 `usePersistedState`（四片）  | OK  | 1 warning   | OK    | 0 / 0               |
| 3    | S5 `useWorldChatBubble`         | OK  | 1 warning\* | OK    | 0 / 0               |
| 4    | S4 `useSurfaceRouter`           | OK  | 1 warning   | OK    | 0 / 0               |
| 5    | S3 `useWorldSession`            | OK  | 1 warning   | OK    | 0 / 0               |
| 6    | S6 `<WorldSurfaces>`            | OK  | 1 warning   | OK    | 0 / 0               |
| 7    | PA-032 纪念日唯一真源（B1）     | OK  | 1 warning   | OK    | 0 / 0               |
| 8    | B4 `.cg-panel` 玻璃原子类       | OK  | 1 warning   | OK    | 0 / 0               |
| 9    | B5 全局 reset 合并              | OK  | 1 warning   | OK    | 0 / 0               |
| 10   | B6 `Weather.kind` 收窄          | OK  | 1 warning   | OK    | 0 / 0               |
| 11   | B7 import 路径统一（212 处）    | OK  | 1 warning   | OK    | 0 / 0               |

\* 批次 3 中途一度出现第 2 条 warning（`WorldPage.tsx` 的 `useRef` 变成未使用），当批内删掉了那个 import，收批时仍是 1 条。**warning 数全程未超过基线。**

最终：`files 99 / 14928 行 / cycles 0 / unresolved 0 / dupBodies 0`。

### 2.1 一个必须记下来的坑：eslint 的 react-hooks 规则原来「看不见」`WorldPage`

`eslint-plugin-react-hooks` v7 是编译器驱动的。它在分析不了某个函数时会**整段跳过**那个函数的全部 hooks 规则。旧的 615 行 `WorldPage` 正好落在这个跳过里 —— 所以它那些「在 effect 里同步 setState」的写法一条都没报。

把同一段代码原样搬进小 hook 文件，规则立刻生效，报的是 **error 不是 warning**（`react-hooks/set-state-in-effect`）。实测证据：把旧的天气 effect 逐字贴进一个 30 行的探针组件，规则照样报错 —— 证明触发条件是「函数够小、编译器能分析」，不是我改错了。

这意味着：**拆分会把原本被静音的 lint 问题暴露出来**。处理原则是「能真等价地改写就改写，不能就留一条写清理由的 disable」，三处如下：

| 位置                     | 处理                                                          | 为什么                                                                                                 |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `useWeather` 手动档位    | 改成 render 期派生，不再 setState                             | 手动天气本来就是 `tweak` 的纯函数，用 state 存它是多余的。有一处行为变化，见 §5。                      |
| `useWorldChatBubble` 未读 | 改成 render 期派生 `unread`，删掉 state 与 effect             | 推导等价，见下。                                                                                       |
| `useWorldChatBubble` 气泡 | 保留 effect，加一条 `eslint-disable-next-line` 并写明理由     | 「新消息一落地就要冒气泡、4.5 秒后消失」本质就是 effect + timer，派生不出来；同步 set 是它的全部目的。 |
| `useWorldSession` 图标 URL | 改成 `worldIconUrl = iconPath ? signedIcon : null` 派生       | 原来用 `setWorldIconUrl(null)` 在 effect 里清空；改成派生后没有 state 要清。微小差异见 §5。            |

**`unread` 为什么能纯派生**（这是本批唯一需要推导的一处）：旧 effect 的三条分支是「没有最后一条消息 → 不动」「任一聊天面开着 → false」「最后一条不是我发的 → true」。注意第三条的依赖数组里有 `chatOpen`，所以**关掉聊天卡时 effect 会重跑并把红点重新点亮** —— 也就是说旧行为等价于 `unread = 有她的最后一条消息 且 两个聊天面都关着`。两个残留分支（「最后一条是我发的但红点还亮着」「消息列表被清空」）需要「在两个聊天面都关着的时候发出消息」才能触达，而发消息必须先打开某个聊天面（那时红点已经是 false），所以不可达。运行时把四种组合都跑了一遍，结论与推导一致（§4.4）。

---

## 3. PA-032：纪念日的行为变化（这一节是重点）

### 3.1 之前是怎么错的

纪念日这一个日期，全仓有三份来源、三份算法：

- 权威来源：DB 的 `worlds.anniversary`
- 离线兜底：`profile.ts` 的 `PROFILE_DEFAULT.anniv = '2025-06-04'`
- **硬编码常量**：`calendar.tsx:11` 的 `ANNIV = { m: 5, d: 4, year: 2025 }` —— 谁也没连它

而 `profile.ts` 里写对了的 `daysSince` / `daysUntilAnniversary` **全仓零消费者**，`MomentCard` 和 `calendar.tsx` 各自就地重写了一遍。

后果：`WorldPage` 给 `CalendarScreen` 只传了 `events/setEvents`，没传纪念日。**在世界设置里把纪念日改了，右上角那张"在一起 N 天"的卡片会变，日历弹窗顶部那张"距下一个纪念日"的卡片不会变，它永远显示 2025.6.4。**

### 3.2 现在的链路

```
DB worlds.anniversary
   └─(没有就退回)→ localStorage profile.anniv
        └─ WorldPage 合成 liveProfile.anniv（原本就在，没动）
             ├─→ MomentCard  anniv
             └─→ WorldSurfaces anniv ─→ CalendarScreen anniv   ← 新接的一条
```

日期数学只剩 `profile.ts` 一份：新增 `parseAnniv()`（解析 `YYYY-MM-DD` 到当地零点，解析不了就 `null`），`daysSince` / `daysUntilAnniversary` 改成复用它。`MomentCard` 里 11 行的 `useMemo` 和 `calendar.tsx` 里的 `nextAnniv()` 都删了。

### 3.3 用户会看到的四处变化

| # | 变化                                                                                      | 之前                          | 现在                                       |
| - | ----------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| 1 | **改了世界设置的纪念日，日历卡片跟着变**（这就是那个 bug）                                | 永远 2025.6.4                 | 跟 `worlds.anniversary` 走                 |
| 2 | **日历月历里被标红的那一格，跟着纪念日走**                                                | 永远 6 月 4 日                | 跟 `worlds.anniversary` 的月/日走          |
| 3 | **"在一起 N 天"整体 +1**                                                                  | 纪念日当天算第 0 天           | 纪念日当天算第 1 天（`daysSince` 的口径）  |
| 4 | **纪念日当天的倒数**                                                                      | `MomentCard` 显示 **365 天**  | 显示 **0 天**                              |

第 3、4 条是采用 `profile.ts` 那份「正确实现」的直接结果。第 4 条是旧 `MomentCard` 的实打实的 bug：它拿当年的纪念日**零点**跟**此刻**比，当天过了 0 点就判定"已经过去了"，于是跳到明年。日历那边本来就是零点对零点比较，所以没这个毛病 —— 两处现在统一到日历的（正确的）口径。

对拍数据（`scratchpad/refactor-shell/anniv-compare.mjs`，400 天 × 4 个时刻 = 1600 个样本，纪念日固定 2025-06-04）：

```
TZ=Asia/Shanghai（无夏令时）
  在一起N天    new-old: { +1: 1600 }                 ← 全体 +1，符合预期
  距纪念日M天  new-old: { -365: 4, 0: 1596 }         ← 只有纪念日当天那 4 个时刻不同
  日历倒数/年份/周年 不一致次数: 0 / 0               ← 日历口径完全没变，只是换了数据源

TZ=America/Los_Angeles（有夏令时）
  距纪念日M天  new-old: { -365: 4, 0: 1434, +1: 162 } ← 多出的 162 例全在深夜且跨夏令时
```

那 162 例是旧 `MomentCard` 的另一个隐性 bug：它用**毫秒差**除以 86400000，跨夏令时那一小时会让结果少一天。新的共享算法是零点对零点 + `Math.round`，不受影响。用户在中国时区（无夏令时）不会遇到这 162 例，但记下来。

### 3.4 `anniv` 为空（新世界）怎么降级

`worlds.anniversary` 可以是 `null`。两处的降级**不一样**，是有意的：

- `MomentCard`：**整张卡不渲染**（`return null`）。这是它原本就有的契约（旧注释："Renders nothing when anniv is unparseable"），233×105 的浮层里没有半填状态可展示，保持不变。
- `CalendarScreen`：**卡片位置显示占位文案**「纪念日 / 还没有设置 · 去世界设置里填一个吧」，月历照常渲染，不标红任何格子。新增的。

> 如果你希望 `MomentCard` 也显示一句占位而不是整张消失，说一声，一行的事 —— 我按"保留既有契约"处理了。

运行时实测（§4.3）：`null`、空串、`'not-a-date'`、`'2025-13-99'` 四种输入下 `parseAnniv` 都返回 `null`，`daysSince` / `daysUntilAnniversary` 都返回 `0`，两处都不崩。

---

## 4. 等价性证据

### 4.1 `.cg-panel`（B4）：99 探针 × 56034 条计算属性，差异 0

做法：`scratchpad/refactor-shell/style-dump.mjs` 生成一个 harness 页面 —— 真实的 `index.css` + `cinnaglass.css`（连带 `@import materials.css`），加上从三个 `.tsx` 里**用正则原样抠出来的 `<style>` 字符串**，再按源码里的 `className`（也是从 JSX 抠的，所以改动后自动带上新类名）铺出 `3 个 mood × 3 个 glassStyle = 9` 份 DOM，最后 `getComputedStyle` 把每个探针的**全部**属性 dump 成 JSON。用 `/Applications/Google Chrome.app` 的 `--headless=new --dump-dom` 跑，不需要 playwright。

改动前后各跑一次，逐属性对比：

```
probes: 99   properties compared: 56034   differences: 0
```

抽出来的是 4 行，不是 review §3.3 说的 5 行：

```css
.cg-panel {
    background: var(--cg-panel);
    border: 1px solid var(--cg-stroke);
    backdrop-filter: var(--cg-blur);
    box-shadow: var(--cg-shadow), var(--cg-inset);
}
.cg-panel-dense {
    background: var(--cg-panel-dense);
}
```

`color: var(--cg-icon)` **故意没进去**：六个重复点里只有 `.amb-pill` 和 `.moment-card` 自己写了这一行，`.amb-panel` / `.music-bar` / `.chat-card` 是继承 `body` 的 `--glass-text` 的。而 `--cg-icon`（`#eee3d2`）和 `--glass-text`（随 mood，如 `#212c48`）是两个值 —— 折进原子类会把那三个面板的文字色改掉。所以 `color` 留在原处。

`.cg-panel-dense` 必须排在 `.cg-panel` 之后：两者选择器权重相同（0-1-0），靠**后来居上**让 dense 的底色赢。这一点写进了 CSS 注释，免得以后有人调顺序。

落点（5 处）与没落点（2 处）：

| 元素            | 处理                                                  |
| --------------- | ----------------------------------------------------- |
| `.amb-pill`     | `className="amb-pill cg-panel"`，样式串里删 4 行 + 多余的 `border:0` |
| `.amb-panel`    | `className="amb-panel cg-panel"`                      |
| `.moment-card`  | `className="moment-card cg-panel"`                    |
| `.music-bar`    | `className="music-bar cg-panel cg-panel-dense"`       |
| `.chat-card`    | `className="chat-card cg-panel cg-panel-dense"`       |
| `.amb-tab`      | **不动** —— 它 `border-top:0` 且没有 `box-shadow`，套上原子类要再写两条覆盖，不划算 |
| `.room-handle`（`rail.tsx`） | **不动** —— 本次任务只点名 ambience / floaters / chat-card 三个组件；它的底色也是写死的 `rgba(67,68,91,0.8)` 而不是 `--cg-panel` |

`FloaterStyles` / `CalClockStyles` 各挂两份 `<style>` 的问题（review §3.3 末段）**没处理**，那是组件挂载方式的事，不在本轮。

### 4.2 全局 reset 合并（B5）：30 探针 × 16980 条属性，差异 0

`scratchpad/refactor-shell/reset-dump.mjs` 按 `main.tsx` 的真实加载顺序（`index.css` → `cinnaglass.css`）渲染 `html` / `body` / `#root` / `div::before` 加 26 个 reset 会碰到的元素（`h1 p ul ol li img svg video canvas a button input select textarea figure blockquote dl dd menu` 以及 `.paper .glass .modal .stage`），dump 全部计算属性。

```
probes: 30   properties compared: 16980   differences: 0
```

逐条比对结果与处置：

| 声明                                      | `index.css`                 | `cinnaglass.css`              | 处置                                                                                           |
| ----------------------------------------- | --------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `box-sizing: border-box`                  | `*, ::before, ::after`      | `*`                           | 留 `index.css`（它的选择器更全，多盖伪元素），删 cinnaglass 的                                 |
| `-webkit-tap-highlight-color: transparent` | 无                          | `*`                           | **搬到 `index.css`**，并入那条 `*, ::before, ::after`。该属性是继承属性，伪元素本来就会继承，写不写一个样 —— 合进去只是为了少一条选择器 |
| `margin: 0`                               | `body`                      | `html, body`                  | `index.css` 改成 `html, body { margin: 0 }`，删 cinnaglass 的                                  |
| `-webkit-font-smoothing: antialiased`     | `:root`（继承下来）         | `body`                        | 删 cinnaglass 的重复声明                                                                       |
| `min-width: 320px`                        | `body`                      | 无                            | 留在 `index.css`                                                                               |
| **`overflow: hidden`**                    | 无                          | `html, body`                  | **不冲突**，留在 cinnaglass —— 这是"本主题是个不滚动的全屏 app"，不是 reset                    |
| **`background: var(--navy-2)`**           | 无                          | `html, body`                  | **不冲突**，留在 cinnaglass —— 用的是主题 token                                                |
| `height: 100%`                            | 无                          | `html, body`                  | 同上，留 cinnaglass                                                                            |
| `font-family`                             | `:root` Segoe UI 栈         | `body` Noto Sans SC 栈        | **两者都留** —— `body` 那条对页面内所有元素生效，`:root` 那条只对 `html` 生效。删掉 `:root` 那条会改掉 `html` 的计算值，虽然看不见，但不是"保持最终生效值不变" |

边界重新写进两个文件的头注释：reset 归 `index.css` 独家；主题可以说"我的 app 壳长什么样"，但不能重复一遍 reset 已经做过的事。

### 4.3 / 4.4 运行时验证

没有 `.env.local`，直接开 `pnpm dev` 会在 `src/lib/supabase.ts:3` 的环境变量断言上整页崩掉（这是既有行为，不是本次改动引入的），所以分两步：

**(a) 原样起服务，`http://localhost:5173/login`** —— 控制台只有那一条既有的 `Missing required environment variable: VITE_SUPABASE_URL`，没有任何别的报错；网络面板 **90 个模块请求全部 200**，含全部 7 个新文件。这条同时是 **B7 路径替换的运行时兜底**：真有一条路径写错，dev server 会直接 404。

**(b) 用假环境变量起服务**（`VITE_SUPABASE_URL=http://127.0.0.1:59999 VITE_SUPABASE_ANON_KEY=dummy pnpm dev`，走 shell 环境注入，**没有新建任何 `.env` 文件**），端口 5174：

1. `/login` 完整渲染，**控制台 0 条 error / 0 条 warning**（截图见会话）。这验证了 B5 合并后的 reset 没有动到登录壳。
2. 在页面控制台里 `import('/src/pages/WorldPage.tsx')` 并 `createRoot` 挂载（`StrictMode` 下）：
    - 组件挂载成功，`useWorldSession` 跑完 `getMyWorld()` → 拿到"未登录，无法进入世界" → 渲染出大厅的错误卡与"重试"按钮；
    - `window.onerror` / `unhandledrejection` 收集器全程 **0 条**；
    - 四片 localStorage 在挂载后都写好了：`ow-dates-v1` / `ow-alarms-v1` / `ow-profile-v1` / `ow-widgets-v1`（后者写入了全量默认 map）。
3. 把世界内的浮层与弹窗**直接挂载**（`Rail` / `Ambience` / `MomentCard` / `MusicMini` / `RoomHandle` / `ChatCard` / `WorldSurfaces`）喂假 props —— 全部正常渲染，玻璃材质正确（`.cg-panel` 生效），0 报错。PA-032 的三个用例：

    | 输入                                   | `MomentCard`              | `CalendarScreen` 卡片                              | 月历标红 |
    | -------------------------------------- | ------------------------- | -------------------------------------------------- | -------- |
    | `anniv='2025-06-04'`（今天 2026-09-19） | 在一起 473 天 / 还有 258 天 | 在一起满 2 周年 · 2027.6.4 / **258 天**             | 9 月无   |
    | `anniv='2024-09-25'`                   | 在一起 725 天 / 还有 6 天  | 在一起满 2 周年 · **2026.9.25** / **6 天**          | **25 号** |
    | `anniv=null`                           | 整张卡不渲染              | 「纪念日 / 还没有设置 · 去世界设置里填一个吧」，月历照常 | 无       |
    | `anniv='not-a-date'`                   | 整张卡不渲染              | （同 null）                                        | 无       |

    第二行就是 bug 修复的直接证据：**两处的倒数都是 6 天，都跟着 `2024-09-25` 走了**；换在旧代码里，日历那格会是"2027.6.4 / 258 天"。

4. 用一个探针组件把三个 hook 单独驱动了一遍（0 报错）：
    - `useSurfaceRouter`：`?surface=photos` 初值生效且 `tab='photos'`；`onRail('photos')` 记下 `source:'rail'` 的 origin；`onRail('calendar')` 只换 `screen`、`tab` 变 `null`、**origin 不动**（与旧 `navigate()` 一致）；`onRail('chat'|'music')` 各回调一次、不碰 `screen`；`onHotspot({id:'timeline',clientX:333,clientY:444})` 落到同一个 surface 且 origin `source:'object'`；`onHotspot({id:'clock'})` → `screen='clock'`；`close()` → `null`。
    - `useWorldChatBubble`：她发消息+两面都关 → `unread=true` 且气泡文案 `'晚安'`；开聊天卡 → `false`；开会话窗 → `false`；最后一条是我发的 → `false`。四种组合与 §2.1 的推导一致。
    - `usePersistedState`：`setV({n:42})` 后 `localStorage['probe-key-v1'] === '{"n":42}'`（测完已清掉这个 key）。

    > 这些写入都发生在 `localhost:5174`，与你平时用的 `localhost:5173` 是不同源，**没有动到你真实的 dev 数据**。

验证结束后 dev server 已关闭，5173 / 5174 均无监听、无 `vite` 进程残留。

### 4.5 逐字搬运

S1 / S3 / S6 以及 `useWorldChatBubble` 的气泡 effect 是逐字搬的（`mapWmo` 的 8 个分支、`MANUAL_WX` 的 4 个档位、fetch 的 URL 与 `{timeout:6500, maximumAge:6e5}`、7000ms 兜底、40 分钟重签、`getProfilesByIds` 的 `otherId` 推断、五个弹窗的每一个 prop）。行为有变的地方全在 §5 列出，没有第六处。

---

## 5. 行为变化清单（除 PA-032 外，共 4 条，都很小）

| #   | 变化                                                                                                                                                                 | 影响                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | **天气：手动档位 → 实况 时，不再残留手动读数。** 旧的把手动值写进同一个 state，切回"实况"后要等定位+请求回来（最长 7 秒，定位被拒就是满 7 秒）才换掉；现在切回实况立刻显示上一次的实况读数（或默认的多云 22°），再被新结果覆盖。 | 只在「手动 → 实况」这一步看得见，且新行为更对。派生写法的副产物（§2.1）。                                                                  |
| V2  | **widgets 的 localStorage 在挂载时就写一次。** 旧的只在用户第一次拨开关时才写 `ow-widgets-v1`；现在 `usePersistedState` 的回写 effect 在挂载后立刻写入合并好的默认 map。 | 读取侧完全等价（`loadWidgets` 本来就是"存的盖在全开默认上"）。唯一区别是从没碰过开关的用户，localStorage 里会多出一条全 `true` 的记录。    |
| V3  | **世界图标路径换成另一张图时，旧图会多显示一会儿。** 旧的只在 `icon_path` 变成 `null` 时清空 URL；改成派生后，`null` 一样立刻清空，但「A 图 → B 图」的过渡期会继续显示 A 的签名 URL 直到 B 签好。 | 旧代码在「A → B」时本来就显示 A（它只在 `!iconPath` 时清空）；真正变的是「B → null → B」这一串里的最后一步会短暂显示上一次的 URL。世界图标只在世界设置里改，几乎碰不到。 |
| V4  | **`daysSince` 对未来日期返回 1 而不是 0。** `profile.ts` 的实现带 `Math.max(1, …)`。                                                                                  | 只在把纪念日填成未来日期时出现，"在一起 1 天"。                                                                                            |

`Weather.kind`（B6）从 `string` 收窄成 `'sun' | 'cloud' | 'rain' | 'snow'`，联合类型定义在 `model.ts`，`room-scene.tsx` 改成 `export type { WeatherKind }` 的再导出（它原来自己写 `= string`）。`tsc -b` 一次通过，说明现有消费者（`calendar.tsx:332` 的四元图标三元链、`room-scene.tsx` 的 `toRoomWeather`、`WorldPage` 的 `weatherKind` prop）本来就只用这四个值 —— **没有查出任何越界赋值**。`MANUAL_WX` 顺手收成 `Record<Exclude<WeatherTweak,'auto'>, …>`，以后 `WeatherTweak` 加一档会在这里报编译错。运行时行为零变化。

---

## 6. B7：import 路径统一

约定（已写进 `ai/project-audit/CONVENTIONS.md`，从「待讨论」升为「已采纳」）：**全 `src` 一律 `@/…`，TS/TSX 不带扩展名。** 三条细则：指向 `<目录>/index.ts(x)` 的写目录名（`@/utils` 而不是 `@/utils/index`）；`.css` 与 `image-slot.js` 保留扩展名（它们不是 TS 模块）；npm 包名不动。

机械替换 **212 处 / 62 文件**，脚本按 tsconfig 的 `@/*` 别名真实解析每个说明符再回写（解析不到的原样留下，跑完确认 `src` 里已无相对路径 import）。完整改写清单在 `scratchpad/refactor-shell/b7-rewrites.txt`。

兜底：`tsc -b` + `vite build` + dev server 下 90 个模块请求全 200。`tsconfig.app.json` 的 `allowImportingTsExtensions` 保留着（现在没人用了，但删它是另一件事）。

副作用：`calendar.tsx` 与 `journal-turn-controller.ts` 的 import 行变长后超过 120 列，对这两个文件跑了 `prettier --write`（`journal-turn-controller.ts` 只有格式变化，+6/-1 行）。

---

## 7. 未验证 / 遗留

**没能在真实应用里走一遍的（缺 `.env.local`，进不了世界）**：

1. `?enter=1` 的 AUTO_ENTER 路径、大厅 → 世界的真实进出（`enterWorld` / `createAndEnter` 走到 DB）。
2. 裸 Enter 开聊天卡、以及「弹窗开着时 Enter 不触发场景快捷键」这条 layer gate —— 这段 effect 留在 `WorldPage` 里**一行没改**，但没在真应用里按过键。
3. 家具热点：`useSurfaceRouter.onHotspot` 的逻辑用探针验过了，但**从 Pixi 场景里真点一下家具**没验（`RoomScene` 需要世界）。
4. `leaveRoom()` 的三个副作用连起来（退出世界 → 弹窗关 + 聊天卡关）。
5. 世界设置改名保存 → `onWorldSaved` → rail/卡片文案立刻变。
6. 刷新页面后 events/alarms/profile/widgets 还在（`usePersistedState` 的写入验过了，**回读没验**）。
7. `scripts/check-navigation.mjs` / `check-diary.mjs` 两个现成 e2e **没跑** —— 它们要 `DIARY_NODE_MODULES` 指向一份带 playwright 的 `node_modules`，本机没有，且它们本来也需要能进世界。
8. 三个 mood 下浮层的**截图**比对没做（做的是计算样式全量 dump，见 §4.1 —— 覆盖面比截图更严，但不覆盖"图片/字形渲染"这类非 CSS 因素）。

**留给后续的**：

- `WorldPage` 剩下的 ~75 行是 `useChatThreads` 22 个返回值 + `ChannelScreen` 30 个 props 的纯转发，要继续瘦身得先动 `chat-data.ts`（review R3：本轮不动）。
- `room-scene.tsx:141` 那条 unused eslint-disable warning 仍在（不在本轮范围）。
- `.amb-tab` 和 `rail.tsx` 的 `.room-handle` 还各自重复着玻璃声明的一部分，见 §4.1 的表。
- `FloaterStyles` / `CalClockStyles` 同屏时各挂两份 `<style>` 标签（review §3.3）。
- review 的 A 类清单（A1–A14）一条都没做，本轮只做 B 类。
