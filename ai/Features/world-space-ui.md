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

## 测试记录

- 2026-05-31 `pnpm exec tsc -b --noEmit` 通过（EXIT=0）
- 2026-05-31 `pnpm lint`：新增文件无错；仅 `ui/badge.tsx`、`ui/button.tsx` 有转向前既存的 react-refresh 告警（shadcn 生成文件，未处理）
- 待执行：`pnpm dev` 可视化验收（菜单展开、三窗口打开/拖拽/多开/置顶/关闭、图片本地预览）