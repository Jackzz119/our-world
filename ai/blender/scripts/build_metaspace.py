# build_metaspace.py — parametric builder for the Our World metaspace scene.
# Run headless:  blender -b --python ai/blender/scripts/build_metaspace.py
# Spec: ai/blender/metaspace.md  (palette / naming / budgets live there)
# Pass 6: big cottage — 16x11 multi-room ground floor (living / kitchen /
# game room / gallery corridor) + loft (bedroom + classic writing desk),
# shingled roof, brick chimney & plinth, flower boxes. Geometric "brick"
# texture per style rule (no image textures).

import bpy
import math
import os

# ──────────────────────────────────────────────────────────────
# paths
# ──────────────────────────────────────────────────────────────
REPO = r"D:\Repo\our-world"
BLEND_OUT = os.path.join(REPO, "arts", "meshes", "metaspace.blend")
RENDER_DIR = os.path.join(REPO, "ai", "blender", "renders")
PASS_TAG = "pass09"

# ──────────────────────────────────────────────────────────────
# palette: cinnaglass tokens (sRGB hex) → linear RGB
# ──────────────────────────────────────────────────────────────
def hx(h, alpha=1.0):
    h = h.lstrip("#")
    s = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((c ** 2.2) for c in s) + (alpha,)

PALETTE = {
    "sky_1": hx("#aedff2"),
    "sky_2": hx("#bfe3f5"),
    "sky_3": hx("#d8effa"),
    "cream": hx("#fbfcfe"),
    "butter": hx("#fce7b0"),
    "blush": hx("#f8d7df"),
    "blush_deep": hx("#f0a8bc"),
    "navy_1": hx("#2a3a5e"),
    "accent": hx("#7cc6ec"),
    "accent_deep": hx("#4fa9dc"),
    "wall": hx("#f2f7fc"),
    "floor_wood": hx("#eeddb9"),
    "floor_wood_2": hx("#e9d6ae"),
    "wood_warm": hx("#e8d2a6"),
    "wood_classic": hx("#c9a06c"),
    "mint": hx("#bfe6c8"),
    "terra_soft": hx("#f6cf9d"),
    "roof": hx("#9fcbe8"),
    "roof_2": hx("#8fc1e4"),
    "grass": hx("#cdeac6"),
    "soil": hx("#d8b58c"),
    "ember": hx("#f7b27a"),
    "brick": hx("#e8b9a4"),
    "brick_2": hx("#dba58c"),
    "paper": hx("#fdfbf4"),
    # exterior-only accent colors (user: facade may leave the Cinnamoroll palette)
    "lavender": hx("#c9bcf2"),
    "lavender_deep": hx("#ae9de6"),
    "peach": hx("#f8d8bd"),
}

# house interior dims, origin = ground floor center, +Y = north (garden side)
RX, RY = 16.0, 11.0
H1 = 2.75
HW = 6.0          # tall walls: loft gets real headroom, castle-like elevation
WT = 0.25
OX, OY = RX / 2 + WT, RY / 2 + WT
LOFT_X1 = 0.0          # loft covers x in [-RX/2, LOFT_X1]
GAL_Y0 = 2.2           # gallery corridor covers y in [GAL_Y0, RY/2], x in [2, RX/2]
PART_X = 2.0           # partition between west zones and game room

# ──────────────────────────────────────────────────────────────
# scene reset + collections
# ──────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

COLS = {}
for name in ("House", "Living", "Kitchen", "Game", "Gallery", "Loft",
             "Yard", "Garden", "Outside", "Lights", "Cams"):
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    COLS[name] = col

# ──────────────────────────────────────────────────────────────
# helpers
# ──────────────────────────────────────────────────────────────
_mats = {}

def mat(key, rough=0.7, emit=0.0, glass=False):
    ck = (key, rough, emit, glass)
    if ck in _mats:
        return _mats[ck]
    m = bpy.data.materials.new(f"M_{key}")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = PALETTE[key]
    bsdf.inputs["Roughness"].default_value = rough
    if emit > 0:
        bsdf.inputs["Emission Color"].default_value = PALETTE[key]
        bsdf.inputs["Emission Strength"].default_value = emit
    if glass:
        bsdf.inputs["Transmission Weight"].default_value = 1.0
        bsdf.inputs["Roughness"].default_value = 0.05
        bsdf.inputs["Alpha"].default_value = 0.18
        m.surface_render_method = "BLENDED"
        m.use_backface_culling = False
    _mats[ck] = m
    return m

def _finish(obj, name, col, material, bevel):
    obj.name = name
    for c in obj.users_collection:
        c.objects.unlink(obj)
    COLS[col].objects.link(obj)
    if material:
        obj.data.materials.append(material)
    if bevel > 0:
        b = obj.modifiers.new("Bevel", "BEVEL")
        b.width = bevel
        b.segments = 3
        b.limit_method = "ANGLE"
    obj.data.polygons.foreach_set("use_smooth", [False] * len(obj.data.polygons))
    return obj

