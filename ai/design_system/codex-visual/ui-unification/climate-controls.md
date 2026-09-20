# 植物园配色与环境入口 · 待确认

[打开可操作 mock](climate-controls.html) / [当前正式规范](../../uiux/cinnaglass/ui-system.md) / [产品光影理念](../../design-system.md#光影之间的信息)

## 使用与边界

顶部可切换植物园/书房、当前图标版/双入口/合并入口、三时辰材质与金亮信纸示意。聊天和音乐导航可反复开关；设置打开实际 TaskDialog。此页使用真实 Rail、ChatCard、MusicMini、TaskDialog 与公共材质，消息为本页演示数据，音乐为本机合成音景，不调用账号写入。天气选择不请求定位；植物园底图固定，切换时辰仅改变 UI 配色；书房则切换已有时辰原画。

植物园来源：[arts 原图](../../../../arts/rooms/thumbs/garden.png)。它仍是概念图，不把放大后的画质或植物园运行时光照视为已完成验收。当前正文不透明内衬保持原配方，检验它与紫蓝天空、橙金夕照、深绿植物的兼容。

## 入口方向

**推荐双入口**：常驻「时辰 / 天气」类别文字和当前值；时辰用时钟、天气用云作为类别图标，太阳/月亮只在带文字的具体选项中出现。点哪个直接展开对应三选项，两个菜单互斥；再点触发钮或 Esc 收起，Esc 返回原入口。

![植物园上的真实 UI 与双入口](climate-controls/garden-split.png)

**合并入口**：一个「环境」按钮，二级文字显示时辰与天气；面板同时列两组。占地更少，但识别与查找具体组仍多一步视觉扫描。页面保留当前版，便于原地切换比较。

![合并入口与两组选项](climate-controls/garden-combined.png)

**hover**：候选触发按钮直接复用导航 `.rail-btn` 的径向暖光、边缘、图标辉光和键盘焦点；仅在本候选 CSS 中调整按钮宽高与文字布局，尚未替换正式 Ambience。

![导航同源的天气 hover](climate-controls/garden-hover.png)

![直接展开天气选项](climate-controls/garden-weather.png)

![窄屏入口与天气选项](climate-controls/garden-mobile.png)

## 配色与信息示意

![现有任务壳在植物园底图上的配色](climate-controls/garden-dialog.png)

![金亮信纸局部发光示意：仅表达设计理念](climate-controls/garden-letter.png)

![真实夜晚书房底图上的金亮信纸示意](climate-controls/study-night-letter.png)

产品理念已登记，信纸的形态、亮度与真实消息联动仍待确认；勾选只是模拟有新信息，不算正式通知实现。评估时看大面积阅读底是否协调、暖金信息是否清楚但不过曝；不改变日记和现有场景光照。

## 设计依据

用户明确指出太阳/月亮相似造成误判，本方案用常驻文字明确分类，再用不同类别图标辅助；[NN/g 图标可用性研究](https://www.nngroup.com/articles/icon-usability/) 同样建议为存在歧义的图标提供文字标签。减少点击不是隐藏名称，而是让用户从正确入口直接到需要的选项。

本页是候选档案；当前正式产品的 toggle 修复见 [交互规范](../../uiux/interaction.md)，其余候选在用户选定后才晋升 uiux。
