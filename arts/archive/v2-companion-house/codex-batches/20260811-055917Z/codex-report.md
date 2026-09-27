# Concept C 像素规格提取与素材交付

## 1. Mode and normalized brief

- **Mode:** Design（像素级规格提取 + 项目素材生产）
- **规格真源:** `ai/concept/ui-system/concept-c-narrow-rail.png`，1586×992。
- **对照图:** `ai/design_system/cinnaglass/_shots/shell-c-impl-v3.png`，1600×1000；只用于辨认当前实现与概念稿的状态差异，不参与任何规格取值。
- **交付目标:** 将参考图 1 中可见的 UI 转写为能直接落 CSS 的绝对坐标、尺寸、颜色和材质规格，并生成 `avatar-blue.png`、`avatar-pink.png`、`disc-cover.png` 三张 256×256 PNG。
- **坐标约定:** 左上角为 `(0,0)`；`x/y/w/h` 为 CSS 风格的 0-based 坐标和覆盖宽高。表中“外框”使用肉眼可见的主轮廓（strong edge）；抗锯齿或 glow 超出主轮廓时另列。

### 测量方法

使用 `measure_concept.py` 直接解码参考 PNG（8-bit sRGB），逐行反 PNG filter 后进行：

1. 水平/垂直 RGB 欧氏梯度扫描定位 strong edge；
2. 局部 crop 放大 2×，在原像素上复核圆角切点、图标和内件包围盒；
3. 多点取样记录**最终合成像素**；
4. 玻璃 alpha 因没有无 UI 的同帧底图，只能用邻域差和同类组件反推，明确标为“推测 rgba”。

置信度：**H** = 强边界可复现，通常 ±1 px；**M** = 抗锯齿/水彩柔边，通常 ±2 px；**L** = 被裁切、被场景纹理干扰或只能反推 alpha。

## 2. Evidence inventory

| ID | 角色 | 文件 | 实际像素 | 用法 |
|---|---|---|---:|---|
| E1 | reference / 唯一规格源 | `D:\Repo\our-world\ai\concept\ui-system\concept-c-narrow-rail.png` | 1586×992 | 全部几何与颜色测量 |
| E2 | reference / 差距对照 | `D:\Repo\our-world\ai\design_system\cinnaglass\_shots\shell-c-impl-v3.png` | 1600×1000 | 仅说明状态、内容与 viewport 不同 |
| E3 | raw measurement | `pixel-evidence.json` | 37,492 bytes | 采样点、均值、梯度峰、组件框 |
| E4 | reproducibility | `measure_concept.py` | Python stdlib | PNG 解码、测量、crop 生成 |
| E5 | visual QA crops | `measurement-crops/*.png` | 2× nearest | 组件边缘和内件复核 |

## 3. Executive verdict

Concept C 的壳体不是一组普通深色卡片，而是三层材质：**深石墨面板 → 浅雾按钮/占位条 → 蓝或暖金高亮**。1:1 复刻最容易失真的地方有三处：

1. 组件整体尺度必须按 1586×992 原坐标放置，不能直接套当前 1600×1000 实现的尺寸；
2. 所有面板都有 1 px 亮描边、顶缘内高光和低位暗影，单独使用 `background: rgba(...)` 会显得扁；
3. 参考图中的玻璃是已与场景合成的最终 RGB，没有 alpha 通道，所以下方给出的 alpha 是可落地的反推值，不是源文件隐藏属性。

参考图 2 与参考图 1并非逐项可比：viewport 不同，氛围控件是收起态，聊天卡没有展开，音乐条内容结构不同。明显差距是当前实现整体更薄、更暗、更小，而概念稿的展开态面板和按钮有更强的雾面亮度与 1 px 高光边。

## 4. Pixel specification scorecard

| 区域 | 主外框置信度 | 内件置信度 | 颜色置信度 | 备注 |
|---|---:|---:|---:|---|
| Rail | H | H/M | H（合成色）/ M（alpha） | 底部场景变暗导致同材质最终 RGB 变化 |
| 房间缩略面板 | H | M | M | 缩略图是绘画内容；卡框边缘有蓝 glow |
| 氛围面板 | H | M | H/M | 中央下凸 tab 与主体重叠 |
| 纪念卡 | H | H/M | H/M | 蛋糕为栅格插画，不宜 CSS 重画 |
| Presence | H | H | H/M | 结构最清晰 |
| 聊天卡 | H | H/M | H/M | 空白气泡有场景光污染 |
| 音乐条 | H | H/M | H/M | 参考图仅能确认一条水平进度轨 |
| 右缘把手 | H（可见部分） | H | H | 右侧被 viewport 裁切 |
| 场景 affordance | M | M | H/M | 许愿罐是非矩形轮廓 |

