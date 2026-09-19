# PROJECT-AUDIT 第二步 · 分区审阅：日记本 / screens 表面 / feed 数据层

- 运行：`2026-09-19-01`，分支 `dev`，HEAD `a9f7cfa`
- 分区：`src/themes/cinnaglass/` 下 `screens.tsx`、`journal-room-book.tsx`、`journal-layout.ts`、`journal-turn.ts`、`journal-turn-controller.ts`、`journal-room.css`、`journal-turn.css`、`diary.css`、`image-slot.js`、`types.d.ts`；以及 `src/hooks/useFeed.ts`、`src/lib/posts.ts`、`src/lib/storage.ts`、`src/types/feed.ts`
- 方式：全文通读 + `grep` 消费者反查 + 用脚本对三个 CSS 文件与 `ScreenStyles` 内联样式逐选择器比对 TSX/JS 语料（词边界匹配，排除样式块自身）
- 约束遵守：**只读**，未修改任何项目文件；未读取 `.claude/`、`.agents/`、`ai/sessions/`、`.env*`；**日记本（C 类物件 UI）视觉与交互本轮冻结**，下文只评结构，所有建议以「计算后样式逐像素不变」为前提

---

## 一、逐文件：职责 / 变化原因 / 消费者 / 命名与位置

### 1.1 `src/themes/cinnaglass/screens.tsx`（1093 行）

| 维度 | 结论 |
|---|---|
| 职责 | 四件事挤在一个文件：(a) 三个房间物件弹层的外壳与焦点陷阱（`SubScreen`）；(b) 时间线/照片墙/心愿单三份内容体；(c) 写入链路（`Composer`）；(d) 265 行内联 CSS（`ScreenStyles`） |
| 变化原因 | 至少 5 种互不相关的原因：日记视觉调整、照片墙灯箱、心愿单（纯本地 mock）、发帖上传链路、弹层无障碍/焦点规则。任何一项改动都要打开这个 1093 行文件 |
| 对外接口 | `SubScreen`（组件）、`SurfaceOrigin`（type，284）、`TabKey`（type，1093） |
| 消费者 | 仅 `src/pages/WorldPage.tsx:12`（`SubScreen`/`SurfaceOrigin`/`TabKey`），调用点 `WorldPage.tsx:511` |
| 命名/位置 | 文件名 `screens.tsx` 已与内容脱节——它现在只承载「房间物件弹层」这一组表面，`channel-screen.tsx` / `friends-page.tsx` / `settings.tsx` 才是同级的其它"screen"。真实语义是 `object-surfaces`。改名属 B 类（会动 `WorldPage.tsx` 的 import 与多份文档引用） |

要点：`ScreenStyles`（17–281）是一个 React 渲染出来的 `<style>` 元素，不走 Vite 的 CSS 管线（无 autoprefix、无压缩去重、无 CSS HMR），并且因为它渲染在 body 内的组件树里，**文档顺序在所有 bundled CSS 之后**，同特异度下永远赢。这是后面拆分方案里唯一有真实回归风险的一点。

### 1.2 `journal-room-book.tsx`（377 行）

| 维度 | 结论 |
|---|---|
| 职责 | 日记本的 React 宿主：量测容器尺寸 → 调 `buildJournalPages` 造真实 DOM 页 → 把页交给 `JournalTurnController` 做三维翻页 → 渲染书本美术图、目录抽屉、页码器、状态条、注入 Composer |
| 变化原因 | 排版触发条件（字体加载、ResizeObserver）、翻页几何取点（`folios`/`heading` 的 `getBoundingClientRect`）、目录交互。三者耦合在同一个 200 行 `useEffect`（93–198）里 |
| 对外接口 | `JournalRoomBook({ feed, thumbUrls, active, onDetail, ComposerComponent })` |
| 消费者 | 仅 `screens.tsx:15`（重命名为 `JournalBook`），`screens.tsx:772` 使用 |
| 命名/位置 | `journal-room-book` 的 "room" 指「房间物件版」，用来区别已删除的 `journal-book.tsx`。旧文件已删，这个后缀现在只剩历史含义；但 CSS 类名 `.journal-room-*` 大量依赖它、且 `scripts/check-journal-*.mjs` 按这些类名断言，**不建议现在改名** |

结构注记：`ComposerComponent` 作为 prop 注入（`screens.tsx:777`），是为了避开 `journal-room-book → screens` 的反向依赖。这个做法本身正确，但代价是 `Composer` 只能留在 `screens.tsx` 里；拆出 `composer.tsx` 后这个 prop 可以退化为直接 import，注入点可以取消（见 §2）。

### 1.3 `journal-layout.ts`（215 行）

| 维度 | 结论 |
|---|---|
| 职责 | 纯 DOM 排版引擎：`journalEntry()` 把一条 post 渲成 `<article>`；`buildJournalPages()` 用离屏 `.journal-measure` 真实量测、二分切分字素簇、装订成偶数页 |
| 变化原因 | 排版规则（留白、照片高度、切分策略）。与 React 完全无关 |
| 对外接口 | `journalEntry`、`buildJournalPages`、`JournalPart`、`JournalPage` |
| 消费者 | `journal-room-book.tsx:6`（`buildJournalPages`）；`scripts/check-journal-art.mjs:180` 以 `import('/src/themes/cinnaglass/journal-layout.ts')` 动态引入。`journalEntry` 对外导出但**无外部消费者**，只在本文件内被 `size()`/`add()` 调用 → 可降为模块私有 |
| 命名/位置 | 命名与职责一致。**缺文件头注释**，是本分区唯一一个连一行职责说明都没有的模块 |

### 1.4 `journal-turn.ts`（196 行）

| 维度 | 结论 |
|---|---|
| 职责 | 翻页的「几何 + 舞台」：`sheetPose()` 算 24 条纸片的柱面弯折位姿；`JournalTurnStage` 克隆真实页面 DOM 成正反两面，贴上书本底图、页眉、页码，逐帧写 transform |
| 变化原因 | 动画物理与视觉（弯折量、阴影、纸片数） |
| 对外接口 | `sheetPose`、`JournalTurnStage`、`TurnDirection`、`TurnFrame`、`TurnGeometry` |
| 消费者 | `journal-turn-controller.ts:1`；`scripts/check-journal-turn.mjs:254` 动态 import 校验 `sheetPose` |
| 命名/位置 | 一致 |

### 1.5 `journal-turn-controller.ts`（168 行）

| 维度 | 结论 |
|---|---|
| 职责 | 翻页的「调度」：一个有界的纸张队列，把 `to()/by()` 的目标页换算成一串 `Motion`，跑 rAF，提交页码，处理降级（`prefers-reduced-motion`、标签页隐藏、不支持 `preserve-3d`） |
| 变化原因 | 时序与连翻策略（980ms/470ms、38% 接续、最多 3 张） |
| 对外接口 | `JournalTurnController` |
| 消费者 | `journal-room-book.tsx:7` |
| 命名/位置 | 一致。`journal-turn.ts` 与 `journal-turn-controller.ts` 分得干净：几何 vs 调度，这是本分区最健康的一处边界 |

### 1.6 `journal-room.css`（575 行）

职责：批准稿「棕皮旧纸」的全部视觉——字体 `@font-face`、书本比例、页边距变量、条目版式、书签/目录/页码器/羽毛笔/Composer 的物件化定位，以及三档响应式。
消费者：`journal-room-book.tsx:8` 副作用 import。
`url()` 全部是根绝对路径（`:5` `/fonts/journal/…`，`:247`、`:317`、`:383`、`:459` `/ui/journal/*.webp`），**移动文件不影响资源解析**。
零消费者选择器：无。唯一死项是 `:18–19` 的 `--diary-text` / `--diary-sub` 两个变量定义，全库无 `var(--diary-text)` / `var(--diary-sub)` 读取点。

### 1.7 `journal-turn.css`（154 行）

职责：翻页舞台的定位与 3D 约束（祖先不得有 opacity/filter/overflow 裁剪）、纸面底图、页眉页码的物理贴合。
消费者：`journal-room-book.tsx:9`。
零消费者选择器：**无**（全部 15 个类名都能在 `journal-turn.ts` / `journal-room-book.tsx` 找到生成点）。本分区质量最好的 CSS 文件。

### 1.8 `diary.css`（723 行）—— 本分区最大的结构问题

职责名义上是「B · 苔绿手札」。按 `ai/features/timeline.md` 开头，苔绿手札是**已否决的历史视觉**（压在该文第七章）。但这个文件今天仍然是 `screens.tsx:14` 无条件 import 的、棕皮书的**基础层**：

- import 顺序：`screens.tsx:14 diary.css` → `screens.tsx:15 journal-room-book` → 其 `:8 journal-room.css` / `:9 journal-turn.css`。因此 `journal-room.css` 在后、同特异度下胜出。
- 但 `journal-room.css` 只重声明了它关心的属性。`diary.css` 里**没被覆盖到的声明仍然生效**，例如 `:35 color: var(--craft-ink)`、`:43 backdrop-filter: none`、`:63 position: absolute`（`.diary-surface .object-hd` 的定位基座，`journal-room.css:40` 只给了 top/left/right，不给 position）。
- 后果：棕皮书的真实样式是「苔绿层 + 棕皮层」两份 700+ 行叠加的结果，任何人想改一个值都必须同时读两份文件才知道哪一层在管。

