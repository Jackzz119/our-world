# Cinnaglass 光照递进实现保真度审核

## 1. Mode and normalized brief

- **Mode:** Audit
- **审核对象:** `impl-three-up.png` 中 Golden / Twilight / Night 三档同屏代码实现。
- **基准:** 附件 Golden 与 Night 设计稿；仓库内同批次 `twilight-1440x900.png` 仅作为 Twilight 的补充上下文。
- **目标:** 判断三档递进、SHELL/PAPER 分层、对比度、辉光及新增 `--app-ground` 是否达到定稿标准，并给出可直接落码的 token 修正。
- **不在本次范围:** 不改产品代码，不生成重设计图，不覆盖任何源图。

## 2. Evidence inventory

| 角色 | 文件 | 尺寸 | 使用方式 |
| --- | --- | ---: | --- |
| Target | `D:\Repo\our-world\ai\design_system\cinnaglass\_shots\impl-three-up.png` | 1400 × 520 | 逐像素检查三档实际 CSS 合成结果 |
| Reference | `D:\Repo\our-world\ai\design_system\cinnaglass\mood-progression-codex\golden-1440x900.png` | 1440 × 900 | Golden 明度、色温与层级基准 |
| Reference | `D:\Repo\our-world\ai\design_system\cinnaglass\mood-progression-codex\night-1440x900.png` | 1440 × 900 | Night 明度、白卡与辉光基准 |
| Supplemental | `D:\Repo\our-world\ai\design_system\cinnaglass\mood-progression-codex\twilight-1440x900.png` | 1440 × 900 | 同批次 Twilight 稿；不属于附件清单，结论中单独标识 |
| Implementation context | `src/themes/cinnaglass/cinnaglass.css`、`ai/design_system/cinnaglass/impl-three-up.html` | — | 核对截图使用的真实 token 与验证页状态 |

以下颜色为源 PNG 上代表性空白区域的 5 × 5 像素中位数，不是从 CSS 值反推：

| 区域 | Target | Reference | 判断 |
| --- | --- | --- | --- |
| Golden sidebar 顶 / 底 | `#F8F5F2` / `#EDE8E0` | `#BCAFA5` / `#BDAC9D` | Target 明显更白、更平，失去暖场景透入感 |
| Golden modal header | `#EFEDE9` | `#F1E4DB` | 明度接近；Target 稍偏中性、少一点暖粉棕 |
| Twilight sidebar 顶 / 底 | `#CDD1DE` / `#B4B9CB` | 补充稿 `#9597AE` / `#9091A3` | Target 过亮、过不透明，尚未成为真正的过渡铰链 |
| Twilight modal header | `#CDCDD9` | 补充稿 `#989AB3` | 同样明显偏亮 |
| Night sidebar 顶 / 底 | `#282B38` / `#1B1F2D` | `#1C2028` / `#1D1F28` | 整体接近；Target 顶部略亮，底部几乎吻合 |
| Night modal header | `#2B2F40` | `#1E1E27` | Target 略亮，但仍处在正确石墨档 |
| PAPER | `#FFFFFF` | `#FEFEFD` 左右 | 一致，固定白纸策略被正确实现 |

## 3. Executive verdict

**一句话结论：这版还不能定稿；SHELL/PAPER 架构和 Night 已成立，但 Twilight 明度/对比度、in-flow `--app-ground` 合成方式，以及验证页缺少打开内容时的 scrim，必须先修。**

没有 blocker；有 4 个 high 级问题。修完后可进入真实产品页验收，不建议继续凭三联缩略页直接定稿。

## 4. Issue table

