# 03 · 分区 A：认证、会话、世界进入与设置

- run：`2026-09-19-02` · step 03 · substep `03-S03` · HEAD `f96fc63bb21725ab0f48d0ecb661f9e0fe4eac6d`（branch `dev`）
- 方法：全文阅读 + 链路追踪（入口 → Supabase auth / PostgREST / Storage → 状态 → 展示）。**本机无 `.env.local`、Supabase MCP 401**，全部证据为「静态」（含对 `node_modules/.pnpm/@supabase+auth-js@2.98.0` 源码的阅读）；涉及线上 DDL / RLS / 触发器 / Auth 设置的结论一律标「待核线上」。
- 只诊断，未改任何 `src/`、`sql/`、配置或其它文档。

## 0. 覆盖

### 0.1 本分区文件（全文阅读）

| 文件 | 行数 | 读了什么 |
| --- | --- | --- |
| `src/main.tsx` | 13 | StrictMode 根挂载、全局 CSS 与 `image-slot` 副作用导入 |
| `src/App.tsx` | 26 | 三条路由；无兜底路由、无 ErrorBoundary |
| `index.html` | 19 | Google Fonts 外链、viewport `user-scalable=no`、`/vite.svg` |
| `vite.config.ts` | 12 | `@` 别名，无 `define`/`envPrefix` 收窄 |
| `tsconfig.app.json` | 30 | `types: ["vite/client"]`（`import.meta.env` 索引签名来源）、`strict`、`noUncheckedSideEffectImports` |
| `.env.example` | 14 | 6 个 `VITE_*` 变量及语义注释 |
| `src/pages/LoginPage.tsx` | 216 | Google OAuth / 邮箱注册登录 / 忘记密码三条 auth 调用与错误展示 |
| `src/pages/ResetPasswordPage.tsx` | 129 | recovery 会话判定（`useAuth`）、`updateUser({password})`、本地校验 |
| `src/pages/ProtectedRoute.tsx` | 83 | 会话门、dev 自动登录状态机、`ow-explicit-logout` sessionStorage 标记 |
| `src/hooks/useAuth.ts` | 34 | `getSession()` + `onAuthStateChange` 双源 |
| `src/pages/WorldPage.tsx` | 361 | 壳层编排：五个 hook、四个持久化切片、`liveProfile` 合成、`onWorldSaved`、`AUTO_ENTER` |
| `src/pages/world/useWorldSession.ts` | 158 | `getMyWorld`/`createWorld`/签名 icon/成员档案三条 effect 与大厅状态机 |
| `src/pages/world/useSurfaceRouter.ts` | 64 | surface 键路由；`'world-settings'` 无路由 |
| `src/pages/world/useWeather.ts` | 84 | geolocation → open-meteo 链路、7s 兜底、取消标记 |
| `src/pages/world/useLiveClock.ts` | 17 | 1 Hz `setInterval` 状态 |
| `src/pages/world/usePersistedState.ts` | 18 | 每次变更写回 localStorage（含首帧） |
| `src/lib/supabase.ts` | 15 | 单例 client；`currentUserId` 走 `auth.getUser()` |
| `src/lib/worlds.ts` | 51 | `WORLD_COLS`、`getMyWorld`/`createWorld`/`updateWorld`、`WorldPatch` |
| `src/lib/profiles.ts` | 18 | `profiles` 按 id 批量读 |
| `src/lib/local-store.ts` | 34 | `loadJson`/`loadMerged`/`saveJson` |
| `src/lib/logman.ts` | 18 | 日志封装（本分区仅 settings.tsx 绕开它） |
| `src/utils/index.ts` | 23 | `getEnv`（模块求值期抛）/`getEnvFlag`/`getEnvOptional` |
| `src/types/index.ts` | 9 | `EnvName` 白名单 |
| `src/themes/cinnaglass/lobby.tsx` | 205 | 大厅四态卡片与传送门可达性 |
| `src/themes/cinnaglass/settings.tsx` | 437 | 昵称/邮箱/密码/应用锁/退出/主题六组控件，各自落点 |
| `src/themes/cinnaglass/world-settings.tsx` | 347 | 草稿快照、上传 → 更新两步写、错误映射、对象 URL 生命周期 |
| `src/themes/cinnaglass/profile.ts` | 52 | `PROFILE_DEFAULT`、`gload`、三个纪念日函数 |
| `src/themes/cinnaglass/tweaks.ts` | 58 | `Tweaks` 联合类型、`ow-tweaks-v1` 读写、无枚举校验 |
| `src/themes/cinnaglass/model.ts` | 32 | `WeatherKind`/`Weather`/`Profile`/`CalEvent`/`Alarm`/`Widgets` |
| `src/themes/cinnaglass/login-backdrop.tsx` | 507 | 纯静态 SVG（L1–484 为几何与配色，无 effect/状态）；L487 `LoginBackdrop({ weather?: string })` |
| `sql/dev-create-world.sql` | 33 | 手工配对脚本假设：`status` 列、`'active'` 需 member、`check_world_uniqueness` |
| `sql/storage-memories-bucket.sql` | 89 | 桶限制（25MB、四种 mime）、四条按首段路径 = world_id 的策略 |
| `src/lib/storage.ts`（仅 `uploadWorldIcon` L88–114 + 其依赖 L10–41、L116–128） | 128 | icon 缩放到 256 webp、`upsert:false` 唯一路径、`signImageUrls` |

### 0.2 跨分区追读（只为把链路追到头，不在本分区报告范围）

- `src/types/feed.ts`（37 行，全文）：`World` / `FeedProfile` 类型定义。
- `src/themes/cinnaglass/shell/world-surfaces.tsx`（95 行，全文）：`SettingsScreen` / `WorldSettingsScreen` 挂载与 `open` 判定（L79、L87）。
- `src/themes/cinnaglass/shell/rail.tsx` L14–60、L150–178：`RailKey`、`MODULE_DEFS`、`widgets[m.key]` 读法、`onLeaveWorld`。
- `src/themes/cinnaglass/shell/floaters.tsx` L12–32、`src/themes/cinnaglass/calendar.tsx` L19–23、L123–159、L325–342：`anniv` / `nowTs` 消费点。
- `src/themes/cinnaglass/chat/chat-data.ts` L40–64：`useChatThreads(worldId, uid, profiles)` 签名与 `uid` 用法。
- `src/themes/cinnaglass/surfaces/use-signed-thumbs.ts` L1–45：时间线的续签策略（定时 + `visibilitychange`），与 icon 续签对照。
- `src/themes/cinnaglass/image-slot.js` L1–60：`ow-image-slots-v1` 存储与 mime 白名单。
- `src/themes/cinnaglass/cinnaglass.css`（grep `[data-mood]`/`[data-glass]`/`[data-wx]`/`.lobby-*`/`.modal`）：确认属性选择器与类名契约存在。
- `src/pages/LoginPage.module.css`（类名清单）：`wrap bg veil card brand mark google or form eye msg info error submit switchRow` 全部被两页引用，无缺类。
- `node_modules/.pnpm/@supabase+auth-js@2.98.0/.../GoTrueClient.js` L1268–1305（`_getUser`）、L1584–1606（`_signOut`）：断网时的返回语义。
- 文档：`ai/PROJECT.md` §数据库（L98–132）、`ai/features/supabase.md` L1–70、`ai/project-audit/CONVENTIONS.md`、`ai/TODO.md` Bugs（L23–26、L138、L143）、`ai/project-audit/INDEX.md`「第三步开工时要知道的」、`ai/project-audit/FINDINGS.md`（grep 相关条目）。

