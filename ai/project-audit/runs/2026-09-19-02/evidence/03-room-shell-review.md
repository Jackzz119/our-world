# 03 · 分区 D：房间引擎与壳层呈现

> HEAD `f96fc63bb21725ab0f48d0ecb661f9e0fe4eac6d` · branch `dev` · 2026-09-19 · 诊断专用，未改任何业务文件。
> 证据等级：**实测** = 本机跑过命令/读了依赖源码得到的确定事实；**静态** = 只读代码推出的确定行为；**待验证** = 需要真机（DPR>1 / GPU / 网络时序）才能定量确认的推断。
> 运行限制：无 `.env.local`，进不了世界，所有"运行时"结论都是静态推演（见 §5）。

## 0. 覆盖

### 0.1 本分区拥有并全文阅读的文件（行数 = `wc -l`）

| 文件 | 行 | 读了什么 |
| --- | --- | --- |
| `src/themes/cinnaglass/room/compositor.ts` | 273 | 全文：装载、层树、applyRecipe、tick 顺序、可见性/减动效、cover-fit、handle |
| `src/themes/cinnaglass/room/textures.ts` | 181 | 全文：5 个离屏画布贴图工厂 + boxDownscale |
| `src/themes/cinnaglass/room/homography.ts` | 90 | 全文：3×3 射影、discCorners |
| `src/themes/cinnaglass/room/lighting.ts` | 185 | 全文：RECIPES / WEATHER_GRADE / createLightPass |
| `src/themes/cinnaglass/room/fade-queue.ts` | 43 | 全文 |
| `src/themes/cinnaglass/room/rain-layer.ts` | 174 | 全文 |
| `src/themes/cinnaglass/room/clock-layer.ts` | 65 | 全文 |
| `src/themes/cinnaglass/room/character-layer.ts` | 124 | 全文 |
| `src/themes/cinnaglass/room/affordance.ts` | 213 | 全文 |
| `src/themes/cinnaglass/room/turntable-prop.ts` | 254 | 全文 |
| `src/themes/cinnaglass/room/room-scene.tsx` | 270 | 全文 |
| `src/themes/cinnaglass/room/room-types.ts` | 183 | 全文 |
| `src/themes/cinnaglass/room/study-room.ts` | 117 | 全文 |
| `src/themes/cinnaglass/shell/rail.tsx` | 216 | 全文 |
| `src/themes/cinnaglass/shell/rail-icons.tsx` | 35 | 全文 |
| `src/themes/cinnaglass/shell/ambience.tsx` | 148 | 全文 |
| `src/themes/cinnaglass/shell/floaters.tsx` | 200 | 全文 |
| `src/themes/cinnaglass/shell/navigation-glass.css` | 514 | 全文（契约：变量、data-mood 选择器、z-index、backdrop-filter、死块） |
| `src/themes/cinnaglass/calendar.tsx` | 427 | 全文 |
| `src/themes/cinnaglass/music.tsx` | 286 | 全文 |
| `src/themes/cinnaglass/music-tracks.ts` | 41 | 全文 |
| `src/themes/cinnaglass/icons.tsx` | 348 | 头 60 行 + 导出清单（图标路径本身不审） |
| `src/themes/cinnaglass/cinnaglass.css` | 1002 | 全文（契约维度） |
| `src/themes/cinnaglass/materials.css` | 70 | 全文 |
| `src/index.css` | 91 | 全文 |
| `src/pages/WorldPage.tsx` | 361 | 全文（驱动房间的部分：widget 注册、Enter 门、RoomScene props、liveProfile、浮窗） |
| `src/pages/world/useWeather.ts` | 84 | 全文 |
| `src/pages/world/useLiveClock.ts` | 17 | 全文 |
| `src/pages/world/useSurfaceRouter.ts` | 64 | 全文 |
| `scripts/build-turntable-parts.py` | 477 | 只读 argparse / manifest 写出 / 产物命名（:348-473），未运行 |
| `scripts/fit-disc-ellipse.py` | 170 | 只读 argparse 与打印格式（:121-166），未运行 |

### 0.2 资源清单核对（`ls` + Pillow 读尺寸，实测）

| 模板引用（`study-room.ts` / `room-scene.tsx` / `rail.tsx` / `floaters.tsx` / `navigation-glass.css`） | 磁盘 | 尺寸 |
| --- | --- | --- |
| `/rooms/study/{golden,twilight,night}.png`（study-room.ts:14-18） | ✅ 3/3 | 1586×992 RGB，= `base`（:10） |
| `/rooms/study/parts/platter-{golden,twilight,night}.png`（:77-81） | ✅ 3/3 | 512×512 RGBA，= turntable-prop.ts:127 假定的 512 母版 |
| `/rooms/study/parts/platter-light-{add,mul}-{mood}.png`（:82-95） | ✅ 6/6 | 512×512 RGBA |
| `/rooms/study/parts/tonearm.png`（:96） | ✅ | 204×164 → `res = 204/102 = 2`（turntable-prop.ts:139） |
| `/rooms/study/parts/spindle-{mood}.png`（:98-105） | ✅ 3/3 | 36×44 → box 18×22 ×2 |
| `/characters/{blue-reading,pink-writing}-{open,closed}.png`（room-scene.tsx:15-24） | ✅ 4/4 | 1024×1024 RGBA |
| `/rooms/{study,gameroom,garden}/thumb.png`（rail.tsx:25-27） | ✅ 3/3 | study 400×250 |
| `/ui/nav/frost.webp`（navigation-glass.css:93）、`/ui/disc-cover.png`（floaters.tsx:98） | ✅ | — |

`public/rooms/**` 共 19 个文件（study 4 + parts 13 + gameroom 1 + garden 1），全部被引用；无多余、无缺失。冷加载体量：底图 7.3 MB + 角色 4.7 MB + 零件 1.3 MB ≈ **13.3 MB**，这是 D-02 / D-04 里"装载窗口"有几秒长的依据。

### 0.3 跨分区追读（只为契约，不评审）

