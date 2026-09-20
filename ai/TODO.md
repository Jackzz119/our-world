# Our World TODO

## 北极星 & 开发顺序

产品 = **双人放置陪伴小屋**（PRD 见 `ai/PROJECT.md`，设计系统见 `ai/design_system/design-system.md`，重定位依据见 `ai/reboot/`）。

> 形态路线：**R0 验证周 → R1 网页 MVP（当前重点）→ R2 Electron 壳 → R3 桌宠模式 → R4 远期**
> MVP = 大耳狗风格双人房间（1 房间 × 4 时辰，当前 3 档）+ presence + 三大回忆组件挂物件 + ASMR 音景

---

## Epics & Milestones

- **E1 放置陪伴 MVP**（R0+R1）：两人真实用上「开着就行的小屋」；里程碑：媒介拍板 → 房间上线 → presence 通 → 三物件挂载完
- **E1-U UI / UX 定稿**（进行中）：以已认可导航为 A 基准，收敛 A 悬浮 UI / B 任务界面 / C 专属物件；本 session 不处理日记，动画最后做。计划见 `ai/features/ui-system/ui-system.md`
- **E2 桌面形态**（R2+R3）：Electron 壳与桌宠模式
- **E3 玩法扩展**（R4）：养成/小游戏/多房间（Brain Dump 孵化）

## Bugs

- [x] `--accent-deep` 双真源复核已消失（2026-09-11，`cinnaglass.css` 均为 `#2f9ad3`）
- [ ] **[BUG] UI 任务弹窗层级与焦点**：设置打开后导航/浮窗仍盖在遮罩上，隐藏弹窗仍可获焦；随 E1-U M2 处理。证据 `ai/features/ui-system/audit.md`
- [ ] **[BUG] UI 控件状态与真实行为不符**：迷你音乐播放/进度、设置密码/邮箱/应用锁存在占位或假成功语义；随 M3/M4 修正，超出 UI 的功能接通另拆任务
- [ ] **[BUG] 窄屏浮窗越界和重叠**：390px 下音乐条越界并被底导航遮挡，天气与纪念卡重叠；随 M3 停靠规则处理
- [ ] **[BUG] 设置里「保存新密码」是假成功**（审核第三步 PA-035 扩展：同组邮箱行是 localStorage 假值、应用锁无人执行、退出忽略 `signOut` 错误会卡死）：`settings.tsx` 的 `savePw` 只把本地状态置为「已更新」，从未调用 `supabase.auth.updateUser`，密码实际未改（2026-09-19 审核第二步确认）。修法：接 `updateUser({ password })`，失败显示错误、成功后清空输入；同段「绑定邮箱」「应用锁」同属占位，一并接通或收起
- [ ] **世界设置弹窗没有入口**（PA-037；纪念日为 null 时日历回退假日期）：`world-settings.tsx` 有真实的 DB 保存链（`updateWorld`），但 `screen='world-settings'` 在当前 UI 里无任何按钮可达（原 sidebar 入口随 Discord 壳层退役）。需产品决定入口位置（设置弹窗内的「我们的小世界」段 / 导航工具菜单），随 E1-U M4 落地
- [ ] **审核第三步发现（2026-09-19，诊断未修，详见 `ai/project-audit/FINDINGS.md` PA-034～053）**：
    - [x] **[BUG][安全] dev 凭据可进生产包**（2026-09-19 修，PA-042：env 读取改静态表并按 `import.meta.env.DEV` 门控，打包后实测 dist 无密码/邮箱值）：`VITE_DEV*` 未绑 `import.meta.env.DEV`，本机有 `.env.local` 时 `vite build` 内联密码（PA-042，一行修）
    - [x] **[BUG] 断网被误报「未登录」**（2026-09-19 修，PA-034：`currentUserId()` 改读本地会话 `getSession()`，刷新失败的网络错误显示「网络好像断了」；断网实测待做）：`currentUserId()` 走 `auth.getUser()` 网络往返且忽略 `error`，六个数据模块同根因（PA-034；即「回忆链路边界测试」第二条文案 bug）
    - [ ] **[BUG] 房间装载期四处**：HiDPI 下房间缩到左上角露底、装载期间 mood/天气变更被丢、任一贴图 404 整间房静默空白、装载中回大厅报 TypeError（PA-041）
    - [ ] **[BUG] 聊天呈现**：对方头顶气泡在我 4.5s 内回复时挂住不消失；rail 红点无视已读、关窗回亮（PA-038）
    - [ ] **[BUG] 聊天一致性**：断线期间对方的删除/撤 reaction 重连后补不回；编辑/删除/reaction/已读失败不回滚无提示；重试已落库消息永远卡 failed（PA-039）
    - [ ] **[BUG] 上传管线**：选图放行 gif/heic 到桶才拒、无 25MB 预检、部分成功后失败留 Storage 孤儿（PA-040；含「回忆链路边界测试」第一条文案 bug）
    - [ ] 昵称写回 `display_name`（PA-036，继承待办已有）· 世界设置入口（PA-037）· 账号设置假反馈（PA-035）
    - [ ] P2 待裁决：错误文案统一映射 `lib/user-error.ts`、签名续签共用 `useSignedUrls`、实时流收口 `useTopicStream`、异步 effect 取消、输入上限统一、Enter 闸门、ErrorBoundary、脚本断言与注释改名同步、auto 天气定位说明、solo 世界假伴侣（产品口径）
