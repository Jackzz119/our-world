# Our World TODO

## 北极星 & 开发顺序

产品 = **双人放置陪伴小屋**（PRD 见 `ai/PROJECT.md`，风格基准见 `ai/STYLE.md`，重定位依据见 `ai/reboot/`）。

> 形态路线：**R0 验证周 → R1 网页 MVP（当前重点）→ R2 Electron 壳 → R3 桌宠模式 → R4 远期**
> MVP = 大耳狗风格双人房间（1 房间 × 4 时辰）+ presence + 三大回忆组件挂物件 + ASMR 音景

---

## Epics & Milestones

- **E1 放置陪伴 MVP**（R0+R1）：两人真实用上「开着就行的小屋」— 目标里程碑：场景媒介拍板 → 技术样板 → 房间上线 → presence 通 → 三物件挂载完
- **E2 桌面形态**（R2+R3）：Electron 壳与桌宠模式
- **E3 玩法扩展**（R4）：养成/小游戏/多房间（Brain Dump 孵化）

## Bugs

- [ ] **`--accent-deep` 双真源**（2026-09-05 Codex 比稿发现、Claude 核实）：`cinnaglass.css` 根值 `#268fbe`，而 `--accent-orb` 尾色与 `screens.tsx` guest tone 用 D-9 定稿的 `#2f9ad3`——二选一后同步 `ui-system.html`

---

## 🔨 Phase R0 — 形态验证周（不写代码壳，可与 R1 并行）

- [ ] Document Picture-in-Picture 置顶迷你窗实验：现有页面包一层 PiP 入口，验证「常驻可见」体感（1-2 天）
- [ ] Lively Wallpaper 贴网页实验：免费开源壁纸工具直接渲染现有 URL，验证「贴桌面」体感（半天）
- [ ] 两人各用一周 → 拍板主形态偏好：置顶小窗 / 贴桌面 / 普通窗口常开

## 🔨 Phase R1 — 网页 MVP（当前重点）

### 场景与角色

- [x] **场景媒介拍板**（2026-08-09 用户定）：多层合成——静态底图 + 动效插槽层；渲染器 2026-08-10 定 **PixiJS v8**（统一光照管线，光吃到角色和指针）
- [x] 房间模板系统（2026-08-10）：`RoomTemplate`（底图×mood + 座位锚点 headRatio + 热点 rect + 窗格 + 钟面）+ pixi 合成器 `room/pixi-scene.ts`——雨 mask 到玻璃格、时钟真实走时带投影、光照配方表（mood×weather）、角色呼吸/摇摆/眨眼 + mood tint + 接触阴影
- [x] 首个房间资产（书房）：codex 出空房间底图 golden/twilight/night 三档（无 rail 无光环、钟面留空）+ 双角色透明立绘睁闭眼四张 + 棋牌室/植物园缩略概念图
- [x] 角色动画第一版：双帧贴图 + 程序复合变形（呼吸 scaleY/摇摆 rotate/随机眨眼含 15% 双连眨）——「live2d 感」零引擎达成；Rive/Spine 留给动作丰富化阶段
- [ ] 双角色动作扩展：看书翻页 / 写字 / 喝咖啡 / 趴睡循环（需 Rive 或逐帧资产，见 STYLE §6 优先级）
- [ ] 角色状态机：presence 状态 → 动作映射 + 在线/离线切换（离线=空位留痕：留灯/杯子/围巾）
- [x] 时辰系统：mood 三档跟系统时间（moodFromHour）+ 900ms 交叉淡化 + HUD/氛围 pill 手动 override
- [~] 天气层：晴/雨完成（窗外雨丝视差 + 玻璃水珠凝结滑落 + 云影光呼吸 + 实况天气 auto 档）；**雪待做**

### Presence（陪伴核心）

- [ ] Supabase Realtime Presence 接入：打开应用 = 在场，对方角色实时醒来/睡去
- [ ] presence payload 带状态（reading/coffee/away），驱动对方角色动作
- [ ] （MVP 后）行为翻译：对方正在打字 → 角色执笔；翻相册 → 拿相框

### 功能挂载（复用 v1 组件）

