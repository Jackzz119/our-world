# 美术原始制作批次索引

> 2026-09-12 全量分域登记，2026-09-19 按用户决定重整：`codex-visual` 技能的比稿/审核批次归 `ai/codex-visual/`；生产用生成批次只保留已采用原件及其报告，放在 `arts/` 对应目录（角色 `arts/characters/`、原画 `arts/rooms/study/source/`、缩略图 `arts/rooms/thumbs/`、唱片机装配输入 `arts/rooms/study/generated/`）；失败尝试与被后续轮次取代的批次（20260906-054721Z、20260906-192932Z）已删除，恢复依据 git `f7a151a`。采用范围以 [design-system.md](../design-system.md) 为准，否决与构想见 [概念档案](../concept/README.md)；不能从历史报告自动恢复被否方案。

| 批次/原报告                                                                              | 用途与状态                                                            |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [20260809-083950Z](../../codex-visual/20260809-083950Z/codex-report.md)                  | 3D/2.5D 媒介研究；当前已选 Pixi 分层，保留推导                        |
| [20260809-101107Z](../../codex-visual/20260809-101107Z/codex-report.md)                  | 六张陪伴小屋概念，正式副本在本域 baselines，有效边界见入口            |
| [20260810-000437Z](../../../arts/characters/codex-report.md)                             | 书房底图与四张角色生产批次；角色运行时在 `public/characters/`         |
| [20260810-024945Z](../../../arts/rooms/study/source/codex-report.md)                     | 去嵌入 UI/光圈的三档书房底图；源素材关系见 `arts/rooms/study/`        |
| [20260811-042411Z](../../../arts/rooms/thumbs/codex-report.md)                           | 棋牌室/植物园缩略概念，存在缩略图不代表新房间功能已完成               |
| [20260815-172541Z](../../codex-visual/20260815-172541Z/codex-report.md)                  | 星光粒子提示探索；当前采用星星提示，具体配方以实现为准                |
| [20260815-235110Z](../../codex-visual/20260815-235110Z/codex-report.md)                  | 贴形金色描边+星光旧探索；描边方向已否决，保留研究                     |
| [20260822-092155Z](../../codex-visual/20260822-092155Z/codex-report.md)                  | Hover 金光层探索；旧换图/光效提示路线，不作新需求                     |
| [20260823-054106Z](../../codex-visual/20260823-054106Z/codex-report.md)                  | Study Living Diorama；活物分层方向，部分实现/其余待定见研究           |
| [20260907-053852Z](../../../arts/rooms/study/generated/20260907-053852Z/codex-report.md) | 唱片机机器/唱臂/盘/针分离；派生使用以源库和运行时 manifest 为准       |
| [20260907-055939Z](../../../arts/rooms/study/generated/20260907-055939Z/codex-report.md) | 转盘/轴针追加生成和尝试；当前转盘还原算法见 PROJECT，旧部件不自动替换 |

5 个 UI 批次在 [UI 制作索引](../uiux/research/production-batches.md)。历史日志里的临时路径只作生成来源描述，本域的当前资源指针必须实际存在。
