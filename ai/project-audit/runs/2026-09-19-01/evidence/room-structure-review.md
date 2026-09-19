# 第二步分区审阅 · 房间合成器与主题根散件

- 运行：`2026-09-19-01` / step 02 / HEAD `a9f7cfa` / 分支 `dev`
- 分区：`src/themes/cinnaglass/room/*`（4 文件）+ 主题根 `tweaks.ts` `model.ts` `profile.ts` `rooms.ts` `scene.tsx`（5 文件），合计 2098 行
- 方式：9 个文件全文读完；importer 用 grep 全仓核实；量化取自本次 `metrics/structure-*.json`；第一步（`runs/2026-09-18-01/evidence/src-review.md`）已做的存亡清点不重复，只在结论处引用
- 范围：只读。不评产品行为对错，只评结构 / 复用 / 注释。本文件是唯一写出物

---

## 0. 一页结论

| # | 结论 | 证据 |
|---|---|---|
| 1 | `buildScene` 782 行里装了 9 个互不相关的职责，且靠"声明顺序恰好正确"运行（三处 TDZ 边缘） | pixi-scene.ts:386-1167；:745/:753 读写 :899/:765 的变量；:929 调 :1094 的函数 |
| 2 | 同一函数作用域里有两处同名遮蔽（`shadowTex`、`light`），含义完全不同 | pixi-scene.ts:520 vs :672；:405 vs :536 |
| 3 | localStorage JSON 读取有 **4 份**实现（其中 2 份字节同体） | rooms.ts:29、screens.tsx:301、profile.ts:15、tweaks.ts:35 |
| 4 | `RoomScene` 这个导出名有**两个不同组件**，同在 cinnaglass 主题下 | scene.tsx:217（登录页 SVG 背景）vs room/room-scene.tsx:43（Pixi 世界场景） |
| 5 | `Mood`（tweaks.ts:6）与 `RoomMood`（room-types.ts:6）是同一个联合类型的两份声明 | 字面完全相同，`WorldPage:440` 靠结构相容才编译通过 |
| 6 | 分区内 6 处失效文档引用 + 1 处描述已删方案的过时注释 + 3 处描述不存在物的过时注释 | 见 §5 |
| 7 | 死导出 6 个、死配置字段 2 个 | `moodFromHour`、`daysSince`、`daysUntilAnniversary`、`ROOMS_DEFAULT`、`ROOM_ICONS`、`VOICE_DEFAULT`、`WidgetPos`；`Tweaks.hudLayout`、`Tweaks.density` |
| 8 | 依赖方向干净：`room/` 不依赖 `shell/` 或 `pages/`，全仓 `cycles: []` | structure-summary.json `cycles`/`orphans` 均空 |
| 9 | 分区内唯一编译错误来自 `model.ts` 缺 `Msg` 导出（第一步 F1 已登记，状态未变） | `tsc -p tsconfig.app.json --noEmit` 本次唯一输出：chat-card.tsx(10,15) TS2305 |

---

## 1. 逐文件档案

### 1.1 `src/themes/cinnaglass/room/pixi-scene.ts`（1167 行 / 51KB）

- **职责一句话**：把一间房的静态画、雨、钟、角色、活物件、热点提示和光照合成进同一棵 Pixi 渲染树，并交回一个可被 React 驱动的命令式句柄。
- **变化原因（会让这个文件改的事）**：新增一种氛围/天气配方；新增一件活物件；改雨或星星的观感参数；换合成器版本（Pixi 8→9）；改房间模板契约。**这是 5 个不同的变化原因挤在一个文件里** —— 也正是 §2 拆分的依据。
- **importer**：仅 `room/room-scene.tsx:9`（fanIn = 1）。导出 3 个：`CharacterAssets`、`SceneHandle`、`buildScene`。
- **目录 / 命名**：位置正确（`room/` 内 kebab-case，与 `room-scene` `room-types` `study-room` 一致）。文件名 `pixi-scene` 把**技术选型**写进了名字；如果哪天换渲染器，文件名会立刻过时。可选改名 `room-compositor.ts`，但不是本轮必要项。
- **结构隐患（逐条带行号）**：
  - **声明顺序依赖（3 处）**：`:745` 的 `pointerover` 回调读 `elapsed`，`elapsed` 在 `:899` 才 `let` 声明；`:753` 的 `pointertap` 写 `nextHintAt`，它在 `:765` 才声明；`:929` 的 `tick` 调用 `startRainAlpha`，它在 `:1094` 才 `const` 声明。三处目前都安全，因为回调与 ticker 都在 `buildScene` 跑完之后才触发 —— 但这是"靠时序侥幸"，任何一次提前调用都会抛 TDZ。拆分时必须把它们变成**显式入参**，隐患随之消失。
  - **同名遮蔽（2 处）**：`:520 const shadowTex`（唱片机臂的投影贴图）与 `:672 const shadowTex`（角色接地投影贴图）同名异义；`:405 const light`（整棵光照容器）被 `:536 const light`（唱片上的一层高光 mesh）在循环里遮蔽。读代码时必须回溯作用域才知道是哪个。
  - **每帧树搜索**：`:1007` 每帧 `currentLight.getChildByLabel('breath')`。`buildLight`（:816）明明刚创建过这个 sprite，应当一起返回，而不是每帧再找一次。
  - **每帧两次 `new Date()`**：`drawHands`（:630）内部自取时间，而 `:1002-1003` 连调两次（影子一次、实体一次）。两个 Date 对象理论上可能跨秒，影子与指针错位一帧。时间应当由调用方传入。
  - **循环内重复造贴图**：`:672` 在每个座位的循环里各造一张 256×256 `radialGradientTexture`。两个座位=两张同内容贴图，应提到循环外共用一张。
  - **每帧查表**：`:1009` 每帧 `RECIPES[mood][weather]`；当前配方应在 `applyRecipe`（:865）里缓存。

### 1.2 `src/themes/cinnaglass/room/room-scene.tsx`（247 行）

- **职责一句话**：给 Pixi `Application` 做 React 外壳 —— 挂载一次、把 mood/weather 属性变化喂给场景句柄、跟随容器尺寸重排，并在场景之上用 DOM 画头顶在场胶囊与气泡。
- **变化原因**：Pixi 挂载/销毁时序；头顶覆盖层的视觉；新的场景属性。**后者（DOM 覆盖层样式）与前两者不是一个变化原因** —— 见下。
- **importer**：`src/pages/WorldPage.tsx:9`（`lazy` 动态 import）。类型 `HotspotOpenEvent` 由 WorldPage:18 直接从 `room-types` 取，未绕道本文件，方向正确。
- **目录 / 命名**：位置正确。但 `RoomScene` 这个**导出名与 `scene.tsx:217` 的 `RoomScene` 撞名**（见 §3.4）。
- **结构隐患**：
  - `:155-244` 约 90 行内联样式对象 + `:183-188` 一段内联 `<style>` keyframes。keyframes 写在气泡元素**内部**，气泡每次出现都重新注入一次 `<style>`。这两块是 UI 层的事，和"驱动 Pixi"不是一个变化原因，应当下沉到 CSS（`diary.css:18` 已经在管 `.presence-tag` 的隐藏规则，`.room-bubble` 则完全没有 CSS 规则）。
  - `:43` 的签名 `RoomSceneProps & { active?: boolean }` —— `active` 被排除在具名 props 类型之外，没有理由；合并进 `RoomSceneProps` 即可。
  - `:32 weatherKind: string` 比实际取值域宽得多（`model.ts:4` 的 `Weather.kind` 也是 `string`）。`toRoomWeather`（:41）是唯一收窄点，这个设计本身是对的，只是入参类型没兜住。

### 1.3 `src/themes/cinnaglass/room/room-types.ts`（185 行）

- **职责一句话**：房间模板的数据契约（底图 / 窗 / 钟 / 座位 / 热点 / 活物件的坐标与资源约定）+ 两个纯查表函数。
- **变化原因**：只有一个 —— 房间模板能表达什么。这是分区里职责最干净的文件。
- **importer**：`pixi-scene.ts:28-29`、`room-scene.tsx:8`、`study-room.ts:5`、`WorldPage.tsx:18`（fanIn = 4，fanOut = 0）。**零出边的叶子类型模块，正是类型应该待的位置。**
- **目录 / 命名**：正确。
- **结构隐患**：
  - `:52-62` 有一段 11 行 JSDoc，紧接着 `:63` 又是 `platterArt` 自己的 JSDoc。TypeScript 只认紧邻的最后一个，`:52-62` 实际是**孤儿 JSDoc**（写给整个"分层方案"的，却挂在了一个字段前）。应提升为 `TurntableSpec` 的类型级注释，或改成 `/* */` 段落注释。
  - `:181 moodFromHour` **零消费者**（全仓 grep 仅 TODO.md 提到）。时辰判定现在由 `WorldPage` 的 tweak 值直接给，不再走这个函数。

### 1.4 `src/themes/cinnaglass/room/study-room.ts`（102 行）

