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

- [~] **auth 地基**：登录页 + 路由守卫 已就绪；**dev 开关改为自动真登录**（2026-07-04）；**忘记密码已做**（2026-07-05：登录页发重置邮件 + `/reset-password` 设新密码页）；**收口待做**：白名单拦截 + 登出
- [x] 账号重建回接（2026-07-05 完成）：jackzhenghw 删号重注册（忘记密码；删前拆链保住世界）→ 新 uuid 已回接 `worlds.member_id` + status='active'，误建的多余世界已删；dev 自动登录凭据已入 `.env.local` 并真机跑通
- [x] Supabase 基建确认（当前项目 `xrscspcqnsxvfshskfpy`：5 表 + `get_feed_posts` RPC 均在）
- [x] posts API 数据层（`getFeedPosts` / `createPost`）—— timeline.md ST-1/C
- [x] **模型 couple → room（owner/member）+ 单人可发帖**：DB 全量改名迁移、去「未配对」态 —— timeline.md ST-A~F
- [x] timeline 真 post 渲染（读链路展示）—— timeline.md ST-3
- [x] image-slot 暴露 dataURL + 发帖写链路（上传 Storage + createPost）—— timeline.md ST-4/5
- [x] 照片墙接真实 post —— timeline.md ST-6
- [x] 建房改主动式：feed 只查房、无房即 error；`getMyRoom` + `createRoom` —— room.md R-2（= timeline.md ST-G）
- [ ] 端到端联调 + 边界（回忆链路）—— timeline.md ST-7：读链路已真机验证（2026-07-04）；**写链路已通**（2026-07-05：修复 Composer 丢图 bug ST-J 后，发帖传图→Storage→缩略图→照片墙全链路真机验证）；时间线作者身份标识已做（我=蓝 accent / 对方=display_name 粉色）；**边界（上传失败/URL 过期/断网）待测**；feed 懒加载已修（ST-I）
- [x] （杂项）shadcn 全量移除（2026-07-05，UX 评估判定不适合高定制玻璃拟态 + 多 theme 路线）：删 `src/components/ui/`（零业务引用）、`components.json`、`lib/utils.ts`；卸载 cva/clsx/tailwind-merge/lucide-react/radix-ui/tailwindcss/@tailwindcss/vite（-87 包）；`index.css` 以等效最小 reset 替代 preflight；tsc/eslint/build 绿 + 浏览器视觉回归通过（大厅/房间/时间线/照片墙/登录页）。原 react-refresh eslint 报警随之消失
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

### UI 基建（跨 phase）—— 见 `ai/Features/ui-system.md`

