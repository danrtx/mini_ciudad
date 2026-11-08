"""
Generador de modelos LOW-POLY de Villa Pastel para Blender (3.6+ / 4.x / 5.x).

Lee la configuración compartida  src/data/buildings.json  (la misma que usa la app web),
modela cada edificio y el mobiliario urbano con Python (bpy), y exporta un .glb por modelo a:

    public/assets/models/buildings/<id>.glb
    public/assets/models/city/<prop>.glb
    public/assets/models/characters/personaje.glb   (articulaciones con nombre para animarlas)
    public/assets/models/manifest.json   <- la app lo lee y reemplaza los modelos provisionales

USO
  A) Desde la terminal (sin abrir la interfaz):
       blender --background --python blender/generar_modelos.py
  B) Dentro de Blender: pestaña Scripting > Open > este archivo > Run Script.
     (Ajusta PROJECT_ROOT abajo si Blender no encuentra el proyecto.)

Convenciones (iguales a la app):
  - Unidades en metros. Origen de cada modelo en el centro de la base.
  - La fachada principal mira hacia +Z de three.js  (=  -Y en Blender).
  - Las coordenadas se escriben en el sistema de la app (Y arriba) y se convierten con to_bl().
"""

import bmesh
import bpy
import json
import math
import os
import sys

# --------------------------------------------------------------------------- rutas
def _guess_root():
    here = None
    if "__file__" in globals() and __file__:
        here = os.path.dirname(os.path.abspath(__file__))
    elif bpy.data.filepath:
        here = os.path.dirname(bpy.data.filepath)
    else:
        for text in bpy.data.texts:
            if text.filepath:
                here = os.path.dirname(bpy.path.abspath(text.filepath))
                break
    if here is None:
        here = os.getcwd()
    # El script vive en <proyecto>/blender/
    return os.path.dirname(here) if os.path.basename(here) == "blender" else here


PROJECT_ROOT = _guess_root()
CONFIG_PATH = os.path.join(PROJECT_ROOT, "src", "data", "buildings.json")
MODELS_DIR = os.path.join(PROJECT_ROOT, "public", "assets", "models")

FOUNDATION = 0.4

PALETTE = {
    "stone": "#cfc8bb",
    "stoneDark": "#a9a194",
    "metal": "#4b5563",
    "trunk": "#8a5a3b",
    "leaves": "#6cc25a",
    "pine": "#3f8f5a",
    "bush": "#62b85a",
    "wood": "#b07a4f",
    "lampLight": "#ffe7a3",
    "water": "#7cc6e8",
    "cream": "#fff8e8",
    "white": "#fffdf5",
    "brass": "#f2d16b",
    "ink": "#2f2a26",
    "roofGrey": "#d5dbe1",
    "roofGrey2": "#c4ccd4",
}


# --------------------------------------------------------------------------- utilidades
def to_bl(v):
    """App (x, y-arriba, z-frente)  ->  Blender (x, y, z-arriba)."""
    x, y, z = v
    return (x, -z, y)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(hex_color):
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


_materials = {}


def material(hex_color, emissive=0.0, roughness=0.85, metallic=0.0):
    key = (hex_color.lower(), emissive, roughness, metallic)
    if key in _materials:
        return _materials[key]
    name = f"mat_{hex_color.lstrip('#')}" + (f"_e{emissive}" if emissive else "")
    mat = bpy.data.materials.new(name=name)
    rgba = hex_rgba(hex_color)
    mat.diffuse_color = rgba
    if bpy.app.version < (5, 0, 0):  # en Blender 5+ los materiales siempre usan nodos
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emissive:
            emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            if emission_input:
                emission_input.default_value = rgba
            strength = bsdf.inputs.get("Emission Strength")
            if strength:
                strength.default_value = emissive
    _materials[key] = mat
    return mat


def rotate(v, rot):
    """Rotación Euler XYZ (en el sistema de la app)."""
    x, y, z = v
    rx, ry, rz = rot
    if rx:
        c, s = math.cos(rx), math.sin(rx)
        y, z = y * c - z * s, y * s + z * c
    if ry:
        c, s = math.cos(ry), math.sin(ry)
        x, z = x * c + z * s, -x * s + z * c
    if rz:
        c, s = math.cos(rz), math.sin(rz)
        x, y = x * c - y * s, x * s + y * c
    return (x, y, z)


