# Our World v2「放置陪伴小屋」Timeline 重做

> 交付模式：**Design（策划 + 三方向视觉比稿 + 视觉 QA）**  
> 生成方式：Codex `imagegen` skill + 内置 `image_gen`；未使用 CLI、API key 或手绘替代物。  
> 输出基准：三张均为 **1440×900**、同一夜雨书房、Timeline 打开态。

## 1. 模式与规范化 Brief

### 1.1 目标

把 v1 的「近全屏玻璃弹窗里的时间线 app」改造成 v2 的「从书桌日记本打开的一页共同日记」，同时保住已经成熟的数据链路与阅读效率。

### 1.2 不可动的产品约束

- 场景是底，功能是纸；纸面必须是全场最高明度。
- 两只真实房间角色在打开态都必须留有可辨识部分。
- Timeline 仍是上旧下新的单列日记流，不出现中央脊线、左右交错或横向翻阅负担。
- Composer 固定在底部；文字 + 最多 9 图；点外或 Esc 只收起并保留草稿，「取消」才清空。
- 我 = 蓝、对方 = 粉；身份只打在头像光环、作者名和卡片边线/浅色底，不靠左右位置。
- 图片列表走缩略图，点开详情后渐进换原图。
- 照片墙、心愿单必须重新服从「功能住在房间物件里」的心智。
- 外壳用中性烟熏玻璃；内容坐纸；禁止玻璃嵌玻璃。
- 不增加持续运动装饰，不使用红点压迫，不依赖 hover 才能操作。

### 1.3 本轮裁决摘要

1. **Timeline 的产品名与界面标题改为「回忆日记」；内部 route/type 可以继续叫 `timeline`。**
2. **照片墙与心愿单退出 Timeline 容器，不再共用三 tab。**相框打开照片墙，许愿罐打开心愿单，rail/更多只作为效率入口，且打开同一个物件页面。
3. 「翻开日记本」只延伸到**入口、页边、书签、开合动效、轻翻页声**；内容区仍是数字滚动。不能把隐喻延伸为双页、逐条翻页或横向分页。
4. **推荐方向 3「系回日记本的纵向长纸」**：它用一张平直白纸保阅读，用封皮露边、折角、粉色书签连线表达来源；物件感明显强于弹窗，实现与小窗风险又显著低于方向 2。
5. 方向 2 的「桌面展开」保留为**开场动效与姿态参考**，不建议照着做持续滚动的透视页面。

## 2. 证据清单

### 2.1 五张附图

| 角色 | 文件 | 尺寸 | 直接观察 | 本轮用途 |
|---|---|---:|---|---|
| Target | `before-open.png` | 1908×1068 | `.modal glass tall` 可见宽约 1280px、高约 1000px，覆盖画面中央绝大部分；两只房间角色完全不可见；顶端三 tab；宽屏两侧出现两只额外云朵狗；纸卡坐在大面积雾灰壳上 | 确定必须移除的结构与现有内容密度 |
| Reference | `before-idle.png` | 1908×1068 | 与 target 同一夜雨时刻；蓝狗在左沙发读书、粉狗在右书桌写字，日记本位于桌面中心偏右；rail、氛围 pill、纪念卡、音乐条均为真实已落地 UI；底部另有一条 OS 输入法候选条截入画面 | 三张设计稿的共同场景底图与角色位置真源 |
| Reference | `04-timeline-open-state.png` | 1586×992 | 白纸卡显著比壳和场景亮，场景统一退后；单卡纵向阅读明确；已知缺陷是中央纸卡遮挡角色过多 | 方向 1 层级真源，三稿共同明度基准 |
| Reference | `01-main-morning.png` | 1586×992 | 固定近景机位、两座位、书桌日记本、相框、许愿罐、唱片机、挂钟与极窄 rail 的关系清楚 | 校验物件心智与角色安全区 |
| Reference | `concept-c-narrow-rail.png` | 1586×992 | 中性石墨玻璃、亮 keyline、紧凑 pill、纪念卡和音乐条的产品壳语言已经成体系 | 避免为 Timeline 自绘另一套玻璃 |

### 2.2 仓库证据

本轮实际读取并用于判断：

