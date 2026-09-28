# 阿屿生产资产重生成 R2：未通过生产验收

## 1. 模式与规格

- Mode: design；生产资产编辑，不是概念设计。日期：2026-09-28。
- 执行者独立完成生成、肉眼检查和像素测量；属于同 agent 自审，没有伪称另一位审稿人。
- 目标：三张合格喝杯睁眼候选、基于本轮最佳喝杯睁眼的三张闭眼候选、基于选定 writing-open-c2 的三张闭眼候选。
- 所有输出应为1536×1024透明RGBA，固定人物比例、发型、眼镜、衣服与肩线。喝杯全图在y=900终止，三个躯干探针须在899–905；肩线对590/541/553/593各不超过4px。闭眼帧眼外必须逐像素不变。
- 仅使用内置 image_gen；未使用CLI或API-key回退。生成后的PNG只做原文件复制，没有裁切、擦除、拼接、变换、补画、重编码或alpha修复。
- 写字任务具体要求优先：保留写字源图袖子、手和本子；喝杯全图y900截止条件不适用于写字闭眼。每次提示词重复用户不变量，并显式说明这个例外。

## 2. 证据清单

生成前用view_image实际查看了以下四图；前三图均为1536×1024 RGBA。源图保持原状。

| 输入 | 用途 | 直接观察 |
| --- | --- | --- |
| D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/arts/characters/ayu/source/ayu-reading-open.png | 人物、画布、比例与肩线锚图 | 乱发、细圆眼镜、炭灰卫衣、双手捧书；书和手遮住中央躯干，不能直接用这些列的最低非透明像素反推被遮挡躯干截止线。 |
| D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-194257Z/ayu-sip-open-c3.png | 喝杯手势、杯子、视线参考 | 双手抬蓝灰金纹杯、杯把在画面右侧、眼睛越过杯沿看镜头；躯干下缘明显较低。 |
| D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-194257Z/ayu-writing-open-c2.png | 写字闭眼编辑原图 | 画面左手执笔、右手扶本，袖子及手延伸到y900下方；这些必须原样保留。 |
| D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/arts/rooms/study/source/master-night.png | 仅人物身份及环境光背景参考 | 左暖右冷夜景灯光、桌前固定机位；未把环境和强轮廓光加入角色生产图。 |

另读取当前设计系统及角色规范。此轮最新brief的禁止后处理及更严格几何要求优先于通用角色流水线的光流对齐建议。

## 3. 执行结论

**本轮没有达到要求的三张合格sip-open；八次上限已用完。所有sip-open保留为a1–a8-reject，没有伪造c1–c3合格文件。**

最佳接近稿为 **ayu-sip-open-r2-a8-reject.png**。它的三列实心轮廓下缘为906/906/906，肩线587/539/552/589。下缘仍比899–905上限多1px，且y900以下仍有非透明内容。它仅用于后续闭眼试生成，不能当作已批准生产稿。

六张闭眼候选已全部生成。它们均未实现眼外逐像素不变，全部FAIL；文件按用户所需c1–c3命名保留供复核，文件名不代表通过。三张喝杯闭眼均源自a8-reject；三张写字闭眼均直接源自指定writing-open-c2，没有闭眼稿串联编辑。

## 4. 测量口径与逐图数据

坐标从0开始。PNG以原始字节解压、还原PNG scanline filter后测量，未做图像配准或几何变化。

- 主轮廓口径：alpha≥128。这一口径在本地reading锚图复现用户给定肩线590/541/553/593。
- alpha0：全图alpha恰为0的像素数。
- 表中人物平均alpha：alpha≥128区域的均值，范围0–255，包含实心边界。JSON另列所有alpha>0像素均值、全透明数和alpha分布。
- 严格opaque=alpha255：本轮所有生成图和三张参考图的alpha255像素数均为0；主体常见alpha253。因此不能声称“主体完全不透明”。严格255口径的七个探针均无命中，JSON用null保留。
- 主表仅用于统一轮廓对照，不放宽用户对完全不透明、y900以下无任何内容的要求。JSON另列alpha≥1/128/200/240/250/255的七个探针。

