# still 功能模块 & Brain Dump

## 产品定位

**still** 是一个以关系为核心的情感记录和共同合作平台，不同的关系类型对应独立的 workspace：

- **still-love** — 情侣（当前项目）
- **still-family** — 家庭
- **still-friend** — 朋友
- **still-work** — 工作伙伴

每个 workspace 共享同一套底层理念：**Shared Diary + Relationship Game + Emotional Timeline-Todo Management **

- **Shared Diary** — 成员间共享的私密记录空间
- **Relationship Game** — 游戏化互动机制，驱动关系深度
- **Emotional Timeline** — 时间轴沉淀记忆，看见关系的成长轨迹

> 当前聚焦 still-love，MVP 验证核心体验后再扩展其他 workspace。

## 数据库设计（Supabase）

```
profiles          # 用户资料（扩展 auth.users）
  - id (uuid, FK auth.users)
  - display_name
  - avatar_url
  - created_at

couples           # 情侣关系
  - id
  - user1_id (FK profiles)
  - user2_id (FK profiles)
  - intimacy_points (int)
  - created_at

posts             # 动态/说说
  - id
  - author_id (FK profiles)
  - couple_id (FK couples)
  - content (text)
  - images (text[])         # Supabase Storage URL 数组
  - privacy (enum: shared | locked | private)
  - unlock_cost (int)       # 解锁所需亲密值，locked 级别用
  - created_at
  - updated_at              # 自动触发器维护
```

---

## 功能模块

### Auth

- 邮箱/密码登录注册
- Google OAuth
- devMode（`VITE_DEV=true`）跳过验证
- ProtectedRoute 路由守卫

### 情侣配对

- 邀请码生成与输入
- 配对关系写入 couples 表
- 未配对用户引导至配对页

### Timeline（主页）

- 双方动态按时间倒序排列
- 分页/无限滚动加载
- 隐私等级差异化渲染：
  - `shared` → 正常显示
  - `locked` → 模糊/锁定，显示解锁所需亲密值；Mood Post 仅露出情绪色块
  - `private` → 对方不可见，自己看到私密标记
- 纪念册模式（聚合视图）：按 Day / Week / Month / Anniversary 归组展示

### 发布动态

- 普通 post：文字 + 图片上传（Supabase Storage）
- Mood Post：一句话 + 情绪背景色/渐变色，视觉与普通 post 区分
- 隐私等级选择：shared / locked / private
- Private post 支持「延迟分享」：发布后可在未来某天选择 share to our space

### 亲密值系统

- 行为触发增加亲密值（登录、发动态、互动）
- 消耗亲密值解锁 locked 动态

---

## Brain Dump / 待探索想法

- 纪念日提醒功能
- 双方共同编辑的「我们的故事」页面
- 地图打卡（去过的地方）
- 年度回顾自动生成
- 推送通知（对方发动态时）