- [x] 物件热点组件（2026-08-10 首版，2026-09-05 定稿 v5）：点击开功能——五件全挂：日记本→timeline、相框→照片墙、挂钟→时钟、唱片机→音乐、许愿罐→心愿单；可点提示 = 周期星星 + hover 问候星星 + 物件自身动起来（活物件），**光环/描边/换图三条路全部否决并删除**（白环→多边形描边→烘焙光晕，用户逐轮否决）
- [~] **活物件（living props）**：让家具自己动，hover 只改参数不换图（研究与方案 `ai/design_system/research/living-props.md`）
    - [x] 唱片机（2026-09-05，两轮）：转盘透视真旋转（唱片外沿椭圆 + 圆心像素级量测 → 单应矩阵 → PerspectiveMesh，圆心/外沿旋转时都不漂）、宽幅高光拆成静态加色层、hover 转速 ×2.25 + 唱臂 3° 弹簧摆动。第二轮走**真分件**：`scripts/build-turntable-parts.py` 按**形状手描剪影**（暗部拉伸 6× 视图上描，颜色阈值分不开黑臂与黑胶）抠出唱臂零件（`public/rooms/study/parts/`，带合成软阴影），并生成 clean plate 当新底图：盘内连唱臂投影一起按「每半径多角度中值」重建（旋转对称，不复制划痕），盒边只擦离转轴 >30px 会动的部分（唱头），转轴柱与臂根不动保留原画。闸门：零件叠回 vs 原图在臂身上 mean 0.2–0.5/255、重建区外 0。原画移入 `arts/rooms/study/source/` 作量测真源。教训：codex AI 局部重绘不合格（残影/接缝）；「多边形∪暗色像素」的颜色抠法把投影和盘边一起抠进零件，摆动即穿帮——抠件必须按形状。量测工具 `scripts/fit-disc-ellipse.py`
    - [x] **第三轮：生成优先 + 光影分层**（2026-09-06，用户定调「部件必须由生成产出，不后抠、不手修」）：codex 以 3× 放大的唱片机裁图为参考，生成「无臂 plate」和「绿幕独立唱臂」两图层（各档最多两次尝试）；`scripts/build-turntable-parts.py` 重写为装配器——绿幕键出软 alpha + 去绿溢色、alpha 加权亮度配准（偏移 0.3px）、生成 plate 只在唱臂脚印+投影范围（22px）羽化贴回原画并在环带上做颜色仿射匹配（接缝环差 0.5–0.9/255，脚印外零差）、**单一 donor（twilight）几何 + 逐档颜色匹配**保证时辰切换不变形。运行时：唱臂状态量 `lift`（弹簧）驱动抬针 3.5px + 外倾 1.7° + **参数化投影**（由零件 alpha 运行时烘出，按 mood 光向 `armShadow` 偏移，抬起时滑开 1.6×/1.8×、淡 40%），mood 淡化走 holder、lift 走 sprite，两条 alpha 不打架。教训：gpt-image 局部编辑不锁像素，plate 只能当「捐体」贴脚印；生成部件几何按一档统一再配色
    - [x] **第四轮：完全分离 + 固有色/光分层**（2026-09-07，用户定铁律「死物吃画里的光，活物吃场景的光；部件必须生成、互不包含」）：codex 生成三类图层——机器（无唱片无唱臂、空盘槽 + 转轴针，×3 时辰，静物保留画中光）、唱片俯视正圆**平光固有色**（v2 带月亮/笔触印花，否则转起来看不见）、唱臂平光固有色、转轴针平光零件。装配器 v4：机器 donor 只贴回「盘位 + 唱臂脚印」羽化区（脚印外零差、接缝环差 0.8–1.0/255）；唱片固有色归一成内接单位圆（256²），光由引擎给：逐档 `platterTint`/`armTint`（相对金色的光比）+ 静态光层 `platter-light-add/mul-<mood>`（原画在盘空间的角向高光：亮的走 add、暗的走 multiply，排除原画唱臂区，**永不随盘转**）；唱臂固有色以金色档校准。运行时：转盘=固有色网格×tint，光层=静止网格，唱针站在唱片孔上，抬针改为绕转轴柱的垂直剪切（柱不动、唱头抬 ~4px）。教训：光层里不能带原画的径向纹路（与生成唱片的标签半径不一致会叠出双边发糊）；贴图尺寸贴近显示尺寸再开 mipmap
    - [ ] 第二档：法线贴图 2.5D 光照（唱臂法线图 + pixi 光照 filter，光源随 mood 移动，高光随臂身滑动；投影形状随光向拉伸）；之后再评估是否需要 3D 代理投影
    - [ ] 许愿罐：星星 idle 漂浮、hover 更亮更快（分层资产：玻璃/5-8 颗星/丝带/光晕，走同一套生成优先装配管线）
    - [ ] P2 程序化件：台灯光晕呼吸、咖啡热气、窗帘微飘（MeshPlane 扰动）