## 1. 入口 → 链路图

### 1.1 Login（`/login`）

1. `App.tsx:11` → `LoginPage.tsx:53`。三条动作：
    - **Google**：`LoginPage.tsx:68` `auth.signInWithOAuth({provider:'google', redirectTo: origin + '/'})` → 浏览器跳走 → 回到 `/` → supabase-js 初始化时解析 URL（`detectSessionInUrl` 默认开）→ `useAuth.ts:18` `getSession()` 在 `initializePromise` 之后才 resolve，所以 `ProtectedRoute` 拿到的是已交换好的会话（静态：auth-js `getSession` 先 `await initializePromise`）。`redirectTo` 是否在 Auth 允许列表：待核线上。
    - **邮箱登录/注册**：`LoginPage.tsx:99–119` `signUp({email,password})` 或 `signInWithPassword` → 成功 `navigate('/')`（登录）或留在页内提示（注册）。无 trim、无长度校验，错误直接 `err.message`。
    - **忘记密码**：`LoginPage.tsx:77–95` `resetPasswordForEmail(email,{redirectTo: origin + '/reset-password'})`。
2. 没有任何一步读 `allowed_emails`（白名单只靠 Dashboard 关注册，`supabase.md` §二-1）。

### 1.2 Reset（`/reset-password`）

`App.tsx:12` → `ResetPasswordPage.tsx:16`：`useAuth` 有 `user` 即视为 recovery 链接有效（`:67–69`）→ 本地校验 ≥6 位且两次一致（`:29–36`）→ `auth.updateUser({password})`（`:40`）→ 900ms 后 `navigate('/')`（`:43`）。注意：**已登录用户直接访问该页也能改密码**（`user` 非空即出表单），这正是设置页缺的真实改密路径（见 A-03）。

### 1.3 ProtectedRoute（`/`）

`App.tsx:13–20` → `ProtectedRoute.tsx:50`：

1. `useAuth`（`getSession()` 本地读 + `onAuthStateChange`）→ `loading` 期间 `<Splash/>`（`:79`）。
2. 无 `user` 且 `DEV_AUTO_LOGIN`（`:19`，需 `VITE_DEV=true` 且邮箱密码都在）且未 `devTried` → `signInWithPassword(dev 账号)`（`:71`），`.finally` 置 `devTried`；成功由 `onAuthStateChange` 翻 `user`。`devTried` 初值 = `sessionStorage['ow-explicit-logout']==='1'`（`:53`），设置页退出时写入（`settings.tsx:227`），任何真实会话出现时清除（`:56–63`）。
3. 有 `user` 渲染 `WorldPage`，否则 `<Navigate to="/login" replace/>`（`:80`）。

### 1.4 进世界（大厅 → 房间）

`WorldPage.tsx:114–128` `useWorldSession(AUTO_ENTER)`：

1. 挂载 effect（`useWorldSession.ts:35–55`）→ `getMyWorld()`（`worlds.ts:17`）→ `currentUserId()`（`supabase.ts:10`，**`auth.getUser()` 网络往返**）→ PostgREST `worlds?select=WORLD_COLS&or=(owner_id.eq.U,member_id.eq.U)` `.maybeSingle()` → `world|null` + `userId` → `lobbyStatus='ready'`；失败 → `lobbyError=e.message`、`'error'`。
2. `LobbyScene`（`lobby.tsx:154`）四态：loading / error(重试=`onEnter`) / hasWorld(进入) / 无世界(创建)。传送门 `canEnter = status==='ready' && !busy`（`:155`）。
3. `enterWorld`（`useWorldSession.ts:114`）：有 world → `entered=true`；无 → `retryLobby()` 重拉。
4. 进入后并行三条：
    - icon：`world.icon_path` → `signImageUrls([path])`（`storage.ts:118`，Storage `createSignedUrls` TTL 1h）→ `signedIcon`，`setInterval` 40min 续签（`useWorldSession.ts:62–79`）。
    - 成员名：`getProfilesByIds([owner_id, member_id])`（`profiles.ts:10`）→ `profiles` + `memberNames{me,her}`（`:84–103`）。
    - 聊天：`useChatThreads(world.id, uid, profiles)`（`WorldPage.tsx:160`，分区 C）。
5. 展示：`liveProfile`（`WorldPage.tsx:193–198`）= DB 字段优先、localStorage `ow-profile-v1` 兜底 → RoomScene presence（`:235–243`）、MomentCard `anniv`（`:277`）、MusicMini `spaceName`（`:280`）、`WorldSurfaces.anniv`（`:308`）。

### 1.5 建世界

`lobby.tsx:188` 创建按钮 → `createAndEnter`（`useWorldSession.ts:120–132`，`lobbyBusy` 防双击）→ `createWorld()`（`worlds.ts:33`）→ `currentUserId()` → PostgREST `insert worlds {owner_id}` `.select(WORLD_COLS).single()`（依赖 DB 默认：`status='pending'`、`name`、`intimacy_points`、`icon_*` null；触发器 `worlds_check_uniqueness` 拒绝第二个世界——待核线上）→ `setWorld(created)`、`entered=true`。失败 → 原始错误文本落到大厅卡片。

### 1.6 设置（个人）

`rail.tsx:122` 设置按钮 → `useSurfaceRouter.ts:44` `open('settings')` → `world-surfaces.tsx:78–85` `SettingsScreen(open=screen==='settings', profile, setP=setProfile, t, setTweak)`：

- 昵称 `her/me`、邮箱、应用锁 → `setP` → `usePersistedState('ow-profile-v1')` 写 localStorage（`WorldPage.tsx:105`）。**不落 DB**。
- 改密码 `savePw`（`settings.tsx:209–217`）→ 只置本地 `saved=true`，**无任何 Supabase 调用**。
- 主题 → `setTweak` → `ow-tweaks-v1`（`tweaks.ts:50–56`）。
- 退出 `logout`（`settings.tsx:223–237`）→ 写 `ow-explicit-logout` → `auth.signOut()`（默认 `scope:'global'`，先打 `/auth/v1/logout` 再清本地）→ `onAuthStateChange(SIGNED_OUT)` → `ProtectedRoute` 跳 `/login`。

### 1.7 世界设置

`world-surfaces.tsx:86–92` `WorldSettingsScreen(open=screen==='world-settings', world, iconUrl=worldIconUrl, onSaved=onWorldSaved)`。**全仓无任何 `open('world-settings')`**（grep 仅命中 `world-surfaces.tsx:87` 的判定），组件常驻但不可达。若可达：`save`（`world-settings.tsx:191–220`）→ 有文件先 `uploadWorldIcon(world.id,file)`（`storage.ts:93`：`createImageBitmap` → 256px webp → Storage `upload(<world_id>/icon-<uuid>.webp, upsert:false)`）→ `updateWorld(world.id,{name,anniversary,icon_emoji,icon_path})`（`worlds.ts:47`，PostgREST `update … eq id … select single`，依赖 worlds 的 update RLS 允许 member——待核线上）→ `onSaved(updated)` → `WorldPage.tsx:204–207` `applySavedWorld(w)` + 同步 `ow-profile-v1` 的 `world/anniv`。

