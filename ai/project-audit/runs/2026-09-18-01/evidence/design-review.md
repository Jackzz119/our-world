# 01-S06 · design 分区审阅（ai/design_system/）

> 审阅对象：`ai/design_system/` 下全部 246 个文件（inventory.csv 过滤，68 文本 + 178 二进制，du 212 MB）。基线 `3fd52a5`（分支 dev），审阅日 2026-09-18。`git status` 确认该目录在基线上无未提交改动，删除候选的恢复依据均为 `git checkout 3fd52a5 -- <path>`。
> 本文只读项目、不改任何项目文件；唯一写出的是本文与 `design-coverage.csv`。

## 范围与方法 {#范围与方法}

| 步骤 | 方法 | 结果 |
| --- | --- | --- |
| 路径集合 | python 过滤 inventory.csv `path.startswith('ai/design_system/')` | 246 条（text 68 / binary 178） |
| 文本全文阅读 | 68 个 .md/.html/.json/.ts 全部用 Read/cat 读完（ui-system.html 1681 行分 3 段读完；13 个 cinnaglass-history HTML 全文；runtime.json 32 KB 用 python 展开全部 records） | 全部读完，逐份写用途/权威性/日期/被谁链接 |
| 链接图 | 运行 `node scripts/check-design-system.mjs`（只读脚本、node 标准库） | `{"maintainedDocuments":9,"documents":58,"checkedLinks":374,"failures":[]}`，exit 0；说明 md 相对链接、html src/href/url()、锚点全部可达，9 份常驻 md 都从 design-system.md 可达且带图 |
| 引用面 grep | python 全仓扫描（排除 node_modules/.git/.claude/.agents/ai/sessions/ai/project-audit）所有 md/html/json/mjs/ts/tsx/css/py，对每个二进制以 `父目录/文件名` 或同目录裸文件名匹配；脚本按模板拼接的文件名单独标注 | 178 个二进制中：文档/HTML 引用 59，仅脚本模板产出 25，零引用 94（见 §零引用图片） |
| 对照源码 | character.md 数值 ↔ `src/themes/cinnaglass/room/pixi-scene.ts` L976-999；navigation-implementation.md ↔ `shell/navigation-glass.css` L1-65；turn-implementation.md ↔ `journal-turn.ts` L18 / `journal-turn-controller.ts` L70-121；book-implementation.md ↔ `journal-room.css`；scene.md 原画尺寸 ↔ `sips`；recipes.json sourceSha256 ↔ `shasum pixi-scene.ts` | 见 §陈旧陈述，绝大多数数值一致 |
| 路径存在性 | 对文档中出现的 90+ 个仓库路径逐个 `test -e` | 3 个缺失，均出自历史文档 ux-decisions.md 的反引号路径（`ai/Features/ui-system.md`、`ai/Features/channel.md`、`ai/Features/settings.md`） |
| 元数据 | `sips` 尺寸、`stat` 字节、inventory sha256、`du -sh`、`git log --diff-filter=A/-1` 加入与最后修改日期 | 记录在各目录表 |
| 受保护范围 | `.claude/`、`.agents/`、`CLAUDE.md`、`AGENTS.md` 未读；本分区文档提到它们时只引用其存在 | — |

体积分布（du -sh）：uiux 192M（cinnaglass 107M：journal-room-object 99M，其中 turn-verification 63M / book-verification 18M / navigation-verification 15M；ui-unification 7.9M；uiux/research 84M：_shots 26M、journal-book-directions 24M、mood-progression-codex 11M、navigation-concepts 8.4M、ui-concepts 8.4M、timeline-night-glass 6.1M）、concept 18M、research 2.0M。

## 逐文件 / 逐目录判定

权威性分级：**当前规范**（常驻 Markdown，design-system.md 可达）/ **实现记录**（某轮实装报告，事实随代码变化）/ **研究** / **历史归档**（已作废方案，仅供追溯）/ **验证证据**（脚本产出并被文档引用）/ **一次性输出**（脚本产出但无文档引用）/ **生成 prompt 原件**。

### 顶层常驻文档 {#顶层常驻文档}

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 生命周期判定 |
| --- | --- | --- | --- | --- | --- |
| README.md | 目录组织说明，不复制风格 | 人；PROJECT.md L178、STYLE.md | 当前规范（目录说明） | 被 concept/README、decisions U-06、STYLE.md 链接；提及 `scripts/check-design-system.mjs`（存在） | 保留 |
| design-system.md | 设计系统总入口：风格表、6 领域入口表、实际素材位置表、边界 | PROJECT.md L4/176、TODO.md L5、STYLE.md、所有子文档 | 当前规范（2026-09-13） | check-design-system 以它为根；素材位置表 12 个路径逐一 `test -e` 均存在；首图 `ui-unification/audit-2026-09-11/twilight-scene.png` 存在 | 保留 |
| character.md | 角色形体/素材/呼吸摆动眨眼参数 | design-system.md、TODO.md L63 | 当前规范 + 实现记录 | 四张立绘路径存在；数值与 pixi-scene.ts L979-981（3.6s、0.016、0.003、7.4s、0.009）、L993（140ms）、L989（2400–6500ms）、L994（15% 二次眨眼）完全一致；引用 `concept/.../05-character-action-atlas.png` 存在 | 保留 |
| scene.md | 书房三时辰、构图、行为、房间选择器缩略图 | design-system.md、PROJECT.md L48 | 当前规范 | 三张原画 sips 1586×992 与文中一致；gameroom/garden thumb 存在；generated/、parts 目录存在 | 保留 |
| props.md | 物件外观/热点/唱片机分层/日记 GIF | design-system.md、uiux.md | 当前规范 | 热点 5 个 ID 与 study-room.ts L55-59（timeline/photos/clock/music/wishlist）一致；platter-golden.png、tonearm.png、build-turntable-parts.py、live-single.gif 存在；锚点 `ui-system.md#c-专属物件-ui` 有效 | 保留 |
| effects.md | 环境效果表（时辰底图/wash/glow/雨/角色 tint/UI 反馈）与待定 | design-system.md | 当前规范 | 首图 gradient-textures.png、index.html、art-relighting.md 存在 | 保留 |