- [x] **[BUG] 聊天窄卡类型检查阻塞**（2026-09-19 修）：`chat-card.tsx` 改从 `chat-data` 导入 `Msg` 并读 `emoteUrl`；副作用：窄卡此前渲染不出贴纸（字段名错，运行时恒 undefined），现在会显示贴纸图片

---

## 🔨 Phase R0 — 形态验证周（不写代码壳，可与 R1 并行）

- [ ] Document Picture-in-Picture 置顶迷你窗实验：现有页面包一层 PiP 入口，验证「常驻可见」体感（1-2 天）
- [ ] Lively Wallpaper 贴网页实验：免费开源壁纸工具直接渲染现有 URL，验证「贴桌面」体感（半天）
- [ ] 两人各用一周 → 拍板主形态偏好：置顶小窗 / 贴桌面 / 普通窗口常开

## 🔨 Phase R1 — 网页 MVP（当前重点）

### UI / UX 体系定稿（本 session 优先）

> 阶段闸门见 `ai/features/ui-system/ui-system.md` §6，实景盘点见同目录 `audit.md`。导航是基准，B 厚磨砂是待确认建议，未宣称全站已批准或已迁移。

- [x] **M0 全项目审计与计划**（2026-09-11）：见 `ui-system.md` / `audit.md`
- [x] **设计技能与资料库重构**（2026-09-13）：UI Tailor 统一承接 UI/UX，常驻设计 Markdown 上线；登记见 `ai/PROJECT.md`「美术与 UI/UX 技能登记」
- [ ] **M1 静态标准板定稿**：导航 + 天气/聊天/音乐 + 设置同屏，定 A/B 材质厚度、文字/控件与纹理取样；三时辰/断点确认后再实施
- [ ] **M2 公共基础与弹层**：A/B 作用域、共享控件、统一层级/关闭/焦点/隐藏机制；导航视觉保持，日记依赖隔离
- [ ] **M3 A 场景悬浮 UI 迁移**：天气、聊天、音乐两态、纪念卡、头顶状态；真实播放状态、隐藏恢复、窄屏避让一起处理
- [ ] **M4 B 任务界面迁移**：设置先作样板，恢复世界设置入口，再统一日历/时钟/完整聊天/选择器/照片与心愿通用壳；收起旧社交导航，保留真实数据功能
- [ ] **M5 边缘页面与遗留清理**：登录/重置/大厅/加载错误同步；scene/rooms/image-slot 等有消费者的不误删；无消费者证明与存储兼容完成后清理
- [ ] **M6 UI 交互动画体系（后置）**：静态组件、状态和层级稳定后单独设计；本轮不新增动画或定曲线/时长

### 原画分层与环境光照