死项（选择器级，脚本核对，零消费者）：

| 行号 | 选择器 | 说明 |
|---|---|---|
| 116–119 | `.journal-engine` | 旧翻页引擎容器，随 `journal-book.tsx` 一起删掉了 |
| 323–333 | `.journal-binding` | 旧的中缝装订视觉 |
| 334–346 | `.journal-binding::after` | 同上 |
| 347–349 | `.journal-book[data-single='true'] .journal-binding` | 同上 |
| 432–441 | `.journal-pager` | 旧页码器；现用 `.journal-room-pager`（`journal-room-book.tsx:332`） |
| 442–453 | `.journal-pager button` | 同上 |
| 454–457 | `.journal-pager button:disabled` | 同上 |
| 458–463 | `.journal-pager span` | 同上 |
| 464–466 | `.journal-pager small` | 同上；`<small>` 在任何 journal DOM 里都不产生 |
| 682–684 | `.journal-pager { left: 10px }`（媒体查询内） | 同上 |
| 530–534 | `.diary-surface .compose-collapsed.draft .journal-quill` | 结构性失配：羽毛笔在 `journal-room-book.tsx:368` 是 `.journal-book` 的直接子节点、`ComposerComponent` 的**兄弟**，永远不会是 `.compose-collapsed` 的后代 |
| 3, 4, 7, 8, 9 | `--diary-text` `--diary-sub` `--diary-line` `--diary-bg` `--diary-card` | 五个变量定义全库无读取点（只有 `--diary-blue` `--diary-pink` 被 `screens.tsx:468` 读） |

重复/失效（非零消费者，但已被覆盖或重复声明，属 B 类）：

| 行号 | 问题 |
|---|---|
| 480–490 与 516–518 | `.diary-surface .compose-collapsed` 同一选择器写了两遍，中间隔 26 行 |
| 257–259 与 688–690 | `.journal-page-number { display: none }` 声明两遍 |
| 260–263 | `.journal-page.--right .journal-page-number` 在 `display:none` 之下永远不产生视觉效果 |
| 106–115 | `.journal-engine-slot` 的 `border-radius` / 三层 `box-shadow` 被 `journal-room.css:103–113` 全部归零 |
| 26 与 644 | `--surface-shift-x` 被 `journal-room.css:11` 重置为 `0px` |
| 25–44 大部 | `.object-surface.diary-surface` 的尺寸/背景/边框/阴影被 `journal-room.css:10–32` 完全覆盖 |

另有两条与日记无关的规则寄居在此：`:11–20`（`.stage[data-reading]` 让房间道具在读日记时隐身，消费者 `WorldPage.tsx:435`）和 `:21–24`（`.modal-scrim.diary-scrim`，消费者 `screens.tsx:1049`）。它们属于 shell 层，不属于日记本。

### 1.9 `image-slot.js`（535 行，src 下唯一自定义 `.js`）

| 维度 | 结论 |
|---|---|
| 职责 | Shadow DOM 自定义元素 `<image-slot>`：拖入图片 → `createImageBitmap` 降采样到 1200px webp → 存进 localStorage `ow-image-slots-v1`，附带缩放/平移重构图（reframe）交互 |
| 注册 | `src/main.tsx:5` 副作用 import，全局注册 |
| 消费者 | **只有一个**：`settings.tsx:134` 的头像选择器 `<image-slot id={slotId} shape="circle" placeholder="">`，配 `settings.tsx:29` 的 46px 圆形样式 |
| 死接口 | `_emitChange` / `slot-change` CustomEvent（`:390–400`）——注释写明"Notify React of the current selection…for Storage upload"，这是当年为 Composer 加的；`grep 'slot-change'` 全库零监听者。Composer 现在走自己的 `<input type=file>`（`screens.tsx:677`） |
| 数据重复 | 它维护的 `ow-image-slots-v1` 是一套**与 Supabase `profiles.avatar_url` 并行的第二头像存储**（data URL 直存 localStorage）。这是产品级重复，不只是代码重复 |
| 移位/改写评估 | 见 §3.4 |

### 1.10 `types.d.ts`（22 行）

`declare module 'react'` 的**全局**环境声明（为 `<image-slot>` 提供 JSX 类型），但放在 `themes/cinnaglass/` 里。项目类型的归宿是 `src/types/`（`feed.ts` / `chat.ts` / `index.ts`）。由于 `image-slot` 在 `main.tsx` 全局注册、在 `settings.tsx` 使用，这个声明的作用域本来就是全局的，文件名 `types.d.ts` 还容易被误读为「本目录的类型模块」。建议随 image-slot 的去留一起处理（§3.4）。

### 1.11 `src/hooks/useFeed.ts`（134 行）

职责单一（拉取 world + 分页拉 posts + 补 profiles），注释质量是本分区最高的。消费者：`screens.tsx:9,971`（取值）、`journal-room-book.tsx:3`（只取 `UseFeed` 类型）。依赖方向干净：`hooks → lib → types`，无反向边。
一处注记：`enabled` 闩锁（`:52–53`）的注释里点名了 `SubScreen`——hook 注释引用了它的消费者，方向上是 hook 知道了调用方。表述是解释性的、可接受，但如果 `SubScreen` 改名需要同步。

### 1.12 `src/lib/posts.ts`（49 行）/ `src/types/feed.ts`（37 行）

两者都短小、注释完备、方向正确（`posts → supabase + types`；`feed.ts` 是叶子）。`types/feed.ts` 被 10 处引用，是本分区最健康的共享类型。无改动建议。

### 1.13 `src/lib/storage.ts`（121 行）

职责：私有 bucket 的上传与签名。消费者：`screens.tsx`、`journal-layout.ts`、`journal-room-book.tsx`、`world-settings.tsx`、`WorldPage.tsx`、`chat-data.ts`。
两个具体问题：

1. **死参数**：`uploadMemoryImage(worldId, file, fallbackThumbDataUrl?)` 的第三参在全库唯一调用点 `screens.tsx:590` 没有传。它存在的理由（":5" 注释里的 "from the image-slot preview"）随 Composer 换成原生 file input 已经消失。
2. **跨模块隐形不变量**：`SIGNED_URL_TTL = 3600`（`:11`）是模块私有的，而 `screens.tsx:728` 的 `SIGN_REFRESH_MS = 40 * 60 * 1000` 是按它手算的。改一个，另一个静默失配（TTL 调到 30 分钟，40 分钟的续签就永远迟到，用户看到图片集体变裂图）。详见 §3.2。

---

## 二、`screens.tsx` 拆分方案（只给方案，不执行）

### 2.1 拆分依据

按「变化原因」而不是按「行数」切。当前文件里的五组代码，任何一组的改动都不需要读其它四组：

| 组 | 当前行数 | 变化原因 | 与其它组的共享面 |
|---|---|---|---|
| 内联样式 `ScreenStyles` | 17–281（265） | 视觉调整 | 无（纯字符串） |
| 弹层外壳 `SubScreen` | 953–1091（139） | 无障碍、开场动画、新增物件 | `SURFACES`、三个 Body 的 props |
| 写入 `Composer` | 503–721（219） | 上传链路、草稿策略 | `worldId`、`onPublished` |
| 照片墙 `PhotosBody` + 灯箱 | 793–902（110） | 读取与灯箱 | `posts`、`thumbUrls` |
| 心愿单 `WishlistBody` | 904–951（48） | 纯本地 mock，未接后端 | `wishes`、`setWishes` |

外加三组被两个以上模块共用的纯函数：日期格式（317–335）、身份配色（337–369）、签名续签 hook（723–757）。

### 2.2 目标模块（建议全部落在 `src/themes/cinnaglass/` 下）

| 新模块 | 导出接口 | 消费者 | 迁自 |
|---|---|---|---|
| `object-surfaces.css` | 副作用（无导出） | `screens.tsx` | 17–281 的样式正文 |
| `composer.tsx` | `Composer({ worldId: string \| null; onPublished: () => void })`；`MAX_IMGS` | `screens.tsx`（或改由 `journal-room-book.tsx` 直接 import，取消 `ComposerComponent` 注入） | 497–721 |
| `photo-wall.tsx` | `PhotoWall({ posts: FeedPost[]; thumbUrls: Record<string,string> })` | `screens.tsx` | 793–902 |
| `wishlist.tsx` | `Wishlist({ wishes, setWishes })`；`type Wish`；`SEED_WISHES` | `screens.tsx` | 285、293–299、904–951 |
| `post-detail.tsx` | `PostDetail({ post, profile, mine, tone, thumbUrls, onClose })`（内含 `Avatar`） | `screens.tsx` | 371–495 |
| `author-tone.ts` | `type AuthorTone`；`toneOf`；`avaGrad`；`hashOf` | `post-detail.tsx`、`photo-wall.tsx`、`screens.tsx` | 337–369 |
| `date-format.ts` | `fmtDay`；`fmtMeta`；`fmtFullDate` | `post-detail.tsx`、`photo-wall.tsx` | 316–335 |
| `use-signed-thumbs.ts` | `useSignedThumbs(posts: FeedPost[]): Record<string,string>` | `screens.tsx` | 723–757 |
| `screens.tsx`（保留） | `SubScreen`、`SurfaceOrigin`、`TabKey` | `WorldPage.tsx` | 1–16、283–291、301–315、759–791、953–1093 |

