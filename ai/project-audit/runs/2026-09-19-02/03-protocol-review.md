# 第三步：协议、后端与前端深度 review

## 结论与完成状态

- **静态范围已审，交付诊断与建议，未改源码**（授权：INDEX「第三步开工时要知道的」）。基线 `f96fc63`，工作区干净；本步结束时 `tsc -b` 0 错、eslint 1 条既有警告、prettier 0 差异均未变（本步只新增/修改 Markdown 与审核目录文件）。
- 覆盖：清单 500 文件，第三步适用面 119（`src/` 97 + `sql/` 2 + `scripts/` 12 + 根配置 8）全部有人工记录——**105 已检查 / 10 受限 / 4 待验证**；另 5 条目录级聚合行（`public/rooms/**` 资源路径逐一核对、`arts/rooms/study/generated/README.md` 产物契约）。非适用 381 个（`ai/` 文档 272、`arts/` 35、`public/` 36、根杂项 12、根目录被忽略的 `codex-visual/` 26）——第三步维度不适用于文档与素材。
- 发现：**P1 9 条（PA-034～042）**，P2/P3 11 条（PA-043～053）；分区原始条目 A-20 / B-20 / C-19 / D-19，均带 `file:line`。P1 全部由审核对照源码二次复核。
- **动态验收全部未做**：dev server 未开、Supabase MCP 401。**新事实：这台 Windows 机器有 `.env.local`**（含 dev 自动登录账号），交接档「本机无 `.env.local`」是 Mac 的情况——第三步的运行时验收清单与第四步 profiler 在本机可行，但进世界会写真实数据（已读游标、发帖、消息会被对方看到），未经用户同意不跑。

## 基线、全项目覆盖与限制

| 项            | 值                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HEAD / 分支   | `f96fc63` / `dev`（第二步 + 技能体系已推送）                                                                                                                            |
| 版本          | supabase-js 2.98.0（auth/realtime/storage/postgrest 同版）、pixi.js 8.19.0、react 19.2.4、react-router-dom 7.13.1、vite 7.3.1、TS 5.9.3、pnpm 10.21.0                    |
| 覆盖方法      | 四个分区 agent 全文读 + 链路追踪（入口 → auth/PostgREST/RPC/Storage/Realtime → 状态 → 呈现），审核复核 P1 与跨分区契约；覆盖合并见 `metrics/coverage-summary.json`（去重 6 个双重认领，revision = 文件 sha256） |
| 受限 10       | `image-slot.js`/`.d.ts`（web component 无法静态验证手势）、7 个 `scripts/*.mjs|py`（未运行，只抽契约）、`sql/*`（早期脚本，线上结构不可核）                                          |
| 待验证 4      | `composer.tsx`（HEIC 拖放路径）、`photo-wall.tsx`（灯箱 fixed 被 transform 收编）、`object-surfaces.tsx`（inert 首焦点竞态）、`compositor.ts`（DPR>1 视觉结果）                    |
| 排除          | `.git/`、`node_modules/`、`dist/`、`scratch/`、`.idea/`、`ai/project-audit/runs/`、`ai/sessions/`（清单前剪枝）                                                              |

## 本步骤调研与适配结论

完整表见 [evidence/03-research.md](evidence/03-research.md)（11 条一手来源，检索日期 2026-09-19，两页 404 改用本机类型定义核实）。直接改变结论的三条：

1. **Realtime JWT 续期不需应用处理**：supabase-js 2.98 `dist/index.mjs:361-373` 在 `TOKEN_REFRESHED/SIGNED_IN` 自动 `realtime.setAuth`，realtime-js 连接时再取 `accessToken` 回调——社区「必须手动 setAuth」属旧版；应用侧唯一要补的是断线漏消息的**补拉语义**（PA-039/045），Broadcast Replay（`config.broadcast.replay`，≤25 条）可作补充。
2. **`auth.getUser()` 是网络往返、浏览器端应用 `getSession()`**（官方 reference）：直接决定 PA-034 的修法。
3. **Pixi v8 `renderer.width` 已是逻辑像素**（`ViewSystem.resize`：`screen.width = texture.frame.width`；`TextureSource.resize`：`width = pixel/resolution`）：决定 PA-041①。

其余：`createSignedUrls` 逐项返回 `error`（storage-js `index.d.mts:1091-1097`，`signImageUrls` 已逐项过滤但把失败静默吞掉 → B-04）；auth-js 每 30s tick、剩余 <90s 刷新并在 `visibilitychange` 时恢复；React 19 StrictMode 双跑判据；react-hooks v7 `refs` / `set-state-in-effect`；Pixi `TextureGC` 3600 帧 / `Application.destroy` 选项。

## 已讨论方案、授权和取舍

- 授权范围内：只写审核目录、`STEPS.md`、`FINDINGS.md`、`INDEX.md`、`ai/TODO.md`（登记待办）、`ai/PROJECT.md` 两处事实修正（开工红线第 6 条进度、签名续签描述）。
- 中间件/适配器结论（四分区一致，去重后）：**只值三个小 helper**——`lib/user-error.ts` 错误映射（PA-043）、`useSignedUrls` 续签共用（PA-044）、`useTopicStream` 实时流收口（PA-045）；不建 repository/DTO 层，不引入 `supabase gen types`（沿用第二步结论），不建 toast/重试系统，乐观写回滚放在 `use-optimistic-send.ts` 内部。
- 需用户裁决：P1 九条是否实施、先后顺序；solo 世界假伴侣（A-18）、auto 天气定位说明（PA-051）、DM 冻结区去留（PA-053）；是否在本机开 dev server 做运行时验收（会写真实数据）。