- [x] **建立 `art-relighting` skill**（2026-09-12，用户级 Codex 技能）：项目说明 `ai/design_system/research/art-relighting.md`；产品光照尚未改造
- [ ] **场景与 UI 共用光环境定稿**：天光/窗光/室内灯职责与独立控制，玻璃外壳如何响应，比较现有图层与 shader 的必要性
- [ ] **重光照资产样板与技能迭代**：用定稿素材验证共享材质、已知环境还原和新环境组合，再沉淀可复用做法；不把每个天气独立重画一套几何
- [ ] **动态阴影 skill（后续）**：材质/光层工作流稳定后单独设计投影与遮蔽接口，本轮不创建

### 场景与角色

- [x] 场景媒介与房间模板（2026-08-09/10）：静态底图 + 动效插槽多层合成，**PixiJS v8** 合成器 `room/compositor.ts` + `RoomTemplate`；技术事实见 `ai/PROJECT.md`「技术栈」，设计见 `ai/design_system/scene.md`
- [x] 首个房间资产（书房三档底图 + 双角色四张立绘 + 棋牌室/植物园缩略图）：位置见 `ai/design_system/design-system.md`「实际素材位置」
- [x] 角色动画第一版（双帧贴图 + 程序变形，零引擎）：参数见 `ai/design_system/character.md`；Rive/Spine 留给动作丰富化阶段
- [ ] 双角色动作扩展：看书翻页 / 写字 / 喝咖啡 / 趴睡循环（需评估 Rive 或逐帧资产；方向见 `character.md`）
- [ ] 角色状态机：presence 状态 → 动作映射 + 在线/离线切换（离线=空位留痕：留灯/杯子/围巾）
- [x] 时辰系统：mood 三档跟系统时间（`moodFromHour`）+ 900ms 交叉淡化 + 氛围 pill 手动 override
- [~] 天气层：晴/雨完成（窗外雨丝 + 玻璃水珠 + 云影光呼吸 + 实况 auto 档）；**雪待做**（`RoomWeather` 目前仅 sun/rain）

### Presence（陪伴核心）

- [ ] Supabase Realtime Presence 接入：打开应用 = 在场，对方角色实时醒来/睡去
- [ ] presence payload 带状态（reading/coffee/away），驱动对方角色动作
- [ ] （MVP 后）行为翻译：对方正在打字 → 角色执笔；翻相册 → 拿相框

### 功能挂载（复用 v1 组件）

- [x] 物件热点组件（2026-08-10 首版，2026-09-05 v5）：五件全挂（映射见 `room/study-room.ts`、`ai/design_system/props.md`）；提示 = 周期星星 + hover 问候星星 + 活物微动；**光环/描边/换图三条路全部否决并删除**
- [~] **活物件（living props）**：家具自己动，hover 只改参数不换图。研究 `ai/design_system/research/living-props.md`；当前实现、装配脚本与产物路径见 `ai/PROJECT.md`「技术栈」、`ai/design_system/props.md`
    - [x] 唱片机第一～五轮（2026-09-05～07）：透视真旋转 → 真分件 → 生成优先（用户定「部件必须由生成产出，不后抠、不手修」）→ 完全分离 + 固有色/光分层（用户铁律「**死物吃画里的光，活物吃场景的光；部件必须生成、互不包含**」）→ v5 按旋转对称性分解盘面、转轴针从原画切出（用户目标「原画级活物效果，1:1 不丢质感」）。各轮结论、闸门数值与教训见 `ai/design_system/research/living-props.md`
    - [ ] **唱片机遗留打磨**（2026-09-07 记）：② 唱臂固有色顶边残留浅高光（codex 两次未去掉）→ 法线光照上线后可盖过或再出更平一版；④ 阴影仅位置/浓度随光向变、形状仍是剪影模糊 → 随第二档做投影变换；⑤ 光层 PNG 每张 171–190KB、六张 ≈1.1MB → 上线前量化或 WebP
    - [ ] 第二档：法线贴图 2.5D 光照（唱臂法线图 + pixi 光照 filter，光源随 mood 移动、高光随臂身滑动、投影随光向拉伸）；之后再评估 3D 代理投影
    - [ ] 沉淀 `living-props` 运动 skill（用户定名 2026-09-06，2026-09-12 后置）：复用 `art-relighting` 材质/光层产物，负责定件分类、运动几何/规格、装配与逐帧检测；先用许愿罐做第二次执行再抽通用脚本，动态阴影另案
    - [ ] 许愿罐：星星 idle 漂浮、hover 更亮更快（分层资产：玻璃/5-8 颗星/丝带/光晕，走同一套生成优先装配管线）
    - [ ] P2 程序化件：台灯光晕呼吸、咖啡热气、窗帘微飘（MeshPlane 扰动）