`src/themes/cinnaglass/model.ts`（WeatherKind/Widgets）、`tweaks.ts`（Mood=RoomMood、WeatherTweak、`ow-tweaks-v1`）、`profile.ts`（daysSince/daysUntilAnniversary/PROFILE_DEFAULT）、`pages/world/usePersistedState.ts`、`shell/world-surfaces.tsx`、`shell/use-world-chat-bubble.ts`、`shell/chat-card.tsx:125,150`、`surfaces/object-surfaces.css:1-40`、`journal/diary.css:1-15`、`lobby.tsx` 与 `login-backdrop.tsx` 的 className（判定 `.scene-base/.wx-*` 等是否死规则）、`main.tsx`（StrictMode 开着）、`eslint.config.js`、`arts/rooms/study/generated/README.md` + `turntable.json`、`ai/design_system/scene.md` / `props.md:18` / `research/living-props.md:41`。
依赖源码（实测读取）：`pixi.js@8.19` 的 `AbstractRenderer.mjs:152-160`、`ViewSystem.mjs:63-66`、`TextureSource.mjs resize()`、`Texture.mjs:60-66,164-166`、`textureFrom.mjs:22-43`、`Container.mjs destroy()`、`Application.mjs destroy()`、`ResizePlugin.mjs:42-58`、`TickerPlugin.mjs:28`、`Ticker.mjs:421-435`、`Loader.mjs:170-201`、`loadTextures.mjs:21`、`EventSystem.mjs:323-336,526`、`EventBoundary.mjs:351-359`、`TextureGCSystem.mjs:103-118`；`eslint-plugin-react-hooks@7.0.1` 的 recommended 规则表。

工具实测：`npx eslint`（全部本分区文件：0 error / 1 warning = room-scene.tsx:141 **未使用的 eslint-disable**）；`npx eslint --no-inline-config`（看被压掉的告警：music.tsx 3 条 exhaustive-deps、floaters.tsx 1 条，room-scene **0 条**）；`npx tsc -p tsconfig.app.json --noEmit` 通过（PA-016 的阻断已修）。

## 1. 层次图与生命周期

### 1.1 层次（谁拥有谁）

```
WorldPage (React)                                   src/pages/WorldPage.tsx
 ├─ useTweaks → t.mood / t.weather (localStorage ow-tweaks-v1)
 ├─ useWeather(t.weather) → Weather.kind (sun|cloud|rain|snow)
 ├─ useSurfaceRouter → screen / onRail / onHotspot
 ├─ <div.app data-mood data-glass> <div.stage data-reading>
 │    ├─ <RoomScene mood weatherKind onHotspot presence bubble active>   room/room-scene.tsx
 │    │    ├─ Application（一个组件生命一次，:82-98）→ canvas 挂进 holder
 │    │    ├─ buildScene(...) → SceneHandle（:99-108）              room/compositor.ts
 │    │    │    root ← world ← [base×3, turntable×4 层, rain, clock, characters, hit, sparks]  + light
 │    │    │    world.filters = [AdjustmentFilter]（:128-129）
 │    │    ├─ ResizeObserver(holder) → app.resize(); scene.resize()（:112-116）
 │    │    └─ setInterval 600ms → getSeatScreenPos → setTagPos → DOM 胶囊/气泡（:119-128）
 │    ├─ <Rail> <Ambience> <MomentCard> <MusicMini→MusicPlayer> <RoomHandle> <ChatCard>
 │    ├─ <WorldSurfaces>（Calendar/Clock/Settings/WorldSettings + SubScreen）
 │    └─ <ChannelScreen>
```

引擎内部四层（按第三步要求的"游戏引擎"视角）：
- **资源层**：`Assets.load`（compositor.ts:82、turntable-prop.ts:109）、离屏画布贴图（textures.ts）、贴图退休队列（turntable-prop.ts:79-88）。
- **场景/实体层**：九个模块各建自己的 Container 并交回，compositor 决定叠放顺序（:88-125）。模块间不互相 import（只共享 `room` 模板与 `LightRecipe`），这一点核实成立。
- **系统层**：唯一的 ticker 回调 `tick`（:170-198），顺序 fades → rain → characters → clock → light → turntable → affordance；`FadeQueue` 是唯一的补间跑者。
- **输入层**：affordance.ts:86-110 的 Pixi 指针事件（zone `eventMode='static'` + `hitArea`）；DOM 侧是 WorldPage:163-173 的 Enter 门、rail.tsx:54-71 的 Escape/外点关闭。

### 1.2 生命周期（每步 file:line）

| 步 | 发生什么 | 位置 |
| --- | --- | --- |
| mount | `useEffect([])` 起异步 IIFE：`new Application()`、`await init({resizeTo: holder, resolution: min(dpr,2), autoDensity})` | room-scene.tsx:71-89 |
| init 后 | `if (disposed) { a.destroy(true); return }`；否则 `app = a; appRef.current = a; holder.appendChild(a.canvas)` —— **canvas 在场景建成前就挂上** | :90-98 |
| load | `buildScene(a, STUDY_ROOM, CHARACTERS, moodRef.current, toRoomWeather(weatherRef.current), cb)` → `Assets.load(3 底图 + 4 角色)` → 建树 → `createTurntable` 再 `Assets.load(13 零件)` → rain/clock/characters/affordance → filter → `maxFPS=30; ticker.add(tick)` → 可见性监听 → `resize()` → `applyRecipe(false)` → 返回 handle | compositor.ts:65-272；turntable-prop.ts:49-222 |
| ready | `if (disposed) return; sceneRef.current = scene;` RO 开始观察；600ms 胶囊轮询 | room-scene.tsx:107-128 |
| tick | `dt = min(deltaMS,100)/1000`；七个 update；TickerPlugin 的 `render` 在 LOW 优先级之后跑（TickerPlugin.mjs:28）→ 顺序正确 | compositor.ts:170-201 |
| prop 变更 | `[mood]` / `[weatherKind]` effect → `sceneRef.current?.setMood/setWeather(…, true)`（scene 未就绪时静默跳过，见 D-02）；`[active]` → `app.start()/stop()`（appRef 未就绪时跳过） | room-scene.tsx:150-167 |
| 可见性 | `document.hidden ? app.stop() : app.start()`（不看 `active`，见 D-07） | compositor.ts:205-209 |
| resize | RO → `a.resize()`（ResizePlugin 内含一次 `render()`）→ `scene.resize()`（cover-fit + `turntable.refit`）→ 下一 tick 才把新布局画出来（D-16） | room-scene.tsx:112-116；compositor.ts:225-233 |
| unmount | `disposed = true; clearInterval; ro.disconnect(); sceneRef.destroy()（ticker.remove + 可见性监听 + turntable runner）；if (app) app.destroy(true, {children:true, texture:false})` | room-scene.tsx:131-139；compositor.ts:267-271 |

