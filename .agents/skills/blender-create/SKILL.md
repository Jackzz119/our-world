---
name: blender-create
description: Use this skill when the user asks to create, modify, render, or export 3D models/scenes in Blender — via headless CLI scripts or MCP. Triggers on phrases like "在 Blender 里生成", "帮我建模", "生成场景", "调整模型", "渲染", "修改贴图", "retopo", "绑定骨骼", "rigging", "导出 GLB", "导出 GLTF", or any request involving Blender scene building, stylized/pastel look dev, self-check render loops, or exporting assets for Three.js / React Three Fiber.
version: 2.0.0
---

# blender-create 技能

## 概述

指导 Claude 完成 Blender 3D 资产制作全流程：场景生成 → 渲染自检 → 材质/绑骨 → 导出 GLB 给 R3F。
**两条管线，默认走无头 CLI**（2026-07-12 metaspace 实战定型）：

| 管线 | 何时用 | 方式 |
|------|--------|------|
| **无头 CLI（主）** | 场景批量建造、可复现迭代 | `blender -b --python build_xxx.py`，参数化脚本是唯一事实源 |
| MCP 交互（辅） | 实况查看用户打开的 Blender、微调、读 .blend | 官方 blender MCP（见下方工具表与接入） |

深度参考按需读 [reference.md](reference.md)：重拓扑 / 骨骼绑定 / 贴图节点 / R3F 加载代码。

---

## 一、无头 CLI 管线（主力）

### 核心循环（每个 Pass）

```
改脚本 → blender -b --python script.py → 出固定机位渲染 PNG
       → Claude 用 Read 工具直接读图 → 按清单自检打分 → 再改脚本
```

- 脚本模板结构：常量区（色板/尺寸）→ helper（mat/box/cyl/ball/cut）→ 建造 → 灯光 → 相机 → 渲染输出 → `save_as_mainfile`
- **脚本重跑 = 全场景重建**，禁止依赖 .blend 里的手工状态；用户手改的需求要回灌进脚本参数
- 渲染审查机位固定 3~5 个（默认游戏视角 / 顶视 / 细节近景 / 外观 / 特写区域），文件名 `passNN_<cam>.png`
- 切面渲染（隐藏遮挡墙/屋顶）用**前缀匹配**收集隐藏对象，避免新增部件漏隐藏产生"悬空窗框"类穿帮

```python
CUTAWAY_PREFIXES = ("House_Wall_S", "House_Roof", ...)
def cutaway_objs():
    return [o for o in bpy.data.objects
            if any(o.name.startswith(p) for p in CUTAWAY_PREFIXES)]
```

### 自检清单（读渲染图后逐项打分，≥4/5 过关）

1. 色板忠实度（无脏色/过曝/洗灰） 2. 比例构图 3. 形体语言 4. 光影（主光方向/无死黑） 5. 技术卫生（穿插/漏缝/悬空/命名）

### 运行命令（Windows）

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b --python "path\to\build.py"
```

输出用 `Select-String "Error|Traceback|Saved:"` 过滤。渲染 1280×720 EEVEE 64 采样约 2~3 秒/张。

---

## 二、风格化渲染关键知识（实战踩坑结晶）

### 色彩管理：粉彩/卡通风必换 Standard

Blender 默认 **AgX** 视图变换（胶片模拟曲线）会把粉彩色全部压灰——粉彩场景第一渲染必然"洗灰"。风格化场景直接换：

```python
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = -0.15   # Standard 无高光保护，易过曝，用曝光补偿控制
```

代价：Standard 下高光直接裁切（纯白一片），所以灯光能量要显著低于 AgX 习惯值（Sun 2~3 而不是 5+）。

### CSS 色板 → Blender 线性色

CSS hex 是 sRGB 空间，Blender 材质吃线性空间，直接抄 hex 会偏色。统一换算：

```python
def hx(h, alpha=1.0):
    h = h.lstrip("#")
    s = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((c ** 2.2) for c in s) + (alpha,)
```

建 PALETTE 字典管理，建模代码禁止裸 RGB 魔法数。

### 三层灯光配方（日光基准）

```python
# 1. 暖阳主光：定方向、产生窗格影
light("Sun", "SUN", energy=2.6, color=(1.0, 0.95, 0.85), rot=...)
# 2. 窗口冷补：天空色大面积 Area 贴在窗外朝内
light("WindowFill", "AREA", energy=80, color=PALETTE["sky_2"][:3], size=(5, 2.2))
# 3. 室内暖补：极低能量防死黑（层叠结构下每层单独补）
light("Interior", "AREA", energy=22, color=PALETTE["butter"][:3])
```

灯具/炉火用材质自发光（emit 1~2.5，过高必过曝）+ 低能量点光源双保险。

### 软糖感形体

- 全部体块加 Bevel modifier（width 0.02~0.06，segments 3）
- 软装用压扁球 `ball(squash=0.5~0.6)`；注意压扁后半高 = r×squash，**落地 z 要重算**否则悬空
- 精确几何（屋顶/异形）不要用"旋转+缩放 primitive"投机——旋转与缩放顺序会打架。直接 `from_pydata` 手工构网格：

```python
verts = [(-rx, -ry, 0), (rx, -ry, 0), (rx, ry, 0), (-rx, ry, 0),
         (-RIDGE_X, 0, H), (RIDGE_X, 0, H)]          # 四坡顶：4 檐角 + 2 脊点