- **职责一句话**：书房这一间的实例数据 —— 所有坐标与资源路径的唯一落点。
- **变化原因**：只有一个 —— 这张画换了或量测重做。干净。
- **importer**：`room-scene.tsx:10`。
- **目录 / 命名**：正确。**这是分区里做得最好的一个文件**：纯数据、每个数字都注明来源（`:62-64` 说明椭圆是 137 点最小二乘、rms 0.5px、脚本在 `scripts/fit-disc-ellipse.py`），并明确禁止在图层组件里改坐标（`:2-3`）。
- **唯一问题**：`:52` 引用 `ai/UX.md §2`（见 §5）。

### 1.5 `src/themes/cinnaglass/tweaks.ts`（59 行）

- **职责一句话**：把用户在氛围/设置面板里能调的几项合成一个对象，用 React state 持有并写穿 localStorage。
- **变化原因**：新增一个可调项；换持久化方式。
- **importer**：`settings.tsx:8`、`WorldPage.tsx:25`、`model.ts:2`、`channel-screen.tsx:16`、`shell/ambience.tsx:10`（fanIn = 5）。
- **目录 / 命名**：平铺在主题根，与 `model.ts` `profile.ts` 同层，可接受（都是主题级共享小模块）。
- **结构隐患**：
  - `:6 Mood` 与 `room-types.ts:6 RoomMood` 字面完全相同（见 §3.2）。
  - **死字段 2 个**：`hudLayout`（:8/:17/:28）与 `density`（:9/:19/:30）只在本文件出现，全仓无任何读取点。它们仍被写进 localStorage `ow-tweaks-v1`。
  - `:10 WeatherTweak` 与 `RoomWeather` **不要合并** —— 理由见 §3.3。

### 1.6 `src/themes/cinnaglass/model.ts`（24 行）

- **职责一句话**：主题内跨文件共用的、无运行时的类型集合。
- **变化原因**：任一被共享的数据形状变化 —— 也就是说这个文件**没有自己的变化原因**，它是个类型垃圾桶。fanIn = 7（全仓第 4 高），fanOut = 1。
- **importer**：`settings.tsx:7`、`WorldPage.tsx:26`、`calendar.tsx:5`、`profile.ts:3`、`rooms.ts:7`、`shell/rail.tsx:10`、`shell/chat-card.tsx:10`。
- **结构隐患**：
  - **编译错误**：`shell/chat-card.tsx:10 import type { Msg } from '../model'`，但 `model.ts` 从未导出 `Msg`（真正的 `Msg` 在 `chat-data.ts:46`，`channel-screen.tsx:14` 正是从那里导入）。本次 `tsc -p tsconfig.app.json --noEmit` 的**唯一**输出就是这条 TS2305 → `pnpm build`（`tsc -b && vite build`）在基线上无法通过。第一步已登记为 F1，本轮仍在。
  - `:16 Room` 与 `room-types.ts:154 RoomTemplate` 撞词不撞义（见 §3.5）。
  - `:23 WidgetPos` 零消费者。

### 1.7 `src/themes/cinnaglass/profile.ts`（43 行）

- **职责一句话**：情侣资料的默认值 + 一个 localStorage 读取器 + 两个纪念日日期算式。
- **变化原因**：**三个** —— 默认资料变；持久化方式变；纪念日算法变。43 行里塞了三件事。
- **importer**：`WorldPage.tsx:16`，只取 `PROFILE_DEFAULT` 与 `gload`。
- **结构隐患**：
  - `:27 daysSince`、`:35 daysUntilAnniversary` **零消费者**（`:24` 的分节注释还在为它们立标题）。
  - `:15 gload` 名字不可读（`g` 无出处），且与 `rooms.ts:29 owLoad` 是同一件事的两个写法（见 §3.1）。
  - 文件头 `:1-2` 解释了"为什么从 settings.tsx 拆出来"（react-refresh 要求组件文件只导出组件）—— 这是**好注释**，说明了存在理由而不是复述代码。

### 1.8 `src/themes/cinnaglass/rooms.ts`（35 行）

- **职责一句话**：早期"世界内房间"侧边栏 mock 数据 + 图标映射 + 一个泛型 localStorage 读取器。
- **变化原因**：mock 数据变；持久化方式变。**两件毫不相干的事共处一文件，而且只有第二件还活着。**
- **importer**：`WorldPage.tsx:24`，**只取 `owLoad`**。`ROOMS_DEFAULT`（:9）、`ROOM_ICONS`（:16）、`VOICE_DEFAULT`（:23）全仓零消费者 —— 也就是说这个文件名义上的主体已死，只剩一个搭便车的工具函数在支撑它存在。`ai/PROJECT.md:78` 已明确记载「`rooms.ts` 旧 mock，`owLoad` 仍被 WorldPage 使用」。
- **目录 / 命名**：`rooms.ts`（复数）与 `room/`（单数目录）在同一层，读者极易误以为它们相关。实际毫无关系。
- **其他**：`:2-3` 引用 `channel.md`，该文件不存在（见 §5）。

### 1.9 `src/themes/cinnaglass/scene.tsx`（236 行）

- **职责一句话**：手写等距投影的 SVG 房间小景，登录页和重置密码页的背景板。
- **变化原因**：登录页背景观感。单一。
- **importer**：`LoginPage.tsx:8`、`ResetPasswordPage.tsx:10`（fanIn = 2，fanOut = 0）。**它是活的，不是死文件。**
- **目录 / 命名**：**本分区最严重的命名问题**。它导出的 `RoomScene`（:217）与 `room/room-scene.tsx:43` 的 `RoomScene` 同名，同在 `themes/cinnaglass/` 下，一个是 200 行 SVG 静态背景、一个是 WebGL 实时合成器。两个 importer 都必须写全路径 `@/themes/cinnaglass/scene.tsx` 才不歧义 —— 这正是撞名在逼迫调用方做额外说明。
- **其他**：`:66 RoomArt` 已无外部消费者（文件头 `:4` 说"导出给小地图复用"，小地图不存在）。

---

## 2. 拆分方案（只给方案，不改代码）

### 2.1 为什么要拆：按"变化原因"数一遍

`buildScene`（:386-1167）当前混装：资产装载（:397-400）、渲染树骨架（:402-418）、唱片机活物件（:420-594，**175 行**）、雨（:596-615）、钟（:617-645）、角色（:647-708）、热点与提示排程（:710-767）、星星提示（:769-808）、光照配方与合成（:810-851）、状态与过渡（:853-896）、每帧推进（:898-1091）、电源纪律（:1102-1116）、覆盖式布局（:1118-1133）、句柄（:1137-1166）。

要改"雨大一点"的人，必须在一个 1167 行文件里同时面对单应矩阵和眨眼节律。这就是拆分的全部理由。

### 2.2 目标形状：一层组合者 + 一排互不相识的图层模块

**原则（回答"为什么不拆成互相跳转的碎片"）**：

1. **每个模块自带状态，自带一个 `update`。** 不做"状态在 A 文件、修改在 B 文件"的拆法 —— 那才是碎片化，读者要来回跳。现在的代码已经是这个毛病的反面教材：`elapsed`（:899）被 :745 的回调读、被 :1042 的排程读、被 :1076 的粒子读，跨 300 行。
2. **图层之间零 import。** 唱片机不 import 星星，雨不 import 钟。唯一知道"谁先谁后"的地方是 `buildScene` 里那 10 行 tick。想知道执行顺序，看一个地方就够。
3. **共享的只有两样东西，都是只读的**：房间模板（base 像素坐标系）和当前配方（`LightRecipe`）。这两样作为入参传进去，不作为模块间的耦合。
4. **不为"更小"而拆。** 纯函数（贴图、矩阵）拆出来是因为它们**没有状态、可以离屏验证**；图层拆出来是因为它们**变化原因不同**。不满足这两条的，不动。

### 2.3 九个模块（接口 / 消费者 / 持有状态）

> 命名沿用 `room/` 现有 kebab-case。所有新文件放 `src/themes/cinnaglass/room/`。

**① `room/textures.ts` —— 纯函数，零状态**

```
export type ArtImage = HTMLImageElement | ImageBitmap | HTMLCanvasElement
export function linearGradientTexture(top: string, bottom: string, angleDeg?: number): Texture
export function radialGradientTexture(color: string, innerAlpha?: number): Texture
export function canvasTexture(c: HTMLCanvasElement, res: number): Texture
export function shadowTexture(img: ArtImage, res: number, blurPx: number): Texture
export function carvePatch(img: ArtImage, poly: PxPoint[]): { tex: Texture; box: PxRect }
export function sparkleTexture(): Texture
export function boxDownscale(img: ArtImage, px: number): Texture   // 现 fitDisc(:486)
```
- 搬自 pixi-scene.ts:139-340、:486-505
- 输入：图像与颜色参数；输出：`Texture`；状态：无
- 消费者：light-pass、turntable-prop、character-layer、sparkle-affordance
- 验证：纯像素比对 —— 每个函数在固定入参下把结果画到离屏 canvas，`toDataURL()` 前后逐字节相等