- `ai/PROJECT.md`：v2 PRD、三条陪伴铁律、物件到功能的映射、Presence 方向。
- `ai/TODO.md`：R1 当前任务与「白纸功能卡收敛」欠账。
- `ai/STYLE.md`：内容纸恒白、场景为底、功能为纸、960px/640×400 验收、低噪原则。
- `ai/UX.md`：物件双通道、220ms 开合参数、触屏兜底、玻璃/纸/木/果冻质感公式。
- `.claude/skills/ux/decisions.md`：D-1、D-2、D-8、D-9～D-12 的历史裁决和 token 勘误。
- `ai/features/timeline.md`：Timeline/Composer/Storage 的完整在役链路和 ST-P～V 设计理由。
- `ai/design_system/cinnaglass/timeline-redesign.html`：单列日记流、日期贴纸、头像挂卡、图片主视觉的 v1 视觉基线。
- `ai/design_system/cinnaglass/ui-system.html`：SHELL/PAPER 双色域与组件登记规则。
- `src/themes/cinnaglass/cinnaglass.css`：真实 token、`.glass/.paper/.modal/.modal-scrim` 与 mood/material 双轴。
- `src/themes/cinnaglass/screens.tsx`：`SubScreen / TimelineBody / Composer / PhotosBody / PostDetail`、三 tab、吉祥物与内联样式现状。
- `src/pages/WorldPage.tsx`：`MODAL_TABS`、screen 路由、rail 与物件热点共用入口。
- `src/themes/cinnaglass/room/study-room.ts`：日记本热点 `x:790 y:480 w:260 h:130`。
- `src/themes/cinnaglass/room/pixi-scene.ts`、`room-scene.tsx`：热点当前只回传 id；打开任何 screen 时 Pixi ticker 会停止。
- `src/hooks/useFeed.ts`、`src/lib/posts.ts`、`src/lib/storage.ts`：上旧下新暴露、游标分页、最多 9 图的上传依赖、1024 缩略图、原图签名与 40 分钟续签。

### 2.3 现状问题分级

| 级别 | 证据 | 影响 | 具体修正 |
|---|---|---|---|
| Blocker | Target 中两只房间角色均被大弹窗完全盖住 | 破坏「开着就行」与 presence 的核心价值；进入日记等于离开房间 | Timeline 不再使用 `.modal.tall`；纸页宽度收窄并为两侧角色留安全区 |
| High | 三 tab 把日记、相框、许愿罐重新合成一个 app | 与已经落地的物件入口冲突，用户记住 tab 而不是房间 | 三个物件各开各的 surface；效率入口仍指向同一个 surface |
| High | 大面积玻璃壳比内容本身占据更多视觉面积 | 「场景为底、功能为纸」被反转，像系统弹窗 | Timeline 外层只保留 scrim；主内容直接是一张 `.paper` |
| Medium | 两只云朵吉祥物与房间两只真角色同时出现 | 重复角色、抢身份语言；还带持续 bob 动画 | 删除 `MascotSvg`、`.tl-mascot` 与动画 |
| Medium | `.modal` 的变换原点固定在屏幕中央，过渡 0.4s | 入口与物件断开，且超过 UX 统一 220ms 规格 | 把 pointer/keyboard 触发原点传给 surface；改为 220ms 物件冒泡 |
| Low | `before-idle.png` 底部截入 OS 输入法候选条 | 非产品 UI，污染设计对照 | 三张 mockup 均已移除；正式截图流程也应隐藏输入法 |

## 3. 策划 A.1：信息架构与心智

### 3.1 Timeline 在 v2 里是什么

**它是一册共同写的回忆日记，不是一条社交 feed。**

- 房间层语义：书桌上的实体日记本。
- 打开层语义：一张从本子里展开/抽出的白纸功能面。
- 内容层语义：两个人按时间共同续写的一条纵向长卷。
- 数据层语义：仍是 `posts`，不改表、不改 RPC、不改图片存储。

页面标题用「回忆日记」，弱化技术词「时间线」。代码名 `timeline` 可继续保留，避免无价值迁移。

### 3.2 「翻开日记本」可以走多远

