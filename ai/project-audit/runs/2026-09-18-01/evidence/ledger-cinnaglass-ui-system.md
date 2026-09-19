# Ledger · ai/design_system/uiux/cinnaglass/ui-system.md

基线 3fd52a5 / 分支 dev / 2026-09-19。压缩稿：`compressed/cinnaglass-ui-system.md`（只写 scratchpad，未改动项目文件）。

## 体量

| 项 | 原文 | 压缩稿 | 变化 |
|---|---|---|---|
| UTF-8 bytes | 5008 | 4566 | −442（91.2%） |
| 行数 | 48 | 46 | −2 |
| 目标 | ≤ 3338 bytes（2/3） | **未达标** | exception，见下 |

## 例外说明（逐段理由）

原文 2026-09-13 刚整理，全文 = 当前形状 + 有效规则 + 未解决项 + 载体登记，无已完成流水、无作废方案、无第二份 token 表。可压部分只有措辞与和 navigation-glass.md 重复的机制句，共省 442 B。要再砍 1228 B 只能动以下三类不可删内容：

1. **图片登记（5 张，636 B）** — 任务明确要求「保留每类载体的图片/特征/交互/来源登记」；alt 文本本身是载体特征描述（三时辰对照、聊天内容已隐藏、输入值已隐藏等隐私标注）。
2. **来源链接（20 条，约 1023 B，其中纯 URL 1031 B 含标点）** — 指向 navigation-glass.css / frost.webp / materials.css / journal-room.css / journal-turn.css / cinnaglass.css / screens.tsx / arts 与 public 素材目录，是「真实来源」登记，全部实测存在（见「链接校验」）。相对路径 `../../../../src/...` 长度由目录深度决定，无法缩短。
3. **规则正文（约 2900 B）** — 弹层七项必答清单、四载体契约、旧类迁移禁令、对比度/真实图标验收、新组件必须补 Markdown 的登记义务、A/B/C 不分家三套品牌。均为强制规则或验收条件，删任一条都违反「不得为达标删规则」。

结论：4566 B 是保真前提下的最小体积。

## 保留清单

- 四个被外部锚点引用的标题**原文照抄**：`## A 场景悬浮 UI`、`## B 任务与功能弹窗`、`## C 专属物件 UI`、`## 边缘页面与公共规则`（uiux.md:14/15/17/18/19/20、props.md:32 引用）。
- 三级标题 `### 实现与验收注意` 及其 4 条规则全部保留。
- 5 张图片与全部来源链接。
- 独有决策：C 日记本 session 冻结；B 同源厚壳「尚未批准或迁移」；照片保留拍立得拼贴、心愿/时钟不强套书本；不再另建手抄 tokens.md；A/B/C 不另建三套品牌。
- 未解决问题：实况失败语义、音乐假播放/进度、小屏越界、多窗重叠、设置层级/隐藏焦点/假成功、拿起收回与羽毛笔交互待做、M5 边缘页面收敛。
- 术语：四载体契约、`--nav`/`--cg`/`--shell`/`--glass`/`--craft` 并存、UI Tailor 维护 / Monet 审核。

## 删除清单

| 原文位置 | 摘句 | 理由 |
|---|---|---|
| L11 | 「采用固定透明细纹、实时背景模糊和按 mood 的 CSS 渐变边光。纹路不是运行时随机，边光不计算物理场景反射；各时辰共用同一张纹理」 | 与 `Features/navigation-glass.md:22` 同义复述（该文为机制事实真源）；按专项要求改为「材质机制与素材生成不在本页复述，见导航说明」+ 原链接保留 |
| L5 | 「当前以已认可的导航为统一起点；A/B 其余界面保留真实现状说明，C 日记冻结。此 Markdown 是主题常驻规范」 | 语义保留，措辞压缩为一句 |
| L23+L25 | B 段两处分述「照片仍使用拍立得拼贴，心愿/时钟等内部内容无需强套书本」与现状句分列 | 合并同段，无信息损失 |
| L33 | 「用户允许遮挡角色。阅读时雨继续」拆句 | 合并为一句 |
| L39/L41/L45-48 | 「后续 M5 与公共控件一起收敛」等处的冗余连接词、「交互动画后置，当前先确定…」等 | 仅措辞压缩，条件与禁令一字未减 |

## 改正清单

本文档本轮未发现事实错误，**0 处改正**。核对项（全部一致）：

| 原陈述 | 实际 | 依据 |
|---|---|---|
| 五入口为房间、聊天、音乐、工具、设置 | `rooms/chat/music/modules/settings` 五个按钮 | src/themes/cinnaglass/shell/rail.tsx:109-113 |
| 工具再展开具体功能 | modules-pop 内含照片墙、日历·纪念日、装扮（禁用）+ 模块开关 + 回大厅 | rail.tsx:142-166 |
| 纸色/文字见 materials.css | `--craft-paper #d8cdba`、`--craft-ink #443e35` 等在此声明 | src/themes/cinnaglass/materials.css:4-15 |
| `--nav`、`--cg`、`--shell/--glass`、`--craft` 并存 | 四组前缀均有实际声明与消费者 | cinnaglass.css（--cg-*/--shell-*/--glass-*）、navigation-glass.css（--nav-*）、materials.css（--craft-*） |
| screens.tsx 等现有主题代码承载边缘页面 | 文件存在（51387 B），含 `collection-surface` 等 | src/themes/cinnaglass/screens.tsx |
| 10 个源码/资源链接 | 全部存在 | 见下「链接校验」 |

## 链接校验

压缩稿 25 个相对目标（含图片）在原路径 `ai/design_system/uiux/cinnaglass/ui-system.md` 下逐一解析：**25/25 存在**，无新增失效链接。

## 待核清单

- L17 列举的 A 类缺陷（实况失败语义、音乐假播放/进度、小屏越界、多窗重叠）本轮未逐项回源码验证，沿用 `Features/ui-system/audit.md`（其自述为 2026-09-11 时点快照，随 M2-M5 推进会过期）。
- 「四载体契约」第四层 `<image-slot>` shadow DOM 仅见 `src/themes/cinnaglass/image-slot.js` 文件名，未逐行确认 shadow DOM 作用域实现。
- 「旧『果冻时长表』不是新定稿」——该表正文在 interaction.md §6，本轮已在那侧标为作废（见 interaction ledger）。
