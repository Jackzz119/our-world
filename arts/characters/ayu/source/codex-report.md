# 阿屿透明姿态资产 · 制作与自审报告

## 1. 模式与规范化 brief

- **模式：design / production asset generation。**
- 目标：为 Our World 的 PixiJS 角色层制作 11 张同画布的阿屿半身姿态，供原位交叉淡化和眨眼使用；一致性优先。
- 本轮用户规格优先于角色文档中的旧竖版规格：全部选择文件为 **1536×1024 RGBA PNG**，头顶约 y60，躯干隐藏边界约 y900，手臂、手和道具可延伸至约 y1000。
- 身份：深色乱发、细圆框眼镜、炭灰连帽卫衣与抽绳，温和的成年男性；保持半写实二次元 CG 细线稿、柔和渐变和织物纹理。
- 光照：尽可能均匀、略暖的前左光；角色供引擎重新着色，不应保留强烈蓝色轮廓光。
- **执行方式：本 agent 直接制作并自审，未再次委派；仅使用内置 image_gen 生成与编辑角色。** 未使用 CLI/API-key 生图、背景抠图、手工重绘或后期几何变换修正角色。确定性代码只读图、测量、制作验收叠图和排版证据板。
- 阅读基准先生成，其余姿态由基准编辑；眨眼使用对应睁眼帧及/或基准作为输入。全部输入图保留原状。

## 2. 证据清单

| 输入 | 角色与直接观察 |
| --- | --- |
| master-night.png | 唯一获批场景来源，已在生成前用 view_image 打开。男子双手持平装书，头略倾、向下看；衣服炭灰、圆框眼镜；角色旁边杯子是蓝灰色配金色纹理，前景花杯属于另一人。 |
| CH-ayu-sheet.jpg | 身份参考；正侧脸、眼镜、深色乱发与连帽卫衣。不能把表中的不同服装混入本批。 |
| VA-poses.jpg | 女性动作参考：看书、伏桌、喝水等；只参考动作语义，不迁移脸型、头发、衣服或构图。 |
| CH-presence.jpg | 在场状态参考：阅读、输入、离开、睡着；本批只画指定角色动作，不绘制状态文字与椅子。 |
| CH-touches.jpg | 触碰反应参考：闭眼享受、微红、笑；本批不绘制触碰者的手。 |

上述五张附图均直接观察了像素。项目依据：ai/PROJECT.md 的开工红线、ai/JASKILL.md、当前 design-system.md、character.md，以及 Monet / imagegen / codex-visual 技能。本轮尺寸、透明、文件名和限制以用户明确 brief 为准。

## 3. 执行结论

**11 个指定名称的 PNG 均已交付，但整批未通过严格生产验收，不能声称“可无跳动上线”。**

主要结果：

- 11 张全部为 1536×1024，最终选择版本均有真实 alpha=0 的透明区域；并非画出来的棋盘或整幅不透明底色。
- 阅读、抬眼、写字、摸头及最终被戳帧，在固定肩/上臂轮廓探针上的最大垂直差为 0–4 px；喝水为 7–9 px。
- 被戳首稿肩线漂移 36–48 px，经两次针对性编辑后降至 0–1 px。最终表情是闭眼笑，明显耸肩/缩身没有保留，是制作取舍，不能当作完全符合动作 brief。
- 喝水躯干透明裁线实测 y916–917，比目标 y900 低 16–17 px。一次纠正反而扩大外侧轮廓漂移，因此选回偏差较小的首稿。
- **四对眨眼均不满足“仅眼睛变化”**：眼区外仍有纹理、线条、颜色或局部位置变化，见第 5 节数据。
- 全部最终文件最大 alpha=254，主体通常约253，未出现 alpha=255；约0.4–0.8%的主体透底不是肉眼最显著的问题，但不能描述为严格完全不透明。少量低 alpha 孤立像素使严格包围盒扩展到画布边缘。
- 未接入引擎，没有验证实际 140ms 眨眼、180ms 交叉淡化、时辰 tint、手机尺寸或桌面遮挡。本报告是素材级自审。

## 4. 逐文件检查与问题矩阵

### 测量规则

坐标原点是左上角，单位 px。包围盒写为 [left, top, right, bottom)，右、下边界不含。

