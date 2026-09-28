# Cinnaglass · 当前主题规范

> [UI/UX 总览](../uiux.md) / [整体设计](../../design-system.md) / [当前决定](decisions.md) · 2026-09-20。

**[打开全局实景预览](../../preview.html#ui)**。A/B 与账户、大厅已按用户批准的导航母材质完成本地迁移；下图为实际组件与真实房间素材，账号、消息、照片列表用隔离演示内容。它们展示当前实现，独立 Monet 复核不代替用户后续体验反馈。C 日记冻结，新的 UI 动画体系后置。

## A 场景悬浮 UI

![暮色：正式双圆入口、导航、聊天与音乐；真实组件和书房原画，隔离演示内容](environment-verification/scene-twilight.png)

![黄昏：暖灰褐阅读底随场景时辰变化](environment-verification/scene-golden.png)

![夜晚：双圆收起，暖金信息与操作保持语义](environment-verification/scene-night.png)

![窄屏：左上双圆展开，底导航与音乐保留操作空间](environment-verification/weather-mobile.png)

**同源材质**：固定 [frost.webp](../../../../public/ui/nav/frost.webp)、实时背景模糊与艺术化边光。导航外观保持原配方；A/B 读取其三时辰的 tint/top/cold/rim。纹理不随打开或渲染随机变化，边缘不做真实场景反射；共同光环境仍是后续工作。

**聊天窄卡更透（2026-09-20 用户要求）**：窄卡是悬浮物，不承担细读——外壳 `--ui-alpha` 从共享 0.65 降到 0.36，阅读内衬改为随时辰内衬色的 46% 半透（`color-mix`），气泡保留 1px 线与 `#ffffff12` 底；减少透明效果、系统减透明或不支持背景模糊时内衬回实底。夜晚/黄昏实景检查文字可读，暮色未实景看；上方场景图中的窄卡仍是旧的 0.65 材质，待下次统一重截。音乐条、纪念卡与天气面板保持 0.65，是否跟进待用户决定。参数在 [窄卡样式](../../../../src/themes/cinnaglass/shell/chat-card.css)。

**停靠与操作**：桌面左下聊天、右下音乐、左上天气、右上纪念卡；窄/矮屏聊天与展开音乐互斥，打开音乐能恢复已隐藏的 widget。A 不打开全屏遮罩；天气菜单 Esc 返回触发钮。聊天支持输入法，完整操作展开到 B；姓名不冒充在线状态，纪念日来自实际世界数据。

![展开音乐：同源外壳与稳定阅读底；进度、播放和音量对应实际音频](unification-verification/music.png)

**声音与天气真实边界**：音乐是四组 WebAudio 合成音景，没有歌曲文件，也没有双人同步。播放/暂停、进度/拖动、曲目、循环方式与音量独立于展开/隐藏，隐藏不销毁音频。天气手动模式不显示虚构温度；实况加载、成功和不可用明确区分。时间提醒只在本机保存，不发系统通知。

来源：[公共材质](../../../../src/themes/cinnaglass/ui/ui-system.css)、[导航说明](../../../features/navigation-glass.md)、[环境接口](../../../../src/themes/cinnaglass/ui/use-ui-environment.ts)、[停靠布局](../../../../src/themes/cinnaglass/shell/shell-layout.css)、[天气](../../../../src/themes/cinnaglass/shell/ambience.tsx)、[聊天窄窗](../../../../src/themes/cinnaglass/shell/chat-card.tsx)、[音乐](../../../../src/themes/cinnaglass/music.tsx)、[音频生命周期](../../../../src/themes/cinnaglass/use-music-playback.ts)、[场景反馈](../../../../src/themes/cinnaglass/room/room-overlays.css)。

### 时辰 / 天气与新来信

用户已选定 A「双圆收纳」并接入正式 Ambience；夜晚金亮信纸已接现有消息已读链路。[植物园兼容与暮色信纸看样](../../codex-visual/ui-unification/climate-controls.html) 复用同一套组件；植物园仍是固定概念背景。暮色新增玫瑰金/灰紫纸面为本地适配版本，待用户视觉反馈，细节图保留在比稿区。

![双圆天气：展开后只有类别、状态与三个符号选项](environment-verification/weather-open.png)

![天气悬停：复用导航暖金辉光与焦点反馈](environment-verification/weather-hover.png)

**A 双圆收纳（已采用并实现）**：类别固定为时钟/云，角标显示当前模式；桌面距左 38px、上 24px，窄/矮屏为 12px。展开宽 216px；选项是 52px 圆钮、间距 8px，固定磨砂纹理、细反光边与滑动暖金透镜。名称只在 hover/键盘聚焦时提示，无障碍名称始终保留。实况用定位符号，与晴/雨区分。

两个面板互斥，再点当前入口、点外或 Esc 关闭；Esc 返回入口，Tab 离开控件也收起且不抢新焦点。点击、横向拖动超过 8px 或方向键循环选择；原偏好保存与 `useWeather` 不变。展开状态短词显示「定位中… / 实况不可用 / 晴 22°」等真实值，手动天气不造地点或温度；失败可切晴/雨。旧云/雪偏好不冒充实况、不误亮第一项，仍可切到当前三选项；不新增雪景能力。

桌面高度 600–850px 时面板向入口右侧展开，避开竖导航；其余贴在下方。正常面板没有滚动条，仅极矮屏内衬超高时细条纵向滚动，装饰外壳不滚动。

![黄昏双圆材质](environment-verification/circles-golden.png)
![暮色双圆材质](environment-verification/circles-twilight.png)
![夜晚双圆材质](environment-verification/circles-night.png)
![正式组件的选中透镜滑动](environment-verification/selection-motion.gif)

**已采用的局部动效**：选中透镜 360ms、`cubic-bezier(0.22, 0.8, 0.2, 1)`，连续/反向输入从当前位置续接；面板展开 180ms 淡入与 5px 上移归位，收起即时。系统减少动态效果时禁用这组动效。仅环境控件采用，不提前定义全局动画体系。实现：[Ambience](../../../../src/themes/cinnaglass/shell/ambience.tsx)、[局部样式](../../../../src/themes/cinnaglass/shell/ambience.css)；[原比稿与 B 备选](../../codex-visual/ui-unification/climate-orbits.md) 保留为设计来源。无新增天气后端或植物园场景。

![夜晚金亮信纸：真实房间组件与隔离的未读测试数据](environment-verification/letter-night.png)

![夜晚信纸细节：暖金纸面、细线信封与克制外发光](environment-verification/letter-night-detail.png)

信纸保留批准稿的折角圆角、线性信封、金色渐变与两层柔光；文字保持深色，不闪烁、不循环呼吸。黄昏减弱外发光。暮色适配及精确色值看 [信纸样式](../../../../src/themes/cinnaglass/shell/sunlit-letter.css)，不是实时场景采光。

只有世界会话内对方有效未读消息触发信纸；点击打开聊天并沿现有已读流程处理，已读后消失，新未读再次出现。删除、发送失败与待发送消息不伪造来信；读状态保存失败仍保留未读。桌面纪念卡向下避让；宽度 ≤1100px 或高度 ≤700px 且播放器展开时，两张提示卡暂时收起，未读点保留，播放器收起后恢复。小屏有来信时优先信纸。实现：[SunlitLetter](../../../../src/themes/cinnaglass/shell/sunlit-letter.tsx)、[未读判断](../../../../src/themes/cinnaglass/shell/use-world-chat-bubble.ts)、[入口编排](../../../../src/pages/WorldPage.tsx)。

## B 任务与功能弹窗

**连续磨砂壳 + 圆角不透明阅读内衬**。标题和页脚共享外壳，正文滚动；黄昏暖灰褐、暮色灰紫、夜晚深暖灰。照片保留拍立得纸框，表单和通用壳不再使用旧纸/苔绿底。

![暮色设置：灰紫内衬；减少透明效果替代无效的旧卡片配色](settings-verification/twilight.png)

![黄昏设置：暖灰褐内衬与同源磨砂壳](settings-verification/golden.png)

![夜晚设置：深暖灰内衬与暖金动作](settings-verification/night.png)

![窄屏设置：标题、关闭与底部动作保留，正文独立滚动](settings-verification/mobile.png)

- 唯一 A/B 参数真源：[ui-system.css](../../../../src/themes/cinnaglass/ui/ui-system.css)。默认宽 488px，内容宽窗 920px，视口边距至少 12px；外圆角 26px、小屏 22px，内衬 18px、小屏 14px。动作点击区至少 44px；窄屏日历保持七列，日期格宽度随列缩小、高度 44px，不宣称每个日期格均 44×44。
- [TaskDialog](../../../../src/themes/cinnaglass/ui/task-dialog.tsx) 统一原生顶层、背景不可操作、标题初始焦点、最上层 Esc、点外关闭与焦点返回。光箱先关自己；编辑/表情选择器先消费 Esc。草稿生命周期仍按各任务定义。
- 设置保留真实昵称/改密/退出链路，失败可重试；头像仅本机保存，键盘可替换/调整/移除；外观即时生效。新增「减少透明效果」，系统偏好与不支持模糊时也有稳定底色。旧 glassStyle 存储只作未迁移 C 兼容，不再显示无效选项。

![完整聊天：房间对话优先，好友与私信收进可展开导航](unification-verification/chat.png)

![表情选择器：窄屏自适应网格，使用同源阅读底；表情内容保留原色](unification-verification/picker-mobile.png)

![好友解除：内联确认，可取消并返回原触发位置](unification-verification/friends-confirm-mobile.png)

聊天保留历史加载、重试、编辑/删除、反应、贴纸和好友能力；按钮使用线性图标。输入法确认不发送/搜索，失败内容可恢复；贴纸删除和好友解除需显式确认。

![日历：纪念日与本机约会记录，七列日期可键盘操作](unification-verification/calendar.png)

![时间提醒：明确本机存储与没有通知的能力边界](unification-verification/clock.png)

![窄屏时间提醒：时间输入独占一行，避免 AM/PM 被裁切](unification-verification/clock-mobile.png)

![照片墙：统一任务外壳内保留纸质照片内容，可打开顶层光箱](unification-verification/photos.png)

![窄屏照片墙：单列纸框与可键盘打开的光箱](unification-verification/photos-mobile.png)

![心愿单：完成状态与添加入口，明确只保存在本机](unification-verification/wishes.png)

![世界设置：组件已迁移，保存区固定在正文之外；正式入口仍暂缓](unification-verification/world.png)

来源：[设置](../../../../src/themes/cinnaglass/settings.tsx)、[日历/提醒](../../../../src/themes/cinnaglass/calendar.tsx)、[完整聊天](../../../../src/themes/cinnaglass/chat/chat-hub.tsx)、[选择器](../../../../src/themes/cinnaglass/chat/emote-picker.tsx)、[好友](../../../../src/themes/cinnaglass/chat/friends-page.tsx)、[集合入口](../../../../src/themes/cinnaglass/surfaces/object-surfaces.tsx)、[照片](../../../../src/themes/cinnaglass/surfaces/photo-wall.tsx)、[心愿](../../../../src/themes/cinnaglass/surfaces/wishlist.tsx)、[世界设置](../../../../src/themes/cinnaglass/world-settings.tsx)。交互细节见 [常驻交互规范](../interaction.md)。

## C 专属物件 UI

![当前棕皮旧纸日记：真实组件、暖褐文字、照片纸角与羽毛笔](journal-room-object/book-verification/design-content-night.png)

![实际图文随纸翻过的动态示例](journal-room-object/turn-verification/live-single.gif)

棕皮、旧米纸、叠页与手写风墨色，文字与图片随真实纸面一起翻动。桌面双页、小屏单页；允许遮挡角色，阅读时雨继续。拿起/收回与羽毛笔交互待做。

[原素材](../../../../arts/ui/journal/) · [运行时素材](../../../../public/ui/journal/) · [journal-room.css](../../../../src/themes/cinnaglass/journal/room.css) · [journal-turn.css](../../../../src/themes/cinnaglass/journal/turn.css) · [功能与翻页机制](../../../features/timeline.md)。

## 边缘页面与公共规则

网站图标（2026-09-27 用户选定试用）：**A5「清透香槟」**，沿用原 A 厚玻璃心形与通透折射，改为香槟金、粉暖光与清蓝光，背景简化并提升整体明亮度。[当前原稿](../../../../arts/branding/amber-glass-heart.png) 由 imagegen 基于原 A 编辑；浏览器使用 [48px PNG](../../../../public/favicon-48.png) / [16、32、48px ICO](../../../../public/favicon.ico)；iPhone 使用不透明 [180px Apple Touch PNG](../../../../public/apple-touch-icon.png)，由系统裁圆角。入口与缓存版本 `amber-a5` 登记在 [index.html](../../../../index.html)，不另建图标文档。

![登录：真实书房原画与同源任务阅读底](unification-verification/login-desktop.png)

![手机登录：字段与动作自然换行，保留可读字号](unification-verification/login-mobile.png)

![重置密码：沿用真实账号链路，成功与失败明确区分](unification-verification/reset-desktop.png)

![大厅：真实场景预览，加载/重试/创建/进入按真实世界状态显示](unification-verification/lobby-twilight.png)

![路由加载：同源场景与明确等待状态](unification-verification/loading-desktop.png)

来源：[登录](../../../../src/pages/LoginPage.tsx)、[重置](../../../../src/pages/ResetPasswordPage.tsx)、[路由加载](../../../../src/pages/ProtectedRoute.tsx)、[大厅](../../../../src/themes/cinnaglass/lobby.tsx)、[入口样式](../../../../src/themes/cinnaglass/entry.css)。场景模块加载和失败也提供可读反馈与重新加载入口。

共用米白文字、暖金操作、身份蓝/粉、明确错误/成功语义；局部兼容旧字段名时在 A/B 宿主范围重绑，避免旧 `.paper` 的棕色文字漏入新内衬。旧 `--cg-*`、无消费者面板原子、旧大厅和 LoginBackdrop 已退役；日记依赖的 `.paper/.craft`、素材和交互保持原状。

**验证边界**：本地浏览器验证覆盖三时辰、桌面/窄屏/矮屏、最上层关闭、焦点与主要失败恢复；演示数据不代表线上内容。真实手机软键盘、OS 缩放和低端设备性能仍需真机验收。当前已有动效保留，新动画体系另做；普通回归报告只写 session。
