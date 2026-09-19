# Supabase 结构审计与后端规划 设计文档

> ## 🟡 文档状态（正文待 MCP 回填）
>
> **在役活文档，但一章正文是 2026-07-04 审计快照，已不代表线上结构**。曾于提交 `7c93c3c` 随 `ai/features/` 被误删，2026-08-22 恢复，2026-09-19 重整。
>
> **当前结构的临时真源 = `ai/PROJECT.md` §数据库**（2026-08-21 按前端 `*_COLS` 反查，未经线上 DDL 复核）。7-04 后新增了聊天/贴纸/好友六张表、`worlds` 四列、`find_profile_by_email` RPC、`emotes` Edge Function，`get_feed_posts` 加了游标分页（明细见该节）。**这些迁移都经 MCP 直接打到线上，仓库无 migration 历史**，`sql/` 两份早期脚本不代表当前结构。
>
> **待办**：在带 supabase MCP 的新会话拉真实结构——`list_tables(verbose)` + `pg_policies`/触发器/函数三查 + `list_edge_functions` + `get_advisors` → 回填 §一、刷新三/四章 → PROJECT.md 数据库节缩为摘要引用；回填后本文重新成为后端结构唯一真源。
>
> **⚠️ 前置阻塞（2026-09-05 根因确认）**：`SUPABASE_ACCESS_TOKEN` **令牌本身失效**——宿主报 `AUTH_HEADER_REJECTED (401)`，该令牌直请管理 API 同样 401，而 `.mcp.json` 的 `Bearer ${SUPABASE_ACCESS_TOKEN}` 插值正常，非会话或配置问题。
> 修复二选一：① Dashboard → Account → Access Tokens 重生成并替换 env 值；② 删掉 `.mcp.json` supabase 条目的 `headers` 块改走 OAuth（设了 `headers.Authorization` 时宿主禁用 OAuth 回退）。修完须重启会话——**MCP 断开后不向已开会话重注册工具**。
> 正面事实：PostgREST 自省端点 `GET /rest/v1/` 仅接受 service_role（anon key 实测 401），**REST 结构对匿名用户不可枚举**。
>
> **三、四章的发现仍有效未修复**（CASCADE 外键、search_path、RLS initplan、FK 索引），要点同步在 `ai/TODO.md` 与 PROJECT.md §待执行的审计遗留。
>
> **失效引用**：`channel.md` / `room.md` / `sidebar.md` 随 Discord 壳层作废不恢复，术语与数据模型以 `ai/PROJECT.md` §数据库 为准；`sql/dev-create-world.sql` 注释引用的 `world.md R-6` 同属断链，**R-6 现存唯一正文见本文二章**。

> 最后更新：2026-09-19 重整（一章正文仍是 2026-07-04 快照）
> 定位：**审计/讨论文档**——盘点线上结构、对照设计找差距，顾问发现集中在此，**待专门讨论后再拆 subtask**
> 项目：`xrscspcqnsxvfshskfpy`｜关联：`ai/PROJECT.md` §数据库（临时真源）、`ai/features/timeline.md`、`chat.md`

---

## 一、线上现状清单

**表 / 列 / RPC / Storage / Realtime 以 `ai/PROJECT.md` §数据库 为准**，回填后由本章接管。7-04 快照里 PROJECT.md 未覆盖、回填需核对的对象名：

- 函数：`check_world_uniqueness` / `check_post_author_in_world` / `check_post_unlock_validity` / `get_feed_posts` / `handle_new_user`(SECURITY DEFINER) / `update_updated_at_column`
- 触发器：`worlds_check_uniqueness` / `posts_check_author_in_world` / `posts_updated_at` / `post_unlocks_check_validity`
- Storage：`memories` 桶（私有，25MB，仅图片 mime），四条 "memories: world can …" 策略
- 其他：全部 public 表启用 RLS；`allowed_emails` 仅允许 select 自己那行；worlds 表历经 couples → rooms → worlds 改名

## 二、与设计结构的对齐检查（仅列未解决项）