- **严格包围盒**：alpha>0，包含肉眼难见的低 alpha 噪点。
- **主体包围盒**：alpha≥128，用于排除极弱噪点后观察主要轮廓。
- **肩线 Δy**：在 x=350、400、1150、1200 四条垂直线上，取首个 alpha≥128 的像素，与 reading-open 对应位置相减；基准 y=[590,541,553,593]。这是肩/上臂外轮廓代理，不是人工标注的四个解剖关节。
- **宽度 Δ%**：y600 处 alpha≥128 的最左、最右轮廓跨度相对基准864px的差异，只是尺度/形变的代理，不能推断整个人被等比缩放。
- 酣睡有头发进入探针并遮挡肩部，不能把其中的负数当成错误位移或把截面宽度变化当成缩放率。
- 所有文件均制作了与 reading-open 各占50%的交叉混合叠图；不先做平移、缩放或自动配准，以免隐藏漂移。

| 文件（均1536×1024） | 真实alpha / alpha=0像素 | 严格bbox | 主体bbox（≥128） | 肩线Δy：x350/400/1150/1200 | y600宽度Δ% |
| --- | --- | --- | --- | --- | --- |
| [ayu-reading-open.png](ayu-reading-open.png) | 是 / 859156 | [61,32,1472,1024] | [90,48,1448,1014] | [0,0,0,0] | 0.00 |
| [ayu-reading-closed.png](ayu-reading-closed.png) | 是 / 859268 | [86,17,1470,1024] | [90,47,1449,1014] | [0,0,-1,-1] | 0.12 |
| [ayu-glance-open.png](ayu-glance-open.png) | 是 / 858860 | [88,31,1453,1024] | [91,45,1450,1015] | [1,0,-1,-1] | 0.00 |
| [ayu-glance-closed.png](ayu-glance-closed.png) | 是 / 857693 | [0,31,1522,1024] | [91,44,1450,1015] | [1,1,-1,-1] | 0.00 |
| [ayu-writing-open.png](ayu-writing-open.png) | 是 / 863879 | [86,32,1458,996] | [91,47,1456,993] | [0,0,-1,-2] | 0.23 |
| [ayu-writing-closed.png](ayu-writing-closed.png) | 是 / 864546 | [86,31,1459,995] | [91,46,1456,993] | [0,0,-2,-4] | 0.35 |
| [ayu-sip-open.png](ayu-sip-open.png) | 是 / 896892 | [111,34,1522,1024] | [114,39,1422,1009] | [-8,-9,-9,-7] | 1.27 |
| [ayu-sip-closed.png](ayu-sip-closed.png) | 是 / 890296 | [104,31,1458,1024] | [108,34,1435,1012] | [-8,-9,-9,-8] | 1.27 |
| [ayu-asleep.png](ayu-asleep.png) | 是 / 919584 | [0,21,1458,994] | [92,211,1450,991] | [36,-134,34,19]（含头发遮挡，不作漂移结论） | 不适用（姿态截面变化） |
| [ayu-patted.png](ayu-patted.png) | 是 / 822703 | [83,1,1465,1024] | [89,17,1460,1017] | [1,0,-2,-4] | 0.46 |
| [ayu-poked.png](ayu-poked.png) | 是 / 859411 | [53,31,1456,1024] | [90,47,1449,1014] | [0,0,-1,-1] | 0.12 |


### 文件内容与可见缺陷

#### ayu-reading-open.png

双手持平装书、低眼温和笑。手指与书脊关系清楚，圆框眼镜完整，发丝细。主体头顶y48、底部y1014，略超目标留白与下沿；躯干裁线被书/手臂遮挡，不可直接确认。

#### ayu-reading-closed.png

阅读眨眼、双眼闭合。肩线最大偏差1px，手与书基本重合；眼区外衣料/边线重绘，非严格只改眼睛。发丝低alpha散点使严格顶部达y17。

#### ayu-glance-open.png

保持捧书，眼睛看向镜头。肩线最大偏差1px；嘴唇和下颌相对基准也有轻微移动，不能称为仅瞳孔变化。手部、眼镜无明显断裂。

#### ayu-glance-closed.png

抬眼姿态闭眼帧，温和笑保留。肩线最大偏差1px；眼区外像素仍改变，严格bbox横向扩至x0体现极低alpha噪点。发丝整体没有大片底色。

#### ayu-writing-open.png

右手执笔、左手压页，小本子平放，眼睛睁开。笔尖接触页面，握笔手没有明显多指；肩线最大偏差2px。头部下倾不明显，视线比基准更接近前方，低头看笔尖的意图不够强。

#### ayu-writing-closed.png

对应写字闭眼。肩线最大偏差4px；写字左右手、本子关系成立，但袖纹、线条与睁眼帧不完全相同。眼镜无明显缺失。

