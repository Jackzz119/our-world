# 上下文移交：Our World timeline v2 重做 —— Claude 复核结论转交 Codex 再决策

> 性质：这是 Claude 把自己做过的事和看法**交给你**；你是决策方。下面所有「建议/倾向」都只是参考，请按你的判断重新裁决，并把结论写成决策备忘。**本轮不要写代码。**

## 1. 事情经过
- 用户要求按 v2「放置陪伴小屋」的风格基准重做 timeline（v1 是 2026-07 Discord 时代做的近全屏玻璃弹窗）。
- Claude 起草 brief（`scratchpad` 临时文件，内容已全部体现在你的报告 §1），委派你以 design 模式出了**策划 + 三方向比稿**（本目录）。
- Claude 随后对你的产出做了独立复核（不采信自报数，自己采样/量测），并把复核和 6 个开放决策点写进 `ai/Features/timeline.md` 第七章。
- 用户决定：**由你接手 Claude 的复核结论，再次决策**。Claude 一度把自己的倾向写成了「已拍板」，已纠正回「建议」。

## 2. 所有材料的位置
| 材料 | 路径 | 说明 |
|---|---|---|
| 你的策划报告 | `codex-visual/20260905-215344Z/codex-report.md` | 443 行：规范化 brief、证据、策划 A.1–A.5、三方向、评分、推荐、退化表、Esc 栈、逐文件映射、分期 |
| 三张方向图 | 同目录 `direction-1-centered-paper.png` / `direction-2-desk-unfold.png` / `direction-3-tethered-leaf.png` | 1440×900，同一夜雨书房 |
| Claude 复核 + 决策点 | `ai/Features/timeline.md` 第七章 | 另含一至六章 v1 链路/模块/数据模型（仍成立）与文档头的 v2 适用性说明 |
| 产品/风格/交互基准 | `ai/PROJECT.md`、`ai/STYLE.md`、`ai/UX.md` | PRD、视觉基准（§4 光照 §8 UI 薄壳 §9 验收 §10 CSS 坑）、交互基准（§2 入口地图 §6 动效参数 §9 反模式） |
| 既有 UX 决策登记 | `.claude/skills/ux/decisions.md` | D-1 单列日记流、D-2 草稿规则、D-9~D-12 纸/玻璃/光照 token 决策（只读，不要改这个目录） |
| token 活文档 / 样式真源 | `ai/design_system/cinnaglass/ui-system.html`、`src/themes/cinnaglass/cinnaglass.css` | |
| 现有实现 | `src/themes/cinnaglass/screens.tsx`（SubScreen/TimelineBody/Composer/PhotosBody/PostDetail）、`src/pages/WorldPage.tsx`、`src/themes/cinnaglass/room/study-room.ts`、`room/pixi-scene.ts`（cover-fit 与 onHotspot） | |
| 改前实景截图 | **未入库**（含真实帖图与输入法候选条，留在 Claude 会话 scratchpad） | 你上一轮已看过并在报告 §2 描述；如需重看，可让用户在 dev server 里重新截 |

## 3. Claude 独立复核的发现（事实，可自行复算）
1. **明度层级复算与你一致**：用你 §2 给的采样矩形算 Rec.709 luma——纸 253.7 / 242.9 / 241.0，rail 壳 44.2 / 42.9 / 41.7，暗处场景 36.9 / 31.8 / 35.9。补充观察：右墙受台灯照亮处 54–62 **高于**石墨 rail，即「壳 > 场景」只在暗区成立；「纸最亮」三图都以巨大差距成立。
2. **方向 3 的图与规格不一致**：图中纸页实测宽 **369px（占 1440 的 25.6%）**（行 300 白色连续像素 x=505–873），你的规格写 560–590px。需要你定哪个是意图。
3. **三图都给回忆条目铺了淡蓝/淡粉底**（气泡感）。既有裁决（v1 ST-O / decisions D-1 系）是身份只打「头像光环 / 名字 / 卡片边线」，卡片本体恒白；PRD 铁律「互动不长在信息流里」。淡色底是否会让日记读成聊天线程——请你重新判断。
4. **token 双真源属实**（你 §7.3 指出，Claude 核实）：`cinnaglass.css` 根 `--accent-deep: #268fbe`（golden 档 `#2e9fd0`、night 档 `#83d8f5`），而 `--accent-orb` 尾色与 `screens.tsx` guest tone 用 `#2f9ad3`（D-9 定稿值）。
5. 角色可见性：方向 2/3 两张脸完整；方向 1 粉狗只剩侧脸——与你的评分一致。
6. 方向 3 第三条文案为生图不稳被置空，你已在报告声明；生图不能证明 CSS 可实现，最终以 `<link>` 真实 css 的 headless 截图 + 像素采样为验收（STYLE §9/§10）。

## 4. 用户与既有文档给定的**不可协商约束**（你决策时的边界）
- 内容纸恒白且为全场最高明度；外壳中性烟熏玻璃随时辰；禁止玻璃嵌玻璃（STYLE §4/§8，D-10/D-12）
- 打开态两只角色都必须留可辨识部分（STYLE §1 修正项②、§8）
- 单列日记流，上旧下新，不做中央脊线/左右交错（decisions D-1）
- 草稿规则：点外/Esc 收起保草稿，「取消」唯一清空，折叠条显示草稿预览（D-2）
- 作者色语义：我=蓝 accent、对方=粉，打在光环/名字/边线
- 数据层（useFeed/posts.ts/storage.ts）、游标分页、多图 ≤9、缩略图+详情原图、40 分钟续签不动
- UX §9 反模式红线；STYLE §3 低噪原则；原创角色不得画成三丽鸥官方形象
- 照片墙/心愿单要服从「功能住在房间物件里」（UX §2）——怎么服从由你定

## 5. Claude 的倾向（仅供参考，不是决定）
方向 3 为静态几何、开场借方向 2 姿态；改名「回忆日记」；三 tab 拆为各物件 surface；白卡 + 3px 作者色边线，最多 ≤6% 极淡作者色底；纸宽 480–520px（≥1200）；`--accent-deep` 统一 `#2F9AD3`。

## 6. 请你交付
写 `codex-visual/20260905-215344Z/decisions-v2.md`：
1. 对第 3 节每条发现的回应（接受 / 反驳 + 理由）
2. 六个决策点的**最终裁决**：形态与开场 / 命名 / 是否拆三 tab / 卡片底色 / 纸宽（三断点各给数值）/ token 统一值——每条给理由、相对你原报告改了什么
3. 若裁决改变了原报告的规格（§7 token、§9 映射、§11 分期、退化表），给出修订后的版本
4. 你认为仍需**用户本人**拍板的事项（例如产品命名、是否连带重做照片墙/心愿单的范围）单列一节
5. 遵守 `AGENTS.md` 报告规范：说人话、术语当场解释；不改 `.claude/`；不写代码
