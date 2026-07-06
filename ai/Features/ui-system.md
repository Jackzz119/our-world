# UI System · cinnaglass 结构 / 复用 / 风格盘点 系统设计文档

> 最后更新：2026-07-05（初版，shadcn 移除同日）
> 目标：为「统一 theme UI 风格、美化视觉、复用 UI 组件、开发多个 theme」打基础
> 关联：`ai/Features/handoff-claude-design.md`（cinnaglass 复刻来源）、`ai/Features/timeline.md`（SubScreen 数据化）

---

## 一、功能目标

1. **盘点现状**：cinnaglass theme 的文件结构、样式模式、可复用原子，形成唯一参考
2. **收敛重复**：同一视觉概念只有一份实现（modal 外壳、主按钮、渐变 chip 等目前有重复）
3. **定义 theme 契约**：明确「一个 theme 必须提供什么」，让第二个 theme 的开发是加文件夹而不是改架构
4. **shadcn 已移除**（2026-07-05，UX 评估）：商业 SaaS 设计语言与玻璃拟态/多世界观 theme 路线不匹配，且零业务引用。全项目回归自有 CSS 体系；将来需要无障碍行为层时按需单独引 radix primitive，不再引壳。

---

## 二、当前分层结构

```
src/
├── index.css                     # 全局：最小 reset（等效 preflight）+ 基础字体，无品牌内容
├── pages/                        # 路由页（Login / ResetPassword / World / ProtectedRoute）
│   └── LoginPage.module.css      #   页面私有样式用 CSS Module，复用 cinnaglass 原子类
└── themes/cinnaglass/            # theme = 一个自带世界观的文件夹
    ├── cinnaglass.css            # ① 设计 token + 全局原子类 + 场景氛围层（唯一全局 CSS）
    ├── icons.tsx                 # ② 自有图标库（stroke 风格统一，IcoProps 接口）
    ├── image-slot.js             # ③ web component（shadow DOM 自带样式，跨框架）
    ├── model.ts / profile.ts / contacts.ts / chat-data.ts / rooms.ts / tweaks.ts   # 数据与 mock
    └── *.tsx                     # ④ 功能组件，每个自带 <style> 块（XxxStyles 模式）
        # sidebar(34K) hud(27K) screens(25K) calendar(19K) settings(18K)
        # scene(13K) music(12K) channel-screen(11K) lobby(8K) chat-dock(8K) space(8K)
```

**样式的四种载体**（按优先级从全局到局部）：

| 载体 | 位置 | 用途 | 约定 |
| --- | --- | --- | --- |
| 全局 token + 原子类 | `cinnaglass.css` | 跨组件复用的"长相"（颜色/玻璃/圆角/按钮/弹窗壳） | 原子类只定义长相，尺寸间距交给使用处 |
| 组件 `<style>` 块 | 各 `*.tsx` 内 `XxxStyles` 组件 | 该功能域私有样式 | 类名带域前缀（`.tl-` `.pw-` `.cal-` `.sb-`…），随组件挂载生效 |
| CSS Module | `pages/*.module.css` | 页面级私有样式 | 与原子类组合：`className={`btn-primary ${styles.submit}`}` |
| shadow DOM | `image-slot.js` | web component 内部样式，与外界隔离 | 外部只通过属性（shape/radius/fit）和 CSS part 定制 |

---

## 三、设计 token 清单（cinnaglass.css `:root`）

| 组 | token | 说明 |
| --- | --- | --- |
| 调色板 | `--sky-1/2/3` `--cream` `--butter` `--blush` `--navy-1/2/deep` | Cinnamoroll 奶油蓝基调 |
| 玻璃 | `--glass-bg/bg-2/border/hi/blur/sat/shadow/text/sub/glow` | 玻璃拟态全套，被 `.glass` mixin 消费 |
| 强调色 | `--accent` `--accent-deep` | 主蓝；**时间线作者标识**：我=accent 蓝、对方=粉 `#EF9DB4`（screens.tsx） |
| 圆角 | `--r-lg(24) --r-md(18) --r-sm(14) --r-pill` | 全站圆角阶梯 |
| 玻璃变体 | `[data-glass='cloud'/'sky'/'twilight']` | 整组覆写 glass token，一键换玻璃质感 |
| 场景氛围 | `[data-mood='golden'/'twilight'/'night']` + `[data-wx='sun'/'rain'/'snow']` | 场景渐变/滤镜/粒子层，与 UI token 独立 |

