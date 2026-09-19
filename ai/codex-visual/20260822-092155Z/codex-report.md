# Codex Visual Report — Hover 金色光效层

## 1. Mode and normalized brief

- **Mode:** design
- **目标：**为 PixiJS 生成 5 张可直接回贴到 `1586×992` 书房底图的预烘焙 hover 光效层。
- **输出约束：**严格使用给定裁切框与文件名；32-bit RGBA PNG；背景 alpha=0；只含金色发光，不含物件或场景像素。
- **视觉配方：**`#FFE6B5` 附近的亮金细芯 → 暖金中层 → `#FFC978` 低透明外晕；轮廓亮度带轻微水彩不均匀性，避免程序化等宽硬描边。
- **生成路径：**仅使用 bundled `imagegen` skill 的 built-in `image_gen`；未使用 CLI/API-key fallback。

## 2. Evidence inventory

| 证据 | 声明角色 | 实际使用方式 |
|---|---|---|
| `room-study-twilight-clean.png`，1586×992 | 几何与坐标基准 | 按给定矩形逐像素裁切；所有最终图均以它的物件位置配准，并在其上做回贴 QA。 |
| `hover-state.png`，1586×992 | 场景内 hover 强度基准 | 用于判断“明确但不刺眼”的整体强度；不作为坐标基准。 |
| `glow-detail.png`，1024×768 | 光效层级与笔触基准 | 用于内芯、中带、外晕、少量星芒和水彩边缘的生成提示。 |

直接观察：图 1 的日记本是弧形书页轮廓；两个相框为不同尺寸和倾角的直角框；挂钟近圆；唱片机下箱体为透视四边形；许愿罐包含椭圆瓶口、肩部/瓶身曲线与右侧提手。图 3 的亮芯很窄，外晕宽而低透明，转角/高点更亮。图 2 只有许愿罐处于显式 hover，因此其余四件的强度来自同一视觉配方的推演。

## 3. Executive verdict

已完成 5 张生产尺寸 RGBA PNG，并通过像素级尺寸、alpha、透明边界和坐标回贴检查。所有四角 alpha 均为 0，边框最大 alpha 均为 0，没有黑边或绿色键控残留；光效核心最大 alpha 为 213–217/255，给运行时淡入和混合模式保留了余量。

推荐默认使用 **NORMAL + display alpha 0.85–0.95**。较暗时辰可使用 **ADD + display alpha 0.40–0.60**；ADD 不建议满强度，否则亮芯会比参考图 2 更刺眼。

## 4. Concept matrix / delivery scorecard

| 文件 | 裁切框 `(x,y,w,h)` | 最终尺寸 | alpha 非零包围盒（局部坐标） | 最大/非零均值 alpha | 推荐混合 |
|---|---:|---:|---:|---:|---|
| `glow-timeline.png` | `742,432,356,226` | 356×226 | `42,51,276,143` | 216 / 97.1 | NORMAL 0.90；ADD 0.50 |
| `glow-photos.png` | `882,0,346,248` | 346×248 | `79,41,205,156` | 213 / 109.2 | NORMAL 0.85；ADD 0.45 |
| `glow-clock.png` | `1242,0,286,280` | 286×280 | `57,57,175,175` | 214 / 107.1 | NORMAL 0.85；ADD 0.45 |
| `glow-music.png` | `792,692,356,271` | 356×271 | `41,92,275,164` | 215 / 101.2 | NORMAL 0.85；ADD 0.45 |
| `glow-wishlist.png` | `1177,357,246,341` | 246×341 | `52,57,161,241` | 217 / 100.0 | NORMAL 0.95；ADD 0.55 |

这里的 display alpha 是乘在 PNG 自带 alpha 之上的建议初值；最终仍应由 hover tween 调整。

## 5. Detailed findings with observed evidence

### 对位方法

1. 以图 1 原始 `1586×992` 像素为唯一坐标空间，严格按五个给定矩形裁出几何参考。
2. 每个物件分别调用 built-in `image_gen` 生成“纯绿色键控底上的光线”，没有把物件像素带入成品。
3. 对每张生成源测量高置信发光核心包围盒，再把它双三次采样配准到图 1 中物件的可见轮廓范围；最终画布直接创建为表中目标尺寸，没有二次自动裁边。
4. 把 5 张 PNG 按原始 `(x,y)` 无缩放回贴到图 1，生成 `qa-scene-all-normal.png`。该图是同时点亮五件物品的压力测试，不代表实际单 hover 状态。
5. 单独把许愿罐贴回图 1 生成 `qa-wishlist-normal.png`，用于与图 2 的 hover 强度和瓶身曲线效果对照。

### Chroma key 与 luminance→alpha

- 键控源使用纯绿色意图背景；模型实际输出存在轻微绿色明度波动，因此没有用单一 RGB 等值删除。
- 每张源图采样外侧 3% 边框得到实际键色均值，计算像素相对键色的发光距离；距离低于 34 的像素 alpha 置零，距离在 34–315 间以 gamma `0.72` 映射为 alpha，再乘 `0.82` 强度上限。
- 这是对发光能量的 luminance→alpha 归一化：亮芯获得高 alpha，暖光带中等 alpha，外晕保持低 alpha。
- RGB 使用 straight-alpha 金色梯度重新着色：低能量端 `#FFC978`，高能量端收敛到 `#FFE6B5`。因此透明边缘不是黑色预乘，也没有绿色 despill 残留；NORMAL 和 ADD 都可自然叠加。
- 轮廓中低 alpha 部分保留了非常轻的确定性明暗起伏，只改变生成光线的透明度，不改变轮廓几何，用于削弱机械等宽感。

