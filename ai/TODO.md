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

（无未修复 bug；发现即记录到此处）

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
   - [x] 唱片机（2026-09-05）：转盘透视真旋转（唱片外沿椭圆 + 圆心像素级量测 → 单应矩阵 → PerspectiveMesh，圆心/外沿旋转时都不漂）、唱臂与唱针从底图抠成静止贴片、宽幅高光拆成静态加色层、hover 转速 ×2.25 + 唱臂 3° 弹簧摆动；量测工具 `scripts/fit-disc-ellipse.py`
   - [ ] 许愿罐：星星 idle 漂浮、hover 更亮更快（分层资产：玻璃/5-8 颗星/丝带/光晕，codex 出件 + 差分校验）
   - [ ] P2 程序化件：台灯光晕呼吸、咖啡热气、窗帘微飘（MeshPlane 扰动）
- [ ] 白纸功能卡收敛：单卡居中、宽 ≤54-60%、场景压暗+blur 退后、不遮挡任一角色（概念图 04 规范）——SubScreen/弹窗族仍是旧样式
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
