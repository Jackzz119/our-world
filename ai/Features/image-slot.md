# image-slot · `<image-slot>` Web Component 研究 / 链路文档

> 最后更新：2026-06-27
> 关联代码：`src/themes/cinnaglass/image-slot.js`（508 行）、注册于 `src/main.tsx`
> 关联文档：`ai/Features/timeline.md`（ST-4 给它加 `slot-change` 出口）、`ai/Features/handoff-claude-design.md`（来源：Claude Design 原型）

---

## 〇、一句话回答你的三个问题

1. **它是不是手写的自定义 DOM？** —— 是。它是一个标准 **Web Component**（`customElements.define('image-slot', …)`），等于自己造了一个新 HTML 标签 `<image-slot>`，内部用 **Shadow DOM** 封了样式和结构。
2. **为什么这么复杂？** —— 复杂度**几乎全来自功能本身**（拖拽上传 + 客户端压缩 + 平移/缩放裁剪 + 多实例同步 + 持久化 + 样式隔离），不是因为它是 Web Component。换成 React 组件，这些命令式逻辑只会更别扭。
3. **直接包成 React 组件不行吗？** —— 行，但有取舍。详见「五」。结论：**现阶段保留 Web Component，付一座很小的「事件桥」成本即可**；不值得现在重写。

---

## 一、它是什么

`<image-slot>` 是一个**可填充的图片占位组件**：给它一块区域，用户把图片拖进来（或点选文件），它会：

- 把图片**在浏览器端压缩**成 ≤1200px 的 webp dataURL；
- 存进 **localStorage**（按 `id` 持久化，刷新不丢）；
- 支持双击进入**裁剪模式**（平移 / 滚轮缩放 / 拖角缩放）；
- 多个相同 `id` 的实例**自动同步**显示。

它被复刻自 Claude Design 原型，所以**天生是框架无关的原生组件**，不是为 React 写的。

### 用到的浏览器原生能力

| 能力 | 用途 |
|---|---|
| **Custom Elements** | 定义 `<image-slot>` 新标签 + 生命周期回调 |
| **Shadow DOM** | 把内部结构/CSS 封装隔离，外部样式进不来、内部样式漏不出 |
| **`createImageBitmap` + `<canvas>`** | 客户端解码 + 缩放 + 重新编码为 webp |
| **Pointer Events + `setPointerCapture`** | 裁剪模式下的平移/缩放拖拽 |
| **Drag & Drop API** | 拖图进框 |
| **ResizeObserver** | 容器尺寸变化时重算图片铺满 |
| **localStorage** | 持久化 + 模块级 pub/sub 同步 |

---

## 二、整体结构（鸟瞰）

整个文件是一个 **IIFE**（`(() => { … })()`，立即执行、不污染全局），内部分四层：

```
IIFE
├── ① 常量            STORE_KEY / MAX_DIM=1200 / ACCEPT(允许的图片类型)
├── ② 持久化 store     slots 对象 + subs 订阅集 + getSlot/setSlot/save  ← 模块级、所有实例共享
├── ③ 图片压缩         toDataUrl(file, targetW)  ← canvas 缩放→webp
└── ④ class ImageSlot extends HTMLElement   ← 组件本体
    └── customElements.define('image-slot', ImageSlot)  ← 注册标签
```

关键设计：**store 是模块级的、独立于任何一个实例**。`<image-slot>` 实例只是 store 的「视图」——这就是为什么同 `id` 的多个槽能同步（store 一变，通知所有订阅的实例重渲染）。

---

## 三、逐块代码详解

### ① 常量（L9-11）
```js
const STORE_KEY = 'ow-image-slots-v1';   // localStorage 的 key
const MAX_DIM   = 1200;                   // 压缩后最长边上限
const ACCEPT    = ['image/png','image/jpeg','image/webp','image/avif'];
```

### ② 持久化 store + 发布订阅（L13-45）
```js
const subs = new Set();   // 所有实例的「重渲染」回调
let slots = {};           // { [id]: {u:dataURL, s:缩放, x,y:平移} }
```
- `save()`（L22）：把 `slots` 写回 localStorage（配额满/隐私模式静默失败）。
- `getSlot(id)`（L33）：取某个 id 的值，兼容老格式（纯字符串 → 补成 `{u,s:1,x:0,y:0}`）。
- `setSlot(id,val)`（L39）：写入/删除 → `save()` → **`subs.forEach(fn=>fn())` 通知所有实例重渲染**。← 多实例同步的核心。
- `clampS`（L31）：把缩放限制在 1~5 倍。

> 这一层就是个**迷你状态管理**：store 持有数据，实例订阅变化。概念上和 Redux/zustand 一模一样，只是手写的、存 localStorage。

