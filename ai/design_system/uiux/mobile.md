# Cinnaglass · 手机与低高度布局

> 2026-09-21 · 当前产品布局。由 UI Tailor 实施，Monet 同 agent 视觉自审；真机输入法与性能仍待验收。
> [UI/UX 地图](uiux.md) / [交互](interaction.md) / [主题](cinnaglass/ui-system.md) / [Feature 与测试](../../features/mobile-ui.md)

使用既有磨砂、时辰受色和真实书房原画。以下来自正式组件的隔离运行，消息与资料为演示数据，背景为原画，不包含实时 Pixi 角色；不是整条账号/联网链路的截图。场景与日记的几何和素材没有改动。

## 房间与陪伴浮窗

![390×844 房间：顶部双圆与纪念卡、底部导航；注入顶部 47px 与底部 34px 安全区](cinnaglass/mobile-verification/room-safe-area.png)

窄于 768px 或矮于 600px 时采用底部导航，按钮与内容避开设备安全区。纪念卡靠右上，天气展开时让位；聊天或音乐展开后仍沿既定规则互斥。信纸继续使用原有信息语言，聊天展开时让位，未读状态不因此清除。

![390×844 聊天窄窗：沿用已批准透明度，输入与导航保持间距](cinnaglass/mobile-verification/compact-chat.png)

触屏打开聊天不主动唤起软键盘，点输入框开始输入。手机文本输入至少 16px；允许用户缩放。关闭或缩放不应清除草稿，切换会话仍遵循原有草稿规则。

![667×375 横屏播放器：进度与播放键并排，隐藏重复迷你条，导航仍可操作](cinnaglass/mobile-verification/music-landscape.png)

横屏把活动浮窗放在右侧，左上保留环境入口。播放器展开时只保留完整控制面板，点底部音乐入口可收起；播放状态与面板开关独立。沿用环境控件既定滑动/减动效，不新增全局动画参数。

**2026-09-29 本地已改为底部托盘（待看样）**：上面三张是改版前的样子。现在手机上聊天、音乐、工具、房间都从底边升起托盘，半高停在对方书下，对方的脸和上身完整可见；导航浮在托盘上面，拖手柄或甩一下收起；音乐没有悬浮条，托盘可拉满看歌词和歌单；横屏时托盘是右侧一列，停在导航上方。竖屏手机上的任务窗也从底边升起。方案、动图和待定项见 [UI 动效与手机托盘](../codex-visual/ui-motion/ui-motion.md)，定稿后替换本页截图。

## 聚焦任务与输入

![390×844 完整聊天：会话列表按需展开，长频道名换行，阅读与发送保留空间](cinnaglass/mobile-verification/chat.png)

会话入口为可展开按钮，选择后收起并返回入口焦点。Esc 优先关闭表情或会话列表，下一次才关闭聊天。标题和输入固定，消息列表独立滚动；横竖屏切换保留当前草稿。

![390×844 设置：连续磨砂壳与阅读内衬，标题/关闭固定，正文单独滚动](cinnaglass/mobile-verification/settings.png)

设置、日历、时钟、照片与心愿沿用同一 B 壳；安全区和可见视口共同限制尺寸。登录/重置入口在可见区域内滚动，重置密码的已登录表单仍需有效恢复会话实测。

键盘适配由 `use-ui-viewport.ts` 发布可见高度、偏移与底部遮挡量，`mobile-layout.css` 消费。输入时暂时隐藏场景上的次要控制，让输入区处于可见区域；键盘收起恢复原布局。双指缩放交给浏览器，不能误判为键盘。

## 来源与验收

- 实现：[共享移动样式](../../../src/themes/cinnaglass/ui/mobile-layout.css)、[可见视口](../../../src/themes/cinnaglass/ui/use-ui-viewport.ts)、[完整聊天](../../../src/themes/cinnaglass/chat/chat-hub.tsx)。
- [可操作真实组件样板](../../../scripts/fixtures/mobile-ui.html?screen=room)；可将 `screen` 换为 `compact-chat`、`music`、`chat`、`settings` 等，完整列表在 Feature。
- 截图由 [Playwright 回归](../../../scripts/check-mobile-ui.mjs) 生成，精选图保存在本页链接的 `mobile-verification/`；整批截图留临时目录，不逐轮写报告入库。
- 手机仿真只证明浏览器布局与对应交互，合成可见视口事件只证明适配逻辑。Safari/iOS/Android 真机输入法、地址栏与性能继续单列验收。