### 喝杯睁眼：8次全部保留

底边三值按x=600/768/950；肩线四值按x=350/400/1150/1200。排名综合截止线误差、肩线、原手杯姿势保持程度；仅是失败稿相对排序。

| 稿 | 尺寸 | alpha0数量 | 人物平均alpha | 底边三值 | 肩线四值 | 排名/结果 |
| --- | --- | ---: | ---: | --- | --- | --- |
| a1 | 1536×1024 | 946445 | 252.3714 | 928, 928, 928 | 592, 546, 552, 590 | 7 / FAIL |
| a2 | 1536×1024 | 994326 | 252.1741 | 889, 889, 889 | 592, 544, 552, 589 | 2 / FAIL |
| a3 | 1536×1024 | 995566 | 252.2624 | 888, 888, 888 | 594, 546, 552, 588 | 4 / FAIL |
| a4 | 1536×1024 | 995702 | 252.3515 | 887, 887, 887 | 590, 541, 551, 590 | 3 / FAIL |
| a5 | 1536×1024 | 943978 | 252.4095 | 927, 927, 927 | 590, 540, 551, 589 | 6 / FAIL |
| a6 | 1536×1024 | 965693 | 252.2122 | 927, 927, 927 | 582, 536, 550, 588 | 8 / FAIL |
| a7 | 1536×1024 | 950849 | 252.3849 | 921, 921, 921 | 590, 541, 553, 591 | 5 / FAIL |
| a8 | 1536×1024 | 970790 | 252.2232 | 906, 906, 906 | 587, 539, 552, 589 | 1 / FAIL |

### 闭眼：6张全部保留

写字三列最低点包含本子/手，不能当作单独躯干高度；其七个数字仅作为同画布位置证据。

| 稿 | 尺寸 | alpha0数量 | 人物平均alpha | 底边三值 | 肩线四值 |
| --- | --- | ---: | ---: | --- | --- |
| sip-c1 | 1536×1024 | 968389 | 252.3404 | 906, 906, 906 | 587, 539, 552, 588 |
| sip-c2 | 1536×1024 | 970419 | 252.3682 | 906, 906, 906 | 587, 539, 552, 589 |
| sip-c3 | 1536×1024 | 969064 | 252.2530 | 907, 907, 907 | 588, 539, 552, 588 |
| writing-c1 | 1536×1024 | 898790 | 252.3443 | 951, 951, 973 | 591, 540, 552, 592 |
| writing-c2 | 1536×1024 | 867255 | 252.4128 | 950, 950, 972 | 591, 539, 552, 592 |
| writing-c3 | 1536×1024 | 864160 | 252.3961 | 951, 951, 972 | 591, 539, 551, 591 |

### 闭眼眼外变化

眼睛排除区为两个人工指定、略宽松的矩形（边界包含）：左眼x630–735,y370–420；右眼x785–878,y328–385。矩形覆盖眼睑及少量邻近区域，因此指标可能低估严格眼球/眼睑之外变化，不能借此掩盖漂移。分母为对应睁眼图alpha≥128且不在两眼矩形内的像素。RGBA任一通道不等即记为变化；不平移、不对齐、不降噪。

| 稿 | 变化像素/分母 | 眼外严格变化比例 | 最大通道差>8比例 | 最大通道差>16比例 |
| --- | ---: | ---: | ---: | ---: |
| sip-c1 | 566227 / 569967 | 99.3438% | 19.4581% | 6.4779% |
| sip-c2 | 563993 / 569967 | 98.9519% | 17.2296% | 6.1051% |
| sip-c3 | 567241 / 569967 | 99.5217% | 29.0219% | 9.9664% |
| writing-c1 | 668926 / 672384 | 99.4857% | 33.6171% | 13.4825% |
| writing-c2 | 667409 / 672384 | 99.2601% | 25.8790% | 10.6326% |
| writing-c3 | 668556 / 672384 | 99.4307% | 30.2324% | 10.7043% |

0%才符合本轮“every other pixel unchanged”。>8及>16仅帮助区分轻微数值变化与较大重绘，不能替代严格检查。JSON也记录RGB变化比例及两帧人物并集区域的结果，以免新轮廓像素被漏计。