## 5. Detailed pixel findings

### 5.1 左侧 rail

#### 外框与材质

| 项 | 规格 | 证据 / 颜色 | 置信度 |
|---|---|---|---:|
| 主外框 | `x:14; y:39; w:56; h:914` | strong edge；AA halo 到 `x:13..70`、`y:38..954` | H |
| 圆角 | `23px`；上下同半径 | 顶端切点约 `y:39→62`，底端约 `y:929→953` | M |
| 边框 | `1px solid rgba(229,228,240,.58)` | 顶点实测 `#AEAEBB`；侧边样本均值 `#5D5D6C`（叠在暗景上） | M |
| 底色 | 观察均值 `rgba(58,57,71,1)` / `#3A3947` | 12 个空区点；上半部多为 `#3B3D4F`，底部场景较暗到 `#302E33` | H |
| 推测玻璃 | `rgba(46,48,69,.78)` | 保留场景透色；不要使用纯不透明 `#3A3947` | M |
| 阴影 | `0 10px 24px rgba(3,3,12,.32), inset 0 1px 0 rgba(255,255,255,.25)` | 左右暗边 + 顶缘内亮线 | M |

#### 按钮与图标

所有按钮中心 `x=42px`；默认板约 `x:21; w:42; h:47±2; border-radius:19px`。默认板空区实测均值 `#545263`，建议 `rgba(151,149,169,.25)`；选中板实测均值 `#515A7D`，建议 `rgba(83,111,183,.44)`。

| 按钮 | 按钮框 x/y/w/h | center y | 图标框 x/y/w/h | 图标颜色 | 置信度 |
|---|---|---:|---|---|---:|
| Home / 选中 | `21/59/42/48` | 83 | `30/71/24/24` | core `#F8F8F9` | H/M |
| Chat | `21/146/42/49` | 171 | `30/160/24/22` | `#F8F8F9` | H/M |
| Photo | `21/229/42/47` | 252 | `30/240/23/23` | `#F8F8F9` | H/M |
| Calendar | `21/308/42/48` | 332 | `31/319/22/25` | `#F8F8F9` | H/M |
| Music | `21/389/42/48` | 413 | `31/400/22/25` | `#F8F8F9` | H/M |
| Grid | `21/507/42/48` | 531 | `31/519/22/23` | `#F8F8F9` | H/M |
| Bag | `21/587/42/49` | 611 | `30/599/23/24` | `#F8F8F9` | H/M |
| Settings | `21/669/42/48` | 693 | `29/681/25/25` | `#F8F8F9` | H/M |

- 图标统一为约 `2.5px` round stroke；抗锯齿边缘落到 `#D9D9E0`，实心高亮落到 `#F8F8F9`。
- Chat 未读点：`x:52; y:144; w:14; h:14; border-radius:50%`，中心约 `(59,151)`；填色实测 `#FA9FB2`，外缘约 `2px rgba(255,223,231,.75)`，粉色外发光约 `0 0 7px rgba(250,159,178,.55)`。
- 分隔线：`x:27; y:468; w:29; h:2; border-radius:1px`；亮行实测 `#9291A0`，下方 1 px 暗化为 `#616173`。

### 5.2 Rail 顶部房间缩略卡

#### 面板

| 项 | 规格 | 证据 | 置信度 |
|---|---|---|---:|
| 包含指针总框 | `x:105; y:45; w:432; h:173` | 指针尖到右边强边界 | H |
| 主体框 | `x:115; y:45; w:422; h:173` | 主体左缘不含指针 | H |
| 主体圆角 | `21px` | 四角切点 | M |
| 左指针 | tip `(105,94)`；base `x:115, y:80..108` | 约 45° 菱形尖角 | M |
| 底色观察均值 | `#605985` / `rgba(96,89,133,1)` | 六个空白带采样；下缘受粉紫窗光影响 | H |
| 推测玻璃 | `linear-gradient(180deg, rgba(61,73,122,.78), rgba(82,68,104,.74))` | 参考图存在明显蓝上/粉下色移 | M |
| 边框 | `1px solid rgba(231,231,244,.58)` | 顶缘点 `#A2A0B3`；右边场景合成点 `#3A4689` | M |

