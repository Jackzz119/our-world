# Ledger · navigation-implementation.md

源文件：`ai/design_system/uiux/cinnaglass/journal-room-object/navigation-implementation.md`（只读，未修改）
基线 commit：3fd52a5（分支 dev）

## 体积

| | bytes (UTF-8) | 行数 |
| --- | ---: | ---: |
| 原文 | 8013 | 87 |
| 压缩稿 | 5996 | 62 |
| 目标（2/3） | 5342 | — |

比例 74.8%，**未达 2/3，见「例外说明」**。

## 保留清单（本文是导航「数值 / 生成来源 / 验证」的权威）

- 顶部状态：2026-09-07、已接入本地待用户看实景、未部署；用户认可发光并覆盖旧报告「下调光晕」；本轮范围只含导航。
- comparison.png 及其「不是逐像素相同」的限定（原图约 74×382 vs 实装 74×384、背景不同、图标为重绘矢量轮廓）。
- 三时辰材质表：night 76,69,58 / 0.17 / 0.34 / #EED5A8；golden 43,36,28 / 0.52 / 0.36 / #FFF0D0；twilight 63,64,72 / 0.19 / 0.34 / #EEE0C6，及「透明度只指底色这一层」的限定。
- 黄昏对比度修正链：初版约 2.22:1 → 加厚烟色后 3.14:1。
- 背景模糊 2.4 px、饱和度 0.7、反光边缘 0.02–0.72、day/morning 中性回退参数存在但未验收。
- 变量作用域规则：只在 `.rail-wrap`，不改共用 `--cg-*` / `--craft-*`。
- 尺寸：桌面视口 ≥768×600、导航 74×384、圆角 25、离左 38px、主按钮 54×54、五入口顺序、未读粉点；窄屏 292×62、离底 10px、48×48 触摸按钮。
- 六行状态反馈表（含 200 ms、缩至 94%）。
- 菜单材质差异：模糊 8 px、底色透明度 ≥0.5；点外关闭用外部指针事件、不放透明遮罩；视口固定定位。
- 验证证据：`scripts/check-navigation.mjs` + results.json；四尺寸列表、触屏模拟（亮光 1、缩放 0.94）、减少动态效果过渡 0、共用纸色 #D8CDBA、对比度 4.52 / 3.14 / 3.76:1 及其采样方法限定。
- 构建与未覆盖：`shell/chat-card.tsx:10` 的 `Msg` 阻断完整类型构建；主包 >500 kB 为既有提示；真实触屏硬件、Safari、白天/花园、低端设备、双账号未覆盖。
- 文件与复用边界；`pack-navigation-texture.mjs` 产物约 298 kB WebP。
- 出向链接：room-journal-concept.png、navigation-texture-prompt.md、`../ui-system.html#navigation-glass`、新增一句指向 `ai/Features/navigation-glass.md`。

## 删除清单

