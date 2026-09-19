# Ledger · ai/design_system/uiux/interaction.md

基线 3fd52a5 / 分支 dev / 2026-09-19。压缩稿：`compressed/interaction.md`（只写 scratchpad，未改动项目文件）。

## 体量

| 项 | 原文 | 压缩稿 | 变化 |
|---|---|---|---|
| UTF-8 bytes | 8940 | 7839 | −1101（87.7%） |
| 行数 | 94 | 85 | −9 |
| 目标 | ≤ 5960 bytes（2/3） | **未达标** | exception，见下 |

## 例外说明（逐段理由）

原文 2026-09-11 复核、2026-09-13 随目录重整入位，主体是「当前行为 / 目标契约 / 未来待办」三类活内容。真正的可删项（已作废动效表）只占约 400 B；其余压缩只能靠措辞与跨文档去重，共省 1101 B。再砍 1879 B 必须动以下内容，逐段说明为何不删：

- **§2 入口地图表（11 行，约 1700 B）** — 全项目唯一的「场景物件通道 ↔ UI 通道」配对视图，是「当前项目形状」的核心。文件/选择器级细节已按去重规则外移到 `Features/ui-system/audit.md#2-入口与组件地图`（表头四列已收窄、缺陷描述已删），但通道配对本身在 audit.md 不存在同等形态，且 audit.md 自述为会过期的时点快照，不能把常驻契约的权威挪过去。
- **§9 反模式红线（12 条，约 330 B）** — 明文红线规则，属「不得为达标删规则」。
- **§7 音效体系（约 480 B）** — 唯一记录处（水滴=确认 / 涟漪=切换 / soft pop=点击、动森时值法则、音高阶梯、候选音源），属未来待办，全仓无第二份。
- **§1 三类载体定义块 + §10 编号歧义提醒** — A/B/C 术语定义与「比稿编号 ≠ 载体编号」的歧义说明，任务明确要求保留。
- **§4 长椅仪式、§3 多房间提案** — 独有产品决策与远期边界（「不登记为当前实现」是有效约束）。

结论：7839 B 是保真前提下的最小体积。

## 保留清单

- 当前 / 目标的显式区分：§1 加粗小标 **当前** 与 **目标契约（建议）**；§2 表头改为「场景物件通道 / UI 通道 / 打开形态」；§4 首条标注「世界内（当前）」。
- 强制规则：Esc 一次关一层、关闭归还焦点、B 覆盖 A 限制后台交互、A 不开全屏暗幕、保存失败保留输入、成功反馈必须对应真实结果、普通转场 ≤500ms、§9 十二条反模式、§8 材质/配色使用边界（暖金=操作、蓝粉=身份、绿红=真实状态，不拿在线绿点作装饰）。
- 未解决问题：换房回调为空、右侧把手无动作、点角色开聊待接、音乐共享同步待做、世界设置入口缺失、widget 隐藏/恢复未统一、拿起收回与羽毛笔待办、长椅仪式未实现、音效体系无实现。
- 术语与编号：三类载体 A/B/C；§10 与 `research/cinnaglass-history/navigation-concepts/` 三版比稿 A/B/C 的区分说明（原样保留，措辞加粗为「编号歧义提醒」）。
- 外部锚点：本文件**无任何入向锚点**（全仓 grep `interaction.md#` 仅命中 audit 产物中对 *Features/ui-system/ui-system.md* 的 `#6-实施顺序与闸门`，非本文件）；出向锚点 `ui-system.md#6-实施顺序与闸门` 保留原样。

## 删除清单

| 原文位置 | 摘句 | 理由 |
|---|---|---|
| L59-65 整张动效表 | 「面板/卡片开合 220ms ease-out…」「房间平移 320–400ms + 20% 视差」「按钮 hover 120ms」「spring 下压 scale 0.96 超调 ≤4%」「聊天气泡 wobble」 | §6 自述「本轮后置，不作为新定稿」「各组件并未统一遵守」＝已作废方案；按要求折成一行状态句，并写明参数留在 git 历史（3fd52a5 的本文件 §6）可回取。全仓核查：这些参数除 timeline.md:215 与一份 research codex-report 各自引用「220ms」外无第二份正文，未造成他处失链 |
| L67 后半段 | 「单张 980ms；连续每张 470ms，上张行程 38% 后接续，最多同时 3 张…中途连续输入累加目标…已载入内容不模糊，未载入历史先从目录获取，不伪造页码。关闭/缩放/打开写作收在最近跨页；减少动态效果时直接切页」 | 与 `cinnaglass/journal-room-object/turn-implementation.md:34-39,43,45` 逐条重复（该文为实现真源，且经 design-review 对照 journal-turn.ts / controller 核实一致）；压缩稿留「唯一明确例外 + 一句摘要 + 链接」，`≤500ms` 通用规则留在本页 |
| L82 子项 | 「淡中性范围框、默认手绘头像、纸角照片与暖褐真文字…阅读从左页到右页再换下一组，旧→新顺序不变，不按作者分左右；窄屏单页。页码/目录触发纸面竖直翻动与逐张连翻，羽毛笔为不接收点击的静态图；『写一页』保留原草稿入口。点外/Esc 保草稿，取消才清空」 | 同一事实在 `cinnaglass/ui-system.md` C 节与 `turn-implementation.md` 已有权威正文；改为一句摘要 + C 节锚点链接，保留「其他功能纸面仍是暖灰材质」这一现状判断 |
| L25-35 表格第四列 | 「现有 collection-surface」「列表编辑存在，到时提醒待接」「迷你播放键和进度待接真实状态」「世界设置有保存实现但入口缺失」等文件/缺陷级描述 | 与 `Features/ui-system/audit.md#2-入口与组件地图` 重复（该表另有文件名与行号）；表内保留通道与形态，缺陷统一指向审计 |
| L37 | 「登录/重置/大厅/无世界与错误加载状态也属于全项目统一范围，见 Feature 组件地图」 | 并入 §2 原则句同一条链接，避免同段两次指向同一文档 |
| L4 / L94 路径 | `ai/design_system/uiux/research/cinnaglass-history/navigation-concepts/` | 改为相对本文件的 `research/cinnaglass-history/navigation-concepts/`；字符串仍含 `navigation-concepts`，不影响审计 F-02（ui-concepts 去重）的 grep |
| §1 / §3 / §5 / §8 / §10 | 冗长连接词、重复主语 | 仅措辞压缩，条件与禁令未减 |