# --------------------------------------------------------------------------- primitivas unitarias
def unit_box():
    v = [(x, y, z) for x in (-0.5, 0.5) for y in (-0.5, 0.5) for z in (-0.5, 0.5)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return v, f


def unit_cylinder(n, r_top=0.5, r_bottom=0.5):
    v, f = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        v.append((math.sin(a) * r_bottom, -0.5, math.cos(a) * r_bottom))
    for i in range(n):
        a = 2 * math.pi * i / n
        v.append((math.sin(a) * r_top, 0.5, math.cos(a) * r_top))
    for i in range(n):
        j = (i + 1) % n
        f.append((i, j, n + j, n + i))
    f.append(tuple(range(n - 1, -1, -1)))
    f.append(tuple(range(n, 2 * n)))
    return v, f


def unit_cone(n):
    v = [(math.sin(2 * math.pi * i / n) * 0.5, -0.5, math.cos(2 * math.pi * i / n) * 0.5) for i in range(n)]
    v.append((0, 0.5, 0))
    f = [(i, (i + 1) % n, n) for i in range(n)]
    f.append(tuple(range(n - 1, -1, -1)))
    return v, f


def unit_gable():
    """Prisma triangular: ancho 1 (X), fondo 1 (Z), alto 1 (Y desde 0)."""
    v = [(-0.5, 0, -0.5), (-0.5, 0, 0.5), (-0.5, 1, 0), (0.5, 0, -0.5), (0.5, 0, 0.5), (0.5, 1, 0)]
    f = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (0, 2, 5, 3)]
    return v, f


def unit_pyramid():
    r = math.sqrt(0.5)
    v = [(math.sin(math.pi / 4 + i * math.pi / 2) * r, 0, math.cos(math.pi / 4 + i * math.pi / 2) * r) for i in range(4)]
    v.append((0, 1, 0))
    f = [(i, (i + 1) % 4, 4) for i in range(4)] + [(3, 2, 1, 0)]
    return v, f


def unit_dome(seg=10, rings=5):
    v = []
    for r in range(rings + 1):
        phi = (math.pi / 2) * r / rings
        for s in range(seg):
            t = 2 * math.pi * s / seg
            v.append((math.cos(phi) * math.sin(t) * 0.5, math.sin(phi) * 0.5, math.cos(phi) * math.cos(t) * 0.5))
    f = []
    for r in range(rings):
        for s in range(seg):
            a = r * seg + s
            b = r * seg + (s + 1) % seg
            f.append((a, b, b + seg, a + seg))
    f.append(tuple(range(seg - 1, -1, -1)))
    return v, f


