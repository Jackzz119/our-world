# Cinnaglass 光照递进设计报告

## 1. Mode and normalized brief

- **Mode:** Design
- **目标:** 为 Our World 的同一套桌面 UI 建立 Golden / Twilight / Night 三档光照主题。三档只改变场景光照与 SHELL 外壳 token，布局、组件、内容与纯白 PAPER 不变。
- **视口:** 1440 × 900。
- **必须出现:** 展开态通高 rail + sidebar、收起态悬浮糖果胶囊 rail 样本、房间选中态与未读徽章、两张成员卡、记忆弹窗、照片卡、两行设置、输入框与发送键。
- **硬约束:** SHELL / PAPER 双色域；玻璃只用于 SHELL；Chrome 中性、Accent 彩色、Paper 纯白；暗角、左侧 chrome 压暗、内容打开时场景 `brightness(.82)` 常开。

## 2. Evidence inventory

### 仓库参考图

1. `current-system.png`，1400 × 1500，角色：已上线设计系统基线。直接观察到中性暗石墨外壳、纯白内容纸、天蓝与粉色只用于强调、发丝分隔线与圆角组件。
2. `progression.png`，1400 × 1560，角色：方向草图。直接观察到 Golden → Twilight → Night 的外壳明度阶梯，以及“场景处理 ON”对白外壳成立的重要性。其内容、比例和精度与最终桌面稿不同，不作为排版模板。

### 联网调研（第一方/官方优先）

