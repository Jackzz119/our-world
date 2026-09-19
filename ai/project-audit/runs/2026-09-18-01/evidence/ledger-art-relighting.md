# Ledger — ai/design_system/research/art-relighting.md

## 体积

| | bytes | 行 |
| --- | --- | --- |
| 原文 | 6909 | 79 |
| 压缩稿 | 5257 | 57 |
| 目标（≤2/3） | 4606 | — |
| 实际比例 | **76.1%** | — |

**target_met = false，exception = true。** 详见文末「例外说明」。

## 入向引用与锚点

全仓 grep `art-relighting.md#`（排除 `.claude/`、`.agents/`、`ai/sessions/`、`node_modules`、`.git`）：**零命中**，无任何文档用锚点引用本文标题，故标题可自由改写。

纯文件名引用（需保持文件存在、不改路径）：
- `ai/TODO.md:52`、`ai/PROJECT.md:90`、`ai/PROJECT.md:161`（技能登记表）
- `ai/design_system/research/README.md`、`effects.md`、`uiux/cinnaglass/ui-system.html:1323`、`ai/Features/ui-system/ui-system.md:54`

压缩稿保留了全部原有出站链接（TODO、ui-system.md、living-props.md、预览 index.html、gradient-textures.png），无断链新增。

## 保留清单

| 保留项 | 类型 | 位置 |
| --- | --- | --- |
| 「资产制作流程首版，产品资产与光照实现尚未改造」 | 状态边界 | 抬头 |
| 目标：先定稿原画 → 再做可重组材质/光照；同一环境描述驱动场景与 UI | 独有决策 | §目标 |
| `living-props` 与动态阴影独立建设，不并入本技能 | 职责边界 | §目标 |
| 技能为**用户级 Codex skill**、路径因机器而异、不假设目录同步 | 强制规则 | §技能入口 |
| `compare_renders.py`（平均差 / p95 / alpha 差，无阈值只报告） | 工具 + 验收方式 | §技能入口 |
| **项目专有参数不写进技能**（不写死书房路径 / 三档 mood / Pixi 版本） | 强制规则 | §技能入口 |
| 三张 1586×992 原画的真源与运行时底图路径 | 资产事实 | §定稿原画 |
| **运行时底图不是去光中性 base**；mood 三档 ≠ 四时辰 | 术语澄清 | §定稿原画 |
| 预览链接 + 静态对照图 + **必须 `pnpm dev` 经 Vite 根路径打开** | 使用条件 | §定稿原画 |
| wash 64×64 / 115° / normal；glow 256×256 / screen；`breathAlpha` 云影；`actorTint` / `armTint` | 实现事实（闸门数值） | §渐变不是另一张房间原画 |
| **当前没有用 Pixi AmbientLight**；预览不冒充完整运行时合成 | 边界澄清 | 同上 |
| `recipes.json` 记源文件 + SHA-256；**不是双向同步编辑器** | 强制规则 | 同上 |
| 盘面**不是严格去光 albedo**；**角向统计只适用于旋转对称物体** | 教训 / 边界 | §唱片给出的边界 |
| 以源码为准，旧注释里的 albedo 不作物理语义证明 | 强制规则 | 同上 |
| 两条资产路线表（保持定稿外观 / 共享中性母版） | 独有决策 | §资产工作流的两条路线 |
| 「中性」定义（保留木纹布纹毛发笔触，不是变白/去饱和） | 术语 | 同上 |
| 单图无法分清深色材料与阴影；补绘区必须记录来源并验证 | 强制规则 | 同上 |
| 法线 / 高度 / 深度定义与局限；只为可验证用途生成 | 术语 + 强制规则 | 同上 |
| 5 条待验证设计问题（含「台灯要真能关掉，底图须有无该灯状态」） | 未解决问题 | §待验证的设计问题 |
| 已验证范围 + **四项未完成**（资产分层 / 材质恢复 / shader / 运行时验收） | 验收条件 | §已验证范围与边界 |

## 删除清单

| 原文位置 | 摘句 | 理由 |
| --- | --- | --- |
| :3 | 「已建立 `art-relighting` 技能与当前光层预览」 | 与同句后半「这是首版」重复，压成一句 |
| :10 | 「当前只建立这项技能……日记本继续按本 session 边界冻结」 | session 流水；日记冻结是当轮范围声明，已过期（journal 翻页已于 5b96700 落地） |
| :14 | 「显示名「原画分层与环境光照」」 | 与文档标题重复复述 |
| :15 | 「遵循项目 AGENTS 的用户级 Codex skill 规则；未改 Claude 配置」的后半 | 「未改 Claude 配置」是当轮过程声明，非常驻规则 |
| :16-17 | `references/methods.md` / `references/asset-contract.md` 的逐条目录说明 | 对技能本身内容的重复介绍；技能在仓库外、路径因机器而异，此处列目录无法维护 |
| :23-29 | 三行 Markdown 表格（时辰 / 原画真源 / 运行时底图） | 六个路径只差 mood 段，压成一行花括号写法，无信息损失 |
| :33 | 「展示三张原画及晴/雨六种配方，可下载 12 张原始透明纹理」 | 与链接标题重复，压成「三张原画 × 晴雨六配方，纹理可下载」 |
| :41 | 「不在本次两种主光纹理的图板中」 | 「本次图板」是当轮语境，删后语义不变 |
| :50 | 「它优先满足静止还原和旋转稳定性」「唱片没有再使用 `platterTint`；单独的唱臂才用 `armTint`」 | 唱片机分层细节移交 living-props.md 为唯一正文，此处只留对本主题（去光/albedo）有效的结论 + 链接 |
| :52 | 「来源是实际 `study-room.ts`、`pixi-scene.ts` 与 `scripts/build-turntable-parts.py`」全路径 | 压成文件名，路径在 living-props.md 与 PROJECT.md 已有 |
| :67 | 「以下是要验证的设计问题，不是已实现结论」独立成行 | 并入小节标题 |
| :69-73 | 五条中的连接词与重复限定语 | 逐条压句，保留每条的强制条件与否定项（未删任何一条） |
| :77 | 「包含已知色差、局部损伤、透明像素、阈值正反例、尺寸拒绝与防止覆盖输入」「12 张透明 PNG」 | 已完成的自测逐项流水；保留「12 项自测」计数与结论 |
| :77 | 「页面无运行错误、390px 下无横向越界」中的重复主语 | 并句 |
| :79 | 「这证明工具与说明可用，不代表……。后续真实资产任务需分别报告这些结果。」 | 与前句合并成一句，语义完整保留 |

