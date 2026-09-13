# UI 现状审计 · 2026-09-11

> 配套 [统一设计与计划](ui-system.md)。审计对象为当前本地工作树，不推断线上部署状态。
> 扫描 App 路由、全部 src UI 文件、样式导入/变量、功能入口和现有设计文档；对代表界面做隔离 Chrome 实景检查。日记只识别依赖边界，没有打开或评审其内部。

## 1. 当前不是一套 UI 材质

| 材质来源                                    | 当前消费者                                   | 事实                                                                                  |
| ------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `shell/navigation-glass.css` 的 `--nav-*`   | `.rail/.rail-pop/.rail-label`                | 新导航独立作用域、固定细纹、轻模糊、时辰预设边光；已获用户认可                        |
| `cinnaglass.css:23–43` 的 `--cg-*`          | 天气、纪念卡、音乐迷你条、聊天窄卡           | `--cg-panel` 接 `--craft-shell`，dense 是固定灰绿底；18px blur；没有导航细纹/局部边缘 |
| `--shell-* / --glass-*`                     | 完整聊天、展开音乐、登录/大厅及其他旧组件    | 继承早期随 mood 的外壳体系，仍有蓝/紫渐变、旧控件和纸面文字重映射                     |
| `materials.css:18–75` 的 `--craft-*` 及覆盖 | `.stage .modal.glass/.collection-surface` 等 | 将整窗变为 #D8CDBA 暖灰纸、苔绿边，取消 backdrop-filter；对多个功能强制同样覆盖       |
| 内联固定样式                                | `room/room-scene.tsx` 的状态胶囊/气泡等      | 独立灰紫底、蓝粉/绿点，不随导航配方                                                   |

这解释了为什么修改某一个 token 后，侧栏、浮窗、弹窗不会一起变化。`main.tsx` 加载 `cinnaglass.css`；后者 `@import materials.css`；导航组件另 import 专属 CSS；功能组件再挂各自的 `<style>`。必须按消费者迁移，不能只调整加载顺序掩盖冲突。

## 2. 入口与组件地图

除 pages 外，下表路径相对 `src/themes/cinnaglass/`。A/B/C 的目标含义见主计划；“建议归属”不是已完成迁移。

| 界面                     | 当前入口与主要文件/选择器                                         | 建议归属与处置                                                         |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 导航与房间/工具菜单      | `shell/rail.tsx:96`；`.rail/.rail-pop`                            | A 基准；保留五入口与已认可视觉                                         |
| 右侧房间把手             | `shell/rail.tsx:178`；`.room-handle`；WorldPage 回调为空          | A；单房间阶段收起无动作把手，房间选择中的锁定项准确表达不可进入        |
| 灯光/天气                | `shell/ambience.tsx:34`；`.amb-pill/.amb-panel`                   | A；同源材质、开关语义、定位/关闭/键盘与触屏                            |
| 纪念卡                   | `shell/floaters.tsx:25`；`.moment-card`                           | A；材质、数字层级、隐藏/恢复与窄屏避让                                 |
| 音乐折叠/展开            | `shell/floaters.tsx:77` → `music.tsx`；`.music-bar/.mp.glass`     | A 两态；一个音频状态源、分别提供播放与展开控制                         |
| 聊天窄卡                 | 导航聊天 → `shell/chat-card.tsx`；`.chat-card/.cc-*`              | A；外壳迁移，内容底保持可读，状态和输入反馈规范化                      |
| 头顶状态/气泡            | `room/room-scene.tsx:155` 起，WorldPage 注入                      | A 场景锚定变体；不扩成 C；状态真实性依赖 Presence 功能                 |
| 完整聊天                 | 窄卡“展开完整聊天”→ `channel-screen.tsx`；`.chsc/.chsc-scrim`     | B；收敛大窗与频道栏，保留聊天功能链                                    |
| 好友/DM                  | 完整聊天导航 → `friends-page.tsx`；`.fr-*`                        | B 旧入口；按产品计划收起，真实数据层保留                               |
| Emoji/贴纸/导入/消息操作 | `emote-picker.tsx`；`.ep-*`，消息 `.abar`                         | 附属层，跟随 A/B 宿主；共用定位、选中、错误和关闭规则                  |
| 设置                     | 导航设置 → `settings.tsx:199`；`.modal.mini.glass`                | B 首个样板；清理全窗旧纸与彩色按钮混用，同时修正假保存状态             |
| 世界设置                 | WorldPage:519 挂载 `world-settings.tsx`，没有找到 navigate 入口   | B；已有真实保存，恢复入口而非删除                                      |
| 日历/纪念日              | 工具 → `calendar.tsx:195`；`.modal/.cal-*`                        | B；日期/表单/状态统一，纪念日来源需合并                                |
| 时钟/闹钟                | 挂钟 → `calendar.tsx:325`；`.modal/.alarm`                        | B；闹钟列表能编辑不代表到时提醒已经接通                                |
| 照片墙/原图              | 相框或工具照片 → `screens.tsx`；`.collection-surface/.pw-*/.pola` | 暂列 B 内容界面；保留照片原色与原图浏览，专属相册形态另决策            |
| 心愿单                   | 许愿罐 → `screens.tsx`；`.collection-surface/.wish`               | 暂列 B；本地列表与控件语义统一，不在本轮做罐子实体 UI                  |
| 登录/忘记密码            | `/login` → `pages/LoginPage.tsx/.module.css`                      | B 的账户页面形态；旧 SVG 背景仍在用                                    |
| 重置密码                 | `/reset-password` → `pages/ResetPasswordPage.tsx`                 | B 的账户页面形态；保留真实重置链                                       |
| 大厅/无世界/创建/错误    | `/` 未进入房间 → `lobby.tsx`，WorldPage 状态                      | B 的入口页面形态；大厅自己绘制 IslandArt，不能漏掉 loading/empty/error |
| 路由加载                 | `pages/ProtectedRoute.tsx:27`                                     | 与账户页共用状态规范，避免额外浅蓝孤立画面                             |
| 日记                     | `screens.tsx` 的 diary 分支与 `journal-*`/`diary.css`             | C；本 session 冻结，不列入改造工作                                     |

