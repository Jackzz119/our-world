# 房间合成器拆分执行日志 · PA-028（B1 + B2）

- 运行：`2026-09-19-01` / 起点 HEAD `596d5ea` / 分支 `dev`
- 依据：`evidence/room-structure-review.md` §2（拆分方案）+ §3.4 / 清单 B2（登录背景板改名）
- 范围：`src/themes/cinnaglass/room/**`、`src/themes/cinnaglass/scene.tsx`（改名）、`src/pages/LoginPage.tsx`、`src/pages/ResetPasswordPage.tsx` 的 import 行。未触碰其他分区
- 对外契约未变：`room/pixi-scene.ts` 路径不变，仍导出 `buildScene` / `SceneHandle` / `CharacterAssets`，签名逐字未变。`room-scene.tsx` 与 `WorldPage.tsx` 一行未改

---

## 0. 结果一览

| 项 | 拆分前（`596d5ea`） | 拆分后 |
|---|---|---|
| `pixi-scene.ts` | 1311 行，`buildScene` 845 行 | 273 行，`buildScene` 208 行、`tick` 30 行 |
| `room/` 模块数（不含 `room-scene` / `room-types` / `study-room`） | 1 | 10 |
| `room/` 总行数 | 1311 | 1599（+288，全是模块头、接口类型与具名注释） |
| 环 / 未解析导入 | 0 / 0 | 0 / 0 |
| `tsc -b` | 通过 | 通过 |
| `eslint`（本分区 + pages） | 0 error / 1 warning | 0 error / 1 warning（同一条，`room-scene.tsx:141` 的失效 disable 指令，本轮未触碰该文件） |

---

## 1. 新旧文件对照表

行号一律指 `596d5ea:src/themes/cinnaglass/room/pixi-scene.ts`（1311 行版本，注释批次 A2–A4 之后）。

| 原位置 | 内容 | 新位置 |
|---|---|---|
| :146–196 | `linearGradientTexture`、`radialGradientTexture`、`ArtImage`、`canvasTexture` | `room/textures.ts` |
| :286–385 | `shadowTexture`、`carvePatch`、`sparkleTexture` | `room/textures.ts` |
| :585–604 | 唱片机块内的闭包 `fitDisc` | `room/textures.ts` 的 `boxDownscale`（顶层具名纯函数） |
| :198–288 | `Mat3`、`mul3`、`inv3`、`apply3`、`discHomography`、`Corners`、`discCorners` | `room/homography.ts`（`mul3`/`inv3`/`apply3` 不导出） |
| :54–144 | `LightRecipe`、`RECIPES`、`WEATHER_GRADE` | `room/lighting.ts` |
| :938–975 | `buildLight` | `room/lighting.ts` 的 `createLightPass().apply()` 内部 `build()` |
| :1139–1145 | tick 里的云层呼吸 | `room/lighting.ts` 的 `update()` |
| :983–993 | `Fade` 类型、`startFade` | `room/fade-queue.ts` |
| :1049–1059 | tick 里的补间推进与回收 | `room/fade-queue.ts` 的 `update()` |
| :390–453 | `Streak` / `TrailPoint` / `Drop`、`TRAIL_FADE_S`、`makeStreak`、`makeDrop` | `room/rain-layer.ts`（`makeStreak`/`makeDrop` 变成工厂内闭包，`room` 入参收窄为 `panes`） |
| :704–723 | 雨容器、窗格遮罩、粒子播种 | `room/rain-layer.ts` |
| :1060–1110 | tick 里的雨模拟与重绘 | `room/rain-layer.ts` 的 `update()` |
| :1229–1236 | `startRainAlpha` | `room/rain-layer.ts` 的 `setRaining()` |
| :725–757 | 钟容器、`drawHands` | `room/clock-layer.ts` |
| :1133–1137 | tick 里的指针重绘 | `room/clock-layer.ts` 的 `update()` |
| :759–820 | `Char` 类型、座位循环、`setActorTint` 的角色部分 | `room/character-layer.ts` |
| :1111–1131 | tick 里的呼吸 / 摇摆 / 眨眼 | `room/character-layer.ts` 的 `update()` |
| :822–936 | `Hot`、热点区循环与三个指针回调、提示排程常量、`Spark`、`spawnSpark` | `room/affordance.ts` |
| :1174–1227 | tick 里的提示排程、星星生成与生命周期 | `room/affordance.ts` 的 `update()` |
| :501–702 | 整个唱片机块：分层、`refitDiscs`、贴图退休 runner、每 mood 的 disc / light / pin / still / shadow / arm、`layVinyl` | `room/turntable-prop.ts` |
| :1148–1172 | tick 里的转速斜坡与唱臂弹簧 | `room/turntable-prop.ts` 的 `update()` |
| :1303–1304 | `destroy()` 里注销 runner 并冲洗退休贴图 | `room/turntable-prop.ts` 的 `destroy()` |
| :467–1311 其余 | 资产装载、根/世界树、底图 sprite、`applyRecipe`、tick 编排、电源纪律、`resize`、句柄 | 留在 `room/pixi-scene.ts`（现 273 行） |
| `themes/cinnaglass/scene.tsx` 全文 | 登录页等距 SVG 背景 | `themes/cinnaglass/login-backdrop.tsx`，导出改名 `LoginBackdrop`；`RoomArt` 取消导出（仍在文件内被使用） |