## 2. 契约表

类型层说明：**传输** = 直接按 PostgREST/auth 返回的形状断言；**领域** = 应用内语义类型；**存储** = localStorage/sessionStorage 形状；**视图** = 只服务渲染。本分区**没有独立的映射层**：`World`/`FeedProfile` 既当传输类型又当领域类型（`worlds.ts:26/38/50`、`profiles.ts:16` 直接 `as`），唯一的「合成」发生在 `WorldPage.tsx:193–198`（`liveProfile`，视图）。

### 2.1 Supabase auth

| 契约 | 代码位置 | 类型层 | 备注 / 与文档差异 |
| --- | --- | --- | --- |
| `auth.signInWithOAuth(google, redirectTo=origin+'/')` | `LoginPage.tsx:68–71` | 传输 | 允许的 redirect URL 列表待核线上 |
| `auth.signUp / signInWithPassword({email,password})` | `LoginPage.tsx:105/110`、`ProtectedRoute.tsx:71` | 传输 | 服务端密码最短长度、邮箱确认开关待核线上（`dev-create-world.sql:4` 称确认开着） |
| `auth.resetPasswordForEmail(email,{redirectTo:origin+'/reset-password'})` | `LoginPage.tsx:85` | 传输 | 同上 |
| `auth.updateUser({password})` | `ResetPasswordPage.tsx:40` | 传输 | 设置页没有对应调用（A-03） |
| `auth.getSession()` / `onAuthStateChange` | `useAuth.ts:18/25` | 传输 → `User` 领域 | 本地读，无网络 |
| `auth.getUser()` | `supabase.ts:11`（`currentUserId`） | 传输 | **网络往返**；返回的 `error` 被忽略（A-02） |
| `auth.signOut()`（默认 `scope:'global'`） | `settings.tsx:232` | 传输 | 返回的 `{error}` 被忽略（A-01） |

### 2.2 PostgREST 表 / 列

| 表.列 | 代码位置 | 类型层 | 与 `PROJECT.md` §数据库 的差异 |
| --- | --- | --- | --- |
| `worlds` select `id, owner_id, member_id, name, anniversary, icon_emoji, icon_path, intimacy_points, created_at` | `worlds.ts:11` `WORLD_COLS` → `types/feed.ts:27–37` `World` | 传输 = 领域 | 与表一致。`status` 列**代码从不 select、从不写**（插入依赖默认 `pending`，`dev-create-world.sql:26–30` 才写 `'active'`）；`World.name: string` 非空但消费处全用 `??`/`\|\|` 防御（A-07）；`intimacy_points` 无消费者（grep 仅类型与 COLS） |
| `worlds` insert `{owner_id}` | `worlds.ts:36` | — | 依赖 DB 默认值与 insert RLS（`owner_id = auth.uid()`）——待核线上 |
| `worlds` update `{name, anniversary, icon_emoji, icon_path}` | `worlds.ts:43/48` `WorldPatch` | 领域 | 依赖 update RLS 允许 member（代码注释 `worlds.ts:41` 声称）——待核线上 |
| `worlds` filter `.or(owner_id.eq.U,member_id.eq.U).maybeSingle()` | `worlds.ts:23–24` | — | 一人多世界时 `maybeSingle` 抛 PGRST116（靠 `check_world_uniqueness` 保证唯一——待核线上） |
| `profiles` select `id, display_name, avatar_url` `.in('id',…)` | `profiles.ts:13` → `types/feed.ts:3–7` `FeedProfile` | 传输 = 领域 | `display_name`/`avatar_url` 类型为非空 `string`，但 `handle_new_user` 是否填充、邮箱注册是否为 null 待核线上；消费处均按可空处理（`useWorldSession.ts:93–94` `\|\| undefined`）。**`display_name` 全仓只读不写**（grep：无 `from('profiles').update/upsert`） |

### 2.3 Storage（桶 `memories`）

| 契约 | 代码位置 | 与 `sql/storage-memories-bucket.sql` 的对照 |
| --- | --- | --- |
| `upload('<world_id>/icon-<uuid>.webp', blob, {contentType:'image/webp', upsert:false})` | `storage.ts:108–111` | 首段 = world_id 满足四条策略（L37–85）；`image/webp` 在 `allowed_mime_types`（L24）；256px 远小于 25MB（L23）。脚本未限制路径形状，任何成员可在本世界前缀下写任意对象 |
| `createSignedUrls([icon_path], 3600)` | `storage.ts:121`，调用 `useWorldSession.ts:66` | select 策略覆盖。续签周期见 A-08 |

### 2.4 env（`import.meta.env`，全部内联进浏览器 bundle）

| 变量 | 读取处 | 读法 | 备注 |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | `supabase.ts:6` | `getEnv`（缺失即模块求值期抛，白屏无提示） | anon key 公开设计，边界在 RLS |
| `VITE_DEV` + `VITE_DEV_EMAIL` + `VITE_DEV_PASSWORD` | `ProtectedRoute.tsx:15–19` | `getEnvFlag`/`getEnvOptional`，**未与 `import.meta.env.DEV` 联动** | `.gitignore:13` `*.local` 覆盖 `.env.local`（实测 `git check-ignore`）；但 `vite build` 同样加载 `.env.local`，密码会进 dist（A-13） |
| `VITE_AUTO_ENTER` 或 `?enter` | `WorldPage.tsx:38–43` | `getEnvFlag` / URLSearchParams | `?enter` 生产也生效（只跳大厅，无害） |
| `?surface=` | `WorldPage.tsx:81` | 仅 `import.meta.env.DEV` | 正确门控 |
| `EnvName` 白名单 | `types/index.ts:3–9` | — | 与 `.env.example` 六项一一对应 |

### 2.5 localStorage / sessionStorage

| key | 读 | 写 | 形状（存储层） | 默认 / 迁移 |
| --- | --- | --- | --- | --- |
| `ow-profile-v1` | `WorldPage.tsx:105` `gload` → `loadMerged` | `usePersistedState`（每次变更 + 首帧） | `Profile`（`model.ts:15–23`：world/her/me/anniv/email/lock/status） | `PROFILE_DEFAULT`（`profile.ts:7–15`，含假邮箱 `us@ourworld.love`、假伴侣名）；`world/anniv` 被 DB 覆盖后仍在此保留一份「离线兜底」（`WorldPage.tsx:206`）。无版本迁移，仅 merge |
| `ow-widgets-v1` | `WorldPage.tsx:52–60` `loadWidgets`（**裸 `localStorage.getItem`**，未走 local-store） | `usePersistedState` | `Record<string,boolean>` | 键集 `REQUIRED+ADDON`（`:48–49`）与 `rail.tsx:32–36` `MODULE_DEFS`（含 `presence`）不一致（已在 FINDINGS L47 登记，不重开） |
| `ow-dates-v1` / `ow-alarms-v1` | `WorldPage.tsx:107–108` `loadJson` | `usePersistedState` | `CalEvent[]` / `Alarm[]` | 种子首帧即写入，种子相对日期被冻结（A-15） |
| `ow-tweaks-v1` | `tweaks.ts:41` `loadMerged` | `tweaks.ts:53` | `Tweaks` | 无枚举校验（A-15） |
| `ow-image-slots-v1` | `image-slot.js:17` | `image-slot.js:24` | `{[slotId]: dataUrl \| {u,s,x,y}}` | 设置页头像槽 `set-ava-her/me`（`settings.tsx:265/273`）落此，纯本地 |
| `ow-explicit-logout`（session） | `ProtectedRoute.tsx:44` | `settings.tsx:227`（写）/`ProtectedRoute.tsx:59`（清） | `'1'` | 退出失败时不回滚（A-01） |