**② `room/homography.ts` —— 纯数学，零状态**

```
export type Mat3 = [number × 9]
export type Corners = [number × 8]
export function discHomography(e: PxEllipse, center: PxPoint): Mat3
export function discCorners(H: Mat3, spin: number): Corners
```
- 搬自 pixi-scene.ts:182-242（`mul3`/`inv3`/`apply3` 不导出，留作内部）
- 消费者：turntable-prop
- 验证：**这是分区里唯一能脱离 GPU 精确验证的部分**。用 `STUDY_ROOM.props.turntable` 的真实椭圆，对 `spin ∈ {0, π/4, π/2, π, 3π/2}` 打印 `discCorners` 的 8 个数，前后各存一份 JSON 逐位比对（容差 0）

**③ `room/lighting.ts` —— 配方数据 + 一个构建器**

```
export type LightRecipe = { actorTint, washTop, washBottom, washAlpha, washBlend, glowColor, glowAlpha, breathAlpha }
export const RECIPES: Record<RoomMood, Record<RoomWeather, LightRecipe>>
export const WEATHER_GRADE: Record<RoomWeather, { saturation, brightness }>
export function createLightPass(baseW: number, baseH: number, glow: PxRect):
    { container: Container; apply(rec: LightRecipe, fades: FadeQueue, animate: boolean): void;
      update(elapsed: number, rec: LightRecipe): void; destroy(): void }
```
- 搬自 pixi-scene.ts:46-133、:814-851、:1005-1012
- 持有状态：`currentLight` 容器 + **缓存好的 `breath` sprite 引用**（消灭 :1007 的每帧 `getChildByLabel`）
- 消费者：buildScene
- 验证：每个 mood×weather 组合（6 种）冻结渲染一帧，PNG 逐像素比对；`breathAlpha` 在 `elapsed = 0/2.75/5.5/8.25` 四点打印数值比对

**④ `room/fade-queue.ts` —— 共享的 alpha 补间队列**

```
export function createFadeQueue():
    { start(obj: Container | Sprite, to: number, durMs: number, kill?: boolean): void;
      update(nowMs: number): void; clear(): void }
```
- 搬自 pixi-scene.ts:857-863、:915-924
- 持有状态：`fades[]`
- 消费者：lighting（配方交叉淡化）、rain-layer（雨层淡入淡出）、turntable-prop（分时段切图淡化）、buildScene（底图交叉淡化）
- 验证：入队一条固定补间，按 60 个假 `now` 步进，打印 alpha 序列比对

**⑤ `room/rain-layer.ts`**

```
export function createRainLayer(window: WindowSpec, random: () => number):
    { container: Container; setRaining(raining: boolean, fades: FadeQueue): void;
      update(dt: number): void }
```
- 搬自 pixi-scene.ts:346-380、:596-615、:926-975、:1093-1100
- 持有状态：`streaks[]`、`drops[]`、两个 `Graphics`、`rainFadeTarget`、pane 遮罩
- 消费者：buildScene
- 验证：注入定种随机源，跑 300 帧固定 `dt`，把每 30 帧的前 10 条 streak 的 `x/y` 打成 JSON 比对

**⑥ `room/clock-layer.ts`**

```
export function createClockLayer(clock: ClockSpec):
    { container: Container; setTint(tint: number): void; update(now: Date): void }
```
- 搬自 pixi-scene.ts:617-645、:999-1003
- 持有状态：两个 `Graphics`（指针 + 影子）
- 消费者：buildScene（**时间从外面传进来** —— 顺手修掉 :630 每帧两次 `new Date()`）
- 验证：冻结 `new Date('2026-09-19T14:23:45.500Z')`，渲一帧 PNG 比对；三根指针角度另外打印

**⑦ `room/character-layer.ts`**

```
export function createCharacterLayer(seats: SeatAnchor[], assets: CharacterAssets,
                                     textures: Record<string, Texture>, random: () => number):
    { container: Container; setTint(tint: number): void;
      update(dt: number, elapsed: number, nowMs: number): void;
      getSeatLocalPos(seatId: string): PxPoint | null }
```
- 搬自 pixi-scene.ts:648-708、:977-997、:1148-1157（座位锚点换算）
- 持有状态：`chars[]`（每人的 sway/breathe 容器、睁闭眼贴图、眨眼时刻）
- 消费者：buildScene；`getSeatLocalPos` 回基础像素坐标，由 buildScene 的 `root.toGlobal` 换成屏幕坐标 —— **屏幕坐标换算留在 buildScene，因为只有它知道 root 的变换**
- 验证：定种随机 + 冻结时间，打印 600 帧内每人的呼吸缩放、摇摆角、眨眼开闭时刻序列比对
- 顺手修：`:672` 的接地投影贴图提到循环外共用一张

**⑧ `room/affordance.ts` —— 热点 + 星星 + 提示排程**

```
export function createAffordance(hotspots: HotspotSpec[], random: () => number,
                                 onHotspot?: (e: HotspotOpenEvent) => void):
    { hitContainer: Container; sparkContainer: Container;
      update(dt: number, elapsed: number): void; isHovered(id: string): boolean }
```
- 搬自 pixi-scene.ts:710-808、:1040-1090
- 持有状态：`hots[]`、`sparks[]`、`nextHintAt`、星星贴图
- 消费者：buildScene；`isHovered('music')` 供 turntable-prop 读 —— **turntable 不 import affordance，hover 布尔由 buildScene 在 tick 里传递**（保住"图层零互 import"）
- 验证：定种随机，跑 120 秒虚拟时间，打印 `(spawnTime, rect.id, size, peak)` 事件流比对；这一项的时序最敏感，比对必须逐条
- 顺手修：`elapsed` 与 `nextHintAt` 变成显式参数/内部状态，:745/:753 的 TDZ 边缘消失

**⑨ `room/turntable-prop.ts` —— 最大也最险的一块**

```
export function createTurntable(app: Application, spec: TurntableSpec,
                                moodArtUrls: Partial<Record<RoomMood, string>>,
                                baseTextures: Record<string, Texture>):
    Promise<{ layers: Container[];            // platter / light / still / armSwing，按序交给 world
              cutsByArtUrl: Map<string, Container[]>;   // 供底图交叉淡化一起带走
              update(dt: number, hovered: boolean): void;
              refit(devicePx: number): void;
              destroy(): void }>
```
- 搬自 pixi-scene.ts:420-594、:1014-1038、:1131（resize 里的 refit 调用）、:444-454 + :1163-1164（贴图退休 runner 与其注销）
- 持有状态：`vinyls[]`、`vinylH`、`vinylSpin`、`vinylSpeed`、`lift`/`liftVel`、`armShadows[]`、`fitted[]`/`fitPx`、`retiredDiscTextures[]`、`postrender` runner 注册
- 消费者：buildScene
- **必须整块一起搬**：`refitDiscs` 是一个闭包，被 `resize`（:1131）调用；贴图退休依赖注册在 renderer 上的 `postrender` runner（:454）并在 `destroy`（:1163-1164）注销。拆开任何一半都会踩 Pixi 的 BindGroup 生命周期（:448-450 那段注释正是在讲这件事）
- 验证：**三重**。(a) `spin = 0` 时渲一帧，与改动前 PNG 逐像素比对（静止态必须完全相同）；(b) `spin ∈ {π/4, π/2, π}` 各渲一帧比对；(c) `refit(devicePx)` 在 160/320/512 三个尺寸下，打印 `fitPx` 与每张贴图的 `width/height`，并在 30 秒连续 resize 抖动下记录 `retiredDiscTextures` 的入队/销毁计数 —— 计数不相等即泄漏

### 2.4 拆完之后的 `buildScene` 与 `tick`

`buildScene` 降到 ~120 行：装载资产 → 建 `root/world/light` → 造底图 sprite → 依次 `create*` 拿到图层 → 拼进 world → 写 `applyRecipe` → 写 tick → `resize` → 返回句柄。

`tick` 降到 ~12 行，执行顺序一眼可见：

```
const tick = () => {
    const dt = Math.min(app.ticker.deltaMS, 100) / 1000;
    elapsed += dt;
    const now = performance.now();
    const rec = RECIPES[mood][weather];
    fades.update(now);
    rain.update(dt);
    characters.update(dt, elapsed, now);
    clock.update(new Date());
    lightPass.update(elapsed, rec);
    turntable?.update(dt, affordance.isHovered('music'));
    affordance.update(dt, elapsed);
};
```

预估行数：pixi-scene.ts 1167 → ~130；九个新模块合计 ~950 行；总量基本不变（拆分不是为了少写代码，是为了让"改雨"只需打开一个 90 行的文件）。

### 2.5 无测试时怎么证明等价

项目无测试框架，但**已有可复用的无头渲染先例**：`scripts/render-journal-turn.mjs` 与 `scripts/compare-journal-art.mjs` 就是"渲染 + 比图"的现成套路；`room-scene.tsx:77` 在 DEV 下已经把 Pixi 实例挂到 `window.__owApp`，`app.renderer.extract.canvas(app.stage)` 可直接取帧。