当前双入口路由：`WorldPage.tsx:337–350`。唱片机/挂钟/照片的入口事实说明“从活物件点击”不等于“专属拟物 UI”。

## 3. 主要问题及优先级

P1 表示影响本次统一的正确性/核心操作；P2 表示迁移时须处理的次级一致性问题。这里是证据清单，执行任务仍归 TODO。

| 优先级 | 问题与证据                                                                                                                          | 处理建议                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P1     | 五路材质叠存；导航与固定灰绿浮窗、旧纸设置同时出现                                                                                  | 先确定表面类型和消费者，再迁公共值                                    |
| P1     | 通用遮罩/弹窗 z20/21；聊天大窗 z22/23；A 为 z35–40。实景设置打开后 A 仍盖在上面，导航命中测试仍可点                                 | 建统一弹层和焦点管理，B 阻止 A/场景操作；不逐文件继续抬 z-index       |
| P1     | 设置无 dialog/aria-modal；隐藏 modal 仍 `opacity:0; visibility:visible; display:flex; inert:false`，按钮 tabIndex=0，可编程聚焦成功 | 统一显隐、焦点限制、Esc 与回焦；隐藏控件须 inert/卸载                 |
| P1     | 音乐迷你条主按钮只切 open；进度固定 34%；封面转动也以 open 为条件（floaters.tsx:77–116,178–181）                                    | 音频引擎、视图显隐分开；真实播放/进度驱动；隐藏 widget 后导航应能恢复 |
| P1     | `settings.tsx:165–174` savePw 只 setSaved；“绑定邮箱”只改本地 profile；应用锁无校验消费                                             | 接通真实功能或收起占位，禁止假成功文案；功能扩展另立范围              |
| P1     | 390×844 实测音乐条宽437、x=-84，且与底导航重叠；天气与纪念卡重叠                                                                    | 定义停靠区/可用宽度，窄屏折叠与展开互斥                               |
| P2     | 世界设置有 DB 保存，但从当前界面找不到入口                                                                                          | 设置中恢复“我们的小世界”                                              |
| P2     | Calendar `ANNIV` 固定日期；MomentCard 使用世界纪念日                                                                                | 共用世界事实，避免两处不同倒计时                                      |
| P2     | Presence 固定在线、消息头像常亮绿点；闹钟只有编辑列表；“一起听”未实现双人同步                                                       | 以实际能力命名和显示状态，数据功能接通单独排                          |
| P2     | 小按钮、span 开关、div 会话/心愿项；消息操作只 hover 显示                                                                           | 统一语义控件、focus-visible、触屏入口；不等待动画阶段                 |
| P2     | 字体、彩色图标底、蓝紫控制轨道、头像环与暖金导航混杂                                                                                | 通用控件与身份/状态色分开，统一尺寸/字重/描边                         |
| P2     | 天气文档写“与现实脱钩”，代码存在 geolocation → Open-Meteo；失败回退“多云22°”未区分实况失败                                          | 文档按事实描述，设计中补 unavailable/fallback 语义                    |

