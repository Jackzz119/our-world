# PROJECT-AUDIT 第二步 · 重构日志 PA-029：`screens.tsx` 拆分 / `diary.css` 扁平化（B 类）

- 运行：`2026-09-19-01`，分支 `dev`，起始 HEAD `596d5ea`
- 依据：`ai/project-audit/runs/2026-09-19-01/evidence/journal-screens-structure-review.md` 的 **B1 / B2 / B3 / B5 / B6 / B7**
- 授权：用户已批准，且明确「日记本冻结、**渲染结果必须完全一致**」
- 未做：**B4**（`journal-*` 建子目录）、**B8**（替换 `image-slot`）、**B9**（`screens.tsx` 改名）——按任务边界留给后续统一阶段
- 未提交、未跑 prettier；`cinnaglass.css`、`WorldPage.tsx`、chat 族、room 族一行未碰

---

## 0. 新旧对照表

| 新文件 | 行数 | 来源（`596d5ea:src/themes/cinnaglass/screens.tsx` 行段） | 对外导出 |
|---|---|---|---|
| `date-format.ts` | 26 | `252–273` | `fmtDay`、`fmtFullDate`（`fmtMeta` 无外部消费者，保持模块私有） |
| `author-tone.ts` | 43 | `275–312` | `hashOf`、`avaGrad`、`toneOf`、`type AuthorTone` |
| `use-signed-thumbs.ts` | 43 | `678–713` | `useSignedThumbs` |
| `wishlist.tsx` | 66 | `234`、`243–250`、`864–913` | `Wishlist`（见 §2 的签名说明） |
| `photo-wall.tsx` | 122 | `750–862` | `PhotoWall`（原 `PhotosBody`） |
| `post-detail.tsx` | 137 | `314–440` | `PostDetail`（内含 `Avatar`） |
| `composer.tsx` | 243 | `442–676` | `Composer`（`MAX_IMGS` 无外部消费者，保持私有） |
| `object-surfaces.css` | 224 | `21–225`（`ScreenStyles` 模板正文）+ 从 `diary.css` 迁入的两条 shell 规则 | 副作用 |
| `src/types/image-slot.d.ts` | 24 | 原 `themes/cinnaglass/types.d.ts`（`git mv`） | 全局 JSX 声明 |

保留文件的变化：

| 文件 | 行数变化 | 说明 |
|---|---|---|
| `screens.tsx` | 1061 → **211** | 路径与对外导出（`SubScreen`、`SurfaceOrigin`、`TabKey`）一字未改，`WorldPage.tsx` 的 import 不动 |
| `diary.css` | 647 → **523** | 删 81 条被覆盖声明（含 10 条整规则）、迁出 2 组 shell 规则、换文件头 |
| `journal-room-book.tsx` | −8 | 取消 `ComposerComponent` 注入 |
| `image-slot.js` | 536 → **520** | 删 `_emitChange` / `slot-change` |

---

## 1. 样式等价的验证方式（先说清楚这件事）

**日记本打不开，所以没在真实面板上验证。** 仓库没有 `.env.local`，`ProtectedRoute` 拿不到 Supabase 会话，`/?enter=1` 会被挡在登录页；`scripts/` 下四个回归脚本依赖 `playwright`，而 `DIARY_NODE_MODULES` 未设、全机也没有可解析的 `playwright` 包（`node -e "dependency('playwright')"` 报 `Cannot find module`）。因此改用下面这套**离线计算后样式差分**，它比截图严格（能看见不可见属性，且不受字体抗锯齿抖动影响），但确实**不是在真实日记面板上跑的**。

### 1.1 装置

本机装有 Google Chrome 153，用 `--headless=new` 驱动。脚本放在会话临时目录（不进仓库）：

- `scene.html` —— 按 `screens.tsx`、`journal-room-book.tsx`、`journal-layout.ts`、`journal-turn.ts` 的真实产物手写的 DOM 复刻，共 **315 个元素**，覆盖 10 个场景：
  S1 静止对开页（含 `--left` / `--right` / 单图 / 多图 / 空页 / 目录抽屉 / 页码器 / 状态条 / 折叠 Composer）、S2 草稿态 Composer、S3 展开态 Composer（含 `pk-row`）、S4 拖拽态 + 空图 `pk-strip`、S5 `PostDetail` 浮层、S6 照片墙 + 灯箱、S7 心愿单、S8 离屏 `.journal-measure`、S9 翻页舞台（`journal-turn-*` 里的真实页克隆）、S10 素纸回退版式（`roomArt:false`）。