**但要做像素比对，必须先把随机性收口。** 当前随机源有两处：模块级 `rand`（:350）和散落的 `Math.random()`（:941、:994、:1045、:1063）。建议在拆分**第 0 批**先做一步零行为改动的准备：把所有随机调用统一走一个 `random: () => number` 参数（默认 `Math.random`），拆分后各图层从入参接收。有了这一步，下面四种验证才成立：

| 手段 | 做法 | 覆盖什么 |
|---|---|---|
| 冻结帧像素比对 | 固定 mood×weather（6 组）+ 冻结 `Date` + 定种随机 + `applyRecipe(false)` + `app.render()` + `extract` → PNG 逐像素 diff | 底图、光照、钟、唱片机静止态、角色首帧 |
| 关键量日志比对 | 每个模块按 §2.3 所列打印各自的状态序列，存 JSON 逐位 diff | 雨滴轨迹、眨眼时刻、星星事件流、唱针弹簧、唱片角点 |
| 帧计数 / 资源计数 | 30 秒内记录 `app.ticker.FPS`、`sparks.length` 峰值、贴图退休入队与销毁计数、`world.children.length` | 性能不退化、无贴图泄漏、树结构没多没少 |
| 手动过场清单 | mood 三档切换 ×（晴/雨）、悬停唱片机、点击五个热点、折叠侧栏触发 resize、切换标签页触发 visibility、`prefers-reduced-motion` 开启 | 时序类回归（TDZ、runner 注销、reduced-motion 单帧冻结） |

### 2.6 风险与最小实施批次

| 批次 | 内容 | 风险 | 理由 | 验证 |
|---|---|---|---|---|
| 0 | 随机源收口成参数；`buildLight` 返回 breath 引用；`drawHands` 改为传入时间；接地投影贴图提到循环外 | **极低** | 四处都是零行为改动的准备工作，且都消除了后续批次的验证障碍 | 冻结帧 6 组比对 |
| 1 | `textures.ts` + `homography.ts` | **极低** | 纯函数，无状态，无时序 | 离屏 canvas 字节比对 + 角点 JSON 比对 |
| 2 | `lighting.ts` + `fade-queue.ts` | **低** | 配方是常量；淡化队列语义简单，但被 4 个地方共用，要一次改全 | 6 组冻结帧 + alpha 序列 |
| 3 | `clock-layer.ts` + `character-layer.ts` | **低** | 钟完全确定；角色只依赖定种随机 | 冻结时间帧 + 600 帧状态序列 |
| 4 | `rain-layer.ts` | **中** | 粒子数量由窗格面积算出（:611-614），搬迁时容易改变取整顺序 | 300 帧轨迹 JSON；先单独核对初始 streak/drop 条数 |
| 5 | `affordance.ts` | **中** | 提示排程与星星预算（`MAX_SPARKS + 6` 硬上限，:786）相互牵制；`elapsed` 从闭包变参数是语义最容易走样的一处 | 120 秒事件流逐条比对 |
| 6 | `turntable-prop.ts` | **高** | 触碰 Pixi renderer runner 与贴图生命周期（:446-454），且与 `resize` 耦合（:1131）。**必须整块搬，不得分两次** | 静止帧必须零像素差；三档 refit 尺寸日志；30 秒 resize 抖动下的贴图收支平衡 |
| 7 | `buildScene` 收尾成组合者 | **低** | 前六批做完后剩下的就是拼装 | 全部手动过场清单跑一遍 |

**每批之间都应可独立提交、可独立回滚。** 批次 6 单独成一次提交，便于出问题时只回滚它。

---

## 3. 复用审计

### 3.1 localStorage JSON 读取 —— 4 份实现，唯一实现应放 `src/lib/`

| 位置 | 形态 | 差异 |
|---|---|---|
| `rooms.ts:29 owLoad<T>(k, fb)` | 读 + parse，失败回退 | 基准 |
| `screens.tsx:301 load<T>(k, fb)` | 同上 | **与 owLoad 字节同体**（本次 `duplicateBodyCandidates` 命中） |
| `profile.ts:15 gload(k, fb: Profile)` | 读 + parse + **展开合并**到默认值 | 多一步合并；且被写死成 `Profile` 类型，失去泛型 |
| `tweaks.ts:35 loadTweaks()` | 同 gload，但键写死 | 多一步合并 + 固定键 |

另有 3 处内联手写同一件事（不在本分区，只登记）：`WorldPage.tsx:52`、`music.tsx:17`、`shell/floaters.tsx:80`。写入侧同样分散：`screens.tsx:310 save`、`tweaks.ts:52`、`emote-picker.tsx:114`、`image-slot.js:24`、`WorldPage.tsx:257/264/271/324`。

**唯一实现放哪**：不是主题内的事（`src/lib/storage.ts` 已存在但管的是 Supabase Storage，别混），新建 `src/lib/local-store.ts`：

```
export function loadJson<T>(key: string, fallback: T): T
export function loadMerged<T extends object>(key: string, fallback: T): T   // 展开合并版
export function saveJson(key: string, value: unknown): void
```

**谁改成引用**：
- `rooms.ts` 删掉 `owLoad`，`WorldPage.tsx:24` 改 import `loadJson`（同时 `rooms.ts` 失去最后一个消费者 → 整文件成为删除候选，见 §3.5）
- `screens.tsx` 删掉 `load`/`save`
- `profile.ts` 的 `gload` 改为 `loadMerged` 的再导出或直接由 `WorldPage:105` 调 `loadMerged('ow-profile-v1', PROFILE_DEFAULT)`，`gload` 这个不可读的名字随之消失
- `tweaks.ts:35 loadTweaks` 改成一行 `loadMerged(STORE_KEY, TWEAK_DEFAULTS)`，`:48-57` 的写入改调 `saveJson`

**风险**：低，但 `gload`/`loadTweaks` 的**合并**语义与 `owLoad`/`load` 的**不合并**语义必须保持区分 —— 合并版在旧 blob 缺字段时用默认补齐，不合并版原样返回。把它们做成两个函数而不是一个带开关的函数，就不会有人用错。

### 3.2 `Mood` 与 `RoomMood` —— 同一概念，两份声明，应合一

- `tweaks.ts:6 export type Mood = 'golden' | 'twilight' | 'night'`
- `room-types.ts:6 export type RoomMood = 'golden' | 'twilight' | 'night'`

字面完全相同。`WorldPage.tsx:440` 把 `t.mood`（`Mood`）传给 `RoomScene` 的 `mood: RoomMood`，只是靠 TypeScript 的结构相容才编译通过 —— 加一档氛围时，两处都要改，漏一处就会在调用点报一个和真因无关的错。

**唯一实现放哪**：`room-types.ts`。理由：氛围本质上是**场景的光照时段**，设置面板只是它的手动覆盖；而且 `room-types.ts` fanOut = 0，是最低层的叶子，往它下沉不会产生新边。

**谁改成引用**：`tweaks.ts` 顶部 `import type { RoomMood } from './room/room-types'`，然后 `export type Mood = RoomMood`（保留别名，避免一次性改动 5 个 importer）。`model.ts:16 Room.mood` 自动跟随。

**风险**：纯类型，零运行时。唯一需要立规矩的是方向 —— 见 §6。

### 3.3 `WeatherTweak` 与 `RoomWeather` —— 外形相似，**不要合并**

- `tweaks.ts:10 WeatherTweak = 'auto' | 'sun' | 'cloud' | 'rain' | 'snow'`
- `room-types.ts:7 RoomWeather = 'sun' | 'rain'`

**不合并的理由**：两者的变化原因完全不同。`WeatherTweak` 是**用户设置的词汇表**，随设置面板增减选项而变（`'auto'` 甚至不是一种天气，是一种"跟随真实天气"的模式）；`RoomWeather` 是**合成器能画出来的东西**，随美术产出而变（哪天做了雪的雨层，才会多一档）。强行合成一个联合类型，会让"加一个设置选项"和"美术做完一层特效"变成同一次改动。

现在的设计本来就是对的：`room-scene.tsx:41 toRoomWeather` 是唯一的收窄点。**唯一该改的是入参类型** —— `:32 weatherKind: string` 太宽，应当收成一个具名的 `WeatherKind`（`model.ts:4` 的 `Weather.kind` 同样是 `string`，一起收）。

### 3.4 `scene.tsx` 的旧 SVG 背景与登录页 —— 保留，但改名 + 收口

**事实**：`scene.tsx:217 RoomScene` 活着，`LoginPage.tsx:114` 与 `ResetPasswordPage.tsx:52` 各用一次。`scene.tsx:66 RoomArt` 除了被自己的 `RoomScene` 用之外零消费者。

**不要做的事**：不要让登录页改用 `room/room-scene.tsx` 的 Pixi 房间。虽然两者外形上都是"一间温馨的房间"，变化原因天差地别 —— 登录页背景要求**零资产等待、零 WebGL、首屏立刻出图**（登录页此时连用户身份都没有），而世界房间要装载 19 张 `/rooms/study/**` 贴图并初始化 WebGL 上下文。这是典型的"形似而变化原因不同，不应抽象"。