### 拆完后的依赖方向

```
pixi-scene.ts ──▶ affordance / character-layer / clock-layer / fade-queue
              ──▶ lighting / rain-layer / turntable-prop / room-types
lighting      ──▶ fade-queue(type) · textures · room-types
rain-layer    ──▶ fade-queue(type) · room-types
affordance    ──▶ textures · room-types
character-layer ──▶ textures · room-types
clock-layer   ──▶ room-types
turntable-prop ──▶ homography · textures · room-types
textures / homography ──▶ room-types（仅类型）
```

九个图层模块彼此零 import（方案 §2.2 原则 2）。唯一知道"谁先谁后"的地方是 `pixi-scene.ts` 里那段 30 行的 `tick`。唱片机要读的 hover 布尔由 `tick` 从 `affordance.isHovered('music')` 取出再传进去，两者互不认识。

---

## 2. 逐批做了什么

### 批次 B2 · `scene.tsx` → `login-backdrop.tsx`

- `git mv` 改名；模块头首句同步改名；`RoomScene` → `LoginBackdrop`；`RoomArt` 去掉 `export`（文件内仍在用）
- `LoginPage.tsx:8/124`、`ResetPasswordPage.tsx:10/54` 各改两处
- 全仓 grep 确认再无 `cinnaglass/scene` 引用

### 批次 0 · 随机源收口 + 三项零行为准备（方案 §2.6 批次 0）

1. **随机源收口**：模块级 `rand(min, max)` 改成 `rand(random, min, max)`；`makeStreak` / `makeDrop` 增加 `random` 形参；`buildScene` 内新增唯一一处 `const random: () => number = Math.random`，所有 `Math.random()` 改走它。拆分后各模块从入参接收，模块内再各自定义一行 `rand` 闭包（表达式与原式逐字相同）
2. **`buildLight` 一并返回 breath 引用**，消灭 tick 里每帧 `currentLight.getChildByLabel('breath')`
3. **`drawHands` 改为传入时间**：tick 里只取一次 `new Date()`，影子与指针共用同一时刻（原来各取一次，理论上可能跨秒错开一帧）
4. **接地投影贴图提到座位循环外**：两个座位从各造一张 256×256 `radialGradientTexture` 改为共用一张（每个 sprite 的 `width/height` 仍按自己的角色算，画面不变）

### 批次 1 · `textures.ts` + `homography.ts`

纯函数整体搬迁，函数体逐字未改。`fitDisc` 提升为顶层 `boxDownscale`。`mul3`/`inv3`/`apply3` 留在 `homography.ts` 内部不导出。

### 批次 2 · `lighting.ts` + `fade-queue.ts`

- `light` 容器改由 `createLightPass()` 自己持有，`root.addChild(world, lightPass.container)` —— 树形状不变
- `applyRecipe` 里 20 行的建/淡/毁改成一行 `lightPass.apply(rec, fades, animate)`
- 新增 `let recipe: LightRecipe`，由 `applyRecipe` 写入，tick 不再每帧 `RECIPES[mood][weather]` 查表
- 补间队列改成 `createFadeQueue()`，四个使用方（底图、道具切片、光照、雨层）全部改走它

### 批次 3 · `clock-layer.ts` + `character-layer.ts`

- `setActorTint` 这个只有一个调用点的中转函数取消，`applyRecipe` 直接 `characters.setTint(...)` + `clock.setTint(...)`（顺序与原来的 `for(chars) ... ; hands.tint = ...` 一致）
- `CharacterAssets` 类型下沉到 `character-layer.ts`，`pixi-scene.ts` 用 `export type { CharacterAssets }` 原样再导出，对外 import 路径不变

### 批次 4 · `rain-layer.ts`

原来 tick 里三件事（`rainC.visible` / `startRainAlpha` / 粒子模拟）拆成 `setRaining(raining, fades)` + `update(dt)`，由 tick 连着调用，先后顺序与原来逐行一致。

### 批次 5 · `affordance.ts`

