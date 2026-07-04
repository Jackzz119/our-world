# World Space + 悬浮 UI 系统设计文档

> 最后更新：2026-05-31
> 对应 TODO：Phase 1（世界空间主页骨架 + 去登录）+ Phase 2（回忆系统三个悬浮窗口）

---

## 一、功能目标

1. **去登录**：应用入口不再有登录页/路由守卫，主页（`/`）直接渲染世界空间。
2. **占位 Canvas 主页**：全屏 Canvas 作为 metaspace 渲染载体，当前用占位绘制（Blender 模型导入后替换为 R3F 天空视角场景）。
3. **悬浮 UI**：Canvas 之上覆盖一个悬浮按钮选单，点开后可打开三个悬浮窗口——**Timeline / 纯文字 / 图片**，数据先用 mock。

## 二、调用链路

```
main.tsx → App.tsx（单路由 / → WorldPage）
  WorldPage
    ├── WorldCanvas        全屏占位 Canvas（fixed inset-0，铺底）
    └── 悬浮 UI 覆盖层（absolute，盖在 Canvas 上）
          ├── FloatingMenu       悬浮按钮 → 展开三个入口
          └── FloatingPanel × N  被打开的悬浮窗口
                ├── TimelinePanel
                ├── TextPanel
                └── ImagePanel
```

- panel 支持**多开**：WorldPage 用 `openPanels: PanelKey[]` 管理，数组顺序即堆叠层级（最后的在最上）
- panel 为悬浮面板（非阻塞 modal），**可拖拽**（标题栏作拖拽手柄）、可关闭、点击置顶

## 三、模块设计

| 文件 | 职责 |
|------|------|
| `src/App.tsx` | 重构：去 session/auth/ProtectedRoute，单路由 `/` → WorldPage（保留 BrowserRouter 备扩展） |
| `src/pages/WorldPage.tsx` | 世界空间页：铺底 Canvas + 悬浮 UI 覆盖层，管理 panel 开关 state |
| `src/components/world/WorldCanvas.tsx` | 占位 Canvas（HTML5 `<canvas>`，绘制简单天空/占位提示，全屏自适应） |
| `src/components/world/FloatingMenu.tsx` | 悬浮按钮选单，三个入口触发打开对应 panel |
| `src/components/world/FloatingPanel.tsx` | 通用悬浮面板外壳（标题、关闭按钮、毛玻璃背景、定位） |
| `src/components/world/panels/TimelinePanel.tsx` | Timeline 窗口骨架（mock 数据） |
| `src/components/world/panels/TextPanel.tsx` | 纯文字回忆录窗口骨架（mock + 输入） |
| `src/components/world/panels/ImagePanel.tsx` | 图片窗口骨架（本地 FileReader 预览，暂不上传） |

**约定：** 新代码类型统一用 `type`，不用 `interface`；颜色沿用 stone/rose 主题。

## 四、待清理（废弃页面）

去登录后不再需要：`LoginPage.tsx` `HomePage.tsx` `CouplePage.tsx` `ProtectedRoute.tsx` `LandingPage.tsx`。
是否物理删除待用户确认（git 可恢复）。

## 五、待实现 / 已知问题

- 占位 Canvas 后续替换为 R3F 场景（需装 `@react-three/fiber` + `@react-three/drei`）
- 三个窗口数据当前 mock，后端接入在 Phase 3 之后
- 悬浮窗口是否支持多开 / 拖拽 / 记忆位置 —— 待定，先做单开 + 固定位置

### 方向变更（2026-06-04）

- 弹窗已从「可拖拽多开悬浮窗」改为「**居中单开大窗口**」：新增 `CenteredPanel.tsx`（半透明遮罩 + 居中毛玻璃 + 标题栏固定 + 内容超高滚动 + 按窗口声明 `maxWidth` 自适应宽度）；`FloatingPanel.tsx` 拖拽版保留未启用。`WorldPage` 改为单个 `activePanel`。
- 场景方向：占位从 2D 天空渐变 → **室内空间（房间内部俯视）**，后续做角色移动 + 书桌等物件交互。
- 视觉风格：改为大耳狗（Cinnamoroll）色调（天空蓝 + 奶白 + 淡黄 / 腮红粉）+ 适当暗色沉浸。
- HUD：场景上方浮起按钮展示近期信息（参考原神 / 异环）。