拆完后 `screens.tsx` 约 190–210 行，只剩「弹层外壳 + 三个表面的装配」这一件事。

关于 `Composer` 的注入：`journal-room-book.tsx:24` 的 `ComposerComponent` prop 只有一个实参（`screens.tsx:777`）。它存在的唯一理由是避免 `journal-room-book → screens.tsx` 的反向依赖。`Composer` 独立成文件后这个理由消失，可以让 `journal-room-book.tsx` 直接 `import { Composer } from './composer'`，删掉 prop 和它的 `ComponentType<>` 类型。这一步会改 `JournalRoomBook` 的公开签名，归 B 类。

### 2.3 为什么不拆成碎片

判定规则：一个模块值得单独成文件，当且仅当 **(a) 它有自己的变化原因**，或 **(b) 它被两个以上模块消费**。

据此明确**不**拆的：
- 灯箱（`screens.tsx:891–899`）不从 `photo-wall.tsx` 里再切出去——它只被照片墙用，且每次改灯箱必然同时改照片墙的 `openView/closeView`（`:800–807`）。切开会让一次改动跨两个文件。
- 月份分组（`:853–858`）、polaroid 单卡（`:870–879`）同理，切出去是 15–25 行、单一消费者的文件，只增加跳转成本。
- `Avatar`（`371–394`）不独立成文件：日记本的头像由 `journal-layout.ts:33–43` 自己画，`Avatar` 现在只剩 `PostDetail` 一个消费者，随它走。
- `SURFACES`（287–291）留在 `screens.tsx`：它是弹层外壳的配置表，不是共享数据。

### 2.4 最小批次与验证（无单元测试的前提下）

项目没有测试框架，但有 **4 个 Playwright 回归脚本**可直接当验收器（都是只读、不写库）：

- `scripts/check-diary.mjs` — 对比度 + 截图回归
- `scripts/check-journal-art.mjs` — 静态美术，含 `liveCss` 断言（`:234` 检查 `journal-room.css` 确实被加载）
- `scripts/check-journal-turn.mjs` — 翻页时序、纸片数、正反面文本一致性
- `scripts/compare-journal-art.mjs` — 与批准稿 `room-journal-concept.png` 的像素采样比对

运行需要 `DIARY_NODE_MODULES`（playwright/sharp/pngjs 所在目录）与 `JOURNAL_URL`（默认 `http://localhost:5175`）。

| 批次 | 内容 | 行为变化 | 验证 |
|---|---|---|---|
| **B0** | 删死样式（§4）、删死注释与失效引用（§5/§6）、删 `uploadMemoryImage` 死参数 | 无 | `pnpm build`（`tsc -b && vite build`）+ `pnpm lint`；构建产物 CSS 排序后 diff，应只少掉被删的选择器；跑 4 个脚本 |
| **B1** | 纯函数外迁：`date-format.ts`、`author-tone.ts`、`use-signed-thumbs.ts` | 无 | 迁移必须是**逐字搬运**——用 `diff <(sed -n 'A,Bp' 原文件@HEAD) 新文件正文` 证明零字符改动；`tsc -b` 保证引用改对 |
| **B2** | 组件外迁：`wishlist.tsx` → `photo-wall.tsx` → `post-detail.tsx` → `composer.tsx`（四个独立提交，从依赖最少的开始） | 无 | 同 B1 的逐字搬运证明；每个提交后跑 `check-journal-turn.mjs`（它会点开 `.compose-collapsed`、检查草稿态 `:197,:204`，正好覆盖 Composer）与 `check-diary.mjs` |
| **B3** | `ScreenStyles` → `object-surfaces.css` | **有顺序风险** | 见下 |

**B3 的风险与验证**（这是整个拆分里唯一可能改变渲染结果的一步）：
`ScreenStyles` 现在是渲染进 body 的 `<style>`，文档顺序最末，同特异度下压过 `diary.css` / `journal-room.css` / `journal-turn.css`。改成 `import './object-surfaces.css'` 后，胜负由 import 顺序决定。冲突选择器清单：`.object-surface`、`.object-hd`、`.object-x`、`.object-body`、`.compose*`、`.pk-*`、`.pd*`、`.empty-hint`。

- 必要条件：该 import 必须排在 `screens.tsx:15`（`journal-room-book`，它带进 `journal-room.css` 与 `journal-turn.css`）**之后**。
- 验证手段：在浏览器里对上述选择器命中的元素批量 `getComputedStyle` 全量 dump（三个表面各打开一次，1440×900 / 767px / 599px 三档），改动前后 JSON diff 必须为空。这比截图更硬——截图会漏掉不可见属性，且抗不住字体抗锯齿抖动。
- 建议先做 B0 再做 B3：删掉 68 行死样式后，冲突面只剩 `.compose*` 与 `.pd*` 两组，dump 的范围和风险都小一截。

---

## 三、复用与边界

### 3.1 `owLoad` / `load` 同体（确认，且不止两份）

- `rooms.ts:29–36` `owLoad<T>(k, fb)` 与 `screens.tsx:301–308` `load<T>(k, fb)` **函数体逐字相同**（try / `localStorage.getItem` / `JSON.parse` / catch 返回 fallback）。
- 同一模式还有两个变体：`profile.ts:16–22` `gload`（多一层 `{...fb, ...JSON.parse(v)}` 合并）、`tweaks.ts:36–42` `loadTweaks`（同样是合并）。另有三处内联手写：`WorldPage.tsx:52`、`music.tsx:17`、`emote-picker.tsx:18`。
- 写侧只有 `screens.tsx:309–315` 有 `save<T>`，其余全是内联 `localStorage.setItem(k, JSON.stringify(v))`（`WorldPage.tsx:257,264,271,324`、`music.tsx:90`、`emote-picker.tsx:114`、`tweaks.ts:52`）。
- 层次问题：`WorldPage.tsx:24` 从 `@/themes/cinnaglass/rooms` 取 `owLoad`——**页面层为了一个通用存储工具去依赖主题层**。
- 建议（A 类，最小步）：新建 `src/lib/local-store.ts`，导出 `owLoad` 与 `owSave` 两个函数（`owLoad` 逐字搬 `rooms.ts` 的现有实现，`owSave` 逐字搬 `screens.tsx` 的 `save`）；`rooms.ts` 与 `screens.tsx` 改为 import；`WorldPage.tsx:24` 的 import 路径改向 lib。`gload`/`loadTweaks` 语义不同（带默认值合并），本轮不动。
- 风险：几乎为零，前提是 **localStorage 的 key 字符串一个字符都不改**（`ow-wishes-v1`、`ow-dates-v1`、`ow-alarms-v1`）——改了等于清空所有用户的本地数据。
- 验证：`tsc -b`；`git grep -n "ow-.*-v1"` 改动前后输出完全一致。

### 3.2 `SIGN_REFRESH_MS` 与 `useSignedThumbs` 的边界

现状：`storage.ts:11` `SIGNED_URL_TTL = 60 * 60`（私有）；`screens.tsx:728` `SIGN_REFRESH_MS = 40 * 60 * 1000`（硬编码，靠注释说明"storage.ts SIGNED_URL_TTL"这个关系）。这是一个**没有编译期约束的跨模块不变量**。

建议（A 类）：把续签周期的定义权交给 `storage.ts`——它已经拥有 TTL：
`export const SIGNED_URL_TTL = 60 * 60;` 并新增 `export const SIGNED_URL_REFRESH_MS = Math.floor(SIGNED_URL_TTL * 1000 * 2 / 3);`（`3600 * 1000 * 2/3 = 2_400_000` ms = 40 分钟，**与现值完全相等**，所以是零行为变化）。`use-signed-thumbs.ts` 改为 import。
验证：`tsc -b`；在控制台确认 `SIGNED_URL_REFRESH_MS === 2400000`。

签名职责的边界（现状清点，建议只写进注释、不重构）：
- `useSignedThumbs`（`screens.tsx:729`）：**缩略图，带续签**。定时器 + `visibilitychange` 双保险。
- `PostDetail`（`:426–437`）：**原图，一次性**。详情窗生命周期远短于 1 小时，不续签是合理的。
- `PhotosBody`（`:811–827`）：**单张原图，一次性**，同上。
- 分区外还有 `WorldPage.tsx:28` 与 `chat-data.ts:30` 各自调 `signImageUrls`。
结论：边界是清晰的（"长驻列表续签，瞬时查看不续签"），但这条规则今天只存在于 `screens.tsx:723–727` 的注释里，而它只解释了三者中的一个。建议在 `use-signed-thumbs.ts` 的文件头把三者的分工写全。

