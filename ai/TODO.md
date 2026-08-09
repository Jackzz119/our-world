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

- [ ] **🔶 场景媒介拍板（阻塞场景资产，需专门讨论）**：候选按噪点从低到高 ①纯静态图 ②静态图+微动效层（光斑/蒸汽/雨） ③3渲2 分层（Blender base+光照层合成） ④Live2D 式摇晃——噪点原则与候选分析见 `ai/STYLE.md` §3、`ai/reboot/tech-plan.md` §2
- [ ] 房间模板系统设计：背景图×4 时辰 + 双座位锚点 + 热点位 + 窗户天气区 + 音景预设的数据结构与渲染组件（可量产架构，先设计后填资产）
- [ ] 首个房间资产制作（书房，概念图 01/02 构图）——依赖媒介拍板；时辰色温按 mood 体系重校（概念图「清晨」偏黄昏，STYLE §1 修正项）
- [ ] 角色动画样板实测：Rive vs sprite 二选一（做一只角色的「翻书 loop + 眨眼」贴进背景，测帧率/功耗/工作流）——依据 `ai/reboot/tech-plan.md` §2
- [ ] 双角色动画集：idle 呼吸眨眼 / 看书 / 写字 / 喝咖啡 / 趴睡（优先级顺序见 STYLE §6；倒咖啡后置）
- [ ] 角色状态机：presence 状态 → 动作映射 + 在线/离线切换（离线=空位留痕：留灯/杯子/围巾）
- [ ] 时辰系统：系统时间 → mood 四档自动切换 + 600-900ms 交叉淡化（UI 侧复用光照递进 token）
- [ ] 天气层：晴/雨/雪 手动切换（窗外层+屏幕粒子，尊重 prefers-reduced-motion）

### Presence（陪伴核心）

- [ ] Supabase Realtime Presence 接入：打开应用 = 在场，对方角色实时醒来/睡去
- [ ] presence payload 带状态（reading/coffee/away），驱动对方角色动作
- [ ] （MVP 后）行为翻译：对方正在打字 → 角色执笔；翻相册 → 拿相框

### 功能挂载（复用 v1 组件）

- [ ] 物件热点组件：白色细环微光、默认静止、hover/键盘焦点呼吸（不许全场闪烁）
- [ ] 三件挂载：书桌→timeline、相框墙→照片墙、转盘电话→聊天
- [ ] 白纸功能卡收敛：单卡居中、宽 ≤54-60%、场景压暗+blur 退后、不遮挡任一角色（概念图 04 规范）
- [ ] 聊天气泡浮对方角色头顶（新消息预览，点开进聊天大窗）
- [ ] 次要物件挂载：挂钟→时钟闹钟、挂历→日历纪念日、许愿罐→心愿单、唱片机→音乐（UI 已有，逐个挂）

### 声音

- [ ] ASMR 音景系统：环境层（雨/壁炉）+ 音乐层（lofi）+ 反馈层，分层独立音量、**记住上次组合**、默认静音启动

### UI 壳

- [ ] 极窄玻璃 rail（home/日历/心愿/设置），明度随 mood 递进
- [ ] 路由与 WorldPage 重组：新场景层替换旧场景部分

### 退役清理（新场景层站稳后执行）

- [ ] 删除 Discord 壳层：sidebar.tsx / hud.tsx（Toolbox）/ space.tsx / channel-screen.tsx / scene.tsx（旧 SVG 房间）/ metaspace.tsx / 大厅 LobbyScene / chat-dock（被头顶气泡替代）
- [ ] `channels` UI 语义收缩（表保留当消息管道；无频道列表 UI）
- [ ] 好友/DM UI 收起（数据层冻结保留）
- [ ] 死代码与死样式清扫（tsc/eslint/build 绿 + 视觉回归）

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

- [ ] **Supabase 审计遗留 migration**（要点已收录 PROJECT.md 数据库章节）：⚠️ worlds 外键 CASCADE→SET NULL（member 删号不该灭世界）+ 安全加固包（search_path/revoke/GraphQL/泄露密码保护）+ 性能包（RLS initplan×13 + FK 索引×4）
- [ ] 昵称编辑写回 `profiles.display_name`（个人设置目前仍本地缓冲）
- [ ] TENOR_API_KEY 配置（免费申请 → Supabase Secrets，贴纸搜图 tab 即活）
- [ ] member 测试数据清理（【测试数据】前缀 ×6，上线前删）
- [ ] 回忆链路边界测试：上传失败 / 签名 URL 过期 / 断网重试
- [ ] 聊天双端联调残项：互删粒子/reaction 同步/断网重试/贴纸互发（原 CH-23/DM-8/EMO 验收）

---

## ✅ 已完成

- **v1 全部成果**（2026-06~08，Discord-like 时代）：Supabase 后端全套 + auth 地基 + timeline/照片墙/聊天全链路真后端 + 世界属性入库 + cinnaglass UI 体系——保留服役部分的技术事实见 `ai/PROJECT.md`「已有功能资产」
- **配色光照递进定稿 + UI Design System 建册**（2026-08-07/08，决策 D-9~D-12）：真源 `ai/design_system/cinnaglass/ui-system.html`
- **产品重定位启动包**（2026-08-09）：四路调研 + 六张概念图 + `ai/reboot/` 四文档，用户拍板转向放置陪伴
- **文档体系 v2 重构**（2026-08-09）：旧 TODO/PRD/Features 清理，新三件套（PROJECT/TODO/STYLE）上线
