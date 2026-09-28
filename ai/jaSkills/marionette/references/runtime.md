# 运行时：让导出的 rig 在引擎里活起来

> 按需加载。接入运行时、换引擎、调时序与运动幅度时读。模板：`../templates/runtime/`。

## 分层

```
行为导演  rig-director.ts   真实状态 + 反应 → 现在该显示哪个姿势          （纯逻辑，可重放测试）
核心      rig-core.ts       姿势切换状态机、眨眼节奏、顶点变形、数据解码    （纯逻辑，与引擎无关）
适配层    rig-pixi.ts       加载清单与贴图、每个姿势一张网格、把核心的数推进网格（引擎相关）
```

核心和导演都不自己读时钟、不自己取随机数：调用方传 `nowMs` 和 `random`，所以任何一段行为都能在测试里原样重放。

## 每帧做什么

```
pose = director.update(now)                 // 状态 / 反应 → 姿势
if (pose !== view.current()) view.show(pose, animate = true)
view.update(elapsedSeconds)                 // 切换进度、眨眼、每个可见姿势的顶点变形
```

`view.update` 里：`switcher.frame(now)` 给出每个可见姿势的 alpha 和形变位移；
`blinker.closed(now)` 决定当前姿势用睁眼还是闭眼贴图（形变进行中不眨）；
对每个可见姿势调 `deformVertices(rest, positions, weights, t, motion, shift, amount)`。

## 姿势切换：两条路

**形变**（清单里有这一对的双向形变场）：420ms，easeInOut。

| 进度 t      | 旧姿势                                  | 新姿势                          |
| ----------- | --------------------------------------- | ------------------------------- |
| 0 → 1       | 顶点沿 a→b 移动 e·d（e = easeInOut(t)） | 顶点从 b→a 的 (1−e)·d 松回原位  |
| 0 → 0.25    | alpha 1                                 | alpha 0                         |
| 0.25 → 0.75 | alpha 1                                 | alpha smoothstep(0.25, 0.75, t) |
| 0.8 → 1     | alpha 1 − smoothstep(0.8, 1, t)         | alpha 1                         |

形状全程在走，图像只在中段交换；旧姿势等新姿势完全盖住（t ≥ 0.75）后才开始淡出，
所以光流没弯到位的残余是「软着陆」，不会在最后一帧啪地消失。

**盖上再淡出**（没有形变场）：新姿势画在最上层，180ms 淡入；旧姿势全程不透明，180ms 时开始 120ms 淡出。
标了 `slow` 的姿势（入睡 / 醒来）用 400ms + 300ms。

两条路共同的不变量：**任何时刻，最上层没到不透明时，它下面一定有一张完全不透明的**。
这是闪烁问题的根：两张同时半透明，场景从人物身上透出来，眼睛读到的是「人消失了一下」。
模板的测试逐 4ms 检查这条不变量，改时序时要保住它。

**打断**：切换进行中又来一次切换，先让当前形变立刻落地（旧 0、新 1），再开始新的一次；
半弯的网格不叠加。回到一个还在交接中的姿势，它直接重新淡入。

## 眨眼

闭眼 140ms，间隔 2.4–6.5s 随机，15% 概率连眨（第二下间隔 180ms）。换姿势后重新计时。
形变进行中暂停（闭眼贴图会换到正在弯的网格上）。

## idle 运动参数

画布 px / 弧度 / 秒。默认值来自一个 1377×1015 画布的半身像，显示时约 0.57 倍；换尺寸按比例换算。

| 参数                   | 默认            | 作用                                                            |
| ---------------------- | --------------- | --------------------------------------------------------------- |
| `breathPx` / `breathS` | 3.2 / 3.6       | 呼吸：按呼吸权重上抬，正弦                                      |
| `leanRad` / `leanS`    | 0.004 / 7.4     | 上半身绕 `pivotY` 的微摆，只作用于随呼吸动的部分                |
| `hairPx`               | 4.5             | 发梢最大位移                                                    |
| `hairS`                | 4.2 / 2.3 / 3.1 | 三个互质的周期叠加，看不出循环；相位沿 y 往下传，发梢跟着发根走 |
| `pivotY`               | 画布底          | 微摆的支点（坐姿 = 截断线）                                     |

**宁小勿大。** 显示尺寸下呼吸约 2px、发梢 2–3px 就够「活」；再大就变成晃。

## 适配层的职责（换引擎时照这个清单写）

