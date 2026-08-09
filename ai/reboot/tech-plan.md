# 实现方案：媒介、形态与迁移策略

> Reboot Kit 之一。回答四个问题：Q3 重启 vs 翻新（§1、§4）、Q1 角色媒介（§2）、Q2 产品形态（§3）、数据库沿用（§5）。
> §2/§3 的调研数据来自 2026-08-09 四路网络调研（Steam 案例 / 自习室 / 媒介技术 / 形态分发）。

## 1. 现状资产盘点（什么能带走）

### 后端（Supabase）——新产品需求 100% 命中，零迁移

| 资产 | 新产品用途 |
|---|---|
| auth + allowed_emails 白名单 + 登录守卫 | 不变（两人隐私地基） |
| `worlds`（owner/member/anniversary/icon） | 语义改「我们的小屋」，结构不动 |
| `posts` + Storage memories 桶 + `get_feed_posts` RPC | 时间线/照片墙的全部数据层，不动 |
| `channels`/`messages`/`message_reactions`/`channel_reads`/`world_emotes` + Broadcast from Database | 聊天管道原样保留；聊天气泡浮角色头顶=同一条消息流的新渲染位 |
| `friendships` + DM | 冻结不删（远期「串门/公共空间」的账号级基建） |
| Supabase Realtime **Presence** | 🆕 「对方在线→角色醒来」的实现载体——现成能力，无需建表 |
| Edge Function（Tenor 贴纸代理） | 不变 |

**关键判断：已沉淀的数据（帖子/照片/聊天记录）本身就是产品定义里的「回忆资产」。任何丢弃数据的重启方案都等于丢产品内核。**

### 前端——功能弹层全保留，壳层退役

| 资产 | 去留 |
|---|---|
| timeline 日记流 + Composer（多图/草稿/lightbox/续签） | ✅ 保留——点书桌打开的白纸卡 |
| 照片墙 polaroid 拼贴 | ✅ 保留——点相框打开 |
| 聊天双形态（dock + 大窗）+ 贴纸 + reactions | ✅ 保留大窗；dock 概念被「角色头顶气泡」替代 |
| 日历/时钟/设置/音乐/心愿单 UI | ✅ 保留——挂到对应物件 |
| cinnaglass 设计 token + 光照递进（D-12）+ ui-system.html | ✅ 保留——UI 薄壳设计系统；mood 体系直接对接「窗外时辰」 |
| sidebar（rail+panel）、大厅 LobbyScene、SpaceScreen、聊天中心服务器布局 | ❌ 退役（Discord 语义） |
| RoomScene 等距 SVG、HUD Toolbox、metaspace 3D Canvas | ❌ 退役——被新场景层替代 |
| Blender 大宅模型 + 六套灯光 + 五机位（ai/blender/） | ♻️ 转产原料——2.5D 预渲染背景层的渲染源（机位改近景重设） |

## 2. 角色与场景媒介（Q1）

### 场景：预渲染 2.5D，维持上一批结论

场景媒介沿用 `codex-visual/20260809-083950Z/codex-report.md` 已论证的方案：**Blender 离线渲染分层图（far / base / light_fx / foreground + depth）+ 运行时合成**，时辰四档交叉淡化，雨雪为独立粒子/窗外层。新定位下更简化：

- 构图从「五机位全屋」收缩为「**近景一角单机位**」（新概念图 01 基线）——MVP 只需 1 机位 × 4 时辰的分层资产，上一批「135 张资产」的量级焦虑直接消解
- 老报告 §7.3 的 base 层跨 mood 矛盾在单机位下仍需技术样板验证（base 随 mood 出 vs albedo+运行时打光），但资产量已小到两种路线都可承受

### 竞品技术事实（2026-08-09 查证）