def box(name, col, size, loc, material, bevel=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    return _finish(o, name, col, material, bevel)

def cyl(name, col, r, depth, loc, material, bevel=0.02, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc,
                                        rotation=rot, vertices=verts)
    return _finish(bpy.context.active_object, name, col, material, bevel)

def ball(name, col, r, loc, material, squash=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=16)
    o = bpy.context.active_object
    o.scale = (1, 1, squash)
    bpy.ops.object.transform_apply(scale=True)
    o = _finish(o, name, col, material, 0)
    for p in o.data.polygons:
        p.use_smooth = True
    return o

def cone(name, col, r1, depth, loc, material, verts=24, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=0.0,
                                    depth=depth, location=loc, rotation=rot)
    return _finish(bpy.context.active_object, name, col, material, 0.05)

def tri(name, col, r, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=r, radius2=0, depth=0.03,
                                    location=loc, rotation=rot)
    return _finish(bpy.context.active_object, name, col, material, 0.005)

def cut(wall, size, loc, rot=(0, 0, 0), cyl_r=None, cyl_rot=(0, 0, 0)):
    if cyl_r:
        bpy.ops.mesh.primitive_cylinder_add(radius=cyl_r, depth=2.0, location=loc, rotation=cyl_rot)
    else:
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
        bpy.context.active_object.scale = size
        bpy.ops.object.transform_apply(scale=True)
    cutter = bpy.context.active_object
    bo = wall.modifiers.new("Cut", "BOOLEAN")
    bo.operation = "DIFFERENCE"
    bo.object = cutter
    bpy.context.view_layer.objects.active = wall
    bpy.ops.object.modifier_apply(modifier="Cut")
    bpy.data.objects.remove(cutter)

def arch_cut(wall, w, h, loc):
    # rectangular cut + half-cylinder top → rounded arch opening
    cut(wall, (w, WT * 4, h), (loc[0], loc[1], loc[2] + h / 2))
    cut(wall, None, (loc[0], loc[1], loc[2] + h), cyl_r=w / 2,
        cyl_rot=(math.radians(90), 0, 0))

def no_shadow(obj):
    if hasattr(obj, "visible_shadow"):
        obj.visible_shadow = False

# ──────────────────────────────────────────────────────────────
# materials
# ──────────────────────────────────────────────────────────────
M_wall = mat("wall", 0.85)
M_cream = mat("cream", 0.7)
M_floor = mat("floor_wood", 0.7)
M_glass = mat("sky_3", glass=True)
M_frame = mat("cream", 0.6)
M_roof = mat("roof", 0.75)
M_roof2 = mat("roof_2", 0.75)
M_wood = mat("wood_warm", 0.7)
M_woodc = mat("wood_classic", 0.6)
M_blush = mat("blush", 0.8)
M_blush_d = mat("blush_deep", 0.8)
M_mint = mat("mint", 0.8)
M_navy = mat("navy_1", 0.4)
M_accent = mat("accent", 0.7)
M_butter = mat("butter", 0.85)
M_grass = mat("grass", 0.9)
M_soil = mat("soil", 0.9)
M_brick = mat("brick", 0.8)
M_brick2 = mat("brick_2", 0.8)
M_paper = mat("paper", 0.6)

# ──────────────────────────────────────────────────────────────
# HOUSE SHELL
# ──────────────────────────────────────────────────────────────
box("House_Slab", "House", (RX + WT * 2, RY + WT * 2, 0.25), (0, 0, -0.125), M_cream, 0.03)
box("House_Floor", "House", (RX, RY, 0.05), (0, 0, 0.025), M_floor, 0.01)
for i in range(-7, 8):
    if i % 2 == 0:
        continue
    box(f"House_Plank_{i}", "House", (1.0, RY, 0.004), (i * 1.0, 0, 0.052),
        mat("floor_wood_2", 0.7), 0)

# ── exterior walls with openings ──
# south: front door (x=0.5) + living windows + game room window + 2 high rounds
w_s = box("House_Wall_S", "House", (RX + WT * 2, WT, HW), (0, -OY + WT / 2, HW / 2), M_wall, 0.02)
cut(w_s, (1.3, WT * 4, 2.3), (0.5, -OY + WT / 2, 1.15))
cut(w_s, (1.7, WT * 4, 1.3), (-5.2, -OY + WT / 2, 1.5))
cut(w_s, (1.7, WT * 4, 1.3), (-2.4, -OY + WT / 2, 1.5))
cut(w_s, (2.0, WT * 4, 1.3), (5.0, -OY + WT / 2, 1.5))
cut(w_s, None, (-4.0, -OY + WT / 2, 4.4), cyl_r=0.6, cyl_rot=(math.radians(90), 0, 0))
cut(w_s, None, (5.0, -OY + WT / 2, 4.2), cyl_r=0.7, cyl_rot=(math.radians(90), 0, 0))
cut(w_s, (1.3, WT * 4, 1.1), (-6.3, -OY + WT / 2, 4.35))   # loft bedroom upper windows
cut(w_s, (1.3, WT * 4, 1.1), (-1.7, -OY + WT / 2, 4.35))
# north: kitchen window + gallery back door + loft portholes
w_n = box("House_Wall_N", "House", (RX + WT * 2, WT, HW), (0, OY - WT / 2, HW / 2), M_wall, 0.02)
cut(w_n, (2.4, WT * 4, 1.2), (-5.5, OY - WT / 2, 1.7))
cut(w_n, (1.2, WT * 4, 2.2), (7.0, OY - WT / 2, 1.1))
cut(w_n, None, (-6.0, OY - WT / 2, 4.5), cyl_r=0.55, cyl_rot=(math.radians(90), 0, 0))
cut(w_n, None, (-2.0, OY - WT / 2, 4.5), cyl_r=0.55, cyl_rot=(math.radians(90), 0, 0))
# west: kitchen window + loft porthole (chimney breast outside at y=-2)
w_w = box("House_Wall_W", "House", (WT, RY + WT * 2, HW), (-OX + WT / 2, 0, HW / 2), M_wall, 0.02)
cut(w_w, (WT * 4, 1.4, 1.2), (-OX + WT / 2, 3.0, 1.7))
cut(w_w, None, (-OX + WT / 2, 0.8, 4.5), cyl_r=0.55, cyl_rot=(0, math.radians(90), 0))
# east: game room windows ×2
w_e = box("House_Wall_E", "House", (WT, RY + WT * 2, HW), (OX - WT / 2, 0, HW / 2), M_wall, 0.02)
cut(w_e, (WT * 4, 1.5, 1.3), (OX - WT / 2, -3.6, 1.6))
cut(w_e, (WT * 4, 1.5, 1.3), (OX - WT / 2, 0.8, 1.6))
cut(w_e, None, (OX - WT / 2, -0.8, 4.4), cyl_r=0.55, cyl_rot=(0, math.radians(90), 0))

# ── interior partitions (ground floor height) ──
# west zones | game room partition (thickness along X), arched opening at y=-1.5
p_e = box("House_Part_E", "House", (0.18, GAL_Y0 + RY / 2, H1 + 0.16),
          (PART_X, (GAL_Y0 - RY / 2) / 2, (H1 + 0.16) / 2), M_wall, 0.02)
cut(p_e, (0.8, 2.4, 1.75), (PART_X, -1.5, 0.875))
cut(p_e, None, (PART_X, -1.5, 1.75), cyl_r=1.2, cyl_rot=(0, math.radians(90), 0))
# gallery | game room partition (thickness along Y), arched opening at x=5
p_g = box("House_Part_G", "House", (RX / 2 - PART_X, 0.18, H1 + 0.16),
          ((PART_X + RX / 2) / 2, GAL_Y0, (H1 + 0.16) / 2), M_wall, 0.02)
cut(p_g, (2.2, 0.8, 1.75), (5.0, GAL_Y0, 0.875))
cut(p_g, None, (5.0, GAL_Y0, 1.75), cyl_r=1.1, cyl_rot=(math.radians(90), 0, 0))

# ── glazing + frames ──
def frame_rect(nm, sz, lc):
    horiz = sz[0] > sz[1]
    w = sz[0] if horiz else sz[1]
    h = sz[2]
    t, d = 0.09, 0.3
    if horiz:
        box(f"{nm}_FrTop", "House", (w + t * 2, d, t), (lc[0], lc[1], lc[2] + h / 2 + t / 2), M_frame, 0.01)
        box(f"{nm}_FrBot", "House", (w + t * 2, d, t), (lc[0], lc[1], lc[2] - h / 2 - t / 2), M_frame, 0.01)
        box(f"{nm}_FrL", "House", (t, d, h), (lc[0] - w / 2 - t / 2, lc[1], lc[2]), M_frame, 0.01)
        box(f"{nm}_FrR", "House", (t, d, h), (lc[0] + w / 2 + t / 2, lc[1], lc[2]), M_frame, 0.01)
    else:
        box(f"{nm}_FrTop", "House", (d, w + t * 2, t), (lc[0], lc[1], lc[2] + h / 2 + t / 2), M_frame, 0.01)
        box(f"{nm}_FrBot", "House", (d, w + t * 2, t), (lc[0], lc[1], lc[2] - h / 2 - t / 2), M_frame, 0.01)
        box(f"{nm}_FrL", "House", (d, t, h), (lc[0], lc[1] - w / 2 - t / 2, lc[2]), M_frame, 0.01)
        box(f"{nm}_FrR", "House", (d, t, h), (lc[0], lc[1] + w / 2 + t / 2, lc[2]), M_frame, 0.01)

WINDOWS = (
    ("House_Win_S_L1", (1.7, 0.05, 1.3), (-5.2, -OY + WT / 2, 1.5)),
    ("House_Win_S_L2", (1.7, 0.05, 1.3), (-2.4, -OY + WT / 2, 1.5)),
    ("House_Win_S_G", (2.0, 0.05, 1.3), (5.0, -OY + WT / 2, 1.5)),
    ("House_Win_N_K", (2.4, 0.05, 1.2), (-5.5, OY - WT / 2, 1.7)),
    ("House_Door_N", (1.2, 0.05, 2.2), (7.0, OY - WT / 2, 1.1)),
    ("House_Win_W_K", (0.05, 1.4, 1.2), (-OX + WT / 2, 3.0, 1.7)),
    ("House_Win_E_G1", (0.05, 1.5, 1.3), (OX - WT / 2, -3.6, 1.6)),
    ("House_Win_E_G2", (0.05, 1.5, 1.3), (OX - WT / 2, 0.8, 1.6)),
    ("House_Win_S_U1", (1.3, 0.05, 1.1), (-6.3, -OY + WT / 2, 4.35)),
    ("House_Win_S_U2", (1.3, 0.05, 1.1), (-1.7, -OY + WT / 2, 4.35)),
)
for nm, sz, lc in WINDOWS:
    box(f"{nm}_Glass", "House", sz, lc, M_glass, 0)
    frame_rect(nm, sz, lc)

ROUNDS = (
    ("House_Round_S_L", (-4.0, -OY + WT / 2, 4.4), 0.58, (math.radians(90), 0, 0)),
    ("House_Round_S_G", (5.0, -OY + WT / 2, 4.2), 0.68, (math.radians(90), 0, 0)),
    ("House_Round_N_1", (-6.0, OY - WT / 2, 4.5), 0.53, (math.radians(90), 0, 0)),
    ("House_Round_N_2", (-2.0, OY - WT / 2, 4.5), 0.53, (math.radians(90), 0, 0)),
    ("House_Round_W", (-OX + WT / 2, 0.8, 4.5), 0.53, (0, math.radians(90), 0)),
    ("House_Round_E_U", (OX - WT / 2, -0.8, 4.4), 0.53, (0, math.radians(90), 0)),
)
for nm, lc, r, rot in ROUNDS:
    cyl(f"{nm}_Glass", "House", r, 0.05, lc, M_glass, 0, rot=rot)
    cyl(f"{nm}_Frame", "House", r + 0.09, 0.16, lc, M_frame, 0.02, rot=rot)

# front door + knob (deeper pink for facade richness)
box("House_Door_S", "House", (1.24, 0.09, 2.26), (0.5, -OY + WT / 2, 1.13), M_blush_d, 0.02)
box("House_Door_S_Knob", "House", (0.09, 0.14, 0.09), (0.92, -OY + WT / 2, 1.05), M_butter, 0.01)

# mint shutters flanking the main facade windows
for si, (sx, sy_, wdt, axis) in enumerate((
        (-5.2, -OY - 0.02, 1.7, "S"), (-2.4, -OY - 0.02, 1.7, "S"),
        (5.0, -OY - 0.02, 2.0, "S"), (-5.5, OY + 0.02, 2.4, "N"))):
    yy = sy_
    for side in (-1, 1):
        nm = f"House_Win_{axis}_Shut_{si}_{side}" if axis == "S" else f"House_ShutN_{si}_{side}"
        box(nm, "House", (0.34, 0.08, 1.42), (sx + side * (wdt / 2 + 0.28), yy, 1.5),
            mat("mint", 0.75), 0.02)

# peach string-course band between floors (castle storey line)
box("House_Band_S", "House", (RX + WT * 2 + 0.2, 0.14, 0.2), (0, -OY - 0.04, H1 + 0.32), mat("peach", 0.7), 0.02)
box("House_Band_N", "House", (RX + WT * 2 + 0.2, 0.14, 0.2), (0, OY + 0.04, H1 + 0.32), mat("peach", 0.7), 0.02)
box("House_Band_W", "House", (0.14, RY + WT * 2 + 0.2, 0.2), (-OX - 0.04, 0, H1 + 0.32), mat("peach", 0.7), 0.02)
box("House_Band_E", "House", (0.14, RY + WT * 2 + 0.2, 0.2), (OX + 0.04, 0, H1 + 0.32), mat("peach", 0.7), 0.02)

# flower boxes under the south windows (cuteness pass)
for i, fx in enumerate((-5.2, -2.4, 5.0)):
    wdt = 2.0 if fx > 0 else 1.7
    box(f"House_FlowerBox_{i}", "House", (wdt * 0.8, 0.3, 0.26), (fx, -OY - 0.18, 0.72), M_blush_d, 0.03)
    for k in range(3):
        c = ("butter", "blush", "accent")[k]
        ball(f"House_Flower_{i}{k}", "House", 0.09, (fx - wdt * 0.25 + k * wdt * 0.25, -OY - 0.18, 0.92),
             mat(c, 0.8), 0.9)
        ball(f"House_FlowerLeaf_{i}{k}", "House", 0.07, (fx - wdt * 0.25 + k * wdt * 0.25 + 0.06,
             -OY - 0.14, 0.86), M_mint, 0.7)

# ── brick plinth (striped skirt) + corner quoins ──
for r_i in range(2):
    m = M_brick if r_i == 0 else M_brick2
    z = 0.11 + r_i * 0.22
    box(f"House_Plinth_S_{r_i}", "House", (RX + WT * 2 + 0.12, 0.12, 0.22), (0, -OY - 0.03, z), m, 0.02)
    box(f"House_Plinth_N_{r_i}", "House", (RX + WT * 2 + 0.12, 0.12, 0.22), (0, OY + 0.03, z), m, 0.02)
    box(f"House_Plinth_W_{r_i}", "House", (0.12, RY + WT * 2 + 0.12, 0.22), (-OX - 0.03, 0, z), m, 0.02)
    box(f"House_Plinth_E_{r_i}", "House", (0.12, RY + WT * 2 + 0.12, 0.22), (OX + 0.03, 0, z), m, 0.02)
for ci, (cx, cy) in enumerate(((-OX, -OY), (-OX, OY), (OX, OY))):
    for q in range(9):
        m = M_brick if q % 2 == 0 else M_brick2
        s = 0.5 if q % 2 == 0 else 0.4
        box(f"House_Quoin_{ci}_{q}", "House", (s, s, 0.3), (cx, cy, 0.6 + q * 0.55), m, 0.03)

# ── corner tower (castle feel): round turret at the SE corner ──
TWX, TWY = OX - 0.2, -OY - 0.2
cyl("House_Tower_Body", "House", 1.5, HW + 1.2, (TWX, TWY, (HW + 1.2) / 2), M_cream, 0.05, verts=28)
for r_i in range(2):
    m = M_brick if r_i % 2 == 0 else M_brick2
    cyl(f"House_Tower_Base_{r_i}", "House", 1.58 - r_i * 0.04, 0.24,
        (TWX, TWY, 0.12 + r_i * 0.24), m, 0.02, verts=28)
cyl("House_Tower_Band", "House", 1.56, 0.2, (TWX, TWY, H1 + 0.32), mat("peach", 0.7), 0.02, verts=28)
# witch-hat cone roof in lavender + finial + pennant
cone("House_Tower_Roof", "House", 1.85, 2.6, (TWX, TWY, HW + 1.2 + 1.3), mat("lavender", 0.75), verts=28)
cyl("House_Tower_Roof_Trim", "House", 1.9, 0.16, (TWX, TWY, HW + 1.18), mat("lavender_deep", 0.75), 0.02, verts=28)
ball("House_Tower_Finial", "House", 0.16, (TWX, TWY, HW + 1.2 + 2.62), M_butter, 1.0)
cyl("House_Tower_Flag_Pole", "House", 0.025, 0.7, (TWX, TWY, HW + 1.2 + 2.95), M_navy, 0)
tri("House_Tower_Flag", "House", 0.22, (TWX + 0.22, TWY, HW + 1.2 + 3.2), M_blush_d,
    rot=(0, math.radians(90), 0))
# stacked porthole windows up the tower shaft (south face)
for t_i in range(3):
    tz = 1.6 + t_i * 1.5
    cyl(f"House_Tower_Win_{t_i}_Glass", "House", 0.3, 0.06, (TWX, TWY - 1.5, tz), M_glass, 0,
        rot=(math.radians(90), 0, 0))
    cyl(f"House_Tower_Win_{t_i}_Frame", "House", 0.38, 0.12, (TWX, TWY - 1.48, tz), M_frame, 0.02,
        rot=(math.radians(90), 0, 0))

# ── roof: hip mesh + shingle rows + ridge beam ──
OVH, ROOF_H, RIDGE_X = 0.6, 3.3, 3.4   # steep storybook roof
rx_, ry_ = OX + OVH, OY + OVH
verts = [(-rx_, -ry_, 0), (rx_, -ry_, 0), (rx_, ry_, 0), (-rx_, ry_, 0),
         (-RIDGE_X, 0, ROOF_H), (RIDGE_X, 0, ROOF_H)]
faces = [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (0, 3, 2, 1)]
mesh = bpy.data.meshes.new("House_Roof")
mesh.from_pydata(verts, [], faces)
mesh.update()
roof = bpy.data.objects.new("House_Roof", mesh)
roof.location = (0, 0, HW - 0.05)
COLS["House"].objects.link(roof)
roof.data.materials.append(M_roof)
rb = roof.modifiers.new("Bevel", "BEVEL")
rb.width = 0.06
rb.segments = 3
box("House_Roof_Trim", "House", (RX + WT * 2 + 0.8, RY + WT * 2 + 0.8, 0.2),
    (0, 0, HW - 0.07), mat("peach", 0.7), 0.05)
# shingle rows on the two big slopes (geometric tile texture)
slope = math.atan2(ROOF_H, ry_)
N_ROWS = 8
for side in (-1, 1):   # -1 south slope, +1 north slope
    for r_i in range(N_ROWS):
        t = (r_i + 0.5) / N_ROWS
        half_x = (rx_ + t * (RIDGE_X - rx_)) * 0.96
        yc = side * ry_ * (1 - t)
        zc = HW - 0.05 + ROOF_H * t
        nrm = (0, -side * math.sin(slope), math.cos(slope))
        m = M_roof2 if r_i % 2 == 0 else M_roof
        box(f"House_Roof_Shingle_{side}_{r_i}", "House",
            (half_x * 2, 0.52, 0.06),
            (0 + nrm[0] * 0.05, yc + nrm[1] * 0.05, zc + nrm[2] * 0.05),
            m, 0.02, rot=(side * slope, 0, 0))
# ridge beam + finials
cyl("House_Roof_Ridge", "House", 0.14, RIDGE_X * 2 + 0.5, (0, 0, HW - 0.05 + ROOF_H),
    M_cream, 0.02, rot=(0, math.radians(90), 0))
for side in (-1, 1):
    ball(f"House_Roof_Finial_{side}", "House", 0.2,
         (side * (RIDGE_X + 0.25), 0, HW - 0.05 + ROOF_H), M_butter, 1.0)

# ── brick chimney (striped courses) + smoke ──
CHX, CHY = -OX - 0.45, -2.0
N_CHIM = 22
for r_i in range(N_CHIM):
    m = M_brick if r_i % 2 == 0 else M_brick2
    s = 0.95 if r_i % 2 == 0 else 0.88
    box(f"House_Chimney_{r_i}", "House", (s, s, 0.34), (CHX, CHY, 0.17 + r_i * 0.34), m, 0.03)
box("House_Chimney_Cap", "House", (1.2, 1.2, 0.2), (CHX, CHY, N_CHIM * 0.34 + 0.12), M_cream, 0.04)
box("House_Chimney_Pot", "House", (0.5, 0.5, 0.35), (CHX, CHY, N_CHIM * 0.34 + 0.4), M_brick2, 0.04)
for si, (dz, s) in enumerate(((0.5, 0.22), (1.0, 0.32), (1.7, 0.45))):
    o = ball(f"House_Smoke_{si}", "House", s, (CHX + si * 0.15, CHY, N_CHIM * 0.34 + 0.6 + dz),
             mat("cream", 0.95, emit=0.15), 0.8)
    no_shadow(o)

# ── porch ──
box("House_Porch_Slab", "Yard", (2.6, 1.5, 0.18), (0.5, -OY - 0.75, 0.09), M_cream, 0.03)
box("House_Porch_Step", "Yard", (1.6, 0.5, 0.09), (0.5, -OY - 1.7, 0.045), M_cream, 0.02)
for px in (-0.6, 1.6):
    cyl(f"House_Porch_Col_{px}", "Yard", 0.09, 2.1, (px, -OY - 1.2, 1.05), M_frame, 0.01)
box("House_Porch_Roof", "Yard", (3.0, 2.0, 0.14), (0.5, -OY - 0.9, 2.3), mat("lavender", 0.75), 0.03,
    rot=(math.radians(-9), 0, 0))

# ── loft slab + railing + stairs (along north wall, top lands at x=0) ──
box("Loft_Slab", "Loft", (RX / 2 + LOFT_X1, RY, 0.16),
    ((-RX / 2 + LOFT_X1) / 2, 0, H1 + 0.08), M_floor, 0.02)
box("Loft_Edge", "Loft", (0.12, RY, 0.3), (LOFT_X1 + 0.06, 0, H1 + 0.01), M_wood, 0.02)
box("Loft_Rail_Top", "Loft", (0.09, RY - 1.6, 0.07), (LOFT_X1 + 0.05, -0.8, H1 + 1.05), M_wood, 0.02)
for i in range(13):
    ry_pos = -5.3 + i * 0.72
    if ry_pos > 3.7:
        continue
    cyl(f"Loft_Rail_Post_{i}", "Loft", 0.035, 0.9, (LOFT_X1 + 0.05, ry_pos, H1 + 0.6),
        M_cream, 0.01, verts=12)
N_STEPS = 11
RISE = H1 / N_STEPS
TREAD = 0.3
for i in range(N_STEPS):
    box(f"House_Stair_{i}", "House", (TREAD, 1.1, RISE),
        (3.35 - i * TREAD, OY - WT - 0.55, RISE * i + RISE / 2), M_wood, 0.02)

# ──────────────────────────────────────────────────────────────
# LIVING (west-south: fireplace on west wall, double height)
# ──────────────────────────────────────────────────────────────
box("Living_Fire_Body", "Living", (0.7, 1.7, 1.5), (-OX + 0.6, -2.0, 0.75), M_cream, 0.05)
cut(bpy.data.objects["Living_Fire_Body"], (1.4, 1.0, 0.9), (-OX + 0.9, -2.0, 0.45))
box("Living_Fire_Inner", "Living", (0.5, 0.96, 0.86), (-OX + 0.52, -2.0, 0.43), M_navy, 0)
box("Living_Fire_Mantel", "Living", (0.85, 1.9, 0.09), (-OX + 0.62, -2.0, 1.55), M_woodc, 0.02)
# brick surround strips on the fireplace face
for r_i in range(4):
    m = M_brick if r_i % 2 == 0 else M_brick2
    box(f"Living_Fire_Brick_{r_i}", "Living", (0.1, 1.74, 0.18),
        (-OX + 0.98, -2.0, 1.0 + r_i * 0.0) if False else (-OX + 0.96, -2.0, 0.98 + r_i * 0.14), m, 0.01)
ball("Living_Fire_Flame1", "Living", 0.18, (-OX + 0.55, -2.1, 0.25), mat("ember", 0.5, emit=2.2), 0.9)
ball("Living_Fire_Flame2", "Living", 0.13, (-OX + 0.55, -1.85, 0.22), mat("butter", 0.5, emit=1.8), 0.9)
cyl("Living_Fire_Log", "Living", 0.06, 0.5, (-OX + 0.55, -2.0, 0.1), M_woodc, 0.01,
    rot=(math.radians(90), 0, 0))
# sofa group facing fireplace
box("Living_Sofa_Seat", "Living", (1.0, 2.1, 0.42), (-4.4, -2.0, 0.24), M_blush, 0.16)
box("Living_Sofa_Back", "Living", (0.3, 2.1, 0.8), (-3.95, -2.0, 0.5), M_blush, 0.14)
cyl("Living_Sofa_Arm_N", "Living", 0.19, 1.05, (-4.4, -0.95, 0.5), M_blush_d, 0.05,
    rot=(0, math.radians(90), 0))
cyl("Living_Sofa_Arm_S", "Living", 0.19, 1.05, (-4.4, -3.05, 0.5), M_blush_d, 0.05,
    rot=(0, math.radians(90), 0))
ball("Living_Sofa_Cushion1", "Living", 0.24, (-4.25, -1.5, 0.6), M_butter, 0.5)
ball("Living_Sofa_Cushion2", "Living", 0.24, (-4.25, -2.5, 0.6), M_cream, 0.5)
ball("Living_Beanbag", "Living", 0.52, (-6.0, -3.6, 0.3), M_blush, 0.6)
cyl("Living_TeaTable_Top", "Living", 0.55, 0.08, (-5.9, -2.0, 0.42), M_cream, 0.03, verts=36)
cyl("Living_TeaTable_Leg", "Living", 0.09, 0.4, (-5.9, -2.0, 0.2), M_wood, 0.01)
cyl("Living_Rug", "Living", 2.0, 0.04, (-5.3, -2.0, 0.06), mat("sky_2", 0.9), 0.01, verts=48)
cyl("Living_Rug_In", "Living", 1.5, 0.05, (-5.3, -2.0, 0.065), mat("sky_3", 0.9), 0.01, verts=48)
cyl("Living_Lamp_Pole", "Living", 0.03, 1.6, (-3.4, -3.9, 0.8), M_wood, 0)
ball("Living_Lamp_Shade", "Living", 0.24, (-3.4, -3.9, 1.75), mat("butter", 0.6, emit=1.1), 0.75)
# bay bench under south window
box("Bay_Bench", "Living", (1.9, 0.65, 0.45), (-2.4, -4.9, 0.24), M_wood, 0.05)
box("Bay_Cushion", "Living", (1.8, 0.58, 0.14), (-2.4, -4.9, 0.53), M_blush, 0.06)
cyl("Bay_HS_Wishlist_Jar", "Living", 0.15, 0.28, (-1.75, -4.85, 0.75), M_glass, 0.01, verts=20)
ball("Bay_HS_Wishlist_Star", "Living", 0.06, (-1.75, -4.85, 0.72), mat("butter", 0.5, emit=0.8), 0.8)
for i, (px, s) in enumerate(((-1.0, 0.3), (-0.45, 0.22))):
    cyl(f"Bay_Pot_{i}", "Living", s * 0.55, s, (px, -4.9, s / 2 + 0.05), mat("terra_soft", 0.75), 0.02)
    ball(f"Bay_Leaf_{i}", "Living", s * 0.8, (px, -4.9, s + s * 0.6), M_mint, 0.9)

# ──────────────────────────────────────────────────────────────
# KITCHEN (west-north, under loft)
# ──────────────────────────────────────────────────────────────
box("Kitchen_Counter", "Kitchen", (3.6, 0.7, 0.95), (-5.6, RY / 2 - 0.6, 0.48), M_wood, 0.05)
box("Kitchen_Counter_Top", "Kitchen", (3.8, 0.85, 0.06), (-5.6, RY / 2 - 0.6, 0.99), M_cream, 0.03)
box("Kitchen_Sink", "Kitchen", (0.6, 0.45, 0.04), (-6.2, RY / 2 - 0.6, 1.0), M_accent, 0.01)
box("Kitchen_Fridge", "Kitchen", (0.75, 0.7, 1.7), (-7.5, RY / 2 - 0.65, 0.85), M_cream, 0.09)
box("Kitchen_Fridge_Handle", "Kitchen", (0.05, 0.06, 0.5), (-7.15, RY / 2 - 1.0, 1.0), M_accent, 0.01)
box("Kitchen_Bar", "Kitchen", (2.2, 0.65, 0.95), (-4.6, 1.8, 0.48), M_wood, 0.05)
box("Kitchen_Bar_Front", "Kitchen", (2.2, 0.05, 0.95), (-4.6, 1.48, 0.48), M_blush, 0.02)
box("Kitchen_Bar_Top", "Kitchen", (2.45, 0.8, 0.06), (-4.6, 1.8, 0.99), M_cream, 0.03)
for i, bx_ in enumerate((-5.05, -4.15)):
    cyl(f"Kitchen_Stool_Seat_{i}", "Kitchen", 0.22, 0.09, (bx_, 1.05, 0.62), M_accent, 0.04)
    cyl(f"Kitchen_Stool_Leg_{i}", "Kitchen", 0.05, 0.58, (bx_, 1.05, 0.29), M_navy, 0.01)
for i, (mx, c) in enumerate(((-4.9, "accent"), (-4.3, "blush_deep"))):
    cyl(f"Kitchen_Mug_{i}", "Kitchen", 0.055, 0.1, (mx, 1.8, 1.07), mat(c, 0.6), 0.01, verts=16)
for i, px in enumerate((-5.1, -4.1)):
    cyl(f"Kitchen_Pend_Cord_{i}", "Kitchen", 0.012, 0.55, (px, 1.8, H1 - 0.28), M_navy, 0)
    ball(f"Kitchen_Pend_Shade_{i}", "Kitchen", 0.16, (px, 1.8, H1 - 0.6), mat("butter", 0.6, emit=1.4), 0.8)

# ──────────────────────────────────────────────────────────────
# GAME ROOM (east wing: table + chairs + board shelf + garland)
# ──────────────────────────────────────────────────────────────
GT = (5.0, -1.6)
box("Game_Table_Top", "Game", (2.0, 1.4, 0.08), (GT[0], GT[1], 0.74), M_wood, 0.04)
for dx, dy in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
    box(f"Game_Table_Leg_{dx}_{dy}", "Game", (0.1, 0.1, 0.7),
        (GT[0] + dx * 0.85, GT[1] + dy * 0.55, 0.35), M_woodc, 0.02)
# board + meeples + dice on the table
box("Game_Board", "Game", (0.9, 0.9, 0.03), (GT[0] - 0.25, GT[1], 0.8), M_cream, 0.01)
for i in range(3):
    for j in range(3):
        if (i + j) % 2 == 0:
            box(f"Game_Board_Sq_{i}{j}", "Game", (0.26, 0.26, 0.012),
                (GT[0] - 0.25 - 0.28 + i * 0.28, GT[1] - 0.28 + j * 0.28, 0.822), M_accent, 0)
for i, (mx, my, c) in enumerate(((0.5, -0.3, "accent_deep"), (0.62, -0.1, "blush_deep"),
                                 (0.5, 0.15, "mint"), (0.66, 0.32, "butter"))):
    o = ball(f"Game_Meeple_{i}", "Game", 0.055, (GT[0] + mx, GT[1] + my, 0.84), mat(c, 0.7), 1.0)
box("Game_Dice_1", "Game", (0.09, 0.09, 0.09), (GT[0] + 0.25, GT[1] + 0.45, 0.83), M_cream, 0.015)
box("Game_Dice_2", "Game", (0.09, 0.09, 0.09), (GT[0] + 0.38, GT[1] + 0.52, 0.83), M_accent, 0.015)
# four chairs
for i, (dx, dy, rz) in enumerate(((0, -1.15, 0), (0, 1.15, math.pi),
                                  (-1.5, 0, math.pi / 2), (1.5, 0, -math.pi / 2))):
    c = ("accent", "blush", "butter", "mint")[i]
    cyl(f"Game_Chair_Seat_{i}", "Game", 0.26, 0.09, (GT[0] + dx, GT[1] + dy, 0.48), mat(c, 0.7), 0.03)
    cyl(f"Game_Chair_Leg_{i}", "Game", 0.05, 0.44, (GT[0] + dx, GT[1] + dy, 0.24), M_navy, 0.01)
    ball(f"Game_Chair_Back_{i}", "Game", 0.2, (GT[0] + dx * 1.18 if dx else GT[0] + dx,
         GT[1] + dy * 1.18 if dy else GT[1] + dy, 0.82), mat(c, 0.7), 0.55)
# board-game shelf on the east wall
box("Game_Shelf", "Game", (0.35, 2.2, 1.5), (OX - 0.45, -1.5, 0.75), M_wood, 0.04)
for s_i in range(3):
    for b_i in range(3):
        c = ("blush", "accent", "butter", "mint", "blush_deep", "sky_2",
             "accent_deep", "terra_soft", "cream")[s_i * 3 + b_i]
        box(f"Game_Box_{s_i}{b_i}", "Game", (0.3, 0.55, 0.12),
            (OX - 0.45, -2.2 + b_i * 0.7, 0.35 + s_i * 0.45), mat(c, 0.75), 0.015)
# pennant garland above the south window
for i in range(7):
    c = ("accent", "blush", "butter", "mint", "blush_deep", "accent", "blush")[i]
    gx = 3.6 + i * 0.45
    gz = 2.6 - 0.12 * math.sin(i / 6 * math.pi)
    tri(f"Game_Pennant_{i}", "Game", 0.14, (gx, -OY + WT + 0.05, gz), mat(c, 0.8),
        rot=(math.radians(90), math.radians(180), 0))
cyl("Game_Rug", "Game", 1.7, 0.04, (GT[0], GT[1], 0.06), mat("mint", 0.9), 0.01, verts=48)
cyl("Game_Pend_Cord", "Game", 0.015, 2.6, (GT[0], GT[1], HW - 1.3), M_navy, 0)
ball("Game_Pend_Shade", "Game", 0.24, (GT[0], GT[1], HW - 2.7), mat("butter", 0.6, emit=1.4), 0.75)

# ──────────────────────────────────────────────────────────────
# GALLERY corridor (north-east: photo wall promenade)  HS_PhotoWall
# ──────────────────────────────────────────────────────────────
GALW_Y = OY - WT - 0.03   # north wall inner face
FRAMES = ((2.8, 1.5, 0.44, 0.56, "blush"), (3.6, 1.9, 0.36, 0.44, "sky_2"),
          (4.4, 1.45, 0.4, 0.5, "butter"), (5.2, 1.85, 0.44, 0.36, "mint"),
          (6.0, 1.5, 0.36, 0.48, "blush_deep"), (6.6, 1.95, 0.3, 0.38, "accent"))
for i, (fx, fz, fw, fh, c) in enumerate(FRAMES):
    box(f"Gallery_HS_PhotoWall_{i}", "Gallery", (fw, 0.05, fh), (fx, GALW_Y, fz), M_woodc, 0.012)
    box(f"Gallery_PhotoInner_{i}", "Gallery", (fw - 0.08, 0.03, fh - 0.08), (fx, GALW_Y - 0.03, fz), mat(c, 0.8), 0)
# picture lights (little butter bars above frames)
for i, fx in enumerate((3.2, 4.8, 6.3)):
    box(f"Gallery_PicLight_{i}", "Gallery", (0.5, 0.12, 0.05), (fx, GALW_Y - 0.08, 2.45),
        mat("butter", 0.5, emit=1.2), 0.01)
# runner rug + bench + plant
box("Gallery_Runner", "Gallery", (5.2, 1.0, 0.04), (5.0, 3.85, 0.06), mat("blush", 0.9), 0.02)
box("Gallery_Bench", "Gallery", (1.2, 0.4, 0.4), (3.6, 3.1, 0.2), M_woodc, 0.04)
ball("Gallery_Bench_Cushion", "Gallery", 0.18, (3.6, 3.1, 0.48), M_butter, 0.5)
cyl("Gallery_Pot", "Gallery", 0.18, 0.34, (7.6, 4.9, 0.22), mat("terra_soft", 0.75), 0.02)
ball("Gallery_Leaf", "Gallery", 0.28, (7.6, 4.9, 0.62), M_mint, 0.9)

# ──────────────────────────────────────────────────────────────
# LOFT (bedroom south + classic writing desk north)  HS_Composer
# ──────────────────────────────────────────────────────────────
LZ = H1 + 0.16
box("Loft_Bed_Base", "Loft", (1.7, 2.1, 0.3), (-7.2, -3.2, LZ + 0.15), M_wood, 0.05)
box("Loft_Bed_Mattress", "Loft", (1.6, 2.0, 0.22), (-7.2, -3.2, LZ + 0.4), M_cream, 0.08)
box("Loft_Bed_Blanket", "Loft", (1.62, 1.1, 0.1), (-7.2, -2.8, LZ + 0.52), M_blush, 0.05)
ball("Loft_Bed_Pillow1", "Loft", 0.24, (-7.55, -3.95, LZ + 0.6), M_butter, 0.5)
ball("Loft_Bed_Pillow2", "Loft", 0.24, (-6.85, -3.95, LZ + 0.6), M_cream, 0.5)
box("Loft_Bed_Head", "Loft", (1.7, 0.12, 0.7), (-7.2, -4.2, LZ + 0.5), M_wood, 0.04)
box("Loft_Night", "Loft", (0.45, 0.45, 0.45), (-6.1, -4.0, LZ + 0.225), M_wood, 0.04)
cyl("Loft_NLamp_Pole", "Loft", 0.02, 0.3, (-6.1, -4.0, LZ + 0.6), M_navy, 0)
ball("Loft_NLamp_Shade", "Loft", 0.13, (-6.1, -4.0, LZ + 0.8), mat("butter", 0.6, emit=1.2), 0.75)
cyl("Loft_Rug", "Loft", 1.1, 0.04, (-5.4, -2.2, LZ + 0.02), mat("blush", 0.9), 0.01, verts=40)
# ── classic writing desk (memory composer hotspot): body + hutch + diary ──
DX, DY = -4.5, 4.55
box("Loft_HS_Composer_Top", "Loft", (2.0, 0.85, 0.08), (DX, DY - 0.45, LZ + 0.78), M_woodc, 0.03)
box("Loft_Desk_Skirt", "Loft", (1.9, 0.75, 0.12), (DX, DY - 0.45, LZ + 0.68), M_woodc, 0.02)
for side in (-1, 1):
    box(f"Loft_Desk_Drawers_{side}", "Loft", (0.5, 0.7, 0.62), (DX + side * 0.72, DY - 0.45, LZ + 0.32), M_woodc, 0.03)
    for d_i in range(2):
        box(f"Loft_Desk_DrawFace_{side}_{d_i}", "Loft", (0.42, 0.05, 0.22),
            (DX + side * 0.72, DY - 0.82, LZ + 0.18 + d_i * 0.28), M_wood, 0.01)
        ball(f"Loft_Desk_Knob_{side}_{d_i}", "Loft", 0.03,
             (DX + side * 0.72, DY - 0.86, LZ + 0.18 + d_i * 0.28), M_butter, 1.0)
# hutch with cubbies against the wall
box("Loft_Desk_Hutch", "Loft", (2.0, 0.28, 0.75), (DX, DY, LZ + 1.2), M_woodc, 0.03)
for c_i in range(3):
    box(f"Loft_Desk_Cubby_{c_i}", "Loft", (0.5, 0.22, 0.5),
        (DX - 0.66 + c_i * 0.66, DY, LZ + 1.18), mat("wood_warm", 0.7), 0.01)
# open diary (two angled paper slabs) — the click target
box("Loft_HS_Composer_DiaryL", "Loft", (0.3, 0.4, 0.025), (DX - 0.16, DY - 0.5, LZ + 0.85),
    M_paper, 0.005, rot=(0, math.radians(8), 0))
box("Loft_HS_Composer_DiaryR", "Loft", (0.3, 0.4, 0.025), (DX + 0.16, DY - 0.5, LZ + 0.85),
    M_paper, 0.005, rot=(0, math.radians(-8), 0))
box("Loft_Diary_Ribbon", "Loft", (0.03, 0.4, 0.03), (DX, DY - 0.5, LZ + 0.86), M_blush_d, 0)
# envelopes + ink pot + quill
for e_i in range(3):
    box(f"Loft_Envelope_{e_i}", "Loft", (0.32, 0.22, 0.015),
        (DX + 0.62, DY - 0.5 + e_i * 0.02, LZ + 0.83 + e_i * 0.018),
        M_paper if e_i != 1 else M_blush, 0.004, rot=(0, 0, math.radians(-12 + e_i * 9)))
cyl("Loft_InkPot", "Loft", 0.05, 0.09, (DX - 0.7, DY - 0.35, LZ + 0.87), M_navy, 0.01, verts=16)
cyl("Loft_Quill", "Loft", 0.012, 0.34, (DX - 0.7, DY - 0.35, LZ + 1.05), M_cream, 0,
    rot=(math.radians(18), math.radians(10), 0))
# banker lamp (butter glow) + chair
cyl("Loft_DeskLamp_Pole", "Loft", 0.02, 0.3, (DX + 0.75, DY - 0.25, LZ + 0.95), M_navy, 0)
ball("Loft_DeskLamp_Shade", "Loft", 0.11, (DX + 0.75, DY - 0.25, LZ + 1.12),
     mat("butter", 0.5, emit=1.3), 0.7)
cyl("Loft_Desk_Chair_Seat", "Loft", 0.28, 0.09, (DX, DY - 1.35, LZ + 0.48), M_blush_d, 0.03)
cyl("Loft_Desk_Chair_Leg", "Loft", 0.05, 0.42, (DX, DY - 1.35, LZ + 0.24), M_woodc, 0.01)
ball("Loft_Desk_Chair_Back", "Loft", 0.2, (DX, DY - 1.6, LZ + 0.82), M_blush_d, 0.55)
# little bookshelf on the loft west wall
box("Loft_Shelf", "Loft", (0.3, 1.5, 1.1), (-OX + 0.42, 1.5, LZ + 0.55), M_wood, 0.03)
for b_i in range(4):
    c = ("blush", "accent", "butter", "mint")[b_i]
    box(f"Loft_Book_{b_i}", "Loft", (0.2, 0.26, 0.34),
        (-OX + 0.42, 0.95 + b_i * 0.36, LZ + 0.75), mat(c, 0.75), 0.01)
# loft plank stripes (match ground floor look)
for i in range(-7, 0):
    if i % 2 == 0:
        continue
    box(f"Loft_Plank_{i}", "Loft", (1.0, RY, 0.004), (i * 1.0, 0, LZ + 0.002),
        mat("floor_wood_2", 0.7), 0)
# reading nook near the railing (cushions + low table + book stack)
cyl("Loft_Nook_Rug", "Loft", 1.0, 0.04, (-1.8, 0.6, LZ + 0.02), mat("sky_2", 0.9), 0.01, verts=40)
ball("Loft_Nook_Cushion1", "Loft", 0.34, (-2.3, 1.1, LZ + 0.18), M_blush, 0.5)
ball("Loft_Nook_Cushion2", "Loft", 0.3, (-1.4, 0.1, LZ + 0.16), M_butter, 0.5)
cyl("Loft_Nook_Table", "Loft", 0.35, 0.24, (-1.6, 1.2, LZ + 0.12), M_woodc, 0.03, verts=28)
for b_i in range(3):
    c = ("accent", "blush_deep", "mint")[b_i]
    box(f"Loft_Nook_Book_{b_i}", "Loft", (0.24, 0.18, 0.045),
        (-1.6, 1.2, LZ + 0.26 + b_i * 0.05), mat(c, 0.7), 0.008,
        rot=(0, 0, math.radians(b_i * 14)))
# dresser + plant on the loft north wall
box("Loft_Dresser", "Loft", (1.1, 0.5, 0.85), (-6.8, 4.7, LZ + 0.425), M_wood, 0.04)
for d_i in range(2):
    box(f"Loft_Dresser_Face_{d_i}", "Loft", (0.9, 0.05, 0.3),
        (-6.8, 4.42, LZ + 0.24 + d_i * 0.38), M_cream, 0.01)
    ball(f"Loft_Dresser_Knob_{d_i}", "Loft", 0.03, (-6.8, 4.38, LZ + 0.24 + d_i * 0.38), M_butter, 1.0)
cyl("Loft_Plant_Pot", "Loft", 0.16, 0.3, (-2.6, 4.8, LZ + 0.15), mat("terra_soft", 0.75), 0.02)
ball("Loft_Plant_Leaf", "Loft", 0.26, (-2.6, 4.8, LZ + 0.52), M_mint, 0.9)
# fairy string lights along the railing (cozy anchor upstairs)
for s_i in range(9):
    sy = -4.6 + s_i * 1.0
    if sy > 3.6:
        continue
    ball(f"Loft_String_Light_{s_i}", "Loft", 0.05,
         (LOFT_X1 + 0.05, sy, H1 + 0.95 - 0.06 * (s_i % 2)),
         mat("butter", 0.5, emit=1.6), 1.0)

# ──────────────────────────────────────────────────────────────
# YARD + GARDEN + OUTSIDE
# ──────────────────────────────────────────────────────────────
YARD_X, YARD_Y = 34.0, 27.0
box("Yard_Grass", "Yard", (YARD_X, YARD_Y, 0.3), (0, 1.5, -0.2), M_grass, 0.05)
box("Yard_Path", "Yard", (1.3, 5.2, 0.06), (0.5, -OY - 4.3, -0.02), M_cream, 0.02)
for i in range(3):
    cyl(f"Yard_Path_Dot_{i}", "Yard", 0.22, 0.06, (0.5 + (i - 1) * 0.5, -OY - 7.3 - i * 0.7, -0.02),
        mat("sky_2", 0.8), 0.01, verts=16)
FX, FY = YARD_X / 2 - 0.4, YARD_Y / 2
def fence_run(name, p0, p1, n):
    for i in range(n + 1):
        t = i / n
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t
        box(f"{name}_P{i}", "Yard", (0.09, 0.09, 0.75), (x, y, 0.36), M_cream, 0.02)
    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    box(f"{name}_Rail", "Yard", (L, 0.06, 0.07), (mx, my, 0.55), M_cream, 0.01, rot=(0, 0, ang))
fence_run("Yard_Fence_S_W", (-FX, 1.5 - FY), (-0.4, 1.5 - FY), 10)
fence_run("Yard_Fence_S_E", (1.5, 1.5 - FY), (FX, 1.5 - FY), 10)
fence_run("Yard_Fence_W", (-FX, 1.5 - FY), (-FX, 1.5 + FY), 14)
fence_run("Yard_Fence_E", (FX, 1.5 - FY), (FX, 1.5 + FY), 14)
fence_run("Yard_Fence_N", (-FX, 1.5 + FY), (FX, 1.5 + FY), 16)
for i, (tx, ty) in enumerate(((-11.5, -5.0), (12.0, 3.0), (-12.0, 7.0))):
    cyl(f"Yard_Tree_Trunk_{i}", "Yard", 0.16, 1.4, (tx, ty, 0.7), M_wood, 0.02)
    ball(f"Yard_Tree_Crown_{i}", "Yard", 1.1, (tx, ty, 2.1), M_mint, 0.9)
    ball(f"Yard_Tree_Crown2_{i}", "Yard", 0.7, (tx + 0.7, ty + 0.2, 2.6), M_mint, 0.9)

GY = OY + 2.4
for r in range(2):
    for c in range(3):
        bx_, by_ = -3.2 + c * 3.0, GY + r * 2.2
        box(f"Garden_Bed_{r}{c}", "Garden", (2.2, 1.3, 0.35), (bx_, by_, 0.18), M_wood, 0.04)
        box(f"Garden_Soil_{r}{c}", "Garden", (2.0, 1.1, 0.3), (bx_, by_, 0.22), M_soil, 0.02)
        for k in range(3):
            ball(f"Garden_Sprout_{r}{c}{k}", "Garden", 0.11,
                 (bx_ - 0.6 + k * 0.6, by_, 0.42), M_mint, 0.8)
box("Garden_Path", "Garden", (0.9, 3.8, 0.06), (7.0, OY + 2.0, -0.02), M_cream, 0.02)
cyl("Garden_Can", "Garden", 0.16, 0.3, (1.9, GY - 1.0, 0.15), M_accent, 0.02, verts=18)
box("Garden_Crate", "Garden", (0.5, 0.4, 0.3), (5.2, GY, 0.15), M_wood, 0.03)

M_cloud = mat("cream", 0.95, emit=0.22)
CLOUDS = ((-18, -11, 3.8), (-20, 5, 4.4), (-15, 16, 3.6), (0, 19.5, 4.8),
          (15, 17, 3.8), (20, 4, 4.6), (18, -10, 3.6), (7, -16, 3.4),
          (-7, -16, 3.6), (22, 11, 4.0))
for i, (cx, cy, s) in enumerate(CLOUDS):
    o = ball(f"Outside_Cloud_{i}", "Outside", s, (cx, cy, -s * 0.55), M_cloud, 0.4)
    no_shadow(o)
o = ball("Outside_Islet", "Outside", 2.2, (-17, 23, 2.2), mat("sky_1", 0.9, emit=0.1), 0.5)
no_shadow(o)
o = ball("Outside_Islet_Top", "Outside", 1.9, (-17, 23, 2.8), mat("mint", 0.9, emit=0.1), 0.35)
no_shadow(o)

# ──────────────────────────────────────────────────────────────
# LIGHTS
# ──────────────────────────────────────────────────────────────
def light(name, tp, loc, energy, color=(1, 1, 1), rot=(0, 0, 0), size=None):
    bpy.ops.object.light_add(type=tp, location=loc, rotation=rot)
    L = bpy.context.active_object
    L.name = name
    L.data.energy = energy
    L.data.color = color[:3]
    if size and tp == "AREA":
        L.data.size = size[0]
        L.data.size_y = size[1]
        L.data.shape = "RECTANGLE"
    for c in L.users_collection:
        c.objects.unlink(L)
    COLS["Lights"].objects.link(L)
    return L

light("Light_Sun", "SUN", (4, -10, 12), 2.6, (1.0, 0.95, 0.85),
      rot=(math.radians(42), 0, math.radians(-155)))
light("Light_Liv_Fill", "AREA", (-4.5, -2.5, H1 * 1.5), 30, PALETTE["butter"][:3], size=(6.0, 4.0))
light("Light_Kitchen", "AREA", (-4.5, 3, H1 - 0.35), 20, PALETTE["butter"][:3], size=(5.0, 2.5))
light("Light_Game", "AREA", (5, -1.5, HW - 0.6), 34, PALETTE["butter"][:3], size=(4.5, 4.5))
light("Light_Gallery", "AREA", (5, 3.8, H1 + 0.6), 14, PALETTE["butter"][:3], size=(5.0, 1.6))
light("Light_Loft", "AREA", (-4, 0, HW - 0.3), 26, PALETTE["butter"][:3], size=(6.0, 4.0))
light("Light_Fire", "POINT", (-OX + 0.8, -2.0, 0.5), 45, PALETTE["ember"][:3])

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = PALETTE["sky_2"]
bg.inputs[1].default_value = 1.0

# ──────────────────────────────────────────────────────────────
# CAMERAS
# ──────────────────────────────────────────────────────────────
def camera(name, loc, rot, lens=32):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    o = bpy.data.objects.new(name, cam)
    o.location = loc
    o.rotation_euler = rot
    COLS["Cams"].objects.link(o)
    return o

cam_int = camera("Cam_Int", (0.5, -14.5, 14.0), (math.radians(44), 0, 0), lens=31)
cam_loft = camera("Cam_Loft", (-3.8, -7.5, 8.2), (math.radians(52), 0, 0), lens=34)
cam_game = camera("Cam_Game", (5.0, -8.0, 6.6), (math.radians(52), 0, 0), lens=34)
cam_gallery = camera("Cam_Gallery", (2.4, 3.6, 1.7), (math.radians(82), 0, math.radians(-84)), lens=28)
cam_ext = camera("Cam_Ext", (18.5, -18.5, 13.0), (math.radians(64), 0, math.radians(44)), lens=30)
cam_garden = camera("Cam_Garden", (7.0, 18.5, 10.5), (math.radians(58), 0, math.radians(152)), lens=30)
cam_top = camera("Cam_Top", (0, 0.5, 30), (0, 0, 0), lens=30)

# ──────────────────────────────────────────────────────────────
# RENDER
# ──────────────────────────────────────────────────────────────
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.eevee.taa_render_samples = 64
if hasattr(scene.eevee, "use_raytracing"):
    scene.eevee.use_raytracing = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = -0.15

os.makedirs(RENDER_DIR, exist_ok=True)
os.makedirs(os.path.dirname(BLEND_OUT), exist_ok=True)

# MS_NO_RENDER=1 skips all review renders (fast rebuild for GLB export)
RENDER_ENABLED = os.environ.get("MS_NO_RENDER") != "1"

CUTAWAY_PREFIXES = ("House_Wall_S", "House_Roof", "House_Door_S", "House_Porch_Roof",
                    "House_Win_S_", "House_Round_S_", "House_Smoke", "House_FlowerBox",
                    "House_Flower_", "House_FlowerLeaf_", "Game_Pennant",
                    "House_Tower", "House_Band_S", "House_Plinth_S", "House_ShutN_")

def cutaway_objs():
    return [o for o in bpy.data.objects
            if any(o.name.startswith(p) for p in CUTAWAY_PREFIXES)]

def hide_by_prefix(prefixes, state):
    for o in bpy.data.objects:
        if any(o.name.startswith(p) for p in prefixes):
            o.hide_render = state

# int shot also hides the whole loft level so the ground floor west wing is visible
SHOTS = ((cam_int, "int", CUTAWAY_PREFIXES + ("Loft_",)),
         (cam_loft, "loft", CUTAWAY_PREFIXES),
         (cam_game, "game", CUTAWAY_PREFIXES),
         (cam_gallery, "gallery", CUTAWAY_PREFIXES),
         (cam_ext, "ext", ()),
         (cam_garden, "garden", ()),
         (cam_top, "top", CUTAWAY_PREFIXES + ("Loft_",)))

for cam, tag, prefixes in (SHOTS if RENDER_ENABLED else ()):
    scene.camera = cam
    if prefixes:
        hide_by_prefix(prefixes, True)
    scene.render.filepath = os.path.join(RENDER_DIR, f"{PASS_TAG}_{tag}.png")
    bpy.ops.render.render(write_still=True)
    if prefixes:
        hide_by_prefix(prefixes, False)

# ──────────────────────────────────────────────────────────────
# MOOD PASS (G4): lighting parameter sets per time-of-day / weather.
# Same geometry; only sun / world / interior-light energies change.
# The warm lamps taking over at night & bad weather is the whole point
# ("cold outside, warm inside").
# ──────────────────────────────────────────────────────────────
INTERIOR_LIGHTS = ("Light_Liv_Fill", "Light_Kitchen", "Light_Game",
                   "Light_Gallery", "Light_Loft")

MOODS = {
    #        sun_energy  sun_color            sun_rot(z tilt)          world_hex  w_str  warm  fire
    "golden":   (3.2, (1.00, 0.72, 0.45), (78, -120), "#f2cfa6", 1.00, 1.3, 1.3),
    "twilight": (0.9, (0.75, 0.65, 0.95), (72, -100), "#9aa5d8", 0.85, 1.7, 1.5),
    "night":    (0.12, (0.55, 0.65, 1.00), None,      "#22304e", 0.45, 2.3, 1.9),
    "snow":     (1.3, (0.85, 0.92, 1.00), None,       "#e3ecf4", 1.05, 1.7, 1.6),
    "rain":     (0.55, (0.70, 0.78, 0.88), None,      "#93a3b8", 0.80, 1.9, 1.7),
}

sun = bpy.data.objects["Light_Sun"]
fire = bpy.data.objects["Light_Fire"]
base_sun = (sun.data.energy, tuple(sun.data.color), tuple(sun.rotation_euler))
base_world = (tuple(bg.inputs[0].default_value), bg.inputs[1].default_value)
base_interior = {n: bpy.data.objects[n].data.energy for n in INTERIOR_LIGHTS}
base_fire = fire.data.energy

MOOD_SHOTS = ((cam_int, "int", CUTAWAY_PREFIXES + ("Loft_",)), (cam_ext, "ext", ()))

for mood, (s_e, s_c, s_rot, w_hex, w_str, warm, fire_m) in (MOODS.items() if RENDER_ENABLED else ()):
    sun.data.energy = s_e
    sun.data.color = s_c
    if s_rot:
        sun.rotation_euler = (math.radians(s_rot[0]), 0, math.radians(s_rot[1]))
    bg.inputs[0].default_value = hx(w_hex)
    bg.inputs[1].default_value = w_str
    for n in INTERIOR_LIGHTS:
        bpy.data.objects[n].data.energy = base_interior[n] * warm
    fire.data.energy = base_fire * fire_m
    for cam, tag, prefixes in MOOD_SHOTS:
        scene.camera = cam
        if prefixes:
            hide_by_prefix(prefixes, True)
        scene.render.filepath = os.path.join(RENDER_DIR, f"{PASS_TAG}_{mood}_{tag}.png")
        bpy.ops.render.render(write_still=True)
        if prefixes:
            hide_by_prefix(prefixes, False)

# restore day baseline before saving
sun.data.energy, sun.data.color = base_sun[0], base_sun[1]
sun.rotation_euler = base_sun[2]
bg.inputs[0].default_value, bg.inputs[1].default_value = base_world
for n in INTERIOR_LIGHTS:
    bpy.data.objects[n].data.energy = base_interior[n]
fire.data.energy = base_fire

bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)

# ── GLB export for R3F (everything except cameras/lights; draco-compressed) ──
GLB_OUT = os.path.join(REPO, "public", "models", "metaspace.glb")
os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
skip_cols = {"Cams", "Lights"}
for o in bpy.data.objects:
    if not any(c.name in skip_cols for c in o.users_collection):
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
    export_draco_mesh_compression_enable=True,
)
print(f"[metaspace] {PASS_TAG} done → {BLEND_OUT} + {GLB_OUT}")
