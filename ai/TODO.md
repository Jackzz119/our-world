# Our World TODO

## 北极星 & 开发顺序

产品 = **管理亲密关系记忆的陪伴空间**（完整定位见 `ai/PROJECT.md`）。
按四层优先级、由内向外做，**auth 是地基（待做，仅为我们两个人的隐私与权限）**：

> ① 回忆存储（核心，进行中）→ ② Metaspace 体验（聊天 / 音乐 / 语音）→ ③ 关系小工具（心愿单 / 日历 / 在一起天数）→ ④ 3D 场景互动（最后）

---

## ✅ 已完成（仅以下为真实完成项）

- **Supabase 后端**：`allowed_emails / profiles / couples / posts / post_unlocks` + RLS + triggers + `get_feed_posts()` RPC（早期已建）
- **cinnaglass 第一版 MVP UI**（玻璃拟态 + 大耳狗）整套复刻：等距房间场景、悬浮 HUD、SubScreen 四 tab、日历 / 时钟 / 设置 / 侧边栏 / 空间切换 / 音乐 / 聊天 —— 详见 `ai/Features/handoff-claude-design.md`（代码在磁盘、**未提交、未人工可视化验收**）
- [ ] 人工 `pnpm dev` 可视化验收（对照 `ai/design_handoff_our_world/screenshots/`）

---

## 🔨 进行中 —— 地基（auth）+ ① 回忆存储接后端

> auth 定位最小化：**只为我们两个人的隐私与权限**，不做多用户注册体系。
> ① 回忆存储的完整链路设计 + subtask 进度见 `ai/Features/timeline.md`。

- [~] **auth 地基**：登录页 + 路由守卫 + dev 跳过 已就绪（代码 + build 绿，待真机实测）；**收口待做**：白名单拦截 + 登出
- [x] Supabase 基建确认（当前项目 `xrscspcqnsxvfshskfpy`：5 表 + `get_feed_posts` RPC 均在）
- [x] posts API 数据层（`getFeedPosts` / `createPost`）—— timeline.md ST-1/C
- [x] **模型 couple → room（owner/member）+ 单人可发帖**：DB 全量改名迁移、去「未配对」态 —— timeline.md ST-A~F
- [x] timeline 真 post 渲染（读链路展示）—— timeline.md ST-3
- [x] image-slot 暴露 dataURL + 发帖写链路（上传 Storage + createPost）—— timeline.md ST-4/5
- [x] 照片墙接真实 post —— timeline.md ST-6
- [x] 建房改主动式：feed 只查房、无房即 error；`getMyRoom` + `createRoom` —— room.md R-2（= timeline.md ST-G）
- [ ] 端到端联调 + 边界（回忆链路，本机无法 dev，另机验证）—— timeline.md ST-7

**② 房间入口（大厅）—— 见 `ai/Features/room.md`**

- [x] WorldPage 房间状态提升（接真实 `getMyRoom`）+ `VITE_AUTO_ENTER` 自动进入开关 —— room.md R-3
- [x] LobbyScene 静态版：漂浮岛 + 传送门 + 「创建房间」卡片 —— room.md R-4
- [x] 场景二选一（RoomScene/LobbyScene）+ 进入/创建流程闭环（默认落大厅，点传送门进房）—— room.md R-5
- [ ] 大厅联调 + 边界（真机 `pnpm dev` 验证）—— room.md R-8
- [ ] （future）邀请 member 加入（status pending→active）—— room.md R-6
- [ ] （future）realtime 房主删房 → 踢出所有 member —— room.md R-7
- [ ] （later）视频存储

---

## 📋 待办（按优先级路线）

### ② Metaspace 体验（Discord-like 交互空间）

- [ ] **贯穿式侧边栏**（rail 房间 icon 竖栏 + 上下文 panel + SaaS 式收缩；大厅无频道、房内有频道）—— 见 `ai/Features/sidebar.md`，待定问题对齐后拆 subtask
- [ ] **频道概念 feature 文档（待建 `channel.md`）**：房间内的子空间（文字/语音/场景区域），大厅状态不出现
- [ ] **文字聊天**：UI 已复刻，接 Supabase Realtime broadcast + `messages` 表持久化
- [ ] **共同播放音乐**：UI 已复刻（生成式 WebAudio pad），接共享播放状态（谁在放 / 进度同步）
- [ ] **语音**

### ③ 关系小工具

- [ ] 心愿单接后端（UI 已复刻）
- [ ] 日历·约会 + 时钟·闹钟接后端（UI 已复刻）
- [ ] 在一起天数（呈现方式待定，见 `PROJECT.md` Brain Dump）

### ④ 3D 场景互动（最后，具体方案后续提供）

- [ ] placeholder 单间 → 多房间
- [ ] R3F 接入（场景参考 `ai/blender/scene.md`；二次元角色方案后续提供）
- [ ] 场景中触发 / 展示具体回忆相关图片
- [ ] 交互小游戏、种植物、养宠物