### ③ 客户端压缩 `toDataUrl`（L48-63）
```js
const bitmap = await createImageBitmap(file);     // 解码
const cap = Math.min(MAX_DIM, targetW*2 || MAX_DIM);
const scale = Math.min(1, cap / max(宽,高));       // 不放大、只缩小
// 画到 canvas → canvas.toDataURL('image/webp', 0.85)
```
作用：把用户原图缩到合理尺寸、转 webp，**减小体积**（因为最终要 Base64 存进 DB 的 `posts.images`，体积敏感）。`bitmap.close()` 释放内存。

### ④ Shadow DOM 样式表 `stylesheet`（L66-112）
一大段 CSS 字符串，注入 shadow root。定义：`.frame`（图片框）、`.empty`（空态提示）、`.ring`（虚线边框）、`.spill` + `.handle`（裁剪模式的可视溢出图 + 四角控制点）、`.ctl`（替换/移除按钮）、`.err`（错误提示）。`:host([data-xxx])` 是组件自身在不同状态（拖拽悬停/已填充/裁剪中）下的样式开关。

### ④ 图标 `icon`（L114-118）
空态里那个「图片」线性图标的 SVG 字符串。

### ④ class ImageSlot（L120-502）

**`observedAttributes`（L121）**：声明要监听的属性 `shape/radius/mask/fit/position/placeholder/src/id`，任一变化触发 `attributeChangedCallback` → 重渲染。

**`constructor`（L125-272）**：组件被创建时跑一次。
- `attachShadow({mode:'open'})` 建 shadow root，`innerHTML` 塞入模板：`<style>` + `.frame`(含 `<img>` + `.empty` + `.ring`) + `.spill`(含 ghost 图 + 4 个 handle) + `.ctl`(替换/移除按钮) + 隐藏的 `<input type=file>`。
- 缓存一堆 DOM 引用（`_img/_empty/_spill/_input…`）。
- `_depth`：dragenter/leave 计数器（防子元素抖动）。`_gen`：**异步竞态守卫**（多次拖图时，只认最后一次的解码结果，见 `_ingest`）。`_view`：当前 `{s,x,y}` 视图变换。
- 绑定一堆交互：空态点击→开文件选择；`.ctl` 的替换/移除；文件选完→`_ingest`；图片 load→`_applyView`；**双击→进/出裁剪模式**；`.spill` 上 pointerdown→**平移 或 拖角缩放**（一大段几何计算 L201-235）；**滚轮→以光标为中心缩放**（L252-271）。

**`connectedCallback`（L274-283）**：元素挂进 DOM 时——注册拖放监听、`subs.add(_subFn)` 订阅 store、`ResizeObserver` 监听自身尺寸、首次 `_render()`。

**`disconnectedCallback`（L285-296）**：移除时清理上面所有监听（防内存泄漏）。

**`_enterReframe/_exitReframe`（L298-322）**：进入/退出裁剪模式。进入时加「点外部/按 Esc 退出」监听；退出时 `_commitView()` 把裁剪结果存盘。

**`handleEvent`（L328-348）**：统一处理 dragenter/over/leave/drop。drop 时取第一张图 → `_ingest`。

**`_ingest`（L350-373）** ← **写入的核心**：
```js
校验类型 → const gen = ++this._gen;        // 标记本次操作
const url = await toDataUrl(file, w);       // 压缩(异步)
if (gen !== this._gen) return;              // 期间又拖了新图 → 丢弃旧结果
const val = { u:url, s:1, x:0, y:0 };
if (this.id) setSlot(this.id, val);         // 有 id → 存 store(并同步所有实例)
else { this._local = val; this._render(); } // 无 id → 只存实例自己、不进 localStorage
```
> **ST-4 要动的就是这里**：在成功后多派发一个 `slot-change` 事件，把 `url` 抛给 React。

**`_setError`（L375-392）**：在 shadow 里浮一条 3 秒自动消失的错误提示。

**`_reframes`（L394-396）**：只有「已填充 + fit=cover」才允许裁剪。

**`_geom/_clampView/_applyView/_commitView`（L398-449）**：裁剪模式的几何数学。
- `_geom`：算图片自然尺寸、框尺寸、`base`（铺满所需缩放）。
- `_clampView`：限制平移，保证图始终盖满框、不露白边。
- `_applyView`：把 `_view{s,x,y}` 翻译成 `<img>` 的 width/height/left/top（cover 模式手动定位；其它模式交给 `object-fit`）。
- `_commitView`：把当前视图存回 store。

**`_render`（L451-501）** ← **显示的核心**：
```js
按 shape/radius/mask 设圆角、裁剪;
let stored = this.id ? getSlot(this.id) : this._local;   // 取数据
if (stored.u 不是 data:image) stored = null;             // 安全过滤
const url = stored?.u || this.getAttribute('src');        // ★ 优先 store,回退到 src 属性
if (url) { 显示 <img src=url>, 标 data-filled, _applyView() }
else     { 显示空态提示 }
```
> **ST-3 读取要用的就是这里的 `src` 回退**：`<image-slot src={dataUrl}>`（不传 id）→ store 没东西 → 直接显示 `src`，不碰 localStorage。