faces = [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (0, 3, 2, 1)]
mesh = bpy.data.meshes.new(name); mesh.from_pydata(verts, [], faces); mesh.update()
```

- 墙面开洞（门窗）用 boolean DIFFERENCE cutter，应用后删 cutter；玻璃+窗框单独放

---

## 三、Blender 5.1 API 要点

| 事项 | 说明 |
|------|------|
| 渲染引擎 | `try: engine="BLENDER_EEVEE_NEXT" except TypeError: "BLENDER_EEVEE"`；EEVEE 有 `use_raytracing` 则开 |
| `use_nodes` | Material/World 的 `use_nodes=True` 在 5.1 报 DeprecationWarning（6.0 将移除），目前仍必须写 |
| 玻璃材质 | `Transmission Weight`=1 + `Alpha`≈0.18 + `m.surface_render_method = "BLENDED"`（旧 `blend_method` 已废弃） |
| 自发光 | Principled 的 `Emission Color` + `Emission Strength` 输入 |
| 无阴影 | 远景装饰体 `obj.visible_shadow = False`（EEVEE Next 支持），防止云/远景压暗主体 |
| 平滑 | `polygons.foreach_set("use_smooth", [...])`；球体逐面 `use_smooth=True` |
| 空场景 | `bpy.ops.wm.read_factory_settings(use_empty=True)` 比逐个删除干净 |
| 尺寸 | box 用 scale 后 `transform_apply(scale=True)`，避免 modifier 受非均匀 scale 影响 |

---

## 四、官方 Blender MCP（交互辅助线）

> 2026 官方版（projects.blender.org/lab/blender_mcp，包 blmcp）。**与旧社区版 ahujasid/blender-mcp 完全不同**，旧版工具名（get_scene_info / polyhaven / hyper3d 等）已不存在，不要再引用。

### 接入（本机已配好，会话重启即生效）

- `.mcp.json`：`uvx --system-certs --from "git+https://projects.blender.org/lab/blender_mcp.git#subdirectory=mcp" blender-mcp` + `UV_CACHE_DIR` 独立缓存（公司网络证书拦截 + pywin32 缓存锁两坑的解法，详见 memory `blender-mcp-official-setup`）
- Blender 侧需装官方 add-on（lab.blender.org 拖入 ×2）并启动；旧社区版插件（占 9876 端口）停用

### 常用工具（26 个中的主力）

| 工具 | 用途 |
|------|------|
| `execute_blender_code` | 在**用户开着的 Blender** 里执行 Python（结果赋给 `result` dict 返回） |
| `get_objects_summary` / `get_object_detail_summary` | 场景/单物体结构化摘要 |
| `get_screenshot_of_window_as_image` / `get_screenshot_of_area_as_image` | 截图回看 |
| `render_thumbnail_to_path` / `render_viewport_to_path` | 渲染到文件 |
| `*_for_cli` 系列 | 后台 Blender 打开指定 .blend 执行（不依赖 add-on 交互会话） |
| `search_api_docs` / `get_python_api_docs` / `search_manual_docs` | 内置 API/手册全文检索 |

### 分工原则

- 批量建造/重建 → 无头脚本；给用户实时看效果、对着同一窗口讨论微调 → MCP
- MCP 里做出的满意改动**必须回灌到建造脚本**，否则下次重建即丢失

---

## 五、导出 GLB 与 R3F

```python
bpy.ops.export_scene.gltf(
    filepath=path, export_format='GLB',
    export_materials='EXPORT', export_cameras=False, export_lights=False,  # R3F 自己打光
    export_animations=True, export_skins=True, export_apply=True, export_yup=True)
```

- 预算参考：场景 ≤4MB（Draco 后）/ ≤150k tri；无贴图纯色材质天然体积小
- R3F 加载与材质调整代码见 [reference.md](reference.md)
- Three.js 侧记得 `renderer.outputColorSpace = THREE.SRGBColorSpace`

## 命名规范

`区域_物件_部件`（英文），交互热点物件带 `HS_` 段（如 `Desk_HS_Composer_Top`）；Collection 按区域分组。

## 常见坑速查

| 问题 | 解法 |
|------|------|
| 粉彩全灰 | AgX → Standard 视图变换 |
| Standard 下过曝白斑 | 降 Sun/Area 能量 + exposure 负补偿 + 自发光 ≤1.5 |
| 旋转 primitive 再缩放几何错位 | `from_pydata` 手工构网格 |
| 切面渲染悬空部件 | 隐藏名单改前缀匹配 |
| 压扁球悬空 | 落地 z = r × squash |
| 云/远景把主体压暗 | `visible_shadow = False` |
| 玻璃不透明 | `surface_render_method="BLENDED"` + Transmission + Alpha |
| 无头跑完用户看不到 | 无头进程与用户 GUI 互不相干——`Start-Process blender.exe <file>` 帮用户打开，或让其 File → Revert 重载 |