### 分项设计判断

- **Timeline：**保留书页上缘的双弧、中央书脊低点、页块和下封角。亮芯沿弧线连续，外晕比直线段更柔；NORMAL 0.90 最接近图 3 的 hover 档。
- **Photos：**分别追踪大小相框，不连接两框，也不点亮置物架、照片或人物。角点自然更亮，直边仍带轻微水彩起伏。
- **Clock：**外圆周为主，内圈只作为较弱层次；钟面、刻度和指针保持不受影响。圆周 alpha 连续，未在裁切边缘截断。
- **Music：**给定裁切框顶部与打开的箱盖可见区域相交，和“48px 外发光余量”存在冲突。最终将“唱片机箱”收敛为下方承载转盘的箱体：描上沿透视四边形、侧角、前缘和底缘，不描打开的箱盖、唱片或控制件，因此所有光晕都完整落在裁切框内。
- **Wishlist：**瓶口椭圆、肩部、瓶身底弧和右侧提手为主；不重复绘制罐内星星，也不把蝴蝶结当成主视觉。单物件回贴图的明度低于图 3 局部特写、接近图 2 场景态，并给运行时 ADD 留出安全余量。

### Pixel QA

| 文件 | PNG 模式 | 透明角 | 边框最大 alpha | SHA-256 |
|---|---|---:|---:|---|
| `glow-timeline.png` | 32bpp ARGB | 4/4 为 0 | 0 | `cfe7cb6ef9314c5df07052efb4b7709966f7d4af5491d1e1fd048fc88951ee1f` |
| `glow-photos.png` | 32bpp ARGB | 4/4 为 0 | 0 | `0f19b18d2287c4d75582a4cde427eb328b2bf6d10e507a62ef028b8afa8c8a5c` |
| `glow-clock.png` | 32bpp ARGB | 4/4 为 0 | 0 | `bdf3f3433797e03ae244646d56d72c26570dcc13e1cde351db26af9c46bfdfbf` |
| `glow-music.png` | 32bpp ARGB | 4/4 为 0 | 0 | `82d520569b21d9e687881458ffcf45abeab56b7e2eb132d6dd01118d5e55253b` |
| `glow-wishlist.png` | 32bpp ARGB | 4/4 为 0 | 0 | `19ff4a36ba9f1718c240dfe0caa0957980aab386863205395ec257a622e81b0e` |

## 6. Uncertainty and comparability limits

- 图 2 是另一张已带 hover 的整场景成图；其部分物件位置、局部明暗和图 1 并非严格像素同一状态，因此只用于强度判断，不能做差分提取或几何定位。
- 图 3 是 1024×768 的局部说明板，包含文字、上下两档状态和不同裁切比例；它只可比较光效层级，不能比较绝对像素宽度。
- 唱片机裁切框与打开的箱盖相交，无法同时做到“完整描箱盖”和“边缘保留外晕”。本交付优先满足无裁断、可运行时回贴和“箱体棱线”的文字要求，故只点亮下箱体。
- 生成光效是水彩风格的视觉匹配，不是从矢量路径导出的数学描边；回贴 QA 证明的是可见轮廓贴合与裁切安全，不声称亚像素级轮廓同源。

## 7. Recommendation and next actions

1. PixiJS 中按表中 `(x,y)` 放置，贴图保持原始像素尺寸；场景整体缩放时让底图与 glow 容器共享同一 scale，不要分别计算。
2. 默认使用 `NORMAL`，hover 淡入建议 `140–220ms`、ease-out；退出 `180–260ms`，避免闪烁感。
3. 深色时辰若切到 `ADD`，从表中 ADD alpha 起步；不要同时叠加 CSS/Pixi 程序描边。
4. 若产品明确要求打开的唱片机箱盖也发光，需要扩大 `glow-music` 的裁切框向上覆盖箱盖；在现有固定框内不建议强行加入。

### Final prompt set（归一化摘要）

公共提示：`background-extraction`；PixiJS 预烘焙 hover overlay；以图 1 各裁切为精确几何，以图 3 为金色水彩光效风格；纯 `#00ff00` 键控背景；只画光、不画物件/场景；内芯 `#FFE6B5`、中层暖金、外晕 `#FFC978`；最多 0–2 个贴轮廓小星芒；禁止硬质均匀矢量描边、实体填充、文字和水印。

分项几何提示：日记本追踪书页双弧与书脊；相框追踪两个独立透视直角框；挂钟追踪外圆及较弱内圈；唱片机只追踪下箱体外缘；许愿罐追踪瓶口、瓶肩、瓶身底弧及右侧提手，不画罐内星星。

## 8. Artifact manifest

### Production assets

- `D:\Repo\our-world\codex-visual\20260822-092155Z\glow-timeline.png`
- `D:\Repo\our-world\codex-visual\20260822-092155Z\glow-photos.png`
- `D:\Repo\our-world\codex-visual\20260822-092155Z\glow-clock.png`
- `D:\Repo\our-world\codex-visual\20260822-092155Z\glow-music.png`
- `D:\Repo\our-world\codex-visual\20260822-092155Z\glow-wishlist.png`

### QA evidence

- `D:\Repo\our-world\codex-visual\20260822-092155Z\qa-wishlist-normal.png` — 单 hover、NORMAL 回贴检查。
- `D:\Repo\our-world\codex-visual\20260822-092155Z\qa-scene-all-normal.png` — 五层同时回贴的对位/强度压力测试。

### Report

- `D:\Repo\our-world\codex-visual\20260822-092155Z\codex-report.md`

所有原始参考图均保持未修改。