| 范围 | 裁决 | 理由 |
|---|---|---|
| 从书桌热点位置开合 | 做 | 直接建立物件因果，且只需传一个 origin |
| 露出封皮、页边、书签、折角 | 做，克制 | 一眼说明「这是日记」，不会改变阅读模型 |
| 一次轻翻页/纸张声 | 做，可关闭 | 与 220ms 动效同一事件，只发生一次，不制造持续噪点 |
| 纵向滚动、往上翻更早 | 保留数字交互 | 大量文字、多图、游标分页需要稳定滚动；隐喻服务内容而不是限制内容 |
| 双页摊开、左右放不同作者 | 不做 | 违反 D-1；视线横跳；小窗必然崩坏 |
| 每条回忆逐页翻 | 不做 | 降低扫读效率，和「一次不平铺全部信息」并不等于一次只看一条 |
| 真实透视中的可滚动文字 | 不做正式态 | 文本、点击区、图片裁切、响应式和可访问性成本过高；方向 2 只作仪式参考 |

原则是：**物件隐喻负责“为什么打开”，数字 UI 负责“怎么高效读写”。**

### 3.3 白纸功能卡还是别的形态

- 不继续用玻璃壳包白卡。
- 也不做完全拟真的两页书。
- 推荐为**一张前视、平直、恒白的长纸**；背后只露 6–8px 封皮边，底部一个折角和一条连接真实日记本的书签线。
- 外层 scrim 是场景层，不是第二个 UI 容器。

这仍然遵守概念图 04 的白纸功能卡，只是把「居中弹窗」修正为「有物件来源的纸页」。

### 3.4 照片墙 / 心愿单是否同一容器分 tab

**裁决：不再同容器分 tab。**

- 日记本 → 回忆日记。
- 墙上相框 → 照片墙。
- 星光许愿罐 → 心愿单。
- rail/更多菜单是效率入口，但仍打开对应的独立 surface。

数据复用不等于界面同居。`PhotosBody` 仍可复用 `useFeed` 的 posts 与签名 URL；它只是失去「Timeline tab」的视觉归属。心愿单目前仍是本地 seed/存储，更应该独立，避免让用户误认为它也是 posts 的一种筛选。

## 4. 策划 A.2：完整交互流

### 4.1 从房间到回忆日记

1. **静默态**：日记本不挂 badge，不持续呼吸；沿用现有热点轮流低频提示。
2. **Hover / Focus**：物件本身轻微翻一角或书签抬起一次，光标变化；键盘 focus 有可见轮廓。触屏单击直接打开，不要求先模拟 hover。
3. **触发**：Pixi 热点回传 `{ id, clientX, clientY, source }`。键盘或 rail 打开时分别回落到热点中心或 rail 按钮中心。
4. **220ms 打开**：
   - 0–80ms：scrim 开始压暗；blur 独立从 0 到目标值。
   - 0–150ms：纸页从触发点 `scale(.9)` + 轻微上浮到 `scale(1.02)`。
   - 150–220ms：回到 `scale(1)`；封皮边与书签同时到位。
   - `transform-origin` 来自真实触发点，不固定在屏幕中央。
5. **初始阅读位置**：维持当前行为，首次装载直接落到底部最新回忆；不是倒序列表。

### 4.2 浏览与翻更早

- 顶部保留「↑ 翻看更早的回忆」轻提示。
- 滚到距顶 80px 内触发 `loadOlder()`；prepend 后用现有 scroll-height anchor 保持阅读位置。
- 不增加分页器，也不模拟一页页翻书。
- 底部橡皮筋刷新可保留，但提示文案与纸页语气统一；触屏继续用原生惯性。
- 长文仍 6 行截断；点卡片开 `PostDetail`；图片帖首图 16:10，右下显示 `+N 张`。

### 4.3 写一条

- Composer 是纸页底部兄弟节点，不覆盖列表。
- 折叠态保持 40px 左右，文案「记录此刻的我们…」。
- 点击后向上展开；textarea 自动长高到 220px 后内滚。
- 整个 composer 是拖放区；受控选择器最多 9 图，所见即所传。
- 有文字或有图即可提交；按钮继续使用「记下这一刻」。
- 发布成功：唯一一次清空草稿，reload 后平滑落底。
- 失败：保留文字和图片，错误显示在纸面上，不抛英文 Storage 原文。

### 4.4 关闭与 Esc 优先级

按从内到外的顺序消费 Esc：

1. Lightbox / PostDetail 打开 → 只关详情。
2. Composer 展开 → 收起并保留草稿，阻止事件继续冒泡。
3. 日记页本体 → 关闭回房间。

点击行为：