#### ayu-sip-open.png

双手举蓝灰金纹杯至唇边，睁眼望向镜头；杯型来自主图阿屿身旁杯子。手柄与手指遮挡自然。肩线升高7–9px，躯干切线y916–917；左发丝及袖子暖边较强。

#### ayu-sip-closed.png

同喝水动作闭眼，采用透明正常的首稿。肩线升高8–9px，躯干切线y916；对比睁眼帧，右侧袖子外扩等变化明显，眼区外差异最大。手和杯子未见明显数量错误。

#### ayu-asleep.png

头靠交叠前臂，眼睛闭合、眼镜保留；脸向镜头，接触关系成立。脸/头尺度与倾斜变化不能用单一bbox判定；肩部扫描部分被头发遮挡，不能给出可信的统一漂移或缩放值。没有虚报对齐通过。

#### ayu-patted.png

轻抬头、闭眼、脸颊微红，双手落在摊开的书上，无画外人的手。肩线最大偏差4px；主体头顶y17，比基准高31px，较接近画布边缘。书页花纹非原封面姿态的像素延续。

#### ayu-poked.png

闭眼开口笑、微红，双手仍持书。最终肩线偏差0–1px、主体头顶y47；大幅上身偏移已修正。代价是没有清晰的缩身/耸肩，小反应的动作词汇尚未完全实现。

### 按严重程度排序

| 等级 | 问题与证据 | 影响 | 修正方向 |
| --- | --- | --- | --- |
| 阻断 | 四对眨眼眼区外变化，见下方像素差异数据；sip 最突出 | 140ms 切换会有纹理闪动、边缘跳动风险 | 继续使用能够严格局部约束的内置编辑能力，仅重生成闭眼局部；在无此约束能力时不能认证生产眨眼。本轮未擅自拼贴或后抠。 |
| 高 | 喝水肩线升高7–9px，躯干裁线低16–17px | 与其他姿态交叉淡化时肩部双线、衣服侵入桌面 | 以基准肩轮廓与 y900 裁线重新生成；失败纠正稿已保留，未混入选定文件。 |
| 中 | 基准主要头顶y48，摸头y17；弱 alpha 噪点还会扩展边界 | 与“约y60”的预留边距不完全一致，自动按包围盒布局会抖动 | 固定整画布锚点；若要求严格留白，仍需生成端锁定构图，不能靠自动trim。 |
| 中 | 所有主体alpha<255；严格bbox有低alpha散点 | 更换底色时可能轻微透色；资源打包trim边界不可靠 | 后续生成应保持主体不透明、透明区为0并仅在边缘抗锯齿；本批未后处理alpha。 |
| 中 | 喝水左侧发丝/袖子较强暖边，部分帧暖色高光已烘焙 | 夜间与灯灭时染色不够中性 | 生成端进一步均匀受光，同时保留皮肤、织物与发丝的局部色。 |
| 中 | 最终被戳只保留笑，缩身/轻耸肩未完整保留 | 动作表达弱于原brief | 在保持基准躯干定位下补充很小的局部肩部动作；不能将本帧宣称为完整缩身动作。 |
| 低 | 开书封面图案细节及笔记本页纹会因生成重绘变化 | 大图查看有纹理不一致 | 保持道具版本与局部内容一致；别用不存在的“像素完全一致”描述当前输出。 |

## 5. 详细证据

### 50% 叠图观察

- 阅读闭眼、抬眼双帧：肩与袖轮廓基本重合，脸部抬眼时嘴唇/下颌也出现细小双线，超过“只抬眼”的严格局部范围。
- 写字双帧：肩部基本重合；开书换成平铺本子、手臂移动是目标动作，应与误差分开。两张写字之间仍有线条和纹理重绘。
- 喝水双帧：手和杯子出现在脸前是目标动作；肩上缘错开、手肘外轮廓变化及 y916–917 裁线是制作问题。
- 酣睡：头部向左下落到手臂，叠图出现大面积头部双影符合动作语义。外侧上臂仍有姿态形变，不能从这张叠图独立证明同一解剖尺度；本轮没有宣称零漂移。
- 摸头：肩轮廓接近重合，头部抬起、下巴和眼镜的位置变化符合抬头反应；头顶上移较多需留意画布余量。
- 被戳最终版：躯干、持书位置明显比首稿稳定，主要差异集中在表情。缺少原本的小幅身体反应已列明。

### 眨眼逐像素检查