### concept/ {#concept}

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 判定 |
| --- | --- | --- | --- | --- | --- |
| concept/README.md | 概念档案索引（5 行表） | design-system.md、scene.md、uiux.md、research/README | 当前规范（索引） | 链接目标全部存在 | 保留 |
| concept/baselines/companionship-room/codex-report.md | 2026-08-09 六张概念原报告，顶部有 2026-09-12 归档说明 | concept/README | 历史归档（当时定稿，非今日批准） | 引用 `ai/STYLE.md`（存在，已是 3 行跳转页） | 保留 |
| concept/baselines/companionship-room/01–06 .png ×6 | 六张 1586×992/1536×1024 概念图 | 01/04/06 仅本目录 codex-report；02 被 ui-system.html 两处 CSS url()、journal-book-directions/prompts.md、timeline-night-glass/prompt.md 引用；03/05 被 concept/README、character.md 引用 | 历史归档（概念基线） | sha256 与 `codex-visual/20260809-101107Z/*.png` 逐一相同；ai/reboot/concept-art.md 只指向 codex-visual 副本 | 见发现 F-01 |
| concept/proposals/living-props/anim-scene-map.png | 活物分解构想总图 1586×992 | concept/README | 研究 | sha 同 `codex-visual/20260823-054106Z/anim-scene-map.png` | 见 F-01 |
| concept/proposals/living-props/anim-exploded-jar.png / anim-exploded-turntable.png | 罐/唱片机分层手稿 1024×768 | **零引用**（living-props.md 只写目录名 `../concept/proposals/living-props`，未指向单文件） | 研究 | sha 同 codex-visual/20260823-054106Z | 见 F-01、D-01 |

### research/ {#research}

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 判定 |
| --- | --- | --- | --- | --- | --- |
| research/README.md | 美术研究索引 | design-system.md | 当前规范（索引） | 5 个链接目标存在 | 保留 |
| research/art-relighting.md | 2026-09-12 原画分层/光层事实、技能职责、两条路线 | research/README、effects.md、ui-system.html L1323、PROJECT.md L161、ui-system.md(Features) L54 | 研究 + 实现记录 | 见 §陈旧陈述 S-01（`lighting-layers/recipes.json` 路径不存在）、S-02（Windows 本机 skill 路径） | 保留，需修两处路径 |
| research/living-props.md | 2026-08-22 活物调研定稿 | research/README、props.md、TODO.md L77 | 研究（已部分实现） | 引用 `pixi-scene.ts circleFromBase()`；mockup 目录存在 | 保留 |
| research/production-batches.md | 13 个 codex-visual 批次索引 | research/README、uiux/research/production-batches.md | 索引 | 13 条链接目标存在；与 uiux 侧 5 条合计 18 = codex-visual 实际目录数 | 保留（与 uiux 侧互补，非重复，见 F-06） |
| research/visual-principles-2026-09-12.md | 主美视觉准则调研 3 条 | research/README、uiux/research/interaction-principles | 研究 | 引用 `../../STYLE.md` 存在但只剩跳转页（见 S-03） | 保留 |

### research/art-relighting-preview/ {#art-relighting-preview}

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 判定 |
| --- | --- | --- | --- | --- | --- |
| index.html | 三张原画 + 晴/雨 wash/glow 纹理的可切换预览；Canvas 现场生成纹理并提供下载 | effects.md、research/README、art-relighting.md、ui-system.html L1323 | 研究预览（代码快照 2026-09-12） | `fetch('./recipes.json')`；原画用绝对路径 `/arts/rooms/study/source/*.png`——只能经 Vite dev server（项目根）打开，双击文件会丢图；check-design-system 对以 `/` 开头路径按仓库根解析故通过 | 保留；打开方式需在文档注明（F-08） |
| recipes.json | 6 组配方 + 源文件 sha256 | index.html | 验证证据 | `sourceSha256` 与当前 `pixi-scene.ts` shasum 完全一致（1458a436…），快照仍有效 | 保留 |
| gradient-textures.png | 12 张纹理静态对照 1320×1157 | effects.md 首图、art-relighting.md | 研究图 | 有引用 | 保留 |
| rain-layer-strength.png | 1320×1157 雨层强度对照 | **零引用** | 一次性输出 | 全仓无任何文本提及 | D-02 |
| {golden,twilight,night}-{sun,rain}-{wash,glow}.png ×12 | 64×64 / 256×256 透明纹理导出（5–95 KB） | **零引用**；index.html 用 Canvas 现场生成同参数纹理并 `toDataURL` 下载，不读这 12 个文件 | 一次性输出（可由 index.html 一键再生成） | 全仓无提及 | D-02 |

### uiux/ 顶层 {#uiux-顶层}

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 判定 |
| --- | --- | --- | --- | --- | --- |
| uiux/README.md | 目录说明 | — | 目录说明 | 描述与实际文件一致 | 保留 |
| uiux/uiux.md | 全项目 UI 登记表（A/B/C）、使用模型、边界 | design-system.md、character/props/effects、PROJECT.md L183 | 当前规范（2026-09-13） | 链接 Features/navigation-glass.md、ui-system/audit.md、ui-system.md、timeline.md 均存在；首图 widgets-twilight.png 存在 | 保留 |
| uiux/interaction.md | 交互体系基准（三类载体、入口地图、历史动效表、音效、反模式、分期） | uiux.md、scene.md、ui-system.md、PROJECT.md L183 | 当前规范 + 历史提案分节标注 | §6 明确标为历史后置；§1 指向 navigation-concepts 目录存在；`ui-system.md#6-实施顺序与闸门` 锚点存在 | 保留 |

### uiux/cinnaglass/ 主题 {#cinnaglass-主题}