**注册（L504-506）**：`customElements.define('image-slot', ImageSlot)`，从此 HTML 里写 `<image-slot>` 就活了。

---

## 四、为什么「这么复杂」

把复杂度拆开看，**没有一块是为了「做成 Web Component」而存在的**，全是功能需求：

| 复杂的部分 | 是哪条功能要求的 |
|---|---|
| store + 订阅 + localStorage | 持久化 + 同 id 多实例同步 |
| `createImageBitmap`/canvas/webp | 客户端压缩（省 DB 体积） |
| pointer capture + 几何计算 + 滚轮 | 平移/缩放裁剪 |
| Drag&Drop + depth 计数 | 拖图上传 |
| `_gen` 竞态守卫 | 连续拖图时防止旧解码覆盖新图 |
| ResizeObserver + `_applyView` | 容器变尺寸时图片重新铺满 |
| Shadow DOM + 大段 CSS | 样式隔离（原型里能稳定复用） |

**换成 React 组件，这些逻辑一行都省不掉**——而且其中大半是**命令式**（canvas、指针捕获、拖放、ResizeObserver），React 的声明式渲染模型反而要靠一堆 `useRef` + `useEffect` 去操作真实 DOM，写起来更绕。

---

## 五、那为什么不直接写成 React 组件？取舍分析

### Web Component 方案（现状）

✅ **优点**
- **框架无关**：原型是纯 HTML/JS，直接搬过来零改写就能用。
- **样式隔离**：Shadow DOM 保证组件 CSS 不被全局污染、也不污染别人。
- **封装彻底**：所有脏活（指针/canvas/拖放）锁在组件内，外部只看到一个标签。
- **跨主题复用**：未来换皮肤，`<image-slot>` 照用。

❌ **代价**
- **和 React 的边界要架桥**：React 不能直接读它内部状态。
  - 传入：靠 HTML **属性**（`src` / `id`）——React 能传。
  - 传出：靠**自定义事件**（`dispatchEvent`）——**这就是 ST-4 要加 `slot-change` 的唯一原因**：让 React 拿到用户拖进来的 dataURL。
- 类型提示弱（JSX 里它是 `any`-ish 的标签）。

### 改写成 React 组件方案

✅ **优点**
- 数据天然在 React state 里，发帖取 dataURL 不用事件桥，`onChange={dataUrl => …}` 一把梭。
- 类型完整、和项目其它组件一致。

❌ **代价**
- 要**重写全部命令式逻辑**（拖放、canvas 压缩、pointer 裁剪、ResizeObserver），用 ref/effect 模拟，工作量不小、且容易引新 bug。
- 丢掉 Shadow DOM 的样式隔离（要改用 CSS Module / scoped 方案）。
- 现成的、已经能跑的东西推倒重来，**ROI 低**。

### 结论 / 建议

**现阶段保留 Web Component**：它已经能用，代价只是「发帖时多监听一个 `slot-change` 事件」——一座很便宜的桥。等到这个桥真的成为开发摩擦（比如要做复杂的受控表单、多图排序、和 React 状态深度联动）时，再考虑用 React 重写或用 `@lit/react` 之类做轻量包装。**别为消除一个事件监听去重写 300 行成熟代码。**

---

## 六、与 React 的桥接链路（落到 timeline）

```
【写 · 发帖】
用户拖图 → <image-slot>(无id) 内部生成 dataURL
  → emitChange() 派发 'slot-change'(bubbles+composed,穿透 shadow DOM)   ← ST-4 新增
  → Composer(React) 用 ref 监听到 → 存进 state
  → 点发布 → createPost({ coupleId, content, images:[dataUrl] })          ← coupleId 来自 useFeed
  → reload() 刷新 feed

【读 · 渲染】                                                              ← ST-3
useFeed 拉回 posts
  → 每条 post: <image-slot src={post.visible_images[0]}>(无id,只读显示)
```

要点：
- **写**走「事件出」，**读**走「属性入（`src`）」，方向相反、互不干扰。
- 渲染用的 `<image-slot src>` **不传 id**，所以不写 localStorage、不和发帖用的槽串数据。
- `useFeed` / `Composer` / `createPost` 全在 React 侧，`image-slot` 不参与——它只负责「把拖进来的图吐出来」和「把给它的图显示出来」。

---

## 七、待办（与本文件相关）

- [ ] ST-4：给 `image-slot.js` 加 `emitChange()` + 在 `_ingest` 成功 / 移除时派发 `slot-change`（详见 `timeline.md`）。
- [ ] （可选，later）给 `<image-slot>` 补 TypeScript 标签类型声明，改善 JSX 里的类型提示。
- [ ] （观察）若事件桥成为摩擦点，再评估 React 重写 / `@lit/react` 包装。