---

## 四、可复用原子清单（谁在用 · 现状）

| 原子 | 定义处 | 使用方 | 状态 |
| --- | --- | --- | --- |
| `.glass` 玻璃表面 | cinnaglass.css | 几乎所有卡片/浮窗 | ✅ 健康 |
| `.btn-primary` 渐变主按钮 | cinnaglass.css | 登录、大厅 CTA、发布按钮 | ✅ 健康（UI-2 已收敛） |
| `.chip-accent` 渐变圆 chip | cinnaglass.css | composer 入口、心愿单添加 | ✅ 健康（UI-2 新增原子） |
| `.field` 玻璃 pill 输入框 | cinnaglass.css | 登录/重置密码 | ✅ 健康 |
| `.sw` 开关 | cinnaglass.css | hud Toolbox / 设置 / 闹钟 | ✅ 健康 |
| `.card` 卡片基座 | cinnaglass.css | hud 浮窗 / 音乐播放器 | ✅ 健康 |
| `.modal-scrim/.modal(.mini/.tall)/.modal-hd/.modal-x/.modal-body` 弹窗壳 | cinnaglass.css（全局唯一） | SubScreen / 日历 / 时钟 / 设置 / 空间切换 | ✅ 健康（UI-1 已去重，`.tall` 为长卷轴变体） |
| `.num` 数字字体 | cinnaglass.css | 天数/时钟等数字 | ✅ 健康 |
| 场景层（`.scene-*` `.mood-*` `.wx-*` `.scrim-*` `.lobby-*`） | cinnaglass.css | scene / lobby | ✅ 健康 |
| `float A/B/C` `beat` 动画 | cinnaglass.css | HUD 悬浮 / 心跳 | ✅ 健康 |
| `icons.tsx`（IcoProps） | theme 内 | 全部组件 | ✅ 健康，风格统一 |
| `<image-slot>` | image-slot.js | 时间线卡片 / 场景（照片墙改用原生 `<img>` 做自然纵横比、Composer 改用受控多图选择器 `.pk-*`，均 2026-07-05） | ✅ 健康（UI-3 已 token 化：`--slot-accent` → `--accent-deep` 兜底） |
| `MascotSvg` 云朵小狗（蓝/粉，原创绘制） | screens.tsx | 时间线宽屏两侧（≥1200px，`.tl-mascot`） | ✅ 新增（2026-07-05）；将来其他场景要用可提升为独立模块 |

**已知重复 / 待收敛**：UI-1~3 已于 2026-07-05 全部收敛（弹窗壳去重、btn-pub/chip 归一、image-slot 主题色 token 化），当前无已知重复实现。新增复用组件：时间线 rail 头像 `Avatar`（screens.tsx，uid 散列渐变底色）、照片墙 lightbox（`.lb` 样式域）。

---

## 五、多 theme 设计原则（为第二个 theme 定的契约草案）

1. **theme = 文件夹**：`src/themes/<name>/`，自带 token CSS、图标、组件、场景。换 theme 是换挂载的文件夹，不是换变量表——世界观级差异（布局/动效/意象）允许结构不同
2. **token 命名保持语义中立**：`--glass-*` `--accent` `--r-*` 不带品牌词，第二个 theme 可以同名不同值地实现，页面层（pages/）只消费语义 token 和原子类名，不感知具体 theme
3. **pages 层是 theme 无关的**：Login/World 只用原子类（`.glass` `.btn-primary` `.field`）+ 自己的 Module；theme 切换时原子类的"长相"随 theme CSS 变
4. **跨 theme 共享的只有两类**：数据层（lib/hooks/types）和行为骨架（将来如需 a11y 行为层，按需引 radix primitive，不引样式壳）
5. **web component 是 theme 资产**：image-slot 属 cinnaglass；第二个 theme 可复用，但主题色必须走 token 穿透，不得硬编码

---

## 六、设计参考（design mockups）

> **管辖与归档规则（2026-07-05 用户裁决）**：theme mockup 资产归 **ux skill** 管理（已写入 `.claude/skills/ux/SKILL.md`），不归 feature。约定路径：**`ai/design_system/<theme>/`**，本 theme 即 `ai/design_system/cinnaglass/`——**所有产出的 mockup 必须归档进去**，作为搭建 design system 的素材。关键视觉决策先在 mockup 里同 token 比稿再落码。