- 点纸页内空白：不关闭；若 composer 展开，只收起并保草稿。
- 点场景 scrim：关闭日记；组件保持挂载，草稿仍在。
- 点「取消」：唯一清空文字与所选图片的动作。
- 关闭动画可缩回触发点，时长 160–180ms；不需要完整反向翻书。

### 4.5 Reduced motion

`prefers-reduced-motion: reduce` 下取消 overshoot、页角摆动和书签位移，只做 120ms opacity；滚动仍可用，发布后的 smooth scroll 改为直接落底。

### 4.6 960px 与 640×400 退化

| 视口 | 页面策略 | 角色策略 | 内容策略 |
|---|---|---|---|
| ≥1200 | 推荐稿宽 560–590px、高 740–780px；保留封皮露边、折角、书签 tether | 两侧留完整场景列，两张脸与所持物可见 | 3 条左右回忆 + composer；图为 16:10 主视觉 |
| 960px 宽 | 纸页宽 460–500px；取消 1° 倾斜，tether 缩短；高度 `calc(100% - 32px)` | 页面略偏中左，粉狗脸留在右侧；蓝狗脸/书留在左侧 | 仍单列；正文不降到 14px 以下；列表独立滚动 |
| 640×400 | **不全屏化**。纸页宽约 260–280px、高 376px；去封皮偏移和大折角，只留 4px 页边 + 书签短尾；blur 降到 2px | 左右各保约 150px 场景带，让蓝狗左半与粉狗右半仍可辨；需用真实截图做碰撞验收 | 同时只需显示 1–2 条；图高约 120px；header 44px、composer 36px；展开 composer 时列表收缩，不覆盖场景 |

小窗宁可一次少显示内容，也不把纸页铺满。640×400 必须在 OS 125% / 150% 缩放下再次截图，确认正文、眼睛和嘴线都不糊。

## 5. 策划 A.3：v1 保留清单与改造清单

成本定义：**S** = 纯样式/删除/局部重组；**M** = 跨 2–4 个组件或需响应式/事件协调；**L** = 需要新状态、动画资产或完整双端联调。

| 状态 | 决定 | 成本 | 理由 / 边界 |
|---|---|---:|---|
| 保留 | D-1 单列日记流；禁止中央脊线/左右交错 | S | 亲密日记扫读比装饰性 timeline 更重要 |
| 保留 | D-2 点外/Esc 收起保草稿；取消唯一清空；折叠条有预览 | S | 当前实现已经正确，不得因换壳回归 |
| 保留 | 我蓝 / 对方粉，打在头像光环、名字、边线/浅色底 | S | 位置只承载时间顺序 |
| 保留 | 上旧下新 + composer 在底部 | S | 与共同续写和现有 `useFeed`/scroll anchor 同向；本轮不挑战 |
| 保留 | 缩略图列表 + 点开渐进原图；1024 缩略图与签名续签 | S | 数据链路成熟且节省流量 |
| 保留 | 6 行 clamp、详情层、无限上滚、发布后落底、失败保草稿 | S | 都是生产级边界，不属于视觉债务 |
| 保留 | 受控多图选择器，整块拖放，最多 9 图 | S | 防止旧版「拖 B 传 A」回归 |
| 改造 | `.modal glass tall` → `.diary-surface paper` | M | Timeline 不再需要大玻璃容器；其他 modal 不动 |
| 改造 | 三 tab → 三个物件各自 surface | M | 恢复房间物件心智；数据 hook 可复用 |
| 改造 | 日期贴纸 | S | 保留「⭐ 今天」，减少无意义旋转；更早日期维持低彩度 |
| 改造 | 条目卡片 | S | 从白纸上的另一张厚白卡，改为作者浅色带/薄 hairline，减少纸上纸的层级膨胀 |
| 改造 | Composer 外形 | S | 保留逻辑，变成页底固定写字栏；展开仍向上生长 |
| 改造 | 详情层 | S–M | 可继续独立 `.paper`，但层级应在日记页之上；Esc 栈必须明确 |
| 改造 | scrim / blur | S | 由一个复合 token 拆成可独立调的 dim 与 blur |
| 删除 | `MascotSvg`、`.tl-mascot`、`mascotBob` | S | 房间已有真角色；持续漂浮与低噪原则冲突 |
| 新增 | 热点/rail 打开原点传递 | M | 让 220ms 动效真正从物件冒出 |
| 新增 | 页边、封皮露边、折角、书签 tether | S–M | 只用伪元素/静态装饰，不改变 DOM 阅读顺序 |
| 新增 | 640×400 compact 断点 | M | 不允许靠整体缩放糊掉字体 |
| 新增 | Esc 消费栈与 focus trap / focus return | M | 保证键盘、读屏与草稿语义正确 |