## 实现计划

进度：5 / 5 subtasks 完成（100%，代码就绪，待可视化验收）

- [x] ST-1: 重构 App.tsx + 去登录
   - 影响文件：`src/App.tsx`
   - 说明：移除 session/auth state、ProtectedRoute、/login 和 /couple 路由；保留 BrowserRouter，单路由 `/` → WorldPage
- [x] ST-2: 清理废弃页面文件
   - 影响文件：已删除 `LoginPage.tsx` `HomePage.tsx` `CouplePage.tsx` `ProtectedRoute.tsx` `LandingPage.tsx`
   - 说明：确认无外部引用后物理删除，pages 目录仅剩 WorldPage.tsx
- [x] ST-3: WorldPage + 占位 Canvas
   - 影响文件：`src/pages/WorldPage.tsx`, `src/components/world/WorldCanvas.tsx`
   - 说明：全屏占位 Canvas（2D 天空渐变 + 占位提示，自适应 resize/dpr），WorldPage 容器管理悬浮 UI
- [x] ST-4: 悬浮按钮选单 FloatingMenu
   - 影响文件：`src/components/world/FloatingMenu.tsx`
   - 说明：右下角 rose 渐变主按钮展开三个入口（Timeline / 文字回忆 / 照片），触发打开对应 panel
- [x] ST-5: 悬浮窗口框架 + 三个窗口骨架
   - 影响文件：`src/components/world/FloatingPanel.tsx`, `src/components/world/panels/{Timeline,Text,Image}Panel.tsx`
   - 说明：通用悬浮面板（毛玻璃、标题栏拖拽、关闭、点击置顶、多开堆叠）；TimelinePanel mock 时间轴、TextPanel 文字录入+列表、ImagePanel 本地 FileReader 预览

## UI 设计 Prompt（2026-06-04）

用于在 Claude design 生成 UI 设计稿。风格：大耳狗（Cinnamoroll）色调 + 暗色沉浸；场景为室内房间俯视；HUD 走原神 / 异环式浮起按钮 + 近期信息。一屏一屏生成，每条都带上「通用风格段」。

### 0. 通用风格段（每条 prompt 都附在后面）

```
Visual style: a cozy, dreamy private world for a couple (two people in love). NOT a social app —
no feeds, no multi-user. Color palette inspired by Sanrio's Cinnamoroll: soft sky blue
(#AEDFF2 / #BFE3F5) and creamy off-white (#FBFCFE) as the base, with pale buttery yellow
(#FCE7B0) and soft blush pink (#F8D7DF) as gentle accents, plus fluffy white clouds motifs.
To deepen immersion, blend in darker moody tones — twilight / navy blue (#2A3A5E, #1E2A47) used
for depth, ambient shadows and cozy evening lighting. Overall: airy and pastel but with rich
atmospheric depth, soft glow, gentle volumetric light. Glassmorphism UI: frosted translucent
panels (white/blue tint at ~80% opacity), backdrop blur, thin light borders, soft large shadows,
rounded corners 16–24px. Clean gentle typography. Game-like polished HUD. Mobile-first but looks
great on desktop.
```

### 1. 主屏 — 室内房间 + 浮起 HUD（可直接当场景占位图）