- [ ] 日记专项遗留（本 session 不处理）：日记按用户定规「大幅严格居中，允许遮挡」，不再沿用旧角色避让规则；其他功能弹窗统一并入 E1-U M4
    - [x] 棕皮旧纸书本静态还原（2026-09-07）：`ai/design_system/uiux/cinnaglass/journal-room-object/book-implementation.md`
    - [x] 书页竖直翻动与连续翻阅（2026-09-07）：同目录 `turn-implementation.md`；「阅读时雨与场景不停播」已定
    - [ ] **书本实景确认**：静态美术与翻页等待用户实景审美/体验确认（工程检查通过 ≠ 逐像素复刻）
    - [ ] **书本后续动态**：从桌面拿起/收回、羽毛笔交互；Safari/低端设备、低带宽端点图片与真实花园验收
    - [x] B 苔绿双页日记（2026-09-06 批准实装，视觉后被用户否决，由棕皮旧纸取代）：`ai/design_system/uiux/research/cinnaglass-history/journal-book-directions/implementation.md`
    - [x] timeline v2「夜灯下的回忆」（2026-09-06 实装，已成历史视觉）：同上级目录 `timeline-night-glass/implementation.md`
- [x] 聊天气泡浮对方角色头顶（2026-08-10）：新消息 → 头顶气泡 4.5s，贴纸显示「发来一张贴纸」（`WorldPage.tsx`）
- [ ] 兜底提示重定：为触屏/键盘提供可发现入口；旧「全部热点亮轮廓」与已否决方案冲突，不再照旧实施（`ai/design_system/uiux/interaction.md` §5；活物专项另处理）

### 声音

- [ ] ASMR 音景系统：环境层（雨/壁炉）+ 音乐层（lofi）+ 反馈层，分层独立音量、**记住上次组合**、默认静音启动
- [ ] 水滴系 UI 音效包接入（`ai/design_system/uiux/interaction.md` §7：水滴=确认/涟漪=切换/湿 pop=点击，随动效时值对齐）

### UI 壳既有交付（历史记录；迁移看 E1-U）

- [x] 随光磨砂导航（2026-09-07，用户已认可，A 类基准）：`ai/features/navigation-glass.md`
- [x] concept-c 壳件（2026-08-10，`shell/*`）：氛围 pill、纪念卡、音乐迷你条（播放/进度仍占位 → M3）、聊天窄卡、presence 头顶胶囊（占位文案）、场景满屏 + 壳件悬浮

### 退役清理

- [x] 已删（2026-08-10/11）：metaspace.tsx（3D）、sidebar.tsx、hud.tsx、space.tsx、chat-dock.tsx、public/models、public/draco、`three` 主依赖
- [x] `@react-three/rapier` 依赖与 `vite.config.ts` optimizeDeps 残留已删（2026-09-19）
- [ ] 仍待清（并入 M4/M5）：channel-screen 服务器式布局、lobby 入口风格；`scene.tsx` **仍被登录/重置页使用**。已清（2026-09-19）：`rooms.ts` mock（loader 迁入 `lib/local-store.ts`）、零消费者死样式约 190 行
- [x] 死文件清理（2026-09-18/19 审核第一步）：`src/types/database.ts`、`timeline_3d_posts.html`、`public/mock/couple-feed.json`、旧 page-flip 翻页链（`journal-book.tsx`/补丁/依赖/`check-journal.mjs`）、退役 3D 源（`ai/blender/`、`arts/meshes/`）；清单见 `ai/project-audit/runs/2026-09-18-01/01-documents.md`
- [ ] 好友/DM UI 收起（数据层冻结保留）