排除眼区 [600,290,900,430)；仅统计至少一帧 alpha≥128 的像素。按预乘alpha后的RGB比较，任一通道绝对差>8/255记为变化。本指标包含生成的纹理与重采样变化，**不是“几何漂移百分比”**，但足以否定“眼区外像素不变”。

| 姿态 | 眼区外比较像素 | 通道差>8像素 | 比例 | 最大通道差均值 | 判定 |
| --- | ---: | ---: | ---: | ---: | --- |
| reading | 650444 | 162751 | 25.02% | 7.27 | 非仅眼睛改变 |
| glance | 652102 | 71520 | 10.97% | 4.86 | 非仅眼睛改变 |
| writing | 645805 | 131202 | 20.32% | 7.38 | 非仅眼睛改变 |
| sip | 620904 | 360030 | 57.98% | 13.98 | 非仅眼睛改变 |

### 透明、裁线与手部

- 真实alpha按PNG解码检查，附 qa-metrics.json；检查脚本的RGBA编码/解码往返一致性为true。
- 显示工具最初展示的黑底及棕蓝渐变大部分存在于透明像素RGB中；不能据此断言整图不透明。qa-contact-1/2.png按真实alpha合成到棋盘后可见完整透明背景。
- 不能反过来因为存在alpha=0就认证所有边缘干净：严格bbox与主体bbox不一致、主体alpha非255均单独报告。
- 喝水裁线探针x=[600,768,950]：open首次alpha<128的y=[917,916,916]；closed为[916,916,916]。
- 阅读基准的躯干下边界大部分被手、书、前臂遮住；写字和摸头由本子/手遮住；酣睡由交叠手臂遮住。**这些位置无法直接量出同一个躯干裁线，记为不可观测，不填伪造的0px。**
- 逐张观察没有发现明显多手、多臂或多余整根手指；部分拇指被道具遮挡属于正常遮挡。写字执笔为角色右手（画面左侧），笔尖接触纸页；酣睡眼镜保留。此结论限于可见像素，不替代动画验收。

### 返工选择

1. reading-open：保留最初图与 lighting-draft；最终采用修正头顶/构图后的版本。主要头顶从约15px附近移动到48px，仍非精确60px。
2. sip-open：首稿最大肩线偏差9px；registration-draft外侧偏差增至15px、y600跨度差约2.9%，故最终名称恢复首稿。没有通过纠正就如实保留问题。
3. sip-closed：单参考返工出现大片半透明背景，严格bbox=[0,0,1536,1024]且仅14667像素alpha=0，被标记alpha-failed；最终名称恢复透明正常的首稿。首稿袖缘仍有变化。
4. poked：initial最大肩线差48px，registration-draft40px；最终单参考局部表情编辑降到1px，采用最终。动作幅度减少的取舍见上文。
5. 其余文件没有发现同等级的整体构图漂移，未为了凑次数盲目重生成。眨眼像素局部性缺陷仍记录为未解决。

## 6. 不确定性与可比性限制

- 角色表与三个动作板包含不同人物、服装、光照、镜头和多格排版，不能与生产sprite做数值评分排名；它们分别约束身份与动作语义。
- 批量输出画布一致，但动作本身会改变轮廓；bbox变化不等于身体漂移。肩线探针与宽度代理也不等于完整刚性配准。
- 酣睡的头部旋转、发丝轮廓、透视都变了；没有单独的人体关键点真值，不能给出可信的全身缩放误差百分比。
- 没有访问或改动运行时角色状态机与显示锚点，也没有实测FPS、显存、压缩后体积和实际场景融合。
- 本轮终端辅助进程启动失败；规范读取、图片复制和测量改用Node文件工具。一次测量超时后拆批执行。未运行worktree同步脚本，未改受保护协议、技能文件、应用代码或项目常驻文档。
- **这是同agent自审，未发生独立第二人视觉复核。**

## 7. 建议与下一步

- 这批可交给调用方作为完整生产候选与缺陷证据，**不要整体标记“生产验收通过”或直接晋升运行时成品**。
- 先解决四对眨眼的局部编辑约束，再解决喝水肩线与躯干裁线；这是当前最影响原位切换的两类问题。
- 将阅读、写字、摸头、被戳这些较稳的构图保留为后续生成锚点，避免全套重画造成更多漂移。
- 酣睡必须在实际桌面遮挡和交叉淡化中复验尺度与动作过渡；被戳还需补回小幅反应动作。
- 通过素材验收后，由调用方按当前工作流晋升到arts/characters/与public/，本轮只在指定批次目录交付。

## 8. 产物清单

**所有下列相对路径均位于本报告同目录。** 绝对目录：
D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/production/ayu/20260927-075606Z

