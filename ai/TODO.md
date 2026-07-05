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

> **🎯 当前最高优先级（2026-07-04 用户定调）：世界框架真实数据化闭环。**
> 代码链路已就绪（worlds/posts/Storage 读写全部接真实 Supabase），缺的是让它在真机上真正跑起来：
> ① auth 收口（真实登录 + 白名单拦截）→ ② 真机端到端验收（timeline ST-7 / room R-8 / channel C-6：登录→建世界→进世界→发帖传图→读 feed）→ ③ 世界属性入库（世界名/昵称/纪念日现在只在 localStorage，方案见 `supabase.md` 讨论点 2）。
>
> auth 定位最小化：**只为我们两个人的隐私与权限**，不做多用户注册体系。
> ① 回忆存储的完整链路设计 + subtask 进度见 `ai/Features/timeline.md`。

- [~] **auth 地基**：登录页 + 路由守卫 已就绪；**dev 开关改为自动真登录**（2026-07-04：`VITE_DEV` + `VITE_DEV_EMAIL/PASSWORD` 真实 signInWithPassword，废弃"跳过登录"——无会话则后端全不可达）；**收口待做**：白名单拦截 + 登出
- [x] Supabase 基建确认（当前项目 `xrscspcqnsxvfshskfpy`：5 表 + `get_feed_posts` RPC 均在）
- [x] posts API 数据层（`getFeedPosts` / `createPost`）—— timeline.md ST-1/C
- [x] **模型 couple → room（owner/member）+ 单人可发帖**：DB 全量改名迁移、去「未配对」态 —— timeline.md ST-A~F
- [x] timeline 真 post 渲染（读链路展示）—— timeline.md ST-3
- [x] image-slot 暴露 dataURL + 发帖写链路（上传 Storage + createPost）—— timeline.md ST-4/5
- [x] 照片墙接真实 post —— timeline.md ST-6
- [x] 建房改主动式：feed 只查房、无房即 error；`getMyRoom` + `createRoom` —— room.md R-2（= timeline.md ST-G）
- [ ] 端到端联调 + 边界（回忆链路）—— timeline.md ST-7：读链路已真机验证（2026-07-04，Chrome 扩展直连 dev，"另机验证"限制解除），**写链路（发帖+传图）与边界待测**；feed 懒加载已修（ST-I）
- [ ] （杂项）`src/components/ui/{badge,button}.tsx` 违反 react-refresh/only-export-components（shadcn 模板遗留，eslint 全量扫描报错，不影响 build）
- [ ] **Supabase 结构审计跟进**：安全加固（函数 search_path / handle_new_user RPC 暴露 / GraphQL 可发现性 / 泄露密码保护）+ 性能（RLS initplan、4 个 FK 索引）+ 白名单强制执行方案 + 世界名/昵称入库 —— 发现与候选方案见 `ai/Features/supabase.md`，**待专门讨论后执行**

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

- [x] **世界结构定型 + `channel.md` 文档**（2026-07-04）：世界 > 房间（场景+语音，语音频道的扩展）/ 文字频道 / 语音频道；UI 术语 + sidebar 房间列表 + **DB/代码全量迁移 `rooms→worlds`** 已落地（channel.md C-1~C-3，顺手修复 post_unlocks 触发器引用旧 couples 表的潜伏 bug）；`channels` 表为 future（C-7）
- [x] **贯穿式侧边栏**（rail：logo=私信 Home 入口 + 世界 icon，Discord 式分离；panel：Home=好友/商店/私信列表、世界=房间+文字/语音频道 or 大厅动态卡）—— sidebar.md 100%（2026-07-04 真机验收通过；无房态场景归 room.md R-8）
- [x] **双形态聊天**（WoW 式场景伴随 ChatDock + 覆盖式会话大窗，内容同源；UI 层快捷键闸门）—— chat.md 100%（2026-07-04 真机验收通过；后端接入见下条）
- [ ] **文字聊天接后端**：接 Supabase Realtime broadcast + `messages` 表持久化（UI 基础模板已就绪，见 chat.md）
- [ ] **共同播放音乐**：UI 已复刻（生成式 WebAudio pad），接共享播放状态（进房自动听到、不抢主动权 —— 规则见 channel.md C-5）
- [ ] **语音**（进房自动接入、默认闭麦、单线路 fade 切换 + 🎧 角标 + 挂断回落 —— 规则见 channel.md C-4）
- [ ] （后期）**直播 / 一起看**：房间内共享实时画面（屏幕分享或摄像头），依赖语音的音视频基建（WebRTC/SFU），排在语音落地之后

### ③ 关系小工具

- [ ] 心愿单接后端（UI 已复刻）
- [ ] 日历·约会 + 时钟·闹钟接后端（UI 已复刻）
- [ ] 在一起天数（呈现方式待定，见 `PROJECT.md` Brain Dump）

### ④ 3D 场景互动（最后，具体方案后续提供）

- [ ] placeholder 单间 → 多房间
- [ ] R3F 接入（场景参考 `ai/blender/scene.md`；二次元角色方案后续提供）
- [ ] 场景中触发 / 展示具体回忆相关图片
- [ ] 交互小游戏、种植物、养宠物