- 三份 CSS 按**真实 bundle 顺序**注入：`index.css` → `cinnaglass.css`（内含 `@import materials.css`）→ `diary.css` → `journal-room.css` → `journal-turn.css` → `object-surfaces.css` → `navigation-glass.css`，改造前最后再追加 `ScreenStyles` 的 `<style>`。顺序已用构建产物核对（`dist/assets/index-*.css` 中 `--sky-1` 2729 < `.diary-surface` 20826 < `Journal WenKai` 31563 < `.journal-turn-stage` 42058 < `.object-scrim` 43989 < `.rail` 54706）。
- 断点用**三个固定尺寸 iframe**实现（媒体查询按 iframe 视口求值，不依赖窗口缩放）：`1440×900`、`960×700`、`390×844`，另加 `1000×560` 专门打开 `@media (max-height: 599px)` 这一支——任务要求的三档之外补的，否则那段样式全程不被触发。
- 每个元素 dump `getComputedStyle` 的**全部属性**，外加 `::before` / `::after`（`content` 为 `none` 的伪元素跳过，因为不生成盒子）。单次快照约 16 MB JSON。

自检：连跑两次，`diff` 为 0 条 —— 装置本身是确定性的。

### 1.2 选择器覆盖率

同一次运行里对每张样式表的每个选择器做 `querySelectorAll` 计数。`diary.css` + `object-surfaces.css` 共 180 个选择器，**零命中的只有 5 个**，且全部是「装置原理上做不到」的：

```
.journal-open:focus-visible          伪类，静态 DOM 无法进入该状态
.diary-surface :is(button, textarea):focus-visible   同上
.object-surface:focus-visible                        同上
".room-handle)" / "textarea)"        :is(...) 按逗号切开后的碎片，非真实选择器
```

### 1.3 基线

基线不取工作区，而是 `git worktree add <tmp> 596d5ea` 出来的**干净副本**，避免被本会话（以及同仓库并行作业）的改动污染。

---

## 2. 批次 B1a —— 纯函数外迁

新增 `date-format.ts`、`author-tone.ts`、`use-signed-thumbs.ts`。

**逐字搬运证明**（全部输出为空 = 逐字相同；`sed` 只用来把新加的 `export` 关键字去掉再比）：

```
diff <(sed -n '252,273p' <596d5ea>/screens.tsx) <(sed -n '5,$p' date-format.ts      | sed 's/^export const /const /')
diff <(sed -n '275,312p' <596d5ea>/screens.tsx) <(sed -n '6,$p' author-tone.ts      | sed 's/^export const /const /; s/^export type /type /')
diff <(sed -n '678,713p' <596d5ea>/screens.tsx) <(sed -n '8,$p' use-signed-thumbs.ts| sed 's/^export function /function /')
```

`screens.tsx` 侧只做了三件事：删掉这三段、加三行 import、删掉随之失效的 `SIGNED_URL_REFRESH_MS` 与 `World` 两个 import。

验证：`tsc -b --force` 0、`eslint` 0、`vite build` 0；计算后样式 diff **0 条**。

## 3. 批次 B1b —— 四个组件外迁

顺序按 §2.4：`wishlist` → `photo-wall` → `post-detail` → `composer`，每步单独过 `tsc` / `eslint`。

**逐字搬运证明**（对 `596d5ea` 原文，输出全空）：

```
diff <(sed -n '442,676p' old) <(sed -n '9,$p'  composer.tsx    | sed 's/^export function Composer({/function Composer({/')
diff <(sed -n '750,862p' old) <(sed -n '10,$p' photo-wall.tsx  | sed 's/^export function PhotoWall(/function PhotosBody(/')
diff <(sed -n '314,440p' old) <(sed -n '11,$p' post-detail.tsx | sed 's/^export function PostDetail({/function PostDetail({/')
diff <(sed -n '234p'      old) <(sed -n '8p'    wishlist.tsx)
diff <(sed -n '243,250p' old) <(sed -n '10,17p' wishlist.tsx)
diff <(sed -n '864,865p;873,913p' old) <(sed -n '19,20p;26,$p' wishlist.tsx)
```