## 5. 直接观察、影响与具体处理

| 级别 | 证据 | 影响 | 处理 |
| --- | --- | --- | --- |
| blocker | 八张喝杯在alpha≥128口径下无一满足三列899–905 | 与桌面远沿接不齐，长躯干盖住桌面，过短则漏出缺口 | 保留reject；本轮达到8次上限后停止喝杯睁眼重试，不裁切修补 |
| blocker | 六张闭眼眼外RGBA变化均约99%，部分衣纹与轮廓也改变 | 不能满足精灵原位眨眼逐像素锁定 | 不晋升为生产帧，不启用本批眨眼 |
| high | 所有生成图alpha255计数为0 | 严格不透明要求不成立；透明叠加是否可见须引擎实测 | 报告实值，不手改alpha；当前不宣称生产合格 |
| high | writing-c1两侧袖子下缘被改成水平截断 | 眨眼时前臂轮廓会变化 | c1拒收；c2/c3提示词加重保留完整袖子，虽恢复轮廓仍有眼外重绘 |
| high | a6杯把换侧、纹样变大、手势变化 | 与已选sip参考不一致 | 排末位，不作为blink来源 |

逐张sip-open肉眼发现：

- **a1**：下缘低28px；x400肩线低5px。手指及杯把可辨，镜框完整；发梢整体相近，衣纹已有重绘。
- **a2**：下缘高11px；肩线均在4px内。手杯关系接近参考；杯花纹、发丝细节有漂移。
- **a3**：下缘高12px；x400低5px、x1200高5px。双眼较前稿更亮，杯花纹有重绘。
- **a4**：下缘高13px，肩线均通过。手、杯把和镜框结构可读，但仍不能对齐桌沿。
- **a5**：下缘低27px；肩线通过。保留原杯把朝向与双手姿势；发丝、衣纹细节不是逐像素保留。
- **a6**：下缘低27px；左肩最大偏差8px。杯把换到画面左侧，金色纹样变大，双手动作改写，与指定sip-c3不符。
- **a7**：下缘低21px；肩线通过。杯子、手势和视线接近参考，几何仍超标。
- **a8**：下缘低6px，超过容差上限1px；肩线通过。保留目标手势与杯把方向，无明显新增手指或破镜框；下缘及透明羽边仍不合格。

喝杯闭眼肉眼与排名：**c2 > c1 > c3，全部不合格**。三张均闭合双眼，手指整体仍可辨、杯把保持右侧，眼镜未见明显断裂；但金纹、衣褶/衣纹和局部发丝不能逐像素保持。c3眼睑线较厚，衣纹变化较大，>8变化比例最高。c1/c3右肩探针还比目标高5px。

写字闭眼肉眼与排名：**c2 > c3 > c1，全部不合格**。三张均向下闭眼，笔与本子关系基本可读，未见明显新增手指；c1袖子被截断是明确结构错误。c2/c3保留了圆弧袖肘，但脸部、衣褶与纹理仍被重绘；闭眼线条较原睁眼更厚，不能把平滑漂亮当成动画保真。

## 6. 不确定性与可比性边界

- 本地sip-c3在alpha≥128口径下测得930，不是调用方给出的931；alpha>0口径为936/933/933。调用方未提供阈值及具体解码方法，所以保留多阈值数据，不声称完全复现其旧批测量。
- a8在alpha≥200或240时底边为905/905/905，肩线仍在容差内；alpha≥128为906，alpha>0为909/911/909。它是**阈值敏感的最接近稿**，不是零争议通过稿。原始y900以下非透明像素数12252；不能据更高阈值宣布全图在y900结束。
- 阅读锚图的书、手与袖子真实延伸到y900下方，不能把这张图的整个角色轮廓与喝杯“全图y900结束”直接等同。以brief明确数字为生产目标。
- 源图已有alpha253主体；本轮只记录并尝试提示生成器产出255，未以源图既有问题放宽生产规格。
- 模型没有实现“只变眼睛”；不推断具体内部生成机制。99%严格数值变化不意味着99%都肉眼明显，所以同时给出>8、>16指标及可见结构错误。
- 未接入2D引擎、未运行动画、未改运行时配置；没有声称实际播放或桌面对齐已通过。
- 系统shell初次调用失败：Failed to create unified exec process / helper_unknown_error: setup refresh had errors。随后通过可用Node文件工具读取、复制及测量；sharp加载也失败，因此使用只读PNG解码与zlib测量。未运行会修改协议的worktree同步脚本，未修改AGENTS.md/CLAUDE.md。