#### 三张卡

| 卡 | 外框 x/y/w/h | 图片 inset 后 x/y/w/h | 与前卡间距 | 圆角 | 状态 |
|---|---|---|---:|---:|---|
| 书房 | `142/64/116/133` | `146/68/108/125` | — | `17px` | 当前项 |
| 棋牌室 | `273/65/114/131` | `277/69/106/123` | 15px | `16px` | 默认 |
| 阳台/植物房 | `403/65/114/131` | `407/69/106/123` | 16px | `16px` | 默认 |

- 面板 padding：左 `27px`，上 `19px`，右约 `20px`，下约 `21px`；卡框尺寸因绘制柔边有 ±2 px。
- 当前项描边：core 约 `3px #9BB0EE`，外扩 glow 约 `0 0 9px rgba(86,118,255,.72)`；扫描峰在 `x=142/145/254/255`。
- 选中点：中心 `(200,197)`，外径 `16px`，填色中心实测 `#CCE8FD`，建议 `background:#CDE9FF; border:2px solid #F0F7FF; box-shadow:0 0 8px #6EA8FF`。
- **房间名条：参考图像素内没有可分离的底部文字/名称条。** 三张图像一直延伸到卡片下圆角，唯一额外元素是当前项选中点。1:1 复刻应设 `display:none`，不要凭 brief 自增 20–24 px footer。置信度 H。

### 5.3 顶部中央灯光 / 天气展开面板

| 项 | 规格 | 颜色 / 样式 | 置信度 |
|---|---|---|---:|
| 总框（含下凸） | `x:692; y:24; w:206; h:128` | strong edge | H |
| 主体 | `x:692; y:24; w:206; h:112` | `border-radius:19px` | H/M |
| 中央下凸 tab | `x:754; y:107; w:82; h:45` | 下圆角约 `26px`；与主体叠合 | M |
| 底色观察均值 | `#4D4D6D` | 6 个空区点均值 `rgba(77,77,109,1)` | H |
| 推测玻璃 | `rgba(52,56,91,.78)` | 顶部略偏蓝，底部略偏暖 | M |
| 边框 | `1px solid rgba(234,232,243,.58)` | 顶缘 `(790,24)` 实测 `#B1AFBC` | M |
| 两行分隔 | `x:718; y:79; w:161; h:2` | 亮 `rgba(221,217,227,.36)`；下缘暗 1 px | M |

两行都使用 3 列；列中心约 `x=739, 797, 855`，中心间距 `58px`；推荐 cell `40×36px`，列 gap `18px`。

| 行 / 项 | 图标框 x/y/w/h | 中心 | 状态 / 颜色 |
|---|---|---|---|
| 灯光：日出 | `722/43/35/30` | `(739,58)` | active，core `#FAB16C`，glow `rgba(255,176,88,.55)` |
| 灯光：月亮 | `782/41/31/31` | `(797,57)` | inactive `#C5C3CB` |
| 灯光：深夜 | `840/41/31/31` | `(855,57)` | inactive `#B7B7BE` |
| 天气：晴 | `724/90/31/31` | `(739,105)` | active，core `#F7BD70` |
| 天气：云 | `781/92/32/24` | `(797,104)` | inactive `#C5C3CB` |
| 天气：雨 | `842/91/27/31` | `(855,106)` | inactive cloud `#B7B7BE`，雨滴 `#C4E3F1` |

当前项没有独立按钮底板；高亮靠暖金填色、约 `0 0 9px rgba(255,175,82,.55)` 的局部 glow。收起箭头：`x:787; y:128; w:17; h:11`，stroke `4px`、round cap，颜色 `#F0EFF4`。

### 5.4 右上纪念卡

