# 夜灯下的回忆 · 实装与局部细反光

2026-09-06。状态：用户采纳概念后已接入本地产品；未部署。概念参考见 [设计报告](codex-report.md)，样式真源为 `src/themes/cinnaglass/diary.css`，总览 `../ui-system.html` 直接引用它。

## 应用了什么

- 日记面板由大白纸改为烟茶色磨砂；标题保留柔和宋体风格，正文使用项目常规字体。去掉折角、封皮露边、书签和作者色左边线。
- 头像与姓名/时间独立于正文框。优先显示用户头像，无头像时使用已有原创蓝/粉小狗头像；身份只打头像细环与名字。
- 正文框同色、半实底，桌面内边距 20×22px、条目间距 36px；图在文下，照片也有内边距。长文最多五行，完整内容及所有原图在详情里。
- 写日记区和详情一起换成深色阅读材质，避免打开子层突然闪白；照片墙/心愿单不连带重做。
- 桌面 / 中档 / 小窗面板为 520 / 440 / 340px，小窗额外限制为舞台宽度减 32px。横屏小窗输入区可内部滚动，操作按钮不会被挤到窗口外。
- 实景发现原取景会遮挡角色，因此打开日记时整体拉近房间取景：房间画面连同家具、角色一起缩放，不挪人物相对座位的位置。纪念卡、音乐控件、聊天浮窗和房间切换把手暂时隐藏；组件不卸载、播放与聊天状态不重置，关闭日记即恢复。rail 保留。

## 局部细反光：采用什么，为什么

选用 **CSS 径向渐变 + 1px 镂空遮罩**。遮罩即“只让边缘露出来，挡住中间”。两层遮罩取不重叠部分，留下圆角环；环上的渐变只在右上迎光段、左下少量反射段显色，其他区域变透明。[MDN：mask-composite](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-composite)

没有采用整圈 box-shadow 发光：它强调的是轮廓，会回到概念图偏亮的铜框感；没有采用旋转扫光/指针追光：沉静阅读不需要不断移动的亮点；也没有上实时光照着色器：当前书房是固定机位，这个效果用一个装饰层即可表达。

这是假定书房固定暖灯方向的美术化反光，**不是从 Pixi 灯光实时计算的物理反射**。换房间/改变灯的位置时，要重新设定渐变起点。

实际核心规则（完整规则与降级分支见 diary.css）：

```css
.diary-surface::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    padding: 1px;
    border-radius: inherit;
    pointer-events: none;
    background:
        radial-gradient(ellipse 65% 38% at 100% 0%, rgba(var(--diary-light), var(--diary-rim)), transparent 80%),
        radial-gradient(ellipse 32% 22% at 0% 100%, rgba(var(--diary-light), .19), transparent 85%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
}
```

- 暖光色 `237,202,152`，迎光最大透明度 golden `.38` / twilight `.40` / night `.46`；这些是渐变起点的参数，不等于整条边缘亮度。
- 不给伪元素加 blur 或外发光，只有细边缘接光；`pointer-events:none` 确保它不会盖住关闭/滚动操作。
- 磨砂只发生在外面板：`backdrop-filter:blur(18px) saturate(85%)`。正文框/详情/缩略图徽章不叠第二层模糊。背景滤镜作用于元素后面的内容，不会模糊正文。[MDN：backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)
- 不支持遮罩时保留低对比普通细边；不支持背景滤镜，或用户请求减少透明度时，改用不透明深底。减少动态效果设置下，房间取景切换不做动画。
- 本次没有新增逐帧 JavaScript 动画、位图纹理或依赖包；仍需在真实低配设备量 GPU 开销，不能把“静态 CSS”当成零成本。

## 交互修正

用户点“记下这一刻”→本地输入区展开；点外/Esc→只收起输入区并保留文字和选图；重新打开→恢复草稿；点“取消”→清空。上述过程不请求后端写入，只有显式发布才走原有上传/发帖链路。

实测发现原 Esc 会冒泡到外层，输入框收起后日记也跟着关闭；现已在输入框层阻止传播。详情 Esc 同样只关闭详情，焦点回到原卡片；Tab 在详情里循环。隐藏物件面板加 inert，不参与键盘交互。

缩略图改成普通只读 `<img>`，避免 image-slot 带入“替换/移除”上传控件。详情仍按原链路获取原图，数据层、分页、多图 ≤9、40 分钟续签未改。

## 验证与证据

脚本：`scripts/check-diary.mjs`。独立 headless Chrome（无界面的真实浏览器）打开本地应用，使用已有帖子，不发布测试数据。截图使用真实产品 CSS，非 HTML 仿稿。结果见 [results.json](verification/results.json)。

| 场景 | 面板实测 | 辅助文字/采样外壳对比度 |
| --- | --- | --- |
| 1440×900 夜晚 | 520×790 | 8.28:1 |
| 1440×900 黄昏 | 520×790 | 6.75:1 |
| 1440×900 暮色 | 520×790 | 7.73:1 |
| 960×700 夜晚 | 440×628 | 8.26:1 |
| 640×400 夜晚 | 340×376 | 8.26:1 |

对比度使用截图中外壳空白边距的实际像素与辅助字色 `#bfb4a4` 计算；**不是全界面/每个像素都满足该值的声明**。滚动边缘的渐隐区不作为正文常驻阅读区。

已通过：

- 文字+图片草稿经 Esc/点外收起后仍保留；取消清空；没有后端发布。
- 一次选择十张本地图时截到九张；移除一张剩八张，收起重开仍为八张。
- 详情打开、Esc 仅关闭详情，日记保留。
- 三断点卡片和输入区没有横向溢出；640×400 展开态取消按钮可滚动到达。
- 五场景截图人工检查：两只角色均有可辨识脸部区域；小窗保留的是局部脸部，不宣称全身或两张完整正脸。
- 浏览器脚本未捕获未处理页面异常；本次改动的 screens.tsx / WorldPage.tsx ESLint 通过。
- Vite 产品打包通过。`tsc -b` 仍被已有 `shell/chat-card.tsx:10` 从 model 导入不存在的 `Msg` 阻断；未擅自修改聊天组件，不能宣称完整 `pnpm build` 通过。

未覆盖：125%/150% OS 缩放、低亮度真实屏幕、窄竖屏的独立房间构图、低端 GPU 长时间性能；本轮不重复做后端发帖与双端同步测试。

截图：[夜晚桌面](verification/night-1440.png) / [黄昏](verification/golden-1440.png) / [暮色](verification/twilight-1440.png) / [中档](verification/night-960.png) / [小窗](verification/night-640.png) / [小窗写日记](verification/composer-640.png)。截图含项目已有测试帖，不是本轮新增帖子。

## 文件职责

- `src/themes/cinnaglass/diary.css`：独立日记材质 token、局部反光、阅读布局、取景与降级规则。
- `src/themes/cinnaglass/screens.tsx`：头像/元信息/正文/照片结构、只读图片、键盘可操作的卡片与文件入口、Esc/焦点修正。
- `src/pages/WorldPage.tsx`：仅为舞台附上 `data-reading={screen === 'timeline' || undefined}`，让阅读态样式有准确开关；没有改动业务数据。
- `scripts/check-diary.mjs`：可重复运行的只读视觉与草稿验证。需要本地 dev server；可用 `DIARY_NODE_MODULES` 指向已有 Playwright/pngjs 包，不往项目安装新依赖。
- `ui-system.html`、STYLE/UX、timeline/PROJECT/TODO：采纳状态、日记例外规则与验证记录，旧白纸设计留档而非继续作为最终标准。