- Stripe 将背景区分为 `surface` / `container`，边界统一使用中性 `keyline` token；可迁移为“少量表面层级 + 单一中性 hairline”，避免每张卡自造描边。[Stripe Apps style](https://docs.stripe.com/stripe-apps/style)
- Linear 的主题生成只依赖 base、accent、contrast，并用 LCH 管理不同 elevation；其近期改版还主动压暗 sidebar，让主内容优先。可迁移为“三档共享结构，只调明度/对比变量”，而不是三套主题各画一遍。[Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)、[Linear calmer interface](https://linear.app/now/behind-the-latest-design-refresh)
- Apple 明确把 Liquid Glass 定义为导航与控制的功能层，反对在内容层使用；文字多的 sidebar / popover 应用 regular glass，亮背景后可加约 35% dim。此原则与 SHELL / PAPER 二分完全一致。[Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- Apple Dark Mode 指南要求普通文字至少 4.5:1，并指出媒体类产品可让暗 UI 后退、内容前进。这里不降低 PAPER 白度，而用场景降噪与外壳阴影控制眩光。[Apple HIG: Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- Day One 的公开定位强调“everything you need and nothing you don’t”，新版 On This Day 进一步把过去的记忆放到更沉浸、更干净的版面中心。可迁移为减少 chrome 装饰，让照片与日记卡承担情感色彩。[Day One](https://dayoneapp.com/)、[Day One navigation update](https://dayoneapp.com/releases/major-navigation-update-with-journals-more-tab/)
- Sanrio 官方设定强调 Cinnamoroll 出生于云上、白色、柔软；官方 Moon and Star 系列提供星/月夜间语义。可迁移为圆润胶囊、云白、天蓝/腮红粉，以及 Night 场景中的克制弯月和微星；不把角色图案铺进 chrome。[Sanrio Cinnamoroll](https://www.sanrio.co.jp/characters/cinnamon/)、[Moon and Star series](https://www.sanrio.com/products/cinnamoroll-8-plush-moon-and-star-series)

## 3. Executive verdict

最终方向成立：三张以同一几何、同一内容与同一纯白 PAPER 为锚，外壳从暖白透明、雾灰过渡到石墨沉静，连续性清楚且相邻档没有跳变。Golden 没有退回“白糊一片”，关键不是把外壳重新做暗，而是让左侧 scene dim、细描边和接触阴影共同托住近白玻璃。Twilight 是最危险的一档，已将副文字建议值压到 `#414D66`，以覆盖渐变最暗端仍接近/达到 4.5:1。

## 4. Concept matrix

| 档位 | 视觉假设 | 外壳角色 | PAPER 焦点 | 主要风险 | 设计结论 |
| --- | --- | --- | --- | --- | --- |
| Golden | UI 像被夕阳照亮的乳白玻璃 | 暖白、透明、边缘清楚 | 大白卡依靠纯白、冷一点的纸色和深接触阴影胜出 | 亮场景与白壳融合 | 必须绑定左侧横向压暗与 1px 双层 keyline |
| Twilight | 明暗换挡的雾灰桥梁 | 雾灰、低色度、对比最受控 | 白卡保持不变，暖色照片成为情感锚 | 副文字与局部背景对比不足 | 使用 solid 副文字 `#414D66`，不要透明灰字 |
| Night | chrome 沉入夜色，记忆像灯箱 | 中性石墨、轻冷边线 | 白卡与暖照片形成最大聚焦 | 蓝色发光过量会赛博化 | 蓝只放选中、开关、发送与细边辉光；月星只在场景 |

## 5. Detailed findings with observed evidence

### 共用版式与层级

- 三稿均为 1440 × 900，同一 rail / sidebar 宽度、同一记忆弹窗位置与尺寸、同一文案和照片内容。
- 主画面显示展开态通高 rail 与 sidebar；左下额外放置标注“收起态”的悬浮胶囊样本。生产实现中两者是互斥状态，这个样本仅用于同图比较形变结果。
- 纯白内容面包括照片卡、两行设置、输入框和成员卡；外层 sidebar、rail 与弹窗壳才使用玻璃。未出现玻璃套玻璃。
- Accent 只出现在选中行、未读徽章、开关、分段选中、发送键和胶囊细边，没有形成高饱和彩色面板。

### Golden

- 直接观察：外壳为暖中性近白，顶部有更亮 highlight，左缘和弹窗底部存在细灰 keyline；左侧场景在 chrome 后明显压暗。
- 影响：即便场景窗户和落日很亮，sidebar 仍能读出边界；PAPER 依靠完全不透明白、独立接触阴影和更大的内容面积继续成为焦点。
- 风险：如果移除 stage 左侧压暗，sidebar 底部与亮墙面会失去边界；不能只靠提高玻璃不透明度补救，否则又会变成白色实心面板。

### Twilight

- 直接观察：同一外壳被压到冷中性雾灰，scene 从橙金进入蓝紫暮色；内容照片仍保持 Golden 的暖夕阳，因此主题切换不会篡改记忆内容。
- 影响：这是三档的视觉铰链，既能承接 Golden 的轻盈，也能预告 Night 的沉静。
- 风险：半透明副文字在雾灰渐变下容易跌破 4.5:1；建议使用不透明 `#414D66`，并保持 regular glass 的稳定底色。

### Night

- 直接观察：外壳转为中性石墨，文字翻为近白，选中态才带天蓝；场景窗外增加小弯月与少量星点，室内只留两处暖灯。
- 影响：白色照片卡与设置卡成为强烈但仍舒适的“暗框亮内容”；暖夕阳照片在夜色中保留记忆的时间错位感，符合“当前空间是夜晚，回忆仍属于当时”的语义。
- 风险：若把 `accent-glow` 扩散到整个面板，会迅速变成霓虹/赛博风；辉光只应贴近交互控件，半径小于 18px。

## 6. Token table

### 跨档固定 PAPER 与场景规则

| Token | 值 |
| --- | --- |
| `--paper-bg` | `#FFFFFF` |
| `--paper-text` | `#22335A` |
| `--paper-sub` | `#667087` |
| `--paper-line` | `rgba(33,57,92,.10)` |
| `--paper-hover` | `rgba(216,239,250,.60)` |
| `--paper-selected` | `linear-gradient(135deg, rgba(89,197,237,.24), rgba(216,239,250,.48))` |
| `--paper-shadow` | `0 2px 4px rgba(6,10,24,.16), 0 16px 34px -14px rgba(6,10,24,.42), inset 0 1px 0 rgba(255,255,255,.98)` |
| `--rail-candy-border` | `linear-gradient(180deg, #FFFFFF 0%, #59C5ED 52%, #FDD5E7 100%)` |
| `--stage-content-filter` | `brightness(.82)`，仅在记忆内容打开时 |
| `--stage-chrome-dim` | `linear-gradient(90deg, rgba(14,20,42,.40), rgba(14,20,42,.12) 45%, transparent)` |
| `--stage-vignette` | `inset 0 0 180px 46px rgba(14,18,40,.40), inset 0 0 64px 12px rgba(14,18,40,.18)` |

### 三档 SHELL token

| Token | Golden | Twilight | Night |
| --- | --- | --- | --- |
| `--shell-bg` | `linear-gradient(168deg, rgba(255,255,255,.82) 0%, rgba(248,246,241,.74) 55%, rgba(240,236,231,.70) 100%)` | `linear-gradient(168deg, rgba(226,229,238,.78) 0%, rgba(201,205,219,.74) 55%, rgba(184,189,207,.72) 100%)` | `linear-gradient(168deg, rgba(47,51,64,.84) 0%, rgba(34,38,51,.82) 55%, rgba(27,31,46,.84) 100%)` |
| `--shell-border` | `rgba(255,255,255,.78)` | `rgba(255,255,255,.55)` | `rgba(231,238,248,.22)` |
| `--shell-line` | `rgba(36,50,79,.12)` | `rgba(46,58,89,.16)` | `rgba(228,235,244,.14)` |
| `--shell-highlight` | `rgba(255,255,255,.88)` | `rgba(255,255,255,.62)` | `rgba(255,255,255,.18)` |
| `--shell-hover` | `rgba(255,255,255,.42)` | `rgba(255,255,255,.28)` | `rgba(232,238,246,.10)` |
| `--shell-selected` | `linear-gradient(135deg, rgba(89,197,237,.24), rgba(89,197,237,.10))` | `linear-gradient(135deg, rgba(89,197,237,.22), rgba(89,197,237,.09))` | `linear-gradient(135deg, rgba(89,197,237,.30), rgba(89,197,237,.12))` |
| `--shell-shadow` | `0 24px 64px -24px rgba(54,39,32,.46), 0 8px 24px -14px rgba(36,50,79,.28), inset 0 1px 0 rgba(255,255,255,.86)` | `0 26px 66px -24px rgba(26,30,48,.50), 0 8px 24px -14px rgba(26,30,48,.30), inset 0 1px 0 rgba(255,255,255,.62)` | `0 28px 70px -22px rgba(4,7,18,.72), 0 8px 24px -12px rgba(4,7,18,.48), inset 0 1px 0 rgba(255,255,255,.18)` |
| `--shell-text` | `#24324F` | `#26324F` | `#F2F5FA` |
| `--shell-sub` | `#58647B` | `#414D66` | `rgba(230,236,245,.72)` |
| `--accent` | `#59C5ED` | `#59C5ED` | `#59C5ED` |
| `--accent-deep` | `#2E9FD0` | `#268FBE` | `#83D8F5` |
| `--accent-glow` | `rgba(89,197,237,.30)` | `rgba(89,197,237,.28)` | `rgba(89,197,237,.50)` |
| `--blush` | `#FDD5E7` | `#FDD5E7` | `#FDD5E7` |
| `--shell-blur` | `26px` | `24px` | `22px` |
| `--shell-saturate` | `118%` | `112%` | `125%` |

对比度快速校验采用渐变的保守代表色：Golden 主/副文字约 11.8:1 / 4.9:1；Twilight 主文字约 8:1，副文字在最暗代表端约 4.5:1；Night 主文字超过 13:1。实际半透明结果仍受场景像素影响，因此 `--stage-chrome-dim` 不是装饰，而是可读性依赖。

## 7. Uncertainty and comparability limits

- 两张输入参考分别是设计系统长页与方向草图，内容、视口、裁切和任务不同，不能做像素级候选优劣比较。
- 三张输出经过同一 Golden 几何主稿派生，并回修了 Twilight 照片漂移与 Night 成员卡域错误；仍属于视觉设计稿，不代表浏览器实际 `backdrop-filter` 在所有 GPU 上的精确结果。
- 3D 房间是为表达光照关系生成的高保真示意，不是对仓库当前 2D/R3F 场景资产的隐藏状态推断。
- 收起态胶囊与展开态 sidebar 在同一画面中仅为状态对照；实现中应互斥。

## 8. Recommendation and next actions

1. 以三档 token 作为 `data-mood` 的 SHELL 覆写层，PAPER token 完全不参与时段切换。
2. 先实现 `stage-chrome-dim`、vignette 和内容打开时 `brightness(.82)`，再接 Golden 白壳；顺序反过来会重现“白糊”假失败。
3. Twilight 上线前用真实 3D 场景做最亮/最暗背景压力测试，尤其检查 12–13px 副文字与未选中图标。
4. Night 只允许交互附近出现 accent glow；弯月与星点属于 scene mood，不进入通用 chrome token。
5. rail 展开与收起共享图标序列，形变只改容器、宽度、圆角和阴影，避免两个状态出现导航顺序漂移。

## 9. Artifact manifest

| Artifact | Role | Size |
| --- | --- | --- |
| `golden-1440x900.png` | Golden 最终设计稿 | 1440 × 900 |
| `twilight-1440x900.png` | Twilight 最终设计稿 | 1440 × 900 |
| `night-1440x900.png` | Night 最终设计稿 | 1440 × 900 |
| `golden-master.png` | built-in image_gen 原始 Golden 主稿 | 1586 × 992 |
| `twilight-master.png` | built-in image_gen 回修后 Twilight 主稿 | 1586 × 992 |
| `night-master.png` | built-in image_gen 回修后 Night 主稿 | 1586 × 992 |
| `codex-report.md` | 调研、设计判断、token 与风险报告 | Markdown |

生成方式：仅使用 bundled `imagegen` skill 的 built-in `image_gen` 工具；未使用 CLI/API-key fallback。最终提示词采用一个固定 UI 基础规格（1440×900、同布局、SHELL/PAPER 二分、指定组件与精确文案），Golden 定义暖白外壳；Twilight 仅替换为雾灰 token 和暮色场景；Night 仅替换为石墨 token 和月夜场景。两次 QA 局部提示分别只恢复 Twilight 的固定夕阳记忆照片、以及 Night 的纯白成员 PAPER 卡。
