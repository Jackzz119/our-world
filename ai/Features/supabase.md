# Supabase 结构审计与后端规划 设计文档

> ## 🟡 文档状态（2026-08-22 恢复，待复核）
>
> **在役活文档，但正文是 2026-07-04 的审计快照**。本文于重定位提交 `7c93c3c` 中随 `ai/Features/` 一并被误删（原计划 `ai/reboot/tech-plan.md` §119 是要保留的），现原样恢复，正文逐字未改。
>
> ⚠️ **正文已不代表当前线上结构**：7-04 之后新增了 `channels` / `messages` / `message_reactions` / `channel_reads` / `world_emotes` / `friendships` 六张表、`worlds` 的 `name/anniversary/icon_emoji/icon_path` 四列、`find_profile_by_email` RPC、`emotes` Edge Function，且 `get_feed_posts` 已加游标分页参数。**这些迁移都是经 MCP 直接打到线上的，仓库里没有 migration 历史**（`sql/` 只剩两份早期脚本）。
>
> **当前结构的临时真源**：`ai/PROJECT.md` §数据库（2026-08-21 按前端 `*_COLS` 反查所得，未经线上 DDL 复核）。
>
> **待办（2026-08-22 计划）**：连上 Supabase MCP 拉一次真实表结构/RLS/触发器，回填进本文第一章，届时本文重新成为后端结构的唯一真源，PROJECT.md 改为摘要 + 引用。
>
> **2026-08-22 执行尝试记录**：当日会话为长寿旧会话，MCP 服务器中途断开后**工具不会向已开会话重新注册**，两次 ToolSearch 均无果；改试 PostgREST OpenAPI 自省（`GET /rest/v1/` + anon key）被平台拒——**该端点现仅接受 service_role**（`Only the service_role API key can be used for this endpoint`，实测 401）。这顺带确认了一个正面安全事实：REST 结构对匿名/普通用户不可枚举。**2026-09-05 根因确认**：宿主诊断 `AUTH_HEADER_REJECTED (401)`；用 `.claude/settings.local.json` 里的 `SUPABASE_ACCESS_TOKEN` 直接请求管理 API `GET api.supabase.com/v1/projects` 亦 401——**是令牌本身失效**（`.mcp.json` 的 `Bearer ${SUPABASE_ACCESS_TOKEN}` 插值正常），不是会话或配置问题。修复二选一：① Dashboard → Account → Access Tokens 重新生成，替换 `settings.local.json` 的 env 值；② 删掉 `.mcp.json` supabase 条目的 `headers` 块改走 OAuth 浏览器授权（宿主在设置了 `headers.Authorization` 时会禁用 OAuth 回退）。修完需重启会话让 MCP 重连。**回填须在带 supabase MCP 的新会话执行**，步骤：`list_tables(verbose)` + `pg_policies`/触发器/函数三查 + `list_edge_functions` + `get_advisors` 刷新三/四章 → 回填本文 §一 → PROJECT.md 数据库节缩为摘要引用。
>
> **三、四章的审计发现仍然有效未修复**（CASCADE 外键、search_path、RLS initplan、FK 索引），要点同步在 `ai/TODO.md` 继承待办。

> 最后更新：2026-07-04
> 定位：**审计/讨论文档**——盘点线上 Supabase 全结构、对照项目设计（channel.md / timeline.md / room.md）找差距，安全/性能顾问发现集中在此，**待专门讨论后再拆 subtask 执行**
> 项目：`xrscspcqnsxvfshskfpy`
> 关联文档：`ai/Features/channel.md`（世界结构）、`ai/Features/timeline.md`（回忆链路）、`ai/Features/room.md`（世界入口）、`ai/Features/chat.md`（聊天）

---

## 一、线上现状清单（2026-07-04 审计时点）

```
表（public，全部启用 RLS）
  allowed_emails   访问白名单（email PK / note / created_at）——仅 select 自己那行
  profiles         用户资料（FK auth.users；trigger handle_new_user 自动建）
  worlds           世界（owner/member/status/intimacy_points；沿革 couples→rooms→worlds）
  posts            回忆（world_id/author/content/images/privacy/unlock_cost）
  post_unlocks     locked 帖解锁记录（复合 PK）

函数            check_world_uniqueness / check_post_author_in_world /
                check_post_unlock_validity / get_feed_posts(p_world_id) /
                handle_new_user (SECURITY DEFINER) / update_updated_at_column
触发器          worlds_check_uniqueness / posts_check_author_in_world /
                posts_updated_at / post_unlocks_check_validity
Storage         memories 桶（私有，25MB，图片 mime）：路径 <world_id>/…，
                四条 "memories: world can …" 策略（2026-07-04 已完成换名）
Realtime        未使用（无 publication 订阅、无 broadcast/presence）
Edge Functions  无
```

## 二、与设计结构的对齐检查

