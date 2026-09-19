# 分区审阅：codex-visual/ 与 arts/（子任务 01-S07，分区 batches）

> 基线 3fd52a5（分支 dev），审阅日期 2026-09-18。只读；未改动、未移动任何项目文件。覆盖 CSV：`batches-coverage.csv`。

## 0. 范围与方法

- 负责路径：inventory.csv 中以 `codex-visual/` 与 `arts/` 开头的全部 **184** 条（binary 135、text 49，共 220.3 MB；codex-visual 150 条 168.6 MB，arts 34 条 51.7 MB）。
- 磁盘/Git 与清单对照：`find` 与 `git ls-files` 在这两个目录下都是 **185** 个文件，比 inventory 多 1 个：`codex-visual/20260811-055917Z/__pycache__/measure_concept.cpython-312.pyc`（15,169 B，git 跟踪中）。这是清单本身的遗漏（见发现 F-10），本分区 CSV 仍按 inventory 的 184 条输出。
- 文本文件（49）：全部 `cat -n` 逐行读完（含 .md/.py/.ps1/.json/.csv/.txt；`pixel-evidence.json` 37 KB 用 `json.load` 全量解析并核对结构、头尾及与 `measure_concept.py` 的对应），随后用 grep 核对引用面：全仓 `codex-visual`、`arts/`、`.blend`、`LXGWWenKai`、`generated/`、批次时间戳、文件名；`ai/sessions/` 只列路径不读正文（命中 1 个：`ai/sessions/活物件-唱片机-生成优先分层管线.md` 提到 `arts/`）。受保护目录 `.claude/`、`.agents/` 只引用存在，未读。
- 二进制（135）：用 PNG IHDR 读尺寸/色型、`file` 看类型、inventory 的 sha256 做全仓去重比对、`git log --diff-filter=A` 看首次入库，并对照各批次 `codex-report.md` 的 Artifact manifest 与仓内消费者（`scripts/build-turntable-parts.py`、`scripts/pack-*.mjs`、`public/**/manifest.json`、`src/`）。**没有逐像素目视审图**，图片内容判断全部来自报告自述 + 元数据 + sha 对比，见「限制」。
- 目录体积用 `du -sk` 与 inventory bytes 双口径（下文 MB 为 inventory bytes/1e6）。

## 1. codex-visual/ 逐批次判定表

18 个时间戳目录，每批都有 `codex-report.md`。登记情况：13 批在 `ai/design_system/research/production-batches.md`（L7–L19），5 批在 `ai/design_system/uiux/research/production-batches.md`（L7–L11），**18/18 全部登记且链接可解析**。`ai/PROJECT.md:184` 把 `codex-visual/` 定性为「原始制作批次和历史上下文，使用中的资料位置以常驻设计系统为准；不继续逐回合往此处堆普通过程报告」。