- [x] UI-1 弹窗壳去重 · UI-2 `.btn-pub`/`.chip-accent` 收敛 · UI-3 image-slot 主题色 token 化（2026-07-05，随 timeline 重设计一并落地）
- [x] **timeline 页面重设计**（2026-07-05，UX 裁决 + 真机验证）：聊天式方向（上旧下新）+ rail 头像多作者标识 + 游标分页无限上滚 + 底部 composer + 发帖平滑滑底动画 + `.modal.tall` 加高 + 照片墙 lightbox + 缩略图质量升级（480px 重生成）+ 裁撤「文字回忆」tab —— 细节见 timeline.md ST-K
- [x] **timeline 拖拽滚动 + 橡皮筋刷新 + member 成对配色**（2026-07-05）：鼠标/触屏拖动滚动、到底上拉橡皮筋触发刷新、底部「已看到最新」提示、对方帖粉色三重标记（名字/头像光环/卡片边线）—— timeline.md ST-L；member 测试数据（【测试数据】前缀 ×6）留库，**上线前清理**
- [x] **timeline 交互打磨**（2026-07-05）：鼠标拖拽惯性（rAF 动量）、默认光标/仅拖动时 grabbing、列表独立滚动区 + 上下渐变边界（不再与 composer 重叠）、composer 折叠态输入框化（整条可点 affordance）、post 点击打开详情弹层（原图渐进加载）—— timeline.md ST-M
- [x] **timeline 宽屏华丽版**（2026-07-05）：弹窗放大到近全屏（对齐聊天大窗量级，按 stage 容器取尺寸）+ ≥1000px 中央脊线交错布局、照片墙 4 列，窄屏回落单列 —— timeline.md ST-N
- [x] **timeline zigzag + 作者色身份系统 + 图片续签**（2026-07-05，UX 裁决）：左右改为按顺序严格交错（位置=节奏），身份全靠作者色（我=蓝、对方=粉、未来作者=散列色板，打在光环/名字/边线三处）+ 节点连接枝；签名 URL 40 分钟自动续签 + tab 重新可见重签，修「挂机图片消失」—— timeline.md ST-O
- [x] **timeline 单列日记流 + 照片墙拼贴手帐墙 + 缩略图 1024**（2026-07-05，网上调研 + 用户拍板 + 真机验证）：中央脊线/zigzag 废弃（技术叙事违和大耳狗玻璃；情侣/日记类产品行业共识=单列日记流），改单列居中 + 点线小路 + 手帐日期贴纸 + 头像贴纸 + 图片帖大图主视觉；照片墙改自然纵横比 polaroid 拼贴（白框/胶带/微旋转/月份分组），修 image-slot 固定 160px 高度裁切根因；`THUMB_MAX` 480→1024 修模糊 + 存量缩略图已重生成；视觉基准存档 `ai/design_system/cinnaglass/timeline-redesign.html` —— timeline.md ST-P/Q/R
- [x] **架构评估：不引入 Next.js/SSR/BFF**（2026-07-05，agent 全库扫描结论）：私密 2 人应用无 SEO/首屏 SSR 需求；anon key + RLS 是 Supabase 正确模型；服务端逻辑归宿 = Postgres RPC/trigger + Edge Functions（白名单 trigger、推送、pg_cron、AI 代理）；WebRTC 语音 2 人走 P2P + 托管 TURN，Next 帮不上；重新考虑的触发条件（转公开/多租户、对外分享页、Edge Functions 不够用、4+ 方音视频）已记录
- [x] **timeline 白底纸感 + composer 上传区/CTA 重做 + mockup 移交 ux**（2026-07-05，比稿拍板 + 真机验证）：post/详情/composer 统一亮白底（告别朦胧蓝）；上传区改整宽拖放条（修空态文字竖排剪裁）；发布按钮改「✨ 记下这一刻」情感 CTA；theme mockup 归档制度落地——`ai/design_system/<theme>/` 归 ux skill 管辖（规则已写入 ux SKILL.md），timeline/composer 两份比稿已入库 —— timeline.md ST-S
- [x] **timeline 多图上传 + 溢出/省略修复 + 输入框自动长高 + 大耳狗吉祥物**（2026-07-05，比稿拍板 + 端到端实测）：修「拖 B 传 A」（composer 弃 image-slot 改受控多图选择器，所见即所传）；多图发布→卡片首图+「＋N 张」徽标→详情全图→照片墙摊平；长文 `overflow-wrap:anywhere` 修穿框 + 6 行省略；textarea 自动长高（上限后内滚）；宽屏两侧原创云朵小狗吉祥物（蓝左粉右，≥1200px）—— timeline.md ST-T
- [x] **composer 草稿交互 + 紧凑化**（2026-07-06，UX 裁决 + 实测）：点外部/Esc 收起保草稿（文字+图），取消是唯一清空路径；折叠 pill 草稿预览态（✎草稿贴纸+首行+图数）；展开高度 258→127px（一行起步、拖放条撤销、照片圆钮入操作行、整框仍可拖放） —— timeline.md ST-U
- [ ] UI-4 第二个 theme 的契约检查单（开工新 theme 时执行）

### ② Metaspace 体验（Discord-like 交互空间）

- [x] **世界结构定型 + `channel.md` 文档**（2026-07-04）：世界 > 房间（场景+语音，语音频道的扩展）/ 文字频道 / 语音频道；UI 术语 + sidebar 房间列表 + **DB/代码全量迁移 `rooms→worlds`** 已落地（channel.md C-1~C-3，顺手修复 post_unlocks 触发器引用旧 couples 表的潜伏 bug）；`channels` 表为 future（C-7）
- [x] **贯穿式侧边栏**（rail：logo=私信 Home 入口 + 世界 icon，Discord 式分离；panel：Home=好友/商店/私信列表、世界=房间+文字/语音频道 or 大厅动态卡）—— sidebar.md 100%（2026-07-04 真机验收通过；无房态场景归 room.md R-8）
- [x] **双形态聊天**（WoW 式场景伴随 ChatDock + 覆盖式会话大窗，内容同源；UI 层快捷键闸门）—— chat.md 100%（2026-07-04 真机验收通过；后端接入见下条）
- [ ] **退出体系（UX 已裁决，见 `.claude/skills/ux/decisions.md` D-3/D-4）**：①场景悬浮「退出房间」UI（回大厅，语音/共享音乐自动断——耦合模型：在房间=在语音，闭麦/静音覆盖「不出声/不收听」，UI 导航不算离场）②「退出世界」入口（Discord Leave Server 语义：脱离成员、需确认、owner 不能退只能转让/删除——入口位置待定）③退出账号归 settings（`ai/Features/settings.md` 已建档，later）
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