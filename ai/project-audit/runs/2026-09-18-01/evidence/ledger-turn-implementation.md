# Ledger · turn-implementation.md

源文件：`ai/design_system/uiux/cinnaglass/journal-room-object/turn-implementation.md`（只读，未修改）
基线 commit：3fd52a5（分支 dev）

## 体积

| | bytes (UTF-8) | 行数 |
| --- | ---: | ---: |
| 原文 | 9237 | 81 |
| 压缩稿 | 7386 | 61 |
| 目标（2/3） | 6158 | — |

比例 80.0%，**未达 2/3，见「例外说明」**。

## 保留清单（本文是翻页「时值 / 窄片数 / 验证」的权威）

- 顶部状态：2026-09-07、保持已批准的书本美术与导航、不恢复已否决的旧平面翻折引擎、仅本地未部署未提交。
- 五个 GIF 链接：turn-single.gif、turn-continuous.gif、turn-back.gif、live-single.gif、live-continuous.gif，及其有效性限定（逐帧截图非生图、测试数据未入库、25 帧/秒不能估计实时帧率、样板放慢）。
- 技术决策与其理由：不用自定义 shader / 视频贴图；**24 条**窄片、同一张纸正反面、浅弯曲、书脊固定、纸面总长不变、合成器绘制、静止后移除副本恢复可选中文本。
- 三维实现约束：`preserve-3d`、父层不加透明度/滤镜/裁剪、`backface-visibility: hidden`。
- 正反面与底页映射（第 2 / 3 / 4 / 1 页的行为）、反向、窄屏单页不缩字。
- 全部时值与输入规则：**980 ms**、**470 ms**、**38%** 接续、最多 **3 张**、改速保留位置、方向键累加、目录逐张、反向先收纸、关闭/缩放/写作落到最近跨页、输入区不触发、副本不可获焦、读屏不读 24 份副本、减少动态效果直接换页、后台收动画、房间 30 帧上限、打开日记不再暂停雨景。
- 加载契约：一次 20 条、目录只列已载入日期、已加载不模糊、失败保留可重试、不预取全历史、不伪造目录；缩略图签名续期同时更新原页与空中页；`useFeed` / `posts.ts` / `storage.ts` / 数据库未改。
- 9 行代码与脚本真源表。
- 验证：runtime-results.json、book-verification/results.json、覆盖项清单、13.9 ms 中位帧间隔 / 95% ≤34.6 ms / 约 0.85 秒、图片续签与历史重试结论、接缝与阴影定稿、Pixi 8.19.0 `BindGroup.setResource` 修复机制、长文九图/十图/Esc/详情通过、ESLint 与 Vite 通过。
- 已知边界：非布料物理、无拖页角/音效/羽毛笔/拿起收回、性能仅本机无头 Chrome、花园/低端设备/125%-150% 缩放/低带宽/双账号未覆盖、`Msg` 导入错误阻断完整类型构建。

## 删除清单

