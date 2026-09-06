# Handoff：Our World「回忆日记」（timeline v2）落地实现

你是实现方。设计比稿与策划已完成并拍板，请直接按下面的决策落地代码，**不要重新做设计探索**，遇到规格空白按报告 §9/§11 补齐并在报告里声明。

## 先读（按顺序）
1. `AGENTS.md` —— 工作协议：中文沟通、代码注释英文、commit 规范、文档规则、报告须逐文件贴代码
2. `ai/PROJECT.md`（PRD + 技术事实）、`ai/STYLE.md` §4/§8/§9/§10、`ai/UX.md` §2/§5/§6/§9
3. `codex-visual/20260905-215344Z/codex-report.md` —— 上一轮的策划报告。**§7 token 清单、§9 逐文件落地映射、§11 分期、960px / 640×400 退化表直接当规格用**
4. 同目录三张方向图：`direction-1-centered-paper.png` / `direction-2-desk-unfold.png` / `direction-3-tethered-leaf.png`
5. `ai/Features/timeline.md`：第七章 = Claude 独立复核 + 决策记录；一至六章 = v1 链路/模块/数据模型（仍全部成立）
6. 代码入口：`src/themes/cinnaglass/screens.tsx`（SubScreen / TimelineBody / Composer / PhotosBody / PostDetail）、`src/pages/WorldPage.tsx`（`MODAL_TABS`、`navigate`、热点 id → screen）、`src/themes/cinnaglass/room/study-room.ts`（热点 rect）、`room/room-scene.tsx` + `room/pixi-scene.ts`（`onHotspot`，cover-fit 变换在 §cover-fit layout）、`src/themes/cinnaglass/cinnaglass.css`（token 与 `.modal` 族）、`ai/design_system/cinnaglass/ui-system.html`（token 活文档，须同步）、`src/themes/cinnaglass/shell/rail.tsx`（效率入口）

## 已拍板决策（不再讨论）
- **D1 形态**：方向 3「系回日记本的纵向长纸」为静态几何。开场借方向 2 的姿态：从书桌日记本热点的屏幕位置 scale 0.9→1.02→1 + 轻微上浮，220ms ease-out（UX §6），落稳即平纸。**不做透视里滚动的内容**
- **D2 命名**：界面标题「回忆日记」；代码标识 `timeline`、路由/类型不改
- **D3 拆容器**：timeline / photos / wishlist 三个各自独立的 surface，分别由 日记本 / 相框 / 许愿罐 热点打开；rail 对应按钮打开同一 surface；删除三 tab 栏与 `MODAL_TABS` 的 tab 语义
- **D4 卡片恒白**：白卡 + 3px 作者色左边线 + 头像光环 + 名字色。**不采用比稿图里的淡蓝/淡粉气泡底**（会把日记读成聊天线程，撞 PRD 铁律「互动不长在信息流里」）
- **D5 纸宽**：≥1200px 取 500px（允许 480–520 微调）；960–1199 取 `min(58%, 460px)`；≤959 与 640×400 小窗按报告退化表（纸变全宽卡、composer 折叠为一行、图片单列缩略）。比稿图里 369px 的纸宽是生图偏差，不照抄
- **D6 token 统一**：`--accent-deep` 统一为 `#2F9AD3`（D-9 定稿），同步 `--accent-orb` 尾色、`screens.tsx` guest tone、`ui-system.html`；三档 mood 的 `--accent-deep` 覆写值按同一明度比例重算并写明推导
- **D7 删吉祥物**：`.tl-mascot` 与 `MascotSvg` 整体移除（房间已有真角色）
- **D8 保留不动**：`useFeed` / `posts.ts` / `storage.ts` 数据层；单列上旧下新 + 游标分页无限上滚 + 拖拽惯性 + 橡皮筋刷新；composer 多图（≤9）+ 草稿规则（点外/Esc 收起保草稿、「取消」唯一清空、折叠条显示草稿预览）+ textarea 自动长高；6 行截断 + 详情弹层；40 分钟签名续签；作者色语义（我=蓝 accent、对方=粉）
- **D9 日记页元素**（方向 3）：6–8px 封皮露边（暖棕，新增 `--diary-cover` token，取自房间木色）、右下折角、一条粉色书签 + **静态**虚线 tether 指向真日记本热点、顶部「↑ 翻看更早的回忆」提示；内容全部坐纸，**禁止玻璃嵌玻璃**
- **D10 场景层级**：暗幕与 blur 分两个 token 控制；打开态两只角色都必须有可辨识部分（1440 下粉狗整脸 + 蓝狗整身；960 下至少各露脸）

## 分期与提交
每期一个 commit；message 英文小写 `type: description`；末尾加 `Co-Authored-By` 行（格式见 AGENTS.md）。
- **Phase 0 结构止血**：拆 tab → 三个 surface（可先共用一个 `PaperSurface` 壳）；删吉祥物；弃 `.modal glass tall`，新增 `.paper` / `.diary` 壳；热点 id → surface 映射；D6 token 统一
- **Phase 1 静态落地**：方向 3 几何 + 三断点；日期贴纸 / 卡片 / composer 样式迁到纸上；照片墙、心愿单各自 surface
- **Phase 2 动效与键盘**：`pixi-scene` 的 `onHotspot` 补传热点屏幕 rect → surface 从该位置冒出；Esc 优先级栈（详情 > composer 收起 > surface 关闭）；点纸外关闭；`prefers-reduced-motion` 降级为淡入
- **Phase 3 回归验收**（见下）
- Phase 4 presence 微光**不在本次范围**

## 验收（完成必须附证据）
1. `pnpm tsc --noEmit`、`pnpm lint`、`pnpm build` 全绿
2. headless Chrome 截图（`<link>` 真实 `cinnaglass.css`，不许手绘近似）：1440×900 / 960×600 / 640×400 三档 × golden 与 night 两个 mood，存 `ai/design_system/cinnaglass/_shots/timeline-v2/`
3. 像素采样：纸面 luma > 200；暗幕下场景暗区 < 60；两只角色可见性在截图上标注
4. 交互清单：热点打开 → Esc 关；composer 有草稿时 Esc 只收起且草稿保留；详情打开时 Esc 只关详情；照片墙 / 心愿单各自能从物件与 rail 打开；960 与 640×400 下无横向滚动、无遮挡角色
5. 文档：`ai/Features/timeline.md` 新增「八、v2 落地记录」（逐文件改了什么、为什么、验收证据路径）；`ai/TODO.md` 把「白纸功能卡收敛」与「timeline v2 重做」标记完成；`ai/PROJECT.md` 只改一句摘要 + 引用（细节不搬运）
6. 最终报告按 AGENTS.md：**逐文件贴改动前 → 改动后代码**，术语当场用大白话解释

## 禁区
不动 `.claude/`；不提交 `scripts/__pycache__/`；不新增 token 之外的十六进制颜色；不改数据层与 Supabase；不引入新依赖；不做透视文字滚动；不加持续运动的装饰；不恢复三 tab。