- 热点区、指针回调、提示排程、星星贴图与粒子全部搬入
- **`elapsed` 与 `nextHintAt` 的 TDZ 边缘消除**：该层自己持有一个 `elapsed`，在 `update(dt)` 开头自增；`pointerover` / `pointertap` 回调读的是身旁的模块状态，不再向前引用 `buildScene` 尾部的 `let`
- `nextHintAt` 的初值 `rand(8, 12)` 刻意放在热点循环**之后**赋值（声明处先置 0），保持随机数抽取顺序与原来完全一致
- `musicHotIndex` 那次每帧 `findIndex` 换成构造期建好的 `id → Hot` 映射，`isHovered(id)` 查表

### 批次 6 · `turntable-prop.ts`（整块搬，不拆两半）

- 四层、每 mood 的网格、贴图 refit、`postrender` 退休 runner、唱臂弹簧全部在一个模块内，`refit` 与 runner 注销都由它自己负责
- **两处同名遮蔽消失**：唱臂投影的 `shadowTex` 与角色接地投影的 `shadowTex` 现在分处两个文件；唱片上那层 `const light` 改名 `lightMesh`，与 `pixi-scene.ts` 里的光照容器不再同名
- `startRainAlpha` 的 TDZ 边缘也在批次 4 一并消失

### 批次 7 · 收尾

- 模块头重写：说明本文件不再持有任何图层，只定顺序；层树图每一行标出由哪个模块构建；补一段"图层间零 import、共享物只有两样只读入参"的约定
- `turntableSpec` 提到局部常量，`resize()` 里不再 `room.props?.turntable?.platter` 层层可选链
- `dtMs` 中间变量去掉

---

## 3. 验证结果

### 3.1 每批的三道闸（全部通过）

每批结束都跑 `pnpm exec tsc -b`、`pnpm exec eslint src/themes/cinnaglass/room src/themes/cinnaglass/login-backdrop.tsx src/pages`、`pnpm exec vite build`（成功后 `rm -rf dist`）。

终态：`tsc -b` 全仓 0 错；eslint 0 error / 1 warning（`room-scene.tsx:141` 的失效 disable 指令，与本轮无关）；`vite build` 通过。

> 中途 `tsc -b` 一度报 `chat-data.ts` 的 6 条 `TS2304`，来自并行改 chat 族的另一个 agent，与本分区无关；收尾时那些错误已由对方修掉，终态为 0。

### 3.2 结构扫描

`node ai/project-audit/scripts/scan-structure.mjs --root . --output <scratch>/scan-final`：

```
files 92 · cycles 0 · orphans [] · unresolved 0 · dupBodies 0
```

九个新模块全部有入边，无孤儿；`room/` 内新增的 12 条边没有造出任何环。

### 3.3 纯逻辑等价断言（node，无头）

脚本在 `/private/tmp/claude-502/-Users-chengzheng-Desktop-Files-our-world/a2c3806d-da44-45b0-afa2-9468918f51c5/scratchpad/refactor-room/`。做法统一是：用 `git show 596d5ea:pixi-scene.ts` 的**源文本切片**当参照实现（不是手抄），esbuild 去掉类型标注后在 node 里跑；Pixi 的 `Graphics` / `Sprite` / `Container` 换成会记录每一次调用的替身；两边喂同一个 LCG 定种随机源与冻结时钟。

| 脚本 | 覆盖 | 结果 |
|---|---|---|
| `homography-equiv.mjs` | 真实 study-room 椭圆 + 三组合成边界（退化 / 近极限 / 中等透视）× 6 个 spin 角 | 28 组 `discHomography` / `discCorners` 输出**逐位相同** |
| `fade-lighting-equiv.mjs` | 补间队列：三条错峰入队的补间，90 帧逐帧比 alpha 与 kill 标志；`RECIPES` / `WEATHER_GRADE` 深比较 | 90 帧全同；3 mood × 2 weather 配方表深度相等 |
| `clock-character-equiv.mjs` | 钟：6 个冻结时刻的全部 24 次绘制调用；角色：600 帧 × 2 座位的呼吸缩放、摇摆角、眨眼开闭与下次眨眼时刻 | 绘制调用序列全同；600 帧状态全同 |
| `rain-equiv.mjs` | 定种下的初始粒子（36 streak / 10 drop）；300 帧轨迹与每 30 帧的 streak/drop 绘制调用；另验"不下雨的一帧不动任何粒子" | 全同 |
| `affordance-equiv.mjs` | 120 秒（3600 帧）虚拟时间，中间第 40–55 秒 hover 唱片机；逐条比对 159 次星星生成事件（诞生时刻 / 热点 id / 尺寸区间 / peak / 当时存量）与每帧存活数 | 事件流逐条相同，末态热点状态相同 |
| `turntable-equiv.mjs` | 900 帧（含两段 hover 触发与释放）的转速、spin、lift、liftVel、`armSwing.rotation`、`armGroup.skew.y`、三条唱臂投影的 x/y/alpha；另跑 35 级 resize（含 ±7% 抖动）比 `fitPx` 与贴图退休台账 | 900 帧状态全同；台账相同且收支平衡（造 18 张、退 15 张、存活 3 张） |

