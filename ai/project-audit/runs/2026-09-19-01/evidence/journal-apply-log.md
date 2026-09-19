# PROJECT-AUDIT 第二步 · 落实日志：日记本 / screens 表面 / feed 数据层（A 类）

- 运行：`2026-09-19-01`，分支 `dev`，起始 HEAD `dc74f51`（"refactor: reuse shared helpers and drop dead exports and config leftovers"）
- 依据：`ai/project-audit/runs/2026-09-19-01/evidence/journal-screens-structure-review.md` 的 **A 类**清单
- 授权范围：注释精简、失效引用修正、死样式删除、小复用。**B 类未做**；日记本 UI 冻结，渲染结果不得改变
- 已在前序提交完成、本轮未重做：**A4**（`uploadMemoryImage` 死参数）、**A7**（`lib/local-store.ts`）、**A8**（`SIGNED_URL_REFRESH_MS`）、**A9**（`applyThumbUrls`）、**A10**（`journalEntry` 去 export）
- 本轮未改的文件：`journal-turn.css`（零死样式、注释合格）、`types.d.ts`、`src/hooks/useFeed.ts`、`src/types/feed.ts`（§5.6 判定注释全部合格）

---

## 1. `src/themes/cinnaglass/screens.tsx`

### 改了什么

**(a) 死样式删除（A1）** —— `ScreenStyles` 内联 `<style>` 里滚动时间线一族。删除前对每个类名重新做了全 `src` 词边界回查（`className`、模板拼接、`querySelector`、`classList`，以及 CSS 之间的互相引用），语料排除 `screens.tsx` 自身的 `<style>` 正文。

删除的选择器（31 个规则块）：

```
.compose-collapsed .pchip
.tl-scroll   .tl-scroll::-webkit-scrollbar   .tl-scroll[data-dragging]   .tl-scroll[data-dragging] *
.tl-pull   .tl-more   .tl-end   .tl-end.armed
.tl-day   .tl-day span   .tl-day.alt span
.tl-item   @keyframes tlIn   @media (prefers-reduced-motion: no-preference) { .tl-item }
.tl .ava
.tl-card   .tl-card:hover   .tl-who   .tl-au   .tl-time   .tl-card .tt
.tl-card.has-media   .tl-card.has-media .tl-media   .tl-card.has-media image-slot
.tl-imgn   .tl-card.has-media .tbody
@media(min-width:1000px) { .tl-item, .tl-day }
@media(max-width:767px) { .tl .ava, .tl-card, .tl-card .tt }
```

保留：`.tl-host`（`screens.tsx` 仍在用）、`.ava` / `.ava img`（`Avatar` 组件在用）、`.wl-*` / `.pw` / `.compose*` / `.draft-chip`。

**(b) 未删并登记 —— `.tl` / `.tl::before`（对审阅报告 A1 的更正）**

报告把 `.tl` 与 `.tl::before`（含 `@media(max-width:767px)` 内的两条）列为零消费者。**复查结论：不是零消费者，故本轮不删。**

`journal-layout.ts:70` 会给每张日记照片生成四个纸角
`<i class="journal-photo-corner tl|tr|bl|br">`，其中 `tl` 这个类名与旧时间线根节点的 `.tl` **同名**。
影响面实测推演：

- `.tl{position:relative;width:100%}` → 被 `.journal-room-entry .journal-photo-corner`（特异度 0-2-0 > 0-1-0）的 `position:absolute;width:34px` 压过，无效果；
- `.tl{margin:0 auto}` → 绝对定位元素 `right:auto`，auto 外边距解析为 0，无效果；
- `.tl{padding-left:48px}` → 全局 `box-sizing:border-box`（`src/index.css:9`），34px 的盒子尺寸不变，无效果；
- **`.tl::before` → 会在每个左上纸角上生成一条 2px 虚线伪元素**（`left:15px;top:10px;bottom:12px;border-left:2px dotted rgba(124,198,236,.35)`），落在 `clip-path` 三角形内，是**会被画出来的**。删掉它等于改变日记本的渲染结果。

按"日记本冻结 / 有疑问就不删"的约束，这四条规则原样保留，并在代码里就地加了注释说明为什么保留。**这是一个需要用户拍板的遗留项**：要么给旧时间线的 `.tl` 改名（B 类，会动类名），要么确认这条虚线是可接受的移除。

**(c) 注释审计落地（A5，§5.1 表）**