**应该做的**：
1. **改名消歧**：`scene.tsx` → `login-backdrop.tsx`，导出 `LoginBackdrop`（它现在的唯一角色就是这个）。两个 importer 各改一行。
2. **`RoomArt` 取消导出**：小地图不存在，文件头 `:4` 的"导出给小地图复用"是过时叙述。
3. 位置可以留在 `themes/cinnaglass/`（它确实吃 `cinnaglass.css:589-840` 的 mood/weather 覆盖层），不必搬进 `pages/`。

**与 `lobby.tsx` 的关系**：`lobby.tsx` 也是同一路数的手写 SVG 占位（大厅漂浮岛），风格一致但主题完全不同，**不应与 `scene.tsx` 合并**。二者唯一真正重复的是那套 pastel 色板常量（`scene.tsx:6-24 ROOM` vs `lobby.tsx:18-28 P`，`#86C99A` `#9AD3A7` `#CBA47B` `#A07B55` `#BFE3F5` `#9FD6F4` `#FCE7B0` 七个色值完全相同）。**这个色板才是该抽的东西** —— 但它属于设计系统（`ai/design_system/`）的范畴，抽之前应确认是否该改用 CSS 变量而不是再造一个 TS 常量文件。本轮只登记，不动。

### 3.5 `Room`（mock）与 `RoomTemplate` —— 撞词不撞义，**不要合并**，但要改名

- `model.ts:16 Room = { id, name, icon, mood, note }` —— 侧边栏的房间条目 mock
- `room-types.ts:154 RoomTemplate` —— 底图/锚点/热点的美术契约

两者除了都叫 "room" 之外没有任何关系，绝不能抽象成一个。**该做的是让词汇表停止打架**：`rooms.ts` 的三个常量（`ROOMS_DEFAULT`/`ROOM_ICONS`/`VOICE_DEFAULT`）已经零消费者，`model.ts:16 Room` 只被它们用。把 `owLoad` 按 §3.1 搬走之后，`rooms.ts` 整文件 + `model.ts:16 Room` 一并成为删除候选，撞词问题自然消失。

> 这一项需用户拍板（删除旧 mock）。`ai/PROJECT.md:78` 已把 `rooms.ts` 标为"旧 mock"，方向是一致的，但删除属于破坏性动作，列入清单 B。

### 3.6 `room-scene.tsx` 的内联样式 —— 应下沉到 CSS

`:155-244` 的在场胶囊与气泡样式（约 90 行内联对象 + `:183-188` 内联 keyframes）与"驱动 Pixi"不是一个变化原因。`.presence-tag` 在 `diary.css:18` 已经有一条隐藏规则，`.room-bubble` 则完全没有 CSS 规则 —— 样式一半在 CSS 一半在 JS，是最难维护的状态。建议整体搬进 `diary.css`（紧邻 `.stage .room-scene`，diary.css:11），JSX 只留 `left/top` 两个动态值。keyframes 搬走后不再被反复注入。

---

## 4. 注释审计

> 项目源码注释为英文，建议注释一律给英文原文。工具函数一句话；复杂函数最多 3–4 句，说清条件与副作用。
> 现状取值：**无**（无注释）/ **复述**（只重说了函数名）/ **过时**（描述已不存在的东西）/ **冗长**（信息对，但超过必要长度）/ **合格**。

### 4.1 `room/pixi-scene.ts`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-14 | 模块头 | 过时（部分） | 保留多行结构图，但把层树补全（现缺 turntable 的 platter/light/still/armSwing、hotspot、sparkle 三层），并删掉与 CSS 原型对比的叙述 | `the "pasted on" look of the CSS prototype is gone by construction` |
| :31 | `CharacterAssets` | 无 | `/** Per-seat character art: the open-eye frame and the blink frame. */` | — |
| :33 | `SceneHandle` | 无（字段 :36 有） | `/** Imperative handle the React shell drives a running scene through. */` | — |
| :46 | `LightRecipe` | 无（字段有） | `/** One mood x weather lighting setup: the actor tint plus the three light-pass sprites. */` | — |
| :58 | `RECIPES` | 过时 | `/** The lighting recipe for every mood and weather; the only place light is tuned. */` | 删 :81-82 `codex audit M3: dim less globally, keep faces warm — washes dropped ~15%, actor tints lifted toward lamp-warm`（一次性调参记录，归档到文档；若要留，改成一行路径引用） |
| :130 | `WEATHER_GRADE` | 合格 | 保持 | — |
| :139 | `linearGradientTexture` | 无 | `/** A 64x64 two-stop linear gradient texture at the given angle, used for the light wash. */` | — |
| :155 | `radialGradientTexture` | 无 | `/** A 256x256 radial falloff in one color, used for the window glow, the cloud breath and contact shadows. */` | — |
| :161 | `rgba`（内联） | 无 | 无需注释（两行、名字已说明） | — |
| :174 | `ArtImage` | 无 | `/** Any image source both Pixi and canvas2d accept as a draw source. */` | — |
| :177 | `canvasTexture` | 合格 | 保持 | — |
| :182 | `Mat3` | 无（:181 有段标题） | `/** Row-major 3x3 matrix. */` | — |
| :184 | `mul3` | 无 | `/** Matrix product a*b. */` | — |
| :190 | `inv3` | 无 | `/** Matrix inverse by cofactors; the caller guarantees a non-degenerate matrix. */` | — |
| :198 | `apply3` | 合格 | 保持 | — |
| :211 | `discHomography` | 冗长（8 行） | 压到 3 句：`/** Homography from disc-plane coordinates (unit circle = the vinyl rim) to base-image px. The painted rim fixes the plane up to a circle-preserving projective map and the painted center pins it down, leaving the spin angle as the only freedom. Affine spinning cannot hold both the rim and the label still under perspective; this can. */` | 删 `Flat (affine) spinning cannot keep both the rim AND the label still under real perspective, this can.` 的重复陈述（已并入上句） |
| :228 | `Corners` | 无 | `/** PerspectiveMesh corner list: x/y for top-left, top-right, bottom-right, bottom-left. */` | — |
| :234 | `discCorners` | 合格 | 保持 | — |
| :250 | `shadowTexture` | 冗长（6 行） | 压到 3 句：`/** Bake a soft cast shadow from a part's alpha: its silhouette, blurred, filled black. Position and opacity are driven at runtime, so the shadow answers the motion. */` | 删 `instead of riding along as a sticker` |
| :271 | `carvePatch` | 合格 | 保持 | — |
| :299 | `sparkleTexture` | 合格 | 保持 | — |
| :308 | `ray`（内联） | 复述 + 失效引用 | `/** One soft cross ray of the sparkle, drawn as a stretched ellipse under a length-wise gradient. */` | 删 :307 `color tiers per the sparkle spec: core #FFF8E8, rays #FFE6B5, halo #FFC978` —— 三个色值就在下面三行代码里，且 "the sparkle spec" 无路径可查 |
| :342-344 | 雨层段标题 | 过时 | 改为 `/* rain particles: falling streaks plus droplets that grow, then slide */` | 删 `(ported from the canvas prototype)` |
| :346/:347/:348 | `Streak`/`TrailPoint`/`Drop` | 无 | `/** A rain streak falling down one glass pane. */` / `/** One sampled position of a sliding droplet's trail, aged out after TRAIL_FADE_S. */` / `/** A droplet on the glass: it grows in place, then slides and leaves a trail. */` | — |
| :350 | `rand` | 无 | `/** Uniform random number in [min, max). */` | — |
| :351 | `TRAIL_FADE_S` | 无 | `/** Seconds a droplet trail point stays visible. */` | — |
| :353 | `makeStreak` | 无 | `/** A fresh streak inside pane #pane. With anywhere=false it starts just above the pane, so a recycled streak re-enters from the top instead of popping into view. */` | — |
| :368 | `makeDrop` | 无 | `/** A fresh droplet clinging to pane #pane, placed in the upper 70% so it has room to slide. */` | — |
| :386 | `buildScene` | **无**（782 行唯一导出） | `/** Compose one room into a Pixi stage: base art per mood, rain masked to the glass, clock hands, characters, living props and the light pass, all under one root that cover-fits the canvas. Awaits every texture before returning. The returned handle is the only way to drive the scene afterwards; call destroy() before tearing down the Application. */` | — |
| :420-428 | 唱片机段注释 | **过时** | 保留前 3 行（living-props 方向 + 路径），重写机制描述为单应变换版 | **删 :422-426** `The vinyl is carved out of EVERY mood's base art (ellipse → un-squashed circle) and spun inside a frame that re-applies the perspective squash + tilt` —— 这是被 `discHomography`（:211）取代的旧椭圆方案；现在是直接在唱片平面上做投影旋转，没有"反挤压再挤压"这一步 |
| :443 | `refitDiscs`（声明） | 复述 + 指路 | `/** Set by the turntable block: refits the disc masters to the size they are actually drawn at. */` | 删 `(see below)` —— "看下面"不是说明 |
| :446 | `discTextureCleanup.postrender` | 合格 | 保持（:447-450 讲清了为什么必须延后到下一次绘制之后） | — |
| :486 | `fitDisc` | 合格（:476-481 覆盖动机） | 函数自身加一行：`/** Box-downscale an art image to exactly px wide, halving stepwise so no texel is skipped. */` | — |
| :589 | `layVinyl` | 合格 | 保持 | — |
| :629 | `drawHands` | 无 | `/** Draw the three clock hands for the current wall-clock time into g. With shadow=true every hand is drawn in one dark color, for the offset copy behind the real hands. */` | — |
| :635 | `hand`（内联） | 无 | `/** One hand: a round-capped stroke from the dial center at angleDeg (0 = 12 o'clock). */` | — |
| :705 | `setActorTint` | 合格 | 保持 | — |
| :718 | `Hot` | 无（字段有） | `/** Runtime state of one furniture hotspot: hover, the periodic hint slot and the next sparkle time. */` | — |
| :760-767 | 提示排程段 | 合格（略长） | 保留；建议给 `affordance survey 2026-08-15` 补上文档路径，否则查不到 | — |
| :769-771 | 星星段 | 合格但引用无路径 | 保留；`the sparkle mockup brief` 应补路径或删 | — |
| :772 | `Spark` | 无 | `/** One live sparkle particle and the curve parameters it lives out. */` | — |
| :785 | `spawnSpark` | 合格（:783-784 讲 peak） | 补一句职责：`/** Spawn one sparkle biased toward the center of hot's rect. peak caps its brightness so the three states stay ranked: idle < hint < hover. */` | — |
| :816 | `buildLight` | 无 | `/** Build the light pass for one recipe: the gradient wash, the window glow and, in rain, the breathing cloud-cover sprite. Returns a fresh container the caller cross-fades in and destroys. */` | — |
| :847-849 | vignette 注释 | **过时** | 无替代，整段删 | **删 :847-849** `vignette retired (2026-08-11 user call): the frame-rect version read as a black overlay hugging the edges — the design comps have no edge darkening at all, so the light pass ends here.` —— 描述一个已不存在的图层；决策记录归设计文档 |
| :857 | `Fade` | 无 | `/** A queued alpha tween; kill=true destroys the object once it lands. */` | — |
| :860 | `startFade` | 无 | `/** Queue an alpha tween on obj, replacing any tween already running on it. */` | — |
| :865 | `applyRecipe` | 无 | `/** Apply the current mood x weather: weather grade, actor tint, base-art cross-fade (prop cuts ride along with the art they were carved from) and a freshly built light pass. With animate=false everything snaps and the old light pass is destroyed at once. */` | — |
| :900 | `musicHotIndex` | 无 | `/** Index of the turntable hotspot, so the living prop can read its hover state. */` | — |
| :901-908 | 唱针弹簧常量 | 合格 | 保持 | — |
| :909 | `tick` | **无**（183 行） | `/** One frame: advance the fade queue, then rain, characters, clock, light breathing, living props and the sparkle affordance, in that order. dt is capped at 100ms so a backgrounded tab cannot teleport any simulation. */` | — |
| :1094 | `startRainAlpha` | 无 | `/** Cross-fade the rain layer in or out; a no-op while the target has not changed. */` | — |
| :1106 | `onVisibility` | 无 | `/** Stop the ticker while the tab is hidden and resume on return. */` | — |
| :1119-1122 | `EDGE_CROP` | 合格 | 保持（讲清了画上有一圈画出来的暗框） | — |
| :1124 | `resize` | 无 | `/** Cover-fit the base art to the canvas, then refit the disc masters to their new drawn size. */` | — |
| :1138 | `setMood` | 无 | `/** Switch the lighting hour; a repeat of the current mood is ignored. */` | — |
| :1143 | `setWeather` | 无 | `/** Switch between the sunny and rainy pass; a repeat of the current weather is ignored. */` | — |
| :1148 | `getSeatScreenPos` | 合格（:1151-1153 有理由） | 保持；补 codex 报告路径 | — |
| :1160 | `destroy` | 无 | `/** Detach the ticker, the visibility listener and the postrender runner, and flush any disc textures still waiting to be retired. Does not destroy the Application — the caller owns it. */` | — |