### 1.3 StrictMode 双跑推演（`main.tsx:10` 开着 StrictMode，React 19 dev 会 mount→unmount→mount）

1. effect#1 跑：`disposed=false`，IIFE 开始 `new Application()`，`await a.init()` 挂起。
2. React 立刻跑 cleanup#1：`disposed=true`；`tagTimer=0` 清空无害；`ro` null；`sceneRef` null；**`app` 仍是 null**（:94 尚未执行）→ 不 destroy。
3. effect#2 跑：第二个 Application 开始 init。
4. app#1 的 `init` 完成 → `if (disposed) { a.destroy(true); return; }`（:90-93）→ WebGL 上下文释放、canvas 从未挂载。ResizePlugin 在 `resizeTo` setter 时加的 `window resize` 监听随 destroy 移除。
5. app#2 正常走完。

结论：**StrictMode 下不会双 Application 泄漏**，代码 :77-79 的注释所述是对的（静态）。但同一段代码在**真实卸载发生于装载中**时会炸，见 D-04 —— 因为那时 `app` 已经在 :94 被赋值。

## 2. 契约表

| 契约 | 定义处 | 消费处 | 差异 / 结论 |
| --- | --- | --- | --- |
| `RoomTemplate.base` | room-types.ts:162 | compositor.ts:73（cover-fit）、lighting.ts:119（wash 尺寸） | 与三张底图 1586×992 一致 ✅ |
| `RoomTemplate.art` + `moodFallback` | :164-166 | compositor.ts:80,152（`resolveRoomArt`）；turntable-prop.ts:143-146 | 三档都有图，fallback 链实际不触发；`resolveRoomArt` 只在**全无**时抛错 ✅ |
| `window.panes / glow` | :110-118 | rain-layer.ts:56,94-98；lighting.ts:138-139 | 只用这两字段 ✅ |
| `clock` | :103-108 | clock-layer.ts:19-22 | ✅ |
| `seats[].foot/height/phase/headRatio` | :120-137 | character-layer.ts:56-75；compositor.ts:251-262 | `headRatio` 只被 `getSeatScreenPos` 用 ✅ |
| `hotspots[].id` | study-room.ts:56-62 = `timeline photos clock music wishlist` | useSurfaceRouter.ts:47-52 五个全接；`props.md:18` 声明 study-room.ts 为真源 | ✅ 完整映射；`calendar` 只有 rail 入口、`clock` 只有热点入口（设计如此） |
| `props.turntable`（14 字段） | :55-96 | turntable-prop.ts:56-67 全部解构 | ✅；`stills` 未提供走默认 `[]` |
| `HotspotOpenEvent{id,clientX,clientY}` | :153-157 | affordance.ts:110 发 → room-scene.tsx:105 转 ref → WorldPage:233 → useSurfaceRouter:47-52 | `clientX/Y` 来自 Pixi `FederatedPointerEvent`（有该 getter）✅；空值：`onHotspot` 可选，未传即静默 ✅ |
| `SceneHandle` | compositor.ts:45-52 | room-scene.tsx:108-139 | `resize` 只被 RO 用；`getSeatScreenPos` 返回 stage 逻辑 px（toGlobal）✅ |
| `RoomMood` = `Mood` | room-types.ts:7；tweaks.ts:28 别名 | Ambience MOODS（:20-24）、`data-mood`（WorldPage:217）、CSS `[data-mood=…]`（cinnaglass.css:209-298、navigation-glass.css:21-39） | ✅ 一套枚举；navigation-glass.css:40-50 的 `day/morning` 块自述"inert"= 死规则（D-14） |
| 天气：`WeatherTweak`(auto\|sun\|cloud\|rain\|snow) → `WeatherKind`(sun\|cloud\|rain\|snow) → `RoomWeather`(sun\|rain) | tweaks.ts:33 → useWeather.ts:11-29 → room-scene.tsx:55 `toRoomWeather` | Ambience 只暴露 auto/sun/rain（:25-29）；settings.tsx 不暴露天气 | 收窄点唯一（room-scene.tsx:55）✅；持久化里若残留 `cloud/snow`（旧版本）pill 落到 ICloud 且无按钮高亮，无害 |
| `WEATHER_GRADE` / `RECIPES` | lighting.ts:30-103 | compositor.ts:135,143-150 | 三档×两天气全表 ✅；sun 档 grade 为恒等 (1,1)（D-06） |
| Widget 键 | WorldPage:47-48 `days minimap` / `memory anniv ambient music lighting` | rail.tsx:32-36 `anniv music presence`；WorldPage:275-280 只读 `anniv/music` | **不一致**（D-10）：`presence` 可切换但无消费者；5 个死键写进 `ow-widgets-v1` |
| Rail 键 | rail.tsx:14 | useSurfaceRouter.ts:39-45 | `rooms/modules` 内部；`shop` disabled；其余五个全接 ✅ |
| Pixi→React 回调坐标 | affordance.ts:110 `event.clientX` | useSurfaceRouter.ts:49 `{x,y,source:'object'}` → SubScreen 从该点长出 | ✅ |
| 纪念日 | DB `worlds.anniversary`（types/feed.ts:32，可 null）→ WorldPage:195 `world?.anniversary ?? profile.anniv` → `MomentCard.anniv` / `WorldSurfaces.anniv` | floaters.tsx:30-33 `daysSince/daysUntilAnniversary`；calendar.tsx:156-159 `daysUntilAnniversary` | 计算已单源（profile.ts:106-128）✅；**空值回退到种子日期 `2025-06-04`**（D-09） |
| CSS 变量（定义 → 消费） | cinnaglass.css:7-142、materials.css:3-16、navigation-glass.css:3-13 | 组件 `<style>` 与 css | 零消费者：`--rail-candy-border --stage-vignette --stage-chrome-dim --glass-glow --cg-highlight-blue --cg-placeholder --cg-sel-edge --cg-green --sky-1 --sky-3 --navy-1 --navy-deep`（D-14） |
| `data-*` 由 TSX 驱动 | `data-mood/data-glass`（WorldPage:217）、`data-reading`（:224）、`data-wx`（仅 login-backdrop.tsx:489）、`data-nav-key/data-pressed`（rail.tsx:87-88） | cinnaglass.css、object-surfaces.css:12-17、navigation-glass.css:153,211 | ✅ 全部有对应选择器；`.wx-*`/`.scene-base`/`.mood-*` 由登录页与大厅消费，**不是死规则** |
| z-index 阶梯 | 见 D-15 表 | — | 无单一真源；浮窗高于弹窗 scrim |
| localStorage 键 | `ow-tweaks-v1`（tweaks.ts:47）、`ow-profile-v1 / ow-widgets-v1 / ow-dates-v1 / ow-alarms-v1`（WorldPage:105-108）、`ow-music-v1`（music.tsx:12,89；floaters.tsx:81 只读） | — | `ow-widgets-v1` 在 WorldPage:56 绕过 `lib/local-store` 直读（D-18）；`ow-music-v1` 一写两读、无共享状态（D-12） |
| manifest ↔ 模板 | `arts/rooms/study/generated/turntable.json` | study-room.ts:69-105 | 见 §7，数值逐项相等 ✅ |