| 批次 | 文件数 / 体积 | 用途（报告 Mode） | 登记 | 晋升 / 去重（sha256 比对） | 生命周期判定 |
| --- | --- | --- | --- | --- | --- |
| 20260808-200206Z | 1 / 13 KB，无图 | Audit：旧 Cinnaglass 光照配方三档审核 | uiux L7「历史」 | 无产物；输入图在 `ai/design_system/cinnaglass/_shots/`（D:\ 绝对路径，当前仓无该目录） | 已完成历史；保留 |
| 20260809-083950Z | 8 / 12.9 MB（6 PNG + report + prompt-set） | Design：3D→2.5D 媒介重估六构图 | research L7「已选 Pixi 分层，保留推导」；另被 `ai/reboot/tech-plan.md:39`、`ai/reboot/concept-art.md:5` 引用 | 未晋升，无重复 | 已作废方案（建议 Blender 预渲染+R3F，实际走 Pixi）；作研究保留 |
| 20260809-101107Z | 7 / 13.2 MB | Design：陪伴小屋六张概念 | research L8「正式副本在本域 baselines」 | **6 张 PNG 与 `ai/design_system/concept/baselines/companionship-room/` 逐字节相同（13.1 MB 重复）**；报告副本多了 2 行「2026-09-12 归档说明」 | 概念基线；重复见 F-4 |
| 20260810-000437Z | 7 / 10.5 MB | Design/生产：书房底图 ×2 + 角色立绘 ×4 | research L9；`design-system.md:43` 指定本批为「双角色 原始生产批次…没有另建角色源素材目录」；`character.md:36` | 4 张 char-*.png == `public/characters/*`（4.7 MB 重复）；2 张 room-study-*.png（5.8 MB）含内嵌 rail/热点，被 024945Z 干净底图取代，无消费者 | **当前有效**：是角色的唯一源位置（活依赖） |
| 20260810-024945Z | 4 / 10.4 MB | Design/raster edit：去 UI 三档干净底图 | research L10「源素材关系见 arts/rooms/study/」 | 3 张 == `arts/rooms/study/source/{golden,night,twilight}.png`（10.4 MB 重复）；后续 8 个批次以它的 twilight 图为参考输入 | 已晋升；arts/source 是声明真源（F-1） |
| 20260810-060422Z | 4 / 8.8 MB | Design/ui-mockup：三方向 UI 比稿 A/B/C | uiux L8「历史比稿」 | **3 PNG + 报告与 `ai/design_system/uiux/research/cinnaglass-history/navigation-concepts/` 及 `ui-concepts/` 完全相同 → 全仓三份（另 2×8.8 MB）** | 历史比稿；跨分区三重复见 F-5 |
| 20260811-042411Z | 3 / 2.0 MB | Design：棋牌室/植物园缩略卡 768×512 | research L11；`design-system.md:47` 指定为「原始制作批次」；`scene.md:26–30` | `public/rooms/{gameroom,garden}/thumb.png`（263/290 KB）与本批 PNG（942/1050 KB）sha 不同——运行时是重编码版，本批是唯一无损原件 | **当前有效**：缩略图源件 |
| 20260811-044310Z | 1 / 16 KB，无图 | Audit：Concept C 实现审核 | uiux L9 | 无产物 | 已完成历史 |
| 20260811-055917Z | 21 / 1.6 MB（+1 个未入清单的 .pyc） | Design：Concept C 像素规格 + 3 张 256² 素材 + 量测脚本/证据 | uiux L10「历史生产批次」 | avatar-blue/pink、disc-cover == `public/avatars/{blue,pink}.png`、`public/ui/disc-cover.png`（0.37 MB 重复）；13 张 measurement-crops 为 2× 放大证据（1.2 MB） | 素材已晋升；脚本为一次性量测（F-9） |
| 20260815-172541Z | 3 / 4.2 MB | design：星光粒子提示 mockup | research L12「当前采用星星提示，配方以实现为准」 | 未晋升 | 研究，保留 |
| 20260815-235110Z | 4 / 8.8 MB | Design：贴形金描边 + 星光 | research L13「描边方向已否决，保留研究」；`TODO.md:76` 记「光环/描边/换图三条路全部否决并删除」 | 未晋升 | 已作废方案，作研究保留 |
| 20260822-092155Z | 8 / 8.0 MB | design：预烘焙 hover 金光层 ×5 + 2 张 QA 合成 | research L14「旧换图/光效提示路线，不作新需求」 | 未晋升；`qa-*.png` 两张占 7.9 MB | 已作废方案；QA 图体积可议（F-8） |
| 20260823-054106Z | 4 / 5.7 MB | Design：Study Living Diorama 分层/动效图 | research L15；`concept/README.md:10` | **3 PNG == `ai/design_system/concept/proposals/living-props/`（5.7 MB 重复）**；报告 L129 自述路径为 `.claude\skills\monet\codex-visual\...`（陈旧） | 概念，部分已实现；重复见 F-4 |
| 20260905-215344Z | 6 / 8.1 MB（3 PNG + report + decisions-v2 + handoff） | Design：Timeline v2 三方向比稿 + Codex 再决策 | uiux L11「后续棕皮旧纸方案已替代阶段外观，日记本轮冻结」；**活引用**：`ai/Features/timeline.md:209,232`、`ai/design_system/uiux/cinnaglass/ui-system.html:1482`、`uiux/research/cinnaglass-history/diary-surface-v2.html:3` | 未晋升，无重复 | decisions-v2 是 2026-09-05 决策记录（「白纸」形态）；外观已被 2026-09-11 棕皮书取代（F-11） |
| 20260906-054721Z | 17 / 20.1 MB | design/precise-object-edit：唱臂去除 clean plate ×3（+generated ×3、review ×3、prompt/validation/composite.ps1） | research L16「生产中间件，非整屋新批准稿」 | 未晋升；报告自判「Visual acceptance FAIL」；`TODO.md:78` 记「codex AI 局部重绘不合格」 | 失败生产尝试；仅由索引引用（F-8） |
| 20260906-192932Z | 24 / 28.6 MB | design：唱片机分层生成（plate ×3 + 绿幕唱臂 ×3 + raw 9 + review 3 + 脚本/清单/metrics + deps/.lock） | research L17「生产尝试与复核」 | plate-*/part-tonearm-*/codex-report == `arts/rooms/study/generated/20260906-192932Z/`（5.2 MB 重复，arts 为子集）；报告自判 FAIL 像素闸门；part-tonearm 曾在第三轮（e96b3f9）当唱臂层，第四/五轮已换 053852Z 的 tonearm | 已被后续轮次取代；raw/review 为失败尝试证据（F-2、F-3） |
| 20260907-053852Z | 20 / 20.5 MB | design：机器 ×3 / 唱片 / 唱臂 分离（+attempt 7 张、registration-overlay、review、脚本、qa txt） | research L18「派生使用以源库和运行时 manifest 为准」 | machine-*/platter/tonearm/review/codex-report == `arts/rooms/study/generated/20260907-053852Z/`（7.0 MB 重复，arts 为子集） | **当前有效**：`machine-twilight.png`（donor）与 `tonearm.png` 是装配器现役输入（F-2） |
| 20260907-055939Z | 8 / 5.1 MB | design：唱片 v2（带印花）+ 转轴针（+attempt 3 张、normalize.ps1） | research L19「当前转盘还原算法见 PROJECT，旧部件不自动替换」 | platter/spindle/review/codex-report == `arts/rooms/study/generated/20260907-055939Z/`（1.6 MB 重复） | **当前有效**：`platter.png` 是装配器 `--platter` 现役输入；`spindle.png` 已被 v5「从原画切针」取代 |

