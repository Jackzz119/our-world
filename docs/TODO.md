# still-love MVP TODO

## 开发顺序

Phase 1 → Phase 2 → Phase 3 → Phase 5（先不做隐私）→ Phase 4 → Phase 5 完整隐私逻辑 → Phase 6

---

### Phase 1 — Auth 完善 ✅

- [x] 修复 devMode 下 session 为 null 导致 HomePage 崩溃的 bug
- [x] 登录后能正确拿到用户信息（email、uid）
- [x] 登出功能完善
- [x] Google OAuth 登录

### Phase 2 — 数据库设计（Supabase）

- [x] 创建 profiles 表
- [x] 创建 couples 表（含 check: user1_id < user2_id）
- [x] 创建 posts 表（含 privacy enum、updated_at trigger）
- [ ] 创建 handle_new_user trigger（新用户自动写入 profiles）
- [ ] 配置 RLS 策略

### Phase 3 — 情侣配对系统

- [ ] 用户生成邀请码 / 分享链接
- [ ] 另一方输入码完成配对，写入 `couples` 表
- [ ] 配对后才能进入 Timeline，否则引导配对

### Phase 4 — 发布动态

- [ ] 发布入口（浮动按钮）
- [ ] 支持写文字 + 上传图片（Supabase Storage）
- [ ] 选择隐私等级（共享 / 待解锁 / 完全隐私）
- [ ] 写入 `posts` 表

### Phase 5 — Timeline 页面（HomePage）

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