## 3. 发现

### D-01 · HiDPI 下 cover-fit 把逻辑宽高再除了一次 resolution — P1

- **位置**：compositor.ts:226-227 `const w = app.renderer.width / app.renderer.resolution`。
- **事实（实测读 pixi 源码）**：v8 的 `renderer.width` = `view.texture.frame.width`（AbstractRenderer.mjs:152-154）；`ViewSystem.resize` 把 `screen.width = texture.frame.width`（ViewSystem.mjs:63-66），而 `TextureSource.resize` 令 `this.width = newPixelWidth / resolution`（逻辑 px）、`pixelWidth` 才是物理 px；`Texture.update()` 在 `noFrame` 时 `frame.width = source.width`（Texture.mjs:164-166）。所以 **`renderer.width` 在 v8 已经是 CSS/逻辑 px**（JSDoc "actual number of pixels" 是 v7 遗留）。
- **触发条件**：`resolution = min(devicePixelRatio, 2) > 1`（room-scene.tsx:87）——Windows 125%/150% 缩放、所有 Retina 屏。
- **影响**：`s` 缩小到 1/dpr，房间只占画布左上一块（`root.position` 仍按小 w/h 居中）；热点、胶囊、气泡全体随 root 走所以"内部一致"，但四周露出 `--app-ground` 渐变。DPR=1 的机器（本机、headless 截图、第二步的像素比对）完全看不出来——这解释了为什么至今无人报告。
- **证据等级**：静态（源码链完整）；视觉结果**待验证**（需 DPR>1 真机或 `--force-device-scale-factor=2`）。
- **改法与代价**：改为 `app.renderer.screen.width / .height`（或 `app.canvas.clientWidth`），一行；`refit(2*rx*s*resolution)`（:232）保持不变即对。代价≈0。
- **验收**：DPR 1 / 1.25 / 2 三档 `window.__owApp.stage.children[0].scale.x` 相同（同尺寸 holder）；房间铺满 holder；胶囊落在头顶。

### D-02 · 装载期间到达的 mood / 天气变更被丢弃 — P1

- **位置**：room-scene.tsx:99-108（`buildScene` 用调用瞬间的 `moodRef/weatherRef`）；:150-156 的 `[mood]/[weatherKind]` effect 在 `sceneRef.current` 为 null 时**静默跳过**；:107-108 场景就绪后没有回填。
- **触发条件**：`useWeather('auto')` 先返回 `OVERCAST`（useWeather.ts:31,37），再经定位 + open-meteo 异步改成实况（:39-80，最长 7s）；与此同时 `buildScene` 正在 `Assets.load` 13 MB（§0.2）。两者谁先完成看网络；实况先到则丢。
- **影响**：默认 `weather:'auto'`（tweaks.ts:53）的用户，外面下雨、屋里晴——直到下次天气值变化（可能整个会话都不再变）。mood 同理（用户在装载的两三秒内点了氛围面板）。
- **证据等级**：静态（时序竞争确定存在）；发生频率待验证。
- **改法**：`sceneRef.current = scene` 之后立刻 `scene.setMood(moodRef.current, false); scene.setWeather(toRoomWeather(weatherRef.current), false)`（handle 内部对重复值早退，:240-249，所以无副作用）。两行。
- **验收**：把 `Assets.load` 人为延迟 5s（devtools 限速），auto 天气为 rain → 场景出现即下雨。

### D-03 · 任一贴图 404 = 整间房静默空白 — P1

- **位置**：compositor.ts:82 / turntable-prop.ts:109 用 `Assets.load` 默认策略；`Loader.defaultOptions.strategy = 'throw'`（Loader.mjs:221）；`loadTextures.mjs:21` 对 `!response.ok` 抛错 → `Assets.load` reject → `buildScene` reject → room-scene.tsx:81-129 的 IIFE **没有 catch**。
- **影响**：canvas 已在 :98 挂上（透明），`appRef` 已设，`sceneRef` 永远 null；用户看到一块 `--app-ground` 渐变，没有任何提示；控制台一条 unhandled rejection；`[active]` effect 还会对这个空 app start/stop。一张 `spindle-night.png` 缺失就能让整个世界不可用——而零件与底图的重要性显然不同。
- **证据等级**：静态。
- **改法**：(a) IIFE 加 try/catch → `logman` 记 `[Room][Web][RoomScene]` + 把 canvas 移除并给 WorldPage 一个 `onSceneError`（显示大厅那种静态背景或"重试"）；(b) 零件用 `Assets.load(urls, { strategy: 'skip', onError })`（Loader 支持 :170-201），缺零件降级为"唱片机不动"（`createTurntable` 返回 null）。代价：中（新增一条错误通路）。
- **验收**：改名一张 parts PNG → 房间照常、唱片机静止、日志一条；改名 `golden.png` → 有可见错误态而非空白。