## 3. 发现

每条：文件:行 · 问题与触发条件 · 影响 · 证据等级 · 建议改法与代价 · 优先级 · 验收条件。P0 = 数据丢失/越权；P1 = 用户可见的功能性错误或明显误导；P2 = 健壮性、契约漂移、维护成本。本分区无 P0。

### A-01 · 退出账号忽略 `signOut()` 的返回错误，断网时卡死在「正在退出…」 — P1

- **位置**：`src/themes/cinnaglass/settings.tsx:223–237`；auth-js `GoTrueClient.js:1584–1606`。
- **问题与触发**：`logout` 用 `try { await supabase.auth.signOut() } catch` 包裹，但 supabase-js v2 的 `signOut()` **不抛**，它返回 `{ error }`；代码不读返回值。auth-js `_signOut` 先打 `/auth/v1/logout`（`:1593`），若错误不是 401/403/404 的 `AuthApiError`（断网时是 `AuthRetryableFetchError`），直接 `return { error }`（`:1600`），**不执行 `_removeSession()`**（`:1605`）。于是：断网/服务端 5xx 点退出 → 无事件、本地会话仍在、`loggingOut` 永远 true（副标题停在「正在退出…」，`:374`），`ow-explicit-logout='1'` 已写入且不回滚。
- **影响**：用户以为退出失败却没有任何提示，且下一次点击被 `if (loggingOut) return`（`:224`）吞掉，只能刷新。dev 模式下该 tab 的自动登录也被永久关闭。
- **证据**：静态（auth-js 源码 + 组件代码）。
- **建议**：`const { error } = await supabase.auth.signOut(); if (error) { setLoggingOut(false); 显示错误; sessionStorage.removeItem('ow-explicit-logout'); }`；若要「断网也能退出」，失败后再调一次 `signOut({ scope: 'local' })`（只清本地，不打服务端）。文件级改动，≤10 行；同时把 `console.warn` 换成 `Logman.warn`（见 A-19）。
- **验收**：DevTools 离线 → 点退出 → 出现错误文案、按钮可再点；联网后再点 → 跳 `/login`。

### A-02 · `currentUserId()` 走 `auth.getUser()` 网络往返，断网被误报为「未登录」；每次数据写都多一跳 — P1

- **位置**：`src/lib/supabase.ts:10–15`；调用方 `worlds.ts:18/34`、`posts.ts:37`、`chat.ts:67–132`、`emotes.ts:44`、`friends.ts:25–49`；auth-js `GoTrueClient.js:1268–1305`。
- **问题与触发**：`getUser()` 对 `/auth/v1/user` 发请求；断网时 auth-js 把 `AuthRetryableFetchError` 包成 `{ data: { user: null }, error }` 返回（`:1295–1303`），`currentUserId` 只看 `data.user?.id`、**忽略 `error`**，于是抛出调用方传入的「未登录，无法进入世界。」。链路：`ProtectedRoute` 已用本地 `getSession()` 确认过有会话 → 进 `WorldPage` → 大厅显示「进入大厅时出了点问题 / 未登录，无法进入世界。」（`lobby.tsx:168–170`），与真实原因（网络）相反。同一模式让每一次发帖/发消息/建世界都多一个 auth 往返，而 PostgREST 本就会校验 JWT，客户端再问一次服务端「我是谁」不增加任何安全性。
- **影响**：错误文案误导；弱网下每个写操作先慢一拍、并可能因 auth 端点抖动而失败。
- **证据**：静态（auth-js 源码）。已知线索「`getMyWorld()` 未登录误报」**成立**。
- **建议**（接口级，单点）：`currentUserId` 改为 `const { data: { session }, error } = await supabase.auth.getSession()`（本地读，必要时自动刷新 token）；`if (error) throw error`；无 session 才抛「未登录」。若坚持服务端校验，则至少在 `error` 非空时抛 `new Error('网络好像断了，稍后再试。')` 而不是「未登录」。代价：一处改动，六个 lib 调用方零改动。
- **验收**：离线进入 `/` → 大厅错误文案为网络类；`getMyWorld` 不再产生 `/auth/v1/user` 请求。

### A-03 · 设置页「账号与密码」整组是假的：改密假成功、邮箱是 localStorage 假值、应用锁无人执行 — P1

- **位置**：`src/themes/cinnaglass/settings.tsx:205–217`（`savePw`）、`:313`（「上次更新于 3 个月前」硬编码）、`:295–301`（邮箱输入绑定 `p.email`）、`:353–364`（应用锁）；`profile.ts:12`（`email: 'us@ourworld.love'`）。
- **问题与触发**：① `savePw` 只 `setSaved(true)` 并清空输入，**从不调用 `supabase.auth.updateUser`**（全仓 `updateUser` 只在 `ResetPasswordPage.tsx:40`）；「当前密码」根本没被验证。② 邮箱行编辑并保存的是 `ow-profile-v1.email`，初值假邮箱 `us@ourworld.love`，永远不是 `session.user.email`；用户改了也不影响账号。③ `lock` 只在本文件读写，无任何门（grep：`.lock` 仅 `settings.tsx:359/361`），开关文案「进入小世界需要密码」是空承诺。
- **影响**：用户以为改了密码/邮箱/上锁，实际都没发生——安全相关的假反馈。
- **证据**：静态。已知线索「`savePw` 假成功」**成立**（`ai/TODO.md:25` 已登记；本条补充邮箱与应用锁两项）。
- **建议**：改密：复用 `ResetPasswordPage` 的模式 `await supabase.auth.updateUser({ password: pw.a })`，检查 `{error}`；「当前密码」要么删掉，要么先 `signInWithPassword({email: user.email, password: pw.cur})` 做本地重认证（多一次请求）。邮箱：从 `useAuth().user.email` 只读展示（`SettingsScreen` 需要接 `user` prop 或在内部调 `useAuth`），删掉 `Profile.email`。应用锁：没有产品设计前整行删除。「上次更新于」删掉或用 `user.updated_at`。代价：settings.tsx 30 行内；`Profile` 类型减一字段（`model.ts:20`）需同步 `PROFILE_DEFAULT`。
- **验收**：改密后用新密码能登录；邮箱行显示登录邮箱且不可编辑；应用锁行消失或真的挡门。

### A-04 · 昵称编辑写 localStorage、界面却优先显示 DB 名字：改了看不见；`profiles.display_name` 全仓只读 — P1