| 优先级 | 问题与可见证据 | 影响 | 可直接落码的修正 |
| --- | --- | --- | --- |
| **High** | **Twilight 太亮且相邻档不均衡。** Target 侧栏相对亮度约为 Golden `0.917→0.811`、Twilight `0.639→0.487`、Night `0.025→0.014`；Twilight→Night 是明显断崖。补充 Twilight 稿的壳色也远暗于 Target。 | 三档虽能辨认，但更像“亮 / 稍灰 / 突然全黑”，没有连续的光照递进。 | Twilight 联动修改：`--shell-bg: linear-gradient(168deg, rgba(226,229,238,.62) 0%, rgba(201,205,219,.56) 55%, rgba(184,189,207,.54) 100%)`；`--shell-border: rgba(255,255,255,.48)`；`--shell-hi: rgba(255,255,255,.52)`。不要改 Night 来迁就 Twilight。 |
| **High** | **Twilight 副文字在实际最暗壳面上不够稳。** `--shell-sub: #414D66` 对截图底部 `#B4B9CB` 约 `4.33:1`；9–12px 小字没有余量。验证图中的“未选中图标”还是彩色 emoji，并未使用真实线性 icon/token，因此该图不能证明图标对比度合格。 | 正文边缘位置可能低于 WCAG 常规文字 4.5:1；图标状态测试存在假阳性。 | Twilight `--shell-sub: #3B4760`，在同一像素背景约 `4.76:1`；未选中图标统一 `color: var(--shell-sub)`。验证页把 `🛋️/🌿` 换成产品真实 SVG/icon，并保留 `currentColor`。 |
| **High** | **`--app-ground` 的概念正确，三个实色中只有 Night 基本合理。** Golden `#DDD5C8` 经高 alpha 白壳合成后得到近纸白 `#F8F5F2`；Twilight `#9AA0B4` 得到大面积薰衣草灰；两者都把 glass 变成平板。Night `#14171F` 与参考接近。 | Golden 的 sidebar 与 PAPER 争层级；Twilight 过亮；flat ground 也让 blur/saturate 在 in-flow sidebar 后几乎没有视觉作用。 | 首选把 `--app-ground` 改为低频场景延续而非实色：Golden `linear-gradient(168deg,#B8AA9D 0%,#A9988C 58%,#81766F 100%)`；Twilight `linear-gradient(168deg,#73798D 0%,#5F657C 58%,#42485C 100%)`；Night `linear-gradient(168deg,#14171F 0%,#11151E 58%,#0C1018 100%)`。如果本轮只能用实色，分别用 `#B8AA9D / #73798D / #14171F`。长期最佳做法是让 app 级共享场景/低频缩略层铺到 sidebar 背后，sidebar 仍保持 in-flow，不需要改布局语义。 |
| **High** | **验证页没有复现“内容打开”状态。** `impl-three-up.html` 显示打开的时间线卡，但没有 `.modal-scrim.show`；产品 CSS 实际 scrim 是 `rgba(12,18,38,.58)` + `blur(5px) brightness(.82)`。 | 当前图无法审核参考稿所依赖的“内容打开时场景后退”，也会放大 Golden 白糊和 Night 白卡刺眼的主观判断误差。 | 补 token：`--stage-content-scrim: rgba(12,18,38,.58)`；`--stage-content-filter: blur(5px) brightness(.82)`，并让产品 `.modal-scrim.show` 与验证页共同消费这两个 token。`--stage-chrome-dim` 与 `--stage-vignette` 现值不改。 |
| **Medium** | **Golden 色温略冷，但不是壳/纸分离问题。** modal header Target `#EFEDE9` 对参考 `#F1E4DB`，Target 少了暖粉棕；PAPER 仍为纯白，边界清楚。 | 暖光氛围稍弱，但不影响可用性。 | 先只改 `--app-ground`；不要动 Golden `--shell-bg`。如果真实场景回归后仍偏冷，再把 Golden 中/末 stop 改为 `rgba(250,242,236,.74)` 与 `rgba(242,231,224,.70)`；这是二次修正，不应与首轮同时盲改。 |
| **Medium** | **Night 抬升壳的冷 rim 不如参考明显。** Target modal 外边缘偏中性灰，参考有更清楚的冷蓝轮廓；但全局辉光并未过量。 | 焦点壳与普通暗 chrome 的层级略弱。 | 不改全局 `--shell-border`。新增/复用 raised-shell 专用 `--shell-focus-border: rgba(131,216,245,.34)`，只给打开的 modal/HUD 焦点边；避免整套 sidebar 变蓝。 |
| **Low** | 三联图使用 8.5–12.5px 字号、emoji 图标和自定义 214px modal，不是产品组件的真实尺寸。 | 不能从这张缩略验证页推断生产页的字号、圆角与间距已经保真。 | 验证页应直接挂产品组件；在此之前，不建议根据截图去改全局 `--r-lg:24px / --r-md:18px / --r-sm:14px`。现有圆角 token 暂不改。 |

## 5. Detailed findings

### 5.1 保真度、层级与扫描顺序

- **直接观察：** 三档都保持“标题 → 照片 PAPER → 设置 PAPER → composer”的扫描顺序；Accent 仍只出现在选中、开关和发送，信息层级没有被 mood 改写。
- **直接观察：** Golden modal 壳与 PAPER 的像素差为约 16–35 RGB 级，并有 keyline 与三层 shadow；白壳上放白纸并没有糊成一片。
- **直接观察：** Golden sidebar 顶部壳 `#F8F5F2` 与白卡 `#FFFFFF` 只差约 7 RGB 级，但当前 `--paper-shadow` 仍让成员卡可辨；换用更暗的 ground 后分离会更稳。
- **判断：** `--paper-line: rgba(33,57,92,.10)` 与现有 `--paper-shadow` 足够，不建议为了 Golden 单独加粗 PAPER 描边，否则 Night 会出现“白卡黑边”。
- **限制：** Target 每档只有约 436 × 360，而参考为 1440 × 900；modal、间距、字体和圆角不是同尺度、同组件渲染，不能做严格像素对齐。这里能可靠审核的是颜色域、层级与可读性，不是生产排版保真度。

### 5.2 三档连续性

- **直接观察：** 顺序能读成 Golden → Twilight → Night，没有档位混淆。
- **直接观察：** Night 与参考很接近，Golden modal 也接近；主要误差集中在 Twilight 与 sidebar ground。
- **判断：** 当前相邻差值不合适。Twilight 仍站在偏亮一侧，导致 Night 像主题切换而非太阳继续落下。应压暗 Twilight，而不是抬亮 Night。
- **建议验收条件：** 修后在同一采样位置，Twilight sidebar 顶部应落在约 `#B5B8C8` 附近、底部约 `#989EAF` 附近；允许随场景像素波动约 ±10 RGB，不追逐设计稿单个像素。