| 项 | 规格 | 样式 / 颜色 | 置信度 |
|---|---|---|---:|
| 外框 | `x:1326; y:41; w:233; h:105` | `border-radius:19px` | H/M |
| 底色观察均值 | `#544D5D` / `rgba(84,77,93,1)` | 六空区点 | H |
| 推测玻璃 | `rgba(64,62,83,.80)` | 暖场景仍透出 | M |
| 边框 | `1px solid rgba(238,234,243,.62)` | 顶缘亮点约 `#C1BABF` | M |
| 蛋糕插画 | `x:1345; y:58; w:67; h:62` | 不另加底板；暖金/奶油/粉 | M |
| 信息条 1 | `x:1430; y:65; w:79; h:22` | radius `11px` | H/M |
| 信息条 2 | `x:1430; y:102; w:79; h:21` | radius `10.5px` | H/M |
| Eye | `x:1518; y:66; w:25; h:20` | `#F8F8F9`，约 `3px` stroke | M |
| Heart | `x:1519; y:103; w:22; h:20` | inactive `#AC9AA3` | M |

两条 blank 观察样本均值约 `#9993A2`，建议 `background:rgba(224,216,226,.55)`；不加边框，只保留很弱的 `inset 0 1px rgba(255,255,255,.14)`。

### 5.5 Presence 胶囊

| 项 | 规格 | 样式 / 颜色 | 置信度 |
|---|---|---|---:|
| 外框 | `x:952; y:221; w:214; h:50` | 完整 pill，radius `25px` | H |
| 底色观察均值 | `#4A455C` / `rgba(74,69,92,1)` | 六空区点 | H |
| 推测玻璃 | `rgba(55,56,84,.80)` | 建议 `backdrop-filter:blur(12px)` | M |
| 绿点 | `x:968; y:237; w:17; h:17`，中心 `(976.5,245.5)` | core `#73EF82`；亮缘 `#A6E7B5`；glow 6px | H/M |
| Blank 条 | `x:997; y:233; w:126; h:25` | radius `12.5px`；观察约 `#9E96A8` | H/M |
| Heart | `x:1136; y:234; w:18; h:19`，中心约 `(1145,244)` | core `#F9ABBD`；glow 5px | M |

内部左右：绿点距外框左 `16px`；blank 距绿点右约 `12px`；heart 距右边约 `12px`。

### 5.6 左下聊天卡

#### 外框

| 项 | 规格 | 样式 / 颜色 | 置信度 |
|---|---|---|---:|
| 外框 | `x:187; y:618; w:277; h:330` | radius `22px` | H/M |
| 底色观察均值 | `#413D48` / `rgba(65,61,72,1)` | 六空区点；右上受灯光污染 | H |
| 推测玻璃 | `rgba(38,42,65,.84)` | 比顶部面板更实，保证聊天可读 | M |
| 边框 | `1px solid rgba(233,230,241,.48)` | 顶缘 + 左缘最明显 | M |
| Close | `x:429; y:636; w:15; h:15` | 两条 `2px #F8F8F9`，中心 `(436.5,643.5)` | M |

#### 行与控件

| 元素 | x/y/w/h | 圆角 / 颜色 | 置信度 |
|---|---|---|---:|
| 蓝头像外圆 | `210/649/61/61` | circle；外缘 `2px #E9EDF4` + 蓝环 | M |
| 蓝头像可视圆 | `214/653/53/53` | `avatar-blue.png` 对应 | M |
| 蓝行在线点 | `255/692/15/15` | core `#7FF48E`，2 px 亮缘 | M |
| 蓝消息 blank | `285/657/133/45` | radius `17px`；观察约 `#9392A6` | H/M |
| 粉头像外圆 | `210/730/61/61` | circle；外缘 `2px #F4E8EB` + 粉环 | M |
| 粉头像可视圆 | `214/734/53/53` | `avatar-pink.png` 对应 | M |
| 粉行在线点 | `255/773/15/15` | core `#82F38C` | M |
| 粉消息 blank | `285/738/117/45` | radius `17px`；观察约 `#8F8DA3` | H/M |
| Reaction 容器 | `272/808/101/46` | radius `23px`；`rgba(91,91,116,.54)`；1 px 淡边 | H/M |
| Heart reaction | `289/819/25/24` | `#FBA7B9`；粉 glow 7px | M |
| Star reaction | `331/817/27/28` | `#FDCB7D`；金 glow 7px | M |
| 输入组外框 | `207/871/244/56` | radius `28px`；1 px `rgba(220,218,231,.32)` | H/M |
| 输入 blank | `216/883/187/37` | radius `18.5px`；观察均值 `#656673` | H/M |
| 发送按钮 | `409/883/38/38` | circle；`rgba(121,123,147,.42)`；1 px 亮边 | H/M |
| 发送 glyph | `419/893/18/18` | 约 `3px #F8F8F9` round stroke | M |