- **位置**：`settings.tsx:264–279`（`PersonRow` → `set('her'|'me')` → `ow-profile-v1`）；`WorldPage.tsx:196–197`（`me: memberNames.me ?? profile.me`）；`useWorldSession.ts:84–103`；`profiles.ts`（只有 select）。
- **问题与触发**：当 DB `profiles.display_name` 非空（`handle_new_user` 是否填、Google 登录会填 — 待核线上），`liveProfile.me/her` 取 DB 值；设置页输入框显示并修改的是 localStorage 值。用户在设置里把「知夏」改成「阿夏」→ 房间、聊天、纪念卡全部不变；只有 DB 名为空时才「碰巧生效」。另外「她」的昵称是**对方的档案**，由我本地改写没有任何意义。
- **影响**：核心身份编辑功能失效或行为随 DB 状态漂移；`PROJECT.md:93` 已承认「欠：昵称写回 display_name」。
- **证据**：静态。已知线索「`display_name` 从不写回」**成立**。
- **建议**（接口级）：`profiles.ts` 增 `updateMyDisplayName(name)`（`update profiles set display_name where id = auth.uid()`，依赖 profiles 的 update RLS——待核线上）；设置页「我」的输入框改为 DB 优先值 + 失焦/保存时写回并 `setMemberNames`；「她」改为只读展示。代价：lib 一函数、settings 一处、`useWorldSession` 暴露一个 `applyMyName`。
- **验收**：改昵称 → 刷新后房间与聊天作者名一致；对方端刷新后也看到新名。

### A-05 · 世界设置弹窗不可达（组件常驻、无入口） — P1

- **位置**：`world-surfaces.tsx:86–92`（唯一挂载）、`useSurfaceRouter.ts:39–52`（`onRail`/`onHotspot` 无分支）、`rail.tsx:14`（`RailKey` 无对应键）、`world-settings.tsx:6–7`（自述无入口）。
- **问题与触发**：grep 全仓 `'world-settings'` 只命中 `world-surfaces.tsx:87` 的 `open={screen === 'world-settings'}`；无任何 `open('world-settings')`。于是 `updateWorld`、`uploadWorldIcon`、`WorldPatch`、`onWorldSaved`/`applySavedWorld` 全链为死代码（tsc 看不出来，因为组件被挂载了）；世界名/纪念日/icon 目前只能靠 SQL 改。
- **影响**：用户无法设置纪念日 → `MomentCard` 在 `anniversary` 为 null 时直接不渲染（`floaters.tsx:30`），日历纪念区靠 `PROFILE_DEFAULT.anniv='2025-06-04'` 假日期兜底。
- **证据**：静态。已知线索**成立**（`ai/TODO.md:26` 已登记）。
- **建议**：最小入口：`SettingsScreen` 里加一行「世界设置 ›」按钮，回调 `onOpenWorldSettings`，由 `WorldSurfaces` 传 `() => open('world-settings')`（需 `useSurfaceRouter` 把 `open` 传到 `WorldPage` → `WorldSurfaces`，目前 `open` 已返回但 `WorldPage` 没接）。或 `RailKey` 加 `'world'`。代价：三文件各几行。
- **验收**：进世界 → 设置 → 世界设置 → 改纪念日保存 → 纪念卡与日历同步（对应 INDEX「运行时验收清单」第五项）。

### A-06 · 「已保存，你们俩都会看到」但 `worlds` 行没有任何实时同步，对方要刷新才看到 — P2

- **位置**：`world-settings.tsx:336`（文案）；`useWorldSession.ts:35–55`（只在挂载/`lobbyTick` 拉一次）；grep 全仓无 `worlds` 的 Realtime 订阅（`chat.ts:200` 只订 `world:{id}` 的消息类事件；DB 触发器是否广播 `worlds` 变更——待核线上）。
- **问题与触发**：A 端保存 → B 端 `world` 状态不变：房间名、纪念卡、日历、`MusicMini spaceName` 都是旧值，直到 B 刷新或回大厅再进（`enterWorld` 在有 world 时也不重拉，`:115`）。
- **影响**：文案承诺与行为不符；两端纪念日不一致。
- **证据**：静态。
- **建议**：三选一（按代价升序）：a) 文案改成「已保存」；b) `enterWorld` 每次都重拉 + `visibilitychange` 时重拉（客户端即可）；c) 在 `world:{id}` 广播里加 `worlds` 更新事件（需 DB 触发器，线上改动）。
- **验收**：双端各开一窗，A 改名后 B 在 c) 下即时、b) 下切回 tab 后看到新名。

### A-07 · `World.name` 类型非空但代码到处 `??` 防御；`createWorld` 只插 `owner_id`，`name` 是否有默认值待核 — P2

- **位置**：`types/feed.ts:31`（`name: string`）；`worlds.ts:36`（`insert({ owner_id })`）；`WorldPage.tsx:194`（`world?.name ?? profile.world`）；`world-settings.tsx:110–115`（`w?.name ?? ''`）、`:187`（`(draft.name || world.name).slice(0, 1)`）、`:206`（`draft.name.trim() || world.name`）。
- **问题与触发**：若线上 `worlds.name` 可空且无默认（`PROJECT.md:108` 未写默认值），新建世界的 `name` 为 null：`:187` 在草稿名为空时 `null.slice` 抛 TypeError → 整个 `WorldPage` 树白屏（无 ErrorBoundary，A-17）；`:206` 会把 null 写回。若线上 NOT NULL DEFAULT，则 `??` 是多余防御、类型才是对的。两种世界只能对一个。
- **影响**：类型与运行时契约二选一未定；潜在白屏。
- **证据**：待验证（待核线上 DDL）。
- **建议**：核 DDL 后二选一：a) 确认 NOT NULL DEFAULT → 删防御，`PROJECT.md` 表格补「默认值」列；b) 可空 → `name: string | null`，`createWorld` 显式插 `name: '我们的小世界'`。零成本决策，先核再动。
- **验收**：`tsc` 零错误且 `world-settings.tsx:187/206` 不再需要 `||`。

### A-08 · icon 续签周期与 `SIGNED_URL_REFRESH_MS` 重复定义；无 `visibilitychange` 续签；路径切换时旧 URL 闪现 — P2

- **位置**：`useWorldSession.ts:16`（`ICON_RESIGN_MS = 40*60*1000`）vs `storage.ts:15`（`SIGNED_URL_REFRESH_MS = TTL*2/3` = 同一个 40 分钟）；`useWorldSession.ts:62–79`；对照 `use-signed-thumbs.ts:31–39`。
- **问题与触发**：`CONVENTIONS.md`「签名续签周期由 `SIGNED_URL_REFRESH_MS` 派生自 TTL」在此未落实，改 TTL 时两处会漂。后台 tab 定时器被节流后回前台 icon 可能已过期，而时间线有 `visibilitychange` 重签、icon 没有（`PROJECT.md:123` 却把「tab 重可见重签」写成通用行为）。另外 `iconPath` 从 A 换成 B 时 `signedIcon` 仍是 A 的 URL，`worldIconUrl = iconPath ? signedIcon : null`（`:61`）会先显示旧图直到新签名返回。
- **证据**：静态。
- **建议**：`import { SIGNED_URL_REFRESH_MS } from '@/lib/storage'`；把 `use-signed-thumbs` 的「定时 + 可见」逻辑抽成 `useSignedUrls(paths)` 供两处用（它已存在于分区 B，改动是把 icon 接上去）；路径变化时先 `setSignedIcon(null)`。代价：≤20 行。
- **验收**：grep 只剩一个 40 分钟常量；后台 2h 后切回，icon 不 403。

### A-09 · 成员档案 effect 依赖 `world` 对象身份，每次世界设置保存都重拉 profiles — P2

