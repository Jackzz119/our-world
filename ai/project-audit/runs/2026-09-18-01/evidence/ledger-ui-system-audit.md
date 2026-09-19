# 压缩 ledger · ai/Features/ui-system/audit.md

| 项 | 原文 | 压缩稿 |
| --- | --- | --- |
| UTF-8 bytes | 17724 | 11815 |
| 行数 | 108 | 105 |
| 比例 | — | 66.66%（目标 ≤66.67% / 11816 bytes） |
| 结果 | — | **达标** |

源文件只读，未修改；压缩稿写在本目录 `ui-system-audit.md`。

## 保留清单

- **材质来源表**（§1）：五行消费者/事实全保留，另补精确定位。
- **入口与组件地图**（§2）：21 行界面全保留，入口与选择器全保留；「建议归属」字母全保留。
- **P1 / P2 问题与处置建议**（§3）：6 条 P1 + 6 条 P2 全保留，证据列补足 `文件:行`；已在 TODO 立项的四项处置改为指向（见删除清单）。
- **依赖/清理边界表**（§4）：`scene.tsx`、`rooms.ts`、`channel-screen/friends-page`、`world-settings.tsx`、`image-slot.js`、`--cg-*/--glass-*/materials.css`、widget 注册与持久化、`journal-book.tsx` 八行保留；「文档需去除的歧义」六项保留。
- **验证限制**（§5）：本地服务与隔离 Chrome、三时辰材质核对、实景尺寸清单、pageerror=0 的适用范围、REST 写入拦截与隐私处理、隐藏焦点探针的边界、七项未覆盖范围 —— 全保留。
- **实景证据**：`runtime.json` 链接保留；6 张 png（night / golden / twilight / widgets-twilight / settings-twilight / mobile-390）的文件名与说明全保留。
- **被引用标题**：`## 2. 入口与组件地图`、`## 5. 本轮验证与限制`（`ui-system.md` 以 `audit.md#2-入口与组件地图`、`audit.md#5-本轮验证与限制` 引用）；`## 1.`/`## 3.`/`## 4.` 标题一并保留（压缩后的 ui-system-plan.md 新增指向这三节）。`ai/project-audit/.../src-review.md:253`「§2/§4 行号核对」、`design-review.md:143`「audit.md L103-106 引用 6 张 png」均仍成立。

## 删除清单

| 原文位置 / 摘句 | 理由 |
| --- | --- |
| §3 四行的处置建议原文（「建统一弹层和焦点管理…」「音频引擎、视图显隐分开…」「接通真实功能或收起占位…」「定义停靠区/可用宽度…」） | `ai/TODO.md` Bugs 节已完整立项吸收（L22 层级与焦点 / L23 控件状态与真实行为不符 / L24 窄屏浮窗越界和重叠 / L25 聊天窄卡类型检查阻塞），压缩稿改为「→ TODO Bug「…」（M2/M3/M4）」一句指向 + 保留证据 |
| §4 末段「复核已消失的旧项：`--accent-deep` 当前为 #2f9ad3…不能再把旧『双真源』当当前 bug」整段 | `ai/TODO.md` Bugs 节已完成项 L20 吸收，压缩为一句（保留三个色值与结论） |
| §4 表中 `src/types/database.ts`、`timeline_3d_posts.html` 整行 | 两文件已不存在（见改正清单），整行改为一句失效说明 |
| §2 建议归属列里与 `ui-system.md` §3/§4 重复的通用要求（「同源材质、开关语义、定位/关闭/键盘与触屏」「外壳迁移，内容底可读，状态和输入反馈规范化」「共用定位、选中、错误和关闭规则」「本地列表与控件语义统一」等） | 通用 A/B 材质与交互规则的权威正文在计划 §3/§4；压缩稿在表前加一句指向，列内只留组件独有处置（如「一个音频状态源」「纪念日来源须与世界设置合并」「能编列表≠到时提醒已接通」） |
| §5 实景证据四行表（含 6 条重复的完整长路径） | 同一目录重复 7 次；改为「证据目录 + runtime.json 链接 + 文件名列表」，文件名与说明零损失 |
| 头部「对代表界面做隔离 Chrome 实景检查。日记只识别依赖边界，没有打开或评审其内部」等修饰从句 | 语义重复，压缩不删事实 |

