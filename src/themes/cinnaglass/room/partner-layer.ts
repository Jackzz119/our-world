// partner-layer.ts — the partner across the table: one mesh per pose on a
// shared canvas, swapped in place, blinking on eyes-open poses, plus the head
// and body zones that turn a tap into a poke and a press-and-stroke into a
// pat. Which pose shows is decided by partner-state.ts; this layer only
// renders it.
//
// The character is a marionette rig (ai/jaSkills/marionette): the pipeline
// exports the pose frames, the idle weights, the morph fields and a manifest
// (rig.json) listing what shipped; rig-core.ts does the math. Idle motion is a
// grid mesh deformed by per-area weights (Wallpaper Engine's approach to flat
// art); a pose change morphs along a measured optical flow where the pipeline
// trusted one and covers-and-fades elsewhere; a poke adds a computed flinch
// and laugh on top.

import { Assets, Container, type FederatedPointerEvent, MeshPlane, Rectangle, type Texture } from 'pixi.js';
import {
    createBlinker,
    createGesturePlayer,
    createSwitcher,
    decodeFlow,
    decodeWeights,
    deformVertices,
    DEFAULT_MOTION,
    type FlowField,
    GESTURES,
    gridSize,
    type Motion,
    type PartFrame,
    partFrame,
    type PoseFrame,
    type RigManifest,
    type Transition,
    type WeightMap
} from '@/themes/cinnaglass/room/rig-core';
import type { PartnerSeat, PoseId, PxPoint } from '@/themes/cinnaglass/room/room-types';

/** An exported rig, loaded: the manifest, every pose texture, and the decoded data maps. */
export type PartnerRig = {
    manifest: RigManifest;
    textures: Record<string, Texture>;
    weights: Record<string, WeightMap>;
    flows: Record<string, FlowField>;
};

/** One pose's mesh, its two frames and its rest geometry. */
type Pose = {
    mesh: MeshPlane;
    open: Texture;
    closed: Texture | null;
    rest: Float32Array;
    weights: WeightMap | null;
};

export type PartnerTouch = {
    /** A tap on the head or body. */
    onPoke: () => void;
    /** A press-and-stroke on the head started (true) or ended (false). */
    onPat: (holding: boolean) => void;
};

export type PartnerLayer = {
    /** Pose meshes, placed in plate px. */
    container: Container;
    /** Head and body zones, above everything else in the scene. */
    hitContainer: Container;
    /** Every pose texture, for uploading them to the GPU before the first swap. */
    textures: Texture[];
    /** Scene light on the partner, as a multiply tint. */
    setTint: (tint: number) => void;
    /** Show `pose` (null = nobody in the chair): a morph or a cover-and-fade from the current one. */
    show: (pose: string | null, animate: boolean, transition?: Transition | null) => void;
    /**
     * Scene part `name` (the mug on the table) this frame: its opacity, and how far their hand has
     * carried it from its place, in plate px (rig-core partFrame, manifest `hides` / `holds`).
     */
    part: (name: string) => PartFrame;
    /** A poke landed: the flinch and laugh that play on top of the poked pose. */
    flinch: () => void;
    /** Every frame: opacity, blinking and mesh motion; `elapsed` (seconds) drives the idle loops. */
    update: (elapsed: number) => void;
    /** Plate px where UI can attach beside the head (PartnerSeat.beside, placed on the plate). */
    anchors: () => HeadAnchors;
};

/**
 * Where UI attaches beside the partner's head without covering the face: the
 * eye-level points clear of the hair, the x the face ends at on the viewer's
 * right, and the y of the shoulder line.
 */
export type HeadAnchors = { left: PxPoint; right: PxPoint; faceRight: number; shoulder: number };

// The pat gesture (ai/features/study-room/study-room.md §四).
const PAT_START_PX = 12;
// Every pose the director can ask for; a rig missing one would leave the chair empty.
const POSES: readonly PoseId[] = ['reading', 'glance', 'writing', 'asleep', 'patted', 'poked'];
// The chains the study cannot do without: taking a sip is only ever walked, never one pose.
const CHAINS = ['sip'] as const;
// A keyframe frame the director may ask for must exist too: its sequences name them.
const framesOf = (m: RigManifest) => Object.values(m.sequences ?? {}).flatMap((q) => q.frames);

/** Decode a small data PNG into its RGBA bytes, with no premultiplication or colour management. */
async function readPixels(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob(), {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none'
    });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('rig data: no 2d canvas');
    g.drawImage(bitmap, 0, 0);
    return { w: bitmap.width, h: bitmap.height, px: g.getImageData(0, 0, bitmap.width, bitmap.height).data };
}