### 4.2 `room/room-scene.tsx`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-4 | 模块头 | 合格（含一句过时） | 保留三行 | 删 `(replaces the retired 3D metaspace)` —— 历史叙述，代码里已无 3D |
| :12 | `CHARACTERS` | 无 | `/** Seat id to character art. The room template names the seats; who sits in them lives here. */` | — |
| :23 | `SeatPresence` | 无 | `/** Who occupies a seat, as the overhead tag shows them. */` | — |
| :29 | `RoomSceneProps` | 合格（字段齐全） | 补类型级一行：`/** Props the React shell forwards to the running scene and its DOM overlays. */`；顺便把 `active` 从交叉类型并进来 | — |
| :41 | `toRoomWeather` | 无 | `/** Collapse the app's weather vocabulary down to what the compositor can render. */` | — |
| :43 | `RoomScene` | **无**（205 行） | `/** Mounts one Pixi Application for the component's whole life and hands prop changes to the scene handle; the scene is never rebuilt. Overhead presence tags and message bubbles are DOM, positioned from a 600ms poll of the seat anchors. Pass active=false to freeze the ticker while a full-screen surface covers the room. */` | — |
| :55-56, :90-91, :97-98, :120-121, :124, :138-141 | 各处行内注释 | 合格 | 保持 | — |
| :99 | `syncTags` | 合格 | 保持 | — |
| :160-161 | `codex spec §5.9` | 失效引用 | 见 §5 | — |
| :201-202 | `codex spec §5.5` | 失效引用 | 见 §5 | — |

### 4.3 `room/room-types.ts`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-4 | 模块头 | 合格 | 保持 | — |
| :6 | `RoomMood` | 无 | `/** The room's lighting hour. Art, light recipes and actor tints are all keyed by it. */` | — |
| :7 | `RoomWeather` | 无 | `/** What the compositor can actually render; the app's wider weather vocabulary is narrowed to this. */` | — |
| :10/:18/:29 | `PxRect`/`PxPoint`/`PxEllipse` | 合格 | 保持 | — |
| :39-92 | `TurntableSpec` | 合格但**结构有问题** | 把 :52-62 那段（讲整套分层方案）提升为 `TurntableSpec` 的类型级 JSDoc 或改成 `/* */` 段落注释 | 不删内容，只搬位置 —— 现在它是挂在 `platterArt` 前的孤儿 JSDoc（:63 紧接着又是一个，TS 只认后者） |
| :94/:99/:106/:116/:140/:148/:154 | 其余类型 | 合格 | 保持 | — |
| :124 | `SeatAnchor.phase` | 失效引用 | 见 §5 | — |
| :136 | `HotspotSpec` | 失效引用 | 见 §5 | — |
| :171 | `resolveRoomArt` | 合格 | 保持 | — |
| :181 | `moodFromHour` | 合格但**零消费者** | 注释本身没问题；建议删函数（清单 A） | — |

### 4.4 `room/study-room.ts`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-3 | 模块头 | 合格 | 保持 | — |
| :7 | `STUDY_ROOM` | 无（模块头已覆盖） | 可选一行：`/** The study: every anchor below is measured against the 1586x992 base art. */` | — |
| :10-12, :24-25, :61-64, :71-74, :91-92, :98-99 | 行内注释 | 合格 | 保持 —— **这是全分区注释质量最高的文件**，每个数字都注明了来源与工具 | — |
| :52 | 热点段 | 失效引用 | 见 §5 | — |

### 4.5 `tweaks.ts`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-2 | 模块头 | 过时 | `// tweaks.ts — the handful of values the ambience and settings panels can change, persisted to localStorage as one blob.` | 删 `production replacement for the prototype's host-driven useTweaks. Drops the omelette postMessage protocol` —— "omelette" 宿主与 postMessage 协议都已不存在 |
| :6 | `Mood` | 无 | 改为 `RoomMood` 的别名（§3.2）：`/** Alias of the scene's RoomMood; the panel only overrides what the room already understands. */` | — |
| :7 | `GlassStyle` | 无 | `/** Which glass tint the shell uses; read as the data-glass attribute. */` | — |
| :8 | `HudLayout` | 无 + **死字段** | 建议删（无任何读取点） | — |
| :9 | `Density` | 无 + **死字段** | 建议删（无任何读取点） | — |
| :10 | `WeatherTweak` | 无 | `/** The weather setting, including 'auto' — which is a mode, not a weather. */` | — |
| :11-13 | `ChatAlign` | 合格（带决策日期） | 保持 | — |
| :15 | `Tweaks` | 无 | `/** Everything the panels can change, persisted as one blob under STORE_KEY. */` | — |
| :24 | `STORE_KEY` | 无 | `/** localStorage key; bump the suffix when the stored shape changes incompatibly. */` | — |
| :26 | `TWEAK_DEFAULTS` | 无 | `/** Defaults for a first visit, and the fallback every stored blob is merged over. */` | — |
| :35 | `loadTweaks` | 无 | `/** Read the stored tweaks merged over the defaults; a missing or unparsable blob falls back to the defaults. */` | — |
| :44 | `SetTweak` | 无 | `/** Set one tweak by key, keeping the value's type tied to that key. */` | — |
| :46 | `useTweaks` | 无 | `/** Tweak state for the session: the current values plus a setter that writes through to localStorage. */` | — |