## 📦 Phase R2 — Electron 壳

- [ ] Electron 打包：无边框置顶窗 + 系统托盘 + 开机自启（同一套 web 代码）
- [ ] 贴边小窗形态（Rusty's Retirement 式屏幕角/边停靠）
- [ ] 性能验收：静止时不持续渲染、失焦暂停、对标 Desktop Mate 低画质档 1-2% CPU
    - 已知隐患（2026-09-05）：pixi ticker 30fps 常渲染，静止也在烧；方案 = 按需渲染 / 自适应帧率（活物 30、仅秒针+呼吸 12-15、hover 60）；另测 backdrop-filter 面板叠 canvas 的合成开销

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

- [ ] **连 Supabase MCP 拉真实结构回填 `ai/features/supabase.md` 第一章**（表/列/RLS/触发器/RPC + `get_advisors`）→ 该文接管后端结构唯一真源，PROJECT.md 数据库章节缩为摘要 + 引用。**⚠️ 前置：`SUPABASE_ACCESS_TOKEN` 已失效**（2026-09-05 管理 API 401），重新生成或改 OAuth 后重启会话，步骤见该文档头
- [ ] **Supabase 审计遗留 migration**（要点见 PROJECT.md 数据库章节 + `supabase.md` 三/四章）：⚠️ worlds 外键 CASCADE→SET NULL（member 删号不该灭世界）+ 安全包（search_path/revoke/GraphQL/泄露密码保护）+ 性能包（RLS initplan×13 + FK 索引×4）
- [ ] 昵称编辑写回 `profiles.display_name`（个人设置仍本地缓冲；`src/lib/profiles.ts` 目前只读）
- [ ] TENOR_API_KEY 配置（免费申请 → Supabase Secrets，`emotes` Edge Function 贴纸搜图即活）
- [ ] member 测试数据清理（【测试数据】前缀 ×6，上线前删）
- [~] 回忆链路边界测试（2026-07-08 实测，2026-08-21 复核仍成立；2026-09-19 审核第三步再核，两条文案 bug 根因见 PA-034 / PA-040）：非图片 mime 被过滤 ✓、超 25MB 上传失败且草稿保留 ✓、断网失败且草稿保留 ✓、签名过期由 40 分钟续签覆盖 ✓。**剩两处文案 bug 待修**（2026-09-18 核对源码仍未修）：
    - 超限上传把 Storage 英文原文直接抛给用户（`The object exceeded the maximum allowed size`）→ 应映射中文
    - ~~断网时 `createPost` 里 `auth.getUser()` 先失败，被误报成「未登录，无法发帖」~~ 2026-09-19 已修（PA-034），断网实测待做
    - 未覆盖：无世界账号的 error 态（需 Dashboard 建测试号）、双人视角 shared 帖复验
- [ ] 聊天双端联调残项：互删粒子/reaction 同步/断网重试/贴纸互发（原 v1 CH-23/DM-8/EMO 验收；`pnpm dev2` 双账号）；验收清单追加 PA-038/039 四条（气泡到点消失、红点不回弹、断线删除补回、失败回滚）

---

## ✅ 已完成

- **v1 全部成果**（2026-06~08，Discord-like 时代）：Supabase 后端 + auth + timeline/照片墙/聊天真后端 + 世界属性 + cinnaglass UI；服役部分见 `ai/PROJECT.md`「已有功能资产」
- **配色光照递进定稿 + UI Design System 建册**（2026-08-07/08，D-9~D-12）：历史决策 `ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md`，全局外观规则已被后续裁决覆盖
- **产品重定位启动包**（2026-08-09）：`ai/reboot/` 四文档，用户拍板转向放置陪伴
- **文档体系 v2 重构**（2026-08-09）：三件套 PROJECT/TODO/STYLE 上线；STYLE 现已降为兼容入口，设计正文在 `ai/design_system/`
- **Features 体系恢复**（2026-08-22）：`7c93c3c` 误删 `ai/features/`（违背 tech-plan §119），已原文恢复 timeline/chat/supabase 三份并加状态头
