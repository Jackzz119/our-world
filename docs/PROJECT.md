# still-love 功能模块 & Brain Dump

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
- 隐私等级差异化渲染

### 发布动态

- 富文本 + 图片上传
- 隐私等级选择（shared / locked / private）

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