### 3.3 日期与分页逻辑是否重复

**分页：无重复。** 唯一的分页实现是 `journal-layout.ts:92–214` + `journal-turn-controller.ts`。`screens.tsx` 里已经没有任何分页/无限滚动代码——旧的滚动时间线只剩下 CSS 残留（`.tl-scroll`、`.tl-more`、`.tl-end.armed`，见 §4）。

**日期：有三套并存的格式化，但大部分是合理的差异，只有一处是真风险。**

| 位置 | 输出 | 用途 |
|---|---|---|
| `screens.tsx:317–325` `fmtDay` | `今天` / `昨天` / `M 月 D 日` | 照片墙的相对日期贴纸 |
| `screens.tsx:326–331` `fmtMeta` | `HH:mm` | 详情页时间 |
| `screens.tsx:332–335` `fmtFullDate` | `YYYY 年 M 月 D 日 · HH:mm` | 详情页头 |
| `journal-layout.ts:50` | `MM.DD`（+ `· 续`） | 书页上印刷体日期（roomArt） |
| `journal-layout.ts:51` | `M.DD · HH:mm` | 非 roomArt 分支 |
| `journal-layout.ts:83` | `toLocaleDateString('zh-CN')` | `aria-label` |
| `journal-layout.ts:195` | `YYYY · MM` | 书页页眉 |
| `journal-room-book.tsx:131` | `toLocaleDateString('zh-CN')` | 目录条目标签 **兼去重 key** |

真正的重复只有 `String(x).padStart(2,'0')` 这个补零动作（`journal-layout.ts:50` 出现 4 次、`:195` 1 次、`screens.tsx:328–329` 2 次）。

需要留意的一处（**不是重复，是两条独立推导必须保持一致**）：`journal-room-book.tsx:129–137` 用 `toLocaleDateString('zh-CN')` 给每一页算目录标签并用作 `Set` 去重键，而同一批 post 的页眉由 `journal-layout.ts:195` 用 `getFullYear()/getMonth()` 另算一遍。两条推导都基于 `post.created_at`，但走了不同的路径（Intl 本地化 vs 手工取字段）。今天它们只是"长得不一样"，不会打架；一旦有人给其中一条加时区处理而漏掉另一条，「翻到这一天」就会落到错误的页上。

建议（A 类，纯补注释 + 一个 `pad2`）：在 `journal-layout.ts` 导出一个 `pad2 = (n: number) => String(n).padStart(2, '0')` 供本文件与 `screens.tsx` 的 `fmtMeta` 共用；并在 `journal-room-book.tsx:131` 上方写明「此标签同时是目录去重键，必须与页眉走同一个 `post.created_at`」。**不建议**把三套格式化合并成一个通用 formatter——它们服务于三种不同的阅读语境（相对日期贴纸 / 印刷体页眉 / 索引键），合并会让每一处都被迫带参数。

### 3.3b 另一处可直接合并的重复（新发现）

`journal-room-book.tsx:62–68` 与 `journal-turn.ts:182–189` 是同一个循环的两份拷贝：

```
querySelectorAll('img[data-image-path]').forEach(image => {
    const url = <解析器>(image.dataset.imagePath!);
    if (url && image.src !== url) { image.src = url; image.alt = '回忆照片'; }
});
```

差别只有解析器（前者 `thumbUrls[thumbPathOf(path)]`，后者传入的 `urlFor`）和根节点。`data-image-path` 这个 DOM 契约的所有者是 `journal-layout.ts:62`，所以建议由它导出
`applyThumbUrls(root: ParentNode, urlFor: (path: string) => string | undefined): void`，两处改为调用。
风险低；验证：`check-journal-turn.mjs:122` 已经断言翻页中的 `.journal-photo img` 有正确 src，能直接覆盖这次改动。

### 3.4 `image-slot.js`：移位还是改写（评估，不执行）

事实：535 行、src 下唯一 `.js`、全局注册（`main.tsx:5`）、**唯一消费者**是 `settings.tsx:134` 的 46px 圆形头像格子、自带一套与 Supabase 并行的 localStorage 头像存储、`slot-change` 事件零监听者。

四个选项：

| 方案 | 收益 | 代价 / 风险 | 判断 |
|---|---|---|---|
| (a) 原样保留 | 零风险 | 535 行死重量长期留在主题根目录；两套头像存储继续并存 | 本轮默认 |
| (b) 移到 `src/themes/cinnaglass/image-slot/`（连同 `types.d.ts`） | 主题根目录少两个文件；归属清晰 | 要改 `main.tsx:5`；`.d.ts` 移位后需确认 `tsconfig.app.json` 的 `include: ["src"]` 仍覆盖（覆盖，无风险） | 收益小但真实，可随 §7 一起做 |
| (c) 改写成 TypeScript | 类型安全 | **收益接近零**：没有任何代码对它做类型检查（`types.d.ts` 只声明 JSX 属性），改写 535 行 Shadow DOM + 指针手势代码是纯风险 | **不建议** |
| (d) 用一个小 React 头像选择器替换，删掉自定义元素 + `types.d.ts` + `main.tsx:5` 的副作用 import | 净减约 555 行；消灭第二套头像存储 | 是**行为变化**（丢掉 reframe 缩放平移交互、丢掉 `ow-image-slots-v1` 里已有的用户数据） | 收益最大，但必须用户拍板 → B 类 |

中间可做的一小步（仍属 B，因为动的是公开行为面）：删掉 `_emitChange` 与 `slot-change`（`:390–400` 及其两个调用点），零监听者，纯减法。

---

## 四、死样式清单（可删候选，均已 grep 核实零消费者）

核实方法：把 `src` 下所有 `.tsx/.ts/.js` 拼成语料（`screens.tsx` 排除其自身的 `<style>` 正文），对每个类名做词边界匹配（`(?<![\w-])name(?![\w-])`，避免 `journal-engine` 被 `journal-engine-slot` 误命中），同时回查 `className` 模板拼接、`querySelector`、`classList`。动态拼接的类名（`journal-room-book.tsx:215` 的 `"journal-book journal-room-book"`、`screens.tsx:1061` 的三元拼接、`journal-layout.ts:27,59,71` 的模板串）均已单独确认。

### 4.1 `screens.tsx` 的 `ScreenStyles` 内联样式（共约 68 行 / 265 行）

整个"滚动时间线"的样式随 `journal-book.tsx` 的删除变成孤儿，但 CSS 留了下来：

| 行号 | 选择器 | 备注 |
|---|---|---|
| 65 | `.compose-collapsed .pchip` | Composer 折叠态已无头像小圆片 |
| 118–125 | （注释块）"timeline: a co-written diary flow… `.tl-scroll`… composer lives BELOW it" | 描述已废弃的滚动版式，见 §5 |
| 127–129 | `.tl-scroll` | |
| 130 | `.tl-scroll::-webkit-scrollbar` | |
| 131–132 | `.tl-scroll[data-dragging]`、`… *` | 拖拽滚动交互已随旧实现移除 |
| 133 | `.tl-pull` | |
| 134 | `.tl-more` | |
| 135–137 | `.tl-end`、`.tl-end.armed` | 「松手加载更早」的下拉提示，现由目录抽屉按钮替代（`journal-room-book.tsx:312–321`） |
| 138–141 | `.tl`、`.tl::before` | |
| 142–149 | `.tl-day`、`.tl-day span`、`.tl-day.alt span` | 和纸日期贴纸 |
| 150 | `.tl-item` | |
| 151 | `@keyframes tlIn` | 仅被 `.tl-item` 引用 |
| 152–154 | `@media (prefers-reduced-motion: no-preference) { .tl-item }` | |
| 158–159 | `.tl .ava` | 注意 **`.ava` / `.ava img`（155–157）仍在用**（`screens.tsx:384`），只删 `.tl` 前缀那条 |
| 160–183 | `.tl-card` 全族：`.tl-card`、`:hover`、`.tl-who`、`.tl-au`、`.tl-time`、`.tl-card .tt`、`.tl-card.has-media`、`.tl-media`、**`.tl-card.has-media image-slot`（177）**、`.tl-imgn`、`.tbody` | |
| 187–188 | `@media(min-width:1000px)` 内的 `.tl-item`、`.tl-day` | 同块里的 `.tl-host`(186)、`.wl-*`(190)、`.pw`(191) 要保留 |
| 195–197 | `@media(max-width:767px)` 内的 `.tl`、`.tl::before`、`.tl .ava` | 同块 `.tl-host`(194)、`.compose*`(200–203) 保留 |
| 198–199 | 同块内的 `.tl-card`、`.tl-card .tt` | |