- 文件头：替换为"三个房间物件表面 + 保持挂载的理由 + 分页归 journal-room-book"的新版；删掉了原来越界描述日记分页的两句和已不准确的 "Modal shell styles live in cinnaglass.css"。
- `ScreenStyles`：新增职责注释，并写明"它是 `<style>` 元素、同特异度下压过所有 bundled CSS"这条搬迁风险。
- composer 段注释：删掉 "its own row below the scrollport, never overlapping"（滚动版式已不存在），改写为"在日记里由 journal-room.css 绝对定位在纸面上"。
- 整段删除已废弃的 timeline 叙述（原 118–125 行），改为一句说明"滚动时间线已移除、只剩宿主盒子"。
- 补齐无注释项：`TabKey`、`SurfaceOrigin`、`SURFACES`、`SEED_WISHES`、`fmtMeta`、`fmtFullDate`、`hashOf`、`avaGrad`、`toneOf`、`Avatar`、`Composer`、`addFiles`、`removeAt`、`clearPicked`、`publish`、`TimelineBody`、`PhotosBody`、`WishlistBody`、`SubScreen`、`originStyle`。
- `Picked` / `MAX_IMGS`：删掉指向已删实现的旧叙述（"the old single `<image-slot>` square was a tiny drop target…"），改写为现行语义。
- `useSignedThumbs`：在原注释末尾补一句"只有这份列表续签，PostDetail 与灯箱一次性签名"。
- 未做：不给匿名回调机械加注释。

**(d) 失效/不完整引用（A6，§六）**

- `design ref: composer-redesign.html` → 补全为 `ai/design_system/uiux/research/cinnaglass-history/composer-redesign.html`（`test -f` 通过）。
- `timeline-redesign.html` 的引用随整段废弃注释一起消失（该文件仍存在，只是不再被引用）。

### 验证

`pnpm exec tsc -b` 通过；`pnpm exec eslint src/themes/cinnaglass/screens.tsx` 无输出。

---

## 2. `src/themes/cinnaglass/diary.css`

### 改了什么（A2）

723 行 → 646 行。删除前逐个选择器重新 grep 全 `src` + `scripts/` + `index.html` 回查，确认零消费者：

| 删除的选择器 | 复查结论 |
|---|---|
| `.journal-engine` | 旧翻页引擎容器；现存的是 `.journal-engine-slot`（`journal-room-book.tsx:242`），词边界不匹配，故 `.journal-engine` 确为零消费者 |
| `.journal-binding` / `.journal-binding::after` / `.journal-book[data-single='true'] .journal-binding` | 全库无生成点 |
| `.journal-pager` / `… button` / `… button:disabled` / `… span` / `… small` | 现用 `.journal-room-pager`（`journal-room-book.tsx:327`）；`.journal-pager` 零命中 |
| `@media(max-width:767px),(max-height:599px) { .journal-pager { left: 10px } }` | 同上 |
| `.diary-surface .compose-collapsed.draft .journal-quill` | 结构性失配：羽毛笔（`journal-room-book.tsx:363`）是 `.journal-book` 的直接子节点、`ComposerComponent` 的**兄弟**，永不可能是 `.compose-collapsed` 的后代 |
| `:root` 里的 `--diary-text` `--diary-sub` `--diary-line` `--diary-bg` `--diary-card` | 全库 `var(--diary-*)` 只有一处读取（`screens.tsx:454` 的 `--diary-blue` / `--diary-pink`），这五个无任何读取点 |

`:root` 块本身保留（`--diary-blue` / `--diary-pink` 仍在用），并加了一句注释说明其余别名为什么被删。

未做（属 B 类，未动）：`.diary-surface .compose-collapsed` 的重复声明、`.journal-page-number{display:none}` 的两次声明、`.journal-engine-slot` 被 `journal-room.css` 归零的阴影、`.stage[data-reading]` 与 `.modal-scrim.diary-scrim` 两条 shell 规则的迁出、以及整体的"苔绿层 + 棕皮层"扁平化。

### 验证

CSS 不过 eslint；构建产物选择器 diff 见第 6 节。

---

## 3. `src/themes/cinnaglass/journal-room.css`

### 改了什么（A3）

删掉 `.object-surface.diary-surface` 里的 `--diary-text` / `--diary-sub` 两个变量定义（575 → 573 行）。
验证：`grep -rn 'var(--diary-text)\|var(--diary-sub)' src/ scripts/` 改前改后均为零结果，说明删除安全。其余 573 行全部有消费者，未动。

---

## 4. 四个 journal 源文件（注释 + Feature doc 回指）