### D-04 · 装载中卸载：Application 被销毁后 buildScene 继续跑 → TypeError — P1

- **位置**：room-scene.tsx:94 `app = a` 在 `buildScene`（:99）**之前**；cleanup :137 `if (app) app.destroy(true, …)`；随后 `Assets.load` 返回，compositor.ts:89 `app.stage.addChild(root)`（`stage` 已被 `Application.destroy` 置 null，Application.mjs destroy）→ TypeError；即使越过，turntable-prop.ts:88 `app.renderer.runners`（renderer 已 null）同炸。:107 的 `if (disposed) return` 来不及。
- **触发条件**：用户在进入世界后的装载窗口内点"回大厅"（rail.tsx:172 → WorldPage:210-214 → `inWorld=false` → RoomScene 卸载）、路由离开、或 Suspense 边界重挂。StrictMode **不触发**（§1.3）。
- **影响**：unhandled rejection；无泄漏（app 已 destroy），但 `Assets` 里的下载继续完成（可接受）。
- **证据等级**：静态。
- **改法**：把"取消"传进 `buildScene`（`{ isDisposed: () => boolean }` 或 `AbortSignal`），在两次 `await Assets.load` 之后各查一次并 `return null`；或 cleanup 里 `await building` 再 destroy。代价：小。
- **验收**：进世界 100ms 内点回大厅 → 控制台无错；`__owApp` 为 null；反复 20 次 `performance.memory` 不增。

### D-05 · 每次切氛围/天气泄漏 2–3 张离屏画布贴图（Pixi Cache 持有） — P2

- **位置**：lighting.ts:130,137,148 每次 `apply` 都 `build()` 新光照层，内部 `linearGradientTexture`/`radialGradientTexture` 用 `Texture.from(canvas)`（textures.ts:23,42）；v8 `textureFrom` → `resourceToTexture` 会 `Cache.set(resource, texture)`（textureFrom.mjs:29-43），只有 `texture.destroy()` 才会 `Cache.remove`。旧层的销毁路径 `current.destroy({ children: true })`（lighting.ts:174）与 fade-queue.ts:37 都**不带 `texture: true`** → 贴图与 canvas 永驻。
- **量级**：sun 档 64²(16 KB)+256²(256 KB)，rain 档再 +256²；每次切换 ≈ 0.27–0.53 MB CPU 画布 + 对应 GPU 上传（TextureGC 3600 帧后只卸 GPU 侧，JS/Cache 侧不放）。另每次进世界 `sparkleTexture()`（affordance.ts:120）、`contactShadowTex`（character-layer.ts:54）各再入 Cache 一张。
- **证据等级**：静态（源码链确定）；实际增长曲线待验证（devtools heap）。
- **改法**：`Texture.from(c, true)`（skipCache）+ 光照层销毁时 `destroy({ children: true, texture: true, textureSource: true })`（这些贴图每层独占，安全）；sparkle/contact 贴图在 `SceneHandle.destroy()` 里显式 destroy。代价：小。
- **验收**：`Cache` 条目数（`pixi.js` 的 `Cache._cache.size`）在切 200 次后不变。

### D-06 · 晴天也在全屏跑一遍 AdjustmentFilter — P2

- **位置**：compositor.ts:128-129 `world.filters = [weatherFilter]` 常驻；sun 档 `WEATHER_GRADE = {saturation:1, brightness:1}`（lighting.ts:100-103）为恒等。Pixi 对带 filter 的容器每帧先把 `world` 渲进临时 RenderTexture 再过 shader —— 即 30fps × 全视口 × 两遍绘制，只为一个不改变任何像素的滤镜。
- **改法**：`applyRecipe` 里 `world.filters = weather === 'rain' ? [weatherFilter] : null`（或 `weatherFilter.enabled = false`）。grade 本来就是瞬切不补间（:146-147），所以视觉无差。
- **证据等级**：静态；GPU 时间节省待验证。**验收**：sun 档 `extract` 帧逐字节相同；devtools GPU 占用下降。

### D-07 · "30fps 常渲染"成立，且 start/stop 有三个互相不知情的开关 — P2

- **事实**：`maxFPS = 30`（compositor.ts:200）只是让 `Ticker.update` 在间隔不足时早退（Ticker.mjs:429-435），RAF 仍按屏幕刷新率排队；TickerPlugin 每个有效帧无条件 `render`（TickerPlugin.mjs:28），没有任何"脏"判断。静止画面（无雨、无 hover）也在每秒 30 次全场景绘制 + D-06 的滤镜。TODO R2 的"常渲染"线索 **成立**。
- **开关冲突**：① `onVisibility` 回到前台无条件 `app.start()`（:205-209），不看 `active`；② `[active]` effect（room-scene.tsx:162-167）只在 `active` 变化时跑；③ `reduced` 在 :214 `app.stop()` 后被 ①② 任一重新启动。场景："打开设置 → 切标签 → 切回" = 弹窗盖着、ticker 却在跑，直到用户再关开一次弹窗。
- **改法**：compositor 内一个 `setRunning()`：`running = visible && active && !reduced`，三处只改各自布尔再统一求值（这是 §4 里唯一值得加的"适配器"）；自适应帧率（活物 30 / 只剩秒针 12 / hover 60）留给 R2。
- **验收**：设置弹窗打开时切标签再切回，`app.ticker.started === false`。

### D-08 · prefers-reduced-motion 路径先渲染后布局，冻住的帧没有钟针 — P2

