# still-love MVP TODO

## MVP 策略

以「**Our World — 两人共同的 3D 书房小世界**」为核心体验，尽快上线最小闭环。
开发原则：**前端骨架优先，跑通完整链路，再补后端和数据库细节。**

## 开发顺序

Phase 1（登录页改版）→ Phase 2（HomePage 框架 + 进入世界链路）→ Phase 3（3D 场景 + HUD 布局骨架）→ Phase 4（角色移动 + 书桌发帖）→ Phase 5（记忆 Timeline UI）→ Phase 6（后端 & 数据库完善）

---

### Phase 0 — 已完成基础设施 ✅

- [x] 创建 `allowed_emails` 表 + RLS
- [x] Auth 完善（Google OAuth、devMode、ProtectedRoute）
- [x] 数据库核心表（profiles、couples、posts、post_unlocks）+ RLS + triggers
- [x] get_feed_posts() RPC 函数

---

### Phase 1 — 登录页改版

**目标：** 上线温馨甜蜜的新风格登录页，整体色调与 Our World 氛围统一。

- [ ] 背景改为奶油白 → 浅粉暖调渐变（`#fff8f5 → #ffeef0`）
- [ ] 品牌 Logo 字体改为细衬线或手写感
- [ ] 主按钮改为 rose 系渐变色（`rose-400 → rose-500`）
- [ ] 整体间距、卡片圆角调整为更柔和的风格
- [ ] （可选）简单 CSS 动画点缀，如浮动小元素

### Phase 2 — HomePage 框架 + 进入世界链路

**目标：** 完成从「登录 → 主页 → 创建/加入世界 → 进入 WorldPage」的完整前端链路，数据先用 mock，后续替换真实 API。

- [ ] HomePage 布局重构：顶部用户信息栏 + 中央 Our World 入口卡片
- [ ] 入口卡片三态 UI：
  - [ ] 未配对态：「创建我们的世界」和「加入 TA 的世界」两个按钮
  - [ ] Pending 态：展示邀请码 + 等待对方加入的提示
  - [ ] 已配对态：书房场景缩略图 + 未读消息 / 新 post 状态徽标
- [ ] 色调与登录页统一（奶油 + 粉暖调）
- [ ] 「进入 Our World」按钮路由跳转到 `/world`（先不校验配对状态，跑通链路）
- [ ] WorldPage 页面骨架（空白 Canvas 占位即可）

### Phase 3 — 3D 书房场景 + HUD UI 布局骨架

**目标：** 场景能看，HUD 能点，整体布局到位，功能暂时 mock。

**3D 场景：**
- [ ] 安装 `@react-three/fiber` + `@react-three/drei`
- [ ] 用 Blender MCP 搭建书房场景（书桌、电脑、书架、地板、墙壁、窗户）
- [ ] 导出 GLTF，加载进 React Three Fiber
- [ ] 上帝视角相机（45° 斜俯，固定，OrbitControls 限制缩放旋转）
- [ ] 暖色调光照（环境光 + 台灯点光源）
- [ ] 窗外雨景效果（粒子雨或贴图动画）
- [ ] 背景雨声 + 轻音乐（音频文件本地加载，简单 Audio API）

**HUD UI 覆盖层：**
- [ ] 右下角「我们的记忆」按钮（点击暂时弹 alert 占位）
- [ ] 左上角用户昵称展示
- [ ] 场景底部交互提示区域（走近道具时显示提示文案）

### Phase 4 — 角色移动 + 书桌发帖

**目标：** 自己能在场景里走动，走到书桌能写 post（先写死存到本地 state，数据库后补）。

**角色移动：**
- [ ] 自己的角色（CapsuleGeometry 占位，暖色）加入场景
- [ ] 点击地面 click-to-move（Raycaster 射线检测 + 目标点插值移动）
- [ ] 走近书桌时触发提示（道具高亮 + 底部提示文案出现）

**书桌发帖：**
- [ ] 点击提示 → 弹出发帖弹窗（文字输入 + 图片上传按钮）
- [ ] 图片选择预览（本地 FileReader，暂不上传）
- [ ] 提交后弹窗关闭，控制台 log 内容（数据库写入后补）

### Phase 5 — 记忆 Timeline UI

**目标：** HUD 按钮能打开记忆弹窗，布局到位，用 mock 数据渲染物品卡片。

- [ ] 全屏大弹窗，半透明毛玻璃背景，可关闭
- [ ] mock 数据：包含 text / image / video 三种类型的假 post
- [ ] `text` post → 信纸/便签样式卡片，点击展开全文弹窗
- [ ] `image` post → 相框样式卡片，点击全屏查看图片
- [ ] `video` post → 小电视样式卡片（点击暂时占位）
- [ ] 时间轴排列，整体风格与场景氛围统一（暖调、手写感标注）

### Phase 6 — 后端 & 数据库完善

**目标：** 把前面所有 mock 替换成真实数据，跑通完整数据流。

**数据库补充：**
- [ ] posts 表新增 `post_type` 字段（`text | image | video`）
- [ ] couples 表新增 `status` 字段（`pending | active`）
- [ ] 创建 `couple_invites` 表（code、couple_id、inviter_id、expires_at、used_at）
- [ ] 创建 `messages` 表（couple_id、sender_id、content、created_at）+ RLS
- [ ] 更新 `src/types/database.ts`（CLI 自动生成）

**功能接入：**
- [ ] Phase 0 遗留：登录后查 allowed_emails，不在白名单则 sign out
- [ ] HomePage 配对流程接入真实 API（创建 couples、生成邀请码、加入配对）
- [ ] 路由守卫：已配对才能进入 `/world`
- [ ] 书桌发帖接入：图片上传 Supabase Storage + 写入 posts 表
- [ ] 记忆 Timeline 接入 get_feed_posts() 真实数据
- [ ] 场景内聊天：Supabase Realtime broadcast + messages 表写入 + 角色头顶气泡

---

### 后续迭代（MVP 范围外）

- [ ] 对方角色实时位置同步（Supabase Realtime presence）
- [ ] 场景天气系统（晴天 / 雨天 / 傍晚随机或按时间变化）
- [ ] 视频帖子上传与播放（小电视道具完整交互）
- [ ] 角色外形自定义（颜色、配件）
- [ ] 场景装扮（家具摆放、壁纸更换）
- [ ] 个人笔记模块
- [ ] Todo 管理模块
- [ ] 亲密值系统
- [ ] 推送通知
- [ ] 纪念日特殊场景装饰