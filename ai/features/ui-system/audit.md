# UI 现状审计 · 2026-09-11

> 配套 [统一设计与计划](ui-system.md)。对象为当时本地工作树，不推断线上部署。扫描范围：App 路由、全部 src UI 文件、样式导入/变量、功能入口与设计文档，并对代表界面做隔离 Chrome 实景检查；日记只识别依赖边界。
> 2026-09-19 按当前 src 复核定位：漂移的行号改为函数名/选择器或已修正。

## 1. 当前不是一套 UI 材质

| 材质来源                                                                                                                   | 当前消费者                                           | 事实                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `shell/navigation-glass.css` `--nav-*`                                                                                     | `.rail/.rail-pop/.rail-label`                        | 独立作用域、固定细纹、轻模糊、时辰预设边光；已获用户认可                                              |
| `cinnaglass.css:23–43` `--cg-*`                                                                                            | 天气、纪念卡、音乐迷你条、聊天窄卡                   | `--cg-panel` 接 `--craft-shell`，`--cg-panel-dense` 固定灰绿底，`--cg-blur` 18px；无导航细纹/局部边缘 |
| `materials.css` `--craft-*`（`:root` :3–16）与覆盖块 `.stage :is(.modal.glass, .collection-surface)`（:18–70，全文 70 行） | `.stage` 内 `.modal.glass`、`.collection-surface` 等 | 整窗变 `#d8cdba` 暖灰纸、`#a8ab90` 苔绿边、`backdrop-filter: none`；多个功能被同样覆盖                |
| `--shell-* / --glass-*`                                                                                                    | 完整聊天、展开音乐、登录/大厅及其他旧组件            | 早期随 mood 的外壳体系，仍有蓝/紫渐变、旧控件和纸面文字重映射                                         |
| 内联固定样式                                                                                                               | `room/room-scene.tsx` 状态胶囊/气泡                  | 独立灰紫底、蓝粉/绿点，不随导航配方                                                                   |

这解释了改一个 token 后侧栏、浮窗、弹窗为何不一起变。加载链：`main.tsx` → `cinnaglass.css` → `@import './materials.css'`（:1），导航另 import 专属 CSS，功能组件再挂各自 `<style>`。必须按消费者迁移，不能只调加载顺序掩盖冲突。

## 2. 入口与组件地图

除 pages 外，下表路径相对 `src/themes/cinnaglass/`。A/B/C 含义见主计划，"建议归属"不是已完成迁移；通用 A/B 要求见计划 §3/§4，此处只记组件独有的处置要点。行号为 2026-09-19 复核值。

| 界面                     | 当前入口与主要文件/选择器                                                    | 建议归属与处置                                           |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| 导航与房间/工具菜单      | `shell/rail.tsx` `Rail()` :44（`.rail/.rail-pop` :107 起）                   | A 基准；保留五入口与已认可视觉                           |
| 右侧房间把手             | `shell/rail.tsx` `RoomHandle()` :178；`WorldPage.tsx:490` 回调为空           | A；单房间阶段收起无动作把手，锁定房间项须表达不可进入    |
| 灯光/天气                | `shell/ambience.tsx` `Ambience()` :30；`.amb-pill`（:40）、`.amb-panel`      | A                                                        |
| 纪念卡                   | `shell/floaters.tsx` `MomentCard()` :21；`.moment-card`                      | A；注意数字层级与窄屏避让                                |
| 音乐折叠/展开            | `shell/floaters.tsx` `MusicMini()` :66→`music.tsx`；`.music-bar/.mp.glass`   | A 两态；一个音频状态源，播放与展开分开                   |
| 聊天窄卡                 | 导航聊天→`shell/chat-card.tsx`；`.chat-card/.cc-*`                           | A；内容底须可读                                          |
| 头顶状态/气泡            | `room/room-scene.tsx` 气泡 :155、状态胶囊 :236                               | A 场景锚定变体；不扩成 C，真实性依赖 Presence            |
| 完整聊天                 | 窄卡"展开完整聊天"→`channel-screen.tsx`；`.chsc/.chsc-scrim`                 | B；收敛大窗与频道栏，保功能链                            |
| 好友/DM                  | 完整聊天导航→`friends-page.tsx`；`.fr-*`                                     | B 旧入口；收外壳，留数据层                               |
| Emoji/贴纸/导入/消息操作 | `emote-picker.tsx` `.ep-*`、消息 `.abar`                                     | 附属层，跟随 A/B 宿主                                    |
| 设置                     | 导航设置→`settings.tsx` `SettingsScreen()` :144；`.modal.mini.glass`（:200） | B 首个样板；清旧纸与彩色按钮混用，修正假保存             |
| 世界设置                 | `WorldPage.tsx:519` 挂载 `world-settings.tsx`，无 navigate 入口              | B；已有真实保存，恢复入口而非删除                        |
| 日历/纪念日              | 工具→`calendar.tsx` `CalendarScreen()` :102；`.modal/.cal-*`                 | B；纪念日来源须与世界设置合并                            |
| 时钟/闹钟                | 挂钟→`calendar.tsx` `ClockScreen()` :283；`.modal/.alarm`                    | B；能编列表≠到时提醒已接通                               |
| 照片墙/原图              | 相框或工具照片→`screens.tsx`；`.collection-surface/.pw-*/.pola`              | 暂列 B；保留原色与原图浏览，专属相册另决策               |
| 心愿单                   | 许愿罐→`screens.tsx`；`.collection-surface/.wish`                            | 暂列 B；本轮不做罐子                                     |
| 登录/忘记密码            | `/login`→`pages/LoginPage.tsx/.module.css`                                   | B 账户页形态；旧 SVG 背景在用                            |
| 重置密码                 | `/reset-password`→`pages/ResetPasswordPage.tsx`                              | B 账户页形态；留真实重置链                               |
| 大厅/无世界/创建/错误    | `/` 未进房间→`lobby.tsx`（`IslandArt` :32）                                  | B 入口页形态；自绘 IslandArt，不能漏 loading/empty/error |
| 路由加载                 | `pages/ProtectedRoute.tsx` `Splash` :21–34（浅蓝渐变 :27）                   | 与账户页共用状态规范，避免孤立浅蓝画面                   |
| 日记                     | `screens.tsx` diary 分支、`journal-*`/`diary.css`                            | C；本 session 冻结                                       |

