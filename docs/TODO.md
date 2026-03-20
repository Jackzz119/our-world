# still-love MVP TODO

## 开发顺序

Phase 1 → Phase 2 → Phase 3 → Phase 5（先不做隐私）→ Phase 4 → Phase 5 完整隐私逻辑 → Phase 6

---

### Phase 1 — Auth 完善 ✅

- [x] 修复 devMode 下 session 为 null 导致 HomePage 崩溃的 bug
- [x] 登录后能正确拿到用户信息（email、uid）
- [x] 登出功能完善
- [x] Google OAuth 登录

### Phase 2 — 数据库设计（Supabase） ✅

- [x] 创建 profiles 表
- [x] 创建 couples 表（含 check: user1_id < user2_id）
- [x] 创建 posts 表（含 privacy enum、updated_at trigger）
- [x] 创建 handle_new_user trigger（新用户自动写入 profiles）
- [x] 配置 RLS 策略（profiles / couples / posts）
- [x] couples 追加完整性约束与 trigger
- [x] posts 追加 author 归属校验 trigger
- [x] 创建 post_unlocks 表及完整性 trigger
- [x] 配置 post_unlocks RLS 策略
- [x] 创建 get_feed_posts() RPC 函数（Feed 聚合查询，含解锁状态）

### Phase 3 — HomePage 与情侣空间创建与配对

> 流程：创建空间 → 单人可用（装扮、发 post）→ 生成邀请码邀请对方 → 对方接受 → 配对完成（双人）

- [x] HomePage：展示个人头像与基本信息（display_name、avatar_url）
- [x] HomePage：空间入口卡片（情侣空间等），支持状态感知（未创建 / pending / active）
- [x] HomePage：个人动态输入框 placeholder（为日记/个人 post 系统占位）
- [x] HomePage：桌面端双列响应式布局（左侧 sticky Profile 侧边栏 + 右侧主内容）
- [ ] 更新 `src/types/database.ts`，对齐当前 Supabase 数据库结构（用 CLI 自动生成）
- [ ] `couples` 表新增 `status` 字段（`pending | active`），pending = 空间已创建但未配对，active = 双方配对完成
- [x] 创建 `/couple` 路由与 `CouplePage.tsx`；HomePage 情侣空间卡片点击逻辑：status = none → 弹窗确认 → 跳转，其余状态直接跳转
- [x] CouplePage：mock 数据（`public/mock/couple-feed.json` + `src/types/feed.ts`），fetch 模拟 API 调用
- [x] CouplePage：情侣头部卡片（双头像 + 在一起天数 + 亲密值）、Timeline 竖线分组 feed、PostCard / LockedPostCard、PC 双列布局
- [ ] 弹窗「立即创建」接入真实逻辑：写入 couples 表（status = pending，user2_id 暂为 null）
- [ ] 空间创建后可进行基础设置与装扮（空间名称等）
- [ ] 创建 `couple_invites` 表（字段：code、couple_id、inviter_id、expires_at、used_at）
- [ ] 生成邀请码 / 分享链接
- [ ] 对方通过邀请码加入，更新 couples（填入 user2_id，status → active）
- [ ] 路由守卫：登录后检查 couple 状态，无空间 → 引导创建，pending → 可进入但提示邀请，active → 正常进入 Timeline

### Phase 4 — 发布动态

- [ ] 发布入口（浮动按钮）
- [ ] 支持写文字 + 上传图片（Supabase Storage）
- [ ] 选择隐私等级（共享 / 待解锁 / 完全隐私）
- [ ] 写入 `posts` 表

### Phase 5 — Timeline 页面（HomePage）

- [ ] 给 `get_feed_posts()` 补充 `p_limit` / `p_offset` 分页参数
- [ ] 拉取当前情侣双方的动态，按时间倒序
- [ ] 无限滚动（分页加载）
- [ ] 节点展示：头像、昵称、时间、内容/图片
- [ ] 隐私等级渲染逻辑：
    - `shared` → 正常显示
    - `locked` → 模糊/锁定状态，显示解锁所需亲密值
    - `private` → 对方完全看不到，自己看到私密标记

### Phase 6 — 亲密值系统（基础）

- [ ] 每天登录 / 发动态 / 互动增加亲密值
- [ ] 用亲密值解锁 `locked` 状态的动态
- [ ] 展示当前亲密值