- **位置**：compositor.ts:210-215 `applyRecipe(false); app.render(); app.stop()` 执行在 `resize()`（:234）之前；钟针只在 tick 里画（clock-layer.ts:56-62 由 :186 调用），`rain.setRaining` 也只在 tick（:179）。RO 首次回调的 `a.resize()` 会再渲一帧（ResizePlugin.mjs:57-58）把布局救回来，但那一帧依旧没有钟针、没有雨。
- **改法**：把 reduced 块移到 :236 之后，先 `tick()` 一次再 `app.render()`；或干脆把 reduced 当"1fps 运行"而不是"冻结"。**验收**：devtools 模拟 reduce → 冻结帧钟针指向当前时间、布局铺满。

### D-09 · 世界没设纪念日时显示假的"在一起 N 天" — P2

- **位置**：WorldPage.tsx:195 `anniv: world?.anniversary ?? profile.anniv`；`worlds.anniversary` 可为 null（types/feed.ts:32）；`profile.anniv` 默认 `'2025-06-04'`（profile.ts:10）。null 经 `??` 落到种子日期 → `MomentCard` 的空值分支（floaters.tsx:30）与日历的"还没有设置"分支（calendar.tsx:250-255）**不可达**。`world-settings.tsx:112` 自己却正确地用 `?? ''`。
- **改法**：`anniv: world ? world.anniversary : profile.anniv`（有世界行就以 DB 为准，null 就是没设）；`onWorldSaved`（:205）同步改。**验收**：DB 置 null → 卡片消失、日历显示提示。

### D-10 · widget 注册表与 rail 开关不一致（已知线索：成立） — P2

- **位置**：WorldPage.tsx:47-48 vs rail.tsx:32-36；:275-280 只消费 `anniv/music`；`presence` 开关写入 `ow-widgets-v1` 后无人读（:235-243 永远传 presence）。五个死键 `days minimap memory ambient lighting` 每次都被写进存储。
- **改法**：一份 `WIDGET_DEFS`（key/label/required）放 model.ts，WorldPage 与 rail 共用；`presence={widgets.presence !== false ? {...} : undefined}`；`loadWidgets` 合并旧 blob 时丢弃未知键。**验收**：关"对方状态胶囊"→ 胶囊消失；存储只含 3 键。

### D-11 · Enter 门只排除 INPUT/TEXTAREA — P2

- **位置**：WorldPage.tsx:163-173。键盘用户 Tab 到 rail 按钮按 Enter：keydown 冒泡到 window → `setChatOpen(true)`，同一按键的 click 又执行按钮动作 → 聊天卡 + 设置弹窗同时打开。`contenteditable`、`<select>`、`<image-slot>`（自定义元素宿主，`activeElement` 是宿主）都不在白名单；`e.repeat` 未挡。
- **改法**：只在 `document.activeElement === document.body`（或 `!target.closest('button,input,textarea,select,[contenteditable],image-slot')`）且 `!e.repeat` 时开卡。**验收**：Tab 到"设置"按 Enter → 只开设置。

### D-12 · 音乐迷你条是假状态，真实契约需写清 — P2

- **真实契约**：`MusicPlayer`（music.tsx:77）独占 `playing/pos/muted/i`，只通过 `ow-music-v1` 落盘（:87-93，播放中**每秒写一次** localStorage），没有向上回调；`MusicMini`（floaters.tsx:67）只在 `open` 翻转时重读键取标题（:79-88），进度条固定 34%（:172-173），"播放/暂停"大按钮实际切的是展开态（:107-108），唱片旋转跟 `open` 不跟 `playing`（:97）。`MusicPlayer` 常驻只对"折叠"成立；关掉音乐 widget 会卸载它并 `ctx.close()`（music.tsx:174-183）——注释 :76-78 的承诺只对一半。另外 `muLoad()` 在每次渲染都 `JSON.parse`（:78）。曲目是 WebAudio 和弦配方（music-tracks.ts:8-40），**无外链、无授权问题**。
- **改法**：把 `playing/pos/i` 提到 `MusicMini`（或一个 `useMusicState` store），播放器与迷你条同源；大按钮真正 play/pause；进度条绑 `pos/dur`。或者在 R1 内明确标注"迷你条仅展开入口"并把假进度条去掉。**验收**：迷你条进度随播放推进；隐藏 widget 不断音（或文档明说会断）。

### D-13 · README 重跑命令缺必填 `--review` — P3

- `scripts/build-turntable-parts.py:355` `--review required=True`；`arts/rooms/study/generated/README.md` 的重跑命令没有它，照抄会直接 argparse 报错。补一行即可。

### D-14 · CSS 死变量 / 死块 / 重复字面量 — P3

- 零消费者变量（grep 全 `src` 除定义文件）：cinnaglass.css `--sky-1`(:9) `--sky-3`(:11) `--navy-1`(:15) `--navy-deep`(:17) `--cg-highlight-blue`(:29) `--cg-placeholder`(:30) `--cg-green`(:37) `--cg-sel-edge`(:40) `--rail-candy-border`(:107) `--stage-vignette`(:110) `--stage-chrome-dim`(:111) `--glass-glow`(:136，且 :315 在 `[data-mood]` 里再别名一次)。
- 自述 inert 的死块：navigation-glass.css:40-50（`day/morning`）。
- 重复字面量：room-scene.tsx:247-249 写死 `#73EF82` 而 `--cg-green` 正是它；:256,:261 `#F9ABBD` 与 `--cg-pink #faa6b9` 近似双源。
- 保留的（非死）：`.scene-base/.scene-ambient/.mood-*/.wx-*/.scrim-*`（lobby.tsx:157-202、login-backdrop.tsx:489-505 在用）；`.lobby-*`（lobby.tsx）。

### D-15 · z-index 没有单一阶梯；浮窗高于弹窗 scrim — P3（若产品要求弹窗独占则升 P2）

| z | 元素 | 位置 |
| --- | --- | --- |
| 0（DOM 序） | Pixi canvas（`.room-scene` absolute inset 0） | room-scene.tsx:170 |
| 20 / 21 | `.modal-scrim` / `.modal`（日历、时钟、设置、世界设置） | cinnaglass.css:520,536 |
| 22 / 23 | `.chsc-scrim` / `.chsc`（聊天大窗） | chat-hub.styles.tsx:9,12 |
| 30 / 41 | `.object-scrim` / `.object-surface`（日记、照片、心愿） | object-surfaces.css:24,31 |
| 35 | `.moment-card`、`.music-wrap` | floaters.tsx:128,151 |
| 36 | `.room-handle` | rail.tsx:200 |
| 38 | `.chat-card` | chat-card.tsx:150 |
| 40（fixed）/ 40 | `.rail-wrap` / `.amb-wrap`（内含 fixed `z:-1` 全屏 scrim） | navigation-glass.css:18；ambience.tsx:98,146 |