### 对 §2.2 的一处偏离：`Wishlist` 不再收 props

§2.2 写的是 `Wishlist({ wishes, setWishes })`，并让 `wishlist.tsx` 导出 `SEED_WISHES`。照做会被仓库的 lint 规则挡下——`react-refresh/only-export-components` 在本仓库是 **error**，而 `allowConstantExport` 只放行原始值，放不行数组字面量：

```
wishlist.tsx
  10:14  error  Fast refresh only works when a file only exports components…
```

三个选项里（再开一个 `wishlist-data.ts` 碎片文件 / 加 `eslint-disable` / 把状态下沉），选了**把状态下沉到 `wishlist.tsx`**：

```
export function Wishlist() {
    // Own the mock's state and its localStorage write: this surface stays
    // mounted for the whole session, exactly as it did inside SubScreen.
    const [wishes, setWishes] = useState<Wish[]>(() => load('ow-wishes-v1', SEED_WISHES));
    useEffect(() => save('ow-wishes-v1', wishes), [wishes]);
```

行为为什么不变：`SubScreen` 里 `SURFACES.map` 对三个表面都是无条件渲染（`surface.k === 'wishlist' && …` 的条件只看静态表，恒真），所以 `Wishlist` 与 `SubScreen` 同生共死，`useState` 的惰性初始化和那条 `useEffect` 的触发时机与原来逐帧一致；localStorage 键 `ow-wishes-v1` 一字未改。`screens.tsx` 侧相应删掉了 `wishes` 状态、`save` 的 effect，以及 `@/lib/local-store.ts` 的 import。

另两处刻意不照抄 §2.2：`MAX_IMGS`（`composer.tsx`）与 `fmtMeta`（`date-format.ts`）没有导出——它们没有外部消费者，导出等于造一个死接口，这与审阅报告 A10「零消费者导出降为模块私有」的判据一致。

验证：`tsc -b --force` 0、`eslint` 0、`vite build` 0；计算后样式 diff **0 条**。

## 4. 批次 B5 —— 取消 `ComposerComponent` 注入

`journal-room-book.tsx`：

```
-import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
+import { useCallback, useEffect, useRef, useState } from 'react';
+import { Composer } from './composer';

     active,
-    onDetail,
-    ComposerComponent
+    onDetail
 }: {
     …
-    onDetail: (post: FeedPost) => void;
-    ComposerComponent: ComponentType<{ worldId: string | null; onPublished: () => void }>;
+    onDetail: (post: FeedPost) => void;
 }) {

-<ComposerComponent worldId={feed.worldId} onPublished={published} />
+<Composer worldId={feed.worldId} onPublished={published} />
```

`screens.tsx` 侧删掉 `ComposerComponent={Composer}` 与 `Composer` 的 import。注入原本只为躲开 `journal-room-book → screens.tsx` 的反向依赖，`composer.tsx` 独立后这个理由消失，且 `composer.tsx` 不 import 任何 journal 模块，**不成环**（`tsc -b` 与 `vite build` 均通过可作旁证）。

CSS 顺序未受影响：`composer.tsx` 不 import 样式表，构建产物里的选择器偏移量与改前一致。

验证：`tsc -b --force` 0、`eslint` 0、`vite build` 0；计算后样式 diff **0 条**。

## 5. 批次 B1c —— `ScreenStyles` → `object-surfaces.css`（唯一有层叠风险的一步）

`screens.tsx` 里那个渲染进 body 的 `<style>` 删除，正文原样搬到 `object-surfaces.css`，import 放在 `journal-room-book` **之后**：

```
 import './diary.css';
 import { JournalRoomBook as JournalBook } from './journal-room-book';
+// Last of the stylesheet imports on purpose: the shell's ties against
+// diary.css / journal-room.css are decided by load order.
+import './object-surfaces.css';
```