| 原文位置 / 摘句 | 理由 |
| --- | --- |
| L7「先用实际浏览器纸面几何逐帧导出…再把同一渲染器接入产品」 | 过程叙述；GIF 链接与「样板/产品录像」区分保留 |
| L17 两条 MDN 外链（transform-style、backface-visibility） | 通用 Web 文档依据，非项目事实；对应的实现约束句全部保留 |
| L19「### 正反面与底下的内容」四行表格 | 表格转为一段等价映射说明（第 2/3/4/1 页与行为一字未减），省表格框架开销 |
| L30 前半「反向翻阅按相反顺序处理」的重复展开 | 合并进映射段 |
| L34「实体翻书是本功能的有意例外，不套普通弹窗 ≤500 毫秒的限制」 | 保留（与 `ai/design_system/uiux/interaction.md:67` 同源，但 980/470 的权威在本文，故留在此处一句） |
| L43-45 中与 `ai/Features/timeline.md:11` 重复的功能复述（「所有已经加载的中间页仍是清晰真字、真照片」「没有从数据库取到的历史不能算成真实页码，更不能当成写满假字的纸」的双重表述） | 合并为一句，保留 20 条 / 不模糊 / 不伪造页码三项事实 |
| L63 检查项清单的引导句「检查内容包括：」等冗余连接词 | 语言压缩，条目全保留 |
| L67「这只是当前电脑的无头 Chrome 样例」等重复限定 | 与 §6 的同义句合并，保留一处 |
| L69「逐帧审查纠正了纸片接缝和竖直位置的阴影」的过程动词化表述 | 改写为当前状态（窄片边缘轻微重叠、阴影收窄并围绕书脊），仍保留「不再跳到左页边缘」的改正记录 |
| L70「网格虽然换了新贴图，共享绘制资源要到下一帧才换绑」的长句 | 语言压缩，机制与版本号 8.19.0 全部保留 |
| L73「工作区有其他任务的改动与 Windows 换行，原始 `git diff --check` 会将大量 CRLF 行尾报为空白；不为本轮大范围改写无关文件。按 CRLF 合法的方式检查差异，日记新模块另做格式检查」 | 一次性工作区事务流水，对当前实现无约束力 |
| L3 与 L79/L81 三处重复的「未部署 / 未提交 / `Msg` 阻断」表述 | 各保留一次（顶部说未部署未提交，§6 说构建阻断） |

## 改正清单

无事实改正。压缩稿把两处「过程完成时」叙述改写为「当前状态」（接缝/阴影、Pixi 释放时机），含义不变。

## 待核清单

- 已核实：`src/themes/cinnaglass/journal-turn.ts:18` `const STRIPS = 24`；`journal-turn-controller.ts:70,104` 470 / 980；`:121` `elapsed / duration >= 0.38 && this.motions.length < 3`。与原文一致。
- 未重跑：13.9 ms / 34.6 ms / 0.85 秒、20 条分页、GIF 25 帧/秒，按 `turn-verification/runtime-results.json` 与原文转录。
- 未核：Pixi 版本 8.19.0 未重新查 lockfile（沿用原文与 2026-09-18 审计结论）。
- 表中 `src/pages/WorldPage.tsx`「阅读态保持房间运行」与审计记录的 `WorldPage.tsx:439 active={screen === null || screen === 'timeline'}` 一致。

## 例外说明

exception = true。80.0% 是本文的保真下限，比另两份更高，原因是本文几乎全是规则条款：约 2.0 KB 的时值与输入规则（§3 六条，每条都是独立的行为契约）、约 1.3 KB 的加载与签名契约、约 0.9 KB 的代码真源表、约 1.6 KB 的验证结论与限定。可删的过程叙述（样板导出流程、CRLF 事务、逐帧纠正的动词化表述、MDN 外链）已全部删净，与 `ai/Features/timeline.md:11`、`uiux/interaction.md:67` 重复的功能复述也已压到链接级——但 24 条 / 980 / 470 / 38% / 3 张这些数值的权威正文按审计裁决就在本文，不能移走。再压只能删规则条款本身。

## 原文对一次性截图的引用

无。原文引用的动态证据是 5 个 GIF（turn-single / turn-continuous / turn-back / live-single / live-continuous）与 `runtime-results.json`、`book-verification/results.json`，均在保留名单内；未引用 `frame-*.png`、`sequence-*.png`、`back-*.png`、`live-single-N.png`、`live-continuous-N.png`、`seam-check.png`、`design-system-turn.png`、`prototype-results.json`、`runtime-*.png`。压缩稿亦未新增任何此类引用——注意 `runtime-results.json`（保留）与 `runtime-*.png`（未引用）不是同一批文件。

## 锚点

全仓 grep `turn-implementation.md#` 零命中（入向引用为文件级：`ai/TODO.md:89`、`ai/Features/timeline.md:11`、`uiux/interaction.md:67`、`ui-system.html:1379`）。压缩稿保留 `## 1..6` 编号标题结构。