| 设计（文档） | 线上状态 | 结论 |
| --- | --- | --- |
| 世界 = 顶层容器（channel.md） | `worlds` 表，术语迁移已完成（C-3） | ✅ 对齐 |
| 回忆链路（timeline.md ST-A~G） | posts/post_unlocks/get_feed_posts/memories 桶齐全 | ✅ 对齐 |
| 房间/文字/语音频道（channel.md §四） | **无 `channels` 表**（前端 mock） | ⏳ 计划内（C-7，随聊天后端） |
| 聊天持久化（chat.md） | **无 `messages` 表**、Realtime 未开 | ⏳ 计划内 |
| 在场 presence（sidebar 房间头像） | 无（前端 mock） | ⏳ 计划内（Realtime Presence） |
| 邀请 member（room.md R-6） | status 枚举已备（pending/active），无邀请机制 | ⏳ 计划内 |
| 房主删世界踢人（room.md R-7） | 无 realtime 通知路径 | ⏳ 计划内 |

**待讨论的结构问题（下次专门讨论）：**

0. **⚠️ 删号会级联删世界（2026-07-05 删号操作中发现）**：`worlds_owner_id_fkey` / `worlds_member_id_fkey` 都是 `ON DELETE CASCADE`——**member 删号会把整个世界行连带删除**（回忆 posts 再级联全灭）。语义应该是：member 删号 → `SET NULL` + status 回退 pending（人走了世界还在）；owner 删号才值得讨论是否删世界。本次删号已手动先拆链避开（member 置 null + status='pending' 后再删用户）。修复 = 一条 `alter table ... drop constraint / add constraint ... on delete set null` 迁移，建议与安全加固一起做。

1. **白名单未强制执行**：`allowed_emails` 表在，但注册/登录没有任何拦截挂钩——现在任何人注册都能建号（只是进不了别人的世界）。方案候选：a) `auth.users` 上 before-insert trigger 校验 email ∈ allowed_emails；b) 前端登录后校验 + 登出（弱）；c) Edge Function 注册钩子。与 TODO「auth 收口：白名单拦截 + 登出」是同一件事，需定方案。
2. **世界名/昵称未入库**：世界名、两人昵称、纪念日全在前端 localStorage（`ow-profile-v1`），换设备即丢，也无法双人同步。是否加 `worlds.name`（+`anniv`）列、昵称走 `profiles.display_name`？牵动 sidebar/HUD 的数据源。
3. **`intimacy_points` 的归属**：现挂在 worlds 上（世界的属性）。解锁经济（unlock_cost）尚未设计消费/获取链路，确认后再动。
4. **单人世界的 status 语义**：`pending` 同时表示"等待邀请"与"单人使用中"，R-6 邀请流程落地时确认是否需要第三态。

## 三、安全顾问发现（get_advisors security，2026-07-04）

| 级别 | 发现 | 影响 | 建议 |
| --- | --- | --- | --- |
| WARN×6 | 全部 public 函数 `search_path` 可变 | 函数可被 search_path 劫持（需先能建同名对象，本项目风险低但修复零成本） | 统一 `set search_path = ''`（一个 migration） |
| WARN | `handle_new_user`（SECURITY DEFINER）可被 anon/authenticated 经 `/rest/v1/rpc/` 直接调用 | 任何人可代插 profiles 行（实际受 PK 约束限制，但不该暴露） | `revoke execute from anon, authenticated` |
| WARN×10 | 全部表在 GraphQL schema 对 anon/authenticated 可发现 | 表结构可被枚举（行数据仍受 RLS 保护）；两人私密应用宜收紧 | 评估 revoke anon select / 关闭 pg_graphql |
| WARN | 泄露密码保护未开启 | 可用已泄露密码注册 | Dashboard → Auth 开启（HaveIBeenPwned 校验） |

## 四、性能顾问发现（get_advisors performance）

| 级别 | 发现 | 建议 |
| --- | --- | --- |
| WARN×13 | 几乎所有 RLS 策略里 `auth.uid()` 逐行重估（initplan） | 重写为 `(select auth.uid())`（一个 migration 全改） |
| INFO×4 | 无索引外键：`posts.author_id` / `posts.world_id` / `post_unlocks.user_id` / `worlds.member_id` | 补 4 个 btree 索引（数据量小，暂无感知，顺手修） |

> 三、四 的修复都是**低风险单 migration** 可完成（函数 search_path + revoke + 索引 + 策略重写），讨论确认后一次做掉；泄露密码保护是 Dashboard 开关。

## 实现计划

进度：0 / 0 subtasks（审计完成，等专门讨论后拆分执行项）

- 候选 subtask（讨论后定优先级）：S-1 安全加固 migration（search_path + revoke handle_new_user + GraphQL 收紧）；S-2 性能 migration（initplan 重写 + 4 索引）；S-3 白名单强制执行方案；S-4 世界名/昵称入库；S-5 Auth 泄露密码保护开关；**S-6 worlds member/owner 外键 CASCADE → SET NULL（§二-0，删号不该灭世界）**

## 测试记录

（待执行项落地后填写）