/**
 * Load an exported rig. A morph field that fails to load only costs that pair its morph.
 * `onProgress` gets the share of pose frames and data maps done so far (0–1).
 */
export async function loadPartnerRig(
    manifestUrl: string,
    onProgress?: (fraction: number) => void
): Promise<PartnerRig> {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`${manifestUrl}: ${response.status}`);
    const manifest = (await response.json()) as RigManifest;
    if (manifest.version !== 2 || manifest.flowFormat !== 'rgb12') throw new Error(`${manifestUrl}: unsupported rig`);
    const missing = [...POSES, ...framesOf(manifest)].filter((p) => !manifest.poses[p]);
    if (missing.length) throw new Error(`${manifestUrl}: no ${missing.join(', ')} pose`);
    const chainless = CHAINS.filter((c) => !manifest.sequences?.[c]);
    if (chainless.length) throw new Error(`${manifestUrl}: no ${chainless.join(', ')} sequence`);
    const { cols, rows } = gridSize(manifest);
    const frames = Object.values(manifest.poses).flatMap((p) => (p.closed ? [p.open, p.closed] : [p.open]));
    const maps = Object.values(manifest.poses).filter((p) => p.idle).length + Object.keys(manifest.morphs).length;
    let framesDone = 0;
    let mapsDone = 0;
    const report = () => onProgress?.((framesDone * frames.length + mapsDone) / Math.max(1, frames.length + maps));
    const counted = <T>(work: Promise<T>) =>
        work.finally(() => {
            mapsDone += 1;
            report();
        });
    const [textures, weightList, flowList] = await Promise.all([
        Assets.load<Texture>(frames, (p) => {
            framesDone = p;
            report();
        }),
        Promise.all(
            Object.entries(manifest.poses).flatMap(([id, p]) =>
                p.idle
                    ? [
                          counted(
                              readPixels(p.idle).then(({ w, h, px }) => {
                                  if (w !== cols || h !== rows)
                                      throw new Error(`${p.idle}: ${w}x${h}, not ${cols}x${rows}`);
                                  return [id, decodeWeights(px, cols, rows)] as const;
                              })
                          )
                      ]
                    : []
            )
        ),
        Promise.all(
            Object.entries(manifest.morphs).map(([key, url]) =>
                counted(
                    (async () => {
                        try {
                            const { px } = await readPixels(url);
                            return [key, decodeFlow(px, cols, rows)] as const;
                        } catch {
                            return null;
                        }
                    })()
                )
            )
        )
    ]);
    const flows: Record<string, FlowField> = Object.fromEntries(flowList.filter((f) => f !== null));
    // a morph needs both directions; drop the orphan of a half-loaded pair
    for (const key of Object.keys(flows)) {
        const [a, b] = key.split('-');
        if (!flows[`${b}-${a}`]) delete flows[key];
    }
    return { manifest, textures, weights: Object.fromEntries(weightList), flows };
}

/**
 * Build the partner layer for `seat` from a loaded rig. `random` is the
 * scene's shared source; `reduced` (the low-motion mode, ui/motion-preference.ts) stills the idle
 * motion, the morphs and the gestures, and keeps the blinks.
 */