双入口路由集中在 `WorldPage.tsx` 的 `onRail`/`onHotspot`（:336–350）。唱片机/挂钟/照片的入口事实说明"从活物件点击"不等于"专属拟物 UI"。

## 3. 主要问题及优先级

P1 影响本次统一的正确性/核心操作，P2 是迁移时的次级一致性问题。本节只留证据与处置要点；执行任务在 [TODO.md](../../TODO.md) Bugs 节（层级与焦点、控件假状态、窄屏越界、`Msg` 阻塞四项已立项）。

| 优先级 | 问题与证据                                                                                                                                                          | 处理建议                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P1     | 五路材质叠存，导航与灰绿浮窗、旧纸设置同屏                                                                                                                          | 先定表面类型和消费者，再迁公共值                                                     |
| P1     | `.modal-scrim` z20 / `.modal` z21（`cinnaglass.css:482,498`）、聊天大窗 z22/23（`channel-screen.tsx:25,28`）、A 为 z35–40；实景中设置打开后 A 仍盖在上面且导航可点  | → TODO Bug「任务弹窗层级与焦点」（M2）：统一弹层与焦点管理，不逐文件抬 z-index       |
| P1     | 设置无 dialog/aria-modal；隐藏 `.modal` 只有 `opacity:0; pointer-events:none`，`display:flex`、`visibility:visible`、`inert` 未设，按钮 tabIndex=0 且可编程聚焦成功 | 同上；隐藏控件须 inert 或卸载                                                        |
| P1     | 音乐迷你条主按钮只切 `open`（`floaters.tsx:106`），进度条 `.mb-fill` 固定 34%（:175），封面转动也以 `open` 为条件（:96、`.mb-disc.spin` :166）                      | → TODO Bug「控件状态与真实行为不符」（M3）：音频引擎与视图显隐分开，隐藏后导航可恢复 |
| P1     | `settings.tsx` `savePw()` :166–174 只 `setSaved`；"绑定邮箱"只改本地 profile；应用锁无校验消费                                                                      | 同上（M4）：接通或收起占位，禁止假成功文案                                           |
| P1     | 390×844 实测音乐条宽 437、x=-84 与底导航重叠，天气与纪念卡重叠                                                                                                      | → TODO Bug「窄屏浮窗越界和重叠」（M3）：定停靠区/可用宽度，折叠与展开互斥            |
| P2     | 世界设置有 DB 保存，界面却找不到入口                                                                                                                                | 设置中恢复"我们的小世界"                                                             |
| P2     | `calendar.tsx:7` 的 `ANNIV` 为固定日期；MomentCard 使用世界纪念日                                                                                                   | 共用世界事实，避免两处不同倒计时                                                     |
| P2     | Presence 固定在线、头像常亮绿点；闹钟只有编辑列表；"一起听"无双人同步                                                                                               | 按实际能力命名和显示状态，数据接通单独排                                             |
| P2     | 小按钮、span 开关、div 会话/心愿项，消息操作只 hover 显示                                                                                                           | 统一语义控件、focus-visible、触屏入口，不等动画阶段                                  |
| P2     | 字体、彩色图标底、蓝紫轨道、头像环与暖金导航混杂                                                                                                                    | 通用控件与身份/状态色分开，统一尺寸/字重/描边                                        |
| P2     | 天气文档写"与现实脱钩"，代码实为 geolocation → Open-Meteo（`WorldPage.tsx:277–295`），失败回退"多云 22°"未区分实况失败                                              | 文档按事实描述，补 unavailable/fallback 语义                                         |

