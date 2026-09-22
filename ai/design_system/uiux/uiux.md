# Our World · 当前 UI/UX

> UI Tailor 主维护，Monet 负责全局统一与视觉审核 · 2026-09-21。
> [整体设计系统](../design-system.md) / [Cinnaglass 主题](cinnaglass/ui-system.md) / [交互规则](interaction.md)

**[打开 UI/UX 全局风格预览](../preview.html#ui)**：直接展示本页及当前主题已登记的真实素材/实景，文字负责说明与链接；候选不混入此视图。与 [整体风格预览](../preview.html#world) 共用一个常驻入口，从 Markdown 自动取材。

![当前双圆环境入口、导航、聊天与音乐；真实组件、书房原画及演示内容](cinnaglass/environment-verification/scene-twilight.png)

这是本地已实施的统一基线。界面围绕安静陪伴、真实状态和需要时可读展开；不把所有功能都做成同一种浮窗。

## 所有在用 UI 的登记

| 类别与采用界面                       | 当前外观/行为                                                 | 常驻规范与实施依据                                                                                            |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A 导航                               | 五入口中性细纹磨砂；工具菜单、选中/悬停/按压反馈              | [主题 A](cinnaglass/ui-system.md#a-场景悬浮-ui)、[导航功能说明](../../features/navigation-glass.md)           |
| A 天气/聊天/音乐                     | 同源磨砂/受色内衬；左上双圆时辰/天气入口，音乐使用真实本机合成音频 | [主题 A](cinnaglass/ui-system.md#a-场景悬浮-ui)、[现状审计](../../features/ui-system/audit.md)                |
| A 新来信 | 金亮信纸提示世界未读消息，点击进入聊天、已读消失 | [信纸规范与实景](cinnaglass/ui-system.md#时辰--天气与新来信) |
| A 纪念卡/头顶状态/气泡               | 真实纪念日、姓名与聊天反馈；小屏避让，无占位在线绿点          | [交互规则](interaction.md)、[审计](../../features/ui-system/audit.md)                                         |
| B 设置/确认/选择/错误弹窗            | 共享连续磨砂壳/受色内衬、原生弹层；内联确认/选择器可键盘操作  | [主题 B](cinnaglass/ui-system.md#b-任务与功能弹窗)、[统一计划](../../features/ui-system/ui-system.md)         |
| B 日历/时钟/完整聊天/照片/心愿通用壳 | 已共用 B 壳；照片保留内容纸框，提醒/心愿明确本机能力          | [主题 B](cinnaglass/ui-system.md#b-任务与功能弹窗)、[交互规则](interaction.md)                                |
| C 日记                               | 棕皮旧纸、手写风文字、图文随纸翻页                            | [主题 C](cinnaglass/ui-system.md#c-专属物件-ui)、[timeline 功能](../../features/timeline.md)；本 session 冻结 |
| 登录/重置/大厅/加载与错误页          | 真实书房素材与同源材质；加载/错误/重试保持账号与世界链路      | [主题边缘页面](cinnaglass/ui-system.md#边缘页面与公共规则)、[审计](../../features/ui-system/audit.md)         |

每项采用 UI 的图片、特征、交互/动画与来源在上述常驻主题/交互文档中维护。全局 Monet 不能只管理 concept 而忽略这些链接。

## 手机与低高度布局

当前手机实装的图文、横屏播放器、聊天会话收纳和键盘行为见 [手机版规范](mobile.md)。8 种尺寸的正式组件回归由 [独立 Feature](../../features/mobile-ui.md) 管理，真机验收另列。

## 共同使用模型

场景中的物件是功能入口，导航提供常用功能；A 浮窗支持轻量陪伴操作，B 处理聚焦任务，C 保留物件自身形态。点物件不必然属于 C：音乐浮窗属于 A，时钟弹窗属于 B。具体热点见 [物件文档](../props.md)。

关闭、草稿、焦点、键鼠/触屏和多浮窗避让遵循 [interaction.md](interaction.md) 中明确区分的当前行为与目标。状态表达对应真实数据；未实现播放、保存等行为不能画成成功。

## 当前设计边界

导航是 A 基准；B 连续磨砂外壳与随时辰阅读内衬已批准，现役 A/B 与边缘页面已本地实装；世界设置入口按既定决定暂缓。日记冻结，整体 UI 动画后置；已批准的环境圆钮滑动和展开动效单独接入。[decisions.md](cinnaglass/decisions.md) 只记录 UI 当前决定，位于本项目 `ai/design_system/uiux/`，不放技能目录。

新研究与比稿在 [视觉工作台](../codex-visual/README.md)，旧研究留在 [历史目录](research/README.md)，未来概念及否决方向从 [concept](../concept/README.md) 查。日常任务报告只在 session 汇报。用户随时看当前 UI 就打开本页；HTML 为特定交互预览，不能替代持续更新的 Markdown。