7-04 列出的差距中，`channels` / `messages` 表、聊天持久化、Realtime、世界名入库已落地。**仍未解决**：

0. **⚠️ 删号会级联删世界（2026-07-05 删号时发现）**：`worlds_owner_id_fkey` / `worlds_member_id_fkey` 都是 `ON DELETE CASCADE`——**member 删号会把整个世界行连带删掉**（posts 再级联全灭）。应为 member 删号 → `SET NULL` + status 回退 pending（人走了世界还在），owner 删号是否删世界另议。当次已手动拆链避开（member 置 null + status='pending' 后再删用户）。修复 = 一条 `on delete set null` 迁移（S-6）。
1. **白名单未强制执行**：`allowed_emails` 表在，注册/登录却无拦截挂钩（现靠 Dashboard 关闭注册兜底）。候选：a) `auth.users` before-insert trigger 校验 email ∈ allowed_emails；b) 前端登录后校验 + 登出（弱）；c) Edge Function 注册钩子。与 TODO「auth 收口」同一件事。
2. **`intimacy_points` 归属**：现挂在 worlds 上；解锁经济（`unlock_cost`）尚无消费/获取链路，确认后再动。
3. **单人世界 status 语义**：`pending` 同时表示「等待邀请」与「单人使用中」，**R-6**（邀请 member 流程，`sql/dev-create-world.sql` 注释引用此编号）落地时确认是否需要第三态。
4. **在场 presence** 仍是前端 mock，Realtime Presence 未接；**房主删世界踢人（原 R-7）** 无 realtime 通知路径。

## 三、安全顾问发现（get_advisors security，2026-07-04）

| 级别    | 发现 / 影响                                                                                                                                  | 建议                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| WARN×6  | public 函数 `search_path` 全可变，可被劫持（需先能建同名对象，风险低但修复零成本）                                                           | 统一 `set search_path = ''`（一个 migration） |
| WARN    | `handle_new_user`（SECURITY DEFINER）可被 anon/authenticated 经 `/rest/v1/rpc/` 直调，任何人可代插 profiles 行（受 PK 约束限制，仍不该暴露） | `revoke execute from anon, authenticated`     |
| WARN×10 | 全部表在 GraphQL schema 对 anon/authenticated 可发现，结构可枚举（行数据仍受 RLS 保护）                                                      | 评估 revoke anon select / 关闭 pg_graphql     |
| WARN    | 泄露密码保护未开启，可用已泄露密码注册                                                                                                       | Dashboard → Auth 开启（HaveIBeenPwned 校验）  |

## 四、性能顾问发现（get_advisors performance）

| 级别    | 发现                                                                                           | 建议                                                |
| ------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| WARN×13 | 几乎所有 RLS 策略里 `auth.uid()` 逐行重估（initplan）                                          | 重写为 `(select auth.uid())`（一个 migration 全改） |
| INFO×4  | 无索引外键：`posts.author_id` / `posts.world_id` / `post_unlocks.user_id` / `worlds.member_id` | 补 4 个 btree 索引（数据量小，顺手修）              |

> 三、四的修复都是**低风险单 migration**（search_path + revoke + 索引 + 策略重写），讨论后一次做掉；泄露密码保护是 Dashboard 开关。**以上是 7-04 扫描结果，之后新增的六张表未进过扫描**，回填时须重跑 `get_advisors`。

## 实现计划

进度：1 / 6 subtasks（等专门讨论后定优先级）

- **S-1** 安全加固 migration（§三：search_path + revoke + GraphQL）｜**S-2** 性能 migration（§四：initplan + 4 索引）｜**S-3** 白名单强制执行方案（§二-1）｜**S-5** 泄露密码保护开关（Dashboard）
- **S-6 ⚠️ 高优先** `worlds` member/owner 外键 CASCADE → SET NULL（§二-0，删号不该灭世界）
- **S-4** 世界名/昵称入库 — [x] 已完成（`worlds.name/anniversary` 等列已上线）

## 测试记录

（待执行项落地后填写）