结论：日历/时钟/设置弹窗打开时，rail、氛围面板、纪念卡、音乐条、聊天卡都仍可点（scrim 只盖住 canvas）；只有 `data-reading`（日记）用 object-surfaces.css:12-17 把浮窗藏起来。`.amb-scrim` 因父级 `transform` 形成层叠上下文，实际盖住同为 z40 但 DOM 在前的 rail（点 rail 只会关面板）。建议在 uiux 文档定一张阶梯表，并决定浮窗是否应降到 scrim 之下。

### D-16 · resize 后第一帧是旧布局；轮询在停表时照跑 — P3

- room-scene.tsx:112-116 先 `a.resize()`（含一次 render，ResizePlugin.mjs:57-58）再 `scene.resize()` → 每次 RO 事件有一帧按旧 `root.scale` 画出来，下一 tick 才对；调换顺序或在 `scene.resize()` 后 `a.render()`。
- :128 的 600ms 轮询在 `app.stop()` 期间仍 `setTagPos`（后台标签页会被浏览器节流到 ≥1s）；小成本，可在 `active=false` 时暂停。

### D-17 · DOM 音乐条与 `music` 热点角落重叠 — P3

- 1440×900 下按 :222-230 算：热点屏幕区 x 764–1008 / y 679–843；音乐条 x 976–1413 / y 773–861。约 32×70 px 的角落被 DOM 盖住：指针进入时 canvas 收到 `pointerleave`→Pixi 转 `pointerout`（EventSystem.mjs:325,526）→ `hovered=false`，正确但会让"问候星光"在边界处闪。窄屏（uiux audit P1 已记录音乐条越界）会更明显。

### D-18 · 存储访问绕过约定 / 挂载即写 — P3

- WorldPage.tsx:56 直接 `localStorage.getItem('ow-widgets-v1')`，与 CONVENTIONS「localStorage 读写在 lib/local-store」不一致；usePersistedState.ts:14-16 首次渲染就把刚读出的值写回去（无害但多一次 I/O）。

### D-19 · 渲染期改 ref + 一条已无用的 eslint-disable — P3

- room-scene.tsx:68-69、:145-148 在组件函数体里 `xxxRef.current = prop`。React 19 并发渲染下渲染可被丢弃/重放，渲染期副作用是反模式（这里赋值幂等，实际风险低）。`:141` 的 `eslint-disable-next-line react-hooks/exhaustive-deps` 被 eslint 报为 **unused**（实测），可直接删。改法：`useEffect(() => { onHotspotRef.current = onHotspot })`；mood/weather 的初值改由 D-02 的回填承担后，`moodRef/weatherRef` 可以删除。

### 复核过、未列为发现的点

- fade 重入：`FadeQueue.start` 先按对象去重（fade-queue.ts:28）→ 中途再切氛围从当前 alpha 续补间；光照层第三次 apply 时上一层已带 kill 标记，不会残留容器 ✅。
- 雨层 `setRaining` 每帧调用但有 `fadeTarget` 守卫（rain-layer.ts:113-124）✅。
- 时钟：Pixi 每帧 `new Date()`（compositor.ts:186），`useLiveClock` 每秒 `Date.now()`，都读墙钟，无漂移 ✅。
- 输入：hit zone 是空 Container + `hitArea`，v8 `hitTestFn` 对有 `hitArea` 的容器直接返回 true（EventBoundary.mjs:351-359）✅；`cursor='pointer'` 由 EventSystem 写到 canvas style ✅；触摸：Pixi 把 touch 映射成 pointer，touchend 后浏览器补 pointerleave → hovered 复位（待真机验证）。
- 胶囊/气泡 `pointer-events: none`（room-scene.tsx:193,237）不挡热点 ✅。
- `dt` 上限 100 ms（:171）+ 唱臂弹簧 K=120/D=14 在该步长下稳定（turntable-prop.ts:21-25 注释成立）✓。
- `Assets` 缓存按 URL，离开世界不 unload：再次进入零下载；~19 MB GPU 常驻是接受的取舍（可在 R2 记"离开世界 N 分钟后 `Assets.unload`"）。
- `Sprite(undefined)` 走 `Texture.EMPTY` 默认参（Sprite.mjs:12）——只在 D-03 修成 skip 策略后才可能碰到，届时 character-layer.ts:59-60 需加缺图跳过。

## 4. 中间件 / 适配器判断

- **值得加的一个**：compositor 内的"运行门"`setRunning()`（D-07）——三个独立开关（可见性、`active`、`reduced`）都在改同一个 `app.ticker`，已经出现互相覆盖；十行代码，依赖方只有 room-scene 的 `[active]` effect 与 compositor 自己。不需要"场景热键管理器"：全局键只有 Enter（WorldPage:163）与 Escape（rail.tsx:56，且已用 capture + `stopImmediatePropagation` 解决了冲突），两处而已。
- **不值得加**：资源注册表。整个引擎只有一个 Application、两次 `Assets.load`（URL 缓存已由 Pixi 管）和 ~6 张离屏画布贴图；问题（D-05）是"谁负责 destroy"没写，不是"找不到资源"。把画布贴图的所有权写进各自的 build/destroy（lighting 层随层销毁；sparkle/contact 随 handle 销毁）即可，不需要新抽象。
- **需要但不是中间件**：`buildScene` 的取消信号（D-04）与错误通路（D-03）——这是接口补全。

## 5. 不适用与受限项