消息行垂直节奏：首头像 top `649`，第二头像 top `730`，行距 `20px`；reaction 与第二行底部间约 `17px`；输入组 top `871`，距 reaction 底 `17px`。

### 5.7 右下音乐播放器

| 项 | 规格 | 样式 / 颜色 | 置信度 |
|---|---|---|---:|
| 外框 | `x:1122; y:865; w:437; h:88` | radius `22px` | H/M |
| 底色观察均值 | `#3D3A52` / `rgba(61,58,82,1)` | 六空区点 | H |
| 推测玻璃 | `rgba(46,49,80,.84)` | 紫蓝方向 | M |
| 边框 | `1px solid rgba(231,229,241,.48)` | 顶缘扫描 strong edge `y=865` | M |
| 唱片 | `x:1135; y:876; w:66; h:66` | circle；1 px 淡银边；`disc-cover.png` 对应 | H/M |
| 标题 blank | `x:1213; y:882; w:104; h:18` | radius `9px`；观察约 `#9291A0` | H/M |
| 进度轨 | `x:1213; y:914; w:193; h:8` | radius `4px`；未填 `#555772` | H |
| 已填段 | `x:1213; y:914; w:65; h:8` | `#F5F4F7` | M |
| 进度 knob | `x:1268; y:909; w:18; h:18`，中心 `(1277,918)` | `#F8F8FA`，soft shadow | H/M |
| Pause 大钮 | `x:1428; y:881; w:58; h:58` | circle；`rgba(119,121,155,.42)`；1 px 亮边 | H/M |
| Pause glyph | 两条约 `6×22px`，中心组 `(1457,910)` | `#F8F8F9` | M |
| 分隔线 | `x:1496; y:879; w:2; h:61` | 左亮 `#64667C`，右暗 `#3E3F55` | H |
| 收起按钮板 | `x:1511; y:883; w:52; h:52` | circle；`rgba(105,106,137,.35)` | H/M |
| 收起箭头 | `x:1528; y:902; w:18; h:12` | `4px #F1F0F4` round stroke | M |

**像素事实限制：**参考图 1 只显示一条明确的水平轨（`1213/914/193/8`）和一条标题 blank（`1213/882/104/18`）。没有第二条可分离的信息条，也没有独立音量轨或音量 icon。1:1 复刻应隐藏这些不存在的元素；若产品功能必须保留音量，应作为偏离概念稿的新增状态，不应伪称从图中测得。置信度 H。

### 5.8 右缘换房把手

| 项 | 规格 | 样式 / 颜色 | 置信度 |
|---|---|---|---:|
| 可见外框 | `x:1531; y:291; w:55; h:99` | 右侧在画布外被裁切 | H |
| 左侧圆角 | top-left / bottom-left `24px` | 右圆角不可见 | M |
| 底色 | 观察约 `#4F4D61`；推测 `rgba(67,68,91,.80)` | 1 px 亮边 | M |
| Chevron | bbox `x:1555; y:329; w:14; h:23`，中心约 `(1562,340.5)` | `4px #F8F8F9`，round join | H/M |

不能从 source 恢复完整宽度；CSS 要复刻**可见结果**可设 `right:-10px; width:65px; height:99px`，使 viewport 内仍只见约 55 px。`65px` 是裁切模型推测值，置信度 L；可见 `55px` 是实测 H。

### 5.9 场景内 affordance

#### 许愿罐热点

- glow 总影响框：`x:1271; y:386; w:151; h:226`（含模糊晕光）；置信度 M。
- 主轮廓跟随瓶身，不是矩形圆角：顶部口沿约 `x:1291..1398, y:390..419`；瓶身最宽约 `x:1282..1411`；底部约 `y:600`。
- 核心描边：约 `3px #FFE6B5`；内侧暖边在局部像素约 `#FCCD77`。
- 外发光建议：`drop-shadow(0 0 4px rgba(255,236,181,.95)) drop-shadow(0 0 12px rgba(255,178,72,.80)) drop-shadow(0 0 22px rgba(255,137,43,.42))`。
- 实现应使用同瓶形 alpha mask / SVG path 做 `filter:drop-shadow()`；用矩形 `box-shadow` 会与参考图明显不符。