**逐字搬运证明**（唯一改动是去掉模板字符串带的 2 格缩进，`sed 's/^./  &/' ` 把缩进加回去后比对，输出为空）：

```
diff <(sed -n '21,225p' <596d5ea>/screens.tsx) <(sed -n '6,$p' object-surfaces.css | sed 's/^./  &/')
```

文件头另加了 5 行职责说明，写明「必须排在 journal-room.css / journal-turn.css 之后」，免得下一个人随手上移 import。

**层叠位移**：`ScreenStyles` 原来在 body 里，文档顺序全场最后；搬进 CSS 后它排在 `journal-turn.css` 之后、`navigation-glass.css` 之前。也就是说相对 `navigation-glass.css` 它从「后」变成了「前」。核对过 `navigation-glass.css` 的全部选择器，与 `.object-*` / `.compose*` / `.pk-*` / `.pd*` / `.btn-*` / `.ava` / `.tl*` / `.pw*` / `.wl*` / `.wish` / `.lb*` / `.empty-hint` **零交集**，所以这次位移没有真实冲突面；装置里的 CSS 顺序也照这个真实顺序摆，diff 结果覆盖了这一点。

验证：`tsc -b --force` 0、`eslint` 0、`vite build` 0；计算后样式 diff **0 条**（4 个断点 × 315 个元素 × 全属性）。

## 6. 批次 B2 —— `diary.css` 扁平化

### 6.1 怎么判定「被覆盖」

没有靠肉眼读两份 700 行文件，而是让浏览器自己回答。做了**两轮逐声明探针**，每轮都在同一套装置里：把 `diary.css` 的某一条声明从 CSSOM 里 `removeProperty` 掉，重读该规则命中的全部元素**及其整棵子树**的计算后样式，再把 `cssText` 还原。`diary.css` 共 100 条规则、404 条声明，4 个断点各跑一遍。

- **第一轮（正常加载）**：150 条声明「删掉毫无影响」。
- **第二轮（把 `journal-room.css` + `journal-turn.css` 整张 `disabled = true`）**：同样的探针再跑一遍。

两轮一交叉，就把 150 条分成了两类：

| 分类 | 判据 | 条数 | 处置 |
|---|---|---|---|
| **A 类** | 正常时无影响，**关掉棕皮层后有影响** → 确实是被 `journal-room.css` 压住的 | 80 | **删** |
| **B 类** | 两轮都无影响 → 与棕皮层无关，是别的原因造成的冗余 | 65 | **不删** |

B 类为什么不删（这正是「被覆盖」和「碰巧没效果」的区别）：`index.css` 的 preflight 已经给了 `*{box-sizing:border-box}`、`img{display:block}`、`button{font:inherit;color:inherit;background:transparent;border:0}`，所以 `.journal-page{box-sizing}`、`.journal-photo img{display:block}`、`.journal-index button{font:inherit…}` 这类是「与全局 reset 撞值」；`.journal-photo{display:block}` 是「父级 `display:grid` 把子项块化了」，删掉它就绑死在父级永远是 grid 上；`.journal-quill{pointer-events:auto}` 删掉等于落回初始值 `auto`。这些都超出「被 journal-room.css 覆盖」这句授权，一条没动。

另外**凡是选择器里带伪类的规则，一条声明都不删**——装置进不去 `:hover` / `:focus-visible` 状态，等价性无法证明。被这条规则挡下的 A 类项只有一条：`.journal-photos:first-child { margin-top: 0 }`（它在棕皮书里确实被 `.journal-room-entry .journal-photos{margin:0 0 17px}` 压死，但素纸回退路径下的「首子」情形装置没铺到，就留着）。

在 80 条之外额外删了 2 条，是审阅报告 §1.8 点名的**同文件内重复**，且能指名幸存的那一份：

- `@media (max-width: 767px), (max-height: 599px) .journal-page-number { display: none }` —— 与基础规则 `.journal-page-number{display:none}` 同值重复。
- `@media (max-width: 1199px) .diary-surface .object-hd { right: 48px }` —— 与基础规则同值重复（两者本就都被 `journal-room.css:41` 的 `right: 9.7%` 压住）。