### 5.3 Golden：白壳与白纸

- **结论：** 当前 keyline + shadow 足够，白卡没有糊；真正的问题是 sidebar 整块过白，而不是 PAPER 不够深。
- 保持 `--glass-paper:#FFFFFF`、`--paper-line:rgba(33,57,92,.10)`、`--paper-shadow` 原值。
- 不建议用降低 PAPER 白度修层级；这会破坏三档共享的“记忆是最亮内容”规则。

### 5.4 Twilight：文字与未选中图标

- **直接观察：** `#414D66` 在最亮壳面约 `5.56:1`，在最暗代表面只有约 `4.33:1`，说明风险只发生在渐变暗端，不是全局失败。
- **修正后预期：** `#3B4760` 在同一暗端约 `4.76:1`，给抗锯齿、不同 GPU 合成和小字号留出有限但实际的余量。
- **验证缺口：** emoji 自带颜色，不能代替 `currentColor` SVG 做对比度验收；必须用产品 icon 重拍。

### 5.5 Night：辉光与白卡

- **直接观察：** 当前可见辉光集中在 rail 边、选中态、开关和发送键，没有形成整块蓝色 halo；不属于过量。
- **直接观察：** PAPER 与 Night modal 最暗代表面约为 `15.4:1`，视觉冲击强；参考稿也是同等级强对比，因此这是既定“暗框亮记忆”策略，不是实现跑偏。
- **建议：** 保持 `--accent-glow: rgba(89,197,237,.50)` 与 `--glass-paper:#FFFFFF`，但所有实际使用的 blur radius 应控制在 `≤16px`。不通过把 PAPER 改灰来减刺眼。
- **剩余风险：** 长时间夜间使用的舒适度无法由静态图确认；需在真实显示器上做 10–15 分钟暗室体验测试。

### 5.6 `--app-ground` 判断

- **概念判断：正确。** in-flow sidebar 后面确实需要一个可合成底层；继续固定深海军蓝会让 Golden 变脏。
- **当前数值判断：Golden 不合理，Twilight 偏亮，Night 合理。** 问题不是“跟时辰变化”本身，而是前两档用平坦、过亮实色，令高 alpha shell 没有可见深度。
- **最佳做法：** 保留变量名和 mood 跟随，但让其承载低频场景延续/渐变；如果工程允许，把同一 scene backdrop 放到 `.app` 层并覆盖 sidebar + stage，sidebar 仍然参与 flex 布局。这样 blur/saturate 才有真实输入，视觉也不会出现 sidebar 与 stage 两块完全不同的世界。

## 6. Uncertainty and comparability limits

- Reference 是生成式高保真设计稿，Target 是浏览器真实 CSS；设计稿的玻璃合成并不保证能由给定 alpha 在物理上逐像素复现。因此本报告以“层级与视觉关系”作为保真标准，不要求复制每个参考像素。
- Target 与 Reference 的视口、组件尺寸、内容密度和场景细节不同。圆角、间距、字体大小、裁切与阴影扩散不能直接一一比较。
- Twilight 设计稿不是本次附件，只是仓库内同批次补充证据；若只采用附件，Twilight 的结论仍可由三联图连续性和实测对比度成立，但不能声称精确对齐某张附图。
- 静态 PNG 无法验证 hover、focus、折叠动画、不同 GPU 的 `backdrop-filter`、HDR/低亮度显示器以及真实场景最亮/最暗帧。

## 7. Recommendation and next actions

按以下顺序落码并重拍，避免多变量互相掩盖：

1. 先接入 `--stage-content-scrim` / `--stage-content-filter`，让验证图状态与打开内容的产品状态一致。
2. 用推荐的 gradient `--app-ground` 替换三档实色；Night 可以保持 `#14171F` 作为降级值。
3. 应用 Twilight 的 `--shell-bg / --shell-border / --shell-hi / --shell-sub` 联动值；其余档位先不动。
4. 验证页换成产品真实 SVG icon 与真实组件，不再用 emoji 和缩小版替身。
5. 重拍同屏图后检查：Golden PAPER 边缘仍清楚；Twilight 暗端副字 ≥4.5:1；Night 无大于 16px 的可见蓝 halo；三档相邻明度不再出现 Night 断崖。

若以上全部修完，剩余风险只有三类：真实场景极亮/极暗像素对玻璃的压力、不同浏览器/GPU 的 backdrop-filter 差异，以及 Night 长时间观看舒适度。这些都需要真实产品页和真机验证，不能由当前三联静态图彻底消除。

## 8. Artifact manifest

| Artifact | Role | 状态 |
| --- | --- | --- |
| `D:\Repo\our-world\codex-visual\20260808-200206Z\codex-report.md` | 最终 audit 报告 | 新建 |

未生成图片、标注板或替代设计稿；未修改或覆盖任何输入图片。