| 原文位置 / 摘句 | 理由 |
| --- | --- |
| L17「单靠均匀渐变与噪声，第一版出现了『整条灰雾』的问题。因此选用混合做法」 | 过程叙述；最终层序保留为一句「层序：…」 |
| L19-23 五条编号做法的展开（「小幅背景模糊，保留窗帘与房间明暗」「1 px 的遮罩边缘沿周长分段变亮、变暗」等） | 压成一行层序 + 已有数值（2.4px / 0.7 / 0.02–0.72）；机制描述与 `ai/Features/navigation-glass.md`（backdrop-filter、conic-gradient、frost.webp 取样）重复 |
| L13 末「纹理也保留真实生成来源，不用带房间背景的整条截图冒充透明 UI」 | 与 §5 `pack-navigation-texture.mjs`「不裁切或替换房间」重复，留后者 |
| L52 触屏诊断流水：「触屏实测发现 Chromium 按住时 `:active` 没有生效，所以添加了按键自身的指针状态。手指按下 → `data-pressed` 置为真 → 显示按压亮光；松开、移出、取消触摸或失去焦点 → 清掉状态」 | 完整因果链已在 `ai/Features/navigation-glass.md`（「触屏按住由指针状态驱动，松手、取消或移出清除」）；本文保留一句结论 + `data-pressed` 字段名 |
| L54「工具开关保留原有行为，补回可移动滑块，收敛成暖色，不再残留旧版亮蓝整块」 | 与 Features/navigation-glass.md「工具开关补回暖色滑块」重复；验证侧「工具开关切换与恢复通过」保留 |
| L56「用户点击入口 → 原组件原回调打开对应功能；本轮没有增加网络写入逻辑。纪念日、音乐条等开关仍使用原来的个人显示状态；测试切换两次恢复。没有发帖、聊天、上传图片或改共享数据」 | 前半与 Features/navigation-glass.md「点击入口仍走原有功能回调，不新增后端写入」重复；后半的「切换两次恢复」已在 §4 验证条目 |
| L70「多轮复核中的不通过项均已修正再跑：灰底纹理把玻璃变雾板；黄昏图标不清；外部遮罩及页面横移风险；触摸按住没有亮光；工具菜单旧蓝色与缺少滑块。没有把首次截图当成最终验收」 | 逐轮尝试流水；每项的最终状态都已在正文（细纹透明、3.14:1、无遮罩、指针按压、暖色滑块） |
| L85「其他弹窗应在后续按同一材质家族归类：工具外壳复用中性玻璃、随光细边与细纹…避免超出用户本轮范围」 | 跨组件迁移计划的权威是 `ai/Features/ui-system/ui-system.md`（Features/navigation-glass.md 已指向）；本文压成一句复用边界 |
| L87 末「功能文档：`ai/Features/navigation-glass.md`」 | 提到顶部，作为「机制说明见…」的单一入口 |

## 改正清单

无事实改正。原文所有数值经 2026-09-18 与本次复核均与源码一致（见待核清单），仅做表述合并。

## 待核清单

- 已核实（`src/themes/cinnaglass/shell/navigation-glass.css`）：三档 `--nav-tint` / `--nav-alpha` / `--nav-frost` / `--nav-ink`（L3-37）、`--nav-blur: 2.4px` 与 `saturate(0.7)`（L11、L62）、74×384 / 圆角 25 / left 38px（L14、L74-81）、主按钮 54×54（L128）、`scale(0.94)`（L210）、200 ms 过渡（L148/173/262）、窄屏 292×62 / 离底 10px / 48×48（L439-452）、conic 分段 0.02–0.72（L103-112）、`.rail-pop` 模糊 8px 与 `max(0.5, --nav-alpha)`（L256-258）、frost 取样 `256px 512px` 42% 50%（L91）。
- 已核实：`public/ui/nav/frost.webp` = 298,164 字节，与「约 298 kB」一致。
- 未重跑：对比度 4.52 / 3.14 / 3.76:1、2.22:1 初版值、#D8CDBA 共用纸色断言，按 `navigation-verification/results.json` 原文转录。

## 例外说明

exception = true。74.8% 为保真下的最小体积。剩余内容里约 1.5 KB 是不可删的材质与尺寸数值（三档表 + 状态表 + 桌面/窄屏几何），约 1.4 KB 是验证结论与其限定（对比度采样方法、触屏是模拟非真机、构建阻断），其余是文件真源与生成来源链接。与 `ai/Features/navigation-glass.md` 重复的机制说明已全部删到链接级，无法再靠去重获得空间；继续压缩只能删数值或删「不是逐像素相同 / 非真机 / 非无障碍认证」这类限定句。

## 原文对一次性截图的引用

无。原文只引用 `navigation-verification/comparison.png`、`navigation-verification/results.json` 与目录本身，均在保留名单内；未引用 `failure.png`、`design-system.png`、各 mood 的 idle/hover/pressed/menu/scene 单图、`viewport-*.png`、`touch-*.png`、`no-texture.png`、`underlay.png`，压缩稿也未新增（`reference-nav.png` 原文未引用，故未添加）。

## 锚点

全仓 grep `navigation-implementation.md#` 零命中（入向引用为文件级：`ai/Features/navigation-glass.md:24`、`ui-system.html:1395`）。压缩稿保留 `## 1..5` 编号标题结构。
