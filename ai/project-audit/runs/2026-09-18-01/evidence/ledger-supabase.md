# supabase.md 压缩 ledger（2026-09-19）

- 原文：`ai/Features/supabase.md` — 9028 bytes / 92 行
- 压缩稿：7047 bytes / 72 行（占原文 **78.1%**，阈值 6018 bytes = 2/3）
- exception：**是**（详见文末「例外说明」）
- 锚点扫描：全仓 grep `supabase.md#` **零命中**。入向引用：`ai/TODO.md:141`（「回填该文第一章」+「详见该文档头执行尝试记录」）、`ai/TODO.md:142`（「要点已收录 …… 该文三/四章」）、`ai/PROJECT.md:102,135,173`、`ai/reboot/tech-plan.md:130`（「supabase.md 的安全加固清单」）。均按章节序号引用，故**一/三/四章的章节号与内容必须原位保留**。
- 顶级章节标题：全部保留（文档状态 / 一、线上现状清单 / 二、与设计结构的对齐检查 / 三、安全顾问发现 / 四、性能顾问发现 / 实现计划 / 测试记录）。

## 保留清单

| 项 | 为什么留 |
| --- | --- |
| 状态头：正文是 7-04 快照、PROJECT.md §数据库 为临时真源、7-04 后的增量清单、仓库无 migration 历史 | 全文可信度前提，PROJECT.md:102 与之互指 |
| 状态头：MCP 回填步骤（`list_tables(verbose)` + `pg_policies`/触发器/函数三查 + `list_edge_functions` + `get_advisors` → 回填 §一 → PROJECT.md 缩为摘要引用） | TODO.md:141 直接依赖该操作序列 |
| 状态头：2026-09-05 令牌失效诊断（压成 3 行：根因 / 两条修复路径 / 须重启会话 + MCP 不向已开会话重注册） | 任务指定保留；TODO.md:141 以「详见该文档头执行尝试记录」引用它 |
| 「PostgREST 自省端点现仅接受 service_role，REST 结构对匿名用户不可枚举」 | 独有的正面安全结论，与三章 GraphQL 可枚举项互为对照 |
| 三、四章全部顾问发现（WARN×6 / handle_new_user / WARN×10 GraphQL / 泄露密码保护 / WARN×13 initplan / INFO×4 FK 索引）及其建议 | TODO.md:142、tech-plan.md:130 引用；是这些待办的权威正文 |
| 二章仍未解决项：0 CASCADE 删世界、1 白名单未强制、2 `intimacy_points` 归属、3 单人世界 status 语义（含 **R-6**）、4 presence 与原 R-7 | 未解决问题 + 验收/决策条件 |
| **R-6** 编号 | `sql/dev-create-world.sql:9` 注释引用（写的是 `ai/Features/world.md R-6`，该文件不存在，本文二章是 R-6 现存唯一正文） |
| S-1 ~ S-6 全部编号（含已完成的 S-4） | 待办编号，跨文档可能被引用；S-6 与 PROJECT.md 的「高优先 CASCADE」对应 |
| 一章的函数名 / 触发器名 / `memories` 桶参数（私有、25MB、图片 mime、四条策略）/ RLS 全启用 / `allowed_emails` 仅 select 自己 / worlds 沿革 couples→rooms→worlds | PROJECT.md §数据库**未覆盖**这些对象名；三章「WARN×6 全部函数」要靠函数名单才可执行 |
| 项目 ref `xrscspcqnsxvfshskfpy` | 外部契约 |

## 删除清单

| 原文位置 / 摘句 | 理由 |
| --- | --- |
| :13 执行尝试流水：「当日会话为长寿旧会话，两次 ToolSearch 均无果」「改试 PostgREST OpenAPI 自省被平台拒（实测 401，错误原文 `Only the service_role API key can be used for this endpoint`）」 | 已完成的排查流水；结论（MCP 不向已开会话重注册 + REST 不可枚举）保留，过程与英文报错原文删 |
| :13 「回填须在带 supabase MCP 的新会话执行」与「修完需重启会话让 MCP 重连」重复表述 | 同一事实合并为一句 |
| :17「最后更新：2026-07-04」 | 改为「2026-09-19 重整（一章正文仍是 2026-07-04 快照）」，避免与状态头矛盾 |
| :18、:20 关联文档中的 `channel.md` / `room.md`（及 §二表格里的同名引用） | 文件不存在且不恢复；按任务改为一句「以 `ai/PROJECT.md` §数据库 为准」 |
| :24 章节标题的「（2026-07-04 审计时点）」 | 时点已在章首与状态头说明 |
| :27-33 表清单（`allowed_emails` / `profiles` / `worlds` / `posts` / `post_unlocks` 的列与说明） | 与 `ai/PROJECT.md` §数据库表格重复且更旧（缺 7-04 后六表四列）；按任务改为「以 PROJECT.md §数据库 为准，回填后本文接管」 |
| :41「Realtime 未使用（无 publication 订阅、无 broadcast/presence）」、:42「Edge Functions 无」 | 已作废（现有 Broadcast from Database 与 `emotes` 函数），留着会误导 |
| :48-55 对齐检查表中 4 行已对齐/已落地项（世界 = 顶层容器 C-3、回忆链路 ST-A~G、`channels` 表缺失 C-7、聊天持久化、世界名/昵称未入库 §二-2） | 均已落地（见 PROJECT.md §数据库）；压成章首一句「已落地」清单 |
| :62 结构问题 2「世界名/昵称未入库……localStorage `ow-profile-v1`」全文 | 已完成（`worlds.name/anniversary/icon_*` 已上线），降级为实现计划里的 S-4 `[x]` 一行 |
| :86「进度：0 / 0 subtasks（审计完成……）」 | 与下方六个候选 subtask 自相矛盾，改为 1 / 6 |
| :88 候选 subtask 长句中与三/四章逐字重复的修复项描述 | 同一事实只留三/四章权威正文，S-1/S-2 改为「§三」「§四」指向 |

