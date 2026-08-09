# build_avatar.py — cloud-puppy avatar for the Our World metaspace (P1 plan).
# Run headless:  blender -b --python ai/blender/scripts/build_avatar.py
# MVP rig: no armature, no baked clips — static GLB with NAMED part nodes
# (Pup_Body / Pup_Ear_L / ...). idle / walk / wave are procedural sine
# animations driven in R3F code (smoother blending, syncs with move speed).
# Player color (blue/pink) is swapped in R3F by material name AV_accent.

import bpy
import math
import os

REPO = r"D:\Repo\our-world"
BLEND_OUT = os.path.join(REPO, "arts", "meshes", "avatar.blend")
GLB_OUT = os.path.join(REPO, "public", "models", "avatar-cloudpup.glb")
RENDER = os.path.join(REPO, "ai", "blender", "renders", "avatar_preview.png")

def hx(h, alpha=1.0):
    h = h.lstrip("#")
    s = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((c ** 2.2) for c in s) + (alpha,)

PALETTE = {
    "fur": hx("#fefefe"),
    "accent": hx("#aedff2"),   # ear color — swapped to blush in R3F for partner
    "navy": hx("#2a3a5e"),
    "blush": hx("#f8d7df"),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(key, rough=0.75):
    m = bpy.data.materials.new(f"AV_{key}")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = PALETTE[key]
    b.inputs["Roughness"].default_value = rough
    return m

M_fur = mat("fur")
M_ear = mat("accent")
M_navy = mat("navy", 0.4)
M_blush = mat("blush")

def sphere(name, r, loc, material, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=28, ring_count=20)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = True
    return o

# root empty at the feet — R3F moves this node
root = bpy.data.objects.new("Pup_Root", None)
scene.collection.objects.link(root)

body = sphere("Pup_Body", 0.34, (0, 0, 0.38), M_fur, (1, 0.92, 1))
head = sphere("Pup_Head", 0.26, (0, 0.05, 0.78), M_fur, (1, 0.95, 0.92))
snout = sphere("Pup_Snout", 0.1, (0, 0.26, 0.72), M_fur, (1.2, 0.8, 0.8))
nose = sphere("Pup_Nose", 0.035, (0, 0.34, 0.74), M_navy)
eye_l = sphere("Pup_Eye_L", 0.03, (-0.1, 0.26, 0.82), M_navy)
eye_r = sphere("Pup_Eye_R", 0.03, (0.1, 0.26, 0.82), M_navy)
cheek_l = sphere("Pup_Cheek_L", 0.045, (-0.17, 0.22, 0.74), M_blush, (1, 0.6, 0.8))
cheek_r = sphere("Pup_Cheek_R", 0.045, (0.17, 0.22, 0.74), M_blush, (1, 0.6, 0.8))
# long soft ears (the Cinnamoroll signature) — pivot at head sides
ear_l = sphere("Pup_Ear_L", 0.16, (-0.3, 0.0, 0.82), M_ear, (0.55, 1.0, 1.7))
ear_r = sphere("Pup_Ear_R", 0.16, (0.3, 0.0, 0.82), M_ear, (0.55, 1.0, 1.7))
tail = sphere("Pup_Tail", 0.09, (0, -0.32, 0.42), M_ear, (1, 1, 1))
foot_l = sphere("Pup_Foot_L", 0.09, (-0.14, 0.06, 0.08), M_fur, (1, 1.2, 0.7))
foot_r = sphere("Pup_Foot_R", 0.09, (0.14, 0.06, 0.08), M_fur, (1, 1.2, 0.7))

PARTS = (body, head, snout, nose, eye_l, eye_r, cheek_l, cheek_r,
         ear_l, ear_r, tail, foot_l, foot_r)
for o in PARTS:
    o.parent = root

# set ear/tail origins to their attachment points so rotation looks natural
for o, piv in ((ear_l, (-0.3, 0.0, 0.95)), (ear_r, (0.3, 0.0, 0.95)),
               (tail, (0, -0.26, 0.42))):
    bpy.context.view_layer.objects.active = o
    saved = bpy.context.scene.cursor.location.copy()
    bpy.context.scene.cursor.location = piv
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = saved

# ──────────────────────────────────────────────────────────────
# preview render + export
# ──────────────────────────────────────────────────────────────
bpy.ops.object.light_add(type="SUN", location=(2, -3, 5),
                         rotation=(math.radians(50), 0, math.radians(-30)))
bpy.context.active_object.data.energy = 3.0
world = bpy.data.worlds.new("W")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = hx("#d8effa")
cam = bpy.data.cameras.new("Cam")
cam_o = bpy.data.objects.new("Cam", cam)
scene.collection.objects.link(cam_o)
cam_o.location = (0.9, 2.6, 0.75)
cam_o.rotation_euler = (math.radians(86), 0, math.radians(160))
scene.camera = cam_o
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.filepath = RENDER
bpy.ops.render.render(write_still=True)

os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for o in PARTS:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format="GLB",
    use_selection=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
    export_animations=False,
    export_yup=True,
    export_apply=True,
)
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
print(f"[avatar] done → {GLB_OUT}")