```
Design the main screen of "Our World", an intimate game-like 3D app for a couple.

THE SCENE (fills the entire screen as backdrop): a high-angle / isometric 3D view looking DOWN
INTO a cozy bedroom-study INTERIOR — like peering into a beautifully detailed dollhouse room
from above at a 3/4 aerial angle. The room is warm and intimate: a wooden study desk with a
lamp, books, a small plant and a computer; a bed with soft bedding; a rug; a window letting in
soft twilight light; shelves with little keepsakes. Stylized, low-poly, soft-rounded, cute
(Cinnamoroll-like pastel cuteness) but with atmospheric evening lighting and gentle shadows for
depth and immersion. Optionally, two small cute chibi character avatars standing in the room.

GAME-STYLE HUD overlaid on top of the scene (inspired by Genshin Impact / "Ananta / 异环" floating
UI — buttons that hover above the world):
- Top area: a few floating rounded glassmorphism info cards/buttons hovering above the scene,
  each showing recent info, e.g. a small card "在一起 365 天 / 365 days together", a card
  "最近回忆 · 阳台看日落 / Latest memory", a small anniversary countdown chip. They look like
  weightless floating game widgets with soft glow.
- Bottom-right: a circular floating action button (56px) with a soft sky-blue gradient and a
  white "+" icon, soft glow shadow — shown EXPANDED, revealing 3 frosted-glass pill entries
  stacked above it, each with a small icon + label: "Timeline" (clock), "文字回忆 / Notes"
  (document), "照片 / Photos" (image).
- (Optional) top-left: a small round minimap of the room.

Keep the HUD light and floating so the room scene stays the star. Apply the shared visual style.
```

### 2. 弹窗 — 文字回忆 (Notes)

```
Design a centered modal window floating over the room scene (the room behind is dimmed with a
soft twilight-navy translucent overlay + blur, for immersion).

Frosted-glass card, centered, NARROW reading width (~560px max), rounded 24px corners, soft glow
shadow, subtle sky-blue tint. Layout top to bottom:
- Fixed title bar (~48px): small sky-blue document icon + title "文字回忆 / Notes" left, soft "X"
  close button right, thin divider underneath.
- Scrollable content area:
    - A soft rounded text input ("写下此刻想记住的..." / "Write down what you want to remember...")
      with a small sky-blue "记下 / Save" button aligned right.
    - A vertical list of saved memories below — each a soft rounded cream/pale-blue card, warm
      and journal-like. Show 4–5 short heartfelt couple memory entries.

Apply the shared visual style.
```

### 3. 弹窗 — 照片 (Photos)

```
Design a centered modal window floating over the dimmed + blurred room scene (twilight-navy
overlay for immersion).

Frosted-glass card, centered, WIDE (~900px max, for a photo grid), rounded 24px corners, soft
sky-blue tint. Layout:
- Fixed title bar: sky-blue image icon + title "照片 / Photos", "X" close right.
- Scrollable content area:
    - Full-width "添加照片 / Add Photos" button at top (soft sky-blue fill, white text, image icon).
    - A responsive grid of square photo thumbnails — 3 columns on small widths, up to 5 columns
      when wide; rounded corners, object-fit cover. Show warm couple/lifestyle placeholder photos.

Apply the shared visual style.
```

### 4. 弹窗 — Timeline

```
Design a centered modal window floating over the dimmed + blurred room scene (twilight-navy
overlay for immersion).

Frosted-glass card, centered, MEDIUM width (~640px max), rounded 24px corners, soft sky-blue tint.
Layout:
- Fixed title bar: sky-blue clock icon + title "Timeline", "X" close right.
- Scrollable content area: a vertical timeline of shared memories. A thin vertical line down the
  left; each entry has a small soft sky-blue (or blush-pink) dot on the line, a muted date label
  above, and a short memory sentence below. Show 5–6 entries with dates and sweet couple moments,
  newest at top.

Apply the shared visual style.
```

### 抽卡提示

- 先生成第 1 屏定调（室内房间 + 浮起 HUD），最关键，多抽几次选最满意的当占位图。
- 大耳狗 + 暗色组合若太亮没沉浸感，把 `darker moody twilight tones, atmospheric evening lighting, rich shadows` 往前提、加重。
- HUD 理解不到位时补一句：`floating game UI widgets like Genshin Impact's hovering quest markers / minimap cards`。

## 测试记录

- 2026-05-31 `pnpm exec tsc -b --noEmit` 通过（EXIT=0）
- 2026-05-31 `pnpm lint`：新增文件无错；仅 `ui/badge.tsx`、`ui/button.tsx` 有转向前既存的 react-refresh 告警（shadcn 生成文件，未处理）
- 待执行：`pnpm dev` 可视化验收（菜单展开、三窗口打开/拖拽/多开/置顶/关闭、图片本地预览）