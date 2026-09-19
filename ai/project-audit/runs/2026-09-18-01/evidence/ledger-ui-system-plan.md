# 压缩 ledger · ai/Features/ui-system/ui-system.md

| 项 | 原文 | 压缩稿 |
| --- | --- | --- |
| UTF-8 bytes | 20753 | 14649 |
| 行数 | 186 | 133 |
| 比例 | — | 70.59%（目标 ≤66.67% / 13835 bytes） |
| 结果 | — | **未达标，见「例外说明」** |

源文件只读，未修改；压缩稿写在本目录 `ui-system-plan.md`。

## 保留清单

- **用户已定决策**（§1 表状态列 + §8）：导航为 A 基准、全项目按 A/B/C 组织、本 session 日记冻结、动画后置、先出文档与可验收计划。
- **A/B/C 术语定义表**（§1）：三列「用途与范围 / 材质方向 / 状态」完整保留，含 B 的「同源较厚中性磨砂壳 + 稳定阅读/表单底」建议标注。
- **强制规则**：「入口不决定材质」段；日记冻结范围清单与「改 screens.tsx / materials.css / 公共 .modal·.paper 前必须证明只覆盖 A/B」；§2.2 四条基准（含 74×384、圆角 25、左距 38、292×62、五入口、菜单 8px）；§2.3 四条推荐规则；§3 色与光/质感与形状/字体/层级/状态五条；§4.1 层级表五行 + B dialog 语义段；§4.2 响应式四条；§4.3 功能诚实五条；§5「迁移后才清理」。
- **未解决问题**：`data-glass` 三选项不能一致控制导航与 widgets；B 厚磨砂/字体/纹理尺度待 M1 标准板确认；光照共享参数未定稿；构建被 `Msg` 导入阻断。
- **阶段闸门与验收条件**：§6 M1–M6 全部「交付与主要影响文件」「进入下一阶段的条件」逐字保留；§7 验收矩阵八个维度的检查条件一条未删（表格由 8 行合并为 4 行，条件文本未删减）。
- **被引用标题**：`## 6. 实施顺序与闸门`（`ai/design_system/uiux/interaction.md:92` 以 `ui-system.md#6-实施顺序与闸门` 引用；`ai/project-audit/.../design-review.md:72` 亦校验此锚点）。`§2.1` 小节号保留（`ai-core-review.md:93` 以「§2.1 表」指名）。
- **出向锚点**：`audit.md#2-入口与组件地图`、`audit.md#5-本轮验证与限制`（原有）；新增 `audit.md#1-当前不是一套-ui-材质`、`audit.md#3-主要问题及优先级`、`audit.md#4-清理时不能踩的依赖`。
- 注：`cinnaglass/ui-system.md#a-场景悬浮-ui` / `#b-任务与功能弹窗` / `#c-专属物件-ui` / `#边缘页面与公共规则` 属于 `ai/design_system/uiux/cinnaglass/ui-system.md`（另一文件），与本文件无关，未受影响。

## 删除清单

| 原文位置 / 摘句 | 理由 |
| --- | --- |
| §2.1 六行「已核实的实现」表（不规则纹理 / 磨砂透景 / 细反光边 / 随时辰暖冷变化 / 悬停按压发光 / 房间变化） | 与 `ai/Features/navigation-glass.md`「实现摘要 · 机制澄清」段、`ai/design_system/uiux/cinnaglass/journal-room-object/navigation-implementation.md` 三处同事实。按「一个权威正文」改为一句指向；唯一独有结论「导航不直接消费天气或灯位置 / 不得称真实场景反射」原样保留 |
| §5 处置表的「保留并作为基准 / 优先改造 / 后续迁移 / 条件删除 / 本 session 不动」五行 | 权威正文分别在 §6 阶段表（改造批次）、`audit.md#2` 建议归属列（逐组件归属）、`audit.md#4` 依赖表（条件删除证据）、§1 冻结段（不动范围）、§2.2（导航基准）。压缩稿保留唯一新增规则「迁移后才清理 + 只清无消费者部分」并链接四处 |
| §6 表 M0 行「M0 现状审计 … 本轮完成」 | 已完成流水，降为表前一句 |
| §3.3 的 `text` 代码块关系图（环境参数 → 共用玻璃材质 → A/B → 控件 → C） | 自述「命名示意，尚未写入产品」，改为一行文字，语义未变 |
| 头部第 2 行「用户已定：以当前侧边导航为悬浮 UI 基准…动画后置」 | 与 §8「已确定的范围」同事实，改为指向 §8 |
| §3.1 风格四件套表 / §3.2 组件层级四段 / §4.2 五条 / §7 八行 的表格框架 | 事实全部保留，仅把表格/分条改为等信息量的紧凑列表或合并行 |
| 全文修饰性从句（「这类方案要单独证明…」「不能仅因为…就…」等的冗余连接词） | 不承载规则信息 |