额外工程阻塞：`pnpm exec tsc --project tsconfig.app.json --noEmit --pretty false --incremental false` 当前失败，唯一输出为 `shell/chat-card.tsx(10,15): TS2305 model has no exported member Msg`。本轮未修改。

## 4. 清理时不能踩的依赖

| 对象                                              | 当前证据                                                             | 结论                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `scene.tsx`                                       | LoginPage:8、ResetPasswordPage:10 import                             | 仍在用，待账户背景替换后清；旧 TODO “lobby 还用则保留”已不准确 |
| `rooms.ts`                                        | WorldPage:24 仍用 `owLoad`；其余旧房间/语音 mock 无 src 消费         | 先迁 loader，再查构建/脚本引用，不能整文件先删                 |
| `channel-screen.tsx/friends-page.tsx`             | 从聊天窄卡展开可达；读真实聊天/好友/DM                               | 改入口与布局，保留消息操作和数据功能                           |
| `world-settings.tsx`                              | 挂载，有真实保存链                                                   | 修入口，非死文件                                               |
| `image-slot.js`                                   | main.tsx 副作用 import；设置头像使用                                 | 仍在用；共享组件保留                                           |
| `--cg-* / --glass-* / materials.css`              | 多个实际消费者，含日记共享区域                                       | 渐进迁移；本轮不删材质文件、不改 C                             |
| widget 注册与持久化                               | 初始 days/minimap/memory/ambient/lighting 等旧 key 与实际 JSX 不一致 | 整理消费者与存储兼容，别直接抹用户偏好                         |
| `src/types/database.ts`、`timeline_3d_posts.html` | 已知模板/独立实验候选                                                | 真正删除前搜索源码、脚本和构建引用；不属于 UI 换肤前置         |
| `journal-book.tsx` 及其他旧书本文件/资产          | 属 C 历史实现                                                        | 即使无引用也不在本 session 清理                                |

文档需去除的歧义：早期底部胶囊/自动淡出提案、全窗近白→石墨的泛化规则、全局“纸恒白”与暖灰纸互相冲突、图4角色避让与当前日记规则冲突、热点轮廓/换图已否决、材质 token 必须全在单一 :root 的陈旧描述。历史稿保留并标注适用范围，不复制成新的生效真源。

复核已消失的旧项：`--accent-deep` 当前为 #2f9ad3，与 `--accent-orb` 尾色一致；`screens.tsx` 作者色使用变量。#268fbe 是独立的 `--shell-accent`，不能再把旧“双真源”当当前 bug。

## 5. 本轮验证与限制

- 本地服务：`http://localhost:5173/?enter=1`；隔离 headless Chrome，未改变用户已有浏览器会话。
- 源码与运行时联合核对导航三时辰材质；三档均使用同一纹理 URL、尺寸和偏移；晴雨不直接改导航边缘渐变。
- 实景尺寸：1440×900 的三时辰默认态、暮色晴/雨、天气展开/聊天、设置；390×844 的默认态。保存原始计算样式、几何和部分交互探针。
- 捕获 pageerror 为 0；这只覆盖本轮路径，不代表所有功能无错误。
- 对共享 REST 写入设置拦截（只允许 GET/HEAD/OPTIONS 与只读 feed RPC），本轮没有发生被拦截写请求。没有发消息/改密码/改共享资料/发布回忆；聊天文字/图片、设置输入值由临时浏览器 CSS 隐去，布局和材质保留。
- 隐藏焦点探针验证的是按钮可编程聚焦与 tabIndex=0；没有把这写成完整屏幕阅读器或逐项 Tab 验收。
- 未覆盖：新方案（尚未落码）、Safari、真触屏/软键盘、低端设备性能、真实花园/棋牌室、全状态对比度、双人后端联调、日记内部。全项目类型检查仍有上述 Msg 错误，不能称完整构建通过。

### 实景证据

证据目录：[audit-2026-09-11](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/runtime.json)。

| 证据                                                                                                                                                                                                                                                                         | 内容                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [夜晚](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/night-scene.png) / [黄昏](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/golden-scene.png) / [暮色](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/twilight-scene.png) | 当前同屏材质差异                                             |
| [悬浮组件](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/widgets-twilight.png)                                                                                                                                                                              | 导航、聊天、天气、音乐、纪念卡、状态胶囊同屏；敏感内容已隐去 |
| [设置](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/settings-twilight.png)                                                                                                                                                                                 | 暖灰纸窗与浮层/遮罩冲突；输入值已隐去                        |
| [窄屏](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/mobile-390.png)                                                                                                                                                                                        | 音乐越界与底导航重叠、顶部两卡重叠                           |

以上均为当前产品截图，不是拟议新设计稿。文字/头像隐去的空白不作为视觉缺陷。
