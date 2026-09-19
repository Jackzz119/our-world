# 聊天分区 A 类落实记录（02-S07 · 注释 + 引用）

> 项目 our-world · 分支 `dev` · 基线 `dc74f51`（HEAD）· 执行日 2026-09-19
> 依据：`ai/project-audit/runs/2026-09-19-01/evidence/chat-structure-review.md` §5（注释审计）、§6（失效引用）、§8 的 A5 / A6。
> 本轮**只改注释**。A1–A4 已在 `dc74f51` 完成，未重做；A7（`chat-data.ts` 三个纯函数抽取）并入待批准的拆分方案，本轮不做；B 类全部不动。
> 范围外文件（`WorldPage.tsx` 等）一行未碰。

---

## 0. 三条公约（照 §5.0 执行）

1. 一个具名声明一句职责注释；复杂函数 ≤4 句，说清条件与副作用；匿名回调、trivial 表达式不加。
2. **编号保留、补落点**——CH-12 / CH-17 / EMO-3 / EMO-4 / D-2 / D-7 / D-7-3 / D-9 / B-1 / B-3 / ST-O 一个都没删，全部在文件头补上了带路径（多数带行号）的落点。`ai/features/chat.md:13` / `:80` 已把这些编号登记为「待回填」，删编号等于丢掉线索。
3. 删的是与现状不符的叙述：`ChatDock`、`sidebar` / `sidebar home panel`、`dock tabs`、`DM 阶段` / `表情系统`（chat.md 无此章节）、`channel.md`（文件不存在）。
4. 注释语言沿用全分区现状：**英文**（中文术语如「全部靠左」「频道不显示已读」原样保留）。

---

## 1. 逐文件

### 1.1 `src/themes/cinnaglass/chat-data.ts`

- **新增职责注释 15 条**：`TAG`、`MsgReaction`、`Msg`、`convsFor`、`pad`、`errMsg`、`rxKey`、`otherOf`、`nameMap`、`emotesById`、`requestsIn`、`requestsOut`、`appendLocal`、`send`、`retrySend`。
- **重写 9 处**：文件头、`Conv`、`useChatThreads`、`dmConvs`、`friends`、`deliver`、`sendStickerTo`、40 分钟续签块、friend actions 组注释。
- **删除的旧叙述摘句**：
  - 「the in-scene **ChatDock** (WoW-style ambient box)」→ 组件已删（`chat.md:68`），改为 `the stage-side ChatCard (shell/chat-card.tsx)`。
  - 「**sidebar home-panel** view models (好友区)」→ `View models for the friends page (好友区).`
  - 「**home-panel** friend view models」→ `Accepted friendships as rows for the friends page…`
  - 「dock tabs / hub nav / **home 面板 私信区**」+ 裸文件名「mockup **friends-page.html**」→ 整段换成两句 DM 会话描述（该 memo 不需要引 mockup）。
  - 「friend actions **(home panel)**」→ `friend actions`。
  - `Conv` 头上那段 5 行讲 `convsFor` 的文字 → 移到 `convsFor` 自己头上，`Conv` 只留一句。
- **引用改写**：
  - 文件头新增落点段：D-2（`ux-decisions.md:11`）、D-7（`:53`）指向 `ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md`（历史登记簿），并注明当前登记簿 `ai/design_system/uiux/cinnaglass/decisions.md`；B-3 指向 `.../cinnaglass-history/emoji-picker.html`。
  - 裸 `ST-O` → `ST-O in ai/features/timeline.md:201`。
  - `deliver` 的裸 `(D-2/D-7)`、`sendStickerTo` 的裸 `(B-3)`：编号留在原处，落点收到文件头（§5.0 第 2 条）。
- **验证**：`pnpm exec tsc -b` 0 错；`pnpm exec eslint` 0 问题。

### 1.2 `src/themes/cinnaglass/channel-screen.tsx`