## 改正清单

| 原陈述 | 实际 | 依据 |
| --- | --- | --- |
| §6「当前类型检查被 `shell/chat-card.tsx:10` 的 `Msg` 错误导入阻断；应在开始 A 实施时处理，不在本轮文档阶段修改产品代码」 | 阻断仍成立（2026-09-19 复跑 `pnpm exec tsc --project tsconfig.app.json --noEmit` 唯一报错即此项）；补充：`Msg` 实际导出在 `chat-data.ts`，`model.ts` 确无该导出 | `src/themes/cinnaglass/shell/chat-card.tsx:10`；`src/themes/cinnaglass/model.ts`（无 Msg）；`src/themes/cinnaglass/chat-data.ts:46` |
| §2.1「磨砂透景：`backdrop-filter: blur(2.4px) saturate(0.7)`」「纹理 512×512，CSS 按 256×512、42% 50% 取样」「菜单模糊 8px」 | 与源码一致，未改正，只是移出到 navigation-glass.md / navigation-implementation.md（§2.2 保留 8px 与尺寸基准） | `src/themes/cinnaglass/shell/navigation-glass.css:11`（`--nav-blur: 2.4px`）、:62–63、:91（`url('/ui/nav/frost.webp') 42% 50% / 256px 512px`）、:257（菜单 `--nav-blur: 8px`）；`public/ui/nav/frost.webp` 存在 |
| §2.1「`study-room.ts` 的 golden/twilight/night 三张底图」 | 一致 | `src/themes/cinnaglass/room/study-room.ts:14–16` |

（本文件为计划文档，除上述外未发现与源码冲突的事实陈述；逐项行号核对集中在 `ui-system-audit.ledger.md`。）

## 待核清单

- §2.2「导航小菜单…底色透明度至少 0.5」：只核到 `navigation-glass.css:257` 的 `--nav-blur: 8px`，未逐项核 alpha 值。
- §3 的 token 命名（tint / grain / blur / rim / shadow、A/B 表面族）为提案，源码中不存在，压缩稿保留「命名示意，未写入产品」标注。
- §7「正文 ≥4.5:1、主要图标/焦点线 ≥3:1」为目标值，本轮未实测对比度。
- §2.4 art-relighting 相关的「渐变预览 index.html」链接已从压缩稿删除（原文 `ai/design_system/research/art-relighting-preview/index.html`）：执行期间 `git status` 显示该预览目录下多张 png 处于已暂存删除状态，链接有效性存疑，故只保留 `art-relighting.md` 主链接。
- 工作树在本轮执行期间被并发修改（会话开始时 `git status` 仅 `?? ai/project-audit/`，核对末期已出现多个 M/D 条目）。所有源码核对以 2026-09-19 执行当时的工作树为准。

## 例外说明

**exception = true。** 压缩后 14649 bytes（70.59%），比 2/3 目标（13835 bytes）多 814 bytes / 3.9 个百分点。

原因：本文件是该主题的唯一权威正文，任务硬性要求保留的内容本身就占了绝大部分体量 ——
- §1 A/B/C 定义表 + §8 决策状态（术语与用户已定决策）≈ 2.4 KB；
- §6 M1–M6 交付与闸门条件 ≈ 2.2 KB；
- §7 验收条件 ≈ 1.3 KB；
- §2.2 基准 + §2.3 规则（任务点名保留）≈ 1.4 KB；
- §3 / §4 的强制规则与未解决问题 ≈ 5.3 KB，且 `interaction.md §8`、`uiux.md`、`decisions.md` 均反向指回本文件取「具体尺寸与状态」，无法外迁。

唯一大块重复（§2.1 机制表）与唯一可折叠块（§5 处置表）已按要求处理，其余下降靠逐句去冗余取得（累计已删 6104 bytes / 53 行）。继续压到 13835 只能删除闸门条件、验收条件或规则条款本身，违反「不能删关键条件」，故停在此处。