额外工程阻塞（2026-09-19 复跑仍成立）：`pnpm exec tsc --project tsconfig.app.json --noEmit` 唯一输出为 `shell/chat-card.tsx(10,15): TS2305 … has no exported member 'Msg'`；该类型实际导出在 `chat-data.ts:46`。未修改。

## 4. 清理时不能踩的依赖

| 对象                                      | 当前证据                                                           | 结论                                                        |
| ----------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `scene.tsx`                               | `LoginPage.tsx:8`、`ResetPasswordPage.tsx:10` import               | 仍在用，待账户背景替换后清；旧 TODO"lobby 还用则保留"不准确 |
| `rooms.ts`                                | `WorldPage.tsx:24` 仍用 `owLoad`，其余旧房间/语音 mock 无 src 消费 | 先迁 loader 再查构建/脚本引用，不能整文件先删               |
| `channel-screen.tsx` / `friends-page.tsx` | 从聊天窄卡展开可达，读真实聊天/好友/DM                             | 改入口与布局，留消息操作与数据功能                          |
| `world-settings.tsx`                      | 已挂载，有真实保存链                                               | 修入口，非死文件                                            |
| `image-slot.js`                           | `main.tsx` 副作用 import，设置头像使用                             | 仍在用，共享组件保留                                        |
| `--cg-* / --glass-* / materials.css`      | 多个实际消费者，含日记共享区                                       | 渐进迁移；本轮不删材质文件、不改 C                          |
| widget 注册与持久化                       | days/minimap/memory/ambient/lighting 等旧 key 与实际 JSX 不一致    | 整理消费者与存储兼容，别直接抹用户偏好                      |
| `journal-book.tsx` 等旧书本文件/资产      | C 历史实现（现役是 `journal-room-book.tsx`）                       | 即使无引用也不在本 session 清理                             |

原表的 `src/types/database.ts`、`timeline_3d_posts.html` 两项已删除（2026-09-19 复核：工作树与 git 索引中均不存在）。

文档需去除的歧义（历史稿保留并标注适用范围，不复制成新的真源）：底部胶囊/自动淡出提案、全窗近白→石墨泛化规则、全局"纸恒白"与暖灰纸冲突、图 4 角色避让与日记规则冲突、已否决的热点轮廓/换图、材质 token 必须全在单一 `:root`。

`--accent-deep` 双真源已复核为不存在（`cinnaglass.css:92` `#2f9ad3`，与 `--accent-orb` 尾色一致；`:93` 的 `#268fbe` 是独立的 `--shell-accent`）；结论记在 TODO Bugs 已完成项。

## 5. 本轮验证与限制

- 本地服务 `http://localhost:5173/?enter=1`，隔离 headless Chrome，不动用户浏览器会话。
- 源码与运行时联合核对导航三时辰材质：三档同一纹理 URL/尺寸/偏移，晴雨不直接改导航边缘渐变。
- 实景尺寸：1440×900 三时辰默认态、暮色晴/雨、天气展开/聊天、设置；390×844 默认态。存计算样式、几何与部分交互探针。
- 捕获 pageerror 为 0，仅覆盖本轮路径，不代表所有功能无错误。
- 对共享 REST 写入设拦截（只放行 GET/HEAD/OPTIONS 与只读 feed RPC），本轮无被拦截写请求，也没有发消息/改密码/改共享资料/发布回忆。聊天文字图片与设置输入值由临时浏览器 CSS 隐去，布局材质保留。
- 隐藏焦点探针只验证按钮可编程聚焦与 tabIndex=0，不等于屏幕阅读器或逐项 Tab 验收。
- 未覆盖：新方案（尚未落码）、Safari、真触屏/软键盘、低端设备性能、真实花园/棋牌室、全状态对比度、双人后端联调、日记内部。类型检查仍有上述 `Msg` 错误，不能称完整构建通过。

### 实景证据

证据目录 `ai/design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/`，其中 [runtime.json](../../design_system/uiux/cinnaglass/ui-unification/audit-2026-09-11/runtime.json) 存 7 个 state 的逐组件 rect/backdrop/背景与 `hiddenModalButtonCount` 探针。截图为当时产品实景，不是设计稿；隐去文字头像的空白不算视觉缺陷。

- `night-scene.png` / `golden-scene.png` / `twilight-scene.png` — 三时辰同屏材质差异
- `widgets-twilight.png` — 导航/聊天/天气/音乐/纪念卡/状态胶囊同屏
- `settings-twilight.png` — 暖灰纸窗与浮层/遮罩冲突
- `mobile-390.png` — 音乐越界与底导航重叠，顶部两卡重叠