## 改正清单

| 原陈述 | 实际 | 依据 |
| --- | --- | --- |
| :46「`lighting-layers/recipes.json` 记录源文件与 SHA-256」 | 实际路径为 `ai/design_system/research/art-relighting-preview/recipes.json`；仓库内无 `lighting-layers/` 目录 | `ls ai/design_system/research/art-relighting-preview/` 命中 `recipes.json`；文件内含 `"source": "src/themes/cinnaglass/room/pixi-scene.ts"` 与 `"sourceSha256"`、`"capturedAt": "2026-09-12"` |
| :15「本机 Codex 入口：`C:/Users/Jackzz/.codex/skills/art-relighting/SKILL.md`」 | 写死了某台 Windows 机器的绝对路径；改为「用户级 Codex skill `art-relighting`，入口路径因机器而异（各人 Codex skills 目录下的 `art-relighting/SKILL.md`）」 | 当前工作机为 darwin（`/Users/chengzheng/...`），该路径不存在；原文下一句本身就写「其他环境需读取其实际可用的 skill，不假设本机目录自动同步」，改写后与之自洽 |
| 无（新增缺失条件） | 预览 `index.html` 用 `/arts/rooms/study/source/<mood>.png` 绝对路径，双击本地文件会丢图 | `ai/design_system/research/art-relighting-preview/index.html:282` `src="/arts/rooms/study/source/${mood}.png"`；`:268` `fetch('./recipes.json')`。补入「必须 `pnpm dev` 后经 Vite 根路径打开」 |

## 已核对为准确（无需改动）

- wash 64×64、`angleDeg = 115`、`fillRect(0,0,64,64)` — `src/themes/cinnaglass/room/pixi-scene.ts:139-151`
- glow 256×256、`glow.blendMode = 'screen'` — 同文件 `:157-166`、`:831`
- 六套配方 `washBlend` 全为 `'normal'` — 同文件 `:65,75,89,99,111,121`
- 雨天深色径向层 `breathAlpha` + `blendMode = 'multiply'` — 同文件 `:835-842`
- `actorTint`（角色/钟针）、`armTint`（唱臂）存在，且唱片已无 `platterTint` — `pixi-scene.ts:48,580`；`room-types.ts:64-84`；`study-room.ts` turntable 段无 `platterTint`
- 全文无 `AmbientLight` — grep 零命中
- 三张原画与运行时底图路径均存在

## 待核清单

- 「三张原画均为 1586×992」：未在本轮重新 `sips` 核验（预览页 caption 亦写 1586 × 992，`ai/project-audit/.../design-review.md` 记 scene.md 原画尺寸已对照 `sips`，视为已核）。
- 「比较脚本 12 项验证通过」：`scripts/compare_renders.py` 在用户级 Codex skill 目录内，**不在本仓库**，本轮无法复核项数与内容；按原文原样保留。
- `references/methods.md` / `references/asset-contract.md` 同样在仓库外，无法核实其现有章节，故压缩稿只作概括性提及。

## 例外说明

**做不到 ≤4606 bytes，停在 5257（76.1%）。** 逐段理由：

1. **§渐变不是另一张房间原画（约 900B）** — 全部是运行时光照配方的实现事实与闸门数值（纹理尺寸、角度、混合模式、无 AmbientLight、recipes.json 快照语义）。这是 `art-relighting` 与产品代码之间唯一的对照正文，删任何一条都会让「预览与产品是否一致」失去判据。
2. **§资产工作流的两条路线（约 900B）** — 表格是本文独有的路线决策；其后两段是「中性」「法线/高度/深度」的术语定义与局限，列在保留要求内。这些内容的另一份在仓库外的技能 reference 里，不能靠链接顶替。
3. **§待验证的设计问题（约 700B）** — 5 条全是未解决问题，且第 1 条含强制条件（台灯要真能关，底图须有无该灯贡献的状态）。只做了句式压缩，未删条目。
4. **§唱片给出的边界（约 380B）** — 「不是严格去光 albedo」「角向统计只适用于旋转对称物体」是教训与适用边界；唱片机的**制作细节**已全部移交 living-props.md，此处只留对本主题有效的结论。
5. 其余（抬头、目标、技能入口、定稿原画、已验证范围）合计约 2300B，已做过两轮逐句压缩，再删就会丢掉状态边界或验收条件。

若一定要压到 2/3，只能整节删掉「两条路线」或「待验证的设计问题」，二者分别是独有决策与未解决问题，均在硬保留清单内，故选择保真优先。
