# preview_cameras.py — render each fixed room camera exactly as R3F frames it.
# Run headless:  blender -b arts/meshes/metaspace.blend --python ai/blender/scripts/preview_cameras.py
# The zone table mirrors ZONES in src/themes/cinnaglass/metaspace.tsx; keep the
# two in sync when a framing is retuned.
# Axis note: three.js (x, y, z) → Blender (x, -z, y).

import bpy
import math
import os
from mathutils import Vector

RENDER_DIR = r"D:\Repo\our-world\ai\blender\renders"
TAG = "cam"

# vertical FOV 42° in R3F → Blender's horizontal `angle` at 16:9
VFOV = math.radians(42.0)
HFOV = 2 * math.atan(math.tan(VFOV / 2) * (16 / 9))

BASE_HIDE = (
    "House_Wall_S", "House_Roof", "House_Door_S", "House_Porch_Roof",
    "House_Win_S_", "House_Round_S_", "House_Smoke", "House_FlowerBox",
    "House_Flower_", "House_FlowerLeaf_", "House_Tower", "House_Band_S",
    "House_Plinth_S", "House_ShutN_",
)

# (id, three-space target xyz, camera height, south distance, extra hides)
ZONES = (
    ("living", (-4.6, 0.7, 1.8), 6.4, 4.7, ("Loft_",)),
    ("kitchen", (-5.2, 0.7, -2.6), 6.4, 4.7, ("Loft_",)),
    ("game", (5.0, 0.7, 1.2), 6.2, 4.8, ("Loft_",)),
    ("gallery", (5.0, 1.1, -3.9), 5.4, 4.2, ("Loft_", "House_Part_G")),
    ("loft", (-4.2, 3.5, -0.5), 11.0, 5.8, ()),
)

def to_blender(x, y, z):
    """three.js (x, y, z) → Blender (x, -z, y)"""
    return Vector((x, -z, y))

scene = bpy.context.scene
cam_data = bpy.data.cameras.new("PreviewCam")
cam_data.angle = HFOV
cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.film_transparent = False
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 64
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = -0.15

os.makedirs(RENDER_DIR, exist_ok=True)

for zid, target, height, depth, extra in ZONES:
    hides = BASE_HIDE + extra
    for o in bpy.data.objects:
        o.hide_render = any(o.name.startswith(p) for p in hides)
    cam_obj.hide_render = False

    t_three = Vector(target)
    c_three = Vector((target[0], height, target[2] + depth))
    t_bl = to_blender(*t_three)
    c_bl = to_blender(*c_three)
    cam_obj.location = c_bl
    cam_obj.rotation_euler = (t_bl - c_bl).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = os.path.join(RENDER_DIR, f"{TAG}_{zid}.png")
    bpy.ops.render.render(write_still=True)
    print(f"[cam] {zid} → {scene.render.filepath}")

for o in bpy.data.objects:
    o.hide_render = False
print("[cam] all framings rendered")