1. 每个姿势一张网格：**铺满整张画布**、`floor(w/grid)+1 × floor(h/grid)+1` 个均匀分布的顶点，
   UV 与顶点一一对应（和导出时的采样位置一致）。记下静止位置 `rest`。
2. 眨眼只换贴图，网格不重建（Pixi 里要关 `autoResize`，否则换贴图会按贴图尺寸重排顶点）。
3. 每帧把核心给的 alpha 写进网格，调 `deformVertices` 改顶点，通知 GPU 顶点缓冲更新。
4. 切换时把新姿势放到最上层。
5. **第一次切换前把所有贴图上传 GPU**（Pixi：`import 'pixi.js/prepare'` + `renderer.prepare.upload`，**不要 await**——
   页面在后台时它可能一直不返回）。首次用到才上传的贴图会卡住它出现的那一帧，看起来就是人物消失。
6. 场景光：给所有姿势网格统一乘一个 tint（时辰、开关灯）。
7. 数据 PNG 读原始字节：`createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })`，
   不要走会做色彩管理或预乘的加载器。

各引擎的网格：

| 引擎               | 网格                                                                        | 改顶点                                                   |
| ------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| PixiJS v8          | `MeshPlane({ verticesX, verticesY })`                                       | `geometry.positions` + `getBuffer('aPosition').update()` |
| Three.js           | `PlaneGeometry(w, h, cols-1, rows-1)`（注意 y 轴朝上，要翻）                | `attributes.position` + `needsUpdate = true`             |
| Unity              | 自建 Mesh（`vertices` / `uv` / `triangles`），`MeshRenderer` + 透明材质     | `mesh.SetVertices` 每帧                                  |
| Godot 4            | `MeshInstance2D` + `ArrayMesh`，或 `Polygon2D` 的 `polygon`                 | 每帧重写数组                                             |
| Canvas 2D / 无 GPU | 不适用网格；可按三角形 `setTransform` + `clip` 画，成本高，只适合很小的人物 |                                                          |

## 行为导演

```ts
const director = createDirector(
    {
        statePose: { reading: 'reading', writing: 'writing', asleep: 'asleep', away: null },
        reactions: {
            glance: { pose: 'glance', priority: 1, seconds: [2.5, 4], in: ['reading'] },
            sip: { pose: 'sip', priority: 2, seconds: 2.4, in: ['reading', 'writing'] },
            poked: { pose: 'poked', priority: 3, seconds: 1.4, in: ['reading', 'writing'] },
            patted: { pose: 'patted', priority: 4, seconds: 0, in: ['reading', 'writing'] }
        },
        idle: [
            { reaction: 'sip', every: [90, 180], in: ['reading'] },
            { reaction: 'glance', every: [20, 60], in: ['reading'] }
        ]
    },
    'reading',
    random,
    performance.now()
);
```

规则：反应不打断优先级更高的；同一反应再来一次是延长；反应只在允许的状态里发生（空椅不能戳）；
自发小动作从「上一次回到状态」开始计时；按住类（摸头）`hold(kind, true)` 期间一直保持，松手后停留 0.8s。
**状态只来自真实事件**（在线、正在输入、主动设置），不因为「一会儿没操作」就编一个状态。

## 触碰

- 头部区域：按下后移动超过约 12px = 摸头（`hold(true)`），松手 `hold(false)`；按下不动就松开 = 戳；
- 身体区域：点一下 = 戳；
- 区域用姿势画布坐标定义（换算到屏幕），人不在（空椅）或睡着时关闭；
- 触碰区要在所有别的可点击层之上，但不能挡住 UI。

## 画质

- **按屏幕实际像素密度渲染**（最多 3 倍，并给总像素设上限），不要封顶 2 倍：3 倍屏会被浏览器再拉伸 1.5 倍，线稿发糊发锯齿。
- 任何滤镜（调色、天气）的分辨率要跟随画布（Pixi：`resolution: 'inherit'`、`antialias: 'inherit'`），
  否则滤镜按 1 倍渲染，整幅画面被压低再拉回；滤镜是无操作时直接不挂。
- 人物素材按最大显示尺寸的 1.5–2 倍出图；素材精度不够时，提高渲染倍率也救不回来。

## 可访问性与性能

- 用户开了「减少动效」：关掉 idle 运动和形变（切换直接换），保留眨眼——适配层模板的 `reducedMotion` 选项，接 `prefers-reduced-motion`。
- 页面隐藏时停掉 ticker。
- 顶点数：58×43 ≈ 2500 个 / 姿势，每帧只算可见的 1–2 个，CPU 成本可以忽略。