**连带项（分区外，需告知 `cinnaglass.css` 的负责人）**：`cinnaglass.css:297` 在 `.paper` token 重映射列表里列了 `.tl-card`。删掉 `.tl-card` 后这一行应一并移除，否则留下一个指向不存在元素的选择器。

### 4.2 `diary.css`（共约 74 行 / 723 行）

见 §1.8 的表格：`116–119`、`323–349`、`432–466`、`682–684`、`530–534`、以及变量 `3,4,7,8,9`。

### 4.3 `journal-room.css`

仅 `18–19`（`--diary-text` / `--diary-sub` 无读取点）。其余 573 行全部有消费者。

### 4.4 `journal-turn.css`

**零死样式。**

---

## 五、注释审计（源码注释保持英文）

现状分档：**无注释** / **复述**（注释只是把代码念一遍）/ **过时**（描述的实现已不存在）/ **冗长** / **合格**。

### 5.1 `screens.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释摘句 |
|---|---|---|---|---|
| 1–7 | 文件头 | 过时（部分） | `// screens.tsx — the three room-object surfaces: journal, photo wall, wishlist.` / `// All three stay mounted so scroll, lightbox and composer drafts survive` / `// closing one object and opening another. The journal's own paging lives in` / `// journal-room-book.tsx; this file owns the modal shell, focus trap and the` / `// photo-wall + wishlist bodies.` | 删 "The journal reads chronologically across measured pages. Its date directory loads older records through the unchanged useFeed cursor."（属于 `journal-room-book` 的职责，不该在这里第二次描述）；"Modal shell styles live in cinnaglass.css" 改为指向 `object-surfaces.css`（B3 之后） |
| 17 | `ScreenStyles` | 无注释 | `// Styles for the collection surfaces (photo wall, wishlist) and the shared` / `// modal shell. Rendered as a <style> element, so it wins ties against every` / `// bundled stylesheet — keep that in mind before moving it into a .css file.` | — |
| 19–21 | `ScreenStyles` 内首段 | 合格 | 保留 | — |
| 53–55 | composer 段注释 | 过时 | `/* composer — inside the journal it is absolutely positioned on the paper` / `   (journal-room.css). Bright white writing surface: words sit on paper,` / `   not on hazy glass. Design ref:` / `   ai/design_system/uiux/research/cinnaglass-history/composer-redesign.html */` | 删 "its own row below the scrollport, never overlapping"（滚动版式已不存在） |
| 118–125 | timeline 段注释 | 过时（整段随 §4.1 一起删） | — | 整段删除，含 "The tab hosts its own scrollport (.tl-scroll); the composer lives BELOW it as a sibling"、"Gradient masks fade the list out at both edges" |
| 177 | `.tl-card.has-media image-slot` | 过时（代码本身死） | — | 整条规则删除；时间线 JSX 里已无 `image-slot` |
| 283–285 | `TabKey` / `SurfaceOrigin` / `Wish` | 无注释 | `// Which room object is open. 'timeline' is the journal.`（`TabKey` 上方）；`// Where the open gesture came from, so the sheet can fly out of the clicked` / `// furniture instead of the screen centre.`（`SurfaceOrigin` 上方） | — |
| 287 | `SURFACES` | 无注释 | `// The three surfaces, in mount order. All stay mounted; screen picks one.` | — |
| 293 | `SEED_WISHES` | 无注释 | `// Seed list for a first-time visitor. The wishlist is still local-only.` | — |
| 301 | `load<T>` | 无注释 | 删除函数本体，改用共享的 `owLoad`（§3.1） | — |
| 309 | `save<T>` | 无注释 | 迁入 `local-store.ts` 后：`// Best-effort persist; a full or blocked localStorage must not break the UI.` | — |
| 316 | `fmtDay` | 合格 | 保留 | — |
| 326 | `fmtMeta` | 无注释 | `// Wall-clock time, 24h. Paired with fmtDay wherever a full stamp is needed.` | — |
| 332 | `fmtFullDate` | 无注释 | `// Absolute stamp for the detail view, where a relative "今天" would be ambiguous.` | — |
| 337 | `AVA_GRADS` | 合格 | 保留 | — |
| 345 | `hashOf` | 无注释 | `// Stable 32-bit string hash. Used for anything that must look random but stay` / `// identical across sessions: avatar tint, guest tone, photo tilt.` | — |
| 350 | `avaGrad` | 无注释 | `// Pick this author's avatar gradient. Same id, same gradient, forever.` | — |
| 352–355 | 身份配色段 | 合格 | 保留（迁入 `author-tone.ts` 时原样带走） | — |
| 365 | `toneOf` | 无注释（段注释已覆盖语义） | `// Me → accent, the world's other member → the pink pairing, anyone else →` / `// a stable hash pick. Never falls back to position.` | — |
| 371 | `Avatar` | 无注释 | `// Circular author avatar: uploaded image, else the first letter of the name,` / `// else a dot. The ring colour carries identity (see toneOf).` | — |
| 396–398 | `PostDetail` | 合格 | 保留 | — |
| 497–499 | `Picked` / `MAX_IMGS` | 过时（叙述指向已删实现） | `// Controlled multi-image pick: the thumbnail row IS the upload list — what` / `// you see is exactly what gets published. Object URLs are revoked on remove` / `// and on cancel, never on collapse (a collapsed composer still holds a draft).` | 删 "the old single `<image-slot>` square was a tiny drop target — a second drag could miss it entirely and the stale first pick got published"（`image-slot` 已不在此链路，保留会让读者去找一个不存在的耦合） |
| 503 | `Composer` | 无注释 | `// The write path. Collapsed it is a one-line doorway; open it is a textarea +` / `// image row. Publishing uploads every picked file to Storage first, then` / `// inserts one post, then calls onPublished (the caller reloads the feed).` / `// Clicking outside or Esc only collapses — the draft survives; only 取消 clears.` | — |
| 514–516 | 隐式关闭段 | 合格 | 保留 | — |
| 537 | `autogrow` | 合格（"Grow with the writing"） | 保留 | — |
| 548 | `addFiles` | 无注释 | `// Accept only images, cap at MAX_IMGS, mint one object URL per pick.` | — |
| 557 | `removeAt` | 无注释 | `// Revoke before dropping, or the blob leaks for the page's lifetime.` | — |
| 562 | `clearPicked` | 无注释 | `// Explicit discard: revoke every object URL and empty the row.` | — |
| 568 | `dropProps` | 合格 | 保留 | — |
| 582 | `publish` | 无注释 | `// Uploads run sequentially so a mid-way failure leaves a known prefix in the` / `// bucket rather than an unknown scatter; the post row is written only after` / `// every image lands. On failure nothing is cleared — the draft stays.` | — |
| 723–727 | `SIGN_REFRESH_MS` / `useSignedThumbs` | 合格但不完整 | 在末尾补一句：`// Only this list re-signs. PostDetail and the lightbox sign originals once —` / `// they never live long enough to outlast the TTL.` | — |
| 759 | `TimelineBody` | 无注释 | `// Journal + its detail overlay. Nothing else: the book owns its own paging.` | — |
| 793–795 | `LightboxPhoto` / `PhotosBody` | 无注释 | `// Photo wall: every image from every post, newest first, grouped by month and` / `// laid out as tilted polaroids. Clicking one opens a progressive lightbox —` / `// the signed thumbnail shows at once, the signed original swaps in when ready.` | — |
| 829–830 | 展平段 | 合格 | 保留 | — |
| 904 | `WishlistBody` | 无注释 | `// Wishlist — still a local-only mock (localStorage 'ow-wishes-v1'); it has no` / `// backend table yet, so nothing here is shared between the two members.` | — |
| 953 | `SubScreen` | 无注释 | `// The room-object modal shell. All three surfaces stay mounted and are shown` / `// one at a time, so state survives closing one object and opening another.` / `// Owns: the open-from-furniture transform, the layered Escape order` / `// (detail/lightbox → composer → surface) and the Tab trap.` | — |
| 968–970 | 懒加载段 | 合格 | 保留 | — |
| 979–981 | 双帧揭示段 | 合格 | 保留 | — |
| 987–989 | Escape 分层段 | 合格 | 保留 | — |
| 1030 | `originStyle` | 无注释（内有一行） | `// Clamp the open-from origin to ±46% of the viewport so a click near an edge` / `// still flies from a visible point. The journal opts out: its art is centred.` | — |

