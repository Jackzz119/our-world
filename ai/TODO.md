# Our World TODO

## 当前策略

围绕「两人生活的 3D metaspace（天空视角）」做 UI。
开发原则：**前端骨架优先，数据先用 mock，主页直接进世界空间（无登录页），后端等 UI 成型再接回。**

## 开发顺序

Phase 1（世界空间主页骨架 + 去登录）→ Phase 2（回忆系统三个悬浮窗口）→ Phase 3（实时聊天）→ 后续（游戏化 HUD、3D 模型导入、后端接入）

---

### Phase 0 — 已建基础设施 ✅（保留为参考，前端暂用 mock）

- [x] 创建 `allowed_emails` 表 + RLS
- [x] Auth（Google OAuth、devMode、ProtectedRoute）
- [x] 数据库核心表（profiles、couples、posts、post_unlocks）+ RLS + triggers
- [x] get_feed_posts() RPC 函数

> 注：以上后端在转向前已建好。新阶段前端先 mock，不立即接入。

---

### Phase 1 — 世界空间主页骨架 + 去登录

**目标：** 应用入口直接是带 Canvas 的世界空间，去掉登录页/路由守卫。

- [x] 移除登录页与路由守卫，主页（`/`）直接渲染世界空间
- [x] 世界空间页面：全屏占位 Canvas（2D 天空渐变占位，待 Blender 模型导入后替换为 R3F）
- [x] 清理 pages 目录里不再需要的页面（LoginPage / HomePage / CouplePage / ProtectedRoute / LandingPage 已删）
- [x] package.json 已改名 `our-world`

### Phase 2 — 回忆系统：三个悬浮窗口（当前重点）

**目标：** Canvas 之上有一个按钮选单，可打开 Timeline / 纯文字 / 图片 三个悬浮窗口，数据用 mock。

**按钮选单：**
- [x] 悬浮按钮 + 展开选单（三个入口：Timeline / 纯文字 / 图片）

**三个悬浮窗口：**
- [x] 纯文字窗口：写/看 文字回忆录（mock 数据，本地 state）
- [x] 图片窗口：上传两人照片（本地 FileReader 预览，暂不上传）+ 查看
- [x] Timeline 窗口：时间轴方式展示回忆记录（mock 数据）
- [x] 三个窗口的悬浮面板交互统一（打开/关闭、毛玻璃背景、可拖拽、多开置顶、风格统一）

> 实现细节见 `ai/Features/world-space-ui.md`。代码就绪 + 类型检查通过，待 `pnpm dev` 可视化验收。

### Phase 3 — 实时聊天

**目标：** 两人能实时发文字。

- [ ] 聊天 UI（输入框 + 消息展示）
- [ ] Supabase Realtime broadcast 接入
- [ ] messages 表持久化

---

### 后续（当前范围外）

- [ ] 游戏化 HUD：左上角 minimap
- [ ] Blender 模型开发完 → 导出 GLTF → 安装 R3F + drei → 替换占位 Canvas
- [ ] 天空视角相机
- [ ] 回忆系统接入真实后端（posts 表 + Supabase Storage 图片上传）
- [ ] 回忆物品化：post 在 3D 世界里以物品形式呈现
- [ ] 角色 / 化身系统
- [ ] 场景天气 / 昼夜系统
- [ ] 在一起天数（降级到回忆页小细节，不在主界面强调）
- [ ] 纪念日特殊场景装饰