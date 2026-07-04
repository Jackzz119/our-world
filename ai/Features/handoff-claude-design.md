# Handoff · Claude Design 复刻 系统设计文档

> 最后更新：2026-06-14
> 来源原型：`ai/design_handoff_our_world/`（Our World.html + 13 个 jsx/js）

---

## 一、功能目标

把 Claude Design 生成的「我们的小世界 · Our World」高保真原型，**1:1 完整移植**到当前
React 19 + TypeScript + Vite 项目，替换掉现有的占位 Canvas + 三悬浮窗口旧 UI，让第一版
MVP 的 UI 结构、配色、排版、动效、交互与原型**完全一致**。

原型为浏览器内 Babel + 全局 window 作用域的设计参考（非生产代码），需按本项目的工程化
方式（ES 模块、TSX、打包器、CSS 文件）重建，**不照搬浏览器内 Babel 那套**。

## 二、原型构成（要复刻的范围）

| 原型文件 | 角色 |
|---|---|
| `Our World.html` | 壳：字体、**全部 CSS tokens（:root）**、场景/光线/天气 CSS、float 关键帧 |
| `app.jsx` | 根 `App`：实时时钟、天气（geolocation→open-meteo）、tweaks、导航、共享状态、持久化 |
| `scene.jsx` | `RoomScene` 全屏背景 + `RoomArt` 手绘等距房间 SVG（minimap 复用） |
| `hud.jsx` | 悬浮玻璃 HUD：卡片/chip、minimap、音乐位、Toolbox（开关组件 + 解锁编辑拖拽 + 吸附对齐线） |
| `screens.jsx` | `SubScreen` 居中弹窗：时间线 / 照片 / 文字回忆 / 心愿单（常驻挂载） |
| `calendar.jsx` | `CalendarScreen`（日历·约会）+ `ClockScreen`（时间·闹钟） |
| `settings.jsx` | `SettingsScreen`：个人资料 / 账号与密码 / 主题外观 |
| `sidebar.jsx` | `Sidebar`：Discord 式左侧弹出（世界身份 / 房间频道 / 房间配置 / 语音 / 在场 / 用户面板） |
| `space.jsx` | `SpaceScreen`：从 minimap 打开的空间切换器 |
| `music.jsx` | `MusicPlayer`：一起听歌（生成式 WebAudio pad） |
| `chat.jsx` | `Chat`：停靠/全屏消息、1:1 + 群聊、表情选择、拖拽改尺寸 |
| `icons.jsx` | 全部线性图标（`Ico` + 一堆 `I*`） |
| `image-slot.js` | Web Component `<image-slot>`：拖拽上传照片占位 |
| `tweaks-panel.jsx` | 宿主调试面板（**生产不需要，丢弃**，仅保留 useTweaks 等价的状态 hook） |

## 三、移植技术决策

1. **目录**：新建 `src/ow/`，按原型逐文件对应（`scene.tsx` / `hud.tsx` / …）。`App` 编排逻辑
   合并进 `src/pages/WorldPage.tsx`。
2. **全局 CSS**：`Our World.html` 的 `:root` tokens + glass 样式 + 场景/光线/天气 CSS + 关键帧，
   原样搬进 `src/ow/ow.css`，在入口 import 一次。字体走 Google Fonts（index.html link）。
3. **各组件内联 `<style>` 块**：原样保留（模板字符串 CSS 在 React 里照常工作）。
4. **window 全局 → ES 模块 import/export**。
5. **useTweaks**：去掉宿主 postMessage 协议，换成 localStorage 持久化的 `useOwTweaks`
   （mood / glassStyle / weather / hudLayout / density）。**丢弃浮动 TweaksPanel 调试面板**
   （它默认隐藏、不属于 MVP 可见 UI，去掉后可见界面与原型一致）。
6. **image-slot**：移植为 `src/ow/image-slot.ts`，持久化从 omelette sidecar 改为 **localStorage**，
   在 `main.tsx` 注册自定义元素，并给 `<image-slot>` 加 JSX 类型声明。