| 路径 | 用途 | 使用者 | 权威性 | 引用证据 | 判定 |
| --- | --- | --- | --- | --- | --- |
| cinnaglass/README.md | 目录说明 | — | 目录说明 | 与实际一致 | 保留 |
| cinnaglass/decisions.md | U-01～U-06 当前 UI 决定 | design-system.md、uiux.md、ui-system.md、ux-decisions.md、13 个历史 HTML 顶部横幅 | 当前规范（2026-09-12） | `PROJECT.md#美术与-uiux-技能登记` 对应 L154 标题存在 | 保留 |
| cinnaglass/ui-system.md | 主题常驻规范 A/B/C + 边缘页面 | design-system.md、uiux.md、props.md、effects.md、PROJECT.md L55 | 当前规范（2026-09-13），自称"主题常驻规范" | 10 个源码/资源链接均存在 | 保留 |
| cinnaglass/ui-system.html | 91 KB 组件/参数预览：实时 `<link>` 5 个产品 CSS；6 节；⑤ 组件库含 2026-09-11 审计、日记/导航登记、历史 B/夜灯/白纸三段 | uiux/README、ui-system.md、check-navigation/check-journal-art/check-journal-turn 三个脚本用它做"文档能加载"断言（`#navigation-glass`、`#journal-static-art`、`#journal-turn`） | 组件预览（自称"UI Design System"，ui-system.md 自称真源；README 亦规定 Markdown 为持续维护来源） | 全部本地 href/src/url() 经 check-design-system 校验存在；TODO.md L157 仍称它为"真源" | 保留；组件表有 4 条陈旧（S-05～S-08），与 md 分工见 F-05 |

### uiux/cinnaglass/journal-room-object/ 文档 {#journal-room-object-文档}

目录 git 加入 2026-09-11（commit 5b96700），最后整理 2026-09-13。

| 路径 | 用途 | 使用者 | 权威性 | 判定 |
| --- | --- | --- | --- | --- |
| codex-report.md | 2026-09-06 提案 + 09-07 状态更新 | ui-system.html #journal-room-object | 实现记录/提案（顶部已标状态） | 保留 |
| prompts.md | 设计板生成 prompt | ui-system.html、codex-report | 生成 prompt 原件 | 保留 |
| room-journal-concept.png | 1536×1024 批准设计板 | Features/navigation-glass.md、Features/timeline.md、arts/ui/journal/manifest.json、arts/ui/navigation/manifest.json、4 个脚本、本目录 4 份 md、ui-system.html | 批准参考（当前有效） | 保留 |
| book-prompts.md | 空白书/羽毛笔/失败重试 prompt | book-implementation、ui-system.html | 生成 prompt 原件 | 保留 |
| book-implementation.md | 2026-09-07 静态书本实装与验证 | ui-system.html、Features/timeline.md L25 | 实现记录 | 保留；末段"雨持续播放仍是待办"已被 turn-implementation 覆盖并在顶部注明 |
| navigation-implementation.md | 导航实装与验证 | ui-system.html、Features/navigation-glass.md L24 | 实现记录 | 数值与 navigation-glass.css 一致（74×384/25/38/2.4px/0.7/三档 tint+alpha/frost 0.34、0.36） | 保留 |
| navigation-texture-prompt.md | 细纹纹理 prompt 与处理方式 | navigation-implementation、ui-system.html | 生成 prompt 原件 | 保留 |
| turn-implementation.md | 竖直翻页实装 | ui-system.html、interaction.md §6、Features/timeline.md L11 | 实现记录 | 24 条/980/470/38%/3 张与 journal-turn.ts L18、controller L70-121 一致 | 保留 |
| turn-prototype.html / turn-prototype.ts | 独立运动样板（需 Vite 根：`/src/...css`、`/rooms/study/night.png`、`/ui/journal/*.webp`） | ui-system.html #journal-turn、scripts/render-journal-turn.mjs L16 | 验证工具 | ts 从 `/src/themes/cinnaglass/journal-layout.ts`、`journal-turn.ts` 导入并读取 `./book-verification/reference-photo.png` | 保留（render-journal-turn 仍需要） |

### book-verification/（18 文件，18M，check-journal-art.mjs + compare-journal-art.mjs 产出） {#book-verification}

| 文件 | 生成方 | 引用者 | 判定 |
| --- | --- | --- | --- |
| design-content-night.png | check-journal-art L145 | ui-system.md C 节首图、ui-system.html #journal-static-art、book-implementation、脚本断言 | 验证证据（正式） |
| design-content-golden/twilight.png | 同上 | ui-system.html L1358 链接 | 验证证据 |
| book-comparison.png、alpha-review.png、pixel-samples.json | compare-journal-art | book-implementation §4、ui-system.html | 验证证据 |
| real-memories.png、results.json | check-journal-art | book-implementation、ui-system.html | 验证证据 |
| reference-photo.png | check-journal-art L18（从设计板裁出） | turn-prototype.ts、check-journal-turn.mjs L73 | 验证输入（仍被消费） |
| book-night.png | check-journal-art L148 | 仅 compare-journal-art L36 读取以合成 book-comparison | 中间件 |
| book-golden.png、book-twilight.png | check-journal-art L148 | **零引用** | 一次性输出 |
| real-1440/960/640/390.png、first-real.png | check-journal-art L62；first-real 无脚本对应 | **零引用**（文中"实测尺寸"表用 results.json 数据，不链图） | 一次性输出（first-real 为首次实景快照，文中提到但未链接） |
| design-system.png | check-journal-art L240（文档页截图） | 仅脚本 | 一次性输出 |
| failure.png | check-journal-art L249 失败路径 | 仅脚本 | 失败残留 |

### navigation-verification/（35 文件，15M，check-navigation.mjs 产出） {#navigation-verification}

| 文件 | 引用者 | 判定 |
| --- | --- | --- |
| comparison.png | ui-system.md A 节首图、ui-system.html #navigation-glass、navigation-implementation §1、脚本断言 | 验证证据（正式） |
| results.json | navigation-implementation §4 | 验证证据 |
| reference-nav.png | navigation-texture-prompt.md（参考图）、脚本 L246 | 验证输入 |
| night/golden/twilight-hover.png | 脚本 L247 作为 comparison 的拼图输入 | 中间件 |
| {night,golden,twilight}-{idle,pressed,focus,menu,scene}.png ×15、viewport-960/640/390.png、touch-pressed/touch-tools.png、no-texture.png、underlay.png | 文中以文字描述"均截图"，未链接任一文件 | 一次性输出（20 个） |
| touch-diagnostic.png | 无脚本对应、无引用 | 一次性输出 |
| design-system.png、failure.png | 文档页截图 / 失败残留 | 一次性输出 |