## 7. 推荐与下一步

**不晋升本批任何图为合格生产资产。** 调用方优先复核a8原始PNG及多阈值证据；若仍按当前全部硬要求执行，它仍应拒收。喝杯需要继续解决精确下缘及alpha，闭眼需要生成器真正锁定非眼区域。不能以crop、erase、composite或几何变换补救本轮结果。

本轮已使用8次sip-open尝试上限，不自行扩大生成次数。最终由调用方独立测量选择；当前证据不支持已有三个合格候选，也不支持任一闭眼帧逐像素合格。生产中保持既有状态，不把这批失败帧接入。

## 8. 产物清单

目录：D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z

14张PNG都是内置image_gen原始输出的无损文件复制；失败稿未删除，源图未覆盖。文件哈希用于复核原件。

- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-closed-r2-c1.png`
  - SHA-256: `f1577c7bb0fc6b2a8f412bfcb57361e04d69d1f376629174c69921761399da05`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-closed-r2-c2.png`
  - SHA-256: `575a16004bdca2922510f37785face16da1df67fbfa639cf94073fa3cc5b6a21`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-closed-r2-c3.png`
  - SHA-256: `3b18c26ba3e3d1c54f5bf5be5b96d6b9eb34c3b88c10ed4d4e51bb98e52a527c`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a1-reject.png`
  - SHA-256: `1b655d9ab177a35368825b37a0e5d89ffd0f46564549f3798862ed70b961a100`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a2-reject.png`
  - SHA-256: `af8b2abbec6f57cf3a80a73b6accea7e48ac3e765135eb461c67db5d2336cd50`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a3-reject.png`
  - SHA-256: `f8695d8b65dca2880ca54eca7c67065b640d0357cd564918dfb92783349d223e`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a4-reject.png`
  - SHA-256: `77941f81e868b64d1bb1652cc3ab168b8217cea453bb16d7f37312581500ab85`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a5-reject.png`
  - SHA-256: `2bc7bd3c774222f89c6254a114730b26703e7e11196202601359bc8b2949a165`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a6-reject.png`
  - SHA-256: `3c666ab4760b387fe96b88ab83897cfcf0b02a11afb660914789639fec63dfc5`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a7-reject.png`
  - SHA-256: `79a7d9cd81140e920ec32c6e5c7f0b71263e8790f01bfa4c237d8358f4972cda`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-sip-open-r2-a8-reject.png`
  - SHA-256: `0aa89dda58f26fdfc4d1810624e263ac777746f1c811da13e5c8c7317ba99e90`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-writing-closed-r2-c1.png`
  - SHA-256: `2f13b8c9c8bed4d421100cf9aa122370b81dc6ca80e18a4f28cfcd25f7089c53`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-writing-closed-r2-c2.png`
  - SHA-256: `7d77b24160d404dbddf0daa71510b1c6c25a322e71818cef5379bd58d5e3890f`
- `D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/ayu-writing-closed-r2-c3.png`
  - SHA-256: `f4de14df772a5bed6b4cb1bd9614a88687a802b006f650eb16171315578e9b3a`

- D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/codex-report.md — 本中文报告。
- D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/pixel-metrics.json — 全部逐图数值、alpha阈值、参考图数值、眼外差异及PNG哈希。
- D:/Repo/our-world/.claude/worktrees/dynamic-scene-concept-design-0b6ef0/ai/design_system/codex-visual/20260928-200827Z/generation-prompts.json — 14次实际生成提示词，含每次不变量和定向纠错。

预期但未能交付：ayu-sip-open-r2-c1.png、c2.png、c3.png（三张通过生产要求的候选不存在，未用失败图冒充）。