### 5.2 `journal-room-book.tsx`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释摘句 |
|---|---|---|---|---|
| 1 | 文件头 | 冗长歧义（单句、未说职责） | `// journal-room-book.tsx — React host for the chestnut journal.` / `// It measures the paper, asks journal-layout to build real DOM leaves from the` / `// feed, and hands those same leaves to JournalTurnController — the turning` / `// faces are clones of the real pages, never re-rendered stand-ins.` | 替换 "Real paginated content is also the source of each turning paper face."（含义对，但读者无法从中知道这个文件是干什么的） |
| 11 | `BookState` | 无注释 | `// Non-reactive book state: mutating it must not re-render (the leaves are` / `// plain DOM, owned by this file, not by React).` | — |
| 13 | `JournalRoomBook` | 无注释 | `// active = this surface is the visible one; an inactive book cancels any turn` / `// in flight and stops handling arrow keys.` | — |
| 39 | `showPage` | 无注释 | `// Show the spread that contains `target`, snapped to the step (1 leaf on` / `// phones, 2 otherwise). Hides every other leaf and records a reading anchor so` / `// a resize or a reload can land the reader back on the same sentence.` | — |
| 60–70 | 图片回填 effect | 无注释 | `// Signed URLs arrive after the leaves are built: patch the <img> elements in` / `// place (both the static leaves and any face currently mid-turn).` | — |
| 93–198 | 排版 effect | 无注释（200 行，最需要注释的一处） | `// Rebuild the whole book whenever the feed or the measured box changes.` / `// Waits for the journal font first — paginating with a fallback face would` / `// measure the wrong line count and reflow on swap. Restores the reading` / `// anchor if that post is still on a page, else opens at the newest entry.` / `// The folio/heading rectangles are read from the live DOM so the turning` / `// clones print their page numbers in exactly the same spot.` | — |
| 187 | `onBusy` 内 | 合格 | 保留 | — |
| 208 | `published` | 无注释 | `// A new entry invalidates the anchor: drop it so the rebuild opens at the` / `// newest page instead of where the reader was.` | — |
| 220–222 | `onClickCapture` | 无注释 | `// Reaching for the composer or the bookmark means the reader stopped turning:` / `// settle the sheet on the nearest spread rather than letting it fly on.` | — |
| 129–137 | 目录构建 | 无注释 | `// Date directory, deduped by the same localised label the button shows. This` / `// label doubles as the dedupe key — it must stay derived from post.created_at,` / `// like the running title in journal-layout.` | — |

### 5.3 `journal-layout.ts`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释摘句 |
|---|---|---|---|---|
| 1 | 文件头 | **完全缺失** | `// journal-layout.ts — the book's typesetter. Turns feed posts into real DOM` / `// leaves by measuring them off-screen, so what is paginated is exactly what is` / `// painted. No React here: these nodes are owned by journal-room-book and are` / `// also the source for the turning faces.` | — |
| 4–11 | `JournalPart` / `JournalPage` / `Context` | 无注释 | `// One post, or the slice of one post that fits on a page. start is the` / `// character offset of this slice; continued marks a slice that is not the first.`（`JournalPart` 上方）；`// roomArt = the approved chestnut treatment. Off = the plain paper fallback.`（`Context` 上方） | — |
| 13 | `element` | 无注释 | `// createElement + className + optional textContent, in one line.` | — |
| 20–21 | `journalEntry` | 合格 | 保留；建议把它降为模块私有（无外部消费者） | — |
| 90–91 | `buildJournalPages` | 合格但偏短 | 在后面补：`// Reserved vertical space comes from CSS custom properties on the measure` / `// node, so the layout follows the stylesheet instead of hard-coded numbers.` / `// Pads to an even page count: a spread always has two leaves.` | — |
| 130 | `size` | 无注释 | `// Measured height of one entry, plus the 22px gap that follows it.` | — |
| 160–161 | 二分切分 | 合格 | 保留 | — |

### 5.4 `journal-turn.ts`

| 位置 | 名称 | 现状 | 建议注释原文 |
|---|---|---|---|
| 1–2 | 文件头 | 合格但偏短 | 补一行：`// This file owns geometry and painting only; when and how far to turn is` / `// JournalTurnController's job.` |
| 18 | `STRIPS` | 无注释 | `// 24 strips is where the bend stops looking faceted without costing frames.` |
| 25–26 | `sheetPose` | 合格 | 保留 |
| 43 | `JournalTurnStage` | 无注释 | `// The turning stage: two static base leaves plus one clone-sheet per sheet in` / `// flight. Every face is a deep clone of a real page, so mid-turn text is the` / `// genuine content — never a placeholder.` |
| 63 | `face` | 无注释 | `// Build one printable face for `page`. Clones the live leaf, strips its ids` / `// (a clone must not duplicate them), and re-prints the book art, heading and` / `// folio at the coordinates measured from the real book.` |
| 106 | `createSheet` | 无注释 | `// Slice one sheet into STRIPS vertical strips, each carrying a front and a` / `// back face offset so the strips together read as one continuous page.` |
| 137 | `render` | 无注释 | `// Paint one frame: refresh the base spread if it changed, drop sheets that` / `// finished, then pose every strip of every live sheet and size the spine shadow.` |
| 182 | `updateImages` | 无注释 | 改用 `journal-layout` 的共享 helper（§3.3b）后：`// Late-arriving signed URLs must also reach the faces already in the air.` |
| 192 | `destroy` | 无注释 | `// Detach the stage. The cloned leaves die with it; the real ones are untouched.` |

### 5.5 `journal-turn-controller.ts`

| 位置 | 名称 | 现状 | 建议注释原文 |
|---|---|---|---|
| 1 | 文件头 | 缺失（只有 class 上方有注释） | `// journal-turn-controller.ts — decides when paper moves. Geometry and painting` / `// live in journal-turn.ts.` |
| 3–12 | `Motion` / `Options` | 无注释 | `// A sheet in flight: where it came from, where it lands, and how far along.`（`Motion` 上方） |
| 14 | `ease` | 无注释 | `// Cosine ease-in-out: zero velocity at both ends, so a sheet never snaps flat.` |
| 16–17 | class | 合格 | 保留 |
| 47–52 | `target` / `busy` | 无注释 | `// Where the reader asked to be — may be several spreads ahead of `current`.`（`target` 上方）；`// True while any sheet is in the air.`（`busy` 上方） |
| 54 | `to` | 无注释 | `// Aim at a page. Repeated calls only move the destination — an airborne sheet` / `// is accelerated, never restarted. Degrades to an instant jump when motion is` / `// reduced, 3D is unsupported, or the tab is hidden.` |
| 87 | `by` | 无注释 | `// Relative aim, in spreads.` |
| 91 | `startSheet` | 无注释 | `// Queue the next sheet, if one is still needed and it flies the same way as` / `// the ones already up (never two directions at once).` |
| 108 | `tick` | 无注释 | `// One rAF step: advance every sheet, commit the ones that landed, launch the` / `// next when bursting, and stop the loop once the queue drains.` |
| 132 | `updateImages` | 无注释 | `// Forward late signed URLs to the sheets currently in the air.` |
| 136–137 | `cancel` | 合格 | 保留 |
| 146 | `finish` | 无注释 | `// Jump straight to the destination, no animation. The reduced-motion and` / `// hidden-tab path.` |
| 152 | `clear` | 无注释 | `// Tear the stage down and report idle. Leaves current/destination alone.` |
| 162 | `destroy` | 无注释 | `// Permanent teardown: after this the controller ignores every call.` |

### 5.6 `useFeed.ts` / `posts.ts` / `types/feed.ts` / `types.d.ts`

四个文件的注释**全部合格**，无过时叙述，无建议改动。`useFeed.ts:38` 提到 `SubScreen` 属于解释性引用，若 §2 改名需同步。

### 5.7 `storage.ts`

| 位置 | 名称 | 现状 | 建议注释原文 | 应删除的旧注释摘句 |
|---|---|---|---|---|
| 1–7 | 文件头 | 过时（一句） | 第 5 行改为 `//   <worldId>/<uuid>.thumb.webp   display thumbnail (made here, from the original)` | 删 "(from the image-slot preview)"——缩略图自 `makeThumbDataUrl`（`:40`）由原图再生，`image-slot` 已不在此链路 |
| 11 | `SIGNED_URL_TTL` | 无注释 | `// Signed URLs expire after this. Any long-lived view must re-sign before then` / `// — see SIGNED_URL_REFRESH_MS.` | — |
| 20 | `thumbPathOf` | 合格 | 保留 | — |
| 23 | `dataUrlToBlob` | 无注释 | `// Canvas gives us a data: URL; Storage wants bytes.` | — |
| 32 | `newId` | 无注释 | `// crypto.randomUUID where available, timestamp+random elsewhere.` | — |
| 35–39 | `THUMB_MAX` / `makeThumbDataUrl` | 合格 | 保留 | — |
| 56–59 | `uploadMemoryImage` | 过时（一句） | 改为 `// Upload the original image plus a display-sized webp thumbnail for a world.` / `// Returns the original's storage path to persist in posts.images.` | 删 "`fallbackThumbDataUrl` (the slot preview) covers formats createImageBitmap can't decode"——同时删掉这个**无人传入的第三参数**（唯一调用点 `screens.tsx:590` 只传两个） |
| 84–87 | `uploadWorldIcon` | 合格 | 保留 | — |
| 110–111 | `signImageUrls` | 合格 | 保留 | — |

### 5.8 `image-slot.js`