### turn-verification/（38 文件，63M，render-journal-turn.mjs + check-journal-turn.mjs 产出） {#turn-verification}

| 文件 | 引用者 | 判定 |
| --- | --- | --- |
| live-single.gif（1.9M）、live-continuous.gif（2.6M） | props.md、ui-system.md、ui-system.html、turn-implementation、Features/timeline.md、脚本断言 | 验证证据（正式，设计系统自述的当前动态示例） |
| turn-single.gif（2.3M）、turn-continuous.gif（4.4M）、turn-back.gif（2.3M） | turn-implementation §1 | 验证证据（样板） |
| runtime-results.json | ui-system.html、turn-implementation §5 | 验证证据 |
| prototype-results.json（32 B `{"pages":8,"errors":[]}`） | 无引用 | 一次性输出 |
| frame-0/25/50/75/100、sequence-0/25/50/75/100、back-0/25/50/75/100 .png ×15 | render-journal-turn L33 写出（GIF 的选帧） | 一次性输出；其中 **back-0 ≡ frame-100、back-100 ≡ frame-0、frame-25 ≡ seam-check**（sha 相同） |
| seam-check.png | 无脚本对应、无引用；与 frame-25 同 sha | 精确重复 |
| live-single-0/7/13/19/28、live-continuous-0/7/13/19/28 .png ×10 | check-journal-turn L350 选帧 | 一次性输出；**live-continuous-0 ≡ live-single-0** |
| runtime-flat/upright/destination/mobile-upright.png | check-journal-turn 断言截图 | 一次性输出（文中未链接） |
| runtime-failure.png | 失败路径 | 失败残留 |
| design-system-turn.png | 文档页截图 | 一次性输出 |

### ui-unification/audit-2026-09-11/（7 文件，7.9M） {#ui-unification}

全部被引用：runtime.json ← Features/ui-system/audit.md L99、ui-system.html；6 张 png ← audit.md L103-106、ui-system.html、design-system.md 首图（twilight-scene）、uiux.md 首图（widgets-twilight）、ui-system.md（widgets/settings）。runtime.json 全文读完：7 个 state（night/golden/twilight/twilight-rain/widgets-twilight/settings-twilight/mobile-390）逐组件 rect/backdrop/背景，另有 `hiddenModalButtonCount:37`、隐藏弹窗可获焦探针；数据与 audit.md 的结论一致。判定：验证证据（正式），保留。

### uiux/research/ 顶层 {#uiux-research}

| 路径 | 用途 | 权威性 | 判定 |
| --- | --- | --- | --- |
| research/README.md | UI 研究索引 3 条 | 索引 | 保留 |
| interaction-principles-2026-09-12.md | WCAG/APG/XAG 三条准则表 | 研究 | 保留（与 research/visual-principles 互链、内容不重叠：一个讲指针目标/模态焦点/对比度，一个讲轮廓可读/动态干扰/画风方法） |
| production-batches.md | 5 个 UI 批次索引 | 索引 | 保留（与 research 侧互补） |

### cinnaglass-history/ HTML 与 md（14 文件） {#cinnaglass-history-html}

全部 13 个 HTML 顶部都插有 `<aside data-design-status="historical">` 历史横幅并链回 decisions.md；均已全文读完。

| 文件 | 内容 | 依赖 | 判定 |
| --- | --- | --- | --- |
| README.md | 历史入口表 | — | 保留 |
| ux-decisions.md | D-1～D-12 原记录（顶部 2026-09-12 归档说明） | 反引号路径 `ai/Features/ui-system.md`、`channel.md`、`settings.md` 不存在（S-09）；章节顺序 D-10→D-12→D-11（F-10） | 保留 |
| color-palette.html / immersion-palette.html / texture-palette.html | D-9/D-11/D-10 比稿，自含 CSS，无外部资源 | 无 | 历史归档 |
| mood-progression.html | D-12 三档 token 比稿，自含 | 无 | 历史归档 |
| impl-three-up.html | D-12 验证页，`<link>` 真实 `cinnaglass.css`（相对路径存在） | 用 `--stage-chrome-dim`、`--rail-candy-border` 等旧 token | 历史归档（ui-system.html ⑥ 维护规则仍推荐它做对比度验证，见 S-10） |
| composer-compact.html / composer-redesign.html / timeline-mascot-multiimg.html / personal-island.html | 2026-07 比稿；页脚写 `ai/design_system/uiux/cinnaglass/ · xxx.html`，为迁移前旧路径（S-11） | 无 | 历史归档 |
| chat-message-states.html / emoji-picker.html / friends-page.html / home-panel-friends.html / timeline-redesign.html | 2026-07 比稿，自含 | Features/timeline.md L367-388 仍链接其中 3 份作历史依据 | 历史归档 |
| diary-surface-v2.html | 2026-09-06 v2 比稿：`<link>` 真实 cinnaglass.css，`<img>` 真实 `public/rooms/study/night.png`、`golden.png`、两张角色立绘（相对路径存在）；注释引用 `_shots/diary-v2-d-1440.png` 与 `codex-visual/20260905-215344Z/decisions-v2.md`（存在） | 是 _shots/diary-v2-* 的唯一文字关联 | 历史归档 |

### cinnaglass-history/_shots/（28 文件，26M） {#cinnaglass-history-shots}

README 定性："历史样板/实装检查截图；文件名和来源保留，不作为今天的运行证据"。没有任何 scripts/ 写入此目录（grep 无命中）。逐文件引用面：