#### Heart / Star 气泡

| 项 | 规格 | 样式 |
|---|---|---|
| 总框 | `x:1395; y:413; w:78; h:75` | 近圆 body + 左下小尾巴；radius 约 `35px` |
| 底色 | 观察约 `#605B70`；推测 `rgba(73,71,92,.82)` | 1 px 暖白边 `rgba(244,222,225,.58)` |
| Heart | `x:1403; y:429; w:23; h:22` | core `#FAA9BB`，粉 glow 6px |
| Star | `x:1427; y:437; w:21; h:23` | core `#FFE6B5`，金 glow 6px |

#### 蓝耳角色旁省略号气泡

| 项 | 规格 | 样式 |
|---|---|---|
| 总框 | `x:899; y:289; w:54; h:54` | 圆 body 约 `52px` + 右下尾巴 |
| 底色 | 观察约 `#615863`；推测 `rgba(82,76,91,.83)` | 1 px `rgba(242,220,224,.66)` |
| 三点 | 中心约 `(917,315) / (926,315) / (935,315)` | 每点约 `7px` diameter；`#EEEAF0` |
| 阴影 | `0 6px 12px rgba(15,8,15,.28)` | 无强 glow |

### 5.10 全局玻璃与图标共性

#### 可直接落 CSS 的 token 推测

```css
:root {
  /* 推测 alpha；最终 RGB 需在同一 scene 上比对 */
  --cg-panel: rgba(46, 49, 75, 0.80);
  --cg-panel-dense: rgba(38, 42, 65, 0.84);
  --cg-control: rgba(151, 149, 169, 0.25);
  --cg-highlight-blue: rgba(83, 111, 183, 0.44);
  --cg-placeholder: rgba(224, 216, 226, 0.55);

  --cg-stroke: rgba(233, 231, 242, 0.54);
  --cg-inner-highlight: rgba(255, 255, 255, 0.23);
  --cg-icon: #f8f8f9;
  --cg-icon-muted: #c5c3cb;
  --cg-pink: #faa6b9;
  --cg-green: #7cf289;
  --cg-gold: #fccc85;

  --cg-shadow: 0 10px 24px rgba(3, 3, 12, 0.32);
  --cg-inset: inset 0 1px 0 rgba(255, 255, 255, 0.23);
}

.cg-glass {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--cg-panel), white 5%),
    var(--cg-panel));
  border: 1px solid var(--cg-stroke);
  box-shadow: var(--cg-shadow), var(--cg-inset);
  backdrop-filter: blur(12px) saturate(112%);
}
```

#### 三档材质矩阵

| 层级 | 参考图观察值 | 推荐推测 rgba | 用途 |
|---|---|---|---|
| 面板 | rail `#3A3947`；chat `#413D48`；music `#3D3A52` | `rgba(46,49,75,.80)`；聊天用 `.84` | rail / 卡 / 播放器 |
| 按钮 / blank | 默认按钮 `#545263`；blank 平均 `#9993A2` | 按钮 `rgba(151,149,169,.25)`；blank `rgba(224,216,226,.55)` | icon plate / 信息占位 |
| 高亮 | rail 选中板 `#515A7D`；房间边 `#9BB0EE`；金 `#FCCC85` | 蓝板 `rgba(83,111,183,.44)`；active glow 另加 | selected / active |

统一规则：

- 主面板 `1px` 亮描边；顶缘视觉亮度高于侧/底缘。
- `box-shadow` 是低位深影，选中项另加蓝/粉/金局部 glow；不要给所有面板统一霓虹边。
- 白线图标 core `#F8F8F9`，inactive `#C5C3CB`，stroke 约 `2.5px`，`stroke-linecap:round; stroke-linejoin:round`。
- 大面板圆角 `19–22px`；50px pill 为 `25px`；42px rail plate 为约 `19px`。
- 模糊半径建议 `12px`，但参考 PNG 本身无法区分 backdrop blur 与原场景软焦，所以该值为 M 级推测。

## 6. Uncertainty and comparability limits