## 6. 策划 A.4：陪伴感增量

| 优先级 | 状态 | 建议 | 成本 | 安静性约束 |
|---|---|---|---:|---|
| P0 | 新增 | 对方发来新条目且页面关闭时，真实日记本/书签只亮一次 900–1200ms | S–M | 无红点、无数字、无循环；同一新条目只播一次 |
| P0 | 保留并强化 | 蓝/粉成为两人的固定「墨色」：作者色继续只落在名字、头像圈、3px 边线/浅底 | S | 不开放任意调色，不让色彩变成设置负担 |
| P1 | 新增 | Presence payload 增加 `surface:'timeline'` 与 `activity:'reading'|'writing'` | M | 数据只表达正在做什么，不显示“在线时长”或催促 |
| P1 | 新增 | 对方正在写日记时，粉狗切到执笔姿态；正在读时翻一页或拿本子 | L | 低频随机动作；不在日记 UI 内再加常驻状态条 |
| P1 | 新增 | 对方发布后，书桌页角轻抬一次 + 很轻的纸声 | M | 仅事件触发；声音随 UI feedback 音量，可关闭 |
| P2 | 可选 | 两人同时打开回忆日记时，让两只角色各自低头看本子 | L | 不做共享滚动位置、实时光标或“正在看第几条”，避免协作工具感 |

不建议：Timeline 内新增在线绿点、未读红点、连续闪光、谁看过/已读、共同编辑光标。这些都会把私密日记重新推回消息流或协作软件。

## 7. 策划 A.5：实现落地映射

### 7.1 文件 / 组件

| 文件 | 保留 | 改造 / 新增 | 成本 |
|---|---|---|---:|
| `src/themes/cinnaglass/screens.tsx` | `TimelineBody`、`Composer`、`PostDetail`、`PhotosBody`、签名续签 hook | 拆 `SubScreen` 为 `TimelineScreen / PhotosScreen / WishlistScreen` 或一个无 tab 的 `ObjectSurface`；新增 `DiarySurface`；删除 `TABS`、`MascotSvg` 与 mascot CSS | M |
| `src/themes/cinnaglass/cinnaglass.css` | `.paper`、`--glass-paper`、`--paper-shadow`、mood/material 双轴 | 新增日记 surface 原子；拆分 scrim 的 blur/brightness；不要全局改坏其他 `.modal` | M |
| `src/pages/WorldPage.tsx` | `screen` 路由思路、rail 与物件共用同一目标 | 删除 `MODAL_TABS` 聚合心智；记录 `{screen, origin, source}`；分别挂三 surface；关闭后 focus 回触发物件 | M |
| `src/themes/cinnaglass/room/study-room.ts` | Timeline 热点 rect 原样保留 | 可加 `openBias:'desk-right'` 或 `surface:'diary'` 元数据；不重画/不移动热点 | S |
| `src/themes/cinnaglass/room/room-types.ts` | `HotspotSpec` | 新增 `HotspotOpenPayload` 类型 | S |
| `src/themes/cinnaglass/room/pixi-scene.ts` | 现有 pointerover/out/tap 与低频提示 | `pointertap` 回传 `clientX/clientY/source:'object'`；键盘路径回传热点中心 | M |
| `src/themes/cinnaglass/room/room-scene.tsx` | Pixi mount、resize、mood/weather | 转发打开 payload；MVP 打开页时继续暂停；若上 Presence 动作，改为单次 invalidate 或 `presence-only`，不要恢复满速 ticker | M / L |
| `src/hooks/useFeed.ts` | 上旧下新、游标、profiles、reload | 主链路无需改；P0 微光可另做 `useTimelineAttention` 记录 lastSeen/newest id | S / M |
| `src/lib/posts.ts` | RPC 与 createPost | 无视觉改动 | 0 |
| `src/lib/storage.ts` | 1024 缩略图、原图路径、签名 URL | 无视觉改动 | 0 |
| `src/themes/cinnaglass/shell/rail.tsx` | 窄 rail 与照片效率入口 | 入口继续分别打开照片墙/日记；不在打开页里生成 tab | S |