- [ ] 物件功能卡收敛：房间与双角色保持可辨，统一跨场景材质；夜灯玻璃已实装，但用户反馈视觉还原与全系统一致性仍需重设计
    - [x] **B 苔绿双页日记与共用 UI 材质实装**（2026-09-06 用户批准）：软封双页、测量分页、连续翻页与拖页角、羽毛笔写作、短透明导航及照片/心愿/日历/设置共用暖灰纸已接入；四尺寸、三时辰、长文九图保序、草稿与详情、动画静止检查通过。真实花园尚未开放，跨场景验收与双账号发布未覆盖；未部署。详见 `ai/design_system/cinnaglass/journal-book-directions/implementation.md`
    - [x] **timeline v2「夜灯下的回忆」实装与浏览器回归**（2026-09-06）：日记/详情/写日记已应用烟茶玻璃、独立头像与柔圆框、局部细反光；阅读态调整房间取景。三断点/三时辰、图文草稿、详情与取消操作验证通过，未发布测试帖。Vite 打包通过；完整类型构建仍受已有聊天 Msg 导入错误阻断。验证与未覆盖项见 `ai/design_system/cinnaglass/timeline-night-glass/implementation.md`
- [x] 聊天气泡浮对方角色头顶（2026-08-10）：对方新消息 → 头顶白气泡 4.5s（wobble 入场），贴纸显示「发来一张贴纸」
- [ ] 兜底提示：长按/双击场景空白 → 全部热点亮轮廓 2s（UX §5，触屏后备）

### 声音

- [ ] ASMR 音景系统：环境层（雨/壁炉）+ 音乐层（lofi）+ 反馈层，分层独立音量、**记住上次组合**、默认静音启动
- [ ] 水滴系 UI 音效包接入（UX §7：水滴=确认/涟漪=切换/湿 pop=点击，随动效时值对齐）

### UI 壳（concept-c，2026-08-10 全量落地 + codex 审核 4H/4M/2L 修至只剩零星 L）

- [x] **窄 rail**（`shell/rail.tsx`）：6 钮双分组 + 未读粉点 + 房间缩略 popover（书房/棋牌室🔒/植物园🔒 + 回大厅）+ 模块开关 popover（固定布局，拖拽编辑退役）
- [x] **顶部氛围 pill**（`shell/ambience.tsx`）：灯光三档+天气三档（实况/晴/雨），当前项暖金高亮
- [x] **纪念卡 + 音乐迷你条**（`shell/floaters.tsx`）：🎂+432 大数字层级；264px mini player（封面/曲名/主控，折叠不断乐）
- [x] **聊天窄卡**（`shell/chat-card.tsx`）：消息+快捷表情行+输入行，半实底气泡；Enter 唤出；展开进聊天大窗
- [x] **presence 头顶胶囊**：headRatio 锚定角色头顶（占位文案「在你身边」，真 Realtime Presence 待接）
- [x] **统一石墨玻璃配方**：渐变底+内高光+亮描边，S/M/L 三档壳体尺度
- [x] WorldPage 重组：场景满屏、壳件全部悬浮层

### 退役清理

- [x] 已删（2026-08-10/11）：metaspace.tsx（3D）、sidebar.tsx、hud.tsx、space.tsx、chat-dock.tsx、public/models、public/draco、three 全家依赖
- [ ] 仍待清：channel-screen 的服务器式布局简化、lobby 场景翻新、scene.tsx（旧 SVG 房间，lobby 还在用则保留）、rooms.ts mock 残留、死样式清扫
- [ ] 死文件清理（2026-08-21 扫出）：`src/types/database.ts`（只声明项目里不存在的 `todos` 表，全库零引用）、根目录 `timeline_3d_posts.html`（4 月 3D 场景时代遗留的独立实验页）
- [ ] 好友/DM UI 收起（数据层冻结保留）

## 📦 Phase R2 — Electron 壳

- [ ] Electron 打包：无边框置顶窗 + 系统托盘 + 开机自启（同一套 web 代码）
- [ ] 贴边小窗形态（Rusty's Retirement 式屏幕角/边停靠）
- [ ] 性能验收：静止时不持续渲染、失焦暂停、对标 Desktop Mate 低画质档 1-2% CPU
    - 已知隐患（2026-09-05 记）：pixi ticker 固定 30fps 常渲染，静止画面也在烧；方案 = 按需渲染 / 自适应帧率（有活物件在动 30，只剩秒针+呼吸时降到 12-15，hover 期间可临时 60）；另测 5-6 块 backdrop-filter 玻璃面板叠在 30fps canvas 上的合成开销