- **位置**：`useWorldSession.ts:84–103`（deps `[world, uid]`）；`applySavedWorld`（`:140`）每次换新对象。
- **问题与触发**：保存世界设置 → `setWorld(updated)` → `world` 引用变 → `getProfilesByIds` 再发一次请求（成员没变）。StrictMode 下开发期再翻倍。
- **影响**：多余请求；`memberNames` 短暂被重置后再填（不闪，因 set 在 then 内）。
- **证据**：静态。
- **建议**：deps 改 `[world?.owner_id, world?.member_id, uid]`。一行。
- **验收**：Network 面板保存世界设置时无 `profiles` 请求。

### A-10 · 大厅把 PostgREST / 触发器原文当用户文案；「已属于其他世界」时的正确恢复是重拉而不是报错 — P2

- **位置**：`useWorldSession.ts:47/128`（`e.message` 直出）；`lobby.tsx:170/178/187`；`worlds.ts:24`（`maybeSingle` 多行 → PGRST116）、`:36`（`check_world_uniqueness` 异常文本——待核线上）。
- **问题与触发**：伴侣刚把我拉进世界（SQL 配对）而我停在「还没有你们的小世界」卡片点创建 → 触发器拒绝 → 大厅显示英文 DB 错误；此时正确动作是 `retryLobby()`。断网时显示「未登录…」（A-02）。
- **证据**：静态。
- **建议**：`createAndEnter` catch 内：若错误 `code` 为触发器/唯一约束类（核线上后定死列表）→ `retryLobby()`；其余走一个小的 `describeError(e)`（见 §4）。代价：≤15 行。
- **验收**：模拟已在世界的账号点创建 → 大厅直接切到「已就绪」。

### A-11 · 登录/注册/找回的错误与成功语义直出 Supabase 英文或与实际状态不符 — P2

- **位置**：`LoginPage.tsx:72/91/115`（`error.message` 直出：`Invalid login credentials`、`Email not confirmed`、`Failed to fetch`…）；`:104–108`（注册成功文案）；`:66–73`（Google 无 busy 保护）；`ResetPasswordPage.tsx:45`。
- **问题与触发**：① 中文界面里出现英文错误；断网是 `Failed to fetch`。② 邮箱确认开着时，用已存在邮箱注册，Supabase 返回混淆的「成功」（不发信）→ 页面说「注册成功 ✿ 请查收邮件」。③ 邮箱确认关着时 `signUp` 直接建立会话（`onAuthStateChange` 已 SIGNED_IN），页面却停在 `/login` 让用户再点一次登录；且已登录用户访问 `/login` 不重定向。④ `handleGoogle` 双击发两次 `signInWithOAuth`。⑤ `email` 未 `trim()`。
- **证据**：静态（②③ 为 Supabase 文档行为，待核线上项目设置）。
- **建议**：一个 `authErrorText(err)`（映射 `AuthRetryableFetchError`/`TypeError` → 网络、`invalid_credentials` → 邮箱或密码不对、`email_not_confirmed` → 先去确认邮件；其余回落 `err.message`）放 `src/lib/auth-errors.ts`（零 React，符合 lib 约定），三个页面 + 大厅共用；`signUp` 成功后若 `data.session` 非空直接 `navigate('/')`；`LoginPage` 顶部 `if (user) return <Navigate to="/"/>`（需 `useAuth`）；Google 按钮加 `busy`。代价：新文件 ~30 行 + 页面各几行。
- **验收**：断网登录 → 中文网络提示；关确认的项目注册后直接进大厅。

### A-12 · 密码规则三处不一致：找回页 ≥6、设置页 ≥4、注册无校验 — P2

- **位置**：`ResetPasswordPage.tsx:29`（6）；`settings.tsx:208`（4）、`:332`（文案「至少 4 位」）；`LoginPage.tsx:105`（无）。服务端最短长度待核线上（Supabase 默认 6）。
- **影响**：设置页允许 4 位而服务端会拒（一旦 A-03 接通就会暴露）；注册时错误由服务端英文报回。
- **建议**：`export const PASSWORD_MIN = 6` 放 `src/lib/auth-errors.ts` 或 `types`，三处引用；注册前本地校验。
- **验收**：三处 grep 同一常量。

### A-13 · dev 自动登录凭据未与 `import.meta.env.DEV` 绑定；`.env.local` 存在时会被 `vite build` 打进 dist；StrictMode 双发、`.finally` 漏 catch — P2

- **位置**：`ProtectedRoute.tsx:15–19`、`:68–77`；`.env.example:5–9`；`.gitignore:13`。
- **问题与触发**：① `DEV_AUTO_LOGIN` 只看 `VITE_DEV`，Vite 对所有模式都加载 `.env.local`，在本机有 `.env.local` 的机器上 `pnpm build` 会把 `VITE_DEV_PASSWORD` 明文内联进 `dist/assets/*.js`（仓库本身安全：`*.local` 已 ignore，实测 `git check-ignore`）。② 开发期 StrictMode 让 effect 跑两次：第一次的 `signInWithPassword` 请求已发出、`cancelled=true` 只是不置 `devTried`，第二次再发一次（两次登录请求，两次 SIGNED_IN）。③ `signInWithPassword` 网络异常时会 reject，`.finally()` 后无 `.catch` → 未处理拒绝打到控制台。④ 自动登录失败（密码错）静默落到 `/login`，无说明。
- **证据**：静态。已知线索「`ProtectedRoute` dev 自动登录语义」：**成立**为「真实会话而非跳过」（`:2–7` 注释与代码一致），本条是其边角。
- **建议**：`const DEV_AUTO_LOGIN = import.meta.env.DEV && getEnvFlag('VITE_DEV') && …`——生产构建时 `import.meta.env.DEV` 为字面量 `false`，esbuild 会把整个分支和两个凭据常量当死代码删掉；`.then(({error}) => error && Logman.warn(...)).catch(...)`。代价：3 行。
- **验收**：本机放 `.env.local` 后 `pnpm build`，`grep -r VITE_DEV_PASSWORD dist/` 为空。

### A-14 · `useLiveClock` 挂在 `WorldPage` 根上，整个壳层每秒重渲染一次，只有时钟弹窗读它 — P2

- **位置**：`WorldPage.tsx:109`（`nowTs` state）、`:313`（只传给 `WorldSurfaces`）→ `world-surfaces.tsx:73` → `calendar.tsx:342`（唯一消费）。
- **问题与触发**：`setNowTs` 每秒触发 `WorldPage` 重渲染 → `ChannelScreen`（30 余个 props，`:324–356`）、`WorldSurfaces`、`Rail`、`ChatCard`、`RoomScene`（内含 Pixi）全部走一遍 render（无 `memo`）。时钟弹窗关闭时也在跑。
- **影响**：常驻 1 Hz 无意义渲染；对话框动画期间可能掉帧（未实测）。
- **证据**：静态。
- **建议**：把 `useLiveClock()` 移进 `ClockScreen`（`calendar.tsx:325`）并 `if (!open) return` 或按 `open` 启停；`WorldSurfaces` 删 `nowTs` prop。代价：三文件各几行；`useLiveClock.ts` 头注释「WorldPage stays its only consumer」同步改。
- **验收**：React Profiler 下静止 10 秒 `WorldPage` 零提交。