1. 参考 PNG 是完全扁平化的 RGB/RGBA 图；所有可见像素 alpha 均为 255。报告中的 `rgba(..., alpha)` 是为复刻最终观感而反推，不是读取到的隐藏透明度。
2. AI 概念稿的线条有水彩软化与 glow；因此 CSS strong edge 与 AA halo 必须分开。外框 H，圆角和 glyph bbox 多为 M。
3. 房间缩略图没有可见名称条；音乐条没有可见独立音量条或第二信息条。报告不会为满足文字 brief 而虚构像素。
4. 右缘把手右半部分超出 1586px viewport，只能准确给出可见 55px；完整宽度是低置信度推测。
5. 参考图 2 为 1600×1000 且多个控件处于不同状态，不能做像素差分或简单 resize 后相减。

## 7. Recommendation and next actions

1. 建立固定的 `1586×992` shell 坐标层，先按本报告绝对定位；响应式只对整个 shell 做统一 scale，避免组件各自换算导致漂移：`scale = min(viewportWidth / 1586, viewportHeight / 992)`。
2. 优先复刻 rail、presence、纪念卡、音乐条四个强边界组件；它们足以校准 glass token。待最终 RGB 接近后再做 room popover、ambience 和聊天卡。
3. 将三个 PNG 作为实际素材使用；头像 CSS 显示建议 `object-fit:cover; border-radius:50%`，概念稿聊天卡的可视头像为 53px、外圆 61px。
4. 许愿罐 glow 必须基于瓶形 alpha mask；不要用矩形热点轮廓。
5. 验收时在同一 1586×992 scene 上逐组件叠加 `difference`，允许 strong edge ±1px、柔边/glow ±2px；alpha token 用最终合成 RGB 而不是孤立色块判断。

## 8. Artifact manifest

| Artifact | 绝对路径 | 规格 | 生成 / 验证 |
|---|---|---|---|
| 报告 | `D:\Repo\our-world\codex-visual\20260811-055917Z\codex-report.md` | Markdown | 本文件 |
| 蓝耳头像 | `D:\Repo\our-world\codex-visual\20260811-055917Z\avatar-blue.png` | PNG RGBA，256×256，131,589 bytes | built-in ImageGen；area downsample；视觉复核通过 |
| 粉耳头像 | `D:\Repo\our-world\codex-visual\20260811-055917Z\avatar-pink.png` | PNG RGBA，256×256，127,938 bytes | built-in ImageGen；area downsample；视觉复核通过 |
| 唱片面 | `D:\Repo\our-world\codex-visual\20260811-055917Z\disc-cover.png` | PNG RGBA，256×256，113,908 bytes | built-in ImageGen；area downsample；视觉复核通过 |
| 像素证据 | `D:\Repo\our-world\codex-visual\20260811-055917Z\pixel-evidence.json` | JSON | Python 原图采样与扫描结果 |
| 测量脚本 | `D:\Repo\our-world\codex-visual\20260811-055917Z\measure_concept.py` | Python stdlib | 可复跑 |
| 缩放脚本 | `D:\Repo\our-world\codex-visual\20260811-055917Z\resize_assets.py` | Python stdlib | 1254×1254 → 256×256 area filter |
| 视觉 crops | `D:\Repo\our-world\codex-visual\20260811-055917Z\measurement-crops\` | 13 张 2× crop | 边界复核证据 |

SHA-256：

- `avatar-blue.png`: `E70DF19D7FEE97E0C077CA019EB94698A7697A1F744A9F82637832ECF88C8C33`
- `avatar-pink.png`: `2D4979C95B0841711C91FD1B9D6EED73B5250B1E42F54A18C0456A32F9FB8E11`
- `disc-cover.png`: `AF0FA07AF38913DBB5E41B688CEB1601EC318DB9D6706F4A515B9096DB454785`

### ImageGen final prompt set

- **avatar-blue:** front-facing cream plush puppy; long muted blue ears; blue scarf; watercolor furry game-art finish matching E1; centered circular crop-safe portrait; pale blue round backdrop; no text/UI/watermark.
- **avatar-pink:** front-facing cream plush puppy; long coral-pink ears; rose scarf; same watercolor furry finish; centered circular crop-safe portrait; pale blush round backdrop; no text/UI/watermark.
- **disc-cover:** exact top-down circular vinyl; dark indigo groove ring; purple-pink nebula/cloud label with tiny warm stars; visible center hole; equal square margin; no text/UI/turntable/watermark.

All three assets were generated with the bundled `imagegen` skill's built-in ImageGen path, one call per distinct asset, using E1 as the reference image. No CLI/API-key fallback was used.