### 7.2 Token 与原子类

应复用：

- `--glass-paper: #FFFFFF`
- `--paper-text: #22335A`
- `--paper-sub: #667087`
- `--paper-line`
- `--paper-shadow`
- `--accent: #59C5ED`
- `--accent-grad` / `--accent-orb`
- `--blush: #FDD5E7`
- `--stage-content-scrim`
- `.paper`、`.btn-primary`、`.chip-accent`

建议新增或收编：

```css
/* 全局 token：数值只在 cinnaglass.css 定义 */
--stage-content-blur: 5px;
--stage-content-brightness: .82;
--object-open-duration: 220ms;
--object-open-ease: cubic-bezier(.22,.9,.3,1);
--author-partner-deep: #D97A96;
--author-partner-ring: rgba(239,157,180,.85);
--diary-cover-edge: /* 从书房木色体系取一个中性值，定稿后写入 token */;

/* 组件原子 */
.object-scrim
.diary-surface
.diary-page
.diary-cover-edge
.diary-ribbon
.diary-scroll
.diary-compact
```

`.diary-page` 直接组合 `.paper`，**不得再挂 `.glass`**。封皮露边和书签是伪元素/装饰层，`aria-hidden`、`pointer-events:none`。

### 7.3 Token 漂移需先裁清

Brief 指定 deep accent 为 `#2F9AD3`，但当前 `cinnaglass.css` 的根 `--accent-deep` 是 `#268FBE`，golden/night 还会覆盖；`#2F9AD3` 目前出现在 `--accent-orb` 与 guest tone。实现时不能在 Timeline 内硬编码一个“近似 deep”。

建议按本 Brief 把 **`--accent-deep` 的规范值统一回 `#2F9AD3`**，再跑三 mood 的对比度截图；若团队决定保留 `#268FBE`，则同步更新 `ui-system.html` 与 Brief 真源。两者必须二选一，不能继续双真源。

## 8. 三方向设计比稿

### 8.1 方向 1：忠实概念图 04 / 居中白纸

![方向 1](./direction-1-centered-paper.png)

**假设**：只要去掉大玻璃壳与 tabs，把现有单列内容放进一张窄白纸，概念图 04 的层级就足够成立。

- 回应约束：白纸最高明度；场景压暗；无 tabs/吉祥物；两只角色都留有部分；内容结构与 v1 最接近。
- 优点：实现最稳；几乎只换 `SubScreen` 外壳；960px 适配容易。
- 牺牲：即使收窄，仍有「居中弹出一张卡」的感觉；物件来源主要靠动效而不是静态形态；方向 1 中两只角色可辨但露出量最少。
- 成本：**S–M**。

### 8.2 方向 2：桌面展开 / 物件锚定

![方向 2](./direction-2-desk-unfold.png)

**假设**：让白纸在真实桌面日记本位置展开，能最大化「进入共同回忆」的仪式感。

- 回应约束：两张脸完整保留；书桌、日记本和页面因果最强；没有大壳和 tabs；单列不横跳。
- 优点：三稿中物件感最强，静态图就能读懂「从书里打开」。
- 牺牲：曲面/透视页面会让实际 DOM 的滚动、图片点击、composer、focus ring 与小窗适配变复杂；页面平均白度受纸张暖色与阴影影响，正式实现必须仍用纯 `#FFFFFF` 内容面。
- 成本：**L（若做真透视）**；若只借 opening pose、落稳后转成平纸，则为 **M**。

### 8.3 方向 3：推荐 / 系回日记本的纵向长纸

![方向 3](./direction-3-tethered-leaf.png)

**假设**：物件感不需要牺牲平直 UI；一张窄长白纸加封皮露边、折角与单条书签 tether，就足以让用户把它读成「日记页」而不是 modal。

- 回应约束：白纸前视、单列、两张脸与两本实体书均可见；静态形态有明确物件来源；没有 tabs/吉祥物/第二层玻璃。
- 优点：阅读、场景保留、物件仪式与工程风险最均衡；960px 与 640×400 可通过去装饰而不改信息架构。
- 牺牲：没有方向 2 那么拟真；需要一条视觉 tether，但 tether 只能是静态、低对比，不能变成常驻动画。
- 成本：**M**。
- 生图文字说明：第三条真实感文案在生成中不稳定，最终按 Brief 允许的降级处理为干净占位条；实际实现使用 DOM 中文，不存在该限制。