### A-15 · 持久化切片不做枚举/形状校验；`loadWidgets` 绕开 `local-store`；种子日期首帧即冻结 — P2

- **位置**：`tweaks.ts:41`（`loadMerged` 直接信任存储值）→ `useWeather.ts:83`（`MANUAL_WX[tweak]` 对非法值为 `undefined` → `weather.kind` 为 `undefined` 传给 `RoomScene`）、`WorldPage.tsx:218`（非法 `mood` → `data-mood` 无匹配，静默退到基础层）；`WorldPage.tsx:52–60`（裸 `localStorage.getItem` + `JSON.parse`，与 `loadMerged` 语义相同）；`usePersistedState.ts:14–16`（首帧就 `saveJson`）+ `WorldPage.tsx:70–73`（`SEED_EVENTS` 用相对日期）。
- **问题与触发**：手改 localStorage 或未来改枚举名（`ow-tweaks-v1` 没有 v2 迁移路径）→ 运行时出现类型系统承诺不存在的值。`loadWidgets` 是 PA-023「localStorage 读写收口到 local-store」漏掉的一处。种子事件「3 天后 / 9 天后」在第一次打开时写死，之后永远是过去的日期。
- **证据**：静态。
- **建议**：`tweaks.ts` 加 `sanitize(t)`：每个字段不在联合里就取默认（四个 `includes` 判断）；`loadWidgets = () => loadMerged('ow-widgets-v1', base)`；种子要么不写回（首帧跳过 save），要么标记为演示数据。代价：≤20 行。
- **验收**：`localStorage.setItem('ow-tweaks-v1','{"weather":"fog"}')` 后刷新，房间天气回落 `auto`。

### A-16 · 世界设置：上传成功后更新失败留孤儿对象；对象 URL 关闭不回收；错误映射依赖 Chrome 的错误名；无前置体积/日期校验 — P2

- **位置**：`world-settings.tsx:196–210`（两步写）、`:158–184`（`revokeObjectURL` 只在替换时）、`:141–152`（重开时 `setFilePreview(null)` 不 revoke）、`:198–202`（只映射 `InvalidStateError`）、`:206–207`、`:320–326`（`type=date` 无上限）；`storage.ts:94`。
- **问题与触发**：① `uploadWorldIcon` 成功、`updateWorld` 失败（RLS/网络）→ 桶里多一个没人引用的 `icon-*.webp`（作者已在 `storage.ts:90–91` 接受，但没有清理路径）。② 选图后不保存直接关闭 → blob URL 泄漏到页面卸载。③ Firefox 对非图片 `createImageBitmap` 的错误名不一定是 `InvalidStateError`，会露出原始英文。④ 未来日期的纪念日被接受，`daysSince` 用 `Math.max(1, …)` 掩盖（`profile.ts:40`）。⑤ 名字清空时静默保留旧名（`:206`），用户没有反馈。
- **证据**：静态（③ 待验证）。
- **建议**：① 更新失败时 `storage.remove([iconPath])` 尽力回滚（一行 `.catch(()=>{})`）；② `useEffect(() => () => filePreview && URL.revokeObjectURL(filePreview), [filePreview])`；③ 映射条件改为「`uploadWorldIcon` 在 `createImageBitmap` 阶段抛」——在 `storage.ts` 内 catch 并抛 `new Error('这张图片打不开…')`，UI 不猜错误名；④ `max={today}`；⑤ 空名时禁用保存或提示。代价：合计 ≤25 行。
- **验收**：断网保存有图的草稿 → 桶内无新对象；Firefox 选 .txt → 中文提示。

### A-17 · `App.tsx` 无兜底路由、无 ErrorBoundary；`getEnv` 缺失时白屏无提示 — P2

- **位置**：`App.tsx:10–21`；`utils/index.ts:5–11`（模块求值期抛）；`supabase.ts:6`。
- **问题与触发**：访问 `/anything` → 空白页；任何渲染期异常（如 A-07）→ 整树卸载白屏；`.env` 缺失 → 控制台一条 `Missing required environment variable` 后白屏。
- **证据**：静态。
- **建议**：`<Route path="*" element={<Navigate to="/" replace/>}/>`；一个 20 行的 `ErrorBoundary` 包住 `<Routes>`，展示「出错了 · 刷新」；env 缺失保持抛（部署错误应该响），但可在 `main.tsx` 里 try/catch 渲染一句说明。代价：≤40 行。
- **验收**：`/xyz` 回到 `/`；人为在 `WorldPage` 抛错看到兜底页。

### A-18 · 单人世界也渲染一个「在你身边 · 在线」的假伴侣 — P2（产品口径）

- **位置**：`WorldPage.tsx:235–243`（`presence.pink.online: true`、`status: '在你身边'`，`name: liveProfile.her`）；`liveProfile.her = memberNames.her ?? profile.her`（`:197`）→ `member_id` 为 null 时 `memberNames.her` 为 undefined → 回落 `PROFILE_DEFAULT.her = '小满'`（`profile.ts:9`）。
- **问题与触发**：solo owner 进房间，场景里出现一个叫「小满」的在线伴侣；聊天作者名同理可能是假名。`PROJECT.md:124` 只说 Presence 是占位，没提 solo 场景。
- **证据**：静态。
- **建议**：`member_id === null` 时 `presence` 传 `null`/不渲染胶囊，或改文案「等她来」；属产品决定，标记给 INTJ。代价：条件一行。
- **验收**：solo 世界无第二人。

### A-19 · 小项合集（各一行改动） — P2

- `settings.tsx:234` 用裸 `console.warn` 而不是 `Logman.warn`（`logman.ts:12`，本分区唯一违例）。
- `login-backdrop.tsx:487` `weather?: string` 应为 `WeatherKind`（`model.ts:7`）；两个调用点（`LoginPage.tsx:124`、`ResetPasswordPage.tsx:54`）都不传，默认 `'cloud'` 又没有 `[data-wx='cloud']` 规则（`cinnaglass.css:798–846` 只有 sun/rain/snow）——要么删 prop，要么收窄类型。登录页也没有 `[data-mood]` 祖先，`.mood-*` 层只走基础层（`cinnaglass.css:67`），属预期。
- `sql/dev-create-world.sql:9` 引用 `ai/features/world.md R-6`，该文件不存在（`ls ai/features/` 无 `world.md`）；R-6 现引用点在 `supabase.md:41`。
- `useWorldSession.ts:154` 返回 `retryLobby`，`WorldPage` 未消费（只经 `enterWorld` 间接用）；可从返回值删除或让大厅「重试」直接用它而不是复用 `onEnter`（`lobby.tsx:171` 重试与进入共用一个回调，语义靠 `world` 为 null 撑着）。
- `ResetPasswordPage.tsx:43` 的 `setTimeout(navigate)` 与 `world-settings.tsx:214`、`settings.tsx:213` 的定时器卸载不清理（React 19 下无警告，仅可能对已卸载组件 setState，无害）。
- `index.html:6` `maximum-scale=1.0, user-scalable=no` 禁止缩放（无障碍角度不建议；非本分区维度，记录备查）。

### A-20 · 默认 `weather: 'auto'` 会把用户经纬度发给第三方 `api.open-meteo.com`，除浏览器定位弹窗外无应用内说明 — P2（隐私备查）