| 文件 | 尺寸/大小 | 引用 | 判定 |
| --- | --- | --- | --- |
| diary-v2-d-1440.png | 1440×900 | diary-surface-v2.html L104 注释 | 历史证据（有引用） |
| shell-c-impl-v3.png | 1600×1000 | `codex-visual/20260811-055917Z/codex-report.md` L7/L27，但写的是旧路径 `ai/design_system/cinnaglass/_shots/`（S-12，跨分区） | 历史证据（引用路径已断） |
| current-system.png、progression.png | 1400×1500 / 1400×1560 | mood-progression-codex/codex-report.md §2 以裸文件名列为输入参考 | 历史证据（间接引用） |
| world-pixi-room.png | 1600×1000 | navigation-concepts/codex-report.md §2 以旧 Windows 路径 `D:\Repo\...\ai\design_system\cinnaglass\_shots\` 列为输入 | 历史证据（间接引用） |
| diary-v2-a-1440/960/640、diary-v2-b-1440、diary-v2-c-1440 | 1440×900 等 | 零引用（README 只笼统提 _shots） | 一次性输出 |
| impl-three-up.png / -v2 / -v3、impl-ui-system.png、uisys-check.png | 1400×520 ×3、1400×1600、1200×1000 | 零引用（ux-decisions D-12 提到 impl-three-up.html 验证方法，不指向截图） | 一次性输出 |
| scene-lab-first/golden-sun/night-rain.png | 1600×1000 ×3（约 2M 各） | 零引用 | 一次性输出 |
| shell-c-1to1、shell-c-impl、shell-c-impl-v2、shell-c-noborder、shell-c-noframe.png | 1600×1000 ×5（约 2.1M 各） | 零引用 | 一次性输出 |
| sparkle-live.png、glow-hover-live.jpg（187×244）、hint-live.jpg、outline-check.jpg、outline-check2.jpg | 星星/描边/金光旧提示路线截图；后三张同为 1623×1157、同为 89982 字节但 sha 不同 | 零引用；对应路线已在 props.md/interaction.md 明文否决 | 一次性输出 |

### journal-book-directions/（21 文件，24M） {#journal-book-directions}

| 文件 | 引用 | 判定 |
| --- | --- | --- |
| codex-report.md、prompts.md、implementation.md | ui-system.html #journal-book-proposal、Features/timeline.md L31/L39、README | 历史归档（顶部均标"已否决"） |
| direction-a/b/c.png（1586×992） | ui-system.html、codex-report、prompts；b 另被 journal-room-object/prompts.md 作参考 | 历史归档（有引用） |
| verification/results.json | implementation §4 | 验证证据 |
| verification/first-spread.png | ui-system.html L1411、implementation §1 | 验证证据 |
| verification/golden-1440、night-1440、night-640、night-960、twilight-1440.png | **仅**被 timeline-night-glass/implementation.md 以同名相对链接命中（该文实际指向自己目录下同名文件，属我匹配器的同名误报；本目录这 5 张无真实引用） | 一次性输出 |
| verification/night-390、single-turn、corner-drag、photos、settings、navigation-tools、room-closed.png | 仅 check-journal.mjs 模板产出，无文档链接 | 一次性输出 |
| verification/failure.png | 失败残留 | 一次性输出 |

### mood-progression-codex/（7 文件，11M） {#mood-progression-codex}

codex-report.md（D-12 设计报告，含 token 表）+ 3 张 1440×900 定稿 + 3 张 1586×992 master；全部被本目录 codex-report §9 manifest 与 ux-decisions D-12 引用。判定：历史归档（旧 `--shell` 体系已被导航独立配方取代，README 明示"不据此重刷"）。无重复。

### navigation-concepts/ 与 ui-concepts/（8 文件，8.4M×2） {#navigation-concepts-与-ui-concepts}

两目录 4 文件（codex-report.md + 3 张 png）sha256 逐一相同，且均等于 `codex-visual/20260810-060422Z/`。引用面：interaction.md §1 与 §10 两处、README 表都指向 **navigation-concepts/**；`ui-concepts/` 除自身 README 行外无任何引用。见 F-02、D-03。

### timeline-night-glass/（10 文件，6.1M） {#timeline-night-glass}

codex-report.md / implementation.md / prompt.md 被 ui-system.html 历史段与 Features/timeline.md L253 引用；night-memory-concept.png 被 ui-system.html、timeline.md 引用；verification/results.json 与 6 张截图全部被 implementation.md §验证 逐个链接。判定：历史归档 + 验证证据，无零引用。implementation.md 称"总览 ui-system.html 直接引用它（diary.css）"——ui-system.html L10 确实仍 `<link>` diary.css（见 S-06）。

## 零引用图片汇总 {#零引用图片}

| 目录 | 零引用数 / 总图 | 体积估算 | 性质 |
| --- | --- | --- | --- |
| research/art-relighting-preview | 13 / 15 | 约 1.2 MB | 12 张可再生成纹理 + 1 张对照图 |
| journal-room-object/book-verification | 8 / 16 | 约 8.9 MB | 中间截图、失败残留、文档页截图 |
| journal-room-object/navigation-verification | 23 / 32 | 约 11 MB | 15 张状态图 + 3 视口 + 触屏 + 文档页 + 失败 |
| journal-room-object/turn-verification | 32 / 36 | 约 55 MB | 25 张选帧 png + 4 张 runtime + seam/failure/docs |
| uiux/research/cinnaglass-history/_shots | 23 / 28 | 约 23 MB | 旧样板/实装检查截图 |
| journal-book-directions/verification | 13 / 15 | 约 13.5 MB | 已否决方案的回归截图 |
| concept/proposals/living-props | 2 / 3 | 3.1 MB | 分解手稿（目录被引用，单文件无链接） |
| 合计 | 114 / 178（其中 94 全仓零命中，20 仅脚本模板可产出） | 约 116 MB | — |

被文档明确链接的"正式验收证据"只有：design-content-*（3）、book-comparison、alpha-review、real-memories、reference-photo、comparison、reference-nav、live-single/continuous.gif、turn-*.gif（3）、runtime-results.json、results.json ×4、pixel-samples.json、first-spread、night-memory-concept、timeline-night-glass/verification 6 张、audit-2026-09-11 全部 7 个。

## 发现 {#发现}

**F-01 概念图三处精确重复（concept ↔ codex-visual）** — 证据：inventory sha256 分组，`concept/baselines/companionship-room/*.png` ×6 = `codex-visual/20260809-101107Z/`；`concept/proposals/living-props/*.png` ×3 = `codex-visual/20260823-054106Z/`；合计 18 MB 双份。谁引用哪一份：设计系统内 12 处引用全部指向 concept 副本（character.md、concept/README、ui-system.html ×2、两份 prompts.md）；`ai/reboot/concept-art.md` 与两份 codex-report 指向 codex-visual 副本；research/production-batches.md 明文"正式副本在本域 baselines"。建议：concept 副本是设计系统自述的正式副本，可保留；codex-visual 原件属批次归档（另一分区），若要只留一份应删 codex-visual 侧并改 ai/reboot/concept-art.md 的 4 行链接——**跨分区，需用户决定**。living-props 两张 exploded 图无单文件链接，建议在 living-props.md 或 concept/README 补链接（D-01 二选一）。

**F-02 navigation-concepts/ 与 ui-concepts/ 完全相同** — 证据：4 文件 sha256 相同（含 11803 B 的 codex-report.md），且等于 codex-visual/20260810-060422Z；所有引用（interaction.md §1、§10，README 表）指向 navigation-concepts，`ui-concepts/` 无引用。建议：删除 `ui-concepts/` 整目录（8.4 MB），README 表中"`navigation-concepts/`、`ui-concepts/`"改为只列前者。低风险，可直接执行（D-03）。

**F-03 turn-verification 内 4 组精确重复** — 证据：back-0=frame-100、back-100=frame-0（正反向首末帧本来就是同一画面）、frame-25=seam-check（seam-check 是 frame-25 的复制件）、live-continuous-0=live-single-0（两段录像起点相同）。均无文档引用；render-journal-turn 每次运行会重新生成 frame/back/sequence 帧。建议：seam-check.png 直接删；其余 3 组与 25 张选帧一起归入 D-04。

**F-04 turn-verification 63 MB 中 55 MB 是无引用选帧** — 证据：25 张 `frame/sequence/back-*.png` + 10 张 `live-*-N.png` 全仓无文本引用，且都是脚本一条命令可再生的中间帧；正式动态证据是 5 个 GIF。建议：删除 35 张 png（约 58 MB），保留 GIF、runtime-results.json。若想保留"慢放中间帧"证据，只需在 turn-implementation.md 链 3 张（25/50/75）。需用户决定（D-04）。

**F-05 ui-system.md 与 ui-system.html 分工** — 证据：ui-system.md L5 自称"主题常驻规范"，HTML 为"组件/参数预览"；README L25、design-system.md L63 规定 Markdown 是持续维护来源、HTML 按需从 md 生成。但 HTML 仍是唯一实时读取 5 个产品 CSS 的地方，3 个验证脚本依赖其锚点存在；TODO.md L157 仍称 HTML 为"真源"。当前 HTML ⑤ 组件表有 4 条已被产品推翻（S-05～S-08）。建议：保留 HTML 作为"活参数预览 + 脚本挂载点"，但把 ⑤ 表的日记两行改成指向 md，并把 TODO.md L157 的"真源"改写；不建议删 HTML。

**F-06 两份 production-batches.md、两份 README、两份 *-principles 不构成重复** — 证据：research/production-batches 13 条 + uiux/research/production-batches 5 条 = 18，恰好覆盖 codex-visual 全部 18 目录，且互相链接；两份 README 分别是 research/ 与 uiux/research/ 的索引，条目不重叠；两份 principles 主题不同且互链。判定：目录设计如此（decisions U-06：uiux 管 UI 研究、concept/research 管非 UI），无需合并。

**F-07 验证脚本产出与"验收证据"边界模糊** — 证据：6 个 scripts/check-*.mjs、render-journal-turn.mjs 直接把全部截图写进设计系统目录（路径硬编码在脚本 L9-L14），每次重跑都会覆盖/追加；文档只链接其中约 1/3。README L23 自称"阶段收尾清理过期附属资料与临时文件"，但脚本没有区分"文档引用的证据"与"回归中间件"的输出目录。建议：不改脚本行为的前提下，先按 D-02/D-04/D-05/D-06 清理零引用文件；长期可把脚本输出目录改到 `scripts/.out/`（非本步范围）。

**F-08 两个 HTML 依赖 Vite 根路径** — 证据：art-relighting-preview/index.html 用 `/arts/rooms/study/${mood}.png`；turn-prototype.html 用 `/src/...css`、`/rooms/study/night.png`、`/ui/journal/*.webp`、`<script type="module" src="./turn-prototype.ts">`。直接双击打开会缺图/脚本失败；文档只写"可随时查看"。建议：在 research/README 或 art-relighting.md 补一句"需 `pnpm dev` 后经 `http://localhost:5175/ai/design_system/...` 打开"（render-journal-turn.mjs L16 已用此 URL）。

**F-09 art-relighting-preview 的 12 张纹理 png 是可再生成物** — 证据：index.html L239-258 的 `linearTexture/radialTexture` 用 recipes.json 同参数现场生成并提供下载，与 12 个文件同名；art-relighting.md L77 亦称"12 张纹理与当前源码函数生成结果逐像素一致"。建议：删除 12 张 + rain-layer-strength.png（D-02），保留 gradient-textures.png。

**F-10 ux-decisions.md 章节顺序 D-10 → D-12 → D-11** — 证据：L117/L128/L154 标题顺序；D-12 正文首句"推翻 D-11"，读者需先看后文。属历史归档组织问题，可在文首加一句阅读顺序说明或调换两节顺序（不改内容）。低优先。

**F-11 三份 verification 中的 `failure.png` / `runtime-failure.png` 是失败运行残留** — 证据：check-journal-art L249、check-navigation L266、check-journal L238、check-journal-turn L390 只在 catch 分支写出；四个文件存在说明历史上曾失败过，后续成功运行不会删除它们；无任何引用。建议删除（D-06）。

**F-12 concept 图被 ui-system.html 用作装饰背景** — 证据：ui-system.html L573、L717 两处 `url('../../concept/baselines/companionship-room/02-main-night-rain.png')` 给"已否决白纸方案"预览做底图，这是 02 图除 codex-report 外的主要引用。若日后清理 concept 副本，需同步改这两行；本轮不动。

## 陈旧陈述清单 {#陈旧陈述}

| # | 路径:行 | 陈述 | 实际 |
| --- | --- | --- | --- |
| S-01 | research/art-relighting.md:46 | "`lighting-layers/recipes.json` 记录源文件与 SHA-256" | 仓库内不存在 `lighting-layers/` 目录；文件实际在 `research/art-relighting-preview/recipes.json`（其 sha 与当前 pixi-scene.ts 仍一致） |
| S-02 | research/art-relighting.md:15 | "本机 Codex 入口：`C:/Users/Jackzz/.codex/skills/art-relighting/SKILL.md`" | Windows 单机绝对路径，本仓库（macOS 检出）不可达；文中已注明"其他环境需读取其实际可用的 skill"，但作为常驻研究文档应改成相对描述 |
| S-03 | research/visual-principles-2026-09-12.md:3；research/production-batches.md:3；concept/.../codex-report.md:3 | "具体艺术签名沿用 [STYLE](../../STYLE.md)" / "以概念地图和 STYLE 为准" / "现行约束见 … `ai/STYLE.md`" | `ai/STYLE.md` 已于 2026-09-13 缩为 3 行跳转页，正文在 design-system.md；链接可达但语义过时 |
| S-04 | uiux/interaction.md:26 | "棕皮旧纸双页日记；窄屏单页（STYLE §8）" | STYLE.md 已无 §8；应指向 ui-system.md C 节或 turn-implementation.md |
| S-05 | uiux/cinnaglass/ui-system.html:1530-1535 | 组件表"我们的日记 · DIARY：灰苔软封 + 暖灰双页 + 羽毛笔 + 细线装。1440×900 为 760×430px，960×700 为 560×315px" | 当前产品为棕皮旧纸 1040×670 居中（book-verification/results.json、journal-room.css `--book-width: min(1040px…)`）；760×430 是已否决的 B 实装 |
| S-06 | uiux/cinnaglass/ui-system.html:1447 | "当前 diary.css 已用于 B，不再拿活变量冒充历史色块" | B 已被否决；当前日记样式真源是 journal-room.css / journal-turn.css，diary.css 只作旧实现保留（book-implementation.md L27）。HTML L10 仍 `<link>` diary.css |
| S-07 | uiux/cinnaglass/ui-system.html:1512-1517 | "物件功能页 · PAPER：日记本/相框/许愿罐 … 统一暖灰纸材质" | 日记已改棕皮旧纸（C 类专属），相框/心愿仍暖灰纸待 B 类统一（props.md、uiux.md）；"统一暖灰纸"不再成立 |
| S-08 | uiux/cinnaglass/ui-system.html:1537-1542 | "回忆条目 … 正文保持 16px/1.75" | 当前正文 17px / 行距 1.65（journal-room.css L81/L194；book-implementation.md L35） |
| S-09 | uiux/research/cinnaglass-history/ux-decisions.md:9,24,37 | 反引号路径 `ai/Features/ui-system.md`、`ai/Features/channel.md`、`ai/Features/settings.md` | 三个文件均不存在；ui-system 已移到 `ai/Features/ui-system/ui-system.md`，channel/settings 文档无对应文件（历史文档，标注即可） |
| S-10 | uiux/cinnaglass/ui-system.html:1646 | 维护规则 6："验证页 `impl-three-up.html` 直接引用真实 CSS … 用 headless Chrome 出图后按像素采样算对比度" | 该页现位于 `../research/cinnaglass-history/`，且渲染的是旧 `.glass`/`--shell-*` 体系；当前导航采用独立 `--nav-*`，此页已不能验证现行 A 类材质 |
| S-11 | composer-compact.html:153、composer-redesign.html:195、timeline-mascot-multiimg.html:200、personal-island.html:152 | 页脚 "ai/design_system/uiux/cinnaglass/ · xxx.html" | 文件已在 2026-09-12 迁到 `uiux/research/cinnaglass-history/`；页脚仍写旧目录 |
| S-12 | （跨分区）codex-visual/20260811-055917Z/codex-report.md:7,27 | 对照图 `ai/design_system/cinnaglass/_shots/shell-c-impl-v3.png` | 实际位于 `ai/design_system/uiux/research/cinnaglass-history/_shots/`；codex-visual 属其他分区，此处只登记 |
| S-13 | uiux/cinnaglass/ui-system.html:1408 | figcaption "B · 苔绿手札（用户已批准；上图为概念基准）" | 所在 h3 已写"效果已被用户否决"，但 figcaption 仍单独读作"已批准"；建议改为"曾批准概念、实装已否决" |
| S-14 | uiux/cinnaglass/ui-system.html:1659-1661 | "相关比稿存档：`color-palette.html` · `texture-palette.html` · `immersion-palette.html`" 裸文件名 | 三文件在 `../research/cinnaglass-history/`；裸名易误以为同目录 |
| S-15 | uiux/cinnaglass/ui-system.html:826 | 页头 "2026-09-11 UI 统一审计与计划登记" | ⑤ 节已包含 2026-09-12 art-relighting 段落，页头日期未更新（轻微） |
| S-16 | design-system.md:3 与 ai/TODO.md:157 | design-system.md 称"此文档与链接的常驻 Markdown 是当前设计来源"；TODO.md L157 称 ui-system.html 为"真源" | 两处对"真源"归属表述不一致（TODO 属其他分区，此处登记） |

经核对**未发现**陈旧的数值：character.md 呼吸/摆动/眨眼参数、navigation-implementation.md 全部 CSS 数值、turn-implementation.md 时值与窄片数、book-implementation.md 字号/留白/校色、scene.md 原画尺寸、recipes.json sha、props.md 热点 ID、design-system.md 素材位置表 12 路径。

## 删除候选 {#删除候选}

恢复依据统一为 git 基线 `3fd52a5`（`git checkout 3fd52a5 -- <path>`）。已查引用面：设计系统内全部 md/html/json/ts、ai/Features、ai/PROJECT.md、ai/TODO.md、ai/STYLE.md、ai/reboot、codex-visual/*.md、arts/**/manifest.json、scripts/*.mjs|py（含模板拼接名）、src/**（css url()、tsx src）、public 下无引用设计系统的文件。

| # | 路径 | 理由 | 查过的引用面 | 置信度 |
| --- | --- | --- | --- | --- |
| D-01 | concept/proposals/living-props/anim-exploded-jar.png、anim-exploded-turntable.png（3.1 MB） | 与 codex-visual/20260823-054106Z 精确重复；设计系统内无单文件链接，只有 living-props.md 提目录名 | 全仓 grep 文件名零命中；sha 组 | 中（替代方案：在 concept/README 补两行链接后保留，二选一） |
| D-02 | research/art-relighting-preview/{golden,twilight,night}-{sun,rain}-{wash,glow}.png ×12 + rain-layer-strength.png（约 1.2 MB） | 12 张可由 index.html 同参数现场生成并下载；rain-layer-strength 无任何提及 | 全仓 grep 零命中；index.html 源码确认不读取这些文件 | 高 |
| D-03 | uiux/research/cinnaglass-history/ui-concepts/（4 文件 8.4 MB） | 与 navigation-concepts/ 逐文件 sha 相同；全部引用指向 navigation-concepts | grep `ui-concepts` 仅 README 一行；interaction.md 两处均为 navigation-concepts | 高（需同步改 README 表一格） |
| D-04 | journal-room-object/turn-verification/ 内 frame-*、sequence-*、back-* ×15、live-single-*/live-continuous-* ×10、seam-check.png、prototype-results.json（约 58 MB） | 脚本一条命令可再生的选帧与 32 B 结果；含 4 组 sha 重复；正式动态证据是 5 个 GIF + runtime-results.json | grep 零命中；render-journal-turn.mjs / check-journal-turn.mjs 确认为写出侧而非读取侧 | 高（若想留慢放证据，改为在 turn-implementation.md 链 3 张再删其余） |
| D-05 | navigation-verification/ 内 {night,golden,twilight}-{idle,pressed,focus,menu,scene}.png ×15、viewport-*.png ×3、touch-pressed/touch-tools/touch-diagnostic.png、no-texture.png、underlay.png、design-system.png（约 11 MB）；book-verification/ 内 book-golden/book-twilight、real-1440/960/640/390、first-real、design-system.png（约 8 MB） | 文档以文字描述"均截图/四尺寸通过"，用 results.json 承载数据，未链接这些图；check-*.mjs 重跑即再生；hover ×3 与 book-night 是 comparison 拼图输入，**不在**候选内 | grep 零命中；脚本读取侧核对 | 中（属"一次性输出"，但用户可能想保留某几张作视觉存档；建议保留每档 1 张 scene 后删余） |
| D-06 | book-verification/failure.png、navigation-verification/failure.png、turn-verification/runtime-failure.png、journal-book-directions/verification/failure.png、turn-verification/design-system-turn.png | 失败分支残留与文档页自截图，无引用，成功运行不会覆盖它们 | grep 零命中；脚本 catch 分支核对 | 高 |
| D-07 | journal-book-directions/verification/ 内 golden-1440、night-1440/960/640/390、twilight-1440、single-turn、corner-drag、photos、settings、navigation-tools、room-closed.png（约 13.5 MB） | 已否决 B 方案的回归截图；implementation.md 只链 first-spread.png 与 results.json；上层 ui-system.html 只用 first-spread | grep：同名 `night-1440.png` 命中在 timeline-night-glass/implementation.md，是指向其自身目录的相对链接，非本目录 | 中（保留 first-spread + results.json 即可满足"否决依据"） |
| D-08 | cinnaglass-history/_shots/ 内 23 张零引用截图（scene-lab ×3、shell-c ×5、impl-three-up ×3、impl-ui-system、uisys-check、diary-v2-a ×3/b/c、sparkle-live、glow-hover-live、hint-live、outline-check ×2，约 23 MB） | README 自述"不作为今天的运行证据"；无脚本写入、无文档链接；对应路线（旧 shell、描边/金光提示、v2 白纸日记）均已否决 | grep 零命中（含 codex-visual 全部 md）；5 张有间接引用者（diary-v2-d、shell-c-impl-v3、current-system、progression、world-pixi-room）**不在**候选内 | 中（历史比稿目录，用户可能想整目录留作追溯；若删，建议整目录连同 README 一行同步处理） |