合计 **81 条声明**，其中 10 条规则被删空后整条移除：`.journal-page.--right`、`.journal-page.--right .journal-running-title`、第二条 `.diary-surface .compose-collapsed`（只剩 `padding-right`）、以及媒体查询里的 `.object-surface.diary-surface`（767 档）、`.diary-surface .object-hd`（两档）、`.diary-surface .object-hd h2`（767 档）、`.diary-surface .compose`、`.journal-page-number`、`.journal-quill`。删除由脚本按「规则序号 + 属性名」执行，脚本会先断言选择器文本与计划一致，再按源码字节区间切除，不重排任何保留下来的文本。

### 6.2 删了哪些（按选择器归并）

| 选择器 | 删掉的属性 | 压住它的规则 |
|---|---|---|
| `.object-surface.diary-surface` | `--surface-shift-x` `width` `height` `top` `padding` `border-radius` `border` `overflow` `background` `box-shadow` | `journal-room.css:10–30` |
| `.diary-surface::before` / `::after` | `content` | `journal-room.css:34–37`（`content: none`） |
| `.diary-surface .object-hd` | `top` `left` `right` `padding` | `journal-room.css:38–45` |
| `.diary-surface .object-hd h2` | `font` `letter-spacing` | `journal-room.css:46–55` |
| `.diary-surface .object-x` | `width` `height` `color` | `journal-room.css:56–61` |
| `.journal-page.--right` | 整条（`background`） | `journal-room.css:112–120`（`background: transparent`） |
| `.journal-measure` | `padding` `font` | `journal-room.css:74–86`、`128–131` |
| `.journal-avatar` | `box-shadow` | `journal-room.css:151–161` |
| `.journal-page.--right .journal-running-title` | 整条（`text-align`） | `journal-room.css:270–284` |
| `.journal-empty-page` | `color` | `journal-room.css:288–291` |
| `.journal-bookmark` | `top` `right` `letter-spacing` `min-height` `width` `border` `background` `color` `padding` `clip-path` `font` | `journal-room.css:292–309` |
| `.journal-index` | `right` `top` `max-height` `background` | `journal-room.css:310–318` |
| `.diary-surface .compose` | `right` `bottom` | `journal-room.css:358–361` |
| `.diary-surface .compose-collapsed` | `padding`、`padding-right`（第二条整条） | `journal-room.css:362–364`（`padding: 0`） |
| `.diary-surface .compose-collapsed .ph` | `font` `color` | `journal-room.css:365–372` |
| `.journal-quill` | `position` `right` `bottom` `width` `height` `transform` `filter` `cursor` | `journal-room.css:383–395` |
| `.diary-surface .compose.is-open` | `inset` `width` | `journal-room.css:396–399` |
| `.journal-status` | `left` `top` `background` | `journal-room.css:400–404` |
| `@media ≤1199` 的 `.object-surface.diary-surface` / `.diary-surface .object-hd` | `--surface-shift-x` `width` / 整条 | `journal-room.css:409–448`，以及基础规则同特异度后置取胜 |
| `@media ≤767 或 ≤599h` 的 6 条 | 见上表 | `journal-room.css:449–542` |

### 6.3 有意保留的「看起来也死」的东西

- `.diary-surface::before` / `::after` 删掉 `content` 之后，`position` / `inset` / `border` 等仍留着。棕皮层的 `content: none` 让这两个伪元素根本不生成盒子，按理整条都可以删；但 `getComputedStyle(el, '::before')` 仍然会回一份计算值，删了就会让 JSON diff 非空。用户的验收口径是「diff 必须为空」，所以这两条只掉了 `content`。
- `.journal-page.--right .journal-page-number { left: auto; right: 32px }`：元素被 `display:none`，视觉上永远不生效，但 `right` 的计算值会变，同样按 diff 口径留下。

### 6.4 验证

改前一份快照、改后一份快照，`diff`：

```
node dump.mjs pre-b2.json   → 315 nodes × 4 breakpoints
node prune.mjs diary.css plan-b2.json → removed 81 declarations, 10 whole rules; 647 -> 530 lines
node dump.mjs after-b2.json
node diff.mjs pre-b2.json after-b2.json → style diffs: 0
```

