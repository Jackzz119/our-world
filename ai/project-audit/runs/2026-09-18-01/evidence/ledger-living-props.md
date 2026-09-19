# Ledger — ai/design_system/research/living-props.md

## 体积

| | bytes | 行 |
| --- | --- | --- |
| 原文 | 5122 | 73 |
| 压缩稿 | 9728 | 94 |
| 目标（≤2/3） | 3414 | — |
| 实际比例 | **190%（体积上升）** | — |

**target_met = false，exception = true。** 本文按任务指令承接 PROJECT.md 与 TODO.md 的唱片机管线长段，成为该主题唯一正文，故单文件必然上升；全仓净变化为**下降约 4600 bytes**（见「承接说明」）。

## 入向引用与锚点

全仓 grep `living-props.md#`：**零命中**，无锚点引用，标题可自由改写。

纯文件名引用：`ai/TODO.md:77`、`ai/PROJECT.md:56`、`ai/design_system/props.md`（§唱片机的活动部分末句）、`ai/design_system/research/README.md`、`art-relighting.md`、`src/themes/cinnaglass/room/pixi-scene.ts:422-423`（代码注释指向本文）。压缩稿新增出站链接：`../props.md`、`art-relighting.md`（原文只提「调研全文来源见文末」）。

## 承接说明（体积上升的来源）

| 承接内容 | 来源行 | 约 bytes |
| --- | --- | --- |
| 两条用户铁律（2026-09-06 生成优先；2026-09-07 死物/活物吃光） | `ai/TODO.md:80`、`ai/TODO.md:81`、`ai/PROJECT.md:56` | 300 |
| 透视真旋转的量测与单应矩阵机制 | `ai/PROJECT.md:56`、`ai/TODO.md:78` | 430 |
| 五类分层（机器 / 唱片 / 光层 / 唱臂 / 转轴针）与产物路径 | `ai/PROJECT.md:56`、`ai/TODO.md:81-82` | 1500 |
| 运行时（重采样、转速、`lift` 弹簧、剪切抬针、投影） | `ai/PROJECT.md:56`、`ai/TODO.md:80,82` | 560 |
| 闸门数值（mean 2.2–2.5/255、p95 6.4–8.2；接缝环差；逐位相同） | `ai/TODO.md:79,80,81,82` | 300 |
| 六条教训 | `ai/TODO.md:79,80,81,82` | 900 |
| 五轮一行制结论 | `ai/TODO.md:78-82` | 230 |
| 六条待做（顶边高光 / 投影形状 / 光层 PNG 体积 / 法线第二档 / 许愿罐 / P2-P3） | `ai/TODO.md:83-86` | 780 |
| 合计承接 | | **≈ 5000** |

被承接后 PROJECT.md:56 与 TODO.md:78-86 可各压成一句摘要 + 链接，两处原文合计约 **9300 bytes**（PROJECT.md 单行约 600 汉字 ≈ 1800B，TODO.md 五轮 + 遗留约 2500 汉字 ≈ 7500B）。净收益约 **−4600 bytes**，且消除了同一事实三处维护。

## 保留清单（来自原文）

| 保留项 | 类型 |
| --- | --- |
| 主力路线唯一：拆层 + 引擎内程序动画，辅以粒子与 ≤2 着色器区域 | 独有决策 |
| 有机形变用 8-16 帧手绘循环 / 网格扰动兜底 | 决策 |
| WE「静图活化」工业标准做法 = 遮罩圈区域 + 便宜效果 | 依据 |
| **Spine（Pro $369）/ Live2D（v8 无官方支持）/ alpha 视频（Safari 双编码）是非必要重武器** | 否决理由 |
| 换图 + 描边高亮方案用户已否 | 强制规则 |
| lofi girl = TVPaint 离线视频，只证明**动画密度阈值**（2-3 主循环 + 微动） | 术语 / 依据 |
| Rusty Lake 机关粒度最贴 hover；Spirit City UE5 与水彩底图不兼容 | 标杆 |
| WE Puppet Warp 流程（抠件 → 补洞 → 罩动效）是管线原型 | 依据 |
| 三个需求的拆层表（唱片 / 星星 / hover 罐） | 未完成需求规格 |
| 「高光是光源属性不随盘转，必须剥离」 | 强制规则 |
| 许愿罐：5-8 颗星 sin·cos 双频、**不需要粒子系统**、发光用预烘焙径向贴图 + additive、**禁 per-star GlowFilter** | 强制规则 |
| hover 罐：共享 `speedScale` / `glowAlpha` 两个标量 tween 到 ~1.6×（0.3s） | 规格 |
| **状态 = 参数缓动，永不换图** | 铁律 |
| 透视椭圆直接旋转会穿帮 | 教训 |
| 七步 AI 分层管线（含步 0 运动清单先行、步 4 差分校验闸门、步 7 hover 不出图） | 管线规范 |
| 性能预算（~40 动态 sprite + ≤50 粒子 / 纹理内存 / **全场常驻 filter ≤2** / 必须 trim） | 闸门数值 |
| 工程纪律（统一场景时钟、tween 挂 ticker、失焦暂停覆盖三类源） | 强制规则 |
| 首尾同帧直出循环不可靠，用两段拼接法；AI 视频拆帧不能当主力（水彩沸腾） | 教训 |
| 分期 P1 / P2 / P3 | 计划（并入 §待做） |
| 调研来源说明 | 溯源 |
| mockup 目录 `../concept/proposals/living-props` | 资产指针 |