`rain-equiv.mjs` 第一次跑时在第 210 帧报出分歧，查下来是**脚本自身**漏把参照实现里 tick 段的一处 `Math.random()` 换成定种源 —— 说明这套比对确实有牙齿，不是空跑。

### 3.4 浏览器内 A/B 帧比对（最强的一项）

把 `596d5ea` 的 `pixi-scene.ts` 临时复制成 `room/_baseline-probe.ts` 由 dev server 提供（比对完已删除）。两套实现各自在一个全新的 960×600 WebGL `Application` 上建同一个 study room，条件完全冻结：`Date` 冻在 `2026-09-19T14:23:45.500Z`、`performance.now()` 由测试推进、`Math.random` 换成同一个定种 LCG、ticker 停掉后按 40ms 手动步进。然后 `renderer.extract.base64(stage)` 读回，两串 base64 PNG **逐字节比较**。

10 个用例全部**完全相同**（3 mood × 2 weather，各跑 0 / 90 帧；night/rain 另跑 300 帧；再加一轮 7 次 resize 抖动后跑 60 帧）。明细与字节数见 `<scratch>/browser-ab-results.md`。golden/sun +90 帧那一帧两边的 SHA-256 同为
`72dd60591941a87fb72acf1f169b1936a60d684c88251c9a45064aaf36cdd7f1`。

### 3.5 真实交互冒烟

在浏览器里对拆分后的实现派发真实 `PointerEvent`：

- 悬停 `music` 热点 → 画布 cursor 变 `pointer`（命中区生效）
- 点击 → `onHotspot` 回调收到 `{ id: 'music' }`（回调链完整）
- 移开 → cursor 回到 `inherit`
- `getSeatScreenPos('blue' / 'pink')` 返回有限屏幕坐标
- `setMood('night', true)` + `setWeather('rain', true)` 交叉淡化正常（截图见会话记录）

### 3.6 登录页

`pnpm dev`（5173）打开 `/login`：改名后的 `LoginBackdrop` 正常绘制，控制台无报错。

---

## 4. 与方案的偏离（都是往"少暴露"的方向）

| 方案 §2.3 写的接口 | 实际 | 理由 |
|---|---|---|
| `fade-queue` 的 `clear()` | 未实现 | 全仓无调用点，加了就是新的死导出 |
| `lighting` 的 `createLightPass().destroy()` | 未实现 | 同上：`buildScene.destroy()` 从来不销毁光照容器（`root` 由调用方负责），实现它等于写一个没人调的方法 |
| `character-layer` 的 `getSeatLocalPos(seatId)` | 未实现，座位换算整体留在 `pixi-scene.ts` | `getSeatScreenPos` 只需要 `room.seats` 与 `root` 的变换，不碰任何角色状态；而且它对**所有**座位有效，角色层只含有美术资源的座位，搬过去会改变语义 |
| `character-layer.update(dt, elapsed, nowMs)` | `update(elapsed, nowMs)` | 角色部分不用 `dt`，留个不用的形参只会误导 |
| `affordance.update(dt, elapsed)` | `update(dt)` | 该层自己持有 `elapsed` —— 这正是消除 `pointerover` / `pointertap` 回调 TDZ 边缘的做法 |

方案里的 `pixi-scene.ts` → `room-compositor.ts` 改名（清单 B4）按授权边界**本轮不做**，留给后续统一阶段。

---

## 5. 未完成 / 留给后续

1. **`pixi-scene.ts` → `room-compositor.ts` 改名（B4）** —— 本轮边界明确要求路径不变，未做。改名时只需动 `room-scene.tsx:9` 一行
2. **`room-scene.tsx:141` 的失效 eslint disable 指令** —— 本轮未触碰该文件，warning 原样保留
3. **`room-scene.tsx:155-244` 的内联样式下沉到 `diary.css`（清单 A12）** —— 不在 PA-028 授权内
4. **`RoomArt` 的 `shadow` prop** —— 取消导出后只剩一个调用点且从不传 `false`，是删除候选，本轮未动
5. **`Hot.hoverAt` 字段** —— 搬进 `affordance.ts` 时原样保留，但全仓无读取点，是死状态；属于方案外的删除，未动
6. **`ai/PROJECT.md` 的项目结构表** —— `scene.tsx` 改名与 `room/` 新增九个模块需要同步，本轮未改（文档更新按项目规则走 `intj`）