## 改正清单

| 原陈述 | 实际 | 依据 |
| --- | --- | --- |
| §1 「`materials.css:18–75` 的 `--craft-*` 及覆盖」 | 文件共 70 行，18–75 越界；`--craft-*` 定义在 `:root` :3–16，覆盖块从 `.stage :is(.modal.glass, .collection-surface)` :18 到 :70 | `src/themes/cinnaglass/materials.css:3-16,18-70`（全文件 70 行） |
| §2 「灯光/天气 `shell/ambience.tsx:34`」 | `Ambience()` 在 :30，`.amb-pill` 在 :40 | `src/themes/cinnaglass/shell/ambience.tsx:30,40` |
| §2 「纪念卡 `shell/floaters.tsx:25`」 | `MomentCard()` 在 :21 | `src/themes/cinnaglass/shell/floaters.tsx:21` |
| §2 「音乐折叠/展开 `shell/floaters.tsx:77`」 | `MusicMini()` 在 :66 | `src/themes/cinnaglass/shell/floaters.tsx:66` |
| §2 「导航与房间/工具菜单 `shell/rail.tsx:96`」 | `Rail()` 在 :44；`.rail`/`.rail-pop` 的 JSX 从 :107 起（:96 为 label 片段） | `src/themes/cinnaglass/shell/rail.tsx:44,107` |
| §2 「设置 `settings.tsx:199`」 | `.modal.mini.glass` 在 :200；`SettingsScreen()` 在 :144 | `src/themes/cinnaglass/settings.tsx:144,200` |
| §2 「日历/纪念日 `calendar.tsx:195`」 | `CalendarScreen()` 在 :102 | `src/themes/cinnaglass/calendar.tsx:102` |
| §2 「时钟/闹钟 `calendar.tsx:325`」 | `ClockScreen()` 在 :283 | `src/themes/cinnaglass/calendar.tsx:283` |
| §2 「头顶状态/气泡 `room/room-scene.tsx:155` 起」 | 气泡块 :155 正确；补状态胶囊 :236 | `src/themes/cinnaglass/room/room-scene.tsx:155,236` |
| §2 「右侧房间把手…WorldPage 回调为空」 | 补证据：`onTap` 为空注释在 WorldPage :490（`onRoom` 空注释在 :470） | `src/pages/WorldPage.tsx:470,490` |
| §2 「路由加载 `pages/ProtectedRoute.tsx:27`」 | `Splash` 组件 :21–34，浅蓝渐变确在 :27 | `src/pages/ProtectedRoute.tsx:21-34` |
| §2 「当前双入口路由：`WorldPage.tsx:337–350`」 | 区间成立（navigate 调用落在 :340,341,343,348,349），压缩稿写 :336–350 | `src/pages/WorldPage.tsx:336-350` |
| §3 「音乐迷你条…（floaters.tsx:77–116,178–181）」 | 主按钮只切 open 在 :106，封面以 open 为条件在 :96，`.mb-fill` 固定 34% 在 :175，`.mb-disc.spin` 在 :166 | `src/themes/cinnaglass/shell/floaters.tsx:96,106,166,175` |
| §3 「`settings.tsx:165–174` savePw」 | `savePw` 为 :166–174（:165 是 `pwValid`） | `src/themes/cinnaglass/settings.tsx:166-174` |
| §3 「通用遮罩/弹窗 z20/21；聊天大窗 z22/23」 | 成立，补依据 | `src/themes/cinnaglass/cinnaglass.css:482`（`.modal-scrim` z20）、`:498`（`.modal` z21）；`channel-screen.tsx:25,28`（z22/23） |
| §3 「隐藏 modal 仍 `opacity:0; visibility:visible; display:flex; inert:false`」 | 精确说法：CSS 只写 `opacity:0` 与 `pointer-events:none`，`display:flex` 来自 `.modal` 基样式，`visibility`/`inert` 根本未设（故计算值为 visible、元素未惰性） | `src/themes/cinnaglass/cinnaglass.css:498-517` |
| §3 「Calendar `ANNIV` 固定日期」 | 成立，补依据 | `src/themes/cinnaglass/calendar.tsx:7`（`const ANNIV = { m: 5, d: 4, year: 2025 }`） |
| §3 「代码存在 geolocation → Open-Meteo；失败回退『多云22°』」 | 成立，补依据 | `src/pages/WorldPage.tsx:277-295`（`navigator.geolocation` :286,291；`api.open-meteo.com` :294；fallback 多云 22 :285） |
| §3 「tsc 唯一输出为 `chat-card.tsx(10,15): TS2305 model has no exported member Msg`」 | 2026-09-19 复跑仍是唯一报错；补充 `Msg` 实际导出位置 | `src/themes/cinnaglass/shell/chat-card.tsx:10`；`src/themes/cinnaglass/chat-data.ts:46` |
| §4 「`src/types/database.ts`、`timeline_3d_posts.html` 已知模板/独立实验候选」 | 两者均已不存在：`find` 无结果，`git ls-files` 无记录，`src/types/` 下只有 chat.ts / feed.ts / index.ts / page-flip.d.ts。注意 `git status` 显示 `D  src/types/database.ts` 为**已暂存的删除**，即该文件是在本轮 PROJECT-AUDIT 期间由并发步骤删掉的，审计原文在 2026-09-11 成立 | 工作树 + `git ls-files` + `git status --short`（2026-09-19 核） |
| §4 「`journal-book.tsx` 及其他旧书本文件/资产」 | 文件仍在；补注现役实现是 `journal-room-book.tsx` | `src/themes/cinnaglass/journal-book.tsx` 存在；`src/themes/cinnaglass/screens.tsx:15` import `journal-room-book` |
| §1 「`cinnaglass.css:23–43` 的 `--cg-*`」「18px blur」「dense 固定灰绿底」「`--cg-panel` 接 `--craft-shell`」 | 全部正确，未改 | `src/themes/cinnaglass/cinnaglass.css:23`（`--cg-panel: var(--craft-shell)`）、`:24`（dense `rgba(57,59,51,.88)`）、`:43`（`--cg-blur: blur(18px) saturate(85%)`） |
| §4 「`scene.tsx`：LoginPage:8、ResetPasswordPage:10 import」「`rooms.ts`：WorldPage:24 用 owLoad」「`world-settings.tsx` 挂载」 | 全部正确，未改 | `src/pages/LoginPage.tsx:8`、`src/pages/ResetPasswordPage.tsx:10`、`src/pages/WorldPage.tsx:24,519` |
| §4 「`--accent-deep` 当前为 #2f9ad3…#268fbe 是独立的 `--shell-accent`」 | 正确，未改（压缩为一句并补行号） | `src/themes/cinnaglass/cinnaglass.css:92,93,96` |