### 4.6 `model.ts`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1 | 模块头 | 合格 | 保持 | — |
| :4 | `Weather` | 无 | `/** Current weather as the shell shows it; kind drives both the icon and the scene's rain. */` | — |
| :6 | `Profile` | 无 | `/** The couple's locally stored profile, before the Supabase world record takes over. */` | — |
| :16 | `Room` | 无（**且撞词**） | 若保留，必须写清它不是场景：`/** A sidebar entry for an in-world voice room. Unrelated to RoomTemplate, which is the scene's art contract. */`；建议随 `rooms.ts` 一并删（清单 B） | — |
| :18 | `CalEvent` | 无 | `/** One dated entry on the shared calendar. */` | — |
| :20 | `Alarm` | 无 | `/** One alarm on the clock surface; on=false keeps it in the list but silent. */` | — |
| :22 | `Widgets` | 无 | `/** Which shell widgets are switched on, keyed by widget id. */` | — |
| :23 | `WidgetPos` | 无 + **零消费者** | 建议删 | — |
| — | 缺 `Msg` | **编译错误** | 不要往 `model.ts` 补 `Msg`；`chat-card.tsx:10` 应改为 `import type { Msg } from '../chat-data'`（`channel-screen.tsx:14` 已是正确写法） | — |

### 4.7 `profile.ts`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-2 | 模块头 | 合格（说明了拆分理由） | 保持 | — |
| :5 | `PROFILE_DEFAULT` | 无 | `/** Seed profile for a first run, and the fallback the stored blob is merged over. */` | — |
| :15 | `gload` | 无 + 名字不可读 | 建议按 §3.1 替换为共享的 `loadMerged`；若暂留：`/** Read the stored profile merged over fb; any parse failure falls back to fb whole. */` | — |
| :24 | 分节注释 | 合格（但它统领的两个函数都是死的） | 随函数一并删 | — |
| :26/:34 | `daysSince`/`daysUntilAnniversary` | 合格但**零消费者** | 注释本身没问题；建议删函数（清单 A） | — |

### 4.8 `rooms.ts`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-3 | 模块头 | 失效引用 | 见 §5 | — |
| :9 | `ROOMS_DEFAULT` | 无 + **零消费者** | 建议删 | — |
| :16 | `ROOM_ICONS` | 无 + **零消费者** | 建议删 | — |
| :23 | `VOICE_DEFAULT` | 无 + **零消费者** | 建议删 | — |
| :28 | `owLoad` | 与现实不符 | 按 §3.1 搬到 `src/lib/local-store.ts`，改为 `/** Read and parse a JSON value from localStorage; a missing key or a parse failure returns fb. */` | 删 `shared localStorage loader for the theme's persisted slices` —— 它既不 shared（只有一个消费者），又不 theme-scoped（真正 shared 的是 4 份互相不知道的副本） |

### 4.9 `scene.tsx`

| 位置 | 名称 | 现状 | 建议注释原文（English） | 应删除的旧注释摘句 |
|---|---|---|---|---|
| :1-4 | 模块头 | **过时 ×3** | `// scene.tsx — the isometric SVG room drawn behind the sign-in and reset-password pages. Pure markup, no assets: it must paint before any texture could load. The mood and weather overlays in cinnaglass.css (.scene-base / .mood-* / .wx-*) tint it.` | 删 `(replaces the upload slot)`（历史）；删 `in ow.css`（该文件不存在，规则实际在 `cinnaglass.css:589-840`）；删 `RoomArt is exported so the minimap can reuse it`（小地图不存在，`RoomArt` 零外部消费者） |
| :6 | `ROOM` | 无 | `/** The diorama's pastel palette; t/r/l suffixes are the top, right and left face of an isometric box. */` | — |
| :26/:37 | `BoxProps`/`ShadowProps` | 无 | `/** An axis-aligned box in iso grid units: u/v across the floor, w upward. */` / `/** An elliptical ground shadow at grid point (u, v). */` | — |
| :39-52 | iso 常量 | 合格 | 保持 | — |
| :55 | `Box` | 合格（:54 一行） | 保持 | — |
| :62 | `Shadow` | 无 | `/** Soft ground shadow under a prop; rx/ry are screen px, not grid units. */` | — |
| :66 | `RoomArt` | 无（150 行） | 取消导出，并加 `/** The whole diorama as one SVG: floor, two walls, desk, bed, rug and two chibi avatars, all projected by X/Y above. shadow=false drops the drop shadow for embedding on a light panel. */` | — |
| :217 | `RoomScene` | 无 + **撞名** | 按 §3.4 改名 `LoginBackdrop`，并加 `/** The sign-in backdrop: the diorama under the CSS mood and weather overlays. */` | — |

### 4.10 注释审计小结

- 分区共 54 个具名声明（`structure-declarations.json`）。合格 21、无注释 26、过时 4、冗长 2、复述 1。
- **必须补的三条**（都是大函数且都是零注释）：`buildScene`（:386）、`tick`（:909）、`RoomScene`（room-scene.tsx:43）。
- **必须删的四段过时注释**：pixi-scene.ts:422-426（旧椭圆方案，已被 `discHomography` 取代）、pixi-scene.ts:847-849（已删除的 vignette）、scene.tsx:1-4 的三处（upload slot / ow.css / minimap）、tweaks.ts:1-2（omelette postMessage）。
- 模块头一律保留多行，只删其中的过时叙述句 —— 五个模块头（pixi-scene、room-types、study-room、room-scene、profile）的"为什么这样设计"部分都是有价值的，不能一刀切压成一行。

---

## 5. 失效引用

| 位置 | 现文本 | 应改成 | 依据 |
|---|---|---|---|
| room-types.ts:124 | `sync reads as mechanical, see ai/STYLE.md §6` | `see ai/design_system/character.md` | `ai/STYLE.md` 现为 7 行入口存根，其映射表写明「§6 动效/角色微动 → design_system/character.md」 |
| room-types.ts:136 | `A clickable furniture region that opens a feature (ai/UX.md §2/§5)` | `(see ai/design_system/props.md and ai/design_system/uiux/uiux.md)` | `ai/UX.md` 为 8 行存根，映射表：§2 → props.md + uiux.md；§5 → props.md |
| study-room.ts:52 | `furniture → feature entries (ai/UX.md §2)` | `(see ai/design_system/props.md)` | 同上 |
| rooms.ts:2-3 | `Terminology (channel.md): rooms = scene-bound voice channels…` | `see ai/PROJECT.md 数据库节` | `ai/features/channel.md` 不存在；`ai/PROJECT.md:84-86` 明确记载 channel 文档「随 Discord 壳层作废不恢复」，术语现以 PROJECT.md 数据库节为准。**若本文件按 §3.5 删除，此条自动消失** |
| pixi-scene.ts:81 | `codex audit M3: dim less globally, keep faces warm` | 若保留则改为 `see ai/codex-visual/20260811-044310Z/codex-report.md (M3)`；建议整段删（见 §4.1） | 第一步已定位出处为该报告 |
| pixi-scene.ts:1151-1152 | `codex audit H1: the tag must read as "her status"…` | `see ai/codex-visual/20260811-044310Z/codex-report.md (H1)` | 同上 |
| room-scene.tsx:160 | `codex spec §5.9` | `ai/codex-visual/20260811-055917Z/codex-report.md §5.9` | pixel spec 报告 |
| room-scene.tsx:201 | `codex spec §5.5` | `ai/codex-visual/20260811-055917Z/codex-report.md §5.5` | 同上 |
| scene.tsx:2-3 | `The mood overlays in ow.css still tint this` | `The mood overlays in cinnaglass.css (.scene-base / .mood-* / .wx-*)` | 全仓无 `ow.css`；规则实际在 `cinnaglass.css:589-840` |
| pixi-scene.ts:764 | `affordance survey 2026-08-15` | 需补路径或删 —— 未在 `ai/` 下找到对应文档 | 本轮未能定位；列为待确认 |
| pixi-scene.ts:770 | `the sparkle mockup brief` | 需补路径或删 —— 未在 `ai/` 下找到对应文档 | 同上 |

**引用有效、无需改动的**（核实后登记，避免下次重查）：`room-types.ts:4 ai/PROJECT.md`、`room-types.ts:39` 与 `pixi-scene.ts:421 ai/design_system/research/living-props.md`、`study-room.ts:12 arts/rooms/study/source/`、`study-room.ts:63/73 scripts/build-turntable-parts.py`、`study-room.ts:63 scripts/fit-disc-ellipse.py` —— 五处目标全部存在。