`test -f ai/features/timeline.md` 通过。四个文件各加一行 `// Feature doc: ai/features/timeline.md`（该文 `:6` 的"关联代码"清单本来就列了它们，之前代码侧没有回指）。

### `journal-room-book.tsx`

- 文件头：原来只有一句 "Real paginated content is also the source of each turning paper face."（读者看不出文件是干什么的），替换为四行职责说明 + Feature doc 行。
- 补注释：`BookState`（非响应式、DOM 由本文件而非 React 拥有）、`JournalRoomBook` 的 `active` 语义、`showPage`、图片回填 effect、200 行排版 effect（说明字体等待、锚点恢复、folio/heading 量测的原因）、目录去重键与页眉必须同源、`published` 清锚点、`onClickCapture` 的"伸手去写就停止翻页"。
- 验证：`tsc -b` 通过，`eslint` 无输出。

### `journal-layout.ts`

- 补上**原本完全缺失**的文件头（本分区唯一一个一行说明都没有的模块）。
- 补注释：`JournalPart`、`Context` 的 `roomArt` 含义、`element` 助手、`buildJournalPages` 追加"预留高度来自 CSS 自定义属性、页数补齐为偶数"两句、`size` 的 +22px 间距。
- 验证：`tsc -b` 通过，`eslint` 无输出。

### `journal-turn.ts`

- 文件头补一句"本文件只管几何与绘制，何时翻、翻多远是 controller 的事" + Feature doc 行（import 语句相应移到注释块之后，仍是文件第一条语句）。
- 补注释：`STRIPS`（24 条的取值理由）、`JournalTurnStage`、`face`、`createSheet`、`render`、`updateImages`、`destroy`。
- 验证：`tsc -b` 通过，`eslint` 无输出。

### `journal-turn-controller.ts`

- 补文件头（原来只有 class 上方有注释） + Feature doc 行。
- 补注释：`Motion`、`ease`、`target`、`busy`、`to`、`by`、`startSheet`、`tick`、`updateImages`、`finish`、`clear`、`destroy`。
- 验证：`tsc -b` 通过，`eslint` 无输出。

---

## 5. `src/lib/storage.ts` / `src/lib/posts.ts` / `image-slot.js`

### `storage.ts`（§5.7 + §六）

- 文件头 `:5` 删掉过时的 `(from the image-slot preview)`，改为 `display thumbnail (made here, from the original)`——缩略图由 `makeThumbDataUrl` 从原图再生，`image-slot` 早已不在这条链路上。
- `SIGNED_URL_TTL` 补注释，并指向 `SIGNED_URL_REFRESH_MS`（A8 已落地，两者现在同源）。
- `dataUrlToBlob`、`newId` 补一句职责。
- `uploadMemoryImage` 头注释按报告改写（第三参已在前序提交删除，这里只对齐叙述）。
- 额外一处（报告未列，但同属"过时叙述"）：`THUMB_MAX` 上方的 "the composer slot's preview is sized to its tiny frame" 也在指已移除的 image-slot 链路，删掉该从句，保留 1024 的取值理由。
- 验证：`tsc -b` 通过，`eslint` 无输出。

### `posts.ts`（§六）

文件头 `(回忆存储 ①)` → `(回忆存储 ①, ai/features/timeline.md)`，补上编号出处。`test -f` 通过。验证：`tsc -b` 通过，`eslint` 无输出。

### `image-slot.js`（§5.8）

未删代码（删 `_emitChange` / `slot-change` 属 B6）。只在 `_emitChange` 注释末尾补一句
`// No listener today: the composer uploads through its own file input.`，
说明这段协作关系已不存在（`grep 'slot-change'` 全库零监听者）。验证：`eslint` 无输出。

---

## 6. 全量验证

### 6.1 构建

`pnpm exec vite build` 成功（exit 0），产物已 `rm -rf dist`。

### 6.2 构建产物 CSS 选择器集合 diff

做法：把工作区的 `diary.css` / `journal-room.css` 临时换回 `HEAD` 版本 → `vite build` → 提取 `dist/assets/*.css` 的全部选择器与 at-rule 前奏、去重排序 → 恢复本轮版本 → 再 build → 再提取 → `comm` 比较。
（注：第一次跑的基线文件被同一项目里另一个并行会话覆盖过，已按上述方式重跑，结论取重跑的这一次。）

- 基线 372 个选择器 → 改动后 362 个
- **只出现在基线（即被删掉）的 10 个**：