- 11张选择版本：见第4节逐文件表；选择版本不代表通过全部验收。
- qa-contact-1.png：2列×3行，阅读open/closed、抬眼open/closed、写字open/closed；各格768×512，真实alpha棋盘显示。
- qa-contact-2.png：2列×3行，喝水open/closed、酣睡/摸头、被戳/空白；空白格不是缺交第12张。
- qa-overlay-board-1.png、qa-overlay-board-2.png：同顺序，均为基准与目标各50%的叠图。
- qa-overlay-*.png：11张全尺寸1536×1024独立叠图，覆盖每个选择版本。
- qa-baseline-alpha.png：早期基准透明合成检查；最终完整对照以qa-contact板为准。
- qa-metrics.json：最终11张尺寸、严格/主体bbox、透明像素数量、轮廓探针与偏差。
- qa-metrics-initial.json：返工前初检。
- qa-blink-differences.json：四对眨眼眼区外差异。
- qa-torso-cut.json：喝水躯干裁线探针。
- qa-evidence.mjs：只读PNG测量与证据图合成模块，不修改源sprite。
- generation-prompts.json：内置工具的主要初始/修正提示词与拒用版本记录；不包含密钥。
- artifact-manifest.json：逐文件绝对路径、字节数与SHA-256。清单自身不对自己计算摘要。

### 完整文件索引

- [artifact-manifest.json](artifact-manifest.json)
- [ayu-asleep.png](ayu-asleep.png)
- [ayu-glance-closed.png](ayu-glance-closed.png)
- [ayu-glance-open.png](ayu-glance-open.png)
- [ayu-patted.png](ayu-patted.png)
- [ayu-poked-initial.png](ayu-poked-initial.png)
- [ayu-poked-registration-draft.png](ayu-poked-registration-draft.png)
- [ayu-poked.png](ayu-poked.png)
- [ayu-reading-closed.png](ayu-reading-closed.png)
- [ayu-reading-open-initial.png](ayu-reading-open-initial.png)
- [ayu-reading-open-lighting-draft.png](ayu-reading-open-lighting-draft.png)
- [ayu-reading-open.png](ayu-reading-open.png)
- [ayu-sip-closed-alpha-failed.png](ayu-sip-closed-alpha-failed.png)
- [ayu-sip-closed-initial.png](ayu-sip-closed-initial.png)
- [ayu-sip-closed.png](ayu-sip-closed.png)
- [ayu-sip-open-initial.png](ayu-sip-open-initial.png)
- [ayu-sip-open-registration-draft.png](ayu-sip-open-registration-draft.png)
- [ayu-sip-open.png](ayu-sip-open.png)
- [ayu-writing-closed.png](ayu-writing-closed.png)
- [ayu-writing-open.png](ayu-writing-open.png)
- [generation-prompts.json](generation-prompts.json)
- [qa-baseline-alpha.png](qa-baseline-alpha.png)
- [qa-blink-differences.json](qa-blink-differences.json)
- [qa-contact-1.png](qa-contact-1.png)
- [qa-contact-2.png](qa-contact-2.png)
- [qa-evidence.mjs](qa-evidence.mjs)
- [qa-metrics-initial.json](qa-metrics-initial.json)
- [qa-metrics.json](qa-metrics.json)
- [qa-overlay-asleep.png](qa-overlay-asleep.png)
- [qa-overlay-board-1.png](qa-overlay-board-1.png)
- [qa-overlay-board-2.png](qa-overlay-board-2.png)
- [qa-overlay-glance-closed.png](qa-overlay-glance-closed.png)
- [qa-overlay-glance-open.png](qa-overlay-glance-open.png)
- [qa-overlay-patted.png](qa-overlay-patted.png)
- [qa-overlay-poked.png](qa-overlay-poked.png)
- [qa-overlay-reading-closed.png](qa-overlay-reading-closed.png)
- [qa-overlay-reading-open.png](qa-overlay-reading-open.png)
- [qa-overlay-sip-closed.png](qa-overlay-sip-closed.png)
- [qa-overlay-sip-open.png](qa-overlay-sip-open.png)
- [qa-overlay-writing-closed.png](qa-overlay-writing-closed.png)
- [qa-overlay-writing-open.png](qa-overlay-writing-open.png)
- [qa-torso-cut.json](qa-torso-cut.json)

生产图像全部由内置image_gen产出；QA棋盘、缩略排版与50%混合属于明确请求的比较证据，不作为角色素材使用。源图没有被覆盖。