## 改正清单

| 原陈述 | 实际 | 依据文件:行 | 处理 |
|---|---|---|---|
| L26「棕皮旧纸双页日记；窄屏单页（**STYLE §8**）」 | `ai/STYLE.md` 自 9645dbc 起只剩 5 行兼容入口，无任何章节号，§8 不存在；「窄屏单页」的正文在 Cinnaglass C 节，实现在窄屏媒体查询换 `book-single.webp` | ai/STYLE.md:1-5；ai/design_system/uiux/cinnaglass/ui-system.md:33；cinnaglass/journal-room-object/turn-implementation.md:30；src/themes/cinnaglass/journal-room.css:451,459 | 改为「窄屏单页（见 [C 专属物件 UI](cinnaglass/ui-system.md#c-专属物件-ui)）」。turn-implementation.md 亦对应，但 C 节是常驻规范、且已被其他文档按锚点引用，作首选 |
| L34「**商店** ｜ 工具中禁用入口」 | rail 工具菜单里的禁用项标签是「装扮（敬请期待）」，RailKey 仍叫 `shop` | src/themes/cinnaglass/shell/rail.tsx:12,147 | 改为「装扮/商店 ｜ 工具中「装扮（敬请期待）」禁用项」，两种叫法都可检索 |
| §7 标题未标实现状态 | 全仓 src 无 `sfx` / `new Audio(` / UI 音效资源，水滴音效体系零实现 | `grep -rln "sfx\|new Audio(" src/` 无命中 | 标题补「提案，src 中尚无音效实现」，避免被读成当前行为 |

## 已核对一致（未改动）

| 陈述 | 实际 | 依据 |
|---|---|---|
| 桌面 74×384 竖条、窄/矮屏底部 292×62 横条 | `.rail{width:74px;height:384px}`；窄屏 `width:292px;height:62px` | src/themes/cinnaglass/shell/navigation-glass.css:76-77,444-446 |
| 五入口 | 房间/聊天/音乐/工具/设置 | rail.tsx:109-113 |
| WorldPage 换房回调尚为空 | `onRoom={() => { /* single room today … */ }}` | src/pages/WorldPage.tsx:470-472 |
| 右侧把手没有实际动作 | `RoomHandle onTap={() => { /* room carousel arrives … */ }}` | WorldPage.tsx:490-493；rail.tsx:174-180 |
| 房间菜单三卡、后两项锁定 | study / gameroom(locked) / garden(locked) | rail.tsx:22-24 |
| 模块控制器固定布局无拖拽 | modules-pop 内为固定 `MODULE_DEFS` 开关行，无拖拽逻辑 | rail.tsx:142-162 |
| 工具 → 照片墙 / 日历·纪念日 | `btn('photos'…)`、`btn('calendar'…)` | rail.tsx:145-146 |
| §5 周期星星 + hover 问候星星 + 物件微动 | 周期 hint 调度器（8-12s 首次、22-45s 间隔、点击重置）与 hover sparkles 实现在 Pixi 场景 | src/themes/cinnaglass/room/pixi-scene.ts:714,760-764,1040-1054 |
| 「Feature §4、§7」指向层级/关闭与验收矩阵 | ui-system.md §4 UX 契约、§7 验收矩阵 | ai/Features/ui-system/ui-system.md:102,165 |
| 出向锚点 `#6-实施顺序与闸门` | 标题存在 | ai/Features/ui-system/ui-system.md:147 |

## 链接校验

压缩稿 8 个相对目标在原路径 `ai/design_system/uiux/interaction.md` 下解析：**8/8 存在**，含新增的 `Features/ui-system/audit.md#2-入口与组件地图`（标题 audit.md:1 起「## 2. 入口与组件地图」）与两处 `cinnaglass/ui-system.md#c-专属物件-ui`。

## 待核清单

- §2 表中「时钟到时提醒待接」「音乐共享同步待做」「世界设置入口缺失」沿用 `Features/ui-system/audit.md`（时点快照），本轮未逐项回源码复验。
- §1「旧 Discord 通栏侧栏已删除」未在 git 历史中逐提交确认，仅确认当前 src 无该组件。
- §8「暖灰纸是待迁移现状」范围（哪些弹窗仍是旧纸）依赖 audit.md 的组件表，未逐文件核。
- §6 删去的动效参数依赖 git 历史（3fd52a5）可回取；若后续做 `git filter`/重写历史需另行归档。