## 发现与证据

按 ID 见 [FINDINGS.md](../../FINDINGS.md) 第三步节（PA-034～053）。跨分区契约要点：

| 契约面                        | 结论                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 类型分层                      | 全仓无独立映射层：`World`/`FeedProfile`/`FeedPost`/`ChatMessageRow` 传输即领域；视图投影单点（`liveProfile`、`toMsgs`、`convsFor`、`EmoteView`）——规模下正确，不建议加层。`FeedPost.visible_images` 类型非空但 5 处 `?? []` 防御、`World.name` 非空但处处 `??`：待核线上后修类型 |
| 客户端不送的列                | `messages.world_id/kind/created_at`、`message_reactions.world_id`、`channel_reads.world_id` 靠触发器/默认值；`author_id/user_id` 由客户端给——**正确性 100% 依赖 RLS**（待核线上）；`channel_reads` upsert 依赖 `(channel_id,user_id)` 唯一约束（待核）                       |
| Realtime payload              | 客户端读 `table/record/old_record`、事件名取绑定的 `INSERT/UPDATE/DELETE` 而忽略 payload `operation`——触发器事件名若非 `TG_OP` 则静默收不到（待核线上）；`channels` 表无事件（PA-045）                                                                                     |
| Storage                       | 桶 25MB / 4 种 mime / 首段 = world_id 的 RLS 与代码假设一致；客户端过滤宽于桶（PA-040）；签名 TTL 1h，续签三份实现（PA-044）                                                                                                                                       |
| env / localStorage            | 六个 `VITE_*` 与 `.env.example` 一一对应；`VITE_DEV*` 未绑 `import.meta.env.DEV`（PA-042）；六个 `ow-*-v1` key 无版本迁移、枚举不校验、`loadWidgets` 绕开 `local-store`（A-15）                                                                                       |
| 与 PROJECT.md 数据库节的差异  | `worlds.status` 代码不 select 也不写（依赖默认 `pending`）；`intimacy_points` 零消费者；`ReactionRow.channel_id` 幻列已删；「40 分钟续签 + 重可见重签」只对缩略图成立（已修正措辞）                                                                                           |
| 已知线索复核                  | 7 条（A）全部成立；timeline.md §五 8 条成立 6 / 待核线上 2；chat.md §五 6 条成立 5 / 无法核 1；`room-scene.tsx` eslint-disable「删掉会报错」**不成立**（HEAD 实测 unused）；纪念日单源成立但 null 回退假日期；30fps 常渲染成立并追加三开关冲突                             |

## 已执行改动（文件路径与原因）

本步不改源码。新增 `runs/2026-09-19-02/`（`run-meta.json`、`coverage.csv`、`metrics/{baseline/inventory.csv,coverage-summary.json}`、`evidence/03-*-review.md ×4`、`evidence/03-*-coverage.csv ×5`、`evidence/03-research.md`、本报告）；`STEPS.md` 第三步蓝图与复盘；`FINDINGS.md` PA-034～053；`INDEX.md` 进度与第四步交接；`ai/TODO.md` 登记第三步 Bug 与验收项；`ai/PROJECT.md` 开工红线第 6 条进度、签名续签措辞。

## 验证

- `pnpm exec tsc -b`、`pnpm exec eslint .`、`pnpm exec prettier --check .`：本步前后一致（0 错 / 1 既有警告 / 0 差异），因为没有源码改动；编辑过的 Markdown 已 `prettier --write`。
- 覆盖合并：`applicable 119 = covered 119`，无重复责任（6 个双重认领按分区归属合并、保留双方证据引用）。
- 未验证：全部运行时行为（见「结论」）；线上 DDL/RLS/触发器；Edge Function `emotes`。

## 建议、待办和下一步

1. **先修 P1（PA-034～042）**，建议顺序：PA-042（安全，一行）→ PA-034（一处改动解六个误报）→ PA-041（房间装载四处）→ PA-038/039（聊天）→ PA-040（上传）→ PA-035/036/037（设置链路，含产品决定）。实施走 `feature`/普通开发流程，每条按 FINDINGS 验收条件验证。
2. **运行时验收**：本机有 `.env.local`，用户开 `pnpm dev`（5173）后可按 INDEX 清单 + 本步 P1 验收条件逐条实测，把「静态」升级为「实测」——需用户同意（写真实数据）。
3. **第四步（性能）**：先静态（PA-049 的假设清单：1 Hz 全壳重渲染、30fps 常渲染、晴天滤镜、贴图泄漏、`backdrop-filter` 叠 canvas）→ 再本机真实运行 DevTools Performance/Memory 录制。
4. 文档回填：`ai/features/timeline.md`（image-slot 事件、fallback dataUrl）、`chat.md`（CH-12/17、EMO-3/4 只在注释）、模块头旧文件名（PA-050）。