## 删除清单

| 原文位置 | 摘句 | 理由 |
| --- | --- | --- |
| :1 标题 | 「（2026-08-22 调研定稿）」 | 移到抬头行，并补 2026-09-07 更新日期 |
| :3-5 | 「需求（用户 2026-08-22）：唱片 idle 常转、hover 零件动；许愿罐星星 idle 漂浮、hover 更亮更快——『接近 3D 场景的生动感』」 | 与 §需求与拆层 表格逐行重复；表格是权威正文，抬头只留铁律 |
| :5 | 「调研全文来源见文末」 | 冗余指路，文末本来就有 |
| :8-13 | 「## 一句话结论」标题 + 段落编排 | 标题与内容重复（内容即结论），改为 §路线结论，正文保留全部判断 |
| :12-13 | 「（mesh 要 Pro $369）」「（Pixi v8 无官方支持）」「（Safari 双编码坑）」的括号排版 | 仅重排，内容保留 |
| :17-18 | 「它证明的是**动画密度阈值**……——第一期只做唱片机+许愿罐是对的」 | 「是对的」为当轮自评语气，改为陈述 |
| :26-34 表格第 1-2 行 | 「唱片常转 / hover 唱臂动」的提案动效：`rotation += ω·dt`（idle ~8s/圈）、「唱臂 tween ±3-5°（150-250ms ease-out-back）+ 旋钮 glow」 | **已被实装取代**（实际 idle 9s/圈、hover 4s/圈；唱臂为弹簧驱动的垂直剪切，非 ±3-5° tween；无旋钮 glow）。改为指向 §唱片机实装；保留「高光必须剥离」这条仍有效的规则 |
| :33-34 | 「外层容器 `scale.y` 压椭圆比，子层在圆空间里转（`pixi-scene.ts` 的 `circleFromBase()` + vinyl pivot 即此法）」 | **陈旧，见改正清单**；已被单应矩阵方案取代 |
| :36-48 步 2 | 「Nano Banana Pro / Qwen-Image-Edit / FLUX Kontext」具体模型名 | 型号会过期，且第三～五轮的实测结论（局部重绘不合格）已写入 §教训；保留「局部 inpaint 带全图上下文 + diff 校验」这条方法 |
| :46 步 6 | 「Kling Motion Brush / Wan 2.2 FLF2V」具体模型名 | 同上；文末来源段仍保留 Kling·Runway 溯源 |
| :58-62 | 「## 避坑清单（12 条精选）」整节 | **12 条中 10 条在本文其他小节已有权威正文**（透视椭圆直接旋转→§透视旋转；高光随盘转→需求表；hover 换整图→§铁律；Spine/Live2D→§路线结论；alpha 视频单编码→§路线结论；首尾同帧→步 6；拆层不做差分校验→步 4；零件层不 trim、tween 自跑 rAF→§性能预算；per-object GlowFilter→需求表）。仅 2 条无处安放，已就近折入：「AI 视频拆帧做主力（水彩沸腾）」→ 步 6；「第一期就拆 10 个物件（按视线优先级分批）」→ §待做 |
| :64-68 | 「## 分期建议」独立小节 + 「P1（本期）：唱片机 + 许愿罐两件活化——mockup 已出」 | P1 已完成一半（唱片机 v5 已上），分期表退化为待办；并入 §待做，避免与 TODO 的状态打架 |
| :70-73 | 来源清单中的逐项链接描述（Jake Archibald 透明视频 / ffmpeg.party 循环指南 / Nano Banana·Qwen·Kontext 对比评测）展开 | 压成同一行，溯源信息不丢 |

## 改正清单