## 📦 Phase R3 — 桌宠模式

- [ ] 全屏透明层 + `setIgnoreMouseEvents(forward:true)` 点击穿透（角色可点、空白穿透）
- [ ] 桌宠小窗构图：两张脸近景 + ≤2 热点 + 1 气泡（概念图 03，独立构图不缩放主界面）
- [ ] 已知坑回归清单：透明窗不可 resize / DevTools 变不透明 / 数位板驱动干扰 / 升级 Electron 必测穿透

## 🌱 Phase R4 — 远期（孵化中，细节见 PROJECT.md Brain Dump）

- [ ] 养成系统（重叠在线时段养植物 → 落 timeline）
- [ ] 益智小游戏、更多房间模板量产、小纸条、重逢时刻、异地时差窗景、离线生长
- [ ] 公开发行评估（Steam / 壁纸输出口）

---

## 🧾 继承待办（v1 遗留，与新方向无关但仍要做）

- [ ] **连 Supabase MCP 拉真实表结构回填 `ai/Features/supabase.md`**：拉表/列/RLS/触发器/RPC 实况 + `get_advisors` 刷新审计 → 回填该文第一章 → 它接管后端结构唯一真源，PROJECT.md 数据库章节缩为摘要 + 引用。**⚠️ 前置：先修 Supabase 令牌**——2026-09-05 确认 `SUPABASE_ACCESS_TOKEN` 已失效（管理 API 直测 401），重新生成或改 OAuth 后重启会话（详见该文档头执行尝试记录）
- [ ] **Supabase 审计遗留 migration**（要点已收录 PROJECT.md 数据库章节 + `ai/Features/supabase.md` 三/四章）：⚠️ worlds 外键 CASCADE→SET NULL（member 删号不该灭世界）+ 安全加固包（search_path/revoke/GraphQL/泄露密码保护）+ 性能包（RLS initplan×13 + FK 索引×4）
- [ ] 昵称编辑写回 `profiles.display_name`（个人设置目前仍本地缓冲）
- [ ] TENOR_API_KEY 配置（免费申请 → Supabase Secrets，贴纸搜图 tab 即活）
- [ ] member 测试数据清理（【测试数据】前缀 ×6，上线前删）
- [~] 回忆链路边界测试（2026-07-08 浏览器实测一轮，结论 2026-08-21 复核仍成立）：非图片 mime 被选择器过滤 ✓、超 25MB 上传失败且草稿保留 ✓、断网失败且草稿保留 ✓、签名过期由 40 分钟续签覆盖 ✓。**剩两处文案 bug 待修**：
    - 超限上传把 Storage 英文原文直接抛给用户（`The object exceeded the maximum allowed size`）→ 应映射中文
    - 断网时 `createPost` 里 `auth.getUser()` 先失败，被误报成「未登录，无法发帖」→ 应区分网络错误（TypeError）提示「网络好像断了」
    - 未覆盖：无世界账号的 error 态（注册已关，需 Dashboard 建测试号）、双人视角 shared 帖复验（需对方账号登录）
- [ ] 聊天双端联调残项：互删粒子/reaction 同步/断网重试/贴纸互发（原 CH-23/DM-8/EMO 验收）

---

## ✅ 已完成

- **v1 全部成果**（2026-06~08，Discord-like 时代）：Supabase 后端全套 + auth 地基 + timeline/照片墙/聊天全链路真后端 + 世界属性入库 + cinnaglass UI 体系——保留服役部分的技术事实见 `ai/PROJECT.md`「已有功能资产」
- **配色光照递进定稿 + UI Design System 建册**（2026-08-07/08，决策 D-9~D-12）：真源 `ai/design_system/cinnaglass/ui-system.html`
- **产品重定位启动包**（2026-08-09）：四路调研 + 六张概念图 + `ai/reboot/` 四文档，用户拍板转向放置陪伴
- **文档体系 v2 重构**（2026-08-09）：旧 TODO/PRD 清理，新三件套（PROJECT/TODO/STYLE）上线
- **Features 体系恢复**（2026-08-22）：`7c93c3c` 曾把 `ai/Features/` 一刀全删（与 tech-plan §119「保留 timeline/chat/supabase」相悖），现原文恢复该三份并加状态头；CLAUDE/AGENTS 规则维持不变，功能细节仍以 Features 为载体