- **无法运行**：本机无 `.env.local`，进不了世界；所有"帧/内存/GPU"结论均为静态推断（D-01 视觉、D-05 增长曲线、D-06/D-07 的 GPU 时间、D-08 冻结帧、触摸 hover 复位）。
- **WebGL 上下文丢失**：项目无 `webglcontextlost` 处理；Pixi v8 的 GlContextSystem 自带 lost/restored 监听并在 `contextChange` 后重传贴图（源码可查），但离屏画布贴图与 PerspectiveMesh 的恢复是否完整**受限**（需真机 `WEBGL_lose_context` 触发验证）。
- **pixi-filters 失败**：`AdjustmentFilter` 静态 import；若 shader 编译失败会在首帧 render 抛错 → 出现在 ticker 回调里、每帧一次且无捕获。受限（无法构造）。
- **字体**：Pixi 层无文字，不适用；CSS 用 `Baloo 2`/`Noto Sans SC` 有系统回退，不在本分区。
- **backdrop-filter 叠 canvas 的合成开销**（TODO R2 提到）：`.cg-panel` 18px 模糊 ×4 面板 + rail 2.4px + 胶囊 12px + 弹窗 scrim 5px 全屏，canvas 30fps 更新意味着浏览器每帧都要重做这些模糊；量化受限。

## 6. 复核了的已知线索

| 线索 | 结论 | 证据 |
| --- | --- | --- |
| `room-scene.tsx` 的 eslint-disable：删掉会暴露"渲染期改 ref"错误 | **不成立（HEAD 状态）**：`npx eslint` 报该 directive **unused**；`--no-inline-config` 与强制 `--rule react-hooks/refs:error`（recommended 里本来就是 error）都对该文件 0 报告。渲染期改 ref 的代码确实存在（:68-69,:145-148）但当前规则不抓它 → 记 D-19 作代码卫生项，非阻断 | 实测 |
| WorldPage widget 键 vs rail `MODULE_DEFS` 不一致 | **成立**，且 `presence` 开关无消费者、5 个死键 | D-10，静态 |
| 纪念日单一真源（PA-032 已修） | **部分成立**：计算函数单源、`calendar.tsx` 不再硬编码 `ANNIV`（grep 无）、`WorldPage` 已传 `anniv`（:307）；但 null 回退到 `PROFILE_DEFAULT.anniv` 造成假日期（D-09）。"在一起 N 天"只在纪念卡显示（`daysSince` 以纪念日为第 1 天，profile.ts:112-117）；日历显示的是"满 N 周年 / 倒计时"，用同一 `daysUntilAnniversary`，两处口径一致 | 静态 |
| 30fps 常渲染（TODO R2 隐患） | **成立**，并追加三开关冲突 | D-07，实测读 Ticker/TickerPlugin 源码 |
| FINDINGS PA-016（`chat-card.tsx` Msg 导入 / `music.tsx:9` react-refresh）阻断 | **已修**：`tsc --noEmit` 通过，`eslint` 0 error | 实测 |
| FINDINGS PA-028 拆分"帧像素相同 ×10、运行时冒烟未做" | 缝合处复核：模块间无互相 import ✅；init 顺序（turntable 在 rain 之前加入 world，:107-113）与 tick 顺序（:176-197）与旧版注释一致；dispose 顺序 handle→app ✅。**新暴露的缝**：D-04（app 与 buildScene 的所有权在装载中重叠）、D-08（reduced 块与 resize 的先后）——两者在拆分前就存在，不是拆分引入 | 静态 |
| INDEX「运行时验收清单：进世界、Enter 唤聊天、点五个家具热点…」 | 五个热点 id 与路由全对得上（§2）；Enter 门有 D-11 的键盘可达性问题 | 静态 |

## 7. 脚本产物契约

**`scripts/build-turntable-parts.py`**（未运行，只读 :348-473）
- CLI：`--gen`（machine-<mood>.png / platter.png / tonearm.png 所在目录）、`--src`（原画）、`--out`（默认应指 `public/rooms/study`）、`--manifest`（默认 `arts/rooms/study/generated/turntable.json`，:353-354）、`--review`（**必填**，:355）、`--platter`（可选覆盖）。
- 写出：`<out>/parts/tonearm.png`（:405）、`platter-<mood>.png`（:423）、`platter-light-add|mul-<mood>.png`（:424-425）、`spindle-<mood>.png`（:430）；manifest 字段 `pivot / arm{src,box} / spindle{src{mood},box} / platterArt{mood} / platterLight{mood}{add,mul} / armTint{mood}(hex) / donor`（:410-439）。
- 运行时消费（全部经人工抄进 `study-room.ts`，代码不读 JSON）：

| manifest | 值 | study-room.ts | 一致 |
| --- | --- | --- | --- |
| `pivot` | 1062.5 / 844.0 | `armPivot` :73 | ✅ |
| `arm.src / box` | tonearm.png / 976,834,102,82 | `arm` :96 | ✅ |
| `spindle.src{3} / box` | spindle-*.png / 954,828,18,22 | `spindle` :98-105 | ✅ |
| `platterArt{3}` | platter-*.png | :77-81 | ✅ |
| `platterLight{3}{add,mul}` | 6 路径 | :82-95 | ✅ |
| `armTint` | #ffffff / #808bc0 / #78828a | `0xffffff / 0x808bc0 / 0x78828a` :97 | ✅（hex→number 手工转换正确） |
| `donor` | twilight | — | 运行时不用（仅溯源） |

`turntable-prop.ts` 对产物的隐含假设：零件 PNG 为 512 母版（:127 `min(512, …)`，实测 512²）；`arm.box.w` 与贴图宽度之比即 `res`（:139，204/102=2 ✅）；`platterArt`/`platterLight` 为"单位圆内切于贴图"的 disc space（room-types.ts:67-73），由 `discCorners` 的 [-1,1] 四角映射（homography.ts:258-270）消费。

**`scripts/fit-disc-ellipse.py`**（未运行）：输入图 + `--seed X Y`，打印 `platter: { cx, cy, rx, ry, tilt }`（:144，tilt 为 Pixi 约定弧度，顺时针为正）→ 直接粘成 `PxEllipse`（room-types.ts:31-39）；`study-room.ts:69` 的 `platter` 与 :72 的 `center` 即由此而来，`stills`/`armShadow` 为手调、无脚本来源。

README 契约差异：见 D-13（缺 `--review`）。