| 原陈述 | 实际 | 依据 |
| --- | --- | --- |
| :34「`pixi-scene.ts` 的 `circleFromBase()` + vinyl pivot 即此法」 | **仓库内不存在 `circleFromBase`**（`grep -rn circleFromBase src/` 零命中）。实际是 `discHomography(e, center)` 由外沿椭圆 + 真实圆心解出 3×3 单应矩阵（仿射部分 + Klein 模型双曲平移），`discCorners(H, spin)` 给 `PerspectiveMesh` 四角 | `src/themes/cinnaglass/room/pixi-scene.ts:203-242` |
| :33-34「外层容器 `scale.y` 压椭圆比，子层在圆空间里转」 | 纯仿射「压扁再转」**做不到圆心与外沿同时不漂**，源码注释明写 "Flat (affine) spinning cannot keep both the rim AND the label still under real perspective, this can." | `pixi-scene.ts:208-209` |
| :28「idle ~8s/圈」 | 实装 idle = `(Math.PI*2)/9` 即 **9s/圈**；hover 软坡到 `(Math.PI*2)/4` 即 4s/圈（×2.25） | `pixi-scene.ts:435`、`:1019-1020` |
| :29「唱臂 tween ±3-5°（150-250ms ease-out-back）+ 旋钮 glow」 | 实装是欠阻尼弹簧 `lift`（`ARM_SPRING_K=120`、`ARM_SPRING_DAMP=14`）驱动 **绕转轴柱的垂直剪切 0.045 rad**（约 90px 外唱头抬 ~4px）+ `rotation = -0.012*lift` 外倾；无旋钮 glow | `pixi-scene.ts:904-908`、`:1029-1032` |
| — | `pixi-scene.ts:422-426` 的注释（"ellipse → un-squashed circle … spun inside a frame that re-applies the perspective squash + tilt"）仍是旧方案描述，与其下方实际调用的 `discHomography`/`discCorners` 不符 | 见「待核清单」 |

## 已核对为准确（新写入内容的依据）

- 量测：外沿最小二乘椭圆 137 个边缘样本、rms 0.5px；标签圆心在外沿圆心上方 3.8px；三档构图 ±0.5px 内一致 — `src/themes/cinnaglass/room/study-room.ts:61-72`
- 分层产物与 donor：`public/rooms/study/parts/turntable.json`（`"donor": "twilight"`，platterArt / platterLight add+mul / spindle×3 / tonearm / armTint `#ffffff`·`#808bc0`·`#78828a`）；目录内 14 个文件与之一致
- 平盘 512×512：`sips` 核 `platter-golden.png`、`platter-light-add-golden.png` 均 512×512
- 光层 PNG 体积：add/mul 六张 171–190 KB，合计约 1.09 MB（与「每张 ~180KB、六张 1.1MB」一致）— `ls -la public/rooms/study/parts/`
- 「死物吃画里的光，活物吃场景的光」与「部件必须生成、不后抠不手修」：`scripts/build-turntable-parts.py` 头注释第 3-5 行原文 "static things keep the painting's light; moving things ship as flat albedo and are lit by the engine"，以及 codex 生成三图层的说明
- 按旋转对称性分解、add/multiply 语义、`albedo x light == the painting at rest`、复原误差闸门项目：同脚本头注释
- 依赖 Pillow / numpy / opencv：同脚本头注释末行
- 投影参数：`s.dx*(1+0.6*lift)`、`s.dy*(1+0.8*lift)`、`alpha*(1-0.4*lift)`，per-mood `armShadow` — `pixi-scene.ts:1033-1036`、`study-room.ts:88-92`
- `platterTint` 已不存在：`room-types.ts` 与 `study-room.ts` 均无该字段
- mockup 目录存在：`ai/design_system/concept/proposals/living-props/`（anim-scene-map / anim-exploded-turntable / anim-exploded-jar）

## 待核清单

- 闸门数值 **mean 2.2–2.5/255、p95 6.4–8.2**、二轮 **mean 0.2–0.5/255**、接缝环差 **0.8–1.0/255**：来自 TODO.md 记录的历史装配运行输出，本轮**未重跑** `build-turntable-parts.py` 复核（脚本需 Pillow/numpy/opencv，且需 `arts/rooms/study/generated/<run>` 输入）。
- 第四轮失败量化（「标签亮 47%、σ=8 抹平」）同样来自 TODO.md 记录，未复核。
- `pixi-scene.ts:422-426` 的旧注释与实际实现不符，属**代码注释陈旧**，不在本子任务（只读文档压缩）范围内，建议列入代码侧待办。
- 原文「`../concept/proposals/living-props`（三张分解手稿）」只指目录，两张 exploded 图无单文件链接（project-audit design-review D-01 已记）；压缩稿保留目录链接并在括号内点名三张图，未新增文件链接。

## 例外说明

**exception = true，体积由 5122 升至 9728。** 理由：

1. 任务明确指定本文成为**唱片机分层管线技术细节的唯一正文**，PROJECT.md:56 与 TODO.md:78-86 改为一句摘要 + 链接。承接内容约 5000 bytes（逐项来源见上表）。
2. 同时对原文本身做了实质压缩：删掉整节「避坑清单」（12 条中 10 条在本文内已有权威正文）、整节「分期建议」、重复的需求复述、已被实装推翻的提案数值、会过期的具体模型名。原文 5122 bytes 中约 **1500 bytes 被删或合并**，剩余约 3600 bytes 全部是保留清单内的决策 / 规则 / 教训 / 未完成需求。
3. 全仓净效果为下降：本文 +4606，PROJECT.md 与 TODO.md 预计 −9300，净 **约 −4600 bytes**，并把同一事实从三处（PROJECT / TODO / 本文）收敛到一处。
4. 若不承接，PROJECT.md 与 TODO.md 的长段无处安放，会违反 CLAUDE.md 的「TODO 只写高层描述」「Feature/设计文档已记录的细节不重复写入 PROJECT.md」两条规则。