export function createPartnerLayer(
    seat: PartnerSeat,
    rig: PartnerRig,
    random: () => number,
    touch: PartnerTouch,
    reduced: boolean
): PartnerLayer {
    const { manifest } = rig;
    const { cols, rows } = gridSize(manifest);
    const motion: Motion = {
        ...DEFAULT_MOTION,
        pivotY: seat.pivot.y,
        ...(reduced ? { breathPx: 0, leanRad: 0, hairPx: 0 } : {})
    };

    // holder places the pose canvas on the plate; the motion is in the meshes
    const container = new Container();
    const holder = new Container();
    holder.position.set(seat.origin.x, seat.origin.y);
    holder.scale.set(seat.scale);
    container.addChild(holder);

    const poses = new Map<string, Pose>();
    for (const id of Object.keys(manifest.poses)) {
        const files = manifest.poses[id];
        const mesh = new MeshPlane({ texture: rig.textures[files.open], verticesX: cols, verticesY: rows });
        // blinks swap the texture on a canvas of the same size; the grid must stay
        mesh.autoResize = false;
        mesh.alpha = 0;
        holder.addChild(mesh);
        poses.set(id, {
            mesh,
            open: rig.textures[files.open],
            closed: files.closed ? rig.textures[files.closed] : null,
            rest: Float32Array.from(mesh.geometry.positions),
            weights: rig.weights[id] ?? null
        });
    }
    // a pose without a weight map still morphs; it just has no idle motion of its own
    const still: WeightMap = { cols, rows, breath: new Float32Array(cols * rows), hair: new Float32Array(cols * rows) };
    const switcher = createSwitcher({
        morphs: Object.fromEntries(Object.keys(rig.flows).map((k) => [k, k])),
        slow: (p) => manifest.poses[p]?.slow ?? false,
        narrow: (a, b) => manifest.guided?.includes(`${a}-${b}`) ?? false
    });
    const blinker = createBlinker(random, performance.now());
    const gestures = createGesturePlayer();
    let drawn = new Map<string, PoseFrame>();

    // Plate-px rectangle of a pose-canvas rectangle.
    const toPlate = (r: { x: number; y: number; w: number; h: number }) =>
        new Rectangle(
            seat.origin.x + r.x * seat.scale,
            seat.origin.y + r.y * seat.scale,
            r.w * seat.scale,
            r.h * seat.scale
        );

    /* ---------- touch zones ---------- */
    const hitContainer = new Container();
    const head = new Container();
    const body = new Container();
    head.hitArea = toPlate(seat.head);
    body.hitArea = toPlate(seat.body);
    for (const zone of [body, head]) {
        zone.eventMode = 'static';
        zone.cursor = 'pointer';
        hitContainer.addChild(zone);
    }
    // the zones only answer while someone sits there
    const setZones = (on: boolean) => {
        head.eventMode = body.eventMode = on ? 'static' : 'none';
    };
    setZones(false);

    // Head: a press that travels past the threshold is a pat, a press that
    // stays put is a poke. Body: every tap is a poke.
    let press: { x: number; y: number } | null = null;
    let patting = false;
    const endPress = () => {
        if (patting) touch.onPat(false);
        press = null;
        patting = false;
    };
    head.on('pointerdown', (e: FederatedPointerEvent) => {
        press = { x: e.global.x, y: e.global.y };
        patting = false;
    });
    head.on('globalpointermove', (e: FederatedPointerEvent) => {
        if (!press || patting) return;
        if (Math.hypot(e.global.x - press.x, e.global.y - press.y) >= PAT_START_PX) {
            patting = true;
            touch.onPat(true);
        }
    });
    head.on('pointerup', () => {
        if (press && !patting) touch.onPoke();
        endPress();
    });
    head.on('pointerupoutside', endPress);
    body.on('pointertap', () => touch.onPoke());

    return {
        container,
        hitContainer,
        textures: [...poses.values()].flatMap((p) => (p.closed ? [p.open, p.closed] : [p.open])),
        setTint(tint) {
            for (const p of poses.values()) p.mesh.tint = tint;
        },
        show(pose, animate, transition) {
            if (pose === switcher.current()) return;
            const now = performance.now();
            switcher.show(pose, now, animate && !reduced, transition);
            const to = pose ? poses.get(pose) : undefined;
            if (to) holder.setChildIndex(to.mesh, holder.children.length - 1);
            blinker.reset(now);
            setZones(pose !== null && pose !== 'asleep');
            if (!pose) endPress();
        },
        flinch() {
            if (!reduced) gestures.play(GESTURES.flinchLaugh, performance.now());
        },
        update(elapsed) {
            const now = performance.now();
            const frame = switcher.frame(now);
            // no blink while a morph bends the mesh: the closed frame would land on a half-bent grid
            const closed = !switcher.morphing() && blinker.closed(now);
            const pulse = gestures.sample(now);
            drawn = frame;
            const current = switcher.current();
            for (const [id, p] of poses) {
                const f = frame.get(id);
                p.mesh.alpha = f?.alpha ?? 0;
                if (!f) continue;
                p.mesh.texture = id === current && closed && p.closed ? p.closed : p.open;
                if (!p.weights && !f.shift) continue;
                const shift = f.shift ? (rig.flows[f.shift.field] ?? null) : null;
                deformVertices(
                    p.rest,
                    p.mesh.geometry.positions,
                    p.weights ?? still,
                    elapsed,
                    motion,
                    shift,
                    f.shift?.amount ?? 0,
                    pulse
                );
                p.mesh.geometry.getBuffer('aPosition').update();
            }
        },
        part(name) {
            const f = partFrame(manifest.poses, drawn, switcher.progress(), switcher.current(), name);
            return { alpha: f.alpha, dx: f.dx * seat.scale, dy: f.dy * seat.scale };
        },
        anchors() {
            const at = (p: PxPoint) => ({ x: seat.origin.x + p.x * seat.scale, y: seat.origin.y + p.y * seat.scale });
            return {
                left: at(seat.beside.left),
                right: at(seat.beside.right),
                faceRight: seat.origin.x + seat.beside.faceRight * seat.scale,
                shoulder: seat.origin.y + seat.beside.shoulder * seat.scale
            };
        }
    };
}