## 9. 评分表（按成功标准 1–7）

每项 0–10，等权；总分只用于方向判断，不代表像素级精确测量。

| 成功标准 | 方向 1 | 方向 2 | 方向 3 | 可见依据 |
|---|---:|---:|---:|---|
| 1. 纸 > 壳 > 压暗场景 | 10 | 9 | 9.5 | 三稿都通过采样；方向 2/3 的纸面有更明显纸纹/暖边，落地仍须纯白 token |
| 2. 两只角色均部分可见 | 7.5 | 10 | 10 | 方向 1 只露各自一部分；方向 2/3 两张脸与角色动作都清楚 |
| 3. 阅读效率不低于 v1 单列 | 9.5 | 8.5 | 9.5 | 方向 2 的曲面和透视有风险；方向 1/3 都是前视直列 |
| 4. 物件感强于弹窗 | 6.5 | 10 | 9 | 方向 1 依赖开场动效；方向 2 最强；方向 3 由页边/书签建立来源 |
| 5. Token / 风格同源 | 8.5 | 8 | 8.5 | 都按真实 token 提示生成；方向 2 的暖封皮需新增规范 token，不能从 PNG 吸色 |
| 6. 960 / 640×400 可退化 | 8.5 | 6.5 | 9 | 方向 2 真透视最难；方向 3 可逐级撤装饰并保持单列 |
| 7. 保留/改造/新增与成本可控 | 9.5 | 6.5 | 8.5 | 方向 1 最省；方向 3 只新增 origin + 静态页饰；方向 2 需更多几何/命中区工作 |
| **总分 / 70** | **60 ≈ 86/100** | **58.5 ≈ 84/100** | **64 ≈ 91/100** | **方向 3 胜出** |

### 9.1 像素层级抽样

以最终 1440×900 PNG 的小矩形平均 sRGB luma `Y′`（0–255）抽样；场景点避开台灯与许愿罐高光。

| 图 | 纸面 | 左 rail 壳 | 压暗场景 | 顺序 |
|---|---:|---:|---:|---|
| 方向 1 | 253.7 | 44.3 | 37.0 | 纸 > 壳 > 场景 |
| 方向 2 | 242.9 | 42.8 | 32.1 | 纸 > 壳 > 场景 |
| 方向 3 | 241.7 | 41.6 | 36.2 | 纸 > 壳 > 场景 |

复现采样区：方向 1 纸 `(700,150,40,40)`；方向 2 纸 `(790,150,40,40)`；方向 3 纸 `(650,120,40,40)`；三图壳 `(30,580,20,40)`；三图场景 `(300,160,40,40)`。

注意：生成稿的纸纹与边缘阴影会降低局部平均值；工程实现应由 `--glass-paper:#FFFFFF` 保证平整内容区，而不是从 PNG 取色。

## 10. 明确推荐与决策条件

### 推荐

**采用方向 3 的静态结构，借方向 2 的开场姿态，落稳后回到前视平纸。**

具体组合：

- 静态几何：方向 3。
- 220ms 起点与前 120ms 的「从桌上展开」感觉：方向 2。
- 内容密度、卡片、composer 与详情：方向 1/现有 v1 实现。
- 颜色与阴影：只从 `cinnaglass.css` 真实 token 取，不从三张 PNG 取样。

### 何时改选

- **若必须半天内落地**：选方向 1，先解决 blocker，再补物件 origin。
- **若“翻开一本真书”是营销主视觉且允许单独做 WebGL/CSS 透视原型**：可试方向 2，但必须先通过 960 与 640×400；失败就回方向 3。
- **默认生产路线**：方向 3，不需要额外决策。

## 11. 分期实现路线

### Phase 0：结构止血（S，约半天）

- 拆掉 Timeline 的 tabs 与 mascot。
- Timeline 不再挂 `.modal.tall`；照片墙/心愿单独立 route/surface。
- 保持所有 feed/composer/storage 逻辑不动。

**完成门槛**：1440×900 打开态两只角色都可辨；三物件分别只打开自己的功能。

### Phase 1：推荐稿静态落地（M，约 1–2 天）

- 新增 `DiarySurface`、页边/封皮露边/折角/书签 tether。
- scrim 的 dim 与 blur 拆 token。
- 落 1440 / 960 / 640×400 三断点。
- 收编 partner tone 与 deep accent 漂移。

