# blender-create 深度参考

> 按需加载：重拓扑 / 骨骼绑定 / 贴图节点 / R3F 加载。核心工作流见 SKILL.md。

## 一、Retopology（重新布线）

高面数模型（雕刻/扫描/AI 生成如 Tripo）转低面数整洁网格。

### Voxel Remesh（快速，面数可控）

```python
obj = bpy.data.objects["HighPolyMesh"]
bpy.context.view_layer.objects.active = obj
bpy.ops.object.modifier_add(type='REMESH')
mod = obj.modifiers[-1]
mod.mode = 'VOXEL'
mod.voxel_size = 0.05      # smaller = more polys
mod.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=mod.name)
```

### Decimate（减面保形）

```python
bpy.ops.object.modifier_add(type='DECIMATE')
mod = obj.modifiers[-1]
mod.ratio = 0.1            # keep 10% of faces
bpy.ops.object.modifier_apply(modifier=mod.name)
```

### Quadriflow（整洁四边面）

```python
bpy.ops.object.mode_set(mode='SCULPT')
bpy.ops.sculpt.sample_detail_size(location=(0.5, 0.5), mode='BLENDER_QUADRIFLOW')
bpy.ops.sculpt.remesh()
bpy.ops.object.mode_set(mode='OBJECT')
```

### 网格体检

```python
import bmesh
bm = bmesh.new(); bm.from_mesh(obj.data)
non_manifold = [e for e in bm.edges if not e.is_manifold]
print(f"non-manifold: {len(non_manifold)}, faces: {len(bm.faces)}")
bm.free()
```

## 二、骨骼绑定（Rigging）

要点：骨骼只能在 **Edit Mode** 创建；`edit_bones` 与 `pose_bones` 是两套对象；绑定前回 Object Mode。

```python
arm_data = bpy.data.armatures.new("CharArmature")
arm_obj = bpy.data.objects.new("Armature", arm_data)
bpy.context.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones
root = eb.new("Root");  root.head = (0, 0, 0);   root.tail = (0, 0, 0.1)
body = eb.new("Body");  body.head = (0, 0, 0.1); body.tail = (0, 0, 0.5); body.parent = root
# ... ears / tail 同理；对称骨用 x 取反复制，命名 _L/_R
bpy.ops.object.mode_set(mode='OBJECT')
```

自动权重绑定：

```python
bpy.ops.object.select_all(action='DESELECT')
mesh_obj.select_set(True); arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
```

动画 Action 命名与 R3F `useAnimations` 对齐（如 `idle` / `walk` / `wave`），导出时 `export_animations=True`。

## 三、图片贴图节点

```python
def apply_image_texture(obj_name, image_path):
    obj = bpy.data.objects[obj_name]
    mat = obj.data.materials[0] if obj.data.materials else bpy.data.materials.new("Mat")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    for n in [n for n in nodes if n.type == 'TEX_IMAGE']:
        nodes.remove(n)
    img = bpy.data.images.load(image_path)
    tex = nodes.new('ShaderNodeTexImage'); tex.image = img
    links.new(tex.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
    if not obj.data.materials:
        obj.data.materials.append(mat)
```

> 注意：本项目风格规范默认**无贴图纯色**（GLB 体积预算），贴图只用于特殊需求。

## 四、R3F 加载

```tsx
import { useGLTF, useAnimations } from '@react-three/drei'

function Metaspace() {
  const { scene } = useGLTF('/models/metaspace.glb')
  return <primitive object={scene} />
}
useGLTF.preload('/models/metaspace.glb')
```

阴影开关：

```tsx
scene.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    child.castShadow = true
    child.receiveShadow = true
  }
})
```

热点点击（按命名约定挂事件）：

```tsx
<primitive object={scene} onClick={(e) => {
  const hs = e.object.name.match(/HS_(\w+?)_/)?.[1]  // e.g. "Composer"
  if (hs) openScreen(hs)
  e.stopPropagation()
}} />
```