## 改正清单（原陈述 → 实际 → 依据）

| 原陈述 | 实际 | 依据 |
| --- | --- | --- |
| 「Realtime 未使用（无 publication 订阅、无 broadcast/presence）」 | Realtime 已是 Broadcast from Database 主链路（trigger 推 private topic `world:{id}` / `user:{uid}`）；**只有 Presence 仍未接** | `src/lib/chat.ts:1-7`；`ai/PROJECT.md` §RPC / Edge Function / Storage / Realtime |
| 「Edge Functions 无」 | 已有 `emotes` Edge Function（Tenor 搜图 + 转存） | `src/lib/emotes.ts:23,33`；`ai/PROJECT.md` 同节 |
| 「无 `channels` 表（前端 mock）」「无 `messages` 表」 | 两表均已上线，前端直读直写 | `src/lib/chat.ts:12-13`；`ai/PROJECT.md` §表 |
| `get_feed_posts(p_world_id)` | 现签名为 `get_feed_posts(p_world_id, p_before, p_limit)`（独占游标分页） | `ai/PROJECT.md` §RPC |
| 「白名单未强制执行……现在任何人注册都能建号」 | 表仍无代码引用，但**实际拦截靠 Dashboard 关闭注册开关**兜底；压缩稿补入这一现状 | `ai/PROJECT.md` §表 `allowed_emails` 备注 |
| 「邀请 member（room.md R-6）」「房主删世界踢人（room.md R-7）」 | `room.md` 不存在；R-6 在 `sql/dev-create-world.sql:9` 被写作 `ai/Features/world.md R-6`，而 `world.md` 同样不存在——两处都是断链，本文二章成为 R-6 现存唯一正文 | `ls ai/Features/`（仅 chat/navigation-glass/supabase/timeline/ui-system）；`sql/dev-create-world.sql:9` |
| 「进度：0 / 0 subtasks」 | 候选 subtask 实为 6 项且 S-4 已完成 → 1 / 6 | 原文 :88 + `ai/PROJECT.md` §表 `worlds` |

## 待核清单

1. **一章所有对象名仍是 2026-07-04 快照**：函数 / 触发器 / Storage 策略名未经线上 DDL 复核，7-04 后新增六表必然带来新的触发器与策略（如 `messages` 的 `set_world`、`channel_reads` 的只进不退 guard，仅见于 PROJECT.md 备注），**回填时以 MCP 结果为准**。
2. **三、四章顾问发现是 7-04 扫描结果**：7-04 后新增的六张表及其 RLS 策略**从未进过 `get_advisors`**，WARN 计数（×6 / ×10 / ×13 / ×4）必然已变化。压缩稿已在四章末尾写明须重跑。
3. **`worlds` 外键是否仍为 CASCADE**：结论沿用 2026-07-05 现场观察 + PROJECT.md「待执行的审计遗留」，本次未连线验证。
4. **`SUPABASE_ACCESS_TOKEN` 是否已更换**：2026-09-05 的失效诊断未在本次复验（任务禁止读 `.claude/`、`.env*`，也未连 MCP）。
5. **`allowed_emails` 的 Dashboard 注册开关状态**：取自 PROJECT.md 备注，未登录 Dashboard 核实。

## 例外说明（未达 2/3 目标）

压缩稿 7047 bytes，超出 6018 bytes 目标 1029 bytes（实际压缩率 78.1%）。原因与取舍：

1. **原文本就是高密度审计清单，冗余极少**。全文 9028 bytes 里，可删的「已完成流水 / 作废方案 / 历史叙述」合计约 2000 bytes（一章表清单、已对齐行、执行尝试过程、世界名入库条目），已**全部删净**；剩下的每一段都属保留类别。
2. **三、四章（合计约 1560 bytes）不可再压**：`ai/TODO.md:142` 与 `ai/reboot/tech-plan.md:130` 明确以「该文三/四章」「supabase.md 的安全加固清单」为待办正文，删任何一行都会让 TODO 条目失去可执行细节（级别、对象、建议 SQL）。
3. **状态头（约 2450 bytes）是任务点名保留项**：临时真源声明、MCP 回填步骤、令牌失效诊断（已压到 3 行）、失效引用四块各自被外部文档引用，且是「未解决问题 + 操作前提」，属不可删的关键条件。
4. **二章（约 1450 bytes）全是未解决决策**，每项都带方案候选或判定条件（如 §二-0 的 `SET NULL` + status 回退语义、§二-1 的三个候选方案），删掉理由就只剩标题，失去决策价值。
5. 进一步压缩只能靠删除上述任一实质内容，或把内容挪到 PROJECT.md / TODO.md 凑比例——两者都被规则禁止。故**停在能保真的最小体积 7047 bytes**。
6. 补充说明：为保持 Feature 模板完整，压缩稿新增了一行「最后更新」（约 60 bytes），这是为模板一致性付出的已知成本。