批次内文本文件读后要点（用途 / 可运行性）：

- `20260809-083950Z/prompt-set.md`：六张图最终 prompt，追溯用；无外部引用。
- `20260811-055917Z/measure_concept.py`、`query_pixels.py`、`resize_assets.py`：纯 stdlib PNG 解码/采样/面积重采样；**硬编码** `D:\Repo\our-world\ai\concept\ui-system\concept-c-narrow-rail.png`（该路径在当前仓不存在，图现在位于 `codex-visual/20260810-060422Z/` 与 `cinnaglass-history/*/`）和 `C:\Users\Jackzz\.codex\generated_images\...`；在本机（macOS）不改路径无法运行。`query_pixels.py` `from measure_concept import px` 会在导入时执行全图解码。`pixel-evidence.json` 是 `measure_concept.py` 的输出（source 字段同样是 D:\ 路径），13 个 box、16 组采样、14 组扫描峰，与报告 §5 数字一致。
- `20260905-215344Z/decisions-v2.md`：Codex 对 Claude 六条复核的回应与六项裁决（我们的日记 / 拆三 tab / 白卡 / 504-432-288px / `--accent-deep:#2F9AD3`）；`handoff-context-for-codex.md`：Claude 交给 Codex 的上下文（提到 `.claude/skills/ux/decisions.md`，只作路径引用）。两者被 `ai/Features/timeline.md`、`ui-system.html` 活引用。
- `20260906-054721Z/composite.ps1`、`20260906-192932Z/build-review.ps1`、`20260907-053852Z/{prepare,measure}.ps1`、`20260907-055939Z/normalize.ps1`：Windows PowerShell + System.Drawing，硬编码 `D:\Repo\our-world\...`、`C:\Users\Jackzz\AppData\Local\Temp\claude\...\scratchpad\parts\...`、`C:\Users\Jackzz\.codex\generated_images\...`；依赖的 crop-*.png / arm-mask.png / 生成原图都在仓外临时目录，**当前仓内不可复跑**，价值是「处理步骤的可审计记录」。`*.json` 清单同样只含仓外绝对路径。`metrics.csv`、`qa-*.txt`、`validation-*.json`、`prompt-*.txt` 是与报告数字一致的证据。
- `20260906-192932Z/deps/.lock`：0 字节，报告 L91 自述「Failed dependency-install cache/deps directories, if present, are not deliverables」，却被 git 跟踪。