- **新增 8 条**：`VANISH_COLORS`、`ChannelStyles`、`ChannelScreenProps`、`ChannelScreen`（428 行，全分区最大的无注释导出）、滚动 effect、`submit`、`beginEdit`、`commitEdit`。
- **重写 5 处**：文件头（9 行 → 8 行，4 行过时内容换成真入口 + 落点）、`explodeBubble`、`friends` prop 行内注释、emote 系统分组注释、会话切换器的 JSX 注释。
- **删除的旧叙述摘句**：
  - 「opened from the **sidebar** (text channels AND DMs — **the sidebar's only chat trigger**)」→ `Opened from the ChatCard's expand button (WorldPage.tsx)`。
  - 「**The sidebar entries are summon buttons**」→ 删。
  - 「Threads are shared with the in-scene **ChatDock**」→ `Threads are shared with the stage-side ChatCard — same store, two experiences.`
  - JSX 里「same set as the **dock tabs** (convsFor)」→ `the same set convsFor() gives the ChatCard`。
- **引用改写**：
  - 「`ux decisions.md` D-7」（文件名错、无路径）→ `ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md:53`，标注 historical register 并给出当前登记簿。
  - 「(D-7-3 修订: 频道不显示已读)」→ 追加落点 `ai/features/chat.md:61`（D-7-3 的唯一正文在那儿，不在 ux-decisions.md）。
  - props 行内「(chat.md **DM 阶段**)」→ `(ai/features/chat.md §五.3)`。
  - props 行内「emote system (chat.md **表情系统**)」→ `(ai/features/chat.md §三「lib/emotes.ts」)`。
  - CSS 内的 D-7 ①②④⑤⑥⑦ 子句号注释、贴纸块 `(B-1/B-3, LINE-style)`、已读头像 `DMs ONLY (D-7-3 修订)` **全部保留原样**（有信息量，落点已在文件头）。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.3 `src/themes/cinnaglass/friends-page.tsx`

- **新增 5 条**：`FriendsStyles`、`Tab`、`FriendsPageProps`、`FriendsPage`、`submitAdd`。
- **重写 1 处**：文件头。
- **删除的旧叙述摘句**：「Friend management lives ONLY here; **the sidebar home panel just links in**.」→ 后半句删，保留 `Friend management lives only here.`
- **引用改写**：
  - 「See `ai/features/chat.md` **DM 阶段**」（chat.md 无此章节，`chat.md:13` 已登记为断链）→ `Status (UI frozen, data layer kept): ai/features/chat.md §五.3「好友 / DM 定位待定」`。
  - mockup 路径原本挤在句中，拆成独立一行 `Mockup 方案 A: ai/design_system/uiux/research/cinnaglass-history/friends-page.html`（路径本就有效，仅重排可读性）。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.4 `src/themes/cinnaglass/emote-picker.tsx`

- **新增 12 条**：`EmoteView`、`RECENT_KEY`/`RECENT_MAX`、`loadRecent`、`PickerStyles`、`Tab`、`EmotePickerProps`、`EmotePicker`（235 行）、`pickEmoji`、`query`/`emojiHits`/`worldHits`、`runWebSearch`、`doImport`、`nameOr`。
- **重写 1 处**：文件头。
- **删除的旧叙述摘句**：无过时叙述；删掉的是**裸引用**——裸文件名「mockup **emoji-picker.html**」（无路径）。
- **引用改写**：
  - 「(chat.md **EMO-4**, …)」→ `ai/features/chat.md §三「emote-picker.tsx / emoji-data.ts」(subtask EMO-4 not yet backfilled — see ai/features/chat.md:13)`，编号保留。
  - 裸 `D-7/B-1`、`D-9` → 编号留在正文，文件头补落点 `.../cinnaglass-history/ux-decisions.md`（D-7 :53、D-9 :80）+ `.../cinnaglass-history/emoji-picker.html`（B-1 / B-3），并注明 D-9~D-12 属历史登记簿、当前登记簿是 `uiux/cinnaglass/decisions.md`。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.5 `src/themes/cinnaglass/emoji-data.ts`

- **新增 2 条**：`EmojiEntry` / `EmojiCategory`（`e` 与 `k` 的含义）、`EMOJI_CATEGORIES`。`ALL_EMOJI` 原有的「flat index for search」保留。
- **重写 1 处**：文件头末尾。
- **引用改写**：「(chat.md **EMO-4**)」→ `Spec: ai/features/chat.md §三「emote-picker.tsx / emoji-data.ts」(subtask EMO-4 not yet backfilled — see ai/features/chat.md:13).`
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.6 `src/themes/cinnaglass/shell/chat-card.tsx`

- **新增 9 条**：`QUICK`、`AVATARS`、`ChatCardProps`、`ChatCard`（86 行）、`convs`/`cur`/`msgs`、滚底 effect、focus effect、`submit`、`ChatCardStyles`（95 行 CSS）。
- **重写 1 处**：文件头。
- **补上的缺失契约**（审阅点名的最大缺口）：文件头现在写明「只渲染 `convsFor()` 的**首个**会话、无 tab、尾部 40 条、过滤 vanishing、打开即上报已读」——这条此前只存在于 `ai/features/chat.md:62`，源码里没有。
- **引用改写**：「codex pixel spec (§5.6)」无路径 → 补 `ai/codex-visual/20260811-055917Z/codex-report.md:171`（该行即「### 5.6 左下聊天卡」）。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.7 `src/lib/chat.ts`

- **新增 5 条**：四个 `*_COLS`（一条共用）、`MessagePage`、`MESSAGE_PAGE_SIZE`、`addReaction`、`removeReaction`。`*_COLS` 那条按 §4.3 写成同步公约：「must stay in sync with `src/types/chat.ts` — the row types are hand-written, nothing generates them」。
- **删除的旧叙述摘句**：
  - 「All channels of a world in **sidebar** order」→ `in nav order`。
  - 「content carries the :name: fallback (**dock line** / tombstone)」→ `(conversation hint line / tombstone)`。
- **引用改写**：「(chat.md **CH-12 / CH-17**)」→ `Spec: ai/features/chat.md §三「lib/chat.ts」(subtasks CH-12 / CH-17 were never backfilled into that doc — see ai/features/chat.md:13)`，编号保留。L2-7 的投递模型原文一字未动。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.8 `src/lib/friends.ts`

- **新增 2 条**：`COLS`（同步公约，指向 `FriendshipRow`）、`pairOf`。
- **重写 1 处**：文件头。
- **引用改写**：「(chat.md **DM 阶段**)」→ `Spec: ai/features/chat.md §三「lib/friends.ts」(状态：UI 收起)` + `status (UI frozen, table must not be dropped): ai/features/chat.md §五.3`。后半句是刻意加的——`chat.md §五.3` 明写「拍板前不得删表」。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.9 `src/lib/emotes.ts`

- **新增 2 条**：`COLS`（同步公约，指向 `EmoteRow`）、`downscaleToWebp`（说清抛错条件与 bitmap 释放）。
- **引用改写**：「(ai/features/chat.md **表情系统** EMO-3)」（chat.md 无「表情系统」小节）→ `Spec: ai/features/chat.md §三「lib/emotes.ts」(subtask EMO-3 was never backfilled — see ai/features/chat.md:13)`，编号保留。
- **未动**：`addEmoteFromFile` 里的内联取 uid（§4.1 登记给 02-S06，避免两个分区改同一文件）。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.10 `src/lib/logman.ts`

- **新增 1 条**：使用边界公约——`only modules with UI context log. lib/* data access throws instead, so a failure is reported once, where there is something to tell the user.`（§4.5 登记项：防止下一个人在 `lib/` 里加 log）。
- **引用改写**：「ai/PROJECT.md's tag pool」→ `ai/PROJECT.md §已有功能资产's tag pool`（标签池确在该章，`PROJECT.md:96`）。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

### 1.11 `src/types/chat.ts`

- **重写 1 处**：文件头。
- **删除的旧叙述摘句**：「see `ai/features/chat.md` + **`ai/features/channel.md`**」——`channel.md` **不存在**，`chat.md:13` 明写它随 Discord 壳层作废且不恢复。
- **引用改写**：新文件头点名六张表，并写明「权威列清单是 `ai/PROJECT.md §数据库`，此处每次改动必须同步 `src/lib/chat.ts` 的 `*_COLS`」（§4.3 的同步公约落点），`ai/features/chat.md` 作为功能文档保留。
- **注**：`ReactionRow.channel_id` 幻列已在 `dc74f51`（A2）删除，本轮无关。
- **验证**：`tsc -b` 0 错；`eslint` 0 问题。

---

## 2. 统计

| 文件 | 新增职责注释 | 重写/删改的旧注释 | 改写的引用 |
|---|---|---|---|
| `chat-data.ts` | 15 | 9 | 4（ChatDock、mockup 裸名、ST-O、D-2/D-7/B-3 落点） |
| `channel-screen.tsx` | 8 | 5 | 4（ux-decisions 路径、D-7-3、DM 阶段、表情系统） |
| `friends-page.tsx` | 5 | 1 | 1（DM 阶段 → §五.3） |
| `emote-picker.tsx` | 12 | 1 | 3（EMO-4、mockup 路径、D-7/B-1/D-9 落点） |
| `emoji-data.ts` | 2 | 1 | 1（EMO-4） |
| `shell/chat-card.tsx` | 9 | 1 | 1（codex spec §5.6 路径+行号） |
| `lib/chat.ts` | 5 | 2 | 1（CH-12 / CH-17） |
| `lib/friends.ts` | 2 | 1 | 1（DM 阶段） |
| `lib/emotes.ts` | 2 | 0 | 1（EMO-3 / 表情系统） |
| `lib/logman.ts` | 1 | 1 | 1（PROJECT.md §已有功能资产） |
| `types/chat.ts` | 0 | 1 | 1（channel.md → PROJECT.md §数据库） |
| **合计** | **61** | **23** | **19** |

新增数超过 §5 表里点名的 47 条，因为部分「一组共用」的注释按声明拆开落地（例如 `RECENT_KEY`/`RECENT_MAX`、`EmojiEntry`/`EmojiCategory`、四个 `*_COLS`），以及 `friends-page` / `chat-card` 的几个 effect 按公约各给了一句。§6 的 ❌ 5 条与 ⚠️ 15 条中，落在本分区 11 个文件里的全部处理完毕；`WorldPage.tsx` 的 4 条（`channel.md`、`the dock is stage-owned` / `DMs stay mock`、`ai/UX.md §4`、`ai/UX.md §2`）属 02-S06，本轮未碰。

---

## 3. 验证结果

| 项 | 命令 | 结果 |
|---|---|---|
| 类型 | `pnpm exec tsc -b`（每改完一个文件各跑一次，共 11 次） | **全部 0 错** |
| Lint | `pnpm exec eslint <文件>`（逐文件） | **全部 0 problems** |
| 构建 | `pnpm exec vite build` | **✓ built in 2.15s**，随后 `rm -rf dist` |
| 引用落点 | 提取 11 文件里全部 `ai/…` 路径去重后逐条 `test -f` | 8 条路径**全部 OK**：`ai/PROJECT.md`、`ai/features/chat.md`、`ai/features/timeline.md`、`ai/codex-visual/20260811-055917Z/codex-report.md`、`ai/design_system/uiux/cinnaglass/decisions.md`、`.../cinnaglass-history/ux-decisions.md`、`.../cinnaglass-history/emoji-picker.html`、`.../cinnaglass-history/friends-page.html` |
| 残留陈旧词扫描 | `grep -nE 'UX\.md\|channel\.md\|DM 阶段\|表情系统\|ux decisions\|home panel\|home-panel\|ChatDock\|sidebar'` 全 11 文件 | **零命中** |
| 只改注释 | `node ai/project-audit/scripts/verify-comment-only.mjs --root . --revision HEAD --files <11 个>` | `{"total": 11, "commentOnly": 11, "codeChanged": []}` — **11/11 comment-only，无需回退** |

未运行 `prettier`（按任务要求留给 02-S09 全局格式化），未 `git commit`。

---

## 4. 本轮未做（登记，避免下次重提）

- **A7**（`upsertReactions` / `without` / `dropMessageEverywhere` 三个纯函数抽取）：与 §3.1 批 1 重叠，并入待批准的拆分方案统一做，不做两遍。
- **A8**（Prettier）：随 02-S09 全局处理。
- **B1–B5** 全部结构重构：需用户批准。
- `lib/emotes.ts:42-44`、`lib/worlds.ts`、`lib/posts.ts` 的三处内联 `currentUserId`：属 02-S06 壳层分区。
- `emojiHits` / `worldHits` 的 `useMemo`：§4.4 判定为整洁性改动，不单独动文件。