7. **TypeScript**：strict 已开。务实加类型，保证 `tsc -b` 通过；复杂处用合理的局部类型/`any`。
8. **清理旧 UI**：删除/替换 `src/components/world/` 下旧占位组件
   （WorldCanvas / FloatingMenu / FloatingPanel / CenteredPanel / panels/*）。

## 四、待实现 / 已知问题

- 天气走真实 geolocation + open-meteo，失败回退「多云 22°」。
- 生成式 WebAudio 必须用户手势后创建，禁止自动播放。
- 所有装饰动效 gate 在 `prefers-reduced-motion`。
- `backdrop-filter` + 位置动画的坑：拖拽移动非 glass 的 `.float` 外层；Sidebar 用 display 切换。
- 持久化 key 全 `ow-` 前缀（profile/rooms/meroom/widgets/wpos/dates/alarms/music/chat-size/posts/wishes）。

## 实现计划

进度：12 / 12 subtasks 完成（100%）· 完成日期 2026-06-21

> 命名决策：这套 UI 作为可扩展「皮肤(theme)」体系的第一套，目录定为 `src/themes/cinnaglass/`
> （cinnaglass = Cinnamoroll 大耳狗气质 + glassmorphism）。未来新皮肤平级放 `src/themes/<name>/`。
> 现阶段只分目录、不建主题切换引擎（等第二套皮肤出现再抽象）。

- [x] ST-1: 基础设施
   - 影响文件：`index.html`、`src/themes/cinnaglass/cinnaglass.css`、`src/themes/cinnaglass/image-slot.js`、`src/themes/cinnaglass/tweaks.ts`、`src/themes/cinnaglass/types.d.ts`、`src/main.tsx`
   - 说明：全局 CSS tokens + 场景/光线/天气 CSS 搬入 cinnaglass.css；字体走 Google Fonts；image-slot 移植 + localStorage 持久化；`<image-slot>` JSX 类型；useTweaks（localStorage 版）
- [x] ST-2: `src/themes/cinnaglass/icons.tsx`
   - 全部 `Ico` + `I*` 图标，currentColor 描边，ES 导出
- [x] ST-3: `src/themes/cinnaglass/scene.tsx`
   - `RoomScene` + `RoomArt` 等距房间 SVG（含两只 chibi 兔子）
- [x] ST-4: `src/themes/cinnaglass/hud.tsx`
   - 浮窗（DaysCard/MemoryCard/AnniversaryChip/AmbientPill/Minimap/LightingToggle）+ Toolbox + DraggableFloat + 吸附对齐线 + 布局预设 + `model.ts` 共享类型
- [x] ST-5: `src/themes/cinnaglass/screens.tsx`
   - `SubScreen`：时间线/照片/文字回忆/心愿单 + Composer
- [x] ST-6: `src/themes/cinnaglass/calendar.tsx`
   - `CalendarScreen` + `ClockScreen`（共享 .modal 壳）+ `rooms.ts` 共享房间数据/图标
- [x] ST-7: `src/themes/cinnaglass/settings.tsx`
   - `SettingsScreen`（个人资料/账号密码/主题外观）
- [x] ST-8: `src/themes/cinnaglass/sidebar.tsx`
   - `Sidebar`（含 MiniAva、房间频道、配置、语音、在场、用户面板）
- [x] ST-9: `src/themes/cinnaglass/space.tsx`
   - `SpaceScreen` 空间切换器
- [x] ST-10: `src/themes/cinnaglass/music.tsx`
   - `MusicPlayer` + 生成式 WebAudio pad（hud 依赖，提前到批 2 做）
- [x] ST-11: `src/themes/cinnaglass/chat.tsx`
   - `Chat` 停靠/全屏、1:1 + 群聊、表情选择、拖拽改尺寸
- [x] ST-12: 编排 + 清理 + 验收
   - `WorldPage.tsx` 合并 App 编排逻辑（实时时钟/天气/共享状态/导航/各弹窗挂载/持久化）；`App.tsx` 路由保持
   - 删除旧 world 组件（WorldCanvas / FloatingMenu / FloatingPanel / CenteredPanel / panels/*）
   - 拆出 `profile.ts`（满足 react-refresh：组件文件只导出组件）
   - 修 react-hooks 新规则 lint：scene 的 Box/Shadow 提到模块级；展开块（settings 密码 / sidebar 房间配置）改 CSS `grid-rows` 动画去掉 render 读 ref；Composer 的 imgId ref→state；effect 内 setState 加注释豁免
   - `tsc -b` + `vite build` + `eslint` 全部通过（57 模块）

## 测试记录

### 静态验收（已完成 2026-06-21）
- `npx tsc -b` → 通过，无类型错误
- `npx vite build` → 通过，57 模块，dist 产物正常（JS 370KB / gzip 112KB，CSS 37.6KB / gzip 8.15KB）
- `npx eslint src/themes src/pages/WorldPage.tsx` → 0 error 0 warning

### 待人工可视化验收（`pnpm dev`）
对照 `ai/design_handoff_our_world/screenshots/01-overview.png` 及原型 HTML 逐项核对：
- [ ] 主场景：等距房间 + 两只兔子 + 光线 mood（黄昏/暮色/夜晚）+ 天气层
- [ ] HUD 浮窗：days / minimap / 纪念日 chip / 最近回忆 / 时间天气 pill / 音乐 / 灯光切换；float 漂浮动画
- [ ] Toolbox：开关附加组件、解锁编辑拖拽 + 吸附对齐线 + 恢复默认位置
- [ ] SubScreen：时间线/照片墙/文字回忆/心愿单 + 发帖 Composer + image-slot 拖图
- [ ] 日历·约会 / 时间·闹钟弹窗
- [ ] 设置弹窗：个人资料/账号密码（展开动画）/主题外观（实时换肤）
- [ ] Sidebar：头像 dock 展开、房间频道切换、房间配置展开、语音、在场、用户面板 → 设置
- [ ] 空间切换器（从 minimap 打开）
- [ ] 音乐播放器：播放生成式 WebAudio、进度、切歌、静音
- [ ] 聊天：停靠↔全屏、1:1 + 群聊、表情选择、拖拽改尺寸
- [ ] 玻璃质感三套（云朵/天空/暮光）切换全局换色
- [ ] localStorage 持久化（刷新后状态保留）

### 已知差异 / 取舍
- 丢弃原型的宿主调试面板 `TweaksPanel`（默认隐藏，非 MVP 可见 UI）；换肤入口走「设置 → 主题外观」。
- `image-slot` 持久化从 omelette sidecar 改为 localStorage（key `ow-image-slots-v1`）。
- 字体走 Google Fonts CDN（国内加载速度优化为后续项，可换自托管 + 子集化）。