- **Spirit City: Lofi Sessions = Unreal Engine 5、Chill Corner = Unity**——两款代表作都是游戏引擎实时渲染，「预渲染分层图合成」在 Steam lofi 成品里未查到直接案例。但该技法在 web 圈是成熟套路，天花板案例是 Bruno Simon 的 [My Room in 3D](https://my-room-in-3d.vercel.app/)：Blender 烘焙 base 贴图 + 独立光照层按强度混合，画面精致且运行开销极低——**「烘焙 base + 可调光照层」正是我们时辰系统该抄的结构**（渲 N 套光照层，shader 按系统时间插值）
- 「房间里的小人」行业主流是 **Spine** 而非 Live2D：Blue Archive 咖啡厅小人、明日方舟基建小人都是 Spine 骨骼动画。Live2D 的主场是正对镜头的半身立绘（VTuber），「换姿势、换朝向的动作序列」是它的短板（每个姿势近似要单独拆绑）

### 角色：候选路线对比（数据已查证，来源见调研报告）

| 路线 | 画面上限（本题语境） | 成本 | web 集成 | 授权风险 | 结论 |
|---|---|---|---|---|---|
| A. Live2D Cubism | 高，但强在正面立绘不在房间小人 | 外包 Q 版全身全套约 ¥3k–10k+/只、周期 1–3 月；SDK 个人/小微（年销售 <1000 万日元）**免费** | 需引入 PixiJS 第二渲染栈；官方封装不支持 Cubism 5，靠社区 fork | 低，但注意「Expandable Application」条款（若开放用户导入自定义模型，任何规模都须单独签约） | 仅远期「角色正面特写互动页」考虑 |
| B. 实时 3D（R3F + toon/烘焙） | 高（Bruno Simon 级，插画感靠烘焙功力） | 建模+绑定+动作外包数千元级/只；已有 Blender 管线可摊薄 | 已有栈 | 无 | 远期若要动镜头/自定义摆放再升级；**不用 VRM**（人形骨骼规范对 Q 版动物零收益），用 glTF+自定义骨骼 |
| C1. Spine | 高（Blue Archive 房间小人同款；4.2 物理让耳朵自动摆动） | 编辑器 **Professional $379 一次性**（网格变形和物理必须 Pro，Essential $69 没有）+ 动画外包（人才最多） | spine-ts / spine-pixi 官方 npm，成熟 | 低（runtime 要求持有效编辑器证；年营收 >$50 万须 Enterprise） | **角色戏份加重后的升级正道** |
| C2. Rive | 中高（骨骼+网格+原生点击状态机） | 编辑器 Free $0（3 文件/10MB）或 $9/月；**runtime 全平台 MIT 开源，发布零费用** | 最低：~200KB gzip runtime，React 包现成 | 极低 | **MVP 主推** |
| D. 逐帧 sprite sheet | 中（取决于插画帧质量） | 逐帧插画费随动作数线性涨 | 最简单（CSS steps()/canvas 播帧），功耗最低 | 无 | 兜底 / 与 C2 混用 |
| （DragonBones） | — | 免费 | runtime 五年空窗才诈尸 | — | ❌ 工具链断代，排除 |

**推荐组合（MVP）**：场景 = Blender 预渲染分层 + R3F 全屏 quad shader 合成；角色 = **Rive**（Free 档起步），每只 4-6 个放置动作循环（呼吸 idle/翻书/喝咖啡/趴睡）+ 眨眼，点击反应走状态机过渡。理由：
1. 概念图的水彩毛绒质感本质是 2D 插画——2D 角色贴 2D 背景零风格冲突；3D 角色反要解决「贴不上」的光照匹配
2. 坐姿小人+小幅循环正是骨骼动画的主场；Live2D 的强项（正面立绘微动）在这个题上花最贵的钱买不擅长的东西
3. Rive 的 State Machine（状态机：「idle→翻书→喝咖啡」的切换逻辑做在动画文件里，代码只发状态名）与 presence 驱动的状态切换天然契合；runtime MIT 免费无授权尾巴
4. 升级路径清晰：动作/换装/物理需求加重 → Spine Pro（$379 一次性，人才池最大）；要 3D 化 → glTF+toon（Blender 资产复用）；要正面特写互动 → 届时单独引 Live2D 特写层

### 功耗底线（常驻窗口的硬指标）

- R3F 用 `frameloop="demand"` + `invalidate()`——无动静完全不渲染（官方省电姿势）；统一 24–30fps 节流时钟，Page Visibility 失焦暂停
- 对标线：Desktop Mate 低画质档实测 1–2% CPU / 1% GPU——桌宠省电靠「画质/帧率档位 + 空闲降频」，与渲染技术选型关系不大

> 角色媒介的最终验证：用 05 动作图鉴做一只角色的 Rive 样板（翻书 loop + 眨眼），贴进预渲染背景跑帧率与功耗测试——技术样板阶段第一件事。

## 3. 产品形态与分发（Q2）

### 调研结论摘要（2026-08-09 查证，来源见调研报告）

- **纯网页 / PWA**：随处可开、零改造；**always-on-top 网页做不到**（连浏览器扩展 API 都没有）。唯一的口子是 **Document Picture-in-Picture API**（Chrome 116+）：可开一个装任意 HTML 的置顶小窗（尺寸受限、不透明、带浏览器边框）——足够做「迷你房间置顶小窗」，1-2 天工作量，是验证「常驻陪伴」假设的最快路径。「tab 常开陪伴」有成熟品类先例（lofi.cafe、LifeAt、StudyStream）
- **桌面壳：Electron 优先，Tauri 观望**（此结论与直觉相反，是本次调研的关键修正）：
  - 桌宠形态的核心 API 是「角色可点、空白穿透」——Electron `setIgnoreMouseEvents(ignore, {forward: true})` 是**唯一官方支持**的方案（穿透时页面仍收 mousemove，移入角色区接管点击）；开源桌宠项目几乎全在 Electron 侧，套路现成
  - **Tauri 的 `setIgnoreCursorEvents` 是整窗开关、没有 forward 选项**（feature request 开放多年未落地），透明区自动穿透 2021 年提案至今未实现；WebView2 透明窗 bug 成串（幽灵标题栏/白闪/不重绘）。**Tauri 商业级桌宠案例：未查到**
  - Tauri 的包体/内存优势（3-12MB vs 100MB+、~40MB vs ~200MB 常驻）对 2 人自用不是决策级痛点；等 forward API 落地再迁壳，前端代码不用动
  - Electron 跑 Supabase 零障碍（壳内即 Chromium）；透明窗已知坑：不可 resize、DevTools 使其变不透明、数位板驱动干扰 forward、大版本升级要回归测试穿透
- **Steam**：web 栈上架先例充分（Vampire Survivors 早期=Phaser+Electron、Cookie Clicker=Electron、shapez=同一代码库网页+Steam 双发、Melvor Idle=自建云账号跨端与我们架构同构）；$100/款（收入达 $1000 返还）+ 30 天强制等待 + 店页公开——**没有「私密发行」形态，对现在的 2 个用户毫无意义**。远期姿势：按「游戏」类上架（休闲/放置），SteamID 静默映射 Supabase 账号，店页挂 "Requires 3rd-Party Account" 声明
- **Wallpaper Engine：一票否决主形态**——Workshop 壁纸**键盘输入被官方禁用**（安全原因），聊天打不了字；且壁纸层在桌面图标之下、其他应用最大化时默认暂停（「陪伴」被冻结）；Workshop 无付费机制。只适合远期做「只读房间壁纸」输出口。零成本替代：**Lively Wallpaper**（免费开源，WebView2 渲染任意 URL 为壁纸）可直接贴现有网页试效果

### 推荐路线（MVP → 演进）

```
Phase R0（验证周）  不写壳：现网页做房间场景首页 + Document PiP 置顶迷你窗 + Lively 贴壁纸实验
                   —— 两人真实用一周，回答「要置顶可见还是贴桌面」，决定 R2 投入档位
Phase R1（MVP）    网页形态：新场景层 + 三物件功能 + presence，浏览器/PWA 常开即用
Phase R2           Electron 壳：无边框置顶小窗（可贴屏幕角/边，Rusty's 形态）+ 托盘 + 开机自启
Phase R3           桌宠模式（二档进化）：全屏透明层 + forward 穿透，角色真正坐在桌面上（概念图 03）
Phase R4（远期）   Steam 公开发行 / WE·Lively 只读壁纸输出口——需产品先公开化，另立项
```

**MVP 定网页的理由**：验证「放置陪伴」情感闭环所需的一切（场景/角色/presence/功能挂载）网页全都能做；形态壳是纯增量不返工；你们俩当前的使用习惯（`pnpm dev` + 浏览器）无缝衔接。R0 的两个实验合计 ≤2 天，却能把最大的形态不确定性提前消掉。

## 4. 重启 vs 翻新（Q3）

**结论：原地翻新（同 repo、同后端、同 git 历史），不开新 repo。**

| 维度 | 原地翻新 | 重启新 repo |
|---|---|---|
| 数据（帖子/照片/聊天=回忆资产） | 原样在库 | 必须迁移，纯开销纯风险 |
| 后端复用（§1 表，100% 命中） | 直接用 | 重建或跨 repo 引用，无收益 |
| 功能弹层组件 | 改壳保芯 | 复制粘贴过去再改，双份维护窗口期 |
| 决策/文档历史（ux decisions、feature 文档） | git 与文档连续 | 断档 |
| 心理干净感 | 靠删旧代码达成 | 天然干净 |

「干净感」通过翻新动作本身达成：壳层文件（sidebar/大厅/HUD/metaspace）在新场景层站稳后成批删除，`ai/Features/` 老文档按新结构重写归档。**推翻的是信息架构，不是仓库。**

### 翻新的落地形状（拍板后细化为 TODO）

1. 新场景层组件（预渲染背景合成 + 角色层 + 热点层 + 时辰调度）替换 WorldPage 的场景部分
2. 功能弹层按概念图 04 的「单张白纸卡」规范收敛（现有弹窗壳已有统一基建 UI-1）
3. presence 接 Supabase Realtime Presence，驱动对方角色状态
4. sidebar/大厅/SpaceScreen/HUD/metaspace 退役删除
5. 旧 `ai/Features/*.md` 重写：保留 timeline/chat/supabase 等仍然有效的文档，废弃 channel/sidebar/metaspace 系
6. TODO.md 按新 MVP 重写 Phase 结构

## 5. 数据库翻新预估（Q3 附属）

**零迁移可开工。** 拍板后的渐进清理（均低优先级、不阻塞 MVP）：

- `channels`：UI 退役后收缩为每 world 一条默认频道 + dm 型；表结构不动
- `friendships`：冻结（不建新 UI），数据保留
- presence/角色状态：走 Realtime Presence 的 payload（`{status: 'reading'|'coffee'|'sleeping', since}`），**无表**；如需「离线也显示她最后状态」再考虑 profiles 加一列
- 房间装扮/家具解锁（远期玩法）：到时新表，与现有结构正交
- 遗留审计项照旧执行（supabase.md 的安全加固清单，与重定位无关）