## 待核清单

- §3「390×844 实测音乐条宽 437、x=-84」「天气与纪念卡重叠」：2026-09-11 runtime.json 的实测值，本轮未重跑浏览器。
- §3「Presence 固定在线、头像常亮绿点」「闹钟只有编辑列表」「一起听未实现双人同步」：未逐项复核源码。
- §3「小按钮、span 开关、div 会话/心愿项；消息操作只 hover 显示」「字体、彩色图标底、蓝紫轨道、头像环混杂」：未逐项复核。
- §4 widget 注册的旧 key（days / minimap / memory / ambient / lighting）与实际 JSX 的差异：未复核。
- §4「文档需去除的歧义」六项指向历史设计稿，本轮未逐篇核对。
- §5 的 REST 拦截、隐私隐去、pageerror=0 等为 2026-09-11 执行记录，不可复核，按时点证据原样保留。
- 工作树在本轮执行期间被并发修改（会话开始 `git status` 仅 `?? ai/project-audit/`，核对末期出现多个 M/D 条目）；`timeline_3d_posts.html` 与 `src/types/database.ts` 的「不存在」结论基于 2026-09-19 执行当时的工作树与 git 索引，其中 `database.ts` 可见为并发步骤的已暂存删除。若该删除最终被回滚，压缩稿该句需要跟着回滚。

## 例外说明

**exception = false。** 11815 bytes ≤ 11816 bytes（2/3 目标），达标，且材质来源表、组件地图、P1/P2 与处置建议、依赖/清理边界表、验证限制五块全部保留。