```
.diary-surface .compose-collapsed.draft .journal-quill
.journal-binding
.journal-binding:after
.journal-book[data-single=true] .journal-binding
.journal-engine
.journal-pager
.journal-pager button
.journal-pager button:disabled
.journal-pager small
.journal-pager span
```

- **新增：0 个。**

差集与"我删的选择器"完全一致（媒体查询里的 `.journal-pager{left:10px}` 与外层同名，去重后合并为同一条，11 个规则块对应 10 个唯一选择器）。

⚠️ 说明：`screens.tsx` 的 `ScreenStyles` 是 React 渲染出来的 `<style>` 字符串，**不进 Vite 的 CSS 管线**，因此那 31 条被删的时间线选择器不会出现在 `dist/assets/*.css` 里，这个 diff 覆盖不到它们。它们的零消费者结论由脚本化的词边界回查（见第 1 节）与 `tsc -b` / `eslint` 保证。

### 6.3 `verify-comment-only.mjs`

```
node ai/project-audit/scripts/verify-comment-only.mjs --root . --revision HEAD --files <8 个 ts/tsx/js>
{ "total": 8, "commentOnly": 7, "codeChanged": ["src/themes/cinnaglass/screens.tsx"] }
```

与预期一致：`screens.tsx` 因为删了 `<style>` 里的样式字符串（AST 上是模板字面量内容变化）报 `code-changed`；其余 7 个（`journal-room-book.tsx`、`journal-layout.ts`、`journal-turn.ts`、`journal-turn-controller.ts`、`image-slot.js`、`storage.ts`、`posts.ts`）全部 `comment-only`。
另外人工核了一遍 `screens.tsx` 的 `git diff -U0`：除 `<style>` 模板字符串外，所有增删行都是注释文本，没有一行可执行代码变动。

### 6.4 未运行

- `prettier`、`git commit`：按指令未执行。
- 四个 Playwright 脚本（`check-diary.mjs` / `check-journal-art.mjs` / `check-journal-turn.mjs` / `compare-journal-art.mjs`）：需要 `DIARY_NODE_MODULES` 与一个跑着的 dev server，本轮未跑。

---

## 7. 未做的事 / 需要用户决策的登记项

| # | 事项 | 原因 |
|---|---|---|
| 1 | **`.tl` / `.tl::before` 未删** | 与 `journal-photo-corner tl` 类名碰撞，`::before` 会在日记照片左上纸角上真实画出一条虚线；删除 = 改变渲染结果，与"日记本冻结"冲突。已在代码里就地注释，等用户定夺（改名 / 接受移除） |
| 2 | `cinnaglass.css:297` 的 `.paper` token 列表里仍列着 `.tl-card`（A11） | 属另一分区，指令明确不碰。`.tl-card` 已在本轮删除，该行现在指向一个不存在的元素，应由 `cinnaglass.css` 的审阅者一并处理 |
| 3 | **`scripts/check-diary.mjs` 已失效** | 它在 `:34,54,75,76,81,82,88,93,94` 上断言 `.tl-card` / `.tl-time` / `.tt`。这些元素在滚动时间线被删时就已经不再渲染（先于本轮），所以这个脚本此前就跑不通；本轮删掉对应 CSS 只是让失效显性化。`scripts/` 不在允许改动清单内，仅登记 |
| 4 | `ai/UX.md §N` / `ai/STYLE.md §N` / codex 报告路径的引用 | 本分区源码内**零命中**（只有两处 `design ref` 指向 `cinnaglass-history/*.html`，都已处理）。这些引用集中在分区外：`WorldPage.tsx:242,345,434`、`room/room-types.ts:124,136`、`shell/rail.tsx:27`、`room/study-room.ts:52`。按映射（§2 → `ai/design_system/props.md` + `uiux/uiux.md`；§4 → `uiux/interaction.md`；§5 → `props.md`）应由对应分区处理，避免两边重复改 |
| 5 | B 类全部 | `screens.tsx` 拆分、`diary.css` 扁平化、shell 规则迁出、`journal-*` 建子目录、取消 `ComposerComponent` 注入、删 `slot-change`、`types.d.ts` 移位、替换 `image-slot` —— 均未触碰 |
| 6 | 工作区里还有大量**非本轮**的改动文件 | `git status` 显示 `useAuth.ts`、`chat.ts`、`WorldPage.tsx`、`cinnaglass.css`、`shell/*` 等数十个文件为 modified，来自同一仓库上并行进行的其它分区落实，与本日志无关 |