不建议删除（值得反驳者复核）：`turn-prototype.html/.ts`（render-journal-turn 依赖）、`reference-photo.png`（turn-prototype.ts、check-journal-turn 读取）、`reference-nav.png`（texture prompt 参考）、`ui-system.html`（脚本锚点依赖 + 唯一活 CSS 预览）、`diary-surface-v2.html`（唯一带真实素材的 v2 比稿，Features/timeline.md 历史条目仍引用同类）、concept 六张概念图（设计系统正式副本，跨分区重复应从 codex-visual 侧讨论）。

## 限制与未完成 {#限制}

1. 二进制文件只做元数据（sips 尺寸、字节、sha256、git 日期）与消费者引用核验，未逐像素查看内容；"精确重复"结论全部基于 sha256。
2. 引用面 grep 覆盖仓库内所有文本类型（排除 node_modules、.git、受保护目录、ai/project-audit），但无法覆盖仓库外（已发布网页、会话记录、用户本机 Codex skill）对这些图片的引用；ai/sessions/ 按规则未读正文，其中若有对 _shots 等的提及不在本报告内。
3. `scripts/check-design-system.mjs` 已运行通过；其他 check-*.mjs 需要 dev server + Playwright/sharp，未运行（node_modules 未安装），对它们的产出判断基于阅读脚本源码的写出/读取路径。
4. `ui-concepts/codex-report.md` 与 `navigation-concepts/codex-report.md` sha 相同，故只全文读了一份。
5. 跨分区问题（codex-visual 重复原件、ai/reboot 链接、TODO.md L157 "真源"措辞、codex-visual/20260811-055917Z 的旧路径）在此登记但不在本分区处置。
6. 未验证 HTML 在浏览器中的实际渲染，只核对了其引用的本地资源是否存在与打开前提（Vite 根路径）。