文件头（`:1–6`）合格。`:390–392` 的 `_emitChange` 注释描述的是一个**零监听者**的事件（"Notify React of the current selection… for Storage upload"）——注释本身准确，但它描述的协作关系已经不存在。若不删代码，至少应补一句 `// No listener today: the composer uploads through its own file input.`

---

## 六、失效 / 不完整的文档引用

本分区里指向文档的注释很少，逐条核实结果：

| 位置 | 现文本 | 核实 | 应改为 |
|---|---|---|---|
| `screens.tsx:119` | `design ref: ai/design_system/uiux/research/cinnaglass-history/timeline-redesign.html` | **路径存在** | 随 §4.1 的整段删除一起消失（它描述的滚动时间线已废弃） |
| `screens.tsx:54` | `design ref: composer-redesign.html` | 文件存在于 `ai/design_system/uiux/research/cinnaglass-history/composer-redesign.html`，但注释里**没写路径**，无法直接定位 | 补全为 `ai/design_system/uiux/research/cinnaglass-history/composer-redesign.html` |
| `posts.ts:1` | `data access for the memory feed (回忆存储 ①)` | "回忆存储 ①" 确实是 `ai/features/timeline.md:5` 的路线图编号 | 补上出处：`(回忆存储 ①, ai/features/timeline.md)` |
| `storage.ts:5` | `(from the image-slot preview)` | 实现已变（§5.7） | 删除 |
| `journal-layout.ts` / `journal-turn.ts` / `journal-turn-controller.ts` / `journal-room-book.tsx` | 无任何文档引用 | — | 这四个文件在 `ai/features/timeline.md:6` 的"关联代码"里被列出，但代码侧没有回指。建议各加一行 `// Feature doc: ai/features/timeline.md` |

本分区内**未发现** `ai/UX.md §N`、`ST-x` 编号或 codex 报告路径的引用——这些集中在分区外的 `WorldPage.tsx`（`:242` `ai/UX.md §4`、`:345` `§2`、`:434`）、`room/room-types.ts`（`:124` `ai/STYLE.md §6`、`:136` `ai/UX.md §2/§5`）、`shell/rail.tsx:27`（`ai/UX.md §2`）、`room/study-room.ts:52`（`ai/UX.md §2`）。按本次审阅给定的映射（UX §2 → `ai/design_system/props.md` + `uiux/uiux.md`；§4 → `uiux/interaction.md`；§5 → `props.md`），这些应由对应分区的审阅者处理；此处仅登记位置，避免两边重复改。

需要注意：`ai/UX.md` 文件**目前仍然存在**，所以这些引用不是"断链"，而是"指向已被 design_system 取代的旧真源"。改动前应先确认 `ai/UX.md` 的处置决定，否则会出现代码指向 A、文档真源在 B 的第三种不一致。

---

## 七、依赖方向与类型归置

### 7.1 方向核查（`grep` 全量 import 边）

- `hooks → lib → types`：干净。`useFeed.ts` 只向下依赖 `lib/posts`、`lib/profiles`、`lib/worlds`、`types/feed`。
- `lib/*`：只依赖 `lib/supabase` 与 `types/*`，**不 import 任何主题代码**。正确。
- `types/feed.ts`：纯叶子，被 10 个模块引用。正确。
- `themes/cinnaglass/* → @/lib`、`@/types`、`@/hooks`：方向正确。

### 7.2 两条越界边

1. **页面依赖主题的通用工具**：`src/pages/WorldPage.tsx:24` `import { owLoad } from '@/themes/cinnaglass/rooms'`。`owLoad` 与主题毫无关系（`rooms.ts:28` 的注释自己也承认是 "shared localStorage loader for the theme's persisted slices"，但它的消费者已经跑到页面层了）。修正见 §3.1：移到 `src/lib/local-store.ts`。
2. **lib 的文档指向主题**：`storage.ts:5` 注释提到 `image-slot`。只是注释，但它把一个平台层模块的说明绑在了一个主题组件上。随 §5.7 删除。

### 7.3 类型归置

| 文件 | 现位置 | 评价 |
|---|---|---|
| `src/types/feed.ts` | 正确 | `FeedPost` / `FeedProfile` / `World` / `PostPrivacy` 被 lib、hooks、themes、pages 四层共用，放在共享 types 下是对的 |
| `themes/cinnaglass/types.d.ts` | **值得移动** | 它是 `declare module 'react'` 的**全局**增补，作用域根本不是主题局部；文件名 `types.d.ts` 还会被误读成"本目录类型"。建议 `src/types/image-slot.d.ts`（`tsconfig.app.json` 的 `include: ["src"]` 覆盖，零配置改动）。若采纳 §3.4 的方案 (d)，则直接删除 |
| `journal-layout.ts:4–11` 的 `JournalPart` / `JournalPage` / `Context` | 正确 | 只在日记本簇内流通，留在实现文件里合适；`Context` 未导出也正确 |
| `journal-turn.ts:3–17` 的 `TurnDirection` / `TurnGeometry` / `TurnFrame` | 正确 | 是 controller ↔ stage 的契约，放在被依赖的那一侧（`journal-turn.ts`）是对的 |
| `screens.tsx:283–285` 的 `TabKey` / `SurfaceOrigin` / `Wish` | 部分 | `TabKey` / `SurfaceOrigin` 是 `screens.tsx ↔ WorldPage.tsx` 的契约，留在 `screens.tsx` 合理；`Wish` 应随 `wishlist.tsx` 走 |

### 7.4 `journal-*` 七文件移入 `themes/cinnaglass/journal/` 的评估

**收益**：`themes/cinnaglass/` 根目录现有 30 个条目，其中 7 个是 `journal-*`（约 24%）。这 7 个文件构成一个闭合簇：**唯一入口** `JournalRoomBook`，**唯一外部消费者** `screens.tsx:15`，内部 5 条 import 边全是同级相对路径。`room/`（4 个文件）与 `shell/`（6 个文件）已经确立了"成簇即建子目录"的先例。

**要改的 import（全部清单）**：

| 位置 | 现值 | 改为 |
|---|---|---|
| `screens.tsx:15` | `'./journal-room-book'` | `'./journal/journal-room-book'` |
| `screens.tsx:14` | `'./diary.css'` | `'./journal/diary.css'`（若 `diary.css` 一并移入，见下） |
| `journal-room-book.tsx:6,7,8,9` | `'./journal-layout'` 等 | **不变**（同级） |
| `journal-turn-controller.ts:1` | `'./journal-turn'` | **不变** |
| 所有 `@/lib`、`@/types`、`@/hooks` 别名 | — | **不变** |

**CSS `url()` 与字体路径**：全部是根绝对路径，**不受影响**——`journal-room.css:5` `/fonts/journal/LXGWWenKaiLite-Regular.woff2`；`:247`、`:317`、`:383`、`:459` `/ui/journal/*.webp`；TSX 侧 `journal-room-book.tsx:241,370` 的 `/ui/journal/book-open.webp`、`/ui/journal/quill.webp`；`journal-turn.ts:80` 的 `/ui/journal/book-single.webp`。`diary.css` 与 `journal-turn.css` 无 `url()`（只用 `var(--craft-grain)`，定义在 `materials.css:15`）。已核对 `public/fonts/journal/` 与 `public/ui/journal/` 均在位。

**风险（必须同批修，否则静默失效）**：

1. **两个校验脚本写死了模块 URL**：
   - `scripts/check-journal-art.mjs:180` `await import('/src/themes/cinnaglass/journal-layout.ts')`
   - `scripts/check-journal-turn.mjs:254` `await import('/src/themes/cinnaglass/journal-turn.ts')`
   移动文件会让这两个脚本在 Vite dev server 上 404。**这是整个移动操作里唯一会真正坏掉的东西。**
2. 文档路径引用：`ai/features/timeline.md:6` 的"关联代码"清单、`ai/PROJECT.md`、`ai/design_system/uiux/cinnaglass/journal-room-object/{book,turn}-implementation.md`、`ai/project-audit/FINDINGS.md` 都按旧路径写。
3. `check-journal-art.mjs:234` 检查 `sheet.href?.includes('journal-room.css')` —— **文件名不变，此断言仍然通过**。
4. 所有 `.journal-*` CSS 类名不变，因此 `check-journal-turn.mjs` 里那 40 处选择器断言全部不受影响。

**命名建议**：保持 7 个文件名**逐字不变**（`journal/journal-room-book.tsx` 而不是 `journal/room-book.tsx`）。理由：(a) 同时改路径和文件名会让 `git log --follow` 和人工 review 都看不清这是一次纯移动；(b) `room/` 子目录本身就是混的（`room-scene.tsx`、`room-types.ts` 保前缀，`pixi-scene.ts`、`study-room.ts` 不保），没有一个明确的多数派可依；(c) 类名 `.journal-room-*` 与脚本断言都建立在这套词汇上。去前缀属于独立的一次改名，应在移动稳定之后再议。