## 2. arts/ 逐文件/目录判定表

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
| --- | --- | --- | --- | --- | --- |
| `arts/meshes/avatar.blend`（225 KB） | 云朵小狗 3D 角色源（Blender） | 产出者 `ai/blender/scripts/build_avatar.py:13`（写入）；无读取者 | 旧 R3F/three.js 时代资产 | 全仓仅 blender 脚本提及；`TODO.md:113` 三.js 全家、`public/models`、`metaspace.tsx` 已于 2026-08-10/11 删除；`package.json` 无 three（仅残留 `@react-three/rapier`） | 已退役技术的源文件；去留需用户决定（F-6） |
| `arts/meshes/metaspace.blend`（968 KB） | 16×11 大宅 3D 场景源 | 产出 `build_metaspace.py:17`；读取 `preview_cameras.py:2` | 同上 | 同上；脚本自述 spec `ai/blender/metaspace.md` 已不存在 | 同上 |
| `arts/meshes/scene.blend`（696 KB） | 更早的 3D 场景（c586b70，2026-05-25，随 `ai/blender/scene.md` 一起提交） | 无任何脚本/文档引用；`ai/blender/scene.md` 已在 7c93c3c（2026-08-09）删除 | 无产出脚本、无文档 | grep 全仓 0 命中 | 孤儿文件；删除候选（中） |
| `arts/meshes/scene.blend1`（550 KB） | Blender 自动备份 | 无 | 派生备份 | `.gitignore:33 *.blend1`（822fa92 加入，晚于文件入库 c586b70，故规则对已跟踪文件无效） | 删除候选（高） |
| `arts/rooms/study/source/{golden,night,twilight}.png` | 三档书房定稿原画 1586×992（golden/night 为 RGBA，twilight 为 RGB） | `scripts/build-turntable-parts.py --src`；`src/themes/cinnaglass/room/study-room.ts:12` 注释；`ai/PROJECT.md:56`「原画真源」；`ai/design_system/scene.md:7,34`、`props.md:5`、`research/art-relighting.md:27–29`、`art-relighting-preview/index.html:282` | **真源**（与 `codex-visual/20260810-024945Z/*-clean.png` 逐字节同） | 见左 | 当前有效，保留 |
| `arts/rooms/study/generated/20260906-192932Z/`（7 文件 5.2 MB） | 第三轮生成 plate/绿幕唱臂（codex-visual 同名批次的子集） | 无脚本读取（装配器 v5 读 053852Z）；`scene.md:34`「生产派生层」与 `PROJECT.md:56`「生成图层归档」泛指目录 | 副本（sha 与 codex-visual 相同） | 报告 20 处本地引用在此目录不存在（review-*.png 3 个 Markdown 链接、metrics.csv、build-review.ps1、raw-*.png ×9 等） | 已被取代的归档；去重候选（F-2） |
| `arts/rooms/study/generated/20260907-053852Z/`（7 文件 7.0 MB） | 第四/五轮机器/唱片/唱臂 | 装配器 `--gen` 只读 `machine-twilight.png`（L366，DONOR_MOOD）与 `tonearm.png`（L385）；`platter.png` 仅在未传 `--platter` 时作默认（L377）；`machine-golden/night.png`、`review.png` 未被读取 | 副本 | 报告 17 处本地引用不存在（attempt ×7、脚本 ×2、qa ×2、registration-overlay 等） | **现役输入所在**（F-2） |
| `arts/rooms/study/generated/20260907-055939Z/`（4 文件 1.6 MB） | 唱片 v2 + 转轴针 | `--platter arts/rooms/study/generated/20260907-055939Z/platter.png`（脚本 docstring L43）；`spindle.png` 不被读取（v5 用 `PIN_POLY` 从原画切针，`TODO.md:81`） | 副本 | 报告 6 处本地引用不存在 | `platter.png` 现役；其余可议 |
| `arts/ui/journal/manifest.json` | 日记本素材登记（候选状态、打包器、字体来源） | `public/ui/journal/manifest.json:3` 反向引用；`design-system.md:45`、`ui-system.md:35`、`book-implementation.md:24` | 登记文档 | 内容与磁盘一致 | 当前有效 |
| `arts/ui/journal/book-checker-source.png`（1536×1024 RGB） | 生成的书本原图（棋盘假背景） | `scripts/pack-journal-art.mjs:9` 输入；`book-prompts.md:9` | 原始输入 | 见左 | 当前有效（重打包依赖） |
| `arts/ui/journal/book-alpha.png`（RGBA 3.0 MB） | 打包器中间产物「透明母版」 | `pack-journal-art.mjs:49` **写入**；无读取者 | 派生 | manifest 标「packaged alpha master」 | 可再生的中间件；低优先候选 |
| `arts/ui/journal/book-alpha-rejected.png`（2.2 MB） | 被否决的背景抠除重试 | `book-prompts.md:25` 记录；manifest「rejected」 | 历史证据 | 见左 | 已作废，作记录保留 |
| `arts/ui/journal/quill-source.png`（847×1857 RGBA） | 羽毛笔原图 | `pack-journal-art.mjs:60` 输入；`book-prompts.md:17` | 原始输入 | 见左 | 当前有效 |
| `arts/ui/journal/pack-results.json` | 打包器输出报告 | `pack-journal-art.mjs:90` 写入；manifest `packReport` | 派生报告 | 记录的 4 个 webp 尺寸与 `public/ui/journal/*.webp` 实际字节一致（397,418 / 209,774 / 8,032 / 50,688） | 当前有效 |
| `arts/ui/journal/LXGWWenKaiLite-Regular.ttf`（13.9 MB） | 霞鹜文楷 Lite 字体源（OFL） | `public/fonts/journal/manifest.json:8` 记 source 与 sourceSha256（`140C99BA…` 与 inventory sha 一致）、upstream URL；运行时只用 `public/fonts/journal/*.woff2`（5.3 MB，`journal-room.css:5`） | 上游可再下载的第三方源 | 见左 | 体积最大的单文件；是否留仓需用户决定（F-7） |
| `arts/ui/navigation/frost-source.png`（1254×1254 RGB） | 导航磨砂细纹原图 | `scripts/pack-navigation-texture.mjs:7` 输入；`public/ui/nav/manifest.json:3`；`navigation-texture-prompt.md:11`、`navigation-implementation.md:81` | 原始输入 | 见左 | 当前有效 |
| `arts/ui/navigation/manifest.json` | 登记 | `public/ui/nav/manifest.json:4` | 登记文档 | 一致 | 当前有效 |

**arts 作为「原始/编辑来源」目录的组织是否清楚**：`arts/rooms/study/source` 与 `arts/ui/*` 清楚——源图 → `scripts/pack-*.mjs` / 装配器 → `public/`，两端都有 manifest 互指。两处不清楚：① `arts/meshes` 是与当前 Pixi 管线无关的 3D 遗留；② `arts/rooms/study/generated` 是 codex-visual 三个批次的**不完整镜像**，既含现役输入又含已取代轮次，没有 manifest 说明「哪一轮/哪几个文件是装配器实际吃的」，三份报告副本因此断链。

## 3. 发现