---

## 6. 依赖方向

**现状（全部核实过）**：

- `room/` 的出边只有：`pixi.js`、`pixi-filters`、`react`，以及 `room/` 内部三条（`study-room → room-types`、`room-scene → room-types + pixi-scene + study-room`、`pixi-scene → room-types`）。
- **`room/` 对 `shell/` 与 `pages/` 的依赖：零。** 方向正确。
- 反向入边只有一条半：`WorldPage.tsx:9` 动态 import `room-scene`（值），`WorldPage.tsx:18` import `HotspotOpenEvent`（类型）。
- `structure-summary.json` 的 `cycles` 为空数组，`orphans` 为空数组，全仓无循环。

**类型下沉，做得对的一个例子**：`HotspotOpenEvent` 定义在 `room-types.ts:148`（最低层、fanOut=0），由 UI 层的 `WorldPage` 直接 import。这正是"共享契约放在依赖图最底下"的正确形态，不需要动。

**该下沉而未下沉的**：`Mood`（tweaks.ts:6）。它现在住在 UI 层，被场景层的同名类型重复了一遍。按 §3.2 让 `tweaks.ts` 反过来 import `room-types` 的 `RoomMood`。

**这会不会造出循环？** 不会 —— `room/` 目前对主题根零依赖，`tweaks → room/room-types` 是一条新的单向边。但这条边把"主题根依赖 room/"这件事固化下来了，所以要同时把规则写明：

> **`room/` 只允许依赖 `room/` 内部与第三方库。主题根（`tweaks.ts` 等）与 `shell/`、`pages/` 可以依赖 `room/`，反向禁止。**

只要这条规则成立，§2 拆出的九个新模块（全在 `room/` 内）也天然不会引入循环。

**其他方向问题**：`room-scene.tsx` 的 DOM 覆盖层（§3.6）不是依赖方向问题，是关注点分离问题 —— 样式该在 CSS，不该在这里。

---

## 7. 建议执行清单

### A · 本轮可直接做（注释、失效引用、小复用、文件归位）

| # | 动作 | 风险 | 验证方法 |
|---|---|---|---|
| A1 | 修 `chat-card.tsx:10`：`from '../model'` → `from '../chat-data'`（一行） | 无 | `tsc -p tsconfig.app.json --noEmit` 从 1 条错误变 0 条 —— 这一条直接把 `pnpm build` 从不可用变可用 |
| A2 | 删 4 段过时注释：pixi-scene.ts:422-426（旧椭圆方案）、pixi-scene.ts:847-849（已删 vignette）、scene.tsx:1-4 三句、tweaks.ts:1-2 后半句 | 无 | 注释改动；`tsc` + `eslint` 无新增 |
| A3 | 按 §4 表补 26 处缺失注释、压缩 2 处冗长注释、删 1 处复述注释（pixi-scene.ts:307 的色值复述） | 无 | 同上；另人工确认每条建议注释说的是"为什么/有什么副作用"而不是重复函数名 |
| A4 | 按 §5 表改 9 处失效引用；2 处（affordance survey / sparkle mockup brief）标注待确认或删 | 无 | 逐条 `ls` 目标文件存在 |
| A5 | `room-types.ts:52-62` 的孤儿 JSDoc 上提为 `TurntableSpec` 的类型注释 | 无 | 编辑器悬停 `TurntableSpec` 能看到这段，悬停 `platterArt` 只看到它自己那句 |
| A6 | 删死导出：`room-types.ts:181 moodFromHour`、`profile.ts:27/35 daysSince + daysUntilAnniversary`（连 `:24` 分节注释）、`model.ts:23 WidgetPos` | 低 | `tsc` + `eslint` 通过；删前再 grep 一次确认零引用（含 `scripts/*.mjs` 的动态 import） |
| A7 | 删死配置字段 `Tweaks.hudLayout`、`Tweaks.density`（type + Tweaks 成员 + 默认值共 6 行） | 低 | `tsc` 通过；**注意**：旧 localStorage blob 里残留这两个键，`loadMerged` 会把它们带回内存但无人读取，无害；如需彻底清理另起一条 | 
| A8 | 新建 `src/lib/local-store.ts`（`loadJson`/`loadMerged`/`saveJson`），改 `screens.tsx:301/310`、`profile.ts:15`、`tweaks.ts:35/52`、`WorldPage.tsx:24` 引用它；`rooms.ts` 删 `owLoad` | 低 | 逐个键手测：`ow-tweaks-v1` `ow-profile-v1` `ow-dates-v1` `ow-alarms-v1` 各写一次刷新一次，值不丢；再故意写一段坏 JSON 进去，确认回退到默认而不是白屏 |
| A9 | `tweaks.ts` 的 `Mood` 改为 `RoomMood` 的别名（§3.2） | 无（纯类型） | `tsc` 通过；改完在 `RoomMood` 上加一档假值试编译，确认 5 个 importer 一起报错（说明真的合一了），然后撤销 |
| A10 | `room-scene.tsx` 的 `active` 并入 `RoomSceneProps`；`:32 weatherKind` 收成具名 `WeatherKind` | 低 | `tsc` 通过 |
| A11 | 零行为小修：`pixi-scene.ts:672` 接地投影贴图提到循环外；`:816 buildLight` 一并返回 breath 引用以消灭 `:1007` 每帧 `getChildByLabel`；`:630 drawHands` 改为传入时间 | 低 | 6 组 mood×weather 冻结帧 PNG 逐像素比对（应完全相同）；另记 30 秒 `app.ticker.FPS` 不低于改动前 |
| A12 | `room-scene.tsx:155-244` 的内联样式与 keyframes 搬进 `diary.css`，JSX 只留 `left/top` | 低 | 截图比对在场胶囊与气泡（在线/离线两态、气泡出现动画走完一轮）；确认 `diary.css:18` 的阅读态隐藏规则仍生效 |
| A13 | 全局 `prettier --write`（本分区 9 个文件里有 8 个在基线 warn 列表内） | 低 | `prettier --check` 从 192 文件 warn 变 0；`git diff --stat` 只应出现格式变化，配合 `tsc` 通过 |

> A1 属于第一步已登记的 F1，本轮授权文本明确把「结构优化、复用与注释精简」纳入第二步，修它只有一行且解除构建阻塞 —— 但因为它落在别人的分区文件（`shell/chat-card.tsx`）上，建议由统筹方决定谁下手，避免两个分区同时改同一行。

### B · 需用户批准（重构 / 破坏性）

| # | 动作 | 风险 | 验证方法 |
|---|---|---|---|
| B1 | 按 §2 拆分 `pixi-scene.ts` 为九个模块，分 8 批（含第 0 批随机源收口） | 批次 0-3 低、4-5 中、6 高 | 见 §2.5 四种手段 + §2.6 逐批验证列；**每批一次独立提交**，批次 6（唱片机）单独成 commit 便于回滚 |
| B2 | `scene.tsx` → `login-backdrop.tsx`，导出改名 `LoginBackdrop`，`RoomArt` 取消导出 | 低（改 2 个 importer） | 登录页与重置密码页各截图比对；`tsc` 通过。**破坏性在于改文件名**，需用户点头 |
| B3 | 删 `rooms.ts` 整文件（`owLoad` 已由 A8 搬走，其余三个常量零消费者）+ 删 `model.ts:16 Room` | 中 | 删前最后一次全仓 grep（含 `.mjs`、`.css`、`ai/` 文档）；`tsc` + `pnpm build` 通过。**PROJECT.md:78 的项目结构表需同步更新**（那一行正是在描述这个文件） |
| B4 | `pixi-scene.ts` 改名 `room-compositor.ts`（去掉文件名里的技术选型） | 低但无收益紧迫性 | 一个 importer；建议与 B1 同批做，或干脆不做 |
| B5 | 抽 `scene.tsx:6-24` 与 `lobby.tsx:18-28` 共同的 7 个 pastel 色值 | 中 | **抽之前需先定方案**：改用 CSS 变量还是再造一个 TS 常量？这属于设计系统范畴（`ai/design_system/`），不该由代码侧单方面决定。本轮只登记 |

### 不建议做的（明确记下理由，避免下次重提）

- **不要合并 `WeatherTweak` 与 `RoomWeather`** —— 一个是设置词汇表（含 `'auto'` 这个模式），一个是合成器能力表，变化原因不同（§3.3）。
- **不要让登录页复用 Pixi 房间** —— 登录背景要求零资产、零 WebGL、首屏即出；世界房间要装载 19 张贴图并起 WebGL 上下文。形似而已（§3.4）。
- **不要把 `Room`（侧边栏 mock）与 `RoomTemplate`（美术契约）抽象成一个** —— 只是撞词（§3.5）。
- **不要把九个新模块继续拆成 build/update/dispose 三件套** —— 那会让状态与修改分家，读者必须跨文件跳转，正是现在 `elapsed` 跨 300 行的毛病放大版（§2.2）。