**`diary.css` 是否一起移**：建议移，但**先把 `:11–24` 的两条非日记规则（`.stage[data-reading]`、`.modal-scrim.diary-scrim`）迁去 `cinnaglass.css`**，否则会把 shell 层的规则也埋进 `journal/` 目录里。这一步涉及 CSS 层叠顺序（`cinnaglass.css` 在 `diary.css` 之前加载），需要计算后样式 dump 验证 → 归 B 类。

**结论**：移动本身是低风险、收益中等的整理；它的全部风险集中在两个脚本的硬编码路径上。建议作为 **B 类单独一次提交**（只做 `git mv` + 4 处引用修正 + 文档路径更新），不与任何内容改动混在一起。

---

## 八、建议执行清单

### A · 本轮可直接做（零行为变化，只读验证即可覆盖）

| # | 事项 | 位置 | 风险 | 验证方法 |
|---|---|---|---|---|
| A1 | 删 `ScreenStyles` 里的滚动时间线死样式（约 68 行） | `screens.tsx:65, 118–154, 158–183, 187–188, 195–199` | 低。`.tl-host`(126,186,194)、`.ava`/`.ava img`(155–157) **必须保留** | `pnpm build` 后对产物 CSS 排序 diff，应只少掉这些选择器；`check-diary.mjs` + `check-journal-art.mjs` 截图无差 |
| A2 | 删 `diary.css` 死样式（约 74 行） | `diary.css:3,4,7,8,9, 116–119, 323–349, 432–466, 530–534, 682–684` | 低，均已 grep 确认零消费者 | 同 A1；另在浏览器对 `.journal-engine-slot`、`.journal-book`、`.diary-surface .compose-collapsed` 三个节点做改动前后 `getComputedStyle` 全量 dump，必须完全一致 |
| A3 | 删 `journal-room.css:18–19` 两个无消费者变量 | `journal-room.css:18–19` | 极低 | `git grep -- "--diary-text\|--diary-sub"` 改后应只剩零结果 |
| A4 | 删 `uploadMemoryImage` 的死参数 `fallbackThumbDataUrl` 及其注释 | `storage.ts:56–72` | 低（唯一调用点 `screens.tsx:590` 本就不传） | `tsc -b` |
| A5 | 注释审计落地：按 §5 的表格补写/替换/删除 | 本分区全部 9 个源文件 | 无（纯注释） | `pnpm lint`；人工复核每条"应删除的旧注释摘句"确实已消失 |
| A6 | 失效/不完整文档引用修正 | `screens.tsx:54`、`posts.ts:1`、`storage.ts:5`；四个 journal 文件各加 `// Feature doc: ai/features/timeline.md` | 无 | 对每个新路径跑一次 `test -f` |
| A7 | 合并 `owLoad` / `load`，新建 `src/lib/local-store.ts`（含 `owSave`） | `rooms.ts:29–36`、`screens.tsx:301–315`、`WorldPage.tsx:24` | 低。**前提：localStorage key 字符串一字不改** | `tsc -b`；`git grep -n "ow-[a-z-]*-v1"` 改动前后输出逐行相同 |
| A8 | `SIGNED_URL_REFRESH_MS` 上移到 `storage.ts`，`useSignedThumbs` 改为 import | `storage.ts:11`、`screens.tsx:728` | 低。新值 `3600*1000*2/3 = 2 400 000` ms，与现有 `40*60*1000` **数值相等** | `tsc -b`；控制台断言 `SIGNED_URL_REFRESH_MS === 2400000` |
| A9 | 抽 `applyThumbUrls(root, urlFor)` 到 `journal-layout.ts`，消除两份拷贝 | `journal-room-book.tsx:62–68`、`journal-turn.ts:182–189` | 低 | `check-journal-turn.mjs`（`:122` 已断言翻页中 `.journal-photo img` 的 src） |
| A10 | `journalEntry` 降为模块私有（去掉 `export`） | `journal-layout.ts:22` | 低 | `git grep -n "journalEntry"` 确认只剩本文件；`tsc -b` |
| A11 | 把 §4.1 连带的 `cinnaglass.css:297` 的 `.tl-card` 从 `.paper` 列表移除 | `cinnaglass.css:297` | 低，但**属分区外**，应与该文件的审阅者对齐后再动 | 同 A1 |

A 类合计净减约 **150 行 CSS + 1 个死参数**，不新增文件（A7 除外），不改任何渲染结果。

### B · 需用户批准（改变结构、公开接口或需要逐像素验收）

| # | 事项 | 为什么需要批准 | 风险 | 验证方法 |
|---|---|---|---|---|
| B1 | `screens.tsx` 按 §2.2 拆成 8 个模块 | 新增 8 个文件、改 `WorldPage.tsx` 的依赖图；属"大文件拆分"，超出本步授权 | 中。逐字搬运可控，但 `ScreenStyles → .css`（B3 步）有层叠顺序风险 | 分 4 批提交（§2.4）；每批用 `diff <(git show HEAD~1:原文件 \| sed -n 'A,Bp') 新文件` 证明逐字搬运；全量 `getComputedStyle` dump 前后比对；4 个 Playwright 脚本全跑 |
| B2 | `diary.css` 扁平化：把被 `journal-room.css` 覆盖的声明就地删除，让样式只剩一层 | 这是本分区最大的结构债（已否决的苔绿手札仍是棕皮书的基础层），但**日记本 UI 本 session 冻结**，任何触碰都必须用户点头 | 中高。`journal-room.css` 只重声明了它关心的属性，哪些 `diary.css` 声明真的生效必须逐条实测 | 流程：① 三档断点各 dump 一次全量计算后样式；② 删；③ 再 dump；④ JSON diff 必须为空。不达成则回滚 |
| B3 | `diary.css:11–24` 的两条 shell 规则迁去 `cinnaglass.css` | 跨文件层叠顺序变化 | 中 | 同 B2 的 dump 流程，外加 `WorldPage.tsx:435` 的 `data-reading` 场景（打开日记时房间道具隐身）手动走一遍 |
| B4 | 7 个 `journal-*` 文件移入 `themes/cinnaglass/journal/` | 目录结构变化 + 会打断两个校验脚本 | 中。风险全部集中在 `check-journal-art.mjs:180` 与 `check-journal-turn.mjs:254` 的硬编码模块 URL | 单独一次提交，只做 `git mv` + 4 处 import + 2 处脚本路径 + 文档路径；提交后必须完整跑通 4 个脚本（尤其这两个），任何一个报 404 即回滚 |
| B5 | 取消 `ComposerComponent` 注入，让 `journal-room-book.tsx` 直接 import `Composer` | 改 `JournalRoomBook` 的公开签名 | 低（依赖 B1 完成） | `tsc -b`；`check-journal-turn.mjs:197,204` 覆盖折叠态与草稿态 |
| B6 | 删 `image-slot.js` 的 `_emitChange` / `slot-change`（`:390–400` 及两处调用） | 删除一个对外事件 API（虽然零监听者） | 低 | `git grep -n "slot-change"` 应只剩零结果；手动在设置页拖一张头像，确认落盘与显示不变 |
| B7 | `types.d.ts` → `src/types/image-slot.d.ts` | 全局类型声明移位 | 低（`include: ["src"]` 覆盖） | `tsc -b`；`settings.tsx:134` 的 `<image-slot>` JSX 不报类型错 |
| B8 | 用 React 头像选择器替换 `<image-slot>`，删约 555 行 | **行为变化**：失去 reframe 缩放平移交互，且 `ow-image-slots-v1` 里的既有用户数据会被弃用 | 高 | 需要先决定旧 localStorage 数据的迁移或放弃；手动验收设置页头像全流程 |
| B9 | `screens.tsx` 改名为 `object-surfaces.tsx` | 改 `WorldPage.tsx:12` 与多份文档引用 | 低 | `git grep -n "cinnaglass/screens"`；`tsc -b` |

---

## 附：数字一览

| 指标 | 值 |
|---|---|
| 分区总行数 | 4399（14 个文件） |
| 可直接删除的死样式 | 约 150 行（`ScreenStyles` 68 + `diary.css` 74 + `journal-room.css` 2 + 变量若干） |
| 零消费者选择器块数 | 14（`diary.css` 11 + `ScreenStyles` 上述族 + `journal-room.css` 2 个变量） |
| `journal-turn.css` 死样式 | 0 |
| 无注释的具名函数/组件/导出常量 | 51 |
| 过时注释 | 7 处（`screens.tsx` 1/53/118/177/497，`storage.ts` 5/56） |
| 完全相同的重复实现 | 2 组（`owLoad`/`load`；两份 `applyThumbUrls` 循环） |
| 无编译期约束的跨模块不变量 | 1（`SIGNED_URL_TTL` ↔ `SIGN_REFRESH_MS`） |
| 死代码路径 | 2（`uploadMemoryImage` 第三参；`image-slot` 的 `slot-change`） |
| 反向/越界依赖 | 1（`pages/WorldPage.tsx → themes/cinnaglass/rooms.owLoad`） |
| 可用的无测试验证器 | 4 个 Playwright 脚本 + `tsc -b` + `eslint` + 产物 CSS diff + 计算后样式 dump |