**0 条**，含素纸回退场景 S10 与翻页舞台 S9。`tsc -b --force` 0、`vite build` 0。

## 7. 批次 B3 —— 两条 shell 规则迁出

审阅报告建议迁去 `cinnaglass.css`，但本轮任务边界明确「不碰 `cinnaglass.css`（另一分区）」。落点改为 `object-surfaces.css`——这张表本来就是「房间物件弹层外壳」的家，`.modal-scrim.diary-scrim` 与它同属一层；`.stage[data-reading]` 之所以存在，也正是因为「有一个物件弹层开着」。

从 `diary.css` 原样剪下、贴到 `object-surfaces.css` 的 `.object-scrim` 之前（声明一字未改，另加 3 行说明）：

```css
/* While a room object is open the stage behind it stands down: its props go
   invisible and un-clickable, and the diary gets a thinner scrim than the other
   modals. These live with the shell, not with the journal's own paper. */
.stage[data-reading='true'] :is(.moment-card, .music-wrap, .chat-card, .room-handle) {
    visibility: hidden;
    pointer-events: none;
}
.stage[data-reading='true'] .presence-tag {
    opacity: 0;
}
.modal-scrim.diary-scrim {
    background: rgba(26, 27, 23, 0.1);
    backdrop-filter: none;
}
```

层叠安全性：这三条从 `diary.css` 的位置后移到 `object-surfaces.css`，中间隔着的 `journal-room.css` 与 `journal-turn.css` 里没有任何 `.stage` / `.modal-scrim` 选择器，所以后移不可能改变胜负。装置里的 `.stage[data-reading="true"]` 场景（S0，房间道具 + presence-tag + scrim）在改前改后都被 dump，diff 为 0。

`diary.css` 的文件头同时换掉：原来写的是「B · 苔绿手札」，与它今天的角色（棕皮书的结构底层）已经对不上。

`.stage .room-scene { transform: none }` **没有迁**：审阅报告 §1.8 点名的是 `:11–24` 那两组，这条不在授权清单里。探针显示它当前是惰性的（全库没有任何规则给 `.room-scene` 设 transform），已在文件头登记，留给后续统一阶段。

验证：计算后样式 diff **0 条**；`tsc -b --force` 0、`vite build` 0。

## 8. 批次 B6 —— 删 `image-slot.js` 的 `slot-change`

删掉 `_emitChange` 方法（12 行）与两个调用点：`clear` 动作里的 `this._emitChange(null, null)`、`_ingest` 成功后的 `this._emitChange(url, file)`。

```
-                    else this._render();
-                    this._emitChange(null, null);
-                }
+                    else this._render();
+                }
…
-                }
-                this._emitChange(url, file);
-            } catch (err) {
+                }
+            } catch (err) {
…
-        // Notify React of the current selection: the original File (for Storage
-        // upload) + the webp thumbnail dataURL (for preview). Fires (null, null)
-        // on clear. The localStorage behavior above is untouched.
-        // No listener today: the composer uploads through its own file input.
-        _emitChange(dataUrl, file) {
-            this.dispatchEvent(
-                new CustomEvent('slot-change', { bubbles: true, composed: true,
-                    detail: { id: this.id || null, dataUrl, file } })
-            );
-        }
```

`_emitChange` 只做一件事——派发 `slot-change` 事件；`git grep slot-change` 在 `src/` 与 `scripts/` 下已经零结果，localStorage 落盘（`setSlot` / `ow-image-slots-v1`）与 `_render()` 都在删除点之前、原样保留，所以设置页拖头像的落盘与显示链路一行没动。

536 → 520 行。`eslint` 0。**未手动验收设置页**（同样是因为进不去世界）。

## 9. 批次 B7 —— `types.d.ts` → `src/types/image-slot.d.ts`

`git mv`，内容只换文件头注释（说明它是全局 JSX 增补，所以归 `src/types/`，不归主题目录）。`tsconfig.app.json` 的 `include: ["src"]` 覆盖新位置，配置零改动；`settings.tsx:134` 的 `<image-slot …>` JSX 不报类型错（`tsc -b --force` 0）。