- **位置**：`tweaks.ts:35`（默认 `'auto'`）→ `useWeather.ts:48–53`（`fetch('https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…')`）。
- **问题**：第一次进世界即请求定位并把坐标放在第三方 URL 查询串里（`maximumAge: 6e5` 缓存 10 分钟）。链路本身健壮（7s 兜底、取消标记、`.catch` 覆盖 `d.current` 缺失的 TypeError）。
- **建议**：设置页「天气」选项旁一句「自动 = 使用你的位置向 open-meteo 查询」；或默认改 `'cloud'`。产品决定。

## 4. 中间件/适配器判断

只有两处横切关注点值得一个小适配器，其余直接调用就够。

1. **认证态与「我是谁」——已有单点，改语义即可，不加层。** `lib/supabase.ts:currentUserId` 已经是六个数据模块共用的入口（`worlds/posts/chat/emotes/friends`），A-02 的修法就是在这一个函数里把 `getUser()` 换成 `getSession()` 并区分网络错误；不需要新的 auth 中间件或 React Context——`useAuth` 已是 UI 侧的唯一会话源，`ProtectedRoute` 是唯一的门。成本：0 新文件。
2. **错误文案映射——值得一个 30 行的纯函数模块。** 目前 6 个用户可见的错误出口（`LoginPage.tsx:72/91/115`、`ResetPasswordPage.tsx:45`、`useWorldSession.ts:47/128`、`world-settings.tsx:216`、A-01 修后的 `settings.tsx`）都把 `err.message` 直出。建议 `src/lib/auth-errors.ts` 导出 `describeError(e: unknown): string` + `PASSWORD_MIN`：识别 `AuthRetryableFetchError` / `TypeError('Failed to fetch')` → 网络；auth-js `AuthApiError.code`（`invalid_credentials`、`email_not_confirmed`、`weak_password`…）→ 中文；PostgREST `code`（`PGRST116`、`23505`、触发器 `P0001`）→ 中文或「重试」；其余回落原文。依赖方：上述页面与 hook。它是零 React 的 lib，符合 `CONVENTIONS.md` 的分层。成本：新文件 + 每处一行替换；不需要拦截器或全局 fetch 包装。
3. **签名 URL 续签——复用而不是新建。** 分区 B 的 `use-signed-thumbs.ts` 已实现「定时 + 可见时重签」；icon 需要的是同一件事（A-08），把它泛化成 `useSignedUrls(paths: string[])` 后两处共用即可，不需要单独的「Storage 适配层」。
4. **不建议**：为 PostgREST 调用加统一 repository/DTO 映射层。本分区只有 `worlds`（3 个函数）与 `profiles`（1 个函数），`World`/`FeedProfile` 传输即领域的做法在这个规模下是正确的；A-07 的可空性问题应该靠核 DDL 后修类型解决，而不是加一层映射来遮。

## 5. 不适用与受限项

- **运行时实测全部不可用**：本机无 `.env.local`，应用停在 `/login`；Supabase MCP 401。因此 A-01、A-02 依据 auth-js 2.98.0 源码；A-07、A-10、A-11②③、A-16③ 需线上或浏览器实测才能定级为「实测」。
- **线上 DDL / RLS / 触发器 / Auth 设置未核**（本文所有「待核线上」）：`worlds.name` 默认值与可空；`worlds` insert/update RLS 是否允许 member 更新；`profiles` update RLS；`handle_new_user` 是否填 `display_name`；`check_world_uniqueness` 的异常码与文本；Auth 的 redirect 允许列表、密码最短长度、邮箱确认开关；DB 触发器是否对 `worlds` 变更广播。
- **`src/lib/storage.ts`** 只审 `uploadWorldIcon` 及其直接依赖（`dataUrlToBlob`/`newId`/`signImageUrls`），`uploadMemoryImage`/缩略图属分区 B。
- **`login-backdrop.tsx`** L1–484 为静态几何与配色，本分区维度（契约/错误/权限/并发）无可审项，只审了导出接口（A-19）。
- **视觉/无障碍**（`index.html` viewport、登录页 mood 层）不在本步维度，只做备注。
- 不重开 FINDINGS / TODO 已登记且本轮核实无新增信息的项：`ow-widgets-v1` 键集与 `MODULE_DEFS` 不一致（FINDINGS L47）；`worlds` 外键 CASCADE（`supabase.md` §二-0）；`allowed_emails` 白名单未执行（§二-1）。

## 6. 复核了的已知线索

| 线索 | 结论 | 证据 |
| --- | --- | --- |
| `settings.tsx savePw` 假成功，从不调 `supabase.auth.updateUser` | **成立** | `settings.tsx:205–217` 只 `setSaved(true)`；全仓 `updateUser` 仅 `ResetPasswordPage.tsx:40`。本轮扩展：同组的邮箱行、应用锁、「上次更新于 3 个月前」同为假（A-03） |
| `world-settings` 弹窗无 UI 入口 | **成立** | grep `'world-settings'` 仅 `world-surfaces.tsx:87` 判定；`useSurfaceRouter.ts:39–52` 与 `rail.tsx:14` 无对应键；`world-settings.tsx:6–7` 自述（A-05） |
| `worlds.status` 列 selected / not selected | **成立：不 select 也不写** | `worlds.ts:11` `WORLD_COLS` 无 `status`；`insert({owner_id})` 依赖默认 `pending`；只有 `sql/dev-create-world.sql:26–30` 写 `'active'`。前端没有任何依赖 `status` 的分支，因此暂无功能影响；R-6 邀请流程落地前不需要 select |
| `profiles.display_name` 从不写回 | **成立** | `profiles.ts` 只有 `select`；grep 无 `from('profiles').update/upsert`；设置页昵称落 `ow-profile-v1`（A-04，含「DB 优先显示导致本地编辑不可见」的新后果） |
| 纪念日单一真源（`world.anniversary`）在第二步后 | **成立（已收口），带一个前提** | `WorldPage.tsx:196` 合成 `world?.anniversary ?? profile.anniv` 后统一下发：`MomentCard`（`:277`）、`WorldSurfaces.anniv`（`:308`）→ `CalendarScreen`（`calendar.tsx:132/156–157`）；日期数学只在 `profile.ts:30–52`；`calendar.tsx` 无硬编码 `ANNIV`。前提：DB 为 null 时仍回落 `PROFILE_DEFAULT.anniv='2025-06-04'` 这个假日期（`profile.ts:11`），而 A-05 让用户目前无法设置真值——所以线上多数情况显示的仍是假纪念日 |
| `ProtectedRoute` dev 自动登录语义 | **成立：真实 `signInWithPassword` 会话，不是跳过鉴权** | `ProtectedRoute.tsx:2–7` 注释与 `:19/:71` 代码一致；`ow-explicit-logout` 让退出粘住（`:42–48`）。边角问题：未与 `import.meta.env.DEV` 绑定、StrictMode 双发、`.finally` 无 catch（A-13） |
| `getMyWorld()` 断网时误报「未登录」 | **成立** | `supabase.ts:11–13` 忽略 `getUser()` 的 `error`；auth-js `_getUser` 在 `AuthRetryableFetchError` 时返回 `{data:{user:null}, error}`（`GoTrueClient.js:1295–1303`）→ 抛「未登录，无法进入世界。」→ `lobby.tsx:168–170`（A-02）。同一根因覆盖 `ai/TODO.md:143` 的发帖误报 |