**完成门槛**：三 mood 下纸恒白；无 nested glass；640×400 两侧仍能辨认两只角色。

### Phase 2：物件开合与可访问性（M，约 1 天）

- 热点/rail 回传 origin，统一 220ms 动画。
- Esc 栈、focus trap、关闭后 focus return。
- `prefers-reduced-motion` 路径。
- 键盘 Enter/Space 与触屏单击验收。

**完成门槛**：开合从正确物件出发；草稿在所有隐式关闭路径均不丢。

### Phase 3：回归与边界（M，约半天到 1 天）

- 空态、错误、长文、9 图、上传失败、断网、签名续签、detail/lightbox。
- Headless 截图 + 像素采样：golden/twilight/night × 1440/960/640×400。
- OS 125%/150% 与最低亮度夜档。

### Phase 4：Presence 增量（M–L，MVP 后）

- 先做一次性书桌微光。
- Presence payload 再做 reading/writing。
- 角色动作资产就绪后再接执笔/翻页；不要为了状态恢复持续 ticker。

## 12. 不确定性与可比性限制

- Target/idle 是 1908×1068 的真实运行截图；三张概念参考是 1586×992；交付稿是 1440×900。内容、视口与渲染保真度不同，不能把坐标或字重作逐像素 A/B。
- 三张稿由内置 ImageGen 基于真实场景合成；房间布局、角色、家具与壳位置被高保真保留，但它们不是浏览器 DOM 截图，不能证明 CSS 可直接实现。
- ImageGen 不能保证每个抗锯齿像素等于 CSS hex；因此 token 合规的最终证据必须是实现后 `<link>` 真实 `cinnaglass.css` 的 headless 截图，而不是从 mockup 吸色。
- 方向 3 的第三条文案因中文生成不稳定被主动改为空白占位；这是已知可见限制，不是产品设计意图。
- 本轮按用户要求只做策划与设计交付，未修改产品代码，也未在真实 960/640×400 浏览器运行态验证碰撞；报告给的是可执行规格，最终 hard acceptance 仍需真实组件截图。

## 13. ImageGen 提示词记录

三稿共同提示骨架：

- 用途：`ui-mockup`，可交付桌面产品界面，1440×900。
- Base：`before-idle.png` 是 edit target；必须保留夜雨书房、两只原创角色、rail、氛围 pill、纪念卡、侧把手、音乐条。
- 参考：概念图 04 管层级；概念图 01 管房间/角色；concept-c 管壳；现状 open 只提供内容证据，不复制大 modal/tabs。
- Token：`#FFFFFF / #22335A / #667087 / #59C5ED / #2F9AD3 / #FDD5E7`，圆角 18–24px，三层纸影。
- 共同禁止：mascot、tabs、中央脊线、zigzag、红点、nested glass、持续装饰、重画房间、logo、水印。

方向差异提示：

1. **方向 1**：单张居中前视白纸，约 700×770，房间两侧留角色；三条日记、一条带 16:10 图、底部 composer。
2. **方向 2**：纸页从真实桌上日记本位置向上展开，右下锚定；仅一列；露封皮与粉色书签；两张脸完整可见。
3. **方向 3**：560–590px 窄长前视白纸，略偏左；6–8px 封皮边、折角、单条书签 tether 回真实日记本；兼顾小窗。最终额外用一次 `precise-object-edit` 把不稳定的第三条中文改为干净空占位，其余结构不变。

## 14. Artifact Manifest

| Artifact | 绝对路径 | 尺寸 / 类型 | 状态 |
|---|---|---|---|
| 方向 1 · 居中白纸 | `D:\Repo\our-world\codex-visual\20260905-215344Z\direction-1-centered-paper.png` | 1440×900 PNG | Final |
| 方向 2 · 桌面展开 | `D:\Repo\our-world\codex-visual\20260905-215344Z\direction-2-desk-unfold.png` | 1440×900 PNG | Final |
| 方向 3 · 系回日记本的长纸 | `D:\Repo\our-world\codex-visual\20260905-215344Z\direction-3-tethered-leaf.png` | 1440×900 PNG | **Recommended** |
| 报告 | `D:\Repo\our-world\codex-visual\20260905-215344Z\codex-report.md` | Markdown | Final |

未覆盖或改写任何输入图。