### F-1 三档原画一式两份：codex-visual/20260810-024945Z ↔ arts/rooms/study/source（10.4 MB）
- 证据：sha256 完全相同（abe44fdc… / e83fb6fd… / c72f3056…）；`arts/source` 于 d880d1f（2026-09-05）加入并被 `PROJECT.md:56`、`scene.md`、`art-relighting.md`、`study-room.ts`、装配器 `--src` 视为真源；codex-visual 侧是「去 UI 三档底图」的原始交付，并被 8 个后续批次报告以 D:\ 绝对路径当参考输入。
- 判定：**arts/source 是权威**；codex-visual 侧是批次完整性证据。
- 建议：保留两侧不动（批次完整性 + 真源可用），或在 `codex-visual/20260810-024945Z/codex-report.md` 末尾追加一行「三张已晋升为 arts/rooms/study/source/*.png」。若一定要省 10 MB，删 codex-visual 侧 3 张 PNG 并改 `production-batches.md:10` 说明——**需用户决定**。

### F-2 唱片机三轮生成图层双份归档，arts 侧为断链子集（13.9 MB 重复）
- 证据：`arts/rooms/study/generated/{20260906-192932Z,20260907-053852Z,20260907-055939Z}` 共 18 文件，sha 与 `codex-visual/` 同名文件全等；arts 侧缺 raw/attempt/review-board/脚本/清单，三份 `codex-report.md` 分别有 20/17/6 处本地引用落空（含 192932Z 的 3 个 Markdown 链接 `review-*.png`）。入库顺序：arts 副本先（e96b3f9、c4ce05a，2026-09-06），codex-visual 原批后（5b96700，2026-09-11）。
- 权威性判读：
  - `scripts/build-turntable-parts.py` docstring L41–43 以 `--gen arts/rooms/study/generated/<run>`、`--platter arts/rooms/study/generated/20260907-055939Z/platter.png` 为用法；实际读取的只有 `<gen>/machine-twilight.png`（L366，`DONOR_MOOD="twilight"`）、`<gen>/tonearm.png`（L385）、`--platter` 或 `<gen>/platter.png`（L377）。
  - `PROJECT.md:56`「原画真源 arts/rooms/study/source/，生成图层归档 arts/rooms/study/generated/」；`scene.md:34`「生产派生层」链到 arts/generated；`production-batches.md:17–19` 链到 codex-visual 并写「派生使用以源库和运行时 manifest 为准」。
  - 结论：**codex-visual = 原始批次（含失败尝试，policy 见 production-batches.md 引言「批次保留原始报告、素材与失败尝试」）；arts/generated = 装配器输入库**。两侧都有存在理由，但 arts 侧当前既不完整又混入未使用文件。
- 可执行去重方案（推荐 A）：
  1. arts/generated 收缩为**装配器实际读取的文件**：`20260907-053852Z/{machine-twilight.png,tonearm.png}`、`20260907-055939Z/platter.png`；如担心换 donor，`machine-golden/night.png` 可留（脚本目前不读）。
  2. 删 arts 侧 3 份 `codex-report.md` 与 2 份 `review.png`、`20260907-053852Z/platter.png`（被 055939Z 版取代）、`20260907-055939Z/spindle.png`（v5 不用生成针），整个 `arts/rooms/study/generated/20260906-192932Z/`（第三轮，已被第四/五轮取代）。
  3. 新增 `arts/rooms/study/generated/README.md`（或 manifest.json）：写明每个文件来自哪个 codex-visual 批次（相对链接）、装配命令、当前 `public/rooms/study/parts/turntable.json` 由哪次运行产出。
  4. 链接需改：`scene.md:34`「生产派生层」目标不变但指向的目录内容变化，建议改为链接 README；`PROJECT.md:56`「生成图层归档」措辞改为「装配输入」；`production-batches.md:17–19` 不用改。
  5. 脚本参数：不受影响（`--gen arts/rooms/study/generated/20260907-053852Z` 仍能找到 machine-twilight.png/tonearm.png；`--platter` 仍指向 055939Z）。若用户选择保留 `machine-golden/night.png`，也不影响。
  - 方案 B（反向：删 codex-visual 三批 raw/attempt/review ≈ 41 MB，只留 arts）会违反 production-batches.md 的「保留失败尝试」方针并需改 3 处索引链接，不推荐。
- **需用户决定**：是否接受把 arts/generated 从「归档镜像」改定义为「装配输入库」；是否保留 `machine-golden/night.png`。

### F-3 codex-visual 202609xx 批次的失败尝试与 review board 占 41 MB
- 证据：`raw-*`/`*attempt*` 共 28.2 MB，review board 13.0 MB（其中 192932Z 三张 4080×820 板占 10.8 MB），054721Z clean/generated 19.2 MB。均只被 production-batches 索引间接引用；报告自判 FAIL 或「review candidates」。
- 这是政策问题而非断链：production-batches.md 明文保留失败尝试。建议列入体积策略（第 6 节）而不是直接删除；若用户愿意改方针，可用 Git 历史（基线 3fd52a5）作恢复依据。**需用户决定**。

### F-4 概念图向 ai/design_system 的晋升是逐字节复制（跨分区重复 18.8 MB + 三重复 17.6 MB）
- 证据：`20260809-101107Z` 6 张 == `ai/design_system/concept/baselines/companionship-room/`；`20260823-054106Z` 3 张 == `concept/proposals/living-props/`；`20260810-060422Z` 3 张 + 报告 == `uiux/research/cinnaglass-history/navigation-concepts/` **且** == `.../ui-concepts/`（同一批次在 design_system 里放了两份）。
- 判定：`design-system.md:3`/`production-batches.md` 的规则是「正式副本在本域」，所以 design_system 侧是使用副本，codex-visual 是原件；两侧都被登记。`navigation-concepts` 与 `ui-concepts` 二选一显然多余（属其他分区，此处只报不评）。
- 建议：design_system 侧改为 Markdown 相对链接指向 codex-visual 原件可省 36 MB，但会让「常驻设计系统自足」的原则打折——**需用户决定**；至少 `cinnaglass-history` 两份中删一份（交 design_system 分区处理）。

### F-5 codex-visual 内多批次是「活依赖」，不能整体归档搬走
- `design-system.md:43`「双角色 → 原始生产批次 codex-visual/20260810-000437Z；没有另建角色源素材目录」、`design-system.md:47`「其他房间缩略图 → codex-visual/20260811-042411Z」、`character.md:36`；`ai/Features/timeline.md:209,232` 与 `ui-system.html:1482` 指向 `20260905-215344Z/decisions-v2.md`；`ai/reboot/*` 指向两批 2026-08-09。
- 判定：这些批次是当前有效的「源位置」。若要把 codex-visual 移出仓或改名，必须同步改上述 6 处链接；任何 LFS/外置策略也要保证这些路径可解析。

### F-6 arts/meshes：three.js 已退役，4 个 .blend 无现役消费者
- 证据：`TODO.md:113`「已删（2026-08-10/11）：metaspace.tsx（3D）…public/models、public/draco、three 全家依赖」；`package.json` dependencies 无 three/@react-three/fiber（残留 `@react-three/rapier`，属他分区）；`ai/blender/scripts/build_metaspace.py:3` 引用的 spec `ai/blender/metaspace.md`、`preview_cameras.py:3` 引用的 `src/themes/cinnaglass/metaspace.tsx`、`build_avatar.py:14` 输出 `public/models/avatar-cloudpup.glb` 均已不存在；`scene.blend` 从未有生产脚本，其配套 `ai/blender/scene.md` 已删（7c93c3c）。`file` 显示 4 个都是 Zstandard 压缩的 .blend 容器。
- 缺少的证据：用户是否想为 R2（Electron 桌宠窗）/R3（桌宠模式）保留 3D 源作备用——`PROJECT.md:29–30` 的 R2/R3 描述是 Electron + 2D 角色（概念图 03），未提 3D。
- 建议：`scene.blend1` 直接删；`scene.blend` 删（无产出/无文档）；`avatar.blend`/`metaspace.blend` 二选一：保留但把 `ai/blender/` 与 `arts/meshes` 一起标注为「已退役 3D 试验」，或整体移出仓（可由脚本重建，但脚本硬编码 D:\ 路径）。**需用户决定**。

### F-7 字体源 ttf 13.9 MB 留仓的必要性
- 证据：运行时只加载 `public/fonts/journal/LXGWWenKaiLite-Regular.woff2`；`public/fonts/journal/manifest.json` 已记录 upstream URL、sourceSha256、conversion 方法与 OFL；arts manifest 也记录了 runtime/license 路径。
- 建议：若不需要离线重转，删 ttf 并在两份 manifest 保留 URL+sha 作恢复依据（Git 3fd52a5 亦可恢复）。**需用户决定**（离线可重现 vs 体积）。

### F-8 已作废路线的大图仍在仓
- `20260810-000437Z/room-study-{golden,night-rain}.png`（5.8 MB，含内嵌 rail，被 024945Z 取代，无引用）；`20260822-092155Z/qa-*.png`（7.9 MB，已否决的换图路线的压力测试合成）；`20260906-054721Z` 全批 19.2 MB（自判 FAIL）。
- 与 F-3 同属「保留失败尝试」方针，列为可议项，不作删除候选。

### F-9 一次性脚本与缓存混在批次里
- `20260811-055917Z/__pycache__/measure_concept.cpython-312.pyc`：git 跟踪、`.gitignore:36 __pycache__/` 命中（`git check-ignore --no-index` 确认）、inventory 漏收；规则于 d880d1f 加入，晚于文件入库（86e073d），因此未生效。
- `20260906-192932Z/deps/.lock`：0 字节，报告自述非交付物。
- `*.ps1`/`*.py`：全部硬编码 Windows 绝对路径与仓外临时目录，当前不可复跑，但它们是「处理步骤可审计」的一部分，属于批次完整性；保留不影响任何消费者。
- 建议：删 .pyc 与 deps/.lock（高置信）；脚本保留。

### F-10 inventory.csv 少收 1 个已跟踪文件
- `codex-visual/20260811-055917Z/__pycache__/measure_concept.cpython-312.pyc` 在 `git ls-files` 与磁盘都存在，但 inventory 未列（可能因 .gitignore 过滤）。建议基线清单补录或注明「按 .gitignore 过滤」。

### F-11 decisions-v2.md 的「白纸」形态已被棕皮书取代，但仍被两处活引用当依据
- `decisions-v2.md:5`「状态：设计已定稿，尚未进入产品代码实现」、L10「窄幅前视白纸」、L139「504/432/288px」；`uiux/research/production-batches.md:11`「后续棕皮旧纸方案已替代阶段外观，日记本轮冻结」；`book-implementation.md`（2026-09-11）记录实际实现为 1536×1024 棕皮书。
- 判定：`decisions-v2.md` 中信息架构裁决（拆三 tab、我们的日记、Esc 栈、`--accent-deep`）可能仍有效，视觉尺寸/白纸部分已作废。`ui-system.html:1482`「完整裁决：decisions-v2.md」与 `timeline.md:232` 引用时未标注哪部分已被替代——建议由 UI 文档分区在引用处加一句「形态与尺寸以 book-implementation.md 为准」。

## 4. 陈旧陈述清单

| 路径:行 | 陈述 | 实际 |
| --- | --- | --- |
| codex-visual/20260823-054106Z/codex-report.md:129 | 「All artifacts are under `D:\Repo\our-world\.claude\skills\monet\codex-visual\20260823-054106Z`」 | 批次现位于 `codex-visual/20260823-054106Z/`；三张 PNG 另有副本在 `ai/design_system/concept/proposals/living-props/` |
| codex-visual/20260811-055917Z/codex-report.md:6,26；measure_concept.py:19；pixel-evidence.json:2 | 规格真源 `ai/concept/ui-system/concept-c-narrow-rail.png` | 该路径不存在；同 sha 图在 `codex-visual/20260810-060422Z/concept-c-narrow-rail.png` 与 `ai/design_system/uiux/research/cinnaglass-history/{navigation-concepts,ui-concepts}/` |
| codex-visual/20260810-000437Z/codex-report.md:15–16 | 参考图 `ai\concept\01-main-morning.png`、`02-main-night-rain.png` | 现位于 `ai/design_system/concept/baselines/companionship-room/` |
| arts/rooms/study/generated/20260906-192932Z/codex-report.md:81,85–87,89,91 | 「All paths below are relative to D:\Repo\our-world\codex-visual\20260906-192932Z」并链接 `review-*.png`、列出 metrics.csv/raw-*.png 等 | arts 副本目录内这 20 项均不存在，只在 `codex-visual/20260906-192932Z/` 有 |
| arts/rooms/study/generated/20260907-053852Z/codex-report.md:89–101 | 「All task artifacts are inside D:\Repo\our-world\codex-visual\20260907-053852Z」并列 attempt/脚本/qa | arts 副本缺 17 项 |
| arts/rooms/study/generated/20260907-055939Z/codex-report.md:51–62 | 「All paths below are within …codex-visual\20260907-055939Z」列 normalize.ps1、attempt ×3 | arts 副本缺 6 项 |
| codex-visual/20260907-055939Z/codex-report.md:41,56 | spindle.png 作「registered candidate」待整合 | v5 装配器（`TODO.md:81`、`PROJECT.md:56`）改为从原画按 `PIN_POLY` 切针，生成针未被使用 |
| codex-visual/20260905-215344Z/decisions-v2.md:5,10,139 | 「设计已定稿，尚未进入产品代码实现」；白纸 504/432/288px | 2026-09-11（5b96700）实现为棕皮旧纸书（`book-implementation.md`）；`uiux/research/production-batches.md:11` 已注明替代 |
| codex-visual/20260809-083950Z/codex-report.md §3,§9 | 推荐「Blender 预渲染 + R3F 混合 2.5D」，保留 R3F/Rapier/WASD | 实际 Pixi v8 合成器，three.js 退役（`TODO.md:113`）；`production-batches.md:7` 已标「已选 Pixi 分层」（此条为已登记的历史，非错误） |
| codex-visual/20260906-192932Z/codex-report.md:89 | 「deps directories, if present, are not deliverables」 | `deps/.lock` 仍被 git 跟踪 |
| （分区外，与 arts/meshes 直接相关）ai/blender/scripts/build_metaspace.py:3、preview_cameras.py:3、build_avatar.py:14 | spec `ai/blender/metaspace.md`；镜像 `src/themes/cinnaglass/metaspace.tsx`；输出 `public/models/avatar-cloudpup.glb` | 三者均已删除（7c93c3c、2026-08-10 退役清理） |
| （分区外）ai/reboot/tech-plan.md:39 | 「场景媒介沿用 …Blender 离线渲染分层图 + 运行时合成」 | 实际 Pixi 分层原画；ai/reboot 为 2026-08-09 归档，属历史 |

## 5. 删除候选（恢复依据均为 git 基线 3fd52a5）

| 路径 | 理由 | 查过的引用面 | 置信度 |
| --- | --- | --- | --- |
| arts/meshes/scene.blend1 | Blender 自动备份；`.gitignore:33 *.blend1` 本意即排除；无产出脚本/文档 | 全仓 grep `blend1|scene.blend|arts/meshes`（含 ai/sessions 路径级）0 命中；`git check-ignore --no-index` 命中规则 | 高 |
| codex-visual/20260811-055917Z/__pycache__/measure_concept.cpython-312.pyc | Python 字节码缓存；`.gitignore:36 __pycache__/`；inventory 未收 | grep 0 命中；`file` 为 data；报告 manifest 未列 | 高 |
| codex-visual/20260906-192932Z/deps/.lock | 0 字节安装缓存残留；报告 L89 自述非交付物 | grep `deps/` 0 命中；报告核对 | 高 |
| arts/rooms/study/generated/20260906-192932Z/（7 文件，5.2 MB） | 第三轮已被第四/五轮取代；装配器不读；完整原件在 codex-visual 同名目录；副本报告 20 处断链 | `scripts/build-turntable-parts.py` 读取路径核对；grep 时间戳仅 production-batches 与 codex-visual 自身；`scene.md:34`/`PROJECT.md:56` 只泛指目录 | 中（需用户接受 F-2 方案 A） |
| arts/rooms/study/generated/{20260907-053852Z,20260907-055939Z}/codex-report.md、review.png | 与 codex-visual 同 sha 的子集副本，报告 17/6 处断链，review 板非装配输入 | 同上 | 中 |
| arts/rooms/study/generated/20260907-053852Z/platter.png | 被 055939Z 的 platter.png 取代（脚本 docstring L43 用 `--platter` 指向后者）；仅在不传 `--platter` 时作默认 | 脚本 L377 | 中（若保留需在 README 注明） |
| arts/rooms/study/generated/20260907-055939Z/spindle.png | v5 从原画切针，脚本无任何 `spindle.png` 读取 | 脚本 grep `spindle` 仅输出侧 | 中 |
| arts/meshes/scene.blend | 无产出脚本、配套文档 2026-08-09 已删、无引用；three.js 退役 | 同 scene.blend1 | 中（需用户确认不留 3D 备用） |
| arts/ui/journal/LXGWWenKaiLite-Regular.ttf | 13.9 MB 第三方字体源；运行时用 woff2；upstream URL 与 sha 已记录 | grep `LXGWWenKai`：仅两份 manifest 与 book-implementation.md 文字 | 中（需用户决定离线可重现优先级） |
| arts/ui/journal/book-alpha.png | `pack-journal-art.mjs:49` 每次运行重写的中间产物，无读取者 | grep `book-alpha`：仅 pack 脚本写入与 manifest 文字 | 低 |
| arts/meshes/avatar.blend、metaspace.blend | 退役 3D 源，可由 `ai/blender/scripts` 重建（脚本含 D:\ 路径） | 仅 blender 脚本引用 | 低（用户决定） |

不列为删除候选但值得复核（政策项，见 F-3/F-8）：codex-visual 202609xx 的 raw/attempt（28.2 MB）、review 板（13.0 MB）、054721Z 全批（19.2 MB）、092155Z qa 图（7.9 MB）、000437Z 两张旧底图（5.8 MB）。

## 6. 体积与生命周期

全仓已跟踪 463.7 MB（inventory bytes）：`ai/` 221.6 MB（47.8%，其中 `ai/design_system/uiux` 200.5 MB，他分区）、`codex-visual/` 168.6 MB（36.4%）、`arts/` 51.7 MB（11.2%）、`public/` 20.8 MB（4.5%）、其余 <1%。

codex-visual 内部：20260906-192932Z 28.6、20260907-053852Z 20.5、20260906-054721Z 20.1、20260809-101107Z 13.2、20260809-083950Z 13.0、20260810-000437Z 10.5、20260810-024945Z 10.4、20260815-235110Z 8.8、20260810-060422Z 8.8、20260905-215344Z 8.1、20260822-092155Z 8.0、20260823-054106Z 5.7、20260907-055939Z 5.1、20260815-172541Z 4.2、20260811-042411Z 2.0、20260811-055917Z 1.6、两份纯报告 <30 KB。

重复量（sha 相同，按 codex-visual 侧计一次）：↔ ai/design_system 36.5 MB（含 060422Z 双份）、↔ arts/generated 13.9 MB、↔ arts/source 10.4 MB、↔ public 5.1 MB，合计约 66 MB 可通过「只留一份 + 链接」消除；失败尝试/review/作废路线约 74 MB 属政策可议。

建议策略（不执行）：
1. **codex-visual 定位不变**（原始批次 + 失败尝试，只追加不改写），但停止再向其复制到 arts；新批次产物若要进生产，走「arts 装配输入库 + README 指回批次」。
2. **arts/rooms/study/generated 改为装配输入库**（F-2 方案 A），并补 README/manifest。
3. **arts/meshes 与 ai/blender 一并处置**（F-6）。
4. **大二进制外置**：若仓库体积成为痛点，优先把 codex-visual 202609xx 的 raw/attempt/review（≈41 MB）与 ai/design_system 的复制件迁到 Git LFS 或外部归档，并在 production-batches.md 登记外部位置（`PROJECT.md:160` 已允许「原始批次可登记外部位置」）。
5. **字体源**：ttf 改为 URL+sha 记录（F-7）。

## 7. 限制与未完成

- 图片未逐像素目视复核；「已检查」对二进制的含义是：PNG 头/尺寸/色型、sha256 去重、git 入库历史、消费者与报告 manifest 的对应关系已核清。报告中关于图片内容（如「唱臂已去除」）的描述未独立验证。
- `.blend` 只看了 `file` 类型与体积，未在 Blender 中打开。
- `ai/sessions/活物件-唱片机-生成优先分层管线.md` 提到 `arts/`，按规则只列路径未读正文，其内容可能包含对 generated 目录的额外约定。
- `.claude/`、`.agents/` 未读；`codex-visual/20260906-054721Z/codex-report.md:50`、`handoff-context-for-codex.md:18` 提到其中文件，只作引用记录。
- Windows 脚本（.ps1）与 Python 脚本未运行（依赖仓外临时目录与 D:\ 路径），可运行性判断基于静态阅读。
- node_modules 未安装，`scripts/pack-*.mjs` 未运行；其输入/输出关系基于源码阅读与 pack-results.json 对照。
- 覆盖 CSV 按 inventory 184 条输出；磁盘上多出的 .pyc 已在 F-9/F-10 说明，未计入 CSV。