def unit_ico():
    t = (1 + math.sqrt(5)) / 2
    raw = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t),
           (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    k = 0.5 / math.sqrt(1 + t * t)
    v = [(x * k, y * k, z * k) for x, y, z in raw]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2),
         (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5),
         (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    return v, f


SHAPES = {
    "box": unit_box(),
    "cyl6": unit_cylinder(6),
    "cyl8": unit_cylinder(8),
    "cyl12": unit_cylinder(12),
    "cone6": unit_cone(6),
    "cone8": unit_cone(8),
    "gable": unit_gable(),
    "pyramid": unit_pyramid(),
    "dome": unit_dome(),
    "ico": unit_ico(),
}


# --------------------------------------------------------------------------- constructor de mallas
class MeshBuilder:
    """Acumula geometría por material y crea UN objeto por material (GLB compacto)."""

    def __init__(self, name):
        self.name = name
        self.parts = {}

    def add(self, shape, mat, position=(0, 0, 0), scale=(1, 1, 1), rotation=(0, 0, 0), group_rot=None, group_origin=None):
        verts, faces = SHAPES[shape]
        bucket = self.parts.setdefault(mat.name, {"mat": mat, "v": [], "f": []})
        offset = len(bucket["v"])
        for vx, vy, vz in verts:
            p = rotate((vx * scale[0], vy * scale[1], vz * scale[2]), rotation)
            p = (p[0] + position[0], p[1] + position[1], p[2] + position[2])
            if group_rot is not None:
                p = rotate(p, group_rot)
            if group_origin is not None:
                p = (p[0] + group_origin[0], p[1] + group_origin[1], p[2] + group_origin[2])
            bucket["v"].append(to_bl(p))
        for face in faces:
            bucket["f"].append(tuple(i + offset for i in face))

    def box(self, mat, position, size, rotation=(0, 0, 0), **kw):
        self.add("box", mat, position, size, rotation, **kw)

    def build(self):
        objects = []
        for i, (mat_name, data) in enumerate(self.parts.items()):
            objects.append(make_object(f"{self.name}_{i}", data["v"], data["f"], data["mat"]))
        return objects


def make_object(name, verts, faces, mat, location=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    return obj


def text_object(name, text, mat, center_app, max_width, height):
    """Texto 3D (letrero) convertido a malla para que el GLB lo incluya."""
    curve = bpy.data.curves.new(name=f"{name}_curve", type="FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = height
    curve.extrude = 0.02
    obj = bpy.data.objects.new(f"{name}_tmp", curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.rotation_euler = (math.radians(90), 0, 0)  # de "acostado" a vertical mirando a +Z (app)
    obj.location = to_bl(center_app)
    bpy.context.view_layer.update()
    if obj.dimensions.x > max_width > 0:
        k = max_width / obj.dimensions.x
        obj.scale = (k, k, k)
        bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
    mesh.materials.clear()
    mesh.materials.append(mat)
    result = bpy.data.objects.new(name, mesh)
    result.matrix_world = obj.matrix_world.copy()
    bpy.context.scene.collection.objects.link(result)
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.curves.remove(curve)
    return result


# --------------------------------------------------------------------------- edificios
def roof_height(s):
    if s["roof"] == "gable":
        return s["depth"] * 0.38
    if s["roof"] == "pyramid":
        return min(s["width"], s["depth"]) * 0.42
    if s["roof"] == "dome":
        return min(s["width"], s["depth"]) * 0.6
    return 0.5


def window_slots(length, spacing):
    n = max(1, int((length - 1.2) // spacing))
    step = (length - 1.2) / n
    return [-length / 2 + 0.6 + step * (i + 0.5) for i in range(n)]


def add_windows(mb, s):
    """Misma lógica que computeWindows() en src/components/game/buildings/buildingLayout.ts."""
    w, d, h, floors = s["width"], s["depth"], s["height"], s["floors"]
    floor_h = h / floors
    pane_h = min(1.7, floor_h * 0.5)
    pane_w = 1.5 if floors >= 5 else 1.15
    spacing = 2.1 if floors >= 5 else 2.5
    is_shop = bool(s.get("awningColor"))
    glass = material(s["windowColor"], emissive=0.18, roughness=0.25, metallic=0.1)
    trim = material(s["trimColor"])
    for f in range(floors):
        y = FOUNDATION + f * floor_h + floor_h * 0.55
        for side in (1, -1):
            z = side * d / 2
            if f == 0 and is_shop and side == 1:
                vw = max(1.2, (w - 4) / 2 - 0.6)
                for sx in (-1, 1):
                    x = sx * (1.6 + vw / 2 + 0.3)
                    mb.box(glass, (x, FOUNDATION + 1.45, z), (vw, 2.1, 0.14))
                    mb.box(trim, (x, FOUNDATION + 0.32, z + 0.08), (vw + 0.3, 0.14, 0.3))
                continue
            for x in window_slots(w, spacing):
                if f == 0 and side == 1 and abs(x) < 1.7:
                    continue
                mb.box(glass, (x, y, z), (pane_w, pane_h, 0.14))
                mb.box(trim, (x, y - pane_h / 2 - 0.06, z + side * 0.1), (pane_w + 0.3, 0.12, 0.26))
        for side in (1, -1):
            x = side * w / 2
            for z in window_slots(d, spacing):
                mb.box(glass, (x, y, z), (0.14, pane_h, pane_w))
                mb.box(trim, (x + side * 0.1, y - pane_h / 2 - 0.06, z), (0.26, 0.12, pane_w + 0.3))


def add_roof(mb, s, top, rh):
    w, d = s["width"], s["depth"]
    roof = material(s["roofColor"])
    trim = material(s["trimColor"])
    cornice = lambda: mb.box(trim, (0, top + 0.2, 0), (w + 0.45, 0.4, d + 0.45))

    if s["roof"] == "gable":
        slope = math.atan2(rh, d / 2)
        length = math.hypot(d / 2, rh) + 0.55
        mb.add("gable", material(s["wallColor"]), (0, top, 0), (w, rh, d))
        for side in (1, -1):
            mb.box(roof, (0, top + rh / 2 + 0.1, side * d / 4 + side * 0.1), (w + 0.7, 0.26, length), (side * slope, 0, 0))
        mb.box(roof, (0, top + rh + 0.12, 0), (w + 0.8, 0.22, 0.32))
    elif s["roof"] == "pyramid":
        cornice()
        mb.add("pyramid", roof, (0, top + 0.4, 0), (w + 0.5, rh, d + 0.5))
    elif s["roof"] == "dome":
        cornice()
        r = min(w, d) * 0.3
        mb.add("cyl12", trim, (0, top + 0.9, 0), (r * 2.1, 1, r * 2.1))
        mb.add("dome", roof, (0, top + 1.4, 0), (r * 2, r * 1.8, r * 2))
        mb.add("cyl8", trim, (0, top + 1.4 + r * 0.9 + 0.35, 0), (0.6, 0.7, 0.6))
    else:
        cornice()
        mb.box(roof, (0, top + 0.44, 0), (w - 0.3, 0.12, d - 0.3))
        mb.box(material(PALETTE["roofGrey"]), (w * 0.22, top + 0.9, -d * 0.18), (1.6, 0.9, 1.2))
        mb.box(material(PALETTE["roofGrey2"]), (-w * 0.15, top + 0.8, d * 0.2), (1.1, 0.7, 1.1))
        if s["height"] > 14:
            gx, gy, gz = -w * 0.24, top + 0.4, -d * 0.2
            metal = material(PALETTE["metal"])
            for lx in (-0.5, 0.5):
                for lz in (-0.5, 0.5):
                    mb.box(metal, (gx + lx, gy + 0.7, gz + lz), (0.12, 1.4, 0.12))
            mb.add("cyl8", roof, (gx, gy + 2.1, gz), (1.8, 1.5, 1.8))
            mb.add("cone8", roof, (gx, gy + 3.15, gz), (1.9, 0.6, 1.9))


def build_building(b):
    s = b["style"]
    w, d, h, floors = s["width"], s["depth"], s["height"], s["floors"]
    floor_h = h / floors
    top = FOUNDATION + h
    rh = roof_height(s)
    wall, trim = material(s["wallColor"]), material(s["trimColor"])
    mb = MeshBuilder(b["id"])

    # Zócalo, cuerpo, molduras y esquineros
    mb.box(material(PALETTE["stoneDark"]), (0, FOUNDATION / 2, 0), (w + 0.5, FOUNDATION, d + 0.5))
    mb.box(wall, (0, FOUNDATION + h / 2, 0), (w, h, d))
    for i in range(1, floors):
        mb.box(trim, (0, FOUNDATION + i * floor_h, 0), (w + 0.22, 0.18, d + 0.22))
    for sx in (-1, 1):
        for sz in (-1, 1):
            mb.box(trim, (sx * w / 2, FOUNDATION + h / 2, sz * d / 2), (0.45, h, 0.45))

    add_windows(mb, s)

    # Entrada
    z = d / 2
    mb.box(trim, (0, FOUNDATION + 1.37, z + 0.02), (2.1, 2.75, 0.16))
    mb.box(material(s["doorColor"]), (0, FOUNDATION + 1.2, z + 0.06), (1.6, 2.4, 0.2))
    mb.box(material(PALETTE["brass"]), (0.55, FOUNDATION + 1.15, z + 0.2), (0.12, 0.12, 0.1))
    mb.box(material(PALETTE["stone"]), (0, 0.11, z + 0.6), (2.6, 0.22, 0.9))

    # Toldo a rayas
    if s.get("awningColor"):
        aw = min(w - 1, 7.5)
        stripes = 7
        sw = aw / stripes
        origin = (0, FOUNDATION + floor_h * 0.93, z + 0.75)
        for i in range(stripes):
            col = material(s["awningColor"] if i % 2 == 0 else "#fffaf0")
            mb.box(col, (-aw / 2 + sw * (i + 0.5), 0, 0), (sw, 0.08, 1.6), group_rot=(0.38, 0, 0), group_origin=origin)

    # Letrero con el nombre
    extra = []
    if s.get("signColor"):
        sw = min(w - 1.5, 6.5)
        sy = FOUNDATION + floor_h + 0.55
        mb.box(material(PALETTE["cream"]), (0, sy, z + 0.07), (sw + 0.25, 1.05, 0.14))
        mb.box(material(s["signColor"]), (0, sy, z + 0.15), (sw, 0.85, 0.04))
        extra.append(text_object(f"{b['id']}_letrero", b["name"].upper(), material(PALETTE["cream"]), (0, sy, z + 0.18), sw * 0.88, 0.5))

    # Pórtico con columnas
    if s.get("columns"):
        pw = w * 0.8
        pz = d / 2 + 1.3
        ph = floor_h * 1.55
        mb.box(material(PALETTE["stone"]), (0, 0.175, pz), (pw + 0.6, 0.35, 3.4))
        for t in (-0.5, -0.17, 0.17, 0.5):
            mb.add("cyl8", trim, (t * (pw - 0.8), FOUNDATION + ph / 2, pz), (0.7, ph, 0.7))
        mb.box(trim, (0, FOUNDATION + ph + 0.22, pz - 0.2), (pw + 0.4, 0.45, 3))
        mb.add("gable", material(s["roofColor"]), (0, FOUNDATION + ph + 0.45, pz - 0.2), (3, 1.5, pw + 0.4), (0, math.pi / 2, 0))

    add_roof(mb, s, top, rh)

    if s.get("chimney"):
        ch = rh * 0.6 + 1
        mb.box(material(PALETTE["stoneDark"]), (w * 0.28, top + ch / 2, -d * 0.18), (0.8, ch, 0.8))

    # Torre del reloj (las manecillas son objetos aparte para animarlas en la web)
    if s.get("clockTower"):
        th = 5.5
        mb.box(wall, (0, top + th / 2, 0), (3.4, th, 3.4))
        mb.box(trim, (0, top + th, 0), (3.8, 0.35, 3.8))
        mb.add("pyramid", material(s["roofColor"]), (0, top + th + 0.17, 0), (3.9, 2.8, 3.9))
        face = (0, top + th * 0.62, 1.72)
        mb.add("cyl12", material(PALETTE["white"]), face, (2.2, 0.12, 2.2), (math.pi / 2, 0, 0))
        mb.add("cyl12", trim, (face[0], face[1], face[2] - 0.04), (2.45, 0.06, 2.45), (math.pi / 2, 0, 0))
        ink = material(PALETTE["ink"])
        for name, length, width, dz in (("manecilla_hora", 0.55, 0.12, 0.1), ("manecilla_minuto", 0.85, 0.08, 0.13)):
            v, f = SHAPES["box"]
            verts = [to_bl((x * width, y * length + length / 2, zz * 0.04)) for x, y, zz in v]
            extra.append(make_object(name, verts, f, ink, location=to_bl((face[0], face[1], face[2] + dz))))

    return mb.build() + extra


# --------------------------------------------------------------------------- mobiliario urbano
def build_prop(kind):
    mb = MeshBuilder(kind)
    if kind == "tree":
        mb.add("cyl6", material(PALETTE["trunk"]), (0, 0.8, 0), (0.45, 1.6, 0.45))
        leaves = material(PALETTE["leaves"])
        mb.add("ico", leaves, (0, 2.6, 0), (2.7, 2.4, 2.7))
        mb.add("ico", leaves, (0.45, 3.5, -0.2), (1.7, 1.6, 1.7), (0.4, 0.8, 0))
    elif kind == "pine":
        mb.add("cyl6", material(PALETTE["trunk"]), (0, 0.5, 0), (0.4, 1, 0.4))
        pine = material(PALETTE["pine"])
        mb.add("cone6", pine, (0, 1.9, 0), (2.8, 2.1, 2.8))
        mb.add("cone6", pine, (0, 3.1, 0), (2.1, 1.8, 2.1), (0, 0.5, 0))
        mb.add("cone6", pine, (0, 4.15, 0), (1.4, 1.5, 1.4))
    elif kind == "bush":
        bush = material(PALETTE["bush"])
        mb.add("ico", bush, (0, 0.5, 0), (1.6, 1.15, 1.6))
        mb.add("ico", bush, (0.5, 0.45, 0.35), (1, 0.8, 1), (0.3, 1, 0))
    elif kind == "lamp":
        metal = material(PALETTE["metal"], roughness=0.5, metallic=0.4)
        mb.add("cyl8", metal, (0, 0.15, 0), (0.4, 0.3, 0.4))
        mb.add("cyl8", metal, (0, 2.1, 0), (0.16, 4.2, 0.16))
        mb.box(metal, (0, 4.15, 0.45), (0.1, 0.1, 1))
        mb.box(metal, (0, 4.05, 0.95), (0.5, 0.2, 0.65))
        mb.box(material(PALETTE["lampLight"], emissive=1.2), (0, 3.93, 0.95), (0.38, 0.06, 0.5))
    elif kind == "bench":
        wood = material(PALETTE["wood"])
        mb.box(wood, (0, 0.5, 0), (1.9, 0.1, 0.55))
        mb.box(wood, (0, 0.88, -0.27), (1.9, 0.42, 0.08), (-0.15, 0, 0))
        metal = material(PALETTE["metal"])
        mb.box(metal, (-0.78, 0.25, 0), (0.1, 0.5, 0.5))
        mb.box(metal, (0.78, 0.25, 0), (0.1, 0.5, 0.5))
    elif kind == "fountain":
        stone = material(PALETTE["stone"])
        water = material(PALETTE["water"], emissive=0.15, roughness=0.15, metallic=0.1)
        mb.add("cyl12", stone, (0, 0.3, 0), (7, 0.6, 7))
        mb.add("cyl12", water, (0, 0.55, 0), (6.3, 0.12, 6.3))
        mb.add("cyl8", stone, (0, 1.2, 0), (0.8, 1.6, 0.8))
        mb.add("cyl12", stone, (0, 2.05, 0), (3, 0.3, 3))
        mb.add("cyl12", water, (0, 2.18, 0), (2.6, 0.08, 2.6))
        mb.add("cyl8", stone, (0, 2.6, 0), (0.35, 0.9, 0.35))
        mb.add("ico", water, (0, 3.15, 0), (0.7, 0.7, 0.7))
    return mb.build()



# --------------------------------------------------------------------------- personaje
# Mismas medidas, colores y articulaciones que src/components/game/player/ProceduralCharacter.tsx.
# Cada articulación es un objeto con su origen en el pivote (cadera, hombro, cuello), así la web
# puede rotarlos por nombre para animar caminar / correr / saltar.
CHAR = {
    "skin": "#f2c6a0", "hair": "#5b3a29", "shirt": "#e8735a", "pants": "#3d5a80",
    "shoes": "#2f2a26", "backpack": "#4f9d69", "eyes": "#2d3142", "nose": "#e9b48c",
}


def rig_part(name, items, offset, parent=None):
    """items: [(shape, color, posición_local, escala)]. Un objeto con varios materiales."""
    verts, faces, mat_index, mats = [], [], [], []
    for shape, color, pos, scl in items:
        mat = material(CHAR[color])
        if mat not in mats:
            mats.append(mat)
        idx = mats.index(mat)
        v, f = SHAPES[shape]
        base = len(verts)
        for vx, vy, vz in v:
            verts.append(to_bl((vx * scl[0] + pos[0], vy * scl[1] + pos[1], vz * scl[2] + pos[2])))
        for face in f:
            faces.append(tuple(i + base for i in face))
            mat_index.append(idx)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    for mat in mats:
        mesh.materials.append(mat)
    for poly, idx in zip(mesh.polygons, mat_index):
        poly.material_index = idx
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    obj.location = to_bl(offset)  # relativo al padre (sin rotación)
    return obj


def build_character():
    root = bpy.data.objects.new("personaje", None)
    bpy.context.scene.collection.objects.link(root)
    for side, name in ((1, "pierna_izq"), (-1, "pierna_der")):
        rig_part(name, [
            ("box", "pants", (0, -0.38, 0), (0.22, 0.72, 0.24)),
            ("box", "shoes", (0, -0.79, 0.05), (0.25, 0.13, 0.36)),
        ], (side * 0.15, 0.85, 0), root)
    body = rig_part("cuerpo", [
        ("box", "pants", (0, 0.06, 0), (0.52, 0.22, 0.3)),
        ("box", "shirt", (0, 0.42, 0), (0.56, 0.6, 0.32)),
        ("box", "backpack", (0, 0.42, -0.24), (0.4, 0.44, 0.16)),
        ("box", "backpack", (0.14, 0.45, -0.15), (0.08, 0.5, 0.05)),
        ("box", "backpack", (-0.14, 0.45, -0.15), (0.08, 0.5, 0.05)),
    ], (0, 0.85, 0), root)
    for side, name in ((1, "brazo_izq"), (-1, "brazo_der")):
        rig_part(name, [
            ("box", "shirt", (0, -0.15, 0), (0.16, 0.34, 0.18)),
            ("box", "skin", (0, -0.43, 0), (0.14, 0.26, 0.15)),
            ("ico", "skin", (0, -0.62, 0), (0.17, 0.17, 0.17)),
        ], (side * 0.37, 0.66, 0), body)
    rig_part("cabeza", [
        ("box", "skin", (0, 0.03, 0), (0.14, 0.1, 0.14)),
        ("box", "skin", (0, 0.28, 0), (0.42, 0.42, 0.4)),
        ("box", "hair", (0, 0.5, -0.01), (0.46, 0.13, 0.44)),
        ("box", "hair", (0, 0.36, -0.17), (0.46, 0.3, 0.12)),
        ("box", "eyes", (0.1, 0.3, 0.205), (0.06, 0.08, 0.02)),
        ("box", "eyes", (-0.1, 0.3, 0.205), (0.06, 0.08, 0.02)),
        ("box", "nose", (0, 0.22, 0.22), (0.06, 0.06, 0.06)),
    ], (0, 0.74, 0), body)


# --------------------------------------------------------------------------- exportación
def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def export_glb(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_yup=True, use_selection=False)


def count_polys():
    return sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")


def main():
    if not os.path.isfile(CONFIG_PATH):
        raise SystemExit(f"No se encontró {CONFIG_PATH}. Ajusta PROJECT_ROOT en el script.")
    with open(CONFIG_PATH, encoding="utf-8") as fh:
        buildings = json.load(fh)

    manifest = {"buildings": {}, "props": {}, "characters": {}}
    total = 0

    for b in buildings:
        clear_scene()
        build_building(b)
        polys = count_polys()
        total += polys
        rel = f"assets/models/buildings/{b['id']}.glb"
        export_glb(os.path.join(PROJECT_ROOT, "public", rel))
        manifest["buildings"][b["id"]] = rel
        print(f"[ok] {b['name']:<28} {polys:>5} polígonos -> {rel}")

    for kind in ("tree", "pine", "bush", "lamp", "bench", "fountain"):
        clear_scene()
        build_prop(kind)
        polys = count_polys()
        rel = f"assets/models/city/{kind}.glb"
        export_glb(os.path.join(PROJECT_ROOT, "public", rel))
        manifest["props"][kind] = rel
        print(f"[ok] prop {kind:<23} {polys:>5} polígonos -> {rel}")

    clear_scene()
    build_character()
    polys = count_polys()
    rel = "assets/models/characters/personaje.glb"
    export_glb(os.path.join(PROJECT_ROOT, "public", rel))
    manifest["characters"] = {"personaje": rel}
    print(f"[ok] personaje                     {polys:>5} polígonos -> {rel}")

    clear_scene()
    with open(os.path.join(MODELS_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
    print(f"\nListo: {len(manifest['buildings'])} edificios + {len(manifest['props'])} props. "
          f"Polígonos en edificios: {total}. Manifiesto en {MODELS_DIR}")


if __name__ == "__main__":
    main()