登记一条未改：`src/main.tsx:5` 的注释仍写「used by settings/screens」，而 `screens.tsx` 早就不用它了——`main.tsx` 不在本轮授权文件内，留给后续。

---

## 10. 总验收

最后一次从干净基线到当前工作区的全量比对：

```
git worktree add <tmp> 596d5ea
HARNESS_ROOT=<tmp> node dump.mjs base-596d5ea.json
node dump.mjs final.json
node diff.mjs base-596d5ea.json final.json   → style diffs: 0
```

| 门禁 | 结果 |
|---|---|
| `pnpm exec tsc -b --force` | 0 |
| `pnpm exec eslint`（本轮全部改动文件） | 0 error / 0 warning |
| `pnpm exec vite build`（跑完即 `rm -rf dist`） | 0 |
| 计算后样式 diff（4 断点 × 315 元素 × 全属性 + `::before` / `::after`） | **0 条** |
| 选择器覆盖率回归（新出现的零命中选择器） | 无实质项（只有 `:is()` 逗号切分碎片与 `:focus-visible`，与改前同源） |

---

## 11. 未验证 / 未处理项

**未验证**

1. **没有在真实日记面板上验证**。缺 `.env.local` → 无 Supabase 会话 → `ProtectedRoute` 拦截 → `/?enter=1` 进不去世界。全部等价性结论来自上面那套 DOM 复刻装置。
2. **四个 Playwright 回归脚本一个都没跑**：`playwright` 在本机不可解析，`DIARY_NODE_MODULES` 未设。顺带记一笔：`scripts/check-diary.mjs` 已经过期（它断言 `.tl-card`，而那族样式在 `f3a0ad0` 就删干净了），下次修脚本时要一起处理。
3. **交互伪状态未覆盖**：`:hover`、`:focus-visible`、`::placeholder`、`::-webkit-scrollbar`、`@media (prefers-reduced-motion)`、`@media (prefers-color-scheme)`。对应的缓解措施是「带伪类的规则一条声明都不删」。
4. **未做视觉/像素比对**，只做计算后样式比对。字体 `Journal WenKai` 在装置里能正常加载（服务器把 `public/` 一起喂给了浏览器），但没有渲染像素层面的核对。
5. **B6 未手动在设置页拖图验收**（原因同 1）。

**未处理（已登记，留给后续阶段）**

| 项 | 位置 | 原因 |
|---|---|---|
| B4：`journal-*` 七文件移入 `journal/` | — | 任务边界明确留给后续统一阶段（`screens.tsx` 路径与导出本轮不动） |
| B9：`screens.tsx` → `object-surfaces.tsx` | — | 同上；会动 `WorldPage.tsx` 的 import |
| B8：用 React 头像选择器替换 `<image-slot>` | — | 行为变化，需用户单独拍板 |
| `.stage .room-scene { transform: none }` | `diary.css:8` | 不在 §1.8 点名的两条 shell 规则里，超授权范围 |
| `main.tsx:5` 注释仍说 "settings/screens" | `src/main.tsx` | 文件不在本轮授权列表 |
| `object-surfaces.css` 保留了 `ScreenStyles` 的紧凑排版 | — | 本轮禁跑 prettier；下次 `pnpm format` 会自动展开 |
| `.diary-surface::before/::after` 只掉了 `content`，其余声明留着 | `diary.css` | 为满足「计算后样式 diff 必须为空」的验收口径 |
| `diary.css` 里 65 条「非棕皮层原因」的冗余声明 | 见 §6.1 B 类 | 超出「被 journal-room.css 覆盖」这句授权 |

**并行作业提示**：本轮期间同一工作区里另有一份 chat / room / login 分区的改动在推进（`channel-screen.tsx`、`chat-data.ts`、`room/*`、`LoginPage.tsx`、`scene.tsx → login-backdrop.tsx` 等）。本轮一行未碰，且已逐次确认 `index.css`、`cinnaglass.css`、`materials.css`、`navigation-glass.css` 四张共享样式表在整个过程中都是 `git status` 干净的——样式差分结论不受其影响。