| 文件 | 说明 |
| --- | --- |
| `ai/design_system/cinnaglass/timeline-redesign.html` | timeline「共写日记流」+ 照片墙「拼贴手帐墙」的视觉基准（2026-07-05 用户拍板）。日期手帐贴纸、头像贴纸挂卡、点线小路、polaroid 白框 + washi 胶带均以此为准；配色/圆角/玻璃全部取自 cinnaglass token |
| `ai/design_system/cinnaglass/composer-redesign.html` | 白底卡片基准 + composer 上传区三方案（选 V1 宽条拖放区）+ 发布 CTA 三方案（选 B1「✨ 记下这一刻」，含禁用/发布中状态）比稿（2026-07-05 用户拍板） |
| `ai/design_system/cinnaglass/timeline-mascot-multiimg.html` | 吉祥物摆位三方案（选 P1 两侧守望：原创云朵小狗 SVG，蓝左粉右）+ composer 多图选择器（缩略图行 ×/＋/9 张上限）+ 卡片「＋N 张」徽标与 6 行省略 比稿（2026-07-05 用户拍板） |
| `ai/design_system/cinnaglass/composer-compact.html` | composer 高度三方案（选 H2 紧凑 ≈124px：一行起步 + 照片圆钮入行 + 拖放条撤销）+ 草稿交互规则拍板稿（点外部/Esc=存草稿收起、取消=唯一清空；折叠 pill 草稿预览态）（2026-07-06 用户拍板） |

**timeline 设计原则（2026-07-05 调研裁决）**：亲密内容用**单列日记流**（Between/Day One/恋爱记/SumOne 的行业共识）；中央脊线 + zigzag 是企业「发展历程」页的技术叙事，禁止再回潮。位置只管自上而下的节奏，身份只靠作者色（ST-O 裁决的延续）。

## 实现计划

进度：4 / 5 subtasks 完成（80%）

- [x] **UI-0: shadcn 全量移除**（2026-07-05，tsc/eslint/build 绿 + 浏览器视觉回归通过）
   - 影响文件：删 `src/components/ui/*`（7 个，零业务引用）、`components.json`、`src/lib/utils.ts`；`index.css`（去 tailwind import + shadcn 假 token，换等效最小 reset）；`vite.config.ts`（去 tailwindcss 插件）；`package.json`（-7 依赖 / -87 包）
   - 说明：UX 评估判定 shadcn 的商业 SaaS 语言与玻璃拟态 + 多世界观 theme 路线不匹配。验证：大厅/房间/时间线/照片墙/登录页逐屏比对无回归
- [x] **UI-1: 删除 screens.tsx 中重复的弹窗壳样式**（2026-07-05，随 timeline 重设计 ST-K 一并落地）
   - ScreenStyles 里 `.modal-scrim/.modal/.modal-hd/.modal-x/.modal-body` 残留拷贝已删，全局唯一实现在 cinnaglass.css；新增 `.modal.tall` 变体（长卷轴弹窗用）
- [x] **UI-2: `.btn-pub` 收敛到 `.btn-primary`**（2026-07-05）
   - 发布按钮改 `className="btn-primary btn-pub"`（`.btn-pub` 只剩 padding/font-size）；蓝渐变圆 chip 提为 cinnaglass.css 原子 `.chip-accent`（composer `.pchip` / 心愿单添加按钮共用，尺寸交使用处）
- [x] **UI-3: image-slot 主题色 token 化**（2026-07-05）
   - 4 处 `#c96442` 改为 `var(--slot-accent, var(--accent-deep, #4fa9dc))`（自定义属性穿透 shadow DOM 继承）；拖放高亮底色用 `color-mix(... 12%, transparent)` 跟随 accent
- [ ] **UI-4: theme 契约落地检查单**
   - 影响文件：本文档 + 新 theme 脚手架时执行
   - 说明：把「五、多 theme 设计原则」转成第二个 theme 的开工检查单（token 覆盖表、原子类实现清单、pages 层零改动验证）

## 测试记录

- 2026-07-05 UI-0：移除后 `pnpm build` 绿（CSS 16.29KB）；浏览器实测大厅、进入世界、时间线（含发帖传图）、照片墙、登录页视觉无回归，console 无错误。
